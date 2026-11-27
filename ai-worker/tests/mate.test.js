import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync} from 'node:fs';
import {resetKeyCache} from '../src/handler.js';
import {route, limitOf} from '../src/routes.js';
import {clearMemberCache} from '../src/mate.js';

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


// 5.0.0 로그메이트 사진(R2): 방 멤버만 올리고 보고, 내 사진만 지운다. AI는 부르지 않는다.
function mateSetup(members = ['u1', 'u2']) {
  const s = setup(), store = new Map();
  s.deps.fetchImpl = async url => {
    url = String(url);
    if (url.includes('service_accounts')) return new Response(JSON.stringify({keys: [jwk]}));
    if (url.includes('/documents/users/')) return new Response(JSON.stringify({fields: {status: {stringValue: 'approved'}}}));
    if (url.includes('/documents/rooms/roomAAAABBBBCCCC')) return new Response(JSON.stringify({fields: {memberIds: {arrayValue: {values: members.map(m => ({stringValue: m}))}}}}));
    if (url.includes('/documents/rooms/')) return new Response('{}', {status: 403});
    throw Error('unexpected ' + url);
  };
  s.deps.env.MATE = {put: async (k, v, o) => { store.set(k, {v: new Uint8Array(v), o}); }, head: async k => store.has(k) ? {size: store.get(k).v.byteLength} : null, get: async k => store.has(k) ? {body: store.get(k).v, httpMetadata: store.get(k).o.httpMetadata} : null, delete: async k => { store.delete(k); }};
  return {...s, store};
}
const up = (tok, room, id, bytes = 100, type = 'image/webp') => new Request(`https://ai.example/mate/upload?room=${room}&id=${id}`, {method: 'POST', headers: {origin: 'https://studiohooje.github.io', 'content-type': type, authorization: `Bearer ${tok}`, 'content-length': String(bytes)}, body: new Uint8Array(bytes)});
test('로그메이트 사진: 멤버만 올리고 보기, 내 사진만 지우기, AI 호출 없음', async () => {
  resetKeyCache(); clearMemberCache(); const s = mateSetup(); const t1 = await token('u1'), t3 = await token('u3');
  const r = await route(up(t1, 'roomAAAABBBBCCCC', 'abcdEFGH1234'), s.deps); assert.equal(r.status, 200);
  const {key} = await r.json(); assert.equal(key, 'rooms/roomAAAABBBBCCCC/u1/abcdEFGH1234.webp');
  assert.equal((await route(up(t3, 'roomAAAABBBBCCCC', 'abcdEFGH9999'), s.deps)).status, 403, '멤버가 아니면 못 올림');
  assert.equal((await route(up(t1, 'roomZZZZZZZZZZZZ', 'abcdEFGH1234'), s.deps)).status, 403, '다른 방');
  assert.equal((await route(up(t1, 'roomAAAABBBBCCCC', 'abcdEFGH1234', 100, 'image/png'), s.deps)).status, 415);
  assert.equal((await route(up(t1, 'roomAAAABBBBCCCC', 'abcdEFGH1234', 500_000), s.deps)).status, 413);
  assert.equal((await route(up(t1, 'roomAAAABBBBCCCC', '../x'), s.deps)).status, 400);
  const t2 = await token('u2');
  const g = await route(await post('mate/photo', {key}, t2), s.deps); assert.equal(g.status, 200); assert.equal((await g.arrayBuffer()).byteLength, 100);
  assert.equal((await route(await post('mate/photo', {key}, t3), s.deps)).status, 403, '남은 못 봄');
  assert.equal((await route(await post('mate/delete', {key}, t2), s.deps)).status, 403, '남의 사진은 못 지움');
  assert.equal((await route(await post('mate/delete', {key}, t1), s.deps)).status, 200);
  assert.equal(s.store.size, 0);
  assert.equal(s.calls.length, 0, 'AI는 부르지 않음');
});

test('로그메이트 사진 비용 장치: 하루 장수·전체 저장량 상한', async () => {
  resetKeyCache(); clearMemberCache(); const s = mateSetup(); s.deps.env.MATE_DAILY_UPLOADS = '2'; s.deps.env.MATE_TOTAL_MB = '1'; const t1 = await token('u1');
  assert.equal((await route(up(t1, 'roomAAAABBBBCCCC', 'aaaaBBBB0001', 300_000), s.deps)).status, 200);
  assert.equal((await route(up(t1, 'roomAAAABBBBCCCC', 'aaaaBBBB0002', 300_000), s.deps)).status, 200);
  assert.equal((await route(up(t1, 'roomAAAABBBBCCCC', 'aaaaBBBB0003', 300_000), s.deps)).status, 429, '하루 2장 넘음');
  s.deps.env.MATE_DAILY_UPLOADS = '50';
  assert.equal((await route(up(t1, 'roomAAAABBBBCCCC', 'aaaaBBBB0004', 300_000), s.deps)).status, 200);
  assert.equal((await route(up(t1, 'roomAAAABBBBCCCC', 'aaaaBBBB0005', 300_000), s.deps)).status, 507, '전체 1MB 넘음');
  // 지우면 공간이 돌아온다
  assert.equal((await route(await post('mate/delete', {key: 'rooms/roomAAAABBBBCCCC/u1/aaaaBBBB0001.webp'}, t1), s.deps)).status, 200);
  assert.equal((await route(up(t1, 'roomAAAABBBBCCCC', 'aaaaBBBB0006', 300_000), s.deps)).status, 200);
});

test('5.0.4 AI 인사이트: 플러스만, 요약이 짧으면 거절, JSON을 정리해 돌려줌', async () => {
  resetKeyCache(); clearMemberCache();
  const s = setup({plan: 'plus', answer: () => '```json\n{"headline":"좋아요","meal":{"title":"저녁","items":["닭가슴살 150g","현미밥"],"note":"단백질"},"workout":{"title":"등","plan":[["랫풀다운","4x10"]],"note":"하체 회복"},"week":["3번"],"weight":["유지"]}\n```'});
  s.deps.env.LIMIT_INSIGHT = '0/3';
  const tok = await token('u9');
  const short = await route(await post('insight', {facts: '짧음'}, tok), s.deps); assert.equal(short.status, 400);
  const r = await route(await post('insight', {facts: '최근 14일 식사 30끼, 운동 6회, 체중 10회. 오늘 남은 단백질 60g, 칼로리 700kcal.'}, tok), s.deps);
  assert.equal(r.status, 200);
  const j = await r.json(); assert.equal(j.insight.meal.items.length, 2); assert.equal(j.insight.workout.plan[0][0], '랫풀다운'); assert.equal(j.left, 2);
  const free = setup({}); free.deps.env.LIMIT_INSIGHT = '0/3';
  const f = await route(await post('insight', {facts: '최근 14일 식사 30끼, 운동 6회, 체중 10회. 오늘 남은 단백질 60g, 칼로리 700kcal.'}, await token('u8')), free.deps);
  assert.equal(f.status, 402, '무료는 플러스 안내');
});

test('메이트 사진: 서버에서 EXIF·XMP를 지우고 그림은 그대로', async () => {
 const {stripMeta} = await import('../src/strip-meta.js');
 const seg = (m, body) => [0xFF, m, ((body.length + 2) >> 8) & 255, (body.length + 2) & 255, ...body];
 const exif = [...'Exif'].map(c => c.charCodeAt(0)).concat([0, 0, 1, 2, 3]);
 const jpg = new Uint8Array([0xFF, 0xD8, ...seg(0xE0, [74, 70, 73, 70, 0]), ...seg(0xE1, exif), ...seg(0xDB, [1, 2]), 0xFF, 0xDA, 0, 4, 9, 9, 0xFF, 0xD9]);
 const out = stripMeta(jpg.buffer, 'image/jpeg');
 assert.equal(out.length, jpg.length - (exif.length + 4));
 assert.ok(!Buffer.from(out).includes(Buffer.from('Exif')));
 assert.deepEqual([...out.slice(-8)], [...jpg.slice(-8)], '그림 데이터(SOS 뒤)는 그대로');
 const chunk = (t, body) => { const p = body.length & 1 ? [0] : []; return [...t].map(c => c.charCodeAt(0)).concat([body.length & 255, 0, 0, 0], body, p); };
 const inner = [...chunk('VP8X', [0x0C, 0, 0, 0, 0, 0, 0, 0, 0, 0]), ...chunk('VP8 ', [1, 2, 3, 4]), ...chunk('EXIF', [5, 6, 7])];
 const webp = new Uint8Array([...'RIFF'].map(c => c.charCodeAt(0)).concat([(inner.length + 4) & 255, 0, 0, 0], [...'WEBP'].map(c => c.charCodeAt(0)), inner));
 const w = stripMeta(webp.buffer, 'image/webp'), s = Buffer.from(w);
 assert.ok(!s.includes(Buffer.from('EXIF'))); assert.ok(s.includes(Buffer.from('VP8 ')));
 assert.equal(w[12 + 8] & 0x0C, 0, 'VP8X의 EXIF·XMP 표시 끔'); assert.equal(webp[12 + 8] & 0x0C, 0x0C);
 assert.equal(w[4] | (w[5] << 8), w.length - 8, 'RIFF 크기 다시 계산');
});
