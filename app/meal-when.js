// 4.26.0 대표님 지시: 식사도 운동처럼 처음에 '언제 먹은 것인지'를 고른다.
// 방금 먹은 것(지금 · 정각 · −10분·−30분·−1시간) / 전에 먹은 것(오늘·어제·그제 + 시각 칩) / 앞으로 먹을 것 미리(예정 → 하루 칼로리·탄단지 미리 계산).
// 이 파일은 app.js를 import하지 않는다.
const pad = n => String(n).padStart(2, '0');
const ymd = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const todayStr = (now = new Date()) => ymd(now);
export const nowHM = (now = new Date()) => `${pad(now.getHours())}:${pad(now.getMinutes())}`;
export const addDays = (date, n) => { const d = new Date(`${date}T12:00:00`); d.setDate(d.getDate() + n); return ymd(d); };
const toMin = hm => { const [h, m] = String(hm || '0:0').split(':').map(Number); return (h || 0)*60 + (m || 0); };
const toHM = m => `${pad(Math.floor(m/60))}:${pad(m%60)}`;
// 시각을 분만큼 옮긴다(자정을 넘으면 날짜도)
export function shiftWhen(date, time, mins){
 let t = toMin(time) + mins, d = date;
 while (t < 0) { t += 1440; d = addDays(d, -1); }
 while (t >= 1440) { t -= 1440; d = addDays(d, 1); }
 return {date: d, time: toHM(t)};
}
export const MEAL_HOURS = [6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23];
// 고를 수 있는 시각 칩: 오늘이면 전에 먹은 것은 지금 이전, 미리는 지금 이후만
export function hourChips(mode, date, now = new Date()){
 const today = todayStr(now), cur = now.getHours()*60 + now.getMinutes();
 return MEAL_HOURS.map(h => h*60).filter(m => date !== today || (mode === 'plan' ? m > cur : m <= cur)).map(toHM);
}
// 처음 고를 때 기본 시각
export function applyWhen(s, mode, now = new Date()){
 const today = todayStr(now), hm = nowHM(now), cur = now.getHours()*60 + now.getMinutes();
 s.when = mode;
 if (mode === 'now') { s.date = today; s.time = hm; }
 else if (mode === 'past') { s.date = s.date && s.date < today ? s.date : today; s.time = s.date < today ? '12:00' : toHM(Math.max(0, Math.floor(cur/60)*60 - 60)); }
 else if (mode === 'plan') { const next = Math.floor(cur/60)*60 + 60; if (next >= 1440) { s.date = addDays(today, 1); s.time = '08:00'; } else { s.date = today; s.time = toHM(next); } }
 return s;
}
const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const md = d => `${Number(d.slice(5, 7))}/${Number(d.slice(8, 10))}`;
const hm12 = t => { const [h, m] = t.split(':').map(Number); return `${h < 12 ? '오전' : '오후'} ${h%12 || 12}:${pad(m)}`; };

// 운동 기록의 '어떻게 기록할까요?'(실시간 입력 / 한 번에 입력 / 의도적 휴식)와 같은 틀
export function mealWhenChooserHTML(){
 return `<div class="quick-flow q-live-start q-meal-start"><h3>어떻게 기록할까요?</h3><p class="hint">언제 먹은 건지 골라 주세요.</p>
<button type="button" class="q-live-card live" data-q-when="now"><span class="q-live-ico" aria-hidden="true">⏱</span><span><b>방금 먹은 것</b><small>지금 시각으로 바로 적어요. −10분·−30분·정각으로 쉽게 맞춰요.</small></span></button>
<button type="button" class="q-live-card" data-q-when="past"><span class="q-live-ico" aria-hidden="true">✎</span><span><b>전에 먹은 것</b><small>아침·점심처럼 지난 끼니를 날짜와 시각을 골라 적어요. 어제 것도 돼요.</small></span></button>
<button type="button" class="rest-btn q-plan-btn" data-q-when="plan"><span class="q-plan-ico" aria-hidden="true">▦</span><span><b>앞으로 먹을 것 미리</b><small>미리 넣어 두면 오늘 칼로리·탄단지를 '예정 포함'으로 미리 계산해 봐요</small></span></button></div>`;
}

export function mealWhenBarHTML(s, now = new Date()){
 if (!s.when) return '';
 const today = todayStr(now), dateLabel = s.date === today ? '오늘' : s.date === addDays(today, -1) ? '어제' : s.date === addDays(today, 1) ? '내일' : md(s.date);
 const title = s.when === 'now' ? '방금 먹은 것' : s.when === 'past' ? '전에 먹은 것' : s.when === 'plan' ? '앞으로 먹을 것 · 예정' : '이 식사에 더하기';
 const chip = (attr, val, label, on) => `<button type="button" class="chip ${on ? 'active' : ''}" ${attr}="${esc(val)}">${esc(label)}</button>`;
 let rows = '';
 if (s.when === 'now') {
  const n = nowHM(now), top = `${pad(now.getHours())}:00`;
  rows = `<div class="chip-row">${chip('data-q-when-time', n, `지금 ${n}`, s.time === n && s.date === today)}${top !== n ? chip('data-q-when-time', top, `정각 ${top}`, s.time === top && s.date === today) : ''}${[-10, -30, -60].map(m => chip('data-q-when-shift', m, m === -60 ? '−1시간' : `−${-m}분`, false)).join('')}</div>`;
 } else if (s.when === 'past' || s.when === 'plan') {
  const days = s.when === 'past' ? [[today, '오늘'], [addDays(today, -1), '어제'], [addDays(today, -2), '그제']] : [[today, '오늘'], [addDays(today, 1), '내일'], [addDays(today, 2), '모레']];
  const hours = s.when === 'past' ? hourChips(s.when, s.date, now).reverse() : hourChips(s.when, s.date, now); // 전에 먹은 것은 가까운 시각부터
  rows = `<div class="chip-row">${days.map(([d, l]) => chip('data-q-when-date', d, l, s.date === d)).join('')}</div><div class="chip-row q-hours">${hours.length ? hours.map(h => chip('data-q-when-time', h, `${Number(h.slice(0, 2))}시`, s.time === h)).join('') : '<small class="hint">고를 수 있는 시각이 없어요. 날짜를 바꾸거나 아래에서 직접 적어 주세요.</small>'}</div>${s.when === 'plan' ? '<p class="hint q-plan-note">예정으로 저장돼요. 하루 칼로리·탄단지에 \'예정 포함\'으로 미리 더해 볼 수 있고, 먹은 뒤 \'먹었어요\'를 누르면 확정돼요.</p>' : ''}`;
 }
 return `<section class="q-plan q-when-bar"><div class="q-live-line"><span class="q-live-badge ${s.when === 'now' ? 'live' : ''}">${s.when === 'now' ? '● ' : ''}${esc(title)}</span>${s.when === 'fixed' ? '' : '<button type="button" class="text-button" data-q-when-reset>입력 방식 바꾸기</button>'}</div><p class="q-when-at">${esc(dateLabel)} ${esc(hm12(s.time || '12:00'))}</p>${rows}</section>`;
}
