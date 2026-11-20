import test from 'node:test';
import assert from 'node:assert/strict';
import {EXERCISE_CATALOG, inferTargets, findExercise} from '../catalog.js';
import {GENERIC_MACHINES, genericMachinesFor, genericMachine, weightSteps, otherUnit, brandMachinesAt, brandModelId, gymMachineId} from '../machines-catalog.js';
import {cleanWorkout, cleanCustomExercise} from '../domain.js';
import {quickWorkoutRecord, findMachine, machineLabel} from '../quick-entry.js';

test('도감: 약 200종, 근력 종목은 모두 주 타깃이 있고 ID가 겹치지 않으며 기존 종목은 그대로', () => {
 assert.ok(EXERCISE_CATALOG.length >= 200);
 const strength = EXERCISE_CATALOG.filter(x => x.kind !== 'cardio');
 assert.equal(strength.filter(x => !x.primaryMuscleIds.length).length, 0);
 assert.equal(new Set(EXERCISE_CATALOG.map(x => x.id)).size, EXERCISE_CATALOG.length);
 for(const name of ['벤치프레스','스쿼트','데드리프트','레그 프레스','랫풀다운']) assert.ok(EXERCISE_CATALOG.find(x => x.id === 'exercise:'+name), name);
 assert.deepEqual(findExercise('이너타이')?.primaryMuscleIds, ['adductors']);
 assert.equal(findExercise('핵스쿼트')?.name, '핵 스쿼트');
 assert.equal(findExercise('컨센트레이션 컬').repBasis, 'per-side');
});

test('직접 만든 종목: 고르지 않아도 타깃 자동 채움(도감 → 이름 → 부위)', () => {
 assert.equal(inferTargets('이너타이 (힙 어덕션)').source, 'catalog');
 assert.deepEqual(inferTargets('우리 헬스장 아웃타이').primary, ['glutes']);
 assert.deepEqual(inferTargets('스미스 머신 와이드 스쿼트').primary, ['quads','glutes']);
 assert.equal(inferTargets('이상한 운동', '가슴').source, 'part');
 const c = cleanCustomExercise({name:'케이블 이너타이', part:'하체'});
 assert.deepEqual(c.primaryMuscleIds, ['adductors']); assert.equal(c.targetSource, 'auto');
 const w = cleanWorkout({date:'2026-11-20', exercises:[{name:'이너타이 (힙 어덕션)', part:'하체', sets:[{weight:40, reps:12}]}]});
 assert.deepEqual(w.exercises[0].primaryMuscleIds, ['adductors']);
 const mine = cleanCustomExercise({name:'내 종목', primaryMuscleIds:['chest']});
 assert.equal(mine.targetSource, 'user');
});

test('일반 머신: 종목별 연결, 방식·좌우·무게 단계, kg↔lb 표시', () => {
 assert.ok(GENERIC_MACHINES.length >= 45);
 const legPress = genericMachinesFor('exercise:레그 프레스').map(m => m.id);
 assert.ok(legPress.includes('gm:leg-press-45'));
 assert.equal(genericMachine('gm:chest-press-iso').sided, 'iso');
 assert.deepEqual(weightSteps('stack','kg'), [-5,-2.5,2.5,5]);
 assert.deepEqual(weightSteps('stack','lb'), [-10,-5,5,10]);
 assert.ok(weightSteps('plate','lb').includes(90));
 assert.equal(otherUnit(100,'lb'), '≈ 45.4 kg');
 assert.equal(otherUnit(20,'kg'), '≈ 44 lb');
 assert.equal(otherUnit('', 'kg'), '');
});

test('제조사 머신: 승인된 모델이 그 헬스장에서만 보이고, 기록 화면에서도 이름이 보인다', () => {
 const mid = brandModelId('Cybex', 'Eagle NX Leg Press');
 const shared = {machineModels:[{id:mid, name:'싸이벡스 레그 프레스', manufacturer:'Cybex', model:'Eagle NX Leg Press', exerciseId:'exercise:레그 프레스'}], gymMachines:[{id:gymMachineId('스포애니 역삼역점', mid), gymName:'스포애니 역삼역점', modelId:mid}]};
 assert.equal(brandMachinesAt(shared, '스포애니 역삼역점', 'exercise:레그 프레스').length, 1);
 assert.equal(brandMachinesAt(shared, '다른 헬스장', 'exercise:레그 프레스').length, 0);
 assert.equal(machineLabel(findMachine({machines:[]}, shared, mid)), 'Cybex · Eagle NX Leg Press');
 assert.equal(machineLabel(genericMachine('gm:hack-squat')), '일반 · 핵 스쿼트 머신');
});

test('한쪽 무게로 적는 아이소래터럴 머신은 볼륨을 양쪽 합으로 센다', () => {
 const ex = EXERCISE_CATALOG.find(x => x.name === '아이소래터럴 체스트 프레스');
 const s = {date:'2026-11-20', gymName:'', title:'', sets:[{id:'s1', exerciseId:ex.id, exercise:ex, machineId:'gm:chest-press-iso', weight:30, unit:'kg', reps:10, completedAt:''}]};
 const w = quickWorkoutRecord(s, {workouts:[]});
 assert.equal(w.exercises[0].weightBasis, 'per-hand');
 assert.equal(w.exercises[0].handCount, 2);
});
