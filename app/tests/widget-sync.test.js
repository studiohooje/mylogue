import test from 'node:test';
import assert from 'node:assert/strict';
import {widgetSummary, syncWidget} from '../widget-sync.js';
test('위젯 한 줄: 식사·운동·체중, 점수 없이', () => {
  const db = {settings: {calorieGoal: 2100}, meals: [{date: '2026-11-24', calories: 640}, {date: '2026-11-24', calories: 600}, {date: '2026-11-24', calories: 900, planned: true}], workouts: [{date: '2026-11-24', exercises: [{name: '스쿼트'}, {name: '런지'}]}], body: [{date: '2026-11-22', weight: 71.24}]};
  const s = widgetSummary(db, '2026-11-24');
  assert.equal(s.title, '11월 24일 · 마이로그'); assert.equal(s.line, '식사 1,240 / 2,100kcal · 운동 2종목 했어요 · 체중 71.2kg(11/22)');
  assert.equal(widgetSummary({meals: [], workouts: [{date: '2026-11-24', rest: true}], body: []}, '2026-11-24').line, '아직 식사 기록 전 · 오늘은 쉬는 날');
  assert.doesNotMatch(s.line, /점|등급/);
});
test('웹에서는 보내지 않는다', () => { assert.equal(syncWidget({meals: []}, '2026-11-24'), false); });
