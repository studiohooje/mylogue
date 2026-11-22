// 4.3.0 운동 볼거리(대표님: 식단처럼 다양하게) — 이번 주 요약 · 12주 운동 잔디 · 운동 흐름(세트·볼륨·운동 일수·유산소) · 종목 성장 · 새 기록
import {workoutTotals, setWeightKg} from './domain.js';

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

export function grassHTML(db, end){
 const start = addDays(monday(end), -77), cells = [];
 const byDay = new Map(); for(const w of real(db)){ if(w.date<start || w.date>end) continue; byDay.set(w.date, (byDay.get(w.date)||0) + workoutTotals(w).sets + Math.round(workoutTotals(w).cardioMinutes/10)); }
 const vals = [...byDay.values()], max = Math.max(1, ...vals);
 for(let wk=0; wk<12; wk++) for(let d=0; d<7; d++){ const date = addDays(start, wk*7+d); if(date>end) continue; const v = byDay.get(date)||0, lv = v ? Math.min(4, Math.ceil(v/max*4)) : 0; cells.push(`<rect x="${4+wk*26}" y="${4+d*14}" width="22" height="12" rx="3" fill="${lv?['','#8ce4e040','#8ce4e080','#8ce4e0c0','#8ce4e0'][lv]:'#ffffff0d'}"><title>${md(date)} ${v?`${v}세트`:'쉼'}</title></rect>`); }
 return `<div class="wf-sub"><b>12주 운동 잔디</b><small>진할수록 많이 한 날</small></div><svg class="wf-grass" viewBox="0 0 320 104" role="img" aria-label="12주 동안 운동한 날">${cells.join('')}</svg><div class="wf-legend"><span>적음</span><i style="background:#8ce4e040"></i><i style="background:#8ce4e080"></i><i style="background:#8ce4e0c0"></i><i style="background:#8ce4e0"></i><span>많음</span></div>`;
}

function flowChart(ws, metric){
 const W = CW(), H = 200, L = 40, B = 24, T = 12, n = ws.length, x = i => L + (i+0.5)*(W-L-10)/n, bw = Math.min(40, (W-L-10)/n*0.6);
 const v = w => metric==='volume' ? w.volume/1000 : metric==='days' ? w.days : metric==='cardio' ? w.cardio : w.sets;
 const max = Math.max(1, ...ws.map(v)) * 1.12, y = val => T + (H-T-B)*(1 - val/max);
 const [, , color] = WF_METRICS.find(m => m[0]===metric);
 let body = '';
 ws.forEach((w, i) => {
  if(metric==='sets'){ let yy = y(0); for(const [p, n] of Object.entries(w.parts).sort((a, b) => b[1]-a[1])){ const h = n/max*(H-T-B); yy -= h; body += `<rect x="${(x(i)-bw/2).toFixed(1)}" y="${yy.toFixed(1)}" width="${bw.toFixed(1)}" height="${Math.max(0, h-1).toFixed(1)}" rx="3" fill="${PART_COLOR[p]||'#5b6b85'}"><title>${md(w.k)} 주 ${p} ${n}세트</title></rect>`; } }
  else { const val = v(w); body += `<rect x="${(x(i)-bw/2).toFixed(1)}" y="${y(val).toFixed(1)}" width="${bw.toFixed(1)}" height="${(y(0)-y(val)).toFixed(1)}" rx="4" fill="${color}" opacity="${i===n-1?1:.75}"><title>${md(w.k)} 주 ${metric==='volume'?`${val.toFixed(1)}t`:metric==='cardio'?`${n0(val)}분`:`${val}일`}</title></rect>`; }
 });
 const unit = metric==='volume' ? 't' : metric==='cardio' ? '분' : metric==='days' ? '일' : '';
 const ticks = [0, max/2].map(t => `<text x="${L-6}" y="${(y(t)+4).toFixed(1)}" text-anchor="end" class="wf-ax">${metric==='volume'?t.toFixed(1):Math.round(t)}${unit}</text>`).join('');
 const labs = ws.map((w, i) => i%2===n%2 || i===n-1 ? `<text x="${x(i).toFixed(1)}" y="${H-6}" text-anchor="middle" class="wf-ax">${i===n-1?'이번 주':md(w.k)}</text>` : '').join('');
 return `<svg class="wf-chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="주별 운동 흐름"><line x1="${L}" x2="${W-10}" y1="${y(0)}" y2="${y(0)}" stroke="#fff" stroke-opacity=".15"/>${ticks}${body}${labs}</svg>${metric==='sets'?`<div class="wf-legend">${Object.entries(PART_COLOR).map(([p, c]) => `<span><i style="background:${c}"></i>${p}</span>`).join('')}</div>`:''}`;
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
 const W = CW(), H = 140, L = 40, n = g.pts.length, ws = g.pts.map(p => p.w), lo = Math.floor(Math.min(...ws) - 2.5), hi = Math.ceil(Math.max(...ws) + 2.5);
 const x = i => L + i*(W-L-20)/(n-1), y = v => 14 + (H-38)*(1 - (v-lo)/(hi-lo||1));
 const d = g.pts.map((p, i) => `${i?'L':'M'}${x(i).toFixed(1)} ${y(p.w).toFixed(1)}`).join(' ');
 return `<svg class="wf-chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(g.name)} 최고 무게 추이"><path d="${d}" fill="none" stroke="#b8aaf2" stroke-width="2.6" stroke-linejoin="round"/>${g.pts.map((p, i) => `<circle cx="${x(i).toFixed(1)}" cy="${y(p.w).toFixed(1)}" r="${i===n-1?4.5:3}" fill="#b8aaf2"><title>${md(p.date)} ${p.w}kg</title></circle>`).join('')}<text x="${x(n-1).toFixed(1)}" y="${(y(ws.at(-1))-10).toFixed(1)}" text-anchor="end" class="wf-val">${ws.at(-1)}kg</text><text x="${x(0).toFixed(1)}" y="${H-6}" class="wf-ax">${md(g.pts[0].date)}</text><text x="${x(n-1).toFixed(1)}" y="${H-6}" text-anchor="end" class="wf-ax">${md(g.pts.at(-1).date)}</text></svg>`;
}

export function workoutFlowHTML(db, {end, metric = 'sets'}){
 if(!real(db).length) return '';
 const ws = weeks(db, end, 8), cur = ws.at(-1), goal = Number(db.settings?.weeklyWorkoutGoal)||null;
 const g = liftGrowth(db, end), prs = newRecords(db, end);
 return `<section class="section card wf-top"><div class="wf-sub"><b>${end===ymd(new Date())?'이번 주':'그 주'}</b><small>${md(cur.k)} – ${md(addDays(cur.k, 6))}</small></div><div class="wf-stats"><div><small>운동한 날</small><b>${cur.days}${goal?` / ${goal}`:''}일</b></div><div><small>세트</small><b>${cur.sets}</b></div><div><small>볼륨</small><b>${(cur.volume/1000).toFixed(1)}t</b></div><div><small>유산소</small><b>${n0(cur.cardio)}분</b></div></div>${grassHTML(db, end)}</section>
 <section class="section card wf-flow"><div class="wf-sub"><b>운동 흐름</b><small>최근 8주</small></div><div class="df-tabs" role="tablist">${WF_METRICS.map(([k, l, c]) => `<button type="button" role="tab" class="df-tab${k===metric?' on':''}" style="--c:${c}" data-wf-metric="${k}" aria-selected="${k===metric}">${l}</button>`).join('')}</div>${flowChart(ws, metric)}</section>
 ${g||prs.length?`<section class="section card wf-growth">${g?`<div class="wf-sub"><b>종목 성장</b><small>${esc(g.name)} · 날마다 가장 무거운 세트</small></div>${growthChart(g)}`:''}${prs.length?`<div class="wf-sub"><b>새 기록</b><small>최근 4주</small></div><ul class="wf-prs">${prs.map(r => `<li><span>${esc(r.name)}</span><span>${r.from} → <b>${r.to}kg</b> <small>${md(r.date)}</small></span></li>`).join('')}</ul>`:''}</section>`:''}`;
}
