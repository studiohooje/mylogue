import test from 'node:test';
import assert from 'node:assert/strict';
import {keystrokes, choseong, matchScore} from '../suggest.js';
import {foodSuggestions, foodGroupItems, foodGroupOf, exerciseSuggestions, machineChoices, popKey} from '../suggest-ui.js';
import {FOOD_CATALOG} from '../food-catalog.js';
import {EXERCISE_CATALOG} from '../catalog.js';

test('자모·초성·영문 자판으로 같은 글자를 찾는다', () => {
 assert.equal(keystrokes('닭'), 'ㄷㅏㄹㄱ');
 assert.equal(keystrokes('ekfr', {latinAsHangul:true}), 'ㄷㅏㄹㄱ');
 assert.equal(choseong('닭가슴살'), 'ㄷㄱㅅㅅ');
 for(const q of ['ㄷ','다','달','닭','ekfr','ekfrrktmatkf','ㄷㄱㅅ']) assert.ok(matchScore(q, ['닭가슴살']) > 0, q);
 assert.ok(matchScore('fp', ['레그 프레스']) > 0, '영문 자판 레');
 assert.ok(matchScore('rdl', ['루마니안 데드리프트', 'RDL']) > 0, '영문 별칭');
 assert.equal(matchScore('ㄱ', ['닭가슴살']), 0, '자음 하나는 중간 글자와 맞추지 않음');
 assert.ok(matchScore('닭가', ['닭가슴살']) > matchScore('가슴', ['닭가슴살']));
});

const brand = (name, kcal=110) => ({name, servingQty:100, servingUnit:'g', calories:kcal, carbs:1, protein:23, fat:1});
const foods = [...FOOD_CATALOG, brand('김단단 닭가슴살'), brand('바르닭 닭가슴살'), brand('A사 닭가슴살'), brand('C사 닭가슴살'), brand('D사 닭가슴살'), brand('비비고 왕교자', 220)];
const meals = [...Array(30).fill('김단단 닭가슴살'), 'A사 닭가슴살', ...Array(3).fill('C사 닭가슴살')].map(name => ({name}));

test('음식: ㄷ만 쳐도 대분류 칩(닭가슴살 등), 최대 5개', () => {
 const {chips} = foodSuggestions('ㄷ', foods, {meals});
 assert.ok(chips.length >= 1 && chips.length <= 5);
 assert.equal(chips[0].label, '닭가슴살', '많이 먹은 대분류가 먼저');
 assert.equal(chips[0].kind, 'group');
 assert.ok(foodSuggestions('ekfr', foods, {meals}).chips.some(c => c.label === '닭가슴살'));
 assert.ok(foodSuggestions('왕교', foods, {meals}).chips.some(c => c.label === '비비고 왕교자' && c.kind === 'item'));
 assert.equal(foodGroupOf({name:'김단단 닭가슴살'}), '닭가슴살');
});

test('음식 소분류: 내가 먹은 순(김단단 30 → C 3 → A 1) → 전체 사용자 순(D) → 대표값', () => {
 const items = foodGroupItems('닭가슴살', foods, {meals, pop:{foods:{[popKey('D사 닭가슴살')]:50, [popKey('바르닭 닭가슴살')]:5}}}).map(x => x.f.name);
 assert.deepEqual(items.slice(0, 5), ['김단단 닭가슴살', 'C사 닭가슴살', 'A사 닭가슴살', 'D사 닭가슴살', '바르닭 닭가슴살']);
 assert.ok(items.indexOf('닭가슴살 (익힌 것)') > 4);
});

test('운동: 레만 쳐도 종목 칩, 머신은 일반(각도별) → 내가 많이 쓴 순', () => {
 const chips = exerciseSuggestions('레', EXERCISE_CATALOG).map(x => x.name);
 assert.ok(chips.includes('레그 프레스') && chips.length <= 5);
 assert.ok(exerciseSuggestions('fp', EXERCISE_CATALOG).some(x => x.name === '레그 프레스'));
 const db = {machines:[{id:'my1', name:'우리 헬스장 레그프레스', manufacturer:'Cybex', model:'Eagle', exerciseId:'exercise:레그 프레스'}], workouts:[{exercises:[{exerciseId:'exercise:레그 프레스', machineId:'my1', sets:[{completed:true}]}]}]};
 const list = machineChoices('exercise:레그 프레스', {db});
 assert.equal(list[0].tag, '일반');
 assert.ok(list.findIndex(x => x.m.id === 'my1') > list.findIndex(x => x.tag === '일반'));
 assert.equal(list.find(x => x.m.id === 'my1').n, 1);
});

test('내 값: 대표값과 같은 음식을 다른 영양값으로 쓰면 내 값이 우선이고 표시된다', async () => {
 const {quickFoodCandidates} = await import('../quick-entry.js');
 const base = {...FOOD_CATALOG.find(f => f.name==='현미밥'), catalog:true};
 const mine = {name:'현미밥', servingQty:100, servingUnit:'g', calories:160, carbs:35, protein:3, fat:1};
 const list = quickFoodCandidates({meals:[], foods:[base, mine]});
 const hit = list.find(x => x.name==='현미밥');
 assert.equal(hit.calories, 160); assert.equal(hit.personal, true); assert.equal(hit.group, '밥');
 const same = quickFoodCandidates({meals:[], foods:[base, {...mine, calories:base.calories, carbs:base.carbs, protein:base.protein, fat:base.fat}]}).find(x => x.name==='현미밥');
 assert.ok(!same.personal, '값이 같으면 표시 안 함');
});
