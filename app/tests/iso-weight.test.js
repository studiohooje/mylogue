import test from 'node:test';
import assert from 'node:assert/strict';
import {setVolume, setLoadText, cleanWorkout, ISO_BASES, normalizeDB, emptyDB} from '../domain.js';
import {isoMachine, armsIso, genericMachine, GENERIC_MACHINES} from '../machines-catalog.js';
import {sideModes} from '../rest-screen.js';
import {EXERCISE_CATALOG as C} from '../catalog.js';

// 2026-11-27 대표님: 원판 양쪽 40kg씩이면 총 80kg — 세트 칸 안내('한쪽 기준')와 저장이 같은 판단을 써야 한다
test('양팔 따로 머신 판단: 내 머신(바탕 종류)·브랜드(모델 사양 우선)', () => {
  assert.equal(isoMachine({id: 'my1', baseId: 'gm:row-iso'}), true); // 내가 등록한 머신
  assert.equal(isoMachine(genericMachine('gm:row-iso')), true);
  // 가온핏 리니어 로우: 레버는 하나지만 원판은 양쪽 → 무게는 한쪽 기준(총 ×2), 번갈아는 없음
  assert.equal(isoMachine(genericMachine('bm:gaonfit:plate-loaded:linear-row')), true);
  assert.equal(armsIso(genericMachine('bm:gaonfit:plate-loaded:linear-row')), false);
  assert.equal(isoMachine({id: 'gx', baseId: 'gm:row-iso', sided: 'both'}), false); // 헬스장에서 고른 움직임 우선
});
test('총 무게·볼륨: 40kg씩 = 총 80kg, 한쪽씩·번갈아', () => {
  const ex = {machineId: 'my1', weightBasis: 'per-hand', handCount: 2};
  assert.equal(setVolume(ex, {weight: 40, unit: 'kg', reps: 10}), 800);
  assert.equal(setLoadText(ex, {weight: 40, unit: 'kg'}), '40kg씩 (총 80kg)');
  assert.equal(setLoadText(ex, {weight: 40, unit: 'kg', side: 'alt'}), '40kg씩 (총 80kg)');
  assert.equal(setLoadText(ex, {weight: 40, unit: 'kg', side: 'single'}), '40kg씩');
  assert.equal(setVolume({}, {weight: 20, unit: 'kg', reps: 10, side: 'alt'}), 400); // 케이블 등 한 덩어리 무게를 번갈아
  const w = cleanWorkout({date: '2026-11-27', exercises: [{name: '아이소래터럴 로우', sets: [{weight: 40, reps: 10, side: 'alt', completed: true}]}]});
  assert.equal(w.exercises[0].sets[0].side, 'alt');
});
test('번갈아는 양팔 따로 머신·양손 덤벨만', () => {
  const ex = n => C.find(x => x.name === n);
  assert.deepEqual(sideModes(ex('덤벨 컬')), ['both', 'single', 'alt']);
  assert.deepEqual(sideModes(ex('머신 프리처 컬')), ['both', 'single']);
  assert.deepEqual(sideModes(ex('아이소래터럴 로우'), genericMachine('gm:row-iso')), ['both', 'single', 'alt']);
  assert.deepEqual(sideModes(ex('아이소래터럴 로우'), genericMachine('bm:gaonfit:plate-loaded:linear-row')), ['both', 'single']);
  assert.deepEqual(sideModes(ex('벤치프레스')), []);
});

test('지난 기록 바로잡기: 내 머신(양팔 따로 종류) 세트는 한쪽 기준 ×2', () => {
  assert.deepEqual([...ISO_BASES].sort(), GENERIC_MACHINES.filter(g => g.sided === 'iso').map(g => g.id).sort());
  const raw = {...emptyDB(), machines: [{id: 'm1', name: '우리 헬스장 로우', unit: 'kg', baseId: 'gm:row-iso'}, {id: 'm2', name: '체스트', unit: 'kg', baseId: 'gm:chest-press'}],
    workouts: [{id: 'w1', date: '2026-11-26', exercises: [{name: '아이소래터럴 로우', machineId: 'm1', sets: [{weight: 40, reps: 10, completed: true}]}, {name: '체스트 프레스', machineId: 'm2', sets: [{weight: 40, reps: 10, completed: true}]}]}]};
  const db = normalizeDB(raw), [a, b] = db.workouts[0].exercises;
  assert.equal(a.weightBasis, 'per-hand'); assert.equal(a.handCount, 2);
  assert.notEqual(b.weightBasis, 'per-hand');
  assert.equal(setVolume(a, a.sets[0]), 800);
  assert.deepEqual(normalizeDB(db).workouts[0].exercises[0].handCount, 2); // 다시 읽어도 같음
});

// 2026-11-27 대표님: '예정 포함'을 켜 두면 직접 끌 때까지 다음 날에도 — 계정 설정에 남고 다시 읽어도 그대로
test('예정 포함은 계정 설정에 남는다', async () => {
  const {withPrefs} = await import('../prefs.js');
  const db = normalizeDB(withPrefs(emptyDB(), {showPlanned: true}));
  assert.equal(db.settings.preferences.showPlanned, true);
  assert.equal(normalizeDB(withPrefs(db, {showPlanned: false})).settings.preferences.showPlanned, false);
});

// 2026-11-27 대표님: 운동 시작 때 헬스장과 3km 넘게 떨어지면 확인
test('헬스장 거리 확인', async () => {
  const {kmBetween, FAR_KM, locWarnHTML} = await import('../places.js');
  const ansan = {lat: 37.3189, lng: 126.8309}, ilsan = {lat: 37.6584, lng: 126.7700};
  assert.ok(kmBetween(ansan, ilsan) > 30 && kmBetween(ansan, ilsan) < 45);
  assert.ok(kmBetween(ansan, {lat: 37.3200, lng: 126.8320}) < FAR_KM);
  assert.match(locWarnHTML({gym: '헬스플러스 안산1호점', km: 37.8, where: '경기 고양시 일산동구'}), /약 <b>38km<\/b>/);
});

// 2026-11-27 대표님: 원판 양쪽·레버 하나(핵 스쿼트)는 한쪽 입력·총 무게, 한 발이어도 양쪽 합을 든다 / 무게판 둘인 케이블은 크로스오버만 한쪽 기준
test('레버 하나·원판 양쪽, 두 무게판 케이블', async () => {
  const {perSideFor, pairLever} = await import('../machines-catalog.js');
  const hack = genericMachine('bm:newtech-wellness:m-torture:hack-squat'), mp = genericMachine('bm:newtech-wellness:cable-motion:multi-pulley');
  assert.equal(pairLever(hack), true); assert.equal(isoMachine(hack), true); assert.equal(armsIso(hack), false);
  const ex = {machineId: 'h', weightBasis: 'per-hand', handCount: 2, oneLever: true};
  assert.equal(setVolume(ex, {weight: 40, unit: 'kg', reps: 10}), 800); // 양발: 40씩 = 80 × 10
  assert.equal(setVolume(ex, {weight: 40, unit: 'kg', reps: 10, side: 'single'}), 1600); // 한 발씩 80을 양쪽 다
  assert.equal(setLoadText(ex, {weight: 40, unit: 'kg', side: 'single'}), '40kg씩 (총 80kg)');
  assert.equal(cleanWorkout({date: '2026-11-24', exercises: [{name: '핵 스쿼트', weightBasis: 'per-hand', handCount: 2, oneLever: true, sets: [{weight: 40, reps: 10}]}]}).exercises[0].oneLever, true);
  assert.equal(perSideFor(mp, {id: 'exercise:케이블 크로스오버'}), true);
  assert.equal(perSideFor(mp, {id: 'exercise:페이스 풀'}), false);
});
