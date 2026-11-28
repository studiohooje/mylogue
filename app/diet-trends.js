// 4.3.0 식단 흐름(대표님 요청): 식단 점수·칼로리·탄수·단백질·지방을 색깔별 그래프로. 예정 식사는 넣지 않는다.
// 4.4.0 탭 대신 한눈에 보는 대시보드(목표 띠형): 위층 점수·칼로리(큰 카드), 아래층 탄수·단백질·지방. 좁은 폭에서는 탄단지가 한 카드 안 목록.
// 식단 점수(100점) — 목표 칼로리와 목표 탄단지 기준
//  · 칼로리 40점: 목표 ±5% 안이면 만점, ±50% 벗어나면 0점(그 사이 직선)
//  · 단백질 25점: 모자라면 더 크게 깎고(목표의 40%면 0점), 넘치는 건 130%까지 괜찮다
//  · 탄수 20점·지방 15점: ±10% 안이면 만점, ±60% 벗어나면 0점
//  탄단지 목표가 없으면 칼로리만으로 100점 환산.
import {mealTotals} from './domain.js';
import {lineChart, hoverButton} from './band-chart.js';

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

// 5.0.4 대표님: 증량(벌크업) 중이 아니면 조금 덜 먹은 날은 깎지 않는다 — 칼로리·탄수·지방의 '괜찮은 범위'를 아래쪽으로 넓게.
//  칼로리: 목표의 75%~110%면 만점(아래로 35%에서 0점), 넘치는 쪽은 그대로(+10% 만점, +60% 0점)
//  탄수·지방: 목표의 70%~115%면 만점(아래로 30%에서 0점). 단백질은 모자라면 회복에 안 좋아 그대로.
//  증량 중(페이즈 벌크·린벌크 또는 목표 '증량')이면 예전처럼 위아래 같은 폭.
export const isGainPhase = (s = {}) => { const t = s.phase?.type, id = typeof t === 'object' ? t?.id : t; return ['bulk', 'leanbulk'].includes(id) || s.nutritionProfile?.goal === 'gain'; };
export const RANGE = (s = {}) => isGainPhase(s)
 ? {calories:[0.9, 1.1], carbs:[0.85, 1.15], fat:[0.85, 1.15], protein:[0.95, 1.35]}
 : {calories:[0.75, 1.1], carbs:[0.7, 1.15], fat:[0.7, 1.15], protein:[0.95, 1.35]};
const side = (r, [lo, hi], loZero, hiZero) => r < lo ? clamp(1 - (lo - r) / (lo - loZero)) : r > hi ? clamp(1 - (r - hi) / (hiZero - hi)) : 1;
export function dietScore(t, s = {}){
 const goal = Number(s.calorieGoal)||0;
 if(!t || !goal || !(t.calories>0)) return null;
 const gain = isGainPhase(s), R = RANGE(s);
 // 4.28.0 대표님: 목표 근처에서 조금 넘친 날(칼로리 +11%·탄수 +18%)이 91점은 짜다 → 만점 구간과 감점 폭을 넓힘. 저장값이 아니라 그때그때 계산이라 지난 날짜에도 그대로 적용된다.
 const cal = side(t.calories/goal, R.calories, gain ? 0.4 : 0.35, 1.6);
 const g = k => Number(s[`${k}Goal`])||0;
 if(!g('carbs') || !g('protein') || !g('fat')) return {total:Math.round(cal*100), parts:{calories:Math.round(cal*100)}};
 const pm = t.protein/g('protein');
 const pro = clamp(1 - Math.max(0, 0.95-pm)/0.65 - Math.max(0, pm-1.35)/1.0);
 const carb = side(t.carbs/g('carbs'), R.carbs, gain ? 0.3 : 0.3, 1.7);
 const fat = side(t.fat/g('fat'), R.fat, gain ? 0.3 : 0.3, 1.7);
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

const md = d => `${Number(d.slice(5,7))}/${Number(d.slice(8,10))}`;
const PARTS = [['calories','칼로리',40],['protein','단백질',25],['carbs','탄수',20],['fat','지방',15]];
const color = k => METRICS.find(m => m[0]===k)[3];

function tile(series, k, s, big){
 const [, label, unit, c] = METRICS.find(m => m[0]===k);
 const goal = k==='score' ? null : k==='calories' ? Number(s.calorieGoal)||null : Number(s[`${k}Goal`])||null;
 const rg = RANGE(s)[k], lo = k==='score' ? 80 : goal ? goal*rg[0] : null, hi = k==='score' ? 100 : goal ? goal*rg[1] : null;
 const vals = series.map(x => x[k]), rec = vals.filter(v => v!=null), last = series.at(-1), v = last[k], n = series.length;
 const live = last.date===ymd(new Date()) && new Date().getHours()<21, done = live ? series.slice(0, -1).map(x => x[k]).filter(v => v!=null) : rec;
 const hit = lo!=null ? done.filter(x => x>=lo && x<=hi).length : null;
 const tips = series.map(x => x[k]==null ? `<span class="d">${md(x.date)}</span><b>기록 없음</b>` : `<span class="d">${md(x.date)}</span><b>${n0(x[k])}${unit}</b>${lo!=null?`<span class="s">${x[k]<lo?'범위보다 아래':x[k]>hi?'범위보다 위':'범위 안'}</span>`:''}${k==='score'&&x.parts?.protein!=null?`<span class="d">칼로리 ${x.parts.calories} · 단백질 ${x.parts.protein} · 탄수 ${x.parts.carbs} · 지방 ${x.parts.fat}</span>`:goal?`<span class="d">목표의 ${Math.round(x[k]/goal*100)}%</span>`:''}`);
 const wk = Math.round(n/7), dateL = n<=7 ? md(series[0].date) : `${wk}주 전`, dateR = n<=7 ? '이 날' : '이번 주';
 const chart = rec.length ? lineChart({vals, lo, hi, color:c, h:big ? (k==='score' ? 96 : 124) : 70, tips, dateL:big?dateL:'', dateR:big?dateR:'', label:`${label} ${n}일 그래프`}) : '<p class="hint df-empty">이 기간에는 기록이 없어요.</p>';
 const head = `<div class="df-tt"><span class="df-nm"><i></i>${label}</span>${goal?`<span class="df-goal">목표 ${n0(goal)}${unit}</span>`:''}</div>`;
 const value = k==='score'
  ? (v==null ? `<div class="df-tv"><b>—</b><small>${Number(s.calorieGoal) ? '이 날 기록이 없어요' : '목표 칼로리를 정하면 점수가 나와요'}</small></div>` : `<div class="df-tv"><b>${v}</b><small>점</small><span class="df-word">${last.date===ymd(new Date())&&new Date().getHours()<21?'오늘은 진행 중':scoreWord(v)}</span></div>`)
  : (()=>{/* 5.3.0 전수 검사: 오늘 숫자는 위 '하루 누적'에 있으니 여기선 기간 평균 */const base=(done&&done.length?done:rec).filter(x=>x!=null),av=base.length?base.reduce((a,b)=>a+b,0)/base.length:null;return `<div class="df-tv"><b>${av==null?'—':n0(av)}</b><small>${unit} · 평균${av!=null&&goal?` · 목표의 ${Math.round(av/goal*100)}%`:''}</small></div>`})();
 const parts = k==='score' && last.parts?.protein!=null ? `<div class="df-parts" aria-label="이 날 점수 구성">${PARTS.map(([pk]) => `<i style="width:${last.parts[pk]}%;background:${color(pk)}"></i>`).join('')}</div><div class="df-pl">${PARTS.map(([pk, pl, mx]) => `<span style="--pc:${color(pk)}">${pl} ${last.parts[pk]}/${mx}</span>`).join('')}</div>` : '';
 const hitRow = hit!=null && done.length ? `<div class="df-hit"><span>${k==='score'?'80점 이상':'범위 안'} ${hit}/${done.length}일${live?'':''}</span><span class="df-hbar"><i style="width:${Math.round(hit/done.length*100)}%"></i></span></div>` : '';
 return `<div class="df-tile${big?' big':''}" style="--c:${c}">${head}${value}${parts}${chart}${hitRow}</div>`;
}

// 2026-11-27 대표님: 칼로리·탄단지 그래프 4개 대신 평균 작은 칸(값·목표 대비 %). 그래프는 위 '하루 누적'의 줄을 눌러서
const AVG = [['calories','칼로리','kcal','calorieGoal','#5fd0e8'],['carbs','탄수','g','carbsGoal','#f0d466'],['protein','단백질','g','proteinGoal','#6fd6a3'],['fat','지방','g','fatGoal','#ff7b93']];
function avgChips(series, s){
 const today = ymd(new Date()), days = series.filter(x => x.calories != null && x.date !== today);
 if(!days.length) return '';
 return `<div class="df-avg">${AVG.map(([k, l, u, gk, c]) => { const v = days.reduce((a, x) => a + (Number(x[k]) || 0), 0) / days.length, g = Number(s[gk]) || 0; return `<div><span><i style="background:${c}"></i>${l}</span><b>${Math.round(v).toLocaleString('ko-KR')}<small>${u}</small></b>${g ? `<em>${Math.round(v / g * 100)}%</em>` : ''}</div>`; }).join('')}</div>`;
}
export function dietFlowHTML(db, {period = 30, end} = {}){
 const s = db.settings||{}, series = dietSeries(db, {days:period, end});
 return `<section class="section diet-flow-sec"><div class="section-title df-head"><h3>식단 흐름</h3><div class="df-tools"><div class="df-period" role="group" aria-label="기간">${[[7,'1주'],[30,'1달'],[90,'3달']].map(([d, l]) => `<button type="button" class="${d===period?'on':''}" data-df-period="${d}" aria-pressed="${d===period}">${l}</button>`).join('')}</div>${hoverButton()}</div></div><div class="card diet-flow">
 <div class="gc-legend"><span><i class="lb"></i>목표 범위</span><span><i class="ld"></i>범위 안</span><span><i class="lr"></i>범위 밖</span><span>큰 점 = ${end && end!==ymd(new Date()) ? '보는 날' : '오늘'}</span></div>
 <div class="df-grid">${tile(series, 'score', s, true)}</div>${avgChips(series, s)}
 <details class="df-how" hidden><summary>점수는 이렇게 매겨요</summary><p>목표 칼로리에 가까울수록 최대 40점(±10% 안이면 만점), 단백질은 목표의 95%를 채우면 25점 만점(135%까지는 넘쳐도 괜찮아요), 탄수 20점·지방 15점은 목표 ±15% 안이면 만점이에요. 조금 넘치거나 모자란 날은 조금만 깎아요. 탄단지 목표가 없으면 칼로리만으로 매겨요. 예정 식사는 넣지 않아요. 띠는 점수 80~100점, 나머지는 목표 ±10%예요.</p></details>
 </div></section>`;
}
