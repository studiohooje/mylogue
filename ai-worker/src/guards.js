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
// Fable 전수조사 H-1: 설정 값에 쉼표·'원' 같은 글자가 섞이면 Number()가 NaN이 되어 장치가 조용히 꺼졌다.
// 숫자가 아니거나 음수면 기본값을 쓴다. 전체 예산은 0으로도 끌 수 없다(마지막 방어선).
const NO_ZERO = new Set(['GLOBAL_DAILY_COST_WON', 'GLOBAL_MONTHLY_COST_WON', 'MAX_BODY_BYTES']);
export function safeNum(v, def, {allowZero = true} = {}) {
  if (v === undefined || v === null || String(v).trim() === '') return def;
  const n = Number(String(v).trim());
  if (!Number.isFinite(n) || n < 0 || (!allowZero && n === 0)) return def;
  return n;
}
const num = (env, k) => safeNum(env?.[k], GUARD_DEFAULTS[k], {allowZero: !NO_ZERO.has(k)});
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
  // Fable L-2: 속도 제한 줄이 쌓이지 않게, 그 분의 첫 요청 때 2시간 지난 줄을 지운다
  if (m === 1) { const old = new Date(now - 2 * 3600_000).toISOString(); await db.prepare("DELETE FROM usage_feature WHERE uid = ?1 AND feature = 'rate' AND ((day LIKE 'm:%' AND day < ?2) OR (day LIKE 'h:%' AND day < ?3))").bind(uid, `m:${old.slice(0, 16)}`, `h:${old.slice(0, 13)}`).first(); }
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
  // Fable M-2: '읽고 → 쓰기' 두 단계 사이로 동시 요청이 새던 것을 한 문장(있으면 오래된 경우에만 고침)으로. 줄이 안 돌아오면 되풀이.
  const row = await db.prepare('INSERT INTO recent_req (uid, hash, at) VALUES (?1, ?2, ?3) ON CONFLICT(uid, hash) DO UPDATE SET at = excluded.at WHERE recent_req.at <= ?4 RETURNING at').bind(uid, hash, t, t - win).first();
  if (!row) throw new HttpError(429, '같은 내용을 방금 보냈어요. 답을 기다려 주세요.');
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

// Fable H-2: 예산 장부가 1회 고정 추정값만 쓰던 것 → 답이 온 뒤 실제 토큰 사용량(usage)으로 다시 계산해,
// 추정보다 더 들었으면 그 차이를 전체 예산과 개인 월 상한에 더한다(덜 들었으면 그대로 둠 = 보수적). 실패해도 답은 그대로 돌려준다.
// 가격(달러/100만 토큰, 입력·출력)은 MODEL_PRICES="모델=입력/출력;…"로 바꿀 수 있고, 모르는 모델은 비싼 쪽(2/10)으로 친다.
// 2026-11-25 각 회사 공식 가격표 확인값(달러/100만 토큰 입력/출력). DeepSeek은 비싼 시간대 기준. 바뀌면 MODEL_PRICES로 덮어쓴다.
export const DEFAULT_PRICES = Object.freeze({'claude-haiku-5-5': [0.10, 0.50], 'claude-sonnet-5-5': [2, 10], 'gpt-5-nano': [0.05, 0.40], 'gpt-5-mini': [0.25, 2.00], 'gpt-5.4-nano': [0.20, 1.25], 'gpt-6-luna': [0.10, 0.50], 'gemini-3.1-flash-lite': [0.25, 1.50], 'gemini-3.5-flash-lite': [0.30, 2.50], 'deepseek-flash': [0.15, 0.60]});
export function priceOf(env, model) {
  const table = {...DEFAULT_PRICES};
  for (const part of String(env?.MODEL_PRICES || '').split(';')) { const [k, v] = part.split('='); const [i, o] = String(v || '').split('/').map(x => safeNum(x, NaN)); if (k?.trim() && Number.isFinite(i) && Number.isFinite(o)) table[k.trim()] = [i, o]; }
  const key = Object.keys(table).find(k => String(model || '').startsWith(k));
  return key ? table[key] : [2, 10];
}
export function usageWon(env, model, usage) {
  if (!usage || typeof usage !== 'object') return null;
  const inTok = Number(usage.input_tokens ?? usage.prompt_tokens ?? 0) + Number(usage.cache_creation_input_tokens || 0) * 1.25 + Number(usage.cache_read_input_tokens || 0) * 0.1;
  const outTok = Number(usage.output_tokens ?? usage.completion_tokens ?? 0);
  if (!Number.isFinite(inTok) || !Number.isFinite(outTok) || inTok + outTok <= 0) return null;
  const [pi, po] = priceOf(env, model), rate = safeNum(env?.USD_KRW, 1450, {allowZero: false});
  return (inTok * pi + outTok * po) / 1e6 * rate;
}
export async function settleCost(db, {uid, day, month, admin}, estimateWon, model, usage, env) {
  try {
    const actual = usageWon(env, model, usage); if (actual == null) return null;
    const extra = Math.ceil((actual - Number(estimateWon || 0)) * 10);
    if (extra > 0) {
      await bump(db, GLOBAL_UID, day, 'cost', extra); await bump(db, GLOBAL_UID, month, 'cost', extra);
      if (!admin) await bump(db, uid, month, 'cost', extra);
    }
    return actual;
  } catch (e) { console.error('settleCost', e?.message); return null; }
}

// 기능별 답 길이 상한(출력 토큰이 비용의 큰 몫). 기록 코드·짧은 답에 충분한 정도.
export const MAX_OUTPUT_TOKENS = Object.freeze({parse: 1500, photo: 1500, converse: 1500, chat: 800, recipe: 1500, review: 1800});
