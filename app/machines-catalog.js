// 3.12.0 일반 머신: 웬만한 헬스장에 있는 머신을 제조사와 상관없이 고를 수 있게 한다.
// load: stack(핀 꽂는 웨이트 스택) | plate(원판 끼우는 방식) | cable(케이블) | smith(스미스·가이드 바) | body(자기 체중·보조)
// sided: both(양쪽 함께) | iso(양팔·양다리가 따로 움직이지만 함께 밀기 — 한쪽 무게로 기록) | single(한쪽씩 번갈아)
// 스택에 적힌 숫자는 도르래·캠 비율 때문에 실제 저항과 다를 수 있어, 다른 제조사 머신끼리 숫자 비교는 대략적이다.
// 근거: research_notes/gym_machines/machines.md (Life Fitness·Cybex·Technogym·Matrix·Precor·Hammer Strength 사양, 2026-11-20 조사)
import {EXERCISE_CATALOG, resolveExercise} from './catalog.js';
import {BRAND_MODELS} from './machine-brands.js';
// 4.27.0 전수검사 S-01: 공용 도감의 헬스장 머신 방식 값은 읽을 때도 허용 목록만(이미 저장된 이상한 값이 화면에 나가지 않게)
export function safeGymSpec(s){ if(!s||typeof s!=='object') return null; const ok=(v,l)=>l.includes(v)?v:'', n=v=>{const x=Number(v);return v!=null&&v!==''&&Number.isFinite(x)&&x>=0&&x<=1000?x:undefined}; const r={load:ok(s.load,['plate','stack','cable','smith','body']),sided:ok(s.sided,['both','iso','single']),unit:ok(s.unit,['kg','lb','level'])}; const lf=n(s.levelFirst),ls=n(s.levelStep); if(lf!==undefined)r.levelFirst=lf; if(ls!==undefined)r.levelStep=ls; return r.load||r.sided||r.unit?r:null; }

const M = (slug, name, exercise, load, sided='both', aliases=[], note='') => ({id:`gm:${slug}`, generic:true, name, exercise, load, sided, aliases, note});
export const GENERIC_MACHINES = ([
 // 하체
 M('leg-press-45','45° 레그 프레스 (원판식)','레그 프레스','plate','both',['인클라인 레그 프레스'],'썰매 자체 무게는 기계마다 달라요(대략 34~57kg). 끼운 원판 무게만 적으면 비교하기 쉬워요.'),
 M('leg-press-seated','시티드 레그 프레스 (스택식)','수평 레그 프레스','stack','both',['수평 레그 프레스 머신']),
 M('leg-press-iso','아이소래터럴 레그 프레스','레그 프레스','plate','iso',['해머 레그 프레스']),
 M('leg-press-vertical','버티컬 레그 프레스','버티컬 레그 프레스','plate','both'),
 M('power-squat','파워 스쿼트 머신 (레버식)','파워 스쿼트','plate','both',['레버 스쿼트','슈퍼 스쿼트']),
 M('hack-squat','핵 스쿼트 머신','핵 스쿼트','plate','both',[],'썰매 무게는 기계마다 달라요(대략 27~61kg). 원판 무게만 적기를 권해요.'),
 M('v-squat','브이·펜듈럼 스쿼트','브이 스쿼트','plate','both',['펜듈럼 스쿼트 머신'],'시작 저항은 기계마다 달라요(대략 21~50kg). 원판 무게만 적기를 권해요.'),
 M('belt-squat','벨트 스쿼트 머신','벨트 스쿼트','plate','both'),
 M('smith','스미스 머신','스미스 스쿼트','smith','both',[],'바 무게는 기계마다 달라요(보통 7~20kg).'),
 M('leg-extension','레그 익스텐션','레그 익스텐션','stack','both'),
 M('leg-extension-iso','아이소래터럴 레그 익스텐션','싱글 레그 레그 익스텐션','plate','single'),
 M('leg-curl-seated','시티드 레그 컬','시티드 레그 컬','stack','both'),
 M('leg-curl-lying','라잉 레그 컬','라잉 레그 컬','stack','both',['엎드려 레그 컬']),
 M('leg-curl-standing','스탠딩 레그 컬','스탠딩 레그 컬','stack','single'),
 M('leg-curl-kneeling','니링 레그 컬 (무릎 꿇는 방식)','스탠딩 레그 컬','plate','single',['니링 레그 컬']),
 M('hip-abduction','힙 어브덕션 (아웃타이)','힙 어브덕션','stack','both'),
 M('hip-adduction','힙 어덕션 (이너타이)','힙 어덕션','stack','both'),
 M('hip-thrust','힙 쓰러스트 머신','힙 쓰러스트 머신','plate','both',['글루트 드라이브']),
 M('glute-kickback','글루트 킥백 머신','글루트 킥백 머신','stack','single'),
 M('multi-hip','멀티 힙','멀티 힙','stack','single'),
 M('reverse-hyper','리버스 하이퍼','리버스 하이퍼','plate','both'),
 M('ghd','글루트 햄 디벨로퍼 (GHD)','글루트 햄 레이즈','body','both'),
 M('calf-standing','스탠딩 카프 레이즈 머신','스탠딩 카프 레이즈 머신','stack','both'),
 M('calf-seated','시티드 카프 레이즈 머신','시티드 카프 레이즈','plate','both'),
 M('donkey-calf','동키 카프 레이즈 머신','동키 카프 레이즈','plate','both'),
 // 가슴
 M('chest-press','체스트 프레스 (스택식)','체스트 프레스','stack','both'),
 M('chest-press-iso','아이소래터럴 체스트 프레스 (원판식)','아이소래터럴 체스트 프레스','plate','iso',['해머 체스트 프레스']),
 M('chest-press-wide','와이드 체스트 프레스 (원판식)','아이소래터럴 체스트 프레스','plate','iso'),
 M('incline-press','인클라인 체스트 프레스','인클라인 체스트 프레스 머신','stack','both'),
 M('incline-press-iso','아이소래터럴 인클라인 프레스 (원판식)','인클라인 체스트 프레스 머신','plate','iso'),
 M('decline-press','디클라인 체스트 프레스','디클라인 체스트 프레스 머신','plate','iso'),
 M('pec-deck','펙덱 (체스트 플라이)','펙덱 플라이','stack','both',['버터플라이']),
 M('cable-crossover','케이블 크로스오버','케이블 크로스오버','cable','both',['듀얼 케이블']),
 M('dip-assist','어시스트 딥스·풀업 머신','어시스트 딥스','body','both',[],'보조 무게가 클수록 쉬워요(적은 숫자가 더 무거운 운동).'),
 // 등
 M('lat-pulldown','랫풀다운','랫풀다운','stack','both'),
 M('lat-pulldown-iso','아이소래터럴 풀다운 (원판식)','머신 랫풀다운','plate','iso',['해머 풀다운']),
 M('seated-row','시티드 케이블 로우','시티드 케이블 로우','cable','both',['케이블 로우']),
 M('row-machine','시티드 로우 머신 (가슴 받침)','시티드 로우 머신','stack','both'),
 M('row-iso','아이소래터럴 로우 (원판식)','아이소래터럴 로우','plate','iso',['해머 로우']),
 M('low-row','로우 로우 (원판식)','아이소래터럴 로우','plate','iso',['해머 로우 로우']),
 M('high-row','하이 로우 머신','하이 로우 머신','plate','iso'),
 M('t-bar-row','T바 로우 (가슴 받침)','체스트 서포티드 T바 로우','plate','both',[],'손잡이·레버 자체 무게(대략 18kg)는 빼고 원판만 적어요.'),
 M('pullup-assist','어시스트 풀업 머신','어시스트 풀업','body','both',[],'보조 무게가 클수록 쉬워요.'),
 M('back-extension','백 익스텐션 (로만체어)','백 익스텐션','body','both',['45도 백 익스텐션']),
 M('lower-back','로어 백 (시티드 백 익스텐션)','시티드 백 익스텐션 머신','stack','both'),
 M('pullover','풀오버 머신','스트레이트 암 풀다운','stack','both'),
 // 어깨
 M('shoulder-press','숄더 프레스 (스택식)','숄더 프레스 머신','stack','both'),
 M('shoulder-press-iso','아이소래터럴 숄더 프레스 (원판식)','숄더 프레스 머신','plate','iso'),
 M('lateral-raise','레터럴 레이즈 머신','머신 레터럴 레이즈','stack','both'),
 M('rear-delt','리어 델트 (리버스 펙덱)','리버스 펙덱','stack','both'),
 M('shrug','슈러그 머신','머신 슈러그','plate','both'),
 M('cable-station','케이블 스테이션 (단일)','케이블 레터럴 레이즈','cable','single'),
 // 팔
 M('preacher-curl','프리처 컬 머신','머신 프리처 컬','stack','both',['바이셉스 컬 머신']),
 M('tricep-ext','트라이셉스 익스텐션 머신','트라이셉스 익스텐션 머신','stack','both'),
 M('seated-dip','시티드 딥 머신','트라이셉스 딥 머신','stack','both'),
 M('cable-pushdown','케이블 푸시다운 (케이블 스테이션)','케이블 푸시다운','cable','both'),
 // 복근
 M('ab-crunch','앱도미널 크런치 머신','앱도미널 크런치 머신','stack','both'),
 M('torso-rotation','토르소 로테이션 머신','토르소 로테이션 머신','stack','single'),
 M('captains-chair','캡틴스 체어 (니 레이즈)','캡틴스 체어 니 레이즈','body','both'),
]);

// 머신별 근육 부하 [주동근, 보조근]. 근거: research_notes/gym_machines/machines.md 1절(ExRx·제조사 설명). 마이로그 15구역으로 단순화.
// 케이블·스미스처럼 동작에 따라 달라지는 머신은 비워 두고 종목의 타깃을 쓴다.
const T = {
 'leg-press-45':[['quads','glutes'],['hamstrings','adductors']], 'leg-press-seated':[['quads','glutes'],['hamstrings']], 'leg-press-iso':[['quads','glutes'],['hamstrings','adductors']], 'leg-press-vertical':[['quads','glutes'],['hamstrings']],
 'power-squat':[['quads','glutes'],['hamstrings','adductors']], 'hack-squat':[['quads'],['glutes','adductors']], 'v-squat':[['quads','glutes'],['adductors']], 'belt-squat':[['quads','glutes'],['adductors']],
 'leg-extension':[['quads'],[]], 'leg-extension-iso':[['quads'],[]], 'leg-curl-seated':[['hamstrings'],['calves']], 'leg-curl-lying':[['hamstrings'],['calves','glutes']], 'leg-curl-standing':[['hamstrings'],['calves']], 'leg-curl-kneeling':[['hamstrings'],['glutes','calves']],
 'hip-abduction':[['glutes'],[]], 'hip-adduction':[['adductors'],[]], 'hip-thrust':[['glutes'],['hamstrings','adductors']], 'glute-kickback':[['glutes'],['hamstrings']], 'multi-hip':[['glutes','adductors'],['abs']],
 'reverse-hyper':[['glutes','hamstrings'],['erectors']], 'ghd':[['hamstrings','glutes'],['erectors','calves']], 'calf-standing':[['calves'],[]], 'calf-seated':[['calves'],[]], 'donkey-calf':[['calves'],[]],
 'chest-press':[['chest'],['shoulders','triceps']], 'chest-press-iso':[['chest'],['shoulders','triceps']], 'chest-press-wide':[['chest'],['shoulders']], 'incline-press':[['chest','shoulders'],['triceps']], 'incline-press-iso':[['chest','shoulders'],['triceps']],
 'decline-press':[['chest'],['triceps','shoulders']], 'pec-deck':[['chest'],['shoulders']], 'dip-assist':[['triceps','chest'],['shoulders']],
 'lat-pulldown':[['back'],['biceps','shoulders']], 'lat-pulldown-iso':[['back'],['biceps']], 'seated-row':[['back'],['biceps','traps']], 'row-machine':[['back','traps'],['biceps','shoulders']], 'row-iso':[['back'],['biceps','traps']],
 'low-row':[['back'],['biceps']], 'high-row':[['back'],['biceps','shoulders']], 't-bar-row':[['back'],['biceps','erectors']], 'pullup-assist':[['back'],['biceps']], 'back-extension':[['erectors','glutes'],['hamstrings']],
 'lower-back':[['erectors'],['glutes']], 'pullover':[['back'],['chest','triceps']], 'shoulder-press':[['shoulders'],['triceps']], 'shoulder-press-iso':[['shoulders'],['triceps']], 'lateral-raise':[['shoulders'],['traps']],
 'rear-delt':[['shoulders'],['back','traps']], 'shrug':[['traps'],['forearms']], 'preacher-curl':[['biceps'],['forearms']], 'tricep-ext':[['triceps'],[]], 'seated-dip':[['triceps'],['chest']], 'cable-pushdown':[['triceps'],[]],
 'ab-crunch':[['abs'],['obliques']], 'torso-rotation':[['obliques'],['abs']], 'captains-chair':[['abs'],['obliques']],
};
for(const m of GENERIC_MACHINES){ const t = T[m.id.slice(3)]; if(t){ m.primaryMuscleIds = t[0]; m.secondaryMuscleIds = t[1]; } }
GENERIC_MACHINES.forEach(Object.freeze); Object.freeze(GENERIC_MACHINES);
const byId = new Map(GENERIC_MACHINES.map(m => [m.id, m]));
// 제조사 모델은 연결된 머신 종류의 방식·좌우·근육을 물려받는다.
export const BUILTIN_BRANDS = Object.freeze(BRAND_MODELS.filter(b => byId.has(b.baseId)).map(b => { const g = byId.get(b.baseId); return Object.freeze({...b, name:`${b.manufacturer} ${b.model}`, exercise:g.exercise, load:g.load, sided:g.sided, note:g.note, primaryMuscleIds:g.primaryMuscleIds, secondaryMuscleIds:g.secondaryMuscleIds}); }));
const brandById = new Map(BUILTIN_BRANDS.map(b => [b.id, b]));
export const brandsOf = genericId => BUILTIN_BRANDS.filter(b => b.baseId===genericId);
// 같은 머신으로 하는 다른 종목들(3.14.1 전수 점검). 케이블 운동은 듀얼 케이블·단일 스테이션 둘 다 가능.
const CABLE = ['cable-crossover','cable-station'];
const ALSO = {
 '레그 프레스':['leg-press-seated','leg-press-vertical'], '체스트 프레스':['chest-press-iso','chest-press-wide'], '싱글 레그 프레스':['leg-press-45','leg-press-seated','leg-press-iso'], '레그 프레스 카프 레이즈':['leg-press-45','leg-press-seated'],
 '레그 컬':['leg-curl-seated','leg-curl-lying','leg-curl-standing','leg-curl-kneeling'], '카프 레이즈':['calf-standing','calf-seated','donkey-calf','smith'],
 '랫풀다운':['lat-pulldown-iso'], '클로즈그립 랫풀다운':['lat-pulldown'], '언더그립 랫풀다운':['lat-pulldown'], '원암 케이블 랫풀다운':['lat-pulldown','cable-station'],
 '원암 케이블 로우':['seated-row','cable-station'], '시티드 케이블 로우':['cable-station'],
 '케이블 플라이':['cable-crossover'], '로우 투 하이 케이블 플라이':['cable-crossover'], '케이블 체스트 프레스':['cable-crossover'],
 '케이블 크런치':CABLE, '케이블 킥백':CABLE, '케이블 힙 어브덕션':CABLE, '케이블 리어 델트 플라이':['cable-crossover','rear-delt'], '케이블 프론트 레이즈':CABLE,
 '케이블 컬':CABLE, '로프 푸시다운':['cable-pushdown','cable-station'], '원암 케이블 푸시다운':['cable-pushdown','cable-station'], '케이블 푸시다운':['cable-station'],
 '케이블 트라이셉스 익스텐션':CABLE, '케이블 우드찹':CABLE, '팔로프 프레스':CABLE, '페이스 풀':CABLE, '케이블 레터럴 레이즈':['cable-crossover'],
 '스미스 벤치프레스':['smith'], '스미스 인클라인 프레스':['smith'], '스미스 런지':['smith'], '스미스 숄더 프레스':['smith'],
};
const MACHINE_ONLY = new Set(['머신','케이블','스미스']);
// 머신 없이는 할 수 없는 종목(레그 프레스, 케이블 운동, 스미스 운동 등)
export const needsMachine = ex => !!ex && MACHINE_ONLY.has(ex.equipment);
// 일반 머신·앱 기본 제조사 모델을 ID로 찾는다.
export const genericMachine = id => byId.get(id) || brandById.get(id) || null;
const exId = name => EXERCISE_CATALOG.find(x => x.name===name)?.id || '';
// 종목에 맞는 일반 머신(종목 이름·같은 부위 머신 계열)
export function genericMachinesFor(exerciseId){
 const ex = EXERCISE_CATALOG.find(x => x.id===exerciseId); if(!ex) return [];
 const also = ALSO[ex.name] || [];
 return GENERIC_MACHINES.filter(m => exId(m.exercise)===exerciseId || (ex.aliases||[]).includes(m.exercise) || also.includes(m.id.slice(3)));
}
export const machineExerciseId = m => m?.generic || m?.builtin ? exId(m.exercise) : (m?.exerciseId||'');
// 머신을 고르면 근육 부하를 앱이 정한다: 머신의 주동근이 종목의 주동근과 겹치면 머신 값, 다른 동작(예: 레그 프레스로 카프 레이즈)이면 종목 값.
export function machineTargets(machine, exercise){
 const m = machine?.baseId && !machine.primaryMuscleIds ? byId.get(machine.baseId) : machine;
 const ep = exercise?.primaryMuscleIds || [];
 if(m?.primaryMuscleIds?.length && (!ep.length || m.primaryMuscleIds.some(x => ep.includes(x)))) return {primaryMuscleIds:[...m.primaryMuscleIds], secondaryMuscleIds:m.secondaryMuscleIds.filter(x => !m.primaryMuscleIds.includes(x))};
 return ep.length ? {primaryMuscleIds:[...ep], secondaryMuscleIds:[...(exercise.secondaryMuscleIds||[])]} : null;
}

// 무게 단계: 단위와 방식에 맞춰 ± 버튼으로 쓴다. 원판식은 양쪽에 한 장씩 끼우는 기준(×2)으로 보여 준다.
export function weightSteps(load, unit){
 if(unit==='level') return [-2,-1,1,2]; // 4.7.0 숫자 단계(핀 번호)
 if(load==='plate') return unit==='lb' ? [-90,-50,-20,20,50,90] : [-40,-20,-10,10,20,40];
 if(load==='smith') return unit==='lb' ? [-10,-5,5,10] : [-5,-2.5,2.5,5];
 if(load==='body') return unit==='lb' ? [-10,10] : [-5,5];
 return unit==='lb' ? [-10,-5,5,10] : [-5,-2.5,2.5,5];
}
export const KG_PER_LB = 0.45359237;
export const otherUnit = (value, unit) => { const v = Number(value); if(unit==='level' || !Number.isFinite(v) || v<=0) return ''; return unit==='lb' ? `≈ ${Math.round(v*KG_PER_LB*10)/10} kg` : `≈ ${Math.round(v/KG_PER_LB)} lb`; };
export const UNIT_LABEL = {kg:'kg', lb:'lb', level:'숫자 단계(핀 번호)'};
export const LOAD_LABEL = {stack:'핀 꽂는 스택식', plate:'원판 끼우는 방식', cable:'케이블', smith:'스미스 바', body:'자기 체중·보조'};
export const SIDED_LABEL = {both:'양쪽 함께', iso:'양쪽 따로 움직임 · 한쪽 무게로 기록', single:'한쪽씩'};

// 관리자 승인으로 들어온 제조사 머신(공용 도감)을 헬스장별로 고른다.
// 4.7.0 헬스장에 등록된 머신: 일반 머신 종류·앱 기본 제조사 모델·관리자가 더한 모델 모두. 지도 장소 ID(gymKey)가 있으면 그걸로 맞춘다. removed는 뺀 것.
export function brandMachinesAt(shared={}, gymName='', exerciseId='', gymKey=''){
 const models = new Map([...GENERIC_MACHINES.map(g => [g.id, {...g, generic:true}]), ...BUILTIN_BRANDS.map(b => [b.id, b]), ...(shared.machineModels||[]).map(m => [m.id, m])]);
 const gens = exerciseId ? new Set(genericMachinesFor(exerciseId).map(g => g.id)) : null;
 const fits = m => !exerciseId || (m.generic ? gens.has(m.id) : m.baseId ? gens.has(m.baseId) || m.exerciseId===exerciseId : (!m.exerciseId || m.exerciseId===exerciseId));
 // 헬스장에서 고른 방식(spec: 무게 방식·움직임·무게 표시)을 모델 기본값 위에 덮는다
 return (shared.gymMachines||[]).filter(g => !g.removed && (gymKey && g.gymKey ? g.gymKey===gymKey : g.gymName===gymName)).map(g => { const m = models.get(g.modelId), sp = safeGymSpec(g.spec); return m && {...m, ...(sp?.load?{load:sp.load}:{}), ...(sp?.sided?{sided:sp.sided}:{}), ...(sp?.unit?{unit:sp.unit}:{}), ...(sp?.levelFirst!=null?{levelFirst:sp.levelFirst}:{}), ...(sp?.levelStep!=null?{levelStep:sp.levelStep}:{}), gymSpec:sp}; }).filter(m => m && fits(m)).map(m => ({...m, brand:!m.generic, atGym:true}));
}
export const brandModelId = (manufacturer, model) => `mm:${String(manufacturer).trim()}:${String(model).trim()}`.replace(/[^\p{L}\p{N}._: -]/gu, '-').slice(0, 120);
export const gymMachineId = (gymName, modelId) => `gx:${String(gymName).trim()}:${modelId}`.replace(/[^\p{L}\p{N}._: -]/gu, '-').slice(0, 120);

// 4.18.0 머신 중복 막기(대표님: '뉴텍 레그프레스 머신'·'뉴텍 레그 프레스 머신'·'뉴텍레그프레스머신'이 따로 생기는 건 시스템으로 막는다).
// 1) 같은 머신인지는 '정리한 이름'(machineKey)으로 본다: 띄어쓰기·대소문자·기호·'머신' 꼬리말 무시, 제조사 한글·영문 표기 통일,
//    운동 이름의 한글 표기를 영문 낱말로(레그 프레스 = Leg Press).
// 2) 새 모델 ID를 정리한 이름으로 만든다 → 누가 어떻게 적어도 공용 도감(Firestore) 문서가 하나다.
// 3) 이미 생긴 중복은 불러올 때 하나로 합치고(dedupeMachines), 옛 ID는 새 ID로 이어 준다(기록이 끊기지 않게).
const MAKER_ALIAS = [
 ['hammer-strength', ['hammerstrength','해머스트렝스','해머스트랭스','햄머스트렝스','해머','hammer']],
 ['life-fitness', ['lifefitness','라이프피트니스','라이프휘트니스']],
 ['cybex', ['cybex','싸이벡스','사이벡스']],
 ['technogym', ['technogym','테크노짐']],
 ['matrix', ['matrix','매트릭스']],
 ['panatta', ['panatta','파나타']],
 ['gym80', ['gym80','짐80']],
 ['drax', ['drax','드랙스','드락스']],
 ['precor', ['precor','프리코어','프레코']],
 ['nautilus', ['nautilus','노틸러스']],
 ['hoist', ['hoist','호이스트']],
 ['atlantis', ['atlantis','아틀란티스']],
 ['prime-fitness', ['primefitness','프라임피트니스','프라임']],
 ['watson', ['watson','왓슨']],
 ['bh-fitness', ['bhfitness','비에이치피트니스']],
 ['newtech', ['newtechwellness','newtech','뉴텍웰니스','뉴텍']],
];
const GENERIC_MAKER = new Set(['', '일반', '일반머신', '모름', '없음', '기타', 'generic', 'unknown']);
// 한글 운동 낱말 → 영문(길게 맞는 것부터)
const WORD = [['아이소래터럴','isolateral'],['아이소레터럴','isolateral'],['아이소라테랄','isolateral'],['백익스텐션','backextension'],['크로스오버','crossover'],['익스텐션','extension'],['인클라인','incline'],['디클라인','decline'],['리어델트','reardelt'],['트라이셉스','tricep'],['트라이셉','tricep'],['바이셉스','bicep'],['바이셉','bicep'],['어브덕션','abduction'],['업덕션','abduction'],['어덕션','adduction'],['아웃타이','abduction'],['이너타이','adduction'],['풀다운','pulldown'],['풀오버','pullover'],['스쿼트','squat'],['버티컬','vertical'],['래터럴','lateral'],['라테랄','lateral'],['레터럴','lateral'],['프레스','press'],['체스트','chest'],['숄더','shoulder'],['시티드','seated'],['로우','row'],['레그','leg'],['라잉','lying'],['펙덱','pecdeck'],['플라이','fly'],['벤치','bench'],['글루트','glute'],['카프','calf'],['레이즈','raise'],['크런치','crunch'],['케이블','cable'],['스미스','smith'],['와이드','wide'],['토르소','torso'],['로터리','rotary'],['듀얼','dual'],['딥스','dip'],['친업','chinup'],['티바','tbar'],['델트','delt'],['리어','rear'],['랫','lat'],['렛','lat'],['힙','hip'],['핵','hack'],['컬','curl'],['앱','ab']];
const squash = s => String(s||'').toLocaleLowerCase('ko').replace(/[\s·.,_\-/°'"+&()]+/g, '');
const squashOuter = s => squash(String(s||'').replace(/\([^)]*\)/g, ' '));
export function makerKey(maker){
 const outer = squashOuter(maker), full = squash(maker);
 for(const [k, names] of MAKER_ALIAS) if(names.some(n => outer===n || outer.startsWith(n) || full.startsWith(n))) return k;
 return GENERIC_MAKER.has(outer) ? '' : outer;
}
export function modelKey(model, maker=''){
 let s = squash(model).replace(/biceps/g,'bicep').replace(/triceps/g,'tricep').replace(/dips/g,'dip');
 const mk = makerKey(maker), names = MAKER_ALIAS.find(a => a[0]===mk)?.[1] || (mk ? [mk] : []);
 for(const n of [...names].sort((a, b) => b.length - a.length)) if(n.length >= 2 && s.startsWith(n) && s.length > n.length){ s = s.slice(n.length); break; }
 for(const [ko, en] of WORD) s = s.split(ko).join(en);
 const t = s.replace(/(머신|기구|기계|machine)$/, '').replace(/^(머신|machine)/, '');
 return t || s;
}
export const machineKey = (maker, model) => `${makerKey(maker)}|${modelKey(model, maker)}`;
const keyOf = m => machineKey(m.manufacturer, m.model || m.name);
// 같은 머신으로 이미 있는 모델들(앱 기본 모델 먼저). 기본 모델은 같은 이름이 라인별로 여럿일 수 있어(해머 Plate-Loaded·MTS) 후보를 모두 돌려준다.
export function findSameMachines(maker, model, shared = {}){
 const k = machineKey(maker, model); if(k.endsWith('|')) return [];
 const lineKey = b => machineKey(b.manufacturer, `${b.line||''} ${b.model}`);
 return [...BUILTIN_BRANDS.filter(b => keyOf(b)===k || lineKey(b)===k), ...(shared.machineModels||[]).filter(m => !m.hidden && keyOf(m)===k)];
}
export const canonicalModelId = (maker, model) => `mm:${makerKey(maker)||'etc'}:${modelKey(model, maker)}`.replace(/[^\p{L}\p{N}._: -]/gu, '-').slice(0, 120);
// 불러온 공용 도감에서 이미 생긴 중복을 하나로: 앱 기본 모델 > ID 사전순 첫 번째. gymMachines의 modelId도 옮기고 같은 헬스장 같은 머신은 하나만.
export function dedupeMachines(shared = {}){
 // 기본 모델과 같은 키가 하나뿐일 때만 기본 모델로 잇는다(라인이 여럿이면 어느 것인지 몰라 그대로 둠)
 const alias = {}, keep = [], byKey = new Map(), multi = new Set();
 for(const b of BUILTIN_BRANDS){ const k = keyOf(b); if(byKey.has(k)) multi.add(k); else byKey.set(k, b.id); }
 for(const k of multi) byKey.delete(k);
 const models = [...(shared.machineModels||[])].sort((a, b) => String(a.id).localeCompare(String(b.id)));
 for(const m of models){
  const k = keyOf(m), first = k.endsWith('|') || multi.has(k) ? null : byKey.get(k);
  if(first && first!==m.id){ alias[m.id] = first; continue; }
  if(!k.endsWith('|')) byKey.set(k, m.id);
  const b = m.baseId || inferBaseId(m); keep.push(b && b!==m.baseId ? {...m, baseId:b, baseInferred:true} : m);
 }
 const to = id => alias[id] || id, live = new Set(), out = [];
 for(const g of shared.gymMachines||[]) if(!g.removed) live.add(`${g.gymKey||g.gymName}|${to(g.modelId)}`);
 const seen = new Map(), gymDupes = {};
 for(const g of shared.gymMachines||[]){
  const modelId = to(g.modelId), k = `${g.gymKey||g.gymName}|${modelId}`;
  if(g.removed && live.has(k)) continue; // 같은 머신이 살아 있으면 '뺌' 표시는 무시
  if(seen.has(k)){ if(!g.removed) (gymDupes[seen.get(k)] ??= []).push(g); continue; } seen.set(k, g.id);
  out.push(modelId===g.modelId ? g : {...g, modelId, mergedFrom:g.modelId});
 }
 return {...shared, machineModels:keep, gymMachines:out, gymDupes, machineAlias:{...(shared.machineAlias||{}), ...alias}};
}
export const resolveMachineId = (shared = {}, id = '') => shared?.machineAlias?.[id] || id;

// 4.18.0 상위 머신 종류(gm:…) 찾기: 이미 있으면 그대로, 없으면 종목 번호 → 이름(괄호·제조사 빼고)으로. 못 찾으면 ''.
export function inferBaseId(m = {}){
 if(GENERIC_MACHINES.some(g => g.id===m.baseId)) return m.baseId;
 const ex = (m.exerciseId && EXERCISE_CATALOG.find(x => x.id===m.exerciseId)) || resolveExercise(m.model) || resolveExercise(m.name) || resolveExercise(`${m.manufacturer||''} ${m.model||''}`);
 return ex ? genericMachinesFor(ex.id)[0]?.id || '' : '';
}
// 상위 종류가 없는 머신 목록(관리 화면·점검용)
export function orphanMachines(shared = {}, personal = []){
 return [...(shared.machineModels||[]).filter(m => !m.hidden && !inferBaseId(m)).map(m => ({where:'공용', id:m.id, name:m.name || `${m.manufacturer} ${m.model}`})),
  ...personal.filter(m => !inferBaseId(m)).map(m => ({where:'내 머신', id:m.id, name:m.name}))];
}
