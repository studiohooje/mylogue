// 4.17.2 음식 DB: '콜라'에 콜라겐이 섞이지 않게, 편의점 간편식, 감미료로 설명되는 검산 차이
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {matchScore} from '../suggest.js';
import {sweetenerExplains, popularUnit} from '../tools/food-bundle.mjs';
import {cleanName, accept, aliasesOf} from '../tools/convenience-products.mjs';
import {setFoodRows, searchFoodDB} from '../food-db.js';

test('글자만 겹치는 다른 음식(콜라겐·쇼콜라)은 콜라보다 뒤로', () => {
  assert.ok(matchScore('콜라', ['콜라겐 프로틴']) < matchScore('콜라', ['코카콜라']));
  assert.ok(matchScore('콜라', ['쇼콜라 케이크']) < matchScore('콜라', ['콜라(L)']));
  assert.equal(matchScore('콜라겐', ['콜라겐 프로틴']), 92); // 콜라겐을 찾으면 그대로
  assert.ok(matchScore('콜라', ['콜라겐 콜라맛 젤리']) >= 60); // 진짜 콜라가 함께 있으면 제 점수
});

test('편의점 간편식: 이름 정리·고르는 기준·1개 단위·별칭', () => {
  assert.equal(cleanName('혜자)햄구이도시락'), '혜자 햄구이도시락');
  const o = {name: '혜자로운도시락', maker: '(주)후레쉬서브', cls: {lv6: '즉석섭취식품'}, basis: 'g', per100: {kcal: 160}, foodSize: '601g'};
  assert.ok(accept(o));
  assert.ok(!accept({...o, maker: '(주)허닭'}));
  assert.ok(!accept({...o, foodSize: '913g'}));
  assert.ok(!accept({...o, name: '마리김밥용토핑4종키트'}));
  assert.deepEqual(popularUnit({...o, whole: true}), {unit: '개', amount: 601});
  assert.ok(aliasesOf('혜자로운도시락').includes('GS25'));
  assert.ok(aliasesOf('참치마요삼각김밥').includes('삼김'));
});

test('감미료로 설명되는 검산 차이만 의심하지 않는다', () => {
  assert.ok(sweetenerExplains('알룰로스 시럽', 25, 72, 0, 0));
  assert.ok(sweetenerExplains('스크류바 0kcal', 0, 18, 0, 0));
  assert.ok(!sweetenerExplains('저당 슬라이스 폭립', 19, 0.7, 1.5, 1.2)); // 고기는 감미료로 설명 안 됨
  assert.ok(!sweetenerExplains('딸기잼', 37, 53, 0.5, 0)); // 감미료 이름이 아님
  assert.ok(!sweetenerExplains('제로 쿠키', 100, 60, 6, 20)); // 지방만으로 표시 열량을 넘음
  assert.ok(!sweetenerExplains('제로 음료', 120, 20, 0, 0)); // 검산보다 높은 건 감미료로 설명 안 됨
});

test('실제 앱 DB: 콜라·편의점 검색', () => {
  setFoodRows(JSON.parse(fs.readFileSync(new URL('../food-db.json', import.meta.url), 'utf8')).rows);
  const top = (q, n = 5) => searchFoodDB(q, {limit: n});
  assert.ok(!top('콜라').some(f => /콜라겐|쇼콜라/.test(f.name)));
  for (const q of ['편의점도시락', '혜자도시락', '삼각김밥', '삼김', '편의점김밥', '제육도시락']) assert.ok(top(q).some(f => f.brand === '편의점'), q);
});
