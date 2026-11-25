import test from 'node:test';
import assert from 'node:assert/strict';
const mem = new Map();
globalThis.localStorage = {getItem:k=>mem.has(k)?mem.get(k):null, setItem:(k,v)=>mem.set(k,String(v)), removeItem:k=>mem.delete(k)};
const {saveReview, lastReview, reviewUnchanged} = await import('../ai-coach-ui.js');

test('분석은 누를 때만: 결과를 남기고, 기록이 같으면 다시 부르지 않는다', () => {
 assert.equal(lastReview(), null);
 assert.equal(reviewUnchanged('요약 A'), false, '처음에는 부를 수 있다');
 saveReview('이번 주는 꾸준했어요', '요약 A');
 assert.equal(lastReview().text, '이번 주는 꾸준했어요');
 assert.equal(reviewUnchanged('요약 A'), true, '기록이 그대로면 다시 부르지 않음');
 assert.equal(reviewUnchanged('요약 B'), false, '기록이 바뀌면 다시 받을 수 있음');
});
