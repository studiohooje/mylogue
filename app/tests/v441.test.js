import test from 'node:test';import assert from 'node:assert/strict';
import {normalizeUnit,unitFactor,cleanMeal,dietState} from '../domain.js';
import {toFoodPreset} from '../nutrition.js';
import {rowTotals,applyQuickMeal} from '../quick-edit.js';
import {foodIssue} from '../food-check.js';
import {mealFormHTML} from '../ui-helpers.js';
import {reminderItems} from '../reminders.js';

test('점검 D-1·D-3: ml 음식도 100당으로 되돌리고 그대로 저장해도 값이 같다',()=>{
 const milk={name:'우유',servingQty:200,servingUnit:'ml',calories:130,carbs:10,protein:6,fat:7};
 assert.equal(toFoodPreset(milk).calories,65);
 const h=mealFormHTML({meal:{...milk,date:'2026-11-22',slot:'식사'},date:'2026-11-22'});
 assert.match(h,/name="calories" type="number" min="0" step="0.1" value="65"/);
 assert.match(h,/<option selected>식사<\/option>/,'끼니가 아침으로 바뀌지 않음');
 assert.equal(unitFactor(200,'ml'),2);
});
test('점검 C-16: L·kg·cc는 저장할 때 ml·g로',()=>{
 assert.deepEqual(normalizeUnit(1.5,'L'),{qty:1500,unit:'ml'});assert.deepEqual(normalizeUnit(0.2,'kg'),{qty:200,unit:'g'});assert.deepEqual(normalizeUnit(30,'cc'),{qty:30,unit:'ml'});
 const m=cleanMeal({date:'2026-11-22',name:'물',servingQty:0.5,servingUnit:'L',calories:0});assert.equal(m.servingUnit,'ml');assert.equal(m.servingQty,500);
});
test('점검 D-2: 단위를 바꾸면 영양값은 그대로, 내 음식은 새 단위 기준 값으로',()=>{
 const row={id:'m1',name:'현미밥',unit:'공기',origUnit:'g',qty:1,base:{qty:210,calories:300,carbs:60,protein:6,fat:2}};
 assert.equal(rowTotals(row).calories,300);
 const db={meals:[{id:'m1',date:'2026-11-22',name:'현미밥',servingQty:210,servingUnit:'g',calories:300,carbs:60,protein:6,fat:2,loggedAt:'2026-11-22T03:00:00.000Z'}],foods:[{name:'현미밥',servingUnit:'g',calories:143,carbs:29,protein:3,fat:1}]};
 const out=applyQuickMeal(db,{newDate:'2026-11-22',slot:'식사',time:'12:00',rows:[row]});
 assert.equal(out.meals[0].calories,300);assert.equal(out.meals[0].servingUnit,'공기');
 assert.equal(out.foods.length,1);assert.equal(out.foods[0].servingUnit,'공기');assert.equal(out.foods[0].calories,300);
});
test('점검 C-6: 기름·버터 소량은 정상, 1mL 40kcal는 이상',()=>{
 assert.equal(foodIssue({servingQty:5,servingUnit:'g',calories:44}),null);
 assert.equal(foodIssue({servingQty:1,servingUnit:'mL',calories:40})?.code,'tiny');
});
test('점검 C-9: 식사를 다 지운 날은 미기록',()=>{assert.equal(dietState({meals:[],dayStates:{'2026-11-22':'partial'}},'2026-11-22'),'unrecorded')});
test('점검 C-2: 첫 인바디 알림은 체중을 기록하는 사람에게만, 날짜 없는 키로 한 번',()=>{
 assert.equal(reminderItems({body:[],settings:{}},'2026-11-22').length,0);
 const r=reminderItems({body:[{date:'2026-11-22',weight:80}],settings:{}},'2026-11-22');assert.equal(r.length,1);assert.equal(r[0].key,'remind:inbody-first');
});
