import {nativeAuthAvailable} from './native-auth.js';
import {APP_VERSION,installChip,installModalBody,installClick,initInstall} from './install.js';
import {installErrorLog,loadNotice,dismissNotice,noticeHTML,clearErrors} from './error-log.js';
import {mountHalo,dayRecords} from './halo.js';
import {QUESTIONS,prefsOf,withPrefs,effectiveWorkoutMode,effectiveMealMode,onboardingHTML,onboardingPick,onboardingMove,newOnboarding,finishOnboarding,skipOnboarding,prefsSettingsHTML,applyPrefClick,modeChipHTML,emptyAfterWorkout,afterWorkoutFromLast,afterWorkoutHTML,readAfterWorkoutForm,afterWorkoutRecord,simpleMealHTML,simpleMealRecord} from './prefs.js';
import {emptyPlan,planFromWorkout,planFromRoutine,planHTML,readPlanForm,validatePlan,startRun,completeSet,skipExercise,finishRun,addRest,endRest,editCurrent,runRecord,dueCues,runHTML,current as guideCurrent,createCues,prepareNativeAlerts,scheduleRestAlert,cancelRestAlert} from './guide.js';
import {gymSettingsHTML as gymSettingsView,gymMapHTML,mapResultsHTML,addGymPlace,removeGym,centerFor,loadKakao,searchPlaces,nearbyGyms,addressAt} from './places.js';
import {brandIcon,emptyArt} from './brand-icons.js';
import {loadAccountConsent,saveAccountConsent} from './cloud-sync.js';
import {initializeCloud,cloudState,cloudLogin,cloudLogout,synchronize,refreshApproval,applyForAccess,listApplicants,reviewApplicant,setAccountPlan,deleteAccount,adminLoadUser,adminLogView,adminWriteRecord,adminAccessLog} from './cloud-sync.js';
import {isAdminUser} from './admin.js';
import {emptyAdminLog,adminLogHTML,validatePayload,newMeal,newBody} from './admin-log.js';
import {yearRecap,yearRecapHTML,lastWeek,lastWeekHTML,nextGoals,nextGoalsHTML,weekHeroHTML,recoveryHTML,overreachNote,prGalleryHTML,growthHTML,milestoneHTML,resultCardHTML,masteryHTML} from './workout-story.js';
import {exArtHTML,setMachineResolver} from './exercise-art-ui.js';
import {knowledgeOf,firstTimes} from './exercise-knowledge.js';
import {analyze as analyzeCoach} from './coach-engine.js';
import {cloudSettingsHTML,accountAdminHTML,deleteAccountHTML} from './cloud-ui.js';
import {pendingItems,bellHTML,panelHTML,statusBadge,closesOnOutside,planItems} from './admin-panel.js';
import {scopedKey,setStorageAccount} from './storage-scope.js';
import {returnMode,returnGoal,returnNoteHTML,backOnTrack,botDismissed,botCardHTML,botFillHTML,initialFill,readBotForm,parseRecall,mergeRecall,botRecords} from './back-on-track.js';
import {gymKeyOf,newGymPicker,gymPickerHTML,newModel,gymChanges,gymRequests,parseGymRequest,pickMachine,setSpec,gymRequestId,requestQuota,useQuota,MAX_PER_SEND,levelToKg} from './gym-machines.js';
import {readTrash,toTrash,takeFromTrash,emptyTrash,restoreInto,trashHTML} from './trash.js';
$s.TRASH=()=>scopedKey('mylogue.trash');
import {cloudRecords,recordsToDB} from './cloud-model.js';
import {isFuture,repairQuickPlanned,MASS,unitLabel,unitFactor,cleanBody,cleanMeal,cleanWorkout,mealTotals,workoutTotals,estimate1RM,normalizeDB,importBody,validDate,uid,round,cleanMachine,cleanCustomExercise,cleanCheckin,dietState,setDietState,setWeightKg,convertSetUnit,actualDB,plannedMeals} from './domain.js';
import {load,save as saveLocal,getStorageStatus,getRecoveryRaw} from './store.js';
import {loadPopularity,bumpPopularity,popId,loadSharedCatalog,mergeCatalogItems,isCatalogAdmin,submitCatalogRequest,listCatalogRequests,reviewCatalogRequest,saveSharedCatalogItem,catalogRequestPhoto} from './catalog-cloud.js';
import {extractInbody} from './inbody.js';
import {recognizeInBody270} from './inbody-photo.js';
import {recognizeLabel,parseLabel,applyLabel} from './food-register.js';
import {cueFix,polite} from './exercise-guide.js';
import {rescaleMacros} from './nutrition-goals.js';
import {attachScan} from './scan-fx.js';
import {restTick,restAlarm,restMode,webRestNotice,cancelRestNotice} from './rest-screen.js';
/* 4.21.0 휴식 화면 시계: 화면에 있을 때만 숫자·초침을 갱신하고, '지정해 두고 쉬기'면 시간이 되면 한 번 알림 */
if(typeof setInterval==='function'&&typeof document!=='undefined'){const h=setInterval(()=>restTick(()=>{restAlarm();webRestNotice(`${document.querySelector('.rt-summary b')?.textContent?.trim()||'다음 세트'} 준비됐어요. 🔥 버튼을 눌러 시작해요`);toast('휴식 시간이 끝났어요. 준비되면 🔥 버튼을 눌러 주세요.')}),250);h?.unref?.()}
import {periodSummary,threeLiftTotal,simpleRecommendation} from './insights.js';
import {latestEstimate,suggestSets,plateLoadPerSide} from './training.js';
import {EXERCISE_CATALOG,searchExercises,PROGRAM_TEMPLATES,createRoutineFromProgram,findExercise as findExerciseByName,resolveExercise} from './catalog.js';
import {FOOD_CATALOG} from './food-catalog.js';
import {scaleNutrition,recentFoods,upsertFoodPreset} from './nutrition.js';
import {goalSettingsHTML,saveGoalSettings} from './nutrition-goals.js';
import {buildReport,reportHTML,drawShareCard} from './analysis-report.js';
import {foodSuggestHTML,exerciseSuggestHTML} from './suggest-ui.js';
import {otherUnit,brandModelId,gymMachineId,genericMachine,machineTargets,dedupeMachines,findSameMachines,canonicalModelId,GENERIC_MACHINES,machineKey,genericMachinesFor,inferBaseId,orphanMachines} from './machines-catalog.js';
import {isInbody,scaleRecords,inbodyRecords,bodyChartHTML,smoothWeights} from './body-series.js';
import {quickMealState,quickMealHTML as qmHTML,readQuickMeal,applyQuickMeal,mealDiff,stepFor,quickWorkoutState,quickWorkoutHTML as qwHTML,readQuickWorkout,applyQuickWorkout} from './quick-edit.js';
import {profileOf,avatarHTML,newProfileEdit,profileEditHTML,applyProfile,shrinkPhoto} from './profile.js';
import {newGoalWizard,goalWizardHTML,applyGoalWizard,calorieOptions,presetOrder,WIZ_STEPS,estimate as estimateEnergy} from './nutrition-plan.js';
import {setGap} from './workout-times.js';
import {dietTrend,exerciseTrend,partSummary,fatigueProxy,weeklyReport,monthlyReport,comparePeriods} from './reports.js';
import {mealFormHTML,mealPreview,workoutFormHTML,saveProgressPhoto,listProgressPhotos,deleteProgressPhoto} from './ui-helpers.js';
import {parseCodexRecord} from './ai-adapter.js';
import {listAIDrafts,pairLocalAgent,unpairLocalAgent,bridgeStatus,BRIDGE_PORT,resolveAIDraft,addPastedDrafts,askAIServer,validateDraftRecords,localDraftMode,listLocalDrafts,onLocalConfirm,migrateLocalDrafts} from './ai-drafts.js';
// 4.11.0 승인 전 이 기기 검토함에서 확정한 기록은 바로 이 기기 기록에 넣는다
onLocalConfirm(records=>{let next=$s.db;for(const {kind,record} of records){next={...next,[kind]:[...(next[kind]||[]).filter(x=>x.id!==record.id),record]}}$s.db=save(next)});
import {aiWorkerUrl} from './ai-config.js';
import {setAdminView,setFakeAI,adminPlanCardHTML} from './plan.js';
import {aiRequest,aiUsable,aiConnected} from './ai-client.js';
import {discoveries,journey,journeyHTML} from './discovery.js';
import {homeVoice,voiceHTML} from './home-voice.js';
import {suggestMeals,whatToEatHTML} from './what-to-eat.js';
import {microReport,microReportHTML,microTodayLine} from './micro-report.js';
import {programHTML,buildProgram,programRoutines} from './program-builder.js';
import {experimentsHTML,startExperiment,stopExperiment,finishExperiment} from './experiment.js';
import {allowance as planAllowance} from './plan.js';
import {weightWhy,weightWhyHTML} from './weight-why.js';
import {helpHTML,helpListHTML} from './help.js';
import {drawStoryCard,storyLines} from './share-cards.js';
import {simulate,simulatorHTML,situationHTML,betterChoices,betterChoicesHTML} from './plus-tools.js';
import {can as planCan} from './plan.js';
import {classOf as pmClassOf,addPickedMove} from './pilates-pick.js';
import {myMaintenance} from './maintenance.js';
import {newPhaseWizard,phaseWizardHTML,phaseStatus,phaseBadgeHTML,phaseSettingsHTML,readPhaseAnswers,buildPhase,kcalDelta,nutritionGoalOf,phaseRecap,endPhase} from './phase.js';
import {estimate as phaseEstimate,cleanProfile as phaseProfile} from './nutrition-plan.js';
import {allowance,lockHTML as plusLockHTML} from './plan.js';
import {aiCoachCardHTML,recipeModalHTML,weekSummaryText,chatContext,matchRecipe,recipeFoodPreset} from './ai-coach-ui.js';
import {coachHTML} from './coach-ui.js';
import {scheduleCalendarHTML,planFormHTML,planTitle} from './schedule-view.js';
import {createCoachController} from './coach-controller.js';
import {COACH_PAGES} from './coach.js';
import {dateBarHTML,dateBarClick,shiftDate} from './date-bar.js';
import {dietFlowHTML} from './diet-trends.js';
import {installChartHover} from './band-chart.js';
import {visitTick,todayLineHTML,hideToday,savedLine} from './motivation.js';
if(typeof document!=='undefined')visitTick();
installChartHover();
import {bodyOverviewHTML} from './body-flow.js';
import {workoutFlowHTML} from './workout-flow.js';
import {reminderItems,reminderSettingsHTML,setReminder} from './reminders.js';
import {foodCheckHTML,applyFoodFix,foodIssue} from './food-check.js';
$s.readSchedForm=()=>{const f=document.getElementById('plan-workout-form');return f?{time:f.elements.time?.value||'',note:f.elements.note?.value||''}:{}};
import {placesHTML,weekFlowHTML,plannedWorkoutsHTML,partBalanceHTML,dayWorkoutsHTML} from './workout-page.js';
import {enhanceWhenInputs,handleWhenClick} from './when-chips.js';
import {planFromSettings,applyMacroPlan,refreshMacroGoals,macroPlanFormHTML,PRESETS,autoRest,applyFix} from './macro-plan.js';
import {aiInputHTML,aiPreviewHTML,unitIssueHTML,uncertainHTML,parsePaste,fullPrompt,aiContextText} from './ai-paste.js';
import {renderAIInbox,readAIReview,wireAIReview} from './ai-inbox.js';
import {createBackup,validateBackup,restoreBackup,recoverInterruptedRestore} from './backup.js';
import {readSession,writeSession,clearSession,rawSession} from './session.js';
import {machineFormHTML,exerciseFormHTML} from './profile-forms.js';
import {muscleMapHTML,anatomySvg,MUSCLE_LABELS} from './exercise-ui.js';
import {batchHTML,blankFood,batchMeals,batchSummary} from './meal-batch.js';
import {renderHomeTimeline,mealGroups,workoutTitle,daySummary} from './timeline-view.js';
import {renderFoodPage} from './food-view.js';
import {movesListHTML,moveProgress} from './pilates.js';
import {loadFoodDB,foodDBReady,findFoodDB,searchFoodDB,isPublicFoodName} from './food-db.js';
import {workoutBurn,BURN_NOTE} from './exercise-burn.js';
import {EXERCISE_CATALOG as EX_CAT} from './catalog.js';
import {CARDIO_TEMPLATES} from './templates-data.js';
// 4.12 종목 요령·흔한 실수(도감 보강)
$s.cueHTML=e=>{const c=EX_CAT.find(x=>x.id===(e.exerciseId||e.id)||x.name===e.name);const k=c?knowledgeOf(c):null;if(!c?.cues&&!c?.mistake&&!k)return '';/* 4.17.0 운동 지식: 대체 운동·단계·주의 관절 */const extra=k?`${k.tip&&!c?.cues?.length?`<p class="hint">${$s.esc(k.tip)}</p>`:''}${k.ladder?`<p class="ex-ladder"><b>${$s.esc(k.ladder.title)}</b> ${k.ladder.steps.map((s,i)=>`<span class="${i===k.ladder.index?'on':''}">${$s.esc(s)}</span>`).join('<i aria-hidden="true">›</i>')}</p>`:''}${k.alternatives.length?`<p class="hint">비슷한 운동(기구가 없거나 붐빌 때): ${k.alternatives.map($s.esc).join(' · ')}</p>`:''}${k.cautions.length?`<p class="hint">주의할 곳: ${k.cautions.map($s.esc).join('·')} — 아프면 멈추고, 계속되면 전문가와 상의해 주세요.</p>`:''}`:'';return `<details class="ex-cues"><summary>자세 요령${c?.level?` · ${$s.esc(c.level)}`:''}${k?` · ${$s.esc(k.pattern)}`:''}</summary><ul>${(cueFix(c?.name)||c?.cues||[]).map(t=>`<li>${$s.esc(polite(t))}</li>`).join('')}</ul>${c?.mistake?`<p class="hint">흔한 실수: ${$s.esc(c.mistake)}</p>`:''}${extra}</details>`};
import {consentOK,operatorNoticeHTML,needsOperatorNotice,consentHTML,consentRecord,legalFooterHTML,CONSENT_ITEMS,requiredChecked,OPTIONAL_CONSENT,CONSENT_VERSION} from './legal.js';
const deviceConsent=(uid,set=false)=>{const k=`mylogue.consentOK.${uid}`;try{if(set){if(localStorage.getItem(k)!==CONSENT_VERSION)localStorage.setItem(k,CONSENT_VERSION);return true}return localStorage.getItem(k)===CONSENT_VERSION}catch{return false}};
import {personaRecords,personaOf,personaCardsHTML} from './personas.js';
import {DEMO_ACCOUNT,demoPersona,switchDemoPersona,demoRequested,startDemo,endDemo,skipLanding,hasRecords,showLanding,viewLanding,closeLanding,landingViewing,demoRecords,landingHTML,demoBannerHTML} from './landing.js';
$s.pilatesProgressHTML=ws=>{const p=moveProgress(ws);return p.length?`<div class="card pm-progress"><span class="sub">필라테스 진척(같은 동작의 처음 → 최근)</span>${p.map(x=>`<div class="record"><span>${$s.esc(x.name)} <small class="muted">${$s.esc(x.apparatus)}</small></span><strong>${$s.esc(x.first.spring||'—')}${x.first.level?` ${x.first.level}단계`:''} → ${$s.esc(x.last.spring||'—')}${x.last.level?` ${x.last.level}단계`:''}</strong></div>`).join('')}</div>`:''};
import {emptyQuickMeal,emptyQuickWorkout,quickTime,quickFoodCandidates,quickMealHTML,quickMealRecords,quickWorkoutHTML,quickWorkoutRecord,lastSession,findMachine,usesBar,defaultBar,levelConvText,memoKey,usualQty,yesterdayMeal,mealToRow} from './quick-entry.js';
import {recentMealGroups,frequentCombo} from './quick-entry.js';
import {copyMeals,createRecipe,recipeMeals,weightTrend,exercisePRs,recommendWorkout} from './model-features.js';
import {$s,$f} from './app-state.js';
import {syncWidget} from './widget-sync.js';
import {healthCandidates,healthRecords,healthPlugin} from './health-import.js';
import {workoutPage,bodyPage,analysisPageInner,settingsPage,calendarPage,foodPage,home,aiSettingsHTML,catalogSettingsHTML,catalogRequestHTML,catalogAdminFoodHTML,prHTML,requestRowHTML,checkinHTML,backupNudgeHTML,reviewHTML,recommendationHTML,loadAtlasHTML,profilesHTML,wteHTML,dietControls,sessionControls,coachNote,accountChip,brandMarkHTML,chart} from './app-pages.js';
import {modalHTML} from './app-modals.js';
import {quickClick,enhancedClick,adminClick,quickEditClick,cloudClick,prefsClick,goalWizClick,guideClick,placesClick,catalogClick,aiBridgeClick,quickInput,enhancedChange,enhancedInput} from './app-actions.js';
Object.assign($f,{adminLogPage,alogLoadUsers,alogOpen,alogWrite,botCard,refreshGoalsByWeight,confirmPlanned,haloProgress,brandMarkHTML,homePlanOpts,openAIInput,openShortcut,openSharedPhoto,refreshAIDrafts,save,dateBar,add,remove,replace,queueAutoSync,runAutoSync,catalogFoods,foodChoices,savedFoodsFromRows,refreshCatalog,refreshApplicants,today,chart,toastUndo,toast,syncWakeLock,refreshProgressPhotos,guideSave,guideStop,guideTick,guideStartTicker,guideClick,closeGymMap,mountGymMap,gymMapNearby,placesClick,noticeOn,aiLinkedNow,adminItems,adminItemsBase,adminAutoOpen,maybeOnboard,adminClick,aiConfirmMany,gwReadBasic,gwEnter,goalWizClick,quickEditClick,aiPhotoData,publishMachineRequest,shareCanvas,shareReportCard,syncHistory,countPopularity,refreshPopularity,recordHint,prefsClick,accountChip,coachNote,home,aiSettingsHTML,checkBridge,aiBridgeClick,bodyPage,remainToday,wteHTML,foodPage,workoutPage,diaryLine,phaseFormValues,analysisPage,analysisPageInner,calendarPage,backupNudgeHTML,pendingNoteHTML,storageNoteHTML,settingsPage,catalogSettingsHTML,requestRowHTML,catalogRequestHTML,catalogAdminFoodHTML,gymSettingsHTML,modalHTML,render,download,ocrFields,readFile,quickFoodRow,quickMachineFor,quickPreviousSet,quickClick,batchDbInput,quickInput,allExercises,recentExercises,previousExercise,persistDraft,resumeSession,sessionControls,recoveryBanner,dietControls,checkinHTML,recommendationView,recommendationHTML,prHTML,enhancedClick,enhancedChange,enhancedInput,getTesseract,runOCR,shareWorkout,profilesHTML,estimateFor,readMachinePhoto,reviewHTML,loadAtlasHTML,cloudClick,catalogClick});

installErrorLog({version:APP_VERSION,page:()=>String($s?.page||'')});await initializeCloud();if(!$s.DEMO)loadNotice().then(n=>{if(n){$s.notice=n;try{render()}catch{}}});globalThis.addEventListener?.('mylogue-cloud-refresh',()=>{try{render()}catch(e){console.error(e)}});
setTimeout(()=>{healthState().then(()=>{if($s.page==='settings')render()});healthAutoOnOpen()},1200);
$s.DEMO=!cloudState.user&&demoRequested();if($s.DEMO)setStorageAccount(DEMO_ACCOUNT);
// 4.12 밝은 화면(시험): 기기 설정(계정과 무관)
$s.themePref=()=>{try{return localStorage.getItem('mylogue.theme')==='light'?'light':'dark'}catch{return 'dark'}};
$s.applyTheme=()=>{try{document.documentElement.dataset.theme=$s.themePref()}catch{}};$s.applyTheme();
initInstall(()=>render());
// 4.11.0 승인되면 앱 안에서 한 번 알린다(설정을 열어 보지 않아도)
setTimeout(()=>{try{if($s.DEMO||!cloudState.user||cloudState.approval!=='approved')return;const k=scopedKey('mylogue.approvedSeen');if(localStorage.getItem(k))return;if(localStorage.getItem(scopedKey('mylogue.cloud.last-sync'))){localStorage.setItem(k,'1');return}localStorage.setItem(k,'1');toast('계정 이용이 승인됐어요! 이제 기기 간 동기화와 앱 안 AI 정리를 쓸 수 있어요.',7000)}catch{}},1500);
try{await recoverInterruptedRestore()}catch(e){console.error('복원 복구 필요',e)}
$s.inbodyUnit='kg';
$s.db=load(),$s.page='home',$s.period=30,$s.bodyMetric='overview',$s.selectedDate=today(),$s.modal=null,$s.toastTimer=void 0,$s.workDraft=[],$s.ocrDraft=null;
{/* 4.18.0 내 머신 중 상위 머신 종류가 빈 것은 종목·이름으로 채운다(성장·그림을 상위 종목으로 잇기 위해) */const ms=$s.db.machines||[],fixed=ms.map(m=>{if(m.baseId)return m;const b=inferBaseId(m);return b?{...m,baseId:b}:m});if(fixed.some((m,i)=>m!==ms[i])&&!getStorageStatus().blocked)try{$s.db=saveLocal({...$s.db,machines:fixed})}catch(e){console.warn(e)}}
{/* 4.16.0 '예정'으로 잘못 저장된 빠른 운동 기록 바로잡기 */const fixed=repairQuickPlanned($s.db);if(fixed!==$s.db&&!getStorageStatus().blocked)try{$s.db=saveLocal(fixed)}catch(e){console.warn(e)}}
$s.mealEditId=null,$s.workEditId=null,$s.routineEditId=null,$s.workMeta={},$s.timerEnds=0,$s.timerHandle=null,$s.analysisExercise='',$s.codexDraft=null,$s.progressPhotos=[];
$s.machinePhoto='',$s.batchCopy=false;$s.undoDraft=null,$s.analysisMachine='all',$s.analysisDays=84,$s.analysisAtlasMode='load';
$s.machineIndex=null,$s.profileReturn='workout',$s.machineEdit=null,$s.customEdit=null;
$s.bodyEditId=null,$s.selection={tab:'recent',part:'전체',equipment:'전체'},$s.batchRows=[],$s.batchDate=today(),$s.batchSlot='식사',$s.batchTime=new Date().toTimeString().slice(0,5),$s.restoreCandidate=null;
if($s.DEMO&&!hasRecords($s.db)){try{const pid=demoPersona(),r=pid&&personaOf(pid)?personaRecords(pid,today()):demoRecords(today());$s.db=saveLocal({...$s.db,settings:{...$s.db.settings,...r.settings},body:r.body.map(cleanBody),meals:r.meals.map(cleanMeal),workouts:r.workouts.map(cleanWorkout),...(r.checkins?{checkins:Object.fromEntries(Object.entries(r.checkins).map(([k,v])=>[k,cleanCheckin(v)]))}:{})})}catch(e){console.error('둘러보기 예시 기록',e)}}
// 4.11.0 둘러보기: AI 검토함도 비어 있지 않게 예시 초안 하나(이 기기 검토함, 둘러보기 끝내면 함께 지워짐)
if($s.DEMO&&!listLocalDrafts().length){const t=new Date(Date.now()-3600e3),hm=`${String(t.getHours()).padStart(2,'0')}:${String(t.getMinutes()).padStart(2,'0')}`;addPastedDrafts([{type:'meal',sourceModel:'둘러보기 예시',originalUtterance:'아까 간식으로 그릭요거트에 블루베리 한 줌 먹었어',parsedData:{items:[{date:today(),slot:'간식',name:'그릭요거트',servingQty:150,servingUnit:'g',calories:146,carbs:6,protein:15,fat:6,loggedAt:new Date(`${today()}T${hm}:00`).toISOString(),aiEstimate:{estimated:true,basis:'플레인 그릭요거트 100g당 97kcal 기준 추정'}},{date:today(),slot:'간식',name:'블루베리',servingQty:30,servingUnit:'g',calories:17,carbs:4,protein:0,fat:0,loggedAt:new Date(`${today()}T${hm}:00`).toISOString()}]}}]).catch(e=>console.warn(e))}
$s.consentChecked={},$s.consentError='';
$s.draftWarning='',$s.savedDraft=null,$s.backupBusy=false,$s.renderedModal=null;
$s.quickMeal=null,$s.quickWorkout=null,$s.composingSearch=false;
$s.bot=null;// 4.14.0 백 온 트랙 채우기 상태
$s.alog=emptyAdminLog();// 4.15.0 관리로그
$s.resultWorkout=null,$s.weekGoalOpen=false;// 4.16.0 운동 결과 카드·주간 횟수 고르기
/* 4.18.0 머신 기록의 그림은 머신 종류(상위 종목)로 */setMachineResolver(id=>findMachine($s.db,$s.sharedCatalog,id));
$s.adminLogOK=()=>!$s.DEMO&&!cloudState.native&&isAdminUser(cloudState.user);
function adminLogPage(){if(!$s.adminLogOK())return home();if(!$s.alog.users.length&&!$s.alog.loading&&!$s.alog.error&&!$s.alog.uid)alogLoadUsers();/* 4.18.0 상위 머신 종류가 없는 머신 점검(대표님: 모든 머신은 상위 종류로 덮여야 함) */const orph=orphanMachines($s.sharedCatalog,$s.db.machines||[]),mm=($s.sharedCatalog.machineModels||[]).length,merged=Object.keys($s.sharedCatalog.machineAlias||{}).length;return adminLogHTML($s.alog,{today:today()})+`<section class="section card machine-audit"><h3>머신 점검</h3><p class="hint">공용 제조사 모델 ${mm}개 · 띄어쓰기·표기만 달라 합친 것 ${merged}개 · 상위 머신 종류가 없는 것 ${orph.length}개</p>${orph.length?`<ul class="audit-list">${orph.map(o=>`<li><b>${$s.esc(o.name)}</b><small>${o.where} · ${$s.esc(o.id)}</small></li>`).join('')}</ul><p class="hint">이 머신들은 어떤 머신 종류인지 알 수 없어 다른 머신 기록과 합쳐지지 않아요. 헬스장 머신 등록 화면에서 종류를 골라 다시 등록해 주세요.</p>`:'<p class="hint">모든 머신이 상위 머신 종류에 속해 있어요.</p>'}</section>`}
async function alogLoadUsers(){$s.alog={...$s.alog,loading:true,error:''};try{$s.alog.users=(await listApplicants()).sort((a,b)=>String(a.email||'').localeCompare(String(b.email||'')))}catch(e){$s.alog.error=e.message||'목록을 불러오지 못했어요.'}$s.alog.loading=false;if($s.page==='adminlog')render()}
async function alogOpen(uid){const u=$s.alog.users.find(x=>x.uid===uid);$s.alog={...$s.alog,uid,email:u?.email||'',data:null,date:today(),edit:null,add:null,log:null,loading:true,error:''};render();try{$s.alog.data=await adminLoadUser(uid);if(!$s.alog.viewed[uid]){$s.alog.viewed[uid]=1;adminLogView(uid,$s.alog.reason||'관리로그 열람').catch(()=>{})}const ds=Object.values($s.alog.data.db.meals||[]).map(m=>m.date).concat(($s.alog.data.db.body||[]).map(b=>b.date)).sort();if(ds.length&&!ds.includes(today()))$s.alog.date=ds[ds.length-1]}catch(e){$s.alog.error=e.message||'기록을 불러오지 못했어요.'}$s.alog.loading=false;render()}
async function alogWrite(key,payload,action){const reason=(document.getElementById('alog-reason')?.value||$s.alog.reason||'').trim();$s.alog.reason=reason;if(!reason)throw Error('수정 사유를 먼저 적어 주세요.');await adminWriteRecord($s.alog.uid,key,payload,action,reason);$s.alog.edit=null;$s.alog.add=null;$s.alog.data=await adminLoadUser($s.alog.uid);$s.alog.log=null;render();toast(action==='delete'?'삭제했어요(접근 기록에 남음).':'저장했어요(접근 기록에 남음). 회원 기기는 다음 동기화 때 반영돼요.')}
$s.BOT_KEY=()=>scopedKey('mylogue.backOnTrack');
$s.botState=()=>{try{return JSON.parse(localStorage.getItem($s.BOT_KEY())||'null')}catch{return null}};
$s.setBotState=v=>{try{localStorage.setItem($s.BOT_KEY(),JSON.stringify(v))}catch{}};
function botCard(){if($s.DEMO||$s.selectedDate!==today())return '';const info=backOnTrack($s.db,today());if(!info||botDismissed($s.botState(),info))return '';return botCardHTML(info)}
$s.onb=null,$s.afterWorkout=null,$s.scrollToPrefs=false;
$s.guidePlan=null,$s.guideRun=null,$s.guideCues=null,$s.guideTicker=null,$s.goalWiz=null,$s.qm=null,$s.qw=null,$s.pfEdit=null;
$s.sheetDirty=false,$s.dirtyModal=null,$s.navFromPop=false,$s.ignorePop=false,$s.popularity={};
$s.gymSearch={},$s.gymMap=null,$s.gymMapView=null,$s.gymMapEl=null,$s.gymMapTimer=null,$s.gymMapSeq=0;
$s.sharedCatalog={foods:[],exercises:[],machineModels:[],gymLocations:[],gymMachines:[],error:''};
$s.adminState={open:false,via:'',snoozed:new Set(),done:[],autoShown:false},$s.adminJust={},$s.adminRefreshedAt=0,$s.onbChecked=false,$s.aiPair=null,$s.aiBridge={checked:false,checking:false,status:null,port:BRIDGE_PORT};
$s.catalogRequests=[],$s.catalogRequestError='',$s.catalogRequestMode='manual',$s.catalogRequestType='machine',$s.catalogAdminFood=null,$s.catalogPhotoView=null;
$s.autoSyncTimer=null,$s.autoSyncBusy=false,$s.autoSyncStatus='';
$s.aiDrafts=[],$s.aiDraftError='',$s.aiDraftLoading=false;
$s.aiInput={text:'',msg:'',busy:false};$s.aiCoach={busy:'',review:'',chat:[],q:'',msg:'',left:null},$s.aiRecipe={text:'',busy:false,msg:'',match:null},$s.aiMe=null,$s.phaseWiz=null,$s.consentUploadTried=false,$s.wte={mood:'balance',place:'out',results:null,key:''},$s.simSt={kcal:0,workouts:0,weeks:12},$s.pbSt={goal:'muscle',level:'new',days:3,place:'gym',minutes:60},$s.sitSt={sit:''};
$s.gymPick=null,$s.motivOpen=false,$s.bodyPreset=null,$s.prMuscle='',$s.wfMetric='sets',$s.bfView='day',$s.dfMetric='score',$s.dfPeriod=30,$s.dbOpen=false,$s.dbMonth=null,$s.mpPlan=null,$s.placeFormOpen=false,$s.planDraft={cat:'웨이트',parts:[]};
// 3.19.0 최근 체중(체중계 우선)과 체중 대비 목표 자동 갱신
$s.latestWeight=()=>{const w=scaleRecords($s.db).at(-1)?.weight||[...($s.db.body||[])].filter(x=>x.weight).sort((a,b)=>String(a.date).localeCompare(String(b.date))).at(-1)?.weight;return w?Number(w):null};
function refreshGoalsByWeight(){const next=refreshMacroGoals($s.db.settings||{},$s.latestWeight());if(next!==$s.db.settings)$s.db=save({...$s.db,settings:next})}
// 3.18.0 '예정 포함' 토글(기본: 실제로 먹은 것만)
$s.showPlanned=false;try{$s.showPlanned=localStorage.getItem('mylogue.showPlanned')==='1'}catch{}
// 예정 기록 확정: planned 표시만 지우면 실제 기록으로 합계·헤일로·분석에 들어간다
// 세트별 완료를 하나라도 눌렀다면, 누르지 않은 세트는 하지 않은 세트로 확정(볼륨에서 빠짐)
$s.settleSets=ex=>{const all=(ex||[]).flatMap(e=>e.sets||[]);if(!all.some(st=>st.done))return ex;return ex.map(e=>({...e,sets:(e.sets||[]).map(({done,...st})=>({...st,completed:!!done,completedAt:done?(st.completedAt||new Date().toISOString()):''}))}))};
// 4.4.1 점검 D-4: 어느 입구로 넣든 미래 시각(날짜)이면 예정으로 둔다.
$s.planMeal=m=>m.planned===true||isFuture(m.loggedAt)||m.date>today()?{...m,planned:true}:m,$s.planWorkout=w=>w.rest||w.planned===true||w.date>today()||(w.date===today()&&w.loggedAt&&isFuture(w.loggedAt))?(w.rest?w:{...w,planned:true}):w;
// 4.4.2 점검 C-7: 되돌리기는 바꾼 기록만(그 사이 다른 기록·동기화로 받은 내용은 그대로)
$s.undoRecords=(kind,before,ids)=>()=>{const keep=($s.db[kind]||[]).filter(x=>!ids.has(x.id));$s.db=save({...$s.db,[kind]:[...keep,...before.filter(x=>ids.has(x.id))]});render()};
// 4.7.0 체중 한 손 입력: 평소 체중계로 잰 마지막 체중
$s.lastScaleW=()=>{const all=[...($s.db.body||[])].filter(x=>Number(x.weight)>0).sort((a,b)=>String(b.date).localeCompare(String(a.date))),b=all.find(x=>!isInbody(x))||all[0];return b?Number(b.weight):null};
function confirmPlanned(ref){const [kind,...rest]=String(ref).split(':'),key=rest.join(':');let n=0;if(kind==='meal'){$s.db=save({...$s.db,meals:$s.db.meals.map(m=>m.planned&&(m.mealGroupId?m.mealGroupId===key:(m.id===key||(`legacy:${m.slot}`===key&&m.date===$s.selectedDate)))?(n++,(({planned,...x})=>({...x,updatedAt:new Date().toISOString()}))(m)):m)})}else if(kind==='workout'){$s.db=save({...$s.db,workouts:$s.db.workouts.map(w=>w.planned&&w.id===key?(n++,(({planned,...x})=>({...x,exercises:$s.settleSets(x.exercises),updatedAt:new Date().toISOString()}))(w)):w)})}$s.adminState.snoozed.delete(`plan:${ref}`);render();const dt=(kind==='meal'?$s.db.meals.find(m=>m.updatedAt&&!m.planned&&(m.mealGroupId===key||m.id===key||`legacy:${m.slot}`===key)):$s.db.workouts.find(w=>w.id===key))?.date,dl=!dt||dt===today()?'오늘':`${Number(dt.slice(5,7))}/${Number(dt.slice(8,10))}`;if(n)toast(kind==='meal'?`식사를 확정했어요. ${dl} 기록에 반영됐어요.`:`운동을 확정했어요. ${dl} 기록에 반영됐어요.`);else toast('확정할 예정 기록을 찾지 못했어요. 화면을 새로 고친 뒤 다시 눌러 주세요.')}
// 3.18.5 헤더 로고 둘레 '오늘의 고리': 오늘 기록한 종류 수 / 기록할 종류 수(예정 제외)
function haloProgress(){const tracks=prefsOf($s.db).tracks.filter(k=>['body','meal','workout'].includes(k));const kinds=new Set(dayRecords(actualDB($s.db),today()).map(r=>r.kind));return {done:tracks.filter(k=>kinds.has(k)).length,total:tracks.length||3}}

function homePlanOpts(date=today()){const p=plannedMeals($s.db,date);return {planned:p.totals,plannedCount:p.count,showPlanned:$s.showPlanned}}
$s.aiReady=()=>(!!cloudState.user&&cloudState.approval==='approved')||$s.DEMO; // 둘러보기는 예시 AI로 체험
// 3.16.0 다른 앱에서 공유받은 글(Android 공유·PWA 공유 대상)은 AI 입력 창에 바로 채운다.
function openAIInput(text=''){$s.aiInput={text:String(text||'').slice(0,20000),msg:'',busy:false};$s.modal='ai-input';render()}
// 4.7.0 앱 바로가기(아이콘 길게 누르기)·웹 바로가기(?record=)·사진 공유(인바디 결과지)
function openShortcut(k){try{localStorage.removeItem('mylogue.pendingShortcut')}catch{}const m=k==='body'?'body':k==='meal'?'batch':k==='workout'?'workout':null;if(!m)return;$s.page='home';$s.modal=null;render();setTimeout(()=>document.querySelector(`[data-modal="${m}"]`)?.click(),60)}
$s.sharedPhoto=null;
function openSharedPhoto(url){if(!url)return;$s.sharedPhoto=url;window.__mylogueSharedImage=null;$s.modal='inbody';render();setTimeout(()=>{const p=document.getElementById('photo-preview');if(p){p.src=url;p.classList.remove('hidden')}const st=document.getElementById('ocr-status');if(st)st.textContent='공유받은 사진이에요. 아래 ‘숫자 읽기’를 누르세요.'},80)}
globalThis.addEventListener?.('mylogue-shortcut',e=>openShortcut(e.detail));
globalThis.addEventListener?.('mylogue-share-image',e=>openSharedPhoto(e.detail));
globalThis.addEventListener?.('mylogue-share',e=>{try{localStorage.removeItem('mylogue.pendingShare')}catch{}openAIInput(e.detail||'')});
async function refreshAIDrafts(){if(localDraftMode()){$s.aiDrafts=listLocalDrafts();$s.aiDraftError='';render();return}try{const moved=await migrateLocalDrafts();if(moved)toast(`이 기기에서 기다리던 AI 초안 ${moved}건을 계정 검토함으로 옮겼어요.`)}catch(e){console.warn(e)}$s.aiDraftLoading=true;render();try{$s.aiDrafts=await listAIDrafts();$s.aiDraftError=''}catch(error){$s.aiDraftError=error.message||'AI 초안을 불러오지 못했습니다.'}finally{$s.aiDraftLoading=false;adminAutoOpen();render()}}
// 4.17.0 헬스 커넥트: 읽기 → 미리보기(확정) → 기록. 자동 더하기는 설정에서 켠 사람만.
$s.hc={status:'',granted:null,cands:null,busy:false};
async function healthState(){const p=healthPlugin();if(!p)return;try{const a=await p.availability();$s.hc.status=a.status;if(a.status==='available')$s.hc.granted=await p.permissions()}catch{}}
async function healthFlow(connect){const p=healthPlugin();if(!p||$s.hc.busy)return;$s.hc.busy=true;try{if(connect){$s.hc.granted=await p.requestPermissions();if(!$s.hc.granted?.steps&&!$s.hc.granted?.weight){toast('권한을 허용하지 않아 가져오지 않았어요.');return}}const data=await p.read({days:7});$s.hc.cands=healthCandidates(data,$s.db,today());$s.modal='health';render()}catch(e){toast(e?.message||'헬스 커넥트에서 읽지 못했어요.')}finally{$s.hc.busy=false}}
function healthApply(picked,auto){const {workouts,body,replace}=healthRecords(picked,$s.db);let next={...$s.db,workouts:[...$s.db.workouts.filter(w=>!replace.includes(w.id)),...workouts.map(w=>({...cleanWorkout(w),source:'health',healthSteps:w.healthSteps}))],body:[...$s.db.body,...body.map(b=>cleanBody(b))],settings:{...$s.db.settings,healthAuto:auto}};$s.db=save(next);$s.modal=null;$s.hc.cands=null;render();toast(picked.length?`헬스에서 ${picked.length}개를 기록에 더했어요.`:'설정을 저장했어요.')}
async function healthAutoOnOpen(){const p=healthPlugin();if(!p||!$s.db.settings?.healthAuto)return;await healthState();if(!$s.hc.granted?.steps&&!$s.hc.granted?.weight)return;try{const c=healthCandidates(await p.read({days:7}),$s.db,today());if(c.fresh.length)healthApply(c.fresh,true)}catch{}}
function save(next){const result=saveLocal(next);queueAutoSync();return result}
// 4.2.0 날짜 바: 홈·식단·운동이 같은 '보는 날'(selectedDate)을 쓴다. 점은 그 화면의 기록이 있는 날.
function dateBar(kind){const src=kind==='food'?$s.db.meals:kind==='workout'?$s.db.workouts:[...$s.db.meals,...$s.db.workouts,...$s.db.body];return dateBarHTML($s.selectedDate,today(),{open:$s.dbOpen,month:$s.dbMonth,marked:new Set((src||[]).filter(x=>!x.planned).map(x=>x.date))})}
// 4.0.0 코치 모드(마스터 계정만)
$s.coach=createCoachController({getDB:()=>$s.db,save:next=>{$s.db=save(next);return $s.db},render:()=>render(),toast:m=>toast(m),setPage:p=>{$s.page=p;$s.modal=null;render();globalThis.scrollTo?.(0,0)},getPage:()=>$s.page,today:()=>today(),user:()=>cloudState.user,profileName:()=>{try{return profileOf($s.db,cloudState.user).name}catch{return ''}}});
function add(current,kind,item){return save({...current,[kind]:[...(current[kind]||[]),item]})}
function remove(current,kind,id){return save({...current,[kind]:(current[kind]||[]).filter(x=>x.id!==id)})}
function replace(current,kind,item){return save({...current,[kind]:(current[kind]||[]).map(x=>x.id===item.id?item:x)})}
function queueAutoSync(){if(!cloudState.user||cloudState.approval!=='approved'||getStorageStatus().blocked)return;$s.autoSyncStatus='보내는 중';clearTimeout($s.autoSyncTimer);$s.autoSyncTimer=setTimeout(runAutoSync,1400)}
async function runAutoSync(){if($s.autoSyncBusy){$s.autoSyncStatus='서버 전송 대기';$s.autoSyncTimer=setTimeout(runAutoSync,1500);return}if(cloudState.conflicts.length){$s.autoSyncStatus='동기화 충돌 확인 필요';return}$s.autoSyncBusy=true;try{const result=await synchronize($s.db,saveLocal);if(result.db)$s.db=result.db;$s.autoSyncStatus=result.conflicts.length?'동기화 충돌 확인 필요':'동기화 완료';if($s.page==='settings')render();countPopularity().catch(console.warn)}catch(error){$s.autoSyncStatus=`이 기기에 저장됨 · 연결되면 자동으로 보내요(${error.message||'연결 오류'})`;if($s.page==='settings')render()}finally{$s.autoSyncBusy=false;maybeOnboard(true)}}
function catalogFoods(){return mergeCatalogItems(FOOD_CATALOG,$s.sharedCatalog.foods)}
function foodChoices(){const normalized=catalogFoods().map(food=>{const base=MASS.has(food.servingUnit)?Number(food.servingQty||100)/100:Number(food.servingQty||1);return {...food,catalog:true,...Object.fromEntries(['calories','carbs','protein','fat'].map(key=>[key,food[key]==null?null:Number(food[key])/base]))}});return {...$s.db,foods:[...normalized,...($s.db.foods||[])]}}
function savedFoodsFromRows(rows){let foods=[...($s.db.foods||[])];for(const row of rows){if(!row.name||['calories','carbs','protein','fat'].some(key=>row[key]===null||row[key]===undefined||String(row[key]).trim()===''))continue;foods=upsertFoodPreset(foods,{name:row.name,servingUnit:row.servingUnit||'g',...(row.unitGrams?{unitGrams:Number(row.unitGrams)}:{}),source:row.source||'manual',calories:row.calories,carbs:row.carbs,protein:row.protein,fat:row.fat})}return foods}
async function refreshCatalog(){if(cloudState.approval!=='approved')return;$s.sharedCatalog=dedupeMachines(await loadSharedCatalog());if(cloudState.user)try{$s.catalogRequests=await listCatalogRequests({admin:isCatalogAdmin(cloudState.user)});$s.catalogRequestError=''}catch(error){$s.catalogRequestError=error.message}adminAutoOpen();render()}
async function refreshApplicants(){if(!isCatalogAdmin(cloudState.user))return;try{await listApplicants();$s.adminRefreshedAt=Date.now();adminAutoOpen();render()}catch(error){toast(`신청 목록을 불러오지 못했습니다: ${error.message}`)}}
try{$s.savedDraft=readSession();if($s.savedDraft&&$s.db.workouts.some(w=>w.sourceDraftId===$s.savedDraft.id)){$s.savedDraft=null;try{clearSession()}catch{}}$s.timerEnds=$s.savedDraft?.timerEnds||0}catch(e){$s.draftWarning=e.message}
$s.root=document.getElementById('app');
wireAIReview($s.root);
function today(){const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`}
$s.esc=(v)=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
$s.fmt=(n,d=1)=>n==null?'—':Number(n).toLocaleString('ko-KR',{maximumFractionDigits:d});
$s.recent=(arr)=>[...arr].sort((a,b)=>b.date.localeCompare(a.date));
$s.byDate=(arr,date)=>arr.filter(x=>x.date===date);

// 4.3.0 확인창 대신 되돌리기(개선안 원칙 5)
function toastUndo(msg,undo,ms=6000,label='되돌리기'){let old=document.querySelector('.toast');old?.remove();const el=document.createElement('div');el.className='toast toast-undo';el.innerHTML='<span></span><button type="button"></button>';el.querySelector('button').textContent=label;el.querySelector('span').textContent=msg;el.querySelector('button').onclick=()=>{el.remove();clearTimeout($s.toastTimer);try{undo()}catch(e){toast(e.message||String(e))}};document.body.append(el);clearTimeout($s.toastTimer);$s.toastTimer=setTimeout(()=>el.remove(),ms)}
function toast(msg,ms=3500){let old=document.querySelector('.toast');old?.remove();const el=document.createElement('div');el.className='toast';el.textContent=msg;document.body.append(el);clearTimeout($s.toastTimer);$s.toastTimer=setTimeout(()=>el.remove(),ms||3500)}
// 4.5.0 운동 빠른 기록 창이 열려 있는 동안 화면이 꺼지지 않게(지원하는 브라우저·앱에서만, 안 되면 조용히 넘어감)
$s.qwLock=null;async function syncWakeLock(){try{if(typeof document==='undefined'||!globalThis.navigator?.wakeLock)return;const want=($s.modal==='quick-workout'||$s.modal==='guide-run')&&document.visibilityState==='visible';if(want&&(!$s.qwLock||$s.qwLock.released))$s.qwLock=await navigator.wakeLock.request('screen');if(!want&&$s.qwLock){await $s.qwLock.release();$s.qwLock=null}}catch{}}
if(typeof document!=='undefined'&&typeof document.addEventListener==='function')document.addEventListener('visibilitychange',()=>{syncWakeLock()});
async function refreshProgressPhotos(){if(!globalThis.indexedDB)return;for(const item of $s.progressPhotos)URL.revokeObjectURL(item.url);$s.progressPhotos=await listProgressPhotos();if($s.page==='body')render()}
function guideSave(){if(!$s.guideRun)return;const w=runRecord($s.guideRun);if(!w)return;if($s.guideRun.workoutId&&$s.db.workouts.some(x=>x.id===$s.guideRun.workoutId))$s.db=save({...$s.db,workouts:$s.db.workouts.map(x=>x.id===$s.guideRun.workoutId?w:x)});else $s.db=save({...$s.db,workouts:[...$s.db.workouts,w]});$s.guideRun.workoutId=w.id}
function guideStop(){clearInterval($s.guideTicker);$s.guideTicker=null;$s.guideCues?.keepAwake(false);cancelRestAlert();$s.guideRun=null;$s.guidePlan=null}
function guideTick(){if(!$s.guideRun){clearInterval($s.guideTicker);$s.guideTicker=null;return}const now=Date.now();if($s.guideRun.phase!=='rest')return;for(const c of dueCues($s.guideRun,now))$s.guideCues?.play(c);if(now>=$s.guideRun.restEnds){endRest($s.guideRun);cancelRestAlert();const it=guideCurrent($s.guideRun);$s.guideCues?.play({say:$s.guideRun.set===1?`다음 운동, ${it.name}. 1세트 시작`:`${$s.guideRun.set}세트 시작`,beep:1,go:1});if($s.modal==='guide-run')render();return}if($s.modal==='guide-run'){const left=Math.max(0,Math.ceil(($s.guideRun.restEnds-now)/1000)),el=document.getElementById('guide-time'),ring=document.getElementById('guide-ring');if(el)el.textContent=`${Math.floor(left/60)}:${String(left%60).padStart(2,'0')}`;if(ring)ring.style.setProperty('--p',String(Math.max(0,Math.min(1,($s.guideRun.restEnds-now)/$s.guideRun.restTotal))))}}
function guideStartTicker(){clearInterval($s.guideTicker);$s.guideTicker=setInterval(guideTick,250);$s.guideTicker?.unref?.()}

if(typeof document!=='undefined'&&typeof document.addEventListener==='function')document.addEventListener('visibilitychange',()=>{if($s.guideRun&&$s.guideRun.phase!=='done'&&document.visibilityState==='visible'){$s.guideCues?.keepAwake(prefsOf($s.db).keepAwake);guideTick()}});
function closeGymMap(){$s.modal=null;$s.gymMap=null;$s.gymMapView=null;$s.gymMapEl=null;clearTimeout($s.gymMapTimer)}
async function mountGymMap(){const el=document.getElementById('gym-map');if(!el||el===$s.gymMapEl||!$s.gymMap||$s.gymMap.failed)return;$s.gymMapEl=el;try{const kakao=await loadKakao();if($s.gymMapEl!==el||!el.isConnected||!$s.gymMap)return;const c=$s.gymMap.center;$s.gymMapView=new kakao.maps.Map(el,{center:new kakao.maps.LatLng(c.lat,c.lng),level:c.level});const view=$s.gymMapView;kakao.maps.event.addListener(view,'idle',()=>{if(view!==$s.gymMapView||!$s.gymMap)return;const p=view.getCenter();$s.gymMap.center={lat:p.getLat(),lng:p.getLng(),level:view.getLevel()};clearTimeout($s.gymMapTimer);$s.gymMapTimer=setTimeout(gymMapNearby,350)});gymMapNearby()}catch(e){if(!$s.gymMap)return;$s.gymMap={...$s.gymMap,failed:true,status:'error',message:e.message};$s.gymMapEl=null;render()}}
async function gymMapNearby(){if(!$s.gymMap||$s.modal!=='gym-map')return;const show=()=>{const box=document.getElementById('gym-map-results');if(box&&$s.gymMap)box.innerHTML=mapResultsHTML($s.gymMap)};const c=$s.gymMap.center,seq=++$s.gymMapSeq;if(c.level>6){$s.gymMap.status='zoom';$s.gymMap.results=[];show();return}$s.gymMap.status='loading';show();try{const r=await nearbyGyms(c.lat,c.lng,prefsOf($s.db).sports);if(seq!==$s.gymMapSeq||!$s.gymMap)return;$s.gymMap.results=r;$s.gymMap.status='done'}catch(e){if(seq!==$s.gymMapSeq||!$s.gymMap)return;$s.gymMap.results=[];$s.gymMap.status='search-error';$s.gymMap.message=e.message}show()}

function noticeOn(){return !!cloudState.user&&(isCatalogAdmin(cloudState.user)||aiLinkedNow())}
function aiLinkedNow(){return prefsOf($s.db).aiLinked||!!$s.aiPair}
// 예정 기록 확정 알림은 종 없는 일반 사용자에게도(자동 팝업, '나중에 확인'으로만 닫힘)
// 4.3.0 체중·인바디 리마인드도 같은 알림 칸에(하루 한 번, '나중에 확인'한 건 오늘은 다시 안 뜸)
$s.remindSeen=()=>{try{return new Set(JSON.parse(localStorage.getItem(scopedKey('mylogue.remindSeen'))||'[]'))}catch{return new Set()}};
$s.planNotices=()=>{const seen=$s.remindSeen();return [...planItems($s.db),...reminderItems($s.db,today()).filter(x=>!seen.has(x.key))]};
$s.panelOn=()=>noticeOn()||$s.planNotices().length>0;
function adminItems(){const plan=$s.planNotices();if(!noticeOn())return plan;return [...plan,...adminItemsBase()]}
function adminItemsBase(){const admin=isCatalogAdmin(cloudState.user);return pendingItems({applicants:admin?cloudState.applicants:[],requests:admin?$s.catalogRequests:[],aiDrafts:aiLinkedNow()||admin?$s.aiDrafts:[]})}
function adminAutoOpen(){if(!$s.panelOn()||$s.page!=='home'||$s.modal)return;/* 4.27.0 추가 점검 A-1 */{const q=$s.db.quarantine||[];if(q.length&&($s.db.settings?.quarantineSeen||0)<q.length)return}const fresh=$s.planNotices().filter(x=>!$s.adminState.snoozed.has(x.key)&&!$s.adminState.planSeen?.has(x.key));if(fresh.length){$s.adminState.planSeen=new Set([...($s.adminState.planSeen||[]),...fresh.map(x=>x.key)]);$s.adminState.open=true;$s.adminState.via=fresh.every(x=>x.kind==='remind')?'remind':'auto';return}if($s.adminState.autoShown||!noticeOn())return;if(adminItems().some(x=>!$s.adminState.snoozed.has(x.key))){$s.adminState.open=true;$s.adminState.via='auto';$s.adminState.autoShown=true}}
function maybeOnboard(afterSync){if($s.onbChecked||!cloudState.user||getStorageStatus().blocked)return;if(afterSync===false&&cloudState.approval==='approved')return;$s.onbChecked=true;if(prefsOf($s.db).onboarded||$s.modal)return;$s.onb=newOnboarding($s.db);$s.modal='onboarding';render()}

try{const saved=JSON.parse(localStorage.getItem(scopedKey('mylogue.ai-pair'))||'null');if(saved&&saved.expiresAt>Date.now())$s.aiPair=saved}catch{}
if(typeof document!=='undefined'&&typeof document.addEventListener==='function')document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible'&&noticeOn()&&Date.now()-$s.adminRefreshedAt>60000){$s.adminRefreshedAt=Date.now();if(isCatalogAdmin(cloudState.user)){refreshApplicants().catch(console.error);refreshCatalog().catch(console.error)}if(aiLinkedNow())refreshAIDrafts().catch(console.error)}});
// 4.4.3 점검 C-13: 확정 전에 동기화를 한 번만 하고, 중복 확인은 이 기기 기록 + 이번에 확정한 기록으로
$s.localRecords=()=>[...($s.db.meals||[]).map(record=>({kind:'meals',record})),...($s.db.workouts||[]).map(record=>({kind:'workouts',record})),...($s.db.body||[]).map(record=>({kind:'body',record}))];
async function aiConfirmMany(list){let ok=0;const failed=[],errs=[];if(list.length){try{const synced=await synchronize($s.db,saveLocal);if(synced?.db)$s.db=synced.db}catch(error){console.warn(error)}}const existing=$s.localRecords(),add=d=>{try{existing.push(...validateDraftRecords(d,d.parsedData))}catch{}};for(const d of list){try{await resolveAIDraft(d,{action:'confirm',reviewedData:d.parsedData,existing});add(d);ok++}catch(e){if(e?.code==='duplicate'&&confirm(`${e.message}

같은 걸 한 번 더 먹은 거라면 ‘확인’을 눌러 따로 저장해요.`)){try{await resolveAIDraft(d,{action:'confirm',reviewedData:d.parsedData,allowDuplicate:true});add(d);ok++;continue}catch(e2){e=e2}}console.error(e);failed.push(d);errs.push(e?.message||String(e))}}if(ok){try{const synced=await synchronize($s.db,saveLocal);if(synced.db)$s.db=synced.db}catch(error){console.error(error)}}await refreshAIDrafts();toast(failed.length?(list.length===1?errs[0]:`${ok}건 확정 · ${failed.length}건은 확정하지 못했어요. ${errs[0]}`):`${ok}건 확정했어요. 내 기록에 저장됐어요.`,failed.length?8000:undefined);return {ok,failed:failed.length}}
function gwReadBasic(){const f=document.getElementById('gw-basic');if(!f||!$s.goalWiz)return;const d=new FormData(f);for(const k of ['age','heightCm','weightKg']){const v=String(d.get(k)||'').trim();$s.goalWiz.profile[k]=v===''?null:Number(v)}}
function gwEnter(){const st=$s.goalWiz,step=WIZ_STEPS[st.step];if(step==='calories'&&!st.kcal){const o=calorieOptions(st.profile,st.useMine&&['ready','stale'].includes(st.mine?.status)?st.mine.kcal:null);st.kcal=(o.find(x=>x.rec)||o.find(x=>!x.below)||o[0])?.kcal||null}if(step==='macros'&&!st.preset&&!st.custom.on)st.preset=presetOrder(st.profile).rec}


$s.root.addEventListener('change',async event=>{if(event.target.id!=='pf-photo'||!$s.pfEdit)return;const file=event.target.files?.[0];if(!file)return;try{const v=document.getElementById('pf-name');if(v)$s.pfEdit.nickname=v.value;$s.pfEdit.photo=await shrinkPhoto(file);$s.pfEdit.type='photo';render()}catch(e){toast(e.message)}});
globalThis.addEventListener?.('mylogue-fooddb-more',()=>{/* 4.17.0 브랜드 메뉴가 뒤이어 붙으면 열린 검색 결과를 다시 계산 */const inp=document.getElementById('q-food-search')||document.getElementById('batch-db-search');if(inp&&inp.value.trim())inp.dispatchEvent(new Event('input',{bubbles:true}))});
$s.root.addEventListener('input',event=>{if(event.target.dataset?.rangeOut!==undefined&&event.target.nextElementSibling)event.target.nextElementSibling.textContent=event.target.value});/* 4.17.0 CSP: 인라인 oninput 대신 */
$s.root.addEventListener('input',event=>{if(event.target.id==='pf-name'&&$s.pfEdit)$s.pfEdit.nickname=event.target.value});
$s.root.addEventListener('input',event=>{if(event.target.id!=='applicant-search')return;const q=event.target.value.trim().toLowerCase();document.querySelectorAll('[data-applicant]').forEach(r=>{r.hidden=!!q&&!r.dataset.applicant.includes(q)})});
$s.root.addEventListener('input',event=>{if(event.target.id==='help-search'){const l=document.getElementById('help-list');if(l)l.innerHTML=helpListHTML(event.target.value);return}});
$s.root.addEventListener('input',event=>{if(event.target.id==='ai-say')$s.aiInput.say=event.target.value});
$s.root.addEventListener('change',event=>{const t=event.target;if($s.page!=='adminlog')return;if(t.id==='alog-q'){$s.alog.q=t.value;render()}else if(t.id==='alog-date'&&t.value){$s.alog.date=t.value;$s.alog.edit=null;$s.alog.add=null;render()}else if(t.id==='alog-reason')$s.alog.reason=t.value});
// 3.19.0 탄단지 목표 창: 값을 바꾸면 계산 결과만 바로 갱신(입력 커서 유지)
$s.root.addEventListener('input',event=>{const t=event.target;if(!$s.mpPlan||(!t.dataset.mpValue&&t.dataset.mpKcal===undefined))return;if(t.dataset.mpKcal!==undefined)$s.mpPlan.calorieGoal=Number(t.value)||0;else $s.mpPlan.rules[t.dataset.mpValue]={...$s.mpPlan.rules[t.dataset.mpValue],value:Number(t.value)||0};const tmp=document.createElement('div');tmp.innerHTML=macroPlanFormHTML($s.mpPlan,$s.latestWeight());const form=document.getElementById('macro-plan-form');if(!form)return;form.querySelector('.mp-sum').replaceWith(tmp.querySelector('.mp-sum'));form.querySelectorAll('.mp-result').forEach((el,i)=>{el.textContent=tmp.querySelectorAll('.mp-result')[i].textContent});form.querySelectorAll('.mp-row .hint').forEach((el,i)=>{const n=tmp.querySelectorAll('.mp-row .hint')[i];if(n)el.textContent=n.textContent});form.querySelector('[type=submit]').disabled=tmp.querySelector('[type=submit]').disabled});
// 3.18.0 몸 그래프: 마우스를 올리면 가장 가까운 날짜의 값을 커서 옆에(그래프를 가리지 않게 위쪽으로)
$s.root.addEventListener('pointermove',event=>{const svg=event.target.closest?.('.bchart');const tip=document.getElementById('bc-tip');if(!svg){if(tip)tip.hidden=true;document.querySelectorAll('.bc-guide').forEach(g=>g.setAttribute('visibility','hidden'));return}let pts;try{pts=JSON.parse(svg.dataset.pts||'[]')}catch{return}if(!pts.length)return;const r=svg.getBoundingClientRect(),vx=(event.clientX-r.left)*360/r.width,p=pts.reduce((a,b)=>Math.abs(b.x-vx)<Math.abs(a.x-vx)?b:a);const g=svg.querySelector('.bc-guide');g?.setAttribute('x1',p.x);g?.setAttribute('x2',p.x);g?.setAttribute('visibility','visible');let t=tip;if(!t){t=document.createElement('div');t.id='bc-tip';t.className='bc-tip';t.setAttribute('role','status');document.body.appendChild(t)}t.innerHTML=`<b>${p.d.slice(5).replace('-','/')}</b>${p.r.map(([n,v,u])=>`<span>${n} <strong>${v}${u}</strong></span>`).join('')}`;t.hidden=false;const w=t.offsetWidth,h=t.offsetHeight;let x=event.clientX+14,y=event.clientY-h-14;if(x+w>innerWidth-8)x=event.clientX-w-14;if(y<8)y=event.clientY+18;t.style.left=x+'px';t.style.top=y+'px'});
$s.root.addEventListener('pointerleave',()=>{const t=document.getElementById('bc-tip');if(t)t.hidden=true},true);
// 러닝 평균 페이스(분/km) 바로 보여 주기
$s.root.addEventListener('input',event=>{if(!['q-t-min','q-t-km'].includes(event.target.id))return;const m=Number(document.getElementById('q-t-min')?.value),k=Number(document.getElementById('q-t-km')?.value),out=document.getElementById('q-t-pace');if(!out)return;if(m>0&&k>0){const p=m/k,mm=Math.floor(p),ss=Math.round((p-mm)*60);out.textContent=`평균 페이스 ${mm}'${String(ss).padStart(2,'0')}\" /km`}else out.textContent=''});
$s.root.addEventListener('change',async event=>{if(event.target.id!=='ai-photo')return;const files=[...(event.target.files||[])].slice(0,2);try{$s.aiInput.photos=await Promise.all(files.map(aiPhotoData));render()}catch(error){toast(error.message||'사진을 읽지 못했어요.')}});
// 4.26.0 새 음식 등록: 영양성분표 사진을 이 기기에서 글자로 읽어 값 채우기(서버로 보내지 않음)
$s.root.addEventListener('change',async event=>{if(event.target.id!=='reg-photo')return;const R=$s.quickMeal?.reg,file=event.target.files?.[0];if(!R||!file)return;R.ocrBusy=true;R.ocr='';render();try{const T=await getTesseract();const p=parseLabel(await recognizeLabel(file,T));if(p.count){applyLabel(R,p);R.ocr=`${p.count}가지 값을 읽었어요. 포장지와 한 번 비교해 확인해 주세요.`}else R.ocr='표에서 값을 읽지 못했어요. 밝은 곳에서 표만 반듯하게 다시 찍거나 직접 입력해 주세요.'}catch(e){R.ocr=e.message||'사진을 읽지 못했어요.'}finally{R.ocrBusy=false;render()}});
// AI 서버로 보낼 사진: 긴 변 1280px JPEG로 줄인다(요청 크기·비용 절약)
async function aiPhotoData(file){const url=URL.createObjectURL(file);try{const img=await new Promise((ok,no)=>{const i=new Image();i.onload=()=>ok(i);i.onerror=()=>no(Error('사진을 읽지 못했어요.'));i.src=url});const k=Math.min(1,1280/Math.max(img.width,img.height)),c=document.createElement('canvas');c.width=Math.round(img.width*k);c.height=Math.round(img.height*k);c.getContext('2d').drawImage(img,0,0,c.width,c.height);return c.toDataURL('image/jpeg',0.82).split(',')[1]}finally{URL.revokeObjectURL(url)}}
$s.root.addEventListener('input',event=>{if(event.target.id!=='ai-code')return;$s.aiInput.text=event.target.value;$s.aiInput.msg='';const p=document.getElementById('ai-in-preview');if(p)p.innerHTML=aiPreviewHTML($s.aiInput.text)+unitIssueHTML($s.aiInput.text)+uncertainHTML($s.aiInput.text)});
$s.root.addEventListener('input',event=>{if(event.target.dataset?.gmLevel&&$s.gymPick){const [id,k]=event.target.dataset.gmLevel.split('|');setSpec($s.gymPick,id,k,event.target.value);return}if(event.target.id!=='q-set-weight')return;const c=document.getElementById('q-set-conv');if(c)c.textContent=$s.quickWorkout?.unit==='level'?levelConvText(findMachine($s.db,$s.sharedCatalog,$s.quickWorkout.machineId,$s.quickWorkout),event.target.value):otherUnit(event.target.value,$s.quickWorkout?.unit||'kg')});
$s.root.addEventListener('keydown',event=>{if((event.key==='Enter'||event.key===' ')&&event.target.classList?.contains('brand-home')){event.preventDefault();event.target.click()}});
// 3.11.0 팝업 바깥(어두운 배경)을 누르면 닫기. 작성 중인 내용이 있으면 먼저 묻는다.
$s.root.addEventListener('input',event=>{const t=event.target;if(t.closest?.('.sheet')&&t.id!=='pf-photo'&&t.type!=='search'&&!/search/i.test(t.id||'')){$s.sheetDirty=true;$s.dirtyModal=$s.modal}},true);
// 3.16.3 종을 눌러 연 알림은 바깥을 누르면 닫힌다(자동으로 뜬 중요한 알림은 '나중에 확인'으로만 닫힘). 누른 곳의 원래 동작은 그대로 한다.
$s.root.addEventListener('click',event=>{if(!closesOnOutside($s.adminState,event.target))return;$s.adminState.open=false;$s.adminState.via='';document.querySelector('.admin-panel')?.remove()},true);
// 4.2.1 입력칸에서 드래그해 바깥에서 손을 떼도 창이 닫히지 않게: 누른 곳과 뗀 곳이 모두 바깥(배경)일 때만 닫는다
$s.downOnBackdrop=false;$s.root.addEventListener('pointerdown',e=>{$s.downOnBackdrop=e.target?.id==='backdrop'},true);
$s.root.addEventListener('click',event=>{if(event.target.id!=='backdrop'||!event.target.classList.contains('modal-backdrop'))return;if(!$s.downOnBackdrop){event.stopPropagation();return}event.stopPropagation();if($s.sheetDirty&&$s.dirtyModal===$s.modal&&!confirm('작성 중인 내용이 아직 저장되지 않았어요. 닫으면 지금 바꾼 내용이 사라져요. 닫을까요?'))return;$s.sheetDirty=false;const x=document.getElementById('close');if(x)x.click();else{$s.modal=null;render()}},true);
async function publishMachineRequest(id){const r=$s.catalogRequests.find(x=>x.id===id);if(!r||r.type!=='machine')return false;/* 4.7.0 헬스장 머신 한꺼번에 요청: 메모의 모델 id·헬스장 키로 바로 등록 */const gq=parseGymRequest(r.note);if(gq){/* 4.18.0 승인 때도 같은 머신이 이미 있으면 그걸로 */const same=String(gq.modelId).match(/^(gm|bm):/)?[]:findSameMachines(r.manufacturer,r.model,$s.sharedCatalog).filter(x=>x.id!==gq.modelId);if(same.length>1)throw Error(`같은 이름의 머신이 여러 라인이에요(${same.map(x=>x.line||x.name).join(' · ')}). 헬스장 머신 등록 화면에서 맞는 걸 골라 주세요.`);if(same.length===1)gq.modelId=same[0].id;if(gq.baseId&&!String(gq.modelId).match(/^(gm|bm):/)&&!($s.sharedCatalog.machineModels||[]).some(m=>m.id===gq.modelId))await saveSharedCatalogItem('machineModels',newModel(r.manufacturer,r.model,gq.baseId));await saveSharedCatalogItem('gymMachines',{id:gymMachineId(gq.gymKey,gq.modelId),name:`${r.gymName} · ${r.manufacturer==='일반 머신'?r.model:`${r.manufacturer} ${r.model}`}`.slice(0,160),gymName:r.gymName,gymKey:gq.gymKey,modelId:gq.modelId,...(gq.spec?{spec:gq.spec}:{})});return true}if(!r.manufacturer||!r.model)return false;const same=findSameMachines(r.manufacturer,r.model,$s.sharedCatalog);if(same.length>1)throw Error(`같은 이름의 머신이 여러 라인이에요(${same.map(x=>x.line||x.name).join(' · ')}). 헬스장 머신 등록 화면에서 맞는 걸 골라 주세요.`);const modelId=same[0]?.id||canonicalModelId(r.manufacturer,r.model),ex=findExerciseByName(r.name)||resolveExercise(r.name)||resolveExercise(r.model),baseId=ex?genericMachinesFor(ex.id)[0]?.id||'':'';/* 4.18.0 상위 머신 종류가 없는 머신은 공용 도감에 올리지 않는다 */if(!same.length&&!baseId)throw Error('이 머신이 어떤 머신 종류(예: 레그 프레스)인지 알 수 없어요. 헬스장 머신 등록 화면에서 종류를 골라 다시 등록해 주세요.');if(!same.length)await saveSharedCatalogItem('machineModels',{id:modelId,name:r.name||`${r.manufacturer} ${r.model}`,manufacturer:r.manufacturer,model:r.model,baseId,exerciseId:ex?.id||'',targetIds:r.targetIds||[]});if(r.gymName)await saveSharedCatalogItem('gymMachines',{id:gymMachineId(r.gymName,modelId),name:`${r.gymName} · ${r.manufacturer} ${r.model}`,gymName:r.gymName,modelId});return true}
// 4.17.0 그림 한 장 저장·공유(공유 창이 되면 공유, 아니면 파일 저장)
async function shareCanvas(c,name,title){const blob=await new Promise(r=>c.toBlob(r,'image/png'));if(!blob)throw Error('이미지를 만들지 못했어요.');const file=new File([blob],name,{type:'image/png'});if(navigator.canShare?.({files:[file]})){try{await navigator.share({files:[file],title});return}catch(e){if(e.name==='AbortError')return}}if(await downloadBlob(file.name,blob)===null)toast('카드 이미지를 저장했어요.')}
async function shareReportCard(){const c=drawShareCard(buildReport(actualDB($s.db),new Date(),{focus:$s.analysisExercise}));const blob=await new Promise(r=>c.toBlob(r,'image/png'));if(!blob)throw Error('이미지를 만들지 못했어요.');const file=new File([blob],`mylogue-report-${today().slice(0,7)}.png`,{type:'image/png'});if(navigator.canShare?.({files:[file]})){try{await navigator.share({files:[file],title:'마이로그 이번 달 리포트'});return}catch(e){if(e.name==='AbortError')return}}if(await downloadBlob(file.name,blob)===null)toast('리포트 카드 이미지를 저장했어요.')}
// 3.13.1 뒤로가기: 화면 이동·팝업 열기를 브라우저 기록에 남겨, 뒤로가기(웹·Android)로 팝업을 닫거나 이전 화면으로 간다.
$s.PAGES=['home','body','food','workout','analysis','calendar','settings','ai-inbox'];
function syncHistory(prevPage,prevModal){
 if(typeof history==='undefined'||typeof history.pushState!=='function')return;
 if($s.navFromPop){$s.navFromPop=false;return}
 const st=history.state||{};
 /* 4.18.1 운동 기록: 종목을 고르면 한 단계 더 쌓아, 뒤로가기(폰 버튼·스와이프·웹)로 종목 고르기로 돌아간다 */const qx=$s.modal==='quick-workout'&&!!$s.quickWorkout?.exerciseId;
 if(prevModal&&!$s.modal&&st.m){const steps=$s.qxPushed?2:1;$s.qxPushed=false;if($s.page!==prevPage)history.replaceState({p:$s.page},'',`#${$s.page}`);else{$s.ignorePop=true;history.go(-steps)}return}
 if($s.modal==='quick-workout'&&qx&&!$s.qxPushed&&prevModal){history.pushState({p:$s.page,m:1,qx:1},'');$s.qxPushed=true}
 if($s.modal==='quick-workout'&&!qx&&$s.qxPushed){$s.qxPushed=false;$s.ignorePop=true;history.back()}
 if(prevPage!==null&&$s.page!==prevPage){history.pushState({p:$s.page},'',`#${$s.page}`);setTimeout(()=>globalThis.scrollTo?.(0,0),0)}
 if(!prevModal&&$s.modal)history.pushState({p:$s.page,m:1},'');
}
if(typeof window!=='undefined'&&typeof window.addEventListener==='function'&&typeof history!=='undefined'&&history.replaceState){
 try{history.scrollRestoration='manual';history.replaceState({p:$s.page},'',location.hash&&$s.PAGES.includes(location.hash.slice(1))?location.hash:`#${$s.page}`)}catch{}
 window.addEventListener('popstate',e=>{
  if($s.ignorePop){$s.ignorePop=false;return}
  const st=e.state||{};
  if($s.modal==='quick-workout'&&$s.qxPushed&&$s.quickWorkout?.exerciseId){$s.qxPushed=false;const q=$s.quickWorkout;if(q.rest)cancelRestNotice();q.rest=null;q.next=null;q.exerciseId='';q.machineId='';q.editing=false;q.query='';$s.navFromPop=true;render();document.querySelector('.sheet')?.scrollTo?.({top:0});setTimeout(()=>{$s.navFromPop=false},0);return}
  if($s.modal){if($s.sheetDirty&&$s.dirtyModal===$s.modal&&!confirm('작성 중인 내용이 아직 저장되지 않았어요. 닫으면 지금 바꾼 내용이 사라져요. 닫을까요?')){history.pushState({p:$s.page,m:1},'');return}
   $s.sheetDirty=false;$s.navFromPop=true;const x=document.getElementById('close');if(x)x.click();else{$s.modal=null;render()}setTimeout(()=>{$s.navFromPop=false},0);return}
  const next=$s.PAGES.includes(st.p)?st.p:'home';
  if(next!==$s.page){$s.navFromPop=true;persistDraft();$s.page=next;render();globalThis.scrollTo?.(0,0);setTimeout(()=>{$s.navFromPop=false;globalThis.scrollTo?.(0,0)},0)}
 });
}
async function countPopularity(){if(cloudState.approval!=='approved')return;const key=scopedKey('mylogue.pop-counted');let done;try{done=new Set(JSON.parse(localStorage.getItem(key)||'[]'))}catch{done=new Set()}const since=new Date(Date.now()-30*86400000).toISOString().slice(0,10),entries=[],mark=[];
 /* 4.17.0 보안: 공개 음식 DB·공용 도감에 있는 이름만 올린다. DB를 아직 못 불러왔으면 식사는 다음에 센다 */const pubFood=new Set(catalogFoods().map(f=>f.name));for(const m of $s.db.meals||[]){if(done.has(m.id)||m.date<since)continue;if(!foodDBReady()&&!pubFood.has(m.name))continue;mark.push(m.id);if(pubFood.has(m.name)||isPublicFoodName(m.name))entries.push({kind:'foods',id:popId(m.name),name:m.name})}
 for(const w of $s.db.workouts||[]){if(done.has(w.id)||w.date<since)continue;mark.push(w.id);for(const e of w.exercises||[]){if(e.kind!=='cardio'&&!(e.sets||[]).some(x=>x.completed!==false))continue;if(!findExerciseByName(e.name)&&!EXERCISE_CATALOG.some(x=>x.id===e.exerciseId))continue;/* 직접 만든 종목 이름은 올리지 않음 */entries.push({kind:'exercises',id:popId(e.exerciseId||e.name),name:e.name});if(/^(gm|mm):/.test(e.machineId||''))entries.push({kind:'machines',id:popId(e.machineId),name:e.machineId})}}
 if(!mark.length)return;try{if(entries.length)await bumpPopularity(entries)}catch(e){console.warn(e);return}const all=[...done,...mark].slice(-4000);try{localStorage.setItem(key,JSON.stringify(all))}catch{}}
async function refreshPopularity(){if(cloudState.approval!=='approved')return;try{$s.popularity=await loadPopularity()}catch(e){console.warn('인기 집계를 불러오지 못했어요',e?.message)}}
function recordHint(){const pf=prefsOf($s.db);if(pf.hintShown||!pf.onboarded)return;if($s.db.body.length+$s.db.meals.length+$s.db.workouts.length<3)return;$s.db=save(withPrefs($s.db,{hintShown:true}));setTimeout(()=>toast('기록 방식이 불편하면 설정 › 나의 기록 방식에서 바꿀 수 있어요.'),1800)}


$s.header=()=>`<header class="header${$s.coach.headerClass()}"><div class="brand brand-home" data-page="home" role="link" tabindex="0" aria-label="마이로그 홈으로 · 오늘 ${haloProgress().done}/${haloProgress().total} 기록" title="오늘 ${haloProgress().done}/${haloProgress().total} 기록">${brandMarkHTML(haloProgress())}<div class="brand-words"><h1 class="brand-title">마이로그</h1><div class="brand-en">mylogue</div></div></div><div class="header-account">${noticeOn()?bellHTML(adminItems().length):''}${installChip()}${/* 4.18.0 대표님: 헤더의 '관리로그' 대신 프로필에 작은 '관리' 버튼. 관리 화면에 있을 때만 돌아가기 */$s.adminLogOK()&&$s.page==='adminlog'?`<button type="button" class="chip alog-chip active" data-page="home">마이로그로</button>`:''}${accountChip()}</div>${$s.coach.headerExtra()}</header>`;
$s.nav=()=>{const ci=$s.coach.navItems();if(ci)return `<nav class="nav coach-nav"><div class="nav-inner">${ci.map(([id,label,icon])=>`<button data-page="${id}" class="${$s.page===id?'active':''}${id==='coach-schedule'?' nav-special nav-home':id==='coach-send'?' nav-special nav-add':''}"><b>${brandIcon(icon,'',$s.page===id)}</b>${label}</button>`).join('')}</div></nav>`;const tr=prefsOf($s.db).tracks,need={body:'body',food:'meal',workout:'workout'};return `<nav class="nav"><div class="nav-inner">${[['body','수치'],['food','식단'],['workout','운동'],['home','홈'],['quick','추가'],['analysis','분석'],['calendar','일정'],['settings','설정']].filter(([id])=>!need[id]||tr.includes(need[id])).map(([id,label])=>id==='quick'?`<button data-modal="quick" class="nav-special nav-add" aria-label="빠른 기록"><b>${brandIcon('add','',true)}</b>${label}</button>`:`<button data-page="${id}" class="${$s.page===id?'active':''}${id==='home'?' nav-special nav-home':''}"><b>${brandIcon(id,'',$s.page===id)}</b>${label}</button>`).join('')}</div></nav>`};
// 4.17.0 코치 노트: 규칙 엔진의 안전·정보 신호 최대 2개(칭찬은 운동 화면에서). 오늘 날짜에만, 닫으면 그날은 숨김.



async function checkBridge(force=false){if(!cloudState.user||$s.aiBridge.checking)return;if(!force&&$s.aiBridge.checked&&Date.now()-($s.aiBridge.at||0)<15000)return;$s.aiBridge.checking=true;if($s.page==='settings')render();$s.aiBridge.status=await bridgeStatus($s.aiBridge.port);$s.aiBridge.checking=false;$s.aiBridge.checked=true;$s.aiBridge.at=Date.now();if($s.aiBridge.status?.paired&&$s.aiBridge.status.uid===cloudState.user.uid&&!prefsOf($s.db).aiLinked)$s.db=save(withPrefs($s.db,{aiLinked:true}));if($s.page==='settings')render()}


// 4.17.0 오늘 남은 걸로 뭐 먹지: 목표 - 오늘 먹은 양
function remainToday(){const s=$s.db.settings||{},kg=Number(s.calorieGoal)||0,pg=Number(s.proteinGoal)||(kg&&s.proteinPctGoal?Math.round(kg*s.proteinPctGoal/100/4):0),t=mealTotals(actualDB($s.db).meals.filter(m=>m.date===today()&&!m.planned));return {kcal:kg?kg-(t.calories||0):600,protein:pg?Math.max(0,pg-(t.protein||0)):30}}



// 4.4.1 점검 D-8: 분석에 들어가는 모든 값은 예정을 뺀 기록으로(입구 한 곳에서).
// 4.17.0 운동 일지 한 줄: 근력은 종목·세트·볼륨, 시간 운동은 분·거리·동작 수(0세트·0kg 같은 말 없이)
function diaryLine(w,t){const timed=(w.exercises||[]).filter(e=>e.kind==='cardio'),min=timed.reduce((a,e)=>a+(Number(e.durationMin)||0),0),km=timed.reduce((a,e)=>a+(Number(e.distanceKm)||0),0),moves=timed.reduce((a,e)=>a+((e.moves||[]).length),0),bits=[];if(t.sets)bits.push(`${t.exercises-timed.length}종목 · ${t.sets}세트 · ${$s.fmt(t.volume,0)} kg`);if(min)bits.push(`${$s.fmt(min,0)}분`);if(km)bits.push(`${$s.fmt(km,1)}km`);if(moves)bits.push(`동작 ${moves}개`);return bits.join(' · ')||`${t.exercises}종목`}
function phaseFormValues(){const f=document.getElementById('ph-form');if(!f)return {};const d=Object.fromEntries(new FormData(f)),answers={...($s.phaseWiz?.answers||{})};for(const [k,v] of Object.entries(d))if(!['weeks','start'].includes(k)&&v!=='')answers[k]=Number(v);return {answers,weeks:Number(d.weeks)||$s.phaseWiz?.weeks,start:d.start||''}}
function analysisPage(){const all=$s.db;$s.db=actualDB(all);try{return analysisPageInner()}finally{$s.db=all}}


/* 4.11.0 저장 보호: 로그인 없이 쓰면 기록이 이 기기에만 있다. 브라우저에 지워지지 않게 요청하고, 백업을 가끔 권한다. */
$s.storagePersisted=null;try{navigator.storage?.persisted?.().then(v=>{$s.storagePersisted=v;if(!v&&!$s.DEMO)return navigator.storage.persist?.().then(ok=>{$s.storagePersisted=!!ok})}).catch(()=>{})}catch{}
$s.lsNum=k=>{try{return Number(localStorage.getItem(scopedKey(k)))||0}catch{return 0}};

function pendingNoteHTML(){if($s.DEMO||!cloudState.user||cloudState.approval!=='pending')return '';return `<section class="section card pending-note"><h3>승인을 기다리는 중이에요</h3><p class="hint">그동안에도 모든 기록은 이 기기에 저장되고, AI 답 붙여넣기도 이 기기 검토함에서 쓸 수 있어요. 승인되면 앱이 알려 드리고, 그때부터 기기 간 동기화가 켜져요.</p><button type="button" class="button secondary small" id="cloud-approval-refresh">승인 상태 다시 보기</button></section>`}
function storageNoteHTML(){if(cloudState.user)return '';return `<p class="hint storage-note">이 기기에만 저장 중 · ${$s.storagePersisted?'브라우저가 기록을 지우지 않도록 보호되어 있어요':'브라우저 저장 공간이 부족하면 지워질 수 있어요'}. 백업 파일을 가끔 받아 두세요.</p>`}





function gymSettingsHTML(){return gymSettingsView($s.db,$s.gymSearch)}

$s.lastRenderedPage=null;
function render(){try{if(!$s.DEMO)syncWidget($s.db,$f.today())}catch{}if(showLanding({user:cloudState.user,db:$s.db,demo:$s.DEMO})){$s.root.innerHTML=landingHTML({returning:landingViewing()&&(hasRecords($s.db)||(()=>{try{return localStorage.getItem('mylogue.landing.skip')==='1'}catch{return false}})())});window.scrollTo?.(0,0);return}if(cloudState.user&&!consentOK($s.db.settings)&&consentOK({consent:cloudState.consent})){$s.db=save({...$s.db,settings:{...$s.db.settings,consent:{...cloudState.consent}}})}if(cloudState.user&&consentOK($s.db.settings)&&cloudState.consentLoaded&&(!consentOK({consent:cloudState.consent})||($s.db.settings.consent.items?.operator===true)!==(cloudState.consent?.items?.operator===true))&&!$s.consentUploadTried){$s.consentUploadTried=true;saveAccountConsent($s.db.settings.consent).catch(e=>console.warn('동의 기록 올리기 실패',e?.code||e))}/* 4.18.0 이 기기에서 이 계정으로 동의한 적이 있으면(같은 버전) 다시 묻지 않는다 */if(cloudState.user&&!consentOK($s.db.settings)&&deviceConsent(cloudState.user.uid)){const items=Object.fromEntries(CONSENT_ITEMS.map(([k])=>[k,!OPTIONAL_CONSENT.includes(k)]));$s.db=save({...$s.db,settings:{...$s.db.settings,consent:{version:CONSENT_VERSION,items,at:new Date().toISOString()}}})}if(cloudState.user&&consentOK($s.db.settings))deviceConsent(cloudState.user.uid,true);if(cloudState.user&&!consentOK($s.db.settings)){$s.root.innerHTML=consentHTML({name:cloudState.user.displayName||'',checked:$s.consentChecked,error:$s.consentError});return}try{adminAutoOpen()}catch(e){console.error(e)}syncWakeLock();document.getElementById('bc-tip')?.setAttribute('hidden','');const pageChanged=$s.lastRenderedPage!==$s.page,modalChanged=$s.renderedModal!==$s.modal;syncHistory($s.lastRenderedPage,$s.renderedModal);if(modalChanged&&$s.dirtyModal!==$s.modal){$s.sheetDirty=false;$s.dirtyModal=null}const oldSheet=document.querySelector?.('.sheet'),keep=$s.renderedModal===$s.modal&&!!$s.modal,scroll=keep?(oldSheet?.scrollTop||0):0,openDetails=keep?Array.from(oldSheet?.querySelectorAll?.('details')||[]).map(d=>d.open):[];persistDraft();$s.page=$s.coach.fixPage($s.page);$s.root.innerHTML=`${$s.DEMO?demoBannerHTML():''}<div class="shell">${$s.header()}<main class="${$s.page==='settings'?'settings-page':''}">${recoveryBanner()}${({home,body:bodyPage,food:foodPage,workout:workoutPage,analysis:analysisPage,calendar:calendarPage,settings:settingsPage,...Object.fromEntries(COACH_PAGES.map(p=>[p,()=>$s.coach.pageHTML(p)])),adminlog:adminLogPage,"ai-inbox":()=>renderAIInbox($s.aiDrafts,$s.db,{error:$s.aiDraftError,loading:$s.aiDraftLoading,local:localDraftMode()})}[$s.page]||home)()}${$s.page==='settings'?legalFooterHTML($s.db.settings?.consent):''}</main></div>${$s.nav()}${$s.panelOn()?panelHTML(adminItems(),(()=>{/* 4.18.0 남은 알림이 0건이면 창을 저절로 닫는다(처리 직후 '완료' 표시 중일 때는 그 뒤에) */const st=$s.adminState,left=adminItems().some(x=>!st.snoozed.has(x.key));if(!st.open)st.hadItems=false;else if(left)st.hadItems=true;else if(!st.done.length&&(st.hadItems||st.via!=='bell')){st.open=false;st.via='';st.hadItems=false}return st})()):''}${$s.modal==='quick'?`<div class="modal-backdrop" id="backdrop"><div class="sheet"><div class="sheet-head"><h2>무엇을 기록할까요?</h2><button class="close" id="close">×</button></div><div class="gap"><button class="ai-magic" data-modal="ai-input"><span class="ai-magic-glow" aria-hidden="true"></span><span class="ai-magic-icon" aria-hidden="true">✦</span><span class="ai-magic-text"><b>AI로 입력</b><small>말하듯 적으면 AI가 정리해요</small></span></button>${prefsOf($s.db).tracks.includes('body')?`<button class="button secondary add-rec" data-modal="body">${brandIcon('body','add-ico',true)}체중·인바디</button>`:''}${prefsOf($s.db).tracks.includes('meal')?`<button class="button secondary add-rec" data-modal="meal">${brandIcon('food','add-ico',true)}식단</button>`:''}${prefsOf($s.db).tracks.includes('workout')?`<button class="button secondary add-rec" data-modal="workout">${brandIcon('workout','add-ico',true)}운동</button>`:''}</div></div></div>`:modalHTML()}`;try{enhanceWhenInputs($s.root)}catch{}if($s.modal==='meal')mealPreview(document.getElementById('meal-form'),scaleNutrition);const newSheet=document.querySelector?.('.sheet');if(keep&&newSheet){Array.from(newSheet.querySelectorAll('details')).forEach((d,i)=>d.open=!!openDetails[i]);newSheet.scrollTop=scroll;globalThis.requestAnimationFrame?.(()=>{if(document.querySelector('.sheet')===newSheet)newSheet.scrollTop=scroll})}if(pageChanged)document.querySelector?.('main')?.classList.add('mlg-page-enter');if(modalChanged&&$s.modal)document.querySelector?.('.modal-backdrop')?.classList.add('mlg-modal-enter');$s.lastRenderedPage=$s.page;$s.renderedModal=$s.modal;if($s.scrollToPrefs&&$s.page==='settings'){$s.scrollToPrefs=false;document.getElementById('my-record-style')?.scrollIntoView({block:'start'})}if($s.page==='home')try{mountHalo(document.querySelector('.timeline-hero'),actualDB($s.db),$s.selectedDate)}catch(e){console.error(e)}if($s.modal==='gym-map')mountGymMap();else if($s.gymMapView||$s.gymMap){$s.gymMapView=null;$s.gymMapEl=null;$s.gymMap=null;clearTimeout($s.gymMapTimer)}}
// 4.27.0 전수검사 AA-01: APK(웹뷰)에서는 <a download>가 저장되지 않으므로 앱 전용 저장 플러그인으로 '다운로드/Mylogue'에 저장한다.
// 4.27.0 재검사 AA-01: 사진·카드 이미지(바이너리)도 Android에서는 저장 플러그인으로
function downloadBlob(name,blob){const C=globalThis.Capacitor;if(C?.getPlatform?.()==='android'&&C.isPluginAvailable?.('MylogueFileSave')){return new Promise((ok,no)=>{const r=new FileReader();r.onload=()=>ok(String(r.result).split(',')[1]||'');r.onerror=()=>no(Error('파일을 읽지 못했어요.'));r.readAsDataURL(blob)}).then(data=>C.Plugins.MylogueFileSave.save({name,data,base64:true,mime:blob.type||'application/octet-stream'})).then(r=>{toast(`저장했어요 · ${r?.path||name}`);return true}).catch(e=>{toast(e?.message||'파일을 저장하지 못했어요. 다시 시도해 주세요.');return false})}const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1500);return Promise.resolve(null)}
function download(name,data,type='application/json'){const C=globalThis.Capacitor;if(C?.getPlatform?.()==='android'&&C.isPluginAvailable?.('MylogueFileSave')){(typeof data==='string'?Promise.resolve(data):new Blob([data]).text()).then(text=>C.Plugins.MylogueFileSave.save({name,data:text,mime:type})).then(r=>toast(`저장했어요 · ${r?.path||name}`)).catch(e=>toast(e?.message||'파일을 저장하지 못했어요. 다시 시도해 주세요.'));return}const url=URL.createObjectURL(new Blob([data],{type}));const a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)}
function ocrFields(data){$s.ocrDraft=data;document.getElementById('ocr-fields').innerHTML=`<div class="form-grid">${[['date','측정일','date'],['weight','체중 kg','number'],['skeletalMuscle','골격근량 kg','number'],['bodyFatPct','체지방률 %','number'],['bodyFatMass','체지방량 kg','number'],['bmi','BMI','number'],['score','인바디 점수','number'],['visceralFatLevel','내장지방 레벨','number'],['bmr','기초대사량 kcal','number']].map(([key,label,type])=>`<label class="field">${label}<input data-ocr-field="${key}" type="${type}" step="any" value="${$s.esc(data[key]??(key==="date"?today():""))}"></label>`).join('')}<button class="button wide" id="ocr-save">원본과 확인한 수치 저장</button></div>`}
async function readFile(input){const file=input?.files?.[0];if(!file)throw Error('파일을 선택해 주세요.');return file.text()}
function quickFoodRow(item,qty){return {...item,servingQty:qty,servingUnit:item.servingUnit||'g'}}
function quickMachineFor(exerciseId,gymName){return ($s.db.machines||[]).find(m=>m.location===gymName&&m.exerciseId===exerciseId)}
function quickPreviousSet(exerciseId,machineId){for(const w of $s.recent($s.db.workouts))for(const e of w.exercises||[])if((e.exerciseId||e.name)===exerciseId&&(e.machineId||'')===(machineId||'')){const set=[...(e.sets||[])].reverse().find(s=>s.completed!==false);if(set)return set}return null}

// 4.12 상세 입력에서 음식 DB 검색(화면 전체를 다시 그리지 않고 결과만 바꿈)
function batchDbInput(t){if(t.id!=='batch-db-search')return false;const q=t.value,box=document.getElementById('batch-db-results');const draw=()=>{if(!box)return;box.innerHTML=q.trim()?searchFoodDB(q,{limit:12}).map(x=>`<button type="button" class="chip" data-batch-db="${$s.esc(x.id)}">${$s.esc(x.name)} <small>${x.calories==null?'':`${Math.round(x.calories)}kcal/${MASS.has(x.servingUnit)?'100'+$s.esc(x.servingUnit):$s.esc(unitLabel(1,x.servingUnit,x.unitGrams))}${x.dbDoubt?" · 확인 필요":""}`}</small></button>`).join('')||'<small class="hint">찾는 음식이 없어요</small>':''};if(foodDBReady())draw();else{if(box)box.innerHTML='<small class="hint">음식 DB를 불러오는 중이에요…</small>';loadFoodDB().then(draw).catch(e=>{if(box)box.textContent=e.message})}return true}

$s.root.addEventListener('click',async event=>{
 if(handleWhenClick(event.target))return;
 const target=event.target.closest('button,[data-page],[data-metric],[data-filter-part],[data-gm-pick]');if(!target)return;
 if(target.id==='hc-connect'||target.id==='hc-read'){await healthFlow(target.id==='hc-connect');return}
 {const id=target.id;if(['landing-login','landing-signup','landing-signup2','demo-signup'].includes(id)){if(id==='demo-signup')endDemo();try{await cloudLogin()}catch(e){toast(e.message||'로그인하지 못했어요.')}return}if(['landing-demo','landing-demo2','landing-demo3'].includes(id)){startDemo();location.reload();return}if(target.dataset?.persona&&!cloudState.user&&!$s.DEMO){startDemo(target.dataset.persona);location.reload();return}if(id==='landing-more'){document.querySelector('.ld-sec')?.scrollIntoView?.({behavior:'smooth',block:'start'});return}if(id==='landing-guest'||id==='landing-back'){skipLanding();closeLanding();$s.page='home';render();window.scrollTo?.(0,0);return}if(id==='landing-view'){closeLanding();viewLanding();render();return}if(id==='demo-exit'){endDemo();location.reload();return}if(id==='consent-agree'){if(!requiredChecked($s.consentChecked)){$s.consentError='필수 항목에 모두 동의해야 로그인해서 쓸 수 있어요.';render();return}const rec=consentRecord($s.consentChecked);$s.db=save({...$s.db,settings:{...$s.db.settings,consent:rec}});$s.consentUploadTried=true;saveAccountConsent(rec).catch(e=>console.warn('동의 기록 올리기 실패',e?.code||e));$s.consentError='';render();toast('동의를 저장했어요. 이제 기록을 시작해요.');return}if(id==='operator-notice-keep'){const c=$s.db.settings?.consent;if(!c)return;const rec={...c,items:{...c.items,optAware:true}};if(cloudState.user){try{await saveAccountConsent(rec)}catch(e){console.warn('동의 기록 올리기 실패',e?.code||e)}}$s.db=save({...$s.db,settings:{...$s.db.settings,consent:rec}});render();toast('지금처럼 동의를 유지해요. 설정 맨 아래에서 언제든 바꿀 수 있어요.');return}if(id==='notice-dismiss'){dismissNotice(target.dataset.noticeId);$s.notice=null;render();return}if(id==='errlog-clear'){clearErrors();render();toast('오류 기록을 지웠어요.');return}if(id==='consent-operator-toggle'){/* 4.27.0 재검사 N-4: 서버(규칙이 보는 값)에 먼저 저장하고, 성공했을 때만 화면을 바꾼다 */const c=$s.db.settings?.consent;if(!c)return;const rec={...c,items:{...c.items,operator:c.items?.operator!==true,optAware:true},at:new Date().toISOString()};if(cloudState.user){try{if(!await saveAccountConsent(rec))throw Error('로그인 확인 실패')}catch(e){console.warn('동의 기록 올리기 실패',e?.code||e);toast('서버에 저장하지 못해 바꾸지 않았어요. 인터넷 연결을 확인하고 다시 눌러 주세요.');return}}$s.db=save({...$s.db,settings:{...$s.db.settings,consent:rec}});render();toast(rec.items.operator?'운영자 열람에 동의했어요.':'운영자 열람 동의를 철회했어요. 운영자는 이제 내 기록을 볼 수 없어요.');return}if(id==='consent-decline'){try{await cloudLogout()}catch(e){toast(e.message||String(e))}return}}
 try{
  if(!target.dataset.page&&$s.coach.visible()&&await $s.coach.click(target))return;
  if(target.dataset.fc){const before=$s.db;$s.db=save(applyFoodFix($s.db,target.dataset.fc));render();toastUndo(target.dataset.fc.endsWith(':ok')?'그대로 둘게요.':'그 기록만 고쳤어요.',()=>{$s.db=save(before);render()});return}
  if(target.dataset.prMuscle!==undefined){$s.prMuscle=target.dataset.prMuscle;render();return}
  if(target.dataset.wfMetric){$s.wfMetric=target.dataset.wfMetric;render();return}
  if(target.dataset.bfView){$s.bfView=target.dataset.bfView;render();return}
  if(target.dataset.goalWeightOpen!==undefined){const f=document.getElementById('goal-weight-form');if(f){f.hidden=!f.hidden;f.querySelector('input')?.focus()}return}
  if(target.dataset.dfMetric){$s.dfMetric=target.dataset.dfMetric;render();return}
  if(target.dataset.dfPeriod){$s.dfPeriod=Number(target.dataset.dfPeriod);render();return}
  {const r=dateBarClick(target,{date:$s.selectedDate,today:today(),open:$s.dbOpen,month:$s.dbMonth});if(r){if(r.date)$s.selectedDate=r.date;$s.dbOpen=!!r.open;$s.dbMonth=r.month??$s.dbMonth;render();return}}
  if($s.backupBusy){toast('백업·복원이 진행 중입니다. 완료될 때까지 기다려 주세요.');return}
  if(target.id==='close'&&$s.sheetDirty&&!confirm('작성 중인 내용이 아직 저장되지 않았어요. 닫으면 지금 바꾼 내용이 사라져요. 닫을까요?'))return;
  if(target.id==='close')$s.sheetDirty=false;
  if(getStorageStatus().blocked&&!target.dataset.page&&!['cloud-logout','cloud-archive-export','cloud-conflicts-export','recovery-export','retry-recovery','restore-preview','restore-confirm','close','draft-export','draft-archive-export'].includes(target.id)&&target.dataset.modal!=='restore')throw Error('기존 기록 보호를 위해 복구가 필요합니다.');
  if(['workEdit','program','reload','routine'].some(k=>target.dataset[k]!==undefined)||(target.id==='codex-confirm'&&$s.codexDraft?.kind==='workouts')){const pending=readSession();if(pending?.exercises?.some(e=>e.name)&&!confirm('작성 중인 임시 운동이 있습니다. 새로 선택한 운동으로 교체할까요? 취소하면 기존 초안을 유지합니다.'))return;clearSession();$s.savedDraft=null}
  if(target.dataset.page){persistDraft();$s.dbOpen=false;if(target.dataset.page==='body'&&$s.page!=='body'){$s.bodyMetric='overview';$s.inbodyUnit='kg'}$s.page=target.dataset.page;$s.modal=null;render();globalThis.scrollTo?.(0,0);if(target.dataset.scrollTo)setTimeout(()=>document.getElementById(target.dataset.scrollTo)?.scrollIntoView({block:'start'}),60);if($s.page==='settings'){refreshApplicants().catch(console.error);checkBridge().catch(console.error)}if($s.page==='ai-inbox')refreshAIDrafts().catch(console.error);return}
  if(target.id==='ai-inbox-refresh'){await refreshAIDrafts();return}
  if(target.dataset.aiQuick){const draft=$s.aiDrafts.find(x=>x.id===target.dataset.aiQuick);if(!draft)return;target.disabled=true;await aiConfirmMany([draft]);return}
  if(target.id==='ai-bulk-confirm'||target.id==='ai-bulk-reject'){const ids=[...document.querySelectorAll('[data-ai-pick]:checked')].map(x=>x.dataset.aiPick),list=$s.aiDrafts.filter(d=>ids.includes(d.id));if(!list.length)return;if(target.id==='ai-bulk-confirm'){if(!confirm(`선택한 초안 ${list.length}건을 내용 그대로 확정할까요?`))return;target.disabled=true;await aiConfirmMany(list)}else{if(!confirm(`선택한 초안 ${list.length}건을 버릴까요? 되돌릴 수 없어요.`))return;target.disabled=true;let ok=0;for(const d of list){try{await resolveAIDraft(d,{action:'reject'});ok++}catch(e){console.error(e)}}await refreshAIDrafts();toast(`${ok}건 버렸어요.${ok<list.length?` ${list.length-ok}건은 실패했어요.`:''}`)}return}
  if(target.dataset.aiReject){const draft=$s.aiDrafts.find(x=>x.id===target.dataset.aiReject);if(!draft)return;if(!confirm('이 AI 초안을 버릴까요?'))return;await resolveAIDraft(draft,{action:'reject'});await refreshAIDrafts();toast('초안을 버렸습니다.');return}
  if(target.dataset.period){$s.period=Number(target.dataset.period);render();return}
  if(target.dataset.inbodyUnit){$s.inbodyUnit=target.dataset.inbodyUnit;render();return}
  if(target.dataset.mpMode){const [k,m]=target.dataset.mpMode.split(':');const def={ratio:30,perKg:k==='protein'?2:k==='carbs'?3:1,grams:k==='protein'?150:k==='carbs'?250:60,rest:1}[m];$s.mpPlan.rules[k]={mode:m,value:def};autoRest($s.mpPlan,k);render();return}
  if(target.dataset.mpFix){applyFix($s.mpPlan,target.dataset.mpFix);render();return}
  if(target.dataset.mpPreset){const p=PRESETS.find(x=>x.id===target.dataset.mpPreset);if(p){$s.mpPlan={...$s.mpPlan,rules:structuredClone(p.rules)};render()}return}
  if(target.dataset.planCat){$s.planDraft={...$s.planDraft,...$s.readSchedForm(),cat:target.dataset.planCat,parts:target.dataset.planCat==='웨이트'?$s.planDraft.parts:[]};render();return}
  if(target.dataset.planPart){const p=target.dataset.planPart,ps=$s.planDraft.parts||[];$s.planDraft={...$s.planDraft,...$s.readSchedForm(),parts:ps.includes(p)?ps.filter(x=>x!==p):[...ps,p]};render();return}
  if(target.dataset.placeToggle!==undefined){$s.placeFormOpen=!$s.placeFormOpen;render();return}
  if(target.dataset.setDone){const [id,i,j]=target.dataset.setDone.split(':');$s.db=save({...$s.db,workouts:$s.db.workouts.map(w=>{if(w.id!==id)return w;const x=structuredClone(w),st=x.exercises[Number(i)]?.sets?.[Number(j)];if(st)st.done=!st.done;return x})});render();return}
  if(target.dataset.planRecord){const w=$s.db.workouts.find(x=>x.id===target.dataset.planRecord);if(!w)return;$s.quickWorkout=emptyQuickWorkout(w.date,$s.db.settings.gyms||[],$s.db);$s.quickWorkout.title=w.title||'';$s.quickWorkout.fromPlan=w.id;$s.modal='quick-workout';render();return}
  if(target.dataset.planToggle!==undefined){$s.showPlanned=!$s.showPlanned;try{localStorage.setItem('mylogue.showPlanned',$s.showPlanned?'1':'0')}catch{}render();return}
  if(target.dataset.planConfirm){confirmPlanned(target.dataset.planConfirm);return}
  if(target.dataset.wstep){const i=document.querySelector('#body-form [name="weight"]');if(!i)return;const v=Math.max(20,Math.round(((Number(i.value)||$s.lastScaleW()||60)+Number(target.dataset.wstep))*10)/10);i.value=v.toFixed(1);const o=document.getElementById('w-pad-val');if(o)o.textContent=v.toFixed(1);$s.sheetDirty=true;$s.dirtyModal=$s.modal;return}
  if(target.dataset.gymMachines!==undefined){if(cloudState.approval!=='approved')throw Error('로그인하고 승인된 뒤에 헬스장 머신을 등록할 수 있어요.');const name=$s.db.settings.gyms?.[Number(target.dataset.gymMachines)];if(!name)return;$s.gymPick=newGymPicker($s.sharedCatalog,$s.db.settings,name);$s.gymPick.newModels=new Map();$s.modal='gym-machines';render();return}
  if(target.dataset.gmPart&&$s.gymPick){$s.gymPick.part=target.dataset.gmPart;render();return}
  if(target.dataset.gmOpen&&$s.gymPick){$s.gymPick.open[target.dataset.gmOpen]=!($s.gymPick.open[target.dataset.gmOpen]??false);render();return}
  if(target.dataset.gmPick&&$s.gymPick){const id=target.dataset.gmPick,on=target.checked===undefined?!$s.gymPick.checked.has(id):target.checked;if(!isCatalogAdmin(cloudState.user)&&$s.gymPick.initial.has(id)){toast('이미 등록된 머신이에요. 빼거나 바꾸려면 운영진에게 알려 주세요.');render();return}pickMachine($s.gymPick,$s.sharedCatalog,id,on);render();return}
  if(target.dataset.gmSpec&&$s.gymPick){const [id,k,v]=target.dataset.gmSpec.split('|');setSpec($s.gymPick,id,k,v);render();return}
  if(target.id==='gm-new-add'&&$s.gymPick){const m=newModel(document.getElementById('gm-new-maker')?.value,document.getElementById('gm-new-model')?.value,document.getElementById('gm-new-base')?.value,$s.sharedCatalog);/* 4.18.0 이미 있는 머신이면 새로 만들지 않고 그것을 고른다(라인이 여럿이면 펼쳐서 고르게) */if(m.existing){const ex=m.existing;for(const x of ex)if(x.baseId)$s.gymPick.open[x.baseId]=true;const g=GENERIC_MACHINES.find(g=>g.id===ex[0].baseId);if(g)$s.gymPick.part=EXERCISE_CATALOG.find(x=>x.name===g.exercise)?.part||$s.gymPick.part;if(ex.length===1)pickMachine($s.gymPick,$s.sharedCatalog,ex[0].id,true);$s.gymPick.adding=false;render();toast(ex.length===1?`이미 있는 머신이에요: ${ex[0].name}. 새로 만들지 않고 그걸 골랐어요.`:`이미 있는 머신이에요(${ex.map(x=>x.line||x.name).join(' · ')}). 펼친 목록에서 맞는 걸 골라 주세요.`);return}$s.gymPick.newModels.set(m.id,m);$s.sharedCatalog={...$s.sharedCatalog,machineModels:[...($s.sharedCatalog.machineModels||[]).filter(x=>x.id!==m.id),{...m,localOnly:true}]};pickMachine($s.gymPick,$s.sharedCatalog,m.id,true);$s.gymPick.adding=false;render();toast(`${m.name}을(를) 더하고 골랐어요.`);return}
  if(target.id==='gm-save'&&$s.gymPick){const admin=isCatalogAdmin(cloudState.user);if(admin){const {add,remove}=gymChanges($s.gymPick,$s.sharedCatalog);for(const m of $s.gymPick.newModels.values())if($s.gymPick.checked.has(m.id))await saveSharedCatalogItem('machineModels',m);for(const x of [...add,...remove])await saveSharedCatalogItem('gymMachines',x);await refreshCatalog();const n=add.length,r=remove.length;$s.gymPick=null;$s.modal=null;render();toast(`저장했어요${n?` · 새로 ${n}개`:''}${r?` · 뺌 ${r}개`:''}. 이 헬스장을 쓰는 모든 사람의 운동 기록에 바로 보여요.`)}else{const reqs=gymRequests($s.gymPick,$s.sharedCatalog),q=requestQuota();if(reqs.length>MAX_PER_SEND)throw Error(`한 번에 ${MAX_PER_SEND}개까지 보낼 수 있어요.`);if(reqs.length>q.left)throw Error(`오늘은 ${q.left}개 더 보낼 수 있어요. 나머지는 내일 보내 주세요.`);let ok=0,dup=0,fail=0;for(const r of reqs){const p=parseGymRequest(r.note);try{await submitCatalogRequest(r,{},{id:gymRequestId(p.gymKey,p.modelId)});ok++}catch(e){if(/permission|insufficient|PERMISSION/i.test(String(e?.code||e?.message)))dup++;else{fail++;console.error(e)}}}useQuota(ok);$s.gymPick=null;$s.modal=null;await refreshCatalog();render();toast(`${ok?`머신 ${ok}개 등록 요청을 보냈어요. `:''}${dup?`${dup}개는 다른 분이 이미 요청해서 건너뛰었어요. `:''}${fail?`${fail}개는 보내지 못했어요.`:''}`||'보낼 머신이 없어요.')}return}
  if(target.id==='gm-approve-all'){if(!isCatalogAdmin(cloudState.user))return;const list=$s.catalogRequests.filter(r=>(r.status==='pending'||r.status==='in_review')&&parseGymRequest(r.note));let ok=0;for(const r of list){try{await reviewCatalogRequest(r.id,{status:'approved',note:'헬스장 머신 일괄 승인'});await publishMachineRequest(r.id);ok++}catch(e){console.error(e)}}await refreshCatalog();render();toast(`헬스장 머신 요청 ${ok}개를 승인했어요.`);return}
  if(target.dataset.trashRestore){const item=takeFromTrash($s.TRASH(),target.dataset.trashRestore);if(!item){toast('이미 되살렸거나 보관 기간이 지났어요.');render();return}const r=restoreInto($s.db,item);$s.db=save(r.db);render();toast(r.count?`${r.count}개를 되살렸어요.`:'이미 기록에 있어요.');return}
  if(target.id==='trash-empty'){if(!confirm('휴지통을 비울까요? 비우면 되살릴 수 없어요.'))return;emptyTrash($s.TRASH());render();toast('휴지통을 비웠어요.');return}
  if($s.page==='adminlog'&&Object.keys(target.dataset).some(k=>k.startsWith('alog'))){const r=document.getElementById('alog-reason');if(r)$s.alog.reason=r.value;const ds=target.dataset;
   if(ds.alogRefresh!==undefined){$s.alog.users=[];alogLoadUsers();return}
   if(ds.alogOpen){alogOpen(ds.alogOpen);return}
   if(ds.alogBack!==undefined){$s.alog={...emptyAdminLog(),users:$s.alog.users,viewed:$s.alog.viewed,reason:$s.alog.reason};render();return}
   if(ds.alogDate){$s.alog.date=ds.alogDate;$s.alog.edit=null;$s.alog.add=null;render();return}
   if(ds.alogStep){const d=new Date(`${$s.alog.date||today()}T12:00:00`);d.setDate(d.getDate()+Number(ds.alogStep));$s.alog.date=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;$s.alog.edit=null;$s.alog.add=null;render();return}
   if(ds.alogEdit){const rec=$s.alog.data?.records?.[ds.alogEdit];let text=rec?.payload||'';try{text=JSON.stringify(JSON.parse(text),null,2)}catch{}$s.alog.edit={key:ds.alogEdit,text};$s.alog.add=null;render();return}
   if(ds.alogCancel!==undefined){$s.alog.edit=null;$s.alog.add=null;render();return}
   if(ds.alogSave!==undefined&&$s.alog.edit){const text=document.getElementById('alog-edit-text')?.value||'';$s.alog.edit.text=text;const payload=validatePayload($s.alog.edit.key,text);if(!confirm('이 기록을 수정할까요? 접근 기록에 남고 회원이 볼 수 있어요.'))return;await alogWrite($s.alog.edit.key,payload,'update');return}
   if(ds.alogDel){if(!confirm('이 기록을 삭제할까요? (삭제 표시로 남고, 고치기 전 내용은 접근 기록에 저장돼요)'))return;await alogWrite(ds.alogDel,null,'delete');return}
   if(ds.alogAdd){$s.alog.add={kind:ds.alogAdd};$s.alog.edit=null;render();return}
   if(ds.alogAddsave!==undefined&&$s.alog.add){const v=id=>document.getElementById(id)?.value??'';const date=$s.alog.date||today();const r=$s.alog.add.kind==='meals'?newMeal(date,{name:v('alog-a-name'),slot:v('alog-a-slot'),qty:v('alog-a-qty'),unit:v('alog-a-unit'),kcal:v('alog-a-kcal'),carbs:v('alog-a-carbs'),protein:v('alog-a-protein'),fat:v('alog-a-fat')}):newBody(date,{weight:v('alog-a-weight'),bf:v('alog-a-bf'),smm:v('alog-a-smm')});await alogWrite(r.key,r.payload,'create');return}
   if(ds.alogLog!==undefined){$s.alog.log=await adminAccessLog($s.alog.uid);render();return}
   return}
  if(target.dataset.coachNoteHide!==undefined){try{localStorage.setItem(scopedKey('mylogue.coachNoteHidden'),today())}catch{}render();return}
  if(target.dataset.weekGoal!==undefined){$s.weekGoalOpen=!$s.weekGoalOpen;render();return}
  if(target.dataset.weekGoalSet){$s.db=save({...$s.db,settings:{...$s.db.settings,weeklyWorkoutGoal:Number(target.dataset.weekGoalSet)}});$s.weekGoalOpen=false;render();toast(`주 ${target.dataset.weekGoalSet}회로 정했어요. 채우지 못해도 괜찮아요.`);return}
  if(target.dataset.bot){const act=target.dataset.bot,info=backOnTrack($s.db,today());const form=document.getElementById('bot-form');if(form&&$s.bot)$s.bot=readBotForm(form,$s.bot);
   if(act==='fill'){if(!info)return;$s.bot={...initialFill(info),today:today()};$s.modal='bot-fill';render();return}
   if(act==='skip'){if(info)$s.setBotState({last:info.last,choice:'skip'});render();toast('비워 둘게요. 오늘부터 이어 가요.');return}
   if(act==='parse'&&$s.bot){const parsed=parseRecall($s.bot.recall,$s.bot.dates,today());if(!Object.keys(parsed).length){toast('날짜를 찾지 못했어요. "화요일 점심 김치찌개"처럼 요일이나 날짜를 붙여 주세요.');render();return}$s.bot=mergeRecall($s.bot,parsed);render();toast('날짜별로 나눠 넣었어요. 확인하고 저장해 주세요.');return}
   if(act==='more'&&$s.bot){const v=document.getElementById('bot-more-date')?.value;if(!v||v>=today()){toast('지난 날짜를 골라 주세요.');return}if(!$s.bot.dates.includes(v)){$s.bot={...$s.bot,dates:[...$s.bot.dates,v].sort().reverse(),values:{...$s.bot.values,[v]:{meal:'',work:'',weight:'',rest:false}},open:v}}render();return}
   return}
  if(target.dataset.motiv){if(target.dataset.motiv==='hide'){hideToday();$s.motivOpen=false}else $s.motivOpen=!$s.motivOpen;render();return}
  if(target.id==='ai-copy-prompt'){navigator.clipboard?.writeText(fullPrompt($s.db)).then(()=>toast('지시문과 내 최근 기록 목록을 복사했어요. 쓰는 AI 대화창에 붙여넣어 주세요.')).catch(()=>toast('복사하지 못했어요. 아래 “지시문 내용 보기”를 길게 눌러 복사해 주세요.'));return}
  if(target.id==='ai-paste-clip'){navigator.clipboard?.readText?.().then(text=>{$s.aiInput.text=text||'';$s.aiInput.msg='';render()}).catch(()=>toast('클립보드를 읽지 못했어요. 칸을 길게 눌러 붙여넣어 주세요.'));return}
  if(target.id==='ai-photo-clear'){$s.aiInput.photos=[];render();return}
  if(target.id==='ai-ask'){if($s.aiInput.asking)return;const say=String($s.aiInput.say||'').trim();if(!say&&!($s.aiInput.photos||[]).length){toast('먹은 것·운동·체중을 적거나 사진을 넣어 주세요.');return}$s.aiInput.asking=true;$s.aiInput.msg='';render();const d=new Date();aiRequest('parse',{text:say,images:($s.aiInput.photos||[]).map(data=>({media_type:'image/jpeg',data})),context:aiContextText($s.db),today:today(),now:`${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`}).then(r=>{$s.aiInput={...$s.aiInput,text:r.text,left:r.left,asking:false,msg:r.text.trim()?'':'AI가 기록할 내용을 찾지 못했어요.'};render()}).catch(error=>{$s.aiInput.asking=false;$s.aiInput.msg=error.message||'AI 정리에 실패했어요.';render()});return}
  if(target.dataset.phType){$s.phaseWiz={...newPhaseWizard($s.db,target.dataset.phType)};render();return}
  if(target.dataset.phWeeks&&$s.phaseWiz){$s.phaseWiz={...$s.phaseWiz,...phaseFormValues(),weeks:Number(target.dataset.phWeeks)};render();return}
  if(target.id==='ph-back'){$s.phaseWiz={...newPhaseWizard($s.db),type:$s.phaseWiz?.type||''};render();return}
  if(target.id==='ph-new'){$s.phaseWiz=newPhaseWizard($s.db);render();return}
  if(target.id==='ph-end'){const st=phaseStatus($s.db,today());if(!st)return;const recap=phaseRecap(actualDB($s.db),st.phase,today());$s.db=save({...$s.db,settings:endPhase($s.db.settings,recap,today())});$s.phaseWiz={step:'recap',recap};render();return}
  if(target.id==='ph-after-recap'){$s.phaseWiz=newPhaseWizard($s.db);render();return}
  if(target.id==='ph-close'){$s.phaseWiz=null;$s.modal=null;render();return}
  if(target.dataset.lastweekHide){try{localStorage.setItem(scopedKey('mylogue.lastWeekHide'),target.dataset.lastweekHide)}catch{}render();return}
  if(target.dataset.persona&&$s.DEMO){switchDemoPersona(target.dataset.persona);location.reload();return}
  if(target.dataset.expStart){try{$s.db=save({...$s.db,settings:startExperiment($s.db.settings,target.dataset.expStart,today(),{limit:planAllowance('experiment')})});toast('2주 실험을 시작했어요. 평소처럼 기록만 하면 돼요.')}catch(e){toast(e.message)}render();return}
  if(target.dataset.expStop){$s.db=save({...$s.db,settings:stopExperiment($s.db.settings,target.dataset.expStop,today())});render();return}
  if(target.dataset.expFinish){$s.db=save({...$s.db,settings:finishExperiment($s.db.settings,target.dataset.expFinish,today())});toast('결과를 보관했어요.');render();return}
  for(const k of ['goal','level','days','place','minutes']){const v=target.dataset['pb'+k[0].toUpperCase()+k.slice(1)];if(v!=null){$s.pbSt[k]=['days','minutes'].includes(k)?Number(v):v;render();return}}
  if(target.id==='pb-save'){const rs=programRoutines(buildProgram($s.pbSt),uid);$s.db=save({...$s.db,routines:[...($s.db.routines||[]),...rs]});toast(`루틴 ${rs.length}개를 저장했어요. '저장된 루틴'에서 시작하면 돼요.`);render();return}
  if(target.dataset.shareCard){const kind=target.dataset.shareCard,hide=!!target.dataset.shareHide;try{if(kind==='phase'){const r=$s.phaseWiz?.recap||($s.db.settings.phaseHistory||[]).at(-1)?.recap;if(!r)return toast('회고가 없어요.');await shareCanvas(drawStoryCard({title:`${r.type} 페이즈를 마쳤어요`,sub:`${r.start} ~ ${r.end}`,lines:storyLines('phase',r),hideBody:hide}),`mylogue-phase-${r.end}.png`,'마이로그 페이즈 회고')}else{const r=yearRecap(actualDB($s.db),today(),firstTimes);if(!r)return;await shareCanvas(drawStoryCard({title:`${r.year}년, ${r.days}일 움직였어요`,sub:`${r.year}년 돌아보기`,lines:storyLines('year',r),hideBody:hide}),`mylogue-${r.year}.png`,'마이로그 올해 돌아보기')}}catch(e){toast(e.message)}return}
  if(target.dataset.simKcal!=null){$s.simSt.kcal=Number(target.dataset.simKcal);render();return}
  if(target.dataset.simWorkouts!=null){$s.simSt.workouts=Number(target.dataset.simWorkouts);render();return}
  if(target.dataset.simWeeks!=null){$s.simSt.weeks=Number(target.dataset.simWeeks);render();return}
  if(target.dataset.sit){$s.sitSt.sit=$s.sitSt.sit===target.dataset.sit?'':target.dataset.sit;render();return}
  if(target.dataset.wteMood){$s.wte.mood=target.dataset.wteMood;render();return}
  if(target.dataset.wtePlace){$s.wte.place=target.dataset.wtePlace;render();return}
  if(target.dataset.wteAdd!=null){const x=($s.wte.results||[])[Number(target.dataset.wteAdd)];if(!x)return;const food=findFoodDB(`fooddb:${x.row[8]}:${x.row[1]}|${x.row[0]}|${x.row[2]}`);if(!food)return toast('음식을 찾지 못했어요.');$s.modal='quick-meal';$s.quickMeal=emptyQuickMeal(today(),new Date().toTimeString().slice(0,5));$s.quickMeal.picked=structuredClone(food);$s.quickMeal.share=1;$s.quickMeal.editIndex=-1;$s.quickMeal.usual=usualQty($s.db.meals,food.name,food.servingUnit);$s.quickMeal.qty=MASS.has(food.servingUnit)?Math.round(x.qty):x.factor;$s.quickMeal.gramOptions=[100,200,250,300];render();return}
  if(target.dataset.planView){setAdminView(target.dataset.planView);toast(target.dataset.planView==='plus'?'플러스 사용자 기준으로 보고 있어요.':'일반 사용자 기준으로 보고 있어요.');render();return}
  if(target.id==='plan-fake-ai'){setFakeAI(target.getAttribute('aria-pressed')!=='true');render();return}
  if(target.id==='plan-ai-check'){aiRequest('me').then(r=>{$s.aiMe=r;render()}).catch(error=>toast(error.message));return}
  if(target.id==='ai-review-run'){if($s.aiCoach.busy)return;$s.aiCoach={...$s.aiCoach,busy:'review',msg:''};render();aiRequest('review',{summary:weekSummaryText(actualDB($s.db),today())}).then(r=>{$s.aiCoach={...$s.aiCoach,busy:'',review:String(r.text||''),left:r.left??$s.aiCoach.left};render()}).catch(error=>{$s.aiCoach={...$s.aiCoach,busy:'',msg:error.message};render()});return}
  if(target.id==='ai-recipe-open'){$s.aiRecipe={text:'',busy:false,msg:'',match:null};$s.modal='ai-recipe';render();return}
  if(target.id==='ai-recipe-save'){const m=$s.aiRecipe.match;if(!m)return;$s.db=save({...$s.db,foods:upsertFoodPreset($s.db.foods||[],recipeFoodPreset(m))});toast(`'${m.name}' 1인분을 내 음식에 저장했어요.`);$s.modal=null;render();return}
  if(target.id==='ai-code-clear'){$s.aiInput={text:'',msg:'',busy:false};$s.sheetDirty=false;render();return}
  if(target.id==='ai-send'){if($s.aiInput.busy)return;let drafts;try{drafts=parsePaste($s.aiInput.text)}catch(error){$s.aiInput.msg=error.message;render();return}$s.aiInput.busy=true;render();addPastedDrafts(drafts).then(async r=>{$s.aiInput={text:'',msg:'',busy:false};$s.sheetDirty=false;$s.modal=null;$s.page='ai-inbox';await refreshAIDrafts();globalThis.scrollTo?.(0,0);toast(r.added?`검토함에 ${r.added}건 넣었어요${r.duplicate?` · ${r.duplicate}건은 이미 있어요`:''}. 확인하고 확정해 주세요.`:'이미 검토함에 있는 기록이에요.')}).catch(error=>{$s.aiInput.busy=false;$s.aiInput.msg=error.message||'검토함에 넣지 못했어요.';render()});return}
  if(target.dataset.modal==='phase'){$s.phaseWiz=phaseStatus($s.db,today())?{step:'view'}:newPhaseWizard($s.db);$s.modal='phase';render();return}
  if(target.dataset.modal){persistDraft();if(target.dataset.modal==='macro-plan')$s.mpPlan=null;$s.bodyEditId=null;$s.bodyPreset=null;const requested=target.dataset.modal;const pf=prefsOf($s.db);let quick=requested==='batch'||requested==='meal'?'quick-meal':requested==='workout'?'quick-workout':requested;if(requested==='workout'&&effectiveWorkoutMode(pf)==='after'){quick='after-workout';$s.afterWorkout=emptyAfterWorkout($s.selectedDate,($s.db.settings.gyms||[])[0]||'')}if(requested==='workout'&&effectiveWorkoutMode(pf)==='guide'){if($s.guideRun&&$s.guideRun.phase!=='done')quick='guide-run';else{quick='guide-plan';$s.guidePlan=emptyPlan($s.selectedDate,($s.db.settings.gyms||[])[0]||'',pf.restSec)}}if((requested==='batch'||requested==='meal')&&effectiveMealMode(pf)==='simple')quick='simple-meal';if(quick==='quick-meal')$s.quickMeal=emptyQuickMeal($s.selectedDate,new Date().toTimeString().slice(0,5));if(quick==='quick-workout'&&(!$s.quickWorkout||$s.quickWorkout.date!==$s.selectedDate&&!($s.quickWorkout.sets||[]).length||$s.quickWorkout.workoutId&&!$s.db.workouts.some(w=>w.id===$s.quickWorkout.workoutId))){$s.quickWorkout=emptyQuickWorkout($s.selectedDate,$s.db.settings.gyms||[],$s.db);$s.quickWorkout.showAtlas=pf.level==='new'}if(requested==='batch-detail'){$s.batchRows=[blankFood()];$s.batchCopy=false;$s.batchDate=$s.selectedDate;$s.batchSlot='식사';$s.batchTime=new Date().toTimeString().slice(0,5)}$s.modal=requested==='batch-detail'?'batch':quick;$s.mealEditId=null;$s.workEditId=null;$s.routineEditId=null;if($s.modal==='workout'||$s.modal==='routine'){$s.workDraft=[];$s.workMeta={date:$s.selectedDate,title:$s.modal==='routine'?'나의 루틴':'',duration:'',condition:'',note:''}}render();return}
  if((target.id==='close'||target.id==='backdrop')&&$s.modal==='guide-run'){if($s.guideRun?.phase==='done'){guideStop()}$s.modal=null;render();if($s.guideRun)toast('안내는 계속돼요. 운동 화면의 ‘＋ 운동’으로 돌아갈 수 있어요.');return}
  if((target.id==='close'||target.id==='backdrop')&&$s.modal==='onboarding'){$s.db=save(skipOnboarding($s.db));$s.modal=null;$s.onb=null;render();toast('기본 설정으로 시작해요. 설정 › 나의 기록 방식에서 바꿀 수 있어요.');return}
  if((target.id==='close'||target.id==='backdrop')&&$s.modal==='quick-workout'&&$s.quickWorkout?.isNew&&$s.quickWorkout.workoutId){/* 4.16.0 빠른 기록을 마치고 닫으면 결과 카드 한 장 */const w=$s.db.workouts.find(x=>x.id===$s.quickWorkout.workoutId);$s.quickWorkout.isNew=false;if(w&&!w.planned&&!w.rest){persistDraft();$s.resultWorkout=w;$s.modal='workout-result';render();return}}
  if(target.id==='close'||target.id==='backdrop'){persistDraft();$s.modal=['machine','custom-exercise'].includes($s.modal)?$s.profileReturn:null;render();return}
  if(await installClick(target))return;
  if(prefsClick(target))return;
  if(target.id==='ar-share'){await shareReportCard();return}
  if(goalWizClick(target))return;
  if(quickEditClick(target))return;
  if(await adminClick(target))return;
  if(await aiBridgeClick(target))return;
  if(guideClick(target))return;
  if(placesClick(target))return;
  if(quickClick(target))return;
  if(await cloudClick(target))return;
  if(await catalogClick(target))return;
  if(await enhancedClick(target))return;
  if(target.dataset.metric){$s.bodyMetric=target.dataset.metric;render();return}
  if(target.id==='gw-use-mine'&&$s.goalWiz){$s.goalWiz.useMine=!$s.goalWiz.useMine;const o=calorieOptions($s.goalWiz.profile,$s.goalWiz.useMine?$s.goalWiz.mine?.kcal:null);$s.goalWiz.kcal=(o.find(x=>x.rec)||o.find(x=>!x.below)||o[0])?.kcal||null;$s.goalWiz.custom.kcalOn=false;render();return}
  if(target.dataset.analysisSplit!==undefined){$s.analysisSplit=!!target.dataset.analysisSplit;render();return}
  if(target.dataset.calendar){$s.selectedDate=target.dataset.calendar;render();return}
  if(target.dataset.month){const d=new Date($s.selectedDate+'T12:00:00');d.setMonth(d.getMonth()+Number(target.dataset.month),1);$s.selectedDate=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-01`;render();return}
  if(target.dataset.mealEdit){/* 4.4.1 점검 D-9: 식사 수정 창에서 바꾼 양·단위가 있으면 먼저 저장하고 연다 */if($s.qm&&typeof document?.querySelector==='function'){readQuickMeal($s.qm,document);if(mealDiff($s.qm)!=='바뀐 것 없음'){{const gone=new Set($s.qm.rows.filter(r=>r.removed).map(r=>r.id));if(gone.size)toTrash($s.TRASH(),'meals',$s.db.meals.filter(m=>gone.has(m.id)))}$s.db=save(applyQuickMeal($s.db,$s.qm));toast('바꾼 양을 먼저 저장했어요.')}$s.qm=null}$s.mealEditId=target.dataset.mealEdit;$s.modal='meal';render();return}
  if(target.dataset.workEdit){const w=$s.db.workouts.find(x=>x.id===target.dataset.workEdit);if(!w)return;$s.workEditId=w.id;$s.workDraft=structuredClone(w.exercises);$s.workMeta={date:w.date,title:w.title,duration:w.duration,condition:w.condition,note:w.note,loggedAtTime:(()=>{const d=new Date(w.loggedAt||w.createdAt||'');return Number.isNaN(d.getTime())?'':`${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`})()};$s.modal='workout';render();return}
  if(target.dataset.routineEdit){const r=$s.db.routines.find(x=>x.id===target.dataset.routineEdit);if(!r)return;$s.routineEditId=r.id;$s.workDraft=structuredClone(r.exercises);$s.workMeta={title:r.title,date:today()};$s.modal='routine';render();return}
  if(target.dataset.routineDelete){const ids=new Set([target.dataset.routineDelete]),before=$s.db.routines;toTrash($s.TRASH(),'routines',before.filter(x=>ids.has(x.id)));$s.db=remove($s.db,'routines',target.dataset.routineDelete);render();toastUndo('루틴을 지웠어요.',$s.undoRecords('routines',before,ids));return}
  if(target.dataset.progressDelete){if(confirm('이 사진을 삭제할까요?')){await deleteProgressPhoto(target.dataset.progressDelete);await refreshProgressPhotos();toast('사진을 삭제했습니다.')}return}
  if(target.dataset.progressExport){const item=$s.progressPhotos.find(x=>x.id===target.dataset.progressExport);if(!item)return;const ext=item.type==='image/png'?'png':item.type==='image/webp'?'webp':'jpg';const name=`mylogue-progress-${item.date}-${item.id.slice(0,6)}.${ext}`;fetch(item.url).then(r=>r.blob()).then(b=>downloadBlob(name,b)).then(r=>{if(r===null)toast('사진 파일 저장을 시작했습니다.')}).catch(()=>toast('사진을 저장하지 못했어요.'));return}
  if(target.dataset.program){const [id,index]=target.dataset.program.split(':');const template=createRoutineFromProgram(id,Number(index));$s.workDraft=template.exercises.map(e=>({...e,sets:e.sets.map(s=>({...s,completed:false}))}));$s.workMeta={date:$s.selectedDate,title:template.title,duration:'',condition:'',note:''};$s.workEditId=null;$s.modal='workout';render();toast('시작용 구성입니다. 중량을 직접 확인해 주세요.');return}
  if(target.dataset.foodChoice){const [source,index]=target.dataset.foodChoice.split(':');const food=source==='preset'?foodChoices().foods[Number(index)]:recentFoods($s.db.meals)[Number(index)];const form=document.getElementById('meal-form');if(!food||!form)return;for(const key of ['name','servingUnit','calories','carbs','protein','fat'])if(form.elements[key])form.elements[key].value=food[key]??'';form.elements.servingQty.value=MASS.has(food.servingUnit)?($s.db.settings.lastGrams?.[food.name]||food.servingQty||100):1;mealPreview(form,scaleNutrition);return}
  if(target.dataset.foodSave){const m=$s.db.meals.find(x=>x.id===target.dataset.foodSave);if(!m)return;const factor=MASS.has(m.servingUnit)?(m.servingQty||100)/100:(m.servingQty||1);$s.db=save({...$s.db,foods:upsertFoodPreset($s.db.foods||[],{name:m.name,servingUnit:m.servingUnit,...Object.fromEntries(['calories','carbs','protein','fat'].map(k=>[k,m[k]==null?null:m[k]/factor]))}/* 4.27.0 DAT-12: 빈 값은 0이 아니라 빈 값 그대로 */)});toast('자주 먹는 음식에 저장했습니다.');return}
  if(target.dataset.delete){/* 4.4.2 점검 C-7: 확인창 대신 지우고 되돌리기(지운 그 기록만 되살림) */const [kind,id]=target.dataset.delete.split(':');const removed=$s.db[kind]?.find(x=>x.id===id);if(!removed)return;const prevState=$s.db.dayStates?.[removed.date];toTrash($s.TRASH(),kind,[removed]);const next={...$s.db,[kind]:$s.db[kind].filter(x=>x.id!==id)};if(kind==='meals')next.dayStates={...$s.db.dayStates,[removed.date]:next.meals.some(x=>x.date===removed.date)?($s.db.dayStates?.[removed.date]==='complete'?'complete':'partial'):'unrecorded'};$s.db=save(next);$s.modal=null;render();toastUndo(removed.rest?'휴식 기록을 지웠어요. 설정 › 휴지통에서도 30일 동안 되살릴 수 있어요.':'기록을 지웠어요. 설정 › 휴지통에서도 30일 동안 되살릴 수 있어요.',()=>{if($s.db[kind].some(x=>x.id===id))return;const back={...$s.db,[kind]:[...$s.db[kind],removed]};if(kind==='meals')back.dayStates={...$s.db.dayStates,[removed.date]:prevState||'partial'};$s.db=save(back);render()});return}
  if(target.dataset.reload){const w=$s.db.workouts.find(x=>x.id===target.dataset.reload);if(!w)return;$s.workEditId=null;$s.workDraft=structuredClone(w.exercises).map(e=>({...e,sets:e.sets.map(s=>({...s,id:uid(),completed:false}))}));$s.workMeta={date:$s.selectedDate,title:w.title,duration:w.duration,condition:'',note:''};$s.modal='workout';render();return}
  if(target.dataset.detail){$s.modal='detail:'+target.dataset.detail;render();return}
  if(target.dataset.routine){const r=$s.db.routines.find(x=>x.id===target.dataset.routine);if(!r)return;$s.workEditId=null;$s.workDraft=structuredClone(r.exercises).map(e=>({...e,sets:e.sets.map(s=>({...s,targetWeight:s.weight,targetReps:s.reps,targetUnit:s.unit||'kg',completed:false}))}));$s.workMeta={date:$s.selectedDate,title:r.title,duration:'',condition:'',note:''};$s.modal='workout';render();return}
  if(target.id==='add-ex'){$s.workDraft.push({name:'',part:'가슴',kind:'strength',sets:[{weight:0,reps:10,type:'본세트',completed:false}]});render();return}
  if(['assist','addSet','copySet','removeSet','removeEx','moveEx','applyPrevious','pickExercise'].some(k=>target.dataset[k]!==undefined)||target.id==='add-ex')$s.undoDraft=structuredClone($s.workDraft);
  if(target.dataset.assist){const state=cleanCheckin({...$s.db.checkins?.[$s.workMeta.date||today()],...$s.workMeta});if(state.pain===true||state.energy!==null&&state.energy<=2||state.sleep!==null&&state.sleep<=2||state.soreness!==null&&state.soreness>=4)throw Error('오늘 상태를 반영해 중량 제안을 보류합니다. 직접 입력하거나 휴식을 선택하세요.');const [ei,mode]=target.dataset.assist.split(':');const ex=$s.workDraft[Number(ei)];ex.sets=suggestSets(mode,estimateFor(ex)).map(s=>({...s,completed:false,targetWeight:s.weight,targetReps:s.reps,targetUnit:s.unit}));render();toast('과거 기록으로 만든 초안입니다. 중량과 횟수를 확인해 주세요.');return}
  if(target.dataset.addSet!==undefined){$s.workDraft[Number(target.dataset.addSet)].sets.push({weight:0,reps:10,type:'본세트',completed:false});render();return}
  if(target.dataset.copySet){const [ei,si]=target.dataset.copySet.split(':').map(Number);const ex=$s.workDraft[ei];ex.sets.splice(si+1,0,{...structuredClone(ex.sets[si]),id:uid(),completed:false});render();return}
  if(target.dataset.removeSet){const [ei,si]=target.dataset.removeSet.split(':').map(Number);$s.workDraft[ei].sets.splice(si,1);render();return}
  if(target.dataset.removeEx!==undefined){$s.workDraft.splice(Number(target.dataset.removeEx),1);render();return}
  if(target.id==='plate-calc'){const value=document.getElementById('plate-total')?.value;if(!value)throw Error('바벨 총 중량을 입력해 주세요.');const side=plateLoadPerSide(Number(value),$s.db.settings.barbellWeightKg??20);document.getElementById('plate-result').textContent=`한쪽에 ${$s.fmt(side)} kg씩 올리세요.`;return}
  if(target.id==='progress-save'){const file=document.getElementById('progress-file')?.files?.[0],date=document.getElementById('progress-date')?.value;if(!validDate(date))throw Error('사진 날짜를 확인해 주세요.');await saveProgressPhoto(file,date);$s.modal=null;$s.page='body';await refreshProgressPhotos();toast('사진을 이 기기에 저장했습니다.');return}
  if(target.id==='codex-parse'){const file=document.getElementById('codex-file')?.files?.[0];if(!file)throw Error('숫자 파일을 선택해 주세요.');$s.codexDraft=parseCodexRecord(JSON.parse(await file.text()));document.getElementById('codex-preview').textContent=$s.codexDraft.kind==='meals'?`식단 · ${$s.codexDraft.record.date} · ${$s.codexDraft.record.name} · ${$s.fmt($s.codexDraft.record.calories,0)} kcal`:`운동 · ${$s.codexDraft.record.date} · ${$s.codexDraft.record.title} · ${$s.codexDraft.record.exercises.length}종목`;document.getElementById('codex-confirm').disabled=false;return}
  if(target.id==='codex-confirm'){if(!$s.codexDraft)throw Error('먼저 파일을 읽어 주세요.');if($s.codexDraft.kind==='meals'){const m=$s.codexDraft.record;$s.mealEditId=null;$s.selectedDate=m.date;$s.modal='meal';render();const f=document.getElementById('meal-form');for(const [key,value] of Object.entries(m)){if(f.elements[key])f.elements[key].value=['calories','carbs','protein','fat'].includes(key)?(value==null||value===''?value:value/(unitFactor(m.servingQty||1,m.servingUnit)||1)):value}mealPreview(f,scaleNutrition)}else{$s.workEditId=null;$s.workDraft=structuredClone($s.codexDraft.record.exercises);$s.workMeta={...$s.codexDraft.record};$s.modal='workout';render()}$s.codexDraft=null;toast('수치를 확인하고 저장해 주세요.');return}
  if(target.dataset.themeSet){try{localStorage.setItem('mylogue.theme',target.dataset.themeSet)}catch{}$s.applyTheme();render();return}
  if(target.id==='backup-nudge-later'){try{localStorage.setItem(scopedKey('mylogue.backupSnoozeUntil'),String(Date.now()+7*864e5))}catch{}render();return}
  if(target.id==='export'||target.id==='backup-nudge-export'){if(getStorageStatus().blocked)throw Error('저장소 원본을 먼저 보존하고 복구해 주세요.');if($s.backupBusy)return;$s.backupBusy=true;try{const backup=await createBackup($s.db);download(`mylogue-backup-${today()}.json`,JSON.stringify(backup));try{localStorage.setItem(scopedKey('mylogue.lastBackupAt'),String(Date.now()))}catch{}toast('기록·사진 통합 백업을 저장했습니다.')}finally{$s.backupBusy=false}return}
  if(target.id==='restore-preview'){$s.restoreCandidate=null;document.getElementById('restore-confirm').disabled=true;const raw=JSON.parse(await readFile(document.getElementById('restore-file')));const checked=await validateBackup(raw);$s.restoreCandidate=raw;document.getElementById('restore-summary').textContent=`수치 ${checked.db.body.length}건 · 식단 ${checked.db.meals.length}건 · 운동 ${checked.db.workouts.length}건 · 사진 ${checked.photos?.length??0}장${checked.legacy?' · 이전 숫자 백업: 기존 사진 유지':''}`;document.getElementById('restore-confirm').disabled=false;return}
  if(target.id==='restore-confirm'){if(!$s.restoreCandidate||$s.backupBusy)return;if(!confirm(cloudState.user?'검증된 백업으로 이 기기의 기록을 바꿀까요?\n\n로그인 중이라 다음 동기화 때 서버 기록과 합쳐요. 백업 뒤에 생긴 기록은 지우지 않고 되살리며, 서로 다른 기록은 어느 쪽을 쓸지 물어봐요. 작성 중인 임시 운동은 따로 보존해요.':'검증된 백업으로 현재 기록을 교체할까요? 현재 작성 중인 임시 운동은 별도 원본으로 보존한 뒤 종료합니다.'))return;$s.backupBusy=true;try{if(rawSession())localStorage.setItem(scopedKey('mylogue.draft.before-restore'),rawSession());$s.db=await restoreBackup($s.restoreCandidate);/* 4.27.0 DAT-08: 로그인 중 복원이면 동기화 기준을 비워 다음 동기화를 '합치기'로(옛 백업이 서버·다른 기기의 새 기록을 지우지 않게) */try{if(cloudState.user)localStorage.removeItem(scopedKey('mylogue.cloud.baseline'))}catch{}try{clearSession()}catch{$s.draftWarning='복원 전 임시 기록을 정리하지 못했습니다. 설정에서 내보내고 삭제하세요.'}$s.workDraft=[];$s.workMeta={};$s.workEditId=null;$s.savedDraft=null;$s.restoreCandidate=null;$s.modal=null;await refreshProgressPhotos();render();toast('백업을 복원했습니다.')}finally{$s.backupBusy=false}return}
  if(target.id==='body-confirm'){const raw=JSON.parse(await readFile(document.getElementById('body-file')));$s.db=add($s.db,'body',importBody(raw));$s.modal=null;$s.page='body';render();toast('체성분 기록을 가져왔습니다.');return}
  if(target.id==='ocr-parse'){ocrFields(extractInbody(document.getElementById('ocr-text').value));return}
  if(target.id==='ocr-save'){const data={};document.querySelectorAll('[data-ocr-field]').forEach(x=>data[x.dataset.ocrField]=x.value);$s.db=add($s.db,'body',cleanBody({...data,source:'photo-reviewed',measure:'inbody'}));$s.modal=null;$s.page='body';render();toast('확인한 인바디 수치를 저장했습니다.');return}
  if(target.id==='ocr-run'){await runOCR();return}
  if(target.id==='share-workout'){await shareWorkout($s.db.workouts.find(x=>x.id===$s.modal.slice(7)));return}
 }catch(err){toast(err.message||'작업에 실패했습니다.')}
});
$s.root.addEventListener('change',async event=>{
 {const t=event.target;if(t?.id==='consent-all'||t?.dataset?.consent){if(t.id==='consent-all')for(const [k] of CONSENT_ITEMS)if(!OPTIONAL_CONSENT.includes(k))$s.consentChecked[k]=t.checked;else $s.consentChecked[t.dataset.consent]=t.checked;$s.consentError='';render();return}if(t?.dataset?.remind){$s.db=save(setReminder($s.db,t.dataset.remind,t.type==='checkbox'?t.checked:t.value));toast('리마인드 설정을 바꿨어요.');return}if(t?.dataset&&(t.dataset.push||t.dataset.mcScope)){try{await $s.coach.change(t)}catch(e){toast(e.message||String(e))}return}}
 const t=event.target;
 try{
 if(quickInput(t))return;
 if(enhancedChange(t))return;
 if(t.closest?.('#catalog-request-form')&&['mode','type'].includes(t.name)){
  const form=t.form,photo=form.elements.mode.value==='photo';
  if(photo&&form.elements.type.value!=='machine'){form.elements.mode.value='manual';throw Error('사진 등록 요청은 머신에만 사용할 수 있습니다.')}
  const fields=form.querySelector('[data-photo-fields]');if(fields)fields.hidden=!photo;
  for(const input of form.querySelectorAll('[name="wholePhoto"],[name="nameplatePhoto"]'))input.required=photo;
  return;
 }
 if(t.id==='restore-file'){$s.restoreCandidate=null;document.getElementById('restore-confirm').disabled=true;return}
 if(t.id==='machine-photo'){await readMachinePhoto(t);return}
 if(t.id==='analysis-machine'){$s.analysisMachine=t.value;render();return}
 if(t.id==='analysis-days'){$s.analysisDays=Number(t.value);render();return}
 if(t.id==='period'){$s.period=Number(t.value);render();return}
 if(t.id==='selected-date'){$s.selectedDate=t.value;render();return}
 if(t.id==='ar-exercise'){$s.analysisExercise=t.value;render();return true}if(t.id==='analysis-exercise'){$s.analysisExercise=t.value;$s.analysisMachine='all';$s.analysisSplit=false;render();return}
 if(t.id==='body-file'){try{const b=importBody(JSON.parse(await readFile(t)));document.getElementById('import-preview').textContent=`${b.date} · 체중 ${$s.fmt(b.weight)} kg · 체지방률 ${$s.fmt(b.bodyFatPct)}% · 골격근량 ${$s.fmt(b.skeletalMuscle)} kg`;document.getElementById('body-confirm').disabled=false}catch(err){document.getElementById('import-preview').textContent=err.message;document.getElementById('body-confirm').disabled=true}return}
 if(t.id==='inbody-photo'){const f=t.files?.[0];if(f){const img=document.getElementById('photo-preview');img.src=URL.createObjectURL(f);img.classList.remove('hidden');document.getElementById('ocr-run').disabled=false;document.getElementById('ocr-status').textContent='사진이 준비됐습니다. 숫자 읽기를 눌러 주세요.'}return}
 if(t.dataset.ex){const ex=$s.workDraft[Number(t.closest('[data-ei]').dataset.ei)];ex[t.dataset.ex]=t.value;if(t.dataset.ex==='name'){const match=searchExercises(t.value).find(x=>x.name===t.value);if(match){ex.part=match.part;ex.kind=match.kind;render()}}else if(t.dataset.ex==='kind')render();return}
 if(t.dataset.set){const row=t.closest('[data-si]'),set=$s.workDraft[Number(t.closest('[data-ei]').dataset.ei)].sets[Number(row.dataset.si)];set[t.dataset.set]=t.type==='checkbox'?t.checked:t.value;return}
 if(t.closest('#workout-form')&&t.name){$s.workMeta[t.name]=t.value;return}
 if(t.closest('#meal-form'))mealPreview(t.form,scaleNutrition);
 }catch(e){toast(e.message)}finally{persistDraft()}
});
$s.root.addEventListener('compositionstart',event=>{if(['q-food-search','q-ex-search'].includes(event.target.id))$s.composingSearch=true});
$s.root.addEventListener('compositionend',event=>{if(!['q-food-search','q-ex-search'].includes(event.target.id))return;$s.composingSearch=false;quickInput(event.target)});
$s.root.addEventListener('input',event=>{
 const t=event.target;
 try{
 if(quickInput(t))return;
 if(batchDbInput(t))return;
 if(enhancedInput(t))return;
 if(t.dataset.ex){$s.workDraft[Number(t.closest('[data-ei]').dataset.ei)][t.dataset.ex]=t.value;return}
 if(t.dataset.set){const row=t.closest('[data-si]');$s.workDraft[Number(t.closest('[data-ei]').dataset.ei)].sets[Number(row.dataset.si)][t.dataset.set]=t.type==='checkbox'?t.checked:t.value;return}
 if(t.closest('#workout-form')&&t.name)$s.workMeta[t.name]=t.value;
 if(t.closest('#meal-form'))mealPreview(t.form,scaleNutrition);
 }catch(e){toast(e.message)}finally{persistDraft()}
});
$s.root.addEventListener('toggle',event=>{const d=event.target;if(d?.classList?.contains('q-meta')){if($s.modal==='quick-meal'&&$s.quickMeal)$s.quickMeal.metaOpen=d.open;else if($s.quickWorkout)$s.quickWorkout.metaOpen=d.open}},true);
$s.root.addEventListener('submit',async event=>{
 event.preventDefault();const form=event.target,d=Object.fromEntries(new FormData(form));if(form.id==='ai-pair-form')return;/* 연결 버튼 클릭에서 처리 */
 if(form.id==='ph-form'){try{const v=phaseFormValues();$s.phaseWiz={...$s.phaseWiz,...v,error:''};const answers=readPhaseAnswers($s.phaseWiz,Object.fromEntries(new FormData(form)));const ph=buildPhase({...$s.phaseWiz,answers},today(),{heightCm:$s.db.settings?.nutritionProfile?.heightCm,cautions:$s.db.settings?.nutritionProfile?.cautions||[],age:$s.db.settings?.nutritionProfile?.age??null});const prev=phaseStatus($s.db,today());let settings=$s.db.settings;if(prev)settings=endPhase(settings,phaseRecap(actualDB($s.db),prev.phase,today()),today());settings={...settings,phase:ph};const prof=phaseProfile({...(settings.nutritionProfile||{}),goal:nutritionGoalOf(ph),weightKg:ph.startWeight??settings.nutritionProfile?.weightKg});const e=phaseEstimate(prof);let msg=`${ph.weeks}주 페이즈를 시작했어요.`;if(e&&settings.nutritionProfile){/* 4.18.0 '내 유지칼로리 기반'을 골랐고 값이 있으면 그것으로 */const mine=settings.useMyMaintenance?myMaintenance(actualDB($s.db),today(),e.tdee):null,base=mine&&['ready','stale'].includes(mine.status)?mine.kcal:e.tdee;const kcal=Math.max(e.floor,Math.round((base+kcalDelta(ph,today()))/50)*50);settings={...settings,calorieGoal:kcal,nutritionProfile:{...settings.nutritionProfile,goal:prof.goal}};/* 4.27.0 전수검사 C-04: 페이즈를 시작하면 칼로리만 바뀌고 탄단지 g은 옛 값이던 것 → 지금 비율대로 g도 다시 */settings=rescaleMacros(settings,kcal);msg+=` 하루 목표를 ${kcal.toLocaleString('ko-KR')}kcal로 맞췄어요.`}else msg+=' 식단 목표는 설정 › 식단 목표에서 맞출 수 있어요.';$s.db=save({...$s.db,settings});$s.phaseWiz={step:'view'};render();toast(msg)}catch(error){$s.phaseWiz={...$s.phaseWiz,error:error.message};render()}return}
 if(form.id==='hc-form'){const keys=new Set(new FormData(form).getAll('hc'));const auto=!!form.querySelector('[name=hc-auto]')?.checked;const picked=[...($s.hc.cands?.steps||[]),...($s.hc.cands?.weights||[])].filter(c=>keys.has(c.key)&&c.state!=='same');healthApply(picked,auto);return}
 if(form.id==='ai-chat-form'){const q=String(d['ai-chat-q']??form.querySelector('#ai-chat-q')?.value??'').trim();if(!q){toast('물어볼 내용을 적어 주세요.');return}if($s.aiCoach.busy)return;$s.aiCoach={...$s.aiCoach,busy:'chat',q,msg:''};render();try{const r=await aiRequest('chat',{question:q,context:chatContext(actualDB($s.db),today())});$s.aiCoach={...$s.aiCoach,busy:'',q:'',chat:[...$s.aiCoach.chat,{q,a:String(r.text||'')}].slice(-5),left:r.left??$s.aiCoach.left}}catch(error){$s.aiCoach={...$s.aiCoach,busy:'',msg:error.message}}render();return}
 if(form.id==='ai-recipe-form'){const text=String(form.querySelector('#ai-recipe-text')?.value||'').trim();if(!text){toast('레시피 글을 붙여 넣어 주세요.');return}$s.aiRecipe={...$s.aiRecipe,text,busy:true,msg:'',match:null};render();try{const r=await aiRequest('recipe',{text});if(!r.recipe)$s.aiRecipe={...$s.aiRecipe,busy:false,msg:'재료를 찾지 못했어요. 재료와 양이 적힌 부분을 붙여 넣어 주세요.'};else{await loadFoodDB().catch(()=>{});$s.aiRecipe={...$s.aiRecipe,busy:false,match:matchRecipe(r.recipe,name=>searchFoodDB(name,{limit:8}))}}}catch(error){$s.aiRecipe={...$s.aiRecipe,busy:false,msg:error.message}}render();return}
 try{
  if($s.coach.visible()&&await $s.coach.submit(form,d))return;
  if($s.backupBusy)throw Error('백업·복원 완료 후 저장해 주세요.');
  if(getStorageStatus().blocked)throw Error('기존 기록 보호를 위해 먼저 복구해 주세요.');
  if(form.id==='gym-search-form'){const q=String(d.q||'').trim();if(!q)throw Error('장소 이름이나 동네를 입력해 주세요.');$s.gymSearch={q,status:'loading',results:[]};render();try{$s.gymSearch={q,status:'done',results:await searchPlaces(q)}}catch(e){$s.gymSearch={q,status:'error',message:e.message,results:[]}}render();return}
  if(form.id==='gym-map-form'){const name=String(d.name||'').trim();if(!name)throw Error('헬스장 이름을 입력해 주세요.');const c=$s.gymMap?.center||{};let address='';try{address=await addressAt(c.lat,c.lng)}catch{}$s.db=save(addGymPlace($s.db,{name,address,lat:c.lat,lng:c.lng,provider:'manual'}));closeGymMap();render();toast(`내 운동 장소에 ‘${name}’ 추가했어요.`);return}
  if(form.id==='after-workout-form'){$s.afterWorkout=readAfterWorkoutForm(form);const w=$s.planWorkout($s.afterWorkout&&afterWorkoutRecord($s.afterWorkout));$s.db=save({...$s.db,workouts:[...$s.db.workouts,w]});$s.afterWorkout=null;$s.modal=null;$s.page='workout';render();recordHint();toast(`${w.exercises.length}종목을 저장했습니다.`);return}
  if(form.id==='guide-plan-form'){$s.guidePlan=readPlanForm(form);const items=validatePlan($s.guidePlan);const pf=prefsOf($s.db);$s.guideRun=startRun($s.guidePlan,items);$s.guideCues=createCues(pf.cue);$s.guideCues.unlock();$s.guideCues.keepAwake(pf.keepAwake);prepareNativeAlerts();guideStartTicker();$s.modal='guide-run';render();$s.guideCues.play({say:`${items[0].name}, 1세트 시작`,beep:1,go:1});return}
  if(form.id==='bot-form'&&$s.bot){$s.bot=readBotForm(form,$s.bot);const now=new Date().toISOString(),r=botRecords($s.bot,uid,now);const meals=r.meals.map(cleanMeal),body=r.body.map(cleanBody),works=r.workouts.map(cleanWorkout);const touched=[...new Set([...meals.map(m=>m.date)])];$s.db=save({...$s.db,meals:[...$s.db.meals,...meals],body:[...$s.db.body,...body],workouts:[...$s.db.workouts,...works],dayStates:{...$s.db.dayStates,...Object.fromEntries(touched.map(d=>[d,$s.db.dayStates?.[d]==='complete'?'complete':'partial']))}});$s.setBotState({last:$s.bot.last,choice:'fill'});const n=meals.length+body.length+works.length;$s.bot=null;$s.modal=null;render();toast(n?`${n}개를 적었어요. 오늘 것도 하나 적어 볼까요?`:'비워 둔 날은 그대로 둘게요. 오늘부터 이어 가요.');return}
  if(form.id==='simple-meal-form'){const m=$s.planMeal(simpleMealRecord(form));$s.db=save({...$s.db,meals:[...$s.db.meals,m]});$s.modal=null;render();recordHint();toast(m.planned?`${m.slot}을 예정으로 넣었어요.`:savedLine($s.db));return}
  if(form.id==='ai-port-form'){$s.aiBridge.port=Number(d.port)||BRIDGE_PORT;await checkBridge(true);return}
  if(form.matches?.('[data-ai-draft]')){const draft=$s.aiDrafts.find(x=>x.id===form.dataset.aiDraft);if(!draft)throw Error('AI 초안을 다시 불러와 주세요.');const reviewedData=readAIReview(form,draft);try{await resolveAIDraft(draft,{action:'confirm',reviewedData,existing:$s.localRecords()})}catch(e){if(e?.code==='duplicate'&&confirm(`${e.message}

같은 걸 한 번 더 먹은 거라면 ‘확인’을 눌러 따로 저장해요.`))await resolveAIDraft(draft,{action:'confirm',reviewedData,allowDuplicate:true});else throw e}try{const synced=await synchronize($s.db,saveLocal);if(synced.db)$s.db=synced.db}catch(error){toast(`기록은 서버에 저장됐습니다. 이 기기 동기화는 다시 시도해 주세요: ${error.message}`)}await refreshAIDrafts();toast('검토한 기록을 확정했습니다.');return}
  if(form.id==='catalog-request-form'){if(!cloudState.user)throw Error('등록 요청은 로그인 후 보낼 수 있습니다.');const fd=new FormData(form),request={type:fd.get('type'),mode:fd.get('mode'),name:fd.get('name'),manufacturer:fd.get('manufacturer'),model:fd.get('model'),gymName:fd.get('gymName'),targetIds:fd.getAll('targetIds'),note:fd.get('note'),servingQty:fd.get('servingQty')||null,servingUnit:fd.get('servingUnit'),calories:fd.get('calories')||null,carbs:fd.get('carbs')||null,protein:fd.get('protein')||null,fat:fd.get('fat')||null};await submitCatalogRequest(request,{whole:fd.get('wholePhoto'),nameplate:fd.get('nameplatePhoto')});$s.modal=null;await refreshCatalog();toast('관리자에게 등록 요청을 보냈습니다.');return}
  if(form.id==='catalog-admin-food-form'){if(!isCatalogAdmin(cloudState.user))throw Error('관리자 계정만 공용 음식을 수정할 수 있습니다.');const fd=new FormData(form),item={id:String(fd.get('id')||`food:${uid()}`),name:String(fd.get('name')||'').trim(),servingQty:Number(fd.get('servingQty')),servingUnit:fd.get('servingUnit'),calories:Number(fd.get('calories')),carbs:Number(fd.get('carbs')),protein:Number(fd.get('protein')),fat:Number(fd.get('fat'))};await saveSharedCatalogItem('foods',item);$s.catalogAdminFood=item;await refreshCatalog();toast('공용 음식 영양값을 서버에 저장했습니다. 이후 기록부터 적용됩니다.');return}
  if(form.id==='machine-form'){const aliases=String(d.aliases||'').split(',').map(x=>x.trim()).filter(Boolean);/* 4.18.0 모든 머신은 머신 종류(상위 종목) 하나에 속해야 한다: 비었으면 종목·이름으로 찾고, 그래도 없으면 고르게 */if(!d.baseId){const ex=EXERCISE_CATALOG.find(x=>x.id===d.exerciseId)||resolveExercise(d.name)||resolveExercise(d.model),gs=ex?genericMachinesFor(ex.id):[];if(gs.length)d.baseId=gs[0].id}if(!d.baseId)throw Error('어떤 머신 종류인지 골라 주세요(예: 레그 프레스). 그래야 다른 머신 기록과 합쳐서 성장을 볼 수 있어요.');const item=cleanMachine({...d,id:d.recordId,photoDataUrl:$s.machinePhoto,aliases});/* 4.18.0 내 머신도 띄어쓰기·표기만 다른 중복은 막는다 */{const k=x=>machineKey(x.manufacturer,x.model&&x.model!=='모름'?x.model:x.name),dup=($s.db.machines||[]).find(x=>x.id!==item.id&&(x.location||'')===(item.location||'')&&k(x)===k(item));if(dup)throw Error(`이미 등록한 머신이에요: ${dup.name}. 그 머신을 고르거나 수정해 주세요.`)}$s.db=save({...$s.db,machines:[...($s.db.machines||[]).filter(x=>x.id!==item.id),item]});if($s.machineIndex!==null&&$s.workDraft[$s.machineIndex]){$s.workDraft[$s.machineIndex].machineId=item.id;for(const set of $s.workDraft[$s.machineIndex].sets)if(Number(set.weight)===0)set.unit=item.unit}if($s.profileReturn==='quick-workout'&&$s.quickWorkout){$s.quickWorkout.machineId=item.id;$s.quickWorkout.unit=item.unit}$s.modal=$s.profileReturn;render();toast('머신을 저장했습니다.');return}
  if(form.id==='custom-exercise-form'){const fd=new FormData(form);const item=cleanCustomExercise({...d,id:d.recordId,aliases:d.aliases.split(',').map(x=>x.trim()).filter(Boolean),primaryMuscleIds:fd.getAll('primaryMuscleIds'),secondaryMuscleIds:fd.getAll('secondaryMuscleIds')});$s.db=save({...$s.db,customExercises:[...($s.db.customExercises||[]).filter(x=>x.id!==item.id),item]});$s.modal=$s.profileReturn;render();toast('종목을 저장했습니다.');return}
  if(form.id==='body-form'){const prior=$s.db.body.find(x=>x.id===$s.bodyEditId);const b=cleanBody({...prior,...d,id:prior?.id,updatedAt:new Date().toISOString()});$s.db=prior?replace($s.db,'body',b):add($s.db,'body',b);$s.bodyEditId=null;$s.page=['home','body','calendar'].includes($s.page)?$s.page:'body';refreshGoalsByWeight()}
  else if(form.id==='batch-form'){const rows=batchMeals($s.batchRows,d.date,d.slot,d.time).map($s.planMeal).map((x,i)=>({...x,copyKey:$s.batchCopy?`${$s.batchRows[i].id}:${d.date}`:''}));if($s.batchCopy&&rows.some(x=>$s.db.meals.some(m=>m.copyKey&&m.copyKey===x.copyKey)))throw Error('이미 복사한 식사가 있습니다. 중복을 확인해 주세요.');let next={...$s.db,meals:[...$s.db.meals,...rows],foods:savedFoodsFromRows($s.batchRows),dayStates:{...$s.db.dayStates,[d.date]:$s.db.dayStates?.[d.date]==='complete'?'complete':'partial'},settings:{...$s.db.settings,lastGrams:{...$s.db.settings.lastGrams,...Object.fromEntries(rows.filter(x=>MASS.has(x.servingUnit)).map(x=>[x.name,x.servingQty]))}}};if((d.recipeName||'').trim())next.recipes=[...($s.db.recipes||[]),createRecipe(d.recipeName,rows)];$s.db=save(next);$s.selectedDate=d.date;$s.page=['home','food','calendar'].includes($s.page)?$s.page:'food';$s.batchRows=[]}
  else if(form.id==='checkin-form'){$s.db=save({...$s.db,checkins:{...$s.db.checkins,[today()]:cleanCheckin(d)}});$s.page='workout'}
  else if(form.id==='meal-form'){
    const total=scaleNutrition({calories:d.calories,carbs:d.carbs,protein:d.protein,fat:d.fat},MASS.has(d.servingUnit)?Number(d.servingQty)/100:d.servingQty);
   const prior=$s.db.meals.find(x=>x.id===$s.mealEditId);
   /* 4.27.0 DAT-11: 수량·단위·영양칸을 그대로 두고 저장하면 원래 총량을 그대로(1단위 값 반올림 왕복으로 100→99.9가 되던 것) */
   if(prior&&Number(d.servingQty)===Number(prior.servingQty)&&String(d.servingUnit||'회')===String(prior.servingUnit||'회'))for(const k of ['calories','carbs','protein','fat']){const f=MASS.has(prior.servingUnit)?Number(prior.servingQty)/100:Number(prior.servingQty||1),shown=prior[k]==null?null:Math.round(prior[k]/f*10)/10,v=d[k]===''||d[k]==null?null:Number(d[k]);if(v===shown)total[k]=prior[k]}
   const meal=(prior?x=>x:$s.planMeal)(cleanMeal({...prior,...d,...total,id:prior?.id,...(prior?{}:{mealGroupId:uid()}),updatedAt:new Date().toISOString()}));
   $s.db=save({...$s.db,meals:prior?$s.db.meals.map(x=>x.id===prior.id?meal:x):[...$s.db.meals,meal],foods:savedFoodsFromRows([d]),dayStates:{...$s.db.dayStates,[d.date]:$s.db.dayStates?.[d.date]==='complete'?'complete':'partial'}});$s.selectedDate=d.date;$s.page=['home','food','calendar'].includes($s.page)?$s.page:'food';$s.mealEditId=null;
  }
  else if(form.id==='workout-form'){
   if($s.modal==='routine'){
    const exercises=cleanWorkout({date:today(),exercises:$s.workDraft}).exercises;
    const prior=$s.db.routines.find(x=>x.id===$s.routineEditId),routine={id:prior?.id||uid(),title:d.title,exercises};
    $s.db=prior?replace($s.db,'routines',routine):add($s.db,'routines',routine);$s.routineEditId=null;$s.page='workout';
   }else{
    const completedExercises=$s.workDraft.map(ex=>ex.kind==='cardio'?ex:{...ex,sets:(ex.sets||[]).filter(s=>s.completed===true).map(s=>({...s,completedAt:s.completedAt||quickTime(d.date)}))}).filter(ex=>ex.kind==='cardio'?Number(ex.durationMin)>0||Number(ex.distanceKm)>0:ex.sets.length>0);
    if(!completedExercises.length)throw Error('실제로 완료한 세트를 하나 이상 기록해 주세요.');
    const prior=$s.db.workouts.find(x=>x.id===$s.workEditId),workout=(prior?x=>x:$s.planWorkout)(cleanWorkout({...prior,...d,id:prior?.id,sourceDraftId:$s.savedDraft?.id||prior?.sourceDraftId,exercises:completedExercises,updatedAt:new Date().toISOString()}));
    const checkin=cleanCheckin(d),name=String(d.title||'').trim(),titles=$s.db.settings.workoutTitles||[];$s.db=save({...$s.db,workouts:prior?$s.db.workouts.map(x=>x.id===prior.id?workout:x):[...$s.db.workouts,workout],checkins:{...$s.db.checkins,[d.date]:checkin},settings:{...$s.db.settings,workoutTitles:name&&name!=='오늘의 운동'?[...new Set([...titles,name])]:titles}});$s.workEditId=workout.id;try{clearSession()}catch(e){$s.draftWarning='운동은 저장됐지만 임시 기록 정리에 실패했습니다.';toast($s.draftWarning)}$s.savedDraft=null;$s.workEditId=null;$s.page='workout';if(!prior)$s.resultWorkout=workout;
   }
  }
   else if(form.id==='gym-form'){const name=String(d.name||'').trim();if(!name)throw Error('헬스장 이름을 입력해 주세요.');$s.db=save(addGymPlace($s.db,{name,provider:'manual'}))}
   else if(form.id==='goal-form'){$s.db=save({...$s.db,settings:saveGoalSettings($s.db.settings,d)})}
  if(form.id==='plan-workout-form'){const title=planTitle($s.planDraft.cat,$s.planDraft.parts||[]),w=cleanWorkout({date:$s.selectedDate,planned:true,title,note:String(d.note||'').trim(),...(d.time?{loggedAtTime:d.time}:{}),gymName:($s.db.settings.gyms||[])[0]||''});$s.db=save({...$s.db,workouts:[...$s.db.workouts,w]});$s.planDraft={cat:$s.planDraft.cat,parts:[]};render();toast(`${$s.selectedDate.slice(5).replace('-','/')} ‘${title}’ 예정을 넣었어요.`);return}
  if(form.id==='goal-weight-form'){const v=Number(d.goalWeight);$s.db=save({...$s.db,settings:{...$s.db.settings,goalWeight:v>0?v:null}});render();toast(v>0?`목표 체중을 ${v}kg로 정했어요.`:'목표 체중을 지웠어요.');return}
  if(form.id==='place-form'){const name=String(d.name||'').trim();if(!name)throw Error('장소 이름을 적어 주세요.');const gyms=[...new Set([...($s.db.settings.gyms||[]),name])];$s.db=save({...$s.db,settings:{...$s.db.settings,gyms,placeKinds:{...($s.db.settings.placeKinds||{}),[name]:d.kind||'헬스장'}}});$s.placeFormOpen=false;render();toast(`${name}을(를) 등록했어요.`);return}
  if(form.id==='macro-plan-form'){$s.db=save({...$s.db,settings:applyMacroPlan($s.db.settings||{},$s.mpPlan,$s.latestWeight())});$s.mpPlan=null;$s.sheetDirty=false;$s.modal=null;render();toast('탄단지 목표를 저장했어요.');return}
  const showResult=form.id==='workout-form'&&$s.resultWorkout&&$s.modal!=='routine';$s.modal=showResult?'workout-result':null;$s.workDraft=[];$s.workMeta={};render();if(!showResult)toast(form.id==='body-form'||form.id==='batch-form'?savedLine($s.db):'저장했습니다.');
 }catch(err){toast(err.message)}
});
function allExercises(){return [...mergeCatalogItems(EXERCISE_CATALOG,$s.sharedCatalog.exercises),...($s.db.customExercises||[])]}
function recentExercises(){const seen=new Set();return $s.recent($s.db.workouts).flatMap(w=>w.exercises).filter(e=>{const key=e.exerciseId||e.name;if(seen.has(key))return false;seen.add(key);return true})}
function previousExercise(ex){return $s.recent($s.db.workouts).flatMap(w=>w.exercises).find(e=>(ex.exerciseId?e.exerciseId===ex.exerciseId:e.name===ex.name)&&(e.machineId||null)===(ex.machineId||null))}
function persistDraft(){if($s.modal!=='workout'||getStorageStatus().blocked||$s.draftWarning)return;try{writeSession({exercises:$s.workDraft,meta:$s.workMeta,editId:$s.workEditId,timerEnds:$s.timerEnds});$s.savedDraft=readSession()}catch(e){$s.draftWarning='임시 저장 실패: '+e.message;toast($s.draftWarning)}}
function resumeSession(){const x=readSession();if(!x)return;if($s.db.workouts.some(w=>w.sourceDraftId===x.id)){$s.savedDraft=null;try{clearSession()}catch{}toast('이미 저장된 운동입니다. 운동 일지에서 수정하세요.');render();return}$s.workDraft=structuredClone(x.exercises);$s.workMeta={...x.meta};$s.workEditId=x.editId||null;$s.timerEnds=x.timerEnds||0;$s.modal='workout';render();toast('임시 운동 기록을 복구했습니다.')}

function recoveryBanner(){return `${noticeHTML($s.notice,$s.esc)}${cloudState.user&&$s.page==='home'?operatorNoticeHTML($s.db.settings?.consent):''}${storageBanner()}`}
function storageBanner(){const state=getStorageStatus();return state.blocked?`<section class="card" role="alert"><h2>저장소 복구가 필요합니다</h2><p>기존 원본은 보존했으며 덮어쓰기를 차단했습니다. ${$s.esc(state.reason||'')}</p><div class="actions"><button class="button" id="recovery-export">손상 원본 내려받기</button><button class="button secondary" data-modal="restore">정상 백업으로 복구</button><button class="button secondary" id="retry-recovery">중단된 복원 다시 복구</button></div></section>`:(q=>q.length&&($s.db.settings?.quarantineSeen||0)<q.length?`<section class="card quarantine-note" role="status"><h3>읽지 못한 기록 ${q.length}건을 따로 보관했어요</h3><p class="hint">형식이 맞지 않는 기록이 있어 그것만 옆에 두고 나머지는 그대로 열었어요. 이 기기와 서버 어디에서도 지우지 않았고, 동기화도 그 기록은 건드리지 않아요. 백업 파일에도 함께 담겨요.</p><div class="actions"><button class="button secondary" id="quarantine-export">보관한 기록 내려받기</button><button class="button secondary" id="quarantine-seen">확인했어요</button></div></section>`:'')($s.db.quarantine||[])}


function recommendationView(){const r=recommendWorkout($s.db,today());return {title:r.title||r.part||({hold:'오늘은 제안 보류',insufficient:'기록이 더 필요합니다',light:'부담을 낮출 날',limited:'정보가 부족한 참고 후보',ready:'오늘의 운동 후보'}[r.status])||'기록 기반 운동 초안',reason:r.reason||r.reasons?.join(' · ')||'최근 기록과 오늘 상태를 함께 확인하세요.',note:r.note||r.missing?.join(' · ')||'추정 정보입니다. 운동 부위와 강도는 직접 결정하세요.',raw:r}}






$s.tesseractPromise=void 0;async function getTesseract(){if(window.Tesseract)return window.Tesseract;if(!$s.tesseractPromise)$s.tesseractPromise=new Promise((resolve,reject)=>{const s=document.createElement('script');s.src='./vendor/tesseract.min.js';s.onload=()=>resolve(window.Tesseract);s.onerror=()=>reject(Error('OCR 도구를 불러오지 못했습니다. 인터넷 연결을 확인하거나 숫자 파일을 사용해 주세요.'));document.head.append(s)});return $s.tesseractPromise}
async function runOCR(){const status=document.getElementById('ocr-status'),file=document.getElementById('inbody-photo').files?.[0]||($s.sharedPhoto?await (await fetch($s.sharedPhoto)).blob():null);if(!file)throw Error('사진을 선택해 주세요.');status.textContent='인바디 270 결과지의 숫자를 읽고 있습니다…';/* 4.20.0 읽는 동안 결과지 사진에 스캔 이펙트 */const stopScan=attachScan(document.getElementById('photo-preview'));let scanOk=false;try{const T=await getTesseract();const result=await recognizeInBody270(file,T);document.getElementById('ocr-text').value=Object.entries(result.raw).map(([k,v])=>`${k}: ${v.trim()}`).join('\n');ocrFields(result.fields);status.textContent='숫자 읽기를 마쳤습니다. 모든 값을 원본과 비교한 뒤 저장해 주세요.';scanOk=true}catch(err){status.textContent=err.message;toast(err.message)}finally{stopScan(scanOk)}}async function shareWorkout(w){if(!w)return;const t=workoutTotals(w),canvas=document.createElement('canvas');canvas.width=900;canvas.height=920+Math.min(w.exercises.length,8)*54;const c=canvas.getContext('2d');c.fillStyle='#07111e';c.fillRect(0,0,canvas.width,canvas.height);c.fillStyle='#9ddcff';c.font='bold 26px sans-serif';c.fillText('MYLOGUE · 마이로그',48,60);c.fillStyle='#eaf4ff';c.font='bold 43px sans-serif';c.fillText(w.title,48,125);c.fillStyle='#a9bdd3';c.font='25px sans-serif';c.fillText(w.date,48,165);c.fillStyle='#3b8dff';c.font='bold 31px sans-serif';c.fillText(`${t.exercises}종목   ${t.sets}세트   ${t.reps}회   ${$s.fmt(t.volume,0)} kg`,48,236);let y=300;for(const e of w.exercises.slice(0,8)){c.fillStyle='#eaf4ff';c.font='24px sans-serif';c.fillText(e.name,48,y);c.fillStyle='#a9bdd3';c.font='20px sans-serif';c.fillText(`${e.kind==='cardio'?`${$s.fmt(e.durationMin)}분`:`완료 ${e.sets.filter(s=>s.completed!==false).length}세트`} · ${e.part}`,650,y);y+=54}const completedExercises=w.exercises.filter(e=>e.kind==='cardio'?(e.durationMin>0||e.distanceKm>0):e.sets.some(s=>s.completed!==false)),primary=[...new Set(completedExercises.flatMap(e=>e.primaryMuscleIds||[]))],secondary=[...new Set(completedExercises.flatMap(e=>e.secondaryMuscleIds||[]))].filter(x=>!primary.includes(x));for(const [i,side] of ['front','back'].entries()){const img=new Image();img.src='data:image/svg+xml;charset=utf-8,'+encodeURIComponent(anatomySvg(primary,secondary,{side,key:'export'}));await img.decode();c.drawImage(img,260+i*200,y+30,180,385)}c.fillStyle='#9ddcff';c.font='22px sans-serif';c.fillText('테크니컬 아틀라스 · 주 타깃 빨강 / 보조 사선',48,y+455);canvas.toBlob(blob=>{if(!blob){toast('이미지 생성에 실패했습니다.');return}downloadBlob(`mylogue-${w.date}.png`,blob).then(r=>{if(r===null)toast('운동 결과 이미지를 저장했습니다.')})},'image/png')}
$s.root.addEventListener('keydown',e=>{if((e.key==='Enter'||e.key===' ')&&e.target.matches('[data-filter-part]')){e.preventDefault();e.target.dispatchEvent(new MouseEvent('click',{bubbles:true}))}});
if(cloudState.user&&cloudState.approval!=='approved')maybeOnboard(false);
render();refreshProgressPhotos().catch(console.error);if(cloudState.approval==='approved'){refreshCatalog().catch(console.error);queueAutoSync();refreshApplicants().catch(console.error);refreshPopularity().catch(console.warn);if(aiLinkedNow())refreshAIDrafts().catch(console.error)}/* 4.26.0 예전 휴식 알약 잔재 제거(4.24.0에서 함수는 지웠는데 호출이 남아 저장된 초안에 타이머 값이 있으면 시작 때 멈췄다) */
globalThis.window?.addEventListener('pagehide',persistDraft);document.addEventListener?.('visibilitychange',()=>{persistDraft()});
// Native APK assets ship with the app. A PWA cache can keep an old UI after APK upgrades.
if('serviceWorker'in navigator&&location.protocol.startsWith('http')&&!window.Capacitor?.isNativePlatform?.())navigator.serviceWorker.register('./sw.js').catch(console.error);














function estimateFor(ex){return latestEstimate($s.db.workouts.map(w=>({...w,exercises:w.exercises.filter(e=>(ex.exerciseId?e.exerciseId===ex.exerciseId:e.name===ex.name)&&(e.machineId||null)===(ex.machineId||null))})),ex.name)}
async function readMachinePhoto(input){const file=input.files?.[0];if(!file)return;if(!/^image\/(jpeg|png|webp)$/.test(file.type)||file.size>10*1024*1024)throw Error('10 MB 이하 JPG·PNG·WebP 사진을 선택하세요.');const bitmap=await createImageBitmap(file);const scale=Math.min(1,800/Math.max(bitmap.width,bitmap.height));const canvas=document.createElement('canvas');canvas.width=Math.round(bitmap.width*scale);canvas.height=Math.round(bitmap.height*scale);canvas.getContext('2d').drawImage(bitmap,0,0,canvas.width,canvas.height);bitmap.close();$s.machinePhoto=canvas.toDataURL('image/jpeg',.8);const img=document.getElementById('machine-preview');img.src=$s.machinePhoto;img.hidden=false}









// 3.16.0 공유받은 AI 답: PWA 공유 대상(?text=)·Android 앱(네이티브가 남긴 값)
try{const q=new URLSearchParams(location.search),shared=[q.get('title'),q.get('text'),q.get('url')].filter(Boolean).join('\n');if(shared){history.replaceState(history.state,'',location.pathname+location.hash);setTimeout(()=>openAIInput(shared),400)}const pending=localStorage.getItem('mylogue.pendingShare');if(pending){localStorage.removeItem('mylogue.pendingShare');setTimeout(()=>openAIInput(pending),400)}const rec=q.get('record')||localStorage.getItem('mylogue.pendingShortcut');if(rec){if(q.get('record'))history.replaceState(history.state,'',location.pathname+location.hash);setTimeout(()=>openShortcut(rec),500)}if(globalThis.__mylogueSharedImage)setTimeout(()=>openSharedPhoto(globalThis.__mylogueSharedImage),500)}catch(error){console.error(error)}
// 3.19.0 체중 대비 탄단지 목표는 최근 체중으로 다시 계산
try{refreshGoalsByWeight()}catch(error){console.error(error)}

// 4.0.0 코치 모드: 초대 링크(?invite=)와 연동 불러오기(마스터 계정만, 다른 계정은 아무 일도 없음)
try{const q=new URLSearchParams(location.search),inv=q.get('invite');if(inv&&$s.coach.takeInvite(inv)){history.replaceState(history.state,'',location.pathname+location.hash);$s.page='settings';render();setTimeout(()=>document.getElementById('my-coach')?.scrollIntoView?.({block:'start'}),200)}}catch(error){console.error(error)}
try{if($s.coach.visible())$s.coach.refresh().catch(console.error)}catch(error){console.error(error)}

// 4.2.0 날짜 바를 좌우로 밀면 하루 전·다음 날
{let sx=null,sy=null;$s.root.addEventListener?.('touchstart',e=>{const b=e.target.closest?.('[data-datebar]');if(!b){sx=null;return}const t=e.touches[0];sx=t.clientX;sy=t.clientY},{passive:true});$s.root.addEventListener?.('touchend',e=>{if(sx==null)return;const t=e.changedTouches[0],dx=t.clientX-sx,dy=t.clientY-sy;sx=null;if(Math.abs(dx)>50&&Math.abs(dx)>Math.abs(dy)*1.5){$s.selectedDate=shiftDate($s.selectedDate,dx<0?1:-1);$s.dbOpen=false;render()}},{passive:true})}
