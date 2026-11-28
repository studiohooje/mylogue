// 2026-11-28 대표님: 지난 운동처럼 하기에서 제조사 머신까지 넘어와야 함, 핵 프레스는 핵 스쿼트와 따로
import test from 'node:test';
import assert from 'node:assert/strict';
import {lastMachineId} from '../quick-entry.js';
import {EXERCISE_CATALOG, resolveExercise} from '../catalog.js';
import {genericMachinesFor} from '../machines-catalog.js';

const W = [
 {date: '2026-11-20', gymName: '헬스플러스 안산1호점', exercises: [{exerciseId: 'exercise:힙 어덕션', machineId: 'bm:newtech-wellness:old'}]},
 {date: '2026-11-25', gymName: '헬스플러스 안산1호점', exercises: [{exerciseId: 'exercise:힙 어덕션', machineId: 'bm:newtech-wellness:hip-adduction'}]},
 {date: '2026-11-26', gymName: '다른 헬스장', exercises: [{exerciseId: 'exercise:힙 어덕션', machineId: 'bm:cybex:x'}, {exerciseId: 'exercise:레그 컬', machineId: 'gm:leg-curl'}]},
];
test('같은 헬스장에서 마지막에 쓴 제조사 머신, 다른 헬스장 것은 일반 머신만', () => {
 assert.equal(lastMachineId(W, 'exercise:힙 어덕션', '헬스플러스 안산1호점'), 'bm:newtech-wellness:hip-adduction');
 assert.equal(lastMachineId(W, 'exercise:힙 어덕션', '새 헬스장'), '');
 assert.equal(lastMachineId(W, 'exercise:레그 컬', '새 헬스장'), 'gm:leg-curl');
});
test('핵 프레스는 핵 스쿼트와 다른 종목이고 핵 프레스 머신이 붙는다', () => {
 const hp = EXERCISE_CATALOG.find(x => x.name === '핵 프레스');
 assert.ok(hp);
 assert.equal(resolveExercise('핵프레스')?.name, '핵 프레스');
 assert.ok(genericMachinesFor(hp.id).some(g => g.id === 'gm:hack-press'));
});

test('2026-11-28 한쪽씩·양쪽 함께 무게는 따로 기억', async () => {
 const {prefillFor} = await import('../set-prefill.js');
 const set = (w, side) => ({exerciseId: 'e', machineId: 'm', weight: w, reps: 10, unit: 'kg', type: '본세트', ...(side ? {side} : {})});
 const past = {sets: [set(60), set(25, 'single')]};
 const lastSession = () => past;
 const s = side => ({exerciseId: 'e', machineId: 'm', side, sets: []});
 assert.equal(prefillFor(s('single'), {}, {lastSession}).weight, 25);
 assert.equal(prefillFor(s('both'), {}, {lastSession}).weight, 60);
 // 오늘 양쪽으로 70을 했어도 한쪽씩은 지난 한쪽 25
 assert.equal(prefillFor({...s('single'), sets: [set(70)]}, {}, {lastSession}).weight, 25);
 // 번갈아는 기록이 없으면 다른 방식 값을 빌려 오되 sameSide=false
 const alt = prefillFor(s('alt'), {}, {lastSession});
 assert.equal(alt.sameSide, false);
});

test('2026-11-28 종목 고르기 필터: 오늘 고른 종류·부위가 눌린 채로, 부위는 여러 개', async () => {
 const {pickFilter, quickWorkoutHTML} = await import('../quick-entry.js');
 assert.deepEqual(pickFilter({targets: ['웨이트', '웨이트:하체', '웨이트:어깨']}), {cat: '웨이트', parts: ['하체', '어깨']});
 assert.deepEqual(pickFilter({targets: ['웨이트', '웨이트:전신']}), {cat: '웨이트', parts: []});
 assert.deepEqual(pickFilter({targets: ['필라테스']}), {cat: '필라테스', parts: []});
 assert.deepEqual(pickFilter({targets: []}), {cat: '전체', parts: []});
 // 직접 누르면 그 값
 assert.deepEqual(pickFilter({targets: ['웨이트', '웨이트:하체'], cat: '전체', parts: []}), {cat: '전체', parts: []});
 const db = {settings: {gyms: []}, workouts: [], machines: [], meals: []};
 const s = {date: '2026-11-28', gymName: '', targets: ['웨이트', '웨이트:하체', '웨이트:어깨'], title: '', query: '', exerciseId: '', machineId: '', sets: [{exerciseId: 'x', weight: 1, reps: 1, completedAt: '2026-11-28T10:00'}], editIndex: -1, workoutId: 'w', live: true};
 const h = quickWorkoutHTML(db, s, EXERCISE_CATALOG);
 assert.match(h, /class="chip active" data-q-cat="웨이트" aria-pressed="true"/);
 assert.match(h, /class="chip small active" data-q-part="하체"/);
 assert.match(h, /class="chip small active" data-q-part="어깨"/);
 assert.match(h, /class="chip small " data-q-part="전체"/);
});

test('2026-11-28 덤벨이면 −/+가 1kg씩, 그 밖은 2.5kg', async () => {
 const {weightStep} = await import('../machines-catalog.js');
 assert.equal(weightStep('kg', '덤벨 덤벨 컬'), 1);
 assert.equal(weightStep('kg', ' 원암 덤벨 로우'), 1); // 장비 칸이 비어도 이름에 덤벨이면
 assert.equal(weightStep('kg', '덤벨/케틀벨 고블릿 스쿼트'), 1);
 assert.equal(weightStep('kg', '머신 레그 프레스'), 2.5);
 assert.equal(weightStep('lb', '덤벨 덤벨 컬'), 5);
 assert.equal(weightStep('level', '덤벨'), 1);
 const {restScreenHTML} = await import('../rest-screen.js');
 const {lastSession} = await import('../quick-entry.js');
 const dc = EXERCISE_CATALOG.find(x => x.equipment === '덤벨');
 const st = {date: '2026-11-28', exerciseId: dc.id, machineId: '', sets: [{exerciseId: dc.id, machineId: '', weight: 12, reps: 10, unit: 'kg', type: '본세트'}], targets: [], queue: [], rest: {at: Date.now(), target: 90}, restPanel: 'weight', next: {exerciseId: dc.id, weight: 12, reps: 10, unit: 'kg', kind: 'main', side: 'both', changed: false}};
 const h = restScreenHTML({settings: {restMode: 'alarm'}, workouts: [], machines: []}, st, {selected: dc, machine: null, catalog: EXERCISE_CATALOG, recent: [], lastSession, exKeyOf: e => e.exerciseId || e.name});
 assert.match(h, /data-rest-w="1" aria-label="1 늘리기"/);
});

test('2026-11-28 쉬는 화면: 다음 세트 머신(소분류)이 보이고 바꾸기 목록이 열린다', async () => {
 const {restScreenHTML} = await import('../rest-screen.js');
 const {lastSession} = await import('../quick-entry.js');
 const ex = EXERCISE_CATALOG.find(x => x.name === '레그 익스텐션');
 const base = {date: '2026-11-28', exerciseId: ex.id, machineId: 'bm:a', sets: [{exerciseId: ex.id, machineId: 'bm:a', weight: 40, reps: 10, unit: 'kg', type: '본세트'}], targets: [], queue: [], rest: {at: Date.now(), target: 90}, next: {exerciseId: ex.id, machineId: 'bm:a', weight: 40, reps: 10, unit: 'kg', kind: 'main', side: 'both', changed: false}};
 const opts = {selected: ex, machine: null, catalog: EXERCISE_CATALOG, recent: [], lastSession, exKeyOf: e => e.exerciseId || e.name, machOpts: () => [{id: 'bm:a', label: '뉴텍 · 레그 익스텐션'}, {id: 'bm:b', label: '드랙스 · 레그 익스텐션'}], machName: id => ({'bm:a': '뉴텍 · 레그 익스텐션'})[id] || ''};
 const db = {settings: {restMode: 'alarm'}, workouts: [], machines: []};
 assert.match(restScreenHTML(db, base, opts), /class="rt-mach"><span>뉴텍 · 레그 익스텐션<\/span><button type="button" class="rt-mach-btn" data-rest-mach-open="main">바꾸기/);
 assert.match(restScreenHTML(db, {...base, restPanel: 'weight'}, opts), /data-rest-mach-open="weight"/);
 const p = restScreenHTML(db, {...base, restPanel: 'mach', restMachBack: 'weight'}, opts);
 assert.match(p, /data-rest-mach="bm:b"/); assert.match(p, /class="rt-exopt on" data-rest-mach="bm:a"/); assert.match(p, /data-rest-mach=""/); assert.match(p, /data-rest-panel="weight"/);
});

test('2026-11-28 닭가슴살·닭다리살·닭안심 포장육은 개수 단위가 팩(100g), 요리·소시지는 아님', async () => {
 const {countUnitFor} = await import('../portion-dict.js');
 for (const n of ['킹닭 허브맛 닭다리살', '닭가슴살', '닭안심', '닭가슴살 스테이크']) assert.deepEqual([countUnitFor(n)?.unit, countUnitFor(n)?.grams], ['팩', 100], n);
 assert.equal(countUnitFor('닭가슴살 소시지')?.unit, '개');
 assert.notEqual(countUnitFor('닭가슴살 볶음밥')?.unit, '팩');
 assert.equal(countUnitFor('닭가슴살 샐러드'), null);
});

test('2026-11-28 고기가 들어간 요리는 개수 단위(장)를 붙이지 않는다', async () => {
 const {countUnitFor} = await import('../portion-dict.js');
 for (const n of ['닭가슴살 볶음밥', '소고기 볶음', '돼지고기 김치찜']) assert.equal(countUnitFor(n), null, n);
 assert.equal(countUnitFor('소고기')?.unit, '장');
});
