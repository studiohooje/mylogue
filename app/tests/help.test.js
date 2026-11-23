import test from 'node:test';
import assert from 'node:assert/strict';
import {HELP, searchHelp, helpHTML, helpListHTML} from '../help.js';
test('도움말: 검색·주제 묶음·결과 없음', () => {
  assert.ok(HELP.length >= 20);
  assert.ok(searchHelp('나눠').some(x => /몇 명이서/.test(x.a)));
  assert.ok(searchHelp('필라테스').length >= 1);
  assert.match(helpListHTML('없는말xyz'), /찾는 내용이 없어요/);
  assert.match(helpHTML(), /궁금한 것 찾기/);
  for (const x of HELP) assert.doesNotMatch(x.a, /\.js|app\.|localStorage|Firestore/); // 내부 용어 없음
});
