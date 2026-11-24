import {firebaseConfig} from './firebase-config.js';
import {scopedKey,setStorageAccount,storageAccount} from './storage-scope.js';
import {cloudRecords,planSync,recordsToDB,validRecordKey,isFreshDevice} from './cloud-model.js';
import {STORAGE_KEY,RESTORE_PENDING_KEY,getLoadedRaw} from './store.js';
import {kvSet} from './kv-store.js';
import {isNative,signInNativeGoogle,signOutNativeGoogle} from './native-auth.js';
let auth, authSDK, firestore, fsSDK;
import {isAdminUser} from './admin.js';
export const cloudState = {configured:!!firebaseConfig,user:null,error:'',native:isNative(),conflicts:[],approval:'guest',approvalError:'',applicants:[],plan:'free',consent:null,consentLoaded:false};
const profileRef=uid=>fsSDK.doc(firestore,'users',uid);
export async function refreshApproval(){
  const user=auth?.currentUser;
  if(!user){cloudState.approval='guest';return 'guest'}
  if(isAdminUser(user)){cloudState.approval='approved';cloudState.approvalError='';return 'approved'}
  try{
    const snapshot=await fsSDK.getDocFromServer(profileRef(user.uid));
    cloudState.approval=snapshot.exists()?snapshot.data().status:'not_applied';
    cloudState.plan=snapshot.exists()&&snapshot.data().plan==='plus'?'plus':'free';
    cloudState.approvalError='';
  }catch(error){cloudState.approval='unknown';cloudState.approvalError=error.message||'상태 확인 실패'}
  return cloudState.approval;
}
// 4.17.0 동의는 계정 단위(대표님: 다른 기기에서 로그인할 때마다 다시 뜸). users/{uid}/meta/consent에 본인만 쓰고 읽는다.
const consentRef=uid=>fsSDK.doc(firestore,'users',uid,'meta','consent');
export async function loadAccountConsent(){
  const user=auth?.currentUser;cloudState.consent=null;cloudState.consentLoaded=false;
  if(!user)return null;
  // 4.18.0 서버에서 못 읽으면 기기에 남은 사본으로(일시적인 통신 실패로 동의 화면이 다시 뜨지 않게)
  const read=snap=>{if(snap?.exists()){const d=snap.data();cloudState.consent={version:String(d.version||''),items:d.items||{},at:d.at?.toDate?d.at.toDate().toISOString():''}}};
  try{read(await fsSDK.getDocFromServer(consentRef(user.uid)))}catch(error){cloudState.consentError=String(error?.code||error);console.warn('동의 기록을 읽지 못했어요',error?.code||error);try{read(await fsSDK.getDoc(consentRef(user.uid)))}catch{}}
  cloudState.consentLoaded=true;return cloudState.consent;
}
export async function saveAccountConsent(record){
  const user=auth?.currentUser;if(!user||!record?.version)return false;
  await fsSDK.setDoc(consentRef(user.uid),{version:String(record.version),items:Object.fromEntries(Object.entries(record.items||{}).map(([k,v])=>[k,v===true])),at:fsSDK.serverTimestamp()});
  cloudState.consent={version:record.version,items:record.items,at:new Date().toISOString()};return true;
}
export async function applyForAccess(consent){
  const user=auth?.currentUser;
  if(!user)throw Error('Google로 먼저 로그인해 주세요.');
  if(isAdminUser(user))return 'approved';
  if(consent!==true)throw Error('건강 기록의 서버 저장 안내를 확인하고 동의해 주세요.');
  await fsSDK.runTransaction(firestore,async tx=>{
    const ref=profileRef(user.uid),before=await tx.get(ref);
    if(before.exists())throw Error('이미 신청한 계정입니다. 상태를 새로 확인해 주세요.');
    tx.set(ref,{uid:user.uid,email:user.email||'',status:'pending',consentAt:fsSDK.serverTimestamp(),createdAt:fsSDK.serverTimestamp(),updatedAt:fsSDK.serverTimestamp()});
  });
  return refreshApproval();
}
export async function listApplicants(){
  if(!isAdminUser(auth?.currentUser))throw Error('관리자만 신청 목록을 볼 수 있습니다.');
  const snapshot=await fsSDK.getDocsFromServer(fsSDK.collection(firestore,'users'));
  cloudState.applicants=snapshot.docs.map(doc=>({uid:doc.id,...doc.data()}));
  return cloudState.applicants;
}
export async function reviewApplicant(uid,status){
  if(!isAdminUser(auth?.currentUser))throw Error('관리자만 가입을 승인할 수 있습니다.');
  if(!uid||!['pending','approved','rejected'].includes(status))throw Error('신청 상태를 확인해 주세요.');
  await fsSDK.updateDoc(profileRef(uid),{status,reviewerUid:auth.currentUser.uid,reviewedAt:fsSDK.serverTimestamp(),updatedAt:fsSDK.serverTimestamp()});
  return listApplicants();
}
// 4.17.0 플러스 전환(관리자 전용): 계정 문서의 plan을 바꾼다. 결제가 붙으면 같은 칸을 결제 기록이 채운다.
export async function setAccountPlan(uid,plan){
  if(!isAdminUser(auth?.currentUser))throw Error('관리자만 플러스를 바꿀 수 있습니다.');
  if(!uid||!['free','plus'].includes(plan))throw Error('플랜을 확인해 주세요.');
  await fsSDK.updateDoc(profileRef(uid),{plan,planBy:auth.currentUser.uid,planAt:fsSDK.serverTimestamp(),updatedAt:fsSDK.serverTimestamp()});
  return listApplicants();
}
export async function initializeCloud() {
  if (!firebaseConfig || typeof window === 'undefined') return;
  let timeout;
  try {
    const sdk = await Promise.race([Promise.all([
      import('./vendor/firebase/firebase-app.js'),
      import('./vendor/firebase/firebase-auth.js'),
      import('./vendor/firebase/firebase-firestore.js')
    ]),new Promise((_,reject)=>{timeout=setTimeout(()=>reject(Error('timeout')),8000)})]);
    clearTimeout(timeout);
    authSDK=sdk[1];fsSDK=sdk[2];
    const app=sdk[0].initializeApp(firebaseConfig);
    auth=authSDK.initializeAuth(app,cloudState.native
      ? {persistence:authSDK.indexedDBLocalPersistence}
      // 4.18.0 대표님: 웹에서 자꾸 로그아웃됨 → 탭 세션 저장(browserSession: 브라우저를 닫으면 로그아웃)을 기기 저장으로. 로그아웃은 직접 누를 때만.
      : {persistence:[authSDK.indexedDBLocalPersistence,authSDK.browserLocalPersistence],popupRedirectResolver:authSDK.browserPopupRedirectResolver});
    await Promise.race([auth.authStateReady(),new Promise((_,reject)=>{timeout=setTimeout(()=>reject(Error('auth timeout')),15000)})]);
    clearTimeout(timeout);
    cloudState.user=auth.currentUser;
    setStorageAccount(auth.currentUser?.uid || '');
    firestore=fsSDK.getFirestore(app);
    await refreshApproval();
    await loadAccountConsent();
    // Cross-tab auth changes never leave a previous user's records on the screen.
    authSDK.onAuthStateChanged(auth,user=>{if((user?.uid||'')!==storageAccount())location.reload();});
  } catch {
    cloudState.error='계정 상태를 확인하지 못해 기록 화면을 잠갔습니다. 기존 기록은 보존되어 있습니다. 앱을 다시 열어 주세요.';
    const root=document.getElementById('app');
    if(root){root.innerHTML='<main class="card" style="margin:24px"><h2>계정 확인이 필요합니다</h2><p>계정 상태를 확인하지 못해 기록 화면을 잠갔습니다. 기존 기록은 그대로 보존되어 있습니다.</p><button class="button" id="cloud-boot-retry">다시 시도</button></main>';document.getElementById('cloud-boot-retry')?.addEventListener('click',()=>location.reload());}
    throw Error(cloudState.error);
  }
  finally { clearTimeout(timeout); }
}
export async function cloudLogin() {
  if (!auth) throw Error('인터넷 연결을 확인해 주세요.');
  if(cloudState.native){const {idToken}=await signInNativeGoogle();await authSDK.signInWithCredential(auth,authSDK.GoogleAuthProvider.credential(idToken));location.reload();return;}
  const provider=new authSDK.GoogleAuthProvider();provider.setCustomParameters({prompt:'select_account'});
  await authSDK.signInWithPopup(auth,provider);location.reload();
}
export async function cloudLogout() { if(cloudState.native)await signOutNativeGoogle();if(auth)await authSDK.signOut(auth);location.reload(); }
// 4.11.0 계정 삭제: 본인 확인(Google 다시 로그인) → 서버 기록·검토함 초안·계정 문서 삭제 → 이 기기의 이 계정 기록 삭제 → 로그인 계정 삭제.
// 하나라도 실패하면 거기서 멈추고 알린다(다시 누르면 남은 것부터 이어서 지운다).
export async function deleteAccount({onStep=()=>{}}={}){
  const user=auth?.currentUser;
  if(!user)throw Error('로그인한 계정만 삭제할 수 있어요.');
  if(isAdminUser(user))throw Error('관리자 계정은 앱에서 삭제할 수 없어요.');
  onStep('본인 확인');
  try{
    if(cloudState.native){const {idToken}=await signInNativeGoogle();await authSDK.reauthenticateWithCredential(user,authSDK.GoogleAuthProvider.credential(idToken))}
    else{const p=new authSDK.GoogleAuthProvider();p.setCustomParameters({prompt:'select_account',login_hint:user.email||''});await authSDK.reauthenticateWithPopup(user,p)}
  }catch(e){if(String(e?.code||'').includes('user-mismatch'))throw Error('지금 로그인한 계정과 다른 Google 계정을 골랐어요. 같은 계정으로 다시 해 주세요.');if(String(e?.code||'').includes('popup-closed')||String(e?.code||'').includes('cancelled'))throw Error('본인 확인을 취소해서 삭제하지 않았어요.');throw e}
  const uid=user.uid;
  for(const sub of ['records','aiDrafts','accessLog','meta']){
    onStep(sub==='records'?'서버 기록 삭제':'검토함 초안 삭제');
    let snap;try{snap=await fsSDK.getDocsFromServer(fsSDK.collection(firestore,'users',uid,sub))}catch(e){if(String(e?.code||'').includes('permission'))throw Error('서버가 아직 앱 안 삭제를 받을 준비가 안 됐어요. studiohooje@gmail.com으로 삭제를 요청해 주시면 바로 지워 드릴게요.');throw e}
    for(let i=0;i<snap.docs.length;i+=400){const b=fsSDK.writeBatch(firestore);snap.docs.slice(i,i+400).forEach(d=>b.delete(d.ref));await b.commit()}
  }
  onStep('계정 정보 삭제');
  await fsSDK.deleteDoc(profileRef(uid));
  onStep('이 기기 기록 삭제');
  clearAccountLocal(uid);
  onStep('로그인 계정 삭제');
  await authSDK.deleteUser(user);
  if(cloudState.native){try{await signOutNativeGoogle()}catch{}}
  return true;
}
// 이 기기에 남은 그 계정의 기록(로컬 저장소 키·사진 DB)을 지운다. 로그인 없이 쓰던 기록은 건드리지 않는다.
export function clearAccountLocal(uid,store=globalThis.localStorage,idb=globalThis.indexedDB){
  const tail=`.user.${encodeURIComponent(uid)}`;let n=0;
  try{const keys=[];for(let i=0;i<store.length;i++){const k=store.key(i);if(k&&k.endsWith(tail))keys.push(k)}for(const k of keys){store.removeItem(k);n++}}catch{}
  try{idb?.deleteDatabase?.(`mylogue.photos${tail}`)}catch{}
  return n;
}
export function syncMetadata() {
  const raw=localStorage.getItem(scopedKey('mylogue.cloud.baseline'));
  if(!raw)return {};
  try{
    const value=JSON.parse(raw);
    if(!value||typeof value!=='object'||Array.isArray(value)||Object.keys(value).some(k=>!validRecordKey(k))||Object.values(value).some(x=>!x||!Number.isInteger(x.revision)||x.revision<1||!(x.payload===null||typeof x.payload==='string')))throw Error();
    return value;
  }catch{throw Error('동기화 기준 기록이 손상됐습니다. 원본을 보존하고 복구가 필요합니다.');}
}
// 4.27.0 DAT-04: 한 번에 보낼 기록 수(트랜잭션 쓰기 한도 500 아래로)
export const SYNC_CHUNK=400;
export const chunk=(list,n)=>{const out=[];for(let i=0;i<list.length;i+=n)out.push(list.slice(i,i+n));return out};
export async function synchronize(db, save, choices={}) {
  const user=auth?.currentUser;
  if(!user||user.uid!==storageAccount())throw Error('먼저 로그인해 주세요.');
  if(cloudState.approval!=='approved')throw Error('계정 이용 승인 후 동기화를 사용할 수 있습니다.');
  const scope=storageAccount(), current=cloudRecords(db), baseline=syncMetadata();
  const originalRaw=localStorage.getItem(STORAGE_KEY), originalBaseline=localStorage.getItem(scopedKey('mylogue.cloud.baseline'));
  if(originalRaw!==getLoadedRaw())throw Error('다른 탭에서 기록이 변경됐습니다. 페이지를 새로 열고 다시 동기화해 주세요.');
  const checkLocal=()=>{
    if(localStorage.getItem(STORAGE_KEY)!==originalRaw||localStorage.getItem(scopedKey('mylogue.cloud.baseline'))!==originalBaseline||localStorage.getItem(RESTORE_PENDING_KEY))throw Error('다른 탭에서 기록이 변경됐습니다. 페이지를 새로 열고 다시 동기화해 주세요.');
  };
  const collection=fsSDK.collection(firestore,'users',scope,'records');
  const snapshot=await fsSDK.getDocsFromServer(collection), remote={};
  snapshot.forEach(doc=>{
    const value=doc.data();
    if(!validRecordKey(doc.id)||!Number.isInteger(value.revision)||value.revision<1||!(typeof value.payload==='string'||value.payload===null))throw Error('서버 기록 형식을 확인해 주세요.');
    remote[doc.id]={revision:value.revision,payload:value.payload};
  });
  const plan=planSync(current,remote,baseline,choices,{fresh:isFreshDevice(db,baseline)});
  cloudState.conflicts=plan.conflicts;
  if(plan.conflicts.length){
    localStorage.setItem(scopedKey('mylogue.cloud.conflicts'),JSON.stringify(plan.conflicts));
    return {conflicts:plan.conflicts};
  }
  const next=recordsToDB(plan.merged,db);
  // Preserve both original sides before any server write or local replacement.
  checkLocal();
  // 4.27.0 전수검사 DAT-02: 동기화 직전 사본(기기 전체+서버 전체)은 localStorage 한도를 먼저 채웠다 → IndexedDB에 두고, 못 쓰면 예전처럼
  {const key=scopedKey('mylogue.cloud.before-sync'),snap=JSON.stringify({date:new Date().toISOString(),local:db,remote});if(await kvSet(key,snap)){try{localStorage.removeItem(key)}catch{}}else localStorage.setItem(key,snap);checkLocal();}
  // 4.27.0 전수검사 DAT-04: 예전엔 450건을 넘으면 "관리자에게 문의"로 영영 막혔다(게스트로 오래 쓰다 가입, 큰 백업 복원 뒤).
  // 400건씩 나눠 차례로 보낸다. 중간에 실패해도 이미 보낸 묶음은 서버 값이 이 기기 값과 같아져 다음 동기화가 그대로 이어 간다.
  for(const part of chunk(plan.writes,SYNC_CHUNK))await fsSDK.runTransaction(firestore,async tx=>{
    const refs=part.map(w=>fsSDK.doc(collection,w.key));
    const docs=await Promise.all(refs.map(ref=>tx.get(ref)));
    for(let i=0;i<docs.length;i++)if((docs[i].exists()?docs[i].data().revision:0)!==part[i].expectedRevision)throw Error('다른 기기에서 기록을 수정했습니다. 다시 동기화하고 변경 내용을 확인해 주세요.');
    for(let i=0;i<refs.length;i++){
      const w=part[i];
      tx.set(refs[i],{revision:w.expectedRevision+1,payload:w.payload,updatedAt:fsSDK.serverTimestamp()});
    }
  });
  if(auth.currentUser?.uid!==scope||storageAccount()!==scope)throw Error('계정이 변경되어 로컬 반영을 중단했습니다.');
  checkLocal();
  save(next);
  const mergedBaseline={...remote};
  for(const w of plan.writes)mergedBaseline[w.key]={payload:w.payload,revision:w.expectedRevision+1};
  localStorage.setItem(scopedKey('mylogue.cloud.baseline'),JSON.stringify(mergedBaseline));
  localStorage.setItem(scopedKey('mylogue.cloud.last-sync'),new Date().toISOString());
  cloudState.conflicts=[];
  return {db:next,conflicts:[]};
}
// 4.15.0 관리로그(베타 동안 관리자 전체 열람·수정 — 대표님 결정 2026-11-23, 정식 서비스 때 '허락받은 동안만'으로 전환 예정)
// 모든 수정은 같은 트랜잭션 안에서 users/{uid}/accessLog/{기록키}__r{리비전}을 남긴다(보안 규칙이 강제). 고치기 전 내용도 함께 저장해 되돌릴 수 있다.
const adminUser=()=>{const u=auth?.currentUser;if(!isAdminUser(u))throw Error('관리자만 관리로그를 쓸 수 있습니다.');return u};
export async function adminLoadUser(uid){
  adminUser();
  if(!uid)throw Error('계정을 골라 주세요.');
  const snap=await fsSDK.getDocsFromServer(fsSDK.collection(firestore,'users',uid,'records')),records={},payloads={};
  snap.forEach(doc=>{const v=doc.data();if(!validRecordKey(doc.id))return;records[doc.id]={revision:v.revision,payload:v.payload??null};payloads[doc.id]=v.payload??null});
  return {records,db:recordsToDB(payloads)};
}
export async function adminLogView(uid,reason){
  const u=adminUser();
  await fsSDK.setDoc(fsSDK.doc(firestore,'users',uid,'accessLog',`view_${u.uid}_${Date.now()}`),{adminUid:u.uid,adminEmail:u.email||'',action:'view',reason:String(reason||'').slice(0,300),at:fsSDK.serverTimestamp()});
}
export async function adminWriteRecord(uid,key,payload,action,reason){
  const u=adminUser();
  if(!validRecordKey(key))throw Error('기록 키를 확인해 주세요.');
  if(!String(reason||'').trim())throw Error('수정 사유를 적어 주세요.');
  if(payload!==null&&typeof payload!=='string')throw Error('기록 내용을 확인해 주세요.');
  const ref=fsSDK.doc(firestore,'users',uid,'records',key);
  try{
    return await fsSDK.runTransaction(firestore,async tx=>{
      const cur=await tx.get(ref),rev=cur.exists()?cur.data().revision:0,next=rev+1,before=cur.exists()?(cur.data().payload??null):null;
      if(action==='create'&&cur.exists()&&before!==null)throw Error('이미 있는 기록입니다. 수정으로 바꿔 주세요.');
      tx.set(fsSDK.doc(firestore,'users',uid,'accessLog',`${key}__r${next}`),{adminUid:u.uid,adminEmail:u.email||'',action,recordId:key,revision:next,reason:String(reason).slice(0,300),before,after:payload,at:fsSDK.serverTimestamp()});
      tx.set(ref,{revision:next,payload,updatedAt:fsSDK.serverTimestamp()});
      return next;
    });
  }catch(e){
    if(String(e?.code||e?.message||'').includes('permission'))throw Error('보안을 위해 다시 로그인한 뒤(최근 60분 안) 저장할 수 있어요. 오른쪽 위 계정에서 로그아웃 후 다시 로그인해 주세요.');
    throw e;
  }
}
export async function adminAccessLog(uid){
  adminUser();
  const snap=await fsSDK.getDocsFromServer(fsSDK.collection(firestore,'users',uid,'accessLog'));
  return snap.docs.map(d=>({id:d.id,...d.data(),at:d.data().at?.toDate?.()?.toISOString?.()||''})).sort((a,b)=>b.at.localeCompare(a.at));
}
