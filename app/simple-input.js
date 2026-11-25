// 5.0.6 심플 모드 초안(대표님 2026-11-25 방향): 디테일 모드(지금 입력 창)는 하나도 바꾸지 않고, 같은 '식사 기록'·'운동 기록' 창 안에
// '아주 편하고 러프하게' 남기는 내용을 얹는다. 정확도는 낮아도 되고, 저장한 값은 늘 '추정'으로 표시된다(지난 기록·그래프와 그대로 섞임).
// - 식사: '평소대로'를 하나가 아니라 여러 개(이 시간대에 자주 먹은 조합들), 양은 적게·평소·많이. 이름만 적어도 음식 DB로 넓게 추정.
// - 운동: 지난번처럼(여러 개) / 부위 + 시간 + 강도 / 의도적 휴식. 종목·세트 없이 '기억나는 만큼 적은 운동'(recalled)으로.
// 지금은 숨김 스위치(localStorage 'mylogue.simpleDraft' = '1')로만 켜지는 초안이다. 이 파일은 app.js를 import하지 않는다.
import {cleanMeal, cleanWorkout} from './domain.js';

const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));
const n0 = v => Math.round(Number(v) || 0).toLocaleString('ko-KR');
const uid = () => (globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`);
export const simpleOn = () => { try { return globalThis.localStorage?.getItem('mylogue.simpleDraft') === '1'; } catch { return false; } };
export const PORTIONS = [['less', '적게', 0.7], ['usual', '평소', 1], ['more', '많이', 1.4]];
const SPREAD = 0.3; // 심플 모드 추정 범위 ±30%

const hourOf = iso => { const d = new Date(iso); return Number.isFinite(d.getTime()) ? d.getHours() : null; };
const daysBetween = (a, b) => Math.round((new Date(`${b}T12:00:00`) - new Date(`${a}T12:00:00`)) / 864e5);

// 식사 '평소대로' 여러 개: 최근 30일, 지금 시각 ±3시간에 먹은 끼니 구성(이름 묶음)을 많이 먹은 순으로
export function usualMeals(meals = [], date, time = '12:00', limit = 4) {
  const h = Number(String(time).slice(0, 2)), groups = new Map();
  for (const m of meals) {
    if (m.planned || !m.date || m.date >= date || daysBetween(m.date, date) > 30) continue;
    const mh = hourOf(m.loggedAt); if (mh == null || Math.abs(mh - h) > 3) continue;
    const k = m.mealGroupId || `${m.date}|${m.slot}`;
    if (!groups.has(k)) groups.set(k, {items: [], date: m.date});
    groups.get(k).items.push(m);
  }
  const bySig = new Map();
  for (const g of groups.values()) {
    const sig = g.items.map(x => x.name).sort().join('|');
    const cur = bySig.get(sig);
    if (!cur) bySig.set(sig, {sig, count: 1, last: g.date, items: g.items});
    else { cur.count++; if (g.date > cur.last) { cur.last = g.date; cur.items = g.items; } }
  }
  return [...bySig.values()].sort((a, b) => b.count - a.count || b.last.localeCompare(a.last)).slice(0, limit)
    .map(x => ({key: x.sig, count: x.count, names: x.items.map(i => i.name), kcal: x.items.reduce((s, i) => s + (Number(i.calories) || 0), 0), items: x.items}));
}

// 이름만 적은 것 → 음식 DB 첫 결과의 1인분(없으면 넓은 기본 추정). search(name) → [{name, calories, carbs, protein, fat, servingQty, servingUnit, unitGrams}]
const FALLBACK = {calories: 500, carbs: 65, protein: 20, fat: 15}; // 한 끼 기본 추정(이름을 못 찾을 때)
export function guessFromText(text = '', search = () => []) {
  const names = String(text).split(/[,，、\n]|\s+(?:과|와|랑|하고)\s+|\s*\+\s*/).map(s => s.trim()).filter(Boolean).slice(0, 8);
  return names.map(name => {
    const hit = (search(name) || [])[0];
    if (hit && hit.calories != null) {
      const mass = ['g', 'ml', ''].includes(hit.servingUnit || ''), grams = mass ? Number(hit.servingQty) || 100 : 0;
      // 100g 기준 음식은 한 번에 먹는 양을 몰라 200g로 넓게(밥 한 공기·반찬 한 접시 수준)
      const k = mass ? 2 : 1;
      return {name, matched: hit.name, calories: hit.calories * k, carbs: (hit.carbs ?? 0) * k, protein: (hit.protein ?? 0) * k, fat: (hit.fat ?? 0) * k, basis: mass ? `${hit.name} 약 ${grams * k}g로 넓게 추정` : `${hit.name} 1${hit.servingUnit || '인분'} 기준`};
    }
    return {name, matched: '', ...FALLBACK, basis: '음식을 찾지 못해 한 끼 평균으로 넓게 추정'};
  });
}

// 저장할 식사 기록(추정 표시·범위 ±30%)
export function simpleMealRecords({date, time = '12:00', slot = '식사', items = [], portion = 'usual'}) {
  if (!items.length) throw Error('무엇을 먹었는지 하나 이상 골라 주세요.');
  const f = (PORTIONS.find(p => p[0] === portion) || PORTIONS[1])[2], group = uid(), loggedAt = new Date(`${date}T${time}:00`).toISOString();
  return items.map(it => {
    const kcal = Math.round((Number(it.calories) || 0) * f), r = v => Math.round((Number(v) || 0) * f * 10) / 10;
    return cleanMeal({date, slot, mealGroupId: group, loggedAt, name: it.name, servingQty: f, servingUnit: '회', calories: kcal, carbs: r(it.carbs), protein: r(it.protein), fat: r(it.fat), source: 'simple',
      aiEstimate: {estimated: true, caloriesMin: Math.round(kcal * (1 - SPREAD)), caloriesMax: Math.round(kcal * (1 + SPREAD)), basis: String(it.basis || '심플 모드 추정').slice(0, 160), note: '심플 모드로 남긴 추정치예요. 자세히 고치려면 디테일로 바꾸세요.'}});
  });
}

// 운동: 지난번처럼(제목·부위가 다른 최근 세션 3개), 부위·시간·강도
export const PARTS = ['하체', '등', '가슴', '어깨', '팔', '전신', '유산소', '필라테스', '요가'];
export const MINUTES = [20, 30, 45, 60, 90];
export const INTENSITY = [['easy', '가볍게'], ['usual', '보통'], ['hard', '힘들게']];
export function recentSessions(workouts = [], date, limit = 3) {
  const out = [], seen = new Set();
  for (const w of [...workouts].filter(w => !w.planned && !w.rest && w.date <= date).sort((a, b) => String(b.date).localeCompare(String(a.date)))) {
    const parts = [...new Set((w.targets?.length ? w.targets : (w.exercises || []).map(e => e.part)).filter(Boolean))];
    const sig = `${w.title}|${parts.join(',')}`; if (seen.has(sig)) continue; seen.add(sig);
    out.push({title: w.title || parts.join('·') || '운동', parts, minutes: Number(w.duration) || null, date: w.date});
    if (out.length >= limit) break;
  }
  return out;
}
export function simpleWorkoutRecord({date, parts = [], minutes = null, intensity = 'usual', title = '', rest = false}) {
  if (rest) return cleanWorkout({date, rest: true, title: '의도적 휴식', exercises: []});
  if (!parts.length) throw Error('어느 부위를 했는지 하나 이상 골라 주세요.');
  const label = (INTENSITY.find(x => x[0] === intensity) || INTENSITY[1])[1];
  return cleanWorkout({date, recalled: true, title: title || parts.join('·'), targets: parts, duration: minutes, exercises: [], note: `심플 모드 · 강도 ${label}`});
}

// ---------- 화면(창 안쪽 내용만. 창·들어가는 길은 지금과 같다) ----------
export function simpleMealPanelHTML(db, s, {search} = {}) {
  const st = s.simple ||= {portion: 'usual', picked: '', text: ''};
  const usual = usualMeals(db.meals, s.date, s.time);
  const guess = st.text.trim() ? guessFromText(st.text, search) : [];
  const kcal = st.picked ? (usual.find(u => u.key === st.picked)?.kcal || 0) : guess.reduce((a, g) => a + g.calories, 0);
  const f = (PORTIONS.find(p => p[0] === st.portion) || PORTIONS[1])[2];
  return `<section class="simple-box" aria-label="심플 기록">
  <p class="simple-band">심플 모드 · 추정치로 남아요 <button type="button" class="text-button" data-simple-off>자세히 입력하기 ›</button></p>
  ${usual.length ? `<div class="simple-head"><b>평소대로</b><small>이 시간쯤 자주 먹은 것</small></div><div class="simple-opts">${usual.map(u => `<button type="button" class="simple-opt${st.picked === u.key ? ' on' : ''}" data-simple-meal="${esc(u.key)}" aria-pressed="${st.picked === u.key}"><strong>${esc(u.names.slice(0, 3).join(' · '))}${u.names.length > 3 ? ` 외 ${u.names.length - 3}` : ''}</strong><small>약 ${n0(u.kcal)}kcal · ${u.count}번 먹었어요</small></button>`).join('')}</div>` : ''}
  <div class="simple-head"><b>${usual.length ? '다른 것' : '무엇을 먹었나요'}</b><small>이름만 적어도 돼요(예: 김치찌개, 밥)</small></div>
  <input id="simple-meal-text" class="simple-text" value="${esc(st.text)}" placeholder="먹은 것 이름" autocomplete="off">
  ${guess.length ? `<ul class="simple-guess">${guess.map(g => `<li><b>${esc(g.name)}</b><small>${esc(g.basis)} · 약 ${n0(g.calories)}kcal</small></li>`).join('')}</ul>` : ''}
  <div class="simple-head"><b>양</b></div>
  <div class="chips simple-portion" role="group" aria-label="양">${PORTIONS.map(([k, l]) => `<button type="button" class="chip${st.portion === k ? ' active' : ''}" data-simple-portion="${k}" aria-pressed="${st.portion === k}">${l}</button>`).join('')}</div>
  <button type="button" class="button simple-save" data-simple-meal-save ${kcal > 0 ? '' : 'disabled'}>${kcal > 0 ? `약 ${n0(kcal * f)}kcal로 남기기` : '먹은 것을 골라 주세요'}</button>
</section>`;
}
export function simpleWorkoutPanelHTML(db, s) {
  const st = s.simple ||= {parts: [], minutes: 45, intensity: 'usual', from: ''};
  const recent = recentSessions(db.workouts, s.date);
  return `<section class="simple-box" aria-label="심플 기록">
  <p class="simple-band">심플 모드 · 종목·세트 없이 남겨요 <button type="button" class="text-button" data-simple-off>자세히 입력하기 ›</button></p>
  ${recent.length ? `<div class="simple-head"><b>지난번처럼</b><small>누르면 그대로 골라져요</small></div><div class="simple-opts">${recent.map((r, i) => `<button type="button" class="simple-opt${st.from === String(i) ? ' on' : ''}" data-simple-from="${i}"><strong>${esc(r.title)}</strong><small>${esc(r.parts.join('·') || '부위 없음')}${r.minutes ? ` · ${r.minutes}분` : ''}</small></button>`).join('')}</div>` : ''}
  <div class="simple-head"><b>어디를 했나요</b><small>여러 개 골라도 돼요</small></div>
  <div class="chips simple-parts">${PARTS.map(p => `<button type="button" class="chip${st.parts.includes(p) ? ' active' : ''}" data-simple-part="${p}" aria-pressed="${st.parts.includes(p)}">${p}</button>`).join('')}</div>
  <div class="simple-head"><b>얼마나</b></div>
  <div class="chips">${MINUTES.map(m => `<button type="button" class="chip${st.minutes === m ? ' active' : ''}" data-simple-min="${m}">${m}분</button>`).join('')}</div>
  <div class="chips">${INTENSITY.map(([k, l]) => `<button type="button" class="chip${st.intensity === k ? ' active' : ''}" data-simple-int="${k}">${l}</button>`).join('')}</div>
  <button type="button" class="button simple-save" data-simple-work-save ${st.parts.length ? '' : 'disabled'}>${st.parts.length ? `${esc(st.parts.join('·'))} ${st.minutes}분 남기기` : '부위를 골라 주세요'}</button>
  <button type="button" class="text-button simple-rest" data-simple-rest>오늘은 의도적 휴식</button>
</section>`;
}
