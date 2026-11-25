import test from 'node:test';
import {readFile} from 'node:fs/promises';
import {initializeTestEnvironment, assertFails, assertSucceeds} from '@firebase/rules-unit-testing';
import {doc, setDoc, updateDoc, serverTimestamp, Timestamp} from 'firebase/firestore';

// 5.0.2 대표님: 관리자가 가입한 사람 중에서 코치 권한·프리미엄을 준다.
const host = process.env.FIRESTORE_EMULATOR_HOST;
const ADMIN = 'bulbnZbmC4PgH8tUAOjfPPLE7pA3';
test('5.0.2 관리자가 코치 권한·프리미엄을 준다', {skip: !host}, async () => {
  const rules = await readFile(new URL('../firestore.rules', import.meta.url), 'utf8');
  const [h, p] = host.split(':');
  const env = await initializeTestEnvironment({projectId: 'mylogue-coach-role-test', firestore: {host: h, port: Number(p), rules}});
  try {
    await env.withSecurityRulesDisabled(async c => { await setDoc(doc(c.firestore(), 'users', 'co1'), {uid: 'co1', email: 'co1@x.test', status: 'approved'}); });
    const admin = env.authenticatedContext(ADMIN, {email: 'studiohooje@gmail.com'}).firestore();
    const co = env.authenticatedContext('co1', {email: 'co1@x.test', email_verified: true}).firestore();
    const inv = () => setDoc(doc(co, 'invites', 'COCO2345'), {code: 'COCO2345', trainerUid: 'co1', trainerName: '코치', clientId: 'c1', expiresAt: Timestamp.fromDate(new Date(Date.now() + 864e5)), usedBy: '', createdAt: serverTimestamp()});
    await assertFails(inv(), '권한 전에는 코치 기능 불가');
    await assertFails(updateDoc(doc(co, 'users', 'co1'), {coach: true, coachBy: 'co1', coachAt: serverTimestamp(), updatedAt: serverTimestamp()}), '스스로 코치 불가');
    await assertFails(updateDoc(doc(co, 'users', 'co1'), {plan: 'plus', planBy: 'co1', planAt: serverTimestamp(), updatedAt: serverTimestamp()}), '스스로 프리미엄 불가');
    await assertSucceeds(updateDoc(doc(admin, 'users', 'co1'), {coach: true, coachBy: ADMIN, coachAt: serverTimestamp(), updatedAt: serverTimestamp()}));
    await assertSucceeds(updateDoc(doc(admin, 'users', 'co1'), {plan: 'plus', planBy: ADMIN, planAt: serverTimestamp(), updatedAt: serverTimestamp()}));
    await assertSucceeds(inv(), '코치 권한 뒤에는 코치 기능');
  } finally { await env.cleanup(); }
});
