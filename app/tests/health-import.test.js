import test from 'node:test';
import assert from 'node:assert/strict';
import {healthCandidates, healthRecords, healthPreviewHTML, healthSettingsHTML} from '../health-import.js';
const data = {steps: [{date: '2026-11-22', steps: 8432}, {date: '2026-11-23', steps: 600}, {date: '2026-11-24', steps: 5000}], weights: [{date: '2026-11-23', time: '2026-11-23T07:10:00Z', weight: 71.24}, {date: '2026-11-24', time: '2026-11-24T07:00:00Z', weight: 70.9}]};
test('후보: 1000보 미만 제외, 같은 체중은 이미 있음, 전에 가져온 걸음이 늘면 갱신', () => {
  const db = {workouts: [{id: 'w1', date: '2026-11-24', source: 'health', exercises: [{name: '걷기', note: '걸음 3,000보 · 어림'}]}], body: [{date: '2026-11-23', weight: 71.2}]};
  const c = healthCandidates(data, db, '2026-11-24');
  assert.deepEqual(c.steps.map(s => [s.date, s.state]), [['2026-11-22', 'new'], ['2026-11-24', 'more']]);
  assert.equal(c.steps[0].km, 6.3); assert.equal(c.steps[0].min, 84); assert.equal(c.steps[1].oldSteps, 3000);
  assert.deepEqual(c.weights.map(w => [w.weight, w.state]), [[71.2, 'same'], [70.9, 'new']]);
  assert.equal(c.fresh.length, 3);
  const r = healthRecords(c.fresh, db);
  assert.deepEqual(r.replace, ['w1']); assert.equal(r.workouts.length, 2); assert.equal(r.workouts[0].exercises[0].kind, 'cardio'); assert.match(r.workouts[0].exercises[0].note, /8,432보/);
  assert.equal(r.body[0].source, 'health'); assert.equal(r.body[0].measure, 'scale');
});
test('미리보기: 기본은 확정 후 추가, 자동 더하기는 꺼짐', () => {
  const html = healthPreviewHTML(healthCandidates(data, {}, '2026-11-24'));
  assert.match(html, /고른 것 기록에 더하기/); assert.doesNotMatch(html, /name="hc-auto" checked/);
  assert.match(healthSettingsHTML({native: false}), /안드로이드 앱에서/);
  assert.match(healthSettingsHTML({native: true, status: 'available', granted: {steps: false, weight: false}}), /hc-connect/);
  assert.match(healthSettingsHTML({native: true, status: 'available', granted: {steps: true, weight: true}}), /hc-read/);
});
