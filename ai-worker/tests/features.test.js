import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync} from 'node:fs';
import {resetKeyCache} from '../src/handler.js';
import {route, limitOf} from '../src/routes.js';
import {parsePaste} from '../../app/ai-paste.js';

// 4.17.0 기능별 처리 시험: 플러스 여부, 기능별 하루 한도, 같은 사진·인식 실패 미차감, 가짜 AI. 외부 호출 없음.
const PROJECT = 'mylogue-1eedb', NOW = Date.parse('2026-11-23T03:00:00Z');
const {publicKey, privateKey} = await crypto.subtle.generateKey({name: 'RSASSA-PKCS1-v1_5', modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256'}, true, ['sign', 'verify']);
const jwk = {...await crypto.subtle.exportKey('jwk', publicKey), kid: 'k1'};
const enc = o => Buffer.from(JSON.stringify(o)).toString('base64url');
async function token(sub = 'u1') { const head = enc({alg: 'RS256', kid: 'k1'}), body = enc({aud: PROJECT, iss: `https://securetoken.google.com/${PROJECT}`, sub, email: `${sub}@x.test`, email_verified: true, iat: NOW / 1000 - 60, exp: NOW / 1000 + 3000}); const sig = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', privateKey, new TextEncoder().encode(`${head}.${body}`)); return `${head}.${body}.${Buffer.from(sig).toString('base64url')}`; }
function d1() { const db = new DatabaseSync(':memory:'); db.exec(readFileSync(new URL('../schema.sql', import.meta.url), 'utf8')); return {prepare: sql => ({bind: (...a) => ({first: async () => db.prepare(sql.replace(/\?\d/g, '?')).get(...a) ?? null})})}; }
// 4.29.x 기존 시험은 기능별 한도만 보도록 속도 제한·되풀이 막기를 끈다(guards.test.js에서 따로 시험)
function setup({plan = '', plusAll = '0', fake = '0', answer, guards = {DUP_WINDOW_SEC: '0', RATE_PER_MIN: '0', RATE_PER_HOUR: '0', ADMIN_RATE_PER_MIN: '0', ADMIN_RATE_PER_HOUR: '0'}} = {}) {
  const calls = [];
  const fetchImpl = async url => {
    if (String(url).includes('service_accounts')) return new Response(JSON.stringify({keys: [jwk]}));
    if (String(url).includes('firestore.googleapis.com')) return new Response(JSON.stringify({fields: {status: {stringValue: 'approved'}, ...(plan ? {plan: {stringValue: plan}} : {})}}));
    throw Error('unexpected ' + url);
  };
  const env = {FIREBASE_PROJECT_ID: PROJECT, ALLOWED_ORIGINS: 'https://studiohooje.github.io', DAILY_LIMIT: '30', MODEL: 'claude-haiku-5-5', REVIEW_MODEL: 'claude-sonnet-5-5', PLUS_ALL: plusAll, LIMIT_PHOTO: '1/3', LIMIT_REVIEW: '0/2', LIMIT_CHAT: '0/2', LIMIT_RECIPE: '0/2', FAKE_AI: fake, DB: d1(), ...guards};
  const callClaude = async (messages, opts) => { calls.push({messages, opts}); return {text: answer ? answer(opts) : '```json\n{"mylogue":1,"records":[{"type":"meal","date":"2026-11-23","time":"12:00","items":[{"name":"비빔밥","qty":1,"unit":"그릇","kcal":560,"carbs":85,"protein":18,"fat":14}]}]}\n```', stopReason: 'end_turn', model: opts.model}; };
  return {calls, deps: {env, fetchImpl, callClaude, now: () => NOW}};
}
const post = async (path, body, tok) => new Request(`https://ai.example/${path}`, {method: 'POST', headers: {origin: 'https://studiohooje.github.io', 'content-type': 'application/json', authorization: `Bearer ${tok}`}, body: JSON.stringify(body)});
const img = d => ({media_type: 'image/jpeg', data: Buffer.from(d).toString('base64')});

test('무료 계정: 사진 하루 1번, 리뷰·묻기·레시피는 플러스 안내(402)', async () => {
  resetKeyCache(); const s = setup(); const tok = await token();
  assert.equal((await route(await post('parse', {images: [img('a')]}, tok), s.deps)).status, 200);
  const second = await route(await post('parse', {images: [img('b')]}, tok), s.deps);
  assert.equal(second.status, 429);
  for (const [p, b] of [['review', {summary: 'x'.repeat(40)}], ['chat', {question: '단백질 얼마나?'}], ['recipe', {text: '김치찌개 김치 200g'}]]) {
    const r = await route(await post(p, b, tok), s.deps); assert.equal(r.status, 402, p); assert.match((await r.json()).error, /플러스/);
  }
});
test('플러스 계정(계정 plan 또는 베타 전체 플러스): 모델 선택과 한도', async () => {
  resetKeyCache(); const s = setup({plan: 'plus'}); const tok = await token();
  const rv = await route(await post('review', {summary: '이번 주 운동 3일, 평균 1,800kcal, 단백질 90g'}, tok), s.deps);
  assert.equal(rv.status, 200); assert.equal(s.calls.at(-1).opts.model, 'claude-sonnet-5-5');
  const ch = await route(await post('chat', {question: '오늘 뭐 먹지?', context: '최근 기록'}, tok), s.deps);
  assert.equal(ch.status, 200); assert.equal(s.calls.at(-1).opts.model, 'claude-haiku-5-5');
  assert.equal((await route(await post('chat', {question: '두 번째'}, tok), s.deps)).status, 200);
  assert.equal((await route(await post('chat', {question: '세 번째'}, tok), s.deps)).status, 429);
  const all = setup({plusAll: '1'}); assert.equal((await route(await post('review', {summary: 'x'.repeat(40)}, tok), all.deps)).status, 200);
  assert.equal(limitOf({LIMIT_PHOTO: '1/20'}, 'photo', true), 20);
});
test('같은 사진 재시도는 차감 안 하고, 4번째부터 막는다', async () => {
  resetKeyCache(); const s = setup(); const tok = await token();
  for (let i = 0; i < 3; i++) assert.equal((await route(await post('parse', {images: [img('same')]}, tok), s.deps)).status, 200, `시도 ${i + 1}`);
  assert.equal((await route(await post('parse', {images: [img('same')]}, tok), s.deps)).status, 429);
});
test('사진에서 아무것도 못 알아보면 횟수를 돌려준다', async () => {
  resetKeyCache(); const s = setup({answer: () => '```json\n{"mylogue":1,"records":[]}\n```'}); const tok = await token();
  const r = await route(await post('parse', {images: [img('blur')]}, tok), s.deps); const b = await r.json();
  assert.equal(r.status, 200); assert.equal(b.refunded, true);
  // 돌려받았으니 다른 사진도 보낼 수 있다(무료 1번)
  s.deps.callClaude = async (m, o) => ({text: '```json\n{"mylogue":1,"records":[{"type":"meal","date":"2026-11-23","time":"12:00","items":[{"name":"김밥","qty":1,"unit":"줄","kcal":400}]}]}\n```', stopReason: 'end_turn', model: o.model});
  assert.equal((await route(await post('parse', {images: [img('clear')]}, tok), s.deps)).status, 200);
});
test('가짜 AI 모드: Claude를 부르지 않고 앱이 읽을 수 있는 답', async () => {
  resetKeyCache(); const s = setup({plan: 'plus', fake: '1'}); const tok = await token();
  const p = await (await route(await post('parse', {text: '점심 비빔밥', today: '2026-11-23', now: '12:00'}, tok), s.deps)).json();
  assert.equal(parsePaste(p.text)[0].parsedData.items[0].name, '가짜 AI 비빔밥');
  const rc = await (await route(await post('recipe', {text: '김치찌개'}, tok), s.deps)).json();
  assert.ok(rc.recipe.ingredients.length >= 2);
  const me = await (await route(await post('me', {}, tok), s.deps)).json();
  assert.equal(me.fake, true); assert.equal(me.plus, true); assert.equal(me.limits.chat, 2);
  assert.equal(s.calls.length, 0);
});
test('레시피 분해 실패는 횟수 미차감', async () => {
  resetKeyCache(); const s = setup({plan: 'plus', answer: () => '모르겠어요'}); const tok = await token();
  const b = await (await route(await post('recipe', {text: '이건 레시피가 아님'}, tok), s.deps)).json();
  assert.equal(b.recipe, null); assert.equal(b.refunded, true);
});

// 4.27.0 전수검사 S-02·B-10: 실패 환불을 이용한 무제한 호출 막기, 1인 월 원가 상한
test('인식 실패(기록 0건)를 계속 보내도 AI 호출은 하루 한도의 3배에서 멈춘다', async () => {
  resetKeyCache(); const s = setup({plan: 'plus', answer: () => '```json\n{"mylogue":1,"records":[]}\n```'}); const tok = await token();
  const st = {};
  for (let i = 0; i < 30; i++) { const r = await route(await post('parse', {images: [img('p' + i)]}, tok), s.deps); st[r.status] = (st[r.status] || 0) + 1; }
  assert.equal(s.calls.length, 9); // LIMIT_PHOTO 플러스 3 × 3
  assert.equal(st[429], 21);
});
test('거절(refusal)되는 질문을 계속 보내도 호출이 멈춘다', async () => {
  resetKeyCache(); const s = setup({plan: 'plus'}); s.deps.callClaude = async (m, o) => { s.calls.push(o); return {text: '', stopReason: 'refusal', model: o.model}; };
  const tok = await token();
  for (let i = 0; i < 20; i++) await route(await post('chat', {question: '질문 ' + i}, tok), s.deps);
  assert.equal(s.calls.length, 6); // LIMIT_CHAT 플러스 2 × 3
});
test('1인 월 원가 상한(MONTHLY_COST_WON)을 넘으면 그 달은 AI를 부르지 않는다', async () => {
  resetKeyCache(); const s = setup({plan: 'plus'}); s.deps.env.MONTHLY_COST_WON = '1'; s.deps.env.COST_WON = 'parse:0.4'; const tok = await token();
  const codes = [];
  for (let i = 0; i < 4; i++) codes.push((await route(await post('parse', {text: '점심 비빔밥 ' + i}, tok), s.deps)).status);
  assert.deepEqual(codes, [200, 200, 429, 429]);
  assert.equal(s.calls.length, 2);
  const r = await route(await post('parse', {text: '저녁'}, tok), s.deps);
  assert.match((await r.json()).error, /다음 달 1일/);
});

// 4.28.x 'AI 기록' 대화(converse): 앞의 대화를 함께 보내고, 사진이면 사진 한도·글이면 말 기록 한도
test('대화: 앞의 대화(최근 10턴)가 Claude에 함께 가고, 역할이 번갈아 맞으며, 마지막 말에 플랜 표시', async () => {
 resetKeyCache(); const s = setup({plan: 'plus'}); const tok = await token();
 const messages = [{role: 'assistant', text: '안녕하세요'}, ...Array.from({length: 12}, (_, i) => ({role: i % 2 ? 'assistant' : 'user', text: `말 ${i}`})), {role: 'user', text: '아 콜라는 제로였어'}];
 const r = await route(await post('converse', {messages, today: '2026-11-23', now: '12:40'}, tok), s.deps);
 assert.equal(r.status, 200);
 const sent = s.calls[0].messages;
 assert.equal(sent[0].role, 'user');
 for (let i = 1; i < sent.length; i++) assert.notEqual(sent[i].role, sent[i - 1].role);
 const lastText = sent.at(-1).content.at(-1).text;
 assert.match(lastText, /<plan>plus<\/plan>/); assert.match(lastText, /콜라는 제로였어/);
 assert.ok(sent.length <= 10);
 assert.match(s.calls[0].opts.system, /대화 규칙/);
});
test('대화: 사진이 있으면 사진 한도(무료 하루 1번)를 쓴다', async () => {
 resetKeyCache(); const s = setup(); const tok = await token();
 assert.equal((await route(await post('converse', {messages: [{role: 'user', text: '점심'}], images: [img('a')]}, tok), s.deps)).status, 200);
 assert.equal((await route(await post('converse', {messages: [{role: 'user', text: '저녁'}], images: [img('b')]}, tok), s.deps)).status, 429);
 assert.equal((await route(await post('converse', {messages: [{role: 'user', text: '글로만 기록'}]}, tok), s.deps)).status, 200);
});
test('대화(가짜 AI): 질문이면 글 답, 기록이면 마이로그 코드', async () => {
 resetKeyCache(); const s = setup({fake: '1', plan: 'plus'}); const tok = await token();
 const q = await (await route(await post('converse', {messages: [{role: 'user', text: '오늘 저녁 뭐 먹지?'}]}, tok), s.deps)).json();
 assert.doesNotMatch(q.text, /```/);
 const rec = await (await route(await post('converse', {messages: [{role: 'user', text: '점심 비빔밥'}]}, tok), s.deps)).json();
 assert.match(rec.text, /```json/);
});
// 4.29.0 슈퍼관리자 '일반 사용자로 보기': 서버도 일반 한도로(낮추기만), 일반 계정이 'plus'를 보내도 올라가지 않는다
test('슈퍼관리자 보기 기준: 일반이면 무료 한도, 아니면 운영자 그대로, 일반 계정은 올릴 수 없음', async () => {
 resetKeyCache(); const s = setup(); const admin = await token('bulbnZbmC4PgH8tUAOjfPPLE7pA3');
 const photo = (t, view) => post('converse', {messages: [{role: 'user', text: t}], images: [img(t)], ...(view ? {viewPlan: view} : {})}, admin);
 assert.equal((await route(await photo('a1', 'free'), s.deps)).status, 200);
 assert.equal((await route(await photo('a2', 'free'), s.deps)).status, 429);
 assert.equal((await route(await photo('a3'), s.deps)).status, 200);
 assert.equal((await route(await photo('a4', 'plus'), s.deps)).status, 200);
 resetKeyCache(); const s2 = setup(); const user = await token('u9');
 const up = (t) => post('converse', {messages: [{role: 'user', text: t}], images: [img(t)], viewPlan: 'plus'}, user);
 assert.equal((await route(await up('b1'), s2.deps)).status, 200);
 assert.equal((await route(await up('b2'), s2.deps)).status, 429);
});

// ── 4.29.x 불필요한 AI 호출 막기(서버) ──
const say = (t, extra = {}) => ({messages: [{role: 'user', text: t}], ...extra});
test('막기 ① 전체 끄기 스위치: AI_ENABLED=0이면 AI를 부르지 않고 503, me는 응답', async () => {
 resetKeyCache(); const s = setup(); s.deps.env.AI_ENABLED = '0'; const tok = await token();
 assert.equal((await route(await post('converse', say('점심'), tok), s.deps)).status, 503);
 assert.equal((await route(await post('me', {}, tok), s.deps)).status, 200);
 assert.equal(s.calls.length, 0);
});
test('막기 ② 너무 큰 요청은 읽기 전에 413', async () => {
 resetKeyCache(); const s = setup(); s.deps.env.MAX_BODY_BYTES = '1000'; const tok = await token();
 assert.equal((await route(await post('converse', say('가'.repeat(2000)), tok), s.deps)).status, 413);
 assert.equal(s.calls.length, 0);
});
test('막기 ③ 1분에 정해진 횟수를 넘으면 429, 운영자도 상한이 있다', async () => {
 resetKeyCache(); const s = setup({guards: {DUP_WINDOW_SEC: '0', RATE_PER_MIN: '3', RATE_PER_HOUR: '100', ADMIN_RATE_PER_MIN: '5', ADMIN_RATE_PER_HOUR: '100'}}); const tok = await token();
 const st = []; for (let i = 0; i < 4; i++) st.push((await route(await post('converse', say(`기록 ${i}`), tok), s.deps)).status);
 assert.deepEqual(st, [200, 200, 200, 429]);
 assert.equal(s.calls.length, 3);
 const admin = await token('bulbnZbmC4PgH8tUAOjfPPLE7pA3'); const sa = [];
 for (let i = 0; i < 6; i++) sa.push((await route(await post('converse', say(`관리 ${i}`), admin), s.deps)).status);
 assert.deepEqual(sa, [200, 200, 200, 200, 200, 429]);
});
test('막기 ④ 같은 내용을 20초 안에 다시 보내면 429(시각 값만 달라도 같은 요청), 시간이 지나면 다시 된다', async () => {
 resetKeyCache(); const s = setup({guards: {DUP_WINDOW_SEC: '20', RATE_PER_MIN: '0', RATE_PER_HOUR: '0', ADMIN_RATE_PER_MIN: '0', ADMIN_RATE_PER_HOUR: '0'}}); const tok = await token();
 let t = NOW; s.deps.now = () => t;
 assert.equal((await route(await post('converse', say('점심 비빔밥', {now: '12:00'}), tok), s.deps)).status, 200);
 assert.equal((await route(await post('converse', say('점심 비빔밥', {now: '12:01'}), tok), s.deps)).status, 429);
 assert.equal((await route(await post('converse', say('저녁 비빔밥'), tok), s.deps)).status, 200);
 t = NOW + 25_000;
 assert.equal((await route(await post('converse', say('점심 비빔밥'), tok), s.deps)).status, 200);
 assert.equal(s.calls.length, 3);
});
test('막기 ⑤ 서비스 전체 하루 예산을 넘으면 운영자도 503, 기능 횟수는 돌려준다', async () => {
 resetKeyCache(); const s = setup({plan: 'plus'}); s.deps.env.GLOBAL_DAILY_COST_WON = '5'; s.deps.env.COST_WON = 'chat:2'; s.deps.env.LIMIT_CHAT = '0/10'; const tok = await token();
 const ask = q => post('chat', {question: q}, tok);
 assert.equal((await route(await ask('첫 질문'), s.deps)).status, 200);
 assert.equal((await route(await ask('둘째 질문'), s.deps)).status, 200);
 const third = await route(await ask('셋째 질문'), s.deps);
 assert.equal(third.status, 503);
 assert.equal(s.calls.length, 2);
 const admin = await token('bulbnZbmC4PgH8tUAOjfPPLE7pA3');
 assert.equal((await route(await post('chat', {question: '운영자 질문'}, admin), s.deps)).status, 503);
});
test('답 길이 상한: 기능별 최대 출력 토큰을 모델 호출에 넘긴다', async () => {
 resetKeyCache(); const s = setup({plan: 'plus'}); const tok = await token();
 await route(await post('converse', say('점심'), tok), s.deps);
 await route(await post('chat', {question: '단백질?'}, tok), s.deps);
 assert.equal(s.calls[0].opts.maxTokens, 1500);
 assert.equal(s.calls[1].opts.maxTokens, 800);
});

// ── Fable 전수조사 반영(2026-11-25) ──
const noGuards = {DUP_WINDOW_SEC: '0', RATE_PER_MIN: '0', RATE_PER_HOUR: '0', ADMIN_RATE_PER_MIN: '0', ADMIN_RATE_PER_HOUR: '0'};
test('H-1: 숫자 칸에 쉼표·원이 섞여도 장치가 꺼지지 않는다(기본값으로)', async () => {
 resetKeyCache(); const s = setup({guards: {DUP_WINDOW_SEC: '20초', RATE_PER_MIN: '3,000', RATE_PER_HOUR: 'abc', ADMIN_RATE_PER_MIN: '', ADMIN_RATE_PER_HOUR: ''}}); s.deps.env.GLOBAL_DAILY_COST_WON = '3,000원'; s.deps.env.DAILY_LIMIT = '30번'; const tok = await token();
 const st = []; for (let i = 0; i < 8; i++) st.push((await route(await post('converse', say('같은 말'), tok), s.deps)).status);
 assert.equal(st[0], 200); assert.ok(st.slice(1).every(x => x === 429), st.join(','));
 assert.equal(s.calls.length, 1);
});
test('H-1: 전체 예산은 0으로도 끌 수 없다', async () => {
 const {guardValue} = await import('../src/guards.js');
 assert.equal(guardValue({GLOBAL_DAILY_COST_WON: '0'}, 'GLOBAL_DAILY_COST_WON'), 3000);
 assert.equal(guardValue({RATE_PER_MIN: '0'}, 'RATE_PER_MIN'), 0);
});
test('M-1: 운영자도 돌려받기를 끝없이 받지 못한다(시도 상한 = 하루 한도×3)', async () => {
 resetKeyCache(); const s = setup({plan: 'plus', guards: noGuards, answer: () => '레시피 아님'}); s.deps.env.LIMIT_RECIPE = '0/2'; const admin = await token('bulbnZbmC4PgH8tUAOjfPPLE7pA3');
 for (let i = 0; i < 12; i++) await route(await post('recipe', {text: `레시피 ${i}`}, admin), s.deps);
 assert.equal(s.calls.length, 6); // 2 × 3
});
test('M-2: 같은 요청이 동시에 와도 하나만 통과', async () => {
 resetKeyCache(); const s = setup({guards: {...noGuards, DUP_WINDOW_SEC: '20'}}); const tok = await token();
 const rs = await Promise.all([1, 2, 3].map(async () => (await route(await post('converse', say('동시에 같은 말'), tok), s.deps)).status));
 assert.equal(rs.filter(x => x === 200).length, 1);
});
test('H-2: 실제 사용량이 추정보다 크면 전체 예산 장부에 차이를 더한다', async () => {
 resetKeyCache(); const s = setup({plan: 'plus', guards: noGuards}); const tok = await token();
 s.deps.callClaude = async (messages, opts) => ({text: '```json\n{"mylogue":1,"records":[]}\n```', stopReason: 'end_turn', model: 'claude-haiku-5-5', usage: {input_tokens: 40000, output_tokens: 1500}});
 s.deps.env.GLOBAL_DAILY_COST_WON = '8'; s.deps.env.COST_WON = 'parse:2';
 assert.equal((await route(await post('converse', say('긴 대화 1'), tok), s.deps)).status, 200); // 실제 약 6.9원
 assert.equal((await route(await post('converse', say('긴 대화 2'), tok), s.deps)).status, 503); // 장부 6.9(실제) + 2(다음 추정) = 8.9 > 8
});
test('H-2: 실제 비용 계산(모델 가격·환율)', async () => {
 const {usageWon, priceOf} = await import('../src/guards.js');
 assert.deepEqual(priceOf({}, 'claude-haiku-5-5-20261015'), [0.10, 0.50]);
 assert.deepEqual(priceOf({MODEL_PRICES: 'gpt-5-nano=0.05/0.40'}, 'gpt-5-nano'), [0.05, 0.40]);
 assert.deepEqual(priceOf({}, '모르는-모델'), [2, 10]);
 assert.equal(Math.round(usageWon({USD_KRW: '1450'}, 'claude-haiku-5-5', {input_tokens: 7500, output_tokens: 700}) * 100) / 100, 1.6);
 assert.equal(usageWon({}, 'x', null), null);
});
test('시간당 상한과 전체 월 예산', async () => {
 resetKeyCache(); const s = setup({guards: {...noGuards, RATE_PER_HOUR: '3'}}); const tok = await token();
 let t = NOW; s.deps.now = () => t; const st = [];
 for (let i = 0; i < 4; i++) { st.push((await route(await post('converse', say(`시간 ${i}`), tok), s.deps)).status); t += 61_000; }
 assert.deepEqual(st, [200, 200, 200, 429]);
 resetKeyCache(); const s2 = setup({plan: 'plus', guards: noGuards}); s2.deps.env.GLOBAL_MONTHLY_COST_WON = '3'; s2.deps.env.COST_WON = 'parse:2'; const tok2 = await token();
 assert.equal((await route(await post('converse', say('월 1'), tok2), s2.deps)).status, 200);
 assert.equal((await route(await post('converse', say('월 2'), tok2), s2.deps)).status, 503);
});
test('읽기 전 413: content-length가 크면 본문을 읽지 않는다', async () => {
 resetKeyCache(); const s = setup(); s.deps.env.MAX_BODY_BYTES = '100'; const tok = await token();
 const req = new Request('https://ai.example/converse', {method: 'POST', headers: {origin: 'https://studiohooje.github.io', 'content-type': 'application/json', 'content-length': '5000', authorization: `Bearer ${tok}`}, body: JSON.stringify(say('가'))});
 assert.equal((await route(req, s.deps)).status, 413); assert.equal(req.bodyUsed, false);
});
test('승인 안 된 계정은 D1(횟수·속도·예산)을 건드리지 않는다', async () => {
 resetKeyCache(); const s = setup(); const tok = await token('u-new');
 s.deps.fetchImpl = async url => String(url).includes('service_accounts') ? new Response(JSON.stringify({keys: [jwk]})) : new Response('{}', {status: 404});
 let touched = 0; const db = s.deps.env.DB; s.deps.env.DB = {prepare: sql => { touched++; return db.prepare(sql); }};
 assert.equal((await route(await post('converse', say('점심'), tok), s.deps)).status, 403);
 assert.equal(touched, 0); assert.equal(s.calls.length, 0);
});
test('비용 알림: 운영자에게만 서비스 전체 사용 금액과 알림 기준을 알려 준다', async () => {
 resetKeyCache(); const s = setup({plan: 'plus', guards: noGuards}); s.deps.env.ALERT_MONTHLY_WON = '20000'; s.deps.env.COST_WON = 'parse:2'; const tok = await token(), admin = await token('bulbnZbmC4PgH8tUAOjfPPLE7pA3');
 await route(await post('converse', say('점심'), tok), s.deps);
 const me = await (await route(await post('me', {}, admin), s.deps)).json();
 assert.equal(me.global.monthWon, 2); assert.equal(me.global.dayWon, 2); assert.equal(me.global.alertWon, 20000); assert.equal(me.global.monthlyCap, 30000);
 const meFree = await (await route(await post('me', {viewPlan: 'free'}, admin), s.deps)).json();
 assert.ok(meFree.global, '일반으로 보기 중에도 운영자에게는 보임');
 const user = await (await route(await post('me', {}, tok), s.deps)).json();
 assert.equal(user.global, null);
});
