import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {setFoodRows} from '../food-db.js';
import {evaluate} from '../tools/search-golden.mjs';
// 4.28.0 밤샘 A-6: 음식 검색 정답지 3,000(손으로 고른 58 + 이름 그대로·한 글자 오타·초성). 기준선 아래로 떨어지면 실패.
// 이전(4.27.0): 손으로 고른 89.7% · 오타 8.5% → 지금 100% · 83.3%
const {queries} = JSON.parse(readFileSync(new URL('./fixtures/food-search-golden.json', import.meta.url), 'utf8'));
test('음식 검색 정답지: 손으로 고른 검색어 100%, 이름 그대로 99% 이상, 한 글자 오타 80% 이상, 초성 95% 이상', () => {
 setFoodRows(JSON.parse(readFileSync(new URL('../food-db.json', import.meta.url), 'utf8')).rows);
 const {by, fails} = evaluate(queries);
 assert.equal(by.curated.rate, 100, JSON.stringify(fails.filter(f => f.kind === 'curated')));
 assert.ok(by.exact.rate >= 99, String(by.exact.rate));
 assert.ok(by.typo.rate >= 80, String(by.typo.rate));
 assert.ok(by.choseong.rate >= 95, String(by.choseong.rate));
});
