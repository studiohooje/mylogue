// 3.12.0 일반 머신: 웬만한 헬스장에 있는 머신을 제조사와 상관없이 고를 수 있게 한다.
// load: stack(핀 꽂는 웨이트 스택) | plate(원판 끼우는 방식) | cable(케이블) | smith(스미스·가이드 바) | body(자기 체중·보조)
// sided: both(양쪽 함께) | iso(양팔·양다리가 따로 움직이지만 함께 밀기 — 한쪽 무게로 기록) | single(한쪽씩 번갈아)
// 스택에 적힌 숫자는 도르래·캠 비율 때문에 실제 저항과 다를 수 있어, 다른 제조사 머신끼리 숫자 비교는 대략적이다.
// 근거: research_notes/gym_machines/machines.md (Life Fitness·Cybex·Technogym·Matrix·Precor·Hammer Strength 사양, 2026-11-20 조사)
import {EXERCISE_CATALOG} from './catalog.js';

const M = (slug, name, exercise, load, sided='both', aliases=[], note='') => ({id:`gm:${slug}`, generic:true, name, exercise, load, sided, aliases, note});
export const GENERIC_MACHINES = Object.freeze([
 // 하체
 M('leg-press-45','45° 레그 프레스 (원판식)','레그 프레스','plate','both',['인클라인 레그 프레스'],'썰매 자체 무게는 기계마다 달라요(대략 34~57kg). 끼운 원판 무게만 적으면 비교하기 쉬워요.'),
 M('leg-press-seated','시티드 레그 프레스 (스택식)','수평 레그 프레스','stack','both',['수평 레그 프레스 머신']),
 M('leg-press-iso','아이소래터럴 레그 프레스','레그 프레스','plate','iso',['해머 레그 프레스']),
 M('hack-squat','핵 스쿼트 머신','핵 스쿼트','plate','both',[],'썰매 무게는 기계마다 달라요(대략 27~61kg). 원판 무게만 적기를 권해요.'),
 M('v-squat','브이·펜듈럼 스쿼트','브이 스쿼트','plate','both',['펜듈럼 스쿼트 머신'],'시작 저항은 기계마다 달라요(대략 21~50kg). 원판 무게만 적기를 권해요.'),
 M('belt-squat','벨트 스쿼트 머신','벨트 스쿼트','plate','both'),
 M('smith','스미스 머신','스미스 스쿼트','smith','both',[],'바 무게는 기계마다 달라요(보통 7~20kg).'),
 M('leg-extension','레그 익스텐션','레그 익스텐션','stack','both'),
 M('leg-extension-iso','아이소래터럴 레그 익스텐션','싱글 레그 레그 익스텐션','plate','single'),
 M('leg-curl-seated','시티드 레그 컬','시티드 레그 컬','stack','both'),
 M('leg-curl-lying','라잉 레그 컬','라잉 레그 컬','stack','both',['엎드려 레그 컬']),
 M('leg-curl-standing','스탠딩 레그 컬','스탠딩 레그 컬','stack','single'),
 M('hip-abduction','힙 어브덕션 (아웃타이)','힙 어브덕션','stack','both'),
 M('hip-adduction','힙 어덕션 (이너타이)','힙 어덕션','stack','both'),
 M('hip-thrust','힙 쓰러스트 머신','힙 쓰러스트 머신','plate','both',['글루트 드라이브']),
 M('glute-kickback','글루트 킥백 머신','글루트 킥백 머신','stack','single'),
 M('calf-standing','스탠딩 카프 레이즈 머신','스탠딩 카프 레이즈 머신','stack','both'),
 M('calf-seated','시티드 카프 레이즈 머신','시티드 카프 레이즈','plate','both'),
 M('donkey-calf','동키 카프 레이즈 머신','동키 카프 레이즈','plate','both'),
 // 가슴
 M('chest-press','체스트 프레스 (스택식)','체스트 프레스','stack','both'),
 M('chest-press-iso','아이소래터럴 체스트 프레스 (원판식)','아이소래터럴 체스트 프레스','plate','iso',['해머 체스트 프레스']),
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
 M('high-row','하이 로우 머신','하이 로우 머신','plate','iso'),
 M('t-bar-row','T바 로우 (가슴 받침)','체스트 서포티드 T바 로우','plate','both',[],'손잡이·레버 자체 무게(대략 18kg)는 빼고 원판만 적어요.'),
 M('pullup-assist','어시스트 풀업 머신','어시스트 풀업','body','both',[],'보조 무게가 클수록 쉬워요.'),
 M('back-extension','백 익스텐션 (로만체어)','백 익스텐션','body','both',['45도 백 익스텐션']),
 M('pullover','풀오버 머신','스트레이트 암 풀다운','stack','both'),
 // 어깨
 M('shoulder-press','숄더 프레스 (스택식)','숄더 프레스 머신','stack','both'),
 M('shoulder-press-iso','아이소래터럴 숄더 프레스 (원판식)','숄더 프레스 머신','plate','iso'),
 M('lateral-raise','레터럴 레이즈 머신','머신 레터럴 레이즈','stack','both'),
 M('rear-delt','리어 델트 (리버스 펙덱)','리버스 펙덱','stack','both'),
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

const byId = new Map(GENERIC_MACHINES.map(m => [m.id, m]));
export const genericMachine = id => byId.get(id) || null;
const exId = name => EXERCISE_CATALOG.find(x => x.name===name)?.id || '';
// 종목에 맞는 일반 머신(종목 이름·같은 부위 머신 계열)
export function genericMachinesFor(exerciseId){
 const ex = EXERCISE_CATALOG.find(x => x.id===exerciseId); if(!ex) return [];
 return GENERIC_MACHINES.filter(m => exId(m.exercise)===exerciseId || (ex.aliases||[]).includes(m.exercise));
}
export const machineExerciseId = m => m?.generic ? exId(m.exercise) : (m?.exerciseId||'');

// 무게 단계: 단위와 방식에 맞춰 ± 버튼으로 쓴다. 원판식은 양쪽에 한 장씩 끼우는 기준(×2)으로 보여 준다.
export function weightSteps(load, unit){
 if(load==='plate') return unit==='lb' ? [-90,-50,-20,20,50,90] : [-40,-20,-10,10,20,40];
 if(load==='smith') return unit==='lb' ? [-10,-5,5,10] : [-5,-2.5,2.5,5];
 if(load==='body') return unit==='lb' ? [-10,10] : [-5,5];
 return unit==='lb' ? [-10,-5,5,10] : [-5,-2.5,2.5,5];
}
export const KG_PER_LB = 0.45359237;
export const otherUnit = (value, unit) => { const v = Number(value); if(!Number.isFinite(v) || v<=0) return ''; return unit==='lb' ? `≈ ${Math.round(v*KG_PER_LB*10)/10} kg` : `≈ ${Math.round(v/KG_PER_LB)} lb`; };
export const LOAD_LABEL = {stack:'핀 꽂는 스택식', plate:'원판 끼우는 방식', cable:'케이블', smith:'스미스 바', body:'자기 체중·보조'};
export const SIDED_LABEL = {both:'양쪽 함께', iso:'양쪽 따로 움직임 · 한쪽 무게로 기록', single:'한쪽씩'};

// 관리자 승인으로 들어온 제조사 머신(공용 도감)을 헬스장별로 고른다.
export function brandMachinesAt(shared={}, gymName='', exerciseId=''){
 const models = new Map((shared.machineModels||[]).map(m => [m.id, m]));
 return (shared.gymMachines||[]).filter(g => g.gymName===gymName).map(g => models.get(g.modelId)).filter(m => m && (!exerciseId || !m.exerciseId || m.exerciseId===exerciseId)).map(m => ({...m, brand:true}));
}
export const brandModelId = (manufacturer, model) => `mm:${String(manufacturer).trim()}:${String(model).trim()}`.replace(/[^\p{L}\p{N}._: -]/gu, '-').slice(0, 120);
export const gymMachineId = (gymName, modelId) => `gx:${String(gymName).trim()}:${modelId}`.replace(/[^\p{L}\p{N}._: -]/gu, '-').slice(0, 120);
