// 5.0.0 로그메이트 서버 연결: Firestore(방·초대·글·요약·공개 범위 요청) + AI 서버의 사진 저장소(R2).
// 규칙(firestore.rules)이 멤버 확인·공개 범위·전원 동의를 강제하고, 이 파일은 그 모양대로 읽고 쓴다.
// 이 파일은 app.js를 import하지 않는다.
import {firestoreContext} from './ai-drafts.js';
import {aiWorkerUrl} from './ai-config.js';
import {sharesFor, shareKey, MATE_KINDS} from './mate-share.js';
import {myTagCached} from './mytag.js';

export const MATE_MAX = 8;
// 대표님(2026-11-25): 방의 대화·사진은 90일만 보관(지나면 자동 삭제). '내 기록에 남기기'로 옮긴 숫자는 기록으로 영구히 남는다.
export const MATE_KEEP_DAYS = 90;
const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const ID_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz0123456789';
export const randomId = (n = 16, chars = ID_CHARS) => { const a = new Uint8Array(n); (globalThis.crypto || {getRandomValues: x => x.map(() => Math.floor(Math.random() * 256))}).getRandomValues(a); return Array.from(a, v => chars[v % chars.length]).join(''); };
export const newMateCode = () => randomId(8, CODE_CHARS);
export const myMateName = user => String(myTagCached() || user?.displayName || (user?.email || '').split('@')[0] || '나').trim().slice(0, 20) || '나';
const ms = t => t?.toMillis ? t.toMillis() : (typeof t === 'number' ? t : Date.parse(t || '') || 0);
const roomOf = snap => { const d = snap.data() || {}; return {id: snap.id, name: d.name, type: d.type, ownerUid: d.ownerUid, memberIds: d.memberIds || [], memberNames: d.memberNames || {}, scope: {body: false, meal: false, work: false, ...(d.scope || {})}, appliedProposal: d.appliedProposal || '', updatedAt: ms(d.updatedAt)}; };

export async function listRooms(){
  const c = await firestoreContext(), fs = c.fs;
  const snap = await fs.getDocs(fs.query(fs.collection(c.db, 'rooms'), fs.where('memberIds', 'array-contains', c.user.uid)));
  return snap.docs.map(roomOf).sort((a, b) => b.updatedAt - a.updatedAt);
}
export async function getRoom(id){ const c = await firestoreContext(), s = await c.fs.getDoc(c.fs.doc(c.db, 'rooms', id)); return s.exists() ? roomOf(s) : null; }

export async function createRoom({name, type = 'friends', scope = {body: true, meal: true, work: true}}){
  const c = await firestoreContext(), fs = c.fs, id = randomId(16), now = fs.serverTimestamp();
  const sc = Object.fromEntries(MATE_KINDS.map(k => [k, type === 'mine' ? true : scope[k] === true]));
  await fs.setDoc(fs.doc(c.db, 'rooms', id), {name: String(name || '').trim().slice(0, 30) || (type === 'mine' ? '내 방' : '메이트 방'), type, ownerUid: c.user.uid, memberIds: [c.user.uid], memberNames: {[c.user.uid]: myMateName(c.user)}, scope: sc, joinCode: '', appliedProposal: '', createdAt: now, updatedAt: now});
  return id;
}

export async function createMateInvite(room){
  const c = await firestoreContext(), fs = c.fs, code = newMateCode();
  await fs.setDoc(fs.doc(c.db, 'mateInvites', code), {code, roomId: room.id, roomName: room.name, scope: room.scope, inviterUid: c.user.uid, inviterName: myMateName(c.user), memberCount: room.memberIds.length, expiresAt: fs.Timestamp.fromMillis(Date.now() + 7 * 864e5), createdAt: fs.serverTimestamp()});
  return code;
}
export const inviteLink = (code, base = globalThis.location ? `${location.origin}${location.pathname}` : 'https://studiohooje.github.io/mylogue/') => `${base.replace(/\/index\.html$/, '/')}#mate-${code}`;
export async function readMateInvite(code){
  const c = await firestoreContext(), s = await c.fs.getDoc(c.fs.doc(c.db, 'mateInvites', String(code || '').toUpperCase()));
  if(!s.exists()) throw Error('초대 링크를 찾지 못했어요. 메이트에게 새 링크를 받아 주세요.');
  const d = s.data(); if(ms(d.expiresAt) < Date.now()) throw Error('초대 링크가 만료됐어요(7일). 메이트에게 새 링크를 받아 주세요.');
  return {...d, expiresAt: ms(d.expiresAt)};
}
export async function joinRoom(inv){
  const c = await firestoreContext(), fs = c.fs;
  if(inv.memberCount >= MATE_MAX) throw Error(`이 방은 ${MATE_MAX}명이 다 찼어요.`);
  try {
    await fs.updateDoc(fs.doc(c.db, 'rooms', inv.roomId), {memberIds: fs.arrayUnion(c.user.uid), [`memberNames.${c.user.uid}`]: myMateName(c.user), joinCode: inv.code, updatedAt: fs.serverTimestamp()});
  } catch(e){ throw Error(/permission/i.test(String(e?.code || e?.message)) ? `들어가지 못했어요. 이미 들어가 있거나 방이 다 찼을 수 있어요(최대 ${MATE_MAX}명).` : '들어가지 못했어요. 잠시 뒤 다시 해 주세요.'); }
  return inv.roomId;
}
export async function leaveRoom(room){
  const c = await firestoreContext(), fs = c.fs, uid = c.user.uid;
  if(room.ownerUid === uid && room.memberIds.length > 1) throw Error('방장은 먼저 다른 메이트에게 방장을 넘겨야 나갈 수 있어요.');
  for(const k of MATE_KINDS){ try{ await fs.deleteDoc(fs.doc(c.db, 'rooms', room.id, 'shares', `${uid}_${k}`)); }catch{} }
  if(room.memberIds.length <= 1){ await fs.deleteDoc(fs.doc(c.db, 'rooms', room.id)); return; }
  const names = {...room.memberNames}; delete names[uid];
  await fs.updateDoc(fs.doc(c.db, 'rooms', room.id), {memberIds: room.memberIds.filter(x => x !== uid), memberNames: names, updatedAt: fs.serverTimestamp()});
}
export async function handOver(room, to){ const c = await firestoreContext(); await c.fs.updateDoc(c.fs.doc(c.db, 'rooms', room.id), {ownerUid: to, updatedAt: c.fs.serverTimestamp()}); }

// 글(사진·말)
export async function listPosts(roomId, n = 80){
  const c = await firestoreContext(), fs = c.fs;
  const snap = await fs.getDocs(fs.query(fs.collection(c.db, 'rooms', roomId, 'posts'), fs.orderBy('createdAt', 'desc'), fs.limit(n)));
  const since = Date.now() - MATE_KEEP_DAYS * 864e5;
  return snap.docs.map(d => { const x = d.data(); return {id: d.id, ...x, takenAt: ms(x.takenAt), createdAt: ms(x.createdAt) || Date.now()}; }).filter(p => p.createdAt >= since).reverse();
}
// 보관 기간이 지난 글 정리: 방을 열 때 한 번(이 실행 동안 방마다 한 번). 지울 게 없으면 읽기 1번만 든다.
const swept = new Set();
export async function sweepExpired(roomId){
  if(swept.has(roomId)) return 0; swept.add(roomId);
  const c = await firestoreContext(), fs = c.fs;
  const snap = await fs.getDocs(fs.query(fs.collection(c.db, 'rooms', roomId, 'posts'), fs.where('expireAt', '<', fs.Timestamp.now()), fs.limit(30)));
  let n = 0;
  for(const d of snap.docs){ try{ await fs.deleteDoc(d.ref); n++; }catch{} }
  return n;
}
export async function addPost(roomId, {kind = 'photo', text = '', photoKey = '', photoKind = '', takenAt = Date.now(), rec = ''} = {}){
  const c = await firestoreContext(), fs = c.fs, id = randomId(20);
  await fs.setDoc(fs.doc(c.db, 'rooms', roomId, 'posts', id), {uid: c.user.uid, name: myMateName(c.user), kind, text: String(text).slice(0, 500), photoKey, photoKind, takenAt: fs.Timestamp.fromMillis(Math.min(takenAt, Date.now())), rec: String(rec).slice(0, 80), createdAt: fs.serverTimestamp(), expireAt: fs.Timestamp.fromMillis(Date.now() + MATE_KEEP_DAYS * 864e5)});
  return id;
}
export async function deletePost(roomId, post){
  const c = await firestoreContext();
  await c.fs.deleteDoc(c.fs.doc(c.db, 'rooms', roomId, 'posts', post.id));
  if(post.photoKey) try{ await workerCall('mate/delete', {key: post.photoKey}); }catch{}
}

// 사진: AI 서버(R2). 보기는 로그인 토큰이 필요해서 받아서 blob 주소로 만든다.
async function token(){ return (await firestoreContext()).user.getIdToken(); }
async function workerCall(path, body){
  const url = aiWorkerUrl(); if(!url) throw Error('사진 서버가 아직 연결되지 않았어요.');
  const r = await fetch(`${url}/${path}`, {method: 'POST', headers: {'content-type': 'application/json', authorization: `Bearer ${await token()}`}, body: JSON.stringify(body)});
  if(!r.ok){ let m = ''; try{ m = (await r.json()).error; }catch{} throw Error(m || '사진 서버에 연결하지 못했어요.'); }
  return r;
}
export async function uploadPhoto(roomId, blob){
  const url = aiWorkerUrl(); if(!url) throw Error('사진 서버가 아직 연결되지 않았어요.');
  const id = randomId(16);
  const r = await fetch(`${url}/mate/upload?room=${encodeURIComponent(roomId)}&id=${id}`, {method: 'POST', headers: {'content-type': blob.type || 'image/jpeg', authorization: `Bearer ${await token()}`}, body: blob});
  if(!r.ok){ let m = ''; try{ m = (await r.json()).error; }catch{} throw Error(m || '사진을 올리지 못했어요.'); }
  return (await r.json()).key;
}
const photoCache = new Map();
export function photoURL(key){
  if(!photoCache.has(key)) photoCache.set(key, workerCall('mate/photo', {key}).then(r => r.blob()).then(b => URL.createObjectURL(b)).catch(e => { photoCache.delete(key); throw e; }));
  return photoCache.get(key);
}
export async function photoBlob(key){ const u = await photoURL(key); return (await fetch(u)).blob(); }

// 메이트에게 보여 줄 요약: 공개한 종류만 올리고, 비공개로 바뀐 종류는 내 요약을 지운다. 내용이 같으면 다시 쓰지 않는다.
const lastShare = new Map();
export async function syncMyShares(rooms, db, today){
  const c = await firestoreContext(), fs = c.fs, uid = c.user.uid;
  for(const room of rooms){
    if(room.type === 'mine') continue;
    const data = sharesFor(db, today, room.scope);
    for(const k of MATE_KINDS){
      const ref = fs.doc(c.db, 'rooms', room.id, 'shares', `${uid}_${k}`), mk = `${room.id}|${k}`;
      if(room.scope[k]){
        const key = shareKey(data[k]); if(lastShare.get(mk) === key) continue;
        await fs.setDoc(ref, {uid, kind: k, name: myMateName(c.user), data: data[k], updatedAt: fs.serverTimestamp()});
        lastShare.set(mk, key);
      } else if(lastShare.get(mk) !== 'off'){
        try{ await fs.deleteDoc(ref); }catch{}
        lastShare.set(mk, 'off');
      }
    }
  }
}
export async function readShares(room, uid){
  const c = await firestoreContext(), fs = c.fs, out = {};
  for(const k of MATE_KINDS){
    if(!room.scope[k]){ out[k] = {locked: true}; continue; }
    try{ const s = await fs.getDoc(fs.doc(c.db, 'rooms', room.id, 'shares', `${uid}_${k}`)); out[k] = s.exists() ? {...s.data().data, at: ms(s.data().updatedAt)} : {empty: true}; }
    catch{ out[k] = {locked: true}; }
  }
  return out;
}

// 공개 범위 변경 요청: 한 종류씩. 모두 동의하면 그 자리에서 적용(요청 done + 방 공개 범위를 한 묶음으로).
export async function listProposals(roomId){
  const c = await firestoreContext(), fs = c.fs;
  const snap = await fs.getDocs(fs.query(fs.collection(c.db, 'rooms', roomId, 'proposals'), fs.orderBy('createdAt', 'desc'), fs.limit(10)));
  return snap.docs.map(d => ({id: d.id, ...d.data(), createdAt: ms(d.data().createdAt)}));
}
export async function propose(room, kind, to){
  const c = await firestoreContext(), fs = c.fs, uid = c.user.uid, id = randomId(16);
  const alone = room.memberIds.length === 1 && room.memberIds[0] === uid;
  const pref = fs.doc(c.db, 'rooms', room.id, 'proposals', id), b = fs.writeBatch(c.db);
  b.set(pref, {kind, to: !!to, byUid: uid, byName: myMateName(c.user), yes: [uid], no: [], status: alone ? 'done' : 'open', createdAt: fs.serverTimestamp()});
  if(alone) b.update(fs.doc(c.db, 'rooms', room.id), {scope: {...room.scope, [kind]: !!to}, appliedProposal: id, updatedAt: fs.serverTimestamp()});
  await b.commit();
  return {id, applied: alone};
}
export async function vote(room, p, agree){
  const c = await firestoreContext(), fs = c.fs, uid = c.user.uid, pref = fs.doc(c.db, 'rooms', room.id, 'proposals', p.id);
  if(!agree){ await fs.updateDoc(pref, {no: [...p.no, uid], status: 'rejected'}); return 'rejected'; }
  const yes = [...p.yes, uid];
  if(room.memberIds.every(m => yes.includes(m))){
    const b = fs.writeBatch(c.db);
    b.update(pref, {yes, status: 'done'});
    b.update(fs.doc(c.db, 'rooms', room.id), {scope: {...room.scope, [p.kind]: p.to}, appliedProposal: p.id, updatedAt: fs.serverTimestamp()});
    await b.commit(); return 'done';
  }
  await fs.updateDoc(pref, {yes}); return 'open';
}
