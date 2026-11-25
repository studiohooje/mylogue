import test from 'node:test';
import assert from 'node:assert/strict';
import {usualMeals, guessFromText, simpleMealRecords, recentSessions, simpleWorkoutRecord, simpleMealPanelHTML, simpleWorkoutPanelHTML} from '../simple-input.js';
const meal = (date, h, name, kcal, g) => ({date, loggedAt: new Date(`${date}T${String(h).padStart(2, '0')}:10:00`).toISOString(), name, calories: kcal, carbs: 10, protein: 5, fat: 2, mealGroupId: g});
test('평소대로: 이 시간쯤(±3시간) 자주 먹은 조합을 여러 개, 많이 먹은 순', () => {
  const meals = [meal('2026-11-20', 12, '김밥', 400, 'a'), meal('2026-11-21', 12, '김밥', 400, 'b'), meal('2026-11-22', 13, '라면', 500, 'c'), meal('2026-11-23', 8, '토스트', 300, 'd'), meal('2026-10-01', 12, '옛날밥', 1, 'e')];
  const u = usualMeals(meals, '2026-11-25', '12:30');
  assert.deepEqual(u.map(x => x.names[0]), ['김밥', '라면']);
  assert.equal(u[0].count, 2);
});
test('이름만 적으면 음식 DB로 넓게 추정, 못 찾으면 한 끼 평균', () => {
  const search = q => q === '김치찌개' ? [{name: '김치찌개', calories: 300, carbs: 20, protein: 15, fat: 15, servingQty: 1, servingUnit: '그릇'}] : q === '밥' ? [{name: '쌀밥', calories: 150, carbs: 33, protein: 3, fat: 0, servingQty: 100, servingUnit: 'g'}] : [];
  const g = guessFromText('김치찌개, 밥, 이상한음식', search);
  assert.equal(g.length, 3); assert.equal(g[0].calories, 300); assert.equal(g[1].calories, 300, '100g 기준은 200g로'); assert.equal(g[2].calories, 500);
  const rows = simpleMealRecords({date: '2026-11-25', time: '12:00', items: g, portion: 'more'});
  assert.equal(rows.length, 3); assert.equal(rows[0].calories, 420); assert.equal(rows[0].aiEstimate.estimated, true);
  assert.equal(rows[0].aiEstimate.caloriesMin, 294); assert.equal(rows[0].aiEstimate.caloriesMax, 546); assert.equal(rows[0].source, 'simple');
  assert.equal(new Set(rows.map(r => r.mealGroupId)).size, 1, '한 끼로 묶음');
  assert.throws(() => simpleMealRecords({date: '2026-11-25', items: []}));
});
test('운동: 지난번처럼 여러 개(같은 구성은 한 번), 부위·시간으로 기억 기록, 의도적 휴식', () => {
  const ws = [{date: '2026-11-24', title: '하체 데이', targets: ['하체'], duration: 60, exercises: []}, {date: '2026-11-22', title: '하체 데이', targets: ['하체'], exercises: []}, {date: '2026-11-21', title: '등 데이', exercises: [{part: '등'}]}];
  const r = recentSessions(ws, '2026-11-25');
  assert.deepEqual(r.map(x => x.title), ['하체 데이', '등 데이']); assert.deepEqual(r[1].parts, ['등']);
  const w = simpleWorkoutRecord({date: '2026-11-25', parts: ['하체', '유산소'], minutes: 45, intensity: 'hard'});
  assert.equal(w.recalled, true); assert.equal(w.duration, 45); assert.deepEqual(w.targets, ['하체', '유산소']); assert.match(w.note, /힘들게/);
  assert.equal(simpleWorkoutRecord({date: '2026-11-25', rest: true}).rest, true);
  assert.throws(() => simpleWorkoutRecord({date: '2026-11-25', parts: []}));
});
test('화면: 추정 표시 띠와 디테일로 바꾸기, 글자는 안전 처리', () => {
  const h = simpleMealPanelHTML({meals: [meal('2026-11-24', 12, '<b>김밥</b>', 400, 'a')]}, {date: '2026-11-25', time: '12:00'});
  assert.match(h, /심플 모드 · 추정치/); assert.match(h, /data-simple-off/); assert.doesNotMatch(h, /<b>김밥<\/b>/);
  assert.match(simpleWorkoutPanelHTML({workouts: []}, {date: '2026-11-25'}), /의도적 휴식/);
});
