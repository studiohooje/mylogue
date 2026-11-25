// 4.28.x 'AI 기록' 대화창의 동작(보내기·양 바꾸기·다른 음식·기록하기·되돌리기·나중에 확인·사진 갈래). 화면은 ai-chat.js.
// 이 파일은 app.js를 import하지 않는다($s·$f로 앱 상태와 공용 함수를 쓴다).
import {$s, $f} from './app-state.js';
import {newChat, replyToMsg, historyForServer, scaleItem, swapItem, CHAT_MAX} from './ai-chat.js';
import {aiRequest} from './ai-client.js';
import {aiContextText} from './ai-paste.js';
import {chatContext} from './ai-coach-ui.js';
import {validateDraftRecords, addPastedDrafts} from './ai-drafts.js';
import {loadFoodDB, foodDBReady, foodDBFull, searchFoodDB} from './food-db.js';
import {kvGet, kvSet} from './kv-store.js';
import {scopedKey} from './storage-scope.js';
import {aiModeDefault, setAiModeDefault} from './ai-mode.js';

const KEY = () => scopedKey('mylogue.aichat');
const st = () => ($s.aiChat ||= newChat());
// 대화는 기기 안(IndexedDB)에 최근 60개만. 사진은 작은 미리보기만 남긴다.
export async function loadChat() {
 const s = st(); if (s.loaded) return;
 s.loaded = true;
 try { const raw = await kvGet(KEY()); const msgs = raw ? JSON.parse(raw) : []; if (Array.isArray(msgs) && !s.msgs.length) { s.msgs = msgs.slice(-CHAT_MAX); $f.render(); scrollEnd(); } } catch {}
}
function persist() { const s = st(); try { kvSet(KEY(), JSON.stringify(s.msgs.slice(-CHAT_MAX))); } catch {} }
function scrollEnd() { globalThis.requestAnimationFrame?.(() => { const l = document.getElementById('chat-log'); const sheet = l?.closest('.sheet'); if (sheet) sheet.scrollTop = sheet.scrollHeight; }); }
// 5.0.0 로그메이트 '식단으로 가져오기': 메이트에 올린 사진(JPEG base64)과 말을 채워 대화창을 연다. 보내기는 사람이 누른다(AI는 누를 때만).
export function openChatWithPhoto(data, thumb, text = '') { const s = st(); s.camMenu = false; s.choose = true; s.photos = [data]; s.thumbs = [thumb]; s.input = String(text || ''); $s.modal = 'ai-chat'; $f.render(); loadChat(); scrollEnd(); }
export function openChat(text = '') { const s = st(); if (text) s.input = text; $s.modal = 'ai-chat'; $f.render(); loadChat(); scrollEnd(); }
async function thumb(file) {
 const url = URL.createObjectURL(file);
 try { const img = await new Promise((ok, no) => { const i = new Image(); i.onload = () => ok(i); i.onerror = () => no(Error('사진을 읽지 못했어요.')); i.src = url; }); const k = Math.min(1, 320 / Math.max(img.width, img.height)), c = document.createElement('canvas'); c.width = Math.round(img.width * k); c.height = Math.round(img.height * k); c.getContext('2d').drawImage(img, 0, 0, c.width, c.height); return c.toDataURL('image/jpeg', 0.6); } finally { URL.revokeObjectURL(url); }
}
// 브랜드 음료·제품(콜라·제로 음료 등)은 음식 DB 두 번째 묶음에 있어, 예시 답이 그걸 쓰도록 잠깐(최대 3초) 기다린다
async function fullDB() {
 if (!foodDBReady()) await loadFoodDB().catch(() => {});
 if (foodDBFull() || !globalThis.addEventListener) return;
 await new Promise(ok => { const t = setTimeout(ok, 3000); globalThis.addEventListener('mylogue-fooddb-more', () => { clearTimeout(t); ok(); }, {once: true}); });
}
async function send({text = null, withPhotos = false} = {}) {
 const s = st(); if (s.asking) return;
 const say = String(text ?? s.input ?? '').trim(), photos = withPhotos ? s.photos : [];
 if (!say && !photos.length) { $f.toast('먹은 것·운동·체중을 적거나 사진을 보내 주세요.'); return; }
 s.msgs.push({id: `u${Date.now().toString(36)}`, role: 'user', text: say, photos: withPhotos ? s.thumbs : [], at: Date.now()});
 s.input = ''; s.asking = true; const images = photos.map(data => ({media_type: 'image/jpeg', data}));
 s.photos = []; s.thumbs = []; $f.render(); scrollEnd();
 const d = new Date(), today = $f.today();
 try {
  await fullDB();
  const r = await aiRequest('converse', {messages: historyForServer(s), images, context: `${aiContextText($s.db)}\n${chatContext($s.db, today)}`.slice(0, 6000), today, now: `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`});
  s.msgs.push(replyToMsg(r.text)); if (r.left != null) s.left = r.left;
 } catch (e) { s.msgs.push({id: `n${Date.now().toString(36)}`, role: 'note', text: e.message || 'AI에게 보내지 못했어요.'}); }
 s.asking = false; s.msgs = s.msgs.slice(-CHAT_MAX); persist(); $f.render(); scrollEnd();
}
const card = key => { const [mi, ci] = key.split('|').map(Number); return st().msgs[mi]?.cards?.[ci]; };
function saveCard(key) {
 const d = card(key); if (!d || d.status !== 'open') return;
 const id = `chat${Date.now().toString(36)}${key.replace(/\|/g, 'x')}`;
 let recs;
 try { recs = validateDraftRecords({...d, id}, d.parsedData); } catch (e) { $f.toast(e.message || '기록을 만들지 못했어요.'); return; }
 let next = $s.db;
 for (const {kind, record} of recs) next = {...next, [kind]: [...(next[kind] || []).filter(x => x.id !== record.id), record]};
 $s.db = $f.save(next);
 d.status = 'saved'; d.savedIds = recs.map(r => ({kind: r.kind, id: r.record.id}));
 persist(); $f.render();
 $f.toast(d.type === 'meal' ? `식사를 기록했어요 · ${Math.round(recs.reduce((s, r) => s + (Number(r.record.calories) || 0), 0)).toLocaleString('ko-KR')}kcal` : '기록했어요');
}
function undoCard(key) {
 const d = card(key); if (!d || d.status !== 'saved') return;
 let next = $s.db;
 for (const {kind, id} of d.savedIds || []) next = {...next, [kind]: (next[kind] || []).filter(x => x.id !== id)};
 $s.db = $f.save(next); d.status = 'open'; delete d.savedIds; persist(); $f.render(); $f.toast('기록을 되돌렸어요.');
}
async function laterCard(key) {
 const d = card(key); if (!d || d.status !== 'open') return;
 try { const {key: _k, status: _s, ...draft} = d; await addPastedDrafts([draft]); d.status = 'later'; persist(); $f.render(); $f.toast('검토함에 넣었어요.'); } catch (e) { $f.toast(e.message || '검토함에 넣지 못했어요.'); }
}
function runSearch(q) {
 const s = st(); if (!s.search) return;
 s.search.q = q;
 const go = () => { s.search.results = q.trim() ? searchFoodDB(q, {limit: 6}) : []; const box = document.querySelector('.chat-search-res'); if (box) $f.render(); };
 if (foodDBReady()) go(); else loadFoodDB().then(go).catch(() => {});
}
// 4.29.0 'AI로 입력' 방식: 기본이 정해져 있으면 바로 그 방식, 없으면 고르는 창
function openMode(mode) {
 $s.aiPick = null;
 if (mode === 'chat') { openChat(); return; }
 if (mode === 'prompt') { $s.modal = 'ai-input'; $f.render(); return; }
 if (mode === 'connect') { $s.modal = null; $s.page = 'settings'; $f.render(); setTimeout(() => document.getElementById('ai-connect')?.scrollIntoView?.({block: 'start', behavior: 'smooth'}), 120); }
}
export function openAIEntry() { const m = aiModeDefault(); if (m) openMode(m); else { $s.aiPick = {}; $s.modal = 'ai-pick'; $f.render(); } }
export function chatClick(t) {
 const d0 = t.dataset || {};
 // 5.0.1 '다른 방법으로 입력': 쓰던 게 있으면 지워진다고 먼저 묻는다
 const busyChat = () => { const s = $s.aiChat; return !!s && ((s.msgs || []).some(m => m.role === 'user') || !!String(s.input || '').trim() || (s.photos || []).length > 0); };
 const busyPaste = () => $s.modal === 'ai-input' && !!String($s.aiInput?.text || '').trim();
 const goPick = () => { $s.aiPickAsk = false; if ($s.aiChat) $s.aiChat.pickAsk = false; $s.aiPick = {}; $s.modal = 'ai-pick'; $f.render(); };
 if (d0.aiPick != null) { if ($s.modal === 'ai-chat' && busyChat()) { st().pickAsk = true; $f.render(); return true; } if (busyPaste()) { $s.aiPickAsk = true; $f.render(); return true; } goPick(); return true; }
 if (d0.aiPickNo != null) { $s.aiPickAsk = false; if ($s.aiChat) $s.aiChat.pickAsk = false; $f.render(); return true; }
 if (d0.aiPickOk != null) { if ($s.modal === 'ai-chat') { $s.aiChat = newChat(); persist(); } else if ($s.aiInput) { $s.aiInput = {...$s.aiInput, text: '', msg: ''}; } $s.sheetDirty = false; goPick(); return true; }
 if (d0.chatCam != null) { st().camMenu = !st().camMenu; $f.render(); return true; }
 if (d0.aiMode) { if (aiModeDefault() === d0.aiMode) openMode(d0.aiMode); else { $s.aiPick = {chosen: d0.aiMode}; $f.render(); } return true; }
 if (d0.aiAlways != null) { setAiModeDefault(d0.aiAlways); if (d0.aiAlways) { $f.toast('앞으로 이 방식으로 바로 열어요.'); openMode(d0.aiAlways); } else { $f.toast('이제 매번 방식을 골라요.'); $f.render(); } return true; }
 if (d0.aiOnce) { openMode(d0.aiOnce); return true; }
 if ($s.modal !== 'ai-chat') {
  if (d0.modal === 'ai-chat') { openAIEntry(); return true; }
  return false;
 }
 const s = st(), ds = t.dataset || {};
 if (t.id === 'chat-send') { send(); return true; }
 if (ds.chatSuggest != null) {
  const v = ds.chatSuggest;
  if (v === '#photo') { document.getElementById('chat-photo')?.click(); return true; }
  if (v.startsWith('!')) { send({text: v.slice(1)}); return true; }
  s.input = v; $f.render(); globalThis.requestAnimationFrame?.(() => { const i = document.getElementById('chat-text'); i?.focus(); i?.setSelectionRange?.(v.length, v.length); }); return true;
 }
 if (ds.chatQty) { const [mi, ci, ii, q] = ds.chatQty.split('|'); const d = card(`${mi}|${ci}`); const it = d?.parsedData?.items?.[ii]; if (it) { d.parsedData.items[ii] = scaleItem(it, Number(q)); persist(); $f.render(); } return true; }
 if (ds.chatSwap) { s.search = {key: ds.chatSwap, q: '', results: []}; $f.render(); globalThis.requestAnimationFrame?.(() => document.getElementById('chat-swap-q')?.focus()); return true; }
 if (ds.chatSwapClose != null) { s.search = null; $f.render(); return true; }
 if (ds.chatPick != null) { const f = s.search?.results?.[Number(ds.chatPick)]; const [mi, ci, ii] = (s.search?.key || '').split('|'); const d = card(`${mi}|${ci}`); if (f && d?.parsedData?.items?.[ii]) { d.parsedData.items[ii] = swapItem(d.parsedData.items[ii], f); s.search = null; persist(); $f.render(); $f.toast(`'${f.name}'로 바꿨어요.`); } return true; }
 if (ds.chatW) { const [mi, ci, dv] = ds.chatW.split('|'); const d = card(`${mi}|${ci}`); if (d?.parsedData?.weight != null) { d.parsedData.weight = Math.round((d.parsedData.weight + Number(dv)) * 10) / 10; persist(); $f.render(); } return true; }
 if (ds.chatSave) { saveCard(ds.chatSave); return true; }
 if (ds.chatUndo) { undoCard(ds.chatUndo); return true; }
 if (ds.chatLater) { laterCard(ds.chatLater); return true; }
 if (ds.chatPhoto === 'ai') { s.choose = false; send({withPhotos: true}); return true; }
 if (ds.chatPhoto === 'only') {
  s.msgs.push({id: `u${Date.now().toString(36)}`, role: 'user', text: s.input || '', photos: s.thumbs, at: Date.now()});
  s.msgs.push({id: `n${Date.now().toString(36)}`, role: 'note', text: '사진을 남겼어요. 음식과 양은 직접 골라 주세요.', action: 'meal'});
  s.photos = []; s.thumbs = []; s.input = ''; persist(); $f.render(); scrollEnd(); return true;
 }
 if (ds.chatPhoto === 'cancel') { s.photos = []; s.thumbs = []; $f.render(); return true; }
 return false;
}
export function chatInput(t) {
 if ($s.modal !== 'ai-chat') return false;
 if (t.id === 'chat-text') { st().input = t.value; return true; }
 if (t.id === 'chat-swap-q') { runSearch(t.value); globalThis.requestAnimationFrame?.(() => { const i = document.getElementById('chat-swap-q'); if (i && document.activeElement !== i) { i.focus(); i.setSelectionRange?.(i.value.length, i.value.length); } }); return true; }
 return false;
}
export function chatChange(t) {
 if (t.id !== 'chat-photo' && t.id !== 'chat-photo-cam') return false;
 st().camMenu = false;
 readPhotos(t);
 return true;
}
async function readPhotos(t) {
 const s = st(), files = [...(t.files || [])].slice(0, 2);
 if (!files.length) return true;
 try { s.photos = await Promise.all(files.map(f => $f.aiPhotoData(f))); s.thumbs = await Promise.all(files.map(thumb)); s.choose = true; $f.render(); scrollEnd(); }
 catch (e) { $f.toast(e.message || '사진을 읽지 못했어요.'); }
 return true;
}
export function chatKey(e) {
 if ($s.modal !== 'ai-chat' || e.target?.id !== 'chat-text' || e.key !== 'Enter' || e.shiftKey || e.isComposing) return false;
 e.preventDefault(); send(); return true;
}
