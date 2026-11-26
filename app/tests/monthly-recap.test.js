// 5.4.7 한 달 리캡: 헤일로 개수 구간 × 내부 등급 → 실존 별자리, 말일 완성 표시, 새 기록·마일스톤
import test from 'node:test';
import assert from 'node:assert/strict';
import {buildRecap, recapHTML, pickStar, monthScore} from '../monthly-recap.js';
import {TIERS} from '../recap-stars.js';

const day = n => `2026-11-${String(n).padStart(2, '0')}`;
function db({days = 20, heavy = true} = {}){
  const body = [], meals = [], workouts = [];
  // 이전 달 기록(새 기록 비교용)
  workouts.push({id: 'o1', date: '2026-10-20', exercises: [{name: '스쿼트', part: '하체', sets: [{weight: 60, reps: 8}]}]});
  for(let d = 1; d <= days; d++){
    body.push({id: `b${d}`, date: day(d), weight: 80 - d * 0.1, createdAt: `${day(d)}T07:00:00`});
    meals.push({id: `m${d}`, date: day(d), mealGroupId: `g${d}`, name: '닭가슴살', calories: 1500, protein: heavy ? 150 : 60, loggedAt: `${day(d)}T12:00:00`});
    workouts.push({id: `w${d}`, date: day(d), loggedAt: `${day(d)}T19:00:00`, exercises: [{name: '스쿼트', part: '하체', sets: [{weight: 60 + d, reps: 8}]}]});
  }
  return {body, meals, workouts, settings: {calorieGoal: 1900, proteinGoal: 140}};
}

test('헤일로 개수로 구간, 내부 점수로 1·2·3등급 별자리', () => {
  assert.equal(pickStar(0, {}), null);
  const good = {workoutDays: 20, prCount: 5, recordDays: 20, calorieOkDays: 20, proteinOkDays: 20};
  assert.equal(monthScore(good), 100);
  assert.equal(pickStar(26, good), TIERS[4].ids[0]);   // 오리온
  assert.equal(pickStar(8, good), TIERS[0].ids[0]);
  assert.equal(pickStar(26, {workoutDays: 2, recordDays: 20}), TIERS[4].ids[2]);
});

test('그달 기록으로 리캡을 만들고, 말일 전에는 "말일에 완성"을 보여 준다', () => {
  const r = buildRecap(db({days: 20}), day(20));
  assert.equal(r.halos, 20);
  assert.equal(r.workoutDays, 20);
  assert.equal(r.done, false);
  assert.ok(r.prs.some(x => x.name === '스쿼트' && x.max === 80 && x.prev === 60));
  assert.equal(r.weight.from, 79.9);
  const html = recapHTML(r);
  assert.match(html, /11월 30일\(말일\)에 완성돼요/);
  assert.match(html, /이달의 업적/);
  assert.doesNotMatch(html, /점수|등급|순위/, '점수·등급은 사용자에게 보이지 않는다');
});

test('말일이 되면 완성', () => {
  const r = buildRecap(db({days: 30}), day(30));
  assert.equal(r.done, true);
  assert.match(recapHTML(r), /완성했어요/);
});
