// 4.29.x 불필요한 AI 호출 막기(대표님 2026-11-25: 무한 반복·연타·같은 요청 반복으로 비용이 새는 것을 미리 막는다).
// 서버 쪽 장치(앱 쪽 장치는 app/ai-guard.js). 어느 하나가 막히면 AI를 부르지 않고, 기능별 하루 횟수도 쓰지 않는다.
//  ① 전체 끄기 스위치 AI_ENABLED="0" → 모든 AI 기능 503(설정 화면의 'me'만 응답)
//  ② 요청 크기 상한(content-length) → 413, JSON을 읽기 전에 막는다
//  ③ 사람별 속도 제한: 1분·1시간 창(운영자는 넉넉하게, 하지만 무제한은 아님) → 429
//  ④ 같은 요청 되풀이: 같은 내용(주소+본문 해시)이 정해진 초 안에 다시 오면 → 429(앱이 두 번 보냈거나 반복 루프)
//  ⑤ 전체 예산: 모든 사람의 추정 원가를 하루·한 달로 합산, 상한을 넘으면 운영자 포함 모두 멈춤 → 503
// 모든 수는 wrangler.toml [vars]로 바꿀 수 있고, 빈 값이면 아래 기본값.
import {HttpError} from './handler.js';

export const GUARD_DEFAULTS = Object.freeze({
  MAX_BODY_BYTES: 4_500_000, // 사진 2장(각 1.5MB → base64 약 2MB) + 글
  RATE_PER_MIN: 6, RATE_PER_HOUR: 60, // 일반 계정
  ADMIN_RATE_PER_MIN: 15, ADMIN_RATE_PER_HOUR: 200, // 운영자(시험이 많지만 루프는 막는다)
  DUP_WINDOW_SEC: 20,
  GLOBAL_DAILY_COST_WON: 3000, GLOBAL_MONTHLY_COST_WON: 30000, // 서비스 전체(테스터 5명 3배 시험 예상 월 약 1.5만 원의 2배)
});
const num = (env, k) => { const v = env?.[k]; return v === undefined || v === '' ? GUARD_DEFAULTS[k] : Number(v); };
export const guardValue = num;

export function aiEnabled(env) { return String(env?.AI_ENABLED ?? '1') !== '0'; }
export function assertEnabled(env) { if (!aiEnabled(env)) throw new HttpError(503, 'AI 기능을 잠시 쉬고 있어요. 손으로 기록하는 건 계속할 수 있어요.'); }

export function assertBodySize(request, env) {
  const max = num(env, 'MAX_BODY_BYTES'), len = Number(request.headers.get('content-length') || 0);
  if (len > max) throw new HttpError(413, '보내는 내용이 너무 커요. 사진은 2장까지, 작게 줄여서 보내 주세요.');
}
// content-length가 없거나 거짓이어도 읽은 뒤 다시 잰다
export async function readJsonLimited(request, env) {
  const max = num(env, 'MAX_BODY_BYTES'), text = await request.text();
  if (text.length > max) throw new HttpError(413, '보내는 내용이 너무 커요. 사진은 2장까지, 작게 줄여서 보내 주세요.');
  try { return JSON.parse(text); } catch { throw new HttpError(400, '요청 형식이 올바르지 않아요.'); }
}

const bump = async (db, uid, key, feature, add = 1) => Number((await db.prepare('INSERT INTO usage_feature (uid, day, feature, n) VALUES (?1, ?2, ?3, ?4) ON CONFLICT(uid, day, feature) DO UPDATE SET n = n + excluded.n RETURNING n').bind(uid, key, feature, add).first())?.n || 0);
const unbump = (db, uid, key, feature, sub = 1) => db.prepare('UPDATE usage_feature SET n = MAX(0, n - ?1) WHERE uid = ?2 AND day = ?3 AND feature = ?4').bind(sub, uid, key, feature).first();

// ③ 1분·1시간 창. 키는 UTC 분·시(창 경계에서 잠깐 두 배까지 허용되는 단순 방식이지만 루프는 확실히 막는다).
export async function rateLimit(db, uid, now, env, {admin = false} = {}) {
  const iso = new Date(now).toISOString(), minKey = `m:${iso.slice(0, 16)}`, hourKey = `h:${iso.slice(0, 13)}`;
  const perMin = num(env, admin ? 'ADMIN_RATE_PER_MIN' : 'RATE_PER_MIN'), perHour = num(env, admin ? 'ADMIN_RATE_PER_HOUR' : 'RATE_PER_HOUR');
  const m = await bump(db, uid, minKey, 'rate');
  if (perMin > 0 && m > perMin) throw new HttpError(429, '너무 빠르게 여러 번 보냈어요. 1분쯤 뒤에 다시 해 주세요.');
  const h = await bump(db, uid, hourKey, 'rate');
  if (perHour > 0 && h > perHour) throw new HttpError(429, '한 시간 동안 AI를 너무 많이 불렀어요. 잠시 쉬었다가 다시 해 주세요.');
  return {minute: m, hour: h};
}

// ④ 같은 요청 되풀이. 내용은 저장하지 않고 해시와 시각만, 사람별로 오래된 것은 지운다.
export async function rejectDuplicate(db, uid, hash, now, env) {
  const win = num(env, 'DUP_WINDOW_SEC'); if (!(win > 0)) return false;
  const t = Math.floor(now / 1000);
  await db.prepare('DELETE FROM recent_req WHERE uid = ?1 AND at < ?2').bind(uid, t - Math.max(win, 60)).first();
  const prev = await db.prepare('SELECT at FROM recent_req WHERE uid = ?1 AND hash = ?2').bind(uid, hash).first();
  if (prev && t - Number(prev.at) < win) throw new HttpError(429, '같은 내용을 방금 보냈어요. 답을 기다려 주세요.');
  await db.prepare('INSERT INTO recent_req (uid, hash, at) VALUES (?1, ?2, ?3) ON CONFLICT(uid, hash) DO UPDATE SET at = excluded.at').bind(uid, hash, t).first();
  return false;
}

// ⑤ 서비스 전체 예산(0.1원 단위). 운영자도 여기서는 빠지지 않는다. 넘으면 이번 몫을 되돌리고 멈춘다.
export const GLOBAL_UID = '*all*';
export async function useGlobalBudget(db, day, month, won, env) {
  const add = Math.max(1, Math.ceil(Number(won) * 10));
  const dCap = Math.round(num(env, 'GLOBAL_DAILY_COST_WON') * 10), mCap = Math.round(num(env, 'GLOBAL_MONTHLY_COST_WON') * 10);
  const d = await bump(db, GLOBAL_UID, day, 'cost', add);
  if (dCap > 0 && d > dCap) { await unbump(db, GLOBAL_UID, day, 'cost', add); throw new HttpError(503, '오늘은 AI 사용량이 많아 쉬어요. 내일 다시 열려요. 손으로 기록하는 건 계속할 수 있어요.'); }
  const m = await bump(db, GLOBAL_UID, month, 'cost', add);
  if (mCap > 0 && m > mCap) { await unbump(db, GLOBAL_UID, day, 'cost', add); await unbump(db, GLOBAL_UID, month, 'cost', add); throw new HttpError(503, '이번 달 AI 사용량이 많아 쉬어요. 다음 달에 다시 열려요. 손으로 기록하는 건 계속할 수 있어요.'); }
  return {dayWon: d / 10, monthWon: m / 10};
}
export async function refundGlobal(db, day, month, won) {
  const sub = Math.max(1, Math.ceil(Number(won) * 10));
  await unbump(db, GLOBAL_UID, day, 'cost', sub); await unbump(db, GLOBAL_UID, month, 'cost', sub);
}

// 기능별 답 길이 상한(출력 토큰이 비용의 큰 몫). 기록 코드·짧은 답에 충분한 정도.
export const MAX_OUTPUT_TOKENS = Object.freeze({parse: 1500, photo: 1500, converse: 1500, chat: 800, recipe: 1500, review: 1800});
