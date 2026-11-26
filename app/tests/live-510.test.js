// 5.1.0 실시간 입력 개편(대표님 헬스장 실사용 점검) — 이름 규칙·자동 검토·미리 채우기·합치기·세션 저장
import test from 'node:test';
import assert from 'node:assert/strict';
import {nameSuggestion,setsByPart} from '../workout-name.js';
import {checkWorkout,applyFix} from '../workout-check.js';
import {prefillFor,withUnitMemory,rememberedUnit} from '../set-prefill.js';
import {mergeWorkouts,shiftTimes} from '../workout-menu.js';
import {liveActive,idleHTML,liveHeadHTML} from '../live-session.js';
import {resolveExercise} from '../catalog.js';
const ex=(name,sets,extra={})=>({name,exerciseId:resolveExercise(name)?.id,primaryMuscleIds:resolveExercise(name)?.primaryMuscleIds,sets:sets.map(([w,r,u='kg',type='본세트',at=''])=>({weight:w,reps:r,unit:u,type,completed:true,completedAt:at})),...extra});
const day=[ex('페이스 풀',[[30,15],[30,15],[35,15],[40,15]]),ex('케이블 크로스오버',[[40,12],[30,15],[40,15],[40,12],[45,10]]),ex('스미스 벤치프레스',[[40,15],[40,15],[60,12],[60,12],[60,12]]),ex('체스트 프레스',[[30,12],[30,12],[30,12],[30,12]]),ex('숄더 프레스 머신',[[10,15],[15,12],[15,10],[15,10]]),ex('케이블 푸시다운',[[40,15],[40,12],[45,12],[50,10]])];
test('이름: 고른 부위만, 많이 한 순서 · 웜업 페이스 풀의 등은 이름에 안 들어감', () => {
  const r = nameSuggestion(day, ['웨이트', '웨이트:가슴', '웨이트:어깨', '웨이트:삼두']);
  assert.equal(r.title.includes('등'), false);
  assert.equal(r.title.split('·')[0], '가슴');
  assert.deepEqual(setsByPart(day).map(x => x[0]).slice(0, 1), ['가슴']);
});
test('이름: 자유롭게면 많이 한 부위 최대 4개, 전신이면 전신, 고른 부위가 실제와 다르면 바꾸기 제안', () => {
  assert.equal(nameSuggestion(day, []).kind, 'free');
  assert.equal(nameSuggestion(day, ['웨이트', '웨이트:전신']).title, '전신');
  assert.equal(nameSuggestion(day, ['웨이트', '웨이트:가슴', '웨이트:등', '웨이트:하체']).kind, 'swap');
});
test('이름: 웜업 세트는 세지 않는다', () => {
  const w = [ex('벤치프레스', [[20, 15, 'kg', '웜업'], [20, 15, 'kg', '웜업'], [20, 15, 'kg', '웜업']]), ex('케이블 푸시다운', [[20, 12]])];
  assert.deepEqual(setsByPart(w), [['삼두', 1]]);
});
test('자동 검토: kg/lb 섞임·0kg·앞 세트의 몇 배를 찾고 고치기 제안', () => {
  const w = {id: 'x', date: '2026-11-26', exercises: [ex('케이블 푸시다운', [[40, 15], [40, 12, 'lb'], [45, 12], [50, 10]]), ex('스미스 벤치프레스', [[0, 15], [60, 12]]), ex('레그 익스텐션', [[25, 12], [250, 12]])]};
  const is = checkWorkout(w, {workouts: []});
  assert.ok(is.some(x => x.name === '케이블 푸시다운' && x.n === 2 && x.fix.unit === 'kg'));
  assert.ok(is.some(x => x.name === '스미스 벤치프레스' && x.n === 1));
  const jump = is.find(x => x.name === '레그 익스텐션');
  assert.equal(jump.fix.weight, 25);
  const fixed = applyFix(w, jump);
  assert.equal(fixed.exercises[2].sets[1].weight, 25);
});
test('미리 채우기 두 갈래: 일반은 웜업 아닌 마지막, 웜업은 마지막 웜업 · 단위는 머신별 기억', () => {
  const past = {sets: [{weight: 10, reps: 15, unit: 'kg', type: '웜업'}, {weight: 40, reps: 10, unit: 'kg', type: '본세트'}]};
  const s = {exerciseId: 'e1', machineId: 'm1', sets: []}, lastSession = () => past;
  assert.equal(prefillFor(s, {}, {lastSession}).weight, 40);
  assert.equal(prefillFor(s, {}, {warm: true, lastSession}).weight, 10);
  const today = {...s, sets: [{exerciseId: 'e1', machineId: 'm1', weight: 42.5, reps: 8, unit: 'kg', type: '본세트'}]};
  assert.equal(prefillFor(today, {}, {lastSession}).weight, 42.5);
  const db = withUnitMemory({settings: {}}, s, 'lb');
  assert.equal(rememberedUnit(db, s), 'lb');
  assert.equal(prefillFor({...s, sets: []}, db, {lastSession: () => null}).unit, 'lb');
});
test('같은 날 운동 합치기: 시간순으로 한 운동, 같은 종목은 세트를 이어 붙인다', () => {
  const a = {id: 'a', date: '2026-11-26', exercises: [ex('페이스 풀', [[30, 15, 'kg', '본세트', '2026-11-26T07:14']]), ex('케이블 크로스오버', [[40, 12, 'kg', '본세트', '2026-11-26T07:25']])]};
  const b = {id: 'b', date: '2026-11-26', exercises: [ex('케이블 크로스오버', [[45, 10, 'kg', '본세트', '2026-11-26T07:52']]), ex('케이블 푸시다운', [[40, 15, 'kg', '본세트', '2026-11-26T08:31']])]};
  const m = mergeWorkouts([b, a]);
  assert.equal(m.id, 'a');
  assert.equal(m.exercises.length, 3);
  assert.equal(m.exercises.find(e => e.name === '케이블 크로스오버').sets.length, 2);
  const sh = shiftTimes(m, '07:00', '08:30');
  assert.equal(sh.exercises[0].sets[0].completedAt, '2026-11-26T07:00');
});
test('세션: 세트가 있고 끝내지 않았으면 진행 중 · 머리글에 붉은 끝내기 · 오래 쉬면 한 번만', () => {
  const s = {workoutId: 'w', sets: [{completedAt: '2026-11-26T07:00'}]};
  assert.equal(liveActive(s, {workouts: [{id: 'w'}]}), true);
  assert.equal(liveActive({...s, finished: true}, {workouts: [{id: 'w'}]}), false);
  assert.match(liveHeadHTML(s), /id="q-end"/);
  assert.match(idleHTML(s, new Date('2026-11-26T07:30').getTime()), /운동 끝나셨어요/);
  assert.equal(idleHTML({...s, idleDismissed: true}, new Date('2026-11-26T07:30').getTime()), '');
});
test('사이드 레터럴 레이즈 머신: 서서·앉아서 하는 머신을 한 기준 운동으로(옛 이름도 찾힘), 덤벨·케이블은 따로', () => {
  assert.equal(resolveExercise('스탠딩 래터럴 레이즈').name, '사이드 레터럴 레이즈 머신');
  assert.equal(resolveExercise('머신 레터럴 레이즈').name, '사이드 레터럴 레이즈 머신');
  assert.equal(resolveExercise('사레레').name, '사이드 레터럴 레이즈');
  assert.equal(resolveExercise('케이블 레터럴 레이즈').name, '케이블 레터럴 레이즈');
});
test('여러 창 보호: 다른 탭이 저장한 뒤 오래된 탭이 덮어쓰지 못한다(5.1.1)', async () => {
  const disk = new Map();
  globalThis.localStorage = {getItem: k => disk.get(k) ?? null, setItem: (k, v) => disk.set(k, String(v)), removeItem: k => disk.delete(k)};
  const store = await import('../store.js?stale=' + Date.now());
  const {emptyDB} = await import('../domain.js');
  const db = store.load();
  store.save({...db, settings: {...db.settings, note: 'A'}});
  assert.equal(store.isStale(), false);
  disk.set(store.STORAGE_KEY, JSON.stringify({...emptyDB(), settings: {...emptyDB().settings, note: 'B(다른 탭)'}}));
  assert.equal(store.isStale(), true);
  assert.throws(() => store.save({...db, settings: {...db.settings, note: 'C(오래된 탭)'}}), e => e.staleTab === true);
  assert.match(disk.get(store.STORAGE_KEY), /다른 탭/);
  store.load();
  assert.equal(store.isStale(), false);
});
