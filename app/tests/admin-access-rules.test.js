import test from 'node:test';import assert from 'node:assert/strict';import {readFile} from 'node:fs/promises';
import {initializeTestEnvironment,assertSucceeds,assertFails} from '@firebase/rules-unit-testing';
import {doc,setDoc,getDoc,getDocs,collection,writeBatch,serverTimestamp,updateDoc,deleteDoc} from 'firebase/firestore';
const host=process.env.FIRESTORE_EMULATOR_HOST;
const ADMIN='bulbnZbmC4PgH8tUAOjfPPLE7pA3';
// 4.15.0 관리로그: 관리자 전체 열람, 기록을 남긴 수정만, 최근 로그인 60분, 일반 회원은 남의 기록 불가
test('관리로그 보안 규칙',{skip:!host},async()=>{
 const rules=await readFile(new URL('../firestore.rules',import.meta.url),'utf8');const [h,p]=host.split(':');
 const env=await initializeTestEnvironment({projectId:'mylogue-admin-access-test',firestore:{host:h,port:Number(p),rules}});
 const now=Math.floor(Date.now()/1000);
 try{
  await env.withSecurityRulesDisabled(async ctx=>{const f=ctx.firestore();
   await setDoc(doc(f,'users','u1'),{uid:'u1',email:'u1@x.com',status:'approved'});
   await setDoc(doc(f,'users','u1','records','meals~m1'),{revision:1,payload:'{"id":"m1"}',updatedAt:new Date()});});
  const admin=env.authenticatedContext(ADMIN,{email:'studiohooje@gmail.com',auth_time:now}).firestore();
  const staleAdmin=env.authenticatedContext(ADMIN,{email:'studiohooje@gmail.com',auth_time:now-7200}).firestore();
  const other=env.authenticatedContext('u2',{email:'u2@x.com',auth_time:now}).firestore();
  // 열람
  await assertSucceeds(getDoc(doc(admin,'users','u1','records','meals~m1')));
  await assertSucceeds(getDocs(collection(admin,'users','u1','records')));
  await assertFails(getDoc(doc(other,'users','u1','records','meals~m1')));
  // 기록 없이 수정 → 거부
  await assertFails(setDoc(doc(admin,'users','u1','records','meals~m1'),{revision:2,payload:'{"id":"m1","x":1}',updatedAt:serverTimestamp()}));
  // 기록과 함께 수정 → 허용
  const log=(fs,id,rev,extra={})=>({adminUid:ADMIN,adminEmail:'studiohooje@gmail.com',action:'update',recordId:id,revision:rev,reason:'문의 확인',before:'{"id":"m1"}',after:'{"id":"m1","x":1}',at:serverTimestamp(),...extra});
  let b=writeBatch(admin);b.set(doc(admin,'users','u1','accessLog','meals~m1__r2'),log(admin,'meals~m1',2));b.set(doc(admin,'users','u1','records','meals~m1'),{revision:2,payload:'{"id":"m1","x":1}',updatedAt:serverTimestamp()});
  await assertSucceeds(b.commit());
  // 오래된 로그인 → 거부
  b=writeBatch(staleAdmin);b.set(doc(staleAdmin,'users','u1','accessLog','meals~m1__r3'),log(staleAdmin,'meals~m1',3));b.set(doc(staleAdmin,'users','u1','records','meals~m1'),{revision:3,payload:null,updatedAt:serverTimestamp()});
  await assertFails(b.commit());
  // 리비전 건너뛰기 → 거부
  b=writeBatch(admin);b.set(doc(admin,'users','u1','accessLog','meals~m1__r5'),log(admin,'meals~m1',5));b.set(doc(admin,'users','u1','records','meals~m1'),{revision:5,payload:null,updatedAt:serverTimestamp()});
  await assertFails(b.commit());
  // 새 기록 추가(리비전 1) → 허용
  b=writeBatch(admin);b.set(doc(admin,'users','u1','accessLog','body~b1__r1'),log(admin,'body~b1',1,{action:'create',before:null,after:'{"id":"b1"}'}));b.set(doc(admin,'users','u1','records','body~b1'),{revision:1,payload:'{"id":"b1"}',updatedAt:serverTimestamp()});
  await assertSucceeds(b.commit());
  // 접근 기록 내용이 실제 수정과 다르면(다른 값) 거부
  b=writeBatch(admin);b.set(doc(admin,'users','u1','accessLog','meals~m1__r3'),log(admin,'meals~m1',3,{after:'{"id":"m1","fake":1}'}));b.set(doc(admin,'users','u1','records','meals~m1'),{revision:3,payload:'{"id":"m1","real":1}',updatedAt:serverTimestamp()});
  await assertFails(b.commit());
  // 관리자 이메일을 꾸며 적으면 거부
  await assertFails(setDoc(doc(admin,'users','u1','accessLog','view_x'),{adminUid:ADMIN,adminEmail:'someone@else.com',action:'view',reason:'x',at:serverTimestamp()}));
  // 접근 기록은 고치거나 지울 수 없음(관리자도), 본인은 읽기·지우기 가능, 남은 못 읽음
  await assertFails(updateDoc(doc(admin,'users','u1','accessLog','meals~m1__r2'),{reason:'x'}));
  await assertFails(deleteDoc(doc(admin,'users','u1','accessLog','meals~m1__r2')));
  await assertFails(getDoc(doc(other,'users','u1','accessLog','meals~m1__r2')));
  const owner=env.authenticatedContext('u1',{email:'u1@x.com',auth_time:now}).firestore();
  await assertSucceeds(getDoc(doc(owner,'users','u1','accessLog','meals~m1__r2')));
  // 일반 회원이 접근 기록을 꾸며 남의 기록을 고치는 것 → 거부
  b=writeBatch(other);b.set(doc(other,'users','u1','accessLog','meals~m1__r3'),log(other,'meals~m1',3,{adminUid:'u2'}));b.set(doc(other,'users','u1','records','meals~m1'),{revision:3,payload:null,updatedAt:serverTimestamp()});
  await assertFails(b.commit());
  // 본인 동기화는 그대로
  await assertSucceeds(setDoc(doc(owner,'users','u1','records','meals~m1'),{revision:3,payload:'{"id":"m1","y":2}',updatedAt:serverTimestamp()}));
 }finally{await env.cleanup()}});
