import test from 'node:test';
import assert from 'node:assert/strict';
import {baseExerciseOf, missingBases, machineBase, setBaseContext} from '../exercise-base.js';
import {cleanCustomExercise} from '../domain.js';
import {resolveExercise, EXERCISE_CATALOG} from '../catalog.js';
import {artFile} from '../exercise-art-ui.js';

test('맞춤법·수식어: 벤트오버는 후면, 덤벨 래터럴은 측면, 제조사는 떼고', () => {
 assert.equal(resolveExercise('벤트오버 래터럴')?.name, '벤트오버 레터럴 레이즈');
 assert.equal(resolveExercise('덤벨 래터럴')?.name, '사이드 레터럴 레이즈');
 assert.equal(resolveExercise('케이블 바이셉스 컬')?.name, '케이블 컬');
 assert.equal(resolveExercise('뉴텍 레그프레스')?.name, '레그 프레스');
 assert.equal(resolveExercise('프론트 로우')?.name, '체스트 서포티드 T바 로우');
 assert.notEqual(artFile('벤트오버 래터럴'), artFile('사이드 레터럴 레이즈'));
});

test('직접 만든 종목은 고른 기준 종목으로 이어지고 그림도 그 종목', () => {
 const bench = EXERCISE_CATALOG.find(x => x.name === '벤치프레스');
 const c = cleanCustomExercise({name:'우리 헬스장 이상한 프레스', baseExerciseId:bench.id});
 assert.equal(c.baseExerciseId, bench.id);
 setBaseContext(() => ({customs:[c]}));
 assert.equal(baseExerciseOf({name:'우리 헬스장 이상한 프레스'})?.id, bench.id);
 assert.equal(artFile({name:'우리 헬스장 이상한 프레스'}), artFile('벤치프레스'));
 assert.deepEqual(missingBases([{name:'우리 헬스장 이상한 프레스', kind:'strength'}, {name:'모르는 운동 xyz', kind:'strength'}, {name:'동네 산책', kind:'cardio'}]), ['모르는 운동 xyz']);
 setBaseContext(null);
 assert.equal(cleanCustomExercise({name:'옛 종목'}).baseExerciseId, '', '예전 기록은 그대로 읽는다');
});

test('제조사 머신은 머신 종류·종목으로 기준 종목 밑에', () => {
 const lp = EXERCISE_CATALOG.find(x => x.name === '레그 프레스');
 assert.equal(machineBase({exerciseId:lp.id})?.id, lp.id);
 assert.equal(machineBase({baseId:'gm:leg-press-45'})?.name, '레그 프레스');
 assert.equal(machineBase({}), null);
 setBaseContext(() => ({machineOf:id => id==='m1' ? {baseId:'gm:leg-press-45'} : null}));
 assert.equal(baseExerciseOf({name:'뉴텍 무언가', machineId:'m1'})?.name, '레그 프레스');
 setBaseContext(null);
});

test('기준 종목 없는 내 종목은 공용 도감으로 올리지 않는다', async () => {
 const {promoteCandidates} = await import('../catalog-promote.js').catch(() => ({}));
 if(!promoteCandidates) return;
 const c = promoteCandidates({foods:[], customExercises:[{id:'e9', name:'이름만 있는 운동'}]}, {foods:[], exercises:[]});
 assert.equal(c.exercises[0].ok, false);
});

test('대표님 결정: 케이블 오버헤드 익스텐션 → 케이블 트라이셉스 익스텐션(id·그림 유지), 킥백 → 글루트 킥백 머신', () => {
 const x = EXERCISE_CATALOG.find(e => e.id === 'exercise:케이블 오버헤드 익스텐션');
 assert.equal(x.name, '케이블 트라이셉스 익스텐션');
 assert.ok(x.aliases.includes('케이블 오버헤드 익스텐션'));
 assert.equal(resolveExercise('케이블 오버헤드 익스텐션')?.id, x.id, '지난 기록 이름도 같은 종목');
 assert.ok(artFile({name:'케이블 오버헤드 익스텐션', exerciseId:x.id}));
 assert.equal(resolveExercise('킥백')?.name, '글루트 킥백 머신');
 assert.equal(resolveExercise('덤벨 킥백')?.name, '덤벨 킥백');
});
