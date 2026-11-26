// 5.4.0 코치로그 3차: 수강권 · 회차 장부 · 홀딩 · 당일 취소 규칙 · 회차 리포트
import test from 'node:test';
import assert from 'node:assert/strict';
import {passOf, passLeft, deduct, hold, lateCancel, ledgerHTML, passCardHTML, reportOf, reportText} from '../coach-pass.js';
import {applyAcks} from '../coach.js';

test('수강권: 예전 pt(총·사용)와 호환, 기본 이름·규칙', () => {
  const p = passOf({pt: {total: 20, used: 12, expiresAt: '2027-03-31'}, ptLog: [{at: '2026-11-19T10:00:00Z', kind: 'noshow', delta: -1}]});
  assert.equal(p.name, 'PT 20회권'); assert.equal(passLeft(p), 8); assert.equal(p.rule.noshow, true); assert.equal(p.log.length, 1);
  assert.equal(passOf({pt: {}}), null);
});
test('장부: 차감은 회차 번호, 홀딩은 만료일을 뒤로', () => {
  let pt = {total: 10, used: 0, expiresAt: '2026-12-31'};
  pt = deduct(pt, {date: '2026-11-20', kind: 'session', note: '하체', coachAt: '2026-11-20T11:05:00Z', memberAt: '2026-11-20T12:41:00Z'});
  pt = deduct(pt, {date: '2026-11-22', kind: 'noshow', note: '노쇼'});
  pt = hold(pt, 7, '2026-11-26');
  assert.equal(pt.used, 2); assert.equal(pt.expiresAt, '2027-01-07'); assert.equal(pt.holds[0].days, 7);
  const h = ledgerHTML(passOf({pt}));
  assert.match(h, /2회차<\/b> · 11\/22 노쇼/); assert.match(h, /1회차<\/b> · 11\/20 수업/); assert.match(h, /회원 확정/); assert.match(h, /홀딩 7일 · 만료 12\/31 → 1\/7/);
  assert.match(passCardHTML(passOf({pt}), {who: 'member', linkId: 'L'}), /data-mc-pass-agree="L"/);
});
test('당일 취소 규칙: 시작 N시간 안이면 차감 대상', () => {
  const now = new Date('2026-11-26T10:00:00');
  assert.equal(lateCancel({late: true, cutoffH: 24}, '2026-11-26T19:00', now), true);
  assert.equal(lateCancel({late: true, cutoffH: 24}, '2026-11-28T19:00', now), false);
  assert.equal(lateCancel({late: false, cutoffH: 24}, '2026-11-26T19:00', now), false);
});
test('회원 확정 회신 → 차감 + 장부(코치 기록·회원 확정 시각)', () => {
  const data = {clients: [{id: 'c1', name: '김', memberUid: 'm', pt: {total: 10, used: 3}}], sessions: [{id: 's1', date: '2026-11-25', title: '하체 PT', sentAt: '2026-11-25T11:00:00Z', targets: [{clientId: 'c1', status: 'sent', ptDeduct: true}]}]};
  const r = applyAcks(data, [{sessionId: 's1', memberUid: 'm', result: 'edited', createdAt: '2026-11-25T12:30:00Z'}]);
  assert.equal(r.clients[0].pt.used, 4); assert.equal(r.clients[0].pt.log.at(-1).edited, true); assert.equal(r.clients[0].pt.log.at(-1).memberAt, '2026-11-25T12:30:00Z');
});
test('회차 리포트: 대표 종목 첫·마지막 무게(웜업 빼고), 체중은 공유 켰을 때만', () => {
  const data = {sessions: [
    {id: 'a', date: '2026-10-01', exercises: [{name: '스쿼트', sets: [{weight: 20, reps: 10, type: '웜업'}, {weight: 40, reps: 10}]}], targets: [{clientId: 'c1', status: 'confirmed'}]},
    {id: 'b', date: '2026-11-20', exercises: [{name: '스쿼트', sets: [{weight: 55, reps: 8}]}, {name: '런지', sets: [{weight: 10, reps: 10}]}], targets: [{clientId: 'c1', status: 'sent'}]}]};
  const c = {id: 'c1', name: '김민지', pt: {total: 20, used: 12}};
  const r = reportOf(data, c, {scope: {body: true}, shared: {weights: [62.4, 61.1]}}, '2026-11-26');
  assert.equal(r.top, '스쿼트'); assert.equal(r.first, 40); assert.equal(r.last, 55); assert.equal(r.attended, 1); assert.equal(r.weight, -1.3);
  assert.equal(reportOf(data, c, {scope: {body: false}, shared: {weights: [62.4, 61.1]}}, '2026-11-26').weight, null);
  assert.match(reportText(r, '잘했어요'), /김민지 님 회차 리포트\] 12회\/20회[\s\S]*스쿼트 40 → 55kg[\s\S]*코치 한마디: 잘했어요/);
});
