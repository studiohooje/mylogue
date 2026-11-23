import test from 'node:test';
import {readFile} from 'node:fs/promises';
import {initializeTestEnvironment, assertFails, assertSucceeds} from '@firebase/rules-unit-testing';
import {doc,setDoc,getDoc,deleteDoc,serverTimestamp} from 'firebase/firestore';

// 4.17.0 동의 기록(계정 단위): 본인만 읽고 쓰고, 정해진 칸·크기만. 승인 전 계정도 쓸 수 있다.
const me='consent-me',other='consent-other';
const host=process.env.FIRESTORE_EMULATOR_HOST;
test('동의 기록은 본인만, 칸 제한', {skip:!host}, async()=>{
  const rules=await readFile(new URL('../firestore.rules',import.meta.url),'utf8');
  const [h,p]=host.split(':');
  const env=await initializeTestEnvironment({projectId:'mylogue-consent-rules-test',firestore:{host:h,port:Number(p),rules}});
  try{
    const mine=env.authenticatedContext(me,{email:'me@example.test'}).firestore();
    const theirs=env.authenticatedContext(other,{email:'o@example.test'}).firestore();
    const anon=env.unauthenticatedContext().firestore();
    const ok={version:'2026-11-23b',items:{age:true,terms:true,privacy:true,health:true},at:serverTimestamp()};
    await assertSucceeds(setDoc(doc(mine,'users',me,'meta','consent'),ok));
    await assertSucceeds(getDoc(doc(mine,'users',me,'meta','consent')));
    await assertFails(getDoc(doc(theirs,'users',me,'meta','consent')));
    await assertFails(getDoc(doc(anon,'users',me,'meta','consent')));
    await assertFails(setDoc(doc(theirs,'users',me,'meta','consent'),ok));
    await assertFails(setDoc(doc(mine,'users',me,'meta','other'),ok));
    await assertFails(setDoc(doc(mine,'users',me,'meta','consent'),{...ok,extra:1}));
    await assertFails(setDoc(doc(mine,'users',me,'meta','consent'),{...ok,at:new Date('2020-01-01')}));
    await assertFails(setDoc(doc(mine,'users',me,'meta','consent'),{...ok,version:'x'.repeat(41)}));
    await assertSucceeds(deleteDoc(doc(mine,'users',me,'meta','consent')));
  }finally{await env.cleanup()}
});
