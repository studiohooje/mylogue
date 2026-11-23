// 4.17.0 나만의 2주 실험(플러스, 무료는 동시에 1개): 앱에 쌓이는 기록으로 잴 수 있는 것만.
// 시작 전 14일과 실험 14일을 비교해 '달라진 것 / 그대로인 것 / 다음 실험'을 보여 준다. 숫자로 꾸짖지 않는다.
import {dailyOf} from './discovery.js';
const DAY = 86400000;
const ymd = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const add = (s, n) => ymd(new Date(new Date(`${s}T12:00:00`).getTime() + n * DAY));
const days = (a, b) => Math.round((new Date(`${b}T12:00:00`) - new Date(`${a}T12:00:00`)) / DAY);
const mean = a => a.length ? a.reduce((s, x) => s + x, 0) / a.length : null;
const r1 = n => n == null ? null : Math.round(n * 10) / 10;

// 지표: daily 행에서 꺼내는 값(없으면 null)
const M = {
  protein: {label: '하루 단백질', unit: 'g', get: d => d.complete ? d.protein : null, up: true},
  kcal: {label: '하루 칼로리', unit: 'kcal', get: d => d.complete ? d.kcal : null},
  late: {label: '밤 9시 넘어 먹은 날', unit: '%', rate: d => d.meals ? (d.late ? 1 : 0) : null, up: false},
  workout: {label: '운동한 날', unit: '일/주', rate: d => d.workout ? 1 : 0, perWeek: true, up: true},
  sodium: {label: '하루 나트륨', unit: 'mg', get: d => d.sodiumKnown >= 2 ? d.sodium : null, up: false},
  sleep: {label: '수면 점수', unit: '/5', get: d => d.sleep, up: true},
  swing: {label: '아침 체중 출렁임', unit: 'kg', swing: true, up: false},
};
export const EXPERIMENTS = [
  {id: 'protein', name: '단백질 늘리기', how: '매끼 손바닥만 한 단백질(고기·생선·달걀·두부)을 먼저 담아요.', main: 'protein', also: ['kcal', 'sleep']},
  {id: 'early', name: '저녁 9시 전에 먹기', how: '저녁은 9시 전에 끝내고, 늦게 당기면 따뜻한 차나 우유 한 잔.', main: 'late', also: ['swing', 'kcal']},
  {id: 'move3', name: '주 3회 움직이기', how: '30분이면 충분해요. 걷기·필라테스·헬스 무엇이든.', main: 'workout', also: ['sleep', 'kcal']},
  {id: 'soup', name: '국물 줄이기', how: '찌개·국은 건더기 위주로, 국물은 반만.', main: 'sodium', also: ['swing']},
  {id: 'snack', name: '오후 간식 바꾸기', how: '과자·빵 대신 과일·견과·요거트로.', main: 'kcal', also: ['sleep']},
  {id: 'sleep', name: '잠 먼저 챙기기', how: '같은 시각에 눕고, 자기 1시간 전엔 화면 줄이기. 아침에 수면 점수만 남겨요.', main: 'sleep', also: ['kcal', 'swing']},
];
export const expOf = id => EXPERIMENTS.find(e => e.id === id) || null;
function measure(daily, from, to, key) {
  const m = M[key], rows = daily.filter(d => d.date >= from && d.date <= to);
  if (m.swing) { const ws = rows.filter(d => d.weight != null).map(d => d.weight); if (ws.length < 4) return null; const diffs = ws.slice(1).map((w, i) => Math.abs(w - ws[i])); return r1(mean(diffs)); }
  if (m.rate) { const vals = rows.map(m.rate).filter(v => v != null); if (!vals.length) return null; return m.perWeek ? r1(vals.reduce((a, b) => a + b, 0) / (days(from, to) + 1) * 7) : Math.round(mean(vals) * 100); }
  const vals = rows.map(m.get).filter(v => v != null); return vals.length >= 3 ? Math.round(mean(vals)) : null;
}
export function startExperiment(settings, id, today, {limit = 1} = {}) {
  if (!expOf(id)) throw Error('없는 실험이에요.');
  const active = (settings.experiments || []).filter(e => e.status === 'active');
  if (active.some(e => e.id === id)) throw Error('이미 하고 있는 실험이에요.');
  if (active.length >= limit) throw Error(limit === 1 ? '무료는 실험을 하나씩 할 수 있어요.' : `실험은 동시에 ${limit}개까지예요.`);
  return {...settings, experiments: [...(settings.experiments || []), {id, start: today, days: 14, status: 'active'}].slice(-20)};
}
export function stopExperiment(settings, id, today) {
  return {...settings, experiments: (settings.experiments || []).map(e => e.id === id && e.status === 'active' ? {...e, status: 'stopped', end: today} : e)};
}
// 진행·결과
export function experimentStatus(db, exp, today) {
  const e = expOf(exp.id), end = add(exp.start, exp.days - 1), done = today > end, upto = done ? end : today;
  const daily = dailyOf(db, today), before = [add(exp.start, -exp.days), add(exp.start, -1)];
  const metrics = [e.main, ...e.also].map(key => { const b = measure(daily, before[0], before[1], key), a = measure(daily, exp.start, upto, key); return {key, label: M[key].label, unit: M[key].unit, before: b, after: a, up: M[key].up, delta: b != null && a != null ? r1(a - b) : null}; });
  const day = Math.min(exp.days, days(exp.start, today) + 1);
  return {exp, e, day, done, end, metrics};
}
function verdict(m) {
  if (m.delta == null) return 'unknown';
  const rel = m.before ? Math.abs(m.delta) / Math.max(1, Math.abs(m.before)) : 1;
  if (rel < 0.08 && Math.abs(m.delta) < 1) return 'same';
  if (m.up == null) return 'changed';
  return (m.delta > 0) === m.up ? 'better' : 'worse';
}
const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));
const fmtv = (v, u) => v == null ? '—' : `${Number(v).toLocaleString('ko-KR')}${u}`;
export function experimentsHTML(db, today, {limit = 1, lock = ''} = {}) {
  const list = (db.settings?.experiments || []), active = list.filter(e => e.status === 'active');
  const cards = active.map(x => {
    const s = experimentStatus(db, x, today);
    const rows = s.metrics.map(m => { const v = verdict(m); return `<li class="v-${v}"><span>${esc(m.label)}</span><b>전 ${fmtv(m.before, m.unit)} · 후 ${fmtv(m.after, m.unit)}</b><small>${v === 'better' ? '좋아졌어요' : v === 'worse' ? '반대로 움직였어요' : v === 'same' ? '그대로예요' : v === 'changed' ? '달라졌어요' : '기록이 더 필요해요'}</small></li>`; }).join('');
    const next = s.done ? (EXPERIMENTS.find(e => e.id !== x.id && !list.some(y => y.id === e.id)) || null) : null;
    return `<div class="exp-card${s.done ? ' done' : ''}"><div class="exp-head"><b>${esc(s.e.name)}</b><span>${s.done ? '2주 끝 · 결과' : `${s.day}/14일`}</span></div><p class="hint">${esc(s.e.how)}</p><ul class="exp-metrics">${rows}</ul><p class="hint">전: 시작 전 2주 · 후: ${s.done ? '실험 2주' : '지금까지'}. 한 사람의 2주라 우연도 섞여 있어요.</p><div class="actions">${s.done ? `<button type="button" class="button small" data-exp-finish="${x.id}">결과 보관</button>${next ? `<button type="button" class="button small secondary" data-exp-start="${next.id}">다음: ${esc(next.name)}</button>` : ''}` : `<button type="button" class="button small secondary" data-exp-stop="${x.id}">그만하기</button>`}</div></div>`;
  }).join('');
  const pick = EXPERIMENTS.filter(e => !active.some(a => a.id === e.id)).map(e => `<button type="button" class="exp-pick" data-exp-start="${e.id}"><b>${esc(e.name)}</b><small>${esc(e.how)}</small></button>`).join('');
  const past = list.filter(e => e.status !== 'active').slice(-3).reverse();
  return `<section class="section card exp"><div class="section-title"><h3>나만의 2주 실험</h3><small>${active.length}/${limit === Infinity ? '∞' : limit}개 진행 중</small></div>${cards}${active.length < limit ? `<details class="exp-new"${active.length ? '' : ' open'}><summary>새 실험 고르기</summary><div class="exp-picks">${pick}</div></details>` : lock}${past.length ? `<p class="hint">지난 실험: ${past.map(e => esc(expOf(e.id)?.name || '')).join(' · ')}</p>` : ''}</section>`;
}
export function finishExperiment(settings, id, today) {
  return {...settings, experiments: (settings.experiments || []).map(e => e.id === id && e.status === 'active' ? {...e, status: 'done', end: today} : e)};
}
