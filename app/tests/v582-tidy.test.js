// 5.8.2: 변화량 빼기 기호 '−' 통일, 좁은 달력 칸의 낱말 줄바꿈 자리
import test from 'node:test';
import assert from 'node:assert/strict';
import {bodyOverviewHTML} from '../body-flow.js';
import {calLabel} from '../schedule-plan.js';

test('체중 변화: 줄어든 값은 하이픈(-)이 아니라 빼기(−)', () => {
 const w = (date, weight) => ({id: date, date, weight});
 const body = []; for (let i = 0; i < 60; i++) { const d = new Date('2026-09-29T12:00'); d.setDate(d.getDate() + i); body.push(w(d.toISOString().slice(0, 10), 82 - i * 0.05)); }
 for (const view of ['day', 'week']) {
  const h = bodyOverviewHTML({body, settings: {}}, {view, today: '2026-11-27'});
  assert.doesNotMatch(h.replace(/<[^>]*>/g, ' '), /(^|[\s(>])-\d+(\.\d)?\s*kg/, view);
  assert.match(h, /−\d/, view);
 }
});

test('달력 칸 이름: 4~6글자 낱말만 가운데 줄바꿈 자리', () => {
 assert.equal(calLabel('필라테스'), '필라<wbr>테스');
 assert.equal(calLabel('하체'), '하체');
 assert.equal(calLabel('러닝·유산소'), '러닝·유산소');
 assert.equal(calLabel('인바디측정센터방문'), '인바디측정센터방문');
 assert.equal(calLabel('회사 송년회 <약속>'), '회사 송년회 &lt;약<wbr>속&gt;');
});
