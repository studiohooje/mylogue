import test from 'node:test';
import assert from 'node:assert/strict';
import {EXPERIMENTS, startExperiment, stopExperiment, finishExperiment, experimentStatus, experimentsHTML} from '../experiment.js';

// 4.17.0 2주 실험: 시작 제한(무료 1개), 전후 비교, 결과·다음 실험
const day = i => { const d = new Date(Date.parse('2026-10-26T12:00:00') + i * 86400000); return d.toISOString().slice(0, 10); };
function db() {
  const meals = [];
  for (let i = 0; i < 28; i++) { const p = i < 14 ? 15 : 35; for (const h of [8, 12, 19]) meals.push({date: day(i), name: '식사', calories: 600, protein: p, loggedAt: new Date(`${day(i)}T${String(h).padStart(2, '0')}:00:00`).toISOString()}); }
  return {settings: {}, meals, body: [], workouts: [], checkins: {}};
}
test('시작 제한과 중복', () => {
  let s = startExperiment({}, 'protein', day(14), {limit: 1});
  assert.equal(s.experiments.length, 1);
  assert.throws(() => startExperiment(s, 'early', day(14), {limit: 1}), /하나씩/);
  assert.throws(() => startExperiment(s, 'protein', day(14), {limit: 3}), /이미/);
  s = startExperiment(s, 'early', day(14), {limit: 3}); assert.equal(s.experiments.length, 2);
  assert.equal(stopExperiment(s, 'early', day(15)).experiments[1].status, 'stopped');
  assert.equal(finishExperiment(s, 'protein', day(28)).experiments[0].status, 'done');
  assert.throws(() => startExperiment({}, 'nope', day(1)), /없는 실험/);
});
test('전후 비교: 단백질이 늘면 좋아졌어요, 2주 뒤 결과와 다음 실험', () => {
  const d = db(); d.settings = startExperiment({}, 'protein', day(14), {limit: 3});
  const s = experimentStatus(d, d.settings.experiments[0], day(28));
  assert.equal(s.done, true); const p = s.metrics.find(m => m.key === 'protein');
  assert.equal(p.before, 45); assert.equal(p.after, 105);
  const h = experimentsHTML(d, day(28), {limit: 3});
  assert.match(h, /좋아졌어요/); assert.match(h, /data-exp-finish="protein"/); assert.match(h, /다음: /);
  assert.equal(EXPERIMENTS.length, 6);
});
