// 2026-11-27 밤샘: 5.4.9에서 '확인 못 한 것'으로 남긴 저장 기록 — 필라테스 기구 수업에 담은 동작, 덤벨 데드리프트 방식별 세트
import test from 'node:test';
import assert from 'node:assert/strict';
import {emptyDB} from '../domain.js';
import {EXERCISE_CATALOG} from '../catalog.js';
import {emptyQuickWorkout, quickWorkoutRecord} from '../quick-entry.js';
import {renderHomeTimeline} from '../timeline-view.js';
import {createBackup, validateBackup} from '../backup.js';
import {classOf} from '../pilates-pick.js';

const date = '2026-11-27', ex = n => EXERCISE_CATALOG.find(x => x.name === n);
const noPhotos = {readAll: async () => []};

test('필라테스 매트 수업: 담은 동작이 기록·타임라인·백업에 남는다', async () => {
  const mat = ex(classOf('매트')); assert.ok(mat, '필라테스 매트 종목');
  const db = emptyDB(), s = emptyQuickWorkout(date, []);
  s.sets = [{id: 'p1', timed: true, exerciseId: mat.id, machineId: '', exercise: mat, durationMin: 50, distanceKm: null, effort: 6, avgHr: null, sessionType: '그룹', note: '', completedAt: `${date}T19:50`, moves: [{name: '헌드레드', apparatus: '매트'}, {name: '롤업', apparatus: '매트'}]}];
  const w = quickWorkoutRecord(s, db), e = w.exercises[0];
  assert.equal(e.kind, 'cardio'); assert.equal(e.durationMin, 50); assert.equal(e.sessionType, '그룹');
  assert.deepEqual(e.moves.map(m => m.name), ['헌드레드', '롤업']);
  const next = {...db, workouts: [w]};
  assert.match(renderHomeTimeline(next, date), /필라테스 매트/);
  const back = await validateBackup(await createBackup(next, {photos: noPhotos}));
  assert.deepEqual(back.db.workouts[0].exercises[0].moves.map(m => m.name), ['헌드레드', '롤업']);
});

test('덤벨 데드리프트 방식을 바꿔 가며 한 세트: 방식별 종목으로 따로 쌓인다', async () => {
  const a = ex('덤벨 데드리프트'), b = ex('덤벨 스티프 레그 데드리프트'), c = ex('덤벨 루마니안 데드리프트');
  const db = emptyDB(), s = emptyQuickWorkout(date, []);
  const set = (id, e, w, at) => ({id, exerciseId: e.id, machineId: '', exercise: e, weight: w, reps: 10, unit: 'kg', completedAt: `${date}T${at}`});
  s.sets = [set('d1', a, 20, '10:00'), set('d2', b, 16, '10:04'), set('d3', b, 16, '10:07'), set('d4', c, 18, '10:10')];
  const w = quickWorkoutRecord(s, db);
  assert.deepEqual(w.exercises.map(e => [e.name, e.sets.length]), [['덤벨 데드리프트', 1], ['덤벨 스티프 레그 데드리프트', 2], ['덤벨 루마니안 데드리프트', 1]]);
  assert.ok(w.exercises.every(e => e.sets.every(x => x.completed === true)));
  const back = await validateBackup(await createBackup({...db, workouts: [w]}, {photos: noPhotos}));
  assert.equal(back.db.workouts[0].exercises[1].exerciseId, b.id);
  assert.match(renderHomeTimeline({...db, workouts: [w]}, date), /스티프 레그/);
});
