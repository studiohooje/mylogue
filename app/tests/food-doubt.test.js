import test from 'node:test';
import assert from 'node:assert/strict';
import {isDoubtful} from '../tools/food-bundle.mjs';
import {rowToFood} from '../food-db.js';
test('값 의심(1)과 단종 가능(2)을 나눈다, 오탐은 풀어 준다', () => {
  assert.equal(isDoubtful({confidence: 'low', flags: ['mfdsCandidate'], source: {type: 'platform'}}), 2);
  assert.equal(isDoubtful({confidence: 'low', flags: ['mfdsCandidate', 'sameNameDiffValues'], source: {type: 'platform'}}), 1);
  assert.equal(isDoubtful({confidence: 'medium', flags: ['calcCheckMismatch', 'recheckConfirmed'], label: {kcal: 140}}), 0);
  assert.equal(isDoubtful({confidence: 'medium', name: '그랑드카페 콜드브루', flags: ['kcalDensityLow']}), 0);
  assert.equal(isDoubtful({confidence: 'medium', name: '쭈꾸미 피자', flags: ['kcalDensityLow']}), 1);
  assert.equal(rowToFood(['갈릭빵', '파리바게뜨', '회', 66, 265, null, 4, null, 'f', '', 2]).dbMaybeGone, true);
  assert.equal(rowToFood(['갈릭빵', '파리바게뜨', '회', 66, 265, null, 4, null, 'f', '', 1]).dbDoubt, true);
});
