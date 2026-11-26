// 5.4.0 코치로그 2차 규칙: 식단 제안·루틴(코치), 출석 응답(회원), 코치방(연동 당사자 둘만, 공유는 연동 동의 범위)
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {initializeTestEnvironment, assertFails, assertSucceeds} from '@firebase/rules-unit-testing';
import {doc, getDoc, setDoc, updateDoc, serverTimestamp} from 'firebase/firestore';

const host = process.env.FIRESTORE_EMULATOR_HOST;
const T = 'trainer-uid', M = 'member-uid', X = 'stranger-uid';
test('5.4.0 코치방·식단 제안·출석 응답 규칙', {skip: !host}, async () => {
  const rules = await readFile(new URL('../firestore.rules', import.meta.url), 'utf8');
  const [h, p] = host.split(':');
  const env = await initializeTestEnvironment({projectId: 'mylogue-coach-room-test', firestore: {host: h, port: Number(p), rules}});
  try {
    const linkId = `${T}_${M}`;
    await env.withSecurityRulesDisabled(async ctx => {
      const d = ctx.firestore();
      for (const u of [T, M, X]) await setDoc(doc(d, 'users', u), {status: 'approved', coach: true});
      await setDoc(doc(d, 'links', linkId), {trainerUid: T, memberUid: M, trainerName: '코치', memberName: '회원', clientId: 'c1', inviteCode: 'ABCD2345', status: 'active', scope: {sessions: true, workouts: false, diet: true, body: false}, shared: {}, pt: {}, schedule: []});
    });
    const t = env.authenticatedContext(T, {email: 't@example.test', email_verified: true}).firestore();
    const m = env.authenticatedContext(M, {email: 'm@example.test', email_verified: true}).firestore();
    const x = env.authenticatedContext(X, {email: 'x@example.test', email_verified: true}).firestore();
    // 식단 제안·루틴: 코치만, 12개까지
    const plan = {id: 'p1', title: '점심', items: [{name: '현미밥', servingQty: 1, servingUnit: '공기', calories: 300}]};
    await assertSucceeds(updateDoc(doc(t, 'links', linkId), {mealPlans: [plan], routines: [{id: 'r1', title: '하체', items: [{name: '스쿼트'}]}], updatedAt: serverTimestamp()}));
    await assertFails(updateDoc(doc(t, 'links', linkId), {mealPlans: Array.from({length: 13}, () => plan), updatedAt: serverTimestamp()}));
    await assertFails(updateDoc(doc(m, 'links', linkId), {mealPlans: [], updatedAt: serverTimestamp()}));
    // 출석 응답: 회원만
    await assertSucceeds(updateDoc(doc(m, 'links', linkId), {attend: {b1: 'yes'}, updatedAt: serverTimestamp()}));
    await assertFails(updateDoc(doc(t, 'links', linkId), {attend: {b1: 'no'}, updatedAt: serverTimestamp()}));
    // 개인 루틴 했어요: 회원만
    await assertSucceeds(updateDoc(doc(m, 'links', linkId), {routineLog: {r1: [{date: '2026-11-26', done: 4, total: 4}]}, updatedAt: serverTimestamp()}));
    await assertFails(updateDoc(doc(t, 'links', linkId), {routineLog: {}, updatedAt: serverTimestamp()}));
    // 수강권 규칙 확인: 회원만, 글자
    await assertSucceeds(updateDoc(doc(m, 'links', linkId), {ptAgreedAt: '2026-11-26T10:00:00.000Z', updatedAt: serverTimestamp()}));
    await assertFails(updateDoc(doc(t, 'links', linkId), {ptAgreedAt: 'x', updatedAt: serverTimestamp()}));
    // 코치: 수강권(pt)에 장부를 실어 보낸다
    await assertSucceeds(updateDoc(doc(t, 'links', linkId), {pt: {total: 20, used: 1, log: [{at: 'a', kind: 'session', delta: -1}]}, updatedAt: serverTimestamp()}));
    // 코치방: 연동 당사자만, 멤버는 정확히 코치·회원
    const room = (owner, extra = {}) => ({name: '코치방', type: 'coach', ownerUid: owner, memberIds: [T, M], memberNames: {[T]: '코치', [M]: '회원'}, scope: {body: false, meal: false, work: false}, joinCode: '', appliedProposal: '', linkId, createdAt: serverTimestamp(), updatedAt: serverTimestamp(), ...extra});
    await assertFails(setDoc(doc(x, 'rooms', 'coachroom000001'), room(X)));
    await assertFails(setDoc(doc(m, 'rooms', 'coachroom000001'), room(M, {memberIds: [T, M, X]})));
    await assertSucceeds(setDoc(doc(m, 'rooms', 'coachroom000001'), room(M)));
    await assertSucceeds(getDoc(doc(t, 'rooms', 'coachroom000001')));
    await assertFails(getDoc(doc(x, 'rooms', 'coachroom000001')));
    // 공유 요약: 연동 동의 범위대로(식단 켜짐, 수치 꺼짐)
    const share = kind => ({uid: M, kind, name: '회원', data: {}, updatedAt: serverTimestamp()});
    await assertSucceeds(setDoc(doc(m, 'rooms', 'coachroom000001', 'shares', `${M}_meal`), share('meal')));
    await assertFails(setDoc(doc(m, 'rooms', 'coachroom000001', 'shares', `${M}_body`), share('body')));
    await assertSucceeds(getDoc(doc(t, 'rooms', 'coachroom000001', 'shares', `${M}_meal`)));
    // 회원이 식단 공유를 끄면 코치는 바로 못 읽는다
    await assertSucceeds(updateDoc(doc(m, 'links', linkId), {scope: {sessions: true, workouts: false, diet: false, body: false}, updatedAt: serverTimestamp()}));
    await assertFails(getDoc(doc(t, 'rooms', 'coachroom000001', 'shares', `${M}_meal`)));
    // 끊긴 연동으로는 새 코치방을 못 만든다
    await assertSucceeds(updateDoc(doc(m, 'links', linkId), {status: 'ended', updatedAt: serverTimestamp()}));
    await assertFails(setDoc(doc(t, 'rooms', 'coachroom000002'), room(T)));
    assert.ok(true);
  } finally { await env.cleanup(); }
});
