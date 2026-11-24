// 4.18.0 나만의 유지칼로리: 내 기록(섭취·체중 흐름)으로 계산, 헤일로 단계, 최근 기록 부족이면 예전 값을 '대략'으로
import test from 'node:test';
import assert from 'node:assert/strict';
import {myMaintenance, estimateAt, progressOf, maintenanceCardHTML, useMineHTML} from '../maintenance.js';
import {calorieOptions} from '../nutrition-plan.js';

let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647; const gauss = () => { let s = 0; for (let i = 0; i < 6; i++) s += rnd(); return (s - 3) * 1.41; };
const TODAY = '2026-11-24';
function make(n, {kcal = 2200, slope = -0.05, end = TODAY} = {}){
  const db = {meals: [], body: [], workouts: []};
  for (let i = 0; i < n; i++) { const d = new Date(`${end}T12:00:00`); d.setDate(d.getDate() - (n - 1 - i)); const ds = d.toISOString().slice(0, 10);
    db.meals.push({date: ds, calories: kcal + gauss() * 250}); db.body.push({date: ds, weight: 80 + slope * i + gauss() * 0.5}); db.workouts.push({date: ds}); }
  return db;
}

test('2주는 아직 모으는 중, 4주면 내 기록으로 계산(실제값 근처)', () => {
  assert.equal(myMaintenance(make(14), TODAY, 2300).status, 'collecting');
  const m = myMaintenance(make(30), TODAY, 2300);
  assert.equal(m.status, 'ready'); assert.ok(m.level >= 2);
  const truth = 2200 + 0.05 * 7700; // 2585
  assert.ok(Math.abs(m.kcal - truth) < 250, `${m.kcal}`);
  assert.ok(m.lo < m.kcal && m.kcal < m.hi);
});

test('덜 적은 날(평소의 60% 미만)은 빼고 계산한다', () => {
  const db = make(30, {slope: 0});
  for (const m of db.meals.filter((_, i) => i % 5 === 0)) m.calories = 400;
  const e = estimateAt(db, TODAY, null);
  assert.ok(e.intakeDays <= 24); assert.ok(Math.abs(e.meanIntake - 2200) < 150);
});

test('최근 기록이 부족하면 예전에 계산된 값을 대략·부정확으로', () => {
  const db = make(35, {end: '2026-10-25'});
  const m = myMaintenance(db, TODAY, 2300);
  assert.equal(m.status, 'stale'); assert.ok(m.weeksAgo >= 1);
  assert.match(maintenanceCardHTML(m), /부정확/);
  assert.ok(progressOf(m).halos < 28);
});

test('식단 목표: 내 유지칼로리를 기준으로 칼로리 제안, 기록이 부족하면 버튼은 잠김', () => {
  const p = {sex: 'male', age: 35, heightCm: 175, weightKg: 80, activity: 'moderate', goal: 'lose', diets: []};
  const base = calorieOptions(p), mine = calorieOptions(p, 2800);
  assert.ok(mine[1].kcal - base[1].kcal !== 0);
  assert.equal(mine.find(o => o.d === 0).kcal, 2800);
  assert.match(useMineHTML({status: 'collecting', halos: 3, weighIns: 2, intakeDays: 3, lastGap: 1}, false), /disabled/);
});
