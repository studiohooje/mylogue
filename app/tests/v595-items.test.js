// 2026-11-28 5.9.5: 생고기 덩이·닭다리 개, 크기 묶기(피자 R·L), 코치로그 센터 장부·꺼 둔 동작·당겨 끝낸 시각
import test from 'node:test';
import assert from 'node:assert/strict';
import {countUnitFor} from '../portion-dict.js';
import {setFoodRows, searchFoodDB, sizeOf} from '../food-db.js';
import * as D from '../coach2-data.js';

test('생고기는 덩이, 뼈 있는 닭다리는 개, 닭 포장육은 팩', () => {
  assert.equal(countUnitFor('소고기(우둔, 생것)').unit, '덩이');
  assert.equal(countUnitFor('닭다리').unit, '개');
  assert.equal(countUnitFor('닭다리살').unit, '팩');
  assert.equal(countUnitFor('닭다리 튀김'), null);
});

test('크기만 다른 메뉴는 목록에 한 줄, 크기를 쓰면 그 크기', () => {
  assert.deepEqual(sizeOf('포테이토 피자 L'), {label: 'L', base: '포테이토 피자'});
  assert.equal(sizeOf('자일리톨 껌'), null);
  const r = (name, kcal) => [name, '시험피자', '판', 0, kcal, 10, 10, 10, 'b', '', 0, null];
  setFoodRows([r('포테이토 피자 R', 1800), r('포테이토 피자 L', 2400)]);
  const one = searchFoodDB('포테이토 피자');
  assert.equal(one.length, 1);
  assert.equal(one[0].size, 'R');
  assert.deepEqual(Object.keys(one[0].sizeIds), ['R', 'L']);
  assert.equal(searchFoodDB('포테이토 피자 L')[0].size, 'L');
});

test('센터 장부면 회원에게 남은 회차를 보내지 않는다', () => {
  assert.equal(D.showLeftOf({ledger: 'center', showLeft: true}), false);
  assert.equal(D.showLeftOf({ledger: 'mine', showLeft: true}), true);
  assert.equal(D.showLeftOf({ledger: 'mine', showLeft: false}), false);
});

const base = () => ({clients: [{id: 'c1', name: 'a', passes: []}], sessions: [], schedules: [{id: 'x1', clientIds: ['c1'], startAt: '2026-11-28T23:20', durationMin: 50, placeId: 'p1', status: 'planned'}], prefs: {places: [{id: 'p1', name: 's'}]}});

test('지난번에 꺼 둔 동작은 다음 수업에도 꺼진 채로', () => {
  const r = D.finishClass(base(), {scheduleId: 'x1', clientIds: ['c1'], date: '2026-11-28', time: '23:20', placeId: 'p1', moves: [{name: 'A', on: true}, {name: 'B', on: false}]}, '2026-11-28', new Date('2026-11-29T00:30'));
  const m = D.prefillMoves(r.data, {clientIds: ['c1'], placeId: 'p1'}).moves;
  assert.deepEqual(m.map(x => [x.name, x.on]), [['A', true], ['B', false]]);
});

test('예약보다 먼저 끝내면 실제로 한 시각으로 남는다', () => {
  const r = D.finishClass(base(), {scheduleId: 'x1', clientIds: ['c1'], date: '2026-11-28', time: '23:20', placeId: 'p1'}, '2026-11-28', new Date('2026-11-28T20:00'));
  assert.equal(r.data.sessions[0].date, '2026-11-28');
  assert.equal(r.data.sessions[0].time, '19:10');
  const late = D.finishClass(base(), {scheduleId: 'x1', clientIds: ['c1'], date: '2026-11-28', time: '23:20', placeId: 'p1'}, '2026-11-28', new Date('2026-11-29T00:30'));
  assert.equal(late.data.sessions[0].time, '23:20');
});

test('늘어난 무게: 무게가 오른 종목만, 한쪽씩은 따로, 최근 순', async () => {
  const {liftTracks, workoutGrowthHTML} = await import('../workout-flow.js');
  const W = (date, name, kg, side) => ({id: date + name, date, exercises: [{name, kind: 'strength', sets: [{weight: kg, reps: 10, unit: 'kg', completed: true, ...(side ? {side} : {})}]}]});
  const db = {workouts: [W('2026-11-20', '레그 익스텐션', 25), W('2026-11-24', '레그 익스텐션', 60), W('2026-11-21', '페이스 풀', 30), W('2026-11-26', '페이스 풀', 30), W('2026-11-22', '핵 프레스', 40, 'single'), W('2026-11-28', '핵 프레스', 45, 'single')]};
  const t = liftTracks(db, '2026-11-28');
  assert.deepEqual(t.map(x => x.name), ['핵 프레스 (한쪽씩)', '레그 익스텐션']);
  assert.match(workoutGrowthHTML(db, {end: '2026-11-28'}), /늘어난 무게[\s\S]*25 → <b>60kg<\/b>/);
});
