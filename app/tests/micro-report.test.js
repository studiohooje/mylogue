import test from 'node:test';
import assert from 'node:assert/strict';
import {microReport, microReportHTML, microTodayLine} from '../micro-report.js';

// 4.17.0 영양 심화 리포트: 참고선 비교, 값 없는 음식은 0으로 세지 않음, 많이 준 음식
const meal = (date, name, kcal, x = {}) => ({date, name, calories: kcal, ...x});
const db = {settings: {nutritionProfile: {sex: 'female'}}, meals: [
  meal('2026-11-22', '라면', 500, {sodium: 1800, sugar: 4, satFat: 8, fiber: 2}),
  meal('2026-11-22', '김치찌개', 300, {sodium: 1400, sugar: 3, satFat: 3, fiber: 3}),
  meal('2026-11-23', '샐러드', 300, {sodium: 300, sugar: 6, satFat: 1, fiber: 6}),
  meal('2026-11-23', '프랜차이즈 버거', 600, {sodium: 1100, sugar: 9, satFat: 9}),
  meal('2026-11-23', '계획', 999, {planned: true, sodium: 9999}),
]};
test('하루 평균·참고선·많이 준 음식', () => {
  const r = microReport(db, '2026-11-23');
  assert.equal(r.days, 2); assert.equal(r.items.sodium.perDay, 2300); assert.equal(r.items.sodium.status, 'near');
  assert.equal(r.items.sodium.top[0].name, '라면');
  assert.equal(r.items.fiber.ref, 20); assert.equal(r.items.fiber.perDay, 5.5); assert.equal(r.items.fiber.status, 'low');
  assert.equal(r.items.fiber.coverage, Math.round(1100 / 1700 * 100)); // 버거는 식이섬유 값 없음
});
test('값이 적으면 판단 안 함, 화면 표기', () => {
  const r = microReport({meals: [meal('2026-11-23', '버거', 600, {sodium: 1000})]}, '2026-11-23');
  assert.equal(r.items.fiber.status, 'unknown');
  const h = microReportHTML(r); assert.match(h, /값 없음/); assert.match(h, /하루 1,000mg/);
  assert.equal(microReport({meals: []}, '2026-11-23'), null);
  assert.match(microTodayLine(db, '2026-11-23'), /나트륨 1,400mg · 당류 15g/);
  assert.match(microReportHTML(null, {locked: '<p>잠금</p>', today: '오늘 줄'}), /오늘 줄.*잠금/s);
});
