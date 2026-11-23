import test from 'node:test';
import assert from 'node:assert/strict';
import {nextGoals, lastWeek, lastWeekHTML, nextGoalsHTML} from '../workout-story.js';

// 4.17.0 지난주 한 장·다음 목표 제안(점수 없이)
const set = (weight, reps) => ({weight, unit: 'kg', reps, completed: true});
const w = (date, name, weight, reps, extra = {}) => ({date, exercises: [{name, sets: [set(weight, reps), set(weight, reps)]}], ...extra});

test('같은 무게·횟수 세 번이면 한 번 더 제안, 늘고 있으면 제안 안 함', () => {
  const db = {workouts: [w('2026-11-10', '스쿼트', 60, 5), w('2026-11-13', '스쿼트', 60, 5), w('2026-11-17', '스쿼트', 60, 5), w('2026-11-10', '벤치프레스', 40, 8), w('2026-11-13', '벤치프레스', 40, 9), w('2026-11-17', '벤치프레스', 42.5, 8)]};
  const g = nextGoals(db, '2026-11-23');
  assert.equal(g.length, 1); assert.equal(g[0].text, '스쿼트 60kg 6회 해 보기 (세 번 연속 5회)');
  const high = {workouts: [w('2026-11-10', '레그프레스', 100, 12), w('2026-11-13', '레그프레스', 100, 12), w('2026-11-17', '레그프레스', 100, 12)]};
  assert.match(nextGoals(high, '2026-11-23')[0].text, /무게를 한 칸 올려 8~10회/);
  const plan = {workouts: [w('2026-11-10', '스쿼트', 60, 5), w('2026-11-13', '스쿼트', 60, 5), w('2026-11-17', '스쿼트', 60, 5, {planned: true})]};
  assert.equal(nextGoals(plan, '2026-11-23').length, 0);
  assert.match(nextGoalsHTML(g), /한 번 더 하는 것도 성장/); assert.equal(nextGoalsHTML([]), '');
});
test('지난주 한 장: 월~수에만, 지난주 운동이 있을 때, 새 기록·꾸준함 칭찬', () => {
  const db = {workouts: [w('2026-11-10', '스쿼트', 60, 5), w('2026-11-17', '스쿼트', 70, 5), w('2026-11-19', '스쿼트', 70, 5), w('2026-11-21', '산책', 0, 1, {rest: false})]};
  const lw = lastWeek(db, '2026-11-23'); // 월요일
  assert.equal(lw.mon, '2026-11-16'); assert.equal(lw.days, 3); assert.equal(lw.good, '새 기록 1개를 세웠어요.');
  assert.equal(lastWeek(db, '2026-11-26'), null); // 목요일
  assert.equal(lastWeek({workouts: [w('2026-11-10', '스쿼트', 60, 5)]}, '2026-11-23'), null);
  const steady = {workouts: [w('2026-11-17', '런지', 10, 10), w('2026-11-19', '런지', 10, 10)]};
  assert.equal(lastWeek(steady, '2026-11-24').good, '런지를 2번 꾸준히 했어요.');
  const html = lastWeekHTML(lw); assert.match(html, /11\/16~11\/22/); assert.match(html, /data-lastweek-hide="2026-11-16"/); assert.doesNotMatch(html, /점수/);
});
