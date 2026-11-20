import test from 'node:test';
import assert from 'node:assert/strict';
import {macroStatus, macroGoalsHTML} from '../nutrition-goals.js';
import {pendingItems, panelHTML} from '../admin-panel.js';
import {draftSummary, draftTitle, renderAIInbox} from '../ai-inbox.js';

test('식단 목표: 부족·초과·달성(±5%)·목표 없음', () => {
 assert.deepEqual(macroStatus(180, 250).state, 'under');
 assert.equal(macroStatus(180, 250).diff, -70);
 assert.equal(macroStatus(82, 70).state, 'over');
 assert.equal(macroStatus(2150, 2200).state, 'met');
 assert.equal(macroStatus(100, 0).state, 'none');
});

test('홈 식단 카드: 칼로리·탄단지 막대, 초과분 표시, 부족·초과 숫자', () => {
 const html = macroGoalsHTML({calories:1748, carbs:182, protein:96, fat:82}, {calorieGoal:2200, carbsGoal:250, proteinGoal:150, fatGoal:70}, {meals:5});
 assert.match(html, /452 kcal 남음/);
 assert.match(html, /68g 부족/);
 assert.match(html, /\+12g 초과/);
 assert.match(html, /macro-row fat over/);
 assert.match(html, /<s style="left:/, '초과분 막대');
 assert.match(html, /5번의 식사/);
 const none = macroGoalsHTML({calories:500}, {}, {meals:1});
 assert.match(none, /목표를 정하면/);
 assert.doesNotMatch(none, /<s style/);
 assert.match(macroGoalsHTML({calories:2600}, {calorieGoal:2200}), /\+400 kcal 초과/);
});

const ts = ms => ({toDate:()=>new Date(ms), toMillis:()=>ms});
const meal = {id:'d1', type:'meal', status:'pending', createdAt:ts(3000), originalUtterance:'점심 김치찌개', parsedData:{items:[{date:'2026-11-20', slot:'점심', name:'김치찌개', servingQty:1, servingUnit:'회', calories:450, carbs:30, protein:25, fat:20}, {date:'2026-11-20', slot:'점심', name:'밥', servingQty:210, servingUnit:'g', calories:300, carbs:66, protein:5, fat:1}]}};
const workout = {id:'d2', type:'workout', status:'pending', createdAt:ts(2000), parsedData:{date:'2026-11-20', title:'하체', exercises:[{name:'스쿼트', sets:[{},{},{}]}, {name:'레그 프레스', sets:[{},{}]}]}};

test('AI 검토함: 한 줄 요약과 일괄 처리 도구', () => {
 assert.equal(draftTitle(meal), '점심 · 음식 2개');
 assert.match(draftSummary(meal), /김치찌개, 밥 · 750kcal · 탄96 단30 지21/);
 assert.match(draftSummary(workout), /2종목 5세트/);
 const html = renderAIInbox([meal, workout, {...meal, id:'d3', status:'confirmed', updatedAt:ts(1)}], {meals:[], workouts:[], body:[]});
 assert.match(html, /id="ai-pick-all"/);
 assert.match(html, /id="ai-bulk-confirm"[^>]*disabled/);
 assert.match(html, /id="ai-bulk-reject"/);
 assert.match(html, /data-ai-pick="d1"/);
 assert.match(html, /data-ai-quick="d2"/);
 assert.match(html, /<details class="ai-edit">/);
 assert.match(html, /ai-done-list/);
});

test('알림: AI 초안도 모이고 종류별 색 구분 클래스가 붙는다', () => {
 const items = pendingItems({aiDrafts:[meal, {...workout, status:'confirmed'}], applicants:[{uid:'u', email:'x@y', status:'pending', createdAt:ts(1000)}], requests:[{id:'r', name:'레그', status:'pending', createdAt:ts(500)}]});
 assert.deepEqual(items.map(x=>x.kind), ['ai','user','request']);
 const html = panelHTML(items, {open:true, snoozed:new Set(), done:[]});
 assert.match(html, /admin-item k-ai/);
 assert.match(html, /admin-item k-user/);
 assert.match(html, /admin-item k-request/);
 assert.match(html, />확정</);
 assert.match(html, />AI 검토</);
});
