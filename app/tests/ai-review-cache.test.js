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

test('5.0.4 AI 인사이트: 숫자 요약만 보내고, 결과를 남기고, 기록이 같으면 다시 부르지 않음', async () => {
  const {coachFactsText, saveInsight, lastInsight, insightUnchanged, liveInsightHTML} = await import('../coach-ui.js');
  const db = {settings: {proteinGoal: 150, calorieGoal: 2000}, meals: [{date: '2026-11-25', name: '닭', protein: 60, calories: 300}]};
  const facts = coachFactsText(db, '2026-11-25');
  assert.match(facts, /오늘 남은 양: 1700kcal, 단백질 90g/);
  assert.equal(insightUnchanged(facts), false);
  assert.match(liveInsightHTML({db, today: '2026-11-25'}), /오늘 인사이트 받기/);
  saveInsight({headline: '좋아요<b>', meal: {title: '저녁', items: ['닭가슴살'], note: ''}, workout: {title: '', plan: []}, week: [], weight: []}, facts);
  assert.equal(lastInsight().insight.meal.items[0], '닭가슴살');
  assert.equal(insightUnchanged(facts), true);
  const html = liveInsightHTML({db, today: '2026-11-25'});
  assert.match(html, /다시 받기/); assert.match(html, /좋아요&lt;b&gt;/);
});
