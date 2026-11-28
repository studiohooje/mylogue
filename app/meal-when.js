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
 /* 2026-11-28 대표님: 13시에 13:30 예정을 넣고 싶음 → 미리는 지금 시도 남은 10분 칸(13:10~13:50)이 있으면 보인다 */return MEAL_HOURS.map(h => h*60).filter(m => date !== today || (mode === 'plan' ? m + 50 > cur : m <= cur)).map(toHM);
}
// 처음 고를 때 기본 시각
export function applyWhen(s, mode, now = new Date()){
 const today = todayStr(now), hm = nowHM(now), cur = now.getHours()*60 + now.getMinutes();
 s.when = mode; s.hourOpen = null;
 if (mode === 'now') { s.date = today; s.time = hm; }
 else if (mode === 'past') { s.date = s.date && s.date < today ? s.date : today; s.time = s.date < today ? '12:00' : toHM(Math.max(0, Math.floor(cur/60)*60 - 60)); }
 else if (mode === 'plan') { const next = Math.floor(cur/60)*60 + 60; if (next >= 1440) { s.date = addDays(today, 1); s.time = '08:00'; } else { s.date = today; s.time = toHM(next); } }
 return s;
}
const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
// 4.29.x 대표님: 시 칩을 누르면 그 시의 10분 단위 칩(10시·10:10·…·10:50)으로 바뀌고, 같은 시를 다시 누르면 처음 시 칩으로.
// 줄 끝에는 늘 '직접 입력' 칸(지금 고른 시각)이 있어 10:35처럼 바로 고칠 수 있다. 다른 화면에서도 같은 부품을 쓴다.
// opts: {hours:['10:00',…], time:'HH:MM', openHour:null|숫자, attr:'data-q-when', minuteOk:(분 단위 'HH:MM')=>boolean}
export function hourMinuteChipsHTML({hours = [], time = '', openHour = null, attr = 'data-q-when', minuteOk = () => true, emptyHint = ''} = {}){
 const chip = (a, val, label, on) => `<button type="button" class="chip ${on ? 'active' : ''}" ${a}="${esc(val)}" aria-pressed="${on}">${esc(label)}</button>`;
 const curH = Number(String(time).slice(0, 2)), manual = `<label class="q-when-manual"><span class="sr-only">시각 직접 입력</span><input type="time" data-no-when ${attr}-manual value="${esc(time)}" step="60" inputmode="numeric"></label>`;
 if (openHour != null) {
  const h = pad(openHour), mins = [10, 20, 30, 40, 50].map(m => `${h}:${pad(m)}`).filter(minuteOk);
  return `<div class="chip-row q-hours q-mins">${chip(`${attr}-hour`, openHour, `${openHour}시`, true)}${mins.map(t => chip(`${attr}-time`, t, `${openHour}시 ${Number(t.slice(3))}분`, time === t)).join('')}${manual}</div>`;
 }
 return `<div class="chip-row q-hours">${hours.length ? hours.map(t => { const hh = Number(t.slice(0, 2)); return chip(`${attr}-hour`, hh, `${hh}시`, curH === hh); }).join('') : `<small class="hint">${esc(emptyHint)}</small>`}${manual}</div>`;
}
const md = d => `${Number(d.slice(5, 7))}/${Number(d.slice(8, 10))}`;
const hm12 = t => { const [h, m] = t.split(':').map(Number); return `${h < 12 ? '오전' : '오후'} ${h%12 || 12}:${pad(m)}`; };

// 운동 기록의 '어떻게 기록할까요?'(실시간 입력 / 한 번에 입력 / 의도적 휴식)와 같은 틀
export function mealWhenChooserHTML(){
 return `<div class="quick-flow q-live-start q-meal-start">
<button type="button" class="q-live-card live" data-q-when="now"><span class="q-live-ico" aria-hidden="true">⏱</span><span><b>방금 먹은 것</b></span></button>
<button type="button" class="q-live-card" data-q-when="past"><span class="q-live-ico" aria-hidden="true">✎</span><span><b>전에 먹은 것</b></span></button>
<button type="button" class="q-live-card alt" data-q-when="plan"><span class="q-live-ico" aria-hidden="true">▦</span><span><b>먹을 것 미리</b></span></button></div>`;
}

export function mealWhenBarHTML(s, now = new Date()){
 if (!s.when) return '';
 const today = todayStr(now), dateLabel = s.date === today ? '오늘' : s.date === addDays(today, -1) ? '어제' : s.date === addDays(today, 1) ? '내일' : md(s.date);
 const title = s.when === 'now' ? '방금 먹은 것' : s.when === 'past' ? '전에 먹은 것' : s.when === 'plan' ? '앞으로 먹을 것 · 예정' : '이 식사에 더하기';
 const chip = (attr, val, label, on) => `<button type="button" class="chip ${on ? 'active' : ''}" ${attr}="${esc(val)}">${esc(label)}</button>`;
 let rows = '';
 if (s.when === 'now') {
  const n = nowHM(now), top = `${pad(now.getHours())}:00`;
  rows = `<div class="chip-row">${chip('data-q-when-time', n, `지금 ${n}`, s.time === n && s.date === today)}${top !== n ? chip('data-q-when-time', top, `정각 ${top}`, s.time === top && s.date === today) : ''}${[-10, -30, -60].map(m => chip('data-q-when-shift', m, m === -60 ? '−1시간' : `−${-m}분`, false)).join('')}<label class="q-when-manual"><span class="sr-only">시각 직접 입력</span><input type="time" data-no-when data-q-when-manual value="${esc(s.time || n)}" step="60"></label></div>`;
 } else if (s.when === 'past' || s.when === 'plan') {
  const days = s.when === 'past' ? [[today, '오늘'], [addDays(today, -1), '어제'], [addDays(today, -2), '그제']] : [[today, '오늘'], [addDays(today, 1), '내일'], [addDays(today, 2), '모레']];
  const hours = s.when === 'past' ? hourChips(s.when, s.date, now).reverse() : hourChips(s.when, s.date, now); // 전에 먹은 것은 가까운 시각부터
  const cur = now.getHours()*60 + now.getMinutes(), isToday = s.date === today;
  const minuteOk = t => !isToday || (s.when === 'plan' ? toMin(t) > cur : toMin(t) <= cur);
  rows = `<div class="chip-row">${days.map(([d, l]) => chip('data-q-when-date', d, l, s.date === d)).join('')}</div>${hourMinuteChipsHTML({hours, time: s.time, openHour: s.hourOpen ?? null, minuteOk, emptyHint: '고를 수 있는 시각이 없어요. 날짜를 바꾸거나 오른쪽 칸에 직접 적어 주세요.'})}${s.when === 'plan' ? '<p class="hint q-plan-note">예정으로 저장돼요. 하루 칼로리·탄단지에 \'예정 포함\'으로 미리 더해 볼 수 있고, 먹은 뒤 \'먹었어요\'를 누르면 확정돼요.</p>' : ''}`;
 }
 return `<section class="q-plan q-when-bar"><div class="q-live-line"><span class="q-live-badge ${s.when === 'now' ? 'live' : ''}">${s.when === 'now' ? '● ' : ''}${esc(title)}</span>${s.when === 'fixed' ? '' : '<button type="button" class="text-button" data-q-when-reset>입력 방식 바꾸기</button>'}</div>${s.when === 'now' ? '' : `<p class="q-when-at">${esc(dateLabel)} ${esc(hm12(s.time || '12:00'))}</p>`}${rows}</section>`;
}

// 시 칩·직접 입력 처리(화면 쪽 공용): 같은 시를 다시 누르면 접기, 다른 시면 그 시 정각으로 열기
export function toggleHour(s, hour, now = new Date()){
 const h = Number(hour);
 if (s.hourOpen === h) { s.hourOpen = null; return s; }
 s.hourOpen = h; s.time = `${pad(h)}:00`;
 /* 미리 고르는데 오늘 지금 시면 정각은 지났으니 다음 10분 칸으로 */const cur = now.getHours()*60 + now.getMinutes();
 if (s.when === 'plan' && s.date === todayStr(now) && h*60 <= cur) s.time = toHM(Math.min(h*60 + 50, (Math.floor(cur/10) + 1)*10));
 return s;
}
export function setManualTime(s, value){
 if (!/^\d{2}:\d{2}$/.test(String(value || ''))) return false;
 s.time = value; s.hourOpen = Number(value.slice(0, 2)); return true;
}
