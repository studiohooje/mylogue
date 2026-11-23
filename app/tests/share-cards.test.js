import test from 'node:test';
import assert from 'node:assert/strict';
import {storyLines, shareButtonsHTML} from '../share-cards.js';
test('공유 카드 줄: 몸 숫자 표시, 버튼', () => {
  const p = storyLines('phase', {weeks: 12, recordDays: 70, workoutDays: 30, weightChange: -3.2, fatChange: null, muscleChange: 0.4});
  assert.deepEqual(p.filter(l => l.body).map(l => l.label), ['체중', '골격근량']);
  assert.equal(p.find(l => l.label === '체중').value, '-3.2kg');
  const y = storyLines('year', {days: 46, bestMonth: {m: 8}, fav: [['러닝', 34]], prs: 5, km: 0.5});
  assert.deepEqual(y.map(l => l.label), ['움직인 날', '가장 꾸준했던 달', '가장 많이 한 운동', '새 기록 세운 날']);
  assert.match(shareButtonsHTML('year'), /몸 숫자 빼고/);
});
