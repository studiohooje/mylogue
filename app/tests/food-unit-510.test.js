// 5.1.0 음식 단위 검수: g 음식을 개수로도(삶은 달걀 1개 ≈ 50g), 요리는 개수로 보지 않음, 이상한 단위 표기 정리
import test from 'node:test';
import assert from 'node:assert/strict';
import {countUnitFor} from '../portion-dict.js';
import {FOOD_CATALOG} from '../food-catalog.js';
import {countRow} from '../quick-entry.js';
import {rowToFood} from '../food-db.js';
test('개수로 먹는 음식은 1개 무게가 나오고, 요리·가공품은 개수로 보지 않는다', () => {
  assert.deepEqual([countUnitFor('삶은 달걀').unit, countUnitFor('삶은 달걀').grams], ['개', 50]);
  assert.equal(countUnitFor('달걀(삶은것)').grams, 50);
  assert.equal(countUnitFor('밤고구마(삶은것)').grams, 150);
  assert.equal(countUnitFor('귤(온주밀감, 생것)').grams, 80);
  assert.equal(countUnitFor('핫도그(감자)').grams, 60);
  for (const n of ['달걀찜(채소)', '달걀말이', '계란프라이', '사과파이', '고구마맛탕', '감자탕', '소시지볶음']) assert.equal(countUnitFor(n), null, n);
});
test('기본 음식 목록: 삶은 달걀·식빵·바나나 등은 1개 무게가 있고 개수가 기본', () => {
  const egg = FOOD_CATALOG.find(f => f.name === '삶은 달걀');
  assert.deepEqual(egg.countUnit, {unit: '개', grams: 50, default: true});
  assert.equal(FOOD_CATALOG.find(f => f.name === '식빵').countUnit.unit, '장');
  assert.ok(FOOD_CATALOG.filter(f => f.countUnit).length >= 29);
});
test('개수로 담으면 1개 무게로 영양값을 바꾸고 "2개"로 저장한다', () => {
  const egg = FOOD_CATALOG.find(f => f.name === '삶은 달걀');
  const r = countRow(egg, 2, egg.countUnit);
  assert.equal(r.servingUnit, '개'); assert.equal(r.servingQty, 2); assert.equal(r.unitGrams, 50);
  assert.equal(r.calories, Math.round(155 * 0.5 * 10) / 10);
});
test('원본의 이상한 단위 표기를 읽는 단위로', () => {
  assert.equal(rowToFood(['고르곤졸라(1인용)', '7번가피자', '1인용', 186, 500, 1, 1, 1, 'b', '', 0]).servingUnit, '인분');
  const tea = rowToFood(['밀크티', '공차', 'G', 946, 300, 1, 1, 1, 'b', '', 0]); assert.equal(tea.servingUnit, '잔'); assert.equal(tea.servingQty, 1); assert.equal(tea.unitGrams, 946);
});
