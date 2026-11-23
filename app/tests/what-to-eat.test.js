import test from 'node:test';
import assert from 'node:assert/strict';
import {suggestMeals, placeOf, whatToEatHTML} from '../what-to-eat.js';

// 4.17.0 오늘 뭐 먹지: 기분·장소별, 양 조절(반 마리 등), 이상한 값·음료 제외, 브랜드 한 번씩
const R = (name, brand, unit, grams, kcal, c, p, f, tag) => [name, brand, unit, grams, kcal, c, p, f, tag, '', 0];
const rows = [
  R('후라이드치킨', '', '인분', 0, 1700, 60, 100, 100, 'k'),
  R('짜장면', '', '그릇', 0, 860, 130, 25, 25, 'k'),
  R('족발', '', '인분', 0, 528, 10, 55, 30, 'k'),
  R('김치찌개(집밥)', '', '인분', 0, 199, 10, 14, 12, 'h'),
  R('닭가슴살구이(집밥)', '', '인분', 0, 155, 2, 28, 4, 'h'),
  R('삼겹살구이(집밥)', '', '인분', 0, 784, 2, 27, 72, 'h'),
  R('닭가슴살 도시락', 'GS25', '개', 0, 450, 50, 35, 10, 'p'),
  R('닭가슴살 스테이크', '하림', '개', 0, 550, 5, 100, 10, 'm'),
  R('아메리카노', '스타벅스', '잔', 0, 10, 2, 1, 0, 'f'),
  R('웨이 프로틴 분말', '고굳', 'g', 30, 380, 5, 80, 5, 'm'),
  R('불고기버거', '롯데리아', '회', 0, 480, 50, 20, 20, 'f'),
  R('새우버거', '롯데리아', '회', 0, 500, 55, 15, 22, 'f'),
];
test('장소 나누기: 배달·외식·집밥·편의점, 음료·분말 제외', () => {
  assert.equal(placeOf(rows[1]), 'delivery'); assert.equal(placeOf(rows[2]), 'delivery');
  assert.equal(placeOf(rows[3]), 'home'); assert.equal(placeOf(rows[6]), 'store');
  assert.equal(placeOf(rows[8]), null); assert.equal(placeOf(rows[9]), null);
  assert.equal(placeOf(rows[10]), 'delivery');
});
test('보상: 맛있는 메뉴를 양까지 조절, 남은 양 대비 차이', () => {
  const r = suggestMeals({kcal: 700, protein: 40}, {mood: 'reward', place: 'delivery', rows});
  const chicken = r.find(x => x.name === '후라이드치킨');
  assert.ok(chicken && chicken.factor === 0.5 && chicken.kcal === 850, JSON.stringify(r.map(x => [x.name, x.factor, x.kcal])));
  assert.match(chicken.why, /반만 먹으면/);
  assert.equal(r.filter(x => x.brand === '롯데리아').length, 1); // 브랜드당 하나
});
test('타이트: 단백질 밀도 높은 것부터, 믿기 어려운 값(1개 단백질 100g) 제외', () => {
  const home = suggestMeals({kcal: 500, protein: 40}, {mood: 'tight', place: 'home', rows});
  assert.equal(home[0].name, '닭가슴살구이(집밥)');
  const store = suggestMeals({kcal: 700, protein: 40}, {mood: 'balance', place: 'store', rows});
  assert.ok(store.every(x => x.name !== '닭가슴살 스테이크'));
});
test('화면: 잠금·불러오는 중·결과 없음·결과', () => {
  assert.match(whatToEatHTML({mood: 'balance', place: 'out'}, {kcal: 500, protein: 30}, {locked: '<p>잠금</p>'}), /잠금/);
  assert.match(whatToEatHTML({mood: 'balance', place: 'out'}, {kcal: 500, protein: 30}, {ready: false}), /불러오는 중/);
  assert.match(whatToEatHTML({mood: 'balance', place: 'out'}, {kcal: -50, protein: 0}, {results: []}), /목표만큼 먹었어요/);
  const r = suggestMeals({kcal: 700, protein: 40}, {mood: 'balance', place: 'home', rows});
  assert.match(whatToEatHTML({mood: 'balance', place: 'home'}, {kcal: 700, protein: 40}, {results: r}), /data-wte-add="0"/);
});
