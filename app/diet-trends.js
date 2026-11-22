// 4.3.0 식단 흐름(대표님 요청): 식단 점수·칼로리·탄수·단백질·지방을 색깔별 그래프로. 예정 식사는 넣지 않는다.
// 식단 점수(100점) — 목표 칼로리와 목표 탄단지 기준
//  · 칼로리 40점: 목표 ±5% 안이면 만점, ±50% 벗어나면 0점(그 사이 직선)
//  · 단백질 25점: 모자라면 더 크게 깎고(목표의 40%면 0점), 넘치는 건 130%까지 괜찮다
//  · 탄수 20점·지방 15점: ±10% 안이면 만점, ±60% 벗어나면 0점
//  탄단지 목표가 없으면 칼로리만으로 100점 환산.
import {mealTotals} from './domain.js';

const esc = v => String(v??'').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const pad = n => String(n).padStart(2, '0');
const ymd = d => `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
const clamp = v => Math.max(0, Math.min(1, v));
const band = (d, full, zero) => d<=full ? 1 : d>=zero ? 0 : 1 - (d-full)/(zero-full);
const CW = () => Math.max(320, Math.min(760, ((globalThis.innerWidth||700) > 760 ? 760 : (globalThis.innerWidth||700) - 56)));
const n0 = v => Math.round(Number(v)||0).toLocaleString('ko-KR');

export const METRICS = [
 ['score','식단 점수','점','#b8aaf2'],
 ['calories','칼로리','kcal','#8ce4e0'],
 ['carbs','탄수화물','g','#f0d466'],
 ['protein','단백질','g','#6fd6a3'],
 ['fat','지방','g','#ff7b93'],
];

export function dietScore(t, s = {}){
 const goal = Number(s.calorieGoal)||0;
 if(!t || !goal || !(t.calories>0)) return null;
 const cal = band(Math.abs(t.calories/goal - 1), 0.05, 0.5);
 const g = k => Number(s[`${k}Goal`])||0;
 if(!g('carbs') || !g('protein') || !g('fat')) return {total:Math.round(cal*100), parts:{calories:Math.round(cal*100)}};
 const pm = t.protein/g('protein');
 const pro = clamp(1 - Math.max(0, 1-pm)/0.6 - Math.max(0, pm-1.3)/1.0);
 const carb = band(Math.abs(t.carbs/g('carbs') - 1), 0.1, 0.6);
 const fat = band(Math.abs(t.fat/g('fat') - 1), 0.1, 0.6);
 const parts = {calories:Math.round(cal*40), protein:Math.round(pro*25), carbs:Math.round(carb*20), fat:Math.round(fat*15)};
 return {total:parts.calories + parts.protein + parts.carbs + parts.fat, parts};
}
export const scoreWord = v => v==null ? '' : v>=90 ? '아주 좋아요' : v>=75 ? '좋아요' : v>=60 ? '보통' : '아쉬워요';

// 날짜별 값(예정 제외). end까지 days일.
export function dietSeries(db, {days = 30, end} = {}){
 const e = new Date(`${end||ymd(new Date())}T12:00:00`), out = [], s = db.settings||{};
 for(let i=days-1; i>=0; i--){
  const d = new Date(e); d.setDate(e.getDate()-i); const date = ymd(d);
  const meals = (db.meals||[]).filter(m => m.date===date && !m.planned);
  if(!meals.length){ out.push({date, calories:null, carbs:null, protein:null, fat:null, score:null}); continue; }
  const t = mealTotals(meals), sc = dietScore(t, s);
  out.push({date, calories:t.calories, carbs:t.carbs, protein:t.protein, fat:t.fat, score:sc?.total ?? null, parts:sc?.parts||null});
 }
 return out;
}

function chartSVG(series, metric, goal){
 const [, , unit, color] = METRICS.find(m => m[0]===metric);
 const vals = series.map(x => x[metric]);
 const has = vals.filter(v => v!=null);
 if(!has.length) return '<p class="hint df-empty">이 기간에는 기록이 없어요.</p>';
 const W = CW(), H = 210, L = 44, R = 10, T = 14, B = 26, n = series.length;
 const max = metric==='score' ? 100 : Math.max(goal||0, ...has) * 1.12 || 1;
 const x = i => L + (n===1 ? (W-L-R)/2 : i*(W-L-R)/(n-1));
 const y = v => T + (H-T-B)*(1 - v/max);
 const bw = Math.max(3, Math.min(18, (W-L-R)/n*0.62));
 let body = '';
 if(metric==='score'){
  body += `<rect x="${L}" y="${y(100)}" width="${W-L-R}" height="${y(80)-y(100)}" fill="${color}" opacity=".08"/>`;
  const pts = series.map((s, i) => s.score==null ? null : [x(i), y(s.score)]);
  let path = '', open = false;
  pts.forEach(p => { if(!p){ open = false; return; } path += `${open?'L':'M'}${p[0].toFixed(1)} ${p[1].toFixed(1)} `; open = true; });
  body += `<path d="${path}" fill="none" stroke="${color}" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"/>`;
  body += pts.map((p, i) => p ? `<circle cx="${p[0].toFixed(1)}" cy="${p[1].toFixed(1)}" r="${i===n-1?5:3.2}" fill="${color}"><title>${series[i].date.slice(5).replace('-','/')} · ${series[i].score}점</title></circle>` : '').join('');
 } else {
  body += series.map((s, i) => s[metric]==null ? '' : `<rect x="${(x(i)-bw/2).toFixed(1)}" y="${y(s[metric]).toFixed(1)}" width="${bw.toFixed(1)}" height="${(y(0)-y(s[metric])).toFixed(1)}" rx="${Math.min(4, bw/2).toFixed(1)}" fill="${color}" opacity="${i===n-1?1:.78}"><title>${s.date.slice(5).replace('-','/')} · ${n0(s[metric])}${unit}</title></rect>`).join('');
 }
 const gl = metric==='score' ? 80 : goal;
 const guide = gl ? `<line x1="${L}" x2="${W-R}" y1="${y(gl)}" y2="${y(gl)}" stroke="#edf4f8" stroke-opacity=".55" stroke-dasharray="5 5"/><text x="${W-R}" y="${y(gl)-5}" text-anchor="end" class="df-ax">${metric==='score'?'80점':`목표 ${n0(gl)}`}</text>` : '';
 const ticks = [0, max/2, max].map(v => `<text x="${L-6}" y="${(y(v)+4).toFixed(1)}" text-anchor="end" class="df-ax">${n0(v)}</text><line x1="${L}" x2="${W-R}" y1="${y(v)}" y2="${y(v)}" stroke="#ffffff" stroke-opacity=".06"/>`).join('');
 const labs = [0, Math.floor((n-1)/2), n-1].filter((v, i, a) => a.indexOf(v)===i).map(i => `<text x="${x(i)}" y="${H-6}" text-anchor="middle" class="df-ax">${series[i].date.slice(5).replace('-','/')}</text>`).join('');
 return `<svg class="df-chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(METRICS.find(m => m[0]===metric)[1])} ${n}일 그래프">${ticks}${body}${guide}${labs}</svg>`;
}

export function dietFlowHTML(db, {metric = 'score', period = 30, end} = {}){
 const s = db.settings||{}, series = dietSeries(db, {days:period, end});
 const goal = metric==='score' ? null : metric==='calories' ? Number(s.calorieGoal)||null : Number(s[`${metric}Goal`])||null;
 const rec = series.filter(x => x[metric]!=null), avg = rec.length ? rec.reduce((a, x) => a + x[metric], 0)/rec.length : null;
 const [, label, unit, color] = METRICS.find(m => m[0]===metric);
 const last = series.at(-1), lastScore = last.score;
 const hit = metric==='score' ? rec.filter(x => x.score>=80).length : goal ? rec.filter(x => Math.abs(x[metric]/goal - 1) <= 0.1).length : null;
 const stats = [
  ['기록한 날', `${rec.length}일`],
  ['평균', avg==null ? '—' : `${n0(avg)}${unit}`],
  hit==null ? null : [metric==='score' ? '80점 이상' : '목표 ±10%', `${hit}일`],
 ].filter(Boolean);
 return `<section class="section card diet-flow" style="--df:${color}"><div class="df-head"><h3>식단 흐름</h3>${lastScore!=null?`<span class="df-today" title="이 날의 식단 점수">이 날 <b>${lastScore}점</b> · ${scoreWord(lastScore)}</span>`:''}</div>
 <div class="df-tabs" role="tablist" aria-label="보고 싶은 값">${METRICS.map(([k, l, , c]) => `<button type="button" role="tab" class="df-tab${k===metric?' on':''}" style="--c:${c}" data-df-metric="${k}" aria-selected="${k===metric}">${l}</button>`).join('')}</div>
 <div class="df-period" role="group" aria-label="기간">${[[7,'1주'],[30,'1달'],[90,'3달']].map(([d, l]) => `<button type="button" class="${d===period?'on':''}" data-df-period="${d}" aria-pressed="${d===period}">${l}</button>`).join('')}</div>
 ${chartSVG(series, metric, goal)}
 <div class="df-stats">${stats.map(([k, v]) => `<div><small>${k}</small><b>${v}</b></div>`).join('')}</div>
 ${metric==='score'?`<details class="df-how"><summary>점수는 이렇게 매겨요</summary><p>목표 칼로리에 가까울수록 최대 40점(±5% 안이면 만점), 단백질은 목표를 채울수록 최대 25점(130%까지는 넘쳐도 괜찮아요), 탄수 20점·지방 15점은 목표 ±10% 안이면 만점이에요. 탄단지 목표가 없으면 칼로리만으로 매겨요. 예정 식사는 넣지 않아요.</p>${last.parts&&last.parts.protein!=null?`<p class="df-parts">이 날: 칼로리 ${last.parts.calories}/40 · 단백질 ${last.parts.protein}/25 · 탄수 ${last.parts.carbs}/20 · 지방 ${last.parts.fat}/15</p>`:''}</details>`:''}
 </section>`;
}
