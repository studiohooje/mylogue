import test from 'node:test';
import assert from 'node:assert/strict';
import {computeMacroPlan, applyMacroPlan, refreshMacroGoals, planFromSettings, macroPlanCardHTML, macroPlanFormHTML, PRESETS} from '../macro-plan.js';

test('영양소마다 다른 방식: 체중 대비·고정 g·비율·나머지', () => {
 const a = computeMacroPlan({calorieGoal:2300, rules:{protein:{mode:'perKg', value:2}, carbs:{mode:'perKg', value:3}, fat:{mode:'rest', value:1}}}, 73.4);
 assert.equal(a.g.protein, 146.8); assert.equal(a.g.carbs, 220.2); assert.equal(a.total, 2300); assert.deepEqual(a.errors, []);
 const b = computeMacroPlan({calorieGoal:2300, rules:{protein:{mode:'grams', value:200}, fat:{mode:'ratio', value:25}, carbs:{mode:'rest', value:1}}}, 73);
 assert.equal(b.g.protein, 200); assert.equal(b.total, 2300);
 const c = computeMacroPlan({calorieGoal:2000, rules:{protein:{mode:'perKg', value:2}, carbs:{mode:'rest', value:60}, fat:{mode:'rest', value:40}}}, 70);
 assert.deepEqual(c.g, {protein:140, carbs:216, fat:64});
 assert.match(computeMacroPlan({calorieGoal:2000, rules:{carbs:{mode:'ratio', value:50}, protein:{mode:'ratio', value:30}, fat:{mode:'ratio', value:30}}}).errors.join(), /100%/);
 assert.match(computeMacroPlan({calorieGoal:1500, rules:{protein:{mode:'grams', value:300}, carbs:{mode:'grams', value:200}, fat:{mode:'rest', value:1}}}).errors.join(), /넘어요/);
 assert.match(computeMacroPlan({calorieGoal:2000, rules:{protein:{mode:'perKg', value:2}, carbs:{mode:'rest', value:1}, fat:{mode:'rest', value:1}}}, null).errors.join(), /체중 기록/);
});

test('저장·체중이 바뀌면 다시 계산·제안(마법사) 뒤에는 옛 계획을 쓰지 않음', () => {
 const plan = {calorieGoal:2200, rules:{protein:{mode:'perKg', value:2}, fat:{mode:'ratio', value:25}, carbs:{mode:'rest', value:1}}};
 const s = applyMacroPlan({}, plan, 70);
 assert.equal(s.goalMode, 'plan'); assert.equal(s.proteinGoal, 140); assert.equal(s.calorieGoal, 2200);
 assert.equal(refreshMacroGoals(s, 70), s, '같은 체중이면 그대로');
 assert.equal(refreshMacroGoals(s, 75).proteinGoal, 150);
 assert.equal(planFromSettings({...s, goalMode:'ratio', carbsPctGoal:40, proteinPctGoal:30, fatPctGoal:30}).rules.protein.mode, 'ratio');
 assert.ok(PRESETS.length>=4);
});

test('식단 화면 목표 카드와 수정 창', () => {
 const s = applyMacroPlan({}, {calorieGoal:2300, rules:{protein:{mode:'perKg', value:2}, fat:{mode:'ratio', value:25}, carbs:{mode:'rest', value:1}}}, 73.4);
 const card = macroPlanCardHTML(s, 73.4);
 assert.match(card, /data-modal="macro-plan"/); assert.doesNotMatch(card, /id="gw-open"/);
 assert.match(card, /체중 × 2/); assert.match(card, /최근 체중 73\.4kg 기준/);
 const form = macroPlanFormHTML(planFromSettings(s), 73.4);
 assert.match(form, /data-mp-mode="protein:perKg"[^>]*aria-pressed="true"/);
 assert.match(form, /data-mp-preset=/); assert.match(form, /class="ai-magic ai-suggest" id="gw-open"/);
 assert.match(macroPlanCardHTML({}, null), /아직 목표가 없어요/);
});
