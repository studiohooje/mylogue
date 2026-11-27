import test from 'node:test';
import assert from 'node:assert/strict';
import {planMachineAssign, applyMachineAssign, changesTable} from '../record-tools.js';

// 2026-11-27 대표님: 지난 기록에 헬스장 머신 붙이기(숨은 관리자 작업)
test('지난 기록 머신 붙이기: 미리 보기 → 적용', () => {
  const db = {workouts: [
    {id: 'w1', date: '2026-11-01', gymName: '헬스플러스 안산1호점', exercises: [{name: '레그 프레스', exerciseId: 'exercise:레그 프레스', sets: [{weight: 100, reps: 10}]}, {name: '랫풀다운', exerciseId: 'exercise:랫풀다운', machineId: 'gm:lat-pulldown', sets: []}]},
    {id: 'w2', date: '2026-11-02', gymName: '다른 헬스장', exercises: [{name: '레그 프레스', exerciseId: 'exercise:레그 프레스', sets: []}]},
  ]};
  const rules = [{gym: '헬스플러스 안산1호점', exercise: 'exercise:레그 프레스', machineId: 'bm:hammer-strength:plate-loaded:linear-leg-press'}, {gym: '헬스플러스 안산1호점', exercise: 'exercise:랫풀다운', machineId: 'bm:x'}];
  const c = planMachineAssign(db, rules);
  assert.equal(c.length, 1); // 다른 헬스장·이미 머신 있는 기록은 건드리지 않음
  assert.match(changesTable(c), /2026-11-01 · 헬스플러스 안산1호점 · 레그 프레스 · \(머신 없음\) → bm:hammer/);
  const next = applyMachineAssign(db, c);
  assert.equal(next.workouts[0].exercises[0].machineId, 'bm:hammer-strength:plate-loaded:linear-leg-press');
  assert.equal(next.workouts[0].exercises[0].weightBasis, undefined); // 무게 기준은 그대로
  assert.equal(next.workouts[1], db.workouts[1]);
  assert.equal(planMachineAssign(next, rules).length, 0); // 다시 돌려도 같음
});
