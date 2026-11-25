// 4.0.0 날짜·시각 빠른 입력 → 4.2.0 '언제' 칸 통일(대표님 승인 제안 2).
// 기록 창(.sheet) 안의 날짜·시각 입력을 한 블록으로 묶는다: 위 줄 = 날짜 칸 + 시각 칸(무엇인지 작게 표시), 아래 = 자주 쓰는 버튼,
// (4.4.2 쓰이지 않던 15분 단위 표 제거) 입력 칸 자체는 그대로 두므로 저장 로직은 바뀌지 않는다(값을 바꾸면 input·change 이벤트를 보낸다).
const pad = n => String(n).padStart(2, '0');
const ymd = d => `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
const hm = d => `${pad(d.getHours())}:${pad(d.getMinutes())}`;
const WD = '일월화수목금토';
const STEPS = [[-30,'−30분'], [-60,'−1시간'], [-120,'−2시간']]; // 4.17.0 기록은 대개 지난 일이라 뒤로 가는 것만(나머지는 시각 버튼의 고르기 판에서)

export function relDate(v, now = new Date()){
 if(!v) return '';
 const d = new Date(`${v}T12:00:00`); if(Number.isNaN(d.getTime())) return '';
 const g = Math.round((d - new Date(`${ymd(now)}T12:00:00`))/86400000);
 const name = g===0?'오늘':g===-1?'어제':g===1?'내일':g<0?`${-g}일 전`:`${g}일 뒤`;
 return `${name} · ${d.getMonth()+1}/${d.getDate()} ${WD[d.getDay()]}`;
}
export function relTime(v){
 if(!/^\d{2}:\d{2}/.test(v||'')) return '';
 const [h, m] = v.split(':').map(Number);
 return `${h<12?'오전':'오후'} ${h%12||12}:${pad(m)}`;
}

function dateChips(id){ return `<div class="when-row" data-when-row="date">${[['d:-1','어제'],['d:0','오늘'],['d:1','내일']].map(([c, l]) => `<button type="button" class="when-chip" data-when="${c}" data-when-target="${id}">${l}</button>`).join('')}</div>`; }
function timeChips(id){ const now = new Date(); return `<div class="when-row" data-when-row="time"><button type="button" class="when-chip strong" data-when="t:now" data-when-target="${id}">지금</button><button type="button" class="when-chip" data-when="t:hour" data-when-target="${id}">${pad(now.getHours())}:00</button>${STEPS.map(([m, l]) => `<button type="button" class="when-chip step" data-when="t:${m}" data-when-target="${id}">${l}</button>`).join('')}</div><div class="when-tp" data-when-tp="${id}" hidden></div>`; }
// 4.2.1 시각 고르기 판 → 4.29.x 대표님: 식사 화면과 같은 칩 방식으로 통일.
// 오전/오후 → 시 칩(24시 표기). 시를 누르면 그 시의 10분 단위 칩(10시·10시 10분…10시 50분)으로 바뀌고, 같은 시를 다시 누르면 시 칩으로.
// 아래 줄에는 늘 직접 입력 칸(지금 값)과 '완료'. 판의 상태(열린 시·오전/오후)는 판 요소의 data-open-hour·data-half에 둔다.
export function timePanelHTML(id, v, {openHour = null, half = null} = {}){
 const [H, M] = (/^\d{2}:\d{2}/.test(v||'') ? v : hm(new Date())).split(':').map(Number);
 const pm = half ? half === 'pm' : H >= 12, cur = `${pad(H)}:${pad(M)}`;
 const b = (code, label, on, cls='') => `<button type="button" class="chip tp-btn${on?' active on':''}${cls?' '+cls:''}" data-when="${code}" data-when-target="${id}" aria-pressed="${!!on}">${label}</button>`;
 const oh = openHour === null || openHour === '' || openHour === undefined ? null : Number(openHour);
 const top = oh !== null
  ? `<div class="chip-row tp-chips tp-mins">${b(`hx:${oh}`, `${oh}시`, true)}${[10,20,30,40,50].map(n => b(`mm:${n}`, `${oh}시 ${n}분`, oh === H && n === M)).join('')}</div>`
  : `<div class="tp-row tp-ap">${b('ap:am','오전',!pm)}${b('ap:pm','오후',pm)}</div><div class="chip-row tp-chips tp-hours">${(pm ? [12,13,14,15,16,17,18,19,20,21,22,23] : [0,1,2,3,4,5,6,7,8,9,10,11]).map(n => b(`hx:${n}`, `${n}시`, n === H)).join('')}</div>`;
 return `${top}<div class="tp-row tp-foot"><label class="tp-manual"><span class="sr-only">시각 직접 입력</span><input type="time" data-no-when data-when-manual="${id}" value="${cur}" step="60"></label>${b('tpx','완료','', 'done')}</div>`;
}
const panelState = tp => ({openHour: tp?.dataset?.openHour ?? null, half: tp?.dataset?.half || null});
function timeButton(input){
 if(input.type!=='time' || input.nextElementSibling?.classList?.contains('when-timebtn')) return;
 input.classList.add('when-native');
 const btn = document.createElement('button');
 btn.type = 'button'; btn.className = 'when-timebtn'; btn.dataset.when = 'tp'; btn.dataset.whenTarget = input.id; btn.dataset.whenBtn = input.id; btn.setAttribute('aria-expanded', 'false');
 btn.textContent = relTime(input.value) || '시각 고르기';
 input.insertAdjacentElement('afterend', btn);
}

function ensureId(input){ if(!input.id) input.id = `when-${Math.random().toString(36).slice(2, 9)}`; return input.id; }
function capOf(input){ return input.type==='date' ? relDate(input.value) : input.type==='time' ? relTime(input.value) : input.value ? `${relDate(input.value.slice(0,10))} ${relTime(input.value.slice(11,16))}` : ''; }

// 창(.sheet) 안의 날짜·시각을 '언제' 블록으로. data-no-when이 있으면 건너뛴다.
export function enhanceWhenInputs(root = document){
 if(typeof root?.querySelectorAll!=='function' || typeof document==='undefined' || typeof document.createElement!=='function') return;
 const usable = el => el && !el.dataset.whenDone && el.dataset.noWhen===undefined;
 for(const dateInput of root.querySelectorAll('.sheet input[type=date], .sheet input[type=datetime-local]')){
  if(!usable(dateInput)) continue;
  const scope = dateInput.closest('form') || dateInput.closest('.sheet');
  const timeInput = dateInput.type==='date' ? [...scope.querySelectorAll('input[type=time]')].find(usable) : null;
  const dl = dateInput.closest('label') || dateInput, tl = timeInput ? (timeInput.closest('label') || timeInput) : null;
  const block = document.createElement('div');
  block.className = 'when-block';
  block.innerHTML = `<div class="when-title">언제</div><div class="when-main${tl?'':' one'}"></div>`;
  dl.parentNode.insertBefore(block, dl);
  const main = block.querySelector('.when-main');
  for(const [lab, inp] of [[dl, dateInput], [tl, timeInput]]){
   if(!lab) continue;
   inp.dataset.whenDone = '1'; ensureId(inp);
   lab.classList.add('when-pill');
   if(inp.type==='time') timeButton(inp);
   else if(!lab.querySelector('.when-cap')){ const cap = document.createElement('small'); cap.className = 'when-cap'; cap.dataset.whenCap = inp.id; cap.textContent = capOf(inp); lab.append(cap); }
   main.append(lab);
  }
  const chips = document.createElement('div');
  chips.className = 'when-chips';
  chips.innerHTML = dateChips(dateInput.id) + (timeInput ? timeChips(timeInput.id) : dateInput.type==='datetime-local' ? timeChips(dateInput.id) : '');
  block.append(chips);
  if(dateInput.disabled) block.classList.add('date-locked');
 }
 // 짝 없는 시각 칸(시각만 있는 창)
 for(const t of root.querySelectorAll('.sheet input[type=time]')){
  if(!usable(t)) continue;
  t.dataset.whenDone = '1'; ensureId(t);
  const lab = t.closest('label') || t, block = document.createElement('div');
  block.className = 'when-block'; block.innerHTML = '<div class="when-title">언제</div><div class="when-main one"></div>';
  lab.parentNode.insertBefore(block, lab); lab.classList.add('when-pill'); timeButton(t); block.querySelector('.when-main').append(lab);
  const chips = document.createElement('div'); chips.className = 'when-chips'; chips.innerHTML = timeChips(t.id); block.append(chips);
 }
 bindCaptions();
}
let captionsBound = false;
function bindCaptions(){
 if(captionsBound || typeof document.addEventListener!=='function') return; captionsBound = true;
 document.addEventListener('input', e => { const t = e.target;
  // 4.29.x 판 안 직접 입력: 진짜 칸에 옮기되 판은 다시 그리지 않는다(입력 중 포커스 유지)
  if(t?.dataset?.whenManual){ const real = document.getElementById(t.dataset.whenManual); if(real && /^\d{2}:\d{2}$/.test(t.value)){ real.value = t.value; const btn = document.querySelector(`[data-when-btn="${real.id}"]`); if(btn) btn.textContent = relTime(real.value); const [mh, mm] = t.value.split(':').map(Number); for(const b of t.closest('.when-tp')?.querySelectorAll('[data-when^="mm:"]') || []){ const on = Number(b.dataset.when.slice(3)) === mm; b.classList.toggle('active', on); b.classList.toggle('on', on); b.setAttribute('aria-pressed', String(on)); } real.dispatchEvent(new Event('input', {bubbles:true})); real.dispatchEvent(new Event('change', {bubbles:true})); } return; }
  if(!t?.dataset?.whenDone) return; const cap = document.querySelector(`[data-when-cap="${t.id}"]`); if(cap) cap.textContent = capOf(t); });
}

function read(input){
 if(input.type==='date') return new Date(`${input.value || ymd(new Date())}T12:00:00`);
 if(input.type==='time'){ const d = new Date(); const [h, m] = (input.value || hm(d)).split(':').map(Number); d.setHours(h, m, 0, 0); return d; }
 const v = input.value ? new Date(input.value) : new Date(); return Number.isNaN(v.getTime()) ? new Date() : v;
}
// 4.4.2 점검 A-12: 시각만 있는 칸에서 자정을 넘기면 같은 '언제' 블록의 날짜 칸도 하루 옮긴다.
function shiftDate(input, days){ if(!days || input.type!=='time') return; const di = input.closest?.('.when-block')?.querySelector('input[type="date"]'); if(!di) return; const d = new Date(`${di.value || ymd(new Date())}T12:00:00`); d.setDate(d.getDate() + days); write(di, d); }
function write(input, d){
 input.value = input.type==='date' ? ymd(d) : input.type==='time' ? hm(d) : `${ymd(d)}T${hm(d)}`;
 const btn = document.querySelector(`[data-when-btn="${input.id}"]`); if(btn) btn.textContent = relTime(input.value) || '시각 고르기';
 const tp = document.querySelector(`[data-when-tp="${input.id}"]`); if(tp && !tp.hidden) tp.innerHTML = timePanelHTML(input.id, input.value, panelState(tp));
 input.dispatchEvent(new Event('input', {bubbles:true}));
 input.dispatchEvent(new Event('change', {bubbles:true}));
}
// 버튼을 누르면 칸 값을 바꾼다. 처리했으면 true.
export function handleWhenClick(target){
 const b = target?.closest?.('[data-when]'); if(!b || !b.dataset?.when || typeof b.closest!=='function') return false;
 const input = document.getElementById(b.dataset.whenTarget || b.closest('[data-when-for]')?.dataset.whenFor || ''); if(!input || input.disabled) return true;
 const code = b.dataset.when;
 if(code==='tp' || code==='tpx'){ const tp = document.querySelector(`[data-when-tp="${input.id}"]`); if(!tp) return true; const open = code==='tp' ? tp.hidden : false; tp.hidden = !open; if(open){ delete tp.dataset.openHour; delete tp.dataset.half; tp.innerHTML = timePanelHTML(input.id, input.value); } document.querySelector(`[data-when-btn="${input.id}"]`)?.setAttribute('aria-expanded', String(open)); return true; }
 if(code==='tpn'){ input.classList.remove('when-native'); input.focus?.(); input.showPicker?.(); const tp = document.querySelector(`[data-when-tp="${input.id}"]`); if(tp) tp.hidden = true; return true; }
 // 4.29.x 칩 방식: 오전/오후는 보이는 시만 바꾸고, 시 칩은 열기/접기, 분 칩은 열린 시의 분
 if(/^(ap|hx):/.test(code)){ const tp = document.querySelector(`[data-when-tp="${input.id}"]`); const [k, a] = code.split(':');
  if(k==='ap'){ if(tp){ tp.dataset.half = a; delete tp.dataset.openHour; tp.innerHTML = timePanelHTML(input.id, input.value, panelState(tp)); } return true; }
  const h = Number(a); if(tp && tp.dataset.openHour === String(h)){ delete tp.dataset.openHour; tp.dataset.half = h >= 12 ? 'pm' : 'am'; tp.innerHTML = timePanelHTML(input.id, input.value, panelState(tp)); return true; }
  if(tp) tp.dataset.openHour = String(h);
  const d = new Date(); d.setHours(h, 0, 0, 0); write(input, d); return true; }
 if(code.startsWith('mm:')){ const tp = document.querySelector(`[data-when-tp="${input.id}"]`); const oh = tp?.dataset?.openHour; if(oh != null && oh !== ''){ const d = new Date(); d.setHours(Number(oh), Number(code.slice(3)), 0, 0); write(input, d); return true; } }
 if(/^(ap|hh|mm|mf):/.test(code)){ const [k, a] = code.split(':'); const [H0, M0] = (/^\d{2}:\d{2}/.test(input.value||'') ? input.value : hm(new Date())).split(':').map(Number); let H = H0, M = M0;
  if(k==='ap') H = a==='pm' ? (H%12)+12 : H%12;
  if(k==='hh'){ const n = Number(a)%12; H = (H>=12 ? 12 : 0) + n; }
  if(k==='mm') M = Number(a);
  let carry = 0; if(k==='mf'){ let t = H*60 + M + Number(a); carry = Math.floor(t/1440); t = (t%1440 + 1440) % 1440; H = Math.floor(t/60); M = t%60; }
  const d = new Date(); d.setHours(H, M, 0, 0); write(input, d); shiftDate(input, carry); return true; }
 const [kind, arg] = code.split(':'), now = new Date();
 let d = read(input);
 if(kind==='d'){ const base = new Date(now); base.setDate(base.getDate() + Number(arg)); if(input.type==='date') d = base; else { base.setHours(d.getHours(), d.getMinutes(), 0, 0); d = base; } }
 else if(arg==='now'){ if(input.type==='datetime-local'){ d = new Date(d); d.setHours(now.getHours(), now.getMinutes(), 0, 0); } else d = now; }
 else if(arg==='hour'){ d = new Date(d); d.setHours(now.getHours(), 0, 0, 0); }
 else { const before = new Date(d); d = new Date(d.getTime() + Number(arg)*60000); const days = Math.round((new Date(ymd(d)+'T12:00:00') - new Date(ymd(before)+'T12:00:00'))/86400000); write(input, d); shiftDate(input, days); return true; }
 write(input, d);
 return true;
}
