import test from 'node:test';
import assert from 'node:assert/strict';
import {buildReport, reportHTML, headline, weekStart, ymd} from '../analysis-report.js';
import {cleanWorkout, cleanMeal} from '../domain.js';
import {macroGoalsHTML} from '../nutrition-goals.js';

const now = new Date('2026-11-20T21:00:00');
const day = n => ymd(new Date(now.getFullYear(), now.getMonth(), now.getDate()-n));
const W = (n, name, kg, reps, sets, extra={}) => cleanWorkout({date:day(n), loggedAtTime:'18:00', exercises:[{name, sets:Array.from({length:sets}, () => ({weight:kg, reps}))}], ...extra});

const db = {
 workouts:[
  W(0, '스쿼트', 100, 5, 5), W(1, '레그 프레스', 200, 10, 4), W(3, '벤치프레스', 70, 8, 4),
  W(9, '스쿼트', 95, 5, 5), W(12, '랫풀다운', 60, 10, 4), W(16, '스쿼트', 90, 5, 5), W(30, '스쿼트', 85, 5, 5),
 ],
 meals:[cleanMeal({date:day(0), name:'닭가슴살', servingQty:1, calories:500, protein:150}), cleanMeal({date:day(1), name:'밥', servingQty:1, calories:300, protein:20})],
 body:[{date:day(20), skeletalMuscle:31.2}, {date:day(2), skeletalMuscle:31.8}],
 settings:{proteinGoal:150},
};

test('리포트: 이번 주 요약·지난주 대비·가장 많이 한 부위·오래 쉰 부위', () => {
 const r = buildReport(db, now);
 assert.equal(r.week.sessions, 3);
 assert.equal(r.week.sets, 13);
 assert.equal(r.week.topPart, '하체');
 assert.match(headline(r), /하체에 진심인 한 주/);
 assert.ok(r.week.volDelta !== null);
 assert.deepEqual(r.week.rested, ['등', 12]);
 assert.ok(r.week.push > 0);
});

test('리포트: 회복 지도는 48시간 안을 회복 중으로, 새 기록과 성장 그래프', () => {
 const r = buildReport(db, now);
 const quads = r.recovery.find(x => x.muscleId==='quads');
 assert.equal(quads.state, 'recovering');
 assert.equal(r.recovery.find(x => x.muscleId==='chest').state, 'ready');
 assert.ok(r.prs.some(p => p.name==='스쿼트' && p.gain > 0), '이번 달 스쿼트 새 기록');
 assert.equal(r.growth.name, '스쿼트');
 assert.ok(r.growth.points.length >= 3);
 assert.equal(r.grid.length, 84);
 assert.equal(r.grid.filter(c => c.sets < 0).length, 6 - ((now.getDay()+6)%7), '오늘 뒤는 비움');
});

test('리포트: 이번 달 카드와 식단·몸 연결', () => {
 const r = buildReport(db, now);
 assert.ok(r.month.volume > 0);
 assert.equal(r.month.topEx, '스쿼트');
 assert.equal(r.diet.proteinHit, 1);
 assert.equal(r.diet.smmChange, 0.6);
 const html = reportHTML(r, {exerciseOptions:r.growth.names});
 for(const k of ['이번 주 리포트','회복 지도','이번 달 새 기록','성장','부위 균형','꾸준함','리포트 카드','식단·몸과 함께 보기','id="apply-recommendation"','id="ar-share"','id="ar-exercise"']) assert.ok(html.includes(k), k);
});

test('리포트: 기록이 없어도 깨지지 않는다', () => {
 const r = buildReport({workouts:[], meals:[], body:[], settings:{}}, now);
 assert.equal(r.week.sessions, 0);
 assert.match(headline(r), /첫 운동/);
 assert.ok(reportHTML(r).includes('같은 종목을 두 주 이상'));
 assert.equal(weekStart(new Date('2026-11-20T10:00:00')).getDay(), 1);
});

test('식단 화면: 홈에 있던 큰 목표 막대 카드', () => {
 assert.match(macroGoalsHTML({calories:2353, carbs:269.2, protein:178.6, fat:64.9}, {calorieGoal:2200, carbsGoal:250, proteinGoal:150, fatGoal:70}, {meals:6}), /\+153 kcal 초과/);
});
