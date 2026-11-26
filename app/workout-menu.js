// 5.1.0 운동 기록 ⋯ 메뉴(홈 타임라인·운동 페이지): 운동 고치기 / 시간 고치기 / 같은 날 운동과 합치기(같은 날 2개 이상일 때만) / 통째로 지우기(휴지통·되돌리기)
import {$s,$f} from './app-state.js';
import {toTrash} from './trash.js';
import {nameSuggestion} from './workout-name.js';
import {cleanWorkout} from './domain.js';
import {clearLive} from './live-session.js';
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const hm=t=>String(t||'').slice(11,16);
const sameDay=(db,w)=>(db.workouts||[]).filter(x=>x.id!==w.id&&x.date===w.date&&!x.rest&&!x.planned&&!x.recalled);
export function times(w){const t=(w.exercises||[]).flatMap(e=>[...(e.sets||[]).map(s=>s.completedAt),e.completedAt]).filter(Boolean).sort();return {start:w.startedAt||t[0]||'',end:w.endedAt||t.at(-1)||''}}
export function workoutMenuHTML(w,db,{label='운동'}={}){const open=$s.wmenu===w.id,others=sameDay(db,w);return `<span class="wmenu-wrap"><button type="button" class="wmenu-btn" data-wmenu="${esc(w.id)}" aria-expanded="${open}" aria-label="${esc(label)} 고치기·지우기 메뉴">⋯</button>${open?`<span class="wmenu" role="menu"><button type="button" role="menuitem" data-qw="${esc(w.id)}">운동 고치기<small>종목·세트·이름</small></button><button type="button" role="menuitem" data-wtime="${esc(w.id)}">시간 고치기<small>시작·끝 시간</small></button>${others.length?`<button type="button" role="menuitem" data-wmerge="${esc(w.id)}">같은 날 운동과 합치기<small>${others.length}개를 이 운동 하나로</small></button>`:''}<button type="button" role="menuitem" class="r" data-wdel="${esc(w.id)}">이 운동 통째로 지우기<small>휴지통으로 · 되돌리기 가능</small></button></span>`:''}</span>`}
export function timeEditHTML(w){const {start,end}=times(w);return `<div class="ss"><p class="hint">시작 시간을 바꾸면 세트 시각도 같은 만큼 함께 옮겨져요.</p><div class="wt-row"><label class="field">시작<input type="time" id="wt-start" value="${esc(hm(start))}"></label><label class="field">끝<input type="time" id="wt-end" value="${esc(hm(end))}"></label></div><button type="button" class="button quick-primary" id="wt-ok">저장</button></div>`}
const toLocal=d=>d.toLocaleString('sv-SE').replace(' ','T').slice(0,16);
const asDate=v=>new Date(String(v).length>16?v:`${v}:00`);
export function shiftTimes(w,a,b){const {start}=times(w),delta=start?asDate(`${w.date}T${a}`)-asDate(start):0;const shift=v=>!v||!delta?v:toLocal(new Date(asDate(v).getTime()+delta));return {...w,startedAt:`${w.date}T${a}`,endedAt:`${w.date}T${b}`,exercises:(w.exercises||[]).map(e=>({...e,...(e.completedAt?{completedAt:shift(e.completedAt)}:{}),sets:(e.sets||[]).map(x=>({...x,completedAt:shift(x.completedAt)}))}))}}
// 합치기: 이른 운동 하나로. 같은 종목·같은 머신은 세트를 시간순으로 이어 붙인다.
export function mergeWorkouts(list){const ws=[...list].sort((a,b)=>(times(a).start||'').localeCompare(times(b).start||''));const base=ws[0],ex=[];for(const w of ws)for(const e of w.exercises||[]){const hit=e.kind!=='cardio'&&ex.find(x=>x.kind!=='cardio'&&(x.exerciseId||x.name)===(e.exerciseId||e.name)&&(x.machineId||'')===(e.machineId||''));if(hit)hit.sets=[...hit.sets,...(e.sets||[])].sort((a,b)=>String(a.completedAt||'').localeCompare(String(b.completedAt||'')));else ex.push({...e,sets:[...(e.sets||[])]})}const targets=[...new Set(ws.flatMap(w=>w.targets||[]))];const title=nameSuggestion(ex,targets).title;return cleanWorkout({...base,targets,title,exercises:ex,startedAt:undefined,endedAt:undefined,updatedAt:new Date().toISOString()})}
export function workoutMenuClick(t){
 const d=t.dataset||{};
 if(d.wmenu!==undefined){$s.wmenu=$s.wmenu===d.wmenu?null:d.wmenu;$f.render();return true}
 if($s.wmenu&&!t.closest?.('.wmenu-wrap')&&!d.qw){$s.wmenu=null;$f.render()}
 if(d.wtime){$s.wmenu=null;$s.wtimeId=d.wtime;$s.modal='workout-time';$f.render();return true}
 if(t.id==='wt-ok'){const w=$s.db.workouts.find(x=>x.id===$s.wtimeId);const a=document.getElementById('wt-start')?.value,b=document.getElementById('wt-end')?.value;if(!w)return true;if(!/^\d\d:\d\d$/.test(a||'')||!/^\d\d:\d\d$/.test(b||'')||b<a)throw Error('시작·끝 시간을 확인해 주세요.');const before=$s.db.workouts;$s.db=$f.save({...$s.db,workouts:before.map(x=>x.id===w.id?shiftTimes(w,a,b):x)});$s.modal=null;$f.render();$f.toastUndo('운동 시간을 고쳤어요.',()=>{$s.db=$f.save({...$s.db,workouts:before});$f.render()});return true}
 if(d.wdel){$s.wmenu=null;const before=$s.db.workouts,ids=new Set([d.wdel]);toTrash($s.TRASH(),'workouts',before.filter(x=>ids.has(x.id)));$s.db=$f.save({...$s.db,workouts:before.filter(x=>!ids.has(x.id))});if($s.quickWorkout?.workoutId===d.wdel){$s.quickWorkout=null;clearLive()}$f.render();$f.toastUndo('운동 기록을 지웠어요. 휴지통에서도 되살릴 수 있어요.',$s.undoRecords('workouts',before,ids));return true}
 if(d.wmerge){$s.wmenu=null;const w=$s.db.workouts.find(x=>x.id===d.wmerge);if(!w)return true;const others=sameDay($s.db,w),all=[w,...others],merged=mergeWorkouts(all),before=$s.db.workouts,gone=new Set(all.map(x=>x.id).filter(id=>id!==merged.id));$s.db=$f.save({...$s.db,workouts:before.filter(x=>!gone.has(x.id)).map(x=>x.id===merged.id?merged:x)});$f.render();$f.toastUndo(`${all.length}개를 한 운동으로 합쳤어요 · ${merged.title}`,()=>{$s.db=$f.save({...$s.db,workouts:before});$f.render()},8000);return true}
 return false;
}
