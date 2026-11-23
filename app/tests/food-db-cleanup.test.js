// 4.17.1 음식 DB 정리: 오탐 풀기·단백질 1회분 단위·중복 합치기·국민 상품·주류 추정·줄임말
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {isDoubtful, servingAsPer100, popularUnit, autoAliases, ALCOHOL_EST, buildRows} from '../tools/food-bundle.mjs';
import {flagDoubts} from '../tools/food-db-check.mjs';
import {setFoodRows, searchFoodDB} from '../food-db.js';

test('감미료 제로 제품의 열량 0·밀도 낮음은 의심하지 않는다, 진짜 이상한 값은 그대로', () => {
  assert.equal(isDoubtful({confidence: 'medium', name: '웰치 제로 그레이프', per100ml: {kcal: 0, carbs: 2.2, sugar: 0, protein: 0, fat: 0}, flags: ['zeroKcalWithMacros']}), 0);
  assert.equal(isDoubtful({confidence: 'medium', name: '허니트리 알룰로스', per100g: {kcal: 3, carbs: 70, sugar: 0, protein: 0.3, fat: 0.1}, flags: ['calcOff', 'kcalDensityLow']}), 0);
  assert.equal(isDoubtful({confidence: 'medium', name: '저염 포기김치', per100g: {kcal: 37, carbs: 6, sugar: 4, protein: 2, fat: 0}, flags: ['kcalDensityLow']}), 0);
  // 단백질·지방이 있는 '제로' 과자는 감미료만으로 설명되지 않는다
  assert.equal(isDoubtful({confidence: 'medium', name: '제로 쿠키', per100g: {kcal: 0, carbs: 60, sugar: 0, protein: 6, fat: 20}, flags: ['zeroKcalWithMacros']}), 1);
  assert.equal(isDoubtful({confidence: 'medium', name: '쭈꾸미 피자', flags: ['kcalDensityLow']}), 1);
});

test('통으로 파는 단백질 가루의 1스쿱 값은 1회분 단위로, 1회용 봉지는 건드리지 않는다', () => {
  const tub = {category: 'protein-powder', per100g: {kcal: 150, carbs: 7, protein: 21, fat: 4.5}, units: [{label: '전체 720g', g: 720, default: true}]};
  assert.ok(servingAsPer100(tub));
  assert.equal(servingAsPer100({...tub, units: [{label: '전체 45g', g: 45, default: true}]}), null);
  assert.equal(servingAsPer100({...tub, per100g: {kcal: 390, carbs: 7, protein: 80, fat: 5}}), null);
  assert.equal(servingAsPer100({...tub, category: 'protein-snack'}), null);
  const rows = buildRows({products: [{...tub, name: '플랜트 프로틴', brand: '오르게인', flags: ['kcalDensityLow', 'recheckUnresolved'], confidence: 'medium'}]});
  const r = rows.find(x => x[0] === '플랜트 프로틴');
  assert.equal(r[2], '회'); assert.equal(r[4], 150); assert.ok(!r[10]);
});

test('띄어쓰기만 다른 같은 메뉴는 하나로, 불가능한 값은 싣지 않는다', () => {
  const p = (name, kcal, flags = ['mfdsCandidate', 'sameNameDiffValues']) => ({name, brand: '뚜레쥬르', group: 'franchise', category: 'franchise-bakery', per100g: {kcal, carbs: 40, protein: 5, fat: 10}, units: [{label: '1회 제공량 499g', g: 499, default: true}], confidence: 'low', source: {type: 'platform'}, flags});
  const rows = buildRows({products: [p('딸기와우유생크림1호', 287), p('딸기와우유 생크림 1호', 283), p('마카롱', 1183, ['kcalImpossible'])]});
  const t = rows.filter(r => r[1] === '뚜레쥬르');
  assert.equal(t.length, 1);
  assert.equal(t[0][10], 2); // 값 의심은 풀고 '지금은 안 팔 수 있음'만 남김
});

test('국민 상품 단위: 라면 묶음은 1봉, 큰 과자·아이스크림 통은 1회분, 큰 병 음료는 1잔', () => {
  assert.deepEqual(popularUnit({basis: 'g', foodSize: '536g', name: '신라면블랙', cls: {lv3: '면류', lv6: '유탕면'}}), {unit: '개', amount: 134});
  assert.deepEqual(popularUnit({basis: 'g', foodSize: '372g', name: '너구리컵', cls: {lv3: '면류'}}), {unit: '개', amount: 62});
  assert.deepEqual(popularUnit({basis: 'g', foodSize: '120g', name: '신라면', cls: {lv3: '면류'}}), {unit: '개', amount: 120});
  assert.deepEqual(popularUnit({basis: 'g', foodSize: '180g', servingRef: '30g', name: '새우깡', cls: {lv3: '과자류·빵류 또는 떡류', lv6: '과자'}}), {unit: '회', amount: 30});
  assert.deepEqual(popularUnit({basis: 'ml', foodSize: '420ml', servingRef: '100g(ml)', name: '돼지바', cls: {lv3: '빙과류'}}), {unit: '회', amount: 100});
  assert.deepEqual(popularUnit({basis: 'ml', foodSize: '1800ml', servingRef: '200ml', name: '코카콜라', cls: {lv3: '음료류'}}), {unit: '잔', amount: 200});
  assert.deepEqual(popularUnit({basis: 'ml', foodSize: '355ml', servingRef: '200ml', name: '칠성사이다', cls: {lv3: '음료류'}}), {unit: '병', amount: 355});
});

test('주류 추정은 도수 계산과 맞고, 줄임말이 붙는다', () => {
  const soju = ALCOHOL_EST.find(a => a.name.startsWith('소주 1병'));
  assert.ok(Math.abs(soju.kcal - soju.ml * 16 / 100 * 0.789 * 7) < 5);
  const beer = ALCOHOL_EST.find(a => a.name.startsWith('맥주 1캔 500'));
  assert.ok(Math.abs(beer.kcal - (500 * 4.5 / 100 * 0.789 * 7 + beer.carbs * 4)) < 10);
  assert.deepEqual(autoAliases('아메리카노 ICED L'), ['아아']);
  assert.deepEqual(autoAliases('아메리카노 HOT'), ['뜨아']);
  assert.deepEqual(autoAliases('아메리카노'), ['아아', '뜨아']);
  assert.ok(autoAliases('아이스 바닐라라떼').includes('아바라'));
  assert.ok(autoAliases('육개장사발면').includes('컵라면'));
  assert.deepEqual(autoAliases('부대찌개'), ['부찌']);
  // 주류 이름·별칭은 열량 검산 '어긋남'으로 의심하지 않는다
  const rows = [['새로', '롯데칠성', '병', 360, 320, 0.1, 0.2, 0.1, 'm', '소주 새로소주']];
  flagDoubts(rows); assert.ok(!rows[0][10]);
});

test('실제 앱 DB: 많이 치는 말이 바로 나온다', () => {
  setFoodRows(JSON.parse(fs.readFileSync(new URL('../food-db.json', import.meta.url), 'utf8')).rows);
  const top = (q, n = 3) => searchFoodDB(q, {limit: n}).map(f => f.name).join(' / ');
  for (const [q, re] of [['진라면', /진라면/], ['짜파게티', /짜파게티/], ['신라면', /신라면/], ['불닭', /불닭/], ['포카리', /포카리/], ['새우깡', /새우깡/], ['소주', /소주/], ['참이슬', /소주/], ['맥주', /맥주/], ['아아', /아메리카노/], ['뜨아', /아메리카노/], ['컵라면', /컵|용기면|사발/], ['탕후루', /탕후루/], ['구운계란', /구운란/], ['제로콜라', /제로/], ['햇반', /햇반/], ['바나나우유', /바나나맛우유/], ['아몬드우유', /아몬드/]]) assert.match(top(q), re, q);
});
