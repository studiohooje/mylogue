import test from 'node:test';
import assert from 'node:assert/strict';
import {backOnTrack, thresholdFor, parseRecall, botRecords, initialFill, mergeRecall, addDays} from '../back-on-track.js';
import {cleanWorkout, cleanMeal, cleanBody} from '../domain.js';

const dbWith = dates => ({body: [], meals: dates.map((d, i) => ({id: `m${i}`, date: d, name: '밥'})), workouts: [], checkins: {}, dayStates: {}});
const run = (last, n) => { const ds = []; for (let i = 0; i < 30 && ds.length < n; i++) ds.push(addDays(last, -i)); return ds; };

test('발동 기준 표', () => {
  assert.equal(thresholdFor(30), 3); assert.equal(thresholdFor(25), 3); assert.equal(thresholdFor(24), 4);
  assert.equal(thresholdFor(20), 5); assert.equal(thresholdFor(17), 6); assert.equal(thresholdFor(15), 7); assert.equal(thresholdFor(30, true), 7);
});

test('매일 쓰던 사람: 3일째 켜지고 2일째는 아님, 비운 날 목록은 최근 순', () => {
  const db = dbWith([...run('2026-11-20', 28), '2026-09-01']);
  assert.equal(backOnTrack(db, '2026-11-22'), null);
  const info = backOnTrack(db, '2026-11-23');
  assert.equal(info.threshold, 3); assert.deepEqual(info.gapDates, ['2026-11-22', '2026-11-21']);
});

test('30일 중 20일: 5일째, 15일: 7일째, 데이터 부족: 7일째, 기록 없음: 꺼짐', () => {
  const twenty = dbWith([...run('2026-11-20', 30).filter((_, i) => i % 3 !== 2), '2026-08-01']);
  assert.equal(backOnTrack(twenty, '2026-11-24'), null);
  assert.equal(backOnTrack(twenty, '2026-11-25').threshold, 5);
  const fifteen = dbWith([...run('2026-11-20', 30).filter((_, i) => i % 2 === 0), '2026-08-01']);
  assert.equal(backOnTrack(fifteen, '2026-11-26'), null);
  assert.equal(backOnTrack(fifteen, '2026-11-27').threshold, 7);
  const fresh = dbWith(run('2026-11-20', 5));
  assert.equal(backOnTrack(fresh, '2026-11-26'), null);
  assert.equal(backOnTrack(fresh, '2026-11-27').insufficient, true);
  assert.equal(backOnTrack(dbWith([]), '2026-11-27'), null);
});

test('예정 기록은 입력으로 세지 않음', () => {
  const db = dbWith([...run('2026-11-20', 28), '2026-09-01']);
  db.meals.push({id: 'p', date: '2026-11-22', name: '예정', planned: true});
  assert.equal(backOnTrack(db, '2026-11-23').last, '2026-11-20');
});

test('말로 한 번에: 요일·어제·날짜로 나누고 운동·쉼·체중을 고름', () => {
  const dates = ['2026-11-22', '2026-11-21', '2026-11-20', '2026-11-19', '2026-11-18'];
  const p = parseRecall('수요일 점심 김치찌개, 저녁 BBQ 반 마리, 목요일 헬스 하체, 금요일 쉼, 어제 몸무게 71.2kg', dates, '2026-11-23');
  assert.deepEqual(p['2026-11-18'].meal, ['김치찌개', 'BBQ 반 마리']); // 11/18 = 수요일
  assert.deepEqual(p['2026-11-19'].work, ['헬스 하체']);
  assert.equal(p['2026-11-20'].rest, true);
  assert.equal(p['2026-11-22'].weight, '71.2');
});

test('저장 기록: 식사는 이름만, 운동은 기억한 만큼(종목 없이), 체중은 적었을 때만 — 도메인 검사 통과', () => {
  let fill = initialFill({gapDates: ['2026-11-22', '2026-11-21'], last: '2026-11-20'});
  fill = mergeRecall({...fill, today: '2026-11-23'}, {'2026-11-22': {meal: ['김치찌개', '공기밥'], work: ['러닝 30분'], weight: '', rest: false}, '2026-11-21': {meal: [], work: [], weight: '70.4', rest: true}});
  let n = 0; const r = botRecords(fill, () => `g${n++}`, '2026-11-23T00:00:00.000Z');
  assert.equal(r.meals.length, 2); assert.equal(r.body.length, 1); assert.equal(r.workouts.length, 2);
  r.meals.map(cleanMeal); r.body.map(cleanBody);
  const ws = r.workouts.map(cleanWorkout);
  assert.equal(ws.find(w => w.date === '2026-11-22').recalled, true);
  assert.equal(ws.find(w => w.date === '2026-11-21').rest, true);
});
