// 4.0.0 코치 모드 서버 연동(Firestore). 규칙: firestore.rules의 invites·links·sessionAcks·aiDrafts(코치 생성).
// 코치는 회원 기록 원본을 읽지 않는다. 회원이 동의한 범위의 '요약'만 연동 문서(links.shared)로 받는다.
import {firestoreContext, contentFingerprint} from './ai-drafts.js';
import {sessionDraft} from './coach.js';

const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
export function newInviteCode(rand = Math.random){ let s = ''; for(let i=0; i<8; i++) s += CODE_CHARS[Math.floor(rand()*CODE_CHARS.length)]; return s; }
const ts = v => v?.toDate ? v.toDate().toISOString() : v || '';
const plain = d => { const x = {id:d.id, ...d.data()}; for(const k of ['createdAt','updatedAt','consentAt','warnedMemberAt','warnedTrainerAt','endedAt','expiresAt']) if(x[k]) x[k] = ts(x[k]); return x; };

export async function createInvite({clientId, trainerName}){
 const ctx = await firestoreContext(), code = newInviteCode();
 const expires = new Date(Date.now() + 7*86400000);
 await ctx.fs.setDoc(ctx.fs.doc(ctx.db, 'invites', code), {code, trainerUid:ctx.user.uid, trainerName:String(trainerName||'코치').slice(0,60), clientId:String(clientId).slice(0,80), expiresAt:ctx.fs.Timestamp.fromDate(expires), usedBy:'', createdAt:ctx.fs.serverTimestamp()});
 return {code, expiresAt:expires.toISOString()};
}

// 회원: 초대 코드로 연동(초대 사용 표시와 연동 생성을 한 묶음으로)
export async function acceptInvite(code, {scope={}, memberName=''}={}){
 const c = String(code||'').trim().toUpperCase();
 if(!/^[A-Z2-9]{8}$/.test(c)) throw Error('초대 코드 8자리를 확인해 주세요.');
 const ctx = await firestoreContext(), inv = ctx.fs.doc(ctx.db, 'invites', c);
 const snap = await ctx.fs.getDoc(inv).catch(() => null);
 if(!snap?.exists()) throw Error('초대 코드를 찾지 못했어요. 코치님께 다시 받아 주세요.');
 const d = snap.data();
 if(d.trainerUid===ctx.user.uid) throw Error('내가 만든 초대 코드예요. 회원 계정으로 열어 주세요.');
 if(d.usedBy) throw Error('이미 사용한 초대 코드예요.');
 if(d.expiresAt?.toDate && d.expiresAt.toDate() < new Date()) throw Error('기간이 지난 초대 코드예요. 코치님께 새로 받아 주세요.');
 const linkId = `${d.trainerUid}_${ctx.user.uid}`, now = ctx.fs.serverTimestamp();
 const batch = ctx.fs.writeBatch(ctx.db);
 batch.update(inv, {usedBy:ctx.user.uid});
 batch.set(ctx.fs.doc(ctx.db, 'links', linkId), {trainerUid:d.trainerUid, memberUid:ctx.user.uid, trainerName:d.trainerName||'코치', memberName:String(memberName||ctx.user.displayName||'회원').slice(0,60), clientId:d.clientId||'', inviteCode:c, status:'active', scope:{sessions:true, workouts:!!scope.workouts, diet:!!scope.diet, body:!!scope.body}, shared:{}, pt:{}, schedule:[], consentAt:now, warnedMemberAt:now, createdAt:now, updatedAt:now});
 await batch.commit();
 return linkId;
}

// 내 연동 전부(코치로서 + 회원으로서)
export async function listLinks(){
 const ctx = await firestoreContext(), col = ctx.fs.collection(ctx.db, 'links');
 const [a, b] = await Promise.all([ctx.fs.getDocs(ctx.fs.query(col, ctx.fs.where('trainerUid', '==', ctx.user.uid))), ctx.fs.getDocs(ctx.fs.query(col, ctx.fs.where('memberUid', '==', ctx.user.uid)))]);
 return [...a.docs.map(d => ({...plain(d), trainerMine:true})), ...b.docs.map(d => ({...plain(d), memberMine:true}))];
}
export async function updateLink(id, patch){
 const ctx = await firestoreContext();
 const p = {...patch, updatedAt:ctx.fs.serverTimestamp()};
 if(p.status==='ended'){ p.endedAt = ctx.fs.serverTimestamp(); p.endedBy = ctx.user.uid; }
 if(p.warnedTrainerAt===true) p.warnedTrainerAt = ctx.fs.serverTimestamp();
 await ctx.fs.updateDoc(ctx.fs.doc(ctx.db, 'links', id), p);
}

// 코치: 수업을 회원 검토함으로 보낸다. 같은 수업·같은 회원이면 한 번만(내용 지문 = 문서 ID).
export async function sendSessionTo(session, client, {trainerName}){
 const ctx = await firestoreContext();
 if(!client.memberUid) throw Error('아직 연동되지 않은 회원이에요.');
 const d = sessionDraft(session, client, {trainerUid:ctx.user.uid, trainerName});
 const id = `t-${contentFingerprint(`${ctx.user.uid}\0${session.id}\0${client.memberUid}`)}`;
 const ref = ctx.fs.doc(ctx.db, 'users', client.memberUid, 'aiDrafts', id), now = ctx.fs.serverTimestamp();
 const made = await ctx.fs.runTransaction(ctx.db, async tx => { const s = await tx.get(ref); if(s.exists()) return false; tx.set(ref, {id, requestId:id, type:'workout', status:'pending', schemaVersion:1, sourceModel:'trainer', originalUtterance:d.originalUtterance, parsedData:d.parsedData, uncertainty:{}, evidence:d.evidence, createdAt:now, updatedAt:now}); return true; });
 return {id, made};
}
export async function listAcks(){
 const ctx = await firestoreContext();
 const q = ctx.fs.query(ctx.fs.collection(ctx.db, 'sessionAcks'), ctx.fs.where('trainerUid', '==', ctx.user.uid));
 return (await ctx.fs.getDocs(q)).docs.map(plain);
}
