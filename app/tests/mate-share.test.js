import test from 'node:test';
import assert from 'node:assert/strict';
import {sharesFor, bodySummary, mealSummary, workSummary} from '../mate-share.js';
import {stampText} from '../mate-camera.js';

const db = {
  settings: {calorieGoal: 2300, carbsGoal: 250, proteinGoal: 150, fatGoal: 60},
  body: [{date: '2026-11-23', weight: 78.7}, {date: '2026-11-24', weight: 78.6, bodyFatPct: 19.1}, {date: '2026-11-25', weight: 78.4}, {date: '2026-11-26', weight: 70, planned: true}],
  meals: [{date: '2026-11-25', slot: '점심', name: '제육덮밥', calories: 820, carbs: 100, protein: 35, fat: 28, loggedAt: '2026-11-25T12:30:00'}, {date: '2026-11-25', slot: '저녁', name: '샐러드', calories: 300, carbs: 20, protein: 30, fat: 10, loggedAt: '2026-11-25T19:00:00'}, {date: '2026-11-25', name: '계획', calories: 999, planned: true}],
  workouts: [{date: '2026-11-24', title: '하체', exercises: [{name: '스쿼트', part: '하체', sets: [{completed: true}, {completed: true}, {completed: false}]}]}],
};
test('5.0.0 메이트 요약: 공개한 종류만, 계획(예정) 기록은 빼고', () => {
  const s = sharesFor(db, '2026-11-25', {body: false, meal: true, work: true});
  assert.deepEqual(Object.keys(s), ['meal', 'work'], '비공개 수치는 만들지도 않음');
  const b = bodySummary(db, '2026-11-25');
  assert.equal(b.kg, 78.4); assert.deepEqual(b.trend, [78.7, 78.6, 78.4]); assert.equal(b.list[1].fat, 19.1);
  const m = mealSummary(db, '2026-11-25');
  assert.equal(m.kcal, 1120); assert.equal(m.goal, 2300); assert.equal(m.meals.length, 2); assert.equal(m.meals[0].name, '제육덮밥'); assert.equal(m.days.length, 7);
  const w = workSummary(db, '2026-11-25');
  assert.equal(w.rest, true); assert.equal(w.sets, 0); assert.equal(w.days.find(d => d.date === '2026-11-24').parts, '하체'); assert.equal(w.sessions[0].items[0].sets, 2, '완료한 세트만');
  assert.equal(bodySummary({body: []}, '2026-11-25').empty, true);
});
test('5.0.0 찍은 시각 워터마크 글자', () => {
  assert.equal(stampText(new Date(2026, 10, 25, 8, 5)), '11.25 (수) 08:05');
});
