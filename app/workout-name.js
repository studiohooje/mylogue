// 5.1.0 운동 이름 규칙(대표님 2026-11-26)
// - 시작할 때 고른 부위(가슴·어깨·삼두…)가 이름이 된다. 고르지 않은 부위(웜업 겸 페이스 풀의 '등' 등)는 이름에 넣지 않는다(통계엔 들어감).
// - 순서는 고른 순서가 아니라 실제로 많이 한(세트 수) 순서. 고른 부위 중 거의 안 한 부위는 빠진다.
// - '자유롭게'(부위를 고르지 않음)면 많이 한 부위 최대 4개 + 더 있으면 '…'. '전신'이면 '전신'.
// - 웜업 세트는 세지 않는다.
import {EXERCISE_CATALOG,resolveExercise} from './catalog.js';
const MUSCLE_TO={chest:'가슴',triceps:'삼두',biceps:'이두',forearms:'이두',back:'등',traps:'등',erectors:'등',shoulders:'어깨',quads:'하체',glutes:'하체',hamstrings:'하체',calves:'하체',adductors:'하체',abs:'복근',obliques:'복근'};
const PART_TO={'가슴':'가슴','등':'등','어깨':'어깨','하체':'하체','복근':'복근','이두':'이두','삼두':'삼두','팔':'삼두'};
export const isWarm=set=>set?.type==='웜업';
// 종목 하나의 대표 부위(주 근육 첫 번째 → 도감 부위)
export function partOfExercise(e={}){const x=(e.exerciseId&&EXERCISE_CATALOG.find(c=>c.id===e.exerciseId))||resolveExercise(e.name)||{};const prim=(e.primaryMuscleIds?.length?e.primaryMuscleIds:x.primaryMuscleIds)||[];for(const m of prim)if(MUSCLE_TO[m])return MUSCLE_TO[m];return PART_TO[x.part||e.part]||''}
// 부위별 세트 수(웜업·안 한 세트 제외), 많은 순
export function setsByPart(exercises=[]){const m=new Map();for(const e of exercises){if(e.kind==='cardio')continue;const p=partOfExercise(e);if(!p)continue;const n=(e.sets||[]).filter(s=>s.completed!==false&&!isWarm(s)).length;if(n)m.set(p,(m.get(p)||0)+n)}return [...m.entries()].sort((a,b)=>b[1]-a[1])}
// 고른 부위: targets ['웨이트','웨이트:가슴',…] → ['가슴',…], '전신'은 따로
export function chosenParts(targets=[]){return (targets||[]).filter(t=>t.startsWith('웨이트:')).map(t=>t.slice(4))}
const join=a=>a.join('·');
// 이름 제안: {title, kind:'order'|'free'|'swap'|'thin'|'whole'|'same', line, options:[{label,title}], chosen}
export function nameSuggestion(exercises=[],targets=[]){
 const by=setsByPart(exercises),total=by.reduce((a,[,n])=>a+n,0),chosenAll=chosenParts(targets),whole=chosenAll.includes('전신'),chosen=chosenAll.filter(p=>p!=='전신');
 const map=new Map(by),done=p=>map.get(p)||0,big=p=>done(p)>=3||done(p)>=total*0.2;
 if(!total){const t=whole?'전신':chosen.length?join(chosen):(exercises[0]?.name||'오늘의 운동');return {title:t,kind:'same',line:'',options:[],chosen:chosenAll}}
 if(whole)return {title:'전신',kind:'whole',line:'<b>전신</b>을 고르셨어요.',options:[{label:'전신',title:'전신'},{label:'많이 한 부위로',title:freeTitle(by)}],chosen:chosenAll};
 if(!chosen.length){const t=freeTitle(by);return {title:t,kind:'free',line:'<b>자유롭게</b>를 고르셨어요. 오늘 한 운동을 보니 이렇게 남기면 될 것 같아요.',options:uniq([{label:t,title:t},{label:freeTitle(by,3),title:freeTitle(by,3)}]),chosen:chosenAll}}
 const keep=chosen.filter(p=>done(p)>0).sort((a,b)=>done(b)-done(a)),thin=keep.filter(p=>!big(p)),strong=keep.filter(big);
 // 고르지 않았는데 크게 한 부위(세트 4개 이상이면서 전체의 25% 이상) → 바꿔서 남길지 제안
 const extra=by.filter(([p,n])=>!chosen.includes(p)&&n>=4&&n>=total*0.25).map(([p])=>p),missing=chosen.filter(p=>done(p)===0);
 const chosenOrder=join(chosen.filter(p=>done(p)>0))||join(chosen);
 if(extra.length&&(missing.length||thin.length)){const t=join([...strong,...extra].sort((a,b)=>done(b)-done(a)).slice(0,4));return {title:t,kind:'swap',line:`처음엔 <b>${join(chosen)}</b>를 고르셨는데, 실제로는 <b>${join(extra)}</b>를 더 많이 했어요. 바꿔서 남길까요?`,options:uniq([{label:t,title:t},{label:'처음 고른 대로',title:chosenOrder}]),chosen:chosenAll}}
 if(thin.length&&strong.length){const t=join(strong);return {title:t,kind:'thin',line:`<b>${join(thin)}</b> 운동이 ${thin.map(p=>`${done(p)}세트`).join('·')}뿐이에요. 이름은 <b>${t}</b>만 남길까요? (그 세트도 통계엔 그대로 들어가요)`,options:uniq([{label:t,title:t},{label:join(keep),title:join(keep)}]),chosen:chosenAll}}
 const t=join(keep.length?keep:chosen);
 if(keep.length>1&&t!==chosenOrder)return {title:t,kind:'order',line:`고르신 부위 중 <b>${keep[0]}</b>를 가장 많이 했어요. 많이 한 순서로 남길까요?`,options:uniq([{label:t,title:t},{label:'고른 순서대로',title:chosenOrder}]),chosen:chosenAll};
 return {title:t,kind:'same',line:'고르신 부위 그대로 남겨요.',options:[{label:t,title:t}],chosen:chosenAll};
}
function freeTitle(by,max=4){const ps=by.filter(([,n],i)=>i===0||n>=2).map(([p])=>p);return join(ps.slice(0,max))+(ps.length>max?' …':'')}
function uniq(o){const seen=new Set();return o.filter(x=>x.title&&!seen.has(x.title)&&seen.add(x.title))}
// 진행 중 자동 이름(기록 완료 전에도 홈·운동 페이지에 이상한 이름이 보이지 않게)
export const sessionTitle=(exercises,targets)=>nameSuggestion(exercises,targets).title;

// 2026-11-27 대표님: 이름은 운동을 다 끝낸 마지막에 정한다. 직접 쓰기가 메인, 아래에 추천.
// - 보기 2 '많이 한 부위': 3세트 이상이거나 그날의 20% 이상인 부위, 많은 순 최대 3개(가슴·어깨·삼두).
// - 보기 1 '자주 쓴 이름': 내가 붙인 이름(Push Day·하체데이…) 중, 그 이름을 썼던 날 많이 한 부위와 오늘 많이 한 부위가 맞는 것만(하체만 한 날엔 Push Day 안 나옴).
// - 내가 이름을 붙여 온 사람이면 보기 1을, 아니면 보기 2를 먼저 고른 상태로.
const PARTS=new Set(['가슴','등','어깨','하체','복근','이두','삼두','팔','전신','유산소','상체']);
const isPartTitle=t=>{const w=String(t||'').split(/[·\s,/+&]+/).filter(Boolean);return !w.length||w.every(x=>PARTS.has(x))};
export function topParts(exercises=[],max=3){const by=setsByPart(exercises),total=by.reduce((a,[,n])=>a+n,0);return by.filter(([,n],i)=>i===0||n>=3||n>=total*0.2).slice(0,max).map(([p])=>p)}
export function titleOptions(db={},w={}){
 const today=topParts(w.exercises),parts=today.length?join(today):nameSuggestion(w.exercises,[]).title,hist=new Map();
 for(const x of db.workouts||[]){if(x.id===w.id||x.rest||x.status==='planned')continue;const t=String(x.title||'').trim();if(!t||t==='오늘의 운동'||isPartTitle(t))continue;const tp=topParts(x.exercises);if(!tp.length)continue;const h=hist.get(t)||{n:0,parts:new Map()};h.n++;tp.forEach((p,i)=>h.parts.set(p,(h.parts.get(p)||0)+(3-i)));hist.set(t,h)}
 const namer=hist.size>0,fits=h=>{const hp=[...h.parts.entries()].sort((a,b)=>b[1]-a[1]).map(([p])=>p);return today.length&&hp.includes(today[0])&&today.includes(hp[0])};
 const mine=[...hist.entries()].filter(([,h])=>fits(h)).sort((a,b)=>b[1].n-a[1].n).slice(0,3).map(([t])=>t);
 return {first:namer&&mine.length?mine[0]:parts,mine,parts,namer};
}
