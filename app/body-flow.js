// 4.3.0 수치 '한눈에'(대표님: 마웨그처럼 볼거리 — 주간으로 얼마나 늘고 줄었는지 주봉처럼).
// 요약 줄 → 체중 큰 그래프(일간·주간·월간, 최고·최저·현재, 목표선) → 주간 변화 막대(목표 쪽이면 초록, 반대면 빨강)
// → 체성분 변화(인바디) → 식단과 함께(주별 평균 섭취·체중) → 요일 패턴.
import {mealTotals} from './domain.js';
import {scaleRecords, inbodyRecords} from './body-series.js';

const esc = v => String(v??'').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const pad = n => String(n).padStart(2, '0');
const ymd = d => `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
const r1 = v => Math.round(v*10)/10;
const f1 = v => (Math.round(v*10)/10).toFixed(1);
const md = s => `${Number(s.slice(5,7))}/${Number(s.slice(8,10))}`;
const CW = () => Math.max(320, Math.min(760, ((globalThis.innerWidth||700) > 760 ? 760 : (globalThis.innerWidth||700) - 56)));
const avg = a => a.reduce((x, y) => x + y, 0) / a.length;
const monday = date => { const d = new Date(`${date}T12:00:00`); d.setDate(d.getDate() - ((d.getDay()+6)%7)); return ymd(d); };

export function weightPoints(db){
 const sc = scaleRecords(db).filter(x => Number(x.weight)>0);
 const src = sc.length ? sc : (db.body||[]).filter(x => Number(x.weight)>0);
 const byDay = new Map(); for(const x of [...src].sort((a, b) => String(a.date).localeCompare(String(b.date)))) byDay.set(x.date, Number(x.weight));
 return [...byDay.entries()].map(([date, w]) => ({date, w}));
}
export function bucket(points, view){
 if(view==='day') return points.map(p => ({key:p.date, label:md(p.date), w:p.w, n:1}));
 const m = new Map();
 for(const p of points){ const k = view==='week' ? monday(p.date) : p.date.slice(0,7); if(!m.has(k)) m.set(k, []); m.get(k).push(p.w); }
 return [...m.entries()].map(([k, ws]) => ({key:k, label:view==='week' ? md(k) : `${Number(k.slice(5,7))}월`, w:r1(avg(ws)), n:ws.length}));
}
// 주간 변화: 주 평균의 전주 대비
export function weeklyChanges(points, weeks = 16){
 const b = bucket(points, 'week');
 return b.slice(1).map((x, i) => ({key:x.key, label:x.label, d:r1(x.w - b[i].w)})).slice(-weeks);
}
export function summary(points, goal, today){
 if(!points.length) return null;
 const last = points.at(-1), t = new Date(`${today}T12:00:00`);
 const within = days => points.filter(p => (t - new Date(`${p.date}T12:00:00`))/86400000 < days);
 const w7 = within(7), w30 = within(30);
 const change30 = w30.length>1 ? r1(last.w - w30[0].w) : null;
 let eta = null;
 if(goal && w30.length>1){ const span = Math.max(1, (new Date(`${last.date}T12:00:00`) - new Date(`${w30[0].date}T12:00:00`))/86400000), perDay = (last.w - w30[0].w)/span, left = goal - last.w; if(perDay && Math.sign(perDay)===Math.sign(left)) eta = Math.ceil(Math.abs(left/perDay)/7); }
 return {now:last.w, nowDate:last.date, avg7:w7.length ? r1(avg(w7.map(p => p.w))) : null, change30, goal:goal||null, left:goal ? r1(goal - last.w) : null, eta};
}

function mainChart(rows, view, goal, dayAvg){
 if(!rows.length) return '<p class="hint bf-empty">체중을 기록하면 여기에 흐름이 그려져요.</p>';
 const W = CW(), H = 240, L = 40, R = 46, T = 14, B = 24, n = rows.length;
 const vals = rows.map(r => r.w).concat(goal ? [goal] : []);
 const lo = Math.floor(Math.min(...vals) - 1), hi = Math.ceil(Math.max(...vals) + 1);
 const x = i => L + (n===1 ? (W-L-R)/2 : i*(W-L-R)/(n-1)), y = v => T + (H-T-B)*(1 - (v-lo)/(hi-lo||1));
 let g = '';
 const step = Math.max(1, Math.round((hi-lo)/5));
 for(let v = lo; v<=hi; v+=step) g += `<line x1="${L}" x2="${W-R}" y1="${y(v).toFixed(1)}" y2="${y(v).toFixed(1)}" stroke="#fff" stroke-opacity=".06"/><text x="${L-6}" y="${(y(v)+4).toFixed(1)}" text-anchor="end" class="bf-ax">${v}</text><text x="${W-R+6}" y="${(y(v)+4).toFixed(1)}" class="bf-ax">${v}</text>`;
 if(goal) g += `<line x1="${L}" x2="${W-R}" y1="${y(goal).toFixed(1)}" y2="${y(goal).toFixed(1)}" stroke="#ff8a8a" stroke-opacity=".75" stroke-dasharray="5 5"/><text x="${W-R+4}" y="${(y(goal)-4).toFixed(1)}" class="bf-goal">목표 ${goal}</text>`;
 if(view==='day'){
  g += rows.map((r, i) => `<circle cx="${x(i).toFixed(1)}" cy="${y(r.w).toFixed(1)}" r="2.2" fill="#f2b49b" opacity=".45"><title>${r.key} · ${f1(r.w)}kg</title></circle>`).join('');
  const line = dayAvg.map((v, i) => `${i?'L':'M'}${x(i).toFixed(1)} ${y(v).toFixed(1)}`).join(' ');
  g += `<path d="${line}" fill="none" stroke="#f2b49b" stroke-width="2.6" stroke-linejoin="round"/>`;
 } else {
  const line = rows.map((r, i) => `${i?'L':'M'}${x(i).toFixed(1)} ${y(r.w).toFixed(1)}`).join(' ');
  g += `<path d="${line}" fill="none" stroke="#8ce4e0" stroke-width="2.4" stroke-linejoin="round"/>` + rows.map((r, i) => `<circle cx="${x(i).toFixed(1)}" cy="${y(r.w).toFixed(1)}" r="${i===n-1?4.5:3}" fill="#8ce4e0"><title>${r.label} · ${f1(r.w)}kg${view==='week'?` (${r.n}번 잰 평균)`:''}</title></circle>`).join('');
 }
 const marks = [0, Math.floor((n-1)/2), n-1].filter((v, i, a) => a.indexOf(v)===i).map(i => `<text x="${x(i).toFixed(1)}" y="${H-6}" text-anchor="middle" class="bf-ax">${esc(rows[i].label)}</text>`).join('');
 return `<svg class="bf-chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="체중 흐름">${g}${marks}</svg>`;
}
function changeBars(ch, goalDir){
 if(ch.length<2) return '';
 const W = CW(), H = 96, L = 40, R = 46, mid = 50, n = ch.length, max = Math.max(0.5, ...ch.map(c => Math.abs(c.d)));
 const bw = Math.min(26, (W-L-R)/n*0.7), x = i => L + (i+0.5)*(W-L-R)/n;
 const good = d => goalDir ? Math.sign(d)===goalDir || d===0 : d<=0;
 const bars = ch.map((c, i) => { const h = Math.max(2, Math.abs(c.d)/max*40); return `<rect x="${(x(i)-bw/2).toFixed(1)}" y="${(c.d>0?mid-h:mid).toFixed(1)}" width="${bw.toFixed(1)}" height="${h.toFixed(1)}" rx="3" fill="${good(c.d)?'#6fd6a3':'#ff7b7b'}"><title>${c.label} 주: ${c.d>0?'+':''}${f1(c.d)}kg</title></rect>`; }).join('');
 const lab = [0, n-1].map(i => `<text x="${x(i).toFixed(1)}" y="${H-4}" text-anchor="middle" class="bf-ax">${esc(ch[i].label)}</text>`).join('');
 return `<div class="bf-sub"><b>주간 변화</b><small>지난주 평균보다 ${goalDir>0?'늘면':'줄면'} 초록, 반대면 빨강</small></div><svg class="bf-bars" viewBox="0 0 ${W} ${H}" role="img" aria-label="주간 체중 변화 막대"><line x1="${L}" x2="${W-R}" y1="${mid}" y2="${mid}" stroke="#fff" stroke-opacity=".2"/><text x="${L-6}" y="${mid+4}" text-anchor="end" class="bf-ax">0</text>${bars}${lab}</svg><p class="bf-last">이번 주 <b class="${good(ch.at(-1).d)?'good':'bad'}">${ch.at(-1).d>0?'+':''}${f1(ch.at(-1).d)}kg</b> · 지난 ${n}주 중 ${ch.filter(c => good(c.d)).length}주가 목표 쪽</p>`;
}
function compositionCard(db){
 const ib = inbodyRecords(db).filter(x => Number(x.weight)>0 && (x.skeletalMuscle!=null || x.bodyFatMass!=null)).slice(-6);
 if(!ib.length) return '';
 const W = CW(), H = 150, n = ib.length, bw = Math.min(56, (W-80)/n*0.6), max = Math.max(...ib.map(x => Number(x.weight)));
 const bars = ib.map((x, i) => { const cx = 40 + (i+0.5)*(W-80)/n, m = Number(x.skeletalMuscle)||0, f = Number(x.bodyFatMass)||0, o = Math.max(0, Number(x.weight)-m-f), sc = 110/max; let yy = 124; return [[m,'#6fd6a3','골격근'],[f,'#ff7b93','체지방'],[o,'#3a4a66','그 외']].map(([v, c, l]) => { const h = v*sc; yy -= h; return `<rect x="${(cx-bw/2).toFixed(1)}" y="${yy.toFixed(1)}" width="${bw.toFixed(1)}" height="${Math.max(0, h-1).toFixed(1)}" rx="3" fill="${c}"><title>${x.date} ${l} ${f1(v)}kg</title></rect>`; }).join('') + `<text x="${cx.toFixed(1)}" y="${H-8}" text-anchor="middle" class="bf-ax">${md(x.date)}</text>`; }).join('');
 const a = ib[0], b = ib.at(-1), dm = r1((b.skeletalMuscle||0)-(a.skeletalMuscle||0)), df = r1((b.bodyFatMass||0)-(a.bodyFatMass||0));
 return `<section class="section card bf-card"><div class="bf-sub"><b>체성분 변화</b><small>인바디 ${ib.length}회</small></div><svg class="bf-bars" viewBox="0 0 ${W} ${H}" role="img" aria-label="인바디별 골격근·체지방">${bars}</svg><div class="bf-legend"><span><i style="background:#6fd6a3"></i>골격근</span><span><i style="background:#ff7b93"></i>체지방</span><span><i style="background:#3a4a66"></i>그 외</span></div>${ib.length>1?`<p class="bf-last">첫 측정보다 골격근 <b class="${dm>=0?'good':'bad'}">${dm>0?'+':''}${f1(dm)}kg</b> · 체지방 <b class="${df<=0?'good':'bad'}">${df>0?'+':''}${f1(df)}kg</b></p>`:''}</section>`;
}
function dietWithWeight(db, points, today){
 const weeks = []; let m = monday(today);
 for(let i=0; i<8; i++){ weeks.unshift(m); const d = new Date(`${m}T12:00:00`); d.setDate(d.getDate()-7); m = ymd(d); }
 const rows = weeks.map(k => { const end = new Date(`${k}T12:00:00`); end.setDate(end.getDate()+6); const e = ymd(end); const days = new Map(); for(const x of db.meals||[]) if(!x.planned && x.date>=k && x.date<=e){ if(!days.has(x.date)) days.set(x.date, []); days.get(x.date).push(x); } const kcal = days.size ? avg([...days.values()].map(ms => mealTotals(ms).calories)) : null; const ws = points.filter(p => p.date>=k && p.date<=e).map(p => p.w); return {k, kcal, w:ws.length ? avg(ws) : null}; });
 if(rows.filter(r => r.kcal!=null).length<2 || rows.filter(r => r.w!=null).length<2) return '';
 const W = CW(), H = 160, x = i => 40 + i*(W-80)/7, kmax = Math.max(...rows.map(r => r.kcal||0)) * 1.1, wv = rows.filter(r => r.w!=null).map(r => r.w), wlo = Math.min(...wv)-0.5, whi = Math.max(...wv)+0.5;
 const bars = rows.map((r, i) => r.kcal==null ? '' : `<rect x="${(x(i)-14).toFixed(1)}" y="${(130 - r.kcal/kmax*110).toFixed(1)}" width="28" height="${(r.kcal/kmax*110).toFixed(1)}" rx="4" fill="#8ce4e0" opacity=".55"><title>${md(r.k)} 주 평균 ${Math.round(r.kcal)}kcal</title></rect>`).join('');
 const pts = rows.map((r, i) => r.w==null ? null : [x(i), 20 + (whi - r.w)/(whi-wlo)*100]);
 let path = '', open = false; pts.forEach(p => { if(!p){ open = false; return; } path += `${open?'L':'M'}${p[0]} ${p[1].toFixed(1)} `; open = true; });
 return `<section class="section card bf-card"><div class="bf-sub"><b>식단과 함께</b><small>주별 평균 섭취와 체중</small></div><svg class="bf-bars" viewBox="0 0 ${W} ${H}" role="img" aria-label="주별 평균 섭취 칼로리와 체중">${bars}<path d="${path}" fill="none" stroke="#f2b49b" stroke-width="2.6"/>${pts.map((p, i) => p ? `<circle cx="${p[0]}" cy="${p[1].toFixed(1)}" r="3.5" fill="#f2b49b"><title>${md(rows[i].k)} 주 ${f1(rows[i].w)}kg</title></circle>` : '').join('')}<text x="${x(0)}" y="${H-6}" text-anchor="middle" class="bf-ax">8주 전</text><text x="${x(7)}" y="${H-6}" text-anchor="middle" class="bf-ax">이번 주</text></svg><div class="bf-legend"><span><i style="background:#8ce4e0"></i>평균 섭취 kcal</span><span><i style="background:#f2b49b"></i>체중</span></div></section>`;
}
export function weekdayPattern(points, today){
 const from = new Date(`${today}T12:00:00`); from.setDate(from.getDate()-56); const f = ymd(from);
 const recent = points.filter(p => p.date>=f); if(recent.length<10) return null;
 const wk = new Map(); for(const p of recent){ const k = monday(p.date); if(!wk.has(k)) wk.set(k, []); wk.get(k).push(p.w); }
 const dev = Array.from({length:7}, () => []);
 for(const p of recent){ const m = avg(wk.get(monday(p.date))); dev[(new Date(`${p.date}T12:00:00`).getDay()+6)%7].push(p.w - m); }
 return dev.map(a => a.length ? r1(avg(a)) : null);
}
function weekdayCard(points, today){
 const d = weekdayPattern(points, today); if(!d) return '';
 const W = CW(), H = 110, max = Math.max(0.3, ...d.filter(v => v!=null).map(Math.abs)), top = d.reduce((a, v, i) => v!=null && (a<0 || v>d[a]) ? i : a, -1);
 const bars = d.map((v, i) => { if(v==null) return ''; const x = 30 + (i+0.5)*(W-50)/7, h = Math.max(2, Math.abs(v)/max*36); return `<rect x="${x-14}" y="${(v>0?50-h:50).toFixed(1)}" width="28" height="${h.toFixed(1)}" rx="3" fill="${v>0?'#f2b49b':'#6fd6a3'}"><title>${'월화수목금토일'[i]} ${v>0?'+':''}${f1(v)}kg</title></rect><text x="${x}" y="${H-8}" text-anchor="middle" class="bf-ax">${'월화수목금토일'[i]}</text>`; }).join('');
 return `<section class="section card bf-card"><div class="bf-sub"><b>요일 패턴</b><small>최근 8주 · 그 주 평균과의 차이</small></div><svg class="bf-bars" viewBox="0 0 ${W} ${H}" role="img" aria-label="요일별 체중 차이"><line x1="40" x2="${W-20}" y1="50" y2="50" stroke="#fff" stroke-opacity=".2"/>${bars}</svg>${top>=0&&d[top]>0.1?`<p class="bf-last">${'월화수목금토일'[top]}요일에 평균보다 <b class="bad">${f1(d[top])}kg</b> 무거워요</p>`:''}</section>`;
}

export function bodyOverviewHTML(db, {view = 'day', today}){
 const points = weightPoints(db), goal = Number(db.settings?.goalWeight)||null, s = summary(points, goal, today);
 const range = view==='day' ? points.slice(-90) : points;
 const rows = bucket(range, view).slice(view==='week' ? -26 : view==='month' ? -24 : -90);
 const dayAvg = view==='day' ? rows.map((r, i) => r1(avg(rows.slice(Math.max(0, i-6), i+1).map(x => x.w)))) : [];
 const ws = rows.map(r => r.w), hi = ws.length ? Math.max(...ws) : null, lo = ws.length ? Math.min(...ws) : null;
 const hiRow = rows.find(r => r.w===hi), loRow = rows.find(r => r.w===lo);
 const goalDir = goal && s ? Math.sign(goal - s.now) || -1 : -1;
 const stat = (k, v, cls = '') => `<div><small>${k}</small><b class="${cls}">${v}</b></div>`;
 return `<section class="section card bf-top">${s ? `<div class="bf-stats">${stat('지금', `${f1(s.now)}kg`)}${stat('7일 평균', s.avg7!=null?`${f1(s.avg7)}kg`:'—')}${stat('30일 변화', s.change30!=null?`${s.change30>0?'+':''}${f1(s.change30)}kg`:'—', s.change30==null?'':Math.sign(s.change30)===goalDir||s.change30===0?'good':'bad')}${goal?stat(`목표 ${goal}kg`, s.left===0?'도착!':`${Math.abs(s.left)}kg ${s.left<0?'남음':'더'}${s.eta?` · 약 ${s.eta}주`:''}`):`<div><small>목표 체중</small><button type="button" class="text-button" data-goal-weight-open>정하기</button></div>`}</div>` : ''}
 <form id="goal-weight-form" class="bf-goal-form" hidden><label class="field">목표 체중(kg)<input name="goalWeight" type="number" inputmode="decimal" step="0.1" min="20" max="300" value="${esc(goal||'')}"></label><button class="button small">저장</button></form>
 <div class="bf-head"><div class="bf-badges">${hiRow?`<span class="bf-badge hi">최고 ${f1(hi)}kg<small>${esc(hiRow.label)}</small></span>`:''}${loRow?`<span class="bf-badge lo">최저 ${f1(lo)}kg<small>${esc(loRow.label)}</small></span>`:''}${s?`<span class="bf-badge now">현재 ${f1(s.now)}kg<small>${md(s.nowDate)}</small></span>`:''}</div><div class="df-period" role="group" aria-label="보기 단위">${[['day','일간'],['week','주간'],['month','월간']].map(([k, l]) => `<button type="button" class="${k===view?'on':''}" data-bf-view="${k}" aria-pressed="${k===view}">${l}</button>`).join('')}</div></div>
 ${mainChart(rows, view, goal, dayAvg)}
 ${view==='day'?'<p class="hint bf-note">점은 매일 잰 값, 선은 최근 7일 평균이에요. 인바디 체중은 기계가 달라 섞지 않아요.</p>':''}
 ${changeBars(weeklyChanges(points), goalDir)}
 ${goal?'<p class="hint"><button type="button" class="text-button" data-goal-weight-open>목표 체중 바꾸기</button></p>':''}
 </section>${compositionCard(db)}${dietWithWeight(db, points, today)}${weekdayCard(points, today)}`;
}
