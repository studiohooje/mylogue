// 4.16.0 운동 화면 개선(대표님 2026-11-23): 점수 없이 '운동했다'를 칭찬하고, 내 기록을 눈으로 구경하게 한다.
// 원칙: 무게·세트로 점수를 매기지 않는다. 링은 '이번 주 운동한 날 / 주간 횟수' 하나. 재촉·비교 없음. 과하게 하면 쉬라고 말한다.
import {workoutTotals, setWeightKg, estimate1RM} from './domain.js';
import {exArtHTML} from './exercise-art-ui.js';

const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));
const DAY = 86400000;
const toD = s => new Date(`${s}T12:00:00`);
const ymd = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const addDays = (s, n) => ymd(new Date(toD(s).getTime() + n * DAY));
const mondayOf = s => { const d = toD(s); return addDays(s, -((d.getDay() + 6) % 7)); };
const fmt = (v, p = 1) => { const n = Number(v) || 0; return (Math.round(n * 10 ** p) / 10 ** p).toLocaleString('ko-KR'); };
const done = w => !w.planned;
const moved = w => done(w) && !w.rest; // 운동한 날: 휴식 기록만 있는 날은 빼고, 산책·필라테스·기억해 적은 운동 모두 포함

// ① 이번 주 운동한 날 링 + 칭찬 한 줄
export function weekMoves(db, date) {
  const mon = mondayOf(date), sun = addDays(mon, 6);
  const days = new Set((db.workouts || []).filter(w => moved(w) && w.date >= mon && w.date <= sun).map(w => w.date));
  return {mon, sun, days, count: days.size, today: days.has(date)};
}
export function praiseLine({count, today}, goal) {
  if (today) return count >= goal ? '오늘도 했어요. 이번 주도 충분히 움직였어요.' : '오늘도 했어요. 잘했어요.';
  if (count >= goal) return `이번 주 ${count}번 움직였어요. 충분히 잘하고 있어요.`;
  if (count > 0) return `이번 주 ${count}번 움직였어요.`;
  return '이번 주 첫 운동을 기다리고 있어요. 산책도 좋아요.';
}
export function weekHeroHTML(db, date, goal = 3) {
  const w = weekMoves(db, date), g = Math.max(1, goal | 0), frac = Math.min(1, w.count / g), full = w.count >= g;
  const R = 46, C = 2 * Math.PI * R;
  const dots = Array.from({length: 7}, (_, i) => { const d = addDays(w.mon, i); return `<span class="wh-dot${w.days.has(d) ? ' on' : ''}${d === date ? ' today' : ''}" title="${d}">${'월화수목금토일'[i]}</span>`; }).join('');
  return `<section class="section card week-hero${full ? ' full' : ''}" aria-label="이번 주 운동"><div class="wh-ring" role="img" aria-label="이번 주 운동한 날 ${w.count}일, 목표 ${g}일"><svg viewBox="0 0 110 110"><circle cx="55" cy="55" r="${R}" class="wh-track"/><circle cx="55" cy="55" r="${R}" class="wh-fill" stroke-dasharray="${(C * frac).toFixed(1)} ${C.toFixed(1)}" transform="rotate(-90 55 55)"/></svg><b>${w.count}<small>/${g}</small></b></div><div class="wh-text"><p class="wh-eyebrow">이번 주 운동한 날</p><h3>${esc(praiseLine(w, g))}</h3><div class="wh-dots">${dots}</div><button type="button" class="text-button wh-goal" data-week-goal>주 ${g}회 목표 바꾸기</button></div></section>`;
}

// ③ 근육 회복 상태: 부위별 마지막 운동 경과일
const PART_ORDER = ['가슴', '등', '하체', '어깨', '팔', '복근', '전신'];
export function recovery(db, date) {
  const last = {}, sets = {};
  for (const w of db.workouts || []) if (moved(w) && w.date <= date) for (const e of w.exercises || []) {
    if (e.kind === 'cardio') continue; const p = e.part || '기타';
    if (!last[p] || w.date > last[p]) last[p] = w.date;
    if (w.date > addDays(date, -7)) sets[p] = (sets[p] || 0) + (e.sets || []).filter(s => s.completed !== false).length;
  }
  return PART_ORDER.map(p => { const d = last[p]; const ago = d ? Math.round((toD(date) - toD(d)) / DAY) : null; return {part: p, ago, sets: sets[p] || 0, state: ago == null ? 'none' : ago <= 1 ? 'fresh' : ago <= 2 ? 'mid' : 'ready'}; });
}
export function recoveryHTML(db, date) {
  const r = recovery(db, date); if (r.every(x => x.state === 'none')) return '';
  const label = {fresh: '회복 중', mid: '거의 회복', ready: '준비됨', none: '기록 없음'};
  return `<section class="section card recovery-card"><h3>부위별 회복</h3><p class="hint">최근에 한 부위는 쉬게, 오래 쉰 부위는 오늘 해 보기 좋아요.</p><div class="rec-grid">${r.map(x => `<div class="rec rec-${x.state}"><b>${x.part}</b><small>${x.ago == null ? '아직 기록 없음' : `${x.ago === 0 ? '오늘' : `${x.ago}일 전`} · ${label[x.state]}`}</small></div>`).join('')}</div></section>`;
}

// 과하게 할 때 한 줄: 이번 주 세트가 지난 4주 평균의 1.5배를 넘고 30세트 이상이면
export function overreachNote(db, date) {
  const mon = mondayOf(date), weekSets = from => (db.workouts || []).filter(w => done(w) && w.date >= from && w.date <= addDays(from, 6)).reduce((a, w) => a + workoutTotals(w).sets, 0);
  const cur = weekSets(mon), prev = [1, 2, 3, 4].map(i => weekSets(addDays(mon, -7 * i))), avg = prev.reduce((a, b) => a + b, 0) / 4;
  return avg > 0 && cur >= 30 && cur > avg * 1.5 ? '이번 주는 평소보다 훨씬 많이 했어요. 회복도 운동이에요. 하루쯤 쉬어 가도 좋아요.' : '';
}

// ④ 최고 기록 카드 + 8주 추세
export function prCards(db, date, limit = 12) {
  const g = new Map();
  for (const w of db.workouts || []) if (done(w)) for (const e of w.exercises || []) {
    if (e.kind === 'cardio') continue;
    const key = e.exerciseId || e.name, x = g.get(key) || {key, name: e.name, exerciseId: e.exerciseId || null, part: e.part, best: 0, bestReps: 0, bestDate: '', best1RM: 0, days: new Set(), weeks: {}};
    for (const s of e.sets || []) { if (s.completed === false) continue; const kg = setWeightKg(s); if (kg > x.best || (kg === x.best && (s.reps || 0) > x.bestReps)) { x.best = kg; x.bestReps = s.reps || 0; x.bestDate = w.date; } x.best1RM = Math.max(x.best1RM, estimate1RM(kg, s.reps || 0)); const wk = mondayOf(w.date); x.weeks[wk] = Math.max(x.weeks[wk] || 0, kg); }
    x.days.add(w.date); g.set(key, x);
  }
  const thisMon = mondayOf(date);
  return [...g.values()].filter(x => x.best > 0).map(x => {
    const series = Array.from({length: 8}, (_, i) => x.weeks[addDays(thisMon, -7 * (7 - i))] || null);
    return {...x, sessions: x.days.size, days: undefined, series, fresh: x.bestDate >= thisMon};
  }).sort((a, b) => (b.fresh - a.fresh) || (b.sessions - a.sessions)).slice(0, limit);
}
const spark = s => { const v = s.filter(x => x != null); if (v.length < 2) return ''; const lo = Math.min(...v), hi = Math.max(...v), span = hi - lo || 1; const pts = s.map((x, i) => x == null ? null : `${(i * 100 / 7).toFixed(1)},${(26 - (x - lo) / span * 22).toFixed(1)}`).filter(Boolean); return `<svg class="pr-spark" viewBox="0 0 100 30" aria-hidden="true"><polyline points="${pts.join(' ')}"/></svg>`; };
export function prGalleryHTML(db, date) {
  const c = prCards(db, date); if (!c.length) return '';
  return `<section class="section pr-gallery"><h3 class="section-title">내 최고 기록 <small>많이 한 종목부터 · 이번 주에 넘은 기록은 앞에</small></h3><div class="pr-scroll">${c.map(x => `<article class="pr-tile${x.fresh ? ' fresh' : ''}">${exArtHTML(x, 'ex-art-md', {fallback: true})}<p class="pr-name">${esc(x.name)}</p><p class="pr-best"><b>${fmt(x.best)}</b>kg × ${x.bestReps}회</p>${spark(x.series)}<small>${x.fresh ? '이번 주 새 기록' : `${esc(x.bestDate.slice(5).replace('-', '/'))} 달성`} · ${x.sessions}일</small></article>`).join('')}</div></section>`;
}

// ⑤ 성장 한 줄(4주 전과 비교, 늘어난 것만)과 다음에 해 볼 무게(제안일 뿐)
export function growthLines(db, date, n = 3) {
  const maxIn = (key, from, to) => { let m = 0; for (const w of db.workouts || []) if (done(w) && w.date >= from && w.date <= to) for (const e of w.exercises || []) if ((e.exerciseId || e.name) === key && e.kind !== 'cardio') for (const s of e.sets || []) if (s.completed !== false) m = Math.max(m, setWeightKg(s)); return m; };
  return prCards(db, date, 20).map(x => ({name: x.name, now: maxIn(x.key, addDays(date, -13), date), then: maxIn(x.key, addDays(date, -41), addDays(date, -28))})).filter(x => x.now > 0 && x.then > 0 && x.now > x.then).slice(0, n).map(x => ({...x, diff: Math.round((x.now - x.then) * 10) / 10}));
}
export function growthHTML(db, date) {
  const g = growthLines(db, date); if (!g.length) return '';
  return `<section class="section card growth-card"><h3>4주 전의 나와 비교하면</h3><ul>${g.map(x => `<li><b>${esc(x.name)}</b> ${fmt(x.then)} → ${fmt(x.now)}kg <em>+${fmt(x.diff)}kg</em></li>`).join('')}</ul><p class="hint">무게가 늘지 않아도 꾸준히 한 것 자체가 잘한 거예요.</p></section>`;
}

// ⑥ 누적 마일스톤(재미있는 비교, 칭찬 기준 아님)
export function totals(db) {
  let vol = 0, km = 0, min = 0, days = new Set();
  for (const w of db.workouts || []) if (moved(w)) { const t = workoutTotals(w); vol += t.volume; km += t.distanceKm; min += Number(w.duration) || t.cardioMinutes || 0; days.add(w.date); }
  return {tons: vol / 1000, km, hours: min / 60, days: days.size};
}
export function milestoneLines(t) {
  const out = [];
  if (t.days) out.push(`지금까지 운동한 날 <b>${t.days.toLocaleString('ko-KR')}일</b>`);
  if (t.tons >= 1) { const ele = t.tons / 6; out.push(`든 무게를 모두 합치면 <b>${fmt(t.tons, 1)}톤</b>${ele >= 1 ? ` — 다 자란 코끼리 ${fmt(ele, 0)}마리` : ` — 소형차 ${fmt(t.tons / 1.2, 1)}대`}`); }
  if (t.km >= 1) { const places = [[42.195, '마라톤 완주 거리'], [140, '서울에서 대전까지'], [325, '서울에서 부산까지'], [1000, '서울에서 도쿄까지']]; const p = [...places].reverse().find(([d]) => t.km >= d); out.push(`달리고 걸은 거리 <b>${fmt(t.km, 1)}km</b>${p ? ` — ${p[1]}를 넘었어요` : ''}`); }
  if (t.hours >= 1) out.push(`운동한 시간 <b>${fmt(t.hours, 1)}시간</b> — 영화 ${fmt(t.hours / 2, 0)}편`);
  return out;
}
export function milestoneHTML(db) { const l = milestoneLines(totals(db)); return l.length ? `<section class="section card milestone-card"><h3>쌓인 이야기</h3><ul>${l.map(x => `<li>${x}</li>`).join('')}</ul></section>` : ''; }

// 운동 끝 결과 카드: 이번 운동의 요약과 새 기록(이 운동을 뺀 이전 기록보다 무거운 세트)
export function newRecords(db, workout) {
  const prior = new Map();
  for (const w of db.workouts || []) if (done(w) && w.id !== workout.id) for (const e of w.exercises || []) if (e.kind !== 'cardio') { const k = e.exerciseId || e.name; for (const s of e.sets || []) if (s.completed !== false) prior.set(k, Math.max(prior.get(k) || 0, setWeightKg(s))); }
  const out = [];
  for (const e of workout.exercises || []) if (e.kind !== 'cardio') { const k = e.exerciseId || e.name, before = prior.get(k); const best = Math.max(0, ...(e.sets || []).filter(s => s.completed !== false).map(setWeightKg)); if (before != null && best > before) out.push({name: e.name, before, best}); }
  return out;
}
export function resultCardHTML(db, workout, {burn = null} = {}) {
  const t = workoutTotals(workout), prs = newRecords(db, workout), names = (workout.exercises || []).map(e => e);
  const parts = [...new Set((workout.exercises || []).map(e => e.kind === 'cardio' ? '유산소' : e.part).filter(Boolean))];
  return `<div class="result-card"><p class="rc-eyebrow">${esc(workout.date)} · 운동 기록 완료</p><h2>오늘도 했어요. 잘했어요.</h2><div class="rc-art">${names.slice(0, 4).map(e => exArtHTML(e, 'ex-art-md', {fallback: true})).join('')}</div><ul class="rc-stats">${t.sets ? `<li><b>${t.sets}</b>세트</li>` : ''}${t.cardioMinutes ? `<li><b>${fmt(t.cardioMinutes, 0)}</b>분 유산소</li>` : ''}${burn?.kcal != null ? `<li>약 <b>${fmt(burn.kcal, 0)}</b>kcal</li>` : ''}${parts.length ? `<li>${parts.map(esc).join(' · ')}</li>` : ''}</ul>${prs.length ? `<div class="rc-pr"><p>새 기록!</p>${prs.map(p => `<p><b>${esc(p.name)}</b> ${fmt(p.before)} → <em>${fmt(p.best)}kg</em></p>`).join('')}</div>` : ''}<button type="button" class="button wide" id="close">확인</button></div>`;
}

// 4.17.0 동작 숙련: 단계 사다리 종목을 처음 해낸 날(점수·순위 없음, '할 수 있게 된 것')
import {firstTimes} from './exercise-knowledge.js';
export function masteryHTML(db) {
  const f = firstTimes(db.workouts || []).sort((a, b) => String(b.date).localeCompare(String(a.date)));
  if (!f.length) return '';
  const byLadder = new Map(); for (const x of f) { if (!byLadder.has(x.ladder) || byLadder.get(x.ladder).step < x.step) byLadder.set(x.ladder, x); }
  return `<section class="section card mastery-card"><h3>할 수 있게 된 것</h3><ul>${[...byLadder.values()].slice(0, 5).map(x => `<li><b>${esc(x.name)}</b> <small>${esc(x.ladder)} ${x.step}/${x.of}단계 · ${esc(x.date.slice(5).replace('-', '/'))} 처음</small></li>`).join('')}</ul><p class="hint">무게보다 '할 수 있게 된 동작'을 모아 봐요.</p></section>`;
}

// 4.17.0 ⑧ 다음 목표 제안: 같은 무게·같은 횟수가 세 번 이어지면 '한 번 더'를 제안한다(점수 아님, 무게가 안 늘면 횟수·세트로).
export function nextGoals(db, date, limit = 2) {
  const from = addDays(date, -27), byName = new Map();
  for (const w of [...(db.workouts || [])].filter(w => done(w) && w.date >= from && w.date <= date).sort((a, b) => a.date.localeCompare(b.date)))
    for (const e of w.exercises || []) {
      if (e.kind === 'cardio') continue;
      const sets = (e.sets || []).filter(s => s.completed !== false && Number(s.reps) > 0);
      if (!sets.length) continue;
      const top = sets.reduce((b, s) => { const kg = setWeightKg(s) ?? 0, bk = setWeightKg(b) ?? 0; return kg > bk || (kg === bk && s.reps > b.reps) ? s : b; });
      const list = byName.get(e.name) || []; list.push({date: w.date, kg: setWeightKg(top) ?? 0, w: top.weight, unit: top.unit || 'kg', reps: top.reps, sets: sets.length}); byName.set(e.name, list);
    }
  const out = [];
  for (const [name, list] of byName) {
    const last3 = list.slice(-3);
    if (last3.length < 3 || !last3.every(x => x.kg === last3[0].kg && x.reps === last3[0].reps)) continue;
    const x = last3[2], unit = x.unit === 'kg' ? 'kg' : x.unit === 'lb' ? 'lb' : '단계';
    const text = x.kg === 0 ? `${name} ${x.reps + 2}회 해 보기 (세 번 연속 ${x.reps}회)` : x.reps < 12 ? `${name} ${fmt(x.w)}${unit} ${x.reps + 1}회 해 보기 (세 번 연속 ${x.reps}회)` : `${name} 무게를 한 칸 올려 8~10회 해 보기 (세 번 연속 ${fmt(x.w)}${unit} ${x.reps}회)`;
    out.push({name, text, last: x.date});
  }
  return out.sort((a, b) => b.last.localeCompare(a.last)).slice(0, limit);
}
// 4.17.0 ⑨ 지난주 한 장: 월~수요일에만, 지난주에 움직인 날이 있을 때. 잘한 점 하나, 다음 주 제안 하나.
export function lastWeek(db, date) {
  const mon = addDays(mondayOf(date), -7), sun = addDays(mon, 6), dow = (toD(date).getDay() + 6) % 7;
  if (dow > 2) return null;
  const ws = (db.workouts || []).filter(w => moved(w) && w.date >= mon && w.date <= sun);
  if (!ws.length) return null;
  const days = new Set(ws.map(w => w.date)).size, count = new Map();
  for (const w of ws) for (const e of w.exercises || []) count.set(e.name, (count.get(e.name) || 0) + 1);
  const fav = [...count].sort((a, b) => b[1] - a[1])[0];
  const prs = newRecordsIn(db, mon, sun);
  const good = prs ? `새 기록 ${prs}개를 세웠어요.` : fav && fav[1] >= 2 ? `${objP(fav[0])} ${fav[1]}번 꾸준히 했어요.` : `${days}일 움직였어요. 그 자체로 잘했어요.`;
  const goal = nextGoals(db, sun, 1)[0];
  return {mon, sun, days, good, next: goal ? goal.text : days >= 3 ? '지금 리듬 그대로 이어 가요.' : '이번 주는 하루만 더 움직여 봐요. 산책도 좋아요.'};
}
function newRecordsIn(db, mon, sun) {
  let n = 0; const best = new Map();
  for (const w of [...(db.workouts || [])].filter(done).sort((a, b) => a.date.localeCompare(b.date))) for (const e of w.exercises || []) {
    if (e.kind === 'cardio') continue;
    const top = Math.max(0, ...(e.sets || []).filter(s => s.completed !== false && s.reps > 0).map(s => estimate1RM(setWeightKg(s) ?? 0, s.reps)));
    if (!top) continue;
    const prev = best.get(e.name);
    if (prev != null && top > prev && w.date >= mon && w.date <= sun) n++;
    if (prev == null || top > prev) best.set(e.name, top);
  }
  return n;
}
const objP = w => { const c = String(w).slice(-1).charCodeAt(0); return w + (c >= 0xAC00 && c <= 0xD7A3 && (c - 0xAC00) % 28 ? '을' : '를'); };
export function lastWeekHTML(info) {
  if (!info) return '';
  const md = s => `${Number(s.slice(5, 7))}/${Number(s.slice(8))}`;
  return `<section class="section card last-week" aria-label="지난주 한 장"><div class="lw-head"><b>지난주 한 장</b><small>${md(info.mon)}~${md(info.sun)}</small><button type="button" class="icon-button" data-lastweek-hide="${info.mon}" aria-label="지난주 카드 닫기">×</button></div><p>움직인 날 <strong>${info.days}일</strong> · ${esc(info.good)}</p><p class="lw-next">다음 주 제안 · ${esc(info.next)}</p></section>`;
}
export function nextGoalsHTML(list) {
  return list.length ? `<section class="section card next-goals"><b>다음에 해 볼 것</b><ul>${list.map(g => `<li>${esc(g.text)}</li>`).join('')}</ul><small>무게가 그대로여도 괜찮아요. 한 번 더 하는 것도 성장이에요.</small></section>` : '';
}

// 4.17.0 ⑩ 올해 돌아보기: 움직인 날·가장 꾸준한 달·많이 한 종목·새 기록·처음 해낸 것(점수 없이 이야기로)
export function yearRecap(db, date, firstFn = null) {
  const y = date.slice(0, 4), from = `${y}-01-01`, ws = (db.workouts || []).filter(w => moved(w) && w.date >= from && w.date <= date);
  if (!ws.length) return null;
  const days = new Set(ws.map(w => w.date)), byMonth = new Map(), count = new Map();
  for (const d of days) byMonth.set(d.slice(5, 7), (byMonth.get(d.slice(5, 7)) || 0) + 1);
  for (const w of ws) for (const e of w.exercises || []) count.set(e.name, (count.get(e.name) || 0) + 1);
  const best = [...byMonth].sort((a, b) => b[1] - a[1])[0], fav = [...count].sort((a, b) => b[1] - a[1]).slice(0, 3);
  const prDays = new Set(), bestKg = new Map();
  for (const w of [...(db.workouts || [])].filter(done).sort((a, b) => a.date.localeCompare(b.date))) for (const e of w.exercises || []) { if (e.kind === 'cardio') continue; const k = e.exerciseId || e.name, top = Math.max(0, ...(e.sets || []).filter(s => s.completed !== false).map(s => setWeightKg(s) || 0)); if (!top) continue; const prev = bestKg.get(k); if (prev != null && top > prev && w.date >= from && w.date <= date) prDays.add(w.date); if (prev == null || top > prev) bestKg.set(k, top); }
  const prs = prDays.size;
  const firsts = firstFn ? firstFn(db.workouts || []).filter(f => f.date >= from && f.date <= date) : [];
  let km = 0, min = 0; for (const w of ws) for (const e of w.exercises || []) if (e.kind === 'cardio') { km += Number(e.distanceKm) || 0; min += Number(e.durationMin) || 0; }
  return {year: y, days: days.size, bestMonth: best ? {m: Number(best[0]), n: best[1]} : null, fav, prs, firsts, km: Math.round(km * 10) / 10, hours: Math.round(min / 6) / 10};
}
export function yearRecapHTML(r, {open = false} = {}) {
  if (!r || r.days < 10) return '';
  const lines = [`${r.year}년에 <b>${r.days}일</b> 움직였어요.`];
  if (r.bestMonth) lines.push(`가장 꾸준했던 달은 <b>${r.bestMonth.m}월</b>(${r.bestMonth.n}일)이에요.`);
  if (r.fav.length) lines.push(`가장 많이 한 운동은 ${r.fav.map(([n, c]) => `<b>${esc(n)}</b>(${c}번)`).join(', ')}.`);
  if (r.prs) lines.push(`새 기록을 세운 날이 <b>${r.prs}일</b>이에요.`);
  if (r.firsts.length) lines.push(`처음 해낸 것: ${r.firsts.slice(0, 4).map(f => `<b>${esc(f.name)}</b>`).join(', ')}.`);
  if (r.km >= 1) lines.push(`달리고 걸은 거리 <b>${fmt(r.km, 1)}km</b>.`);
  return `<details class="section card year-recap"${open ? ' open' : ''}><summary><b>${r.year}년 돌아보기</b><small>움직인 날 ${r.days}일</small></summary><ul>${lines.map(l => `<li>${l}</li>`).join('')}</ul><p class="hint">숫자보다, 이만큼 이어 온 게 대단해요.</p></details>`;
}
