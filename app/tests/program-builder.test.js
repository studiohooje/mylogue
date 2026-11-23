import test from 'node:test';
import assert from 'node:assert/strict';
import {buildProgram, programRoutines, programHTML} from '../program-builder.js';

// 4.17.0 운동 프로그램 자동 설계
test('주 횟수만큼 세션, 처음이면 머신·쉬운 변형, 힘 목표는 4~6회', () => {
  const a = buildProgram({goal: 'muscle', level: 'new', days: 3, place: 'gym'});
  assert.equal(a.sessions.length, 3); assert.ok(a.sessions[0].exercises.some(e => e.name === '레그 프레스'));
  const b = buildProgram({goal: 'strength', level: 'pro', days: 4, place: 'gym'});
  assert.equal(b.sessions.length, 4); assert.deepEqual(b.sessions[0].exercises[0].repRange, [4, 6]);
  assert.ok(b.sessions[0].exercises.find(e => e.pattern === 'arms').repRange[0] >= 10); // 보조 운동은 10~12회
  const c = buildProgram({goal: 'lose', level: 'mid', days: 2, place: 'home', minutes: 45});
  assert.equal(c.sessions[0].exercises.length, 3); assert.ok(c.sessions.every(s => s.exercises.every(e => e.name)));
  for (const s of b.sessions) assert.equal(new Set(s.exercises.map(e => e.name)).size, s.exercises.length);
});
test('루틴으로 저장 형식, 화면', () => {
  let n = 0; const rs = programRoutines(buildProgram({days: 4}), () => `id${n++}`);
  assert.equal(rs.length, 4); assert.match(rs[0].title, /^자동 4일 · /); assert.ok(rs[0].exercises.every(e => !('pattern' in e) && e.sets.length));
  assert.match(programHTML({goal: 'muscle', level: 'new', days: 3, place: 'gym', minutes: 60}), /내 루틴 3개로 저장/);
  assert.match(programHTML({}, {lock: '<p>잠금</p>'}), /잠금/);
});
