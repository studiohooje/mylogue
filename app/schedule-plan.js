// 2026-11-27 대표님(일정 1단계, TimeTree 벤치마킹 보고서): 일정 = '계획하고, 지켰는지 보는 곳'.
// - 맨 위 달력(월): 칸 위쪽은 일정(한 운동 민트·휴식 보라·계획 노란 점선·하루 종일 일정은 진한 막대), 아래 점 3개는 실제 기록(몸·식단·운동).
// - 그날 보기 → 다가오는 일(7일) → 요일별 운동 계획(매주 반복).
// - 일정 종류: 운동 계획·식사 약속(술)·약·주사·센터 휴관·인바디·눈바디·D-day·생리 주기(여성 설정만)·기타. 색·이름은 바꿀 수 있고 처음엔 추천 색.
// - 이모지 반응·여러 달력 겹치기는 넣지 않음(대표님 결정). 데이터는 settings.schedule(계정 설정과 함께 동기화).
import {mealTotals} from './domain.js';
import {daySummary, mealGroups} from './timeline-view.js';
import {setsByPart} from './workout-name.js';

const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));
const pad = n => String(n).padStart(2, '0');
export const ymd = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const addDays = (date, n) => { const d = new Date(`${date}T12:00:00`); d.setDate(d.getDate() + n); return ymd(d); };
const WD = '일월화수목금토';
const md = d => `${Number(d.slice(5, 7))}/${Number(d.slice(8, 10))}`;
const uid = () => (globalThis.crypto?.randomUUID?.() || `ev-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`);

// 종류(추천 이름·색). 사용자가 일정마다 이름·색을 바꿀 수 있다.
export const KINDS = [
  {k: 'workout', name: '운동 계획', icon: '🏋', color: '#8ce4e0'},
  {k: 'meal', name: '식사 약속', icon: '🍽', color: '#8fc9f2'},
  {k: 'med', name: '약·주사', icon: '💉', color: '#b8aaf2'},
  {k: 'closed', name: '센터 휴관', icon: '🚪', color: '#9aa7b8'},
  {k: 'measure', name: '인바디·눈바디', icon: '📏', color: '#f2a98a'},
  {k: 'dday', name: 'D-day', icon: '🎯', color: '#b8aaf2'},
  {k: 'period', name: '생리 주기', icon: '🌙', color: '#f28a9b', female: true},
  {k: 'etc', name: '기타', icon: '＋', color: '#9aa7b8'},
];
export const COLORS = ['#8ce4e0', '#8fc9f2', '#b8aaf2', '#f2a98a', '#f7c270', '#f28a9b', '#9aa7b8'];
export const kindOf = k => KINDS.find(x => x.k === k) || KINDS.at(-1);
export const isFemale = db => db?.settings?.nutritionProfile?.sex === 'female';
export const kindsFor = db => KINDS.filter(x => !x.female || isFemale(db));

export function schedOf(db) {
  const s = db?.settings?.schedule || {};
  return {events: Array.isArray(s.events) ? s.events : [], weekPlan: s.weekPlan && typeof s.weekPlan === 'object' ? s.weekPlan : {}, periodLen: Number(s.periodLen) || 5, periodCycle: Number(s.periodCycle) || 28};
}
export function withSched(db, patch) { return {...db, settings: {...db.settings, schedule: {...(db.settings?.schedule || {}), ...patch}}}; }

// 좁은 달력 칸: 띄어쓰기 없는 4~6글자 낱말은 가운데서 줄바꿈(필라테/스 → 필라/테스)
export const calLabel = t => String(t).split(' ').map(w => { const a = [...w]; return a.length < 4 || a.length > 6 || w.includes('·') ? esc(w) : `${esc(a.slice(0, a.length >> 1).join(''))}<wbr>${esc(a.slice(a.length >> 1).join(''))}`; }).join(' ');

export function cleanEvent(raw = {}) {
  const kind = kindOf(raw.kind).k, date = /^\d{4}-\d{2}-\d{2}$/.test(String(raw.date || '')) ? raw.date : null;
  if (!date) throw Error('날짜를 확인해 주세요.');
  const title = String(raw.title || kindOf(kind).name).trim().slice(0, 40) || kindOf(kind).name;
  const time = /^\d{2}:\d{2}$/.test(String(raw.time || '')) ? raw.time : '';
  const repeat = ['week', 'none'].includes(raw.repeat) ? raw.repeat : 'none';
  const color = COLORS.includes(raw.color) ? raw.color : kindOf(kind).color;
  const out = {id: raw.id || uid(), kind, date, title, time, repeat, color, note: String(raw.note || '').trim().slice(0, 120), updatedAt: new Date().toISOString()};
  if (kind === 'meal') { out.slot = ['아침', '점심', '저녁', '야식'].includes(raw.slot) ? raw.slot : '저녁'; out.alcohol = raw.alcohol === true || raw.alcohol === 'yes'; }
  if (kind === 'workout') out.parts = (Array.isArray(raw.parts) ? raw.parts : []).map(String).filter(Boolean).slice(0, 6);
  return out;
}

// 그 날짜의 일정(반복 포함). 생리 주기는 시작일부터 periodLen일 동안, 다음 주기 예상은 periodCycle일 뒤(여성 설정일 때만).
export function eventsOn(db, date) {
  const {events, periodLen, periodCycle} = schedOf(db), out = [];
  for (const e of events) {
    if (e.kind === 'period') {
      if (!isFemale(db)) continue;
      const g = Math.round((new Date(`${date}T12:00:00`) - new Date(`${e.date}T12:00:00`)) / 86400000);
      if (g >= 0 && g < periodLen) out.push({...e, day: g + 1});
      else if (g >= periodCycle && (g % periodCycle) < periodLen && g < periodCycle * 3 && !events.some(x => x.kind === 'period' && x.date > e.date && x.date <= date)) out.push({...e, predicted: true, day: (g % periodCycle) + 1});
      continue;
    }
    if (e.date === date) out.push(e);
    else if (e.repeat === 'week' && date > e.date && Math.round((new Date(`${date}T12:00:00`) - new Date(`${e.date}T12:00:00`)) / 86400000) % 7 === 0) out.push({...e, repeated: true});
  }
  return out.sort((a, b) => (a.time || '99').localeCompare(b.time || '99'));
}

// 요일별 운동 계획: weekPlan[0~6] = {title, parts:[], rest?}
const realWorkouts = (db, date) => (db.workouts || []).filter(w => w.date === date && !w.planned && w.status !== 'planned' && !w.rest);
export function weekPlanFor(db, date) { const p = schedOf(db).weekPlan[new Date(`${date}T12:00:00`).getDay()]; return p && (p.rest || p.title) ? p : null; }
// 그날의 운동 계획: 직접 넣은 예정 운동 > 운동 계획 일정 > 요일 계획. 센터 휴관이면 요일 계획은 '휴관'으로 표시.
export function planFor(db, date) {
  const pw = (db.workouts || []).find(w => w.date === date && (w.planned || w.status === 'planned'));
  if (pw) return {title: pw.title || '운동', parts: (pw.targets || []).filter(t => String(t).startsWith('웨이트:')).map(t => t.slice(4)), from: 'plan'};
  const ev = eventsOn(db, date).find(e => e.kind === 'workout');
  if (ev) return {title: ev.title, parts: ev.parts || [], from: 'event'};
  const wp = weekPlanFor(db, date);
  if (!wp) return null;
  if (eventsOn(db, date).some(e => e.kind === 'closed') && !wp.rest) return {title: wp.title, parts: wp.parts || [], from: 'week', closed: true};
  return {title: wp.rest ? '휴식' : wp.title, parts: wp.parts || [], rest: !!wp.rest, from: 'week'};
}
// 계획을 했는지: 계획 부위가 그날 실제 기록에 들어갔으면(부위가 없으면 운동이 하나라도 있으면) 한 것
export function planDone(db, date, plan = planFor(db, date)) {
  if (!plan || plan.rest) return false;
  const real = realWorkouts(db, date); if (!real.length) return false;
  if (!plan.parts?.length) return true;
  const done = new Set(setsByPart(real.flatMap(w => w.exercises || [])).map(([p]) => p));
  return plan.parts.some(p => done.has(p));
}

// 지난 4주 기록으로 요일 계획 처음 칸 채우기(요일마다 가장 많이 한 이름)
export function suggestWeekPlan(db, today) {
  const by = {};
  for (let i = 1; i <= 28; i++) {
    const d = addDays(today, -i), wd = new Date(`${d}T12:00:00`).getDay(), ws = (db.workouts || []).filter(w => w.date === d && !w.planned);
    const real = ws.filter(w => !w.rest);
    const t = real.length ? String(real[0].title || '').replace(/^웨이트\((.*)\)$/, '$1').replace(/ /g, '·') : ws.some(w => w.rest) ? '휴식' : '';
    if (!t) continue;
    (by[wd] ||= {})[t] = (by[wd][t] || 0) + 1;
  }
  const plan = {};
  for (const [wd, m] of Object.entries(by)) {
    const [t, n] = Object.entries(m).sort((a, b) => b[1] - a[1])[0];
    if (n >= 2) plan[wd] = t === '휴식' ? {rest: true, title: '휴식'} : {title: t, parts: t.split('·').filter(x => ['가슴', '등', '어깨', '하체', '이두', '삼두', '복근', '전신'].includes(x))};
  }
  return plan;
}

// ── 화면 ──
function dots(db, date) {
  const b = (db.body || []).some(x => x.date === date), m = (db.meals || []).some(x => x.date === date && !x.planned), w = realWorkouts(db, date).length > 0;
  return {b, m, w, full: b && m && w};
}
function cellLines(db, date, today) {
  const lines = [], real = realWorkouts(db, date);
  if (real.length) lines.push(['w', daySummary(real).replace(/웨이트\(([^)]*)\)/g, '$1').replace(/ \+ /g, ' ')]);
  else if ((db.workouts || []).some(w => w.date === date && w.rest) || (db.settings?.restDates || []).includes(date)) lines.push(['r', '휴식']);
  else if (date >= today) { const p = planFor(db, date); if (p) lines.push([p.rest ? 'r' : 'p', p.closed ? `${p.title}·휴관` : p.title]); }
  for (const e of eventsOn(db, date)) if (e.kind !== 'workout') lines.push(['e', e.kind === 'meal' && e.alcohol ? `${e.title}🍺` : e.kind === 'period' ? '생리' : e.title, e.color, !e.time]);
  return lines;
}
export function monthCalendarHTML(db, selected, today, month) {
  const base = new Date(`${(month || selected).slice(0, 7)}-01T12:00:00`), y = base.getFullYear(), m = base.getMonth(), first = new Date(y, m, 1).getDay(), count = new Date(y, m + 1, 0).getDate();
  let cells = [...WD].map(x => `<i>${x}</i>`).join('') + '<span></span>'.repeat(first);
  for (let n = 1; n <= count; n++) {
    const date = `${y}-${pad(m + 1)}-${pad(n)}`, d = dots(db, date), ls = cellLines(db, date, today);
    cells += `<button type="button" class="c${d.full ? ' full' : ''}${date === today ? ' today' : ''}${date === selected ? ' sel' : ''}${date > today ? ' fut' : ''}" data-calendar="${date}" aria-label="${date}"><b>${n}</b>${ls.slice(0, 2).map(([k, t, c, allDay]) => `<span class="e ${k}${k === 'e' && allDay ? ' bar' : ''}"${k === 'e' ? ` style="--c:${c}"` : ''}>${calLabel(t)}</span>`).join('')}${ls.length > 2 ? `<span class="more">+${ls.length - 2}</span>` : ''}<span class="dots" aria-hidden="true"><s class="${d.b ? 'b' : ''}"></s><s class="${d.m ? 'm' : ''}"></s><s class="${d.w ? 'w' : ''}"></s></span></button>`;
  }
  return `<section class="section card mc"><div class="mc-head"><span class="mc-arw"><button type="button" data-month="-1" aria-label="이전 달">‹</button><b>${y}년 ${m + 1}월</b><button type="button" data-month="1" aria-label="다음 달">›</button></span>${month && month.slice(0, 7) !== today.slice(0, 7) ? '<button type="button" class="text-button" data-sched-today>오늘</button>' : ''}</div><div class="mc-cal">${cells}</div></section>`;
}

const ICON = {b: ['⚖', '#f2a98a'], w: ['🏋', '#8ce4e0'], m: ['🍴', '#8fc9f2']};
const row = (ic, title, sub, right = '', cls = '', attr = '') => `<div class="sk-row ${cls}" ${attr}><span class="sk-ic" style="background:${ic[1]}22;color:${ic[1]}">${ic[0]}</span><span class="t"><b>${title}</b>${sub ? `<small>${sub}</small>` : ''}</span>${right}</div>`;
export function dayViewHTML(db, date, today) {
  const wd = WD[new Date(`${date}T12:00:00`).getDay()], rel = date === today ? ' · 오늘' : date === addDays(today, 1) ? ' · 내일' : date === addDays(today, -1) ? ' · 어제' : '';
  const out = [], body = (db.body || []).filter(x => x.date === date), meals = (db.meals || []).filter(m => m.date === date), real = realWorkouts(db, date);
  if (body.length) { const b = body.at(-1); out.push(row(ICON.b, `체중 ${(Math.round(b.weight * 10) / 10).toFixed(1)}kg${body.some(x => x.measure === 'inbody') ? ' · 인바디' : ''}`, '', '<span class="ok">✓</span>')); }
  for (const w of real) { const n = (w.exercises || []).length, s = (w.exercises || []).reduce((a, e) => a + (e.sets || []).length, 0); out.push(row(ICON.w, esc(w.title || '운동'), [n ? `${n}종목` : '', s ? `${s}세트` : ''].filter(Boolean).join(' · '), '<span class="ok">✓</span>')); }
  const ate = meals.filter(m => !m.planned); if (ate.length) out.push(row(ICON.m, `식사 · ${Math.round(mealTotals(ate).calories).toLocaleString('ko-KR')}kcal`, '', '<span class="ok">✓</span>'));
  const pm = meals.filter(m => m.planned); if (pm.length) out.push(row(['🍴', '#f7c270'], `예정 · ${esc(pm[0].name)}${pm.length > 1 ? ` 외 ${pm.length - 1}` : ''}`, `${Math.round(mealTotals(pm).calories).toLocaleString('ko-KR')}kcal`, date <= today ? `<button type="button" class="sk-btn" data-plan-confirm="${esc('meal:' + (mealGroups(pm)[0]?.key || ''))}">먹었어요</button>` : '', 'sk-plan'));
  const plan = planFor(db, date);
  if (plan && !real.length && date >= today) out.push(row(['🏋', '#f7c270'], plan.rest ? '휴식' : `${esc(plan.title)}${plan.closed ? ' · 센터 휴관이에요' : ''}`, plan.from === 'week' ? '요일 계획' : '계획', '', 'sk-plan'));
  else if (plan && !plan.rest && real.length && planDone(db, date, plan)) {/* 계획대로 함 — 위 운동 줄로 충분 */}
  for (const e of eventsOn(db, date)) if (!(e.kind === 'workout' && real.length)) out.push(row([kindOf(e.kind).icon, e.color], esc(e.kind === 'period' ? `${e.predicted ? '생리 예상' : '생리'} ${e.day}일째` : e.title) + (e.kind === 'meal' ? ` · ${e.alcohol ? '술 마셔요' : '술 안 마셔요'}` : ''), [e.time, e.kind === 'meal' ? e.slot : '', e.note ? esc(e.note) : ''].filter(Boolean).join(' · '), '<span class="chev">›</span>', 'sk-ev', `data-sched-ev="${esc(e.id)}" role="button" tabindex="0"`));
  return `<section class="section card sk"><div class="sk-h"><b>${md(date)} ${wd}${rel}</b></div>${out.join('') || '<p class="hint" style="margin:4px 0 0">기록이나 일정이 없어요.</p>'}<button type="button" class="sk-add" data-sched-add="${date}">＋ 일정 넣기</button></section>`;
}
export function upcoming(db, today, days = 7) {
  const out = [];
  for (let i = 1; i <= days; i++) {
    const d = addDays(today, i), p = planFor(db, d);
    if (p && !p.rest) out.push({date: d, title: p.closed ? `${p.title} · 센터 휴관` : p.title, sub: p.from === 'week' ? '요일 계획' : '계획'});
    for (const e of eventsOn(db, d)) if (e.kind !== 'workout' || !p) out.push({date: d, title: e.kind === 'period' ? '생리 예상' : `${e.title}${e.kind === 'meal' && e.alcohol ? ' · 술 마셔요' : ''}`, sub: e.time || '', id: e.id});
  }
  const last = (db.body || []).filter(b => b.measure === 'inbody').map(b => b.date).sort().at(-1);
  if (last) { const next = addDays(last, 14); if (next > today) out.push({date: next, title: '인바디 다시 재기', sub: `마지막 ${md(last)}`, soft: true}); }
  return out.sort((a, b) => a.date.localeCompare(b.date)).slice(0, 8);
}
export function upcomingHTML(db, today) {
  const list = upcoming(db, today);
  if (!list.length) return '';
  return `<section class="section card sk"><div class="sk-h"><b>다가오는 일</b></div>${list.map(u => `<div class="sk-row sk-up"${u.id ? ` data-sched-ev="${esc(u.id)}" role="button" tabindex="0"` : ''}><span class="d">${u.soft ? `${md(u.date)}쯤` : `${WD[new Date(`${u.date}T12:00:00`).getDay()]} ${md(u.date)}`}</span><span class="t"><b>${esc(u.title)}</b>${u.sub ? `<small>${esc(u.sub)}</small>` : ''}</span></div>`).join('')}</section>`;
}
export function weekPlanHTML(db, today) {
  const wp = schedOf(db).weekPlan, order = [1, 2, 3, 4, 5, 6, 0], empty = !Object.keys(wp).length;
  return `<section class="section card sk"><div class="sk-h"><b>요일별 운동 계획<i class="i-tip" tabindex="0" title="정해 두면 매주 그 요일에 계획으로 보이고, 실시간 입력을 누르면 '계획대로 시작할까요?'로 이어져요">i</i></b><button type="button" class="text-button" data-sched-week>${empty ? '정하기' : '바꾸기'}</button></div><div class="sk-rt">${order.map(d => { const p = wp[d]; return `<div><i>${WD[d]}</i><span class="${p?.rest ? 'rest' : p?.title ? '' : 'none'}">${esc(p?.rest ? '휴식' : p?.title || '—')}</span></div>`; }).join('')}</div></section>`;
}
export function schedulePageHTML(db, selected, today, {coachHTML = ''} = {}) {
  /* 대표님: GLP-1을 쓴다고 설정한 사람에게는 '일정에도 등록할까요?' */
  const glp = db.settings?.preferences?.glp1 && !schedOf(db).events.some(e => e.kind === 'med') ? `<section class="section card sk-ask"><span>💉 GLP-1 주사일을 일정에도 등록할까요?</span><button type="button" class="sk-btn" data-sched-glp>등록</button></section>` : '';
  return `<div class="page-head"><div><h2>일정</h2></div></div>${glp}${monthCalendarHTML(db, selected, today, selected)}${dayViewHTML(db, selected, today)}${coachHTML}${upcomingHTML(db, today)}${weekPlanHTML(db, today)}`;
}

// ── 일정 넣기·고치기 창 ──
export function addSheetHTML(db, st = {}) {
  if (!st.kind) return `<div class="ad-grid">${kindsFor(db).map(x => `<button type="button" class="ad-t" data-sched-kind="${x.k}"><i style="background:${x.color}22;color:${x.color}">${x.icon}</i>${x.k === 'med' && db.settings?.preferences?.glp1 ? 'GLP-1·약' : x.name}</button>`).join('')}</div>`;
  const e = st, k = kindOf(e.kind), today = ymd(new Date()), d = new Date(`${e.date}T12:00:00`), g = Math.round((d - new Date(`${today}T12:00:00`)) / 86400000), rel = g === 0 ? '오늘' : g === 1 ? '내일' : g === -1 ? '어제' : g > 0 ? `${g}일 뒤` : `${-g}일 전`;
  const chips = (name, opts, cur) => `<div class="ad-chips">${opts.map(o => `<button type="button" class="${o === cur ? 'on' : ''}" data-sched-set="${name}:${o}">${o}</button>`).join('')}</div>`;
  const parts = ['하체', '가슴', '등', '어깨', '이두', '삼두', '복근', '전신'];
  return `<form id="sched-form" class="ad-f"><input type="hidden" name="kind" value="${e.kind}"><input type="hidden" name="date" value="${e.date}">
 <div class="ad-db"><button type="button" data-sched-day="-1">‹</button><span>${d.getMonth() + 1}월 ${d.getDate()}일 (${WD[d.getDay()]})<em>${rel}</em></span><button type="button" data-sched-day="1">›</button></div>
 ${e.kind === 'period' ? '' : `<label class="field">이름<input name="title" maxlength="40" value="${esc(e.title ?? (e.kind === 'med' && db.settings?.preferences?.glp1 ? 'GLP-1 주사' : k.name))}"></label>`}
 ${e.kind === 'workout' ? `<div><div class="lab">부위</div><div class="ad-chips">${parts.map(p => `<button type="button" class="${(e.parts || []).includes(p) ? 'on' : ''}" data-sched-part="${p}">${p}</button>`).join('')}</div></div>` : ''}
 ${e.kind === 'meal' ? `<div><div class="lab">끼니</div>${chips('slot', ['아침', '점심', '저녁', '야식'], e.slot || '저녁')}</div><div><div class="lab">술</div><div class="ad-seg"><button type="button" class="${e.alcohol ? 'on' : ''}" data-sched-set="alcohol:yes">🍺 마셔요</button><button type="button" class="${e.alcohol ? '' : 'on'}" data-sched-set="alcohol:no">안 마셔요</button></div></div>` : ''}
 ${['period', 'closed', 'dday'].includes(e.kind) ? '' : `<label class="field">시각 (선택)<input name="time" type="time" data-no-when value="${esc(e.time || '')}"></label>`}
 ${['med', 'closed', 'workout', 'etc'].includes(e.kind) ? `<div><div class="lab">반복</div>${chips('repeat', ['한 번', '매주'], e.repeat === 'week' ? '매주' : '한 번')}</div>` : ''}
 ${e.kind === 'period' ? `<p class="hint" style="margin:0">시작한 날을 넣으면 ${schedOf(db).periodLen}일 동안 표시하고, 다음 예상일도 보여 줘요.</p>` : `<label class="field">메모 (선택)<input name="note" maxlength="120" value="${esc(e.note || '')}" placeholder="${e.kind === 'meal' ? '어디서 · 누구와' : ''}"></label>`}
 <div class="ad-col"><span>색${(e.color || k.color) === k.color ? ' · 추천' : ''}</span><span class="sw">${COLORS.map(c => `<button type="button" class="${(e.color || k.color) === c ? 'on' : ''}" style="background:${c}" data-sched-set="color:${c}" aria-label="색 ${c}"></button>`).join('')}</span></div>
 <button class="button">${e.id ? '저장' : '일정에 넣기'}</button>${e.id ? `<button type="button" class="text-button sched-del" data-sched-del="${esc(e.id)}">이 일정 지우기</button>` : ''}</form>`;
}
export function weekSheetHTML(st = {}) {
  const order = [1, 2, 3, 4, 5, 6, 0], parts = ['하체', '가슴', '등', '어깨', '이두', '삼두', '복근', '전신'];
  return `<div class="wk-ed">${order.map(d => { const p = st[d] || {}; return `<div class="wk-r"><b>${WD[d]}</b><div class="ad-chips">${parts.map(x => `<button type="button" class="${(p.parts || []).includes(x) ? 'on' : ''}" data-week-part="${d}:${x}">${x}</button>`).join('')}<button type="button" class="${p.rest ? 'on rest' : ''}" data-week-rest="${d}">휴식</button></div></div>`; }).join('')}<div class="actions"><button type="button" class="button" data-week-save>저장</button><button type="button" class="button secondary" data-week-clear>모두 비우기</button></div></div>`;
}
export const weekTitle = p => p?.rest ? '휴식' : (p?.parts || []).join('·');
