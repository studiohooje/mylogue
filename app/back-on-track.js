// 4.14.0 백 온 트랙: 한동안 비운 사람이 돌아오면, 비운 날을 채울지 비워 둘지 먼저 묻고(숙제로 만들지 않기) 생각나는 만큼만 받는다.
// 발동 기준(대표님 2026-11-23): 마지막 입력일 포함 최근 만 30일의 입력일 수 N에 따라
//   25~30 → 3일째, 22~24 → 4일째, 20~21 → 5일째, 17~19 → 6일째, 16 이하 또는 데이터 부족 → 7일째.
//   데이터 부족 = 첫 입력이 14일 안쪽이거나 입력한 날이 7일 미만. 입력이 한 번도 없으면 발동하지 않는다.
//   '입력'은 체중·식사·운동(쉼 포함)·컨디션·식단 상태 중 무엇이든(예정 기록은 제외).
const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));

const DAY = 86400000;
const toDate = s => new Date(`${s}T12:00:00`);
const ymd = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
export const daysBetween = (a, b) => Math.round((toDate(b) - toDate(a)) / DAY);
export const addDays = (s, n) => ymd(new Date(toDate(s).getTime() + n * DAY));

export function recordDates(db) {
  const set = new Set();
  for (const b of db.body || []) if (b.date) set.add(b.date);
  for (const m of db.meals || []) if (m.date && !m.planned) set.add(m.date);
  for (const w of db.workouts || []) if (w.date && !w.planned) set.add(w.date);
  for (const [d, c] of Object.entries(db.checkins || {})) if (c && Object.values(c).some(v => v !== null && v !== '' && v !== undefined)) set.add(d);
  for (const [d, s] of Object.entries(db.dayStates || {})) if (s === 'fasting' || s === 'complete') set.add(d);
  return set;
}

export function thresholdFor(n, insufficient) {
  if (insufficient) return 7;
  if (n >= 25) return 3;
  if (n >= 22) return 4;
  if (n >= 20) return 5;
  if (n >= 17) return 6;
  return 7;
}

// 오늘(today) 기준으로 백 온 트랙을 띄울지. 띄우면 {last, gap, threshold, n, gapDates(최근 순)} 아니면 null
export function backOnTrack(db, today) {
  const dates = [...recordDates(db)].filter(d => d <= today).sort();
  if (!dates.length) return null;
  const last = dates[dates.length - 1], first = dates[0];
  const gap = daysBetween(last, today);
  const insufficient = daysBetween(first, today) < 14 || dates.length < 7;
  const from = addDays(last, -29);
  const n = dates.filter(d => d >= from && d <= last).length;
  const threshold = thresholdFor(n, insufficient);
  if (gap < threshold) return null;
  const gapDates = [];
  for (let d = addDays(today, -1); d > last; d = addDays(d, -1)) gapDates.push(d);
  return {last, gap, threshold, n, insufficient, gapDates};
}

// 이번 복귀 동안 닫았는지(마지막 입력일이 같으면 같은 복귀)
export function botDismissed(state, info) { return !!(state && info && state.last === info.last); }

const WD = ['일', '월', '화', '수', '목', '금', '토'];
export const dayLabel = s => { const d = toDate(s); return `${d.getMonth() + 1}/${d.getDate()} (${WD[d.getDay()]})`; };

export function botCardHTML(info) {
  const days = info.gapDates.length;
  return `<section class="section card bot-card" aria-label="백 온 트랙"><p class="bot-eyebrow">백 온 트랙 · 다시 리듬으로</p><h3>${days >= 20 ? '오랜만이에요.' : '다시 왔네요.'}</h3><p class="hint">기록은 한 번 끊기면 모든 게 귀찮아지죠. 알아요.<br>비워 둔 ${days}일, 어떻게 할까요? 어느 쪽이든 괜찮아요.</p><div class="bot-choice"><button class="button" data-bot="fill">생각나는 만큼 채워 볼게요</button><button class="button secondary" data-bot="skip">비워 두고 오늘부터</button></div></section>`;
}

export function initialFill(info) {
  const dates = info.gapDates.slice(0, 5);
  return {dates, values: Object.fromEntries(dates.map(d => [d, {meal: '', work: '', weight: '', rest: false}])), recall: '', open: dates[0] || null, more: info.gapDates.length > 5, last: info.last};
}

export function botFillHTML(fill) {
  const rows = fill.dates.map(d => {
    const v = fill.values[d] || {}, filled = v.meal || v.work || v.weight || v.rest, open = fill.open === d;
    return `<details class="bot-day" ${open ? 'open' : ''} data-bot-day="${d}"><summary><b>${dayLabel(d)}</b>${filled ? '<span class="bot-done">적음</span>' : '<span class="hint">비워 둬도 돼요</span>'}</summary>
<label class="field">식사 <small>생각나는 식사가 있다면 적어 주세요. 쉼표로 여러 개</small><input name="meal:${d}" value="${esc(v.meal || '')}" placeholder="예: 김치찌개, 저녁 치킨 반 마리" autocomplete="off"></label>
<label class="field">운동 <small>기억나는 만큼만 알려 주세요</small><input name="work:${d}" value="${esc(v.work || '')}" placeholder="예: 헬스 하체, 러닝 30분" autocomplete="off" ${v.rest ? 'disabled' : ''}></label>
<label class="check-row"><input type="checkbox" name="rest:${d}" ${v.rest ? 'checked' : ''}> 이날은 쉬었어요</label>
<details class="bot-weight"><summary>체중 <small>안 쟀다면 안 적어도 돼요</small></summary><label class="field"><input name="weight:${d}" type="number" step="0.1" inputmode="decimal" value="${esc(v.weight || '')}" placeholder="kg"></label></details>
</details>`;
  }).join('');
  return `<form id="bot-form" class="gap"><p class="hint">적고 싶은 날만 펼쳐서, 생각나는 것만 적어 주세요. 안 적은 날은 그대로 비워 둬요. 나중에 언제든 고칠 수 있어요.</p>
<details class="bot-recall"><summary>말로 한 번에 적기</summary><label class="field"><textarea name="recall" rows="3" placeholder="예: 화요일 점심 김치찌개, 수요일 저녁 BBQ 반 마리, 목요일 헬스 하체, 금요일 쉼">${esc(fill.recall || '')}</textarea></label><button type="button" class="button secondary" data-bot="parse">날짜별로 나눠 넣기</button><p class="hint">요일·어제·그제·날짜(11/20)를 보고 나눠 넣어요. 넣은 뒤 아래에서 확인해 주세요.</p></details>
${rows}
<div class="bot-more"><label class="field">더 이전 날짜도 적을래요<input type="date" id="bot-more-date" max="${fill.dates[fill.dates.length - 1] || ''}"></label><button type="button" class="button secondary" data-bot="more">추가</button></div>
<button class="button">이만하면 됐어요</button></form>`;
}

export function readBotForm(form, fill) {
  const fd = new FormData(form), values = {...fill.values};
  for (const d of fill.dates) values[d] = {meal: String(fd.get(`meal:${d}`) ?? values[d]?.meal ?? '').trim(), work: String(fd.get(`work:${d}`) ?? values[d]?.work ?? '').trim(), weight: String(fd.get(`weight:${d}`) ?? values[d]?.weight ?? '').trim(), rest: fd.get(`rest:${d}`) === 'on'};
  const open = form.querySelector('details.bot-day[open]')?.dataset.botDay || fill.open;
  return {...fill, values, recall: String(fd.get('recall') ?? fill.recall ?? ''), open};
}

// '말로 한 번에': 요일·어제·그제·M/D·D일로 날짜를 정하고, 운동·체중·쉼 단어를 골라 나머지는 식사로
const WORK_RE = /헬스|운동|하체|상체|등운동|가슴|어깨|팔운동|러닝|달리기|조깅|걷기|산책|필라테스|요가|수영|자전거|사이클|스쿼트|데드|벤치|크로스핏|등산|줄넘기|홈트|클라이밍|배드민턴|테니스|골프|축구|농구/;
const REST_RE = /^(쉼|쉬었|휴식|안\s*했|못\s*했)/;
export function parseRecall(text, dates, today) {
  const out = {}, chunks = String(text || '').split(/[,\n·;]|그리고|\.\s/).map(s => s.trim()).filter(Boolean);
  let cur = null;
  const pick = (s) => {
    if (/엊그제|그제|그저께/.test(s)) return addDays(today, -2);
    if (/어제/.test(s)) return addDays(today, -1);
    const md = s.match(/(?<![\d.])(1[0-2]|0?[1-9])\s*[/.월]\s*(3[01]|[12]\d|0?[1-9])(?![\d.]|\s*(?:kg|킬로))\s*일?/);
    if (md) { const y = Number(today.slice(0, 4)), m = Number(md[1]), d = Number(md[2]); let c = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`; if (c > today) c = `${y - 1}${c.slice(4)}`; return c; }
    const dd = s.match(/(^|\s)(\d{1,2})일(?!\s*(kg|킬로))/);
    if (dd) { const d = Number(dd[2]); return dates.find(x => Number(x.slice(8)) === d) || null; }
    const w = s.match(/([월화수목금토일])요일/);
    if (w) { const idx = WD.indexOf(w[1]); return dates.find(x => toDate(x).getDay() === idx) || null; }
    return null;
  };
  for (let c of chunks) {
    const d = pick(c);
    if (d) cur = d;
    if (!cur) continue;
    c = c.replace(/엊그제|그제|그저께|어제|(?<![\d.])(?:1[0-2]|0?[1-9])\s*[/.월]\s*(?:3[01]|[12]\d|0?[1-9])(?![\d.]|\s*(?:kg|킬로))\s*일?|(^|\s)\d{1,2}일|[월화수목금토일]요일(에|엔|은|는)?/g, ' ').replace(/\s+/g, ' ').trim().replace(/^(아침|점심|저녁|야식|간식)(에|엔|으로|은|는)?\s*/, '').trim();
    if (!c) continue;
    out[cur] = out[cur] || {meal: [], work: [], weight: '', rest: false};
    const wkg = c.match(/(\d{2,3}(?:\.\d)?)\s*(kg|킬로)/);
    if (wkg && /체중|몸무게|kg|킬로/.test(c) && !WORK_RE.test(c)) { out[cur].weight = wkg[1]; continue; }
    if (REST_RE.test(c)) { out[cur].rest = true; continue; }
    if (WORK_RE.test(c)) { out[cur].work.push(c); continue; }
    out[cur].meal.push(c.replace(/(을|를)?\s*(먹었|먹음|먹고).*$/, '').trim() || c);
  }
  return out;
}

export function mergeRecall(fill, parsed) {
  const dates = [...new Set([...fill.dates, ...Object.keys(parsed).filter(d => d < (fill.today || '9999'))])].sort().reverse();
  const values = {...fill.values};
  for (const [d, p] of Object.entries(parsed)) {
    const v = values[d] || {meal: '', work: '', weight: '', rest: false};
    values[d] = {meal: [v.meal, ...p.meal].filter(Boolean).join(', '), work: [v.work, ...p.work].filter(Boolean).join(', '), weight: p.weight || v.weight, rest: p.rest || v.rest};
  }
  const firstFilled = dates.find(d => Object.prototype.hasOwnProperty.call(parsed, d));
  return {...fill, dates, values, open: firstFilled || fill.open};
}

// 저장할 기록 만들기 — 식사는 이름만(영양값은 나중에), 운동은 기억한 내용만, 체중은 적었을 때만
export function botRecords(fill, makeId, nowIso) {
  const meals = [], body = [], workouts = [];
  for (const d of fill.dates) {
    const v = fill.values[d] || {};
    const group = makeId();
    String(v.meal || '').split(/[,\n]/).map(s => s.trim()).filter(Boolean).forEach((name, i) => meals.push({date: d, name, servingQty: 1, servingUnit: '회', slot: '식사', mealGroupId: group, loggedAt: `${d}T${String(12 + i).padStart(2, '0')}:00:00`, source: 'recall', note: '나중에 떠올려 적음 · 영양값은 비어 있어요', createdAt: nowIso, updatedAt: nowIso}));
    const w = Number(v.weight);
    if (v.weight && Number.isFinite(w) && w > 0) body.push({date: d, weight: w, source: 'recall', note: '나중에 떠올려 적음', measure: 'scale', createdAt: nowIso, updatedAt: nowIso});
    if (v.rest) workouts.push({date: d, rest: true, title: '쉬었어요', exercises: [], note: '나중에 떠올려 적음', loggedAtTime: '20:00', createdAt: nowIso, updatedAt: nowIso});
    else if (String(v.work || '').trim()) workouts.push({date: d, recalled: true, title: String(v.work).trim().slice(0, 60), exercises: [], note: `기억나는 만큼: ${String(v.work).trim()}`.slice(0, 300), loggedAtTime: '19:00', createdAt: nowIso, updatedAt: nowIso});
  }
  return {meals, body, workouts};
}
