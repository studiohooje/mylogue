// 3.5.0 운동 '계획 → 안내' 모드
// 미리 종목·무게·횟수·세트·휴식을 정해 두면 앱이 진행을 맡는다: "휴식 10초 남았습니다 → 3·2·1 → 2세트 시작".
// - 세트를 끝낼 때마다 바로 저장(기존 운동 기록 형식, 실제 완료한 세트만).
// - 화면 꺼짐 방지(Screen Wake Lock), 소리(Web Audio)·음성(기기 음성 합성)·진동(Android).
// - Android 앱(APK)은 휴식 끝 알림을 미리 예약해 화면이 꺼져도 울린다(@capacitor/local-notifications).
// 계획: docs/plans/2026-11-20_맞춤시작_준비.md 4절, 목업: mockups/onboarding-modes/index.html ④

import {cleanWorkout, uid} from './domain.js';
import {registerPlugin} from './vendor/capacitor/core.js';

const h = v => String(v??'').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const num = (v, d=null) => v===''||v==null ? d : (Number.isFinite(Number(v)) ? Number(v) : d);

// ── 계획 ──
export const emptyPlanRow = rest => ({name:'', weight:'', unit:'kg', reps:'', sets:3, rest});
export function emptyPlan(date, gym='', rest=90){ return {date, gymName:gym, rows:[emptyPlanRow(rest)]}; }
export function planFromWorkout(w, date, rest=90){
 const rows = (w?.exercises||[]).filter(e=>e.kind!=='cardio'&&(e.sets||[]).length).map(e=>{const done=(e.sets||[]).filter(s=>s.completed!==false);const s=done[done.length-1]||e.sets[0];return {name:e.name, weight:s.originalWeight??s.weight??'', unit:s.originalUnit||s.unit||'kg', reps:s.reps??s.targetReps??'', sets:done.length||e.sets.length, rest}});
 return {date, gymName:w?.gymName||'', rows:rows.length?rows:[emptyPlanRow(rest)]};
}
export function planFromRoutine(r, date, rest=90){
 const rows = (r?.exercises||[]).filter(e=>e.kind!=='cardio').map(e=>{const s=(e.sets||[])[0]||{};return {name:e.name, weight:s.targetWeight??s.weight??'', unit:s.targetUnit||s.unit||'kg', reps:s.targetReps??s.reps??'', sets:(e.sets||[]).length||3, rest}});
 return {date, gymName:'', rows:rows.length?rows:[emptyPlanRow(rest)]};
}

export function planHTML(plan, {names=[], gyms=[], routines=[], hasLast=false}={}){
 return `<form id="guide-plan-form" class="gap" novalidate><p class="hint">운동 전에 계획을 정해 두면, 진행은 앱이 소리로 알려 줘요. 화면은 켜진 채로 유지돼요.</p>
 <div class="after-meta"><label class="field">날짜<input name="date" type="date" value="${h(plan.date)}"></label>${gyms.length?`<label class="field">장소<select name="gymName"><option value="">선택 안 함</option>${gyms.map(g=>`<option ${g===plan.gymName?'selected':''}>${h(g)}</option>`).join('')}</select></label>`:''}</div>
 ${hasLast||routines.length?`<div class="chip-row guide-fill">${hasLast?'<button type="button" class="chip" id="guide-fill-last">지난 운동 그대로</button>':''}${routines.map(r=>`<button type="button" class="chip" data-guide-routine="${h(r.id)}">루틴 · ${h(r.title)}</button>`).join('')}</div>`:''}
 <datalist id="guide-ex-names">${names.slice(0,400).map(n=>`<option value="${h(n)}"></option>`).join('')}</datalist>
 <div class="after-rows">${plan.rows.map((r,i)=>`<div class="after-row guide-row" data-guide-row="${i}"><label class="field after-name">종목<input name="name" list="guide-ex-names" value="${h(r.name)}" placeholder="예: 벤치프레스" autocomplete="off"></label><label class="field">무게<input name="weight" type="number" inputmode="decimal" min="0" step="0.5" value="${h(r.weight)}" placeholder="0"></label><label class="field">단위<select name="unit"><option ${r.unit!=='lb'?'selected':''}>kg</option><option ${r.unit==='lb'?'selected':''}>lb</option></select></label><label class="field">횟수<input name="reps" type="number" inputmode="numeric" min="1" step="1" value="${h(r.reps)}" placeholder="10"></label><label class="field">세트<input name="sets" type="number" inputmode="numeric" min="1" max="20" step="1" value="${h(r.sets)}"></label><label class="field">휴식(초)<input name="rest" type="number" inputmode="numeric" min="10" max="600" step="5" value="${h(r.rest)}"></label><button type="button" class="after-del" data-guide-del="${i}" aria-label="${i+1}번째 종목 지우기">×</button></div>`).join('')}</div>
 <div class="actions"><button type="button" class="button secondary" id="guide-add">＋ 종목</button></div>
 <button type="submit" class="button" id="guide-start">이 계획으로 시작</button></form>`;
}
export function readPlanForm(form){
 const v = n => form.querySelector(`[name="${n}"]`)?.value ?? '';
 const rows = [...form.querySelectorAll('[data-guide-row]')].map(el=>{const q=n=>el.querySelector(`[name="${n}"]`)?.value??'';return {name:q('name').trim(), weight:q('weight'), unit:q('unit'), reps:q('reps'), sets:q('sets'), rest:q('rest')}});
 return {date:v('date'), gymName:v('gymName'), rows};
}
export function validatePlan(plan){
 const rows = plan.rows.filter(r=>String(r.name||'').trim());
 if(!rows.length) throw Error('종목을 하나 이상 입력해 주세요.');
 return rows.map(r=>{
  const weight = num(r.weight, 0), reps = num(r.reps), sets = num(r.sets), rest = num(r.rest, 90);
  if(!(weight>=0)) throw Error(`${r.name}: 무게를 확인해 주세요.`);
  if(!Number.isInteger(reps)||reps<1) throw Error(`${r.name}: 횟수를 확인해 주세요.`);
  if(!Number.isInteger(sets)||sets<1||sets>20) throw Error(`${r.name}: 세트 수는 1~20이에요.`);
  if(!(rest>=10&&rest<=600)) throw Error(`${r.name}: 휴식은 10~600초예요.`);
  return {name:r.name.trim(), weight, unit:r.unit==='lb'?'lb':'kg', reps, sets, rest};
 });
}

// ── 진행 상태 ──
export function startRun(plan, items, now=Date.now()){
 return {date:plan.date, gymName:plan.gymName||'', items, ex:0, set:1, phase:'work', restEnds:0, restTotal:0, log:[], workoutId:null, startedAt:now, cued:{}};
}
export const current = s => s.items[s.ex];
export function nextLabel(s){
 const it = current(s); if(!it) return '';
 if(s.set < it.sets) return `${s.set+1}세트 · ${it.weight}${it.unit} × ${it.reps}회`;
 const n = s.items[s.ex+1]; return n ? `다음 운동 · ${n.name} ${n.weight}${n.unit} × ${n.reps}회` : '마지막 세트예요';
}
// 세트 완료 → 기록 추가, 다음 단계로
export function completeSet(s, now=Date.now()){
 const it = current(s); if(!it||s.phase!=='work') return s;
 s.log.push({id:uid(), name:it.name, weight:it.weight, unit:it.unit, reps:it.reps, completedAt:new Date(now).toISOString()});
 const lastSet = s.set >= it.sets, lastEx = s.ex >= s.items.length-1;
 if(lastSet && lastEx){ s.phase='done'; s.restEnds=0; return s; }
 s.phase='rest'; s.restTotal=it.rest*1000; s.restEnds=now+s.restTotal; s.cued={};
 if(lastSet){ s.ex++; s.set=1; } else s.set++;
 return s;
}
export function skipExercise(s){
 if(s.phase==='done') return s;
 if(s.ex >= s.items.length-1){ s.phase='done'; s.restEnds=0; return s; }
 s.ex++; s.set=1; s.phase='work'; s.restEnds=0; return s;
}
export function finishRun(s){ s.phase='done'; s.restEnds=0; return s; }
export function addRest(s, sec, now=Date.now()){ if(s.phase==='rest'){ s.restEnds=Math.max(now, s.restEnds)+sec*1000; s.restTotal+=sec*1000; s.cued={}; } return s; }
export function endRest(s){ if(s.phase==='rest'){ s.phase='work'; s.restEnds=0; } return s; }
export function editCurrent(s, weight, reps){
 const it = current(s); if(!it) return s;
 const w = num(weight), r = num(reps);
 if(w!==null && w>=0) it.weight = w;
 if(Number.isInteger(r) && r>=1) it.reps = r;
 return s;
}
// 저장용 운동 기록(완료한 세트만)
export function runRecord(s, nowIso=new Date().toISOString()){
 if(!s.log.length) return null;
 const groups = [];
 for(const x of s.log){ let g = groups.find(e=>e.name===x.name); if(!g){ g={name:x.name, sets:[]}; groups.push(g); } g.sets.push({id:x.id, weight:x.weight, originalWeight:x.weight, unit:x.unit, originalUnit:x.unit, reps:x.reps, type:'본세트', completed:true, completedAt:x.completedAt}); }
 return cleanWorkout({id:s.workoutId||undefined, date:s.date, gymName:s.gymName, title:'오늘의 운동', exercises:groups, note:'계획→안내 모드', updatedAt:nowIso});
}

// 휴식 남은 시간에 따라 낼 안내(한 번씩만)
export function dueCues(s, now=Date.now()){
 if(s.phase!=='rest') return [];
 const left = Math.ceil((s.restEnds-now)/1000), out = [];
 const once = (k, cue) => { if(!s.cued[k]){ s.cued[k]=true; out.push(cue); } };
 if(left<=10 && left>3 && s.restTotal>=15000) once('10', {say:'휴식 10초 남았습니다', beep:1});
 for(const n of [3,2,1]) if(left<=n && left>n-1) once(String(n), {say:String(n), beep:1});
 return out;
}

// ── 진행 화면 ──
export function runHTML(s, now=Date.now()){
 if(s.phase==='done'){
  const sets = s.log.length, ex = new Set(s.log.map(x=>x.name)).size, vol = s.log.reduce((t,x)=>t+(x.unit==='lb'?x.weight*0.4536:x.weight)*x.reps,0);
  return `<div class="guide-run guide-done"><p class="guide-ex">수고했어요!</p><p class="guide-sub">${ex}종목 · ${sets}세트 · 볼륨 ${Math.round(vol).toLocaleString('ko-KR')}kg</p><p class="hint">완료한 세트는 이미 저장됐어요. 운동 일지에서 고칠 수 있어요.</p><button type="button" class="button" id="guide-close">닫기</button></div>`;
 }
 const it = current(s), total = it.sets;
 const head = `<div class="guide-head"><p class="guide-ex">${h(it.name)}</p><p class="guide-sub">${s.ex+1} / ${s.items.length}종목 · ${s.set} / ${total}세트</p></div>`;
 if(s.phase==='rest'){
  const left = Math.max(0, Math.ceil((s.restEnds-now)/1000)), p = s.restTotal ? Math.max(0, Math.min(1, (s.restEnds-now)/s.restTotal)) : 0;
  return `<div class="guide-run">${head}<div class="guide-ring" id="guide-ring" style="--p:${p.toFixed(3)}" role="timer" aria-live="off"><div><strong id="guide-time">${fmtSec(left)}</strong><span>휴식</span></div></div><p class="guide-next">다음 · ${s.set}세트 ${h(it.weight)}${h(it.unit)} × ${h(it.reps)}회</p><div class="guide-btns"><button type="button" class="button secondary" id="guide-plus">+30초</button><button type="button" class="button" id="guide-skip-rest">바로 시작</button></div>${logHTML(s)}<div class="guide-foot"><button type="button" class="text-button" id="guide-finish">운동 끝내기</button></div></div>`;
 }
 return `<div class="guide-run">${head}<div class="guide-target"><strong>${h(it.weight)}<small>${h(it.unit)}</small></strong><span>×</span><strong>${h(it.reps)}<small>회</small></strong></div><details class="guide-edit"><summary>무게·횟수 바꾸기</summary><div class="after-meta"><label class="field">무게<input id="guide-w" type="number" inputmode="decimal" min="0" step="0.5" value="${h(it.weight)}"></label><label class="field">횟수<input id="guide-r" type="number" inputmode="numeric" min="1" step="1" value="${h(it.reps)}"></label></div><button type="button" class="button secondary" id="guide-apply">이 종목 남은 세트에 적용</button></details><button type="button" class="button guide-done-btn" id="guide-set-done">세트 끝 ✓</button><p class="guide-next">${h(nextLabel(s))}</p>${logHTML(s)}<div class="guide-foot"><button type="button" class="text-button" id="guide-skip-ex">이 종목 건너뛰기</button><button type="button" class="text-button" id="guide-finish">운동 끝내기</button></div></div>`;
}
const fmtSec = n => `${Math.floor(n/60)}:${String(n%60).padStart(2,'0')}`;
function logHTML(s){
 if(!s.log.length) return '';
 const last = s.log.slice(-3).reverse();
 return `<div class="guide-log" aria-label="완료한 세트">${last.map(x=>`<div><span>${h(x.name)}</span><b>${h(x.weight)}${h(x.unit)} × ${h(x.reps)}</b><i aria-hidden="true">✓</i></div>`).join('')}</div>`;
}

// ── 안내 장치(브라우저·기기) ──
export function createCues(mode='voice'){
 let ctx = null, lock = null;
 const canSound = mode==='voice'||mode==='sound', canVoice = mode==='voice', canVibe = mode!=='silent';
 const api = {
  unlock(){ // 첫 터치에서 오디오를 깨운다(브라우저 정책)
   try{ if(canSound && !ctx){ const AC = globalThis.AudioContext||globalThis.webkitAudioContext; if(AC) ctx = new AC(); } ctx?.resume?.(); }catch{}
   try{ if(canVoice && globalThis.speechSynthesis){ const u = new SpeechSynthesisUtterance(' '); u.volume = 0; speechSynthesis.speak(u); } }catch{}
  },
  beep(freq=880, ms=140){ if(!canSound||!ctx) return; try{ const o=ctx.createOscillator(), g=ctx.createGain(); o.frequency.value=freq; g.gain.value=0.18; o.connect(g); g.connect(ctx.destination); o.start(); o.stop(ctx.currentTime+ms/1000); }catch{} },
  say(text){ if(!canVoice||!globalThis.speechSynthesis) return; try{ const u = new SpeechSynthesisUtterance(text); u.lang='ko-KR'; u.rate=1.05; speechSynthesis.cancel(); speechSynthesis.speak(u); }catch{} },
  vibrate(p=[120]){ if(!canVibe) return; try{ globalThis.navigator?.vibrate?.(p); }catch{} },
  play(cue){ if(cue.beep) api.beep(cue.go?1175:880, cue.go?260:140); if(cue.say) api.say(cue.say); api.vibrate(cue.go?[200,80,200]:[90]); },
  async keepAwake(on){
   try{ if(on && globalThis.navigator?.wakeLock && document.visibilityState==='visible'){ if(!lock||lock.released) lock = await navigator.wakeLock.request('screen'); }
        if(!on && lock){ await lock.release(); lock = null; } }catch{}
  }
 };
 return api;
}

// Android 앱: 휴식 끝 알림 예약(화면이 꺼져도 울림). 웹에서는 아무 일도 하지 않는다.
const NOTI_ID = 5101;
let notif = null;
function nativeNotif(){
 if(!globalThis.Capacitor?.isNativePlatform?.()) return null;
 try{ notif = notif || (globalThis.Capacitor.registerPlugin||registerPlugin)('LocalNotifications'); }catch{ notif = null; }
 return notif;
}
export async function prepareNativeAlerts(){
 const n = nativeNotif(); if(!n) return false;
 try{ const p = await n.checkPermissions(); if(p.display!=='granted'){ const r = await n.requestPermissions(); return r.display==='granted'; } return true; }catch{ return false; }
}
export async function scheduleRestAlert(s){
 const n = nativeNotif(); if(!n||s.phase!=='rest') return;
 const it = current(s);
 try{ await n.cancel({notifications:[{id:NOTI_ID}]}); await n.schedule({notifications:[{id:NOTI_ID, title:'휴식 끝 · 마이로그', body:`${it.name} ${s.set}세트 시작 · ${it.weight}${it.unit} × ${it.reps}회`, schedule:{at:new Date(s.restEnds), allowWhileIdle:true}}]}); }catch{}
}
export async function cancelRestAlert(){ const n = nativeNotif(); if(!n) return; try{ await n.cancel({notifications:[{id:NOTI_ID}]}); }catch{} }
