import test from 'node:test';
import assert from 'node:assert/strict';
import {macroMiniHTML} from '../nutrition-goals.js';
import {todayMuscleLoads} from '../timeline-view.js';
import {cleanWorkout} from '../domain.js';
import {quickWorkoutState, applyQuickWorkout, quickWorkoutHTML} from '../quick-edit.js';

test('홈 식단 칸: 다른 칸과 같은 카드, 작은 막대 네 줄, 먹은 양 / 목표(3.18.0: 남음 문구 대신)', () => {
 const html = macroMiniHTML({calories:1748, carbs:182, protein:96, fat:82}, {calorieGoal:2200, carbsGoal:250, proteinGoal:150, fatGoal:70}, {meals:5});
 assert.match(html, /class="home-stat home-stat-diet" data-page="food"/);
 assert.equal((html.match(/class="mini-row /g)||[]).length, 4);
 assert.match(html, /1,748<span class="stat-goal">\/ 2,200<\/span>/);
 assert.doesNotMatch(html, /남음/);
 assert.match(html, /mini-row fat over/);
 assert.match(macroMiniHTML({calories:500}, {}, {meals:2}), /500<span>kcal<\/span>/);
});

test('홈 운동 칸: 오늘 많이 쓴 부위(타깃 없으면 부위로 대신)', () => {
 const w = cleanWorkout({date:'2026-11-20', exercises:[{name:'스쿼트', sets:[{weight:60,reps:8},{weight:60,reps:8},{weight:60,reps:8}]}, {name:'이너타이', part:'하체', sets:[{weight:40,reps:12}]}, {name:'바벨 컬', sets:[{weight:20,reps:10,completed:false}]}]});
 const loads = todayMuscleLoads([w]);
 const ids = loads.map(x=>x.muscleId);
 assert.ok(ids.includes('quads'));
 assert.ok(!ids.includes('biceps'), '완료 안 한 세트는 제외');
 assert.equal(loads[0].score, 6);
});

test('운동한 시각: 저장·수정 가능, 날짜를 바꾸면 시각은 유지', () => {
 const w = cleanWorkout({date:'2026-11-20', loggedAtTime:'18:40', exercises:[{name:'스쿼트', sets:[{weight:60,reps:8}]}]});
 assert.equal(new Date(w.loggedAt).getHours(), 18);
 const db = {workouts:[w]};
 const st = quickWorkoutState(w);
 assert.equal(st.time, '18:40');
 assert.match(quickWorkoutHTML(st), /id="qw-time"/);
 assert.match(quickWorkoutHTML(st), /id="qw-duration"/);
 st.time = '07:15'; st.duration = '55'; st.date = '2026-11-19';
 const out = applyQuickWorkout(db, st).workouts[0];
 const d = new Date(out.loggedAt);
 assert.equal(d.getHours(), 7); assert.equal(d.getMinutes(), 15); assert.equal(out.date, '2026-11-19'); assert.equal(out.duration, 55);
 assert.equal(cleanWorkout({date:'2026-11-20', exercises:[{name:'x', sets:[{weight:1,reps:1}]}]}).loggedAt, '');
});
