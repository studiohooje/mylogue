import {firebaseConfig} from './firebase-config.js';
import {scopedKey,setStorageAccount,storageAccount} from './storage-scope.js';
import {cloudRecords,planSync,recordsToDB,validRecordKey,isFreshDevice,quarantineKeys} from './cloud-model.js';
import {STORAGE_KEY,RESTORE_PENDING_KEY,getLoadedRaw} from './store.js';
import {kvSet,kvDel} from './kv-store.js';
import {isNative,signInNativeGoogle,signOutNativeGoogle} from './native-auth.js';
let auth, authSDK, firestore, fsSDK;
// 5.0.6 Firestore SDK(약 175KB)는 첫 화면 뒤에 받는다. 서버를 쓰는 함수는 준비될 때까지 기다린다(실패해도 풀려서 예전처럼 오류).
let fsReadyResolve; const fsReadyP = new Promise(r => { fsReadyResolve = r; }); export const fsReady = () => fsReadyP;
import {isAdminUser} from './admin.js';
export const cloudState = {configured:!!firebaseConfig,user:null,error:'',native:isNative(),conflicts:[],approval:'guest',approvalError:'',applicants:[],plan:'free',consent:null,consentLoaded:false};
const profileRef=uid=>fsSDK.doc(firestore,'users',uid);
// 4.27.0 전수검사 E-01: 약한 신호(지하 헬스장)에서 서버 확인이 끝없이 기다려 첫 화면이 비지 않게 시간 제한.
export const BOOT_WAIT_MS=4000;
export function withTimeout(promise,ms=BOOT_WAIT_MS){let t;return Promise.race([promise,new Promise((_,reject)=>{t=setTimeout(()=>reject(Object.assign(Error('시간 초과'),{code:'timeout'})),ms)})]).finally(()=>clearTimeout(t))}
// 이 기기에서 로그인한 적이 있는지(계정별 저장 키가 있는지). 없으면 계정 확인이 안 돼도 손님으로 연다.
export function hadAccountOnDevice(){try{for(let i=0;i<localStorage.length;i++){const k=localStorage.key(i)||'';/* 4.27.0 재검사 N-6: 둘러보기 예시 칸은 로그인이 아니다 */if(/^mylogue\.v1\.user\./.test(k)&&!k.endsWith('.user.demo-tour'))return true}}catch{}return false}
export async function refreshApproval(){await fsReady();
  const user=auth?.currentUser;
  if(!user){cloudState.approval='guest';return 'guest'}
  if(isAdminUser(user)){cloudState.approval='approved';cloudState.approvalError='';return 'approved'}
  try{
    const snapshot=await withTimeout(fsSDK.getDocFromServer(profileRef(user.uid)));
    cloudState.approval=snapshot.exists()?snapshot.data().status:'not_applied';
    cloudState.plan=snapshot.exists()&&snapshot.data().plan==='plus'?'plus':'free';
    cloudState.coach=snapshot.exists()&&snapshot.data().coach===true;
    cloudState.approvalError='';
  }catch(error){cloudState.approval='unknown';cloudState.approvalError=error.message||'상태 확인 실패'}
  saveAccountCache();
  return cloudState.approval;
}
// 4.17.0 동의는 계정 단위(대표님: 다른 기기에서 로그인할 때마다 다시 뜸). users/{uid}/meta/consent에 본인만 쓰고 읽는다.
const consentRef=uid=>fsSDK.doc(firestore,'users',uid,'meta','consent');
// 5.0.6 계정 상태 기억(기기별·계정별). 승인 상태를 서버에서 확실히 읽었을 때만 저장한다.
const ACCOUNT_CACHE = uid => `mylogue.accountCache.${uid}`;
export function readAccountCache(uid){
  if(!uid) return null;
  try{ const v = JSON.parse(localStorage.getItem(ACCOUNT_CACHE(uid)) || 'null'); return v && typeof v.approval === 'string' && v.approval !== 'unknown' ? v : null; }catch{ return null; }
}
export function saveAccountCache(){
  const uid = auth?.currentUser?.uid; if(!uid || cloudState.approval === 'unknown' || !cloudState.consentLoaded) return;
  try{ localStorage.setItem(ACCOUNT_CACHE(uid), JSON.stringify({approval: cloudState.approval, plan: cloudState.plan, coach: !!cloudState.coach, consent: cloudState.consent, at: Date.now()})); }catch{}
}
// 뒤에서 서버 확인: 읽기에 성공한 값만 바꾸고(실패하면 기억한 값 유지), 바뀌었으면 화면을 다시 그린다.
export async function refreshAccountInBackground(){
  const user = auth?.currentUser; if(!user) return;
  const before = JSON.stringify([cloudState.approval, cloudState.plan, cloudState.coach, cloudState.consent]);
  const keep = {approval: cloudState.approval, plan: cloudState.plan, coach: cloudState.coach, consent: cloudState.consent};
  await Promise.all([
    refreshApproval().then(v => { if(v === 'unknown') Object.assign(cloudState, {approval: keep.approval, plan: keep.plan, coach: keep.coach}); }),
    withTimeout(fsSDK.getDocFromServer(consentRef(user.uid)), 10000).then(snap => { if(snap?.exists()){ const d = snap.data(); cloudState.consent = {version: String(d.version || ''), items: d.items || {}, at: d.at?.toDate ? d.at.toDate().toISOString() : ''}; } else cloudState.consent = null; cloudState.consentLoaded = true; }).catch(() => {}),
  ]);
  saveAccountCache();
  if(JSON.stringify([cloudState.approval, cloudState.plan, cloudState.coach, cloudState.consent]) !== before){ try{ window.dispatchEvent(new Event('mylogue-cloud-refresh')); }catch{} }
}
export async function loadAccountConsent(){await fsReady();
  const user=auth?.currentUser;cloudState.consent=null;cloudState.consentLoaded=false;
  if(!user)return null;
  // 4.18.0 서버에서 못 읽으면 기기에 남은 사본으로(일시적인 통신 실패로 동의 화면이 다시 뜨지 않게)
  const read=snap=>{if(snap?.exists()){const d=snap.data();cloudState.consent={version:String(d.version||''),items:d.items||{},at:d.at?.toDate?d.at.toDate().toISOString():''}}};
  try{read(await withTimeout(fsSDK.getDocFromServer(consentRef(user.uid))))}catch(error){cloudState.consentError=String(error?.code||error);console.warn('동의 기록을 읽지 못했어요',error?.code||error);try{read(await withTimeout(fsSDK.getDoc(consentRef(user.uid)),2000))}catch{}}
  cloudState.consentLoaded=true;return cloudState.consent;
}
export async function saveAccountConsent(record){await fsReady();
  const user=auth?.currentUser;if(!user||!record?.version)return false;
  await fsSDK.setDoc(consentRef(user.uid),{version:String(record.version),items:Object.fromEntries(Object.entries(record.items||{}).map(([k,v])=>[k,v===true])),at:fsSDK.serverTimestamp()});
  cloudState.consent={version:record.version,items:record.items,at:new Date().toISOString()};cloudState.consentLoaded=true;saveAccountCache();return true;
}
export async function applyForAccess(consent){await fsReady();
  const user=auth?.currentUser;
  if(!user)throw Error('먼저 로그인해 주세요.');
  if(isAdminUser(user))return 'approved';
  if(consent!==true)throw Error('건강 기록의 서버 저장 안내를 확인하고 동의해 주세요.');
  /* 5.0.1 이메일 가입은 메일 인증을 마친 뒤에 신청 */if(isEmailAccount(user)&&!(await emailVerified()))throw Error('가입한 이메일의 인증 메일에서 링크를 눌러 주세요. 메일이 없으면 스팸함을 보거나 \'인증 메일 다시 받기\'를 눌러 주세요.');
  /* 5.0.2 신청 없이 바로 승인(대기 중이던 계정은 스스로 승인으로) */
  await fsSDK.runTransaction(firestore,async tx=>{
    const ref=profileRef(user.uid),before=await tx.get(ref);
    if(before.exists()){const st=before.data().status;if(st==='pending')tx.update(ref,{status:'approved',updatedAt:fsSDK.serverTimestamp()});else if(st==='rejected')throw Error('이 계정은 사용이 제한됐어요. 운영자에게 문의해 주세요.');return}
    tx.set(ref,{uid:user.uid,email:user.email||'',...(user.displayName?{name:String(user.displayName).slice(0,30)}:{}),status:'approved',consentAt:fsSDK.serverTimestamp(),createdAt:fsSDK.serverTimestamp(),updatedAt:fsSDK.serverTimestamp()});
  });
  return refreshApproval();
}
export async function listApplicants(){await fsReady();
  if(!isAdminUser(auth?.currentUser))throw Error('관리자만 신청 목록을 볼 수 있습니다.');
  const snapshot=await fsSDK.getDocsFromServer(fsSDK.collection(firestore,'users'));
  cloudState.applicants=snapshot.docs.map(doc=>({uid:doc.id,...doc.data()}));
  return cloudState.applicants;
}
export async function reviewApplicant(uid,status){await fsReady();
  if(!isAdminUser(auth?.currentUser))throw Error('관리자만 가입을 승인할 수 있습니다.');
  if(!uid||!['pending','approved','rejected'].includes(status))throw Error('신청 상태를 확인해 주세요.');
  await fsSDK.updateDoc(profileRef(uid),{status,reviewerUid:auth.currentUser.uid,reviewedAt:fsSDK.serverTimestamp(),updatedAt:fsSDK.serverTimestamp()});
  return markReviewed([uid],status);
}
// 4.27.0 전수검사 AA-08: 승인할 때마다 users 전체를 다시 읽지 않고 화면 목록만 고친다(새로고침 버튼은 그대로 전체 읽기).
export function markReviewed(uids,status,list=cloudState.applicants){
  const set=new Set(uids);
  cloudState.applicants=list.map(a=>set.has(a.uid)?{...a,status,reviewedAt:a.reviewedAt}:a);
  return cloudState.applicants;
}
// 대기 중인 여러 계정을 한 번에(400건씩 나눠 일괄 저장)
export async function reviewApplicants(uids,status){await fsReady();
  if(!isAdminUser(auth?.currentUser))throw Error('관리자만 가입을 승인할 수 있습니다.');
  const list=[...new Set((uids||[]).filter(u=>typeof u==='string'&&/^[A-Za-z0-9]+$/.test(u)))];
  if(!list.length||!['approved','rejected'].includes(status))throw Error('처리할 신청을 확인해 주세요.');
  for(let i=0;i<list.length;i+=400){const b=fsSDK.writeBatch(firestore);for(const uid of list.slice(i,i+400))b.update(profileRef(uid),{status,reviewerUid:auth.currentUser.uid,reviewedAt:fsSDK.serverTimestamp(),updatedAt:fsSDK.serverTimestamp()});await b.commit();markReviewed(list.slice(i,i+400),status)}
  return cloudState.applicants;
}
// 4.17.0 프리미엄 전환(관리자 전용): 계정 문서의 plan을 바꾼다. 결제가 붙으면 같은 칸을 결제 기록이 채운다.
// 5.0.2 관리자가 코치 권한 켜고 끄기
export async function setAccountCoach(uid,on){await fsReady();
  if(!isAdminUser(auth?.currentUser))throw Error('관리자만 코치 권한을 바꿀 수 있습니다.');
  await fsSDK.updateDoc(profileRef(uid),{coach:!!on,coachBy:auth.currentUser.uid,coachAt:fsSDK.serverTimestamp(),updatedAt:fsSDK.serverTimestamp()});
  return listApplicants();
}
export async function setAccountPlan(uid,plan){await fsReady();
  if(!isAdminUser(auth?.currentUser))throw Error('관리자만 프리미엄을 바꿀 수 있습니다.');
  if(!uid||!['free','plus'].includes(plan))throw Error('플랜을 확인해 주세요.');
  await fsSDK.updateDoc(profileRef(uid),{plan,planBy:auth.currentUser.uid,planAt:fsSDK.serverTimestamp(),updatedAt:fsSDK.serverTimestamp()});
  return listApplicants();
}
export async function initializeCloud() {
  if (!firebaseConfig || typeof window === 'undefined') return;
  let timeout;
  try {
    const fsImport = import('./vendor/firebase/firebase-firestore.js');
    fsImport.catch(() => {});
    const sdk = await Promise.race([Promise.all([
      import('./vendor/firebase/firebase-app.js'),
      import('./vendor/firebase/firebase-auth.js'),
    ]),new Promise((_,reject)=>{timeout=setTimeout(()=>reject(Error('timeout')),8000)})]);
    clearTimeout(timeout);
    authSDK=sdk[1];
    const app=sdk[0].initializeApp(firebaseConfig);
    auth=authSDK.initializeAuth(app,cloudState.native
      ? {persistence:authSDK.indexedDBLocalPersistence}
      // 4.18.0 대표님: 웹에서 자꾸 로그아웃됨 → 탭 세션 저장(browserSession: 브라우저를 닫으면 로그아웃)을 기기 저장으로. 로그아웃은 직접 누를 때만.
      : {persistence:[authSDK.indexedDBLocalPersistence,authSDK.browserLocalPersistence],popupRedirectResolver:authSDK.browserPopupRedirectResolver});
    await Promise.race([auth.authStateReady(),new Promise((_,reject)=>{timeout=setTimeout(()=>reject(Error('auth timeout')),15000)})]);
    clearTimeout(timeout);
    cloudState.user=auth.currentUser;
    setStorageAccount(auth.currentUser?.uid || '');
    const fsInit = fsImport.then(m => { fsSDK = m; firestore = fsSDK.getFirestore(app); fsReadyResolve(true); });
    fsInit.catch(() => fsReadyResolve(false));
    // 5.0.6 속도(대표님 '획기적으로'): 예전엔 첫 화면 전에 서버 읽기 2번(승인·동의)을 차례로, 각각 최대 4초 기다렸다(로그인한 사람은 매번 1~8초 '기록을 여는 중').
    // 지난번 확인한 상태를 기기에 기억해 두고 그걸로 바로 그린 뒤, 서버 확인은 뒤에서 한다. 기억이 없으면(처음 이 기기) 둘을 동시에 기다린다.
    // 실제 권한은 서버 규칙이 다시 확인하므로 화면을 먼저 그려도 안전하다.
    const cached = readAccountCache(auth.currentUser?.uid);
    if (cached) {
      Object.assign(cloudState, {approval: cached.approval, plan: cached.plan === 'plus' ? 'plus' : 'free', coach: cached.coach === true, consent: cached.consent || null, consentLoaded: true, approvalError: ''});
      setTimeout(() => { refreshAccountInBackground().catch(() => {}); }, 0);
    } else if (auth.currentUser) {
      await Promise.race([fsInit, new Promise((_, reject) => { timeout = setTimeout(() => reject(Error('timeout')), 8000); })]);
      clearTimeout(timeout);
      await Promise.all([refreshApproval(), loadAccountConsent()]);
      saveAccountCache();
    }
    if(cloudState.approval==='unknown')setTimeout(()=>refreshApproval().then(()=>{try{window.dispatchEvent(new Event('mylogue-cloud-refresh'))}catch{}}).catch(()=>{}),3000);
    // Cross-tab auth changes never leave a previous user's records on the screen.
    authSDK.onAuthStateChanged(auth,user=>{if((user?.uid||'')!==storageAccount())location.reload();});
  } catch {
    fsReadyResolve(false);
    if(!auth?.currentUser&&!hadAccountOnDevice()){cloudState.error='';cloudState.offline=true;return}
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
// 5.0.1 대표님(2026-11-25): 구글 말고도 가입 — 이메일(비밀번호)·카카오. 이메일은 메일 인증을 마쳐야 이용 신청이 된다.
const AUTH_MSG = {
  'auth/invalid-email': '이메일 주소를 확인해 주세요.',
  'auth/missing-password': '비밀번호를 적어 주세요.',
  'auth/weak-password': '비밀번호는 8자 이상으로 정해 주세요.',
  'auth/email-already-in-use': '이미 가입한 이메일이에요. 로그인하거나 비밀번호 찾기를 눌러 주세요.',
  'auth/invalid-credential': '이메일이나 비밀번호가 맞지 않아요.',
  'auth/wrong-password': '이메일이나 비밀번호가 맞지 않아요.',
  'auth/user-not-found': '이메일이나 비밀번호가 맞지 않아요.',
  'auth/too-many-requests': '여러 번 틀려서 잠시 막혔어요. 조금 뒤 다시 하거나 비밀번호 찾기를 눌러 주세요.',
  'auth/network-request-failed': '인터넷 연결을 확인해 주세요.',
  'auth/operation-not-allowed': '이메일 가입이 아직 켜지지 않았어요. 운영자에게 알려 주세요.',
  'auth/user-disabled': '사용이 중지된 계정이에요.',
};
const authError = e => Error(AUTH_MSG[e?.code] || e?.message || '로그인하지 못했어요. 잠시 뒤 다시 해 주세요.');
const okEmail = v => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(v || '').trim());
export async function emailSignUp({email, password, name = ''}) {
  if (!auth) throw Error('인터넷 연결을 확인해 주세요.');
  if (!okEmail(email)) throw Error('이메일 주소를 확인해 주세요.');
  if (String(password || '').length < 8) throw Error('비밀번호는 8자 이상으로 정해 주세요.');
  try {
    const cred = await authSDK.createUserWithEmailAndPassword(auth, String(email).trim(), String(password));
    const nm = String(name || '').trim().slice(0, 20);
    if (nm) await authSDK.updateProfile(cred.user, {displayName: nm});
    try { authSDK.useDeviceLanguage?.(auth); } catch {}
    await authSDK.sendEmailVerification(cred.user);
  } catch (e) { throw authError(e); }
  location.reload();
}
export async function emailSignIn({email, password}) {
  if (!auth) throw Error('인터넷 연결을 확인해 주세요.');
  try { await authSDK.signInWithEmailAndPassword(auth, String(email || '').trim(), String(password || '')); }
  catch (e) { throw authError(e); }
  location.reload();
}
export async function emailReset(email) {
  if (!auth) throw Error('인터넷 연결을 확인해 주세요.');
  if (!okEmail(email)) throw Error('가입한 이메일 주소를 적어 주세요.');
  try { try { authSDK.useDeviceLanguage?.(auth); } catch {} await authSDK.sendPasswordResetEmail(auth, String(email).trim()); }
  catch (e) { if (e?.code !== 'auth/user-not-found') throw authError(e); }
}
export const isEmailAccount = (user = auth?.currentUser) => !!user && (user.providerData || []).some(p => p.providerId === 'password');
export async function emailVerified() { const u = auth?.currentUser; if (!u) return false; try { await u.reload(); } catch {} if (u.emailVerified) { try { await u.getIdToken(true); } catch {} } return !!u.emailVerified; }
export async function resendVerification() { const u = auth?.currentUser; if (!u) throw Error('먼저 로그인해 주세요.'); try { await authSDK.sendEmailVerification(u); } catch (e) { throw authError(e); } }
// 카카오: AI 서버가 카카오 확인 뒤 Firebase 로그인 표(커스텀 토큰)를 만들어 주소 뒤(#)로 돌려준다. 이 함수는 그 표로 로그인한다.
export async function signInWithKakaoToken(token, name = '') {
  if (!auth) throw Error('인터넷 연결을 확인해 주세요.');
  try {
    const cred = await authSDK.signInWithCustomToken(auth, token);
    const nm = String(name || '').trim().slice(0, 20);
    if (nm && !cred.user.displayName) await authSDK.updateProfile(cred.user, {displayName: nm});
  } catch (e) { throw authError(e); }
}
// 5.0.2 동의를 마친 계정은 앱이 켜질 때 저절로 승인(신청 버튼 없음). 이메일 인증 전이면 조용히 기다린다.
let autoTried=false;
export async function autoApprove(){
  const user=auth?.currentUser;
  if(!user||autoTried||!['not_applied','pending'].includes(cloudState.approval))return cloudState.approval;
  autoTried=true;
  try{return await applyForAccess(true)}catch{return cloudState.approval}
}
export async function cloudLogout() { if(cloudState.native)await signOutNativeGoogle();if(auth)await authSDK.signOut(auth);location.reload(); }
// 4.11.0 계정 삭제: 본인 확인(Google 다시 로그인) → 서버 기록·검토함 초안·계정 문서 삭제 → 이 기기의 이 계정 기록 삭제 → 로그인 계정 삭제.
// 하나라도 실패하면 거기서 멈추고 알린다(다시 누르면 남은 것부터 이어서 지운다).
export async function deleteAccount({onStep=()=>{}}={}){await fsReady();
  const user=auth?.currentUser;
  if(!user)throw Error('로그인한 계정만 삭제할 수 있어요.');
  if(isAdminUser(user))throw Error('관리자 계정은 앱에서 삭제할 수 없어요.');
  onStep('본인 확인');
  try{
    if(cloudState.native){const {idToken}=await signInNativeGoogle();await authSDK.reauthenticateWithCredential(user,authSDK.GoogleAuthProvider.credential(idToken))}
    else{const p=new authSDK.GoogleAuthProvider();p.setCustomParameters({prompt:'select_account',login_hint:user.email||''});await authSDK.reauthenticateWithPopup(user,p)}
  }catch(e){if(String(e?.code||'').includes('user-mismatch'))throw Error('지금 로그인한 계정과 다른 Google 계정을 골랐어요. 같은 계정으로 다시 해 주세요.');if(String(e?.code||'').includes('popup-closed')||String(e?.code||'').includes('cancelled'))throw Error('본인 확인을 취소해서 삭제하지 않았어요.');throw e}
  const uid=user.uid;
  onStep('등록 요청 삭제');
  {const snap=await fsSDK.getDocsFromServer(fsSDK.query(fsSDK.collection(firestore,'catalogRequests'),fsSDK.where('requesterUid','==',uid)));for(let i=0;i<snap.docs.length;i+=400){const b=fsSDK.writeBatch(firestore);snap.docs.slice(i,i+400).forEach(d=>b.delete(d.ref));await b.commit()}}
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
  // 4.27.0 재검사 N-3: 동기화 직전 사본(IndexedDB)도 함께 지운다
  try{Promise.resolve(kvDel(`mylogue.cloud.before-sync${tail}`)).catch(()=>{})}catch{}
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
export async function synchronize(db, save, choices={}) {await fsReady();
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
  const plan=planSync(current,remote,baseline,choices,{fresh:isFreshDevice(db,baseline),hold:quarantineKeys(db)});
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
export async function adminLoadUser(uid){await fsReady();
  adminUser();
  if(!uid)throw Error('계정을 골라 주세요.');
  let snap;try{snap=await fsSDK.getDocsFromServer(fsSDK.collection(firestore,'users',uid,'records'))}catch(e){if(e?.code==='permission-denied')throw Error('이 사용자는 운영자 열람에 동의하지 않았어요(동의는 사용자 설정에서만 바꿀 수 있어요).');throw e}
  const records={},payloads={};
  snap.forEach(doc=>{const v=doc.data();if(!validRecordKey(doc.id))return;records[doc.id]={revision:v.revision,payload:v.payload??null};payloads[doc.id]=v.payload??null});
  return {records,db:recordsToDB(payloads)};
}
export async function adminLogView(uid,reason){await fsReady();
  const u=adminUser();
  await fsSDK.setDoc(fsSDK.doc(firestore,'users',uid,'accessLog',`view_${u.uid}_${Date.now()}`),{adminUid:u.uid,adminEmail:u.email||'',action:'view',reason:String(reason||'').slice(0,300),at:fsSDK.serverTimestamp()});
}
export async function adminWriteRecord(uid,key,payload,action,reason){await fsReady();
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
export async function adminAccessLog(uid){await fsReady();
  adminUser();
  const snap=await fsSDK.getDocsFromServer(fsSDK.collection(firestore,'users',uid,'accessLog'));
  return snap.docs.map(d=>({id:d.id,...d.data(),at:d.data().at?.toDate?.()?.toISOString?.()||''})).sort((a,b)=>b.at.localeCompare(a.at));
}
