// 5.1.0 미리 채우기 두 갈래(대표님 2026-11-26)
// - 일반 세트: 그 머신(프리웨이트는 기준 운동)에서 '웜업이 아닌' 마지막 세트의 중량·횟수
// - 웜업을 켜면: 그 머신에서 마지막 '웜업' 세트의 중량·횟수
// - 그날 첫 세트는 지난 기록, 그다음부터는 방금 한 세트
// - 단위: 그 머신(프리웨이트는 기준 운동)에서 마지막에 쓴 단위
export const isWarm=x=>x?.type==='웜업';
export const unitKey=s=>s.machineId?`m:${s.machineId}`:`e:${s.exerciseId}`;
export const rememberedUnit=(db,s)=>(db?.settings?.unitMemory||{})[unitKey(s)]||'';
export function prefillFor(s,db,{warm=false,lastSession,machineUnit=''}={}){
 const here=(s.sets||[]).filter(x=>x.exerciseId===s.exerciseId&&x.machineId===s.machineId&&!x.timed);
 const today=[...here].reverse().find(x=>isWarm(x)===warm);
 if(today)return {weight:today.weight,reps:today.reps,unit:today.unit,from:'today'};
 const past=(lastSession?.(db,s)?.sets||[]).filter(x=>x.completed!==false);
 const p=[...past].reverse().find(x=>isWarm(x)===warm);
 if(p)return {weight:p.weight,reps:p.reps,unit:p.unit||rememberedUnit(db,s)||machineUnit||'kg',from:'past'};
 // 웜업 기록이 없으면 일반 세트 값을 그대로(웜업은 직접 낮춰서), 아무 기록도 없으면 단위만
 if(warm){const any=today||[...here].reverse()[0]||[...past].reverse()[0];if(any)return {weight:any.weight,reps:any.reps,unit:any.unit,from:'fallback'}}
 return {weight:null,reps:null,unit:rememberedUnit(db,s)||machineUnit||'kg',from:'none'};
}
export const withUnitMemory=(db,s,unit)=>unit&&['kg','lb','level'].includes(unit)?{...db,settings:{...db.settings,unitMemory:{...(db.settings?.unitMemory||{}),[unitKey(s)]:unit}}}:db;
