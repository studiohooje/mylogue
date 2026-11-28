// 2026-11-28 대표님: 지난 운동처럼 하기에서 제조사 머신까지 넘어와야 함, 핵 프레스는 핵 스쿼트와 따로
import test from 'node:test';
import assert from 'node:assert/strict';
import {lastMachineId} from '../quick-entry.js';
import {EXERCISE_CATALOG, resolveExercise} from '../catalog.js';
import {genericMachinesFor} from '../machines-catalog.js';

const W = [
 {date: '2026-11-20', gymName: '헬스플러스 안산1호점', exercises: [{exerciseId: 'exercise:힙 어덕션', machineId: 'bm:newtech-wellness:old'}]},
 {date: '2026-11-25', gymName: '헬스플러스 안산1호점', exercises: [{exerciseId: 'exercise:힙 어덕션', machineId: 'bm:newtech-wellness:hip-adduction'}]},
 {date: '2026-11-26', gymName: '다른 헬스장', exercises: [{exerciseId: 'exercise:힙 어덕션', machineId: 'bm:cybex:x'}, {exerciseId: 'exercise:레그 컬', machineId: 'gm:leg-curl'}]},
];
test('같은 헬스장에서 마지막에 쓴 제조사 머신, 다른 헬스장 것은 일반 머신만', () => {
 assert.equal(lastMachineId(W, 'exercise:힙 어덕션', '헬스플러스 안산1호점'), 'bm:newtech-wellness:hip-adduction');
 assert.equal(lastMachineId(W, 'exercise:힙 어덕션', '새 헬스장'), '');
 assert.equal(lastMachineId(W, 'exercise:레그 컬', '새 헬스장'), 'gm:leg-curl');
});
test('핵 프레스는 핵 스쿼트와 다른 종목이고 핵 프레스 머신이 붙는다', () => {
 const hp = EXERCISE_CATALOG.find(x => x.name === '핵 프레스');
 assert.ok(hp);
 assert.equal(resolveExercise('핵프레스')?.name, '핵 프레스');
 assert.ok(genericMachinesFor(hp.id).some(g => g.id === 'gm:hack-press'));
});
