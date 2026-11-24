// 4.21.0 휴식 화면: 방식 3가지, 다음 세트 준비, 🔥 버튼은 언제나
import test from 'node:test';
import assert from 'node:assert/strict';
import {restScreenHTML, defaultNext, sideOptions, clock, restMode} from '../rest-screen.js';
import {cleanWorkout} from '../domain.js';
import {lastSession} from '../quick-entry.js';
import {EXERCISE_CATALOG} from '../catalog.js';

const sq = EXERCISE_CATALOG.find(x => x.name === '스쿼트');
const base = (mode) => ({settings: {restMode: mode}, workouts: [], machines: []});
const st = {date: '2026-11-24', exerciseId: sq.id, machineId: '', sets: [{exerciseId: sq.id, weight: 70, reps: 8, unit: 'kg', type: '본세트'}], targets: [], queue: [], rest: {at: Date.now(), target: 90}, next: {exerciseId: sq.id, weight: 70, reps: 8, unit: 'kg', kind: 'main', side: 'both', changed: false}, restPanel: 'main'};
const opts = {selected: sq, machine: null, catalog: EXERCISE_CATALOG, recent: [], lastSession, exKeyOf: e => e.exerciseId || e.name};

test('지정해 두고 쉬기: 원형 타이머·휴식 시간 고르기·+15초/+30초/+1분, −15초 없음', () => {
  const h = restScreenHTML(base('alarm'), st, opts);
  assert.match(h, /id="rt-dial"/); assert.match(h, /data-target="90"/); assert.match(h, /data-rest-set="120"/);
  assert.match(h, /data-rest-add="15"/); assert.match(h, /data-rest-add="30"/); assert.match(h, /data-rest-add="60"/); assert.doesNotMatch(h, /−15|-15초/);
  assert.match(h, /휴식 끝, 다음 세트 시작/); assert.match(h, /🔥/);
  assert.doesNotMatch(h, /그대로 할게요/); // 따로 버튼 없이 '그대로' 꼬리표로
});
test('시간만 재기: 목표·알림 없음, 휴식 시간 고르기 없음', () => {
  const h = restScreenHTML(base('track'), st, opts);
  assert.match(h, /data-target="0"/); assert.doesNotMatch(h, /data-rest-set/); assert.match(h, /시간만 재는 중/); assert.match(h, /휴식 끝, 다음 세트 시작/);
});
test('사용 안 하기: 타이머 없이 다음 세트 준비만, 문구는 바로 다음 운동 고르기', () => {
  const h = restScreenHTML(base('off'), st, opts);
  assert.doesNotMatch(h, /rt-dial/); assert.match(h, /다음 운동 고르기/); assert.match(h, /휴식 끝, 다음 세트 시작/);
  assert.equal(restMode({settings: {}}), 'alarm');
});
test('다음 세트 기본값: 지난번 웜업이 있으면 웜업부터, 방식은 머신이 되는 것만', () => {
  const db = {workouts: [{id: 'w1', date: '2026-11-20', exercises: [{exerciseId: sq.id, name: '스쿼트', sets: [{weight: 40, reps: 10}, {weight: 80, reps: 8}, {weight: 80, reps: 8}]}]}]};
  const s = {...st, sets: [], weight: 0, reps: 10, unit: 'kg'};
  const n = defaultNext(s, {lastSession, fillMode: 'warm', db});
  assert.equal(n.weight, 40); assert.equal(n.kind, 'warm');
  assert.deepEqual(sideOptions(null), []);
  assert.deepEqual(sideOptions({id: 'gm:leg-press-45', baseId: 'gm:leg-press-45', load: 'plate'}), ['both', 'single']);
  assert.equal(clock(95), '1:35');
});
test('세트에 웜업·방식·쉰 시간이 저장된다', () => {
  const w = cleanWorkout({date: '2026-11-24', exercises: [{name: '스쿼트', sets: [{weight: 40, reps: 10, type: '웜업'}, {weight: 80, reps: 8, side: 'single', restSec: 95}]}]});
  const [a, b] = w.exercises[0].sets;
  assert.equal(a.type, '웜업'); assert.equal(b.side, 'single'); assert.equal(b.restSec, 95); assert.equal(a.restSec, undefined);
});

test('입력 방식: 오늘은 실시간, 지난 날짜는 소급이 기본, 고르면 그대로', async () => {
  const {isLive, planTopHTML} = await import('../quick-entry.js');
  const d = new Date(), today = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  assert.equal(isLive({date: today}), true); assert.equal(isLive({date: '2020-01-01'}), false);
  assert.equal(isLive({date: today, live: false}), false); assert.equal(isLive({date: '2020-01-01', live: true}), true);
  const h = planTopHTML({workouts: [], settings: {}}, {date: today, sets: [], targets: [], title: ''}, []);
  assert.match(h, /실시간 입력/); assert.match(h, /입력 방식 바꾸기/);
});

test('한쪽씩 세트 볼륨: 양쪽을 했다고 보고 2배, 이미 한쪽 기준 종목은 두 번 곱하지 않음', async () => {
  const {workoutTotals} = await import('../domain.js');
  const one = workoutTotals(cleanWorkout({date: '2026-11-24', exercises: [{name: '레그 익스텐션', sets: [{weight: 30, reps: 10, side: 'single'}, {weight: 50, reps: 10}]}]}));
  assert.equal(one.volume, 30 * 10 * 2 + 50 * 10); assert.equal(one.reps, 30);
  const bss = workoutTotals(cleanWorkout({date: '2026-11-24', exercises: [{name: '불가리안 스플릿 스쿼트', repBasis: 'per-side', sets: [{weight: 20, reps: 8, side: 'single'}]}]}));
  assert.equal(bss.reps, 16);
});
