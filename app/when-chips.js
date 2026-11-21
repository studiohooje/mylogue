// 4.0.0 날짜·시각 빠른 입력(대표님 요청): 기록 창 안의 날짜·시각 칸 아래에 버튼 줄을 붙인다.
// 기본값은 지금 날짜·지금 시각. 날짜: 어제·오늘·내일 / 시각: 지금·가까운 정시·±15분·±30분·±1시간.
// 칸 값을 바꾼 뒤 input·change 이벤트를 보내 기존 입력 처리(상태 저장)가 그대로 동작하게 한다.
const pad = n => String(n).padStart(2, '0');
const ymd = d => `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
const hm = d => `${pad(d.getHours())}:${pad(d.getMinutes())}`;
const STEPS = [[-60,'−1시간'], [-30,'−30분'], [-15,'−15분'], [15,'+15분'], [30,'+30분'], [60,'+1시간']];

function dateRow(){ return `<div class="when-row" data-when-row="date"><button type="button" class="when-chip" data-when="d:-1">어제</button><button type="button" class="when-chip" data-when="d:0">오늘</button><button type="button" class="when-chip" data-when="d:1">내일</button></div>`; }
function timeRow(){ const now = new Date(), hour = `${pad(now.getHours())}:00`; return `<div class="when-row" data-when-row="time"><button type="button" class="when-chip strong" data-when="t:now">지금</button><button type="button" class="when-chip" data-when="t:hour">${hour}</button>${STEPS.map(([m, l]) => `<button type="button" class="when-chip step" data-when="t:${m}">${l}</button>`).join('')}</div>`; }

// 창(.sheet) 안의 날짜·시각 칸에 한 번만 버튼 줄을 붙인다. data-no-when이 있으면 건너뛴다.
export function enhanceWhenInputs(root = document){
 if(typeof root?.querySelectorAll!=='function' || typeof document==='undefined' || typeof document.createElement!=='function') return;
 for(const input of root.querySelectorAll('.sheet input[type=date], .sheet input[type=time], .sheet input[type=datetime-local]')){
  if(input.dataset.whenDone || input.dataset.noWhen!==undefined || input.disabled) continue;
  input.dataset.whenDone = '1';
  if(!input.id) input.id = `when-${Math.random().toString(36).slice(2, 9)}`;
  const box = document.createElement('div');
  box.className = 'when-chips';
  box.dataset.whenFor = input.id;
  box.innerHTML = input.type==='date' ? dateRow() : input.type==='time' ? timeRow() : dateRow() + timeRow();
  (input.closest('label') || input).insertAdjacentElement('afterend', box);
 }
}

function read(input){
 if(input.type==='date') return new Date(`${input.value || ymd(new Date())}T12:00:00`);
 if(input.type==='time'){ const d = new Date(); const [h, m] = (input.value || hm(d)).split(':').map(Number); d.setHours(h, m, 0, 0); return d; }
 const v = input.value ? new Date(input.value) : new Date(); return Number.isNaN(v.getTime()) ? new Date() : v;
}
function write(input, d){
 input.value = input.type==='date' ? ymd(d) : input.type==='time' ? hm(d) : `${ymd(d)}T${hm(d)}`;
 input.dispatchEvent(new Event('input', {bubbles:true}));
 input.dispatchEvent(new Event('change', {bubbles:true}));
}
// 버튼을 누르면 칸 값을 바꾼다. 처리했으면 true.
export function handleWhenClick(target){
 const b = target?.closest?.('[data-when]'); if(!b || !b.dataset?.when || typeof b.closest!=='function') return false;
 const box = b.closest('[data-when-for]'), input = box && document.getElementById(box.dataset.whenFor); if(!input) return true;
 const [kind, arg] = b.dataset.when.split(':'), now = new Date();
 let d = read(input);
 if(kind==='d'){ const base = new Date(now); base.setDate(base.getDate() + Number(arg)); if(input.type==='date') d = base; else { base.setHours(d.getHours(), d.getMinutes(), 0, 0); d = base; } }
 else if(arg==='now'){ if(input.type==='datetime-local'){ const keep = d; d = new Date(keep); d.setHours(now.getHours(), now.getMinutes(), 0, 0); } else d = now; }
 else if(arg==='hour'){ d = new Date(d); d.setHours(now.getHours(), 0, 0, 0); }
 else { d = new Date(d.getTime() + Number(arg)*60000); }
 write(input, d);
 return true;
}
