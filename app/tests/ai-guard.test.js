// 4.29.x 불필요한 AI 호출 막기(앱): 진행 중 같은 요청 합치기, 연타, 1분·10분 상한, 연속 실패 쉬기, 429 쿨다운, 재시도 없음
import test from 'node:test';
import assert from 'node:assert/strict';
import {createAIGuard, requestKey} from '../ai-guard.js';

const mem = () => { const m = new Map(); return {getItem: k => m.get(k) ?? null, setItem: (k, v) => m.set(k, String(v)), removeItem: k => m.delete(k)}; };
const clock = (t = 1_000_000) => ({now: () => t, add: ms => { t += ms; }});

test('같은 요청이 진행 중이면 서버를 한 번만 부르고 같은 답을 나눈다', async () => {
 const c = clock(), g = createAIGuard({now: c.now, storage: mem()}); let calls = 0, release;
 const fn = () => { calls++; return new Promise(r => { release = r; }); };
 const k = requestKey('converse', {messages: [{role: 'user', text: '점심'}]});
 const a = g.run('converse', k, fn), b = g.run('converse', k, fn);
 assert.equal(a, b); assert.equal(g.inflightSize(), 1);
 release({text: 'ok'}); assert.deepEqual(await a, {text: 'ok'}); assert.equal(calls, 1);
 assert.equal(g.inflightSize(), 0);
});
test('같은 기능을 1.5초 안에 다시 부르면 막고, 지나면 된다', async () => {
 const c = clock(), g = createAIGuard({now: c.now, storage: mem()});
 await g.run('chat', 'a', async () => 1);
 assert.throws(() => g.check('chat'), e => e.guard === 'gap');
 c.add(1600); await g.run('chat', 'b', async () => 1);
});
test('1분 8번·10분 40번을 넘으면 멈추고, 새로 고쳐도(같은 저장소) 이어진다', async () => {
 const c = clock(), st = mem(); let g = createAIGuard({now: c.now, storage: st});
 for (let i = 0; i < 8; i++) { await g.run(`p${i}`, `k${i}`, async () => i); c.add(2000); }
 assert.throws(() => g.check('p9'), e => e.guard === 'minute');
 g = createAIGuard({now: c.now, storage: st}); // 새로 고침
 assert.throws(() => g.check('p9'), e => e.guard === 'minute');
 c.add(60_000);
 for (let i = 0; i < 40 && true; i++) { try { await g.run(`q${i % 5}`, `w${i}`, async () => i); } catch (e) { assert.ok(['window', 'minute'].includes(e.guard)); break; } c.add(9000); }
 assert.throws(() => g.check('zz'), e => ['window', 'minute'].includes(e.guard));
});
test('서버·네트워크 실패 3번이면 1분 쉬고, 400대 실수는 세지 않는다', async () => {
 const c = clock(), g = createAIGuard({now: c.now, storage: mem()});
 const fail = status => g.run('converse', `f${Math.random()}`, async () => { throw Object.assign(Error('x'), {status}); }).catch(() => {});
 await fail(400); c.add(2000); await fail(422); c.add(2000);
 await fail(502); c.add(2000); await fail(0); c.add(2000); await fail(500);
 assert.throws(() => g.check('chat'), e => e.guard === 'paused');
 c.add(61_000); assert.doesNotThrow(() => g.check('chat'));
});
test('서버가 429·503이면 그 기능만 30초 쉰다(다른 기능은 된다)', async () => {
 const c = clock(), g = createAIGuard({now: c.now, storage: mem()});
 await g.run('converse', 'x', async () => { throw Object.assign(Error('많아요'), {status: 429}); }).catch(() => {});
 c.add(2000);
 assert.throws(() => g.check('converse'), e => e.guard === 'cool');
 assert.doesNotThrow(() => g.check('review'));
 c.add(30_000); assert.doesNotThrow(() => g.check('converse'));
});
test('저장소가 깨져 있거나 막혀도 동작한다', async () => {
 const c = clock(), bad = {getItem: () => '{oops', setItem: () => { throw Error('full'); }};
 const g = createAIGuard({now: c.now, storage: bad});
 assert.equal(await g.run('chat', 'k', async () => 7), 7);
});
test('요청 열쇠: 내용이 다르면 다르고, 같으면 같다', () => {
 assert.equal(requestKey('chat', {q: 'a'}), requestKey('chat', {q: 'a'}));
 assert.notEqual(requestKey('chat', {q: 'a'}), requestKey('chat', {q: 'b'}));
 assert.notEqual(requestKey('chat', {q: 'a'}), requestKey('review', {q: 'a'}));
});
test('Fable M-4: 저장소가 막혀도(쓰기 실패) 탭 안 기억으로 1분 상한이 지켜진다', async () => {
 const c = clock(), dead = {getItem: () => null, setItem: () => { throw Error('blocked'); }};
 const g = createAIGuard({now: c.now, storage: dead}); let sent = 0;
 for (let i = 0; i < 50; i++) { try { await g.run(`p${i % 3}`, `k${i}`, async () => { sent++; }); } catch {} c.add(10); }
 assert.ok(sent <= 3, `보낸 수 ${sent}`);
});
test('Fable L-7: 기기 시계를 뒤로 돌려도 쉬는 시간이 정해진 길이를 넘지 않는다', async () => {
 const c = clock(10_000_000), st = mem(); const g = createAIGuard({now: c.now, storage: st});
 for (const s of [500, 0, 502]) { await g.run('converse', `f${s}`, async () => { throw Object.assign(Error('x'), {status: s}); }).catch(() => {}); c.add(2000); }
 c.add(-5_000_000); // 시계를 크게 뒤로
 assert.throws(() => g.check('chat'), e => e.guard === 'paused');
 c.add(61_000); assert.doesNotThrow(() => g.check('chat'));
});
