// 5.1.0 미리 채우기 두 갈래(대표님 2026-11-26)
// - 일반 세트: 그 머신(프리웨이트는 기준 운동)에서 '웜업이 아닌' 마지막 세트의 중량·횟수
// - 웜업을 켜면: 그 머신에서 마지막 '웜업' 세트의 중량·횟수
// - 그날 첫 세트는 지난 기록, 그다음부터는 방금 한 세트
// - 단위: 그 머신(프리웨이트는 기준 운동)에서 마지막에 쓴 단위
export const isWarm=x=>x?.type==='웜업';
export const unitKey=s=>s.machineId?`m:${s.machineId}`:`e:${s.exerciseId}`;
export const rememberedUnit=(db,s)=>(db?.settings?.unitMemory||{})[unitKey(s)]||'';
// 2026-11-28 대표님: 한쪽씩·양쪽 함께·번갈아는 무게를 따로 기억(한쪽씩 25kg 하다가 양쪽 60kg이 뜨던 문제)
// 순서: 오늘 같은 방식 → 지난 기록 같은 방식 → (같은 방식 기록이 아예 없을 때만) 오늘·지난 기록의 다른 방식
export const sideOf=x=>x?.side||'both';
export function prefillFor(s,db,{warm=false,lastSession,machineUnit='',side=s.side||'both'}={}){
 const here=(s.sets||[]).filter(x=>x.exerciseId===s.exerciseId&&x.machineId===s.machineId&&!x.timed);
 const past=(lastSession?.(db,s)?.sets||[]).filter(x=>x.completed!==false);
 const find=(list,same)=>[...list].reverse().find(x=>isWarm(x)===warm&&(!same||sideOf(x)===side));
 for(const same of [true,false]){
  const today=find(here,same);
  if(today)return {weight:today.weight,reps:today.reps,unit:today.unit,from:'today',sameSide:same};
  const p=find(past,same);
  if(p)return {weight:p.weight,reps:p.reps,unit:p.unit||rememberedUnit(db,s)||machineUnit||'kg',from:'past',sameSide:same};
 }
 // 웜업 기록이 없으면 일반 세트 값을 그대로(웜업은 직접 낮춰서), 아무 기록도 없으면 단위만
 if(warm){const any=[...here].reverse().find(x=>sideOf(x)===side)||[...past].reverse().find(x=>sideOf(x)===side)||[...here].reverse()[0]||[...past].reverse()[0];if(any)return {weight:any.weight,reps:any.reps,unit:any.unit,from:'fallback'}}
 return {weight:null,reps:null,unit:rememberedUnit(db,s)||machineUnit||'kg',from:'none'};
}
export const withUnitMemory=(db,s,unit)=>unit&&['kg','lb','level'].includes(unit)?{...db,settings:{...db.settings,unitMemory:{...(db.settings?.unitMemory||{}),[unitKey(s)]:unit}}}:db;
