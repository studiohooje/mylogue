import test from 'node:test';
import assert from 'node:assert/strict';
import {num, unitFromQty, parsePaste, unitIssues, aiContextText} from '../ai-paste.js';
import {unitOptions} from '../ai-inbox.js';
import {AI_PROMPT} from '../ai-prompt.js';
import {barParts, barPos, MARK, carbTipHTML, macroGoalsHTML} from '../nutrition-goals.js';
import {foodIssue} from '../food-check.js';

const D = '2026-11-24';
const paste = items => '```json\n' + JSON.stringify({mylogue:1, records:[{type:'meal', date:D, time:'15:00', slot:'간식', items}]}) + '\n```';

test('AI 답 숫자: 처음 나오는 수 하나만 읽는다(예전엔 1팩(100g) → 1100)', () => {
 assert.equal(num('1팩(100g)'), 1);
 assert.equal(num('300~400'), 300);
 assert.equal(num('1/2'), 0.5);
 assert.equal(num('반'), 0.5);
 assert.equal(num('한 팩 반'), 1.5);
 assert.equal(num('두 팩'), 2);
 assert.equal(num('1,234'), 1234);
 assert.equal(num(2.5), 2.5);
 assert.equal(num(''), null);
 assert.equal(unitFromQty('2팩'), '팩');
 assert.equal(unitFromQty('1 공기'), '공기');
 assert.equal(unitFromQty('2'), '');
});

test('AI 답의 팩 단위는 팩 그대로, grams는 1단위 무게로 남는다', () => {
 const [d] = parsePaste(paste([{name:'킹닭 허브맛 닭다리살', qty:2, unit:'팩', grams:100, kcal:354, carbs:10, protein:42, fat:16}, {name:'콩 현미밥', qty:'1개', kcal:165, carbs:34, protein:5, fat:1}]));
 const [a, b] = d.parsedData.items;
 assert.equal(a.servingQty, 2); assert.equal(a.servingUnit, '팩'); assert.equal(a.unitGrams, 100);
 assert.equal(b.servingQty, 1); assert.equal(b.servingUnit, '개', '양 칸에 붙은 단위를 쓴다');
 assert.deepEqual(unitIssues(paste([{name:'닭다리살', qty:2, unit:'팩', kcal:354}])), []);
 assert.equal(unitIssues(paste([{name:'닭다리살', qty:1, unit:'g', kcal:177}])).length, 1, '1g에 177kcal는 바로 짚는다');
});

test('AI 검토함 단위 칸: AI가 적은 단위가 그대로 선택된다(예전엔 g·개·회뿐이라 팩이 g로 저장)', () => {
 for (const u of ['팩', '공기', '그릇', '인분', '봉지']) {
  const html = unitOptions(u);
  assert.match(html, new RegExp(`<option value="${u}" selected>`));
  assert.equal((html.match(/selected/g)||[]).length, 1);
 }
 assert.match(unitOptions(''), /<option value="회" selected>/);
 assert.match(unitOptions('<b>'), /&lt;b&gt;/, '단위 글자는 이스케이프');
});

test('AI 지시문: 팩 단위와 qty 숫자 규칙, 내 음식 목록은 100g 기준으로 적는다', () => {
 assert.match(AI_PROMPT, /팩/);
 assert.match(AI_PROMPT, /qty에는 숫자만/);
 assert.match(AI_PROMPT, /"grams"/);
 const ctx = aiContextText({meals:[], foods:[{id:'f1', name:'킹닭 허브맛 닭다리살', servingQty:1, servingUnit:'g', calories:177, carbs:5, protein:21, fat:8}, {id:'f2', name:'콩 현미밥', servingQty:1, servingUnit:'개', unitGrams:130, calories:165}]});
 assert.match(ctx, /킹닭 허브맛 닭다리살 · 100g · 177kcal/);
 assert.doesNotMatch(ctx, /· 1g ·/);
 assert.match(ctx, /콩 현미밥 · 1개\(130g\)/);
});

test('영양 막대 C안: 목표선은 모든 막대 80%, 넘친 양은 끝을 넘지 않고 많을수록 길다', () => {
 assert.equal(MARK, 80);
 assert.equal(barPos(100, 100), 80);
 assert.ok(Math.abs(barPos(50, 100) - 40) < 1e-9);
 const small = barParts(105, 100), mid = barParts(130, 100), big = barParts(400, 100);
 assert.ok(small.over < mid.over && mid.over < big.over && big.over < 20);
 assert.ok(Math.abs(barPos(101, 100) - (80 + 0.8)) < 0.05, '목표 근처에서는 거의 비례');
 const p = barParts(90, 100, 30);
 assert.ok(p.planLeft + p.plan <= 100 && p.plan > 0);
 const html = macroGoalsHTML({calories:2555, carbs:338.2, protein:180, fat:54.2}, {calorieGoal:2300, carbsGoal:262.5, proteinGoal:168.8, fatGoal:63.9}, {meals:3});
 assert.equal((html.match(/<u style="left:80\.0%"/g)||[]).length, 4);
});

test('탄수화물 한 줄 제안(B안): 넘칠 때만, 밥 공기로 환산', () => {
 assert.equal(carbTipHTML(270, 262.5), '', '5% 이내는 조용히');
 assert.equal(carbTipHTML(100, 0), '');
 assert.match(carbTipHTML(338.2, 262.5), /75\.7g 많아요.*약 1공기/);
 assert.match(carbTipHTML(300, 262.5, {plannedCarbs:40}), /예정된 식사/);
 assert.doesNotMatch(carbTipHTML(285, 262.5), /공기/, '20g 남짓은 밥 환산 없이');
});

test('값 점검: 팩이 g로 잘못 저장된 기록은 경고가 뜬다', () => {
 assert.equal(foodIssue({servingQty:1, servingUnit:'g', calories:177}).code, 'tiny');
 assert.equal(foodIssue({servingQty:10, servingUnit:'g', calories:177}).code, 'dense');
 assert.equal(foodIssue({servingQty:1, servingUnit:'팩', calories:177, carbs:5, protein:21, fat:8}), null);
});
