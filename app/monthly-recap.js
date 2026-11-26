// 5.4.7 한 달 리캡(대표님 확정 3+4안): 위 = 헤일로로 그린 실존 별자리, 아래 = 몸 · 운동 · 식단 + 이달의 업적 · 마일스톤.
// 점수·등급은 사용자에게 보이지 않는다(별자리로만). 칭찬만, 숫자는 그달 기록으로만 계산.
// 이 모듈은 app.js를 import하지 않는다.
import {TIERS, STARS, haloSky} from './recap-stars.js';
import {dayRecords} from './halo.js';
import {prefsOf} from './prefs.js';
import {workoutTotals} from './domain.js';

const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));
const p2 = n => String(n).padStart(2, '0');
const md = d => `${Number(d.slice(5, 7))}/${Number(d.slice(8, 10))}`;
const n1 = v => (Math.round(v * 10) / 10).toLocaleString('ko-KR');
const sign = v => (v > 0 ? '+' : v < 0 ? '−' : '') + n1(Math.abs(v));
const lastDay = ym => { const [y, m] = ym.split('-').map(Number); return new Date(y, m, 0).getDate(); };
const pace = (km, min) => { if(!(km > 0 && min > 0)) return null; const s = Math.round(min * 60 / km); return {sec: s, text: `${Math.floor(s / 60)}:${p2(s % 60)}`}; };
const isCardio = e => e.kind === 'cardio' || e.part === '유산소';
const isPilates = e => e.part === '필라테스' || /필라테스/.test(e.name || '');
const doneSets = e => (e.sets || []).filter(s => s.completed !== false);
const exKey = e => e.exerciseId || e.name;
const real = w => !w.planned && !w.rest;

// 내부 점수(0~100): 운동 50 + 식단 50 → 같은 구간 안 1·2·3등급(보이지 않음)
export function monthScore({workoutDays = 0, prCount = 0, recordDays = 1, calorieOkDays = 0, proteinOkDays = 0} = {}){
  const r = (a, b) => Math.max(0, Math.min(1, b ? a / b : 0));
  return Math.round(r(workoutDays, 16) * 30 + r(prCount, 5) * 20 + r(calorieOkDays, recordDays) * 30 + r(proteinOkDays, recordDays) * 20);
}
export function pickStar(halos, facts){
  if(!(halos >= 1)) return null;
  const t = halos >= 26 ? 4 : halos >= 21 ? 3 : halos >= 16 ? 2 : halos >= 11 ? 1 : 0, s = monthScore(facts);
  return TIERS[t].ids[s >= 70 ? 0 : s >= 45 ? 1 : 2];
}

export function buildRecap(db, today){
  const ym = today.slice(0, 7), endDay = lastDay(ym), todayDay = Number(today.slice(8, 10)), days = [];
  for(let d = 1; d <= todayDay; d++) days.push(`${ym}-${p2(d)}`);
  const inMonth = x => String(x.date || '').startsWith(ym) && x.date <= today;
  const tracks = prefsOf(db).tracks || ['workout', 'meal', 'body'];
  // 헤일로: 고른 기록을 모두 채운 날
  let halos = 0, streak = 0, best = 0; const streakDays = {};
  for(const d of days){ const kinds = new Set(dayRecords(db, d).map(r => r.kind)); if(tracks.every(k => kinds.has(k))){ halos++; streak++; best = Math.max(best, streak); if([7, 15, 21].includes(streak) && !streakDays[streak]) streakDays[streak] = d; } else streak = 0; }
  // 운동
  const ws = (db.workouts || []).filter(w => inMonth(w) && real(w)).sort((a, b) => a.date.localeCompare(b.date));
  const before = (db.workouts || []).filter(w => real(w) && String(w.date) < `${ym}-01`);
  let sets = 0, volume = 0, pilMin = 0; const weeks = [0, 0, 0, 0, 0];
  for(const w of ws){ const t = workoutTotals(w); sets += t.sets; volume += t.volume; weeks[Math.min(4, Math.floor((Number(w.date.slice(8, 10)) - 1) / 7))] += t.volume; for(const e of w.exercises || []) if(isPilates(e)) pilMin += Number(e.durationMin) || 0; }
  const workoutDays = new Set(ws.map(w => w.date)).size, restDays = (db.workouts || []).filter(w => inMonth(w) && w.rest).length;
  const prevMax = new Map(); for(const w of before) for(const e of w.exercises || []){ if(isCardio(e) || isPilates(e)) continue; const m = Math.max(0, ...doneSets(e).map(s => Number(s.weight) || 0)); if(m > 0) prevMax.set(exKey(e), Math.max(prevMax.get(exKey(e)) || 0, m)); }
  const ex = new Map();
  for(const w of ws) for(const e of w.exercises || []){
    if(isCardio(e) || isPilates(e)) continue;
    const m = Math.max(0, ...doneSets(e).map(s => Number(s.weight) || 0)); if(!(m > 0)) continue;
    const k = exKey(e), x = ex.get(k) || {name: e.name, first: m, last: m, max: m, maxDate: w.date};
    x.last = m; if(m > x.max){ x.max = m; x.maxDate = w.date; } ex.set(k, x);
  }
  const growth = [...ex.values()].filter(x => x.last > x.first).map(x => ({...x, pct: Math.round((x.last - x.first) / x.first * 100)})).sort((a, b) => b.pct - a.pct).slice(0, 6);
  const prs = [...ex.entries()].map(([k, x]) => ({...x, prev: prevMax.get(k) || 0})).filter(x => x.prev ? x.max > x.prev : x.max > x.first).map(x => ({...x, gain: x.max - (x.prev || x.first)})).sort((a, b) => b.gain - a.gain);
  // 러닝 페이스
  const runs = []; for(const w of ws) for(const e of w.exercises || []) if(isCardio(e)){ const p = pace(Number(e.distanceKm), Number(e.durationMin)); if(p) runs.push({date: w.date, km: Number(e.distanceKm), min: Number(e.durationMin), ...p}); }
  const bestRun = runs.slice().sort((a, b) => a.sec - b.sec)[0] || null, firstRun = runs[0] || null;
  // 몸
  const scale = (db.body || []).filter(b => inMonth(b) && Number(b.weight) > 0).sort((a, b) => a.date.localeCompare(b.date));
  const w0 = scale[0], w1 = scale.at(-1), wMin = scale.slice().sort((a, b) => a.weight - b.weight)[0];
  const inb = (db.body || []).filter(b => inMonth(b) && (Number(b.bodyFatPct) > 0 || Number(b.skeletalMuscle) > 0)).sort((a, b) => a.date.localeCompare(b.date));
  const fat = inb.filter(b => Number(b.bodyFatPct) > 0), mus = inb.filter(b => Number(b.skeletalMuscle) > 0);
  // 식단
  const s = db.settings || {}, kGoal = Number(s.calorieGoal) || 0, pGoal = Number(s.proteinGoal) || 0, byDay = new Map(); let foods = 0; const groups = new Set();
  for(const m of (db.meals || [])){ if(!inMonth(m) || m.planned) continue; foods++; groups.add(m.mealGroupId || `${m.date}|${m.slot}`); const d = byDay.get(m.date) || {k: 0, p: 0}; d.k += Number(m.calories) || 0; d.p += Number(m.protein) || 0; byDay.set(m.date, d); }
  const mealDays = byDay.size, kcalOk = kGoal ? [...byDay.values()].filter(d => d.k > 0 && d.k <= kGoal).length : 0, pOk = pGoal ? [...byDay.values()].filter(d => d.p >= pGoal).length : 0;
  const maxP = [...byDay.entries()].sort((a, b) => b[1].p - a[1].p)[0];
  const dietDots = days.map(d => { const x = byDay.get(d); return !x ? 'none' : kGoal && x.k > kGoal ? 'over' : 'ok'; });
  // 마일스톤(날짜순, 그달 처음 해낸 것 · 가장 높이 간 것)
  const ms = [];
  const firstOf = (test, label, sub) => { const hadBefore = before.some(w => (w.exercises || []).some(test)); if(hadBefore) return; const w = ws.find(w => (w.exercises || []).some(test)); if(w) ms.push({date: w.date, title: label, sub}); };
  firstOf(isCardio, '첫 유산소 기록', firstRun ? `${n1(firstRun.km)}km · ${firstRun.min}분` : '');
  firstOf(isPilates, '첫 필라테스', '');
  if(streakDays[7]) ms.push({date: streakDays[7], title: '헤일로 7일 연속', sub: '일주일 내내 빠짐없이'});
  if(streakDays[15]) ms.push({date: streakDays[15], title: '보름 연속 헤일로', sub: '반달 동안 하루도 안 빠졌어요'});
  if(prs[0]) ms.push({date: prs[0].maxDate, title: `${prs[0].name} ${n1(prs[0].max)}kg`, sub: '이달 가장 크게 늘어난 무게'});
  if(bestRun && runs.length > 1 && bestRun.sec < firstRun.sec) ms.push({date: bestRun.date, title: `가장 빠른 러닝 ${bestRun.text}/km`, sub: `${n1(bestRun.km)}km`});
  if(wMin && w0 && wMin.weight < w0.weight) ms.push({date: wMin.date, title: `가장 가벼운 날 ${n1(wMin.weight)}kg`, sub: `${md(w0.date)}보다 ${sign(wMin.weight - w0.weight)}kg`});
  ms.sort((a, b) => a.date.localeCompare(b.date));
  const facts = {workoutDays, prCount: prs.length, recordDays: Math.max(1, mealDays), calorieOkDays: kcalOk, proteinOkDays: pOk};
  return {ym, month: Number(ym.slice(5, 7)), endDay, todayDay, done: todayDay >= endDay, days, halos, bestStreak: best, star: pickStar(halos, facts),
    workoutDays, restDays, sets, volume, weeks: weeks.slice(0, Math.ceil(todayDay / 7)), growth, prs: prs.slice(0, 6), pilMin, bestRun, firstRun,
    weight: w0 && w1 ? {from: w0.weight, to: w1.weight, series: scale.map(b => b.weight)} : null, wMin,
    fat: fat.length > 1 ? {from: fat[0].bodyFatPct, to: fat.at(-1).bodyFatPct} : null, mus: mus.length > 1 ? {from: mus[0].skeletalMuscle, to: mus.at(-1).skeletalMuscle} : null,
    foods, meals: groups.size, mealDays, kGoal, kcalOk, pGoal, pOk, maxP: maxP ? {date: maxP[0], p: Math.round(maxP[1].p)} : null, dietDots, milestones: ms.slice(-6)};
}

const spark = vals => { if(vals.length < 2) return ''; const lo = Math.min(...vals), hi = Math.max(...vals), r = hi - lo || 1; return `<svg viewBox="0 0 200 50" preserveAspectRatio="none" aria-hidden="true"><polyline points="${vals.map((v, i) => `${Math.round(i / (vals.length - 1) * 200)},${Math.round(6 + (hi - v) / r * 38)}`).join(' ')}" fill="none" stroke="#8ce4e0" stroke-width="2"/></svg>`; };

export function recapHTML(r){
  if(!r) return '';
  const tons = v => v >= 1000 ? `${n1(v / 1000)}t` : `${Math.round(v)}kg`;
  const c = r.star ? STARS[r.star] : null;
  const top = c ? `<div class="mr-top"><div class="mr-sky">${haloSky(r.star, {halos: r.halos, w: 176, h: 176, pad: 10})}</div><div><small>${r.month}월 · 헤일로 ${r.halos}개</small><h3>${esc(c.ko)}${r.done ? '를<br><em>완성했어요</em>' : '를<br><em>그리는 중이에요</em>'}</h3><p>${esc(c.story)}</p></div></div>`
    : `<div class="mr-top mr-empty"><p>헤일로를 하나 채우면 이달의 첫 별이 떠요.</p></div>`;
  const body = r.weight ? `<div class="mr-card"><h4>몸 <span>${r.fat || r.mus ? '체중 · 인바디' : '체중'}</span></h4><div class="mr-row"><div class="mr-kpi"><b>${sign(r.weight.to - r.weight.from)}<small>kg</small></b><small>${n1(r.weight.from)}<i class="mr-ar">→</i>${n1(r.weight.to)}kg</small></div>${spark(r.weight.series)}</div>${r.fat || r.mus ? `<p>${r.fat ? `체지방률 <b>${sign(r.fat.to - r.fat.from)}%p</b>` : ''}${r.fat && r.mus ? ', ' : ''}${r.mus ? `골격근 <b>${sign(r.mus.to - r.mus.from)}kg</b>` : ''}</p>` : ''}</div>` : '';
  const maxW = Math.max(1, ...r.weeks);
  const work = r.workoutDays ? `<div class="mr-card"><h4>운동 <span>${r.workoutDays}번 · ${r.sets}세트 · ${tons(r.volume)}</span></h4>${r.growth.length ? `<div class="mr-bars">${r.growth.map(g => `<div class="mr-g"><span class="mr-gn">${esc(g.name)}</span><span class="mr-gt"><i style="width:${Math.max(12, Math.round(g.pct / r.growth[0].pct * 100))}%"></i></span><span class="mr-gp">+${g.pct}%</span></div>`).join('')}</div>` : ''}${r.weeks.length > 1 ? `<div class="mr-wv">${r.weeks.map((v, i) => `<div><b>${tons(v)}</b><i style="height:${Math.max(6, Math.round(v / maxW * 86))}%"></i>${i + 1}주</div>`).join('')}</div>` : ''}<p>${[r.bestRun && r.firstRun && r.bestRun.sec < r.firstRun.sec ? `러닝 페이스 <b>${r.firstRun.text}<i class="mr-ar">→</i>${r.bestRun.text}/km</b>` : '', r.pilMin ? `필라테스 <b>${r.pilMin}분</b>` : '', r.restDays ? `쉬어 준 날 <b>${r.restDays}일</b>` : ''].filter(Boolean).join(', ') || '꾸준히 움직였어요.'}</p></div>` : '';
  const diet = r.mealDays ? `<div class="mr-card"><h4>식단 <span>${r.foods}개 음식 · ${r.meals}끼</span></h4><div class="mr-dots">${r.dietDots.map(x => `<i class="${x}"></i>`).join('')}</div><p>${r.kGoal ? `${r.mealDays}일 중 <b>${r.kcalOk}일</b> 목표 칼로리 안.` : `${r.mealDays}일 식사를 남겼어요.`}${r.maxP ? ` 단백질은 ${md(r.maxP.date)}에 <b>${r.maxP.p}g</b>으로 이달 최고.` : ''}</p></div>` : '';
  const prs = r.prs.length ? `<section class="mr-ach"><h4>이달의 업적</h4><div class="mr-pr">${r.prs.map(x => `<div><i aria-hidden="true">🥇</i><span><b>${esc(x.name)} ${n1(x.max)}kg</b><small>${md(x.maxDate)}</small></span><strong>+${n1(x.gain)}kg<span>${x.prev ? '이전 최고보다' : '이달 처음보다'}</span></strong></div>`).join('')}${r.bestRun ? `<div><i aria-hidden="true">🏃</i><span><b>${n1(r.bestRun.km)}km · ${r.bestRun.min}분</b><small>${md(r.bestRun.date)} · 가장 빠른 러닝</small></span><strong>${r.bestRun.text}<span>/km</span></strong></div>` : ''}</div></section>` : '';
  const ms = r.milestones.length ? `<section class="mr-ach"><h4>이달의 마일스톤</h4><div class="mr-ms">${r.milestones.map(m => `<div><span class="d">${md(m.date)}</span><b>${esc(m.title)}</b>${m.sub ? `<small>${esc(m.sub)}</small>` : ''}</div>`).join('')}</div></section>` : '';
  const end = r.done ? `<p class="mr-end"><b>${r.month}월의 나, 정말 잘했어요.</b></p>` : '';
  return `<section class="section card mr" aria-label="${r.month}월 리캡"><div class="mr-head"><b>${r.month}월 리캡</b><span class="mr-due">${r.done ? '완성' : `${r.month}월 ${r.endDay}일(말일)에 완성돼요 · 지금까지 ${r.todayDay}일`}</span></div>${top}<div class="mr-cols"><div class="mr-col">${body}${diet}</div><div class="mr-col">${work}</div></div>${prs || ms ? `<div class="mr-cols"><div class="mr-col">${prs}</div><div class="mr-col">${ms}</div></div>` : ''}${end}</section>`;
}
