// 5.4.0 코치로그 1차(대표님 승인 목업 A1·C2·C5): 코치 수업도 마이로그 실시간 운동 입력을 그대로 쓴다.
// '수업 시작' → 운동 창(실시간) 위에 회원 띠 → 운동 끝내기 → 오늘 운동 정리 화면에 '회원에게 보낼 코멘트' → 수업 확인 단계로 넘긴다.
// 코치 본인 운동 기록에는 남기지 않는다(보내기로 넘기면 임시 운동 기록은 지운다). 이 파일은 app.js를 import하지 않는다.
import {$s, $f} from './app-state.js';
import {scopedKey} from './storage-scope.js';
import {clearLive} from './live-session.js';
import {photoQuota} from './input-sources.js';
import {isPlus} from './plan.js';

const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));
const KEY = () => scopedKey('mylogue.coachLive');
export const QUICK_NOTES = ['자세 좋아요', '다음엔 +2.5kg', '무릎 각도 신경 쓰기', '호흡 잊지 않기', '오늘 강도 딱 좋았어요', '쉬는 날 스트레칭'];

export function coachLive(){
  if($s.coachLive !== undefined) return $s.coachLive;
  try{ $s.coachLive = JSON.parse(globalThis.localStorage?.getItem(KEY()) || 'null'); }catch{ $s.coachLive = null; }
  return $s.coachLive;
}
export function setCoachLive(v){
  $s.coachLive = v || null;
  try{ v ? globalThis.localStorage?.setItem(KEY(), JSON.stringify(v)) : globalThis.localStorage?.removeItem(KEY()); }catch{}
}

// ctx: {clientIds, names, title, scheduleId, date, time, ptLine, lastLine}
export function startCoachLive(ctx){
  const q = $s.quickWorkout;
  if(q && (q.sets || []).length && !coachLive()){ $f.toast('진행 중인 내 운동이 있어요. 먼저 끝내거나 정리한 뒤 수업을 시작해 주세요.'); return false; }
  setCoachLive({...ctx, notes: [], good: '', next: ''});
  $s.selectedDate = ctx.date;
  const b = document.createElement('button'); b.dataset.modal = 'workout'; b.hidden = true; ($s.root || document.body).appendChild(b); b.click(); b.remove();
  /* 창 여는 처리가 끝난 뒤 실시간 입력으로 바로(수업은 늘 실시간) */
  const goLive = () => { const q2 = $s.quickWorkout; if(q2 && q2.live === undefined && !(q2.sets || []).length){ q2.live = true; if(ctx.title) q2.title = ctx.title; $f.render(); } };
  goLive(); setTimeout(goLive, 0); setTimeout(goLive, 120);
  return true;
}

export function coachBandHTML(){
  const c = coachLive(); if(!c) return '';
  const nm = (c.names || []).join(', ') || '회원';
  return `<div class="cl-band" role="status"><span class="cl-av" style="background:#8ce4e0" aria-hidden="true">${esc(nm[0])}</span><div class="cl-band-t"><b>${esc(nm)} 님 수업 중${c.ptLine ? ` · ${esc(c.ptLine)}` : ''}</b>${c.lastLine ? `<small>${esc(c.lastLine)}</small>` : '<small>세트마다 적고, 끝나면 회원에게 보내요</small>'}</div><button type="button" class="text-button cl-band-x" data-cl-stop aria-label="코치 수업 끄기">끄기</button></div>`;
}

export function coachSummaryHTML(){
  const c = coachLive(); if(!c) return '';
  const nm = (c.names || []).join(', ') || '회원';
  return `<section class="cl-card ss-coach"><h3>회원에게 보낼 코멘트</h3><div class="cl-chips">${QUICK_NOTES.map(n => `<button type="button" class="${(c.notes || []).includes(n) ? 'on' : ''}" data-cl-note="${esc(n)}" aria-pressed="${(c.notes || []).includes(n)}">${esc(n)}</button>`).join('')}</div>
  <label class="field">오늘 좋아진 점<input id="cl-good" maxlength="120" value="${esc(c.good)}" placeholder="예: 스쿼트 깊이가 안정됐어요" autocomplete="off"></label>
  <label class="field">다음 수업 포인트<input id="cl-next" maxlength="120" value="${esc(c.next)}" placeholder="예: 런지 때 왼쪽 무릎" autocomplete="off"></label>
  <button type="button" class="cl-send" data-cl-send>${esc(nm)} 님에게 보내기</button><p class="hint" style="margin:0">다음 화면에서 PT 회차 차감을 확인하고 보내요. 회원이 확정해야 회원 기록이 돼요. 코치님 운동 기록에는 남지 않아요.</p></section>`;
}

// 운동 기록 → 수업 입력 줄(세트별 무게·횟수는 exSets로 그대로)
export function workoutToRows(w){
  return (w?.exercises || []).map(e => {
    if(e.kind === 'cardio') return {kind: 'timed', name: e.name, min: e.durationMin ?? '', type: e.sessionType || '', note: e.note || ''};
    const sets = (e.sets || []).filter(s => s && (s.done !== false)).map(s => ({weight: Number(s.weight) || 0, unit: s.unit || 'kg', reps: Math.max(0, Math.round(Number(s.reps) || 0)), ...(s.type === '웜업' ? {type: '웜업'} : {})}));
    return {kind: 'strength', name: e.name, weight: sets[0]?.weight ?? '', reps: sets[0]?.reps ?? '', sets: sets.length || 1, ...(sets.length ? {exSets: sets} : {}), ...(e.part ? {part: e.part} : {})};
  }).filter(r => String(r.name || '').trim());
}
export function composeNote(c){
  return [(c.notes || []).join(' · '), c.good && `좋아진 점: ${c.good}`, c.next && `다음 포인트: ${c.next}`].filter(Boolean).join('\n');
}

function readFields(){ const c = coachLive(); if(!c) return; const g = document.getElementById('cl-good'), n = document.getElementById('cl-next'); setCoachLive({...c, good: g ? g.value : c.good, next: n ? n.value : c.next}); }

// summary-actions의 liveClick 앞에서 부른다. 처리했으면 true
export function coachLiveClick(t){
  const d = t?.dataset || {};
  if(d.clMealStop !== undefined){ setCoachMeal(null); $f.toast('식단 제안을 그만뒀어요. 지금 담은 건 내 식단으로 남아요.'); $f.render(); return true; }
  if(t?.id === 'q-save-meal' && coachMeal()){ return coachMealSave(); }
  if(d.clStop !== undefined){ setCoachLive(null); $f.toast('코치 수업을 껐어요. 이 운동은 내 기록으로 남아요.'); $f.render(); return true; }
  if(!coachLive()) return false;
  if(d.clNote){ readFields(); const c = coachLive(), on = new Set(c.notes || []); on.has(d.clNote) ? on.delete(d.clNote) : on.add(d.clNote); setCoachLive({...c, notes: [...on]}); $f.render(); return true; }
  if(d.clSend !== undefined){
    readFields(); const c = coachLive(), q = $s.quickWorkout, w = ($s.db.workouts || []).find(x => x.id === q?.workoutId);
    const rows = workoutToRows(w); if(!rows.length){ $f.toast('보낼 세트가 없어요.'); return true; }
    if(w) $s.db = $f.save({...$s.db, workouts: $s.db.workouts.filter(x => x.id !== w.id)});
    try{ clearLive(); }catch{}
    $s.quickWorkout = null; $s.sumSt = null; $s.modal = null; setCoachLive(null);
    $s.coach?.sendFromLive?.({clientIds: c.clientIds || [], date: c.date, time: c.time || '', title: c.title || w?.title || '', rows, memberNote: composeNote(c), scheduleId: c.scheduleId || ''});
    return true;
  }
  return false;
}
export function coachLiveInput(t){
  if(t?.id === 'cl-good' || t?.id === 'cl-next'){ readFields(); return true; }
  return false;
}

// ---------- 5.4.0 D15 식단 제안: 마이로그 식사 창으로 음식·양을 담고 '저장'하면 내 식단이 아니라 회원 제안으로 ----------
const MKEY = () => scopedKey('mylogue.coachMeal');
export function coachMeal(){
  if($s.coachMeal !== undefined) return $s.coachMeal;
  try{ $s.coachMeal = JSON.parse(globalThis.localStorage?.getItem(MKEY()) || 'null'); }catch{ $s.coachMeal = null; }
  return $s.coachMeal;
}
export function setCoachMeal(v){ $s.coachMeal = v || null; try{ v ? globalThis.localStorage?.setItem(MKEY(), JSON.stringify(v)) : globalThis.localStorage?.removeItem(MKEY()); }catch{} }
export function startCoachMeal(ctx){ // {clientIds, names, title}
  setCoachMeal(ctx);
  const b = document.createElement('button'); b.dataset.modal = 'batch'; b.hidden = true; ($s.root || document.body).appendChild(b); b.click(); b.remove();
  const self = () => { const m = $s.quickMeal; if(m && !m.src){ m.src = 'self'; $f.render(); } };
  self(); setTimeout(self, 0);
  return true;
}
export function coachMealBandHTML(){
  const c = coachMeal(); if(!c) return '';
  const nm = (c.names || []).join(', ') || '회원';
  return `<div class="cl-band" role="status"><span class="cl-av" style="background:#f2d36b" aria-hidden="true">${esc(nm[0])}</span><div class="cl-band-t"><b>${esc(nm)} 님 식단 제안 만드는 중</b><small>담고 '기록'을 누르면 내 식단이 아니라 회원에게 갈 제안으로 저장돼요</small></div><button type="button" class="text-button cl-band-x" data-cl-meal-stop aria-label="식단 제안 그만두기">그만</button></div>`;
}
export const mealPlanItem = m => { const {id, date, loggedAt, mealGroupId, updatedAt, createdAt, planned, source, ...rest} = m; return {...rest, source: 'coach'}; };
// 식사 저장을 가로채 제안으로. 처리했으면 true
export function coachMealSave(){
  const c = coachMeal(); if(!c) return false;
  const before = $s.db.meals, q = $s.quickMeal;
  $f.quickClickRaw({dataset: {}, id: 'q-save-meal'});
  const added = ($s.db.meals || []).filter(m => !before.includes(m));
  if(!added.length) return true;
  $s.db = $f.save({...$s.db, meals: $s.db.meals.filter(m => !added.includes(m))});
  const plan = {id: `mp${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`, title: c.title || added[0].slot || '식단 제안', slot: added[0].slot || '', note: '', items: added.map(mealPlanItem), createdAt: new Date().toISOString()};
  setCoachMeal(null); $s.modal = null; $s.quickMeal = null;
  $s.coach?.addMealPlan?.(c.clientIds || [], plan);
  return true;
}
globalThis.__mylogueCoachPlans = () => { try{ return $s.coach?.memberPlans?.() || []; }catch{ return []; } };
globalThis.__myloguePhotoQuota = () => { try{ return photoQuota(isPlus()); }catch{ return photoQuota(false); } };
globalThis.__mylogueCoachRoutines = () => { try{ return $s.coach?.memberRoutines?.() || []; }catch{ return []; } };
