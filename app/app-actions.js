import {prefillFor,withUnitMemory,isWarm as isWarmSet} from './set-prefill.js';
import {liveClick,liveInput} from './summary-actions.js';
import {searchFoodDB} from './food-db.js';
import {simpleMealRecords,simpleWorkoutRecord,usualMeals,guessFromText,recentSessions} from './simple-input.js';
// 4.17.0 app.js에서 옮김(14개 함수). 화면 상태는 $s, 다른 app 함수는 $f로 부른다.
import {markCostSeen} from './cost-alert.js';
import {$s,$f} from './app-state.js';
import {openAuth} from './auth-ui.js';
import {myTagCached,loadMyTag,tagAvailable,setMyTag} from './mytag.js';
import {QUESTIONS,prefsOf,withPrefs,onboardingPick,onboardingMove,newOnboarding,finishOnboarding,skipOnboarding,applyPrefClick,emptyAfterWorkout,afterWorkoutFromLast,readAfterWorkoutForm} from './prefs.js';
import {emptyPlan,planFromWorkout,planFromRoutine,readPlanForm,completeSet,skipExercise,finishRun,addRest,endRest,editCurrent,current as guideCurrent,scheduleRestAlert,cancelRestAlert} from './guide.js';
import {addGymPlace,removeGym,centerFor} from './places.js';
import {cloudState,cloudLogin,cloudLogout,synchronize,refreshApproval,applyForAccess,reviewApplicant,reviewApplicants,setAccountPlan,setAccountCoach,deleteAccount} from './cloud-sync.js';
import {planItems} from './admin-panel.js';
import {scopedKey} from './storage-scope.js';
import {gymKeyOf,levelToKg} from './gym-machines.js';
import {toTrash} from './trash.js';
import {cloudRecords,recordsToDB} from './cloud-model.js';
import {MASS,cleanMeal,cleanWorkout,normalizeDB,validDate,uid,setDietState,convertSetUnit} from './domain.js';
import {load,save as saveLocal,getStorageStatus,getRecoveryRaw} from './store.js';
import {isCatalogAdmin,reviewCatalogRequest,catalogRequestPhoto,saveSharedCatalogItem as promoteSave} from './catalog-cloud.js';
import {promoteCandidates} from './catalog-promote.js';
import {EXERCISE_CATALOG as PROMOTE_EX} from './catalog.js';
import {foodSuggestHTML,exerciseSuggestHTML} from './suggest-ui.js';
import {otherUnit,genericMachine,machineTargets} from './machines-catalog.js';
import {quickMealState,readQuickMeal,applyQuickMeal,stepFor,quickWorkoutState,readQuickWorkout,applyQuickWorkout} from './quick-edit.js';
import {newProfileEdit,applyProfile} from './profile.js';
import {newGoalWizard,applyGoalWizard,WIZ_STEPS,estimate as estimateEnergy} from './nutrition-plan.js';
import {pairLocalAgent,unpairLocalAgent,resolveAIDraft} from './ai-drafts.js';
import {classOf as pmClassOf,addPickedMove} from './pilates-pick.js';
import {savedLine} from './motivation.js';
import {createBackup,recoverInterruptedRestore} from './backup.js';
import {readSession,clearSession,rawSession} from './session.js';
import {blankFood,batchSummary} from './meal-batch.js';
import {newReg,readReg,setUnit,applySimilar,toPreset} from './food-register.js';
import {pastMeals} from './meal-rank.js';
import {kvGet} from './kv-store.js';
import {applyWhen,shiftWhen,toggleHour,setManualTime} from './meal-when.js';
import {upsertFoodPreset} from './nutrition.js';
import {loadFoodDB,foodDBReady,findFoodDB} from './food-db.js';
import {foodMacroText,emptyQuickMeal,emptyQuickWorkout,quickTime,quickFoodCandidates,quickMealRecords,quickWorkoutRecord,lastSession,findMachine,usesBar,defaultBar,memoKey,usualQty,yesterdayMeal,mealToRow,recentMealGroups,frequentCombo,exKeyOf} from './quick-entry.js';
import {resolveExercise} from './catalog.js';
import {exerciseTargets,warmMain,nextFill,lastGym} from './workout-plan.js';
import {defaultNext,restMode,scheduleRestNotice,cancelRestNotice,askRestNoticePermission,restNoticeBody} from './rest-screen.js';
// 4.23.0 휴식 끝 알림 예약을 지금 상태에 맞춘다(지정해 두고 쉬기일 때만)
function syncRestNotice(s){if(s?.rest&&s.next&&restMode($s.db)==='alarm'){const it=$f.allExercises().find(x=>(x.id||x.name)===s.next.exerciseId);scheduleRestNotice(s.rest.at+(s.rest.target||90)*1000,restNoticeBody(it?.name,s.next))}else cancelRestNotice()}
import {isLive} from './quick-entry.js';
// 4.19.0 지난번 웜업·메인으로 이번 세트 무게 채우기(사용자가 고른 방식: 웜업부터·메인만·채우지 않기)
const fillMode=()=>$s.db.settings?.setFill||'warm';
function applyFill(s){const wm=warmMain(lastSession($s.db,s)?.sets||[]),done=s.sets.filter(x=>x.exerciseId===s.exerciseId).length,f=nextFill(wm,done,fillMode());if(!f)return false;s.weight=f.weight;s.reps=f.reps;s.unit=f.unit||s.unit;s.fillKind=f.kind;return true}
import {createRecipe,recipeMeals} from './model-features.js';
export function quickClick(t){
 /* 5.0.6 심플 모드 초안(숨김 스위치로만): 같은 식사·운동 창 안의 러프한 기록 */
 if(simpleClick(t))return true;
 /* 5.1.0 세션 끝내기·정리 화면·세트 지우기 */if(liveClick(t))return true;
 if($s.modal==='quick-meal'){
  const s=$s.quickMeal;

  /* 4.26.0 식사 시작 선택(방금·전에·미리)과 시각 칩 */
  if(t.dataset.qWhen){applyWhen(s,t.dataset.qWhen);$f.render();return true}
  if(t.dataset.qWhenReset!==undefined){s.when=null;$f.render();return true}
  if(t.dataset.qWhenDate){s.date=t.dataset.qWhenDate;s.hourOpen=null;$f.render();return true}
  /* 4.29.x 시 칩 → 10분 칩으로 열고 닫기 */
  if(t.dataset.qWhenHour!==undefined){toggleHour(s,t.dataset.qWhenHour);$f.render();return true}
  if(t.dataset.qWhenTime){s.time=t.dataset.qWhenTime;if(s.when==='now')s.date=new Date().toLocaleString('sv-SE').slice(0,10);$f.render();return true}
  if(t.dataset.qWhenShift){const w=shiftWhen(s.date,s.time,Number(t.dataset.qWhenShift));s.date=w.date;s.time=w.time;$f.render();return true}
  /* 4.26.0 새 음식 등록(빠른 기록 안 3단계) */
  if(t.dataset.regOpen!==undefined){s.picked=null;s.reg=newReg(s.query||'');$f.render();return true}
  if(s.reg){const R=s.reg,go=()=>{R.err='';$f.render();return true},bad=m=>{R.err=m;$f.render();return true};
   if(t.dataset.regClose!==undefined){s.reg=null;$f.render();return true}
   readReg(R,document.querySelector('.reg-overlay'));
   if(t.dataset.regUnit){setUnit(R,t.dataset.regUnit);return go()}
   if(t.dataset.regSrc){R.src=t.dataset.regSrc;return go()}
   if(t.dataset.regBasis){R.basis=t.dataset.regBasis;return go()}
   if(t.dataset.regSim){const it=findFoodDB(t.dataset.regSim);if(it)applySimilar(R,it);return go()}
   if(t.dataset.regQty){R.qty=Number(t.dataset.regQty);return go()}
   if(t.dataset.regBack!==undefined){R.step=Math.max(1,R.step-1);return go()}
   if(t.dataset.regNext!==undefined){if(R.step===1&&!R.name)return bad('음식 이름을 적어 주세요.');if(R.step===2){const r=toPreset(R);if(r.error)return bad(r.error)}R.step=Math.min(3,R.step+1);return go()}
   if(t.dataset.regDone!==undefined){const r=toPreset(R);if(r.error)return bad(r.error);if(!(Number(R.qty)>0))return bad('먹은 양을 확인해 주세요.');const foods=upsertFoodPreset($s.db.foods||[],r.preset),saved=foods[foods.length-1];$s.db=$f.save({...$s.db,foods});s.rows.push($f.quickFoodRow(saved,Math.round(Number(R.qty)*100)/100));s.reg=null;s.query='';$f.render();$f.toast(`'${saved.name}' 내 음식에 저장하고 이번 식사에 담았어요.`);return true}
  }
  if(t.dataset.qTab){s.tab=t.dataset.qTab;$f.render();return true}
  if(t.dataset.sgFoodGroup){s.sgGroup=s.sgGroup===t.dataset.sgFoodGroup?null:t.dataset.sgFoodGroup;$f.render();return true}
  if(t.dataset.qYday!==undefined){const yd=yesterdayMeal($s.db.meals,s.date,s.time);if(yd){s.rows=yd.items.map(mealToRow);$f.render();$f.toast('어제 식사를 담았어요. 양만 바꿔서 저장하면 돼요.')}return true}
  if(t.dataset.qDb){const item=findFoodDB(t.dataset.qDb);if(!item)throw Error('음식을 찾지 못했습니다.');if(item.calories==null)throw Error('열량 정보가 없는 음식이에요. 직접 등록으로 넣어 주세요.');s.picked=structuredClone(item);s.share=1;s.editIndex=-1;s.usual=usualQty($s.db.meals,item.name,item.servingUnit);s.qty=s.usual[0]?.qty??(MASS.has(item.servingUnit)?($s.db.settings.lastGrams?.[item.name]||100):1);s.gramOptions=$s.db.settings.gramOptions?.[item.name]||[100,200,210,250,300];$f.render();return true}
  if(t.id==='q-combo-save'){const c=frequentCombo($s.db,s.rows);if(!c)return true;const meals=quickMealRecords({...s,date:s.date||$f.today(),time:s.time||'12:00'});const name=`${s.slot&&s.slot!=='식사'?s.slot+' ':''}${s.rows[0].name}${s.rows.length>1?` 외 ${s.rows.length-1}가지`:''}`;$s.db=$f.save({...$s.db,recipes:[...($s.db.recipes||[]),createRecipe(name,meals)]});$f.toast(`'${name}'${(c=>{const k=c.charCodeAt(0)-0xAC00;return k>=0&&k<11172&&k%28&&k%28!==8?'으로':'로'})(name.slice(-1))} 저장했어요. '저장한 조합'에서 한 번에 담을 수 있어요.`);$f.render();return true}
  if(t.id==='q-combo-no'){const c=frequentCombo($s.db,s.rows);if(c)$s.db=$f.save({...$s.db,settings:{...$s.db.settings,comboDismissed:[...($s.db.settings.comboDismissed||[]),c.sig].slice(-100)}});$f.render();return true}
  if(t.id==='q-doubt-calc'&&s.picked){const r=s.picked;r.calories=Math.round((r.carbs||0)*4+(r.protein||0)*4+(r.fat||0)*9);r.dbDoubt=false;r.aiEvidence={...(r.aiEvidence||{}),note:'열량은 탄단지로 계산(사용자 선택)'};$f.render();$f.toast('탄단지로 계산한 열량으로 바꿨어요.');return true}
  if(t.dataset.qAgainMeal){const g=pastMeals($s.db.meals,s.date,s.time,{limit:20}).find(x=>x.key===t.dataset.qAgainMeal);if(!g)return true;s.rows=g.items.map(m=>mealToRow(m));if(g.slot&&!s.slotTouched)s.slot=g.slot;$f.render();$f.toast(`${g.items.length}가지를 담았어요. 양이 다르면 −/+로 바꿔 주세요.`);return true}
  if(t.dataset.qRowStep){const [i,dir]=t.dataset.qRowStep.split(':').map(Number),row=s.rows[i];if(!row)return true;const mass=MASS.has(row.servingUnit),step=mass?(row.servingQty>=200?20:10):0.5,next=Math.round((Number(row.servingQty)+dir*step)*10)/10;if(next<=0)return true;row.servingQty=next;$f.render();return true}
  if(t.dataset.qFood){const item=quickFoodCandidates($f.foodChoices()).find(x=>`${x.name.toLocaleLowerCase('ko')}|${x.servingUnit||'g'}`===t.dataset.qFood);if(!item)throw Error('음식을 찾지 못했습니다.');if(['calories','carbs','protein','fat'].some(k=>item[k]==null))throw Error('영양값이 일부 없는 음식입니다. 상세 입력에서 라벨 값을 확인해 주세요.');s.picked=structuredClone(item);s.share=1;s.editIndex=-1;s.usual=usualQty($s.db.meals,item.name,item.servingUnit);s.qty=s.usual[0]?.qty??(MASS.has(item.servingUnit)?($s.db.settings.lastGrams?.[item.name]||100):1);s.gramOptions=$s.db.settings.gramOptions?.[item.name]||[100,200,210,250,300];$f.render();return true}
  if(t.dataset.qRecipe){const recipe=($s.db.recipes||[]).find(x=>x.id===t.dataset.qRecipe);if(!recipe)return true;for(const meal of recipeMeals(recipe,s.date,'식사',1)){const q=MASS.has(meal.servingUnit)?($s.db.settings.lastGrams?.[meal.name]||meal.servingQty):meal.servingQty,base=MASS.has(meal.servingUnit)?meal.servingQty/100:meal.servingQty;s.rows.push($f.quickFoodRow({...meal,...Object.fromEntries(['calories','carbs','protein','fat'].map(k=>[k,meal[k]==null?null:meal[k]/base]))},q))}$f.render();return true}
  if(t.dataset.qGram){s.qty=Number(t.dataset.qGram);$f.render();return true}
  if(t.dataset.qShare){const q=Number(document.getElementById('q-qty')?.value);if(Number.isFinite(q)&&q>0)s.qty=q;s.share=Number(t.dataset.qShare)||1;$f.render();return true}
  if(t.dataset.qEditFood!==undefined){s.editIndex=Number(t.dataset.qEditFood);s.picked=structuredClone(s.rows[s.editIndex]);s.share=1;s.qty=s.picked.servingQty;s.gramOptions=$s.db.settings.gramOptions?.[s.picked.name]||[100,200,210,250,300];$f.render();return true}
  if(t.dataset.qRemoveFood!==undefined){s.rows.splice(Number(t.dataset.qRemoveFood),1);$f.render();return true}
  if(t.id==='q-close-picker'){s.picked=null;$f.render();return true}
  if(t.id==='q-confirm-food'){const qty=Number(document.getElementById('q-qty')?.value)/(s.share||1);if(!Number.isFinite(qty)||qty<=0)throw Error('먹은 양을 확인해 주세요.');s.share=1;const row=$f.quickFoodRow(s.picked,Math.round(qty*100)/100);if(s.editIndex>=0)s.rows[s.editIndex]=row;else s.rows.push(row);s.picked=null;s.editIndex=-1;$f.render();return true}
  if(t.id==='q-food-advanced'){$s.batchRows=s.rows.length?structuredClone(s.rows):[{...blankFood(),name:s.query.trim()}];$s.batchDate=s.date;$s.batchTime=s.time;$s.batchCopy=false;$s.modal='batch';$f.render();return true}
  if(t.id==='q-save-meal'){if(getStorageStatus().blocked)throw Error('기존 기록 보호를 위해 먼저 복구해 주세요.');const rows=quickMealRecords(s),lastGrams={...$s.db.settings.lastGrams,...Object.fromEntries(rows.filter(x=>MASS.has(x.servingUnit)).map(x=>[x.name,x.servingQty]))};$s.db=$f.save({...$s.db,meals:[...$s.db.meals,...rows],foods:$f.savedFoodsFromRows(s.rows),dayStates:{...$s.db.dayStates,[s.date]:$s.db.dayStates?.[s.date]==='complete'?'complete':'partial'},settings:{...$s.db.settings,lastGrams}});$s.selectedDate=s.date;$s.page=['home','food','calendar'].includes($s.page)?$s.page:'food';$s.modal=null;$s.quickMeal=null;$f.render();$f.toast(rows.some(x=>x.planned)?'예정 식사로 넣었어요. 먹은 뒤 확정해 주세요.':savedLine($s.db));return true}
 }
 if($s.modal==='quick-workout'){
  const s=$s.quickWorkout;
  if(t.dataset.qPart){s.part=t.dataset.qPart;$f.render();return true}
  if(t.dataset.qCat){s.cat=t.dataset.qCat;s.part='전체';$f.render();return true}
  if(t.id==='q-ex-clear'||t.id==='q-ex-back'){if(s.rest)cancelRestNotice();s.rest=null;s.next=null;s.restPanel='main';s.exerciseId='';s.machineId='';s.editing=false;s.query='';$f.render();document.querySelector?.('.sheet')?.scrollTo?.({top:0});return true}
  if(t.dataset.qTmin){const m=document.getElementById('q-t-min');if(m){m.value=t.dataset.qTmin;m.dispatchEvent(new Event('input',{bubbles:true}))}document.querySelectorAll('[data-q-tmin]').forEach(b=>b.classList.toggle('active',b===t||b.dataset?.qTmin===t.dataset.qTmin));return true}
  if(t.id==='q-list-toggle'){s.listOpen=!s.listOpen;$f.render();return true}
  if(t.id==='q-again-toggle'){s.againOpen=!s.againOpen;$f.render();return true}
  if(t.dataset.qPmapp){s.pmApp=t.dataset.qPmapp;$f.render();return true}
  if(t.dataset.qPmove){const [,app]=t.dataset.qPmove.split('|');const cls=pmClassOf(app),item=$f.allExercises().find(x=>x.name===cls);if(!item)return true;Object.assign(s,addPickedMove(s,t.dataset.qPmove));if(s.exerciseId!==(item.id||item.name)){s.exerciseId=item.id||item.name;s.machineId=''}$s.sheetDirty=true;$f.render();$f.toast(`${t.dataset.qPmove.split('|')[0]} 담았어요 · ${cls}`);return true}
  if(t.dataset.qPmoveDel!=null){s.pmoves=(s.pmoves||[]).filter((_,i)=>i!==Number(t.dataset.qPmoveDel));$f.render();return true}
  if(t.id==='q-timed-save'){const item=$f.allExercises().find(x=>(x.id||x.name)===s.exerciseId);if(!item)throw Error('종목을 다시 선택해 주세요.');const v=id=>document.getElementById(id)?.value??'',n=id=>v(id)===''?null:Number(v(id));const durationMin=n('q-t-min'),distanceKm=n('q-t-km');if(!(durationMin>0)&&!(distanceKm>0))throw Error('시간이나 거리를 적어 주세요.');const completedAt=v('q-t-time');if(!completedAt)throw Error('끝난 시각을 확인해 주세요.');s.sets.push({id:uid(),timed:true,exerciseId:s.exerciseId,machineId:'',exercise:structuredClone(item),durationMin,distanceKm,effort:n('q-t-effort'),avgHr:n('q-t-hr'),sessionType:v('q-t-type'),note:v('q-t-note'),completedAt,...((s.pmoves||[]).length&&/필라테스/.test(item.name)?{moves:s.pmoves.map(m=>({name:m.name,apparatus:m.apparatus}))}:{})});s.pmoves=[];const workout=quickWorkoutRecord(s,$s.db);$s.db=$f.save({...$s.db,workouts:(s.workoutId?$s.db.workouts.map(w=>w.id===s.workoutId?workout:w):[...$s.db.workouts,workout]).filter(w=>!s.fromPlan||w.id!==s.fromPlan||w===workout)});s.workoutId=workout.id;s.exerciseId='';$s.sheetDirty=false;$f.render();$f.toast(`${item.name} 기록을 남겼어요.`);return true}
  /* 4.21.0 휴식 화면 */
  if(t.dataset.qLive!==undefined){if(s.sets.length)return true;s.live=t.dataset.qLive===''?undefined:t.dataset.qLive==='1';$f.render();return true}
  if(t.dataset.restMode){$s.db=$f.save({...$s.db,settings:{...$s.db.settings,restMode:t.dataset.restMode}});if(t.dataset.restMode==='alarm')askRestNoticePermission();syncRestNotice(s);$f.render();return true}
  if(t.dataset.restSet&&s.rest){s.rest.target=Number(t.dataset.restSet);$s.db=withPrefs($s.db,{restSec:s.rest.target});$s.db=$f.save($s.db);syncRestNotice(s);$f.render();return true}
  if(t.dataset.restAdd&&s.rest){s.rest.target=Math.min(600,(s.rest.target||90)+Number(t.dataset.restAdd));$s.db=$f.save(withPrefs($s.db,{restSec:s.rest.target}));syncRestNotice(s);$f.render();return true}
  if(t.dataset.restPanel&&s.rest){s.restPanel=t.dataset.restPanel;$f.render();return true}
  if(t.dataset.restW){const i=document.getElementById('rest-w');if(i)i.value=String(Math.max(0,Math.round(((Number(i.value)||0)+Number(t.dataset.restW))*100)/100));return true}
  if(t.dataset.restR){const i=document.getElementById('rest-r');if(i)i.value=String(Math.max(1,(Number(i.value)||0)+Number(t.dataset.restR)));return true}
  if(t.dataset.restReps){const i=document.getElementById('rest-r');if(i)i.value=t.dataset.restReps;t.parentElement?.querySelectorAll('[data-rest-reps]').forEach(b=>b.classList.toggle('active',b===t));return true}
  if(t.dataset.restKind&&s.next){const w=Number(document.getElementById('rest-w')?.value),r=Number(document.getElementById('rest-r')?.value);if(w>=0)s.next.weight=w;if(r>0)s.next.reps=r;s.next.kind=t.dataset.restKind;$f.render();return true}
  if(t.id==='rest-w-ok'&&s.next){const w=Number(document.getElementById('rest-w')?.value),r=Number(document.getElementById('rest-r')?.value);if(!(w>=0)||!Number.isInteger(r)||r<1)throw Error('무게와 횟수를 확인해 주세요.');s.next={...s.next,weight:w,reps:r,changed:true};s.restPanel='main';syncRestNotice(s);$f.render();return true}
  if(t.dataset.restSide){t.parentElement?.querySelectorAll('[data-rest-side]').forEach(b=>{b.classList.toggle('on',b===t);b.setAttribute('aria-pressed',String(b===t))});return true}
  if(t.id==='rest-m-ok'&&s.next){const on=document.querySelector('[data-rest-side].on');if(on&&on.dataset.restSide!==s.next.side)s.next={...s.next,side:on.dataset.restSide,changed:true};s.restPanel='main';$f.render();return true}
  if(t.dataset.restEx&&s.next){const key=t.dataset.restEx,item=$f.allExercises().find(x=>(x.id||x.name)===key)||$f.allExercises().find(x=>x.name===key)||(r=>r&&$f.allExercises().find(x=>x.id===r.id))(resolveExercise(key));if(!item){$f.toast('이 운동을 찾지 못했어요.');return true}const id=item.id||item.name,mid=$f.quickMachineFor(id,s.gymName)?.id||'',ps={...s,exerciseId:id,machineId:mid},f=prefillFor(ps,$s.db,{warm:false,lastSession,machineUnit:findMachine($s.db,$s.sharedCatalog,mid,ps)?.unit||''});s.next={exerciseId:id,machineId:mid,weight:f.weight??0,reps:f.reps??10,unit:f.unit||'kg',kind:'main',side:'both',changed:true};s.restPanel='weight';syncRestNotice(s);$f.render();return true}
  if(t.id==='rest-go'&&s.rest&&s.next){const n=s.next,mode=restMode($s.db);s.pendingRest=mode==='off'?0:Math.round((Date.now()-s.rest.at)/1000);if(n.exerciseId!==s.exerciseId){s.exerciseId=n.exerciseId;s.machineId=n.machineId||'';s.queue=(s.queue||[]).filter(x=>x!==n.exerciseId);/* 5.1.0 종목을 바꿔도 '오늘 할 부위'는 그대로(이름은 고른 부위로) */}s.weight=n.weight;s.reps=n.reps;s.unit=n.unit||s.unit;s.fillKind='';s.warm=n.kind==='warm';s.side=n.side||'both';cancelRestNotice();s.rest=null;s.next=null;s.restPanel='main';s.editing=true;s.editIndex=-1;s.completedAt=quickTime(s.date);$f.render();document.querySelector?.('.sheet')?.scrollTo?.({top:0});return true}
  if(t.dataset.qTitle){s.title=s.title===t.dataset.qTitle?'':t.dataset.qTitle;$f.render();return true}
  /* 4.19.0 오늘 할 운동: 큰 종류를 끄면 그 아래 부위·기구도 끄고, 부위를 켜면 큰 종류도 켠다 */
  if(t.dataset.qTarget){const v=t.dataset.qTarget,tg=new Set(s.targets||[]);if(tg.has(v)){tg.delete(v);if(!v.includes(':'))for(const x of [...tg])if(x.startsWith(v+':'))tg.delete(x)}else{tg.add(v);if(v.includes(':'))tg.add(v.split(':')[0])}s.targets=[...tg];$f.render();return true}
  if(t.id==='q-date-edit'){s.dateEdit=true;$f.render();setTimeout(()=>document.querySelector('[data-q-work="date"]')?.focus(),30);return true}
  if(t.dataset.qFillMode){$s.db=$f.save({...$s.db,settings:{...$s.db.settings,setFill:t.dataset.qFillMode}});if(s.editing&&!s.sets.some(x=>x.exerciseId===s.exerciseId&&x.machineId===s.machineId))applyFill(s);$f.render();return true}
  if(t.dataset.qPlanlist){const ids=t.dataset.qPlanlist.split('|').filter(Boolean);if(!ids.length)return true;s.queue=ids.slice(1);s.planKeys=ids;s.planPraised=false;t={dataset:{qEx:ids[0]},id:''}}
  if(t.id==='q-rest'){if(s.sets.length){$f.toast('기록 중인 세트가 있어요. 먼저 저장하거나 지워 주세요.');return true}if(($s.db.workouts||[]).some(w=>w.rest&&w.date===s.date)){$f.toast('이 날은 이미 휴식일이에요.');return true}const rest=cleanWorkout({date:s.date,rest:true,title:'의도적 휴식',exercises:[],loggedAt:new Date(`${s.date}T06:00:00`).toISOString()});$s.db=$f.save({...$s.db,workouts:[...$s.db.workouts,rest]});$s.sheetDirty=false;$s.modal=null;$f.render();$f.toast('의도적 휴식을 기록했어요. 오늘의 헤일로에 반영돼요.');return true}
  if(t.dataset.sgEx){s.sgEx=s.sgEx===t.dataset.sgEx?null:t.dataset.sgEx;s.sgBrand=null;$f.render();return true}
  if(t.dataset.sgBrand){s.sgBrand=s.sgBrand===t.dataset.sgBrand?null:t.dataset.sgBrand;$f.render();return true}
  if(t.dataset.sgPick!==undefined){const item=$f.allExercises().find(x=>(x.id||x.name)===t.dataset.sgPick);if(!item)return true;s.exerciseId=item.id||item.name;s.machineId=t.dataset.sgMachine||'';const last=$f.quickPreviousSet(s.exerciseId,s.machineId);s.weight=last?.weight??0;s.reps=last?.reps??10;s.unit=last?.unit||findMachine($s.db,$s.sharedCatalog,s.machineId,s)?.unit||'kg';s.editing=false;s.sgEx=null;s.sgBrand=null;$f.render();return true}
  if(t.dataset.qPlan){const w=($s.db.workouts||[]).find(x=>x.id===t.dataset.qPlan);if(!w)return true;const ids=[];/* 4.18.1 직접 적은 종목도 포함 */for(const e of w.exercises||[]){const k=e.kind!=='cardio'&&e.name?exKeyOf(e,$s.db):'';if(k&&!ids.includes(k))ids.push(k)}if(!ids.length)return true;s.queue=ids.slice(1);s.planKeys=ids;s.planPraised=false;if(!s.title&&w.title&&!['오늘의 운동','운동'].includes(w.title))s.title=w.title;t={dataset:{qEx:ids[0]},id:''}}
  if(t.dataset.qEx){s.queue=(s.queue||[]).filter(x=>x!==t.dataset.qEx);const item=$f.allExercises().find(x=>(x.id||x.name)===t.dataset.qEx)||$f.allExercises().find(x=>x.name===t.dataset.qEx)||(r=>r&&$f.allExercises().find(x=>x.id===r.id))(resolveExercise(t.dataset.qEx));if(!item){$f.toast('이 종목을 찾지 못했어요. 검색해서 골라 주세요.');return true}s.rest=null;s.next=null;s.exerciseId=item.id||item.name;/* 5.1.0 종목을 골라도 '오늘 할 부위'는 바꾸지 않는다(웜업 페이스 풀이 '등'을 이름에 넣던 문제) */s.machineId=$f.quickMachineFor(s.exerciseId,s.gymName)?.id||'';s.warm=false;const last=prefillFor(s,$s.db,{warm:false,lastSession,machineUnit:$s.db.machines.find(m=>m.id===s.machineId)?.unit||''});s.weight=last.weight??0;s.reps=last.reps??10;s.unit=last.unit||'kg';s.editing=false;if(item.kind!=='cardio'&&!s.sets.some(x=>x.exerciseId===s.exerciseId))return quickClick({dataset:{},id:'q-first-set'});$f.render();return true}
  if(t.id==='q-gym-add-open'){$s.quickWorkout.gymAdding=true;$f.render();setTimeout(()=>document.getElementById('q-gym-new')?.focus(),0);return true}
  if(t.id==='q-gym-cancel'){$s.quickWorkout.gymAdding=false;$s.quickWorkout.gymDraft='';$f.render();return true}
  if(t.id==='q-gym-save'){const s=$s.quickWorkout,name=String(document.getElementById('q-gym-new')?.value||'').trim();if(!name){$f.toast('헬스장 이름을 적어 주세요.');return true}$s.db=$f.save(addGymPlace($s.db,{name}));s.gymName=name;s.gymTouched=true;s.gymAdding=false;s.gymDraft='';$f.render();$f.toast(`“${name}”을 추가하고 골랐어요.`);return true}
  if(t.id==='q-new-workout'){if(s?.rest)cancelRestNotice();$s.quickWorkout=emptyQuickWorkout($f.today(),$s.db.settings.gyms||[],$s.db);$f.render();return true}
  if(t.id==='q-new-machine'){$s.machineIndex=null;$s.machineEdit={exerciseId:s.exerciseId,location:s.gymName};$s.machinePhoto='';$s.profileReturn='quick-workout';$s.modal='machine';$f.render();return true}
  if(t.id==='q-draft-resume'){$f.resumeSession();return true}
  if(t.id==='q-draft-drop'){try{clearSession()}catch{}$s.savedDraft=null;$f.render();$f.toast('작성하던 상세 기록을 버렸어요.');return true}
  if(t.id==='q-work-advanced'){$s.modal='workout';$s.workDraft=[];$s.workMeta={date:s.date,title:s.title,gymName:s.gymName};$f.render();return true}
  if(t.dataset.qEditSet){const row=s.sets.find(x=>x.id===t.dataset.qEditSet);if(!row)return true;s.editing=true;s.warm=row.type==='웜업';s.editIndex=s.sets.indexOf(row);s.exerciseId=row.exerciseId;s.machineId=row.machineId;s.weight=row.weight;s.reps=row.reps;s.unit=row.unit;s.completedAt=row.completedAt;$f.render();return true}
  if(t.id==='q-close-picker'){s.editing=false;s.editIndex=-1;$f.render();return true}
  if(t.id==='q-first-set'||t.id==='q-next-set'){/* 5.1.0 미리 채우기: 오늘 방금 세트 → 지난 기록의 마지막 일반 세트, 단위는 이 머신에서 마지막에 쓴 것 */s.warm=false;const last=(f=>f.weight!=null?f:null)(prefillFor(s,$s.db,{warm:false,lastSession,machineUnit:findMachine($s.db,$s.sharedCatalog,s.machineId,s)?.unit||''}));s.weight=last?.weight??s.weight;s.reps=last?.reps??s.reps;s.unit=last?.unit||prefillFor(s,$s.db,{lastSession}).unit||s.unit;s.barKg=last?.barKg??(usesBar($f.allExercises().find(x=>(x.id||x.name)===s.exerciseId),findMachine($s.db,$s.sharedCatalog,s.machineId,s))?defaultBar($f.allExercises().find(x=>(x.id||x.name)===s.exerciseId),$s.db.settings,s.unit):undefined);s.fillKind='';s.completedAt=quickTime(s.date);s.editing=true;s.editIndex=-1;$f.render();return true}
  if(t.dataset.qUnit){const w=document.getElementById('q-set-weight');if(w)s.weight=w.value;if(s.unit!==t.dataset.qUnit)s.barKg=undefined;s.unit=t.dataset.qUnit;$f.render();return true}
  if(t.id==='q-memo-open'){s.memoEdit=true;$f.render();setTimeout(()=>document.getElementById('q-memo')?.focus(),30);return true}
  if(t.id==='q-memo-cancel'){s.memoEdit=false;$f.render();return true}
  if(t.id==='q-memo-save'){const v=String(document.getElementById('q-memo')?.value||'').trim().slice(0,80),k=memoKey($s.db,s),notes={...($s.db.settings.machineNotes||{})};if(v)notes[k]=v;else delete notes[k];$s.db=$f.save({...$s.db,settings:{...$s.db.settings,machineNotes:notes}});s.memoEdit=false;$f.render();$f.toast(v?'메모를 저장했어요. 이 머신을 고르면 보여요.':'메모를 지웠어요.');return true}
  if(t.dataset.qBar){const p=document.getElementById('q-plates')?.value,w=document.getElementById('q-set-weight');s.barKg=Number(t.dataset.qBar);if(p!==''&&p!=null)s.weight=Math.round((Number(p)+s.barKg)*100)/100;else if(w)s.weight=w.value;$f.render();return true}
  if(t.dataset.qReps){const r=document.getElementById('q-set-reps');if(r){r.value=t.dataset.qReps;s.reps=Number(t.dataset.qReps)}t.parentElement?.querySelectorAll('[data-q-reps]').forEach(b=>b.classList.toggle('active',b===t));return true}
  if(t.dataset.qRstep){const r=document.getElementById('q-set-reps');if(r){r.value=String(Math.max(1,(Number(r.value)||0)+Number(t.dataset.qRstep)));s.reps=Number(r.value)}return true}
  if(t.dataset.qWstep){const w=document.getElementById('q-set-weight');if(w){w.value=String(Math.max(0,Math.round(((Number(w.value)||0)+Number(t.dataset.qWstep))*100)/100));s.weight=w.value;const c=document.getElementById('q-set-conv');if(c)c.textContent=otherUnit(w.value,s.unit)}return true}
  if(t.id==='q-repeat-set'||t.id==='q-save-set'){
   if(getStorageStatus().blocked)throw Error('기존 기록 보호를 위해 먼저 복구해 주세요.');const item=$f.allExercises().find(x=>(x.id||x.name)===s.exerciseId);if(!item)throw Error('종목을 다시 선택해 주세요.');const last=[...s.sets].reverse().find(x=>x.exerciseId===s.exerciseId&&x.machineId===s.machineId);const direct=t.id==='q-repeat-set',weight=direct?last?.weight:Number(document.getElementById('q-set-weight')?.value),reps=direct?last?.reps:Number(document.getElementById('q-set-reps')?.value),unit=direct?last?.unit:s.unit,completedAt=direct?quickTime(s.date):document.getElementById('q-set-time')?.value;if(!Number.isFinite(weight)||weight<0||!Number.isInteger(reps)||reps<1||!['kg','lb','level'].includes(unit)||!completedAt)throw Error('중량·횟수·단위·시각을 확인해 주세요.');const wasEdit=s.editIndex>=0,prevRow=wasEdit?s.sets[s.editIndex]:null,row={id:wasEdit?prevRow.id:uid(),exerciseId:s.exerciseId,machineId:s.machineId,exercise:structuredClone(item),weight,reps,unit,completedAt,/* 4.21.0 세트 종류(웜업/본세트)·방식·이 세트 전에 쉰 시간 */...(wasEdit?{type:s.warm?'웜업':'본세트',...(prevRow.side?{side:prevRow.side}:{}),...(prevRow.restSec?{restSec:prevRow.restSec}:{})}:{type:direct?(last?.type||'본세트'):(s.warm?'웜업':'본세트'),...((direct?last?.side:s.side)==='single'?{side:'single'}:{}),...(s.pendingRest>0?{restSec:s.pendingRest}:{})}),...(usesBar(item,null)&&!s.machineId&&Number(s.barKg)>=0&&s.barKg!==undefined?{barKg:Number(s.barKg)}:{}),...(unit==='level'?(r=>({levelKg:r.kg,...(r.est?{levelEst:true}:{})}))(levelToKg(findMachine($s.db,$s.sharedCatalog,s.machineId,s)||{},weight)):{})};if(s.editIndex>=0)s.sets[s.editIndex]=row;else s.sets.push(row);const workout=quickWorkoutRecord(s,$s.db),titles=$s.db.settings.workoutTitles||[],name=s.title.trim();$s.db=$f.save({...$s.db,workouts:(s.workoutId?$s.db.workouts.map(w=>w.id===s.workoutId?workout:w):[...$s.db.workouts,workout]).filter(w=>!s.fromPlan||w.id!==s.fromPlan||w===workout),settings:{...$s.db.settings,workoutTitles:name?[...new Set([...titles,name])]:titles}});if(!s.workoutId)s.isNew=true;s.workoutId=workout.id;s.editing=false;s.editIndex=-1;s.pendingRest=0;/* 4.23.0 '하던 순서'를 다 하면 칭찬 한 줄(한 번만) */if(s.planKeys?.length>1&&!s.planPraised&&s.planKeys.every(k=>s.sets.some(x=>x.exerciseId===k))){s.planPraised=true;setTimeout(()=>$f.toast(`계획한 ${s.planKeys.length}종목을 다 했어요! 오늘도 해냈어요 🔥`,5000),400)}/* 4.21.0 새 세트를 저장하면 휴식 화면으로(세트 고치기는 제외) */if(!wasEdit&&isLive(s)){s.rest={at:Date.now(),target:prefsOf($s.db).restSec};s.restPanel='main';s.next=defaultNext(s,{lastSession,fillMode:fillMode(),db:$s.db});$s.restAlarmed=false;if(!$s.restAsked){$s.restAsked=true;askRestNoticePermission()}syncRestNotice(s)}$f.render();document.querySelector?.('.sheet')?.scrollTo?.({top:0});$f.recordHint();$f.toast(s.sets.length===1&&s.editIndex<0?savedLine($s.db,{base:'첫 세트를 남겼어요.'}):'완료한 세트를 저장했습니다.');return true
  }
 }
 return false;
}
export async function enhancedClick(t){
 if(t.dataset.atlasMode){$s.analysisAtlasMode=t.dataset.atlasMode;$f.render();return true}
 if(t.dataset.bodyEdit){$s.bodyEditId=t.dataset.bodyEdit;$s.modal='body';$f.render();return true}
 if(t.id==='resume-session'){$f.resumeSession();return true}
 if(t.id==='discard-session'){if(confirm('작성 중인 운동을 삭제할까요?')){clearSession();$s.draftWarning='';$s.savedDraft=null;$s.workDraft=[];$s.workMeta={};$f.render()}return true}
 if(t.id==='draft-archive-export'){$f.download('mylogue-draft-before-restore.json',localStorage.getItem(scopedKey('mylogue.draft.before-restore'))||'{}');return true}
 if(t.id==='draft-export'){$f.download('mylogue-draft.json',rawSession()||localStorage.getItem(scopedKey('mylogue.draft.before-restore'))||'{}');return true}
 // 4.28.0 내 값 → 공용 도감(관리자)
 if(t.dataset.promote!==undefined){const c=promoteCandidates($s.db,{sharedFoods:$s.sharedCatalog.foods||[],sharedExercises:$s.sharedCatalog.exercises||[],baseExercises:PROMOTE_EX});if(!$s.promotePicked)$s.promotePicked=new Set([...c.foods,...c.exercises].filter(x=>x.ok).map(x=>x.item.id));t.checked?$s.promotePicked.add(t.dataset.promote):$s.promotePicked.delete(t.dataset.promote);$f.render();return true}
 if(t.id==='promote-run'){if(!isCatalogAdmin(cloudState.user))throw Error('관리자 계정만 공용 도감에 올릴 수 있어요.');const c=promoteCandidates($s.db,{sharedFoods:$s.sharedCatalog.foods||[],sharedExercises:$s.sharedCatalog.exercises||[],baseExercises:PROMOTE_EX}),all=[...c.foods,...c.exercises],pick=$s.promotePicked||new Set(all.filter(x=>x.ok).map(x=>x.item.id)),list=all.filter(x=>pick.has(x.item.id));if(!list.length)return true;if(!confirm(`고른 ${list.length}개를 공용 도감에 올릴까요? 승인된 모든 사용자가 검색에서 보게 돼요.`))return true;let ok=0;const fail=[];for(const x of list){try{await promoteSave(x.kind,x.item);ok++}catch(e){fail.push(`${x.item.name}: ${e.message||e}`)}}$s.promotePicked=null;await $f.refreshCatalog();$f.render();$f.toast(`공용 도감에 ${ok}개 올렸어요${fail.length?` · 실패 ${fail.length}개(${fail[0]})`:''}`);return true}
 if(t.id==='quarantine-export'){$f.download('mylogue-quarantine.json',JSON.stringify($s.db.quarantine||[],null,1));return true}
 if(t.id==='quarantine-seen'){$s.db=$f.save({...$s.db,settings:{...$s.db.settings,quarantineSeen:($s.db.quarantine||[]).length}});$f.render();return true}
 if(t.id==='recovery-export'){$f.download('mylogue-recovery.txt',getRecoveryRaw()||'','text/plain');return true}
 if(t.id==='retry-recovery'){await recoverInterruptedRestore();$s.db=load();$f.render();return true}
 if(t.dataset.dietState){$s.db=$f.save(setDietState($s.db,$s.selectedDate,t.dataset.dietState));$f.render();return true}
 if(t.dataset.titleChoice!==undefined){const name=$s.db.settings.workoutTitles?.[Number(t.dataset.titleChoice)];if(name){$s.workMeta.title=name;$f.render()}return true}
 if(t.dataset.titleDelete!==undefined){const name=$s.db.settings.workoutTitles?.[Number(t.dataset.titleDelete)];if(name&&confirm(`“${name}”을 선택 목록에서 삭제할까요? 이전 운동 기록의 이름은 그대로 남습니다.`)){$s.db=$f.save({...$s.db,settings:{...$s.db.settings,workoutTitles:$s.db.settings.workoutTitles.filter(x=>x!==name)}});$f.render();$f.toast('선택 목록에서 삭제했습니다.')}return true}
  if(t.dataset.gymDelete!==undefined){const name=$s.db.settings.gyms?.[Number(t.dataset.gymDelete)];if(name&&confirm(`“${name}”을 헬스장 선택 목록에서 삭제할까요? 기존 기록은 유지됩니다.`)){$s.db=$f.save(removeGym($s.db,name));$f.render();$f.toast('헬스장 선택 목록에서 삭제했습니다.')}return true}
 if(t.id==='copy-meals'){$s.modal='copy-meals';$f.render();return true}
 if(t.id==='copy-meals-go'){/* 4.4.2 점검 C-20: 브라우저 입력창 대신 날짜 칸 */const from=document.getElementById('copy-from')?.value||'';if(!validDate(from))throw Error('날짜를 확인해 주세요.');$s.modal=null;const candidates=$s.byDate($s.db.meals,from).filter(m=>!m.planned);if(!candidates.length)throw Error('복사할 식사가 없습니다.');if(from===$s.selectedDate)throw Error('보고 있는 날과 같은 날이에요. 날짜 바에서 붙여 넣을 날로 옮긴 뒤 다시 눌러 주세요.');/* 4.4.1 점검 D-6: 끼니(묶음)·시각을 그대로 살려 보는 날로 복사, 예정 표시는 빼고 미래 시각이면 새로 예정 */const gmap=new Map(),stamp=new Date().toISOString(),hm=m=>{const d=new Date(m.loggedAt);return Number.isNaN(d.getTime())?'12:00':`${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`};const copies=candidates.map(m=>{const g=m.mealGroupId||`legacy:${m.slot}`;if(!gmap.has(g))gmap.set(g,uid());const {planned,...rest}=m;return $s.planMeal(cleanMeal({...rest,id:uid(),date:$s.selectedDate,mealGroupId:gmap.get(g),loggedAt:new Date(`${$s.selectedDate}T${hm(m)}:00`).toISOString(),copyKey:`${m.id}:${$s.selectedDate}`,createdAt:stamp,updatedAt:stamp}))});if(copies.some(x=>$s.db.meals.some(m=>m.copyKey&&m.copyKey===x.copyKey))&&!confirm('이미 이 날로 복사한 식사가 있어요. 한 번 더 복사할까요?'))return true;const before=$s.db;$s.db=$f.save({...$s.db,meals:[...$s.db.meals,...copies],dayStates:{...$s.db.dayStates,[$s.selectedDate]:$s.db.dayStates?.[$s.selectedDate]||'partial'}});$f.render();$f.toastUndo(`${Number(from.slice(5,7))}/${Number(from.slice(8,10))}의 식사 ${gmap.size}끼(${copies.length}개)를 시각 그대로 복사했어요.`,()=>{$s.db=$f.save({...$s.db,meals:$s.db.meals.filter(m=>!copies.some(c=>c.id===m.id))});$f.render()});void before;return true}
 if(t.id==='batch-add'){$s.batchRows.push(blankFood());$f.render();return true}
 if(t.dataset.batchRemove!==undefined){$s.batchRows.splice(Number(t.dataset.batchRemove),1);$f.render();return true}
 if(t.dataset.batchDb){const f=findFoodDB(t.dataset.batchDb);if(!f)return true;$s.batchRows.push({name:f.name,servingQty:MASS.has(f.servingUnit)?100:1,servingUnit:f.servingUnit,...(f.unitGrams?{unitGrams:f.unitGrams}:{}),calories:f.calories??'',carbs:f.carbs??'',protein:f.protein??'',fat:f.fat??'',source:f.dbTag==='p'?'label':'estimate',aiEvidence:f.aiEvidence});if($s.batchRows[0]?.name==='')$s.batchRows.shift();$f.render();return true}
 if(t.dataset.batchPreset!==undefined){const food=$f.foodChoices().foods[Number(t.dataset.batchPreset)];if(!food)return true;$s.batchRows.push({...food,servingQty:MASS.has(food.servingUnit)?($s.db.settings.lastGrams?.[food.name]||100):1,source:food.source||'manual'});if($s.batchRows[0]?.name==='')$s.batchRows.shift();$f.render();return true}
 if(t.dataset.batchRecipe){const r=$s.db.recipes.find(x=>x.id===t.dataset.batchRecipe);const rows=recipeMeals(r,$s.batchDate,$s.batchSlot,1);$s.batchRows.push(...rows.map(x=>({...x,servingQty:MASS.has(x.servingUnit)?($s.db.settings.lastGrams?.[x.name]||x.servingQty):x.servingQty,...Object.fromEntries(['calories','carbs','protein','fat'].map(k=>[k,x[k]==null?'':x[k]/(MASS.has(x.servingUnit)?(x.servingQty||100)/100:(x.servingQty||1))]))})));if($s.batchRows[0]?.name==='')$s.batchRows.shift();$f.render();return true}
 if(t.dataset.gramPick){const [i,grams]=t.dataset.gramPick.split(':').map(Number);$s.batchRows[i].servingQty=grams;$f.render();return true}
 if(t.dataset.gramSave!==undefined){const i=Number(t.dataset.gramSave),name=String($s.batchRows[i]?.name||'').trim(),input=document.querySelector(`[data-gram-list="${i}"]`);if(!name)throw Error('음식 이름을 먼저 입력해 주세요.');const grams=[...new Set(String(input?.value||'').split(',').map(x=>Number(x.trim())).filter(x=>Number.isFinite(x)&&x>0&&x<=10000))].sort((a,b)=>a-b);if(!grams.length)throw Error('g 선택지를 쉼표로 구분해 입력해 주세요.');$s.db=$f.save({...$s.db,settings:{...$s.db.settings,gramOptions:{...$s.db.settings.gramOptions,[name]:grams}}});$f.render();$f.toast(`${name}의 g 선택지를 저장했습니다.`);return true}
 if(t.id==='toggle-rest'){/* 4.4.1 점검 B-2: 휴식은 운동 화면과 같은 '의도적 휴식' 기록 하나로 */const ws=$s.byDate($s.db.workouts,$s.selectedDate),rest=ws.find(w=>w.rest),dates=($s.db.settings.restDates||[]).filter(x=>x!==$s.selectedDate);if(rest){$s.db=$f.save({...$s.db,workouts:$s.db.workouts.filter(w=>w.id!==rest.id),settings:{...$s.db.settings,restDates:dates}});$f.render();$f.toast('휴식 표시를 지웠어요.');return true}if(($s.db.settings.restDates||[]).includes($s.selectedDate)){$s.db=$f.save({...$s.db,settings:{...$s.db.settings,restDates:dates}});$f.render();$f.toast('휴식 표시를 지웠어요.');return true}if(ws.some(w=>!w.planned))throw Error('운동 기록이 있는 날이라 휴식으로 표시할 수 없어요.');const r=cleanWorkout({date:$s.selectedDate,rest:true,title:'의도적 휴식',exercises:[],loggedAt:new Date(`${$s.selectedDate}T06:00:00`).toISOString()});$s.db=$f.save({...$s.db,workouts:[...$s.db.workouts,r],settings:{...$s.db.settings,restDates:dates}});$f.render();$f.toast('의도적 휴식으로 표시했어요.');return true}
 if(t.id==='undo-draft'){if($s.undoDraft){$s.workDraft=$s.undoDraft;$s.undoDraft=null;$f.render()}return true}
 if(['moveEx','applyPrevious','pickExercise'].some(k=>t.dataset[k]!==undefined))$s.undoDraft=structuredClone($s.workDraft);
 if(t.dataset.exerciseTab){$s.selection.tab=t.dataset.exerciseTab;$f.render();return true}
 if(t.dataset.filterPart){$s.selection.part=t.dataset.filterPart;$f.render();return true}
 if(t.dataset.filterEquipment){$s.selection.equipment=t.dataset.filterEquipment;$f.render();return true}
 if(t.dataset.toggleFavorite){const id=t.dataset.toggleFavorite;$s.db=$f.save({...$s.db,favorites:($s.db.favorites||[]).includes(id)?$s.db.favorites.filter(x=>x!==id):[...($s.db.favorites||[]),id]});$f.render();return true}
 if(t.dataset.pickExercise){const item=$f.allExercises().find(x=>x.id===t.dataset.pickExercise);if(!item)return true;const gymMachine=($s.db.machines||[]).find(m=>m.location===$s.workMeta.gymName&&m.exerciseId===item.id);const ex={...structuredClone(item),id:uid(),exerciseId:item.id,machineId:gymMachine?.id||null,sets:[{id:uid(),weight:0,unit:gymMachine?.unit||'kg',reps:10,type:'본세트',completed:false}]};const prev=$f.previousExercise(ex);if(prev)ex.sets=prev.sets.map(s=>({...s,id:uid(),completed:false}));if($s.workDraft.length===1&&!$s.workDraft[0].name)$s.workDraft=[];$s.workDraft.push(ex);$f.render();return true}
 if(t.dataset.applyPrevious!==undefined){const ex=$s.workDraft[Number(t.dataset.applyPrevious)],prev=$f.previousExercise(ex);if(!prev)throw Error('같은 종목·머신의 지난 기록이 없습니다.');ex.sets=prev.sets.map(s=>({...s,id:uid(),completed:false,targetWeight:s.weight,targetReps:s.reps,targetUnit:s.unit||'kg'}));$f.render();return true}
 if(t.dataset.moveEx){const [i,d]=t.dataset.moveEx.split(':').map(Number),j=i+d;if(j>=0&&j<$s.workDraft.length)[$s.workDraft[i],$s.workDraft[j]]=[$s.workDraft[j],$s.workDraft[i]];$f.render();return true}
 if(t.dataset.stepSet){const [ei,si,k,delta]=t.dataset.stepSet.split(':'),set=$s.workDraft[+ei].sets[+si];set[k]=Math.max(0,Math.round(((Number(set[k])||0)+Number(delta))*100)/100);if(k==='weight'){set.originalWeight=set.weight;set.originalUnit=set.unit||'kg'}$f.render();return true}
 if(t.dataset.newMachine!==undefined){$f.persistDraft();$s.machineIndex=Number(t.dataset.newMachine);$s.machineEdit=null;$s.machinePhoto='';$s.profileReturn=$s.modal;$s.modal='machine';$f.render();return true}
 if(t.dataset.newExercise){$f.persistDraft();$s.customEdit=null;$s.profileReturn=$s.modal;$s.modal='custom-exercise';$f.render();return true}
 if(t.dataset.editMachine){$s.machineEdit=$s.db.machines.find(x=>x.id===t.dataset.editMachine);$s.machinePhoto=$s.machineEdit?.photoDataUrl||'';$s.machineIndex=null;$s.profileReturn=null;$s.modal='machine';$f.render();return true}
 if(t.dataset.linkBase!==undefined){/* 4.29.3 예전 이름을 기준 종목에 잇기: 같은 이름의 나만의 종목으로 만든다 */const n=t.dataset.linkBase,had=($s.db.customExercises||[]).find(x=>x.name===n);$s.customEdit=had||{name:n,part:t.dataset.linkPart||'기타',kind:'strength'};$s.profileReturn=null;$s.modal='custom-exercise';$f.render();return true}
 if(t.dataset.editCustom){$s.customEdit=$s.db.customExercises.find(x=>x.id===t.dataset.editCustom);$s.profileReturn=null;$s.modal='custom-exercise';$f.render();return true}
 if(t.id==='apply-recommendation'){if(readSession()){$f.resumeSession();return true}const r=$f.recommendationView().raw;const items=r.suggestions||[];$s.workDraft=items.map(x=>({...$f.allExercises().find(e=>e.id===x.exerciseId),...structuredClone(x),id:uid(),sets:x.sets.length?x.sets:[{weight:0,reps:10,unit:'kg',completed:false}]}));$s.workMeta={date:$s.selectedDate,title:'직접 확인하는 운동 초안',...$s.db.checkins?.[$f.today()]};$s.workEditId=null;$s.modal='workout';$f.render();$f.toast('근거와 오늘 상태를 확인하고 종목·중량을 직접 조정하세요.');return true}
 return false;
}
export async function adminClick(t){
 if(!$s.panelOn())return false;
 if(t.id==='admin-ai-confirm-all'||t.id==='admin-ai-reject-all'){const ids=new Set($f.adminItems().filter(x=>x.kind==='ai'&&!$s.adminState.snoozed.has(x.key)).map(x=>x.id)),list=$s.aiDrafts.filter(d=>ids.has(d.id));if(!list.length)return true;if(t.id==='admin-ai-reject-all'){if(!confirm(`AI 초안 ${list.length}건을 모두 버릴까요?`))return true;t.disabled=true;let ok=0;for(const d of list){try{await resolveAIDraft(d,{action:'reject'});ok++}catch(e){console.error(e)}}await $f.refreshAIDrafts();$f.toast(`${ok}건 버렸어요.`)}else{t.disabled=true;await $f.aiConfirmMany(list)}$f.render();return true}
 if(t.id==='admin-bell'){$s.adminState.open=!$s.adminState.open;$s.adminState.via=$s.adminState.open?'bell':'';if($s.adminState.open){$s.adminState.snoozed.clear();$s.adminState.done=[];if(Date.now()-$s.adminRefreshedAt>30000){$s.adminRefreshedAt=Date.now();$f.refreshApplicants().catch(console.error);$f.refreshCatalog().catch(console.error);if($f.aiLinkedNow())$f.refreshAIDrafts().catch(console.error)}}$f.render();return true}
 if(t.id==='admin-later-all'){for(const x of $f.adminItems())$s.adminState.snoozed.add(x.key);$s.adminState.open=false;$f.render();try{const rk=$f.adminItems().filter(x=>x.kind==='remind').map(x=>x.key);if(rk.length)localStorage.setItem(scopedKey('mylogue.remindSeen'),JSON.stringify([...$s.remindSeen(),...rk].slice(-20)))}catch{}$f.toast($f.noticeOn()?'오른쪽 위 종을 누르면 다시 볼 수 있어요.':planItems($s.db).length?'예정 기록은 카드의 ‘먹었어요·했어요’로 언제든 넘길 수 있어요.':'알겠어요. 오늘은 다시 알리지 않을게요.');return true}
 const key=t.dataset.adminLater||t.dataset.adminReview||t.dataset.adminApprove||t.dataset.adminReject;if(!key)return false;
 const item=$f.adminItems().find(x=>x.key===key);
 if(t.dataset.adminLater){$s.adminState.snoozed.add(key);if(key.startsWith('remind:'))try{const s=[...$s.remindSeen(),key].slice(-20);localStorage.setItem(scopedKey('mylogue.remindSeen'),JSON.stringify(s))}catch{}if(!$f.adminItems().some(x=>!$s.adminState.snoozed.has(x.key)))$s.adminState.open=false;$f.render();return true}
 // 4.29.x AI 비용 알림: '확인했어요'는 그 단계를 다시 띄우지 않고, '사용량 보기'는 설정의 프리미엄 미리보기 카드로
 if(item?.kind==='cost'){markCostSeen(key);$s.adminState.snoozed.add(key);if(t.dataset.adminReview){$s.adminState.open=false;$s.page='settings';$s.setSec='admin';$s.modal='settings-sec';$f.render();setTimeout(()=>document.getElementById('plus-admin')?.scrollIntoView({block:'start'}),60);return true}if(!$f.adminItems().some(x=>!$s.adminState.snoozed.has(x.key)))$s.adminState.open=false;$f.render();return true}
 if(item?.kind==='remind'){$s.adminState.open=false;try{const s=[...$s.remindSeen(),key].slice(-20);localStorage.setItem(scopedKey('mylogue.remindSeen'),JSON.stringify(s))}catch{}if(t.dataset.adminApprove){$s.bodyEditId=null;$s.bodyPreset=item.what==='inbody'?'inbody':null;$s.modal='body';$f.render();return true}$s.page='settings';$s.setSec='bell';$s.modal='settings-sec';$f.render();setTimeout(()=>document.getElementById('reminder-settings')?.scrollIntoView({block:'start'}),60);return true}
 if(t.dataset.adminReview&&item?.kind==='plan'){$s.adminState.open=false;$s.modal=null;$s.page='home';if(item.date)$s.selectedDate=item.date;$f.render();globalThis.scrollTo?.(0,0);document.querySelector('.timeline-card.planned')?.scrollIntoView({block:'center'});return true}
 if(t.dataset.adminApprove&&item?.kind==='plan'){$s.adminState.snoozed.add(item.key);$f.confirmPlanned(item.ref);if(!$f.adminItems().some(x=>!$s.adminState.snoozed.has(x.key)))$s.adminState.open=false;$f.render();return true}
 if(t.dataset.adminReview){$s.adminState.open=false;$s.modal=null;if(item?.kind==='ai'){$s.page='ai-inbox';$f.render();return true}$s.page='settings';$f.render();document.getElementById(item?.kind==='user'?'account-admin':'catalog-requests')?.scrollIntoView({block:'start'});return true}
 if(!item){$f.render();return true}
 const approve=!!t.dataset.adminApprove;
 if(!approve&&!confirm(item.kind==='ai'?`‘${item.title}’ AI 초안을 버릴까요?`:item.kind==='user'?`${item.title} 계정의 기록 이용 신청을 반려할까요?`:`‘${item.title}’ 요청을 반려할까요?`))return true;
 t.disabled=true;
 let aiFailed=false;if(item.kind==='ai'){const d=$s.aiDrafts.find(x=>x.id===item.id);if(d){if(approve)aiFailed=(await $f.aiConfirmMany([d])).failed>0;else{await resolveAIDraft(d,{action:'reject'});await $f.refreshAIDrafts()}}}
 else if(item.kind==='user'){await reviewApplicant(item.id,approve?'approved':'rejected');$s.adminJust={uid:item.id,status:approve?'approved':'rejected'}}
 else{await reviewCatalogRequest(item.id,{status:approve?'approved':'rejected',note:''});if(approve)try{await $f.publishMachineRequest(item.id)}catch(e){$f.toast(`공용 머신 등록 실패: ${e.message}`)}await $f.refreshCatalog()}
 if(aiFailed){t.disabled=false;$f.render();return true}
 $s.adminState.done=[...$s.adminState.done,{key,kind:item.kind,title:item.title,result:approve?'approved':'rejected'}];
 $f.render();if(item.kind!=='ai')$f.toast(approve?`${item.title} 승인 완료`:`${item.title} 반려 완료`);
 setTimeout(()=>{$s.adminState.done=$s.adminState.done.filter(d=>d.key!==key);if(!$f.adminItems().some(x=>!$s.adminState.snoozed.has(x.key))&&!$s.adminState.done.length)$s.adminState.open=false;$f.render()},3500);
 return true;
}
export function quickEditClick(t){
 if(t.id==='profile-open'){$s.pfEdit=newProfileEdit($s.db,cloudState.user,myTagCached());if(cloudState.approval==='approved')loadMyTag().then(tg=>{if($s.pfEdit&&!$s.pfEdit.tag){$s.pfEdit.tag=tg;$f.render()}}).catch(()=>{});$s.modal='profile-edit';$f.render();return true}
 if($s.pfEdit&&$s.modal==='profile-edit'){
  const keepName=()=>{const v=document.getElementById('pf-name');if(v)$s.pfEdit.nickname=v.value;const cn=document.getElementById('pf-cname');if(cn)$s.pfEdit.coachName=cn.value;const ct=document.getElementById('pf-ctitle');if(ct)$s.pfEdit.coachCustom=ct.value};
  if(t.dataset.pfCtitle!==undefined){keepName();const tg=document.getElementById('pf-tag');if(tg)$s.pfEdit.tag=tg.value;$s.pfEdit.coachTitle=t.dataset.pfCtitle;$f.render();if(t.dataset.pfCtitle==='@custom')setTimeout(()=>document.getElementById('pf-ctitle')?.focus(),30);return true}
  if(t.dataset.pfAvatar){keepName();const tg=document.getElementById('pf-tag');if(tg)$s.pfEdit.tag=tg.value;$s.pfEdit.id=t.dataset.pfAvatar;$f.render();return true}
  if(t.id==='pf-tagcheck'){const v=document.getElementById('pf-tag')?.value||'';$s.pfEdit.tag=v;$s.pfEdit.tagMsg='확인하는 중…';$s.pfEdit.tagOptions=[];$f.render();tagAvailable(v).then(r=>{if(!$s.pfEdit)return;$s.pfEdit.tagMsg=r.msg;$s.pfEdit.tagOk=r.ok;$s.pfEdit.tagOptions=r.options||[];$f.render()}).catch(e=>{if($s.pfEdit){$s.pfEdit.tagMsg=e.message;$f.render()}});return true}
 if(t.dataset.pfTagpick){$s.pfEdit.tag=t.dataset.pfTagpick;$s.pfEdit.tagOptions=[];$s.pfEdit.tagMsg='';$f.render();document.getElementById('pf-tagcheck')?.click();return true}
 if(t.id==='pf-save'){keepName();const tagIn=document.getElementById('pf-tag');const finish=()=>{if(tagIn)$s.pfEdit.nickname=myTagCached()||$s.pfEdit.nickname;$s.db=$f.save(applyProfile($s.db,$s.pfEdit));$s.pfEdit=null;$s.modal=null;$f.render();$f.toast(tagIn?`마이태그 @${myTagCached()}·아이콘을 저장했어요.`:'프로필을 바꿨어요.')};const v=tagIn?tagIn.value.trim().replace(/^@/,''):'';if(tagIn&&v!==myTagCached()){if($s.pfEdit.busy)return true;$s.pfEdit.busy=true;setMyTag(v,{rooms:$s.mate?.rooms||[]}).then(()=>{$s.pfEdit.busy=false;finish()}).catch(e=>{$s.pfEdit.busy=false;$s.pfEdit.tag=v;$s.pfEdit.tagMsg=e.message;$s.pfEdit.tagOk=false;$f.render()});return true}finish();return true}
 }
 if(t.dataset.qm!==undefined){$s.qm=quickMealState($s.db,t.dataset.qmDate||$s.selectedDate,t.dataset.qm);if(!$s.qm){$f.toast('식사를 찾지 못했어요.');return true}$s.modal='quick-meal-edit';$f.render();return true}
 if(t.dataset.qw!==undefined){$s.qw=quickWorkoutState($s.db.workouts.find(x=>x.id===t.dataset.qw),$s.db.settings.gyms||[]);if(!$s.qw){$f.toast('운동을 찾지 못했어요.');return true}$s.modal='quick-work-edit';$f.render();return true}
 const sheet=document.querySelector('.sheet');
 if($s.qm&&$s.modal==='quick-meal-edit'){
  if(t.dataset.qmStep!==undefined){readQuickMeal($s.qm,sheet);$s.sheetDirty=true;$s.dirtyModal=$s.modal;const r=$s.qm.rows[Number(t.dataset.qmStep)],st=stepFor(r.unit);r.qty=Math.max(st,Math.round((Number(r.qty)+Number(t.dataset.d)*st)*100)/100);$f.render();return true}
  if(t.dataset.qmRemove!==undefined){readQuickMeal($s.qm,sheet);$s.sheetDirty=true;$s.dirtyModal=$s.modal;$s.qm.rows[Number(t.dataset.qmRemove)].removed=true;$f.render();return true}
  if(t.dataset.qmUndo!==undefined){readQuickMeal($s.qm,sheet);$s.qm.rows[Number(t.dataset.qmUndo)].removed=false;$f.render();return true}
  if(t.id==='qm-save'){readQuickMeal($s.qm,sheet);const ids=new Set($s.qm.rows.map(r=>r.id)),before=$s.db.meals,gone=new Set($s.qm.rows.filter(r=>r.removed).map(r=>r.id));if(gone.size)toTrash($s.TRASH(),'meals',before.filter(m=>gone.has(m.id)));$s.db=$f.save(applyQuickMeal($s.db,$s.qm));$s.selectedDate=$s.qm.newDate;$s.qm=null;$s.modal=null;$f.render();$f.toastUndo('식사를 고쳤어요.',$s.undoRecords('meals',before,ids));return true}
  if(t.id==='qm-add'){readQuickMeal($s.qm,sheet);$s.db=$f.save(applyQuickMeal($s.db,$s.qm));$s.selectedDate=$s.qm.newDate;$s.quickMeal=emptyQuickMeal($s.qm.newDate,$s.qm.time);$s.quickMeal.groupId=String($s.qm.key).startsWith('legacy:')?'':$s.qm.key;$s.quickMeal.slot=$s.qm.slot;$s.quickMeal.joinLabel=true;$s.quickMeal.when='fixed';$s.sheetDirty=false;$s.qm=null;$s.modal='quick-meal';$f.render();$f.toast('고친 내용을 저장했어요. 이 식사에 더할 음식을 골라 주세요.');return true}
  if(t.id==='qm-delete-all'){const before=$s.db.meals,ids=new Set($s.qm.rows.map(r=>r.id)),_t=toTrash($s.TRASH(),'meals',$s.db.meals.filter(m=>ids.has(m.id))),d0=$s.qm.date,left=$s.db.meals.filter(m=>!ids.has(m.id));$s.db=$f.save({...$s.db,meals:left,dayStates:{...$s.db.dayStates,[d0]:left.some(m=>m.date===d0)?$s.db.dayStates?.[d0]:'unrecorded'}});$s.qm=null;$s.modal=null;$f.render();$f.toastUndo('식사를 지웠어요.',$s.undoRecords('meals',before,ids));return true}
 }
 if($s.qw&&$s.modal==='quick-work-edit'){
  if(t.dataset.qwSetadd!==undefined){readQuickWorkout($s.qw,sheet);$s.sheetDirty=true;$s.dirtyModal=$s.modal;const e=$s.qw.ex[Number(t.dataset.qwSetadd)],last=[...e.sets].reverse().find(x=>!x.removed);e.sets.push({id:uid(),weight:last?.weight??null,unit:last?.unit||'kg',reps:last?.reps??null,completed:true,removed:false});$f.render();return true}
  if(t.dataset.qwSetremove!==undefined){readQuickWorkout($s.qw,sheet);$s.sheetDirty=true;$s.dirtyModal=$s.modal;const [i,j]=t.dataset.qwSetremove.split(':').map(Number);$s.qw.ex[i].sets[j].removed=true;$f.render();return true}
  if(t.dataset.qwGym!==undefined){readQuickWorkout($s.qw,sheet);$s.qw.gym=t.dataset.qwGym;$s.sheetDirty=true;$s.dirtyModal=$s.modal;$f.render();return true}
 if(t.dataset.qwExremove!==undefined){readQuickWorkout($s.qw,sheet);$s.sheetDirty=true;$s.dirtyModal=$s.modal;$s.qw.ex[Number(t.dataset.qwExremove)].removed=true;$f.render();return true}
  if(t.dataset.qwExundo!==undefined){readQuickWorkout($s.qw,sheet);$s.qw.ex[Number(t.dataset.qwExundo)].removed=false;$f.render();return true}
  if(t.id==='qw-save'){readQuickWorkout($s.qw,sheet);const ids=new Set([$s.qw.id]),before=$s.db.workouts;$s.db=$f.save(applyQuickWorkout($s.db,$s.qw));$s.qw=null;$s.modal=null;$f.render();$f.toastUndo('운동을 고쳤어요.',$s.undoRecords('workouts',before,ids));return true}
  if(t.id==='qw-delete'){const ids=new Set([$s.qw.id]),before=$s.db.workouts;toTrash($s.TRASH(),'workouts',before.filter(x=>ids.has(x.id)));$s.db=$f.save({...$s.db,workouts:$s.db.workouts.filter(x=>x.id!==$s.qw.id)});$s.qw=null;$s.modal=null;$f.render();$f.toastUndo('운동 기록을 지웠어요.',$s.undoRecords('workouts',before,ids));return true}
 }
 return false;
}
export async function cloudClick(target){
 if(!target.id?.startsWith('cloud-'))return false;
 const id=target.id;
 if(id==='cloud-retry'){location.reload();return true}
 if(id==='cloud-login'){$f.persistDraft();openAuth('pick');return true}
 if(id==='cloud-logout'){$f.persistDraft();await cloudLogout();return true}
 if(id==='cloud-delete-account'){const email=cloudState.user?.email||'이 계정';if(confirm('지우기 전에 백업 파일을 받아 둘까요? (‘확인’은 백업 파일을 받고 계속, ‘취소’는 받지 않고 계속)')){try{const backup=await createBackup($s.db);$f.download(`mylogue-backup-${$f.today()}.json`,JSON.stringify(backup))}catch(e){console.error(e)}}const typed=prompt(`${email}의 계정과 서버 기록을 모두 지워요. 되돌릴 수 없어요. 계속하려면 ‘삭제’라고 적어 주세요.`);if(String(typed||'').trim()!=='삭제'){$f.toast('삭제하지 않았어요.');return true}$f.persistDraft();target.disabled=true;try{await deleteAccount({onStep:step=>{target.textContent=`${step} 중…`}});alert('계정과 기록을 모두 지웠어요. 그동안 마이로그를 써 주셔서 고마워요.');location.reload()}catch(e){target.disabled=false;target.textContent='계정과 기록 삭제…';throw Error(`삭제를 끝내지 못했어요: ${e?.message||e} 다시 누르면 남은 것부터 이어서 지워요.`)}return true}
 if(id==='cloud-apply'){await applyForAccess(document.getElementById('approval-consent')?.checked===true);$f.render();$f.toast('기록 이용 신청을 보냈습니다. 승인 전에는 서버 기록을 사용할 수 없습니다.');return true}
 if(id==='cloud-approval-refresh'){await refreshApproval();$f.render();if(cloudState.approval==='approved'){await $f.refreshCatalog();$f.queueAutoSync()}return true}
 if(id==='cloud-applicants-refresh'){await $f.refreshApplicants();return true}
 if(id.startsWith('cloud-plan-')){
  const match=/^cloud-plan-(plus|free)-([A-Za-z0-9:_-]+)$/.exec(id);
  if(!match)throw Error('계정을 확인해 주세요.');
  await setAccountPlan(match[2],match[1]);$f.render();const who=cloudState.applicants.find(a=>a.uid===match[2])?.email||'이 계정';$f.toast(match[1]==='plus'?`${who} 프리미엄 켜짐`:`${who} 프리미엄 꺼짐`);return true;
 }
 if(id.startsWith('cloud-coach-')){
  const m=/^cloud-coach-(on|off)-([A-Za-z0-9:_-]+)$/.exec(id);if(!m)throw Error('계정을 확인해 주세요.');
  await setAccountCoach(m[2],m[1]==='on');$f.render();const a=cloudState.applicants.find(x=>x.uid===m[2]);const who=a?.email||a?.name||'이 계정';$f.toast(m[1]==='on'?`${who} 코치 권한 켜짐`:`${who} 코치 권한 꺼짐`);return true;
 }
 if(id==='cloud-review-all-approved'){
  const uids=cloudState.applicants.filter(a=>a.status==='pending').map(a=>a.uid);
  if(!uids.length)return true;
  if(!confirm(`승인 대기 ${uids.length}건을 모두 승인할까요? 승인된 계정은 기록 동기화와 공용 도감을 쓸 수 있어요.`))return true;
  await reviewApplicants(uids,'approved');$s.adminJust={};$f.render();$f.toast(`${uids.length}건 승인 완료`);return true;
 }
 if(id.startsWith('cloud-review-')){
  const match=/^cloud-review-(approved|pending|rejected)-([A-Za-z0-9]+)$/.exec(id);
  if(!match)throw Error('신청 항목을 확인해 주세요.');
  if(match[1]==='rejected'&&!confirm('이 계정의 서버 기록 접근을 중단하고 신청을 반려할까요? 기기 안의 기록은 삭제되지 않습니다.'))return true;
  await reviewApplicant(match[2],match[1]);$s.adminJust={uid:match[2],status:match[1]};$f.render();const who=cloudState.applicants.find(a=>a.uid===match[2])?.email||'이 계정';$f.toast(match[1]==='approved'?`${who} 승인 완료 · 이제 기록 동기화를 쓸 수 있어요.`:match[1]==='rejected'?`${who} 반려 완료`:`${who} 승인 대기로 되돌렸어요.`);return true;
 }
 if(id==='cloud-conflicts-export'){$f.download('mylogue-sync-conflicts.json',JSON.stringify(cloudState.conflicts,null,2));return true}
 if(id==='cloud-archive-export'){const raw=(await kvGet(scopedKey('mylogue.cloud.before-sync')))||localStorage.getItem(scopedKey('mylogue.cloud.before-sync'));if(!raw)throw Error('보관된 동기화 원본이 없습니다.');$f.download('mylogue-before-sync.json',raw);return true}
 if(id==='cloud-import-guest'){
  if(!cloudState.user||cloudState.approval!=='approved')throw Error('계정 이용 승인 후 사용할 수 있습니다.');
  if(['body','meals','foods','workouts','routines','machines','customExercises','recipes','favorites'].some(k=>$s.db[k]?.length)||Object.keys($s.db.checkins||{}).length||Object.keys($s.db.dayStates||{}).length)throw Error('계정 기록이 비어 있을 때만 게스트 기록을 복사할 수 있습니다. 기존 기록은 백업으로 보관해 주세요.');
  const raw=localStorage.getItem('mylogue.v1');if(!raw)throw Error('이 브라우저에 게스트 기록이 없습니다.');
  if(!confirm('게스트의 숫자·텍스트 기록을 현재 계정 공간에 복사할까요? 사진과 초안은 제외합니다. 아직 서버에는 전송하지 않습니다.'))return true;
  $s.db=$f.save(recordsToDB(cloudRecords(normalizeDB(JSON.parse(raw),{lenient:true}))));$f.render();$f.toast('계정 공간에 복사했습니다. 서버 전송은 지금 동기화를 눌러 주세요.');return true;
 }
 if(id==='cloud-sync'||id==='cloud-resolve'){
  const choices={};
  if(id==='cloud-resolve')for(const [i,c] of cloudState.conflicts.entries()){const side=document.querySelector(`[data-cloud-conflict="${i}"]`)?.value;if(!side)throw Error('모든 충돌 기록에서 유지할 내용을 선택해 주세요.');choices[c.key]={side,local:c.local,remote:c.remote};}
  if(!confirm(`${cloudState.user?.email||'현재 계정'}의 계정 서버에 수치·식단·운동·설정 기록을 전송하고 서버 변경과 삭제를 반영할까요? 사진·초안은 전송하지 않습니다.`))return true;
  $s.backupBusy=true;
  try{const result=await synchronize($f.freshDB(),saveLocal,choices);if(result.db)$s.db=result.db;$f.render();$f.toast(result.conflicts.length?'충돌 내용을 확인해 주세요.':'기록 동기화를 완료했습니다.');}finally{$s.backupBusy=false}
  return true;
 }
 return false;
}
export function prefsClick(t){
 if(t.id==='onb-start'||t.id==='onb-restart'){$s.onb=newOnboarding($s.db);$s.modal='onboarding';$f.render();return true}
 if(t.id==='onb-dismiss'){$s.db=$f.save(skipOnboarding($s.db));$f.render();$f.toast('설정 › 나의 기록 방식에서 언제든 맞출 수 있어요.');return true}
 if(t.dataset.onbPick&&$s.onb){onboardingPick($s.onb,t.dataset.onbPick);$f.render();return true}
 if(t.id==='onb-next'&&$s.onb){onboardingMove($s.onb,1);$f.render();return true}
 if(t.id==='onb-prev'&&$s.onb){onboardingMove($s.onb,-1);$f.render();return true}
 if(t.id==='onb-skip'&&$s.onb){$s.onb.step=QUESTIONS.length;$f.render();return true}
 if(t.id==='onb-finish'&&$s.onb){$s.db=$f.save(finishOnboarding($s.db,$s.onb.answers));$s.onb=null;$s.modal=null;$s.page='home';if(prefsOf($s.db).tracks.includes('meal')&&!$s.db.settings.nutritionProfile){$s.goalWiz=newGoalWizard($s.db);$s.modal='goal-wizard';$f.render();$f.toast('이어서 식단 목표를 정해 볼게요. 건너뛰어도 돼요.');return true}$f.render();$f.toast('나에게 맞춘 설정으로 시작해요.');return true}
 if(t.dataset.pref){const was=prefsOf($s.db).glp1,r=applyPrefClick($s.db,t);if(r.db!==$s.db)$s.db=$f.save(r.db);$f.render();/* 4.7.0 GLP-1을 켜면 단백질 기준 목표를 다시 제안받게 */if(t.dataset.pref==='glp1'&&!was&&prefsOf($s.db).glp1&&Number($s.db.settings.calorieGoal)){$f.toastUndo('단백질을 체중 기준으로 다시 맞출까요? 목표 문답을 열어요.',()=>{$s.goalWiz=newGoalWizard($s.db);$s.modal='goal-wizard';$f.render()},10000,'다시 제안받기');return true}if(r.message)$f.toast(r.message);return true}
 if(t.dataset.prefJump){$s.page='settings';$s.setSec='record';$s.modal='settings-sec';$f.render();return true}
 if(t.id==='after-add'||t.id==='after-last'||t.dataset.afterDel!=null){const form=document.getElementById('after-workout-form');$s.afterWorkout=form?readAfterWorkoutForm(form):($s.afterWorkout||emptyAfterWorkout($f.today()));if(t.id==='after-add')$s.afterWorkout.rows.push({name:'',weight:'',reps:'',sets:3,unit:'kg'});if(t.id==='after-last'){if(!$s.db.workouts.length){$f.toast('불러올 지난 운동이 없어요.');return true}const last=afterWorkoutFromLast($s.db,$s.afterWorkout.date,$s.afterWorkout.gymName);$s.afterWorkout={...$s.afterWorkout,rows:last.rows}}if(t.dataset.afterDel!=null){$s.afterWorkout.rows.splice(Number(t.dataset.afterDel),1);if(!$s.afterWorkout.rows.length)$s.afterWorkout.rows.push({name:'',weight:'',reps:'',sets:3,unit:'kg'})}$f.render();return true}
 if(t.dataset.simpleSlot){const f=document.getElementById('simple-meal-form');if(f){f.querySelector('[name=slot]').value=t.dataset.simpleSlot;f.querySelectorAll('[data-simple-slot]').forEach(b=>{b.classList.toggle('on',b===t);b.setAttribute('aria-pressed',String(b===t))})}return true}
 if(t.dataset.simpleKcal){const f=document.getElementById('simple-meal-form');if(f)f.querySelector('[name=calories]').value=t.dataset.simpleKcal;return true}
 return false;
}
export function goalWizClick(t){
 if(t.id==='gw-open'){$s.goalWiz=newGoalWizard($s.db);$s.modal='goal-wizard';$f.render();return true}
 if(!$s.goalWiz)return false;const st=$s.goalWiz,step=WIZ_STEPS[st.step];
 if(t.dataset.gwSex){$f.gwReadBasic();st.profile.sex=t.dataset.gwSex;$f.render();return true}
 if(t.dataset.gwActivity){st.profile.activity=t.dataset.gwActivity;st.kcal=null;$f.render();return true}
 if(t.dataset.gwGoal){st.profile.goal=t.dataset.gwGoal;st.kcal=null;st.preset=null;$f.render();return true}
 if(t.dataset.gwCaution){const v=t.dataset.gwCaution,cs=st.profile.cautions||[];st.profile.cautions=cs.includes(v)?cs.filter(x=>x!==v):[...cs,v];$f.render();return true}if(t.dataset.gwDiet){const v=t.dataset.gwDiet,ds=st.profile.diets||[];st.profile.diets=v==='none'?[]:ds.includes(v)?ds.filter(x=>x!==v):[...ds,v];st.kcal=null;st.preset=null;$f.render();return true}
 if(t.dataset.gwKcal){st.kcal=Number(t.dataset.gwKcal);st.custom.kcalOn=false;$f.render();return true}
 if(t.dataset.gwPreset){st.preset=t.dataset.gwPreset;st.custom.on=false;$f.render();return true}
 if(t.id==='gw-custom-use'){const c=Number(document.getElementById('gw-c')?.value),p=Number(document.getElementById('gw-p')?.value),f=Number(document.getElementById('gw-f')?.value);if(![c,p,f].every(x=>Number.isFinite(x)&&x>=0)||Math.abs(c+p+f-100)>0.01){$f.toast('세 비율의 합을 100%로 맞춰 주세요.');return true}st.custom={...st.custom,on:true,c,p,f};$f.render();$f.toast(`탄 ${c} : 단 ${p} : 지 ${f}로 정했어요.`);return true}
 if(t.id==='gw-prev'){if(step==='basic')$f.gwReadBasic();st.step=Math.max(0,st.step-1);$f.render();return true}
 if(t.id==='gw-next'){
  if(step==='basic'){$f.gwReadBasic();if(!estimateEnergy(st.profile)){$f.toast('나이(14~100), 키(120~230cm), 체중(30~300kg)을 확인해 주세요.');return true}}
  if(step==='calories'){const det=document.querySelector('.gw-custom'),v=Number(document.getElementById('gw-kcal-custom')?.value);if(det?.open&&v){if(v<800||v>6000){$f.toast('목표 칼로리는 800~6,000kcal 사이로 넣어 주세요.');return true}st.kcal=Math.round(v);st.custom.kcalOn=true;st.custom.kcal=v}if(!st.kcal){$f.toast('목표 칼로리를 골라 주세요.');return true}}
  st.step++;$f.gwEnter();$f.render();document.querySelector('.sheet')?.scrollTo?.(0,0);return true}
 if(t.id==='gw-save'){$s.db=$f.save(applyGoalWizard($s.db,st));st.result=$s.db.settings;st.step=WIZ_STEPS.length-1;$f.render();$f.toast('식단 목표를 저장했어요.');return true}
 if(t.id==='gw-close'||t.id==='gw-skip'){const skipped=t.id==='gw-skip';$s.goalWiz=null;$s.modal=null;$f.render();if(skipped)$f.toast('설정 › 일일 식단 목표에서 언제든 정할 수 있어요.');return true}
 return false;
}
export function guideClick(t){
 const plan=()=>{const f=document.getElementById('guide-plan-form');$s.guidePlan=f?readPlanForm(f):($s.guidePlan||emptyPlan($f.today(),'',prefsOf($s.db).restSec))};
 if(t.id==='guide-add'){plan();$s.guidePlan.rows.push({name:'',weight:'',unit:'kg',reps:'',sets:3,rest:prefsOf($s.db).restSec});$f.render();return true}
 if(t.dataset.guideDel!=null){plan();$s.guidePlan.rows.splice(Number(t.dataset.guideDel),1);if(!$s.guidePlan.rows.length)$s.guidePlan.rows.push({name:'',weight:'',unit:'kg',reps:'',sets:3,rest:prefsOf($s.db).restSec});$f.render();return true}
 if(t.id==='guide-fill-last'){plan();const last=$s.recent($s.db.workouts)[0];$s.guidePlan={...planFromWorkout(last,$s.guidePlan.date,prefsOf($s.db).restSec),date:$s.guidePlan.date,gymName:$s.guidePlan.gymName||last?.gymName||''};$f.render();return true}
 if(t.dataset.guideRoutine){plan();const r=$s.db.routines.find(x=>x.id===t.dataset.guideRoutine);if(r)$s.guidePlan={...planFromRoutine(r,$s.guidePlan.date,prefsOf($s.db).restSec),gymName:$s.guidePlan.gymName};$f.render();return true}
 if(!$s.guideRun)return false;
 if(t.id==='guide-set-done'){$s.guideCues?.unlock();completeSet($s.guideRun);$f.guideSave();if($s.guideRun.phase==='rest'){scheduleRestAlert($s.guideRun);$s.guideCues?.play({beep:1})}else if($s.guideRun.phase==='done'){$s.guideCues?.play({say:'운동 끝! 수고했어요',beep:1,go:1});$s.guideCues?.keepAwake(false);cancelRestAlert()}$f.render();return true}
 if(t.id==='guide-plus'){addRest($s.guideRun,30);scheduleRestAlert($s.guideRun);$f.render();return true}
 if(t.id==='guide-skip-rest'){endRest($s.guideRun);cancelRestAlert();const it=guideCurrent($s.guideRun);$s.guideCues?.play({say:`${$s.guideRun.set}세트 시작`,beep:1,go:1});$f.render();return true}
 if(t.id==='guide-apply'){editCurrent($s.guideRun,document.getElementById('guide-w')?.value,document.getElementById('guide-r')?.value);$f.render();$f.toast('이 종목 남은 세트에 적용했어요.');return true}
 if(t.id==='guide-skip-ex'){skipExercise($s.guideRun);cancelRestAlert();if($s.guideRun.phase==='done')$s.guideCues?.keepAwake(false);$f.render();return true}
 if(t.id==='guide-finish'){const left=$s.guideRun.items.slice($s.guideRun.ex).reduce((n,it,i)=>n+(i===0?it.sets-$s.guideRun.set+($s.guideRun.phase==='rest'?1:1):it.sets),0);if($s.guideRun.phase!=='done'&&left>0&&!confirm('남은 세트가 있어요. 지금까지 한 세트만 저장하고 끝낼까요?'))return true;finishRun($s.guideRun);$f.guideSave();cancelRestAlert();$s.guideCues?.keepAwake(false);$f.render();return true}
 if(t.id==='guide-close'){$f.guideStop();$s.modal=null;$s.page='workout';$f.render();return true}
 return false;
}
export function placesClick(t){
 if(t.id==='gym-map-open'){$s.gymMap={center:centerFor($s.db),results:[],status:''};$s.gymMapEl=null;$s.gymMapView=null;$s.modal='gym-map';$f.render();return true}
 if(t.dataset.gymPick!==undefined){const p=$s.gymSearch.results?.[Number(t.dataset.gymPick)];if(p){$s.db=$f.save(addGymPlace($s.db,p));$s.gymSearch={};$f.render();$f.toast(`내 운동 장소에 ‘${p.name}’ 추가했어요.`)}return true}
 if(t.dataset.gymMappick!==undefined){const p=$s.gymMap?.results?.[Number(t.dataset.gymMappick)];if(p){$s.db=$f.save(addGymPlace($s.db,p));$f.closeGymMap();$f.render();$f.toast(`내 운동 장소에 ‘${p.name}’ 추가했어요.`)}return true}
 if(t.id==='gym-map-locate'){if(!navigator.geolocation){$f.toast('이 기기에서는 위치를 쓸 수 없어요. 지도를 직접 옮겨 주세요.');return true}t.disabled=true;navigator.geolocation.getCurrentPosition(pos=>{t.disabled=false;const k=window.kakao;if($s.gymMapView&&k){$s.gymMapView.setLevel(4);$s.gymMapView.setCenter(new k.maps.LatLng(pos.coords.latitude,pos.coords.longitude))}},err=>{t.disabled=false;$f.toast(err.code===1?'위치 권한이 꺼져 있어요. 지도를 직접 옮겨 주세요.':'위치를 찾지 못했어요. 지도를 직접 옮겨 주세요.')},{enableHighAccuracy:false,timeout:10000,maximumAge:60000});return true}
 return false;
}
export async function catalogClick(target){
 if(target.dataset.adminFood){$s.catalogAdminFood=$f.catalogFoods().find(x=>x.id===target.dataset.adminFood)||null;$f.render();return true}
 if(target.id==='admin-food-new'){$s.catalogAdminFood=null;$f.render();return true}
 if(target.dataset.requestPhoto){$s.catalogPhotoView=await catalogRequestPhoto(target.dataset.requestPhoto);$s.modal='catalog-photo';$f.render();return true}
 if(target.dataset.reviewRequest){if(!isCatalogAdmin(cloudState.user))throw Error('관리자 계정만 요청을 검토할 수 있습니다.');const id=target.dataset.reviewRequest,status=document.querySelector(`[data-review-state="${CSS.escape(id)}"]`)?.value,note=document.querySelector(`[data-review-note="${CSS.escape(id)}"]`)?.value||'';await reviewCatalogRequest(id,{status,note});let published=false;if(status==='approved')try{published=await $f.publishMachineRequest(id)}catch(e){$f.toast(`승인했지만 공용 머신 등록은 실패했어요: ${e.message}`)}await $f.refreshCatalog();if(published)$f.toast('승인 완료 · 그 헬스장 머신 목록에 바로 나와요.');$f.toast(status==='approved'?'승인 완료 · 요청 목록에 ‘승인됨’으로 표시돼요.':status==='rejected'?'반려 완료':'요청 상태를 바꿨어요.');return true}
 return false;
}
export async function aiBridgeClick(t){
 if(t.id==='ai-bridge-check'){await $f.checkBridge(true);return true}
 if(t.id==='ai-pair-now'){const code=document.getElementById('ai-pair-code')?.value||'';if(!code.trim()){$f.toast('AI 도구가 알려 준 연결 코드를 넣어 주세요.');return true}t.disabled=true;let result;try{result=await pairLocalAgent($s.aiBridge.port,{code})}finally{t.disabled=false}$s.db=$f.save(withPrefs($s.db,{aiLinked:true}));await $f.checkBridge(true);$f.toast(result.persistent?'AI 도구와 연결했어요. 이 PC에서는 계속 연결돼요.':'AI 도구와 연결했어요.');$f.refreshAIDrafts().catch(console.error);return true}
 if(t.id==='ai-unpair'){if(!confirm('이 PC의 AI 도구 연결을 해제할까요? 이 PC에 저장된 연결 정보가 지워져요.'))return true;await unpairLocalAgent($s.aiBridge.port);try{localStorage.removeItem(scopedKey('mylogue.ai-pair'))}catch{}$s.aiPair=null;await $f.checkBridge(true);$f.toast('이 PC의 AI 연결을 해제했어요.');return true}
 return false;
}
const hm12Label=t=>{const [h,m]=t.split(':').map(Number);return `${h<12?'오전':'오후'} ${h%12||12}:${String(m).padStart(2,'0')}`};
export function quickInput(t){if(liveInput(t))return true;if($s.modal==='quick-meal'&&t.id==='simple-meal-text'&&$s.quickMeal?.simple){/* 5.0.6 심플 모드 초안: 칠 때는 다시 그리지 않고 버튼만 */const st=$s.quickMeal.simple;st.text=t.value;st.picked='';const b=document.querySelector('[data-simple-meal-save]');if(b){b.disabled=!t.value.trim();b.textContent=t.value.trim()?'추정치로 남기기':'먹은 것을 골라 주세요'}document.querySelectorAll('[data-simple-meal]').forEach(x=>{x.classList.remove('on');x.setAttribute('aria-pressed','false')});return true}if($s.modal==='quick-meal'){/* 4.29.x 시각 직접 입력: 칠 때는 다시 그리지 않고(입력 중 포커스 유지) 위쪽 표시만 바꾼다 */if(t.dataset?.qWhenManual!==undefined){const s0=$s.quickMeal;if(s0&&setManualTime(s0,t.value)){const at=document.querySelector('.q-when-at');if(at)at.textContent=at.textContent.replace(/(오전|오후) \d{1,2}:\d{2}$/,hm12Label(t.value));for(const b of document.querySelectorAll('[data-q-when-time]')){const on=b.dataset.qWhenTime===t.value;b.classList.toggle('active',on);b.setAttribute('aria-pressed',String(on))}}return true}if(t.id==='q-qty'){/* 4.27.0 M-03: 직접 친 수량으로 열량 줄만 다시 */const q=Number(t.value),s0=$s.quickMeal;if(s0?.picked&&Number.isFinite(q)&&q>0){s0.qty=q;const el=document.querySelector('.quick-food-macro');if(el)el.textContent=foodMacroText(s0.picked,q,s0.share)}return true}if(t.id==='q-food-search'){$s.quickMeal.query=t.value;if(t.value.trim()&&!foodDBReady())loadFoodDB().then(()=>{if($s.modal!=='quick-meal'||!$s.quickMeal?.query)return;const inp=document.getElementById('q-food-search'),pos=inp?.selectionStart,had=document.activeElement===inp;$f.render();const n=document.getElementById('q-food-search');if(had){n?.focus();n?.setSelectionRange(pos,pos)}}).catch(e=>console.warn(e));$s.quickMeal.sgGroup=null;if($s.composingSearch){const box=document.getElementById('sg-food');if(box){const fc=$f.foodChoices();box.innerHTML=foodSuggestHTML($s.quickMeal,quickFoodCandidates(fc),{meals:$s.db.meals,pop:$s.popularity})}return true}$f.patchKeep('q-food-search');return true}if(t.dataset.qMeta){$s.quickMeal[t.dataset.qMeta]=t.value;return true}}if($s.modal==='quick-workout'){if((t.id==='q-plates'||t.id==='q-bar-own')&&$s.quickWorkout){const s=$s.quickWorkout;if(t.id==='q-bar-own'&&t.value!=='')s.barKg=Number(t.value);const p=Number(document.getElementById('q-plates')?.value),bar=Number(s.barKg)||0;if(Number.isFinite(p)&&document.getElementById('q-plates')?.value!==''){const w=Math.round((p+bar)*100)/100;s.weight=w;const i=document.getElementById('q-set-weight');if(i)i.value=w;const sum=document.getElementById('q-bar-sum');if(sum)sum.innerHTML=`봉 ${bar} + 원판 ${p} = <b>${w}${s.unit}</b> (세트 무게)`}return}if(t.id==='q-ex-search'){$s.quickWorkout.query=t.value;$s.quickWorkout.sgEx=null;if($s.composingSearch){const box=document.getElementById('sg-ex');if(box)box.innerHTML=exerciseSuggestHTML($s.quickWorkout,$f.allExercises(),{db:$s.db,shared:$s.sharedCatalog,gymName:$s.quickWorkout.gymName,gymKey:gymKeyOf($s.db.settings,$s.quickWorkout.gymName),pop:$s.popularity});return true}/* 5.1.0 검색 칸은 그대로 두고 결과만 */$f.patchKeep('q-ex-search');return true}if(t.dataset.qWork){if(t.dataset.qWork==='gymName'&&t.value==='__new__'){$s.quickWorkout.gymAdding=true;$f.render();setTimeout(()=>document.getElementById('q-gym-new')?.focus(),0);return true}if($s.quickWorkout.sets.length&&['gymName','date'].includes(t.dataset.qWork)){$f.render();throw Error('세트를 기록한 뒤에는 날짜와 헬스장을 바꿀 수 없습니다. 새 운동 기록을 시작해 주세요.')}$s.quickWorkout[t.dataset.qWork]=t.value;if(t.dataset.qWork==='gymName'){$s.quickWorkout.gymTouched=true;const m=$f.quickMachineFor($s.quickWorkout.exerciseId,t.value);$s.quickWorkout.machineId=m?.id||'';$f.render()}/* 4.19.0 날짜를 바꾸면 그날 기준으로 추천·헬스장 */if(t.dataset.qWork==='date'&&t.value){const q=$s.quickWorkout;q.dateEdit=false;if(!q.gymTouched)q.gymName=lastGym($s.db,q.date,$s.db.settings.gyms||[]);$f.render()}return true}if(t.id==='q-machine'){$s.quickWorkout.machineId=t.value;const m=$s.db.machines.find(x=>x.id===t.value)||findMachine($s.db,$s.sharedCatalog,t.value,$s.quickWorkout);if(m?.unit)$s.quickWorkout.unit=m.unit;$f.render();return true}}return false}
export function enhancedChange(t){
 if(t.dataset.ex==='machineId'){const ex=$s.workDraft[Number(t.closest('[data-ei]').dataset.ei)];ex.machineId=t.value||null;const machine=$s.db.machines.find(m=>m.id===ex.machineId)||genericMachine(ex.machineId);{const def=$f.allExercises().find(x=>x.id===ex.exerciseId),mt=machineTargets(machine,def||ex);if(mt){ex.primaryMuscleIds=mt.primaryMuscleIds;ex.secondaryMuscleIds=mt.secondaryMuscleIds}}if(genericMachine(ex.machineId)?.sided==='iso'){ex.weightBasis='per-hand';ex.handCount=2}for(const set of ex.sets)if(Number(set.weight)===0)set.unit=machine?.unit||'kg';$f.render();return true}
 if(t.dataset.set==='unit'){const set=$s.workDraft[Number(t.closest('[data-ei]').dataset.ei)].sets[Number(t.closest('[data-si]').dataset.si)];Object.assign(set,convertSetUnit(set,t.value));$f.render();return true}
 if(t.dataset.set==='completed'){const set=$s.workDraft[Number(t.closest('[data-ei]').dataset.ei)].sets[Number(t.closest('[data-si]').dataset.si)];set.completed=t.checked;if(t.checked&&!set.completedAt){set.completedAt=new Date().toLocaleString('sv-SE').replace(' ','T').slice(0,16);const field=t.closest('[data-si]').querySelector('[data-set="completedAt"]');if(field)field.value=set.completedAt}if(!t.checked)set.completedAt='';return true}
 if(t.dataset.ex==='name'){const ex=$s.workDraft[Number(t.closest('[data-ei]').dataset.ei)],match=$f.allExercises().find(x=>x.name===t.value);ex.exerciseId=match?.id||null;ex.primaryMuscleIds=match?.primaryMuscleIds||[];ex.secondaryMuscleIds=match?.secondaryMuscleIds||[];ex.weightBasis=match?.weightBasis||'total';ex.handCount=match?.handCount||0;ex.repBasis=match?.repBasis||'total'}
 return enhancedInput(t);
}
export function enhancedInput(t){
 if(t.dataset.set==='unit')return true;
 if(t.dataset.set==='weight'){const set=$s.workDraft[Number(t.closest('[data-ei]').dataset.ei)].sets[Number(t.closest('[data-si]').dataset.si)];set.weight=t.value;set.originalWeight=t.value===''?null:Number(t.value);set.originalUnit=set.unit||'kg';return true}
 if(t.id==='exercise-search'){$s.selection.query=t.value;const start=t.selectionStart;$f.render();const input=document.getElementById('exercise-search');input?.focus();input?.setSelectionRange(start,start);return true}
 if(t.dataset.foodField){const row=$s.batchRows[Number(t.closest('[data-food-row]').dataset.foodRow)];row[t.dataset.foodField]=t.value;if(t.dataset.foodField==='servingUnit'){$f.render();return true}const total=document.getElementById('batch-total');if(total)total.textContent=batchSummary($s.batchRows);return true}
 if(t.closest('#batch-form')&&t.name){if(t.name==='date')$s.batchDate=t.value;if(t.name==='time')$s.batchTime=t.value;return true}
 return false;
}

// 5.0.6 심플 모드 초안 클릭
function simpleClick(t){
 const d=t.dataset||{};
 if(d.simpleOff!==undefined){if($s.modal==='quick-meal'&&$s.quickMeal)$s.quickMeal.simpleOff=true;if($s.modal==='quick-workout'&&$s.quickWorkout)$s.quickWorkout.simpleOff=true;$f.render();return true}
 if($s.modal==='quick-meal'&&$s.quickMeal?.simple){const s=$s.quickMeal,st=s.simple;
  if(d.simpleMeal!==undefined){st.picked=st.picked===d.simpleMeal?'':d.simpleMeal;if(st.picked)st.text='';$f.render();return true}
  if(d.simplePortion){st.portion=d.simplePortion;$f.render();return true}
  if(d.simpleMealSave!==undefined){const inp=document.getElementById('simple-meal-text');if(inp&&!st.picked)st.text=inp.value;
   const items=st.picked?(usualMeals($s.db.meals,s.date,s.time).find(u=>u.key===st.picked)?.items||[]).map(m=>({name:m.name,calories:m.calories,carbs:m.carbs,protein:m.protein,fat:m.fat,basis:'평소 먹은 양 기준'})):guessFromText(st.text,q=>searchFoodDB(q,{limit:1}));
   const rows=simpleMealRecords({date:s.date,time:s.time||'12:00',slot:s.slot||'식사',items,portion:st.portion});
   $s.db=$f.save({...$s.db,meals:[...$s.db.meals,...rows]});$s.selectedDate=s.date;$s.modal=null;$s.quickMeal=null;$f.render();$f.toast('추정치로 남겼어요. 식단에서 언제든 고칠 수 있어요.');return true}
 }
 if($s.modal==='quick-workout'&&$s.quickWorkout?.simple){const s=$s.quickWorkout,st=s.simple;
  if(d.simplePart){st.parts=st.parts.includes(d.simplePart)?st.parts.filter(x=>x!==d.simplePart):[...st.parts,d.simplePart];st.from='';$f.render();return true}
  if(d.simpleMin){st.minutes=Number(d.simpleMin);$f.render();return true}
  if(d.simpleInt){st.intensity=d.simpleInt;$f.render();return true}
  if(d.simpleFrom!==undefined){const r=recentSessions($s.db.workouts,s.date)[Number(d.simpleFrom)];if(r){st.from=d.simpleFrom;st.parts=r.parts.length?[...r.parts]:st.parts;if(r.minutes)st.minutes=r.minutes;st.title=r.title}$f.render();return true}
  if(d.simpleWorkSave!==undefined||d.simpleRest!==undefined){const w=simpleWorkoutRecord({date:s.date,parts:st.parts,minutes:st.minutes,intensity:st.intensity,title:st.title||'',rest:d.simpleRest!==undefined});$s.db=$f.save({...$s.db,workouts:[...$s.db.workouts,w]});$s.selectedDate=s.date;$s.modal=null;$s.quickWorkout=null;$f.render();$f.toast(w.rest?'쉬는 날로 남겼어요. 쉬는 것도 계획이에요.':'오늘 운동을 남겼어요.');return true}
 }
 return false;
}
