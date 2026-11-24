// 4.17.0 운동 지식 DB: 움직임 유형, 주의할 관절, 대체 운동, 쉬운→어려운 단계 사다리.
// 근거: NSCA·ACSM 교재의 움직임 분류(밀기·당기기·스쿼트·힌지·런지·운반·회전), 흔한 부상 부위 안내(일반 정보, 진단 아님).
// 점수나 순위를 매기지 않는다(대표님 방침: 운동은 '했다'를 칭찬). 단계 사다리는 '할 수 있게 된 것'을 보여 주는 용도.
import {EXERCISE_CATALOG, findExercise} from './catalog.js';
import {EXERCISE_ENRICH} from './exercise-enrich.js';
import {guideFor, youtubeQuery, youtubeURL} from './exercise-guide.js';

// 움직임 유형: 이름 규칙(위에서부터 처음 맞는 것). part와 함께 쓴다.
const PATTERN_RULES = [
  // 4.27.0 전수검사 EX-01: '노르딕'(무릎 굽힘)·'할로우'의 로우·업라이트 로우·로우 투 하이·스트레이트 암 풀다운·카프 레이즈·레그 익스텐션/컬은 이름 일부 때문에 다른 움직임 요령이 붙었다 → 고립
  ['코어', /할로우/],
  ['고립', /노르딕|업라이트 로우|로우 투 하이|스트레이트 암|카프 레이즈|레그 익스텐션|레그 컬/],
  ['운반', /캐리|파머스|슬레드/],
  ['폭발·전신', /버피|클린|스내치|쓰러스터|스윙|월볼|박스 점프|점프 스쿼트|배틀 로프|겟업|푸시 프레스/],
  ['수직 당기기', /풀업|친업|랫풀다운|풀다운|어시스트 풀업/],
  ['수평 당기기', /로우|페이스 풀|인버티드/],
  ['수직 밀기', /오버헤드 프레스|숄더 프레스|아놀드|비하인드 넥|랜드마인|파이크 푸시업/],
  ['수평 밀기', /벤치프레스|체스트 ?프레스|인클라인 프레스|딥 머신|푸시업|딥스|덤벨 프레스|JM 프레스/],
  ['힌지', /데드리프트|굿모닝|힙 쓰러스트|글루트 브릿지|백 익스텐션|랙 풀|리버스 하이퍼|글루트 햄|킥백|멀티 힙/],
  ['런지·한 다리', /런지|스플릿|스텝업|피스톨|싱글 레그 프레스/],
  ['스쿼트', /스쿼트|레그 프레스|핵|벨트/],
  ['코어', /크런치|플랭크|레그 레이즈|니 레이즈|롤아웃|트위스트|싯업|우드찹|데드버그|마운틴|팔로프|토르소|할로우/],
];
const ISOLATION = /크로스오버|컬|익스텐션|레이즈|플라이|펙덱|푸시다운|킥백|슈러그|어브덕션|어덕션|풀오버/;
export function patternOf(ex) {
  const e = typeof ex === 'string' ? findExercise(ex) || {name: ex} : ex; const n = e?.name || '';
  if (['필라테스', '요가', '기타'].includes(e?.part)) return e.part;
  if (e?.kind === 'cardio' || e?.part === '유산소') return '유산소';
  for (const [p, re] of PATTERN_RULES) if (re.test(n)) return p;
  return ISOLATION.test(n) ? '고립' : (e?.part || '기타');
}

// 주의할 관절(일반 정보): 아프면 쉬고 전문가와 상의하라는 안내에 쓴다
const CAUTION_RULES = [
  ['허리', /데드리프트|굿모닝|벤트오버|바벨 로우|펜들레이|T바|랙 풀|스쿼트|싯업|레그 레이즈|백 익스텐션|스윙|클린|스내치|리버스 하이퍼|덤벨 로우|메도우스|힙 쓰러스트|글루트 브릿지|러시안 트위스트|우드찹|토르소|앱 롤아웃|캐리|파머스|겟업|월볼|쓰러스터|슬레드|로잉|스키에르그/],
  ['무릎', /스쿼트|런지|레그 익스텐션|레그 프레스|핵|스텝업|점프|피스톨|버피|박스 점프|노르딕|달리기|러닝|줄넘기|자전거|스피닝|사이클|에어바이크|계단|스텝밀|등산|월볼|쓰러스터|슬레드|구기/],
  ['발목', /카프 레이즈|줄넘기|달리기|러닝|점프|버피|계단|스텝밀|등산|구기/],
  ['고관절', /어브덕션|어덕션|멀티 힙|킥백 머신|케이블 킥백|스플릿|피스톨/],
  ['어깨', /오버헤드|숄더 프레스|비하인드 넥|업라이트 로우|딥스|딥 머신|벤치프레스|체스트프레스|체스트 프레스|덤벨 프레스|인클라인 프레스|크로스오버|풀오버|풀업|친업|랫풀다운|풀다운|스내치|플라이|레터럴 레이즈|프론트 레이즈|Y 레이즈|리버스 펙덱|페이스 풀|푸시 프레스|아놀드|랜드마인|인버티드 로우|겟업|배틀 로프|수영|클라이밍|월볼|팔로프/],
  ['손목', /프론트 스쿼트|푸시업|벤치프레스|(?<!레그 |햄스트링 |버티|일립티)컬|클린|플랭크|버피|리스트|마운틴|클라이밍|겟업/], // 4.27.0 EX-04: 다리 컬·일립티컬·버티컬 제외
  ['팔꿈치', /스컬 크러셔|트라이셉스 익스텐션|JM 프레스|프리처|딥스|딥 머신|푸시다운|덤벨 킥백|클라이밍/],
  ['목', /슈러그|크런치|싯업|비하인드 넥/],
];
// 움직임 유형별 안전 한 줄(일반 정보, 모든 종목에 하나씩 붙는다)
const TIPS = {
  '수평 밀기': '어깨를 뒤로 모아 고정하고, 바·손잡이는 가슴 중간 높이로 내려요.',
  '수직 밀기': '갈비뼈가 들리지 않게 배에 힘을 주고, 머리 위에서 팔꿈치를 다 펴요.',
  '수평 당기기': '팔이 아니라 등으로 당긴다는 느낌으로, 어깨가 귀 쪽으로 올라가지 않게 해요.',
  '수직 당기기': '가슴을 살짝 들고 팔꿈치를 옆구리로 끌어내려요. 반동은 줄여요.',
  '스쿼트': '무릎은 발끝 방향과 같게, 발바닥 전체로 바닥을 밀어요.',
  '런지·한 다리': '앞발 뒤꿈치로 밀어 올라오고, 골반이 기울지 않게 천천히 해요.',
  '힌지': '허리를 둥글게 말지 말고 엉덩이를 뒤로 빼며 접어요.',
  '코어': '허리가 바닥에서 뜨거나 꺾이기 전까지만 해요. 숨은 참지 말고 내쉬어요.',
  '운반': '몸통을 곧게 세우고 짧은 걸음으로 걸어요.',
  '폭발·전신': '처음엔 가벼운 무게로 동작을 익히고, 지치면 세트를 일찍 끝내도 괜찮아요.',
  '고립': '무게보다 움직이는 근육을 느끼며, 내리는 동작을 천천히 해요.',
  '유산소': '말할 수 있을 정도의 숨참으로 시작해 몸이 풀리면 올려요.',
  '필라테스': '숨과 동작을 맞추고, 통증이 생기는 범위까지 무리해서 늘리지 않아요.',
  '요가': '자세는 할 수 있는 만큼만. 관절이 아니라 근육이 늘어나는 느낌이면 충분해요.',
  '기타': '처음 5분은 가볍게 몸을 풀고 시작해요.',
};
export function tipOf(ex) { const p = patternOf(ex); return TIPS[p] || TIPS['고립']; }
export function cautionsOf(ex) { const n = (typeof ex === 'string' ? ex : ex?.name) || ''; return CAUTION_RULES.filter(([, re]) => re.test(n)).map(([j]) => j); }

// 쉬운 → 어려운 단계 사다리(맨몸·기본기 위주). 이름은 도감 이름 그대로.
export const LADDERS = [
  {id: 'push', title: '밀기(푸시업)', steps: ['인클라인 푸시업', '니 푸시업', '푸시업', '다이아몬드 푸시업', '디클라인 푸시업', '파이크 푸시업']},
  {id: 'pull', title: '매달려 당기기', steps: ['인버티드 로우', '어시스트 풀업', '친업', '풀업']},
  {id: 'dip', title: '딥스', steps: ['벤치 딥스', '어시스트 딥스', '딥스']},
  {id: 'squat', title: '스쿼트', steps: ['박스 스쿼트', '고블릿 스쿼트', '스쿼트', '프론트 스쿼트']},
  {id: 'single-leg', title: '한 다리', steps: ['리버스 런지', '런지', '불가리안 스플릿 스쿼트', '피스톨 스쿼트']},
  {id: 'hinge', title: '엉덩이 접기(힌지)', steps: ['글루트 브릿지', '힙 쓰러스트', '루마니안 데드리프트', '데드리프트']},
  {id: 'core-front', title: '복부 버티기', steps: ['데드버그', '플랭크', '할로우 바디 홀드', '앱 롤아웃']},
  {id: 'core-legs', title: '다리 올리기', steps: ['크런치', '레그 레이즈', '캡틴스 체어 니 레이즈', '행잉 레그 레이즈']},
  {id: 'hamstring', title: '햄스트링', steps: ['레그 컬', '루마니안 데드리프트', '글루트 햄 레이즈', '노르딕 햄스트링 컬']},
  {id: 'row', title: '수평 당기기', steps: ['시티드 로우 머신', '시티드 케이블 로우', '원암 덤벨 로우', '바벨 로우']},
  {id: 'lat', title: '위에서 당기기', steps: ['머신 랫풀다운', '랫풀다운', '어시스트 풀업', '풀업']},
  {id: 'press', title: '가슴 밀기(기구)', steps: ['체스트 프레스', '덤벨 벤치프레스', '벤치프레스']},
  {id: 'ohp', title: '머리 위로 밀기', steps: ['숄더 프레스 머신', '덤벨 숄더 프레스', '오버헤드 프레스']},
  {id: 'carry', title: '들고 걷기', steps: ['파머스 워크', '덤벨 슈트케이스 캐리']},
  {id: 'rotation', title: '몸통 버티기·돌리기', steps: ['데드버그', '팔로프 프레스', '케이블 우드찹']},
  {id: 'run', title: '걷기에서 달리기로', steps: ['걷기', '인터벌 러닝', '달리기']},
];
const NAMES = new Set(EXERCISE_CATALOG.map(e => e.name));
// 한 종목이 여러 사다리에 걸리면 처음 것(기본기 사다리)을 쓴다
export const validLadders = () => LADDERS.map(l => ({...l, steps: l.steps.filter(s => NAMES.has(s))})).filter(l => l.steps.length >= 2);
export function ladderOf(ex) {
  const n = (typeof ex === 'string' ? ex : ex?.name) || '';
  for (const l of validLadders()) { const i = l.steps.indexOf(n); if (i >= 0) return {...l, index: i, easier: l.steps[i - 1] || null, harder: l.steps[i + 1] || null}; }
  return null;
}
// 처음 해낸 단계: 기록에서 사다리 종목의 첫 완료 날짜(점수 아님, '할 수 있게 된 것')
export function firstTimes(workouts = []) {
  const first = new Map();
  for (const w of [...workouts].filter(w => !w.planned && !w.rest).sort((a, b) => String(a.date).localeCompare(String(b.date))))
    for (const e of w.exercises || []) { if (!(e.sets || []).some(s => s.completed !== false) && e.kind !== 'cardio') continue; if (!first.has(e.name)) first.set(e.name, w.date); }
  return validLadders().flatMap(l => l.steps.filter(s => first.has(s)).map(s => ({ladder: l.title, name: s, date: first.get(s), step: l.steps.indexOf(s) + 1, of: l.steps.length})));
}

// 대체 운동: 같은 주동근·같은 움직임 유형을 우선, 기구가 다를수록 앞에(그 기구가 없을 때 쓰라고)
const overlap = (a = [], b = []) => a.filter(x => b.includes(x)).length;
// 유산소: 충격이 비슷한 것끼리(관절이 불편하면 낮은 충격 쪽을 권한다)
const IMPACT = [['낮은 충격', /걷기|자전거|스피닝|사이클|에어바이크|로잉|수영|스키에르그|일립티컬|크로스 ?트레이너/], ['계단·오르막', /계단|스텝밀|등산/], ['높은 충격', /달리기|러닝|줄넘기/]];
const impactOf = n => (IMPACT.find(([, re]) => re.test(n)) || ['기타'])[0];
// 4.23.0 대체 운동은 '같은 움직임 묶음' 안에서만(근육 구분이 굵어 옆·뒤 어깨, 레그 컬·카프 등이 섞이던 문제).
// 위에서부터 처음 맞는 묶음. 묶음에 맞는 게 적으면 엉뚱한 걸로 채우지 않고 적게 보여 준다.
export const FAMILY_RULES = [
  ['카프', /카프/],
  ['손목', /리스트 컬/],
  ['레그 컬', /레그 컬|노르딕|글루트 햄/],
  ['무릎 펴기', /레그 익스텐션/],
  ['안쪽 허벅지', /어덕션|이너타이/],
  ['바깥 엉덩이', /어브덕션|아웃타이/],
  ['엉덩이 차기', /킥백 머신|케이블 킥백|멀티 힙/],
  ['엉덩이 들기', /힙 쓰러스트|글루트 브릿지/],
  ['등 펴기', /백 익스텐션|리버스 하이퍼/],
  ['슈러그', /슈러그/],
  ['뒤 어깨', /리어 델트|리버스 펙덱|벤트 ?오버 레터럴|페이스 풀|Y 레이즈/],
  ['옆 어깨', /레터럴 레이즈|업라이트 로우/],
  ['앞 어깨', /프론트 레이즈/],
  ['어깨 밀기', /숄더 프레스|오버헤드 프레스|아놀드|랜드마인 프레스|비하인드 넥|파이크 푸시업|푸시 프레스/],
  ['몸통 버티기', /플랭크|롤아웃|데드버그|할로우|마운틴 클라이머/],
  ['한 다리', /런지|스플릿|스텝업|피스톨|싱글 레그 프레스/],
  ['레그 프레스', /레그 프레스/],
  ['아랫가슴 밀기', /^딥스$|디클라인 (벤치|덤벨|체스트)/],
  ['삼두', /트라이셉스|푸시다운|스컬 크러셔|킥백|딥스|다이아몬드|JM 프레스|클로즈그립 벤치|오버헤드 익스텐션/],
  ['이두', /(?<!레그 |햄스트링 |버티|일립티)컬$|(?<!레그 |햄스트링 |버티|일립티)컬 |프리처/], // 4.27.0 EX-04
  ['가슴 모으기', /플라이|펙덱|크로스오버/],
  ['팔 내리기', /풀오버|스트레이트 암/],
  ['윗가슴 밀기', /인클라인 (벤치|덤벨 프레스|체스트|프레스)|스미스 인클라인|디클라인 푸시업/],
  ['가슴 밀기', /벤치프레스|체스트 ?프레스|푸시업/],
  ['위에서 당기기', /풀다운|풀업|친업/],
  ['당기기', /로우/],
  ['데드리프트', /데드리프트|랙 풀|굿모닝/],
  ['스쿼트', /스쿼트/],
  ['다리 들기', /레그 레이즈|니 레이즈/],
  ['몸통 말기', /크런치|싯업/],
  ['몸통 돌리기', /트위스트|우드찹|로테이션|팔로프/],
  ['들고 걷기', /캐리|파머스|슬레드/],
  ['역도', /클린|스내치|쓰러스터/],
  ['전신 반복', /버피|박스 점프|배틀 로프|월볼|케틀벨 스윙|겟업/],
];
const RELATED = {'안쪽 허벅지': ['스모 스쿼트', '사이드 런지']};
// 어려운 동작은 대체 목록 뒤로(바로 바꿔 하기엔 부담)
const HARD = /노르딕|글루트 햄|피스톨|스내치|파워 클린|앱 롤아웃|행잉|비하인드 넥|JM 프레스|디클라인 푸시업/;
// 루마니안·스티프는 데드리프트 묶음보다 '엉덩이 접기'로(햄스트링 위주)
const HINGE = /루마니안|스티프 레그|굿모닝/;
export function familyOf(ex){
  const n = (typeof ex === 'string' ? ex : ex?.name) || '';
  if (HINGE.test(n)) return '엉덩이 접기';
  return FAMILY_RULES.find(([, re]) => re.test(n))?.[0] || '';
}
export function alternativesFor(ex, {limit = 4, avoidEquipment = null, avoidJoint = null} = {}) {
  const e = typeof ex === 'string' ? findExercise(ex) : ex; if (!e) return [];
  const okJoint = x => !avoidJoint || !cautionsOf(x).includes(avoidJoint);
  if (['필라테스', '요가', '기타'].includes(e.part)) {
    const mind = ['필라테스', '요가', '기타'], rest = /스트레칭|폼롤러|요가/;
    if (rest.test(e.name)) return EXERCISE_CATALOG.filter(x => x.name !== e.name && mind.includes(x.part) && rest.test(x.name)).slice(0, limit);
    return EXERCISE_CATALOG.filter(x => x.name !== e.name && mind.includes(x.part) && !(e.part !== '기타' && x.part === '기타'))
      .sort((a, b) => (a.part === e.part ? 0 : 1) - (b.part === e.part ? 0 : 1) || a.name.localeCompare(b.name, 'ko')).slice(0, limit);
  }
  if (e.kind === 'cardio' || e.part === '유산소') {
    const im = impactOf(e.name);
    return EXERCISE_CATALOG.filter(x => x.name !== e.name && (x.kind === 'cardio' || x.part === '유산소') && okJoint(x))
      .map(x => ({x, s: (impactOf(x.name) === im ? 4 : impactOf(x.name) === '낮은 충격' ? 2 : 0) + (x.equipment !== e.equipment ? 1 : 0)}))
      .filter(r => r.s >= 2).sort((a, b) => b.s - a.s || a.x.name.localeCompare(b.x.name, 'ko')).slice(0, limit).map(r => r.x);
  }
  const fam = familyOf(e);
  if (fam) {
    // 같은 묶음에 다른 게 없을 때만: 같은 근육을 함께 쓰는 가까운 동작(검토한 짝만)
    const near = RELATED[fam]; if (near && !EXERCISE_CATALOG.some(x => x.name !== e.name && familyOf(x) === fam)) return near.map(n => EXERCISE_CATALOG.find(x => x.name === n)).filter(x => x && okJoint(x)).slice(0, limit);
    // 같은 묶음 · 기구가 다른 것 먼저(기구가 없거나 붐빌 때 바꾸는 용도) · 이름순
    return EXERCISE_CATALOG.filter(x => x.name !== e.name && x.kind !== 'cardio' && familyOf(x) === fam && okJoint(x) && (!avoidEquipment || x.equipment !== avoidEquipment))
      .sort((a, b) => (HARD.test(a.name) ? 1 : 0) - (HARD.test(b.name) ? 1 : 0) || (a.equipment === e.equipment ? 1 : 0) - (b.equipment === e.equipment ? 1 : 0) || a.name.localeCompare(b.name, 'ko')).slice(0, limit);
  }
  const p = patternOf(e), prim = e.primaryMuscleIds || [];
  const same = EXERCISE_CATALOG.filter(x => x.name !== e.name && x.kind !== 'cardio' && x.part === e.part)
    .filter(x => !avoidEquipment || x.equipment !== avoidEquipment).filter(okJoint);
  const scored = same.map(x => ({x, s: overlap(prim, x.primaryMuscleIds || []) * 3 + (patternOf(x) === p ? 4 : 0) + overlap(e.secondaryMuscleIds || [], x.secondaryMuscleIds || []) + (x.equipment !== e.equipment ? 1 : 0)}))
    .filter(r => r.s >= 4).sort((a, b) => b.s - a.s || a.x.name.localeCompare(b.x.name, 'ko'));
  // 근육 정보가 없는 종목(필라테스·요가·기타 등)은 같은 분류에서 고른다
  const list = scored.length ? scored.map(r => r.x) : same.sort((a, b) => a.name.localeCompare(b.name, 'ko'));
  return list.slice(0, limit);
}
export function knowledgeOf(ex) {
  const e = typeof ex === 'string' ? findExercise(ex) : ex; if (!e) return null;
  return {name: e.name, pattern: patternOf(e), cautions: cautionsOf(e), tip: tipOf(e), ladder: ladderOf(e), alternatives: alternativesFor(e).map(x => x.name)};
}
// 입력 화면용 접힌 한 칸: 요령 한 줄 · 단계 · 바꿔 할 운동(누르면 그 종목으로) · 주의할 곳
// 4.22.0 기본 사용법(머신 종류별 또는 종목 요령) · 안전 · 유튜브 검색 · 안내 문구를 함께. machine: 고른 머신
export function knowHTML(ex, esc = s => String(s), {machine = null} = {}) {
  const k = knowledgeOf(ex); if (!k) return '';
  const e = typeof ex === 'string' ? findExercise(ex) : ex, g = guideFor(e || {}, machine, EXERCISE_ENRICH[e?.id]?.c || []), q = youtubeQuery(e || {}, machine);
  const byName = n => EXERCISE_CATALOG.find(x => x.name === n);
  const chip = n => { const x = byName(n); return x ? `<button type="button" class="chip" data-q-ex="${esc(x.id)}">${esc(n)}</button>` : ''; };
  return `<details class="ex-know"><summary>사용법 · 요령 · 바꿔 할 운동${k.cautions.length ? ` · 주의 ${esc(k.cautions.join('·'))}` : ''}</summary><div class="ex-know-body">`
    + (g.steps.length ? `<p class="sub">${g.kind === 'machine' ? `기본 사용법 · ${esc(g.machineName)}` : '기본 동작'}</p><ol class="ex-steps">${g.steps.map(x => `<li>${esc(x)}</li>`).join('')}</ol>` : `<p>${esc(k.tip)}</p>`)
    + (g.exCues.length ? `<p class="sub">이 운동에서는</p><ul class="ex-cues">${g.exCues.map(x => `<li>${esc(x)}</li>`).join('')}</ul>` : '')
    + (k.ladder ? `<p class="ex-ladder"><b>${esc(k.ladder.title)}</b> ${k.ladder.steps.map((s, i) => `<span class="${i === k.ladder.index ? 'on' : ''}">${esc(s)}</span>`).join('<i aria-hidden="true">›</i>')}</p>` : '')
    + (k.alternatives.length ? `<p class="sub">기구가 없거나 붐빌 때</p><div class="chips">${k.alternatives.map(chip).join('')}</div>` : '')
    + `<p class="sub">안전</p><ul class="ex-safe">${g.safety.map(x => `<li>${esc(x)}</li>`).join('')}${k.cautions.length ? `<li>${esc(k.cautions.join('·'))}에 부담이 갈 수 있어요. 무리가 느껴지면 무게를 줄이거나 멈춰요.</li>` : ''}</ul>`
    + `<a class="yt-link" href="${esc(youtubeURL(q))}" target="_blank" rel="noopener noreferrer"><span class="yt-ico" aria-hidden="true">▶</span><span>유튜브에서 <b>${esc(q)}</b> 찾아보기</span></a>`
    + `<p class="hint ex-disclaimer">${esc(g.disclaimer)}</p>`
    + `</div></details>`;
}
