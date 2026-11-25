import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {initializeTestEnvironment, assertFails, assertSucceeds} from '@firebase/rules-unit-testing';
import {doc, getDoc, getDocs, setDoc, updateDoc, deleteDoc, collection, query, where, serverTimestamp, Timestamp, writeBatch, arrayUnion} from 'firebase/firestore';

// 5.0.0 로그메이트 규칙: 방 멤버끼리만, 공개한 종류만, 공개 범위는 전원 동의해야 바뀐다.
const host = process.env.FIRESTORE_EMULATOR_HOST;
const A = 'mate-a', B = 'mate-b', C = 'mate-c', X = 'outsider';
test('5.0.0 로그메이트 규칙', {skip: !host}, async () => {
 const rules = await readFile(new URL('../firestore.rules', import.meta.url), 'utf8');
 const [h, p] = host.split(':');
 const env = await initializeTestEnvironment({projectId: 'mylogue-mate-rules-test', firestore: {host: h, port: Number(p), rules}});
 try {
  await env.withSecurityRulesDisabled(async ctx => { const d = ctx.firestore(); for (const u of [A, B, C, X]) await setDoc(doc(d, 'users', u), {status: 'approved'}); await setDoc(doc(d, 'users', 'pending-u'), {status: 'pending'}); });
  const db = u => env.authenticatedContext(u, {email: `${u}@example.test`, email_verified: true}).firestore();
  const a = db(A), b = db(B), c = db(C), x = db(X), pend = db('pending-u');
  const R = 'roomAAAABBBBCCCC', scope = {body: true, meal: true, work: false};
  const roomData = (extra = {}) => ({name: '호구로그', type: 'friends', ownerUid: A, memberIds: [A], memberNames: {[A]: '문'}, scope, joinCode: '', appliedProposal: '', createdAt: serverTimestamp(), updatedAt: serverTimestamp(), ...extra});
  // 만들기: 승인된 본인만, 처음엔 나 혼자
  await assertFails(setDoc(doc(pend, 'rooms', 'roomPENDPENDPEND'), {...roomData(), ownerUid: 'pending-u', memberIds: ['pending-u'], memberNames: {'pending-u': 'p'}}));
  await assertFails(setDoc(doc(a, 'rooms', R), roomData({memberIds: [A, B]})));
  await assertFails(setDoc(doc(a, 'rooms', R), roomData({scope: {body: true, meal: true}})));
  await assertSucceeds(setDoc(doc(a, 'rooms', R), roomData()));
  // 남은 못 읽음
  await assertFails(getDoc(doc(x, 'rooms', R)));
  await assertSucceeds(getDocs(query(collection(a, 'rooms'), where('memberIds', 'array-contains', A))));
  // 초대: 멤버만 만들고, 코드 없이 못 들어옴
  const exp = d => Timestamp.fromDate(new Date(Date.now() + d * 864e5));
  const inv = (ctx, code, uid, extra = {}) => setDoc(doc(ctx, 'mateInvites', code), {code, roomId: R, roomName: '호구로그', scope, inviterUid: uid, inviterName: '문', memberCount: 1, expiresAt: exp(7), createdAt: serverTimestamp(), ...extra});
  await assertFails(inv(x, 'XXXX2222', X));
  await assertFails(inv(a, 'LONG2222', A, {expiresAt: exp(30)}));
  await assertSucceeds(inv(a, 'JOIN2345', A));
  await assertSucceeds(getDoc(doc(b, 'mateInvites', 'JOIN2345')));
  const join = (ctx, uid, code) => updateDoc(doc(ctx, 'rooms', R), {memberIds: arrayUnion(uid), [`memberNames.${uid}`]: uid, joinCode: code, updatedAt: serverTimestamp()});
  await assertFails(join(b, B, 'NONE2222'));
  await assertSucceeds(join(b, B, 'JOIN2345'));
  // 방장이 아닌 B도 초대할 수 있다
  await assertSucceeds(inv(b, 'BINV2345', B, {inviterName: 'b', memberCount: 2}));
  await assertSucceeds(join(c, C, 'BINV2345'));
  // 남을 끼워 넣을 수 없다
  await assertFails(updateDoc(doc(c, 'rooms', R), {memberIds: arrayUnion(X), updatedAt: serverTimestamp()}));
  // 글: 멤버만, 남의 이름으로 못 씀, 남의 사진 경로 못 씀
  const post = (ctx, uid, extra = {}) => setDoc(doc(ctx, 'rooms', R, 'posts', `p-${uid}-${Math.random().toString(36).slice(2, 8)}`), {uid, name: uid, kind: 'photo', text: '', photoKey: `rooms/${R}/${uid}/abcdEFGH1234.webp`, photoKind: 'scale', takenAt: Timestamp.now(), rec: '', createdAt: serverTimestamp(), expireAt: exp(90), ...extra});
  await assertSucceeds(post(b, B));
  await assertFails(post(x, X));
  await assertFails(post(b, A));
  await assertFails(post(b, B, {photoKey: `rooms/${R}/${A}/abcdEFGH1234.webp`}));
  await assertFails(post(b, B, {expireAt: exp(400)}), '보관 기간은 90일');
  await assertSucceeds(post(c, C, {kind: 'text', text: '오늘 하체?', photoKey: '', photoKind: ''}));
  await assertFails(getDocs(collection(x, 'rooms', R, 'posts')));
  // 보관 기간: 남의 글은 기한이 지나야만 지울 수 있다(TTL 대신 앱이 정리)
  await env.withSecurityRulesDisabled(async ctx => { const d = ctx.firestore(); await setDoc(doc(d, 'rooms', R, 'posts', 'oldPost'), {uid: B, kind: 'text', text: 'old', expireAt: Timestamp.fromDate(new Date(Date.now() - 864e5))}); await setDoc(doc(d, 'rooms', R, 'posts', 'newPost'), {uid: B, kind: 'text', text: 'new', expireAt: exp(80)}); });
  await assertFails(deleteDoc(doc(c, 'rooms', R, 'posts', 'newPost')));
  await assertFails(deleteDoc(doc(x, 'rooms', R, 'posts', 'oldPost')));
  await assertSucceeds(deleteDoc(doc(c, 'rooms', R, 'posts', 'oldPost')));
  await assertSucceeds(getDocs(collection(a, 'rooms', R, 'posts')));
  // 요약: 공개한 종류만 쓰고 읽는다(운동은 비공개)
  const share = (ctx, uid, kind) => setDoc(doc(ctx, 'rooms', R, 'shares', `${uid}_${kind}`), {uid, kind, name: uid, data: {kg: 70}, updatedAt: serverTimestamp()});
  await assertSucceeds(share(b, B, 'body'));
  await assertFails(share(b, B, 'work'));
  await assertFails(share(b, A, 'body'));
  await assertSucceeds(getDoc(doc(a, 'rooms', R, 'shares', `${B}_body`)));
  await assertFails(getDoc(doc(x, 'rooms', R, 'shares', `${B}_body`)));
  // 공개 범위: 혼자 못 바꿈. 요청 → 전원 동의 → done 일 때만
  await assertFails(updateDoc(doc(a, 'rooms', R), {scope: {body: false, meal: true, work: false}, updatedAt: serverTimestamp()}));
  const P1 = 'propBODYoff01';
  await assertSucceeds(setDoc(doc(a, 'rooms', R, 'proposals', P1), {kind: 'body', to: false, byUid: A, byName: '문', yes: [A], no: [], status: 'open', createdAt: serverTimestamp()}));
  await assertSucceeds(updateDoc(doc(b, 'rooms', R, 'proposals', P1), {yes: arrayUnion(B)}));
  // 아직 C가 안 함 → done 불가, 적용 불가
  await assertFails(updateDoc(doc(a, 'rooms', R, 'proposals', P1), {status: 'done'}));
  { const bt = writeBatch(a); bt.update(doc(a, 'rooms', R), {scope: {body: false, meal: true, work: false}, appliedProposal: P1, updatedAt: serverTimestamp()}); await assertFails(bt.commit()); }
  // C 동의 + 적용을 한 묶음으로
  { const bt = writeBatch(c); bt.update(doc(c, 'rooms', R, 'proposals', P1), {yes: [A, B, C], status: 'done'}); bt.update(doc(c, 'rooms', R), {scope: {body: false, meal: true, work: false}, appliedProposal: P1, updatedAt: serverTimestamp()}); await assertSucceeds(bt.commit()); }
  // 비공개가 되자 남의 수치 요약은 바로 못 읽음(본인은 읽고 지울 수 있음)
  await assertFails(getDoc(doc(a, 'rooms', R, 'shares', `${B}_body`)));
  await assertSucceeds(getDoc(doc(b, 'rooms', R, 'shares', `${B}_body`)));
  await assertSucceeds(deleteDoc(doc(b, 'rooms', R, 'shares', `${B}_body`)));
  // 요청한 것과 다른 종류까지 바꾸면 거절
  const P2 = 'propWORKon0002';
  await assertSucceeds(setDoc(doc(a, 'rooms', R, 'proposals', P2), {kind: 'work', to: true, byUid: A, byName: '문', yes: [A], no: [], status: 'open', createdAt: serverTimestamp()}));
  await assertSucceeds(updateDoc(doc(b, 'rooms', R, 'proposals', P2), {no: arrayUnion(B), status: 'rejected'}));
  await assertFails(updateDoc(doc(c, 'rooms', R, 'proposals', P2), {yes: arrayUnion(C)}));
  { const bt = writeBatch(a); bt.update(doc(a, 'rooms', R), {scope: {body: true, meal: true, work: true}, appliedProposal: P2, updatedAt: serverTimestamp()}); await assertFails(bt.commit()); }
  // 방장 넘기기: 방장만, 멤버에게만
  await assertFails(updateDoc(doc(b, 'rooms', R), {ownerUid: B, updatedAt: serverTimestamp()}));
  await assertFails(updateDoc(doc(a, 'rooms', R), {ownerUid: X, updatedAt: serverTimestamp()}));
  await assertSucceeds(updateDoc(doc(a, 'rooms', R), {ownerUid: B, updatedAt: serverTimestamp()}));
  // 나가기: 방장이 아니면 자기만 빠질 수 있다
  const left = (await getDoc(doc(a, 'rooms', R))).data();
  const names = {...left.memberNames}; delete names[C];
  await assertSucceeds(updateDoc(doc(c, 'rooms', R), {memberIds: left.memberIds.filter(u => u !== C), memberNames: names, updatedAt: serverTimestamp()}));
  await assertFails(getDoc(doc(c, 'rooms', R)));
  // 방 지우기: 방장 혼자 남았을 때만
  await assertFails(deleteDoc(doc(b, 'rooms', R)));
 } finally { await env.cleanup(); }
});
