import test from 'node:test';
import {readFile} from 'node:fs/promises';
import {initializeTestEnvironment, assertFails, assertSucceeds} from '@firebase/rules-unit-testing';
import {doc, setDoc, writeBatch, serverTimestamp} from 'firebase/firestore';

// 4.17.0 보안 2차: 카탈로그 요청은 하루 개수 기록과 짝으로만, 1씩, 하루 20건까지
const host = process.env.FIRESTORE_EMULATOR_HOST;
test('카탈로그 요청 하루 개수 제한', {skip: !host}, async () => {
  const rules = await readFile(new URL('../firestore.rules', import.meta.url), 'utf8');
  const [h, p] = host.split(':');
  const env = await initializeTestEnvironment({projectId: 'mylogue-quota-test', firestore: {host: h, port: Number(p), rules}});
  try {
    await env.withSecurityRulesDisabled(async c => { await setDoc(doc(c.firestore(), 'users', 'qa'), {uid: 'qa', email: 'qa@x.test', status: 'approved', consentAt: new Date(), createdAt: new Date(), updatedAt: new Date()}); });
    const db = env.authenticatedContext('qa', {email: 'qa@x.test'}).firestore();
    const day = Math.floor(Date.now() / 86400000);
    const req = {type: 'exercise', mode: 'manual', name: '새 운동', manufacturer: '', model: '', gymName: '', targetIds: [], note: '', servingQty: null, servingUnit: '', calories: null, carbs: null, protein: null, fat: null, requesterUid: 'qa', photoPath: '', wholePhotoDataUrl: '', nameplatePhotoDataUrl: '', status: 'pending', adminNote: '', createdAt: serverTimestamp(), updatedAt: serverTimestamp()};
    const send = (id, n, {quota = true, lastId = id, dayV = day} = {}) => { const b = writeBatch(db); b.set(doc(db, 'catalogRequests', id), req); if (quota) b.set(doc(db, 'users', 'qa', 'meta', 'requestQuota'), {day: dayV, n, lastId, updatedAt: serverTimestamp()}); return b.commit(); };
    await assertFails(send('r0', 1, {quota: false}));               // 개수 기록 없이 요청만
    await assertFails(send('r0', 1, {lastId: 'other'}));             // 다른 요청과 짝
    await assertFails(send('r0', 1, {dayV: day - 1}));               // 날짜 속이기
    await assertSucceeds(send('r1', 1));
    await assertFails(send('r2', 3));                                // 1씩만
    await assertFails(send('r2', 1));                                // 같은 날 처음으로 되돌리기
    for (let i = 2; i <= 20; i++) await assertSucceeds(send(`r${i}`, i));
    await assertFails(send('r21', 21));                              // 21번째
    await assertFails(setDoc(doc(db, 'users', 'qa', 'meta', 'requestQuota'), {day, n: 1, lastId: 'r1', updatedAt: serverTimestamp()})); // 이미 있는 요청으로 초기화
  } finally { await env.cleanup(); }
});
