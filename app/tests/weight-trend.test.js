import test from 'node:test';
import assert from 'node:assert/strict';
import {weightTrend, paceText, weightSpark} from '../body-series.js';

// 2026-11-27 대표님 A+B안: 추세 체중(최근 7일 평균)·주당 페이스
const day = n => { const d = new Date('2026-11-01T12:00:00'); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10); };
test('추세 체중과 주당 페이스', () => {
  const body = Array.from({length: 28}, (_, i) => ({date: day(i), weight: 80 - i * 0.1 + (i % 2 ? 0.3 : -0.3), measure: 'scale'}));
  const t = weightTrend({body}, day(27));
  assert.equal(t.nowDate, day(27));
  assert.ok(Math.abs(t.trend - (80 - 24 * 0.1)) < 0.2, String(t.trend)); // 7일 평균 ≈ 가운데 날 값
  assert.equal(t.pace, -0.7); // 하루 0.1kg → 주 0.7kg
  assert.equal(paceText(t.pace), '−0.7kg');
  assert.equal(paceText(0), '±0.0kg');
  assert.equal(paceText(null), '—');
  assert.match(weightSpark({body}, day(27), 30, {trend: true}), /spark-raw/);
});
test('기록이 적거나 오래되면', () => {
  assert.equal(weightTrend({body: []}, day(0)), null);
  assert.equal(weightTrend({body: [{date: day(0), weight: 70}, {date: day(2), weight: 69.8}]}, day(2)).pace, null); // 7일 안 됨
  assert.equal(weightTrend({body: [{date: day(0), weight: 70}]}, day(20)).stale, true);
});
