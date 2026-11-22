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
import {QUESTIONS,onboardingMove,newOnboarding} from '../prefs.js';
import {quickMealHTML,emptyQuickMeal} from '../quick-entry.js';
import {macroMiniHTML} from '../nutrition-goals.js';
test('4.7.0 식단을 안 하면 식단 질문은 건너뛰고, GLP-1이면 고단백 탭·홈 단백질 먼저',()=>{
 const st=newOnboarding({settings:{}});st.answers.tracks=['workout'];const i=QUESTIONS.findIndex(q=>q.key==='mealMode');st.step=i-1;onboardingMove(st,1);assert.ok(!['mealMode','mealLabel','glp1'].includes(QUESTIONS[st.step].key));
 const db={settings:{preferences:{glp1:true},proteinGoal:100},foods:[{name:'닭가슴살',servingQty:100,servingUnit:'g',calories:110,protein:23},{name:'밥',servingQty:100,servingUnit:'g',calories:150,protein:3}],meals:[]};
 const s=emptyQuickMeal('2026-11-22','12:00');s.tab='protein';const h=quickMealHTML(db,s);assert.match(h,/고단백/);assert.match(h,/닭가슴살/);assert.doesNotMatch(h.slice(h.indexOf('quick-choices')),/data-q-food="밥/);
 assert.match(macroMiniHTML({protein:40},{proteinGoal:100},{proteinFirst:true}),/단백질 40\/100g/);
});
import {readTrash,toTrash,takeFromTrash,restoreInto} from '../trash.js';
import {weekDays} from '../timeline-view.js';
test('4.7.0 휴지통: 30일 보관·묶음 되살리기·이미 있으면 건너뜀, 이번 주 n일',()=>{
 const mem=new Map();globalThis.localStorage={getItem:k=>mem.get(k)??null,setItem:(k,v)=>mem.set(k,v)};
 const g=toTrash('t','meals',[{id:'a',date:'2026-11-22',name:'밥'},{id:'b',date:'2026-11-22',name:'국'}]);
 toTrash('t','meals',[{id:'old'}],Date.now()-31*86400000);
 assert.equal(readTrash('t').length,1,'30일 지난 것은 안 보임');
 const it=takeFromTrash('t',g);const r=restoreInto({meals:[{id:'a'}]},it);assert.equal(r.count,1);assert.equal(r.db.meals.length,2);
 assert.equal(readTrash('t').length,0);delete globalThis.localStorage;
 assert.equal(weekDays({meals:[{date:'2026-11-17'},{date:'2026-11-19'},{date:'2026-11-19'},{date:'2026-11-16',planned:true}],body:[{date:'2026-11-22'}]},'2026-11-22'),3);
});
import {gymKeyOf,newGymPicker,gymPickerHTML,gymChanges,gymRequests,parseGymRequest,newModel} from '../gym-machines.js';
import {brandMachinesAt,BUILTIN_BRANDS} from '../machines-catalog.js';
import {machineChoices} from '../suggest-ui.js';
test('4.7.0 헬스장 머신: 지도 장소는 장소 ID로, 일반·제조사·새 모델 등록, 요청 메모로 일괄 승인, 운동 화면 맨 위',()=>{
 const settings={gyms:['헬스플러스 안산점'],gymPlaces:{'헬스플러스 안산점':{provider:'kakao',providerId:'12345'}}};
 assert.equal(gymKeyOf(settings,'헬스플러스 안산점'),'kakao:12345');assert.equal(gymKeyOf({},'집'),'name:집');
 const st=newGymPicker({},settings,'헬스플러스 안산점');const brand=BUILTIN_BRANDS.find(b=>b.baseId==='gm:leg-press-45');
 st.checked.add('gm:leg-press-45');st.checked.add(brand.id);
 assert.match(gymPickerHTML({...st,part:'하체'},{},{admin:true}),/data-gm-pick="gm:leg-press-45" checked/);
 const {add}=gymChanges(st,{});assert.equal(add.length,2);assert.equal(add[0].gymKey,'kakao:12345');
 const shared={gymMachines:add};
 const ex='exercise:레그 프레스';const at=brandMachinesAt(shared,'다른 이름으로 적음',ex,'kakao:12345');assert.equal(at.length,2,'이름이 달라도 장소 ID가 같으면 보임');
 const ch=machineChoices(ex,{db:{settings},shared,gymName:'헬스플러스 안산점',gymKey:'kakao:12345'});assert.equal(ch[0].tag,'이 헬스장');
 const removed=gymChanges({...st,initial:new Set(st.checked),checked:new Set(['gm:leg-press-45'])},shared).remove;assert.equal(removed.length,1);assert.equal(removed[0].removed,true);
 const m=newModel('해머스트렝스','Plate-Loaded Leg Press X','gm:leg-press-45');assert.match(m.id,/^mm:/);
 const reqs=gymRequests({...st,initial:new Set(),checked:new Set([m.id])},{machineModels:[m]});assert.equal(reqs.length,1);assert.deepEqual(parseGymRequest(reqs[0].note),{modelId:m.id,gymKey:'kakao:12345',baseId:'gm:leg-press-45',spec:null});
});
import {gymCounts,makerCounts} from '../gym-machines.js';
test('4.7.0 헬스장 머신: 제조사 모델은 등록한 헬스장이 많은 순',()=>{
 const bs=BUILTIN_BRANDS.filter(b=>b.baseId==='gm:leg-press-45');const [a,b]=[bs[0],bs[1]];
 const shared={gymMachines:[{gymKey:'k1',modelId:b.id},{gymKey:'k2',modelId:b.id},{gymKey:'k3',modelId:a.id},{gymKey:'k2',modelId:b.id}]};
 assert.equal(gymCounts(shared).get(b.id),2,'같은 헬스장 중복은 한 번');
 const st=newGymPicker({},{},'집');st.part='하체';st.open['gm:leg-press-45']=true;const html=gymPickerHTML(st,shared);
 assert.ok(html.indexOf(`data-gm-pick="${b.id}"`)<html.indexOf(`data-gm-pick="${a.id}"`),'2곳 모델이 1곳 모델보다 위');
 assert.equal(makerCounts(shared)[0].name,b.manufacturer);
});
import {specOptions,specMissing,pickMachine,setSpec} from '../gym-machines.js';
import {findMachine} from '../quick-entry.js';
import {setWeightKg,cleanWorkout} from '../domain.js';
test('4.7.0 헬스장 머신 방식: 종류마다 가능한 것만, 다 고르기 전엔 저장 불가, 운동 기록에 반영, 숫자 단계는 볼륨 제외',()=>{
 assert.deepEqual(specOptions('cable').load,['cable']);assert.deepEqual(specOptions('plate','plate').unit,['kg','lb']);assert.deepEqual(specOptions('smith').unit,['kg','lb']);
 const st=newGymPicker({},{},'집');pickMachine(st,{},'gm:leg-press-45',true);assert.equal(specMissing(st),1,'원판·핀, 좌우, 단위를 아직 안 고름');
 assert.match(gymPickerHTML({...st,part:'하체'},{},{admin:true}),/id="gm-save" disabled/);
 setSpec(st,'gm:leg-press-45','load','stack');setSpec(st,'gm:leg-press-45','sided','iso');setSpec(st,'gm:leg-press-45','unit','level');assert.equal(specMissing(st),0);
 setSpec(st,'gm:leg-press-45','load','plate');assert.equal(st.spec['gm:leg-press-45'].unit,undefined,'원판식은 숫자 단계 불가');
 setSpec(st,'gm:leg-press-45','unit','lb');const shared={gymMachines:gymChanges(st,{}).add};
 const m=findMachine({settings:{}},shared,'gm:leg-press-45',{gymName:'집'});assert.equal(m.load,'plate');assert.equal(m.unit,'lb');assert.equal(m.sided,'iso');
 assert.equal(setWeightKg({weight:7,unit:'level',reps:10}),0);
 const w=cleanWorkout({date:'2026-11-22',exercises:[{name:'레그 프레스',sets:[{weight:7,unit:'level',reps:10}]}]});assert.equal(w.exercises[0].sets[0].unit,'level');
});
