import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {initializeTestEnvironment, assertFails, assertSucceeds} from '@firebase/rules-unit-testing';
import {collection,doc,getDoc,getDocs,setDoc,updateDoc,serverTimestamp,runTransaction} from 'firebase/firestore';

const projectId='mylogue-approval-rules-test';
const adminUid='bulbnZbmC4PgH8tUAOjfPPLE7pA3';
const memberUid='approved-member';
const pendingUid='pending-member';
const otherUid='other-member';
const host=process.env.FIRESTORE_EMULATOR_HOST;

test('approval gates server health records and shared catalogs', {skip:!host}, async()=>{
  const rules=await readFile(new URL('../firestore.rules',import.meta.url),'utf8');
  const [emulatorHost,portText]=host.split(':');
  const env=await initializeTestEnvironment({projectId,firestore:{host:emulatorHost,port:Number(portText),rules}});
  try{
    const admin=env.authenticatedContext(adminUid,{email:'studiohooje@gmail.com'}).firestore();
    const pending=env.authenticatedContext(pendingUid,{email:'pending@example.test'}).firestore();
    const member=env.authenticatedContext(memberUid,{email:'approved@example.test'}).firestore();
    const other=env.authenticatedContext(otherUid,{email:'other@example.test'}).firestore();
    const guest=env.unauthenticatedContext().firestore();
    const profile=(db,uid)=>doc(db,'users',uid);
    const record=(db,uid)=>doc(db,'users',uid,'records','settings');
    const catalog=db=>doc(db,'catalog','foods','items','test-food');

    await assertFails(getDoc(profile(guest,pendingUid)));
    await assertSucceeds(setDoc(profile(pending,pendingUid),{
      uid:pendingUid,email:'pending@example.test',status:'pending',
      consentAt:serverTimestamp(),createdAt:serverTimestamp(),updatedAt:serverTimestamp()
    }));
    await assertFails(setDoc(profile(other,otherUid),{
      uid:otherUid,email:'forged@example.test',status:'approved',
      consentAt:serverTimestamp(),createdAt:serverTimestamp(),updatedAt:serverTimestamp()
    }));
    await assertSucceeds(getDoc(profile(pending,pendingUid)));
    await assertFails(getDocs(collection(pending,'users')));
    await assertFails(getDoc(record(pending,pendingUid)));
    await assertFails(setDoc(record(pending,pendingUid),{revision:1,payload:'{}',updatedAt:serverTimestamp()}));
    await assertFails(getDoc(catalog(pending)));
    await assertFails(getDocs(collection(pending,'catalogRequests')));

    await assertSucceeds(getDocs(collection(admin,'users')));
    await assertSucceeds(updateDoc(profile(admin,pendingUid),{
      status:'approved',reviewerUid:adminUid,reviewedAt:serverTimestamp(),updatedAt:serverTimestamp()
    }));
    await assertSucceeds(setDoc(profile(member,memberUid),{
      uid:memberUid,email:'approved@example.test',status:'pending',
      consentAt:serverTimestamp(),createdAt:serverTimestamp(),updatedAt:serverTimestamp()
    }));
    await assertSucceeds(updateDoc(profile(admin,memberUid),{
      status:'approved',reviewerUid:adminUid,reviewedAt:serverTimestamp(),updatedAt:serverTimestamp()
    }));
    await assertSucceeds(setDoc(record(pending,pendingUid),{revision:1,payload:'{}',updatedAt:serverTimestamp()}));
    await assertSucceeds(getDoc(record(pending,pendingUid)));
    await assertFails(getDoc(record(member,pendingUid)));
    await assertFails(getDoc(record(admin,pendingUid)));
    const requestId='machine-photo-request';
    const requestRef=(db)=>doc(db,'catalogRequests',requestId);
    const image='data:image/jpeg;base64,AA==';
    const requestData={type:'machine',mode:'photo',name:'레그프레스',manufacturer:'예시 제조사',model:'LP-1',gymName:'예시 지점',targetIds:[],note:'',servingQty:null,servingUnit:'',calories:null,carbs:null,protein:null,fat:null,requesterUid:memberUid,photoPath:'',wholePhotoDataUrl:image,nameplatePhotoDataUrl:image,status:'pending',adminNote:'',createdAt:serverTimestamp(),updatedAt:serverTimestamp()};
    await assertFails(setDoc(requestRef(member),{...requestData,nameplatePhotoDataUrl:''}));
    await assertFails(setDoc(requestRef(member),{...requestData,nameplatePhotoDataUrl:'data:text/html;base64,AA=='}));
    await assertSucceeds(setDoc(requestRef(member),requestData));
    await assertSucceeds(getDoc(requestRef(member)));
    await assertSucceeds(getDoc(requestRef(admin)));
    await assertFails(getDoc(requestRef(pending)));
    await assertFails(getDoc(requestRef(other)));
    const draftId='draft-account-boundary';
    const draft=(db,uid)=>doc(db,'users',uid,'aiDrafts',draftId);
    const draftData={id:draftId,requestId:draftId,type:'meal',status:'pending',schemaVersion:1,sourceModel:'test',originalUtterance:'식사 기록',parsedData:{items:[]},uncertainty:{},evidence:{},createdAt:serverTimestamp(),updatedAt:serverTimestamp()};
    await assertSucceeds(setDoc(draft(member,memberUid),draftData));
    await assertSucceeds(setDoc(draft(pending,pendingUid),draftData));
    await assertSucceeds(getDoc(draft(pending,pendingUid)));
    await assertFails(getDoc(draft(member,pendingUid)));
    await assertFails(getDoc(draft(pending,memberUid)));
    await assertFails(getDoc(draft(admin,pendingUid)));
    await assertFails(setDoc(draft(pending,pendingUid),{...draftData,status:'confirmed'}));
    await assertSucceeds(updateDoc(draft(pending,pendingUid),{status:'confirmed',reviewedData:{items:[]},finalRecordIds:['meal-1'],reviewedAt:serverTimestamp(),updatedAt:serverTimestamp()}));
    await assertFails(updateDoc(draft(pending,pendingUid),{status:'rejected',reviewedAt:serverTimestamp(),updatedAt:serverTimestamp()}));
    const transactionDraft='draft-transaction';
    const aiRef=doc(member,'users',memberUid,'aiDrafts',transactionDraft);
    const mealRef=doc(member,'users',memberUid,'records','meals~ai-draft-transaction-0');
    await assertSucceeds(setDoc(aiRef,{...draftData,id:transactionDraft,requestId:transactionDraft}));
    await assertSucceeds(runTransaction(member,async tx=>{
      const current=await tx.get(aiRef),existing=await tx.get(mealRef);
      assert.equal(current.data().status,'pending');assert.equal(existing.exists(),false);
      tx.set(mealRef,{revision:1,payload:'{"id":"ai-draft-transaction-0"}',updatedAt:serverTimestamp()});
      tx.update(aiRef,{status:'confirmed',reviewedData:{items:[]},finalRecordIds:['ai-draft-transaction-0'],reviewedAt:serverTimestamp(),updatedAt:serverTimestamp()});
    }));
    assert.equal((await getDoc(aiRef)).data().status,'confirmed');
    assert.equal((await getDoc(mealRef)).exists(),true);
    await assertFails(updateDoc(profile(pending,pendingUid),{status:'approved'}));

    await assertSucceeds(updateDoc(profile(admin,pendingUid),{
      status:'rejected',reviewerUid:adminUid,reviewedAt:serverTimestamp(),updatedAt:serverTimestamp()
    }));
    await assertFails(getDoc(record(pending,pendingUid)));
    await assertFails(setDoc(record(pending,pendingUid),{revision:2,payload:'{}',updatedAt:serverTimestamp()}));
    assert.equal((await getDoc(profile(pending,pendingUid))).data().status,'rejected');
  }finally{await env.cleanup()}
});

test('email admin (verified Google email) can list and review; unverified or other emails cannot', {skip:!host}, async()=>{
  const rules=await readFile(new URL('../firestore.rules',import.meta.url),'utf8');
  const [emulatorHost,portText]=host.split(':');
  const env=await initializeTestEnvironment({projectId:projectId+'-email',firestore:{host:emulatorHost,port:Number(portText),rules}});
  try{
    const emailAdmin=env.authenticatedContext('mooncurvv-uid',{email:'mooncurvv@gmail.com',email_verified:true}).firestore();
    const unverified=env.authenticatedContext('fake-uid',{email:'mooncurvv@gmail.com',email_verified:false}).firestore();
    const pending=env.authenticatedContext('p2',{email:'p2@example.test'}).firestore();
    await assertSucceeds(setDoc(doc(pending,'users','p2'),{uid:'p2',email:'p2@example.test',status:'pending',consentAt:serverTimestamp(),createdAt:serverTimestamp(),updatedAt:serverTimestamp()}));
    await assertSucceeds(getDocs(collection(emailAdmin,'users')));
    await assertFails(getDocs(collection(unverified,'users')));
    await assertFails(updateDoc(doc(unverified,'users','p2'),{status:'approved',reviewerUid:'fake-uid',reviewedAt:serverTimestamp(),updatedAt:serverTimestamp()}));
    await assertSucceeds(updateDoc(doc(emailAdmin,'users','p2'),{status:'approved',reviewerUid:'mooncurvv-uid',reviewedAt:serverTimestamp(),updatedAt:serverTimestamp()}));
  }finally{await env.cleanup()}
});

test('popularity counts: approved users can only add 1 at a time, no personal fields, no delete', {skip:!host}, async()=>{
  const rules=await readFile(new URL('../firestore.rules',import.meta.url),'utf8');
  const [emulatorHost,portText]=host.split(':');
  const env=await initializeTestEnvironment({projectId:projectId+'-pop',firestore:{host:emulatorHost,port:Number(portText),rules}});
  try{
    await env.withSecurityRulesDisabled(async ctx=>{await setDoc(doc(ctx.firestore(),'users','m1'),{uid:'m1',email:'m1@x',status:'approved'});await setDoc(doc(ctx.firestore(),'users','p1'),{uid:'p1',email:'p1@x',status:'pending'})});
    const member=env.authenticatedContext('m1',{email:'m1@x'}).firestore();
    const pending=env.authenticatedContext('p1',{email:'p1@x'}).firestore();
    const ref=db=>doc(db,'popularity','foods','items','닭가슴살');
    await assertFails(setDoc(ref(pending),{name:'닭가슴살',count:1,updatedAt:serverTimestamp()}));
    await assertFails(setDoc(ref(member),{name:'닭가슴살',count:5,updatedAt:serverTimestamp()}));
    await assertFails(setDoc(ref(member),{name:'닭가슴살',count:1,uid:'m1',updatedAt:serverTimestamp()}));
    await assertSucceeds(setDoc(ref(member),{name:'닭가슴살',count:1,updatedAt:serverTimestamp()}));
    await assertSucceeds(updateDoc(ref(member),{count:2,updatedAt:serverTimestamp()}));
    await assertFails(updateDoc(ref(member),{count:10,updatedAt:serverTimestamp()}));
    await assertSucceeds(getDoc(ref(member)));
    await assertFails(getDoc(ref(pending)));
    await assertFails(setDoc(doc(member,'popularity','secrets','items','x'),{name:'x',count:1,updatedAt:serverTimestamp()}));
  }finally{await env.cleanup()}
});

test('AI 입력(붙여넣기): 승인된 본인만 같은 형식으로 검토함 초안을 만들고, 같은 ID 재생성은 막힌다', {skip:!host}, async()=>{
  const {parsePaste}=await import('../ai-paste.js');
  const rules=await readFile(new URL('../firestore.rules',import.meta.url),'utf8');
  const [emulatorHost,portText]=host.split(':');
  const env=await initializeTestEnvironment({projectId:projectId+'-paste',firestore:{host:emulatorHost,port:Number(portText),rules}});
  try{
    await env.withSecurityRulesDisabled(async ctx=>{await setDoc(doc(ctx.firestore(),'users','m1'),{uid:'m1',email:'m1@x',status:'approved'});await setDoc(doc(ctx.firestore(),'users','p1'),{uid:'p1',email:'p1@x',status:'pending'})});
    const member=env.authenticatedContext('m1',{email:'m1@x'}).firestore();
    const pending=env.authenticatedContext('p1',{email:'p1@x'}).firestore();
    const drafts=parsePaste('{"mylogue":1,"said":"점심 제육덮밥, 하체, 체중 72.4","records":[{"type":"meal","date":"2026-11-21","time":"12:30","items":[{"name":"제육덮밥","qty":1,"unit":"그릇","kcal":850,"carbs":105,"protein":35,"fat":28,"estimate":{"kcal":[700,1000],"basis":"추정"}}]},{"type":"workout","date":"2026-11-21","exercises":[{"name":"레그 프레스","machine":"45도 레그프레스","sets":3,"weight":100,"reps":12}]},{"type":"body","date":"2026-11-21","weight":72.4}]}');
    // ai-drafts.js addPastedDrafts와 같은 방식(트랜잭션: 없으면 만들기)
    const add=async(db,uid,d,id)=>{const ref=doc(db,'users',uid,'aiDrafts',id);return runTransaction(db,async tx=>{const snap=await tx.get(ref);if(snap.exists())return false;tx.set(ref,{id,requestId:id,type:d.type,status:'pending',schemaVersion:1,sourceModel:d.sourceModel,originalUtterance:d.originalUtterance,parsedData:d.parsedData,uncertainty:d.uncertainty,evidence:d.evidence,createdAt:serverTimestamp(),updatedAt:serverTimestamp()});return true})};
    for(const [i,d] of drafts.entries())assert.equal(await assertSucceeds(add(member,'m1',d,`p-test${i}`)),true);
    assert.equal(await add(member,'m1',drafts[0],'p-test0'),false);
    await assertFails(add(pending,'p1',drafts[0],'p-x'));
    await assertFails(add(member,'p1',drafts[0],'p-y'));
    const list=await getDocs(collection(member,'users','m1','aiDrafts'));
    assert.equal(list.size,3);
  }finally{await env.cleanup()}
});
