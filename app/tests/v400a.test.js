import test from 'node:test';
import assert from 'node:assert/strict';
import {renderHomeTimeline} from '../timeline-view.js';
import {quickMealState, applyQuickMeal} from '../quick-edit.js';
import {validateDraftRecords} from '../ai-drafts.js';
import {cleanWorkout} from '../domain.js';

const pad = n => String(n).padStart(2,'0');
const ymd = d => `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;

test('홈 타임라인 수정 버튼은 식사·운동을 정확히 가리킨다(빈 값이면 "찾지 못했어요")', () => {
 const T = '2026-11-21';
 const w = cleanWorkout({id:'w1', date:T, exercises:[{name:'스쿼트', sets:[{weight:60, reps:8}]}]});
 const html = renderHomeTimeline({meals:[{id:'a', date:T, name:'밥', servingQty:1, servingUnit:'공기', calories:300, loggedAt:`${T}T12:00:00`, mealGroupId:'g1'}], workouts:[w], body:[], settings:{}}, T);
 assert.match(html, /data-qm="g1"/);
 assert.match(html, /data-qw="w1"/);
 assert.doesNotMatch(html, /data-q[mw]=""/);
});

test('AI 검토함으로 확정해도 시각이 미래면 예정, 수정해도 예정 유지·미래로 옮기면 예정', () => {
 const fut = new Date(Date.now() + 3*3600e3), T = ymd(fut);
 const draft = {id:'ai-1', type:'meal', parsedData:{items:[{date:T, slot:'저녁', loggedAt:fut.toISOString(), name:'제육', servingQty:1, servingUnit:'그릇', calories:800}]}};
 const rec = validateDraftRecords(draft)[0].record;
 assert.equal(rec.planned, true);
 const past = new Date(Date.now() - 3*3600e3);
 const done = validateDraftRecords({...draft, id:'ai-2', parsedData:{items:[{...draft.parsedData.items[0], loggedAt:past.toISOString(), date:ymd(past)}]}})[0].record;
 assert.notEqual(done.planned, true);
 const db = {meals:[rec], workouts:[], body:[], settings:{}};
 const st = quickMealState(db, T, rec.mealGroupId);
 assert.ok(st, '예정 식사도 수정 화면이 열린다');
 st.rows[0].qty = 2;
 const after = applyQuickMeal(db, st);
 assert.equal(after.meals.length, 1, '수정해도 사라지지 않는다');
 assert.equal(after.meals[0].planned, true);
 const wd = {id:'ai-3', type:'workout', parsedData:{date:T, loggedAtTime:`${pad(fut.getHours())}:${pad(fut.getMinutes())}`, exercises:[{name:'스쿼트', sets:[{weight:60, reps:8}]}]}};
 assert.equal(validateDraftRecords(wd)[0].record.planned, true);
});
