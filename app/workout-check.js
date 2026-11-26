// 5.1.0 자동 검토(무료, AI 아님 — 규칙): '기록 완료'를 누를 때 한 번만 "이 중량이 맞나요?"
// 대표님 실제 기록에서 찾았던 실수들: 한 종목 안 kg/lb 섞임, 평소의 2배 넘는 중량, 바로 앞 세트보다 갑자기 몇 배, 덤벨로 불가능한 무게, 0kg 세트.
import {resolveExercise} from './catalog.js';
const LB=0.45359237;
const kg=s=>s.unit==='lb'?Number(s.weight)*LB:s.unit==='level'?null:Number(s.weight);
const key=e=>e.exerciseId||resolveExercise(e.name)?.id||e.name;
const r1=v=>Math.round(v*10)/10;
// 같은 종목의 지난 기록(이 운동 제외) 중 세트 최고 중량(kg)들
export function historyMax(db,ex,skipId,before='9999'){const k=key(ex),out=[];for(const w of db.workouts||[]){if(w.id===skipId||w.planned||w.rest||!(String(w.date)<before))continue;for(const e of w.exercises||[]){if(key(e)!==k)continue;const ws=(e.sets||[]).filter(s=>s.completed!==false&&s.type!=='웜업').map(kg).filter(v=>v>0);if(ws.length)out.push(Math.max(...ws))}}return out}
const median=a=>{const b=[...a].sort((x,y)=>x-y);return b.length?b[Math.floor(b.length/2)]:0};
export function checkWorkout(w,db={}){
 const issues=[];
 (w.exercises||[]).forEach((e,ei)=>{if(e.kind==='cardio')return;const sets=e.sets||[],item=resolveExercise(e.name)||{};
  const units=sets.map(s=>s.unit).filter(u=>u==='kg'||u==='lb'),major=units.filter(u=>u==='kg').length>=units.filter(u=>u==='lb').length?'kg':'lb';
  const hist=historyMax(db,e,w.id,w.date),typ=median(hist);
  sets.forEach((s,si)=>{const v=kg(s);if(v==null)return;const push=(text,fix)=>issues.push({ei,si,name:e.name,n:si+1,weight:s.weight,unit:s.unit,reps:s.reps,text,fix});
   if(units.length>1&&s.unit!==major&&(s.unit==='kg'||s.unit==='lb')&&units.filter(u=>u===s.unit).length<units.length/2){push(`이 종목은 다른 세트가 모두 ${major}인데 이 세트만 ${s.unit}이에요.`,{unit:major});return}
   if(Number(s.weight)===0&&s.type!=='웜업'&&!/맨몸|푸시업|풀업|딥스|크런치|플랭크/.test(e.name)&&item.equipment!=='맨몸'){const prev=sets.find((x,i)=>i!==si&&Number(x.weight)>0);push('0으로 적혔어요. 빈 봉·맨몸이었다면 그대로 두세요.',prev?{weight:prev.weight,unit:prev.unit}:null);return}
   if(item.equipment==='덤벨'&&s.unit!=='level'&&v>60){push(`덤벨 한 개 ${r1(v)}kg은 흔하지 않아요. 기구를 잘못 골랐거나 단위가 다를 수 있어요.`,null);return}
   const prev=sets.slice(0,si).reverse().find(x=>kg(x)>0&&x.unit===s.unit);
   if(prev&&v>kg(prev)*2.5&&v-kg(prev)>=20){push(`바로 앞 세트(${prev.weight}${prev.unit})보다 ${r1(v/kg(prev))}배예요.`,{weight:prev.weight,unit:prev.unit});return}
   if(typ>0&&hist.length>=1&&v>typ*2.5&&v-typ>=15){const asLb=s.unit==='kg'?v*LB:null;push(`평소 이 종목은 ${r1(typ)}kg 안팎인데 ${r1(v)}kg이에요.`,asLb&&Math.abs(asLb-typ)<typ*0.35?{unit:'lb'}:prev?{weight:prev.weight,unit:prev.unit}:null);return}
   if(typ>0&&hist.length>=2&&s.unit==='lb'&&v<typ*0.45&&Number(s.weight)>=typ*0.6){push(`평소 이 종목은 ${r1(typ)}kg 안팎이에요. lb가 아니라 kg 아닌가요?`,{unit:'kg'})}
  })});
 return issues;
}
export const fixLabel=(x)=>!x.fix?'':x.fix.weight!=null?`${x.fix.weight}${x.fix.unit||x.unit}으로 고치기`:x.fix.unit?`${x.weight}${x.fix.unit}로 고치기`:'';
export function applyFix(w,x){const ex=(w.exercises||[]).map((e,ei)=>ei!==x.ei?e:{...e,sets:e.sets.map((s,si)=>si!==x.si?s:{...s,...(x.fix.weight!=null?{weight:Number(x.fix.weight),originalWeight:Number(x.fix.weight)}:{}),...(x.fix.unit?{unit:x.fix.unit,originalUnit:x.fix.unit}:{})})});return {...w,exercises:ex}}
