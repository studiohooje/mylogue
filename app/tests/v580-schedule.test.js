// 5.8.0 일정 1단계: 일정 데이터·반복·생리 주기(여성만)·계획·계획대로 했는지·요일 계획 제안
import test from 'node:test';
import assert from 'node:assert/strict';
import {cleanEvent, eventsOn, planFor, planDone, suggestWeekPlan, kindsFor, upcoming} from '../schedule-plan.js';
import {cleanWorkout} from '../domain.js';

const ex = (name, part, n) => ({name, part, sets: Array.from({length: n}, () => ({weight: 50, reps: 10, completed: true}))});
test('일정 정리: 종류 기본 이름·색, 식사 약속 술, 날짜 없으면 거절', () => {
  const e = cleanEvent({kind: 'meal', date: '2026-11-28', alcohol: true});
  assert.equal(e.title, '식사 약속'); assert.equal(e.alcohol, true); assert.equal(e.slot, '저녁'); assert.equal(e.color, '#8fc9f2');
  assert.throws(() => cleanEvent({kind: 'meal'}), /날짜/);
  assert.equal(cleanEvent({kind: '이상한', date: '2026-11-28'}).kind, 'etc');
});
test('매주 반복·생리 주기는 여성 설정일 때만(남성은 종류 목록에서도 안 보임)', () => {
  const med = cleanEvent({kind: 'med', date: '2026-11-02', repeat: 'week', title: 'GLP-1 주사'});
  const per = cleanEvent({kind: 'period', date: '2026-11-03'});
  const male = {settings: {nutritionProfile: {sex: 'male'}, schedule: {events: [med, per]}}};
  const female = {settings: {nutritionProfile: {sex: 'female'}, schedule: {events: [med, per]}}};
  assert.ok(eventsOn(male, '2026-11-16').some(e => e.title === 'GLP-1 주사'), '2주 뒤 같은 요일');
  assert.ok(!eventsOn(male, '2026-11-17').some(e => e.kind === 'med'));
  assert.ok(!eventsOn(male, '2026-11-04').some(e => e.kind === 'period'));
  assert.ok(!kindsFor(male).some(k => k.k === 'period')); assert.ok(kindsFor(female).some(k => k.k === 'period'));
  assert.equal(eventsOn(female, '2026-11-05').find(e => e.kind === 'period').day, 3);
  assert.ok(eventsOn(female, '2026-12-02').find(e => e.kind === 'period')?.predicted, '28일 뒤 예상');
});
test('계획: 예정 운동 > 운동 계획 일정 > 요일 계획, 센터 휴관 표시, 계획 부위를 하면 한 것', () => {
  const db = {workouts: [], settings: {schedule: {weekPlan: {6: {title: '하체·어깨', parts: ['하체', '어깨']}}, events: []}}};
  assert.deepEqual(planFor(db, '2026-11-28').parts, ['하체', '어깨']);
  db.settings.schedule.events = [cleanEvent({kind: 'closed', date: '2026-11-28'})];
  assert.equal(planFor(db, '2026-11-28').closed, true);
  db.workouts = [cleanWorkout({id: 'a', date: '2026-11-28', exercises: [ex('러닝머신', '유산소', 1)]})];
  assert.equal(planDone(db, '2026-11-28'), false, '아침 유산소만으론 하체 계획은 안 한 것');
  db.workouts.push(cleanWorkout({id: 'b', date: '2026-11-28', exercises: [ex('스쿼트', '하체', 4)]}));
  assert.equal(planDone(db, '2026-11-28'), true);
});
test('요일 계획 제안: 지난 4주에 두 번 넘게 같은 요일에 한 것', () => {
  const ws = ['2026-11-02', '2026-11-09', '2026-11-16', '2026-11-23'].map((d, i) => cleanWorkout({id: 'w' + i, date: d, title: '등·이두', exercises: [ex('랫풀다운', '등', 3)]}));
  const plan = suggestWeekPlan({workouts: ws}, '2026-11-27');
  assert.equal(plan[1].title, '등·이두'); assert.deepEqual(plan[1].parts, ['등', '이두']);
});
test('다가오는 일: 술 약속, 인바디 2주 뒤', () => {
  const db = {workouts: [], body: [{date: '2026-11-27', measure: 'inbody', weight: 80}], settings: {schedule: {events: [cleanEvent({kind: 'meal', date: '2026-11-28', alcohol: true, title: '저녁 약속'})]}}};
  const u = upcoming(db, '2026-11-27');
  assert.ok(u.some(x => x.title === '저녁 약속 · 술 마셔요')); assert.ok(u.some(x => x.title === '인바디 다시 재기' && x.date === '2026-12-11'));
});
