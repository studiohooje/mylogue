// 4.17.0 AI 서버 기능별 처리: 계정 상태(승인·플러스), 기능별 하루 한도, 같은 사진 재시도·인식 실패 미차감, 가짜 AI.
// 대표님 방침: 인식에 실패한 사진은 횟수에서 빼지 않음, 같은 사진 재시도 미차감, 한도에 닿아도 손 기록은 계속.
import {ADMIN_UIDS, ADMIN_EMAILS} from '../../app/admin.js';
import {HttpError, verifyIdToken, googleKeys, useQuota, readInput, buildMessages, corsHeaders, SYSTEM, LIMITS} from './handler.js';
import {mateRoute} from './mate.js';
import {REVIEW_SYSTEM, CHAT_SYSTEM, RECIPE_SYSTEM, CONVERSE_SYSTEM, fakeAnswer} from './prompts.js';
import {assertEnabled, assertBodySize, readJsonLimited, rateLimit, rejectDuplicate, useGlobalBudget, settleCost, safeNum, guardValue, GLOBAL_UID, MAX_OUTPUT_TOKENS} from './guards.js';
// Fable H-1: 숫자 설정은 모두 safeNum으로(글자가 섞여도 꺼지지 않게)
export const dailyLimit = env => safeNum(env.DAILY_LIMIT, 30);
export const monthlyCapWon = env => safeNum(env.MONTHLY_COST_WON, 700);

export async function accountOf(user, token, {projectId, fetchImpl = fetch, plusAll = false}) {
  const admin = ADMIN_UIDS.includes(user.uid) || (user.emailVerified && ADMIN_EMAILS.includes(user.email));
  if (admin) return {approved: true, plus: true, admin: true};
  const r = await fetchImpl(`https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/users/${encodeURIComponent(user.uid)}`, {headers: {authorization: `Bearer ${token}`}});
  if (r.status === 404 || r.status === 403) return {approved: false, plus: false, admin: false};
  if (!r.ok) throw new HttpError(503, '계정 확인 서버에 연결하지 못했어요. 잠시 뒤 다시 해 주세요.');
  const doc = await r.json(), approved = doc?.fields?.status?.stringValue === 'approved';
  return {approved, plus: approved && (plusAll || doc?.fields?.plan?.stringValue === 'plus'), admin: false};
}
// 기능별 하루 한도: LIMIT_X = "무료/플러스"
export const FEATURES = Object.freeze({parse: 'DAILY_LIMIT', photo: 'LIMIT_PHOTO', review: 'LIMIT_REVIEW', chat: 'LIMIT_CHAT', recipe: 'LIMIT_RECIPE'});
const FEATURE_NAME = {photo: '사진 기록', review: 'AI 주간 리뷰', chat: 'AI에게 묻기', recipe: '레시피 자동 분해'};
const topic = w => { const c = String(w).slice(-1).charCodeAt(0); return w + (c >= 0xAC00 && c <= 0xD7A3 && (c - 0xAC00) % 28 ? '은' : '는'); };
export function limitOf(env, feature, plus) {
  if (feature === 'parse') return dailyLimit(env);
  const [free, paid] = String(env[FEATURES[feature]] || '0/0').split('/').map(v => safeNum(v, 0));
  return plus ? paid : free;
}
export async function refundFeature(db, uid, day, feature) {
  await db.prepare('UPDATE usage_feature SET n = MAX(0, n - 1) WHERE uid = ?1 AND day = ?2 AND feature = ?3').bind(uid, day, feature).first();
}
export async function useFeature(db, uid, day, feature, limit) {
  if (limit <= 0) throw new HttpError(402, `${topic(FEATURE_NAME[feature] || '이 기능')} 플러스에서 쓸 수 있어요.`);
  const row = await db.prepare('INSERT INTO usage_feature (uid, day, feature, n) VALUES (?1, ?2, ?3, 1) ON CONFLICT(uid, day, feature) DO UPDATE SET n = n + 1 RETURNING n').bind(uid, day, feature).first();
  const n = Number(row?.n || 0);
  if (n > limit) { await refundFeature(db, uid, day, feature); throw new HttpError(429, `오늘 ${topic(FEATURE_NAME[feature] || 'AI')} ${limit}번까지 쓸 수 있어요. 손으로 기록하는 건 계속할 수 있어요.`); }
  return {used: n, left: Math.max(0, limit - n)};
}
// 4.27.0 전수검사 S-02: '실패하면 횟수 돌려주기'와 별개로, AI를 실제로 부른 시도는 돌려주지 않고 센다.
// 기능별 하루 한도의 3배(무료 말 기록은 한도와 같게 이미 돌려주지 않음)를 넘으면 AI를 부르지 않는다.
export const ATTEMPT_FACTOR = 3;
export async function useAttempt(db, uid, day, feature, limit) {
  const cap = Math.max(1, Number(limit) || 0) * ATTEMPT_FACTOR;
  const row = await db.prepare('INSERT INTO usage_feature (uid, day, feature, n) VALUES (?1, ?2, ?3, 1) ON CONFLICT(uid, day, feature) DO UPDATE SET n = n + 1 RETURNING n').bind(uid, day, `try:${feature}`).first();
  const n = Number(row?.n || 0);
  if (n > cap) throw new HttpError(429, '오늘은 AI를 여러 번 다시 시도해서 더 부를 수 없어요. 내일 다시 해 주세요. 손으로 기록하는 건 계속할 수 있어요.');
  return n;
}
// 4.27.0 전수검사 B-10: 사업계획의 'AI 원가 상한 1인 월 700원'을 코드로. 부를 때마다 기능별 추정 원가(COST_WON)를 월 누적에 더하고,
// 상한(MONTHLY_COST_WON)을 넘으면 그 달은 AI를 부르지 않는다. 금액은 0.1원 단위 정수로 usage_feature(day=YYYY-MM, feature='cost')에 둔다.
// 추정 원가는 공식 가격표 기반 계산(전수조사 보고서)이고, 실제 청구서와 비교해 wrangler.toml에서 고친다.
export const DEFAULT_COST_WON = Object.freeze({parse: 2, photo: 2.5, chat: 2, recipe: 2, review: 40}) // 4.29.x 비용 예측 보고서(2026-11-25): Haiku 5.5 실제 1회 약 1.6~1.8원, 리뷰(Sonnet) 약 39원에 여유;
export function costOf(env, feature) {
  const table = {...DEFAULT_COST_WON};
  for (const part of String(env.COST_WON || '').split(',')) { const [k, v] = part.split(':').map(s => s.trim()); if (k in table && Number.isFinite(Number(v)) && Number(v) >= 0) table[k] = Number(v); }
  return table[feature] ?? 1;
}
export async function useMonthlyBudget(db, uid, month, won, capWon) {
  const cap = Math.round(Number(capWon) * 10), add = Math.max(1, Math.ceil(Number(won) * 10));
  if (!(cap > 0)) return null; // 0이나 빈 값이면 상한 없음(운영자가 일부러 끈 경우)
  const row = await db.prepare('INSERT INTO usage_feature (uid, day, feature, n) VALUES (?1, ?2, ?3, ?4) ON CONFLICT(uid, day, feature) DO UPDATE SET n = n + excluded.n RETURNING n').bind(uid, month, 'cost', add).first();
  const n = Number(row?.n || 0);
  if (n > cap) {
    await db.prepare('UPDATE usage_feature SET n = MAX(0, n - ?1) WHERE uid = ?2 AND day = ?3 AND feature = ?4').bind(add, uid, month, 'cost').first();
    throw new HttpError(429, '이번 달 AI 사용량이 많아 다음 달 1일에 다시 열려요. 손으로 기록하는 건 계속할 수 있어요.');
  }
  return {usedWon: n / 10, capWon: cap / 10};
}
// 같은 사진: 하루에 같은 해시는 처음 한 번만 센다. 3번 넘게 보내면 막는다(사진은 저장하지 않고 해시만).
export async function photoSeen(db, uid, day, hash) {
  const row = await db.prepare('INSERT INTO photo_seen (uid, day, hash, tries) VALUES (?1, ?2, ?3, 1) ON CONFLICT(uid, day, hash) DO UPDATE SET tries = tries + 1 RETURNING tries').bind(uid, day, hash).first();
  const tries = Number(row?.tries || 1);
  if (tries > 3) throw new HttpError(429, '같은 사진을 여러 번 보냈어요. 다시 찍어서 보내 주세요.');
  return tries > 1;
}
export async function sha256(text) { const h = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text)); return [...new Uint8Array(h)].map(b => b.toString(16).padStart(2, '0')).join(''); }
export const recordsIn = text => { const s = String(text || ''); const m = s.match(/```(?:json|mylogue)?\s*([\s\S]*?)```/) || s.match(/(\{[\s\S]*\})/); try { const j = JSON.parse(m?.[1] || ''); return Array.isArray(j?.records) ? j.records.length : 0; } catch { return 0; } };

// deps: {env, fetchImpl, callModel(messages, {model, system, feature, effort, maxTokens}) → {text, stopReason, model}, now}
// (예전 이름 callClaude도 받는다. 어느 회사 모델을 부를지는 index.js/providers.js가 AI_PROVIDER로 정한다)
export async function route(request, deps) {
  const {env} = deps, allowed = String(env.ALLOWED_ORIGINS || '').split(',').map(s => s.trim()).filter(Boolean);
  const origin = request.headers.get('origin') || '', cors = corsHeaders(origin, allowed);
  const reply = (status, body) => new Response(JSON.stringify(body), {status, headers: {...cors, 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store'}});
  if (request.method === 'OPTIONS') return new Response(null, {status: 204, headers: cors});
  const path = new URL(request.url).pathname.replace(/^\//, '');
  if (request.method === 'GET' && path === 'health') return reply(200, {ok: true, fake: env.FAKE_AI === '1'});
  // 5.0.0 로그메이트 사진(R2). AI를 부르지 않으므로 AI 끄기 스위치·비용 장부와 따로.
  if (request.method === 'POST' && ['mate/upload', 'mate/photo', 'mate/delete'].includes(path)) {
    try {
      if (origin && !allowed.includes(origin)) throw new HttpError(403, '허용되지 않은 곳에서 온 요청이에요.');
      const token = (request.headers.get('authorization') || '').replace(/^Bearer\s+/i, '');
      const now = deps.now ? deps.now() : Date.now();
      const user = await verifyIdToken(token, {projectId: env.FIREBASE_PROJECT_ID, keys: await googleKeys(deps.fetchImpl, now), now});
      const acct = await accountOf(user, token, {projectId: env.FIREBASE_PROJECT_ID, fetchImpl: deps.fetchImpl, plusAll: env.PLUS_ALL === '1'});
      if (!acct.approved) throw new HttpError(403, '이용 승인 후 쓸 수 있어요.');
      reply.cors = cors;
      return await mateRoute(path, request, {env, user, token, fetchImpl: deps.fetchImpl, now, reply});
    } catch (error) {
      if (error instanceof HttpError) return reply(error.status, {error: error.message});
      console.error(error);
      return reply(502, {error: '사진을 처리하지 못했어요. 잠시 뒤 다시 해 주세요.'});
    }
  }
  if (request.method !== 'POST' || !['parse', 'review', 'chat', 'recipe', 'converse', 'me'].includes(path)) return reply(404, {error: '없는 주소예요.'});
  try {
    if (origin && !allowed.includes(origin)) throw new HttpError(403, '허용되지 않은 곳에서 온 요청이에요.');
    // 4.29.x 불필요한 호출 막기 ①② — 로그인 확인·JSON 읽기 전에 값싼 것부터
    if (path !== 'me') assertEnabled(env);
    assertBodySize(request, env);
    const token = (request.headers.get('authorization') || '').replace(/^Bearer\s+/i, '');
    const now = deps.now ? deps.now() : Date.now();
    const user = await verifyIdToken(token, {projectId: env.FIREBASE_PROJECT_ID, keys: await googleKeys(deps.fetchImpl, now), now});
    let acct = await accountOf(user, token, {projectId: env.FIREBASE_PROJECT_ID, fetchImpl: deps.fetchImpl, plusAll: env.PLUS_ALL === '1'});
    if (!acct.approved) throw new HttpError(403, '이용 승인 후 쓸 수 있어요.');
    const body = await readJsonLimited(request, env);
    const realAdmin = acct.admin; // 4.29.x 비용 알림은 '일반으로 보기' 중에도 운영자에게 보여 준다
    // 4.29.0 슈퍼관리자가 앱에서 '일반 사용자'로 보기를 켰으면, 서버도 일반 사용자 권한·하루 한도로 시험한다(낮추기만 가능)
    if (acct.admin && body?.viewPlan === 'free') acct = {...acct, plus: false, admin: false};
    const day = new Date(now + 9 * 3600_000).toISOString().slice(0, 10); // 한국 날짜 기준
    const month = day.slice(0, 7);
    // 4.29.x ③ 사람별 속도 제한(운영자도 넉넉한 상한) ④ 같은 내용 되풀이 막기('me'는 값싸서 속도 제한만)
    await rateLimit(env.DB, user.uid, now, env, {admin: acct.admin});
    if (path !== 'me') { const {now: _n, today: _t, ...same} = body || {}; await rejectDuplicate(env.DB, user.uid, await sha256(`${path}|${JSON.stringify(same)}`), now, env); }
    const callModel = deps.callModel || deps.callClaude;
    const callAI = (messages, opts) => env.FAKE_AI === '1' ? Promise.resolve({text: fakeAnswer(opts.system === CONVERSE_SYSTEM ? 'converse' : opts.feature, opts.input) , stopReason: 'end_turn', model: 'fake'}) : callModel(messages, {...opts, maxTokens: opts.maxTokens || MAX_OUTPUT_TOKENS[opts.system === CONVERSE_SYSTEM ? 'converse' : opts.feature] || 1500});
    // 운영자 계정은 시험이 많아 시도·월 상한에서 뺀다(하루 한도는 그대로).
    // Fable M-1: 운영자도 시도 상한(하루 한도의 3배)은 지킨다 — 돌려받기를 끝없이 받아 무한히 부르지 않게. 월 상한만 운영자 예외.
    const guard = async (feature, limit) => { await useAttempt(env.DB, user.uid, day, feature, limit); if (acct.admin) return; await useMonthlyBudget(env.DB, user.uid, month, costOf(env, feature), monthlyCapWon(env)); };
    const call = async (messages, opts) => {
      // ⑤ 서비스 전체 예산은 운영자도 예외 없음(가짜 AI는 비용이 없으니 세지 않음)
      try { await guard(opts.feature, opts.limit); if (env.FAKE_AI !== '1') await useGlobalBudget(env.DB, day, month, costOf(env, opts.feature), env); }
      catch (e) { if (opts.feature !== 'parse' && !opts.repeat) await refundFeature(env.DB, user.uid, day, opts.feature); throw e; }
      const out = await callAI(messages, opts);
      // Fable H-2: 실제 사용량으로 장부 맞추기(추정보다 더 든 만큼 더함)
      if (env.FAKE_AI !== '1') await settleCost(env.DB, {uid: user.uid, day, month, admin: acct.admin}, costOf(env, opts.feature), out.model || opts.model, out.usage, env);
      return out;
    };
    const model = env.MODEL || 'claude-haiku-5-5';
    if (path === 'me') {
      const row = await env.DB.prepare('SELECT n FROM usage_feature WHERE uid = ?1 AND day = ?2 AND feature = ?3').bind(user.uid, month, 'cost').first(); const cap = Number(monthlyCapWon(env));
      // 4.29.x 운영자에게만 서비스 전체 사용 금액(장부, 원)과 알림 기준. ALERT_MONTHLY_WON이 없으면 전체 월 상한을 기준으로.
      let global = null;
      if (realAdmin) {
        const g = async key => Number((await env.DB.prepare('SELECT n FROM usage_feature WHERE uid = ?1 AND day = ?2 AND feature = ?3').bind(GLOBAL_UID, key, 'cost').first())?.n || 0) / 10;
        const monthlyCap = guardValue(env, 'GLOBAL_MONTHLY_COST_WON');
        global = {day, month, dayWon: await g(day), monthWon: await g(month), dailyCap: guardValue(env, 'GLOBAL_DAILY_COST_WON'), monthlyCap, alertWon: safeNum(env.ALERT_MONTHLY_WON, monthlyCap, {allowZero: false})};
      }
      return reply(200, {plus: acct.plus, admin: acct.admin, fake: env.FAKE_AI === '1', limits: Object.fromEntries(Object.keys(FEATURES).map(f => [f, limitOf(env, f, acct.plus)])), month: cap > 0 && !acct.admin ? {usedPct: Math.min(100, Math.round(Number(row?.n || 0) / (cap * 10) * 100))} : null, global});
    }
    // 4.28.x 'AI 기록' 대화: 앞의 대화(최근 10턴, 글만)를 함께 보내고, 마지막 사용자 말에 사진·기록 요약을 붙인다.
    // 횟수: 사진이 있으면 사진 한도, 없으면 말 기록 한도(무료도 기록은 되고, 묻기는 지시문이 플러스 안내로 답함).
    if (path === 'converse') {
     const hist = Array.isArray(body?.messages) ? body.messages.slice(-10) : [];
     const turns = hist.map(m => ({role: m?.role === 'assistant' ? 'assistant' : 'user', text: String(m?.text || '').trim().slice(0, 1500)})).filter(m => m.text);
     const last = turns.at(-1);
     const input = readInput({...body, text: last?.role === 'user' ? last.text : ''});
     const feature = input.images.length ? 'photo' : 'parse';
     let quota;
     if (feature === 'photo') quota = await useFeature(env.DB, user.uid, day, 'photo', limitOf(env, 'photo', acct.plus));
     else quota = await useQuota(env.DB, user.uid, day, dailyLimit(env));
     const msgs = turns.slice(0, -1).map(t => ({role: t.role, content: t.text}));
     while (msgs.length && msgs[0].role !== 'user') msgs.shift();
     const lastMsg = buildMessages(input)[0];
     lastMsg.content.at(-1).text = `<plan>${acct.plus ? 'plus' : 'free'}</plan>\n` + lastMsg.content.at(-1).text;
     const merged = [];
     for (const m of [...msgs, lastMsg]) { if (merged.length && merged.at(-1).role === m.role) { const prev = merged.at(-1); prev.content = [...(typeof prev.content === 'string' ? [{type: 'text', text: prev.content}] : prev.content), ...(typeof m.content === 'string' ? [{type: 'text', text: m.content}] : m.content)]; } else merged.push(m); }
     const out = await call(merged, {model, system: CONVERSE_SYSTEM, feature: feature === 'photo' ? 'photo' : 'parse', input: {...input, text: input.text}, effort: 'low', limit: feature === 'photo' ? limitOf(env, 'photo', acct.plus) : dailyLimit(env)});
     if (out.stopReason === 'refusal') { if (feature === 'photo') await refundFeature(env.DB, user.uid, day, 'photo'); throw new HttpError(422, 'AI가 이 내용을 정리하지 못했어요. 표현을 바꿔 다시 해 주세요.'); }
     return reply(200, {text: out.text, model: out.model, left: quota.left});
    }
    if (path === 'parse') {
      const input = readInput(body), feature = input.images.length ? 'photo' : 'parse';
      let quota, repeat = false;
      if (feature === 'photo') { repeat = await photoSeen(env.DB, user.uid, day, await sha256(input.images.map(i => i.data).join('|'))); quota = repeat ? {left: null} : await useFeature(env.DB, user.uid, day, 'photo', limitOf(env, 'photo', acct.plus)); }
      else quota = await useQuota(env.DB, user.uid, day, dailyLimit(env));
      const out = await call(buildMessages(input), {model, system: SYSTEM, feature, input, repeat, effort: 'low', limit: feature === 'photo' ? limitOf(env, 'photo', acct.plus) : dailyLimit(env)});
      if (out.stopReason === 'refusal') { if (feature === 'photo' && !repeat) await refundFeature(env.DB, user.uid, day, 'photo'); throw new HttpError(422, 'AI가 이 내용을 정리하지 못했어요. 표현을 바꿔 다시 해 주세요.'); }
      if (out.stopReason === 'max_tokens') throw new HttpError(422, '내용이 너무 길어요. 나눠서 보내 주세요.');
      if (feature === 'photo' && !repeat && recordsIn(out.text) === 0) { await refundFeature(env.DB, user.uid, day, 'photo'); return reply(200, {text: out.text, model: out.model, left: (quota.left ?? 0) + 1, refunded: true}); }
      return reply(200, {text: out.text, model: out.model, left: quota.left});
    }
    if (path === 'review') {
      const summary = String(body?.summary || '').trim().slice(0, LIMITS.contextChars);
      if (summary.length < 20) throw new HttpError(400, '리뷰할 기록이 부족해요. 며칠 더 기록한 뒤 해 주세요.');
      const quota = await useFeature(env.DB, user.uid, day, 'review', limitOf(env, 'review', acct.plus));
      const out = await call([{role: 'user', content: `<week_summary>\n${summary}\n</week_summary>`}], {model: env.REVIEW_MODEL || 'claude-sonnet-5-5', system: REVIEW_SYSTEM, feature: 'review', input: {}, effort: 'medium', limit: limitOf(env, 'review', acct.plus)});
      if (out.stopReason === 'refusal') { await refundFeature(env.DB, user.uid, day, 'review'); throw new HttpError(422, '리뷰를 만들지 못했어요. 잠시 뒤 다시 해 주세요.'); }
      return reply(200, {text: out.text, model: out.model, left: quota.left});
    }
    if (path === 'chat') {
      const question = String(body?.question || '').trim();
      if (!question) throw new HttpError(400, '물어볼 내용을 적어 주세요.');
      if (question.length > 500) throw new HttpError(400, '질문은 500자까지 보낼 수 있어요.');
      const context = String(body?.context || '').slice(0, LIMITS.contextChars);
      const quota = await useFeature(env.DB, user.uid, day, 'chat', limitOf(env, 'chat', acct.plus));
      const out = await call([{role: 'user', content: `${context ? `<my_records>\n${context}\n</my_records>\n` : ''}<question>\n${question}\n</question>`}], {model, system: CHAT_SYSTEM, feature: 'chat', input: {question}, effort: 'low', limit: limitOf(env, 'chat', acct.plus)});
      if (out.stopReason === 'refusal') { await refundFeature(env.DB, user.uid, day, 'chat'); throw new HttpError(422, '이 질문에는 답하기 어려워요. 다르게 물어봐 주세요.'); }
      return reply(200, {text: out.text, model: out.model, left: quota.left});
    }
    // recipe
    const text = String(body?.text || '').trim();
    if (!text) throw new HttpError(400, '레시피 글을 붙여 넣어 주세요.');
    if (text.length > 3000) throw new HttpError(400, '레시피는 3,000자까지 보낼 수 있어요.');
    const quota = await useFeature(env.DB, user.uid, day, 'recipe', limitOf(env, 'recipe', acct.plus));
    const out = await call([{role: 'user', content: `<recipe>\n${text}\n</recipe>`}], {model, system: RECIPE_SYSTEM, feature: 'recipe', input: {}, effort: 'low', limit: limitOf(env, 'recipe', acct.plus)});
    let parsed = null; try { parsed = JSON.parse(String(out.text).match(/\{[\s\S]*\}/)?.[0] || ''); } catch {}
    if (!parsed || !Array.isArray(parsed.ingredients) || !parsed.ingredients.length) { await refundFeature(env.DB, user.uid, day, 'recipe'); return reply(200, {recipe: null, left: quota.left + 1, refunded: true}); }
    return reply(200, {recipe: parsed, model: out.model, left: quota.left});
  } catch (error) {
    if (error instanceof HttpError) return reply(error.status, {error: error.message});
    console.error(error);
    return reply(502, {error: 'AI 처리에 실패했어요. 잠시 뒤 다시 해 주세요.'});
  }
}
