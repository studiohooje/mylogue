import test from 'node:test';
import assert from 'node:assert/strict';
import {emptyPlan, planFromWorkout, validatePlan, startRun, completeSet, endRest, addRest, skipExercise, finishRun, editCurrent, runRecord, dueCues, runHTML, nextLabel} from '../guide.js';
import {prefsOf, withPrefs, effectiveWorkoutMode} from '../prefs.js';

const plan = () => ({...emptyPlan('2026-11-20','',60), rows:[{name:'벤치프레스',weight:'45',unit:'kg',reps:'10',sets:'2',rest:'60'},{name:'스쿼트',weight:'60',unit:'kg',reps:'8',sets:'1',rest:'90'}]});

test('안내 모드: 계획 검증(빈 줄 무시, 잘못된 값 거절)', () => {
 const p = plan(); p.rows.push({name:'',weight:'',reps:'',sets:3,rest:60});
 assert.equal(validatePlan(p).length, 2);
 assert.throws(()=>validatePlan({rows:[{name:'벤치',weight:'40',reps:'0',sets:'3',rest:'60'}]}), /횟수/);
 assert.throws(()=>validatePlan({rows:[{name:'벤치',weight:'40',reps:'10',sets:'3',rest:'5'}]}), /휴식/);
 assert.throws(()=>validatePlan({rows:[]}), /하나 이상/);
});

test('안내 모드: 세트 끝 → 휴식 → 다음 세트 → 다음 종목 → 끝', () => {
 const s = startRun(plan(), validatePlan(plan()), 0);
 assert.equal(s.phase, 'work'); assert.match(nextLabel(s), /2세트/);
 completeSet(s, 1000); assert.equal(s.phase, 'rest'); assert.equal(s.set, 2); assert.equal(s.restEnds, 61000);
 endRest(s); completeSet(s, 70000); assert.equal(s.phase, 'rest'); assert.equal(s.ex, 1); assert.equal(s.set, 1);
 endRest(s); completeSet(s, 200000); assert.equal(s.phase, 'done');
 assert.equal(s.log.length, 3);
});

test('안내 모드: 10초 전·3·2·1 안내는 한 번씩만', () => {
 const s = startRun(plan(), validatePlan(plan()), 0); completeSet(s, 0);
 assert.deepEqual(dueCues(s, 50500).map(c=>c.say), ['휴식 10초 남았습니다']);
 assert.deepEqual(dueCues(s, 51000), []);
 assert.deepEqual(dueCues(s, 57500).map(c=>c.say), ['3']);
 assert.deepEqual(dueCues(s, 59500).map(c=>c.say), ['1']);
 addRest(s, 30, 59500); assert.equal(s.restEnds, 90000);
});

test('안내 모드: 무게 바꾸기·건너뛰기·중간에 끝내기도 완료 세트만 저장', () => {
 const s = startRun(plan(), validatePlan(plan()), 0);
 editCurrent(s, '47.5', '8'); completeSet(s, 1000);
 skipExercise(s); assert.equal(s.ex, 1); assert.equal(s.phase, 'work');
 finishRun(s);
 const w = runRecord(s, '2026-11-20T10:00:00.000Z');
 assert.equal(w.exercises.length, 1);
 assert.equal(w.exercises[0].sets[0].weight, 47.5); assert.equal(w.exercises[0].sets[0].reps, 8);
 assert.ok(w.exercises[0].sets.every(x=>x.completed));
 assert.equal(runRecord(startRun(plan(), validatePlan(plan()))), null);
});

test('안내 모드: 지난 운동으로 계획 채우기', () => {
 const last = {gymName:'집', exercises:[{name:'랫풀다운', kind:'strength', sets:[{weight:50,originalWeight:50,unit:'kg',originalUnit:'kg',reps:12,completed:true},{weight:50,originalWeight:50,unit:'kg',originalUnit:'kg',reps:12,completed:true}]}]};
 const p = planFromWorkout(last, '2026-11-21', 75);
 assert.equal(p.rows[0].name, '랫풀다운'); assert.equal(p.rows[0].sets, 2); assert.equal(p.rows[0].rest, 75);
});

test('안내 모드: 화면 문구와 설정', () => {
 const s = startRun(plan(), validatePlan(plan()), 0);
 assert.match(runHTML(s), /세트 끝/);
 completeSet(s, 0); assert.match(runHTML(s, 1000), /휴식/);
 const db = withPrefs({settings:{}}, {workoutMode:'guide', cue:'sound'});
 assert.equal(effectiveWorkoutMode(prefsOf(db)), 'guide'); assert.equal(prefsOf(db).cue, 'sound'); assert.equal(prefsOf(db).keepAwake, true);
});
