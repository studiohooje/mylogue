import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {initializeTestEnvironment, assertFails, assertSucceeds} from '@firebase/rules-unit-testing';
import {collection,doc,getDoc,getDocs,setDoc,updateDoc,serverTimestamp,runTransaction,writeBatch,Timestamp,query,where} from 'firebase/firestore';

const host=process.env.FIRESTORE_EMULATOR_HOST;
const A='bulbnZbmC4PgH8tUAOjfPPLE7pA3', B='moon-uid', C='friend-uid';
test('4.0.0 코치 모드 규칙: 마스터끼리만, 연동·범위·초안·회신', {skip:!host}, async()=>{
 const rules=await readFile(new URL('../firestore.rules',import.meta.url),'utf8');
 const [h,p]=host.split(':');
 const env=await initializeTestEnvironment({projectId:'mylogue-coach-rules-test',firestore:{host:h,port:Number(p),rules}});
 try{
  const a=env.authenticatedContext(A,{email:'studiohooje@gmail.com'}).firestore();
  const b=env.authenticatedContext(B,{email:'mooncurvv@gmail.com',email_verified:true}).firestore();
  const c=env.authenticatedContext(C,{email:'friend@example.test',email_verified:true}).firestore();
  const exp=()=>Timestamp.fromDate(new Date(Date.now()+7*864e5));
  const inv=(db,code,uid)=>setDoc(doc(db,'invites',code),{code,trainerUid:uid,trainerName:'코치',clientId:'c1',expiresAt:exp(),usedBy:'',createdAt:serverTimestamp()});
  // 다른 계정은 흔적도 없이 막힌다
  await assertFails(inv(c,'CCCC2222',C));
  await assertFails(inv(a,'BAD',A));
  await assertFails(setDoc(doc(a,'invites','LONG2222'),{code:'LONG2222',trainerUid:A,trainerName:'코치',clientId:'c1',expiresAt:Timestamp.fromDate(new Date(Date.now()+30*864e5)),usedBy:'',createdAt:serverTimestamp()}));
  await assertSucceeds(inv(a,'ABCD2345',A));
  await assertFails(getDoc(doc(c,'invites','ABCD2345')));
  await assertSucceeds(getDoc(doc(b,'invites','ABCD2345')));
  // 회원(B)이 초대 사용 + 연동 생성을 한 묶음으로
  const linkId=`${A}_${B}`;
  const linkData=(extra={})=>({trainerUid:A,memberUid:B,trainerName:'코치',memberName:'문',clientId:'c1',inviteCode:'ABCD2345',status:'active',scope:{sessions:true,workouts:false,diet:false,body:false},shared:{},pt:{},schedule:[],consentAt:serverTimestamp(),warnedMemberAt:serverTimestamp(),createdAt:serverTimestamp(),updatedAt:serverTimestamp(),...extra});
  // 초대 사용 없이 연동만 만들 수 없다
  await assertFails(setDoc(doc(b,'links',linkId),linkData()));
  const bat=writeBatch(b);bat.update(doc(b,'invites','ABCD2345'),{usedBy:B});bat.set(doc(b,'links',linkId),linkData());
  await assertSucceeds(bat.commit());
  // 다시 쓸 수 없는 초대
  await assertFails(updateDoc(doc(c,'invites','ABCD2345'),{usedBy:C}));
  // 읽기: 당사자만
  await assertSucceeds(getDoc(doc(a,'links',linkId)));
  await assertFails(getDoc(doc(c,'links',linkId)));
  await assertSucceeds(getDocs(query(collection(a,'links'),where('trainerUid','==',A))));
  await assertSucceeds(getDocs(query(collection(b,'links'),where('memberUid','==',B))));
  await assertFails(getDocs(collection(a,'links')));
  // 범위: 회원만, '보낸 수업'은 항상 켜짐. 코치는 회차·예약만
  await assertSucceeds(updateDoc(doc(b,'links',linkId),{scope:{sessions:true,workouts:true,diet:false,body:false},updatedAt:serverTimestamp()}));
  await assertFails(updateDoc(doc(b,'links',linkId),{scope:{sessions:false,workouts:true,diet:false,body:false},updatedAt:serverTimestamp()}));
  await assertFails(updateDoc(doc(a,'links',linkId),{scope:{sessions:true,workouts:true,diet:true,body:true},updatedAt:serverTimestamp()}));
  await assertSucceeds(updateDoc(doc(a,'links',linkId),{pt:{total:10,used:1},warnedTrainerAt:serverTimestamp(),updatedAt:serverTimestamp()}));
  await assertFails(updateDoc(doc(b,'links',linkId),{pt:{total:99,used:0},updatedAt:serverTimestamp()}));
  // 코치가 회원 검토함에 수업 초안: 운동·코치 출처·자기 UID만
  const draft=(id,extra={})=>({id,requestId:id,type:'workout',status:'pending',schemaVersion:1,sourceModel:'trainer',originalUtterance:'코치님이 보낸 수업',parsedData:{date:'2026-11-21',exercises:[]},uncertainty:{},evidence:{trainerUid:A,sessionId:'s1',ptDeduct:true},createdAt:serverTimestamp(),updatedAt:serverTimestamp(),...extra});
  await assertSucceeds(runTransaction(a,async tx=>{const r=doc(a,'users',B,'aiDrafts','t-1');const s=await tx.get(r);if(!s.exists())tx.set(r,draft('t-1'))}));
  await assertFails(setDoc(doc(a,'users',B,'aiDrafts','t-2'),draft('t-2',{type:'meal'})));
  await assertFails(setDoc(doc(a,'users',B,'aiDrafts','t-3'),draft('t-3',{evidence:{trainerUid:C}})));
  await assertFails(setDoc(doc(c,'users',B,'aiDrafts','t-4'),draft('t-4',{evidence:{trainerUid:C}})));
  await assertFails(updateDoc(doc(a,'users',B,'aiDrafts','t-1'),{status:'confirmed',updatedAt:serverTimestamp()}));
  await assertFails(getDocs(collection(a,'users',B,'aiDrafts')));
  await assertSucceeds(getDoc(doc(a,'users',B,'records','workouts~x'))); // 4.15.0: A는 관리자라 베타 동안 전체 열람(코치 권한과 별개)
  await assertFails(getDoc(doc(c,'users',B,'records','workouts~x'))); // 관리자 아닌 계정은 여전히 못 읽음
  // 회신: 회원만 만들고, 그 코치만 읽는다
  const ackId=`${A}_s1_${B}`;
  await assertSucceeds(setDoc(doc(b,'sessionAcks',ackId),{trainerUid:A,memberUid:B,memberName:'문',sessionId:'s1',draftId:'t-1',result:'edited',edits:'세트 수',feedback:{effort:7,pain:[],note:''},ptDeduct:true,createdAt:serverTimestamp()}));
  await assertFails(setDoc(doc(c,'sessionAcks',`${A}_s1_${C}`),{trainerUid:A,memberUid:C,memberName:'',sessionId:'s1',draftId:'t-1',result:'confirmed',edits:'',feedback:{},ptDeduct:true,createdAt:serverTimestamp()}));
  await assertSucceeds(getDocs(query(collection(a,'sessionAcks'),where('trainerUid','==',A))));
  await assertFails(getDocs(query(collection(c,'sessionAcks'),where('trainerUid','==',A))));
  // 연동을 끊으면 즉시 막힌다
  await assertSucceeds(updateDoc(doc(b,'links',linkId),{status:'ended',endedAt:serverTimestamp(),endedBy:B,updatedAt:serverTimestamp()}));
  await assertFails(setDoc(doc(a,'users',B,'aiDrafts','t-5'),draft('t-5')));
  await assertFails(updateDoc(doc(b,'links',linkId),{status:'active',updatedAt:serverTimestamp()}));
 }finally{await env.cleanup()}
});
