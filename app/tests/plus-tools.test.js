import test from 'node:test';
import assert from 'node:assert/strict';
import {simulate, simulatorHTML, SITUATIONS, situationHTML, betterChoices, betterChoicesHTML} from '../plus-tools.js';

// 4.17.0 플러스 도구: 시뮬레이터 범위·안전 안내, 상황 플랜(무료는 다음 날만), 더 나은 선택
const body = [...Array(40)].map((_, i) => { const d = new Date(Date.parse('2026-10-15T12:00:00') + i * 86400000); return {date: d.toISOString().slice(0, 10), weight: Math.round((80 - i * 0.04) * 10) / 10}; });
test('시뮬레이터: 지금 흐름 + 바꾼 것, 범위와 경고', () => {
  const db = {body, meals: [], workouts: []}, today = '2026-11-23';
  const a = simulate(db, today, {}), b = simulate(db, today, {kcal: -500, workouts: 3});
  assert.ok(a.hasTrend && a.low < a.mid && a.mid < a.high);
  assert.ok(b.perWeek < a.perWeek); assert.match(b.warn, /1%/);
  assert.equal(simulate({body: []}, today, {}), null);
  assert.match(simulatorHTML({kcal: 0, workouts: 0, weeks: 12}, a), /12주 뒤 단순 계산: 대략/);
});
test('상황 플랜: 8가지, 무료는 다음 날 안심 안내만', () => {
  assert.equal(SITUATIONS.length, 8);
  const full = situationHTML({sit: 'dinner'}), free = situationHTML({sit: 'dinner'}, {full: false, lock: '<p>잠금</p>'});
  assert.match(full, /전날/); assert.match(full, /당일/); assert.doesNotMatch(free, /<b>전날<\/b>/); assert.match(free, /다음 날/); assert.match(free, /잠금/);
});
test('더 나은 선택: 같은 계열에서 덜 먹거나 단백질 더', () => {
  const foods = [{name: '닭가슴살 샐러드', calories: 350, protein: 35, servingQty: 1, servingUnit: '그릇'}, {name: '시저 치킨 샐러드', calories: 420, protein: 30, servingQty: 1, servingUnit: '그릇'}, {name: '치킨 너겟', calories: 950, protein: 30, servingQty: 1, servingUnit: '인분'}];
  const search = q => q === '치킨' ? foods : [];
  const r = betterChoices([{date: '2026-11-23', name: '후라이드 치킨', calories: 900, protein: 50, servingUnit: '인분'}], '2026-11-23', search);
  assert.equal(r.from.name, '후라이드 치킨'); assert.ok(r.list.length >= 1); assert.ok(r.list.every(x => x.kcal < 900));
  assert.match(betterChoicesHTML(r, {limit: 1, lock: '<p>잠금</p>'}), /다음에 골라 볼 만한 것/);
  assert.equal(betterChoices([{date: '2026-11-23', name: '사과', calories: 95}], '2026-11-23', search), null);
});
