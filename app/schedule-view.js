// 4.0.0 '기록' → '일정'(대표님 결정). 달력 칸에 하루 세 줄: 체중 / 총 kcal + 탄단지 색 얇은 막대 / 운동 요약.
// 미래 날짜에 '웨이트(하체)' 같은 예정 운동을 미리 넣는다. 확정하지 않은 예정은 지울 때까지 그대로 남는다(대표님 선택 C).
import {daySummary} from './timeline-view.js';
import {WORK_CATS, WEIGHT_PARTS} from './quick-entry.js';
import {mealTotals} from './domain.js';

const esc = v => String(v??'').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const pad = n => String(n).padStart(2, '0');
const n1 = v => (Math.round(v*10)/10).toString();
export const PLAN_CATS = WORK_CATS.filter(c => c!=='전체');
export const PLAN_PARTS = WEIGHT_PARTS.filter(p => p!=='전체');

// 예정 운동 이름: 웨이트면 부위를 괄호로("웨이트(하체·가슴)")
export function planTitle(cat, parts=[]){ const c = String(cat||'웨이트'); return c==='웨이트' && parts.length ? `웨이트(${parts.join('·')})` : c; }

// 좁은 달력 칸용 짧은 이름: '웨이트(하체·가슴) + 필라테스' → '하체·가슴 필라테스'
export const shortWork = t => String(t||'').replace(/웨이트\(([^)]*)\)/g, '$1').replace(/러닝·유산소/g, '유산소').replace(/ \+ /g, ' ');
// 하루 요약(달력 칸에 쓰는 값)
export function dayFacts(db, date){
 const body = (db.body||[]).filter(b => b.date===date && Number(b.weight)>0).sort((a, b) => String(a.loggedAt||'').localeCompare(String(b.loggedAt||'')));
 const meals = (db.meals||[]).filter(m => m.date===date && !m.planned), t = meals.length ? mealTotals(meals) : null;
 const ws = (db.workouts||[]).filter(w => w.date===date), real = ws.filter(w => !w.planned && !w.rest);
 return {weight:body.length ? Number(body.at(-1).weight) : null, kcal:t ? t.calories : null, pct:t ? t.percent : null, work:daySummary(real), rest:!real.length && ws.some(w => w.rest), plan:ws.filter(w => w.planned).map(w => w.title||'예정')};
}

function cellHTML(db, date, n, {today, selected}){
 const f = dayFacts(db, date), any = f.weight!==null || f.kcal!==null || f.work || f.rest || f.plan.length;
 const work = f.work ? `<i class="sc-work" title="${esc(f.work)}">${esc(shortWork(f.work))}</i>` : f.plan.length ? `<i class="sc-work plan" title="예정 ${esc(f.plan.join(', '))}">${esc(f.plan.map(shortWork).join(' '))}</i>` : f.rest ? '<i class="sc-work rest">휴식</i>' : '';
 const bar = f.pct ? `<span class="sc-bar" aria-hidden="true"><b class="m-carbs" style="width:${f.pct.carbs}%"></b><b class="m-protein" style="width:${f.pct.protein}%"></b><b class="m-fat" style="width:${f.pct.fat}%"></b></span>` : '';
 return `<button type="button" data-calendar="${date}" class="sc-cell${any?' filled':''}${today?' today':''}${selected?' selected':''}" aria-label="${date}"><span class="sc-day">${n}</span>${f.weight!==null?`<i class="sc-w">${n1(f.weight)}<span class="sc-u">kg</span></i>`:''}${f.kcal!==null?`<i class="sc-k">${Math.round(f.kcal).toLocaleString('ko-KR')}</i>${bar}`:''}${work}</button>`;
}

export function scheduleCalendarHTML(db, selectedDate, todayKey){
 const d = new Date(`${selectedDate}T12:00:00`), y = d.getFullYear(), m = d.getMonth(), first = new Date(y, m, 1).getDay(), count = new Date(y, m+1, 0).getDate();
 const cells = Array.from({length:first}, () => '<span class="sc-empty"></span>');
 for(let n=1; n<=count; n++){ const date = `${y}-${pad(m+1)}-${pad(n)}`; cells.push(cellHTML(db, date, n, {today:date===todayKey, selected:date===selectedDate})); }
 return `<div class="row sc-month"><button class="button secondary" data-month="-1" aria-label="이전 달">〈</button><h3>${y}년 ${m+1}월</h3><button class="button secondary" data-month="1" aria-label="다음 달">〉</button></div><div class="card sc-card"><div class="sc-grid">${['일','월','화','수','목','금','토'].map(x => `<span class="sc-wd">${x}</span>`).join('')}${cells.join('')}</div><p class="sc-legend"><span><b class="dot m-carbs"></b>탄</span><span><b class="dot m-protein"></b>단</span><span><b class="dot m-fat"></b>지</span><span class="plan-dot">노란 글씨는 예정</span><span>숫자는 체중(kg)·섭취 kcal</span></p></div>`;
}

// 선택한 날의 예정 운동 + 추가 폼
export function planFormHTML(date, state={}){
 const cat = state.cat || '웨이트', parts = state.parts || [];
 return `<form id="plan-workout-form" class="card plan-form"><h3>${esc(date.slice(5).replace('-','/'))} 운동 예정 넣기</h3><div class="chips" role="group" aria-label="운동 종류">${PLAN_CATS.map(c => `<button type="button" class="chip${c===cat?' active':''}" data-plan-cat="${esc(c)}" aria-pressed="${c===cat}">${esc(c)}</button>`).join('')}</div>${cat==='웨이트'?`<div class="chips" role="group" aria-label="부위">${PLAN_PARTS.map(p => `<button type="button" class="chip${parts.includes(p)?' active':''}" data-plan-part="${esc(p)}" aria-pressed="${parts.includes(p)}">${esc(p)}</button>`).join('')}</div>`:''}<label class="field">시간(선택)<input type="time" name="time" data-no-when value="${esc(state.time||'')}"></label><label class="field">메모·세부 계획(선택)<input name="note" maxlength="120" placeholder="예: 스쿼트 5×5, 런지" value="${esc(state.note||'')}"></label><button class="button" type="submit">‘${esc(planTitle(cat, parts))}’ 예정으로 넣기</button><p class="hint">예정은 확정하기 전까지 통계에 들어가지 않고, 지우기 전까지 남아 있어요.</p></form>`;
}
