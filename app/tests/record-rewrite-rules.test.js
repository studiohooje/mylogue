import test from 'node:test';import assert from 'node:assert/strict';import {readFile} from 'node:fs/promises';
import {initializeTestEnvironment,assertSucceeds,assertFails} from '@firebase/rules-unit-testing';
import {doc,setDoc,serverTimestamp,runTransaction} from 'firebase/firestore';
const host=process.env.FIRESTORE_EMULATOR_HOST;
test('4.1.1 지워진 기록 자리를 다음 revision으로 다시 쓸 수 있다(본인만)',{skip:!host},async()=>{
 const rules=await readFile(new URL('../firestore.rules',import.meta.url),'utf8');const [h,p]=host.split(':');
 const env=await initializeTestEnvironment({projectId:'mylogue-rewrite-test',firestore:{host:h,port:Number(p),rules}});
 try{const me=env.authenticatedContext('bulbnZbmC4PgH8tUAOjfPPLE7pA3',{email:'studiohooje@gmail.com'}).firestore();
  const ref=doc(me,'users','bulbnZbmC4PgH8tUAOjfPPLE7pA3','records','meals~ai-ai-x-0');
  await assertSucceeds(setDoc(ref,{revision:1,payload:'{"a":1}',updatedAt:serverTimestamp()}));
  await assertSucceeds(setDoc(ref,{revision:2,payload:null,updatedAt:serverTimestamp()}));
  await assertSucceeds(runTransaction(me,async tx=>{const s=await tx.get(ref);tx.set(ref,{revision:(s.data().revision||1)+1,payload:'{"a":2}',updatedAt:serverTimestamp()})}));
  await assertFails(setDoc(ref,{revision:1,payload:'{"a":3}',updatedAt:serverTimestamp()}));
 }finally{await env.cleanup()}});
