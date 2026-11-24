// 4.18.1 운동 기록: 헬스장 맨 위, 이 헬스장에서 자주 한 종목 먼저(숫자 없이), 지난 운동은 접고 펼치기·직접 적은 종목도 모두
import test from 'node:test';
import assert from 'node:assert/strict';
import {againHTML, exerciseFreq, exKeyOf, quickWorkoutHTML, emptyQuickWorkout} from '../quick-entry.js';
import {EXERCISE_CATALOG} from '../catalog.js';

const w = (date, gymName, names) => ({id: `w${date}${gymName}`, date, gymName, title: '하체 어깨', exercises: names.map(n => ({name: n, exerciseId: EXERCISE_CATALOG.find(x => x.name === n)?.id || null, kind: 'strength', sets: [{weight: 40, reps: 10}]}))});

test('지난 운동처럼 하기: 도감 번호 없이 적은 종목까지 모두, 기본은 접힘', () => {
  const db = {workouts: [w('2026-11-24', 'A', ['레그 프레스', '아웃타이 (힙 어브덕션)', '이너타이 (힙 어덕션)', '핵프레스 (양발)', '나만의 어깨 운동'])], customExercises: []};
  const closed = againHTML(db, {date: '2026-11-24'});
  assert.match(closed, /5종목/); assert.doesNotMatch(closed, /data-q-ex=/);
  const open = againHTML(db, {date: '2026-11-24', againOpen: true});
  assert.equal((open.match(/data-q-ex=/g) || []).length, 5);
  assert.match(open, /이대로 5종목 시작/);
  assert.equal(exKeyOf({name: '아웃타이 (힙 어브덕션)'}), 'exercise:힙 어브덕션');
});

test('이 헬스장에서 자주 한 종목이 먼저, 횟수 숫자는 보이지 않음', () => {
  const db = {settings: {gyms: ['A', 'B'], workoutTitles: []}, machines: [], workouts: [
    w('2026-11-01', 'A', ['핵 스쿼트']), w('2026-11-03', 'A', ['핵 스쿼트']), w('2026-11-05', 'B', ['레그 익스텐션']), w('2026-11-06', 'B', ['레그 익스텐션']), w('2026-11-07', 'B', ['레그 익스텐션']),
  ]};
  const f = exerciseFreq(db, 'A');
  assert.equal(f.get('exercise:핵 스쿼트').gym, 2); assert.equal(f.get('exercise:레그 익스텐션').gym, 0);
  const s = {...emptyQuickWorkout('2026-11-24', ['A', 'B']), gymName: 'A', cat: '웨이트', part: '하체'};
  const html = quickWorkoutHTML(db, s, EXERCISE_CATALOG, {}, {});
  const first = html.match(/class="quick-choice[^"]*" data-q-ex="([^"]+)"/)[1];
  assert.equal(first, 'exercise:핵 스쿼트');
  const htmlB = quickWorkoutHTML(db, {...s, gymName: 'B'}, EXERCISE_CATALOG, {}, {});
  assert.equal(htmlB.match(/class="quick-choice[^"]*" data-q-ex="([^"]+)"/)[1], 'exercise:레그 익스텐션');
  // 헬스장 고르기가 맨 위
  assert.ok(html.indexOf('q-gym-top') < html.indexOf('quick-choices'));
});
