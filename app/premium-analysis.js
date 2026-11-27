// 5.0.4 대표님: 분석은 '고급스러운' 카드로 — 목표 도달 예측, 무엇이 내 체중을 움직였나, 이번 달 vs 지난 달.
// 모두 내 기록만으로 계산한다(AI·서버 없음). 원인이라고 단정하지 않고, 확정이 아닌 범위로 보여 준다.
// 이 파일은 app.js를 import하지 않는다.
import {scaleRecords} from './body-series.js';
import {mealTotals, workoutTotals} from './domain.js';

const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));
const pad = n => String(n).padStart(2, '0');
const ymd = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const at = s => new Date(`${s}T12:00:00`);
const shift = (s, n) => { const d = at(s); d.setDate(d.getDate() + n); return ymd(d); };
const gap = (a, b) => Math.round((at(b) - at(a)) / 864e5);
const r1 = v => Math.round(v * 10) / 10;
const sgn = v => (v > 0 ? '+' : v < 0 ? '−' : '') + Math.abs(r1(v)).toFixed(1);
const n0 = v => Math.round(Number(v) || 0).toLocaleString('ko-KR');
const avg = a => a.length ? a.reduce((x, y) => x + y, 0) / a.length : null;
const md = s => `${Number(s.slice(5, 7))}/${Number(s.slice(8, 10))}`;
// 5.0.6 속도: 기록(db)이 바뀌지 않으면 다시 계산하지 않는다(화면을 다시 그릴 때마다 8주치 계산을 반복했다). db는 바뀔 때마다 새 객체라 WeakMap으로 충분.
const memo = fn => { const cache = new WeakMap(); return (db = {}, today) => { if (!db || typeof db !== 'object') return fn(db, today); let m = cache.get(db); if (!m) cache.set(db, m = new Map()); if (!m.has(today)) m.set(today, fn(db, today)); return m.get(today); }; };

// 목표 체중: 진행 중인 페이즈 목표 > 설정 목표 > 영양 프로필 목표
export function goalWeight(db = {}){
  const ph = db.settings?.phase, tg = ph?.target || {}, sw = Number(ph?.startWeight) || 0;
  return Number(tg.weight) || (sw && tg.loseKg ? r1(sw - tg.loseKg) : sw && tg.gainKg ? r1(sw + Number(tg.gainKg)) : null) || Number(db.settings?.goalWeight) || Number(db.settings?.nutritionProfile?.targetWeight) || null;
}

// 날짜별 7일 평균(체중계 체중만)
function dailyAvg(db, today, days){
  const sc = scaleRecords(db).filter(x => x.date <= today && gap(x.date, today) < days + 7);
  const out = [];
  for(let i = days - 1; i >= 0; i--){
    const d = shift(today, -i), win = sc.filter(x => x.date <= d && gap(x.date, d) < 7).map(x => Number(x.weight));
    out.push({date: d, v: win.length ? avg(win) : null, w: sc.find(x => x.date === d)?.weight ?? null});
  }
  return out;
}

// 목표 도달 예측: 최근 4주 7일 평균의 기울기(최소제곱)로 앞으로 5주. 범위는 시간이 갈수록 넓게.
export const forecast = memo(function forecast(db = {}, today){
  const series = dailyAvg(db, today, 56), pts = series.map((p, i) => ({...p, i})).filter(p => p.v != null);
  const recent = pts.filter(p => p.i >= 56 - 28);
  if(recent.length < 8) return null;
  const mx = avg(recent.map(p => p.i)), my = avg(recent.map(p => p.v));
  const slope = recent.reduce((a, p) => a + (p.i - mx) * (p.v - my), 0) / (recent.reduce((a, p) => a + (p.i - mx) ** 2, 0) || 1);
  const now = recent.at(-1).v, goal = goalWeight(db);
  let etaDays = null;
  if(goal && Math.abs(slope) > 0.003 && Math.sign(goal - now) === Math.sign(slope)) { const d = (goal - now) / slope; if(d > 0 && d < 365) etaDays = Math.round(d); }
  return {series, slope, weekly: slope * 7, now, goal, etaDays, eta: etaDays != null ? shift(today, etaDays) : null, reached: goal != null && Math.abs(goal - now) < 0.3};
});

export function forecastHTML(f, {today} = {}){
  if(!f) return `<section class="section card pa-card"><div class="section-title"><h3>목표 도달 예측<i class="i-tip" tabindex="0" title="최근 4주 흐름을 그대로 이어 그린 거예요. 범위는 넓게 잡았고 확정이 아니에요.">i</i></h3></div><p class="hint">체중계 체중이 최근 4주에 8번 넘게 있으면, 지금 흐름으로 앞으로 5주를 그려 드려요.</p></section>`;
  const W = 360, H = 150, ahead = 35, n = f.series.length + ahead, X = i => 6 + i * (W - 12) / (n - 1);
  const futEnd = f.now + f.slope * ahead, spread = Math.max(0.6, Math.abs(f.slope) * ahead * 0.5);
  const vals = [...f.series.map(p => p.v).filter(v => v != null), futEnd - spread, futEnd + spread, ...(f.goal ? [f.goal] : [])];
  let lo = Math.min(...vals), hi = Math.max(...vals); const padv = (hi - lo) * 0.12 || 0.5; lo -= padv; hi += padv;
  const Y = v => 8 + (H - 16) * (hi - v) / (hi - lo);
  const i0 = f.series.length - 1;
  let past = '', open = false; f.series.forEach((p, i) => { if(p.v == null){ open = false; return; } past += `${open ? 'L' : 'M'}${X(i).toFixed(1)},${Y(p.v).toFixed(1)}`; open = true; });
  const cone = `M${X(i0).toFixed(1)},${Y(f.now).toFixed(1)}L${X(n - 1).toFixed(1)},${Y(futEnd + spread).toFixed(1)}L${X(n - 1).toFixed(1)},${Y(futEnd - spread).toFixed(1)}Z`;
  const step = hi - lo < 3 ? 0.5 : hi - lo < 8 ? 1 : 2; let grid = '';
  for(let v = Math.ceil(lo / step) * step; v <= hi; v += step) grid += `<line x1="0" x2="${W}" y1="${Y(v).toFixed(1)}" y2="${Y(v).toFixed(1)}" stroke="#fff" stroke-opacity=".06"/><text x="2" y="${(Y(v) - 3).toFixed(1)}" class="pa-ax">${Number.isInteger(v) ? v : v.toFixed(1)}</text>`;
  for(let i = i0; i > 0; i -= 7) grid += `<line x1="${X(i).toFixed(1)}" x2="${X(i).toFixed(1)}" y1="0" y2="${H}" stroke="#fff" stroke-opacity=".05"/>`;
  const goalLine = f.goal ? `<line x1="0" x2="${W}" y1="${Y(f.goal).toFixed(1)}" y2="${Y(f.goal).toFixed(1)}" stroke="#f2a98a" stroke-dasharray="4 4"/><text x="${W - 2}" y="${(Y(f.goal) - 4).toFixed(1)}" text-anchor="end" class="pa-goal">목표 ${f.goal}</text>` : '';
  const head = f.reached ? '목표 체중 근처에 도착했어요' : f.eta ? `지금 흐름이면 <b>${Number(f.eta.slice(5, 7))}월 ${Number(f.eta.slice(8, 10))}일</b>쯤 목표에 닿아요` : f.goal ? '지금 흐름으로는 아직 목표 쪽으로 움직이지 않아요' : '목표 체중을 정하면 언제쯤 닿을지 알려 드려요';
  return `<section class="section card pa-card"><div class="section-title"><h3>목표 도달 예측<i class="i-tip" tabindex="0" title="최근 4주 흐름을 그대로 이어 그린 거예요. 범위는 넓게 잡았고 확정이 아니에요.">i</i></h3></div><p class="pa-head">${head}</p><div class="pa-stats"><div><small>최근 7일 평균</small><b>${f.now.toFixed(1)}kg</b></div><div><small>한 주 흐름</small><b>${sgn(f.weekly)}kg</b></div><div><small>5주 뒤 범위</small><b>${(futEnd - spread).toFixed(1)}~${(futEnd + spread).toFixed(1)}</b></div></div><svg class="pa-chart" viewBox="0 0 ${W} ${H + 16}" role="img" aria-label="최근 8주 체중 흐름과 앞으로 5주 예측">${grid}<path d="${cone}" fill="#b8aaf2" opacity=".2"/>${goalLine}<path d="${past}" fill="none" stroke="#8ce4e0" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/><path d="M${X(i0).toFixed(1)},${Y(f.now).toFixed(1)}L${X(n - 1).toFixed(1)},${Y(futEnd).toFixed(1)}" stroke="#b8aaf2" stroke-width="2.5" stroke-dasharray="5 5"/><circle cx="${X(i0).toFixed(1)}" cy="${Y(f.now).toFixed(1)}" r="4.5" fill="#8ce4e0"/><text x="${X(0).toFixed(1)}" y="${H + 13}" class="pa-ax">${md(f.series[0].date)}</text><text x="${X(i0).toFixed(1)}" y="${H + 13}" text-anchor="middle" class="pa-ax">오늘</text><text x="${X(n - 1).toFixed(1)}" y="${H + 13}" text-anchor="end" class="pa-ax">5주 뒤</text></svg><p class="hint">최근 4주 흐름을 그대로 이어 그린 거예요. 범위는 넓게 잡았고 확정이 아니에요.</p></section>`;
}

// 무엇이 내 체중을 움직였나: 그날의 습관이 '다음 날 체중 - 그 전 7일 평균'과 어떻게 함께 움직였는지(최근 8주).
export const weightDrivers = memo(function weightDrivers(db = {}, today){
  const s = db.settings || {}, sc = scaleRecords(db), byDate = new Map(sc.map(x => [x.date, Number(x.weight)]));
  const meals = (db.meals || []).filter(m => !m.planned), works = new Set((db.workouts || []).filter(w => !w.planned && !w.rest).map(w => w.date));
  const days = [];
  for(let i = 1; i <= 56; i++){
    const d = shift(today, -i), next = shift(d, 1);
    if(!byDate.has(next)) continue;
    const prev = sc.filter(x => x.date <= d && gap(x.date, d) < 7).map(x => Number(x.weight));
    if(prev.length < 2) continue;
    const ms = meals.filter(m => m.date === d), t = ms.length ? mealTotals(ms) : null;
    const late = ms.some(m => { const h = new Date(m.loggedAt).getHours(); return Number.isFinite(h) && h >= 21; });
    days.push({d, res: byDate.get(next) - avg(prev), t, late, work: works.has(d)});
  }
  const pg = Number(s.proteinGoal) || 0, cg = Number(s.carbsGoal) || 0, kg = Number(s.calorieGoal) || 0;
  const rules = [
    pg && ['단백질을 목표만큼 채운 날의 다음 날', x => x.t ? x.t.protein >= pg : null],
    cg && ['탄수화물을 목표보다 20% 넘게 먹은 날의 다음 날', x => x.t ? x.t.carbs >= cg * 1.2 : null],
    kg && ['칼로리를 목표보다 덜 먹은 날의 다음 날', x => x.t ? x.t.calories < kg * 0.95 : null],
    ['밤 9시 넘어 먹은 날의 다음 날', x => x.t ? x.late : null],
    ['운동한 날의 다음 날', x => x.work],
  ].filter(Boolean);
  const out = [];
  for(const [label, test] of rules){
    const yes = days.filter(x => test(x) === true).map(x => x.res), no = days.filter(x => test(x) === false).map(x => x.res);
    if(yes.length < 3 || no.length < 3) continue;
    const delta = avg(yes) - avg(no); if(Math.abs(delta) < 0.05) continue;
    out.push({label, delta, n: yes.length});
  }
  return {rows: out.sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta)).slice(0, 4), days: days.length};
});

export function driversHTML(r){
  const rows = r?.rows || [];
  const max = Math.max(0.3, ...rows.map(x => Math.abs(x.delta)));
  const body = rows.length ? `<div class="pa-corr">${rows.map(x => `<div><span>${esc(x.label)}</span><i aria-hidden="true"><em style="${x.delta < 0 ? `right:50%;width:${Math.abs(x.delta) / max * 50}%;background:#6fd6a3` : `left:50%;width:${x.delta / max * 50}%;background:#f2a98a`}"></em></i><b class="${x.delta < 0 ? 'dn' : 'up'}">${sgn(x.delta)}kg</b><small>${x.n}번 · ${x.delta < 0 ? '다른 날보다 가벼웠어요' : '다른 날보다 무거웠어요 — 대부분 수분이라 2~3일이면 돌아와요'}</small></div>`).join('')}</div>` : `<p class="hint">체중과 식단·운동 기록이 같은 날에 더 쌓이면 보여 드려요(최근 8주, 다음 날 체중이 있는 날 ${r?.days || 0}일).</p>`;
  return `<section class="section card pa-card"><div class="section-title"><h3>무엇이 내 체중을 움직였나<i class="i-tip" tabindex="0" title="최근 8주 내 기록에서 찾은 관계예요. 다음 날 체중이 그 전 7일 평균보다 얼마나 달랐는지 비교했어요. 원인이라고 단정하진 않아요.">i</i></h3><span class="pa-badge">플러스</span></div><p class="hint" style="margin-top:0">최근 8주 내 기록에서 찾은 관계예요. 다음 날 체중이 그 전 7일 평균보다 얼마나 달랐는지 비교했어요. 원인이라고 단정하진 않아요.</p>${body}</section>`;
}

// 이번 달 vs 지난 달(같은 날짜까지)
export const monthCompare = memo(function monthCompare(db = {}, today){
  const d = Number(today.slice(8, 10)), ym = today.slice(0, 7), last = (() => { const x = at(`${ym}-01`); x.setMonth(x.getMonth() - 1); return ymd(x).slice(0, 7); })();
  const range = m => [`${m}-01`, `${m}-${pad(Math.min(d, new Date(Number(m.slice(0, 4)), Number(m.slice(5, 7)), 0).getDate()))}`];
  const sc = scaleRecords(db);
  const stat = m => {
    const [a, b] = range(m), inR = x => x.date >= a && x.date <= b;
    const meals = (db.meals || []).filter(x => !x.planned && inR(x)), dates = [...new Set(meals.map(x => x.date))];
    const perDay = dates.map(dt => mealTotals(meals.filter(x => x.date === dt)));
    const ws = (db.workouts || []).filter(w => !w.planned && !w.rest && inR(w));
    const ww = sc.filter(inR);
    return {kcal: avg(perDay.map(t => t.calories)), protein: avg(perDay.map(t => t.protein)), workDays: new Set(ws.map(w => w.date)).size, volume: ws.reduce((s, w) => s + (workoutTotals(w).volume || 0), 0), weight: ww.length > 1 ? ww.at(-1).weight - ww[0].weight : null};
  };
  return {now: stat(ym), prev: stat(last), label: [Number(ym.slice(5)), Number(last.slice(5))], day: d};
});

export function monthHTML(c, {lose = true} = {}){
  const tons = v => v >= 1000 ? `${(v / 1000).toFixed(1)}t` : `${n0(v)}kg`;
  const row = (label, a, b, fmt, better) => { const has = a != null && b != null, diff = has ? a - b : null, good = diff == null || diff === 0 ? '' : (better(diff) ? 'up' : 'dn'); return `<tr><td>${label}</td><td>${a == null ? '—' : fmt(a)}</td><td>${b == null ? '—' : fmt(b)}</td><td class="${good}">${diff == null || Math.abs(diff) < 1e-9 ? '' : (diff > 0 ? '+' : '−') + fmt(Math.abs(diff)).replace(/^[+−]/, '')}</td></tr>`; };
  const t = c.now, p = c.prev;
  /* 2026-11-27 대표님: 지난달 기록이 없으면 — 만 남는 표 대신 한 줄 */if(['kcal','protein','volume','weight'].filter(k => p[k] != null && p[k] !== 0).length < 2) return `<section class="section card pa-card"><div class="section-title"><h3>이번 달 vs 지난 달</h3><span class="pa-badge">플러스</span></div><p class="pa-one">${c.label[1]}월 기록이 쌓이면 나란히 비교해요.</p></section>`;
  return `<section class="section card pa-card"><div class="section-title"><h3>이번 달 vs 지난 달</h3><span class="pa-badge">플러스</span></div><p class="pa-sub">${c.label[0]}월 1~${c.day}일과 ${c.label[1]}월 같은 기간을 나란히 놓았어요.</p><table class="pa-cmp"><thead><tr><th></th><th>${c.label[0]}월</th><th>${c.label[1]}월</th><th></th></tr></thead><tbody>${row('하루 평균 칼로리', t.kcal, p.kcal, v => `${n0(v)}`, d => lose ? d < 0 : d > 0)}${row('하루 평균 단백질', t.protein, p.protein, v => `${n0(v)}g`, d => d > 0)}${row('운동한 날', t.workDays, p.workDays, v => `${v}일`, d => d > 0)}${row('들어 올린 무게', t.volume || null, p.volume || null, tons, d => d > 0)}${row('체중 변화', t.weight, p.weight, v => `${sgn(v)}kg`, d => lose ? d < 0 : d > 0)}</tbody></table></section>`;
}
