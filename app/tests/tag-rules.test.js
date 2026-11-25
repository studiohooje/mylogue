import test from 'node:test';
import {readFile} from 'node:fs/promises';
import {initializeTestEnvironment, assertFails, assertSucceeds} from '@firebase/rules-unit-testing';
import {doc, getDoc, setDoc, deleteDoc, writeBatch, serverTimestamp, Timestamp, getDocs, collection, query, where} from 'firebase/firestore';

// 5.0.1 마이태그: 중복 불가, 언제든 바꾸기, 바꾸면 이전 태그는 풀려 다른 사람이 가져갈 수 있다. 태그로 방 초대.
const host = process.env.FIRESTORE_EMULATOR_HOST;
test('5.0.1 마이태그·태그 초대 규칙', {skip: !host}, async () => {
  const rules = await readFile(new URL('../firestore.rules', import.meta.url), 'utf8');
  const [h, p] = host.split(':');
  const env = await initializeTestEnvironment({projectId: 'mylogue-tag-rules-test', firestore: {host: h, port: Number(p), rules}});
  try {
    await env.withSecurityRulesDisabled(async ctx => { for (const u of ['ta', 'tb', 'tc']) await setDoc(doc(ctx.firestore(), 'users', u), {status: 'approved'}); });
    const db = u => env.authenticatedContext(u, {email: `${u}@x.test`, email_verified: true}).firestore();
    const a = db('ta'), b = db('tb'), c = db('tc');
    const claim = async (ctx, uid, tag, old = '') => { const bt = writeBatch(ctx); bt.set(doc(ctx, 'tags', tag.toLowerCase()), {uid, tag, updatedAt: serverTimestamp()}); bt.set(doc(ctx, 'profiles', uid), {tag, updatedAt: serverTimestamp()}); if (old && old.toLowerCase() !== tag.toLowerCase()) bt.delete(doc(ctx, 'tags', old.toLowerCase())); return bt.commit(); };
    await assertSucceeds(claim(a, 'ta', 'Moon'));
    await assertFails(claim(b, 'tb', 'moon'), '대소문자만 달라도 중복');
    await assertFails(claim(b, 'tb', 'MOON'));
    await assertFails(claim(b, 'tb', 'a'), '2자 이상');
    await assertFails(claim(b, 'tb', '관리자'), '예약어');
    await assertFails(claim(b, 'tb', 'mo on'), '띄어쓰기 불가');
    await assertSucceeds(claim(b, 'tb', '지훈_88'));
    // 남의 태그를 지울 수 없다
    await assertFails(deleteDoc(doc(b, 'tags', 'moon')));
    // 이전 태그를 놓지 않고 바꿀 수 없다(하나만 가진다)
    { const bt = writeBatch(a); bt.set(doc(a, 'tags', 'sun'), {uid: 'ta', tag: 'Sun', updatedAt: serverTimestamp()}); bt.set(doc(a, 'profiles', 'ta'), {tag: 'Sun', updatedAt: serverTimestamp()}); await assertFails(bt.commit()); }
    // 바꾸면 Moon이 풀리고 다른 사람이 가져간다
    await assertSucceeds(claim(a, 'ta', 'Sun', 'Moon'));
    await assertSucceeds(claim(c, 'tc', 'Moon'));
    await assertSucceeds(claim(c, 'tc', 'MOON', 'Moon'), '대소문자만 바꾸기');
    await assertFails(setDoc(doc(b, 'tags', 'moon'), {uid: 'tb', tag: 'moon', updatedAt: serverTimestamp()}), '남의 태그 덮어쓰기 불가');
    await assertSucceeds(getDoc(doc(b, 'profiles', 'tc')));
    // 태그로 방 초대: 방 멤버 + 유효한 초대 코드
    const R = 'roomTAGTAGTAG01';
    await env.withSecurityRulesDisabled(async ctx => { const d = ctx.firestore(); await setDoc(doc(d, 'rooms', R), {name: '방', type: 'friends', ownerUid: 'ta', memberIds: ['ta'], memberNames: {ta: 'Sun'}, scope: {body: true, meal: true, work: true}, joinCode: '', appliedProposal: ''}); await setDoc(doc(d, 'mateInvites', 'CODE2345'), {code: 'CODE2345', roomId: R, expiresAt: Timestamp.fromDate(new Date(Date.now() + 864e5))}); });
    const direct = (ctx, from, to, extra = {}) => setDoc(doc(ctx, 'mateDirect', `${to}_${R}`), {toUid: to, fromUid: from, fromTag: 'Sun', roomId: R, roomName: '방', code: 'CODE2345', createdAt: serverTimestamp(), ...extra});
    await assertFails(direct(b, 'tb', 'tc'), '방 멤버가 아니면 못 보냄');
    await assertSucceeds(direct(a, 'ta', 'tc'));
    await assertSucceeds(getDocs(query(collection(c, 'mateDirect'), where('toUid', '==', 'tc'))));
    await assertFails(getDoc(doc(b, 'mateDirect', `tc_${R}`)), '남의 초대는 못 봄');
    await assertSucceeds(deleteDoc(doc(c, 'mateDirect', `tc_${R}`)));
  } finally { await env.cleanup(); }
});
