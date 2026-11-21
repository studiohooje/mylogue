// 3.18.0 체중계 체중과 인바디를 나눠 본다(대표님 결정 2026-11-21).
// - 평소 체중계 체중: 이어진 선. 홈 30일 그래프·추세·변화량은 이 값만 쓴다.
// - 인바디: 결과표에 있는 체중·골격근량·체지방량·체지방률을 별도 그래프로(잰 날에만 점).
// 구분: 기록의 measure('scale'|'inbody')가 있으면 그것을, 없으면 인바디에만 있는 값(골격근량·체지방량·점수·내장지방·기초대사량)이 있으면 인바디로 본다.
const INBODY_ONLY = ['skeletalMuscle','bodyFatMass','score','visceralFatLevel','bmr'];
export const isInbody = b => b?.measure==='inbody' || (b?.measure!=='scale' && INBODY_ONLY.some(k => b?.[k]!=null && b[k]!==''));
const byDate = (a, b) => String(a.date).localeCompare(String(b.date)) || String(a.createdAt||'').localeCompare(String(b.createdAt||''));
export const scaleRecords = db => (db.body||[]).filter(b => !isInbody(b) && Number(b.weight)>0).sort(byDate);
export const inbodyRecords = db => (db.body||[]).filter(isInbody).sort(byDate);

export function daysAgo(date, today){
 const d = Math.round((new Date(`${today}T12:00:00`) - new Date(`${date}T12:00:00`)) / 86400000);
 return d<=0 ? '오늘' : d===1 ? '어제' : `${d}일 전`;
}
const shift = (date, n) => { const d = new Date(`${date}T12:00:00`); d.setDate(d.getDate()+n); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; };

// 최근 n일 체중계 체중의 작은 선 그래프(같은 날 여러 번이면 마지막 값). 글자와 겹치지 않게 자기 칸만 쓴다.
export function weightSpark(db, today, days=30, {w=160, h=56}={}){
 const from = shift(today, -(days-1)), map = new Map();
 for(const b of scaleRecords(db)) if(b.date>=from && b.date<=today) map.set(b.date, Number(b.weight));
 const pts = [...map].sort((a, b) => a[0].localeCompare(b[0]));
 if(!pts.length) return '';
 const vals = pts.map(p => p[1]), lo = Math.min(...vals), hi = Math.max(...vals), pad = Math.max(0.3, (hi-lo)*0.15);
 const x = date => 4 + (w-8) * Math.round((new Date(`${date}T12:00:00`) - new Date(`${from}T12:00:00`)) / 86400000) / Math.max(1, days-1);
 const y = v => 4 + (h-8) * (1 - (v - (lo-pad)) / ((hi+pad) - (lo-pad)));
 const line = pts.map(([d, v]) => `${x(d).toFixed(1)},${y(v).toFixed(1)}`).join(' ');
 const [ld, lv] = pts.at(-1);
 const area = pts.length>1 ? `<polygon points="${x(pts[0][0]).toFixed(1)},${h} ${line} ${x(ld).toFixed(1)},${h}" class="spark-area"/>` : '';
 return `<svg class="weight-spark" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none" role="img" aria-label="최근 ${days}일 체중 ${pts.length}번 측정, ${lo.toFixed(1)}~${hi.toFixed(1)}kg">${area}${pts.length>1?`<polyline points="${line}" class="spark-line" vector-effect="non-scaling-stroke"/>`:''}<line x1="${x(ld).toFixed(1)}" y1="${y(lv).toFixed(1)}" x2="${x(ld).toFixed(1)}" y2="${y(lv).toFixed(1)}" class="spark-dot" vector-effect="non-scaling-stroke"/></svg>`;
}

// 3.18.0 몸 화면 그래프(여러 줄). 마우스를 올리면 커서 옆에 날짜·값(앱이 data-pts로 그림을 가리지 않게 띄움).
// series: [{name, cls, unit, pts:[{date, v}], dashed}]
const esc = v => String(v??'').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmt1 = v => Number(v).toLocaleString('ko-KR', {maximumFractionDigits:1});
export function bodyChartHTML(series, {days=30, today='', empty='아직 그래프로 표시할 기록이 없어요.', compact=false}={}){
 const H = compact ? 112 : 172;
 const from = days>=3650 || !today ? '' : shift(today, -(days-1));
 const list = series.map(s => ({...s, pts:s.pts.filter(p => p.v!=null && Number.isFinite(Number(p.v)) && (!from || p.date>=from)).map(p => ({...p, v:Number(p.v)})).sort((a, b) => a.date.localeCompare(b.date))})).filter(s => s.pts.length);
 if(!list.length) return `<div class="empty">${esc(empty)}</div>`;
 const dates = [...new Set(list.flatMap(s => s.pts.map(p => p.date)))].sort();
 const d0 = from || dates[0], d1 = today && today>dates.at(-1) && from ? today : dates.at(-1);
 const span = Math.max(1, (new Date(`${d1}T12:00:00`) - new Date(`${d0}T12:00:00`)) / 86400000);
 const vals = list.flatMap(s => s.pts.map(p => p.v)), lo = Math.min(...vals), hi = Math.max(...vals), pad = Math.max(0.5, (hi-lo)*0.12), y0 = lo-pad, y1 = hi+pad;
 const L = 40, R = 352, T = 12, B = H - 26;
 const X = d => dates.length===1 && !from ? (L+R)/2 : L + (R-L) * ((new Date(`${d}T12:00:00`) - new Date(`${d0}T12:00:00`)) / 86400000) / span;
 const Y = v => B - (B-T) * (v - y0) / (y1 - y0);
 const ticks = [y0+pad, (y0+y1)/2, y1-pad];
 const tip = dates.map(d => ({x:+X(d).toFixed(1), d, r:list.map(s => { const p = s.pts.find(q => q.date===d); return p ? [s.name, fmt1(p.v), s.unit||''] : null; }).filter(Boolean)}));
 const paths = list.map(s => `<g class="bc-series ${esc(s.cls||'')}">${s.pts.length>1?`<path d="${s.pts.map((p, i) => `${i?'L':'M'}${X(p.date).toFixed(1)},${Y(p.v).toFixed(1)}`).join(' ')}" class="bc-line${s.dashed?' dashed':''}"/>`:''}${s.dashed?'':s.pts.map(p => `<circle cx="${X(p.date).toFixed(1)}" cy="${Y(p.v).toFixed(1)}" r="3.2"/>`).join('')}</g>`).join('');
 const legend = list.length>1 ? `<div class="bc-legend">${list.map(s => `<span class="${esc(s.cls||'')}${s.dashed?' dashed':''}"><i></i>${esc(s.name)}</span>`).join('')}</div>` : '';
 return `<div class="bc-wrap">${legend}<svg class="bchart${compact?' compact':''}" viewBox="0 0 360 ${H}" role="img" aria-label="${esc(list.map(s => s.name).join('·'))} 그래프, ${esc(d0)}~${esc(d1)}" data-pts='${esc(JSON.stringify(tip))}'>${ticks.map(t => `<line class="gridline" x1="${L}" x2="${R}" y1="${Y(t).toFixed(1)}" y2="${Y(t).toFixed(1)}"/><text class="bc-ylab" x="${L-6}" y="${(Y(t)+4).toFixed(1)}" text-anchor="end">${fmt1(t)}</text>`).join('')}${paths}<line class="bc-guide" x1="0" x2="0" y1="${T}" y2="${B}" visibility="hidden"/><text class="bc-xlab" x="${L}" y="${H-6}">${esc(d0.slice(5).replace('-','/'))}</text><text class="bc-xlab" x="${R}" y="${H-6}" text-anchor="end">${esc(d1.slice(5).replace('-','/'))}</text></svg></div>`;
}
// 최근 7일 실제 측정 평균(평활 추세) — 체중계 체중만
export function smoothWeights(records){
 return records.map(r => { const end = new Date(`${r.date}T12:00:00`), win = records.filter(x => { const d = (end - new Date(`${x.date}T12:00:00`)) / 86400000; return d>=0 && d<7; }); return {date:r.date, v:win.reduce((a, x) => a + Number(x.weight), 0) / win.length}; });
}
