// 5.1.0 실시간 세션 끝내기 · 정리 화면 · 세트 지우기 · 저장 안 한 세트 묻기 · 내 AI 오입력 검토
import {$s,$f} from './app-state.js';
import {clearLive,liveActive} from './live-session.js';
import {checkWorkout,applyFix} from './workout-check.js';
import {nameSuggestion} from './workout-name.js';
import {aiReviewPrompt,parseAiReview,sessionTimes} from './session-summary.js';
import {quickWorkoutRecord,lastSession,findMachine} from './quick-entry.js';
import {prefillFor,withUnitMemory} from './set-prefill.js';
import {cancelRestNotice} from './rest-screen.js';
import {isPlus} from './plan.js';
import {workoutMenuClick,timeEditHTML} from './workout-menu.js';
import {importClick} from './import-actions.js';
const cur=()=>($s.db.workouts||[]).find(w=>w.id===$s.quickWorkout?.workoutId);
const put=w=>{$s.db=$f.save({...$s.db,workouts:$s.db.workouts.map(x=>x.id===w.id?w:x)})};
function openSummary(){const s=$s.quickWorkout;if(!cur()){$f.toast('아직 저장된 세트가 없어요. 세트를 하나 이상 저장하면 끝낼 수 있어요.');return}s.ask=null;$s.sumSt={};$s.modal='workout-summary';$f.render();document.querySelector?.('.sheet')?.scrollTo?.({top:0})}
function finish(){const s=$s.quickWorkout,w=cur();if(!w){$s.modal=null;$f.render();return}const st=$s.sumSt||{},sug=nameSuggestion(w.exercises,s?.targets||w.targets||[]),title=st.title??(sug.options[0]?.title||sug.title);put({...w,title,finishedAt:new Date().toISOString(),updatedAt:new Date().toISOString()});try{if(s?.rest)cancelRestNotice()}catch{}clearLive();$s.quickWorkout=null;$s.sumSt=null;$s.airSt=null;$s.modal=null;$s.selectedDate=w.date;$f.render();$f.toast('오늘 운동을 기록했어요. 잘했어요!')}
const pendingOf=s=>{const w=document.getElementById('q-set-weight'),r=document.getElementById('q-set-reps');return {n:(s.sets||[]).filter(x=>x.exerciseId===s.exerciseId&&x.machineId===s.machineId).length+1,weight:w?.value??s.weight,reps:r?.value??s.reps,unit:s.unit}};
const hasPending=s=>!!(s?.editing&&s.editIndex<0&&s.touched);
export function liveClick(t){
 if(workoutMenuClick(t))return true;
 if(importClick(t))return true;
 if($s.modal==='workout-summary'||$s.modal==='ai-review')return summaryClick(t);
 if($s.modal!=='quick-workout')return false;
 const s=$s.quickWorkout;if(!s)return false;
 // 숫자를 만지면 '저장 안 한 세트'로 본다
 if(t.dataset?.qWstep||t.dataset?.qRstep||t.dataset?.qReps||t.dataset?.qUnit)s.touched=true;
 if(t.id==='q-first-set'||t.id==='q-next-set'||t.dataset?.qEditSet||t.id==='rest-go')s.touched=false;
 if(t.id==='q-end'){if(hasPending(s)){s.ask={kind:'end',...pendingOf(s)};$f.render();return true}openSummary();return true}
 if(t.dataset?.qFree!==undefined){s.targets=(s.targets||[]).filter(x=>!x.startsWith('웨이트:'));if(!s.targets.includes('웨이트'))s.targets.push('웨이트');$f.render();return true}
 if(t.id==='q-idle-x'){s.idleDismissed=true;$f.render();return true}
 if((t.id==='q-ex-back'||t.id==='q-ex-clear')&&hasPending(s)&&!t.__asked){s.ask={kind:'switch',then:t.id,...pendingOf(s)};$f.render();return true}
 if(t.id==='q-ask-cancel'){s.ask=null;$f.render();return true}
 if(t.id==='q-ask-save'||t.id==='q-ask-skip'){const a=s.ask;s.ask=null;if(t.id==='q-ask-save'){$f.quickClickRaw({id:'q-save-set',dataset:{}})}else{s.editing=false;s.editIndex=-1}s.touched=false;if(a?.kind==='end')openSummary();else if(a?.then)$f.quickClickRaw({id:a.then,dataset:{},__asked:true});else $f.render();return true}
 if(t.id==='q-save-set'||t.id==='q-repeat-set'){s.touched=false;/* 5.1.0 이 머신(프리웨이트는 기준 운동)의 마지막 단위 기억 */const u=t.id==='q-repeat-set'?[...s.sets].reverse().find(x=>x.exerciseId===s.exerciseId&&x.machineId===s.machineId)?.unit:s.unit;if(u)$s.db=withUnitMemory($s.db,s,u)}
 // 5.1.0 웜업 스위치(기본 꺼짐): 켜면 그 머신의 마지막 웜업 값, 끄면 마지막 일반 세트 값
 if(t.dataset?.qWarm!==undefined){s.warm=!s.warm;if(s.editIndex<0){const f=prefillFor(s,$s.db,{warm:!!s.warm,lastSession,machineUnit:findMachine($s.db,$s.sharedCatalog,s.machineId,s)?.unit||''});if(f.weight!=null){s.weight=f.weight;s.reps=f.reps;s.unit=f.unit}}$f.render();return true}
 // 휴식 화면: 다음 세트 웜업 스위치
 if(t.dataset?.restWarm!==undefined&&s.next){const n=s.next,warm=n.kind!=='warm',ps={...s,exerciseId:n.exerciseId,machineId:n.machineId},f=prefillFor(ps,$s.db,{warm,lastSession});s.next={...n,kind:warm?'warm':'main',...(f.weight!=null?{weight:f.weight,reps:f.reps,unit:f.unit}:{}),changed:true};$f.render();return true}
 if(t.dataset?.restFixWarm!==undefined){t.classList.toggle('on');t.setAttribute('aria-pressed',String(t.classList.contains('on')));return true}
 // 휴식 화면: 방금 한 세트 고치기·지우기
 if((t.id==='rest-fix-ok'||t.id==='rest-fix-del')&&s.rest){const here=s.sets.filter(x=>x.exerciseId===s.exerciseId&&x.machineId===s.machineId),row=here.at(-1);if(!row)return true;const beforeSets=s.sets.slice(),beforeW=$s.db.workouts.slice(),id=s.workoutId;if(t.id==='rest-fix-ok'){const w=Number(document.getElementById('rest-w')?.value),r=Number(document.getElementById('rest-r')?.value);if(!(w>=0)||!Number.isInteger(r)||r<1)throw Error('무게와 횟수를 확인해 주세요.');row.weight=w;row.reps=r;row.type=document.querySelector('[data-rest-fix-warm]')?.classList.contains('on')?'웜업':'본세트';if(s.next&&!s.next.changed&&s.next.exerciseId===s.exerciseId&&row.type!=='웜업'){s.next={...s.next,weight:w,reps:r}}}else{s.sets=s.sets.filter(x=>x!==row)}s.restPanel='main';if(!s.sets.length){$s.db=$f.save({...$s.db,workouts:$s.db.workouts.filter(w=>w.id!==id)});s.workoutId=null;s.rest=null;s.next=null;try{cancelRestNotice()}catch{}}else{const w=quickWorkoutRecord(s,$s.db);$s.db=$f.save({...$s.db,workouts:$s.db.workouts.map(x=>x.id===id?w:x)})}if(t.id==='rest-fix-del'&&!s.sets.some(x=>x.exerciseId===s.exerciseId)){s.rest=null;s.next=null;try{cancelRestNotice()}catch{}}$f.render();const undo=()=>{s.sets=beforeSets;s.workoutId=id;$s.db=$f.save({...$s.db,workouts:beforeW});$f.render()};if(t.id==='rest-fix-del')$f.toastUndo('세트를 지웠어요.',undo);else $f.toastUndo('방금 세트를 고쳤어요.',undo);return true}
 // 5.1.0 세트 하나만 지우기(되돌리기 가능)
 if(t.id==='q-del-set'&&s.editIndex>=0){const row=s.sets[s.editIndex];if(!row)return true;const beforeSets=s.sets.slice(),beforeW=$s.db.workouts.slice(),id=s.workoutId;s.sets=s.sets.filter(x=>x!==row);s.editing=false;s.editIndex=-1;if(!s.sets.length){$s.db=$f.save({...$s.db,workouts:$s.db.workouts.filter(w=>w.id!==id)});s.workoutId=null}else{const w=quickWorkoutRecord(s,$s.db);$s.db=$f.save({...$s.db,workouts:$s.db.workouts.map(x=>x.id===id?w:x)})}$f.render();$f.toastUndo('세트를 지웠어요.',()=>{s.sets=beforeSets;s.workoutId=id;$s.db=$f.save({...$s.db,workouts:beforeW});$f.render()});return true}
 return false;
}
function summaryClick(t){
 const st=$s.sumSt||($s.sumSt={}),w=cur();
 if(!w){$s.modal=null;$f.render();return true}
 if(t.id==='ss-cont'){$s.modal='quick-workout';$f.render();return true}
 if(t.dataset?.ssName!==undefined){st.title=t.dataset.ssName;st.nameEdit=false;$f.render();return true}
 if(t.dataset?.ssNameEdit!==undefined){st.nameEdit=true;$f.render();setTimeout(()=>document.getElementById('ss-name-input')?.focus(),30);return true}
 if(t.id==='ss-name-ok'){const v=String(document.getElementById('ss-name-input')?.value||'').trim().slice(0,40);if(v)st.title=v;st.nameEdit=false;$f.render();return true}
 if(t.id==='ss-time'){st.timeEdit=!st.timeEdit;$f.render();return true}
 if(t.id==='ss-time-ok'){const a=document.getElementById('ss-start')?.value,b=document.getElementById('ss-end')?.value,{start}=sessionTimes(w);if(!/^\d\d:\d\d$/.test(a||'')||!/^\d\d:\d\d$/.test(b||'')||b<a)throw Error('시작·끝 시간을 확인해 주세요.');const delta=start?new Date(`${w.date}T${a}`)-new Date(start.length>16?start:start+':00'):0;const shift=v=>{if(!v||!delta)return v;const d=new Date(new Date(v.length>16?v:v+':00').getTime()+delta);return d.toLocaleString('sv-SE').replace(' ','T').slice(0,16)};const w2={...w,startedAt:`${w.date}T${a}`,endedAt:`${w.date}T${b}`,exercises:w.exercises.map(e=>({...e,...(e.completedAt?{completedAt:shift(e.completedAt)}:{}),sets:(e.sets||[]).map(x=>({...x,completedAt:shift(x.completedAt)}))}))};put(w2);const s=$s.quickWorkout;if(s)for(const x of s.sets||[])x.completedAt=shift(x.completedAt);st.timeEdit=false;$f.render();$f.toast('운동 시간을 고쳤어요.');return true}
 if(t.id==='ss-done'||t.id==='ss-done2'){if(!st.checked){const is=checkWorkout(w,$s.db);if(is.length){st.issues=is;$f.render();return true}}finish();return true}
 if(t.dataset?.ssFix!==undefined){const x=st.issues?.[Number(t.dataset.ssFix)];if(x?.fix){put(applyFix(w,x));const s=$s.quickWorkout;const row=s?.sets?.filter(r=>r.exerciseId===(w.exercises[x.ei]?.exerciseId))?.[x.si];if(row){if(x.fix.weight!=null)row.weight=Number(x.fix.weight);if(x.fix.unit)row.unit=x.fix.unit}st.issues=checkWorkout(cur(),$s.db);if(!st.issues.length){st.issues=null;$f.toast('고쳤어요. 이제 기록 완료를 눌러 주세요.')}$f.render()}return true}
 if(t.id==='ss-keep'){st.checked=true;st.issues=null;finish();return true}
 if(t.id==='ss-check-back'){st.issues=null;$f.render();return true}
 if(t.id==='ss-ai'){if(!isPlus()){$f.toast('AI 오입력 검토는 프리미엄에서 열려요.');return true}$s.airSt={};$s.modal='ai-review';$f.render();return true}
 if(t.id==='air-back'){$s.modal='workout-summary';$f.render();return true}
 if(t.id==='air-copy'){const text=aiReviewPrompt(w);(navigator.clipboard?.writeText?navigator.clipboard.writeText(text):Promise.reject()).then(()=>$f.toast('복사했어요. 내 AI 대화에 붙여 넣어 주세요.')).catch(()=>{$s.airSt={...$s.airSt,text};$f.render();$f.toast('복사가 막혀 있어요. 아래 칸의 글을 길게 눌러 복사해 주세요.')});return true}
 if(t.id==='air-read'){const text=document.getElementById('air-text')?.value||'';$s.airSt={text,found:parseAiReview(text,w)};$f.render();return true}
 if(t.id==='air-apply'){const picks=[...document.querySelectorAll('[data-air-pick]')].filter(c=>c.checked).map(c=>$s.airSt.found[Number(c.dataset.airPick)]);let w2=w;for(const x of picks)w2=applyFix(w2,x);put(w2);$s.airSt=null;$s.modal='workout-summary';$f.render();$f.toast(`${picks.length}곳을 고쳤어요.`);return true}
 return false;
}
export {liveActive};
// 휴식 화면의 '다른 운동 찾기' 칸: 칸은 그대로 두고 결과만(한글 조합 보호)
export function liveInput(t){if($s.modal!=='quick-workout'||!$s.quickWorkout)return false;if(t.id==='rest-ex-search'){$s.quickWorkout.restQuery=t.value;if(!$s.composingSearch)$f.patchKeep('rest-ex-search');return true}return false}
