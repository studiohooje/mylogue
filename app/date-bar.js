// 4.2.0 날짜 바(대표님 승인 제안 1): 홈·식단·운동이 같은 부품으로 '보는 날'을 바꾼다.
// ‹ › 하루씩(좌우로 밀어도 됨), 가운데를 누르면 기록한 날에 점이 찍힌 작은 달력, 다른 날이면 노란 바 + '오늘로'.
const esc = v => String(v??'').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const pad = n => String(n).padStart(2, '0');
export const ymd = d => `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
const WD = '일월화수목금토';
export function shiftDate(date, days){ const d = new Date(`${date}T12:00:00`); d.setDate(d.getDate() + Number(days||0)); return ymd(d); }
export function dayGap(date, today){ return Math.round((new Date(`${date}T12:00:00`) - new Date(`${today}T12:00:00`))/86400000); }
export function relLabel(date, today){
 const g = dayGap(date, today);
 if(g===0) return '오늘'; if(g===-1) return '어제'; if(g===1) return '내일'; if(g===-2) return '그저께';
 return g<0 ? `${-g}일 전` : `${g}일 뒤`;
}
export const eulReul = w => { const c = String(w).charCodeAt(String(w).length-1); return w + (c>=0xAC00&&c<=0xD7A3&&(c-0xAC00)%28 ? '을' : '를'); };
export function dateLabel(date){ const d = new Date(`${date}T12:00:00`); return `${d.getMonth()+1}월 ${d.getDate()}일 (${WD[d.getDay()]})`; }

function miniCalendar(date, today, month, marked){
 const base = new Date(`${(month||date).slice(0,7)}-01T12:00:00`), y = base.getFullYear(), m = base.getMonth(), first = new Date(y, m, 1).getDay(), count = new Date(y, m+1, 0).getDate();
 const cells = Array.from({length:first}, () => '<span></span>');
 for(let n=1; n<=count; n++){ const k = `${y}-${pad(m+1)}-${pad(n)}`; cells.push(`<button type="button" class="db-day${k===date?' sel':''}${k===today?' td':''}${marked.has(k)?' rec':''}" data-db-pick="${k}" aria-label="${k}${marked.has(k)?' 기록 있음':''}">${n}</button>`); }
 return `<div class="db-pop" role="dialog" aria-label="날짜 고르기"><div class="db-pop-head"><button type="button" data-db-month="-1" aria-label="이전 달">‹</button><b>${y}년 ${m+1}월</b><button type="button" data-db-month="1" aria-label="다음 달">›</button></div><div class="db-cal">${[...WD].map(x => `<i>${x}</i>`).join('')}${cells.join('')}</div><div class="db-pop-foot"><small>점 = 기록한 날</small>${date!==today?'<button type="button" class="db-today" data-db-today>오늘로</button>':''}</div></div>`;
}

// marked: 점을 찍을 날짜 Set
// 5.0.4 대표님: 식단·운동은 날짜 바가 자리를 많이 차지해서 머리글(제목 아래) 안에 작게(mini).
export function dateBarHTML(date, today, {open=false, month=null, marked=new Set(), mini=false}={}){
 const other = date!==today;
 if(mini) return `<div class="db-wrap db-mini${other?' other':''}"><div class="datebar" data-datebar><button type="button" class="db-arrow" data-db-step="-1" aria-label="하루 전">‹</button><button type="button" class="db-mid" data-db-open aria-expanded="${open}" aria-label="날짜 고르기, 지금 ${dateLabel(date)}">${dateLabel(date)}<span class="db-rel">${other?relLabel(date, today):'오늘'}</span></button><button type="button" class="db-arrow" data-db-step="1" aria-label="다음 날">›</button></div>${other?'<button type="button" class="db-today" data-db-today>오늘로</button>':''}${open?miniCalendar(date, today, month, marked):''}</div>`;
 return `<div class="db-wrap"><div class="datebar${other?' other':''}" data-datebar><button type="button" class="db-arrow" data-db-step="-1" aria-label="하루 전">‹</button><button type="button" class="db-mid" data-db-open aria-expanded="${open}" aria-label="날짜 고르기, 지금 ${dateLabel(date)}"><span class="db-cal-ico" aria-hidden="true">▦</span>${dateLabel(date)}${other?'':' · 오늘'}</button><button type="button" class="db-arrow" data-db-step="1" aria-label="다음 날">›</button></div>${other?`<div class="db-other"><span>${eulReul(relLabel(date, today))} 보고 있어요</span><button type="button" class="db-today" data-db-today>오늘로</button></div>`:''}${open?miniCalendar(date, today, month, marked):''}</div>`;
}

// 클릭 처리: 바꿀 상태를 돌려준다(없으면 null)
export function dateBarClick(target, {date, today, open, month}){
 const ds = target?.dataset||{};
 if(ds.dbStep) return {date:shiftDate(date, ds.dbStep), open:false};
 if(ds.dbOpen!==undefined) return {open:!open, month:date.slice(0,7)};
 if(ds.dbMonth){ const d = new Date(`${(month||date).slice(0,7)}-01T12:00:00`); d.setMonth(d.getMonth() + Number(ds.dbMonth)); return {open:true, month:ymd(d).slice(0,7)}; }
 if(ds.dbPick) return {date:ds.dbPick, open:false};
 if(ds.dbToday!==undefined) return {date:today, open:false};
 return null;
}
