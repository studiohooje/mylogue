import test from 'node:test';import assert from 'node:assert/strict';import {readFile} from 'node:fs/promises';
import {initializeTestEnvironment,assertSucceeds,assertFails} from '@firebase/rules-unit-testing';
import {doc,setDoc,serverTimestamp} from 'firebase/firestore';
import {gymRequestId} from '../gym-machines.js';
const host=process.env.FIRESTORE_EMULATOR_HOST;
// 4.7.0 헬스장 머신 요청 중복 방지: 같은 헬스장+머신 ID의 요청은 처음 한 사람만 만들 수 있고, 다른 사람은 덮어쓸 수 없다.
test('4.7.0 같은 헬스장+머신 요청은 한 건만(두 번째 사람은 거절)',{skip:!host},async()=>{
 const rules=await readFile(new URL('../firestore.rules',import.meta.url),'utf8');const [h,p]=host.split(':');
 const env=await initializeTestEnvironment({projectId:'mylogue-gymreq-test',firestore:{host:h,port:Number(p),rules}});
 try{
  await env.withSecurityRulesDisabled(async c=>{const db=c.firestore();for(const u of ['userA','userB'])await setDoc(doc(db,'users',u),{uid:u,email:`${u}@x.com`,status:'approved',consentAt:new Date(),createdAt:new Date(),updatedAt:new Date()})});
  const req=uid=>({type:'machine',mode:'manual',name:'레그 프레스',manufacturer:'일반 머신',model:'45° 레그 프레스 (원판식)',gymName:'헬스플러스 안산점',targetIds:[],note:'[헬스장 머신] modelId=gm%3Aleg-press-45 gymKey=kakao%3A12345 spec=plate.both.kg',servingQty:null,servingUnit:'',calories:null,carbs:null,protein:null,fat:null,requesterUid:uid,photoPath:'',wholePhotoDataUrl:'',nameplatePhotoDataUrl:'',status:'pending',adminNote:'',createdAt:serverTimestamp(),updatedAt:serverTimestamp()});
  const id=gymRequestId('kakao:12345','gm:leg-press-45');
  const a=env.authenticatedContext('userA',{email:'userA@x.com'}).firestore(),b=env.authenticatedContext('userB',{email:'userB@x.com'}).firestore();
  await assertSucceeds(setDoc(doc(a,'catalogRequests',id),req('userA')));
  await assertFails(setDoc(doc(b,'catalogRequests',id),req('userB')));
  await assertFails(setDoc(doc(a,'catalogRequests',id),req('userA')),'같은 사람도 다시 덮어쓸 수 없음');
  assert.ok(id.startsWith('gymreq_'));
 }finally{await env.cleanup()}});
