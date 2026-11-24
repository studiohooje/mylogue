// General exercise names only. No third-party media or proprietary programs.
import {MORE_EXERCISES,MORE_CARDIO,NAME_RULES,SOURCES,MORE_TIMED} from './exercise-data.js';
import {EXERCISE_ENRICH} from './exercise-enrich.js';
import {STRENGTH_TEMPLATES} from './templates-data.js';
const strength={
 '가슴':['벤치프레스','인클라인 벤치프레스','덤벨 벤치프레스','클로즈그립 벤치프레스','원암 덤벨 체스트프레스','체스트 프레스','케이블 플라이','푸시업','딥스'],
 '등':['데드리프트','랫풀다운','풀업','바벨 로우','시티드 케이블 로우','원암 덤벨 로우','페이스 풀'],
 '하체':['스쿼트','프론트 스쿼트','고블릿 스쿼트','덤벨 프론트 스쿼트','불가리안 스플릿 스쿼트','덤벨 스텝업','레그 프레스','런지','루마니안 데드리프트','덤벨 루마니안 데드리프트','굿모닝','레그 익스텐션','레그 컬','카프 레이즈'],
 '어깨':['오버헤드 프레스','덤벨 숄더 프레스','사이드 레터럴 레이즈','리어 델트 플라이','프론트 레이즈'],
 '팔':['바벨 컬','덤벨 컬','해머 컬','덤벨 트라이셉스 익스텐션','덤벨 킥백','케이블 푸시다운','스컬 크러셔','오버헤드 트라이셉스 익스텐션'],
 '복근':['크런치','레그 레이즈','플랭크','케이블 크런치'],
 '전신':['버피','케틀벨 스윙','클린 앤 프레스','덤벨 슈트케이스 캐리']
};
const entries=[
 ...Object.entries(strength).flatMap(([part,names])=>names.map(name=>({name,part,kind:'strength'}))),
 ...['걷기','달리기','실내 자전거','야외 자전거','로잉 머신','스텝밀','줄넘기','수영','등산'].map(name=>({name,part:'유산소',kind:'cardio'}))
];
const primary={가슴:['chest'],등:['back'],하체:['quads','glutes'],어깨:['shoulders'],팔:['biceps','triceps'],복근:['abs'],전신:['back','quads'],유산소:[]};
const secondary={가슴:['triceps','shoulders'],등:['biceps'],하체:['hamstrings'],어깨:['triceps'],팔:[],복근:[],전신:['shoulders'],유산소:[]};
const muscleOverrides={
 '데드리프트':[['glutes','quads','hamstrings'],['erectors','traps','back']],
 '루마니안 데드리프트':[['hamstrings','glutes'],['erectors','adductors','traps']],
 '덤벨 루마니안 데드리프트':[['hamstrings','glutes'],['erectors','adductors','traps']],
 '굿모닝':[['hamstrings','glutes'],['erectors','adductors','traps']],
 '스쿼트':[['quads','glutes'],['hamstrings','abs']],
 '프론트 스쿼트':[['quads','glutes'],['hamstrings','abs']],
 '고블릿 스쿼트':[['quads','glutes'],['abs','back']],
 '덤벨 프론트 스쿼트':[['quads','glutes'],['abs']],
 '불가리안 스플릿 스쿼트':[['quads','glutes'],['hamstrings','abs','adductors']],
 '덤벨 스텝업':[['quads','glutes'],['hamstrings']],
 '덤벨 슈트케이스 캐리':[['forearms','abs'],['obliques','traps']],
 '벤치프레스':[['chest','triceps'],['shoulders']],
 '인클라인 벤치프레스':[['chest','triceps'],['shoulders']],
 '덤벨 벤치프레스':[['chest','triceps'],['shoulders']],
 '클로즈그립 벤치프레스':[['triceps','chest'],['shoulders']],
 '원암 덤벨 체스트프레스':[['chest','triceps'],['shoulders','abs']],
 '덤벨 트라이셉스 익스텐션':[['triceps'],['shoulders']],
 '덤벨 킥백':[['triceps'],[]],
 '페이스 풀':[['shoulders','back'],['biceps']],
 '레그 익스텐션':[['quads'],[]], '레그 컬':[['hamstrings'],[]], '카프 레이즈':[['calves'],[]],
 '바벨 컬':[['biceps'],[]], '덤벨 컬':[['biceps'],[]], '해머 컬':[['biceps'],[]],
 '케이블 푸시다운':[['triceps'],[]], '스컬 크러셔':[['triceps'],[]], '오버헤드 트라이셉스 익스텐션':[['triceps'],[]],
 '사이드 레터럴 레이즈':[['shoulders'],[]], '리어 델트 플라이':[['shoulders'],['back']], '프론트 레이즈':[['shoulders'],[]],
 '케이블 플라이':[['chest'],['shoulders']], '케틀벨 스윙':[['glutes','hamstrings'],['back']],
 '클린 앤 프레스':[['shoulders','quads'],['back','glutes']], '플랭크':[['abs'],[]]
};
const equipmentOverrides={
 '데드리프트':'바벨','루마니안 데드리프트':'바벨','굿모닝':'바벨','스쿼트':'바벨','프론트 스쿼트':'바벨',
 '벤치프레스':'바벨','인클라인 벤치프레스':'바벨','클로즈그립 벤치프레스':'바벨','바벨 로우':'바벨','바벨 컬':'바벨',
 '고블릿 스쿼트':'덤벨/케틀벨','불가리안 스플릿 스쿼트':'덤벨',
 // 4.11.0 도감 검수: 이름에 '덤벨'이 없어도 덤벨 종목(한 손 무게 기준), 오버헤드 프레스는 바벨
 '해머 컬':'덤벨','사이드 레터럴 레이즈':'덤벨','리어 델트 플라이':'덤벨','프론트 레이즈':'덤벨','오버헤드 프레스':'바벨'
};
// 4.11.0 도감 검수: 한쪽씩 하는 종목은 반복을 '한쪽 기준'으로(새 기록부터, 지난 기록은 저장된 값 그대로)
const perSide=new Set(['불가리안 스플릿 스쿼트','원암 덤벨 체스트프레스','원암 덤벨 로우','덤벨 스텝업','런지','덤벨 슈트케이스 캐리']);
const aliases={
 '데드리프트':['바벨 데드리프트','컨벤셔널 데드리프트'],
 '루마니안 데드리프트':['바벨 루마니안 데드리프트','RDL'],
 '스쿼트':['바벨 백 스쿼트','백 스쿼트'],
 '프론트 스쿼트':['바벨 프론트 스쿼트'],
 '벤치프레스':['바벨 벤치프레스'],
 '인클라인 벤치프레스':['인클라인 바벨 벤치프레스'],
 '바벨 로우':['벤트오버 바벨 로우'],
 '불가리안 스플릿 스쿼트':['덤벨 불가리안 스플릿 스쿼트']
};
const oneHand=new Set(['원암 덤벨 로우','원암 덤벨 체스트프레스','덤벨 슈트케이스 캐리']);
const sourceUrls={
 '데드리프트':'https://www.nasm.org/resource-center/exercise-library/barbell-deadlift',
 '루마니안 데드리프트':'https://www.nasm.org/resource-center/exercise-library/romanian-deadlift-barbell',
 '덤벨 루마니안 데드리프트':'https://www.nasm.org/resource-center/exercise-library/dumbbell-romanian-deadlift',
 '굿모닝':'https://www.nasm.org/resource-center/exercise-library/good-mornings',
 '불가리안 스플릿 스쿼트':'https://www.nasm.org/resource-center/exercise-library/bulgarian-split-squat',
 '고블릿 스쿼트':'https://www.nasm.org/resource-center/blog/training/how-to-perform-goblet-squats',
 '덤벨 프론트 스쿼트':'https://www.nasm.org/resource-center/exercise-library/dumbbell-front-squat',
 '벤치프레스':'https://www.nasm.org/resource-center/exercise-library/barbell-bench-press',
 '인클라인 벤치프레스':'https://www.nasm.org/resource-center/exercise-library/incline-barbell-bench-press',
 '클로즈그립 벤치프레스':'https://www.nasm.org/resource-center/exercise-library/close-grip-bench-press',
 '바벨 컬':'https://www.nasm.org/resource-center/exercise-library/barbell-bicep-curl'
};
const BASE=entries.map(x=>{
 const equipment=equipmentOverrides[x.name]||(/덤벨/.test(x.name)?'덤벨':/케이블|페이스 풀/.test(x.name)?'케이블':/머신|프레스|풀다운|케이블|레그 컬|레그 익스텐션|스텝밀/.test(x.name)&&! /벤치|덤벨|오버헤드|클린/.test(x.name)?'머신':/푸시업|풀업|딥스|플랭크|크런치|버피/.test(x.name)?'맨몸':x.kind==='cardio'?'유산소':'프리웨이트');
 const dumbbell=equipment==='덤벨',hands=oneHand.has(x.name)?1:dumbbell?2:0;
 return {...x,id:'exercise:'+x.name,aliases:aliases[x.name]||[],equipment,
  weightBasis:dumbbell?'per-hand':'total',handCount:hands,repBasis:perSide.has(x.name)?'per-side':'total',defaultWeight:0,
  weightDisplay:dumbbell?(hands===1?'한 손 기준':'한 손 기준 · 양손 각각'):'총중량',
  primaryMuscleIds:muscleOverrides[x.name]?.[0]||primary[x.part]||[],secondaryMuscleIds:muscleOverrides[x.name]?.[1]||secondary[x.part]||[],
  anatomyMapVersion:2,sourceUrl:sourceUrls[x.name]||''};
});
// 3.12.0 확장 종목: 이름이 겹치면 기존 것을 그대로 둔다(기록 ID 유지).
const taken=new Set(BASE.map(x=>x.name));
const MORE=MORE_EXERCISES.filter(([name])=>!taken.has(name)).map(([name,part,equipment,p,s,o={}])=>{const dumbbell=equipment==='덤벨'||equipment==='케틀벨',hands=o.h1?1:dumbbell?2:0;return {name,part,kind:'strength',id:'exercise:'+name,aliases:o.aliases||[],equipment,weightBasis:dumbbell?'per-hand':'total',handCount:hands,repBasis:o.u?'per-side':'total',defaultWeight:0,weightDisplay:dumbbell?(hands===1?'한 손 기준':'한 손 기준 · 양손 각각'):'총중량',primaryMuscleIds:p,secondaryMuscleIds:s.filter(x=>!p.includes(x)),anatomyMapVersion:2,sourceUrl:SOURCES[0]}});
const CARDIO=MORE_CARDIO.filter(n=>!taken.has(n)).map(name=>({name,part:'유산소',kind:'cardio',id:'exercise:'+name,aliases:[],equipment:'유산소',weightBasis:'total',handCount:0,repBasis:'total',defaultWeight:0,weightDisplay:'총중량',primaryMuscleIds:[],secondaryMuscleIds:[],anatomyMapVersion:2,sourceUrl:''}));
const TIMED=MORE_TIMED.filter(([n])=>!taken.has(n)&&!MORE_CARDIO.includes(n)).map(([name,part])=>({name,part,kind:'cardio',id:'exercise:'+name,aliases:[],equipment:part==='유산소'?'유산소':part,weightBasis:'total',handCount:0,repBasis:'total',defaultWeight:0,weightDisplay:'시간',primaryMuscleIds:[],secondaryMuscleIds:[],anatomyMapVersion:2,sourceUrl:''}));
// 4.12 종목 보강(별칭·근육 조정·요령)을 합친다
const enrich=x=>{const e=EXERCISE_ENRICH[x.id];if(!e)return x;return {...x,aliases:[...new Set([...(x.aliases||[]),...(e.a||[])])],...(e.p&&!muscleOverrides[x.name]?{primaryMuscleIds:e.p,secondaryMuscleIds:e.s||[]}:{}),...(e.c?{cues:e.c}:{}),...(e.m?{mistake:e.m}:{}),...(e.d?{level:e.d}:{}),...(e.u&&!x.sourceUrl?{sourceUrl:e.u}:{})}};
export const EXERCISE_CATALOG=Object.freeze([...BASE,...MORE,...CARDIO,...TIMED].map(enrich));
const norm=v=>String(v||'').toLocaleLowerCase('ko').replace(/[\s·()\-_/]/g,'');
// 이름(또는 별칭)으로 도감 종목을 찾는다. 띄어쓰기·괄호 차이는 무시.
export function findExercise(name){const n=norm(name);if(!n)return null;return EXERCISE_CATALOG.find(x=>norm(x.name)===n||(x.aliases||[]).some(a=>norm(a)===n))||null}
// 4.18.0 직접 적은 이름도 상위 종목으로: '아웃타이 (힙 어브덕션)'·'핵프레스 (양발)'처럼 괄호·꼬리말·자주 쓰는 다른 이름까지 본다.
// 모든 머신·종목은 상위 종목 하나에 속하고, 그림·성장·볼륨은 그 상위 종목 기준으로 이어진다.
const EXTRA_ALIAS={'핵프레스':'핵 스쿼트','핵 프레스':'핵 스쿼트','핵프레스머신':'핵 스쿼트','파워레그프레스':'레그 프레스','레그프레스':'레그 프레스','수평레그프레스':'수평 레그 프레스'};
export function resolveExercise(name){
 const raw=String(name||'').trim();if(!raw)return null;
 const hit=findExercise(raw);if(hit)return hit;
 const outer=raw.replace(/\([^)]*\)/g,' ').trim(),inner=[...raw.matchAll(/\(([^)]*)\)/g)].map(m=>m[1]);
 const strip=t=>String(t).replace(/(머신|기구|machine)$/i,'').replace(/(양발|한발|한쪽|양쪽|좌우|와이드|내로우)$/,'').trim();
 // 제조사 이름이 앞에 붙은 경우('뉴텍 레그프레스')는 앞 낱말을 빼고도 본다
 const tails=outer.split(/\s+/).slice(1).map((_,i,a)=>a.slice(i).join(' ')).filter(Boolean);
 for(const t of [outer,...inner,strip(outer),strip(raw),...tails,...tails.map(strip)]){if(!t)continue;const x=findExercise(t)||findExercise(EXTRA_ALIAS[norm(t)]||EXTRA_ALIAS[String(t).replace(/\s+/g,'')]||'');if(x)return x}
 return null;
}
// 직접 만든 종목의 타깃 추정: 도감 일치 → 이름 규칙 → 부위 기본값. 사용자가 고르지 않아도 채운다.
export function inferTargets(name,part=''){const hit=findExercise(name);if(hit&&hit.kind!=='cardio')return {primary:[...hit.primaryMuscleIds],secondary:[...hit.secondaryMuscleIds],source:'catalog'};const n=String(name||'');for(const [re,p,s] of NAME_RULES)if(re.test(n))return {primary:[...p],secondary:s.filter(x=>!p.includes(x)),source:'name'};const p=primary[part]||[];return {primary:[...p],secondary:(secondary[part]||[]).filter(x=>!p.includes(x)),source:p.length?'part':'none'}}
export function searchExercises(query='',part=''){
 const q=String(query).trim().toLocaleLowerCase('ko');
 return EXERCISE_CATALOG.filter(x=>(!part||part==='전체'||x.part===part)&&(!q||[x.name,...x.aliases].some(name=>name.toLocaleLowerCase('ko').includes(q))));
}
const session=(title,names)=>({title,exercises:names.map(name=>{const x=EXERCISE_CATALOG.find(e=>e.name===name);return {exerciseId:x?.id,primaryMuscleIds:x?.primaryMuscleIds,secondaryMuscleIds:x?.secondaryMuscleIds,name,part:x?.part||'기타',kind:x?.kind||'strength',sets:[{weight:0,reps:8,type:'본세트',completed:true},{weight:0,reps:8,type:'본세트',completed:true},{weight:0,reps:8,type:'본세트',completed:true}]}})});
// Generic original templates. Zero weight explicitly means the user must choose a safe working load.
const BASIC_PROGRAMS=[
 {id:'full-body',title:'전신 3회',description:'전신을 번갈아 기록하는 시작용 구성. 중량은 직접 결정하세요.',sessions:[session('전신 A',['스쿼트','벤치프레스','바벨 로우']),session('전신 B',['루마니안 데드리프트','오버헤드 프레스','랫풀다운']),session('전신 C',['레그 프레스','덤벨 벤치프레스','시티드 케이블 로우'])]},
 {id:'upper-lower',title:'상·하체 4회',description:'상체와 하체를 나누는 기록 틀입니다.',sessions:[session('상체 A',['벤치프레스','바벨 로우','오버헤드 프레스']),session('하체 A',['스쿼트','레그 컬','카프 레이즈']),session('상체 B',['덤벨 벤치프레스','랫풀다운','사이드 레터럴 레이즈']),session('하체 B',['루마니안 데드리프트','레그 프레스','런지'])]},
 {id:'push-pull-legs',title:'밀기·당기기·하체',description:'부위별 세션을 자유롭게 반복할 수 있는 기록 틀입니다.',sessions:[session('밀기',['벤치프레스','오버헤드 프레스','케이블 푸시다운']),session('당기기',['랫풀다운','시티드 케이블 로우','바벨 컬']),session('하체',['스쿼트','루마니안 데드리프트','레그 컬'])]}
];
// 4.12 근거 있는 프로그램 10개(초급 전신·상하체·밀당다리·가정용 등): 세트·반복은 템플릿 값, 무게는 0(직접)
const session2=(title,rows)=>({title,exercises:rows.map(([name,sets,reps])=>{const x=EXERCISE_CATALOG.find(e=>e.name===name);return {exerciseId:x?.id,primaryMuscleIds:x?.primaryMuscleIds,secondaryMuscleIds:x?.secondaryMuscleIds,name,part:x?.part||'기타',kind:x?.kind||'strength',sets:Array.from({length:Math.max(1,Math.min(6,Number(sets)||3))},()=>({weight:0,reps:Number(reps)||8,type:'본세트',completed:true}))}})});
export const PROGRAM_TEMPLATES=Object.freeze([...BASIC_PROGRAMS.map(p=>({...p,basic:true})),...STRENGTH_TEMPLATES.map(t=>({id:t.id,title:t.title,level:t.level,description:`${t.goal}${t.days?` · 주 ${t.days.join('~')}회`:''}${t.min?` · ${t.min.join('~')}분`:''}`,note:t.note,sessions:t.sessions.map(([title,focus,rows])=>({...session2(title,rows),focus}))}))]);
export function createRoutineFromProgram(programId,sessionIndex=0){
 const template=PROGRAM_TEMPLATES.find(x=>x.id===programId),selected=template?.sessions?.[sessionIndex];
 if(!selected)throw Error('프로그램 구성을 찾을 수 없습니다.');
 return structuredClone(selected);
}
