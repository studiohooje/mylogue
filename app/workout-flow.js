// 4.3.0 운동 볼거리(대표님: 식단처럼 다양하게) — 이번 주 요약 · 12주 운동 잔디 · 운동 흐름(세트·볼륨·운동 일수·유산소) · 종목 성장 · 새 기록
import {workoutTotals, setWeightKg} from './domain.js';
import {lineChart, barChart, hoverButton} from './band-chart.js';

const esc = v => String(v??'').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const pad = n => String(n).padStart(2, '0');
const ymd = d => `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
const md = s => `${Number(s.slice(5,7))}/${Number(s.slice(8,10))}`;
const n0 = v => Math.round(Number(v)||0).toLocaleString('ko-KR');
const monday = date => { const d = new Date(`${date}T12:00:00`); d.setDate(d.getDate() - ((d.getDay()+6)%7)); return ymd(d); };
const addDays = (date, n) => { const d = new Date(`${date}T12:00:00`); d.setDate(d.getDate()+n); return ymd(d); };
const CW = () => Math.max(320, Math.min(760, ((globalThis.innerWidth||700) > 760 ? 760 : (globalThis.innerWidth||700) - 56)));
const PART_COLOR = {'가슴':'#ff7b93','등':'#8ce4e0','하체':'#f0d466','어깨':'#b8aaf2','팔':'#6fd6a3','복근':'#f2b49b','전신':'#9cc8ed'};
export const WF_METRICS = [['sets','세트','#b8aaf2'], ['volume','볼륨','#8ce4e0'], ['days','운동 일수','#f7c270'], ['cardio','유산소','#6fd6a3']];

const real = db => (db.workouts||[]).filter(w => !w.planned && !w.rest);
function weekStats(db, k){
 const e = addDays(k, 6), ws = real(db).filter(w => w.date>=k && w.date<=e), parts = {};
 let sets = 0, volume = 0, cardio = 0;
 for(const w of ws){ const t = workoutTotals(w); sets += t.sets; volume += t.volume; cardio += t.cardioMinutes; for(const ex of w.exercises||[]){ if(ex.kind==='cardio') continue; const n = (ex.sets||[]).filter(s => s.completed!==false).length; const p = PART_COLOR[ex.part] ? ex.part : '기타'; parts[p] = (parts[p]||0) + n; } }
 return {k, sets, volume, cardio, days:new Set(ws.map(w => w.date)).size, parts};
}
export function weeks(db, end, n = 8){ const out = []; let k = monday(end); for(let i=0; i<n; i++){ out.unshift(weekStats(db, k)); k = addDays(k, -7); } return out; }

// 4.17.0 운동 달력(대표님 방침: 양이 아니라 '움직였는지'): 근력·유산소·필라테스·의도적 휴식·새 기록 날을 색과 표시로
const isTimed = w => (w.exercises || []).length && (w.exercises || []).every(e => e.kind === 'cardio');
export function grassHTML(db, end){
 const start = addDays(monday(end), -77), cells = [], kind = new Map(), prBest = new Map(), prDays = new Set();
 for(const w of [...(db.workouts||[])].filter(w => !w.planned).sort((a, b) => String(a.date).localeCompare(String(b.date)))){
  if(w.rest){ if(w.date>=start && w.date<=end && !kind.has(w.date)) kind.set(w.date, 'rest'); continue; }
  for(const e of w.exercises||[]){ if(e.kind==='cardio') continue; const k = e.exerciseId || e.name, best = Math.max(0, ...(e.sets||[]).filter(s => s.completed!==false).map(s => setWeightKg(s) || 0)); if(!best) continue; const prev = prBest.get(k); if(prev != null && best > prev && w.date>=start && w.date<=end) prDays.add(w.date); if(prev == null || best > prev) prBest.set(k, best); }
  if(w.date<start || w.date>end) continue;
  const k = isTimed(w) ? 'timed' : 'strength', cur = kind.get(w.date); kind.set(w.date, cur && cur !== 'rest' && cur !== k ? 'both' : k);
 }
 const FILL = {strength:'#8ce4e0', timed:'#b8aaf2', both:'#9cc8ed', rest:'#f7c27033'};
 const LABEL = {strength:'근력', timed:'유산소·필라테스', both:'근력+유산소', rest:'의도적 휴식'};
 let moved = 0;
 for(let wk=0; wk<12; wk++) for(let d=0; d<7; d++){ const date = addDays(start, wk*7+d); if(date>end) continue; const k = kind.get(date), x = 4+wk*26, y = 4+d*14; if(k && k!=='rest') moved++;
  cells.push(`<rect x="${x}" y="${y}" width="22" height="12" rx="3" fill="${k?FILL[k]:'#ffffff0d'}"${k==='rest'?' stroke="#f7c270" stroke-dasharray="2 2"':''}${date===end?' stroke="#fff" stroke-width="1.4"':''}><title>${md(date)} ${k?LABEL[k]:'기록 없음'}${prDays.has(date)?' · 새 기록':''}</title></rect>${prDays.has(date)?`<circle cx="${x+11}" cy="${y+6}" r="2.6" fill="#120f24"/>`:''}`); }
 return `<div class="wf-sub"><b>12주 운동 달력</b><small>움직인 날 ${moved}일</small></div><svg class="wf-grass" viewBox="0 0 320 104" role="img" aria-label="12주 동안 움직인 날 ${moved}일">${cells.join('')}</svg><div class="wf-legend"><span><i style="background:#8ce4e0"></i>근력</span><span><i style="background:#b8aaf2"></i>유산소·필라테스</span><span><i style="background:#f7c27033;outline:1px dashed #f7c270"></i>의도적 휴식</span><span><i style="background:#8ce4e0;box-shadow:inset 0 0 0 3px #8ce4e0,inset 0 0 0 6px #120f24"></i>새 기록</span></div>`;
}

function flowChart(ws, metric){
 const v = w => metric==='volume' ? w.volume/1000 : metric==='days' ? w.days : metric==='cardio' ? w.cardio : w.sets;
 const [, , color] = WF_METRICS.find(m => m[0]===metric);
 const fmt = (w, val) => metric==='volume' ? `${val.toFixed(1)}t` : metric==='cardio' ? `${n0(val)}분` : metric==='days' ? `${val}일` : `${val}세트`;
 const bars = ws.map(w => metric==='sets' ? {stack:Object.entries(w.parts).sort((a, b) => b[1]-a[1]).map(([p, n]) => ({v:n, color:PART_COLOR[p]||'#5b6b85'}))} : {v:v(w)});
 const tips = ws.map(w => `<span class="d">${md(w.k)} 주</span><b>${fmt(w, v(w))}</b>${metric==='sets'&&w.sets?`<span class="d">${Object.entries(w.parts).sort((a, b) => b[1]-a[1]).map(([p, n]) => `${p} ${n}`).join(' · ')}</span>`:''}`);
 return `${barChart({bars, color, h:150, tips, dateL:`${ws.length-1}주 전`, dateR:'이번 주', label:'주별 운동 흐름'})}${metric==='sets'?`<div class="wf-legend">${Object.entries(PART_COLOR).map(([p, c]) => `<span><i style="background:${c}"></i>${p}</span>`).join('')}</div>`:''}`;
}

// 대표 종목(최근 12주 가장 많이 한 근력 종목)의 날짜별 최고 무게
export function liftGrowth(db, end){
 const from = addDays(end, -84), count = new Map();
 for(const w of real(db)) if(w.date>=from && w.date<=end) for(const e of w.exercises||[]) if(e.kind!=='cardio') count.set(e.name, (count.get(e.name)||0)+1);
 const name = [...count.entries()].sort((a, b) => b[1]-a[1])[0]?.[0]; if(!name) return null;
 const pts = []; for(const w of [...real(db)].sort((a, b) => a.date.localeCompare(b.date))){ if(w.date<from || w.date>end) continue; let best = 0; for(const e of w.exercises||[]) if(e.name===name) for(const s of e.sets||[]) if(s.completed!==false) best = Math.max(best, setWeightKg(s)); if(best>0) pts.push({date:w.date, w:best}); }
 return pts.length>1 ? {name, pts} : null;
}
export function newRecords(db, end, days = 28){
 const from = addDays(end, -days), before = new Map(), out = [];
 for(const w of [...real(db)].sort((a, b) => a.date.localeCompare(b.date))){
  for(const e of w.exercises||[]){ if(e.kind==='cardio') continue; let best = 0; for(const s of e.sets||[]) if(s.completed!==false) best = Math.max(best, setWeightKg(s)); if(!best) continue;
   const prev = before.get(e.name); if(w.date>=from && w.date<=end && prev!=null && best>prev) out.push({name:e.name, from:prev, to:best, date:w.date}); if(prev==null || best>prev) before.set(e.name, best); }
 }
 const last = new Map(); for(const r of out) last.set(r.name, {...(last.get(r.name)||{from:r.from}), name:r.name, to:r.to, date:r.date});
 return [...last.values()].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 5);
}
function growthChart(g){
 const tips = g.pts.map(p => `<span class="d">${md(p.date)}</span><b>${p.w}kg</b><span class="d">그날 가장 무거운 세트</span>`);
 return lineChart({vals:g.pts.map(p => p.w), color:'#b8aaf2', h:120, tips, dateL:md(g.pts[0].date), dateR:md(g.pts.at(-1).date), label:`${g.name} 최고 무게 추이`});
}

export function workoutFlowHTML(db, {end, metric = 'sets'}){
 if(!real(db).length) return '';
 const ws = weeks(db, end, 8), cur = ws.at(-1), goal = Number(db.settings?.weeklyWorkoutGoal)||null;
 const g = liftGrowth(db, end), prs = newRecords(db, end);
 return `<section class="section card wf-top"><div class="wf-sub"><b>${end===ymd(new Date())?'이번 주':'그 주'}</b><small>${md(cur.k)} – ${md(addDays(cur.k, 6))}</small></div><div class="wf-stats"><div><small>운동한 날</small><b>${cur.days}${goal?` / ${goal}`:''}일</b></div><div><small>세트</small><b>${cur.sets}</b></div><div><small>볼륨</small><b>${(cur.volume/1000).toFixed(1)}t</b></div><div><small>유산소</small><b>${n0(cur.cardio)}분</b></div></div>${grassHTML(db, end)}</section>
 <section class="section card wf-flow"><div class="wf-sub"><b>운동 흐름</b><span class="df-tools"><small>최근 8주</small>${hoverButton()}</span></div><div class="df-tabs" role="tablist">${WF_METRICS.map(([k, l, c]) => `<button type="button" role="tab" class="df-tab${k===metric?' on':''}" style="--c:${c}" data-wf-metric="${k}" aria-selected="${k===metric}">${l}</button>`).join('')}</div>${flowChart(ws, metric)}</section>
 ${g||prs.length?`<section class="section card wf-growth">${g?`<div class="wf-sub"><b>종목 성장</b><small>${esc(g.name)} · 날마다 가장 무거운 세트</small></div>${growthChart(g)}`:''}${prs.length?`<div class="wf-sub"><b>새 기록</b><small>최근 4주</small></div><ul class="wf-prs">${prs.map(r => `<li><span>${esc(r.name)}</span><span>${r.from} → <b>${r.to}kg</b> <small>${md(r.date)}</small></span></li>`).join('')}</ul>`:''}</section>`:''}`;
}
