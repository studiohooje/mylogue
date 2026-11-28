import test from 'node:test';
import assert from 'node:assert/strict';
import {foodUsage, rankByUsage, isTimeHabit, pastMeals, mealLabel, dayLabel, clockGap, pastMealsHTML} from '../meal-rank.js';
import {newReg, setUnit, toPreset, applySimilar, similarFoods, parseLabel, applyLabel, regHTML, macroCheck} from '../food-register.js';
import {shiftWhen, hourChips, applyWhen, mealWhenChooserHTML, mealWhenBarHTML} from '../meal-when.js';
import {quickMealState, rowTotals, convertQty, unitChoices, readQuickMeal, applyQuickMeal, quickMealHTML as qeHTML} from '../quick-edit.js';
import {emptyQuickMeal, quickMealHTML} from '../quick-entry.js';

const D = '2026-11-24';
const at = (d, hm) => new Date(`${d}T${hm}:00`).toISOString();
const meal = (d, hm, name, extra = {}) => ({id: `${d}-${hm}-${name}`, date: d, loggedAt: at(d, hm), name, servingQty: 1, servingUnit: '개', calories: 100, mealGroupId: `${d}-${hm}`, ...extra});
const daysAgo = n => { const x = new Date(`${D}T12:00:00`); x.setDate(x.getDate() - n); return x.toISOString().slice(0, 10); };

test('자주·이 시간대 순: 아침에 열면 아침에 먹던 것이 위로', () => {
 const meals = [];
 for (let i = 1; i <= 5; i++) meals.push(meal(daysAgo(i), '08:10', '그릭요거트'));
 for (let i = 1; i <= 3; i++) meals.push(meal(daysAgo(i), '19:30', '닭가슴살'));
 meals.push(meal(daysAgo(1), '21:00', '라떼'));
 const u8 = foodUsage(meals, D, '08:00'), u19 = foodUsage(meals, D, '19:00');
 const list = [{name: '라떼', servingUnit: '개'}, {name: '닭가슴살', servingUnit: '개'}, {name: '그릭요거트', servingUnit: '개'}, {name: '처음 보는 것', servingUnit: '개'}];
 assert.equal(rankByUsage(list, u8)[0].name, '그릭요거트');
 assert.equal(rankByUsage(list, u19)[0].name, '닭가슴살');
 assert.equal(rankByUsage(list, u8).at(-1).name, '처음 보는 것', '기록 없는 건 뒤로');
 assert.ok(isTimeHabit(u8.get('그릭요거트|개')));
 assert.ok(!isTimeHabit(u8.get('라떼|개')));
 assert.equal(clockGap(23*60 + 30, 30), 60);
});

test('지난 식사 그대로: 어제 하나가 아니라 며칠 치, 지금 시각에 가까운 끼니 먼저', () => {
 const meals = [meal(daysAgo(1), '12:10', '비빔밥'), meal(daysAgo(2), '12:30', '김밥'), meal(daysAgo(3), '19:00', '된장찌개'), meal(daysAgo(3), '19:00', '쌀밥'), meal(daysAgo(1), '08:00', '그릭요거트'), meal(D, '07:00', '오늘 것'), meal(daysAgo(9), '12:00', '오래된 것')];
 const list = pastMeals(meals, D, '12:00');
 assert.equal(list.length, 4, '오늘·7일 넘은 것 제외');
 assert.deepEqual(list.slice(0, 2).map(g => g.label), ['어제 점심', '2일 전 점심']);
 assert.equal(list.find(g => g.items.length === 2).label, '3일 전 저녁');
 assert.equal(mealLabel(at(D, '22:00')), '야식');
 assert.equal(dayLabel(daysAgo(10), D), `${Number(daysAgo(10).slice(5, 7))}/${Number(daysAgo(10).slice(8, 10))}`);
 const html = pastMealsHTML({meals}, {date: D, time: '12:00'});
 assert.match(html, /qa-chip/); assert.match(html, /된장찌개 외 1/);
});

test('새 음식 등록: 1팩당 값은 1팩 그대로, 100g당 값은 1팩 무게로 환산', () => {
 const r = newReg('우리집 그래놀라'); r.vals = {calories: 177, carbs: 5, protein: 21, fat: 8};
 assert.deepEqual(toPreset(r).preset, {name: '우리집 그래놀라', servingUnit: '팩', source: 'manual', calories: 177, carbs: 5, protein: 21, fat: 8});
 r.basis = '100'; assert.match(toPreset(r).error, /몇 g/);
 r.unitGrams = '50'; assert.equal(toPreset(r).preset.calories, 88.5); assert.equal(toPreset(r).preset.unitGrams, 50);
 r.basis = 'serving'; r.servingG = '25'; assert.equal(toPreset(r).preset.calories, 354);
 setUnit(r, 'g'); assert.equal(r.basis, 'serving'); r.servingG = '50'; assert.equal(toPreset(r).preset.calories, 354, '50g당 177 → 100g당 354');
 const e = newReg('x'); assert.match(toPreset(e).error, /하나는/);
 assert.match(toPreset(newReg('')).error, /이름/);
 assert.match(macroCheck({calories: 100, carbs: 50, protein: 20, fat: 10}), /확인/);
 assert.equal(macroCheck({calories: 177, carbs: 5, protein: 21, fat: 8}), '');
});

test('비슷한 음식: 이름 앞 단어를 떼며 찾고, 추정으로 표시', () => {
 const db = [{id: 'a', name: '그래놀라 · 브랜드', servingUnit: 'g', calories: 450, carbs: 60, protein: 10, fat: 18}, {id: 'b', name: '오트 그래놀라바', servingUnit: '개', unitGrams: 40, calories: 180, carbs: 24, protein: 4, fat: 7}];
 const search = q => db.filter(x => x.name.includes(q.split(' ').at(-1)) && (q === '그래놀라' || q.split(' ').length === 1));
 const found = similarFoods('우리집 수제 그래놀라', search);
 assert.ok(found.length >= 1);
 const r = newReg('우리집 수제 그래놀라'); r.unitGrams = '50'; applySimilar(r, db[0]);
 assert.equal(r.basis, 'unit'); assert.equal(r.vals.calories, 225); assert.equal(r.source, 'similar');
 const p = toPreset(r).preset; assert.equal(p.aiEstimate.estimated, true); assert.equal(p.source, '비슷한 음식 추정');
 const r2 = newReg('바'); applySimilar(r2, db[1]); assert.equal(r2.unitGrams, '40'); assert.equal(r2.vals.calories, 180);
});

test('영양성분표 글자 읽기: 값·기준·내용량, 포화지방을 지방으로 잘못 읽지 않음', () => {
 const t = '영양정보 총 내용량 100g 177kcal\n총 내용량당 1일 영양성분 기준치에 대한 비율\n나트륨 307mg 15%\n탄수화물 5g 2%\n당류 2g\n지방 8g 15%\n트랜스지방 0g\n포화지방 2.5g 17%\n콜레스테롤 85mg\n단백질 21g 38%';
 const p = parseLabel(t);
 assert.deepEqual(p.vals, {calories: 177, carbs: 5, sugar: 2, protein: 21, fat: 8, satFat: 2.5, sodium: 307});
 assert.equal(p.basis, 'package'); assert.equal(p.total, 100);
 const r = newReg('닭다리살'); applyLabel(r, p); assert.equal(r.basis, 'unit'); assert.equal(r.unitGrams, '100'); assert.equal(toPreset(r).preset.calories, 177);
 const q = parseLabel('100g당 열량 380 kcal 탄수화물 60g 단백질 8g 지방 12g 총 내용량 300g');
 assert.equal(q.basis, '100'); const r3 = newReg('과자'); setUnit(r3, '봉'); applyLabel(r3, q); assert.equal(toPreset(r3).preset.calories, 1140);
 assert.equal(parseLabel('글자 없음').count, 0);
});

test('등록 화면 3단계가 그려진다', () => {
 const r = newReg('그래놀라');
 assert.match(regHTML(r), /어떻게 먹었나요/);
 r.step = 2; assert.match(regHTML(r, {similar: []}), /비슷한 음식에서/); assert.match(regHTML(r), /값의 기준/);
 r.vals = {calories: 100}; r.step = 3; assert.match(regHTML(r), /이 식사에 담기/); assert.match(regHTML(r), /반팩/);
 assert.match(regHTML({...newReg('<b>'), step: 1}), /&lt;b&gt;/);
});

test('식사 시작 선택: 방금·전에·미리, 시각 칩과 옮기기', () => {
 const now = new Date(`${D}T16:06:00`);
 const s = {date: D, time: '16:06', rows: []};
 applyWhen(s, 'past', now); assert.equal(s.time, '15:00');
 applyWhen(s, 'plan', now); assert.equal(s.time, '17:00');
 applyWhen(s, 'now', now); assert.equal(s.time, '16:06');
 assert.ok(hourChips('past', D, now).every(h => h <= '16:06')); assert.equal(hourChips('plan', D, now)[0], '16:00', '2026-11-28 지금 시도 남은 10분 칸이 있으면'); assert.ok(hourChips('plan', D, now).slice(1).every(h => h > '16:06'));
 assert.equal(hourChips('past', daysAgo(1), now).length, 18, '어제는 전부');
 assert.deepEqual(shiftWhen(D, '00:20', -30), {date: daysAgo(1), time: '23:50'});
 assert.match(mealWhenChooserHTML(), /먹을 것 미리/);
 assert.match(mealWhenBarHTML({...s, when: 'now'}, now), /정각 16:00/);
 assert.match(mealWhenBarHTML({date: D, time: '18:00', when: 'plan'}, now), /예정 포함/);
 const fresh = emptyQuickMeal(new Date().toLocaleString('sv-SE').slice(0, 10), '12:00');
 assert.equal(fresh.when, null);
 assert.match(quickMealHTML({meals: [], foods: [], settings: {}}, fresh), /먹을 것 미리/);
 assert.equal(emptyQuickMeal(daysAgo(3), '12:00').when, 'past');
});

test('식사 수정 단위: 무게를 아는 단위만, 바꾸면 양도 환산', () => {
 const db = {meals: [{id: 'a', date: D, mealGroupId: 'g', loggedAt: at(D, '15:00'), name: '킹닭 닭다리살', servingQty: 2, servingUnit: '팩', unitGrams: 100, calories: 354, carbs: 10, protein: 42, fat: 16}, {id: 'b', date: D, mealGroupId: 'g', loggedAt: at(D, '15:00'), name: '콩 현미밥', servingQty: 1, servingUnit: '개', calories: 165, carbs: 34, protein: 5, fat: 1}, {id: 'c', date: D, mealGroupId: 'g', loggedAt: at(D, '15:00'), name: '그릭요거트', servingQty: 150, servingUnit: 'g', calories: 146}], foods: [{id: 'f', name: '그릭요거트', servingUnit: '컵', unitGrams: 150, calories: 146}]};
 const st = quickMealState(db, D, 'g');
 assert.deepEqual(unitChoices(st.rows[0]), ['팩', 'g']);
 assert.deepEqual(unitChoices(st.rows[1]), ['개'], '무게 모르면 바꿀 수 없음');
 assert.deepEqual(unitChoices(st.rows[2]), ['g', '컵'], '같은 이름 내 음식의 단위 무게로');
 const html = qeHTML(st); assert.doesNotMatch(html, /<option value="병"/); assert.match(html, /qe-unit-fixed/);
 assert.equal(convertQty(st.rows[0], 2, '팩', 'g'), 200);
 const root = {querySelector: sel => ({'#qm-unit-0': {value: 'g'}, '#qm-qty-0': {value: '2'}})[sel] || null};
 readQuickMeal(st, root); assert.equal(st.rows[0].unit, 'g'); assert.equal(st.rows[0].qty, 200);
 assert.equal(rowTotals(st.rows[0]).calories, 354, '같은 양이면 값 그대로');
 st.rows[0].qty = 100; assert.equal(rowTotals(st.rows[0]).calories, 177, '환산 뒤 양을 줄이면 값도 비율로');
 const out = applyQuickMeal(db, st); assert.deepEqual(out.foods, db.foods, '환산은 내 음식을 바꾸지 않음');
 const m = out.meals.find(x => x.id === 'a'); assert.equal(m.servingUnit, 'g'); assert.equal(m.servingQty, 100);
});

test('예전 휴식 알약 함수 호출이 남아 있지 않다(4.25.0 시작 때 멈춤 원인)', async () => {
 const fs = await import('node:fs');
 for (const f of ['app.js', 'app-actions.js', 'app-pages.js', 'app-modals.js']) {
  const s = fs.readFileSync(new URL(`../${f}`, import.meta.url), 'utf8');
  assert.doesNotMatch(s, /updateRestTimer|startRestTimer|stopRestTimer/, f);
 }
});
