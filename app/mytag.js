// 5.0.1 마이태그: 고유 닉네임(대표님 2026-11-25). 중복 불가(대소문자 무시), 언제든 바꾸기, 바꾸면 이전 태그는 풀려 다른 사람이 쓸 수 있다.
// 태그로 방 초대(받은 사람의 '받은 초대'에 뜸). 친구 추가·랭킹은 이 태그 위에 붙일 다음 단계.
// 이 파일은 app.js를 import하지 않는다.
import {firestoreContext} from './ai-drafts.js';

export const TAG_RE = /^[가-힣A-Za-z0-9_]{2,16}$/;
export const RESERVED = ['admin', 'mylogue', '마이로그', '운영자', '관리자', 'root', 'system', 'support'];
export const tagKey = t => String(t || '').trim().replace(/^@/, '').toLowerCase();
export function tagProblem(t){
  const v = String(t || '').trim().replace(/^@/, '');
  if(!v) return '마이태그를 적어 주세요.';
  if(v.length < 2 || v.length > 16) return '마이태그는 2~16자로 정해 주세요.';
  if(!TAG_RE.test(v)) return '한글·영문·숫자·밑줄(_)만 쓸 수 있어요(띄어쓰기 안 돼요).';
  if(RESERVED.includes(v.toLowerCase())) return '쓸 수 없는 마이태그예요.';
  return '';
}
let mine = null; // {tag} | {tag:''} 확인 끝, null 아직 모름
export const myTagCached = () => mine?.tag || '';
export async function loadMyTag(force = false){
  if(mine && !force) return mine.tag;
  const c = await firestoreContext(), s = await c.fs.getDoc(c.fs.doc(c.db, 'profiles', c.user.uid));
  mine = {tag: s.exists() ? String(s.data().tag || '') : ''};
  return mine.tag;
}
export async function tagAvailable(t){
  const p = tagProblem(t); if(p) return {ok: false, msg: p};
  const c = await firestoreContext(), s = await c.fs.getDoc(c.fs.doc(c.db, 'tags', tagKey(t)));
  if(!s.exists()) return {ok: true, msg: '쓸 수 있어요.'};
  return s.data().uid === c.user.uid ? {ok: true, msg: '지금 내 마이태그예요.'} : {ok: false, msg: '이미 누가 쓰고 있어요.'};
}
// 새 태그 잡기 + 이전 태그 놓기 + 프로필을 한 묶음으로(규칙이 중복·하나만 가지기를 강제)
export async function setMyTag(t, {rooms = []} = {}){
  const p = tagProblem(t); if(p) throw Error(p);
  const tag = String(t).trim().replace(/^@/, ''), c = await firestoreContext(), fs = c.fs, uid = c.user.uid;
  const old = mine?.tag ?? await loadMyTag();
  const b = fs.writeBatch(c.db), now = fs.serverTimestamp();
  b.set(fs.doc(c.db, 'tags', tagKey(tag)), {uid, tag, updatedAt: now});
  b.set(fs.doc(c.db, 'profiles', uid), {tag, updatedAt: now});
  if(old && tagKey(old) !== tagKey(tag)) b.delete(fs.doc(c.db, 'tags', tagKey(old)));
  try{ await b.commit(); }catch(e){ throw Error(/permission/i.test(String(e?.code || e?.message)) ? '이미 누가 쓰고 있거나 쓸 수 없는 마이태그예요.' : '저장하지 못했어요. 잠시 뒤 다시 해 주세요.'); }
  mine = {tag};
  // 메이트 방에 보이는 내 이름도 새 태그로(실패해도 괜찮음)
  for(const r of rooms){ try{ await fs.updateDoc(fs.doc(c.db, 'rooms', r.id), {[`memberNames.${uid}`]: tag, updatedAt: fs.serverTimestamp()}); r.memberNames = {...r.memberNames, [uid]: tag}; }catch{} }
  return tag;
}
export async function uidOfTag(t){
  const c = await firestoreContext(), s = await c.fs.getDoc(c.fs.doc(c.db, 'tags', tagKey(t)));
  return s.exists() ? {uid: s.data().uid, tag: s.data().tag} : null;
}
// 태그로 방 초대: 초대 코드를 만들고 받는 사람 앞으로 '받은 초대'를 남긴다
export async function inviteByTag(room, t, makeCode){
  const who = await uidOfTag(t); if(!who) throw Error('그 마이태그를 쓰는 사람이 없어요. 철자를 확인해 주세요.');
  const c = await firestoreContext(), fs = c.fs;
  if(who.uid === c.user.uid) throw Error('내 마이태그예요.');
  if(room.memberIds.includes(who.uid)) throw Error(`@${who.tag} 님은 이미 이 방에 있어요.`);
  const code = await makeCode(room);
  try{ await fs.setDoc(fs.doc(c.db, 'mateDirect', `${who.uid}_${room.id}`), {toUid: who.uid, fromUid: c.user.uid, fromTag: (mine?.tag || '').slice(0, 16), roomId: room.id, roomName: room.name, code, createdAt: fs.serverTimestamp()}); }
  catch{ throw Error(`@${who.tag} 님에게 이미 이 방 초대가 가 있어요.`); }
  return who.tag;
}
export async function listDirectInvites(){
  const c = await firestoreContext(), fs = c.fs;
  const snap = await fs.getDocs(fs.query(fs.collection(c.db, 'mateDirect'), fs.where('toUid', '==', c.user.uid)));
  return snap.docs.map(d => ({id: d.id, ...d.data()}));
}
export async function dropDirectInvite(id){ const c = await firestoreContext(); try{ await c.fs.deleteDoc(c.fs.doc(c.db, 'mateDirect', id)); }catch{} }
