// 코치로그 v2 계산 시험: 차감·장부·되돌리기·할 일·듀엣 규정·날짜
import test from 'node:test';
import assert from 'node:assert/strict';
import * as D from '../coach2-data.js';
import {demoPT, demoPilates} from '../coach2-demo.js';

const NOW = new Date('2026-11-27T15:00:00');

test('끝내기 한 번 = 차감 한 번, 같은 수업 다시 끝내도 두 번 빠지지 않음, 되돌리기는 반대 줄', () => {
  const data = demoPT(NOW), x = D.unprocessed(data, NOW)[0], c = data.clients.find(y => y.id === x.clientIds[0]);
  const before = D.passLeft(D.activePass(c, '', '2026-11-27'));
  const r = D.finishClass(data, {scheduleId: x.id, clientIds: x.clientIds, statuses: {}, date: '2026-11-27'}, '2026-11-27');
  const c1 = r.data.clients.find(y => y.id === c.id), p1 = D.passesOf(c1)[0];
  assert.equal(D.passLeft(p1), before - 1);
  assert.equal(D.finishClass(r.data, {sessionId: r.sessionId, scheduleId: x.id, clientIds: x.clientIds}, '2026-11-27').skipped, true);
  const u = D.undoClass(r.data, r.sessionId), p2 = D.passesOf(u.clients.find(y => y.id === c.id))[0];
  assert.equal(D.passLeft(p2), before, '되돌리면 원래대로');
  assert.ok(p2.log.length > p1.log.length, '줄을 지우지 않고 더함');
  assert.equal(u.schedules.find(y => y.id === x.id).status, 'planned');
  assert.equal(D.undoClass(u, r.sessionId), u, '두 번 되돌리지 않음');
});

test('규정: 늦은 취소 차감 끔이면 차감 없음, 기간권은 참여', () => {
  const data = {prefs: {places: [{id: 'p', rule: {cutoffH: 24, late: false, noshow: true}}]}, clients: []};
  const c = {id: 'a', passes: [{id: 'x', kind: 'count', format: '1:1', total: 10, log: []}]};
  assert.equal(D.deductionFor(data, c, {status: 'late', placeId: 'p'}).delta, 0);
  assert.equal(D.deductionFor(data, c, {status: 'noshow', placeId: 'p'}).delta, -1);
  const per = {id: 'b', passes: [{id: 'y', kind: 'period', format: '1:1', total: 0, log: []}]};
  assert.equal(D.deductionFor(data, per, {status: 'attended', placeId: 'p'}).label, '참여');
});

test('듀엣 짝 결석: 개인 전환이면 출석한 쪽은 개인권에서 차감', () => {
  const data = demoPilates(NOW);
  const k3 = data.clients.find(c => c.id === 'k3');
  const d = D.deductionFor(data, k3, {status: 'attended', format: '듀엣', placeId: 'pa2', others: ['noshow']}, '2026-11-27');
  assert.equal(D.passesOf(k3).find(p => p.id === d.passId).format, '1:1');
  const none = {...data, prefs: {...data.prefs, places: data.prefs.places.map(p => ({...p, rule: {...p.rule, duetAbsent: 'none'}}))}};
  assert.equal(D.deductionFor(none, k3, {status: 'attended', format: '듀엣', placeId: 'pa2', others: ['noshow']}, '2026-11-27').delta, 0);
});

test('할 일: 회원당 한 줄, 가장 급한 이유', () => {
  const t = D.todos(demoPT(NOW), NOW);
  assert.equal(new Set(t.map(x => x.clientId)).size, t.length);
  assert.equal(t.find(x => x.clientId === 'c3').kind, 'unproc', '끝내기 전 수업이 변경 요청보다 먼저');
});

test('예전 c.pt 하나는 수강권 하나로 읽음(사용 횟수 보존)', () => {
  const ps = D.passesOf({pt: {total: 10, used: 4, log: [{at: '2026-11-01T10:00:00Z', delta: -1}]}});
  assert.equal(ps.length, 1); assert.equal(D.passLeft(ps[0]), 6);
});

test('한국 날짜: 아침 8시에도 오늘 날짜', () => {
  assert.equal(D.ymd(new Date('2026-11-27T08:00:00')), '2026-11-27');
});

test('검수 반영: OT는 차감 없음, 끝낸 예약은 다시 못 끝냄, 끝난·만료 수강권은 안내', () => {
  const data = demoPT(NOW);
  const c1 = data.clients.find(c => c.id === 'c1');
  assert.equal(D.deductionFor(data, c1, {status: 'attended', type: 'ot'}).delta, 0);
  const x = D.unprocessed(data, NOW)[0];
  const r = D.finishClass(data, {scheduleId: x.id, clientIds: x.clientIds}, '2026-11-27');
  assert.equal(D.finishClass(r.data, {scheduleId: x.id, clientIds: x.clientIds}, '2026-11-27').skipped, true, '새 수업 id여도 예약이 끝났으면 막음');
  const exp = {id: 'e', passes: [{id: 'p', kind: 'count', total: 10, expiresAt: '2026-11-01', log: []}]};
  assert.equal(D.deductionFor(data, exp, {status: 'attended'}, '2026-11-27').label, '수강권 만료');
  assert.equal(D.passState(exp, '2026-11-27').state, 'expired');
});

test('검수 반영: 스프링은 장소 브랜드로 맞춤, 월말 개월 계산', () => {
  assert.deepEqual(D.normSprings([{id: 'r', n: 2}, {id: 'b', n: 1}], '그라츠'), [{id: 's', n: 3}]);
  assert.deepEqual(D.normSprings([{id: 's', n: 3}], '밸런스드 바디'), []);
  assert.equal(D.springText([{id: 'r', n: 2}, {id: 'b', n: 1}], '밸런스드 바디'), '빨2 파1');
  assert.equal(D.addMonths('2026-01-31', 1), '2026-02-28');
});

test('본 앱 연결: 회원 회신은 확인·이의만(차감 없음), 이의는 장부 줄에도 표시', () => {
  const data = demoPT(NOW), x = D.unprocessed(data, NOW)[0];
  const c0 = data.clients.find(c => c.id === x.clientIds[0]); c0.memberUid = 'M1';
  const r = D.finishClass(data, {scheduleId: x.id, clientIds: x.clientIds}, '2026-11-27');
  const left = D.passLeft(D.passesOf(r.data.clients.find(c => c.id === c0.id))[0]);
  const ok = D.applyAcks2(r.data, [{sessionId: r.sessionId, memberUid: 'M1', result: 'confirmed', createdAt: '2026-11-27T12:00:00Z'}]);
  assert.ok(ok.changed); assert.ok(ok.sessions.find(s => s.id === r.sessionId).targets[0].confirmedAt);
  assert.equal(D.passLeft(D.passesOf(ok.clients.find(c => c.id === c0.id))[0]), left, '회신으로 다시 차감하지 않음');
  const no = D.applyAcks2(r.data, [{sessionId: r.sessionId, memberUid: 'M1', result: 'rejected'}]);
  const e = D.passesOf(no.clients.find(c => c.id === c0.id))[0].log.find(z => z.sessionId === r.sessionId);
  assert.ok(e.disputedAt); assert.equal(D.todos({...r.data, clients: no.clients, sessions: no.sessions}, NOW).find(t => t.clientId === c0.id).kind, 'dispute');
});

test('본 앱 연결: 연동 문서용 수강권 요약에는 금액이 없고, 회원에게 가는 기록에는 컨디션이 없음', () => {
  const data = demoPT(NOW), c1 = data.clients.find(c => c.id === 'c1');
  const pt = D.linkPassSummary(data, c1, '2026-11-27');
  assert.equal(pt.v2, true); assert.equal(JSON.stringify(pt).includes('1400000'), false); assert.equal(pt.showLeft, true);
  const s = D.sessionsOf(data, 'c1')[0];
  const m = D.sessionForMember(data, {...s, condition: {c1: {pain: ['무릎']}}}, {clientId: 'c1', note: '좋아요', deducted: -1});
  assert.equal(JSON.stringify(m).includes('무릎'), false); assert.equal(m.memberNote, '좋아요');
});

test('회원 → 코치 날짜별 요약은 동의한 범위만', async () => {
  const {sharedSummary, memberHomeCardHTML} = await import('../coach.js');
  const db = {body: [{date: '2026-11-26', weight: 71.24}], meals: [{id: 'a', mealGroupId: 'g', date: '2026-11-26', calories: 500, protein: 30, name: '비밀 메뉴'}], workouts: []};
  const only = sharedSummary(db, {body: true, diet: false, workouts: false}, '2026-11-27');
  assert.deepEqual(only.days, [{date: '2026-11-26', weight: 71.2}]);
  assert.equal(JSON.stringify(sharedSummary(db, {diet: true}, '2026-11-27')).includes('비밀 메뉴'), false, '끼니 내용은 올리지 않음');
  const card = memberHomeCardHTML([{id: 'L', memberMine: true, status: 'active', trainerName: '도윤', pt: {v2: true, showLeft: false, total: 10, used: 3, passes: [{name: 'PT 10회권', left: 7, log: []}]}}]);
  assert.equal(card.includes('7회 남음'), false, '센터가 숨기면 남은 회차 안 보임');
});
