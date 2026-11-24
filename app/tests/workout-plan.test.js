// 4.19.0 오늘 할 운동 → 운동 이름·종목 순서·웜업/메인 제안(그날 이전 기록만)
import test from 'node:test';
import assert from 'node:assert/strict';
import {exerciseTargets, workoutTargets, titleSuggestions, planFor, warmMain, nextFill, lastGym, similarity} from '../workout-plan.js';
import {cleanWorkout} from '../domain.js';
import {quickWorkoutHTML, emptyQuickWorkout, quickWorkoutRecord} from '../quick-entry.js';
import {EXERCISE_CATALOG} from '../catalog.js';

const ex = (name, sets = [[60, 8]], t0 = '') => ({name, exerciseId: EXERCISE_CATALOG.find(x => x.name === name)?.id || null, kind: 'strength', sets: sets.map(([w, r], i) => ({weight: w, reps: r, unit: 'kg', completed: true, ...(t0 ? {completedAt: `${t0}:${String(10 + i).padStart(2, '0')}`} : {})}))});
const W = (id, date, title, gymName, exercises, targets) => ({id, date, title, gymName, exercises, ...(targets ? {targets} : {})});

test('종목의 타깃: 웨이트 부위(이두·삼두 분리, 둔근은 하체), 유산소·필라테스는 큰 종류', () => {
  assert.deepEqual(exerciseTargets({name: '벤치프레스'}).sort(), ['웨이트', '웨이트:가슴', '웨이트:삼두'].sort());
  assert.ok(exerciseTargets({name: '힙 쓰러스트'}).includes('웨이트:하체'));
  assert.ok(exerciseTargets({name: '바벨 컬'}).includes('웨이트:이두'));
  assert.deepEqual(exerciseTargets({name: '필라테스 리포머', kind: 'cardio'}), ['필라테스', '필라테스:리포머']);
  assert.ok(similarity(['웨이트', '웨이트:가슴', '웨이트:삼두'], ['웨이트', '웨이트:하체']) === 0);
});

const db = {workouts: [
  W('a', '2026-11-03', 'Push Day', 'A', [ex('벤치프레스'), ex('트라이셉스 푸시다운')], ['웨이트', '웨이트:가슴', '웨이트:삼두']),
  W('b', '2026-11-10', 'Push Day', 'A', [ex('인클라인 벤치프레스'), ex('벤치프레스'), ex('트라이셉스 푸시다운')]),
  W('c', '2026-11-12', 'Leg Day', 'B', [ex('스쿼트'), ex('레그 프레스')]),
  W('d', '2026-11-14', 'Leg Day', 'B', [ex('스쿼트'), ex('레그 익스텐션')]),
  W('e', '2026-11-30', '미래 이름', 'C', [ex('벤치프레스')]),
]};

test('운동 이름: 같은 타깃으로 운동한 날 붙인 이름 먼저, 그날 이후 기록은 안 봄, 기록 없으면 빈 목록', () => {
  assert.equal(titleSuggestions(db, ['웨이트', '웨이트:가슴', '웨이트:삼두'], '2026-11-20')[0], 'Push Day');
  assert.equal(titleSuggestions(db, ['웨이트', '웨이트:하체'], '2026-11-20')[0], 'Leg Day');
  assert.ok(!titleSuggestions(db, [], '2026-11-20').includes('미래 이름'));
  assert.deepEqual(titleSuggestions({workouts: []}, ['웨이트'], '2026-11-20'), []);
});

test('종목 추천: 그 타깃으로 한 날 자주 한 종목을 하던 순서대로', () => {
  const p = planFor(db, ['웨이트', '웨이트:가슴', '웨이트:삼두'], '2026-11-20').map(x => x.name);
  assert.ok(p.includes('벤치프레스') && p.includes('트라이셉스 푸시다운'));
  assert.ok(p.indexOf('벤치프레스') < p.indexOf('트라이셉스 푸시다운'));
  assert.ok(!p.includes('스쿼트'));
  const legs = planFor(db, ['웨이트', '웨이트:하체'], '2026-11-20').map(x => x.name);
  assert.equal(legs[0], '스쿼트');
});

test('웜업·메인: 가장 무거운 게 메인, 그 전에 가벼운 세트가 웜업 / 채우는 방식', () => {
  const wm = warmMain([{weight: 20, reps: 12}, {weight: 40, reps: 10}, {weight: 80, reps: 8}, {weight: 80, reps: 7}]);
  assert.deepEqual([wm.warm.weight, wm.warm.sets, wm.main.weight, wm.main.sets, wm.main.reps], [40, 2, 80, 2, 7]);
  assert.equal(nextFill(wm, 0, 'warm').weight, 40);
  assert.equal(nextFill(wm, 2, 'warm').weight, 80);
  assert.equal(nextFill(wm, 0, 'main').weight, 80);
  assert.equal(nextFill(wm, 0, 'off'), null);
  assert.equal(warmMain([{weight: 80, reps: 8}]).warm, null);
});

test('헬스장 기본값은 그날 기준 마지막으로 쓴 곳, 타깃은 기록에 저장된다', () => {
  assert.equal(lastGym(db, '2026-11-13', ['A', 'B']), 'B');
  assert.equal(lastGym(db, '2026-11-11', ['A', 'B']), 'A');
  assert.deepEqual(cleanWorkout({date: '2026-11-20', exercises: [ex('스쿼트')], targets: ['웨이트', '웨이트:하체', '웨이트:하체']}).targets, ['웨이트', '웨이트:하체']);
  assert.equal(cleanWorkout({date: '2026-11-20', exercises: [ex('스쿼트')]}).targets, undefined);
  assert.deepEqual(workoutTargets(db.workouts[2]).sort(), ['웨이트', '웨이트:하체'].sort());
});

test('운동 기록 화면: 오늘 할 운동 → 부위, 이름 추천, 하던 순서', () => {
  const full = {...db, settings: {gyms: ['A', 'B'], workoutTitles: []}, machines: []};
  const s = {...emptyQuickWorkout('2026-11-20', ['A', 'B'], full), live: true, targets: ['웨이트', '웨이트:가슴', '웨이트:삼두']};
  assert.equal(s.gymName, 'B');
  const html = quickWorkoutHTML(full, s, EXERCISE_CATALOG, {}, {});
  assert.match(html, /오늘 할 운동/); assert.match(html, /data-q-target="웨이트:삼두"/); assert.match(html, /data-q-title="Push Day"/);
  assert.match(html, /가슴·삼두 하던 순서/); assert.match(html, /data-q-planlist=/);
  assert.doesNotMatch(html, /대분류/);
  // 기록에 타깃이 저장된다
  const rec = quickWorkoutRecord({...s, sets: [{exerciseId: 'exercise:벤치프레스', exercise: EXERCISE_CATALOG.find(x => x.name === '벤치프레스'), machineId: '', weight: 60, reps: 8, unit: 'kg', completedAt: '2026-11-20T10:00'}]}, full);
  assert.deepEqual(rec.targets, ['웨이트', '웨이트:가슴', '웨이트:삼두']);
});
