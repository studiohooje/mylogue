// 4.17.0 운동 프로그램 자동 설계(프리미엄): 목표·경력·주 횟수·장소·시간 → 분할과 종목·세트·횟수, 진행 규칙.
// 종목은 움직임 패턴(스쿼트·힌지·밀기·당기기·런지·코어)으로 고르고, 처음이면 머신·쉬운 변형부터. 결과는 내 루틴으로 저장.
import {findExercise} from './catalog.js';

export const GOALS = [['muscle', '근육 키우기'], ['strength', '힘 늘리기'], ['lose', '감량 돕기']];
export const LEVELS = [['new', '처음'], ['mid', '6개월 이상'], ['pro', '2년 이상']];
export const PLACES = [['gym', '헬스장'], ['home', '집']];
// 패턴별 [처음, 6개월+, 2년+]
const SLOT = {
  gym: {squat: ['레그 프레스', '스쿼트', '스쿼트'], hinge: ['글루트 브릿지', '루마니안 데드리프트', '데드리프트'], hpush: ['체스트 프레스 머신', '덤벨 벤치프레스', '벤치프레스'], vpush: ['숄더 프레스 머신', '덤벨 숄더 프레스', '오버헤드 프레스'], hpull: ['시티드 로우 머신', '덤벨 로우', '바벨 로우'], vpull: ['랫풀다운', '랫풀다운', '풀업'], lunge: ['덤벨 스텝업', '런지', '불가리안 스플릿 스쿼트'], core: ['데드버그', '플랭크', '행잉 레그 레이즈'], arms: ['덤벨 컬', '케이블 푸시다운', '바벨 컬'], legacc: ['레그 컬', '레그 익스텐션', '레그 컬']},
  home: {squat: ['고블릿 스쿼트', '고블릿 스쿼트', '불가리안 스플릿 스쿼트'], hinge: ['글루트 브릿지', '글루트 브릿지', '힙 쓰러스트'], hpush: ['니 푸시업', '푸시업', '푸시업'], vpush: ['인클라인 푸시업', '파이크 푸시업', '파이크 푸시업'], hpull: ['인버티드 로우', '인버티드 로우', '인버티드 로우'], vpull: ['인버티드 로우', '풀업', '풀업'], lunge: ['런지', '런지', '불가리안 스플릿 스쿼트'], core: ['데드버그', '플랭크', '마운틴 클라이머'], arms: ['덤벨 컬', '덤벨 컬', '덤벨 컬'], legacc: ['글루트 브릿지', '런지', '런지']},
};
const SPLITS = {
  2: [['전신 A', ['squat', 'hpush', 'hpull', 'core']], ['전신 B', ['hinge', 'vpush', 'vpull', 'lunge']]],
  3: [['전신 A', ['squat', 'hpush', 'hpull', 'core']], ['전신 B', ['hinge', 'vpush', 'vpull', 'lunge']], ['전신 C', ['squat', 'hpush', 'vpull', 'legacc']]],
  4: [['상체 A', ['hpush', 'hpull', 'vpush', 'arms']], ['하체 A', ['squat', 'hinge', 'lunge', 'core']], ['상체 B', ['vpush', 'vpull', 'hpush', 'arms']], ['하체 B', ['hinge', 'squat', 'legacc', 'core']]],
  5: [['밀기', ['hpush', 'vpush', 'arms', 'core']], ['당기기', ['vpull', 'hpull', 'arms', 'core']], ['하체', ['squat', 'hinge', 'lunge', 'legacc']], ['상체', ['hpush', 'vpull', 'vpush', 'hpull']], ['하체 B', ['hinge', 'squat', 'legacc', 'core']]],
};
const DOSE = {muscle: {sets: 3, reps: [8, 12], rest: 90}, strength: {sets: 4, reps: [4, 6], rest: 150}, lose: {sets: 3, reps: [10, 15], rest: 60}};
export function buildProgram({goal = 'muscle', level = 'new', days = 3, place = 'gym', minutes = 60} = {}) {
  const li = LEVELS.findIndex(x => x[0] === level), dose = {...DOSE[goal] || DOSE.muscle};
  if (level === 'new') { dose.sets = 3; if (goal === 'strength') dose.reps = [6, 8]; }
  const nDays = Math.max(2, Math.min(5, Number(days) || 3)), split = SPLITS[nDays], slots = SLOT[place] || SLOT.gym;
  const perSession = minutes <= 45 ? 3 : 4;
  const sessions = split.map(([title, pats]) => {
    const seen = new Set();
    const exercises = pats.slice(0, perSession).map(p => {
      let name = slots[p][Math.max(0, li)];
      if (seen.has(name)) name = slots[p].find(n => !seen.has(n)) || name; seen.add(name);
      const e = findExercise(name) || {name, part: '', kind: 'strength'};
      const core = p === 'core', acc = p === 'arms' || p === 'legacc', reps = core ? [10, 15] : acc ? [10, 12] : dose.reps;
      return {exerciseId: e.id || `exercise:${e.name}`, name: e.name, part: e.part, kind: 'strength', primaryMuscleIds: e.primaryMuscleIds || [], secondaryMuscleIds: e.secondaryMuscleIds || [], pattern: p, sets: [...Array(core ? 2 : acc ? 3 : dose.sets)].map(() => ({weight: 0, reps: reps[1], targetReps: reps[1], type: '본세트', completed: false})), repRange: reps};
    });
    return {title, exercises};
  });
  const rule = goal === 'strength' ? '바벨 큰 종목(스쿼트·데드리프트·벤치프레스 등)은 모든 세트를 목표 횟수 위 끝까지 하면 다음엔 2.5kg(하체 5kg) 올려요. 덤벨·한쪽 다리 종목은 횟수를 먼저 늘려요. 아프면 멈추고 무게를 줄여요.' : '모든 세트를 범위 위 끝까지 두 번 연속 하면 무게를 한 칸 올리고 범위 아래 끝부터 다시.';
  return {goal, level, days: nDays, place, minutes, rest: dose.rest, rule, deload: '4주째는 세트를 하나씩 줄인 가벼운 주로 몸을 회복해요.', sessions};
}
export function programRoutines(p, uid) {
  const tag = `자동 ${p.days}일`;
  return p.sessions.map(s => ({id: uid(), title: `${tag} · ${s.title}`, exercises: s.exercises.map(({pattern, repRange, ...e}) => ({...e, sets: e.sets.map(x => ({...x, completed: false}))}))}));
}
const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));
export function programHTML(st, {lock = ''} = {}) {
  const chips = (key, list, cur) => `<div class="chip-row pb-seg">${list.map(([v, l]) => `<button type="button" class="chip ${String(cur) === String(v) ? 'active' : ''}" data-pb-${key}="${v}" aria-pressed="${String(cur) === String(v)}">${l}</button>`).join('')}</div>`;
  const head = '<section class="section card pb"><div class="section-title"><h3>운동 프로그램 자동 설계</h3><small>고르면 바로 만들어져요</small></div>';
  if (lock) return head + lock + '</section>';
  const p = buildProgram(st);
  return `${head}<p class="hint">목표</p>${chips('goal', GOALS, st.goal)}<p class="hint">운동 경력</p>${chips('level', LEVELS, st.level)}<p class="hint">일주일에</p>${chips('days', [[2, '2일'], [3, '3일'], [4, '4일'], [5, '5일']], st.days)}<p class="hint">어디서 · 한 번에</p>${chips('place', PLACES, st.place)}${chips('minutes', [[45, '45분'], [60, '60분']], st.minutes)}
  <div class="pb-out">${p.sessions.map(s => `<div class="pb-sess"><b>${esc(s.title)}</b><ol>${s.exercises.map(e => `<li>${esc(e.name)} <small>${e.sets.length}세트 × ${e.repRange[0]}~${e.repRange[1]}회</small></li>`).join('')}</ol></div>`).join('')}</div>
  <p class="hint">세트 사이 ${p.rest}초 쉬기 · ${esc(p.rule)} ${esc(p.deload)}</p><p class="hint">무게는 정해 두지 않았어요. 첫 주에 '2~3회 더 할 수 있겠다' 싶은 무게로 시작해요.</p>
  <button type="button" class="button" id="pb-save">내 루틴 ${p.sessions.length}개로 저장</button></section>`;
}
