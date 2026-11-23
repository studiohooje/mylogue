import test from 'node:test';
import assert from 'node:assert/strict';
import {returnMode, returnGoal, returnNoteHTML} from '../back-on-track.js';
import {summary} from '../body-flow.js';
import {foldByDate, draftDay, dbCandidate} from '../ai-inbox.js';
import {AI_PROMPT} from '../ai-prompt.js';

// 4.17.0 백 온 트랙 2단계 · AI 지침 × 음식 DB
test('복귀 모드: 8일 넘게 비었다가 다시 시작한 뒤 7일 동안만', () => {
  const db = {meals: [{date: '2026-11-01'}, {date: '2026-11-02'}, {date: '2026-11-15'}, {date: '2026-11-16'}]};
  const rm = returnMode(db, '2026-11-17');
  assert.deepEqual(rm, {since: '2026-11-15', gap: 12, dayOf: 3});
  assert.equal(returnGoal(4, rm), 2); assert.equal(returnGoal(4, null), 4); assert.equal(returnGoal(1, rm), 1);
  assert.match(returnNoteHTML(rm, 4), /3일째.*2번으로 낮춰/);
  assert.equal(returnMode(db, '2026-11-23'), null);
  assert.equal(returnMode({meals: [{date: '2026-11-10'}, {date: '2026-11-12'}]}, '2026-11-13'), null);
});
test('공백 뒤 체중: 공백 앞과 비교하지 않고 다시 시작한 날부터', () => {
  const pts = [{date: '2026-10-20', w: 75}, {date: '2026-10-25', w: 74.6}, {date: '2026-11-20', w: 77}];
  let s = summary(pts, null, '2026-11-20');
  assert.equal(s.restart, '2026-11-20'); assert.equal(s.change30, null);
  s = summary([...pts, {date: '2026-11-22', w: 76.6}], null, '2026-11-22');
  assert.equal(s.change30, -0.4);
  s = summary([{date: '2026-11-01', w: 75}, {date: '2026-11-20', w: 74}], null, '2026-11-20');
  assert.equal(s.restart, '2026-11-20');
  const noGap = summary([{date: '2026-11-10', w: 75}, {date: '2026-11-20', w: 74}], null, '2026-11-20');
  assert.equal(noGap.restart, null); assert.equal(noGap.change30, -1);
});
test('밀린 초안은 9개부터 날짜별로 접는다', () => {
  const mk = n => [...Array(n)].map((_, i) => ({id: 'd' + i, parsedData: {date: i % 2 ? '2026-11-20' : '2026-11-21'}}));
  assert.doesNotMatch(foldByDate(mk(8), d => d.id), /details/);
  const h = foldByDate(mk(9), d => `[${d.id}]`);
  assert.equal(h.match(/<details/g).length, 2); assert.match(h, /^<details class="ai-day-group" open><summary><b>11월 21일<\/b> <small>초안 5개/);
  assert.equal(draftDay({parsedData: {}}), '날짜 없음'); assert.equal(draftDay({parsedData: {loggedAt: '2026-11-19T03:00:00Z'}}), '2026-11-19');
});
test('검토함 DB 후보: 같은 단위면 kcal 환산, 차이가 크면 표시', () => {
  const S = () => [{name: '제육덮밥 · 김밥천국', servingQty: 1, servingUnit: '그릇', calories: 820, dbLabel: '외식'}];
  const c = dbCandidate({name: '제육덮밥', servingQty: 1, servingUnit: '그릇', calories: 500}, S);
  assert.equal(c.kcal, 820); assert.equal(c.off, true); assert.equal(c.same, true);
  assert.equal(dbCandidate({name: '두부', servingQty: 150, servingUnit: 'g', calories: 120}, () => [{name: '두부', servingQty: 100, servingUnit: 'g', calories: 80}]).off, false);
  assert.equal(dbCandidate({name: '없는 음식'}, () => []), null);
});
test('AI 지침: 브랜드·단위·나눠 먹은 양 규칙', () => {
  assert.match(AI_PROMPT, /" · 브랜드"/); assert.match(AI_PROMPT, /그릇·공기·접시/); assert.match(AI_PROMPT, /qty 0\.25/);
});
