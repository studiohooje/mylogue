import test from 'node:test';
import assert from 'node:assert/strict';
import {quickMealState, applyQuickMeal, mealDiff, rowTotals, stepFor, quickMealHTML, quickWorkoutState, applyQuickWorkout, quickWorkoutHTML} from '../quick-edit.js';
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
 assert.equal(out.meals[0].servingQty, 105); assert.equal(out.meals[0].calories, 165); assert.equal(out.meals[0].slot, '점심', '4.4.3: 끼니 칸이 없어져 원래 끼니 값은 그대로');assert.doesNotMatch(quickMealHTML(st),/qm-slot/);
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

test('4.11.0 R-6 단위와 양을 함께 바꾸면 원래 저장 음식은 지키고 새 단위 음식만 추가',async()=>{const {quickMealState,applyQuickMeal}=await import('../quick-edit.js');const db={meals:[{id:'m1',date:'2026-11-22',mealGroupId:'G',slot:'식사',name:'현미밥',servingQty:210,servingUnit:'g',calories:300,loggedAt:'2026-11-22T10:00:00'}],foods:[{id:'f1',name:'현미밥',servingQty:100,servingUnit:'g',calories:143}]};const st=quickMealState(db,'2026-11-22','G');st.rows[0].unit='공기';st.rows[0].qty=2;const out=applyQuickMeal(db,st);const g=out.foods.find(f=>f.servingUnit==='g'),b=out.foods.find(f=>f.servingUnit==='공기');assert.equal(g.calories,143);assert.ok(b);assert.equal(out.foods.length,2)});

test('4.11.0 R-8 날짜·시각만 바꿔도 바뀐 것으로 본다',()=>{const db={meals:[{id:'m1',date:'2026-11-22',mealGroupId:'G',slot:'식사',name:'김밥',servingQty:1,servingUnit:'줄',calories:400,loggedAt:'2026-11-22T12:00:00'}]};const st=quickMealState(db,'2026-11-22','G');assert.equal(mealDiff(st),'바뀐 것 없음');st.time='13:00';assert.match(mealDiff(st),/날짜·시각/)});

test('4.11.0 R-11 단위 목록 하나로, mg·oz는 g으로',async()=>{const d=await import('../domain.js');const b=await import('../meal-batch.js');const q=await import('../quick-edit.js');assert.equal(b.UNIT_OPTIONS,d.MEAL_UNITS);assert.equal(q.UNITS,d.MEAL_UNITS);assert.deepEqual(d.normalizeUnit(500,'mg'),{qty:0.5,unit:'g'});assert.deepEqual(d.normalizeUnit(2,'oz'),{qty:56.7,unit:'g'})});

test('4.11.0 도감 검수: 한쪽씩 종목은 per-side, 이름에 덤벨 없는 덤벨 종목은 한 손 기준',async()=>{const {EXERCISE_CATALOG}=await import('../catalog.js');const f=n=>EXERCISE_CATALOG.find(x=>x.name===n);for(const n of ['런지','덤벨 스텝업','원암 덤벨 로우','토르소 로테이션 머신'])assert.equal(f(n)?.repBasis,'per-side',n);for(const n of ['해머 컬','사이드 레터럴 레이즈'])assert.equal(f(n)?.weightBasis,'per-hand',n);assert.equal(f('오버헤드 프레스')?.equipment,'바벨')});
