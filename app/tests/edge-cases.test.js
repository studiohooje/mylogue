import test from 'node:test';
import assert from 'node:assert/strict';
import {runBig} from '../tools/coach-cases-big.mjs';
import {buildPhase} from '../phase.js';
import {cleanBody} from '../domain.js';
// 4.28.0 밤샘 D-1·D-2·D-3: 코칭 정답지 확대(작게)와 경계값 묶음. 전체 6,000건은 node tools/coach-cases-big.mjs
test('코칭 정답지 무작위 사람 60명 × 상황 12 = 720건(흔들림 포함): 어긋남 0', () => {
 const r = runBig({people: 60, seed: 8});
 assert.equal(r.cases, 720);
 assert.deepEqual(r.byKey, {});
});
const T = '2026-11-24';
test('감량 속도 경계: 체중 40~150kg 모두 주 1.5%는 허용, 1.5%+0.02kg은 거부', () => {
 let n = 0;
 for (let w = 40; w <= 150; w += 5) for (const weeks of [4, 8, 12]) {
  const ok = Math.floor(w * 0.015 * weeks * 100) / 100, over = Math.round((w * 0.015 + 0.02) * weeks * 100) / 100;
  assert.ok(buildPhase({type: 'diet', weeks, answers: {loseKg: ok}, now: {weight: w}, startAvg: w}, T, {heightCm: 120}), `${w}kg ${weeks}주 ${ok}`);
  assert.throws(() => buildPhase({type: 'diet', weeks, answers: {loseKg: over}, now: {weight: w}, startAvg: w}, T, {heightCm: 120}), /1\.5%/, `${w}kg ${weeks}주 ${over}`);
  n += 2;
 }
 assert.ok(n >= 130);
});
test('증량 속도 경계: 주 1%는 허용, 넘으면 거부', () => {
 for (let w = 40; w <= 120; w += 10) {
  assert.ok(buildPhase({type: 'leanbulk', weeks: 10, answers: {gainKg: Math.floor(w * 0.01 * 10 * 10) / 10}, now: {weight: w}, startAvg: w}, T));
  assert.throws(() => buildPhase({type: 'bulk', weeks: 10, answers: {gainKg: Math.round((w * 0.01 + 0.05) * 10 * 10) / 10}, now: {weight: w}, startAvg: w}, T), /체중의 1%/);
 }
});
test('저체중 경계: 키 150~195cm 모두 BMI 18.5 바로 위는 허용, 아래는 거부', () => {
 for (let h = 150; h <= 195; h += 5) {
  const m = h / 100, start = Math.ceil(18.5 * m * m) + 12, okTarget = Math.ceil(18.5 * m * m * 10 + 1) / 10, badTarget = Math.floor(18.4 * m * m * 10) / 10;
  const mk = target => ({type: 'diet', weeks: 52, answers: {loseKg: Math.round((start - target) * 10) / 10}, now: {weight: start}, startAvg: start});
  assert.ok(buildPhase(mk(okTarget), T, {heightCm: h}), `${h}cm ok`);
  assert.throws(() => buildPhase(mk(badTarget), T, {heightCm: h}), /BMI 18\.5/, `${h}cm bad`);
 }
});
test('체중 입력 경계와 흔한 오타(70.5→705, lb를 kg 칸에)', () => {
 for (const w of [20, 20.1, 399.9, 400]) assert.equal(cleanBody({date: T, weight: w}).weight, w);
 for (const w of [19.9, 400.1, 705, 0, -1]) assert.throws(() => cleanBody({date: T, weight: w}), /20~400|음수/);
});
