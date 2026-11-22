import test from 'node:test';import assert from 'node:assert/strict';
import {mealNames,SLOT_OF} from '../timeline-view.js';
import {todayLine,timeSlot,savedLine,emptyLine,SOURCES} from '../motivation.js';
const at=h=>new Date(`2026-11-22T${h}:00`).toISOString();
test('4.6.0 끼니 부르는 법: 번호 또는 시각 이름(같은 이름은 2부터 번호)',()=>{
 const g=['07:00','09:10','12:30','15:00','18:20','23:00'].map((h,i)=>({key:'k'+i,at:at(h)}));
 assert.deepEqual([...mealNames(g,'number').values()],['식사1','식사2','식사3','식사4','식사5','식사6']);
 assert.deepEqual([...mealNames(g,'slot').values()],['아침','아침 2','점심','간식','저녁','야식']);
 assert.equal(SLOT_OF(at('03:00')),'야식');
});
test('4.6.0 동기부여 문구: 시간대·근거·첫 기록·빈 자리',()=>{
 assert.equal(timeSlot(new Date('2026-11-22T07:00:00')),'아침');assert.equal(timeSlot(new Date('2026-11-22T23:00:00')),'밤');
 const l=todayLine(new Date('2026-11-22T19:00:00'));assert.ok(l.text.length>5);if(l.src)assert.ok(SOURCES[l.src]);
 assert.equal(savedLine({meals:[{date:'2026-11-22'}]}),'첫 기록이에요. 시작이 제일 어려워요.');
 assert.ok(!/범스테드|Bumstead|살 빠/.test(emptyLine('meal')+l.text),'유명인 이름·과장 금지');
 assert.ok(emptyLine('body').length>3);
});
import {glp1Macros,refWeight,dietNotes,applyGoalWizard} from '../nutrition-plan.js';
import {renderFoodPage} from '../food-view.js';
test('4.7.0 GLP-1: 단백질은 기준 체중 × 1.4~1.6g, 비만이면 보정 체중, 실제 체중 2g/kg 넘지 않음',()=>{
 const f={sex:'female',age:40,heightCm:160,weightKg:90,activity:'light',goal:'lose',diets:['glp1']};
 assert.equal(refWeight(f),69.8);const g=glp1Macros(f,1500);assert.equal(g.proteinG,105);assert.equal(g.p+g.c+g.f,100);
 const lean={...f,weightKg:55};assert.equal(refWeight(lean),55);assert.equal(glp1Macros(lean,1300).proteinG,85);
 assert.ok(dietNotes(f).some(x=>/보정 체중/.test(x)));
 const db={settings:{},body:[]};const out=applyGoalWizard(db,{profile:f,kcal:1500,preset:'glp1',custom:{on:false}});assert.equal(out.settings.proteinPctGoal,28);
});
