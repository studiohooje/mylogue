import test from 'node:test';
import assert from 'node:assert/strict';
import {
  normalizeText, displayName, chosung, noSpace, aliasesFor, num, kcalCheck, unitErrorFlags,
  parseAmount, parseProcessedRef, unitsForProcessed, unitsForDish, ruleUnits, categorizeDish,
  categorizeProcessed, dedupe, readNutrients, parseCsvLine,
} from '../tools/food-build.mjs';

test('이름 정규화: 공백·괄호·전각·깨진 앞머리', () => {
  assert.equal(normalizeText('  김치　찌개  （햄）  '), '김치 찌개 (햄)');
  assert.equal(normalizeText('？스타곰탕 냉면'), '스타곰탕 냉면');
  assert.equal(normalizeText('﻿우리밀 【한입】'), '우리밀 [한입]');
  assert.equal(displayName('김치찌개_햄'), '김치찌개(햄)');
  assert.equal(displayName('피자_흑마늘불고기피자'), '흑마늘불고기피자');
  assert.equal(displayName('비빔밥_참치_양념장'), '비빔밥(참치, 양념장)');
});

test('초성·띄어쓰기 제거·별칭', () => {
  assert.equal(chosung('김치찌개'), 'ㄱㅊㅉㄱ');
  assert.equal(noSpace('제육 볶음 (매운맛)'), '제육볶음매운맛');
  const a = aliasesFor('제육볶음');
  assert.ok(a.includes('돼지불고기'));
  assert.ok(!aliasesFor('얼그레이 밀크티 라떼').includes('카페라떼'), '차 라떼에 커피 별칭을 붙이지 않음');
  assert.ok(!aliasesFor('계란프라이').includes('감자튀김'));
});

test('빈 값은 null, 0은 0', () => {
  assert.equal(num(''), null);
  assert.equal(num('해당없음'), null);
  assert.equal(num('0.00'), 0);
  const n = readNutrients({ '에너지(kcal)': '100', '탄수화물(g)': '', '단백질(g)': '0' });
  assert.equal(n.kcal, 100);
  assert.equal(n.carbs, null);
  assert.equal(n.protein, 0);
  assert.equal(n.sodium, null);
});

test('kcal 일관성 검사 20% 기준', () => {
  assert.equal(kcalCheck({ kcal: 100, carbs: 10, protein: 5, fat: 4 }).flag, false); // 96
  assert.equal(kcalCheck({ kcal: 100, carbs: 30, protein: 10, fat: 5 }).flag, true); // 205
  assert.equal(kcalCheck({ kcal: 100, carbs: null, protein: 1, fat: 1 }).checked, false);
  assert.ok(unitErrorFlags({ kcal: 950, carbs: 0, protein: 0, fat: 100 }, 'g').includes('kcal_100당_900초과'));
  assert.ok(unitErrorFlags({ kcal: 300, carbs: 10, sugar: 20, protein: 0, fat: 0 }, 'g').includes('당류>탄수화물'));
});

test('CSV 따옴표 처리', () => {
  assert.deepEqual(parseCsvLine('a,"b,c","""d"""'), ['a', 'b,c', '"d"']);
});

test('양 해석과 1회 섭취참고량 칸 해석', () => {
  assert.deepEqual(parseAmount('291.90ml'), { qty: 291.9, unit: 'ml' });
  assert.equal(parseAmount('1식'), null);
  assert.equal(parseProcessedRef('30g', 'g').refs[0].qty, 30);
  assert.equal(parseProcessedRef('30g', 'ml').refs.length, 0);
  assert.equal(parseProcessedRef('250ml(g)', 'g').refs[0].qty, 250);
  const noodle = '생·숙면 200g, 건면 100g, 당면 30g, 유탕면(봉지)120g, 유탕면(용기)80g';
  assert.equal(parseProcessedRef(noodle, 'g', { lv6: '건면', name: '소면' }).refs[0].qty, 100);
  assert.equal(parseProcessedRef(noodle, 'g', { lv6: '유탕면', name: '신라면' }).refs.length, 2);
  assert.equal(parseProcessedRef('드레싱 15g, 덮밥소스 165g', 'g', { name: '굴소스' }).refs.length, 0);
});

test('가공식품 단위: 포장·참고량·g, 기본 단위 하나', () => {
  const r = unitsForProcessed({ basis: 'g' }, '30g', '45g', { name: '과자' });
  assert.equal(r.units.filter((u) => u.default).length, 1);
  assert.equal(r.units.find((u) => u.default).label, '1포장');
  assert.equal(r.units.at(-1).label, 'g');
  const big = unitsForProcessed({ basis: 'g' }, '40g', '500g', { name: '배추김치' });
  assert.equal(big.units.find((u) => u.default).label, '1회 섭취참고량');
});

test('음식 단위: 기준(g/ml)이 다르면 규칙 단위를 붙이지 않음', () => {
  assert.equal(ruleUnits('rice_plain', 'ml').length, 0);
  assert.equal(ruleUnits('rice_plain', 'g')[0].g, 210);
  const rec = { basis: 'ml', category: '찌개', rule: 'stew', origin: '가정식(분석 함량)' };
  const u = unitsForDish(rec, '201.70ml').units;
  assert.equal(u[0].label, '1인분');
  assert.equal(u[0].ml, 201.7);
  assert.ok(u.some((x) => x.label === '1인분(참고량)' && x.ml === 200));
  assert.equal(u.filter((x) => x.default).length, 1);
});

test('범주 배정', () => {
  assert.equal(categorizeDish({ lv3: '밥류', lv4: '쌀밥' }, '쌀밥').rule, 'rice_plain');
  assert.equal(categorizeDish({ lv3: '밥류', lv4: '김밥' }, '김밥').rule, null);
  assert.equal(categorizeDish({ lv3: '찌개 및 전골류', lv4: '김치찌개' }, '김치찌개').category, '찌개');
  assert.equal(categorizeDish({ lv3: '음료 및 차류', lv4: '라떼', lv5: '카페라떼' }, '카페라떼').category, '커피');
  assert.equal(categorizeProcessed({ lv3: '면류', lv4: '라면' }, '신라면'), '면');
  assert.equal(categorizeProcessed({ lv3: '특수영양식품', lv4: '체중조절용 조제식품' }, '쉐이크'), '보충제');
});

test('중복 제거와 OEM 표시', () => {
  const base = { per100: { kcal: 100, carbs: 1, sugar: null, fiber: null, protein: 1, fat: 1, satFat: null, transFat: null, cholesterol: null, sodium: 10 }, basis: 'g', foodSize: '100g' };
  const recs = [
    { ...base, id: 'a', name: '참치캔', maker: 'A' },
    { ...base, id: 'b', name: '참치캔', maker: 'A' },
    { ...base, id: 'c', name: '참치캔', maker: 'B' },
  ];
  const d = dedupe(recs);
  assert.equal(d.kept.length, 2);
  assert.deepEqual(d.kept[0].dupIds, ['b']);
  assert.equal(d.oemGroups, 1);
  assert.ok(d.kept[1].note.includes('OEM'));
});
