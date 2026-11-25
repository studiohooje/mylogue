// 5.0.0 로그메이트 사진: Cloudflare R2(비공개 버킷 MATE). AI를 부르지 않으니 AI 비용과 무관하다.
// 올리기·보기·지우기 모두 Firebase 로그인 + 그 방 멤버인지(Firestore 규칙으로 방 문서를 읽을 수 있는지) 확인한 뒤에만.
// 사진 경로: rooms/{roomId}/{uid}/{id}.webp|jpg — 앱이 줄여서(긴 변 1280px) 보낸다.
import {HttpError} from './handler.js';

const ROOM = /^[A-Za-z0-9]{12,24}$/;
const KEY = /^rooms\/([A-Za-z0-9]{12,24})\/([A-Za-z0-9_-]{1,128})\/([A-Za-z0-9_-]{8,40})\.(webp|jpg)$/;
// 대표님(2026-11-25): 사진을 무분별하게 올려 비용이 감당 안 되지 않게.
// 앱은 긴 변 720px·WebP로 줄여 보낸다(한 장 약 50~90KB). 서버는 한 장 400KB, 한 사람 하루 30장, 전체 저장량 9GB(R2 무료 10GB 아래)에서 멈춘다.
export const MATE_MAX_BYTES = 400_000;
const num = (v, d) => { const n = Number(v); return Number.isFinite(n) && n > 0 ? n : d; };
export const dailyUploads = env => num(env.MATE_DAILY_UPLOADS, 30);
export const totalCapBytes = env => num(env.MATE_TOTAL_MB, 9000) * 1_000_000;
// 멤버 확인 결과를 10분 기억(사진 볼 때마다 Firestore를 읽지 않게). 같은 서버 안에서만 쓰는 임시 기억.
const memberCache = new Map(), MEMBER_TTL = 10 * 60_000;
export const clearMemberCache = () => memberCache.clear();

export const parseKey = key => { const m = KEY.exec(String(key || '')); return m ? {roomId: m[1], uid: m[2], id: m[3], ext: m[4]} : null; };

// 방 멤버인지: 사용자 토큰으로 방 문서를 읽는다(규칙상 멤버만 읽힌다).
export async function isMember(roomId, uid, token, {projectId, fetchImpl, now = Date.now()}) {
  if (!ROOM.test(roomId)) return false;
  const ck = `${uid}|${roomId}`, hit = memberCache.get(ck);
  if (hit && hit.until > now) return hit.ok;
  const ok = await checkMember(roomId, uid, token, {projectId, fetchImpl});
  memberCache.set(ck, {ok, until: now + (ok ? MEMBER_TTL : 60_000)});
  if (memberCache.size > 5000) memberCache.clear();
  return ok;
}
async function checkMember(roomId, uid, token, {projectId, fetchImpl}) {
  const r = await fetchImpl(`https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/rooms/${roomId}`, {headers: {authorization: `Bearer ${token}`}});
  if (r.status === 403 || r.status === 404) return false;
  if (!r.ok) throw new HttpError(503, '방 확인 서버에 연결하지 못했어요. 잠시 뒤 다시 해 주세요.');
  const doc = await r.json();
  return (doc?.fields?.memberIds?.arrayValue?.values || []).some(v => v.stringValue === uid);
}

// 전체 저장량(바이트): uid '*all*', day 'total', feature 'mate-bytes'
async function storedBytes(db) { if (!db) return 0; const row = await db.prepare('SELECT n FROM usage_feature WHERE uid = ?1 AND day = ?2 AND feature = ?3').bind('*all*', 'total', 'mate-bytes').first(); return Number(row?.n || 0); }
async function addBytes(db, n) { if (!db || !n) return; await db.prepare('INSERT INTO usage_feature (uid, day, feature, n) VALUES (?1, ?2, ?3, ?4) ON CONFLICT(uid, day, feature) DO UPDATE SET n = MAX(0, n + ?5) RETURNING n').bind('*all*', 'total', 'mate-bytes', Math.max(0, n), n).first(); }
async function countUpload(db, uid, day) {
  if (!db) return 0;
  const row = await db.prepare('INSERT INTO usage_feature (uid, day, feature, n) VALUES (?1, ?2, ?3, 1) ON CONFLICT(uid, day, feature) DO UPDATE SET n = n + 1 RETURNING n').bind(uid, day, 'mate-up').first();
  return Number(row?.n || 0);
}

// path: 'mate/upload' | 'mate/photo' | 'mate/delete'
export async function mateRoute(path, request, {env, user, token, fetchImpl, now, reply}) {
  const bucket = env.MATE;
  if (!bucket) throw new HttpError(503, '사진 저장소가 아직 연결되지 않았어요.');
  const projectId = env.FIREBASE_PROJECT_ID;
  if (path === 'mate/upload') {
    const url = new URL(request.url), roomId = url.searchParams.get('room') || '', id = url.searchParams.get('id') || '';
    const type = (request.headers.get('content-type') || '').split(';')[0].trim();
    const ext = type === 'image/webp' ? 'webp' : type === 'image/jpeg' ? 'jpg' : '';
    if (!ext) throw new HttpError(415, '사진은 WebP나 JPEG로 보내 주세요.');
    const key = `rooms/${roomId}/${user.uid}/${id}.${ext}`;
    if (!parseKey(key)) throw new HttpError(400, '사진 이름을 확인해 주세요.');
    const len = Number(request.headers.get('content-length') || 0);
    if (len > MATE_MAX_BYTES) throw new HttpError(413, '사진이 너무 커요. 다시 찍어 주세요.');
    if (!await isMember(roomId, user.uid, token, {projectId, fetchImpl, now})) throw new HttpError(403, '이 방의 메이트만 사진을 올릴 수 있어요.');
    if (await storedBytes(env.DB) + Math.max(len, 1) > totalCapBytes(env)) throw new HttpError(507, '사진 저장 공간이 가득 찼어요. 운영자가 정리할 때까지 사진 대신 글로 남겨 주세요.');
    const day = new Date(now + 9 * 3600_000).toISOString().slice(0, 10);
    if (await countUpload(env.DB, user.uid, day) > dailyUploads(env)) throw new HttpError(429, `사진은 하루 ${dailyUploads(env)}장까지 올릴 수 있어요. 내일 다시 해 주세요.`);
    const buf = await request.arrayBuffer();
    if (!buf.byteLength || buf.byteLength > MATE_MAX_BYTES) throw new HttpError(413, '사진이 너무 커요. 다시 찍어 주세요.');
    await addBytes(env.DB, buf.byteLength);
    await bucket.put(key, buf, {httpMetadata: {contentType: type, cacheControl: 'private, max-age=31536000, immutable'}, customMetadata: {uid: user.uid}});
    return reply(200, {key});
  }
  let body = {};
  try { body = await request.json(); } catch { throw new HttpError(400, '요청 형식을 확인해 주세요.'); }
  const k = parseKey(body?.key);
  if (!k) throw new HttpError(400, '사진 이름을 확인해 주세요.');
  if (path === 'mate/photo') {
    if (!await isMember(k.roomId, user.uid, token, {projectId, fetchImpl, now})) throw new HttpError(403, '이 방의 메이트만 볼 수 있어요.');
    const obj = await bucket.get(body.key);
    if (!obj) throw new HttpError(404, '사진을 찾지 못했어요. 지워졌을 수 있어요.');
    return new Response(obj.body, {status: 200, headers: {...reply.cors, 'content-type': obj.httpMetadata?.contentType || 'image/webp', 'cache-control': 'private, max-age=31536000, immutable'}});
  }
  if (path === 'mate/delete') {
    if (k.uid !== user.uid) throw new HttpError(403, '내가 올린 사진만 지울 수 있어요.');
    const head = bucket.head ? await bucket.head(body.key) : null;
    await bucket.delete(body.key);
    if (head?.size) await addBytes(env.DB, -head.size);
    return reply(200, {ok: true});
  }
  throw new HttpError(404, '없는 주소예요.');
}
