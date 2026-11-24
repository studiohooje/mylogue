import test from 'node:test';
import assert from 'node:assert/strict';
import {sharedScale, barParts, macroMiniHTML, macroGoalsHTML} from '../nutrition-goals.js';
import {cleanMeal, cleanWorkout, cleanBody, actualDB, plannedMeals} from '../domain.js';
import {planItems} from '../admin-panel.js';
import {isInbody, scaleRecords, inbodyRecords, weightSpark, daysAgo, bodyChartHTML} from '../body-series.js';
import {quickMealRecords, quickWorkoutRecord, isFuture, catOf, timedEditorHTML} from '../quick-entry.js';
import {renderHomeTimeline} from '../timeline-view.js';
import {findExercise, EXERCISE_CATALOG} from '../catalog.js';
import {dayRecords} from '../halo.js';
import {anatomySvg} from '../exercise-ui.js';

const D = '2026-11-21';

test('막대 축: 평소 ×1.25, 하나라도 넘치면 모두 ×2, 또 넘치면 ×4·×8', () => {
 assert.equal(sharedScale([[100,150],[1800,2200]]), 1.25);
 assert.equal(sharedScale([[190,150],[1800,2200]]), 2);
 assert.equal(sharedScale([[310,150],[100,2200]]), 4);
 assert.equal(sharedScale([[650,150]]), 8);
 // 4.25.0 C안: 목표선은 늘 80% 자리, 넘친 양은 남은 20%에 압축(끝을 넘지 않음)
 const b = barParts(230, 150, 0, 2);
 assert.equal(b.mark, 80);
 assert.ok(b.over > 0 && b.over < 20);
 const mini = macroMiniHTML({calories:1800, carbs:100, protein:310, fat:40}, {calorieGoal:2200, carbsGoal:250, proteinGoal:150, fatGoal:70});
 assert.equal((mini.match(/<u style="left:80.0%"/g)||[]).length, 4, '네 막대 목표선이 모두 같은 자리');
 assert.doesNotMatch(mini, /axis-badge|×4/, '배수 표시는 보이지 않는다(대표님 지시)');
 assert.doesNotMatch(macroGoalsHTML({calories:1800, protein:190}, {calorieGoal:2200, proteinGoal:150}), /막대 끝 = 목표/);
});

test('예정 기록: 미래 시각이면 planned, 합계·헤일로에서 빠지고, 1시간 지나면 중요 알림', () => {
 const future = new Date(Date.now() + 3*3600000), hm = `${String(future.getHours()).padStart(2,'0')}:${String(future.getMinutes()).padStart(2,'0')}`;
 const fdate = `${future.getFullYear()}-${String(future.getMonth()+1).padStart(2,'0')}-${String(future.getDate()).padStart(2,'0')}`;
 const rows = quickMealRecords({date:fdate, time:hm, rows:[{name:'제육덮밥', servingQty:1, servingUnit:'그릇', calories:850, carbs:100, protein:35, fat:28, baseQty:1}]});
 assert.equal(rows[0].planned, true);
 assert.equal(isFuture(new Date(Date.now()-60000).toISOString()), false);
 const now = {id:'n', date:D, name:'밥', servingQty:1, servingUnit:'공기', calories:300, loggedAt:`${D}T08:00:00`};
 const plan = cleanMeal({id:'p', date:D, name:'닭가슴살', servingQty:1, servingUnit:'개', calories:120, protein:25, loggedAt:`${D}T12:00:00`, mealGroupId:'g1', planned:true});
 const db = {meals:[now, plan], workouts:[], body:[]};
 assert.equal(actualDB(db).meals.length, 1);
 assert.deepEqual(plannedMeals(db, D).count, 1);
 assert.equal(plannedMeals(db, D).totals.calories, 120);
 assert.equal(dayRecords(actualDB(db), D).length, 1);
 const html = renderHomeTimeline({...db, settings:{}}, D, {planned:plannedMeals(db, D).totals, plannedCount:1, showPlanned:false});
 assert.match(html, /timeline-card planned/);
 assert.match(html, /data-plan-confirm="meal:g1"/);
 assert.match(html, /plan-toggle/);
 assert.equal(planItems(db, Date.parse(`${D}T12:30:00`)).length, 0, '1시간 전에는 알림 없음');
 const items = planItems(db, Date.parse(`${D}T13:05:00`));
 assert.equal(items.length, 1);
 assert.equal(items[0].kind, 'plan');
 assert.equal(items[0].ref, 'meal:g1');
});

test('체중계 체중과 인바디 구분, 홈 체중 칸은 체중계만·N일 전', () => {
 const body = [{date:'2026-11-01', weight:73.2}, {date:'2026-11-15', weight:72.6, skeletalMuscle:33.1, bodyFatMass:14}, {date:'2026-11-19', weight:72.4, measure:'scale'}, {date:'2026-11-18', weight:71.9, measure:'inbody'}];
 assert.equal(isInbody(body[1]), true);
 assert.equal(isInbody(body[3]), true);
 assert.deepEqual(scaleRecords({body}).map(b => b.date), ['2026-11-01','2026-11-19']);
 assert.equal(inbodyRecords({body}).length, 2);
 assert.equal(daysAgo('2026-11-19', D), '2일 전');
 assert.equal(daysAgo(D, D), '오늘');
 assert.match(weightSpark({body}, D, 30), /weight-spark/);
 assert.equal(cleanBody({date:D, weight:70, measure:'inbody'}).measure, 'inbody');
 const home = renderHomeTimeline({body, meals:[], workouts:[], settings:{}}, D);
 assert.match(home, /72\.4<span>kg<\/span>/);
 assert.match(home, /2일 전/);
 assert.doesNotMatch(home, /마지막 측정|첫 운동을 기다려요|기록이 쌓일수록/);
 const chart = bodyChartHTML([{name:'체중', unit:'kg', pts:scaleRecords({body}).map(x => ({date:x.date, v:x.weight}))}], {days:30, today:D});
 assert.match(chart, /data-pts=/);
});

test('운동 대분류·시간 기록 종목(러닝·필라테스·요가)', () => {
 assert.equal(catOf(findExercise('필라테스 리포머')), '필라테스');
 assert.equal(catOf(findExercise('야외 러닝')), '러닝·유산소');
 assert.equal(catOf(findExercise('스쿼트')), '웨이트');
 assert.match(timedEditorHTML(findExercise('야외 러닝'), {}), /q-t-km/);
 assert.match(timedEditorHTML(findExercise('필라테스 리포머'), {}), /q-t-type/);
 const ex = findExercise('필라테스 리포머');
 const w = quickWorkoutRecord({date:D, gymName:'', title:'', workoutId:null, sets:[{id:'t1', timed:true, exerciseId:ex.id, exercise:ex, durationMin:50, distanceKm:null, effort:7, avgHr:null, sessionType:'개인', note:'코어', completedAt:`${D}T10:00`}]}, {workouts:[]});
 const e = w.exercises[0];
 assert.equal(e.kind, 'cardio');
 assert.equal(e.durationMin, 50);
 assert.equal(e.effort, 7);
 assert.equal(e.sessionType, '개인');
 assert.ok(dayRecords({workouts:[w]}, D).some(r => r.kind==='workout'), '헤일로에 반영');
 assert.throws(() => cleanWorkout({date:D, exercises:[{name:'요가', kind:'cardio', durationMin:30, effort:11}]}), /1~10/);
 assert.ok(EXERCISE_CATALOG.filter(x => x.part==='요가').length >= 3);
});

test('4.18.0 의도적 휴식일에만 회복 펄스, 아무것도 안 적은 날·운동한 날엔 없음', () => {
 const svg = anatomySvg([], [], {side:'front', mode:'load', loads:[], recover:['quads']});
 assert.match(svg, /class="muscle recover"/);
 const y = '2026-11-20';
 const squat = cleanWorkout({date:y, exercises:[{name:'스쿼트', sets:[{weight:60, reps:8}]}]});
 assert.doesNotMatch(renderHomeTimeline({meals:[], body:[], settings:{}, workouts:[squat]}, D), /muscle recover/);
 const rest = cleanWorkout({date:D, rest:true, title:'의도적 휴식', exercises:[]});
 assert.match(renderHomeTimeline({meals:[], body:[], settings:{}, workouts:[squat, rest]}, D), /muscle recover/);
 const bench = cleanWorkout({date:D, exercises:[{name:'벤치프레스', sets:[{weight:40, reps:8}]}]});
 assert.doesNotMatch(renderHomeTimeline({meals:[], body:[], settings:{}, workouts:[squat, bench]}, D), /muscle recover/);
});
