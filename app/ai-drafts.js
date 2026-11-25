import {firebaseConfig} from './firebase-config.js';
import {cleanBody,cleanMeal,cleanWorkout,cleanFoodPreset,cleanMachine,cleanCustomExercise,isFuture} from './domain.js';
import {stableJSON} from './cloud-model.js';
import {missingBases,missingBaseMessage,machineBase} from './exercise-base.js';
import {resolveExercise} from './catalog.js';
import {cloudState} from './cloud-sync.js';
import {scopedKey} from './storage-scope.js';
import {deriveKey,proof,newNonce,sameHex} from './bridge-proof.js';
// 4.11.0 승인 전·로그인 전에도 AI 입력(붙여넣기)을 쓸 수 있게: 초안을 이 기기의 검토함에 두고, 확정하면 이 기기 기록에 넣는다.
// 승인된 계정은 예전처럼 서버 검토함을 쓴다. 이 기기 초안은 id가 'l-'로 시작한다.
const LOCAL_KEY=()=>scopedKey('mylogue.localDrafts');
export const localDraftMode=()=>!cloudState.user||cloudState.approval!=='approved';
const stamp=ms=>({toMillis:()=>ms,toDate:()=>new Date(ms)});
function readLocal(){try{const v=JSON.parse(globalThis.localStorage?.getItem(LOCAL_KEY())||'[]');return Array.isArray(v)?v:[]}catch{return []}}
function writeLocal(list){try{globalThis.localStorage?.setItem(LOCAL_KEY(),JSON.stringify(list.slice(-200)))}catch{throw Error('이 기기 저장 공간이 부족해 검토함에 넣지 못했어요.')}}
export function listLocalDrafts(){return readLocal().map(d=>({...d,local:true,createdAt:stamp(d.createdAtMs||0)})).sort((a,b)=>(b.createdAtMs||0)-(a.createdAtMs||0))}
let applyLocal=null;
export function onLocalConfirm(fn){applyLocal=fn}
// 4.11.0 결함 재점검 R-3: 날짜만 미래인 초안도 '예정'으로(시각이 없어도)
const localToday=()=>{const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`};

const TYPES=new Set(['meal','workout','body','food','machine','exercise']);
const DRAFT_ID=/^[A-Za-z0-9_-]{1,100}$/;
const normalize=value=>String(value??'').normalize('NFKC').trim().toLocaleLowerCase('ko-KR').replace(/\s+/g,' ');
const numeric=value=>value==null||String(value).trim()===''?null:Number(value);
const minute=value=>{const time=Date.parse(String(value||''));return Number.isFinite(time)?new Date(time).toISOString().slice(0,16):String(value||'').slice(0,16)};
export function recordIdentity(kind,record){
 if(kind==='meals')return stableJSON([kind,record.date,minute(record.loggedAt),normalize(record.slot),normalize(record.name),numeric(record.servingQty),normalize(record.servingUnit)]);
 if(kind==='workouts')return stableJSON([kind,record.date,normalize(record.title),normalize(record.gymName),(record.exercises||[]).map(ex=>[normalize(ex.name),ex.machineId||'',(ex.sets||[]).map(set=>[numeric(set.originalWeight??set.weight),set.originalUnit||set.unit||'kg',numeric(set.reps),minute(set.completedAt)])])]);
 if(kind==='body')return stableJSON([kind,record.date,...['weight','bodyFatPct','skeletalMuscle','waistCm','bodyFatMass','bmi','score','visceralFatLevel','bmr'].map(key=>numeric(record[key]))]);
 if(kind==='foods')return stableJSON([kind,normalize(record.name),numeric(record.servingQty),normalize(record.servingUnit)]);
 if(kind==='machines')return stableJSON([kind,normalize(record.manufacturer),normalize(record.model),normalize(record.location)]);
 return stableJSON([kind,normalize(record.name),normalize(record.equipment)]);
}
function fingerprint(value){let hash=0xcbf29ce484222325n;for(const byte of new TextEncoder().encode(value)){hash^=BigInt(byte);hash=BigInt.asUintN(64,hash*0x100000001b3n)}return hash.toString(16).padStart(16,'0')}
const evidenceFor=(item,draft)=>{const source=item?.aiEvidence||draft.evidence||{};return {source:source.source||'',sourceUrl:source.sourceUrl||source.url||source.sources?.[0]?.url||'',servingBasis:source.servingBasis||'',note:source.note||''}};
function finalized(records){const identities=new Set();for(const entry of records){const key=recordIdentity(entry.kind,entry.record);if(identities.has(key))throw Error('초안 안에 같은 내용의 기록이 두 번 있습니다. 음식·세트의 시각이나 양을 확인해 주세요.');identities.add(key);entry.record.id=`ai-${fingerprint(key)}`}return records}
let sdkPromise;
async function context(){
  if(!firebaseConfig)throw Error('서버 연결이 필요해요. 로그인 상태를 확인해 주세요.');
  if(!sdkPromise)sdkPromise=Promise.all([
    import('./vendor/firebase/firebase-app.js'),
    import('./vendor/firebase/firebase-auth.js'),
    import('./vendor/firebase/firebase-firestore.js')
  ]).then(([app,auth,fs])=>({app,auth,fs}));
  const sdk=await sdkPromise;
  const app=sdk.app.getApp(),user=sdk.auth.getAuth(app).currentUser;
  if(!user)throw Error('먼저 본인 계정으로 로그인해 주세요.');
  if(cloudState.approval!=='approved')throw Error('계정 이용 승인 후 AI 검토함을 사용할 수 있습니다.');
  return {...sdk,user,db:sdk.fs.getFirestore(app)};
}
export const BRIDGE_PORT=43127;
const bridgeURL=(port,path)=>{const n=Number(port||BRIDGE_PORT);if(!Number.isInteger(n)||n<1024||n>65535)throw Error('포트는 1024~65535 사이 숫자예요.');return `http://127.0.0.1:${n}${path}`};
// 4.17.0 보안: 연결 코드로 서로 확인한다(bridge-proof.js). 코드에서 만든 키만 이 기기·이 계정 공간에 저장한다.
const BRIDGE_KEY=()=>scopedKey('mylogue.bridgeKey');
const loadBridgeKey=()=>{try{const v=globalThis.localStorage?.getItem(BRIDGE_KEY())||'';return /^[0-9a-f]{64}$/.test(v)?v:''}catch{return ''}};
const saveBridgeKey=v=>{try{v?globalThis.localStorage?.setItem(BRIDGE_KEY(),v):globalThis.localStorage?.removeItem(BRIDGE_KEY())}catch{}};
async function bridgeFetch(port,path,body,{timeout=4000}={}){
  const ctl=new AbortController(),t=setTimeout(()=>ctl.abort(),timeout);
  try{
    const r=await fetch(bridgeURL(port,path),body===undefined?{credentials:'omit',referrerPolicy:'no-referrer',signal:ctl.signal,cache:'no-store'}:{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body),credentials:'omit',referrerPolicy:'no-referrer',signal:ctl.signal});
    const b=await r.json().catch(()=>({}));return {ok:r.ok,status:r.status,body:b};
  }finally{clearTimeout(t)}
}
// 도구가 먼저 코드를 아는지 증명해야 한다. 포트를 가로챈 다른 프로그램이나, 다른 포트의 도구 증명을 옮겨 오는 경우를 막는다.
async function verifyBridge(port,key){
  const nonce=newNonce();const r=await bridgeFetch(port,'/hello',{nonce}).catch(()=>null);
  const expect=await proof(key,'bridge',nonce,String(Number(port||BRIDGE_PORT)));
  if(!r?.ok||!sameHex(expect,r.body?.proof))throw Error('연결 코드가 맞지 않거나, 이 포트의 프로그램이 마이로그 도구가 아니에요. AI에게 "마이로그 연결 코드 알려줘"라고 물어 코드를 다시 확인해 주세요.');
}
const appProof=async(key,label)=>{const nonce=newNonce();return {nonce,proof:await proof(key,label,nonce)}};
export async function bridgeStatus(port=BRIDGE_PORT,{timeout=1500}={}){
  let st;try{st=await bridgeFetch(port,'/status',undefined,{timeout})}catch{return null}
  if(!st?.ok||!st.body?.running)return null;
  if(Number(st.body.protocol||0)<4)return {running:true,outdated:true,version:st.body.version||''};
  const key=loadBridgeKey();if(!key)return {running:true,needsCode:true,version:st.body.version};
  try{await verifyBridge(port,key);const info=await bridgeFetch(port,'/info',await appProof(key,'info'));if(info.ok&&info.body?.running)return {...info.body,verified:true}}catch{}
  return {running:true,needsCode:true,version:st.body.version};
}
// 연결: 코드 → 키 → 도구 증명 확인 → (확인된 도구에만) 로그인 토큰 전송
export async function pairLocalAgent(port=BRIDGE_PORT,{code='',remember=true}={}){
  const key=code?await deriveKey(code):loadBridgeKey();
  if(!key)throw Error('AI 도구가 알려 준 연결 코드를 넣어 주세요.');
  const st=await bridgeFetch(port,'/status').catch(()=>null);
  if(!st?.ok)throw Error('이 PC에서 AI 도구가 켜져 있지 않아요. AI 앱(Codex·Claude 등)을 열어 마이로그 도구를 켠 뒤 다시 눌러 주세요.');
  if(Number(st.body?.protocol||0)<4)throw Error('이 PC의 마이로그 도구가 예전 버전이에요. 보안을 위해 도구를 새 버전으로 바꾼 뒤 연결해 주세요.');
  await verifyBridge(port,key);
  const ctx=await context(),idToken=await ctx.auth.getIdToken(ctx.user,true);
  const r=await bridgeFetch(port,'/pair',{...await appProof(key,'pair'),uid:ctx.user.uid,idToken,refreshToken:remember?ctx.user.refreshToken:'',remember},{timeout:15000}).catch(()=>null);
  if(!r?.ok||r.body?.ok!==true)throw Error(r?.body?.error||'AI 도구 연결에 실패했어요. 도구가 켜져 있는지 확인해 주세요.');
  saveBridgeKey(key);
  return r.body;
}
export async function unpairLocalAgent(port=BRIDGE_PORT){
  const key=loadBridgeKey();if(!key)throw Error('이 기기에는 연결 코드 정보가 없어요. AI 도구에서 직접 연결을 끊거나, 연결 코드로 다시 연결한 뒤 해제해 주세요.');
  await verifyBridge(port,key);
  const r=await bridgeFetch(port,'/unpair',await appProof(key,'unpair')).catch(()=>null);
  if(!r?.ok)throw Error(r?.body?.error||'AI 도구에 닿지 않았어요. 도구가 켜져 있을 때 다시 해제해 주세요.');
  saveBridgeKey('');
  return true;
}
export async function listAIDrafts(){
  if(localDraftMode())return listLocalDrafts();
  const ctx=await context();
  const ref=ctx.fs.collection(ctx.db,'users',ctx.user.uid,'aiDrafts');
  const docs=await ctx.fs.getDocsFromServer(ref);
  return docs.docs.map(x=>({id:x.id,...x.data()})).filter(x=>TYPES.has(x.type)).sort((a,b)=>{
    const ta=a.createdAt?.toMillis?.()??0,tb=b.createdAt?.toMillis?.()??0;
    return tb-ta;
  });
}
function draftRecords(draft,reviewedData){
  if(!draft||!DRAFT_ID.test(draft.id)||!TYPES.has(draft.type))throw Error('AI 초안 형식이 올바르지 않습니다.');
  const raw=reviewedData??draft.parsedData;
  if(!raw||typeof raw!=='object')throw Error('AI가 작성한 수치가 없습니다.');
  if(draft.type==='meal'){
    if(!Array.isArray(raw.items)||raw.items.length<1||raw.items.length>30)throw Error('식사 음식은 1~30개여야 합니다.');
    return finalized(raw.items.map((item,i)=>{
      const aiEstimate=item.aiEstimate||null;
      const m=cleanMeal({...item,planned:isFuture(item.loggedAt)||String(item.date||'')>localToday(),id:`ai-${draft.id}-${i}`,mealGroupId:`ai-${draft.id}`,source:aiEstimate?.estimated?'ai-estimated':'ai-reviewed',aiEvidence:evidenceFor(item,draft)});
      return {kind:'meals',record:m};
    }));
  }
  if(draft.type==='workout'){const times=[raw.loggedAt,...(raw.exercises||[]).flatMap(e=>[e.completedAt,...(e.sets||[]).map(s=>s.completedAt)])].filter(Boolean),at=raw.loggedAtTime&&raw.date?`${raw.date}T${raw.loggedAtTime}:00`:null;/* 4.29.3 기준 종목 없는 운동은 확정하지 않는다 */{const miss=missingBases(raw.exercises||[]);if(miss.length)throw Error(missingBaseMessage(miss))}const planned=String(raw.date||'')>localToday()||(at?isFuture(at):times.length>0&&times.every(t=>isFuture(t)));return finalized([{kind:'workouts',record:cleanWorkout({...raw,planned,id:`ai-${draft.id}`,sourceDraftId:`ai-${draft.id}`})}])}
  if(draft.type==='body')return finalized([{kind:'body',record:cleanBody({...raw,id:`ai-${draft.id}`,source:'ai-reviewed'})}]);
  if(draft.type==='food')return finalized([{kind:'foods',record:cleanFoodPreset({...raw,id:`ai-${draft.id}`,source:'ai-reviewed',aiEvidence:evidenceFor(raw,draft)})}]);
  if(draft.type==='machine'){
    const roles=new Set((draft.evidence?.photos||[]).map(x=>x?.role));
    if(!roles.has('whole')||!roles.has('nameplate'))throw Error('머신 전체와 명판 사진 두 장을 AI에게 제공해 주세요.');
    if(!raw.manufacturer||!raw.model||['모름','unknown',''].includes(String(raw.manufacturer).trim().toLowerCase())||['모름','unknown',''].includes(String(raw.model).trim().toLowerCase()))throw Error('제조사와 모델을 확인한 뒤 등록해 주세요.');
    const mach=cleanMachine({...raw,id:`ai-${draft.id}`});/* 4.29.3 머신도 기준 종목 밑으로 */if(!machineBase(mach)){const r=[raw.exercise,raw.name,raw.model,...(mach.aliases||[])].filter(Boolean).map(v=>resolveExercise(String(v))).find(Boolean);if(r)mach.exerciseId=r.id;else throw Error('이 머신이 어떤 운동 머신인지(기준 종목) 골라 주세요.')}
    return finalized([{kind:'machines',record:mach}]);
  }
  {const ce=cleanCustomExercise({...raw,baseExerciseId:raw.baseExerciseId||(raw.kind==='cardio'?'':resolveExercise(raw.base||raw.name)?.id||''),id:`ai-${draft.id}`});if(ce.kind!=='cardio'&&!ce.baseExerciseId)throw Error(`‘${ce.name}’가 어떤 운동인지(기준 종목) 골라 주세요.`);return finalized([{kind:'customExercises',record:ce}])}
}
export function validateDraftRecords(draft,reviewedData){return draftRecords(draft,reviewedData)}
// 4.4.3 점검 C-13: 중복 확인은 앱이 넘겨주는 이 기기 기록(existing)으로 한다(확정마다 서버 기록 전체를 받지 않음). 넘겨주지 않으면 예전처럼 서버에서 읽는다.
export async function resolveAIDraft(draft,{action,reviewedData=null,allowDuplicate=false,existing:local=null}={}){
  if(!DRAFT_ID.test(draft?.id)||!['confirm','reject'].includes(action))throw Error('AI 초안 처리 방식을 확인해 주세요.');
  if(draft.local||String(draft.id).startsWith('l-'))return resolveLocal(draft,{action,reviewedData,allowDuplicate,existing:local});
  const ctx=await context(),draftRef=ctx.fs.doc(ctx.db,'users',ctx.user.uid,'aiDrafts',draft.id);
  let finalRecordIds=[];
  if(action==='confirm'&&!allowDuplicate){
    const proposed=draftRecords(draft,reviewedData);
    const existing=Array.isArray(local)?local:[];
    if(!Array.isArray(local)){const snapshot=await ctx.fs.getDocsFromServer(ctx.fs.collection(ctx.db,'users',ctx.user.uid,'records'));for(const doc of snapshot.docs){const separator=doc.id.indexOf('~');if(separator<0)continue;const payload=doc.data().payload;if(typeof payload!=='string')continue;try{existing.push({kind:doc.id.slice(0,separator),record:JSON.parse(payload)})}catch{}}}
    const dup=findDuplicate(proposed,existing);if(dup)throw Object.assign(Error(duplicateMessage(dup.kind,dup.record)),{code:'duplicate'});
  }

  await ctx.fs.runTransaction(ctx.db,async tx=>{
    const snap=await tx.get(draftRef);
    if(!snap.exists())throw Error('초안을 찾을 수 없습니다.');
    const current={id:snap.id,...snap.data()};
    if(current.status!=='pending')throw Error('이미 처리된 초안입니다. 목록을 새로고침해 주세요.');
    if(action==='reject'){
      tx.update(draftRef,{status:'rejected',reviewedData:{},finalRecordIds:[],reviewedAt:ctx.fs.serverTimestamp(),updatedAt:ctx.fs.serverTimestamp()});
      return;
    }
    const records=draftRecords(current,reviewedData);
    const refs=records.map(({kind,record})=>ctx.fs.doc(ctx.db,'users',ctx.user.uid,'records',`${kind}~${encodeURIComponent(record.id)}`));
    const existing=await Promise.all(refs.map(ref=>tx.get(ref)));
    const plan=recordWritePlan(existing.map(x=>x.exists()?x.data():null));
    records.forEach(({record},i)=>tx.set(refs[i],{revision:plan.revisions[i],payload:stableJSON(record),updatedAt:ctx.fs.serverTimestamp()}));
    finalRecordIds=records.map(({record})=>record.id);
    tx.update(draftRef,{status:'confirmed',reviewedData:reviewedData??current.parsedData,finalRecordIds,reviewedAt:ctx.fs.serverTimestamp(),updatedAt:ctx.fs.serverTimestamp()});
  });
  if(draft.sourceModel==='trainer'&&draft.evidence?.trainerUid&&draft.evidence?.sessionId){
    const edited=action==='confirm'&&reviewedData&&stableJSON(reviewedData)!==stableJSON(draft.parsedData);
    try{const t=draft.evidence.trainerUid,sid=String(draft.evidence.sessionId);await ctx.fs.setDoc(ctx.fs.doc(ctx.db,'sessionAcks',`${t}_${sid}_${ctx.user.uid}`),{trainerUid:t,memberUid:ctx.user.uid,memberName:String(ctx.user.displayName||'').slice(0,60),sessionId:sid,draftId:draft.id,result:action==='reject'?'rejected':edited?'edited':'confirmed',edits:edited?editSummary(draft.parsedData,reviewedData):'',feedback:reviewFeedback(reviewedData),ptDeduct:draft.evidence.ptDeduct!==false,createdAt:ctx.fs.serverTimestamp()})}catch{}
  }
  return finalRecordIds;
}
// 4.1.1 이 초안의 기록 문서가 이미 있을 때(대표님: "같은 AI 초안의 기록이 이미 있습니다"인데 화면엔 없음):
// 문서 ID가 이 초안 전용(ai-<초안>-n)이라 다시 써도 중복이 생기지 않는다. 지워진 자리(payload null)든 남은 기록이든
// 다음 revision으로 이 초안 내용을 다시 쓰고 초안을 확정한다(규칙: update는 revision+1).
export function recordWritePlan(existing){
 return {mode:'write',revisions:existing.map(x=>x?(Number(x.revision)||1)+1:1)};
}
// 4.1.0 중복 판정(대표님: 하루에 같은 음식을 여러 번 먹는다). 식사는 초안의 음식이 '모두' 같은 날·같은 분에 이미 있을 때만 중복.
// 시각이 다르거나 한 가지라도 다르면 새 기록으로 받는다. 운동·수치 등은 기록 하나 단위로 그대로.
export function findDuplicate(proposed,existing){
 const index=new Map();for(const e of existing){const k=recordIdentity(e.kind,e.record);if(!index.has(k))index.set(k,e)}
 const meals=proposed.filter(p=>p.kind==='meals'),others=proposed.filter(p=>p.kind!=='meals');
 for(const p of others){const hit=index.get(recordIdentity(p.kind,p.record));if(hit)return hit}
 if(meals.length){const hits=meals.map(p=>index.get(recordIdentity(p.kind,p.record)));if(hits.every(Boolean))return hits[0]}
 return null;
}
// 4.0.1 어떤 기존 기록과 겹치는지 알려 준다(이름·날짜·시각)
export function duplicateMessage(kind,x={}){const at=x.loggedAt?new Date(x.loggedAt):null,hm=at&&!Number.isNaN(at.getTime())?` ${String(at.getHours()).padStart(2,'0')}:${String(at.getMinutes()).padStart(2,'0')}`:'';const what=kind==='meals'?`‘${x.name||'음식'}${x.servingQty?` ${x.servingQty}${x.servingUnit||''}`:''}’`:kind==='workouts'?`‘${x.title||'운동'}’`:kind==='body'?'같은 측정값':`‘${x.name||'항목'}’`;return `같은 시각에 똑같은 기록이 이미 있어요: ${String(x.date||'').slice(5).replace('-','/')}${hm} ${what}. 이미 확정한 거면 이 초안은 버려 주세요.`}
// 코치에게 보낼 '고친 내용' 한 줄 요약(종목·세트 수 변화)
function editSummary(a={},b={}){const name=x=>(x.exercises||[]).map(e=>`${e.name} ${(e.sets||[]).length}세트`).join(', ');const A=name(a),B=name(b);return (A===B?'세트 무게·횟수를 고쳤어요':`${A} → ${B}`).slice(0,400)}
function reviewFeedback(d={}){const f=d?.feedback||{};return {effort:Number(f.effort)||null,pain:Array.isArray(f.pain)?f.pain.slice(0,8).map(String):[],note:String(f.note||'').slice(0,300)}}
// 3.16.0 AI 입력(붙여넣기)으로 만든 초안을 내 검토함에 넣는다. 같은 내용을 두 번 붙여넣어도 하나만 생긴다(내용 지문 = 문서 ID).
function resolveLocal(draft,{action,reviewedData,allowDuplicate,existing}){
  const list=readLocal(),i=list.findIndex(x=>x.id===draft.id);
  if(i<0)throw Error('초안을 찾을 수 없습니다.');
  if(list[i].status!=='pending')throw Error('이미 처리된 초안입니다. 목록을 새로고침해 주세요.');
  if(action==='reject'){list[i]={...list[i],status:'rejected',reviewedAtMs:Date.now()};writeLocal(list);return []}
  const records=draftRecords(list[i],reviewedData);
  if(!allowDuplicate){const dup=findDuplicate(records,Array.isArray(existing)?existing:[]);if(dup)throw Object.assign(Error(duplicateMessage(dup.kind,dup.record)),{code:'duplicate'})}
  if(!applyLocal)throw Error('기록을 저장할 준비가 안 됐어요. 앱을 다시 열어 주세요.');
  applyLocal(records);
  list[i]={...list[i],status:'confirmed',reviewedData:reviewedData??list[i].parsedData,finalRecordIds:records.map(r=>r.record.id),reviewedAtMs:Date.now()};writeLocal(list);
  return records.map(r=>r.record.id);
}
// 승인 뒤 처음 검토함을 열 때, 이 기기에서 기다리던 초안(로그인 전·승인 전 것 모두)을 서버 검토함으로 옮긴다.
export async function migrateLocalDrafts(){
  if(localDraftMode())return 0;
  let moved=0;
  for(const key of [...new Set([LOCAL_KEY(),'mylogue.localDrafts'])]){
    let list;try{list=JSON.parse(globalThis.localStorage?.getItem(key)||'[]')}catch{list=[]}
    if(!Array.isArray(list))continue;
    const pend=list.filter(d=>d.status==='pending'&&['meal','workout','body'].includes(d.type));
    if(!pend.length)continue;
    await addPastedDrafts(pend.map(d=>({type:d.type,parsedData:d.parsedData,sourceModel:d.sourceModel,originalUtterance:d.originalUtterance,uncertainty:d.uncertainty,evidence:d.evidence})));
    try{globalThis.localStorage?.setItem(key,JSON.stringify(list.filter(d=>d.status!=='pending')))}catch{}
    moved+=pend.length;
  }
  return moved;
}
export async function addPastedDrafts(drafts){
  if(localDraftMode()){
    const list=readLocal();let added=0,duplicate=0;
    for(const d of drafts){
      if(!['meal','workout','body'].includes(d.type))throw Error('AI 입력은 식사·운동·수치 기록만 넣을 수 있어요.');
      const id=`l-${fingerprint(`local ${d.type} ${stableJSON(d.parsedData)}`)}`;
      if(list.some(x=>x.id===id&&x.status==='pending')){duplicate++;continue}
      for(let k=list.length-1;k>=0;k--)if(list[k].id===id)list.splice(k,1);
      const now=Date.now();list.push({id,requestId:id,type:d.type,status:'pending',schemaVersion:1,sourceModel:String(d.sourceModel||'붙여넣기').slice(0,80),originalUtterance:String(d.originalUtterance||'').slice(0,4000),parsedData:d.parsedData,uncertainty:d.uncertainty||{},evidence:d.evidence||{},createdAtMs:now});added++;
    }
    writeLocal(list);
    return {added,duplicate,local:true};
  }
  const ctx=await context();let added=0,duplicate=0;
  for(const d of drafts){
    if(!TYPES.has(d.type)||!['meal','workout','body'].includes(d.type))throw Error('AI 입력은 식사·운동·수치 기록만 넣을 수 있어요.');
    const id=`p-${fingerprint(`${ctx.user.uid}\0${d.type}\0${stableJSON(d.parsedData)}`)}`;
    const ref=ctx.fs.doc(ctx.db,'users',ctx.user.uid,'aiDrafts',id),now=ctx.fs.serverTimestamp();
    const made=await ctx.fs.runTransaction(ctx.db,async tx=>{const snap=await tx.get(ref);if(snap.exists())return false;tx.set(ref,{id,requestId:id,type:d.type,status:'pending',schemaVersion:1,sourceModel:String(d.sourceModel||'붙여넣기').slice(0,80),originalUtterance:String(d.originalUtterance||'').slice(0,4000),parsedData:d.parsedData,uncertainty:d.uncertainty||{},evidence:d.evidence||{},createdAt:now,updatedAt:now});return true});
    made?added++:duplicate++;
  }
  return {added,duplicate};
}
// 3.17.0 앱 안 '말로 입력': 로그인 표와 함께 AI 서버에 보내 마이로그 코드를 받는다(저장은 하지 않음 — 검토함 넣기는 사용자가).
export async function askAIServer(url,{text='',images=[],context='',today='',now=''}={}){
  if(!url)throw Error('AI 서버가 아직 연결되지 않았어요.');
  const ctx=await context_();const token=await ctx.user.getIdToken();
  let r;try{r=await fetch(`${url}/parse`,{method:'POST',headers:{authorization:`Bearer ${token}`,'content-type':'application/json'},body:JSON.stringify({text,images,context,today,now}),credentials:'omit',referrerPolicy:'no-referrer',cache:'no-store'})}catch{throw Error('AI 서버에 연결하지 못했어요. 인터넷 연결을 확인해 주세요.')}
  const body=await r.json().catch(()=>({}));
  if(!r.ok)throw Error(body.error||'AI 정리에 실패했어요.');
  return {text:String(body.text||''),left:Number.isFinite(body.left)?body.left:null};
}
const context_=()=>context();
// 4.0.0 코치 모드 모듈이 같은 Firebase 연결을 쓴다.
export const firestoreContext=()=>context();
export {fingerprint as contentFingerprint};
