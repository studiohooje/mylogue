import test from 'node:test';
import assert from 'node:assert/strict';
import {frequentCombo, comboOfferHTML, comboSig} from '../quick-entry.js';

// 4.17.0 자주 먹는 조합 저장 제안: 3번 넘게, 저장·거절한 적 없을 때만
const group = (d, names) => names.map(n => ({date: d, slot: '아침', mealGroupId: `g${d}`, name: n}));
test('3번 먹은 조합만, 저장했거나 거절하면 다시 묻지 않음', () => {
  const meals = [...group('2026-11-20', ['요거트', '바나나']), ...group('2026-11-21', ['바나나', '요거트']), ...group('2026-11-22', ['요거트', '바나나'])];
  const rows = [{name: '요거트'}, {name: '바나나'}];
  assert.equal(frequentCombo({meals: meals.slice(0, 4)}, rows), null);
  const c = frequentCombo({meals}, rows); assert.equal(c.count, 3); assert.equal(c.sig, comboSig(['바나나', '요거트']));
  assert.match(comboOfferHTML(c), /3번 드셨어요/);
  assert.equal(frequentCombo({meals, recipes: [{items: [{name: '바나나'}, {name: '요거트'}]}]}, rows), null);
  assert.equal(frequentCombo({meals, settings: {comboDismissed: [c.sig]}}, rows), null);
  assert.equal(frequentCombo({meals}, [{name: '요거트'}]), null);
});
