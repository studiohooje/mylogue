// 4.17.0 운동 지식 DB: 움직임 유형, 주의할 관절, 대체 운동, 쉬운→어려운 단계 사다리.
// 근거: NSCA·ACSM 교재의 움직임 분류(밀기·당기기·스쿼트·힌지·런지·운반·회전), 흔한 부상 부위 안내(일반 정보, 진단 아님).
// 점수나 순위를 매기지 않는다(대표님 방침: 운동은 '했다'를 칭찬). 단계 사다리는 '할 수 있게 된 것'을 보여 주는 용도.
import {EXERCISE_CATALOG, findExercise} from './catalog.js';

// 움직임 유형: 이름 규칙(위에서부터 처음 맞는 것). part와 함께 쓴다.
const PATTERN_RULES = [
  ['운반', /캐리|파머스|슬레드/],
  ['폭발·전신', /버피|클린|스내치|쓰러스터|스윙|월볼|박스 점프|점프 스쿼트|배틀 로프|겟업|푸시 프레스/],
  ['수직 당기기', /풀업|친업|랫풀다운|풀다운|어시스트 풀업/],
  ['수평 당기기', /로우|페이스 풀|인버티드/],
  ['수직 밀기', /오버헤드 프레스|숄더 프레스|아놀드|비하인드 넥|랜드마인|파이크 푸시업/],
  ['수평 밀기', /벤치프레스|체스트 프레스|푸시업|딥스|덤벨 프레스|JM 프레스/],
  ['힌지', /데드리프트|굿모닝|힙 쓰러스트|글루트 브릿지|백 익스텐션|랙 풀|리버스 하이퍼|글루트 햄|노르딕|킥백|멀티 힙/],
  ['런지·한 다리', /런지|스플릿|스텝업|피스톨|싱글 레그 프레스|싱글 레그 레그/],
  ['스쿼트', /스쿼트|레그 프레스|핵|벨트/],
  ['코어', /크런치|플랭크|레그 레이즈|니 레이즈|롤아웃|트위스트|싯업|우드찹|데드버그|마운틴|팔로프|토르소|할로우/],
];
const ISOLATION = /컬|익스텐션|레이즈|플라이|펙덱|푸시다운|킥백|슈러그|어브덕션|어덕션|풀오버/;
export function patternOf(ex) {
  const e = typeof ex === 'string' ? findExercise(ex) || {name: ex} : ex; const n = e?.name || '';
  if (e?.kind === 'cardio' || e?.part === '유산소') return '유산소';
  if (['필라테스', '요가', '기타'].includes(e?.part)) return e.part;
  for (const [p, re] of PATTERN_RULES) if (re.test(n)) return p;
  return ISOLATION.test(n) ? '고립' : (e?.part || '기타');
}

// 주의할 관절(일반 정보): 아프면 쉬고 전문가와 상의하라는 안내에 쓴다
const CAUTION_RULES = [
  ['허리', /데드리프트|굿모닝|벤트오버|바벨 로우|펜들레이|T바|랙 풀|스쿼트|싯업|레그 레이즈|백 익스텐션|스윙|클린|스내치|리버스 하이퍼/],
  ['무릎', /스쿼트|런지|레그 익스텐션|레그 프레스|핵|스텝업|점프|피스톨|버피|박스 점프|노르딕/],
  ['어깨', /오버헤드|숄더 프레스|비하인드 넥|업라이트 로우|딥스|벤치프레스|풀업|친업|스내치|플라이|레터럴 레이즈|푸시 프레스|아놀드/],
  ['손목', /프론트 스쿼트|푸시업|벤치프레스|컬|클린|플랭크|버피|리스트/],
  ['팔꿈치', /스컬 크러셔|트라이셉스 익스텐션|JM 프레스|프리처|딥스|푸시다운/],
  ['목', /슈러그|크런치|싯업|비하인드 넥/],
];
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
];
const NAMES = new Set(EXERCISE_CATALOG.map(e => e.name));
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
export function alternativesFor(ex, {limit = 4, avoidEquipment = null, avoidJoint = null} = {}) {
  const e = typeof ex === 'string' ? findExercise(ex) : ex; if (!e || e.kind === 'cardio') return [];
  const p = patternOf(e), prim = e.primaryMuscleIds || [];
  return EXERCISE_CATALOG.filter(x => x.name !== e.name && x.kind !== 'cardio' && x.part === e.part)
    .filter(x => !avoidEquipment || x.equipment !== avoidEquipment)
    .filter(x => !avoidJoint || !cautionsOf(x).includes(avoidJoint))
    .map(x => ({x, s: overlap(prim, x.primaryMuscleIds || []) * 3 + (patternOf(x) === p ? 4 : 0) + overlap(e.secondaryMuscleIds || [], x.secondaryMuscleIds || []) + (x.equipment !== e.equipment ? 1 : 0)}))
    .filter(r => r.s >= 4).sort((a, b) => b.s - a.s || a.x.name.localeCompare(b.x.name, 'ko')).slice(0, limit).map(r => r.x);
}
export function knowledgeOf(ex) {
  const e = typeof ex === 'string' ? findExercise(ex) : ex; if (!e) return null;
  return {name: e.name, pattern: patternOf(e), cautions: cautionsOf(e), ladder: ladderOf(e), alternatives: alternativesFor(e).map(x => x.name)};
}
