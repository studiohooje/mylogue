import test from 'node:test';
import {readFile} from 'node:fs/promises';
import {initializeTestEnvironment, assertFails, assertSucceeds} from '@firebase/rules-unit-testing';
import {doc,setDoc,updateDoc,serverTimestamp} from 'firebase/firestore';

// 4.17.0 플러스 전환 규칙: 관리자만 plan을 바꾸고, 본인·다른 사용자는 못 바꾼다. 승인 상태와 한 번에 섞어 바꿀 수 없다.
const adminUid='bulbnZbmC4PgH8tUAOjfPPLE7pA3',memberUid='plan-member',otherUid='plan-other';
const host=process.env.FIRESTORE_EMULATOR_HOST;
test('plan은 관리자만 바꾼다', {skip:!host}, async()=>{
  const rules=await readFile(new URL('../firestore.rules',import.meta.url),'utf8');
  const [h,p]=host.split(':');
  const env=await initializeTestEnvironment({projectId:'mylogue-plan-rules-test',firestore:{host:h,port:Number(p),rules}});
  try{
    await env.withSecurityRulesDisabled(async c=>{await setDoc(doc(c.firestore(),'users',memberUid),{uid:memberUid,email:'m@example.test',status:'approved',consentAt:new Date(),createdAt:new Date(),updatedAt:new Date()})});
    const admin=env.authenticatedContext(adminUid,{email:'studiohooje@gmail.com'}).firestore();
    const member=env.authenticatedContext(memberUid,{email:'m@example.test'}).firestore();
    const other=env.authenticatedContext(otherUid,{email:'o@example.test'}).firestore();
    const ok={plan:'plus',planBy:adminUid,planAt:serverTimestamp(),updatedAt:serverTimestamp()};
    await assertFails(updateDoc(doc(member,'users',memberUid),{plan:'plus',planBy:memberUid,planAt:serverTimestamp(),updatedAt:serverTimestamp()}));
    await assertFails(updateDoc(doc(other,'users',memberUid),{plan:'plus',planBy:otherUid,planAt:serverTimestamp(),updatedAt:serverTimestamp()}));
    await assertFails(updateDoc(doc(admin,'users',memberUid),{...ok,plan:'gold'}));
    await assertFails(updateDoc(doc(admin,'users',memberUid),{...ok,planBy:otherUid}));
    await assertFails(updateDoc(doc(admin,'users',memberUid),{...ok,status:'rejected'}));
    await assertSucceeds(updateDoc(doc(admin,'users',memberUid),ok));
    await assertSucceeds(updateDoc(doc(admin,'users',memberUid),{...ok,plan:'free'}));
  }finally{await env.cleanup()}
});
