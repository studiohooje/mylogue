import test from 'node:test';
import {readFile} from 'node:fs/promises';
import {initializeTestEnvironment, assertFails, assertSucceeds} from '@firebase/rules-unit-testing';
import {doc, setDoc, serverTimestamp} from 'firebase/firestore';

// 5.0.1 카카오·이메일 가입: 카카오(커스텀 토큰)는 이메일 없이 신청, 이메일(비밀번호) 가입은 메일 인증 뒤에만 신청.
const host = process.env.FIRESTORE_EMULATOR_HOST;
test('5.0.1 카카오·이메일 가입 신청 규칙', {skip: !host}, async () => {
  const rules = await readFile(new URL('../firestore.rules', import.meta.url), 'utf8');
  const [h, p] = host.split(':');
  const env = await initializeTestEnvironment({projectId: 'mylogue-auth-rules-test', firestore: {host: h, port: Number(p), rules}});
  try {
    const apply = (uid, token, email = '', extra = {}) => setDoc(doc(env.authenticatedContext(uid, token).firestore(), 'users', uid), {uid, email, status: 'pending', consentAt: serverTimestamp(), createdAt: serverTimestamp(), updatedAt: serverTimestamp(), ...extra});
    await assertSucceeds(apply('kakao:123', {firebase: {sign_in_provider: 'custom'}, provider: 'kakao'}, '', {name: '문대표'}));
    await assertFails(apply('kakao:124', {firebase: {sign_in_provider: 'custom'}}, 'fake@x.test'), '토큰에 없는 이메일은 못 넣음');
    await assertFails(apply('pw-1', {email: 'a@x.test', email_verified: false, firebase: {sign_in_provider: 'password'}}, 'a@x.test'), '메일 인증 전');
    await assertSucceeds(apply('pw-2', {email: 'b@x.test', email_verified: true, firebase: {sign_in_provider: 'password'}}, 'b@x.test'));
    await assertSucceeds(apply('g-1', {email: 'c@x.test', email_verified: true, firebase: {sign_in_provider: 'google.com'}}, 'c@x.test'));
    await assertFails(apply('g-2', {email: 'd@x.test', email_verified: true, firebase: {sign_in_provider: 'google.com'}}, 'd@x.test', {name: 'x'.repeat(31)}));
  } finally { await env.cleanup(); }
});
