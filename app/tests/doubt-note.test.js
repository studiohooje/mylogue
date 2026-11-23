import test from 'node:test';
import assert from 'node:assert/strict';
import {doubtNoteHTML} from '../quick-entry.js';
test('값 확인 필요 안내: 0kcal이면 계산값 선택 버튼, 어긋나면 두 값 비교', () => {
  assert.equal(doubtNoteHTML({dbDoubt: false, calories: 0, carbs: 10}), '');
  const z = doubtNoteHTML({dbDoubt: true, calories: 0, carbs: 20, protein: 5, fat: 2});
  assert.match(z, /약 118kcal/); assert.match(z, /q-doubt-calc/);
  const o = doubtNoteHTML({dbDoubt: true, calories: 50, carbs: 30, protein: 10, fat: 5});
  assert.match(o, /표시된 열량\(50kcal\)/); assert.doesNotMatch(o, /q-doubt-calc/);
  assert.match(doubtNoteHTML({dbDoubt: true, calories: 200, carbs: 30, protein: 10, fat: 4}), /출처마다 값이 달라/);
});
test('제로·무설탕 제품은 계산 버튼 대신 설명', () => {
  const h = doubtNoteHTML({dbDoubt: true, name: '제로 애플망고', calories: 0, carbs: 20});
  assert.match(h, /당알코올/); assert.doesNotMatch(h, /q-doubt-calc/);
});
