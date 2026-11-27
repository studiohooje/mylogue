import test from 'node:test';
import assert from 'node:assert/strict';
import {EXERCISE_CATALOG, findExercise} from '../catalog.js';
import {GENERIC_MACHINES, BUILTIN_BRANDS, genericMachine, genericMachinesFor, brandsOf, machineTargets, needsMachine, machineExerciseId} from '../machines-catalog.js';
import {BRAND_MODELS, BRAND_MAKERS} from '../machine-brands.js';
import {machineChoices, exerciseSuggestHTML, foodSuggestHTML} from '../suggest-ui.js';
import {quickWorkoutRecord} from '../quick-entry.js';
import {cleanMachine} from '../domain.js';

const id = n => findExercise(n).id;

test('머신이 꼭 필요한 종목에는 머신 없이가 없고, 모든 머신·케이블·스미스 종목에 머신 종류가 연결된다', () => {
 for(const ex of EXERCISE_CATALOG.filter(x => x.kind!=='cardio' && needsMachine(x))){
  assert.ok(genericMachinesFor(ex.id).length, `${ex.name}: 연결된 머신 없음`);
  assert.ok(!machineChoices(ex.id).some(c => c.m.free), `${ex.name}: 머신 없이가 있음`);
 }
 assert.ok(machineChoices(id('백 익스텐션')).some(c => c.m.free), '맨몸 종목은 머신 없이 가능');
});

test('머신 없이를 많이 쓰면 위로 올라온다', () => {
 const w = n => ({exercises:[{exerciseId:id('백 익스텐션'), machineId:'', sets:Array.from({length:n}, () => ({completed:true}))}]});
 const db = {workouts:[w(3), w(3), w(3)]};
 const list = machineChoices(id('백 익스텐션'), {db});
 assert.equal(list[0].tag, '일반');
 assert.equal(list[1].m.free, true);
 assert.equal(list[1].n, 3);
 assert.match(exerciseSuggestHTML({query:'백 익', sgEx:id('백 익스텐션')}, EXERCISE_CATALOG, {db}), /<i class="sg-n">3회<\/i>/);
});

test('정렬 근거 문구를 보이지 않는다', () => {
 const html = exerciseSuggestHTML({query:'레그', sgEx:id('레그 프레스')}, EXERCISE_CATALOG, {db:{workouts:[]}});
 assert.doesNotMatch(html, /많이 쓴 순|내가 \d+번|머신 없이/);
 const f = foodSuggestHTML({query:'닭', sgGroup:'닭가슴살'}, [{name:'닭가슴살', group:'닭가슴살', source:'대표값', calories:109, servingUnit:'g'}], {meals:[]});
 assert.doesNotMatch(f, /많이 먹|대표값/);
});

test('머신 종류마다 근육 부하가 들어 있고(케이블·스미스 제외), 제조사 모델은 종류를 물려받는다', () => {
 const multi = new Set(['gm:smith','gm:cable-crossover','gm:cable-station']);
 for(const m of GENERIC_MACHINES){
  assert.ok(machineExerciseId(m), `${m.id}: 종목 없음`);
  if(!multi.has(m.id)) assert.ok(m.primaryMuscleIds?.length, `${m.id}: 근육 없음`);
 }
 assert.ok(BRAND_MAKERS.length>=7);
 assert.equal(BUILTIN_BRANDS.length, BRAND_MODELS.length);
 assert.equal(new Set(BRAND_MODELS.map(b => b.id)).size, BRAND_MODELS.length);
 const hs = genericMachine('bm:hammer-strength:plate-loaded:iso-lateral-low-row');
 assert.equal(hs.sided, 'iso');
 assert.deepEqual(hs.primaryMuscleIds, ['back']);
 assert.ok(brandsOf('gm:leg-press-45').some(b => b.manufacturer==='gym80'));
});

test('머신을 고르면 근육은 앱이 정하고, 다른 동작이면 종목 값을 쓴다', () => {
 assert.deepEqual(machineTargets(genericMachine('gm:hack-squat'), findExercise('핵 스쿼트')).primaryMuscleIds, ['quads']);
 assert.deepEqual(machineTargets(genericMachine('gm:leg-press-45'), findExercise('레그 프레스 카프 레이즈')).primaryMuscleIds, ['calves']);
 assert.deepEqual(machineTargets({baseId:'gm:lower-back'}, findExercise('시티드 백 익스텐션 머신')).primaryMuscleIds, ['erectors']);
 const ex = findExercise('레그 프레스');
 const rec = quickWorkoutRecord({date:'2026-11-21', gymName:'', title:'', workoutId:null, sets:[{id:'s1', exerciseId:ex.id, machineId:'bm:hammer-strength:plate-loaded:linear-leg-press', exercise:ex, weight:100, unit:'lb', reps:10, completedAt:'2026-11-21T10:00'}]}, {workouts:[], machines:[]});
 assert.deepEqual(rec.exercises[0].primaryMuscleIds, ['quads','glutes']);
 assert.deepEqual(rec.exercises[0].secondaryMuscleIds, ['hamstrings','adductors']);
});

test('제조사 모델은 머신 종류 아래에 접혀 있다가 펼쳐진다', () => {
 const st = {query:'레그', sgEx:id('레그 프레스')};
 const closed = exerciseSuggestHTML(st, EXERCISE_CATALOG, {db:{workouts:[]}});
 assert.match(closed, /data-sg-brand="gm:leg-press-45"/);
 assert.doesNotMatch(closed, /Linear Leg Press/);
 const open = exerciseSuggestHTML({...st, sgBrand:'gm:leg-press-45'}, EXERCISE_CATALOG, {db:{workouts:[]}});
 assert.match(open, /해머 스트렝스\(Hammer Strength\)<\/span><span class="m-model">리니어 레그 프레스\(Linear Leg Press\)/); // 2026-11-27 각각 한글(영문)
 assert.match(open, /짐80\(gym80\)<\/span><span class="m-model">45° 리니어 레그 프레스\(45° Linear Leg Press\)/);
});

test('내 머신의 머신 종류는 일반 머신 ID만 저장한다', () => {
 assert.equal(cleanMachine({name:'안산 레그프레스', baseId:'gm:leg-press-45'}).baseId, 'gm:leg-press-45');
 assert.equal(cleanMachine({name:'x', baseId:'javascript:1'}).baseId, '');
});
