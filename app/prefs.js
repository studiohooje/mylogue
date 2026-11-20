// 3.4.0 나에게 맞춘 마이로그: 시작 문답으로 기본값을 정하고, 설정 '나의 기록 방식'에서 언제든 바꾼다.
// 저장 위치: db.settings.preferences (백업·동기화에 함께 포함). 데이터 기록 형식은 바꾸지 않는다.
// 계획: docs/plans/2026-11-20_맞춤시작_준비.md, 목업: mockups/onboarding-modes/index.html

import {cleanMeal, cleanWorkout, uid} from './domain.js';

export const PREF_DEFAULTS = Object.freeze({
 tracks:['workout','meal','body'], // 기록할 것 → 하단 탭·헤일로 완성 기준
 level:'mid',                      // new | mid | pro → 운동 설명(사용 근육) 기본 표시
 workoutMode:'set',                // set | after | guide(3.5.0 계획→안내)
 mealMode:'exact',                 // exact | simple | photo(예정, 지금은 exact) | off
 place:'gym',                      // gym | home | multi
 halo:true,                        // 홈 헤일로 표시
 restSec:90,                       // 기본 휴식 시간(초)
 cue:'voice',                      // 안내 방식: voice(소리+음성) | sound | vibrate | silent
 keepAwake:true,                   // 계획→안내 중 화면 켜 두기
 onboarded:false,                  // 시작 문답을 마쳤거나 건너뛰었는지
 hintShown:false                   // 첫 주 '바꾸는 방법' 말풍선을 보여 줬는지
});

const ALLOWED = {tracks:['workout','meal','body'], level:['new','mid','pro'], workoutMode:['set','after','guide'], mealMode:['exact','simple','photo','off'], place:['gym','home','multi'], cue:['voice','sound','vibrate','silent']};

export function prefsOf(db){
 const raw = (db && db.settings && db.settings.preferences) || {};
 const p = {...PREF_DEFAULTS, ...raw};
 p.tracks = Array.isArray(raw.tracks) ? raw.tracks.filter(x=>ALLOWED.tracks.includes(x)) : [...PREF_DEFAULTS.tracks];
 if(!p.tracks.length) p.tracks = [...PREF_DEFAULTS.tracks];
 for(const k of ['level','workoutMode','mealMode','place','cue']) if(!ALLOWED[k].includes(p[k])) p[k] = PREF_DEFAULTS[k];
 p.keepAwake = p.keepAwake !== false;
 if(p.mealMode==='off' && p.tracks.includes('meal')) p.tracks = p.tracks.filter(x=>x!=='meal');
 if(!p.tracks.includes('meal')) p.mealMode = 'off';
 p.restSec = Math.min(300, Math.max(15, Number(p.restSec)||PREF_DEFAULTS.restSec));
 p.halo = p.halo !== false;
 return p;
}

// 실제로 동작할 방식(아직 준비 중인 방식은 가장 가까운 방식으로)
export const effectiveWorkoutMode = p => ['after','guide'].includes(p.workoutMode) ? p.workoutMode : 'set';
export const effectiveMealMode = p => p.mealMode==='simple' ? 'simple' : p.mealMode==='off' ? 'off' : 'exact';

export function withPrefs(db, patch){
 const next = {...prefsOf(db), ...patch};
 if(patch.mealMode==='off') next.tracks = next.tracks.filter(x=>x!=='meal');
 if(patch.mealMode && patch.mealMode!=='off' && !next.tracks.includes('meal')) next.tracks = [...next.tracks, 'meal'];
 if(patch.tracks){ if(!next.tracks.includes('meal')) next.mealMode='off'; else if(next.mealMode==='off') next.mealMode='exact'; }
 return {...db, settings:{...db.settings, preferences:next}};
}

export const QUESTIONS = [
 {key:'tracks', multi:true, q:'무엇을 기록하고 싶나요?', s:'여러 개 골라도 돼요. 고른 것만 채우면 오늘의 헤일로가 완성돼요.', o:[
  ['workout','운','운동','세트 · 무게 · 머신'], ['meal','식','식단','끼니 · 음식 · 열량'], ['body','몸','몸','체중 · 체성분 · 눈바디']]},
 {key:'level', q:'운동은 얼마나 해 봤어요?', s:'운동 설명을 얼마나 보여 줄지 정해요.', o:[
  ['new','1','이제 시작해요','운동마다 쓰는 근육을 함께 보여 줘요'], ['mid','2','1년 안 됐어요','필요할 때 설명을 펼쳐 봐요'], ['pro','3','꾸준히 해 왔어요','설명은 접고 기록에 집중해요']]},
 {key:'workoutMode', q:'운동할 때 기록은 어떻게 할래요?', s:'언제든 바꿀 수 있어요.', o:[
  ['set','A','세트마다 바로 기록','한 세트 끝날 때마다 무게·횟수를 남겨요'], ['after','B','다 끝나고 한 번에','“45kg × 10회 × 3세트”처럼 몰아서 입력'], ['guide','C','미리 계획하고 안내 따라가기','세트·휴식을 정해 두면 소리로 알려 줘요. 폰은 거의 안 봐도 돼요']]},
 {key:'mealMode', q:'식단은 어떻게 남길래요?', s:'', o:[
  ['exact','정','음식과 양까지 정확히','음식 검색 · g 단위 · 영양 성분'], ['simple','간','끼니만 간단히','“점심 · 약 700kcal”처럼 빠르게'], ['photo','사','사진 먼저, 정리는 나중에','곧 제공돼요 · 그전까지는 정확히로 기록해요'], ['off','×','식단은 안 할래요','식단 탭을 숨겨요']]},
 {key:'place', q:'주로 어디서 운동해요?', s:'헬스장은 설정의 ‘내 헬스장’에서 이름이나 지도로 찾아 추가해요.', o:[
  ['gym','헬','헬스장','헬스장 머신 위주로 보여 줘요'], ['home','집','집에서','홈트 장소를 미리 만들어 둘게요'], ['multi','여','여러 곳','장소를 여러 개 등록해요']]}
];

const LABELS = {
 tracks:{workout:'운동', meal:'식단', body:'몸'},
 level:{new:'이제 시작', mid:'1년 미만', pro:'꾸준히'},
 workoutMode:{set:'세트마다 바로 기록', after:'다 끝나고 한 번에', guide:'계획하고 안내 따라가기'},
 mealMode:{exact:'음식과 양까지 정확히', simple:'끼니만 간단히', photo:'사진 먼저(곧 제공)', off:'식단 기록 안 함'},
 place:{gym:'헬스장', home:'집', multi:'여러 곳'}
};
export const prefLabel = (key, value) => key==='tracks' ? value.map(v=>LABELS.tracks[v]).join(' · ') : (LABELS[key]||{})[value] || '';

const h = v => String(v??'').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

// 시작 문답 화면(모달 본문). step 0~4, 5 = 결과
export function onboardingHTML(state){
 const {step, answers} = state;
 if(step >= QUESTIONS.length){
  const p = {...PREF_DEFAULTS, ...answers};
  const rows = [['기록할 것', prefLabel('tracks', p.tracks)], ['운동 기록', prefLabel('workoutMode', p.workoutMode)], ['운동 설명', p.level==='new'?'사용 근육 함께 보기':p.level==='pro'?'접어 두기':'필요할 때 펼치기'], ['식단 입력', prefLabel('mealMode', p.mealMode)], ['운동 장소', prefLabel('place', p.place)]];
  return `<div class="onb"><p class="onb-q">이렇게 시작할게요</p><p class="onb-s">답에 맞춰 기본값을 정했어요. 언제든 바꿀 수 있어요.</p><div class="onb-sum">${rows.map(([k,v])=>`<div class="onb-row"><span>${k}</span><b>${h(v)}</b></div>`).join('')}</div>${changeGuideHTML()}<div class="onb-btns"><button type="button" class="button" id="onb-finish">시작하기</button></div></div>`;
 }
 const Q = QUESTIONS[step], cur = answers[Q.key];
 const on = v => Q.multi ? (cur||[]).includes(v) : cur===v;
 return `<div class="onb"><div class="onb-top"><div class="onb-dots" aria-label="${step+1} / ${QUESTIONS.length}">${QUESTIONS.map((_,i)=>`<i class="${i<=step?'on':''}"></i>`).join('')}</div><button type="button" class="text-button" id="onb-skip">건너뛰기</button></div><p class="onb-q">${Q.q}</p>${Q.s?`<p class="onb-s">${Q.s}</p>`:''}<div class="onb-opts" role="${Q.multi?'group':'radiogroup'}">${Q.o.map(([v,ic,t,d])=>`<button type="button" class="onb-opt ${on(v)?'on':''}" data-onb-pick="${v}" aria-pressed="${on(v)}"><span class="onb-ic" aria-hidden="true">${ic}</span><span><b>${t}</b><small>${d}</small></span></button>`).join('')}</div><div class="onb-btns">${step?'<button type="button" class="button secondary" id="onb-prev">이전</button>':''}<button type="button" class="button" id="onb-next">${step===QUESTIONS.length-1?'완료':'다음'}</button></div></div>`;
}

export function onboardingPick(state, value){
 const Q = QUESTIONS[state.step];
 if(Q.multi){ const cur = state.answers[Q.key]||[]; let next = cur.includes(value) ? cur.filter(x=>x!==value) : [...cur, value]; if(!next.length) next = cur; state.answers[Q.key] = next; }
 else state.answers[Q.key] = value;
 if(Q.key==='mealMode' && value==='off') state.answers.tracks = (state.answers.tracks||PREF_DEFAULTS.tracks).filter(x=>x!=='meal');
}

export const newOnboarding = db => {
 const p = prefsOf(db);
 return {step:0, answers:{tracks:[...p.tracks], level:p.level, workoutMode:p.workoutMode, mealMode:p.mealMode==='off'&&p.tracks.includes('meal')?'exact':p.mealMode, place:p.place}};
};

export function finishOnboarding(db, answers){
 const a = {...answers};
 if(!(a.tracks||[]).includes('meal')) a.mealMode = 'off';
 else if(a.mealMode==='off') a.mealMode = 'exact';
 let next = withPrefs(db, {...a, onboarded:true});
 if(a.place==='home'){ const gyms = next.settings.gyms||[]; if(!gyms.includes('집')) next = {...next, settings:{...next.settings, gyms:[...gyms, '집']}}; }
 return next;
}

export const skipOnboarding = db => withPrefs(db, {onboarded:true});

export function changeGuideHTML(){
 return `<div class="pref-guide"><b>나중에 바꾸려면</b><div class="pref-crumb"><span>하단 설정</span><i aria-hidden="true">›</i><span>나의 기록 방식</span><i aria-hidden="true">›</i><span>바꿀 항목 누르기</span></div><p>운동·식단 화면 위쪽의 <b>‘기록 방식 ▾’</b> 버튼으로도 바로 바꿀 수 있어요.</p></div>`;
}

// 설정 화면: 나의 기록 방식
export function prefsSettingsHTML(db){
 const p = prefsOf(db);
 const seg = (key, opts) => `<div class="pref-seg" role="radiogroup">${opts.map(v=>`<button type="button" class="${(key==='tracks'?p.tracks.includes(v):p[key]===v)?'on':''}" data-pref="${key}" data-pref-value="${v}" aria-pressed="${key==='tracks'?p.tracks.includes(v):p[key]===v}">${h(key==='tracks'?LABELS.tracks[v]:shortLabel(key,v))}</button>`).join('')}</div>`;
 return `<section class="section card pref-card" id="my-record-style"><h3>나의 기록 방식</h3><p class="hint">바꾼 즉시 적용돼요. 지난 기록은 그대로예요.</p>
 <div class="pref-item"><div><b>기록할 것</b><small>고른 것만 하단 탭에 보이고, 헤일로도 이것만 채우면 완성돼요</small></div>${seg('tracks',['workout','meal','body'])}</div>
 <div class="pref-item"><div><b>운동 기록 방식</b><small>세트마다 바로 / 다 끝나고 한 번에 / 미리 계획하고 소리 안내</small></div>${seg('workoutMode',['set','after','guide'])}</div>
 <div class="pref-item"><div><b>식단 입력 방식</b><small>${p.mealMode==='photo'?'‘사진 먼저’는 곧 제공돼요. 그전까지는 정확히로 기록해요':'정확히 = 음식 검색 · 간단히 = 끼니와 대략 열량'}</small></div>${seg('mealMode',['exact','simple','photo','off'])}</div>
 <div class="pref-item"><div><b>운동 설명</b><small>운동을 고를 때 쓰는 근육 그림을 바로 보여 줄지</small></div>${seg('level',['new','mid','pro'])}</div>
 <div class="pref-item"><div><b>기본 휴식 시간</b><small>세트를 마치면 이 시간으로 휴식 타이머가 시작돼요</small></div><div class="pref-seg">${[60,90,120,180].map(s=>`<button type="button" class="${p.restSec===s?'on':''}" data-pref="restSec" data-pref-value="${s}" aria-pressed="${p.restSec===s}">${s<120?s+'초':(s/60)+'분'}</button>`).join('')}</div></div>
 <div class="pref-item"><div><b>안내 방식</b><small>계획→안내 모드의 휴식·세트 알림. 진동은 Android만 돼요</small></div>${seg('cue',['voice','sound','vibrate','silent'])}</div>
 <div class="pref-item"><div><b>화면 켜 두기</b><small>계획→안내 중 화면이 꺼지지 않게 해요(배터리 사용 증가)</small></div><div class="pref-seg"><button type="button" class="${p.keepAwake?'on':''}" data-pref="keepAwake" data-pref-value="on" aria-pressed="${p.keepAwake}">켜 두기</button><button type="button" class="${!p.keepAwake?'on':''}" data-pref="keepAwake" data-pref-value="off" aria-pressed="${!p.keepAwake}">기기 설정대로</button></div></div>
 <div class="pref-item"><div><b>오늘의 헤일로</b><small>홈 맨 위 카드의 기록 고리</small></div><div class="pref-seg"><button type="button" class="${p.halo?'on':''}" data-pref="halo" data-pref-value="on" aria-pressed="${p.halo}">보이기</button><button type="button" class="${!p.halo?'on':''}" data-pref="halo" data-pref-value="off" aria-pressed="${!p.halo}">숨기기</button></div></div>
 <button type="button" class="button secondary" id="onb-restart">시작 문답 다시 하기</button></section>`;
}
const shortLabel = (key, v) => ({cue:{voice:'소리+음성',sound:'소리만',vibrate:'진동만',silent:'화면만'},workoutMode:{set:'세트마다',after:'끝나고 한 번에',guide:'계획→안내'}, mealMode:{exact:'정확히',simple:'간단히',photo:'사진 먼저(곧)',off:'안 함'}, level:{new:'근육 함께 보기',mid:'필요할 때',pro:'접어 두기'}}[key]||{})[v]||v;

export function applyPrefClick(db, target){
 const key = target.dataset.pref, v = target.dataset.prefValue;
 if(key==='tracks'){ const p = prefsOf(db); let next = p.tracks.includes(v) ? p.tracks.filter(x=>x!==v) : [...p.tracks, v]; if(!next.length) return {db, message:'하나 이상은 기록해야 해요.'}; return {db:withPrefs(db,{tracks:next}), message:`기록할 것: ${prefLabel('tracks', next)}`}; }
 if(key==='restSec') return {db:withPrefs(db,{restSec:Number(v)}), message:`기본 휴식 ${Number(v)}초`};
 if(key==='halo') return {db:withPrefs(db,{halo:v==='on'}), message:v==='on'?'헤일로를 보여 줘요':'헤일로를 숨겼어요'};
 if(key==='keepAwake') return {db:withPrefs(db,{keepAwake:v==='on'}), message:v==='on'?'안내 중 화면을 켜 둬요':'화면은 기기 설정대로 꺼져요'};
 if(!ALLOWED[key]?.includes(v)) return {db};
 const soon = key==='mealMode'&&v==='photo';
 return {db:withPrefs(db,{[key]:v}), message: soon ? '곧 제공될 방식이에요. 그전까지는 지금 방식으로 기록해요.' : `${key==='workoutMode'?'운동':key==='mealMode'?'식단':key==='cue'?'안내 방식':'운동 설명'}: ${shortLabel(key,v)}`};
}

// 운동·식단 화면 위 바로가기 칩
export function modeChipHTML(db, kind){
 const p = prefsOf(db);
 const label = kind==='workout' ? shortLabel('workoutMode', effectiveWorkoutMode(p)) : shortLabel('mealMode', effectiveMealMode(p));
 return `<button type="button" class="mode-chip" data-page="settings" data-pref-jump="1" aria-label="기록 방식 바꾸기: 지금 ${label}">${kind==='workout'?'운동':'식단'} 기록 방식 · ${h(label)} ▾</button>`;
}

// ── 운동: 다 끝나고 한 번에 ──
export const emptyAfterWorkout = (date, gym='') => ({date, gymName:gym, rows:[{name:'',weight:'',reps:'',sets:3,unit:'kg'}]});
export function afterWorkoutFromLast(db, date, gym=''){
 const last = [...(db.workouts||[])].sort((a,b)=>b.date.localeCompare(a.date))[0];
 if(!last) return emptyAfterWorkout(date, gym);
 const rows = (last.exercises||[]).filter(e=>e.kind!=='cardio'&&(e.sets||[]).length).map(e=>{const done=(e.sets||[]).filter(s=>s.completed!==false);const s=done[done.length-1]||e.sets[0];return {name:e.name,weight:s.originalWeight??s.weight??'',reps:s.reps??'',sets:done.length||e.sets.length,unit:s.originalUnit||s.unit||'kg'}});
 return {date, gymName:gym||last.gymName||'', rows:rows.length?rows:emptyAfterWorkout(date).rows};
}
export function afterWorkoutHTML(state, exerciseNames=[], gyms=[]){
 return `<form id="after-workout-form" class="gap" novalidate><p class="hint">운동이 끝난 뒤 한 번에 남겨요. 같은 무게·횟수는 세트 수만 적으면 돼요.</p>
 <div class="after-meta"><label class="field">날짜<input name="date" type="date" value="${h(state.date)}" required></label>${gyms.length?`<label class="field">장소<select name="gymName"><option value="">선택 안 함</option>${gyms.map(g=>`<option ${g===state.gymName?'selected':''}>${h(g)}</option>`).join('')}</select></label>`:''}</div>
 <datalist id="after-ex-names">${exerciseNames.slice(0,400).map(n=>`<option value="${h(n)}"></option>`).join('')}</datalist>
 <div class="after-rows">${state.rows.map((r,i)=>`<div class="after-row" data-after-row="${i}"><label class="field after-name">종목<input name="name" list="after-ex-names" value="${h(r.name)}" placeholder="예: 벤치프레스" autocomplete="off"></label><label class="field">무게<input name="weight" type="number" inputmode="decimal" min="0" step="0.5" value="${h(r.weight)}" placeholder="0"></label><label class="field">단위<select name="unit"><option ${r.unit!=='lb'?'selected':''}>kg</option><option ${r.unit==='lb'?'selected':''}>lb</option></select></label><label class="field">횟수<input name="reps" type="number" inputmode="numeric" min="1" step="1" value="${h(r.reps)}" placeholder="10"></label><label class="field">세트<input name="sets" type="number" inputmode="numeric" min="1" max="20" step="1" value="${h(r.sets)}"></label><button type="button" class="after-del" data-after-del="${i}" aria-label="${i+1}번째 종목 지우기">×</button></div>`).join('')}</div>
 <div class="actions"><button type="button" class="button secondary" id="after-add">＋ 종목</button><button type="button" class="button secondary" id="after-last">지난 운동 불러오기</button></div>
 <button type="submit" class="button" id="after-save">저장</button></form>`;
}
export function readAfterWorkoutForm(form){
 const fd = n => form.querySelector(`[name="${n}"]`)?.value ?? '';
 const rows = [...form.querySelectorAll('[data-after-row]')].map(el=>({name:el.querySelector('[name=name]').value.trim(), weight:el.querySelector('[name=weight]').value, reps:el.querySelector('[name=reps]').value, sets:el.querySelector('[name=sets]').value, unit:el.querySelector('[name=unit]').value}));
 return {date:fd('date'), gymName:fd('gymName'), rows};
}
export function afterWorkoutRecord(state, nowIso=new Date().toISOString()){
 const rows = state.rows.filter(r=>String(r.name||'').trim());
 if(!rows.length) throw Error('종목을 하나 이상 입력해 주세요.');
 const exercises = rows.map(r=>{
  const weight = r.weight===''||r.weight==null ? 0 : Number(r.weight), reps = Number(r.reps), sets = Number(r.sets);
  if(!Number.isFinite(weight)||weight<0) throw Error(`${r.name}: 무게를 확인해 주세요.`);
  if(!Number.isInteger(reps)||reps<1) throw Error(`${r.name}: 횟수를 확인해 주세요.`);
  if(!Number.isInteger(sets)||sets<1||sets>20) throw Error(`${r.name}: 세트 수는 1~20이에요.`);
  const unit = r.unit==='lb'?'lb':'kg';
  return {name:String(r.name).trim(), sets:Array.from({length:sets}, ()=>({id:uid(), weight, originalWeight:weight, unit, originalUnit:unit, reps, type:'본세트', completed:true, completedAt:nowIso}))};
 });
 return cleanWorkout({date:state.date, gymName:state.gymName||'', title:'오늘의 운동', exercises, note:'끝나고 한 번에 입력', updatedAt:nowIso});
}

// ── 식단: 끼니만 간단히 ──
export const SIMPLE_SLOTS = ['아침','점심','저녁','간식'];
export const guessSlot = (hour=new Date().getHours()) => hour<10?'아침':hour<15?'점심':hour<21?'저녁':'간식';
export function simpleMealHTML(date, time, slot=guessSlot()){
 return `<form id="simple-meal-form" class="gap" novalidate><p class="hint">무엇을 먹었는지와 대략적인 열량만 남겨요. 정확한 음식 기록은 언제든 ‘정확히’로 바꿔서 할 수 있어요.</p>
 <div class="pref-seg" role="radiogroup">${SIMPLE_SLOTS.map(s=>`<button type="button" class="${s===slot?'on':''}" data-simple-slot="${s}" aria-pressed="${s===slot}">${s}</button>`).join('')}</div><input type="hidden" name="slot" value="${h(slot)}">
 <label class="field">무엇을 먹었나요<input name="name" placeholder="예: 김치찌개 정식" autocomplete="off"></label>
 <label class="field">대략 열량 (모르면 비워 두세요)<input name="calories" type="number" inputmode="numeric" min="0" step="10" placeholder="예: 700"></label>
 <div class="chip-row">${[300,500,700,900].map(k=>`<button type="button" class="chip" data-simple-kcal="${k}">약 ${k}kcal</button>`).join('')}</div>
 <div class="after-meta"><label class="field">날짜<input name="date" type="date" value="${h(date)}"></label><label class="field">시각<input name="time" type="time" value="${h(time)}"></label></div>
 <button type="submit" class="button">저장</button></form>`;
}
export function simpleMealRecord(form, nowIso=new Date().toISOString()){
 const v = n => form.querySelector(`[name="${n}"]`)?.value ?? '';
 const slot = v('slot')||'식사', name = v('name').trim() || slot, date = v('date'), time = v('time')||'12:00';
 const kcal = v('calories')==='' ? null : Number(v('calories'));
 if(kcal!==null && (!Number.isFinite(kcal)||kcal<0)) throw Error('열량을 확인해 주세요.');
 const at = new Date(`${date}T${time}:00`);
 return cleanMeal({date, slot, name, servingQty:1, servingUnit:'끼', calories:kcal, mealGroupId:uid(), loggedAt:Number.isNaN(at.getTime())?nowIso:at.toISOString(), source:'manual-simple', note:kcal===null?'':'대략 열량(간단히 입력)', createdAt:nowIso, updatedAt:nowIso});
}
