import test from 'node:test';
import assert from 'node:assert/strict';
import {prefsOf, withPrefs, finishOnboarding, skipOnboarding, newOnboarding, onboardingPick, effectiveWorkoutMode, effectiveMealMode, afterWorkoutRecord, applyPrefClick} from '../prefs.js';
import {haloMessage, haloSVG} from '../halo.js';

const db0 = {settings:{gyms:[]}, body:[], meals:[], workouts:[]};

test('맞춤: 처음에는 무난한 기본값(세 가지 기록, 세트마다, 정확히)', () => {
 const p = prefsOf(db0);
 assert.deepEqual(p.tracks, ['workout','meal','body']);
 assert.equal(p.workoutMode, 'set'); assert.equal(p.mealMode, 'exact'); assert.equal(p.onboarded, false);
});

test('맞춤: 문답 결과가 설정에 저장되고, 집을 고르면 홈트 장소가 생긴다', () => {
 const s = newOnboarding(db0);
 s.step = 2; onboardingPick(s, 'after');
 s.step = 3; onboardingPick(s, 'simple');
 s.step = 4; onboardingPick(s, 'home');
 const db = finishOnboarding(db0, s.answers), p = prefsOf(db);
 assert.equal(p.onboarded, true); assert.equal(p.workoutMode, 'after'); assert.equal(p.mealMode, 'simple');
 assert.ok(db.settings.gyms.includes('집'));
});

test('맞춤: 식단 안 함을 고르면 식단이 기록 목록에서 빠지고, 다시 켜면 돌아온다', () => {
 let db = withPrefs(db0, {mealMode:'off'});
 assert.ok(!prefsOf(db).tracks.includes('meal'));
 db = withPrefs(db, {mealMode:'simple'});
 assert.ok(prefsOf(db).tracks.includes('meal'));
});

test('맞춤: 계획→안내는 그대로, 아직 준비 중인 사진 먼저는 정확히로 동작한다', () => {
 const db = withPrefs(db0, {workoutMode:'guide', mealMode:'photo'});
 assert.equal(effectiveWorkoutMode(prefsOf(db)), 'guide');
 assert.equal(effectiveMealMode(prefsOf(db)), 'exact');
});

test('맞춤: 기록할 것을 모두 끌 수는 없다', () => {
 let db = withPrefs(db0, {tracks:['workout']});
 const r = applyPrefClick(db, {dataset:{pref:'tracks', prefValue:'workout'}});
 assert.equal(r.db, db); assert.match(r.message, /하나 이상/);
});

test('맞춤: 건너뛰어도 다시 묻지 않는다', () => {
 assert.equal(prefsOf(skipOnboarding(db0)).onboarded, true);
});

test('끝나고 한 번에: 세트 수만큼 완료 세트가 만들어지고 카탈로그 종목과 연결된다', () => {
 const w = afterWorkoutRecord({date:'2026-11-20', gymName:'집', rows:[{name:'벤치프레스', weight:'45', reps:'10', sets:'3', unit:'kg'}, {name:'', weight:'', reps:'', sets:3}]}, '2026-11-20T10:00:00.000Z');
 assert.equal(w.exercises.length, 1);
 assert.equal(w.exercises[0].sets.length, 3);
 assert.ok(w.exercises[0].sets.every(s=>s.completed && s.weight===45 && s.reps===10));
 assert.ok(w.exercises[0].exerciseId);
 assert.throws(()=>afterWorkoutRecord({date:'2026-11-20', rows:[{name:'스쿼트', weight:'60', reps:'0', sets:'3'}]}), /횟수/);
});

test('헤일로: 고른 종류만 채우면 완성된다(운동만 기록하는 사람)', () => {
 const rh = {learning:true, start:6, end:24, base:{body:[],meal:[],workout:[]}};
 assert.match(haloMessage([{kind:'workout', t:18}], rh, ['workout']), /헤일로 완성!/);
 assert.doesNotMatch(haloMessage([{kind:'workout', t:18}], rh, ['workout','meal']), /헤일로 완성!/);
 const zone = {x:180, y:120, w:160, h:100, R:44};
 assert.equal(haloSVG({zone, recs:[{kind:'workout', t:18}], rh, now:21, tracks:['workout']}).done, true);
});
