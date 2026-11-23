import test from 'node:test';
import assert from 'node:assert/strict';
import {weightWhy, weightWhyHTML} from '../weight-why.js';

// 4.17.0 흔들림 설명기
const at = (d, h) => new Date(`${d}T${String(h).padStart(2, '0')}:00:00`).toISOString();
function base() {
  const meals = [], body = [];
  for (let i = 15; i <= 21; i++) { const d = `2026-11-${i}`; meals.push({date: d, name: '밥', calories: 600, carbs: 80, sodium: 800, loggedAt: at(d, 12)}, {date: d, name: '저녁', calories: 600, carbs: 70, sodium: 900, loggedAt: at(d, 19)}); }
  return {meals, body, workouts: [], checkins: {}};
}
test('늘었을 때: 짠 음식·늦은 저녁·탄수·운동·잠 후보', () => {
  const db = base();
  db.meals.push({date: '2026-11-22', name: '라면', calories: 900, carbs: 160, sodium: 3600, loggedAt: at('2026-11-22', 22)}, {date: '2026-11-22', name: '점심', calories: 600, carbs: 80, sodium: 800, loggedAt: at('2026-11-22', 12)});
  db.workouts.push({date: '2026-11-22', exercises: [{name: '스쿼트', kind: 'strength', sets: [{weight: 60, reps: 5}]}]});
  db.checkins['2026-11-22'] = {sleep: 2};
  db.body.push({date: '2026-11-22', weight: 70}, {date: '2026-11-23', weight: 70.8});
  const w = weightWhy(db, '2026-11-23');
  assert.equal(w.diff, 0.8); assert.equal(w.reasons.length, 3); assert.match(w.reasons[0], /나트륨이 4,400mg/);
  assert.match(weightWhyHTML(w), /왜 이럴까/);
});
test('작은 변화·기록 없음은 조용히, 줄었을 때 문구', () => {
  const db = base(); db.body.push({date: '2026-11-22', weight: 70}, {date: '2026-11-23', weight: 70.2});
  assert.equal(weightWhy(db, '2026-11-23'), null);
  db.body[1].weight = 69.4; const w = weightWhy(db, '2026-11-23');
  assert.match(w.head, /0.6kg 줄었어요/); assert.match(w.tail, /7일 평균/);
  assert.equal(weightWhy({body: [{date: '2026-11-23', weight: 70}]}, '2026-11-23'), null);
});
