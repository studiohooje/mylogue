// 5.1.0 다른 곳 기록 가져오기: 서식 CSV·AI 답(코드 블록 여러 개)·기준 운동 맞추기·겹침·되돌리기
import test from 'node:test';
import assert from 'node:assert/strict';
import {rawRecordsFromText,rawRecordsFromCSV,buildImport,applyImport,undoImport,conflictsOf,TEMPLATES,backfillPrompt} from '../data-import.js';
test('서식 CSV 세 가지가 그대로 읽힌다(운동은 세트수만큼 펼침)', () => {
  const w = rawRecordsFromCSV(TEMPLATES['운동']);
  assert.equal(w.length, 2);
  assert.equal(w[0].exercises.find(e => e.name === '벤치프레스').sets.length, 3);
  assert.equal(rawRecordsFromCSV(TEMPLATES['체중']).length, 2);
  assert.equal(rawRecordsFromCSV(TEMPLATES['식사']).length, 2);
});
test('AI 답은 코드 블록이 여러 개여도, 20개가 넘어도 모두 읽는다', () => {
  const recs = Array.from({length: 45}, (_, i) => ({type: 'body', date: `2025-12-${String(1 + (i % 28)).padStart(2, '0')}`, weight: 80 + i / 10}));
  const text = '앞말\n```json\n' + JSON.stringify({mylogue: 1, records: recs.slice(0, 30)}) + '\n```\n중간\n```json\n' + JSON.stringify({mylogue: 1, records: recs.slice(30)}) + '\n```';
  assert.equal(rawRecordsFromText(text).length, 45);
  assert.equal(buildImport(rawRecordsFromText(text)).items.length, 45);
});
test('기준 운동과 맞지 않는 종목은 넣지 않고 목록으로 알린다(옛 이름은 기준 운동으로)', () => {
  const p = buildImport([{type: 'workout', date: '2025-12-05', exercises: [{name: '이상한운동', sets: [{weight: 1, reps: 1}]}, {name: '스탠딩 래터럴 레이즈', sets: [{weight: 30, unit: 'kg', reps: 12}]}]}]);
  assert.deepEqual(p.unmatched, [{date: '2025-12-05', name: '이상한운동'}]);
  assert.match(p.items[0].summary, /사이드 레터럴 레이즈 머신/);
});
test('겹치는 날짜는 기본 건너뛰기, 덮어쓰기·둘 다 고를 수 있고, 한 묶음 통째로 되돌린다', () => {
  const p = buildImport(rawRecordsFromCSV(TEMPLATES['운동']).concat(rawRecordsFromCSV(TEMPLATES['식사'])));
  const db = {meals: [{id: 'm0', date: '2025-12-01', slot: '저녁'}], workouts: [{id: 'w0', date: '2025-12-01', exercises: []}], body: [], settings: {}};
  const wi = p.items.findIndex(it => it.kind === 'workout' && it.date === '2025-12-01');
  assert.equal(conflictsOf(db, p.items[wi]).length, 1);
  const skip = applyImport(db, p, {});
  assert.equal(skip.db.workouts.some(w => w.id === 'w0'), true);
  assert.equal(skip.db.meals.length, 3);
  const rep = applyImport(db, p, {[wi]: 'replace'});
  assert.equal(rep.db.workouts.some(w => w.id === 'w0'), false);
  assert.ok(rep.db.workouts.every(w => w.importBatch));
  const back = undoImport(rep.db, rep.batch, rep.removed);
  assert.deepEqual(back.workouts.map(w => w.id), ['w0']);
  assert.equal(back.meals.length, 1);
});
test('과거 기록 정리용 지시문에는 날짜별·소급 규칙이 들어 있다', () => {
  assert.match(backfillPrompt(), /날짜별로 나눠/);
  assert.match(backfillPrompt(), /지난 날짜 기록\(소급\)/);
});
