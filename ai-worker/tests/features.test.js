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
function setup({plan = '', plusAll = '0', fake = '0', answer} = {}) {
  const calls = [];
  const fetchImpl = async url => {
    if (String(url).includes('service_accounts')) return new Response(JSON.stringify({keys: [jwk]}));
    if (String(url).includes('firestore.googleapis.com')) return new Response(JSON.stringify({fields: {status: {stringValue: 'approved'}, ...(plan ? {plan: {stringValue: plan}} : {})}}));
    throw Error('unexpected ' + url);
  };
  const env = {FIREBASE_PROJECT_ID: PROJECT, ALLOWED_ORIGINS: 'https://studiohooje.github.io', DAILY_LIMIT: '30', MODEL: 'claude-haiku-5-5', REVIEW_MODEL: 'claude-sonnet-5-5', PLUS_ALL: plusAll, LIMIT_PHOTO: '1/3', LIMIT_REVIEW: '0/2', LIMIT_CHAT: '0/2', LIMIT_RECIPE: '0/2', FAKE_AI: fake, DB: d1()};
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
