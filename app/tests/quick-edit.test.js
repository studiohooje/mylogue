import test from 'node:test';
import assert from 'node:assert/strict';
import {quickMealState, applyQuickMeal, rowTotals, stepFor, quickMealHTML, quickWorkoutState, applyQuickWorkout, quickWorkoutHTML} from '../quick-edit.js';
import {profileOf, avatarHTML, applyProfile, profileEditHTML, newProfileEdit} from '../profile.js';
import {cleanMeal, cleanWorkout} from '../domain.js';

const d = '2026-11-20';
const m1 = cleanMeal({id:'m1', date:d, slot:'점심', mealGroupId:'g1', loggedAt:`${d}T12:30:00`, name:'현미밥', servingQty:210, servingUnit:'g', calories:330, carbs:72, protein:6, fat:2});
const m2 = cleanMeal({id:'m2', date:d, slot:'점심', mealGroupId:'g1', loggedAt:`${d}T12:30:00`, name:'닭가슴살', servingQty:1, servingUnit:'개', calories:120, carbs:0, protein:24, fat:2});
const db = {meals:[m1, m2], workouts:[cleanWorkout({id:'w1', date:d, title:'하체', exercises:[{id:'e1', name:'스쿼트', sets:[{id:'s1', weight:60, reps:8}, {id:'s2', weight:60, reps:8}]}, {id:'e2', name:'레그 컬', sets:[{id:'s3', weight:30, reps:12}]}]})], settings:{}};

test('식사 빠른 수정: 한 끼 전체, 양을 바꾸면 영양값도 같은 비율로', () => {
 const st = quickMealState(db, d, 'g1');
 assert.equal(st.rows.length, 2); assert.equal(st.slot, '점심');
 assert.equal(stepFor('g'), 10); assert.equal(stepFor('개'), 0.5);
 st.rows[0].qty = 105;
 assert.deepEqual(rowTotals(st.rows[0]), {calories:165, carbs:36, protein:3, fat:1});
 st.rows[1].removed = true; st.time = '13:10'; st.slot = '저녁';
 const out = applyQuickMeal(db, st);
 assert.equal(out.meals.length, 1);
 assert.equal(out.meals[0].servingQty, 105); assert.equal(out.meals[0].calories, 165); assert.equal(out.meals[0].slot, '저녁');
 assert.equal(new Date(out.meals[0].loggedAt).getHours(), 13);
 assert.match(quickMealHTML(st), /data-qm-step="0"/);
 assert.match(quickMealHTML(st), /되돌리기/);
});

test('운동 빠른 수정: 세트 무게·횟수·삭제, 빈 종목은 막음', () => {
 const st = quickWorkoutState(db.workouts[0]);
 st.ex[0].sets[1].weight = 62.5; st.ex[0].sets[1].reps = 6; st.ex[1].removed = true;
 const out = applyQuickWorkout(db, st);
 const w = out.workouts[0];
 assert.equal(w.exercises.length, 1);
 assert.equal(w.exercises[0].sets[1].weight, 62.5); assert.equal(w.exercises[0].sets[1].originalWeight, 62.5); assert.equal(w.exercises[0].sets[1].reps, 6);
 st.ex[0].sets.forEach(s => s.removed = true);
 assert.throws(() => applyQuickWorkout(db, st), /종목 빼기/);
 assert.match(quickWorkoutHTML(quickWorkoutState(db.workouts[0])), /data-qw-setadd="0"/);
 assert.match(quickWorkoutHTML(quickWorkoutState(db.workouts[0])), /자세히 수정/);
});

test('프로필: 이름·아이콘 저장, 기본은 Google 이름과 사진', () => {
 const user = {displayName:'Moon', email:'m@x.com', photoURL:'https://p/x.jpg'};
 assert.equal(profileOf({settings:{}}, user).name, 'Moon');
 assert.equal(profileOf({settings:{}}, user).type, 'google');
 const st = newProfileEdit({settings:{}}, user); st.nickname = '문'; st.type = 'letter'; st.color = '#b8aaf2';
 const db2 = applyProfile({settings:{}}, st);
 const pr = profileOf(db2, user);
 assert.equal(pr.name, '문'); assert.match(avatarHTML(pr), /avatar-letter[^>]*#b8aaf2[^>]*>문</);
 assert.throws(() => applyProfile({settings:{}}, {...st, type:'photo', photo:''}), /사진/);
 assert.match(profileEditHTML(st, {email:'m@x.com'}), /id="pf-save"/);
 assert.doesNotMatch(profileEditHTML(st, {email:'m@x.com', statusText:''}), /승인됨/);
});
