// 2026-11-27 대표님: 지난 운동 기록에 헬스장 머신(소분류)을 한꺼번에 붙이는 숨은 관리자 작업. 화면·메뉴 없음.
// Claude가 대표님이 로그인한 앱 브라우저에서 콘솔로만 실행한다(관리자 계정일 때만): 백업 → 바뀔 목록 미리 보기 → 대표님 확인 → 적용.
// 이 파일은 app.js를 import하지 않는다.

// rules: [{gym:'헬스플러스 안산1호점', exercise:'exercise:레그 프레스'(또는 이름), machineId:'bm:…', onlyEmpty:true, from:'2026-01-01', to:'2026-12-31'}]
export function planMachineAssign(db = {}, rules = [], {exerciseName = id => id} = {}){
 const out = [];
 for(const w of db.workouts || []){
  if(w.planned) continue;
  for(const [i, e] of (w.exercises || []).entries()){
   if(e.kind === 'cardio') continue;
   for(const r of rules){
    if(r.gym && w.gymName !== r.gym) continue;
    if(r.from && w.date < r.from || r.to && w.date > r.to) continue;
    const key = e.exerciseId || e.name;
    if(r.exercise !== key && r.exercise !== e.name && exerciseName(r.exercise) !== e.name) continue;
    if((r.onlyEmpty ?? true) && e.machineId) continue;
    if(e.machineId === r.machineId) continue;
    out.push({workoutId: w.id, index: i, date: w.date, gym: w.gymName || '', exercise: e.name, from: e.machineId || '', to: r.machineId, sets: (e.sets || []).length});
    break;
   }
  }
 }
 return out.sort((a, b) => a.date.localeCompare(b.date));
}

// changes(위 목록)를 그대로 적용한 새 db. 무게 기준(한쪽/총)은 바꾸지 않는다 — 필요하면 perHand 목록을 따로 넘긴다.
export function applyMachineAssign(db = {}, changes = [], {perHand = []} = {}){
 const by = new Map(); for(const c of changes) by.set(`${c.workoutId}#${c.index}`, c);
 const ph = new Set(perHand), now = new Date().toISOString();
 const workouts = (db.workouts || []).map(w => {
  if(![...by.keys()].some(k => k.startsWith(w.id + '#'))) return w;
  return {...w, updatedAt: now, exercises: (w.exercises || []).map((e, i) => {
   const c = by.get(`${w.id}#${i}`); if(!c) return e;
   /* c.set: 세트 값 고치기(예: {unit:'kg'} 단위만, {unit:'level', weight:4, levelKg:9.07} 핀 번호로) */
   /* c.ex: 종목 바로잡기 {name, exerciseId} · c.weightScale: 합계로 적은 원판 무게를 한쪽 값으로(0.5) */
   const sc = Number(c.weightScale) > 0 ? Number(c.weightScale) : 1, fix = x => sc === 1 ? x : {...x, weight: Math.round(Number(x.weight) * sc * 100) / 100, originalWeight: Math.round(Number(x.weight) * sc * 100) / 100};
   return {...e, ...(c.ex || {}), machineId: c.to, ...(ph.has(c.to) || c.perHand ? {weightBasis: 'per-hand', handCount: 2, ...(c.oneLever ? {oneLever: true} : {})} : c.perHand === false ? {weightBasis: 'total', handCount: 0} : {}), ...(c.set || sc !== 1 ? {sets: (e.sets || []).map(x => fix({...x, ...(c.set || {}), ...(c.set?.unit ? {originalUnit: c.set.unit} : {}), ...(c.set?.weight != null ? {originalWeight: c.set.weight} : {})}))} : {})};
  })};
 });
 return {...db, workouts};
}

// 미리 보기 표(콘솔·대표님 확인용)
export const changesTable = changes => changes.map(c => `${c.date} · ${c.gym} · ${c.exercise} · ${c.from || '(머신 없음)'} → ${c.to} · ${c.sets}세트`).join('\n');
