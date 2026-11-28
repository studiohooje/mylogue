import {dayTone} from './kr-holidays.js';
import {partOf} from './body-part.js';
import {workoutMenuHTML} from './workout-menu.js';
import {REST_ICON,catOf} from './quick-entry.js';
import {workoutBurn} from './exercise-burn.js';
import {exArtHTML} from './exercise-art-ui.js';
import {mealTotals,workoutTotals,actualDB} from './domain.js';
import {heroSlot,emptyArt,brandIcon} from './brand-icons.js';
import {emptyLine,emptyAction} from './motivation.js';
import {dayRecords,rhythmFor,haloMessage} from './halo.js';
import {prefsOf} from './prefs.js';
import {macroMiniHTML,plannedToggle} from './nutrition-goals.js';
import {scaleRecords,inbodyRecords,weightSpark,daysAgo,isInbody,weightTrend,paceText} from './body-series.js';
import {anatomySvg,MUSCLE_LABELS} from './exercise-ui.js';

const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmt=(n,d=0)=>Number(n||0).toLocaleString('ko-KR',{maximumFractionDigits:d});
// 4.2.1 시각 비교는 실제 시점으로: UTC('…Z')와 현지 시각 문자열이 섞여 있어도 순서가 맞게 현지 'YYYY-MM-DDTHH:MM:SS'로 맞춘다
const localISO=v=>{const d=new Date(v);if(Number.isNaN(d.getTime()))return String(v||'');const p=n=>String(n).padStart(2,'0');return `${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`};
const when=item=>localISO(item.loggedAt||(item.exercises||[]).map(e=>e.completedAt||(e.sets||[]).find(x=>x.completedAt)?.completedAt).find(Boolean)||item.createdAt||`${item.date}T12:00:00`);
const clock=value=>{const d=new Date(value);return Number.isNaN(d.getTime())?'—':`${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`};

// 4.6.0 끼니 부르는 법(대표님: 7·9·12·15·18시처럼 여러 번 먹는 사람은 번호가 편함 → 처음 문답·설정에서 고름).
// slot: 먹은 시각으로 아침(4~10:30)·점심(~14:30)·간식(~17)·저녁(~21)·야식. 같은 이름이 또 나오면 '간식 2'처럼 번호를 붙인다.
export const SLOT_OF = at => { const d = new Date(at), m = Number.isNaN(d.getTime()) ? 720 : d.getHours()*60 + d.getMinutes(); return m>=240&&m<630 ? '아침' : m>=630&&m<870 ? '점심' : m>=870&&m<1020 ? '간식' : m>=1020&&m<1260 ? '저녁' : '야식'; };
export function mealNames(groups = [], mode = 'number'){
 const out = new Map(), seen = {};
 groups.forEach((g, i) => { if(mode!=='slot'){ out.set(g.key, `식사${i+1}`); return; } const n = SLOT_OF(g.at); seen[n] = (seen[n]||0) + 1; out.set(g.key, seen[n]>1 ? `${n} ${seen[n]}` : n); });
 return out;
}
// 4.7.0 헤일로 옆 '이번 주 n일 기록'(연속 기록 대신 — 하루 빠져도 끊기지 않는 말)
export function weekDays(db, date){ const d = new Date(`${date}T12:00:00`), mon = new Date(d); mon.setDate(d.getDate() - ((d.getDay()+6)%7)); const p = n => String(n).padStart(2,'0'), f = x => `${x.getFullYear()}-${p(x.getMonth()+1)}-${p(x.getDate())}`, from = f(mon); return new Set([...(db.meals||[]), ...(db.workouts||[]), ...(db.body||[])].filter(x => !x.planned && x.date>=from && x.date<=date).map(x => x.date)).size; }
export function mealGroups(meals=[]){
 const map=new Map();for(const meal of meals){const key=meal.mealGroupId||`legacy:${meal.slot||'식사'}`;if(!map.has(key))map.set(key,{key,at:when(meal),items:[]});const group=map.get(key);group.items.push(meal);group.planned=group.items.every(x=>x.planned);if(when(meal)<group.at)group.at=when(meal)}
 return [...map.values()].sort((a,b)=>a.at.localeCompare(b.at));
}
export function workoutTitle(workout){const custom=String(workout.title||'').trim();if(custom&&custom!=='오늘의 운동')return custom;const names=(workout.exercises||[]).filter(e=>e.name&&((e.sets||[]).some(s=>s.completed!==false)||e.kind==='cardio')).map(e=>e.name);return names.length?`${names[0]}${names.length>1?` 외 ${names.length-1}종`:''}`:'운동 기록'}
// 5.1.0 대표님 C-3안: 테두리 없이 시간 축 위에 바로(아이콘 원 + 세로 점선), 음식은 한 줄에 하나(앞부분… + 양), 2개까지 + '외 N개'
const TL3_ICON={/* 5.4.9 대표님: 홈 버튼과 같은 새 아이콘(기울인 덤벨·밥그릇)을 함께 쓴다 */meal:'<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M3.5 3v5.5a3.5 3.5 0 0 0 7 0V3M7 3v5.5M7 12v9"/><path d="M19.5 21V3c-2 1.6-3 4.2-3 7.2V13h3"/></svg>'/* 2026-11-27 대표님: 타임라인 식사는 포크·나이프 */,workout:brandIcon('workout','',true),rest:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M19.5 14.5A7.5 7.5 0 0 1 9.5 4.5a7.5 7.5 0 1 0 10 10Z" fill="currentColor"/></svg>'};
const tl3Wrap=(kind,html)=>`<div class="tl3-step tl3-${kind}"><span class="tl3-axis"><span class="tl3-ico">${TL3_ICON[kind]||''}</span></span><div class="tl3-body">${html}</div></div>`;
export function foodLines(items=[],max=4){const q=x=>`${fmt(x.servingQty,1)}${esc(x.servingUnit||'회')}`,rest=items.slice(max);return `<ul class="tl3-foods">${items.slice(0,max).map(x=>`<li title="${esc(x.name)} ${q(x)}"><span class="nm">${esc(x.name)}</span><span class="q">${q(x)}</span></li>`).join('')}${rest.length?`<li class="more"><button type="button" class="tl3-more" title="${esc(rest.map(x=>`${x.name} ${q(x)}`).join(', '))}" data-tl3-more>외 ${rest.length}개</button><span class="tl3-tip" role="tooltip">${rest.map(x=>`<span>${esc(x.name)} <b>${q(x)}</b></span>`).join('')}</span></li>`:''}</ul>`}
export function renderHomeTimeline(db,date,opts={}){
 const pf=prefsOf(db);
 // 4.12 운동 대략 소모 칼로리: 그날까지의 최근 체중으로
 const bw=[...(db.body||[])].filter(x=>x.weight&&String(x.date)<=date).sort((a,b)=>String(a.date).localeCompare(String(b.date))).at(-1)?.weight||null;
 const groups=mealGroups((db.meals||[]).filter(m=>m.date===date));const mealNm=mealNames(groups,pf.mealLabel);const workouts=(db.workouts||[]).filter(w=>w.date===date);
 const events=[...groups.map((g,i)=>({type:'meal',at:g.at,group:g,index:i+1})),...workouts.map(w=>({type:'workout',at:w.rest?'':when(w),workout:w}))].sort((a,b)=>a.at.localeCompare(b.at));
 const cards=events.map(item=>{const kind=item.type==='meal'?'meal':item.workout?.rest?'rest':'workout';return tl3Wrap(kind,(()=>{
  const planBadge=on=>on?'<span class="plan-badge">예정</span>':'',planBtn=(on,key)=>on?`<button type="button" class="text-button tl-confirm" data-plan-confirm="${esc(key)}">${String(key).startsWith('meal')?'먹었어요':'했어요'}</button>`:'';
  if(item.type==='meal'){const g=item.group,m=mealTotals(g.items),names=g.items.map(x=>`${esc(x.name)} ${fmt(x.servingQty,1)}${esc(x.servingUnit||'회')}`).join(' · ');return `<article class="timeline-card${g.planned?' planned':''}"><div class="timeline-card-top"><strong>${esc(mealNm.get(g.key)||`식사${item.index}`)}${planBadge(g.planned)+((g.items||[]).some(x=>x.importBatch)?'<em class="imp-tag">가져온 기록</em>':'')}</strong><span class="tl-right"><time>${clock(g.at)}</time><button type="button" class="tl-more" data-qm="${esc(g.key)}" data-qm-date="${esc(date)}" aria-label="${esc(mealNm.get(g.key)||`식사${item.index}`)} 고치기">⋯</button></span></div><div class="tl3-row">${foodLines(g.items)}<strong class="tl3-val">${fmt(m.calories)}<small>kcal</small></strong></div><div class="macrobar" aria-label="탄수화물 ${m.percent.carbs}%, 단백질 ${m.percent.protein}%, 지방 ${m.percent.fat}%"><i style="width:${m.percent.carbs}%"></i><i style="width:${m.percent.protein}%"></i><i style="width:${m.percent.fat}%"></i></div><p class="timeline-macros">탄수 ${fmt(m.carbs,1)}g · 단백질 ${fmt(m.protein,1)}g · 지방 ${fmt(m.fat,1)}g</p>${g.planned?`<div class="tl-ate"><button type="button" data-plan-confirm="${esc('meal:'+g.key)}">먹었어요</button></div>`:''}</article>`}/* 2026-11-27 대표님: '수정' 글자 대신 ⋯(운동과 같게), '먹었어요'는 카드 아래 오른쪽 */
  if(item.workout.rest)return `<article class="timeline-card rest-card"><div class="timeline-card-top"><span>휴식 <small class="rest-day">· 하루</small></span><span class="tl-right"><button type="button" class="text-button tl-edit" data-delete="workouts:${esc(item.workout.id)}" aria-label="휴식 기록 지우기">지우기</button></span></div><h3>${REST_ICON} 의도적 휴식</h3><p class="timeline-preview">회복도 훈련의 일부예요.</p></article>`;
  const w=item.workout,burn=w.planned?null:workoutBurn(w,bw)?.kcal,t=workoutTotals(w),names=(w.exercises||[]).filter(e=>e.name).map(e=>e.name),preview=names.slice(0,3).map(esc).join(' · ');return `<article class="timeline-card${w.planned?' planned':''}"><div class="timeline-card-top"><span>운동${planBadge(w.planned)}${w.importBatch?'<em class="imp-tag">가져온 기록</em>':''}</span><span class="tl-right"><time>${clock(item.at)}</time>${planBtn(w.planned,'workout:'+w.id)}${workoutMenuHTML(w,db)}</span></div><div class="tl3-row tl3-wrow"><h3>${esc(workoutTitle(w))}</h3>${/* 2026-11-28 대표님: 소모 칼로리도 식사 칼로리와 같은 자리(오른쪽)에, 색은 다르게 */burn!=null?`<strong class="tl3-val tl3-burn" title="운동으로 쓴 칼로리(추정)">${fmt(burn)}<small>kcal</small></strong>`:''}</div>${(()=>{/* 4.18.0 대표님: 한 운동을 차례대로 전부(그림이 없으면 부위 글자). 많으면 8개 + 나머지 수 */const ex=(w.exercises||[]).filter(e=>e.name),a=ex.slice(0,8).map(e=>exArtHTML(e,'ex-art-sm',{fallback:true})).join('');return a?`<div class="tl-art">${a}${ex.length>8?`<span class="tl-art-more">+${ex.length-8}</span>`:''}</div>`:''})()}<p class="timeline-metrics">${(()=>{const c=(w.exercises||[]).filter(e=>e.kind==='cardio'),min=c.reduce((a,e)=>a+(Number(e.durationMin)||0),0),km=c.reduce((a,e)=>a+(Number(e.distanceKm)||0),0),parts=[];if(t.sets)parts.push(`${t.exercises-c.length}종목 · ${t.sets}세트 · 볼륨 ${fmt(t.volume)}kg`);if(min)parts.push(`${fmt(min)}분`);if(km)parts.push(`${fmt(km,2)}km`);const mv=c.reduce((a,e)=>a+(e.moves?.length||0),0);if(mv)parts.push(`필라테스 동작 ${mv}개`);return parts.join(' · ')||(w.recalled?'기억나는 만큼 적음':`${t.exercises}종목`)})()}</p><p class="timeline-preview">${preview}${names.length>3?` 외 ${names.length-3}종`:''}</p><button class="text-button timeline-link" data-detail="${esc(w.id)}">전체 운동 보기 →</button></article>`
 })())}).join('');
 const body=(db.body||[]).filter(x=>x.date<=date).sort((a,b)=>b.date.localeCompare(a.date))[0];
 const mealTotal=mealTotals((db.meals||[]).filter(x=>x.date===date&&!x.planned));
 const doneWorkouts=workouts.filter(w=>!w.planned),workoutSets=doneWorkouts.reduce((sum,w)=>sum+workoutTotals(w).sets,0),adb=actualDB(db);
 /* 2026-11-27 대표님(헤일로 카드 목업 승인): 오늘도 큰 글씨는 늘 '가장 쉬운 건강 관리의 시작, 기록.', 동기부여 말은 그 아래 작게. 글 묶음과 헤일로를 위아래 가운데로(halo.js hero-v2) */
 const v2=opts.voiceHtml?String(opts.voiceHtml).replace('<div class="home-voice','<div class="hero-copy home-voice').replace('<p class="hv-title">','<h2 class="hero-slogan">가장 쉬운 건강 관리의 시작, <em>기록.</em></h2><p class="hv-title">'):'';
 return `<section class="timeline-hero hero-art hero-${heroSlot()}${v2?' hero-v2':''}">${v2||'<h2>가장 쉬운 건강 관리의 시작,<br><em>기록.</em></h2>'}<p class="hero-msg${opts.voiceHtml?' small':''}">${esc(pf.halo?haloMessage(dayRecords(adb,date),rhythmFor(adb,date),pf.tracks):'한 끼, 한 세트씩 내 흐름을 알아가요.')}${(n=>n>=2?`<span class="hero-week">이번 주 ${n}일 기록</span>`:'')(weekDays(adb,date))}</p><div class="hero-glow" aria-hidden="true"></div><svg class="halo-art" aria-hidden="true" focusable="false"></svg></section><section class="section home-quick" aria-label="기록하기"><div class="home-duo"><button class="ai-magic" data-modal="ai-chat"><span class="ai-magic-glow" aria-hidden="true"></span><span class="ai-magic-icon" aria-hidden="true">✦</span><span class="ai-magic-text"><b>AI로 입력</b></span></button><button type="button" class="mate-quick" data-mate-quick aria-label="메이트로그에 바로 찍어 올리기"><span class="mate-quick-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M4 8h3l2-3h6l2 3h3v11H4z" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round"/><circle cx="12" cy="13" r="3.5" fill="none" stroke="currentColor" stroke-width="2.2"/></svg></span><span class="ai-magic-text"><b>바로 찍기</b></span></button></div><div class="actions">${pf.tracks.includes('body')?`<button class="button home-rec secondary" data-modal="body">${brandIcon('body','rec-ico',true)}<b class="rec-label">수치 기록</b></button>`:''}${pf.tracks.includes('meal')?`<button class="button home-rec" data-modal="batch">${brandIcon('food','rec-ico',true)}<b class="rec-label">식사 기록</b></button>`:''}${pf.tracks.includes('workout')?`<button class="button home-rec ${pf.tracks.includes('meal')?'secondary':''}" data-modal="workout">${brandIcon('workout','rec-ico',true)}<b class="rec-label">운동 기록</b></button>`:''}</div></section><section class="section home-overview"><div class="section-title"><h3>${opts.dateBar?'한눈에 보기':'오늘 한눈에 보기'}</h3>${plannedToggle(opts.plannedCount||0,!!opts.showPlanned)}</div>${opts.motivHtml||''}${opts.dateBar||''}<div class="home-stat-grid">${weightStatHTML(db,date)}${pf.tracks.includes('meal')?macroMiniHTML(mealTotal,db.settings||{},{planned:opts.planned,showPlanned:opts.showPlanned,proteinFirst:pf.glp1}):''}${workoutStatHTML(doneWorkouts,workoutSets,db,date)}</div></section><section class="section timeline-section"><div class="section-title"><h3>${opts.isToday===false?'그날의 타임라인':'오늘의 타임라인'}</h3></div><div class="timeline-list">${cards||emptyArt('timeline',emptyLine('any'),'card',emptyAction('any'))}</div></section>`;
}

// 3.18.0 홈 체중 칸: 체중계 체중(인바디 제외) + 최근 30일 작은 그래프, 'N일 전'
function weightStatHTML(db,date){
 const rec=scaleRecords(db).filter(b=>b.date<=date).at(-1)||inbodyRecords(db).filter(b=>b.date<=date&&b.weight).at(-1);
 /* 2026-11-27 대표님: 숫자는 직접 잰 값(추세 체중 아님), 옆에 언제 잰 값인지 */const spark=weightSpark(db,date,30,{trend:false});
 return `<button type="button" class="home-stat home-stat-weight" data-page="body" aria-label="체중 ${rec?`${fmt(rec.weight,1)}kg, ${daysAgo(rec.date,date)}`:'기록 없음'}, 자세히 보기"><span class="stat-head"><small>체중</small>${rec&&(rec.date!==date||isInbody(rec))?`<em>${esc(daysAgo(rec.date,date))}${isInbody(rec)?' · 인바디':''}</em>`:''}</span><strong>${rec?`${fmt(rec.weight,1)}<span>kg</span>`:'—'}</strong><div class="stat-vis">${spark||'<span class="stat-empty" aria-hidden="true"></span>'}</div></button>`;
}
// 3.18.3 그날 운동 요약: 웨이트는 부위를 괄호로, 나머지는 대분류 이름. 예) 웨이트(하체·가슴) + 필라테스
const CAT_LABEL={'러닝·유산소':'러닝·유산소','필라테스':'필라테스','요가':'요가','기타':'기타'};
// 4.2.0 부위는 완료한 세트가 많은 순서로, 가장 많이 한 부위의 40% 이상만 최대 3개(대표님 승인 제안 5)
export function daySummary(workouts=[]){
 const sets=new Map(),cats=[];
 for(const w of workouts)for(const e of w.exercises||[]){const c=catOf(e);if(c==='웨이트'){const p0=partOf(e),p=p0&&p0!=='기타'?p0:'';const n=(e.sets||[]).filter(x=>x.completed!==false).length||((e.sets||[]).length?0:1);if(p)sets.set(p,(sets.get(p)||0)+n);if(!cats.includes('웨이트'))cats.push('웨이트')}else if(!cats.includes(c))cats.push(c)}
 const top=Math.max(0,...sets.values()),parts=[...sets.entries()].filter(([,n])=>n>0&&n>=top*0.4).sort((a,b)=>b[1]-a[1]).slice(0,3).map(([p])=>p);
 return cats.map(c=>c==='웨이트'?`웨이트${parts.length?`(${parts.join('·')})`:''}`:CAT_LABEL[c]||c).join(' + ');
}
// 3.11.0 홈 운동 칸: 오늘 많이 쓴 부위를 작은 앞·뒤 그림에 색으로.
const PART_MUSCLES={'가슴':['chest'],'등':['back','traps'],'하체':['quads','glutes','hamstrings'],'어깨':['shoulders'],'팔':['biceps','triceps'],'이두':['biceps'],'삼두':['triceps'],'복근':['abs','obliques'],'전신':['quads','glutes','back','shoulders']};
export function todayMuscleLoads(workouts=[]){
 const m=new Map(),add=(id,v)=>m.set(id,(m.get(id)||0)+v);
 for(const w of workouts)for(const e of w.exercises||[]){if(e.kind==='cardio')continue;const n=(e.sets||[]).filter(s=>s.completed!==false).length;if(!n)continue;const p=e.primaryMuscleIds?.length?e.primaryMuscleIds:(PART_MUSCLES[e.part]||[]);for(const id of p)add(id,n);for(const id of e.secondaryMuscleIds||[])if(!p.includes(id))add(id,n*0.5)}
 const max=Math.max(0,...m.values());
 return [...m.entries()].map(([muscleId,v])=>({muscleId,sets:v,score:max&&v>=max*0.6?6:max&&v>=max*0.3?3:1})).sort((a,b)=>b.sets-a.sets);
}
/* 5.4.6 대표님: 그날 한 부위(제목의 부위 우선) + 운동 종류. 짧게는 2개까지 '…' */
// 2026-11-28 대표님: 제목을 '가슴 삼두'처럼 띄어 쓰면 '가슴·삼두'와 다르게 보였다 → 낱말이 모두 부위 이름이면 띄어쓰기도 나눔
const PART_WORDS=new Set(['가슴','등','하체','어깨','팔','이두','삼두','복근','코어','전신','상체','엉덩이','둔근','허벅지','종아리','광배','후면','전면','측면','승모','유산소']);
export const splitTitle=t=>String(t||'').split(/\s*[·\/,+]\s*/).flatMap(x=>{x=x.replace(/\s*(데이|day)$/i,'');const w=x.split(/\s+/);return w.length>1&&w.every(y=>PART_WORDS.has(y))?w:[x]}).filter(Boolean);
export function dayParts(real=[]){
 const parts=[],cats=[];const add=(a,x)=>{x=String(x||'').trim();if(x&&!a.includes(x))a.push(x)};
 for(const w of real){const hasW=(w.exercises||[]).some(e=>catOf(e)==='웨이트'),t0=hasW?String(w.title||'').trim():'',t=t0==='오늘의 운동'||t0==='운동 기록'?'':t0;if(t)for(const x of splitTitle(t))add(parts,x.replace(/\s*(데이|day)$/i,''));for(const e of w.exercises||[]){const c=catOf(e);if(c==='웨이트'){add(cats,'웨이트');if(!t&&e.part&&e.part!=='기타')add(parts,e.part)}else add(cats,c==='러닝·유산소'?'유산소':c)}}
 const extra=cats.filter(c=>c!=='웨이트'&&!parts.includes(c)),items=[...parts,...extra];
 return {cats,parts,items,head:cats.includes('웨이트')?`웨이트 ${parts.join('·')}${extra.length?` + ${extra.join(' + ')}`:''}`.trim():items.join(' + ')};
}
const $wlOpen={};export function toggleWeekPart(k){$wlOpen[k]=!$wlOpen[k]}
function workoutStatHTML(workouts,sets,db={},date=''){
 const real=workouts.filter(w=>!w.rest),loads=todayMuscleLoads(real),top=loads.filter(x=>x.score>=6).slice(0,3).map(x=>MUSCLE_LABELS[x.muscleId]).filter(Boolean),rest=workouts.some(w=>w.rest);
 // 어제까지 최근 3일 부하가 남은 부위: 파랑·초록으로 가볍게 깜빡임(글자 없이)
 // 4.18.0 대표님: 의도적 휴식일에만. 운동한 날·아무것도 안 적은 날엔 파란색 자체가 없어야 한다
 const prev=[1,2,3].map(n=>{const d=new Date(`${date}T12:00:00`);d.setDate(d.getDate()-n);return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`});
 const recover=date&&rest&&!real.length?todayMuscleLoads((db.workouts||[]).filter(w=>prev.includes(w.date)&&!w.rest&&!w.planned)).filter(x=>x.score>=3).map(x=>x.muscleId):[];
 // 최근 7일: 요일은 고정, 그 오른쪽에 그날 한 운동 요약(웨이트(하체) + 필라테스), 휴식은 달, 없으면 빈칸
 const base=date||new Date().toISOString().slice(0,10),ymd=d=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
 const days=[6,5,4,3,2,1,0].map(n=>{const d=new Date(`${base}T12:00:00`);d.setDate(d.getDate()-n);const k=ymd(d),ws=(db.workouts||[]).filter(w=>w.date===k&&!w.planned),real=ws.filter(w=>!w.rest);return {k,wd:'일월화수목금토'[d.getDay()],today:n===0,done:real.length>0,rest:!real.length&&ws.some(w=>w.rest),label:daySummary(real),dp:dayParts(real)}});
 const week=`<span class="week-list">${days.map(x=>`<span class="wl-row${x.today?' today':''}${(t=>t?' '+t:'')(dayTone(x.k))}${x.done?' done':x.rest?' rest':''}${x.done&&$wlOpen[x.k]?' open':''}"${x.done?` data-wl-more="${x.k}"`:''}${x.label?` title="${esc(`${x.wd} · ${x.dp.items.join('·')||x.label}`)}"`:x.rest?` title="${x.wd} · 의도적 휴식"`:''}><b>${x.wd}</b><em>${x.done?(it=>{const open=!!$wlOpen[x.k],more=it.length>2,cat=(x.dp.cats[0]||'운동').replace('필라테스','필라')+(x.dp.cats.length>1?'+':'');/* 5.4.6 대표님: 좁은 칸(접은 화면)은 '웨이트'처럼 종류만, 누르거나 마우스를 올리면 부위 */return `<span class="wl-txt">${esc(it.join('·'))}${more?`<i class="wl-more" data-wl-more="${x.k}" role="button" tabindex="0" aria-label="${x.wd}요일 부위 ${open?'접기':'모두 보기'}">${open?'‹':'…'}</i>`:''}</span><span class="wl-cat">${esc(cat)}</span><span class="wl-pop" role="tooltip">${esc(it.join('·'))}</span>`})(x.dp.items.length?x.dp.items:[String(x.label||'운동')]):x.rest?`${REST_ICON}<span class="sr">휴식</span><span class="wl-rest">휴식</span>`:''}</em></span>`).join('')}</span>`;
 const fig=`<div class="mini-atlas${loads.length?'':' resting'}" aria-hidden="true">${anatomySvg([],[],{side:'front',mode:'load',loads,recover,key:'home-f'})}${anatomySvg([],[],{side:'back',mode:'load',loads,recover,key:'home-b'})}</div>`;
 /* 2026-11-28 대표님: 폰(좁은 화면)엔 근육 그림이 숨겨져 있었다 → '세트' 오른쪽에 작게(발끝=세트 글자 밑선). 넓은 화면은 아래 큰 그림 그대로 */const mini=`<span class="wv-mini${loads.length?'':' resting'}" aria-hidden="true">${anatomySvg([],[],{side:'front',mode:'load',loads,recover,key:'home-mf'})}${anatomySvg([],[],{side:'back',mode:'load',loads,recover,key:'home-mb'})}</span>`;
 return `<button type="button" class="home-stat home-stat-work" data-page="workout" aria-label="운동 ${sets}세트${top.length?`, 많이 쓴 부위 ${top.join(', ')}`:''}${rest?', 의도적 휴식':''}, 최근 7일 중 ${days.filter(x=>x.done).length}일 운동"><span class="stat-head"><small>운동</small>${rest?`<em>${REST_ICON}휴식</em>`:(t=>t?`<em class="wk-today">${esc(t).replace(/^웨이트 /,'<b>웨이트</b> ')}</em>`:top.length?`<em>${esc(top.join('·'))}</em>`:'')(dayParts(real.filter(w=>!w.planned)).head)}</span><strong>${sets}<span>세트</span>${mini}</strong><div class="stat-vis work-vis"><span class="wv-half wv-fig">${fig}</span><span class="wv-half wv-week">${week}</span></div></button>`;
}
