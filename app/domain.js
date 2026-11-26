import {EXERCISE_CATALOG,findExercise,inferTargets} from './catalog.js';
import {cleanGymPlaces} from './places.js';
import {cleanMoves} from './pilates.js';
export const VERSION=1;
export const uid=()=>globalThis.crypto?.randomUUID?.()??`id-${Date.now()}-${Math.random().toString(36).slice(2)}`;
export const number=(v)=>{if(v===null||v===undefined||String(v).trim()==='')return null;const n=Number(v);return Number.isFinite(n)?n:null};
export const validDate=(s)=>{if(!/^\d{4}-\d{2}-\d{2}$/.test(s))return false;const d=new Date(`${s}T12:00:00`);return !Number.isNaN(d.getTime())&&`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`===s};
export const round=(n,p=1)=>Math.round((n+Number.EPSILON)*10**p)/10**p;
const cleanAIEvidence=raw=>{if(!raw||typeof raw!=='object')return null;const source=String(raw.source||'').slice(0,160),sourceUrl=String(raw.sourceUrl||raw.url||'').slice(0,600),servingBasis=String(raw.servingBasis||'').slice(0,160),note=String(raw.note||'').slice(0,500);return source||sourceUrl||servingBasis||note?{source,sourceUrl,servingBasis,note}:null};
// 4.23.0 체중이 흔들릴 만한 일(선택): 나만의 유지칼로리 계산에서 그날 체중을 덜 믿거나, 몸 상태가 바뀐 날부터 다시 센다
export const BODY_FLAGS=[['period','생리 중'],['salty','짠 음식·회식'],['sick','아픔'],['med','약 용량 바뀜'],['creatine','크레아틴 시작']];
export function cleanBody(raw){const date=String(raw.date??'').trim();if(!validDate(date))throw Error('측정일을 확인해 주세요.');const out={id:raw.id||uid(),date,weight:number(raw.weight),bodyFatPct:number(raw.bodyFatPct),skeletalMuscle:number(raw.skeletalMuscle),waistCm:number(raw.waistCm),bodyFatMass:number(raw.bodyFatMass),bmi:number(raw.bmi),score:number(raw.score),visceralFatLevel:number(raw.visceralFatLevel),bmr:number(raw.bmr),note:String(raw.note??'').trim(),source:String(raw.source??'manual').slice(0,40),...(['scale','inbody'].includes(raw.measure)?{measure:raw.measure}:{}),...(f=>f.length?{flags:f}:{})(BODY_FLAGS.map(x=>x[0]).filter(k=>(Array.isArray(raw.flags)&&raw.flags.includes(k))||raw['wf_'+k]==='on'||raw['wf_'+k]===true)),createdAt:raw.createdAt||raw.updatedAt||new Date().toISOString(),updatedAt:raw.updatedAt||new Date().toISOString()};for(const k of ['weight','bodyFatPct','skeletalMuscle','waistCm','bodyFatMass','bmi','score','visceralFatLevel','bmr'])if(out[k]!==null&&out[k]<0)throw Error(`${k} 값은 음수가 될 수 없습니다.`);/* 4.27.0 전수검사 C-11: 체중 0·7·700kg 같은 오타가 목표·소모 칼로리·페이즈 계산으로 번졌다 */if(out.weight!==null&&(out.weight<20||out.weight>400))throw Error('체중은 20~400kg 사이로 적어 주세요.');if(out.bodyFatPct!==null&&out.bodyFatPct>100)throw Error('체지방률은 100% 이하여야 합니다.');if(out.weight===null&&out.bodyFatPct===null&&out.skeletalMuscle===null&&out.waistCm===null)throw Error('체중, 체지방률, 골격근량, 허리둘레 중 하나를 입력해 주세요.');return out}
export function cleanMeal(raw){
 const date=String(raw.date??'');if(!validDate(date))throw Error('식사 날짜를 확인해 주세요.');
 const name=String(raw.name??'').trim();if(!name)throw Error('음식 이름을 입력해 주세요.');
 const nu=normalizeUnit(number(raw.servingQty)??1,safeUnit(raw.servingUnit||'회')),servingQty=nu.qty,servingUnit=safeUnit(nu.unit);
 if(servingQty<=0||!servingUnit)throw Error('섭취량과 단위를 확인해 주세요.');
 const estimate=raw.aiEstimate&&typeof raw.aiEstimate==='object'?raw.aiEstimate:{};
 const caloriesMin=number(estimate.caloriesMin),caloriesMax=number(estimate.caloriesMax);
 if(caloriesMin!==null&&caloriesMin<0||caloriesMax!==null&&caloriesMax<0||caloriesMin!==null&&caloriesMax!==null&&caloriesMin>caloriesMax)throw Error('추정 칼로리 범위를 확인해 주세요.');
 const aiEstimate={estimated:estimate.estimated===true,caloriesMin,caloriesMax,basis:String(estimate.basis||'').slice(0,160),note:String(estimate.note||'').slice(0,500)};
 for(const key of ['carbs','protein','fat']){const min=number(estimate[`${key}Min`]),max=number(estimate[`${key}Max`]);if(min!==null&&min<0||max!==null&&max<0||min!==null&&max!==null&&min>max)throw Error('추정 탄단지 범위를 확인해 주세요.');aiEstimate[`${key}Min`]=min;aiEstimate[`${key}Max`]=max}
 const out={id:raw.id||uid(),date,...(raw.planned===true?{planned:true}:{}),slot:String(raw.slot||'식사'),mealGroupId:String(raw.mealGroupId||''),loggedAt:String(raw.loggedAt||raw.createdAt||new Date().toISOString()),name,servingQty,servingUnit,...(number(raw.unitGrams)>0&&!MASS.has(servingUnit)?{unitGrams:number(raw.unitGrams)}:{}),source:String(raw.source||'manual').slice(0,40),copyKey:String(raw.copyKey||''),calories:number(raw.calories),carbs:number(raw.carbs),protein:number(raw.protein),fat:number(raw.fat),...microOf(raw),aiEstimate,aiEvidence:cleanAIEvidence(raw.aiEvidence),note:String(raw.note??'').trim(),createdAt:raw.createdAt||raw.updatedAt||new Date().toISOString(),updatedAt:raw.updatedAt||new Date().toISOString()};
 for(const k of ['calories','carbs','protein','fat'])if(out[k]!==null&&out[k]<0)throw Error(`${k} 값은 음수가 될 수 없습니다.`);return out
}
// 4.17.0 미량영양소: 0 이상 숫자만, 없으면 칸 자체를 두지 않음(빈 값은 0이 아님)
export const microOf=raw=>{const o={};for(const k of ['sugar','fiber','satFat','sodium']){const n=number(raw?.[k]);if(n!==null&&n>=0&&n<100000)o[k]=Math.round(n*10)/10}return o};
export function cleanFoodPreset(raw){
 const name=String(raw.name??'').trim(),servingUnit=safeUnit(raw.servingUnit||'회');
 if(!name||!servingUnit)throw Error('음식 이름과 단위를 입력해 주세요.');
 const servingQty=number(raw.servingQty)??1;if(servingQty<=0)throw Error('음식 기준량을 확인해 주세요.');
 const out={id:raw.id||uid(),name,servingQty,servingUnit,...(number(raw.unitGrams)>0&&!MASS.has(servingUnit)?{unitGrams:number(raw.unitGrams)}:{}),source:String(raw.source||'manual').slice(0,40),calories:number(raw.calories),carbs:number(raw.carbs),protein:number(raw.protein),fat:number(raw.fat),...microOf(raw)};
 out.aiEvidence=cleanAIEvidence(raw.aiEvidence);
 if(raw.aiEstimate?.estimated===true){const estimate={estimated:true,basis:String(raw.aiEstimate.basis||'').slice(0,160),note:String(raw.aiEstimate.note||'').slice(0,500)};for(const key of ['calories','carbs','protein','fat']){const min=number(raw.aiEstimate[`${key}Min`]),max=number(raw.aiEstimate[`${key}Max`]);if(min!==null&&min<0||max!==null&&max<0||min!==null&&max!==null&&min>max)throw Error(`추정 ${key} 범위를 확인해 주세요.`);estimate[`${key}Min`]=min;estimate[`${key}Max`]=max}out.aiEstimate=estimate}
 for(const k of ['calories','carbs','protein','fat'])if(out[k]!==null&&out[k]<0)throw Error('영양값은 음수가 될 수 없습니다.');
 if(['calories','carbs','protein','fat'].every(k=>out[k]===null))throw Error('영양값을 하나 이상 입력해 주세요.');
 return out;
}
export function cleanExercise(raw){
 const name=String(raw.name??'').trim();if(!name)throw Error('운동 이름을 입력해 주세요.');
 const kind=raw.kind==='cardio'?'cardio':'strength',durationMin=number(raw.durationMin),distanceKm=number(raw.distanceKm);
 if(durationMin!==null&&durationMin<0||distanceKm!==null&&distanceKm<0)throw Error('유산소 시간과 거리를 확인해 주세요.');
 const w2=v=>v==null?null:Math.round(v*100)/100;// 4.3.1 중량은 소수점 둘째 자리까지(대표님: 18.1436948 같은 값 금지)
 const sets=(raw.sets??[]).map(s=>({id:s.id||uid(),weight:w2(number(s.weight)),unit:s.unit||'kg',originalWeight:w2(number(s.originalWeight??s.weight)),originalUnit:s.originalUnit||s.unit||'kg',targetWeight:w2(number(s.targetWeight)),targetReps:number(s.targetReps),targetUnit:s.targetUnit||s.unit||'kg',reps:number(s.reps),type:String(s.type||'본세트'),rpe:number(s.rpe),completed:s.completed!==false,...(s.done===true?{done:true}:{}),...(number(s.barKg)!==null&&number(s.barKg)>=0?{barKg:number(s.barKg)}:{}),...(number(s.levelKg)!==null&&number(s.levelKg)>=0?{levelKg:number(s.levelKg),...(s.levelEst===true?{levelEst:true}:{})}:{}),/* 4.21.0 방식(한쪽씩)·이 세트 전에 쉰 초 */...(s.side==='single'||s.side==='both'?{side:s.side}:{}),...(number(s.restSec)!==null&&number(s.restSec)>0&&number(s.restSec)<36000?{restSec:Math.round(number(s.restSec))}:{}),completedAt:String(s.completedAt||'')}));
 if(kind==='strength'&&!sets.length)throw Error('세트를 하나 이상 입력해 주세요.');
 for(const s of sets){if(s.originalWeight===null||s.originalWeight<0||!UNITS.includes(s.originalUnit))throw Error('원래 중량과 단위를 확인해 주세요.');if(!UNITS.includes(s.targetUnit)||s.targetWeight!==null&&s.targetWeight<0||s.targetReps!==null&&(s.targetReps<0||!Number.isInteger(s.targetReps)))throw Error('목표 중량·반복·단위를 확인해 주세요.');if(!UNITS.includes(s.unit))throw Error('중량 단위는 kg·lb·숫자 단계 중 하나여야 합니다.');if(s.weight===null||s.reps===null||s.weight<0||s.reps<0||!Number.isInteger(s.reps))throw Error('중량과 반복 횟수를 확인해 주세요.');if(s.rpe!==null&&(s.rpe<0||s.rpe>10))throw Error('RPE는 0~10 사이여야 합니다.')}
 const moves=kind==='cardio'?cleanMoves(raw.moves):[];
 if(kind==='cardio'&&durationMin===null&&distanceKm===null&&!moves.length)throw Error('유산소 시간 또는 거리를 입력해 주세요.');
 const known=EXERCISE_CATALOG.find(x=>x.id===raw.exerciseId)||EXERCISE_CATALOG.find(x=>x.name===name)||findExercise(name);
 const weightBasis=raw.weightBasis==='per-hand'?'per-hand':'total';
 const handCount=weightBasis==='per-hand'&&(raw.handCount===2||raw.loadCount===2)?2:weightBasis==='per-hand'?1:0;
 const repBasis=raw.repBasis==='per-side'?'per-side':'total';
 const effort=number(raw.effort),avgHr=number(raw.avgHr);if(effort!==null&&(effort<1||effort>10))throw Error('느낀 강도는 1~10 사이로 적어 주세요.');if(avgHr!==null&&(avgHr<30||avgHr>250))throw Error('평균 심박을 확인해 주세요.');
 const timed=kind==='cardio'?{effort,avgHr,sessionType:['개인','듀엣','트리오','그룹'].includes(raw.sessionType)?raw.sessionType:'',note:String(raw.note??'').trim().slice(0,300),completedAt:String(raw.completedAt||''),...(moves.length?{moves}:{})}:{};
 return {id:raw.id||uid(),name,exerciseId:String(raw.exerciseId||known?.id||'')||null,machineId:String(raw.machineId||'')||null,...exerciseTargets(raw,name,known),anatomyMapVersion:1,part:String(raw.part||known?.part||'기타'),kind,weightBasis,handCount,repBasis,durationMin,distanceKm,...timed,supersetGroup:String(raw.supersetGroup||'').trim()||null,sets}
}
function workoutLoggedAt(raw,date){const t=String(raw.loggedAtTime||'').trim();if(/^\d{2}:\d{2}$/.test(t)){const d=new Date(`${date}T${t}:00`);if(!Number.isNaN(d.getTime()))return d.toISOString()}const v=String(raw.loggedAt||'');if(v&&!Number.isNaN(new Date(v).getTime())){if(raw.loggedAtTime===undefined&&!v.startsWith(date)){const o=new Date(v),d=new Date(`${date}T${String(o.getHours()).padStart(2,'0')}:${String(o.getMinutes()).padStart(2,'0')}:00`);return d.toISOString()}return v}return ''}
// 3.18.0 rest:true = 의도적 휴식(종목 없이 저장, 헤일로에서는 운동을 채운 날로 본다)
export function cleanWorkout(raw){const date=String(raw.date??'');if(!validDate(date))throw Error('운동 날짜를 확인해 주세요.');const rest=raw.rest===true,recalled=raw.recalled===true;const exercises=rest?[]:(raw.exercises??[]).map(cleanExercise);if(!rest&&!recalled&&raw.planned!==true&&!exercises.length)throw Error('운동 종목을 하나 이상 입력해 주세요.');const duration=number(raw.duration);if(duration!==null&&duration<0)throw Error('운동 시간은 음수가 될 수 없습니다.');const condition=number(raw.condition);if(condition!==null&&(condition<1||condition>5))throw Error('컨디션은 1~5 사이여야 합니다.');return {id:raw.id||uid(),sourceDraftId:String(raw.sourceDraftId||''),date,...(rest?{rest:true}:{}),...(recalled&&!rest?{recalled:true}:{}),...(raw.planned===true?{planned:true}:{}),title:String(raw.title||(rest?'의도적 휴식':'오늘의 운동')).trim(),gymName:String(raw.gymName||'').trim(),/* 4.19.0 오늘 할 운동(큰 종류·부위·기구) */...(Array.isArray(raw.targets)&&raw.targets.length?{targets:[...new Set(raw.targets.map(x=>String(x).trim().slice(0,30)).filter(Boolean))].slice(0,20)}:{}),duration,condition,exercises,note:String(raw.note??'').trim(),loggedAt:workoutLoggedAt(raw,date),/* 4.27.0 전수검사 DAT-07: 헬스 연동 걷기의 출처·걸음 수를 남겨야 다시 가져올 때 같은 날을 알아본다(지워지면 중복으로 들어왔다) */...(raw.source==='health'?{source:'health'}:{}),...(Number(raw.healthSteps)>0?{healthSteps:Math.round(Number(raw.healthSteps))}:{}),createdAt:raw.createdAt||raw.updatedAt||new Date().toISOString(),updatedAt:raw.updatedAt||new Date().toISOString()}}
// 4.3.0 무게·부피 단위(g·ml)는 영양값을 100당으로 본다. 그 밖의 단위(개·팩·스쿱…)는 1단위당.
export const MASS=new Set(['g','ml','mL']);
// 4.4.1 점검 C-16: 100당/1단위당 판단은 이 두 함수로만. L·kg·cc·대문자는 저장할 때 g·ml로 바꾼다.
export const unitFactor=(qty,unit)=>MASS.has(unit)?(Number(qty)||0)/100:(Number(qty)||0);
// 4.11.0 점검 R-11: 식사 단위 목록은 여기 하나만 둔다(상세 입력·식사 수정이 같은 목록을 쓴다)
// 4.17.0 보안: 단위는 화면에 그대로 찍히므로 HTML 특수문자를 빼고 16자로 자른다(DB 단위가 다양해 목록 제한 대신).
export const safeUnit=u=>String(u??'').replace(/[<>"'&`=\\]/g,'').replace(/\s+/g,' ').trim().slice(0,16);
export const MEAL_UNITS=['g','ml','개','회','인분','공기','그릇','컵','잔','팩','봉','캔','병','조각','큰술','작은술','스쿱'];
export function normalizeUnit(qty,unit){const u=String(unit||'').trim(),q=Number(qty);if(/^(l|ℓ|리터)$/i.test(u))return {qty:Math.round(q*1000*100)/100,unit:'ml'};if(/^(kg|킬로그램)$/i.test(u))return {qty:Math.round(q*1000*100)/100,unit:'g'};if(/^(ml|cc|밀리리터)$/i.test(u))return {qty:q,unit:'ml'};if(/^(g|그램)$/i.test(u))return {qty:q,unit:'g'};if(/^(mg|밀리그램)$/i.test(u))return {qty:Math.round(q/1000*1000)/1000,unit:'g'};if(/^(oz|온스)$/i.test(u))return {qty:Math.round(q*28.35*10)/10,unit:'g'};return {qty:q,unit:u}}
export const unitLabel=(qty,unit,unitGrams)=>`${qty??''}${unit||''}${unitGrams&&!MASS.has(unit)?`(${Math.round(unitGrams*Number(qty||1))}${unit==='병'||unit==='캔'||unit==='잔'?'ml':'g'})`:''}`;
export const macroCalories=(m)=>({carbs:(m.carbs||0)*4,protein:(m.protein||0)*4,fat:(m.fat||0)*9});
export function mealTotals(meals){const t={calories:0,carbs:0,protein:0,fat:0};let missing=0;for(const m of meals){for(const k of Object.keys(t))t[k]+=m[k]||0;/* 4.28.0 F-06 */if(Number(m.calories)>0&&(m.carbs==null||m.fat==null||m.protein==null))missing++}const e=macroCalories(t),sum=e.carbs+e.protein+e.fat,cp=sum?round(e.carbs/sum*100):0,pp=sum?round(e.protein/sum*100):0;return {...Object.fromEntries(Object.entries(t).map(([k,v])=>[k,round(v)])),percent:{carbs:cp,protein:pp,fat:sum?round(100-cp-pp):0},missingMacros:missing}}
export const estimate1RM=(weight,reps)=>reps>0?round(weight*(1+Math.min(reps,30)/30)):0;
// 4.24.0 볼륨 규칙 하나(모든 화면이 같은 숫자): 한 손 기준·양손이면 ×2, 한쪽 횟수 기준이면 ×2,
// '한쪽씩'(side:single) 세트는 양쪽을 다 했다고 보고 ×2 — 종목이 이미 한쪽 기준이면 두 번 곱하지 않는다.
export function volumeFactor(ex={},s={}){const base=(ex.weightBasis==='per-hand'&&ex.handCount===2?2:1)*(ex.repBasis==='per-side'?2:1);return base===1&&s.side==='single'?2:base}
/* 5.1.0 웜업 세트는 볼륨·최고 기록·성장에서 뺀다 */export const setVolume=(ex,s)=>s?.type==='웜업'?0:setWeightKg(s)*(s.reps||0)*volumeFactor(ex,s);
export const setReps=(ex={},s={})=>(s.reps||0)*(ex.repBasis==='per-side'||((ex.weightBasis!=='per-hand'||ex.handCount!==2)&&ex.repBasis!=='per-side'&&s.side==='single')?2:1);
export function workoutTotals(w){let volume=0,reps=0,sets=0,best1RM=0,cardioMinutes=0,distanceKm=0;const parts={};for(const ex of w.exercises||[]){if(ex.kind==='cardio'){cardioMinutes+=ex.durationMin||0;distanceKm+=ex.distanceKm||0;continue}for(const s of ex.sets||[]){if(s.completed===false)continue;const v=setVolume(ex,s);volume+=v;reps+=setReps(ex,s);sets++;if(s.type!=='웜업')best1RM=Math.max(best1RM,estimate1RM(setWeightKg(s),s.reps||0));parts[ex.part]=(parts[ex.part]||0)+v}}return {volume:round(volume),reps,sets,exercises:w.exercises?.length||0,best1RM,parts,cardioMinutes:round(cardioMinutes),distanceKm:round(distanceKm,2)}}
export const emptyDB=()=>({schemaVersion:VERSION,body:[],meals:[],foods:[],workouts:[],routines:[],machines:[],customExercises:[],favorites:[],recipes:[],dayStates:{},checkins:{},settings:{calorieGoal:2200,carbsGoal:250,proteinGoal:150,fatGoal:70,barbellWeightKg:20,workoutTitles:[],gyms:[]}});
export const LB_TO_KG=0.45359237;
// 4.7.0 무게 표시: kg·lb, 그리고 'level' = 머신에 kg 없이 숫자(핀 번호·단계)만 적힌 경우. 단계는 kg로 바꿀 수 없어 볼륨·1RM에서 뺀다.
export const UNITS=['kg','lb','level'];
export const unitText=u=>u==='level'?'단계':['kg','lb'].includes(u)?u:'kg';/* 4.27.0 S-01: 목록 밖 단위 글자는 화면에 그대로 내보내지 않음 */
export const setWeightKg=s=>{
 if((s?.unit||'kg')==='level')return Math.round((number(s?.levelKg)||0)*100)/100; // 4.7.0 숫자 단계는 저장할 때 환산한 kg
 const hasOriginal=number(s?.originalWeight)!==null&&['kg','lb'].includes(s?.originalUnit);
 return Math.round((number(hasOriginal?s.originalWeight:s?.weight)||0)*((hasOriginal?s.originalUnit:s?.unit)==='lb'?LB_TO_KG:1)*100)/100;
};
export function convertSetUnit(set,newUnit){
 if(set?.unit==='level')throw Error('숫자 단계로 적은 무게는 kg·lb로 바꿀 수 없어요.');
 if(!['kg','lb'].includes(newUnit))throw Error('중량 단위는 kg 또는 lb여야 합니다.');
 const originalWeight=number(set.originalWeight??set.weight),originalUnit=set.originalUnit||set.unit||'kg';
 if(originalWeight===null||originalWeight<0||!['kg','lb'].includes(originalUnit))throw Error('원래 중량과 단위를 확인해 주세요.');
 const kg=originalWeight*(originalUnit==='lb'?LB_TO_KG:1);
 return {...set,originalWeight,originalUnit,unit:newUnit,weight:newUnit===originalUnit?originalWeight:round(newUnit==='lb'?kg/LB_TO_KG:kg,2)};
}
const cleanIds=items=>Array.isArray(items)?[...new Set(items.map(String).filter(Boolean))]:[];
export function cleanMachine(raw){
 const name=String(raw.name||raw.model||'이름 없는 머신').trim();
 const unit=raw.unit||'kg';if(!UNITS.includes(unit))throw Error('머신 단위를 확인해 주세요.');
 const photoDataUrl=String(raw.photoDataUrl||'');if(photoDataUrl&&(photoDataUrl.length>2*1024*1024||!/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/]+={0,2}$/.test(photoDataUrl)))throw Error('머신 사진은 2 MB 이하의 PNG·JPEG·WebP로 선택해 주세요.');
 return {id:raw.id||uid(),name,aliases:cleanIds(raw.aliases).map(x=>x.trim()).filter(x=>x&&x!==name),photoDataUrl,exerciseId:String(raw.exerciseId||''),manufacturer:String(raw.manufacturer||'모름').trim(),model:String(raw.model||'모름').trim(),location:String(raw.location||'').trim(),resistance:String(raw.resistance||'모름').trim(),unit,baseId:/^gm:[a-z0-9-]{1,40}$/.test(String(raw.baseId||''))?String(raw.baseId):''};
}
// 3.12.0 타깃: 사용자가 정한 값 → 도감 → 이름 규칙 → 부위. 비어 있지 않게 채운다(유산소 제외).
function exerciseTargets(raw,name,known){const p=cleanIds(raw.primaryMuscleIds),s=cleanIds(raw.secondaryMuscleIds);if(p.length)return {primaryMuscleIds:p,secondaryMuscleIds:s};if(known&&known.primaryMuscleIds?.length)return {primaryMuscleIds:cleanIds(known.primaryMuscleIds),secondaryMuscleIds:cleanIds(known.secondaryMuscleIds)};if(raw.kind==='cardio')return {primaryMuscleIds:[],secondaryMuscleIds:[]};const t=inferTargets(name,String(raw.part||''));return {primaryMuscleIds:t.primary,secondaryMuscleIds:t.secondary}}
export function cleanCustomExercise(raw){
 const name=String(raw.name||'').trim();if(!name)throw Error('종목 이름을 입력해 주세요.');
 /* 4.29.3 기준 종목(도감 종목) 하나에 속한다: 그림·성장 기록은 그 종목으로 */const base=EXERCISE_CATALOG.find(x=>x.id===String(raw.baseExerciseId||''))||null;
 return {id:raw.id||uid(),name,part:String(raw.part||'기타').slice(0,20),kind:raw.kind==='cardio'?'cardio':'strength',equipment:String(raw.equipment||'기타').slice(0,20),aliases:cleanIds(raw.aliases),baseExerciseId:base?base.id:'',...exerciseTargets(raw,name,base),targetSource:cleanIds(raw.primaryMuscleIds).length?'user':'auto',anatomyMapVersion:1};
}
export function cleanCheckin(raw){
 const out={};for(const k of ['sleep','energy','soreness']){const n=number(raw[k]);if(n!==null&&(n<1||n>5))throw Error('컨디션은 1~5 사이여야 합니다.');out[k]=n;}
 if(![undefined,null,'',true,false,'true','false'].includes(raw.pain))throw Error('통증 여부를 확인해 주세요.');out.pain=raw.pain===true||raw.pain==='true'?true:raw.pain===false||raw.pain==='false'?false:null;out.note=String(raw.note||'');return out;
}
export function dietState(db,date){
 const hasMeals=(db.meals||[]).some(x=>x.date===date),state=db.dayStates?.[date];
 if(state==='complete'&&!hasMeals)return 'unrecorded';
 if(state==='fasting'&&hasMeals)return 'partial';
 if(state==='unrecorded'&&hasMeals)return 'partial';
 if(state==='partial'&&!hasMeals)return 'unrecorded'; // 4.4.1 점검 C-9: 식사를 다 지운 날은 '일부 기록'으로 남기지 않는다
 return ['partial','complete','fasting','unrecorded'].includes(state)?state:hasMeals?'partial':'unrecorded';
}
export function setDietState(db,date,state){
 if(!validDate(date)||!['partial','complete','fasting','unrecorded'].includes(state))throw Error('식단 상태를 확인해 주세요.');
 const meals=(db.meals||[]).filter(x=>x.date===date);
 if((state==='fasting'||state==='unrecorded')&&meals.length)throw Error('식사 기록이 있는 날은 단식 또는 미기록으로 지정할 수 없습니다.');
 if(state==='complete'&&!meals.length)throw Error('식사 기록이 없습니다. 단식이라면 단식을 선택해 주세요.');
 return {...db,dayStates:{...db.dayStates,[date]:state}};
}
// 4.27.0 전수검사 DAT-01: 예전엔 기록 1건만 형식이 틀려도 전체가 '읽을 수 없음'이 되어 앱 전체 저장이 잠겼다.
// lenient(앱의 평소 읽기·저장)에서는 틀린 기록만 db.quarantine에 원본 그대로 따로 보관하고 나머지는 연다(지우지 않음).
// 백업 가져오기처럼 사람이 고른 파일을 검사할 때는 지금처럼 엄격하게(lenient 아님) 이유를 알려 준다.
export const QUARANTINE_MAX=500;
const quarantineSig=q=>{if(q.id!=null&&q.id!=='')return `${q.kind}|id|${q.id}`;try{return `${q.kind}||${JSON.stringify(q.raw)}`}catch{return `${q.kind}||${Math.random()}`}};
export function normalizeDB(raw,{lenient=false}={}){
 if(!raw||typeof raw!=='object'||raw.schemaVersion!==VERSION)throw Error('지원하지 않는 백업 형식입니다.');
 const db=emptyDB(),bad=[],list=k=>{if(raw[k]!=null&&!Array.isArray(raw[k])){if(lenient){bad.push({kind:k,raw:raw[k],reason:'목록 형식 아님'});return []}throw Error(k+' 백업 목록을 확인해 주세요.')}return raw[k]||[]};
 const each=(k,fn)=>list(k).flatMap(x=>{if(!lenient)return [fn(x)];try{return [fn(x)]}catch(e){bad.push({kind:k,raw:x,reason:String(e?.message||e).slice(0,120)});return []}});
 db.body=each('body',cleanBody);db.meals=each('meals',cleanMeal);db.foods=each('foods',cleanFoodPreset);db.workouts=each('workouts',cleanWorkout);
 db.routines=each('routines',r=>({...r,exercises:(r.exercises||[]).map(cleanExercise)}));
 db.machines=each('machines',cleanMachine);db.customExercises=each('customExercises',cleanCustomExercise);db.favorites=cleanIds(list('favorites'));
 db.recipes=each('recipes',r=>{if(!String(r.name||'').trim()||!Array.isArray(r.items)||!r.items.length)throw Error('레시피 형식을 확인해 주세요.');return {id:r.id||uid(),name:String(r.name).trim(),items:r.items.map(x=>cleanMeal({...x,date:x.date||'2000-01-01'}))}});
 for(const k of ['dayStates','checkins'])if(raw[k]!=null&&(typeof raw[k]!=='object'||Array.isArray(raw[k]))){if(!lenient)throw Error(k+' 형식을 확인해 주세요.');bad.push({kind:k,raw:raw[k],reason:'형식 아님'});raw={...raw,[k]:{}}}
 for(const [date,state] of Object.entries(raw.dayStates||{})){if(!validDate(date)||!['partial','complete','fasting','unrecorded'].includes(state)){if(!lenient)throw Error('식단 상태 형식을 확인해 주세요.');bad.push({kind:'dayStates',id:date,raw:state,reason:'식단 상태 형식 아님'});continue}db.dayStates[date]=state;}
 for(const [date,state] of Object.entries(raw.checkins||{})){if(!validDate(date)||!state||typeof state!=='object'){if(!lenient)throw Error('체크인 형식을 확인해 주세요.');bad.push({kind:'checkins',id:date,raw:state,reason:'체크인 형식 아님'});continue}try{db.checkins[date]=cleanCheckin(state)}catch(e){if(!lenient)throw e;bad.push({kind:'checkins',id:date,raw:state,reason:String(e?.message||e).slice(0,120)})}}
 // 4.27.0 재검사 N-1·N-8: 보관분은 백업 파일에도 실려 가져오기 때 이어지고, 같은 기록은 한 번만 둔다. 기록 키(id)를 함께 두어 동기화가 건드리지 않게 한다.
 {const kept=Array.isArray(raw.quarantine)?raw.quarantine.filter(q=>q&&typeof q==='object'&&!Array.isArray(q)):[],seen=new Set(),all=[];for(const q of [...kept,...bad.map(b=>({...b,id:b.id??(b.raw&&typeof b.raw==='object'?b.raw.id:undefined),at:new Date().toISOString()}))]){const k=quarantineSig(q);if(seen.has(k))continue;seen.add(k);all.push(q)}if(all.length)db.quarantine=all.slice(-QUARANTINE_MAX)}
 for(const m of db.meals)if(['fasting','unrecorded'].includes(db.dayStates[m.date]))db.dayStates[m.date]='partial';
 db.settings={...db.settings,...raw.settings};/* 4.28.0 밤샘 E-1이 찾음: 목표 숫자 칸이 숫자가 아니면(동기화·백업으로 들어온 글자) 화면에 NaN이 찍혔다 → 숫자로, 안 되면 0 */for(const k of ['calorieGoal','carbsGoal','proteinGoal','fatGoal','carbsPctGoal','proteinPctGoal','fatPctGoal','goalWeight']){if(db.settings[k]==null||db.settings[k]==='')continue;const n=Number(db.settings[k]);db.settings[k]=Number.isFinite(n)&&n>=0?n:0}if(!Number.isFinite(Number(db.settings.barbellWeightKg))||Number(db.settings.barbellWeightKg)<0)db.settings.barbellWeightKg=20;
 db.settings.workoutTitles=Array.isArray(db.settings.workoutTitles)?[...new Set(db.settings.workoutTitles.map(x=>String(x).trim()).filter(Boolean))]:[];
 db.settings.gyms=Array.isArray(db.settings.gyms)?[...new Set(db.settings.gyms.map(x=>String(x).trim()).filter(Boolean))]:[];
 {const gp=cleanGymPlaces(db.settings);if(Object.keys(gp).length)db.settings.gymPlaces=gp;else delete db.settings.gymPlaces;}
 return db;
}
export function importBody(raw){if(!['mylogue.body','myweightlog.body'].includes(raw?.type)||raw?.version!==1)throw Error('마이로그 인바디 파일이 아닙니다.');return cleanBody({...raw.measurement,source:'import'})}
export function bodyImportFile(measurement){return {type:'mylogue.body',version:1,measurement:cleanBody(measurement)}}

// 3.18.0 예정 기록(아직 먹지·하지 않음)은 합계·헤일로·분석에서 뺀다. 확정하면 planned가 사라진다.
/* 5.0.6 속도: 같은 기록이면 같은 사본을 돌려준다(화면마다 새 사본을 만들어 그 뒤 계산을 재사용하지 못했다). 기록은 바뀔 때마다 새 객체로 바꿔 끼우므로 안전 */
const ACTUAL=new WeakMap();
export const actualDB=db=>{if(!db||typeof db!=='object')return {...db,meals:[],workouts:[]};let a=ACTUAL.get(db);if(a&&a.__m===db.meals&&a.__w===db.workouts)return a;a={...db,meals:(db.meals||[]).filter(m=>!m.planned),workouts:(db.workouts||[]).filter(w=>!w.planned)};Object.defineProperty(a,'__m',{value:db.meals});Object.defineProperty(a,'__w',{value:db.workouts});ACTUAL.set(db,a);return a};
export function plannedMeals(db,date){const list=(db.meals||[]).filter(m=>m.planned&&m.date===date);return {count:new Set(list.map(m=>m.mealGroupId||m.id)).size,totals:mealTotals(list)}}
// 4.0.0 지금보다 1분 넘게 미래 시각이면 '예정'(어느 경로로 넣든: 직접·AI 검토함·붙여넣기·수정)
export const isFuture=(t,now=Date.now())=>{const v=new Date(t).getTime();return Number.isFinite(v)&&v>now+60000};
// 4.16.0 고침: 4.0.0~4.15.0 빠른 기록은 times.every(isFuture)가 배열 순번을 '현재 시각'으로 넘겨, 지난 세트도 '예정'으로 저장했다.
// 세트(또는 유산소) 완료 시각이 모두 그 기록을 저장한 시각(+1분) 이전이면 실제로 한 운동이므로 예정 표시를 푼다.
// 정말 미래 시각으로 잡아 둔 예정 운동은 완료 시각이 저장 시각보다 뒤라서 그대로 남는다.
export function repairQuickPlanned(db,nowIso=new Date().toISOString()){
 let changed=false;
 const workouts=(db.workouts||[]).map(w=>{
  if(w.planned!==true)return w;
  const times=(w.exercises||[]).flatMap(e=>e.kind==='cardio'?[e.completedAt]:(e.sets||[]).map(s=>s.completedAt)).filter(Boolean);
  const saved=new Date(w.updatedAt||w.createdAt||'').getTime();
  if(!times.length||!Number.isFinite(saved))return w;
  if(!times.every(t=>{const v=new Date(t).getTime();return Number.isFinite(v)&&v<=saved+60000}))return w;
  changed=true;const {planned,...rest}=w;return {...rest,updatedAt:nowIso};
 });
 return changed?{...db,workouts}:db;
}
