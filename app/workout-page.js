// 4.0.0 운동 페이지 새 구성(대표님 승인): 내 운동 장소(종류·누적 방문) · 이번 주 흐름 · 예정된 운동(세트별 완료·확정) · 이번 주 부위 균형.
// '총 운동 횟수·누적 볼륨'은 뺐다.
import {daySummary, workoutTitle} from './timeline-view.js';
import {workoutMenuHTML} from './workout-menu.js';
import {REST_ICON} from './quick-entry.js';
import {partSummary} from './reports.js';

const esc = v => String(v??'').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const pad = n => String(n).padStart(2, '0');
const ymd = d => `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
export const PLACE_KINDS = ['헬스장','필라테스','요가','크로스핏','클라이밍','기타'];
const KIND_ICON = {'헬스장':'🏋','필라테스':'🧘','요가':'🪷','크로스핏':'⚡','클라이밍':'🧗','기타':'📍'};

// 장소별 누적 방문(그 장소에서 운동한 날의 수, 예정·휴식 제외)
export function placeStats(db={}){
 const kinds = db.settings?.placeKinds || {}, names = [...new Set([...(db.settings?.gyms||[]), ...(db.workouts||[]).map(w => w.gymName).filter(Boolean)])];
 return names.map(name => { const days = new Set((db.workouts||[]).filter(w => w.gymName===name && !w.planned && !w.rest).map(w => w.date)); const last = [...days].sort().at(-1) || ''; return {name, kind:kinds[name] || '헬스장', visits:days.size, last}; }).sort((a, b) => b.visits-a.visits || a.name.localeCompare(b.name, 'ko'));
}
export function placesHTML(db, {open=false}={}){
 const list = placeStats(db);
 return `<section class="section wp-places"><div class="section-title"><h3>내 운동 장소</h3><button type="button" class="text-button" data-place-toggle>${open?'닫기':'＋ 장소 추가'}</button></div>${open?`<form id="place-form" class="place-form"><input name="name" required maxlength="40" placeholder="예: 안산 짐박스, 필라테스 ○○"><select name="kind">${PLACE_KINDS.map(k => `<option>${k}</option>`).join('')}</select><button class="button small">추가</button></form>`:''}<div class="place-grid">${list.length?list.map(p => `<article class="place-card"><span class="place-kind" aria-hidden="true">${KIND_ICON[p.kind]||'📍'}</span><div class="place-text"><b>${esc(p.name)}</b><small>${esc(p.kind)}${p.last?` · 최근 ${esc(p.last.slice(5).replace('-','/'))}`:''}</small></div><div class="place-count"><strong>${p.visits}</strong><small>회</small></div></article>`).join(''):'<p class="hint">헬스장·필라테스·요가처럼 다니는 곳을 등록하면 누적 방문 횟수를 세어 드려요.</p>'}</div></section>`;
}

// 이번 주(월~일) 흐름
export function weekFlowHTML(db, date, today=date){
 const d0 = new Date(`${date}T12:00:00`), mon = new Date(d0); mon.setDate(d0.getDate() - ((d0.getDay()+6)%7));
 const rows = [...Array(7).keys()].map(i => { const d = new Date(mon); d.setDate(mon.getDate()+i); const k = ymd(d), ws = (db.workouts||[]).filter(w => w.date===k), real = ws.filter(w => !w.rest && !w.planned), plan = ws.filter(w => w.planned); return {k, wd:'월화수목금토일'[i], today:k===today, sel:k===date&&date!==today, label:daySummary(real), rest:!real.length && ws.some(w => w.rest), plan:plan.length ? plan.map(w => w.title||'예정').join(', ') : ''}; });
 return `<section class="section card wp-week"><h3>${date===today?'이번 주 흐름':'그 주 흐름'}</h3><div class="wp-week-list">${rows.map(r => `<div class="wpw-row${r.today?' today':''}${r.sel?' sel':''}${r.label?' done':''}"><b>${r.wd}</b><span>${r.label?esc(r.label):r.rest?`${REST_ICON} 휴식`:r.plan?`<em class="plan">예정 · ${esc(r.plan)}</em>`:'<i>—</i>'}</span></div>`).join('')}</div></section>`;
}

// 예정된 운동: 세트마다 완료 표시 → 확정. 종목이 없는 계획('웨이트(하체)')은 '기록하기'로 이어진다.
export function plannedWorkoutsHTML(db){
 const list = (db.workouts||[]).filter(w => w.planned).sort((a, b) => String(a.date).localeCompare(String(b.date)));
 if(!list.length) return '';
 return `<section class="section wp-planned"><h3 class="section-title">예정된 운동 <small>세트를 마칠 때마다 완료를 누르고 확정해요</small></h3>${list.map(w => { const ex = w.exercises||[]; return `<article class="card plan-workout"><div class="plan-head"><div><span class="plan-badge">예정</span> <b>${esc(w.date.slice(5).replace('-','/'))} · ${esc(workoutTitle(w))}</b></div><div class="plan-actions">${ex.length?`<button type="button" class="button small" data-plan-confirm="workout:${esc(w.id)}">했어요</button>`:`<button type="button" class="button small" data-plan-record="${esc(w.id)}">기록하기</button>`}<button type="button" class="text-button" data-delete="workouts:${esc(w.id)}">지우기</button></div></div>${ex.length?ex.map((e, i) => `<div class="plan-ex"><span>${esc(e.name)}</span><div class="plan-sets">${e.kind==='cardio'?`<small>${e.durationMin?`${e.durationMin}분`:''}${e.distanceKm?` · ${e.distanceKm}km`:''}</small>`:(e.sets||[]).map((s, j) => `<button type="button" class="set-pill${s.done?' on':''}" data-set-done="${esc(w.id)}:${i}:${j}" aria-pressed="${!!s.done}">${s.weight??''}${s.unit||'kg'}×${s.reps??''}</button>`).join('')}</div></div>`).join(''):'<p class="hint">종목은 아직 정하지 않았어요. 운동을 시작하면 ‘기록하기’를 눌러요.</p>'}</article>`; }).join('')}</section>`;
}

// 이번 주 부위 균형(최근 7일 세트)
export function partBalanceHTML(db, now=new Date()){
 const parts = partSummary(db, 7, now).filter(p => p.sets>0 && p.part!=='유산소');
 const max = Math.max(1, ...parts.map(p => p.sets));
 return `<section class="section card wp-balance"><h3>이번 주 부위 균형</h3>${parts.length?`<div class="bal-list">${parts.map(p => `<div class="bal-row"><span>${esc(p.part)}</span><i><b style="width:${Math.round(p.sets/max*100)}%"></b></i><em>${p.sets}세트</em></div>`).join('')}</div><p class="hint">부위별 주 10~20세트가 일반적인 기준이에요.</p>`:'<p class="hint">이번 주 근력 운동을 기록하면 부위별 세트가 보여요.</p>'}</section>`;
}

// 4.2.0 날짜 바로 고른 날의 운동(카드에서 바로 수정)
