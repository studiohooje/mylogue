// 5.0.0 로그메이트(메이트 탭): 방 목록 · 방(채팅형 사진 타임라인) · 앱 안 촬영 · 어디에 올릴까요 · 메이트 대시보드(보기 전용)
// · 방 설정(공개 범위 = 전원 동의, 방장 넘기기, 나가기) · 초대(링크·QR) · 초대받은 화면 · 방 만들기 · 식단으로 가져오기.
// 대표님 결정(2026-11-25): 앱 안에서 찍기만, 찍은 시각 워터마크, 방의 대화·사진은 90일 보관(기록에 남긴 숫자는 영구), 최대 8명.
// 이 파일은 app.js를 import하지 않는다($s·$f로 앱과 이어진다).
import {$s, $f} from './app-state.js';
import {cloudState, cloudLogin} from './cloud-sync.js';
import {brandIcon} from './brand-icons.js';
import {qrMatrix} from './qr.js';
import {scopedKey} from './storage-scope.js';
import {cleanBody} from './domain.js';
import {MATE_KINDS, MATE_KIND_LABEL} from './mate-share.js';
import {stampText, openCamera, closeCamera, capture, cameraSupported} from './mate-camera.js';
import {MATE_MAX, MATE_KEEP_DAYS, sweepExpired, listRooms, getRoom, createRoom, createMateInvite, inviteLink, readMateInvite, joinRoom, leaveRoom, handOver, listPosts, addPost, deletePost, uploadPhoto, photoURL, photoBlob, syncMyShares, readShares, listProposals, propose, vote} from './mate-cloud.js';
import {openChatWithPhoto} from './app-chat.js';
import {TAG_RE, tagProblem, loadMyTag, myTagCached, tagAvailable, setMyTag, inviteByTag, listDirectInvites, dropDirectInvite} from './mytag.js';
import {openAuth, authInlineHTML, rememberInvite, pendingInvite, clearPendingInvite} from './auth-ui.js';

const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));
const eul = w => w + ((w.charCodeAt(w.length - 1) - 0xAC00) % 28 ? '을' : '를');
const COLORS = ['#8ce4e0', '#f2a98a', '#b8aaf2', '#f2d36b', '#7fe0b0', '#9fd2ee', '#d4a6dc', '#ffb3a1'];
const colorOf = uid => COLORS[[...String(uid)].reduce((a, c) => a + c.charCodeAt(0), 0) % COLORS.length];
const DAYS = ['일', '월', '화', '수', '목', '금', '토'];
const p2 = n => String(n).padStart(2, '0');
const hmOf = ms => { const d = new Date(ms); return `${p2(d.getHours())}:${p2(d.getMinutes())}`; };
const dayOf = ms => { const d = new Date(ms); return `${d.getMonth() + 1}월 ${d.getDate()}일 (${DAYS[d.getDay()]})`; };
const ymd = ms => { const d = new Date(ms); return `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}`; };
const LAST_KEY = () => scopedKey('mylogue.mateLastRooms');
const lastRooms = () => { try { const v = JSON.parse(globalThis.localStorage?.getItem(LAST_KEY()) || '[]'); return Array.isArray(v) ? v : []; } catch { return []; } };
const saveLast = ids => { try { globalThis.localStorage?.setItem(LAST_KEY(), JSON.stringify(ids)); } catch {} };

// 5.0.1 초대 링크(#mate-코드)는 앱이 주소를 바꾸기 전에 잡아 둔다(앱이 켜지며 #home으로 바꿔 코드가 사라지던 문제)
try { const m = /^#mate-([A-Z2-9]{8})$/i.exec(String(globalThis.location?.hash || '')); if(m) rememberInvite(m[1].toUpperCase()); } catch {}
const st = () => ($s.mate ||= {view: 'rooms', rooms: null, roomId: '', posts: {}, props: {}, loading: '', err: '', sheet: null, create: null, invite: null, join: null, mate: null, shares: null, detail: null, cap: null, mode: 'food'});
const ready = () => !!cloudState.user && cloudState.approval === 'approved';
const me = () => cloudState.user?.uid || '';
const roomById = id => (st().rooms || []).find(r => r.id === id) || null;

// ---------- 불러오기 ----------
let lastShareSync = 0;
async function loadRooms(force = false){
  const s = st(); if(!ready()) return;
  if(s.rooms && !force) return;
  s.loading = 'rooms'; $f.render();
  try{
    s.rooms = await listRooms(); s.err = '';
    if(Date.now() - lastShareSync > 60_000){ lastShareSync = Date.now(); syncMyShares(s.rooms, $s.db, $f.today()).catch(e => console.warn(e)); }
  }catch(e){ s.err = e.message || '방을 불러오지 못했어요.'; s.rooms = s.rooms || []; }
  s.loading = ''; $f.render();
}
async function loadRoom(id){
  const s = st(); s.loading = 'room'; $f.render();
  try{
    const fresh = await getRoom(id); if(!fresh){ s.err = '방을 찾지 못했어요. 나갔거나 지워졌을 수 있어요.'; s.view = 'rooms'; s.rooms = null; await loadRooms(true); return; }
    s.rooms = [fresh, ...(s.rooms || []).filter(r => r.id !== id)];
    const [posts, props] = await Promise.all([listPosts(id), fresh.type === 'friends' ? listProposals(id) : Promise.resolve([])]);
    s.posts[id] = posts; s.props[id] = props; s.err = '';
    sweepExpired(id).catch(() => {});
  }catch(e){ s.err = e.message || '방을 불러오지 못했어요.'; }
  s.loading = ''; $f.render(); scrollFeedEnd(); fillPhotos();
}
function scrollFeedEnd(){ globalThis.requestAnimationFrame?.(() => { const f = document.querySelector('.mate-feed'); if(f) f.lastElementChild?.scrollIntoView?.({block: 'end'}); }); }
// 사진은 받아서 blob 주소로(로그인 토큰이 필요). 한 번 받은 사진은 이 실행 동안 다시 받지 않는다.
function fillPhotos(){
  globalThis.requestAnimationFrame?.(() => {
    for(const img of document.querySelectorAll('img[data-mate-key]')){
      if(img.dataset.loaded) continue; img.dataset.loaded = '1';
      photoURL(img.dataset.mateKey).then(u => { img.src = u; img.classList.add('on'); }).catch(() => { img.alt = '사진을 불러오지 못했어요'; img.closest('.mate-photo')?.classList.add('fail'); });
    }
  });
}

// ---------- 그리기 ----------
const icon = (n, on = false) => brandIcon(n, '', on);
function head(title, sub = '', {back = '', right = ''} = {}){
  return `<div class="mate-top">${back ? `<button type="button" class="mate-ib" data-mate-go="${esc(back)}" aria-label="뒤로">‹</button>` : ''}<div class="mate-title"><h2>${esc(title)}</h2>${sub ? `<small>${esc(sub)}</small>` : ''}</div>${right}</div>`;
}
const scopeTags = r => r.type === 'mine' ? '<span class="mate-tag">내 방 · 나만 봐요</span>' : `<span class="mate-tag">${r.memberIds.length}명</span>${MATE_KINDS.map(k => `<span class="mate-tag ${r.scope[k] ? 'on' : 'off'}">${MATE_KIND_LABEL[k]}</span>`).join('')}`;
function tagView(first){
  const t = st().tag ||= {value: myTagCached(), msg: '', ok: false};
  return `${head(first ? '마이태그 정하기' : '마이태그 바꾸기', first ? '메이트에서 나를 부르는 이름이에요' : '', {back: first ? '' : 'rooms'})}
  <div class="mate-card"><p class="hint">한 사람만 쓸 수 있는 이름이에요(대소문자 구분 없이). 언제든 바꿀 수 있고, 바꾸면 이전 태그는 다른 사람이 쓸 수 있게 풀려요. 메이트 방에서 이 이름으로 보이고, 이 태그로 방에 초대받을 수 있어요.</p>
  <form class="mate-row" data-mate-form="tag"><span class="mate-at">@</span><input id="mate-tag" maxlength="16" autocomplete="off" autocapitalize="off" value="${esc(t.value)}" placeholder="예: Moon" aria-label="마이태그"><button type="button" class="button secondary" data-mate-tagcheck>확인</button></form>
  ${t.msg ? `<p class="hint ${t.ok ? '' : 'warn'}" role="status">${esc(t.msg)}</p>` : '<p class="hint">한글·영문·숫자·밑줄(_), 2~16자. 띄어쓰기는 안 돼요.</p>'}
  <button type="button" class="button" data-mate-tagsave ${st().busy ? 'disabled' : ''}>${st().busy ? '저장하는 중…' : first ? '이 태그로 시작하기' : '바꾸기'}</button></div>`;
}
export function mytagSettingsHTML(){
  if(!ready()) return '';
  const t = myTagCached();
  return `<section class="section card"><h3>마이태그</h3><p>${t ? `<b class="mate-tagchip">@${esc(t)}</b>` : '아직 정하지 않았어요.'}</p><p class="hint">메이트 방에서 보이는 고유한 이름이에요. 이 태그로 방에 초대받을 수 있어요.</p><button type="button" class="button secondary" data-mate-tagedit>${t ? '바꾸기' : '정하기'}</button></section>`;
}
const codeCardHTML = () => `<div class="mate-card"><b>초대 코드로 다른 방 들어가기</b><p class="hint">메이트에게 받은 8자리 코드를 적어 주세요(링크가 안 열릴 때도 이걸로 들어가요).</p><form class="mate-row" data-mate-form="code"><input id="mate-code" maxlength="9" autocomplete="off" autocapitalize="characters" placeholder="예: ABCD 2345" aria-label="초대 코드"><button type="submit" class="button secondary">들어가기</button></form></div>`;
function roomsView(){
  const s = st(), list = s.rooms || [];
  const rows = list.map(r => `<button type="button" class="mate-room" data-mate-open="${esc(r.id)}"><span class="mate-room-ic" style="--c:${colorOf(r.id)}">${icon('mate', true)}</span><span class="mate-room-txt"><b>${esc(r.name)}</b><span class="mate-tags">${scopeTags(r)}</span></span><span class="mate-chev">›</span></button>`).join('');
  const dir = (s.direct || []).map(d => `<div class="mate-card mate-direct"><b>@${esc(d.fromTag || '메이트')} 님이 '${esc(d.roomName)}'에 초대했어요</b><div class="mate-row"><button type="button" class="button" data-mate-dirok="${esc(d.id)}">보고 들어가기</button><button type="button" class="button secondary" data-mate-dirno="${esc(d.id)}">거절</button></div></div>`).join('');
  return `${head('메이트', myTagCached() ? `@${myTagCached()}` : '사진으로 함께 기록해요', {right: `<button type="button" class="mate-ib" data-mate-tagedit aria-label="마이태그 바꾸기">@</button><button type="button" class="mate-ib" data-mate-go="create" aria-label="방 만들기">＋</button>`})}${dir}
  ${s.loading === 'rooms' && !s.rooms ? '<p class="hint">방을 불러오는 중…</p>' : ''}
  ${rows || (s.rooms ? `<div class="mate-empty"><b>아직 방이 없어요</b><p class="hint">내 방(나만 보는 사진 기록)이나 친구 방을 만들고, 초대 링크로 메이트를 불러 보세요.</p><button type="button" class="button" data-mate-go="create">방 만들기</button></div>` : '')}
  ${codeCardHTML()}
  <p class="hint">방의 대화·사진은 ${MATE_KEEP_DAYS}일 동안 보관돼요. '내 기록에도 남기기'로 옮긴 숫자는 기록으로 계속 남아요.</p>`;
}
function postHTML(p, r){
  const mine = p.uid === me(), name = r.memberNames[p.uid] || p.name || '메이트';
  const who = mine ? '' : `<button type="button" class="mate-av" style="--c:${colorOf(p.uid)}" data-mate-who="${esc(p.uid)}" aria-label="${esc(name)} 기록 보기">${esc(name.slice(0, 1))}</button>`;
  const nameBtn = mine ? '' : `<button type="button" class="mate-name" data-mate-who="${esc(p.uid)}">${esc(name)}</button>`;
  const body = p.kind === 'text' ? `<div class="mate-txt">${esc(p.text)}</div>`
    : `<div class="mate-photo"><img alt="${esc(name)}님이 ${esc(hmOf(p.takenAt))}에 찍은 사진" data-mate-key="${esc(p.photoKey)}"></div>${p.rec ? `<div class="mate-rec">✓ ${esc(p.rec)}</div>` : ''}${mine ? `<div class="mate-acts">${p.photoKind !== 'scale' ? `<button type="button" data-mate-tofood="${esc(p.id)}">식단으로 가져오기</button>` : ''}<button type="button" data-mate-del="${esc(p.id)}">지우기</button></div>` : ''}`;
  return `<div class="mate-msg ${mine ? 'me' : ''}">${who}<div class="mate-col"><div class="mate-who">${nameBtn}<time>${esc(hmOf(p.takenAt || p.createdAt))}</time></div>${body}${mine && p.kind === 'text' ? `<div class="mate-acts"><button type="button" data-mate-del="${esc(p.id)}">지우기</button></div>` : ''}</div></div>`;
}
function proposalHTML(p, r){
  const label = MATE_KIND_LABEL[p.kind], my = me(), voted = p.yes.includes(my) || p.no.includes(my);
  return `<div class="mate-sys" role="status"><b>공개 범위 변경 요청 · ${esc(eul(label))} ${p.to ? '공개' : '비공개'}로</b><span class="hint">${esc(p.byName)} 님이 요청했어요. 메이트 모두 동의해야 바뀌어요.</span>
  <div class="mate-votes">${r.memberIds.map(m => `<span class="mate-vote ${p.yes.includes(m) ? 'y' : p.no.includes(m) ? 'n' : 'w'}">${esc(r.memberNames[m] || '메이트')} ${p.yes.includes(m) ? '동의' : p.no.includes(m) ? '거절' : '기다리는 중'}</span>`).join('')}</div>
  ${voted ? '' : `<div class="mate-row"><button type="button" class="button" data-mate-vote="${esc(p.id)}|1">동의</button><button type="button" class="button secondary" data-mate-vote="${esc(p.id)}|0">거절</button></div>`}</div>`;
}
function roomView(){
  const s = st(), r = roomById(s.roomId); if(!r) return roomsView();
  const posts = s.posts[r.id] || [], props = (s.props[r.id] || []).filter(p => p.status === 'open');
  let lastDay = '', feed = '';
  for(const p of posts){ const d = dayOf(p.takenAt || p.createdAt); if(d !== lastDay){ feed += `<div class="mate-day">${esc(d)}</div>`; lastDay = d; } feed += postHTML(p, r); }
  const sub = r.type === 'mine' ? '내 방 · 나만 봐요' : `${r.memberIds.length}명 · ${MATE_KINDS.filter(k => r.scope[k]).map(k => MATE_KIND_LABEL[k]).join('·') || '기록 비공개'}${MATE_KINDS.some(k => r.scope[k]) ? ' 공개' : ''}`;
  return `${head(r.name, sub, {back: 'rooms', right: `<button type="button" class="mate-ib" data-mate-go="settings" aria-label="방 설정">⋯</button>`})}
  ${props.map(p => proposalHTML(p, r)).join('')}
  <div class="mate-feed" aria-live="polite">${s.loading === 'room' && !posts.length ? '<p class="hint">불러오는 중…</p>' : feed || `<div class="mate-empty"><b>첫 사진을 찍어 보세요</b><p class="hint">체중계 숫자, 먹은 것 포장지, 운동한 순간을 찍어 남겨요. 찍은 시각이 사진에 새겨져요.</p></div>`}</div>
  <form class="mate-compose" data-mate-form="say"><button type="button" class="mate-shoot" data-mate-go="cam" aria-label="사진 찍기"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 8h3l2-3h6l2 3h3v11H4z" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round"/><circle cx="12" cy="13" r="3.5" fill="none" stroke="currentColor" stroke-width="2.2"/></svg></button><input id="mate-say" maxlength="500" placeholder="메시지 보내기" aria-label="메시지" autocomplete="off"><button type="submit" class="button secondary">보내기</button></form>`;
}
function camView(){
  const s = st(), modes = [['food', '음식'], ['scale', '체중계'], ['etc', '운동·기타']];
  return `<div class="mate-cam" role="dialog" aria-label="사진 찍기"><div class="mate-cam-top"><button type="button" class="mate-ib" data-mate-camclose aria-label="닫기">✕</button><span>앱 안에서 찍은 사진만 올라가요</span><span style="width:44px"></span></div>
  <div class="mate-vf"><video id="mate-video" playsinline muted></video><div class="mate-stamp" id="mate-stamp">${esc(stampText())}<small>mylogue</small></div>${s.camErr ? `<p class="mate-cam-err">${esc(s.camErr)}</p>` : ''}</div>
  <div class="mate-modes">${modes.map(([k, l]) => `<button type="button" class="${s.mode === k ? 'on' : ''}" data-mate-mode="${k}">${l}</button>`).join('')}</div>
  <div class="mate-shutter-row"><span></span><button type="button" class="mate-shutter" data-mate-snap aria-label="찍기"></button><span></span></div></div>`;
}
function postSheet(){
  const s = st(), c = s.cap, rooms = s.rooms || [];
  const picks = rooms.map(r => `<button type="button" class="mate-pick ${c.to.includes(r.id) ? 'on' : ''}" data-mate-to="${esc(r.id)}" aria-pressed="${c.to.includes(r.id)}"><span class="ck">${c.to.includes(r.id) ? '✓' : ''}</span><span><b>${esc(r.name)}</b><small>${r.type === 'mine' ? '나만 봐요' : `${r.memberIds.length}명`}</small></span></button>`).join('');
  const rec = c.mode === 'scale' ? `<label class="field">체중(kg)<input id="mate-kg" inputmode="decimal" placeholder="예: 75.0" autocomplete="off"></label><p class="hint">적으면 체중 기록에도 남아요(영구). 비우면 사진만.</p>`
    : c.mode === 'food' ? `<p class="hint">먹은 것은 올린 뒤 사진의 '식단으로 가져오기'로 AI에게 맡기거나, 식사 기록에서 '메이트로그에서 가져오기'로 옮길 수 있어요.</p>` : '';
  return `<div class="mate-ov" data-mate-ovclose><div class="mate-sheet" role="dialog" aria-label="어디에 올릴까요"><div class="mate-sh"><b>어디에 올릴까요?</b><button type="button" class="mate-ib" data-mate-capcancel aria-label="닫기">✕</button></div>
  <div class="mate-row" style="align-items:flex-start;flex-wrap:nowrap"><img class="mate-prev" src="${esc(c.url)}" alt="찍은 사진"><p class="hint">지난번에 고른 방이 미리 골라져 있어요. 바꾸면 다음에도 그대로 기억해요.</p></div>
  ${picks || '<p class="hint">먼저 방을 만들어 주세요.</p>'}
  ${rec ? `<div class="mate-card">${rec}</div>` : ''}
  <button type="button" class="button" data-mate-upload ${c.to.length && !s.busy ? '' : 'disabled'}>${s.busy ? '올리는 중…' : c.to.length ? `${c.to.length}개 방에 올리기` : '방을 골라 주세요'}</button>
  <p class="hint">방의 사진은 ${MATE_KEEP_DAYS}일 뒤 자동으로 지워져요.</p></div></div>`;
}
function bars(m){
  const row = (l, c, v, g) => `<div class="mate-br"><span style="color:${c}">${l}</span><i><em style="width:${g ? Math.min(100, Math.round(v / g * 100)) : 0}%;background:${c}"></em></i></div>`;
  return `<div class="mate-bars">${row('칼', '#8ce4e0', m.kcal, m.goal)}${row('탄', '#f2d36b', m.macros?.carbs, m.goals?.carbs)}${row('단', '#7fe0b0', m.macros?.protein, m.goals?.protein)}${row('지', '#ff8fa3', m.macros?.fat, m.goals?.fat)}</div>`;
}
function spark(arr){
  if(!arr || arr.length < 2) return '';
  const w = 320, h = 70, mn = Math.min(...arr) - .3, mx = Math.max(...arr) + .3, pts = arr.map((v, i) => [i * (w / (arr.length - 1)), h - (v - mn) / (mx - mn) * h]);
  const line = pts.map((q, i) => `${i ? 'L' : 'M'}${q[0].toFixed(1)},${q[1].toFixed(1)}`).join(''), e = pts[pts.length - 1];
  return `<svg viewBox="0 0 ${w} ${h + 6}" class="mate-spark" aria-hidden="true"><path d="${line}L${w},${h}L0,${h}Z" fill="#8ce4e033"/><path d="${line}" fill="none" stroke="#8ce4e0" stroke-width="2.5"/><circle cx="${e[0]}" cy="${e[1]}" r="5" fill="#fff"/></svg>`;
}
function mateSheet(){
  const s = st(), r = roomById(s.roomId), uid = s.mate, sh = s.shares; if(!r || !uid) return '';
  const name = r.memberNames[uid] || '메이트';
  const lock = l => `<div class="mate-lock">🔒 이 방은 ${esc(eul(l))} 공유하지 않아요</div>`;
  const empty = '<p class="hint">아직 올라온 기록이 없어요.</p>';
  const card = (k, inner) => `<button type="button" class="mate-dc" data-mate-detail="${k}" ${sh?.[k]?.locked || sh?.[k]?.empty || !sh ? 'disabled' : ''}><span class="h"><span>${MATE_KIND_LABEL[k] === '수치' ? '체중' : MATE_KIND_LABEL[k]}</span><span>${k === 'work' && sh?.work?.rest ? '☾ 휴식' : '오늘'}</span></span>${!sh ? '<p class="hint">불러오는 중…</p>' : sh[k]?.locked ? lock(MATE_KIND_LABEL[k]) : sh[k]?.empty ? empty : inner}${sh && !sh[k]?.locked && !sh[k]?.empty ? '<span class="go">상세 보기 ›</span>' : ''}</button>`;
  const b = sh?.body || {}, m = sh?.meal || {}, w = sh?.work || {};
  return `<div class="mate-ov" data-mate-ovclose><div class="mate-sheet" role="dialog" aria-label="${esc(name)} 기록"><div class="mate-sh"><b><span class="mate-av sm" style="--c:${colorOf(uid)}">${esc(name.slice(0, 1))}</span>${esc(name)} 님</b><button type="button" class="mate-ib" data-mate-close aria-label="닫기">✕</button></div>
  <p class="hint">'${esc(r.name)}'에서 공개한 기록만 보여요. 보기만 할 수 있어요.</p>
  <div class="mate-dash">
   ${card('body', `<span class="big">${b.kg ?? '–'} <small>kg</small></span>${spark(b.trend)}`)}
   ${card('meal', `<span class="big">${(m.kcal ?? 0).toLocaleString()} <small>${m.goal ? `/ ${m.goal.toLocaleString()}` : 'kcal'}</small></span>${bars(m)}`)}
   ${card('work', `<span class="big">${w.sets ?? 0} <small>세트</small></span><span class="mate-days">${(w.days || []).map(d => `<span><i>${esc(d.d)}</i> <b>${d.rest ? '☾' : esc(d.parts)}</b></span>`).join('')}</span>`)}
  </div></div></div>`;
}
function detailView(){
  const s = st(), r = roomById(s.roomId), uid = s.mate, k = s.detail, d = s.shares?.[k] || {}, name = r?.memberNames?.[uid] || '메이트';
  let inner = '';
  if(k === 'body') inner = `${spark(d.trend)}<div class="mate-list">${(d.list || []).map(x => `<div class="mate-li"><b>${x.kg}kg</b><span>${esc(x.date)}${x.fat != null ? ` · 체지방 ${x.fat}%` : ''}${x.muscle != null ? ` · 골격근 ${x.muscle}kg` : ''}</span></div>`).join('')}</div>`;
  if(k === 'meal') inner = `<div class="mate-card"><b>오늘 ${(d.kcal ?? 0).toLocaleString()} kcal${d.goal ? ` / 목표 ${d.goal.toLocaleString()}` : ''}</b>${bars(d)}</div><div class="mate-list">${(d.meals || []).map(x => `<div class="mate-li"><span>${esc(x.slot)}${x.at ? ` ${esc(x.at)}` : ''}</span><b>${esc(x.name)}</b><span>${x.kcal != null ? `${x.kcal}kcal` : ''}</span></div>`).join('') || '<p class="hint">오늘 식사 기록이 아직 없어요.</p>'}</div><h3>지난 7일</h3><div class="mate-list">${(d.days || []).slice().reverse().map(x => `<div class="mate-li"><span>${esc(x.date)}</span><b>${x.kcal.toLocaleString()} kcal</b></div>`).join('')}</div>`;
  if(k === 'work') inner = `<div class="mate-list">${(d.sessions || []).map(x => `<div class="mate-card"><b>${esc(x.date)} · ${esc(x.title)}</b><p class="hint">${x.items.map(i => `${esc(i.name)} ${i.sets != null ? `${i.sets}세트` : i.min != null ? `${i.min}분` : ''}`).join(' · ')}</p></div>`).join('') || '<p class="hint">운동 기록이 아직 없어요.</p>'}</div>`;
  return `${head(`${name} 님의 ${MATE_KIND_LABEL[k]}`, `${r?.name || ''}에서 보는 중`, {back: 'room-mate'})}<div class="mate-ro">보기 전용이에요. 메이트의 기록은 고칠 수 없어요.</div>${inner}`;
}
function settingsView(){
  const s = st(), r = roomById(s.roomId); if(!r) return roomsView();
  const owner = r.ownerUid === me(), pending = (s.props[r.id] || []).some(p => p.status === 'open');
  return `${head('방 설정', r.name, {back: 'room'})}
  ${r.type === 'friends' ? `<div class="mate-card"><b>메이트 ${r.memberIds.length}명 <small class="hint">(최대 ${MATE_MAX}명)</small></b>${r.memberIds.map(m => `<div class="mate-row" style="justify-content:space-between"><span><span class="mate-av sm" style="--c:${colorOf(m)}">${esc((r.memberNames[m] || '메')[0])}</span>${esc(r.memberNames[m] || '메이트')}${m === r.ownerUid ? ' <span class="mate-tag on">방장</span>' : ''}${m === me() ? ' <small class="hint">나</small>' : ''}</span>${owner && m !== me() ? `<button type="button" class="button secondary" data-mate-hand="${esc(m)}">방장 넘기기</button>` : ''}</div>`).join('')}</div>
  <button type="button" class="button" data-mate-go="invite" ${r.memberIds.length >= MATE_MAX ? 'disabled' : ''}>메이트 초대하기 · 링크·QR</button><form class="mate-row" data-mate-form="taginv"><span class="mate-at">@</span><input id="mate-taginv" maxlength="17" autocomplete="off" autocapitalize="off" placeholder="마이태그로 초대" aria-label="초대할 마이태그"><button type="submit" class="button secondary" ${r.memberIds.length >= MATE_MAX ? 'disabled' : ''}>초대</button></form><p class="hint">방장이 아니어도 초대할 수 있어요. 마이태그로 초대하면 상대의 메이트 탭 '받은 초대'에 떠요.</p>
  <div class="mate-card"><b>메이트끼리 볼 수 있는 기록</b><p class="hint">세 가지를 따로 정해요. 바꿀 때마다 메이트 모두 동의해야 해요. 한 명이라도 거절하면 그대로예요.</p>
  ${MATE_KINDS.map(k => `<button type="button" class="mate-sw ${r.scope[k] ? 'on' : ''}" data-mate-scope="${k}" ${pending ? 'disabled' : ''} aria-pressed="${r.scope[k]}"><span>${MATE_KIND_LABEL[k]}<small class="hint">${r.scope[k] ? '공개 중' : '비공개'}</small></span><span class="tog"></span></button>`).join('')}
  ${pending ? '<p class="hint warn">변경 요청이 진행 중이에요. 끝나면 다시 바꿀 수 있어요.</p>' : ''}</div>` : '<p class="hint">내 방은 나만 봐요.</p>'}
  ${s.confirmLeave ? `<div class="mate-card"><b>정말 나갈까요?</b><p class="hint">${r.memberIds.length <= 1 ? '혼자 있는 방이라 나가면 방이 지워져요.' : '내가 올린 사진·글은 보관 기간이 끝날 때까지 남아요. 메이트에게 보이던 내 기록 요약은 바로 지워져요.'}</p><div class="mate-row"><button type="button" class="button" data-mate-leave="yes">나가기</button><button type="button" class="button secondary" data-mate-leave="no">그만두기</button></div></div>` : `<button type="button" class="button secondary" data-mate-leave="ask">방 나가기</button>`}
  <p class="hint">방의 대화·사진은 ${MATE_KEEP_DAYS}일 뒤 자동으로 지워져요. 기록에 남긴 숫자는 그대로예요.</p>${codeCardHTML()}`;
}
function qrSVG(text){ try{ const m = qrMatrix(text), n = m.length, q = 2; let d = ''; m.forEach((row, y) => row.forEach((on, x) => { if(on) d += `M${x + q} ${y + q}h1v1h-1z`; })); return `<svg viewBox="0 0 ${n + q * 2} ${n + q * 2}" class="mate-qr" role="img" aria-label="초대 QR 코드"><rect width="100%" height="100%" fill="#fff"/><path d="${d}" fill="#101625"/></svg>`; }catch{ return ''; } }
function inviteView(){
  const s = st(), r = roomById(s.roomId), inv = s.invite;
  if(!inv) return `${head('메이트 초대', r?.name || '', {back: 'settings'})}<p class="hint">초대 링크를 만드는 중…</p>`;
  const link = inviteLink(inv.code);
  return `${head('메이트 초대', r?.name || '', {back: 'settings'})}<div class="mate-card mate-inv">${qrSVG(link)}<b>QR을 찍거나 링크를 받으면 들어올 수 있어요</b><code class="mate-code">${esc(link)}</code><div class="mate-row"><button type="button" class="button" data-mate-copy>링크 복사</button>${globalThis.navigator?.share ? '<button type="button" class="button secondary" data-mate-share>보내기</button>' : ''}</div><div class="mate-bigcode" aria-label="초대 코드"><small>초대 코드</small><b>${esc(inv.code.slice(0, 4))} ${esc(inv.code.slice(4))}</b></div><button type="button" class="button secondary" data-mate-copycode>코드만 복사</button><p class="hint">링크가 안 열리면 메이트 탭의 '초대 코드'에 이 8자리를 적으면 돼요. 7일 동안 쓸 수 있어요. 들어오는 사람은 이 방의 공개 범위(${MATE_KINDS.map(k => `${MATE_KIND_LABEL[k]} ${r?.scope?.[k] ? '공개' : '비공개'}`).join(' · ')})를 보고 동의한 뒤 들어와요.</p></div>`;
}
function joinView(){
  const s = st(), j = s.join;
  if(!ready()){ if(j?.code) rememberInvite(j.code); return `${head('초대받았어요')}<div class="mate-card"><b>${cloudState.user ? '이용 승인을 받으면 바로 들어갈 수 있어요' : '로그인하거나 가입하면 바로 들어갈 수 있어요'}</b><p class="hint">${cloudState.user ? '설정 → 내 계정에서 이용 신청을 해 주세요. 승인되면 이 초대가 자동으로 다시 열려요.' : '처음이면 아래에서 바로 가입돼요. 로그인하면 이 초대가 다시 열려요(3일 동안 기억).'}</p>${cloudState.user ? '' : authInlineHTML()}</div>`; }
  if(!j || j.loading) return `${head('초대받았어요')}<p class="hint">초대 정보를 불러오는 중…</p>`;
  if(j.err) return `${head('초대받았어요', '', {back: 'rooms'})}<div class="mate-card"><b>${esc(j.err)}</b></div>`;
  const inv = j.inv;
  return `${head('초대받았어요', '', {back: 'rooms'})}<div class="mate-card"><b class="mate-big">${esc(inv.inviterName)} 님이 '${esc(inv.roomName)}'에 초대했어요</b><p class="hint">메이트 ${inv.memberCount}명 · 사진으로 체중·식사·운동을 같이 남기는 방이에요.</p>
  <b>이 방에서는 메이트끼리 이 기록을 서로 볼 수 있어요</b><div class="mate-list">${MATE_KINDS.map(k => `<div class="mate-li"><b>${MATE_KIND_LABEL[k]}</b><span>${inv.scope[k] ? '서로 볼 수 있어요(보기만)' : '보지 않아요'}</span></div>`).join('')}</div>
  <p class="hint">나중에 바꾸려면 메이트 모두 동의해야 해요. 방의 대화·사진은 ${MATE_KEEP_DAYS}일 동안 보관돼요.</p>
  <button type="button" class="button" data-mate-joinok ${s.busy ? 'disabled' : ''}>${s.busy ? '들어가는 중…' : '동의하고 들어가기'}</button><button type="button" class="button secondary" data-mate-go="rooms">들어가지 않기</button></div>`;
}
function createView(){
  const c = st().create ||= {name: '', type: 'friends', scope: {body: true, meal: true, work: true}};
  return `${head('방 만들기', '', {back: 'rooms'})}
  <label class="field">방 이름<input id="mate-cname" maxlength="30" value="${esc(c.name)}" placeholder="예: 다이어트 메이트"></label>
  <div class="seg" role="group" aria-label="방 종류"><button type="button" data-mate-ctype="friends" class="${c.type === 'friends' ? 'active' : ''}" aria-pressed="${c.type === 'friends'}">친구 방</button><button type="button" data-mate-ctype="mine" class="${c.type === 'mine' ? 'active' : ''}" aria-pressed="${c.type === 'mine'}">내 방(나만 봐요)</button></div>
  ${c.type === 'friends' ? `<div class="mate-card"><b>메이트끼리 볼 수 있는 기록</b><p class="hint">지금 정해요. 나중에 바꾸려면 메이트 모두 동의가 필요해요.</p>${MATE_KINDS.map(k => `<button type="button" class="mate-sw ${c.scope[k] ? 'on' : ''}" data-mate-cscope="${k}" aria-pressed="${c.scope[k]}"><span>${MATE_KIND_LABEL[k]}<small class="hint">${c.scope[k] ? '공개' : '비공개'}</small></span><span class="tog"></span></button>`).join('')}</div>` : '<p class="hint">내 방은 나만 봐요. 사진을 모아 보는 앨범처럼 써요.</p>'}
  <button type="button" class="button" data-mate-createok ${st().busy ? 'disabled' : ''}>${c.type === 'friends' ? '만들고 초대하기' : '만들기'}</button><p class="hint">만든 사람이 방장이 돼요. 방장은 다른 메이트에게 넘길 수 있어요. 한 방은 최대 ${MATE_MAX}명.</p>`;
}
function foodSheet(){
  const f = st().food; if(!f) return '';
  return `<div class="mate-ov" data-mate-ovclose><div class="mate-sheet" role="dialog" aria-label="식단으로 가져오기"><div class="mate-sh"><b>식단으로 가져오기</b><button type="button" class="mate-ib" data-mate-foodclose aria-label="닫기">✕</button></div>
  <div class="mate-row" style="flex-wrap:nowrap;align-items:flex-start">${f.url ? `<img class="mate-prev" src="${esc(f.url)}" alt="고른 사진">` : ''}<p class="hint">${esc(f.when)}에 찍은 사진이에요. 먹은 시각은 이 시각으로 넣어요.</p></div>
  <b>이 양을 몇 명이서 먹었나요?</b><div class="mate-row">${[1, 2, 3, 4].map(n => `<button type="button" class="button ${f.n === n ? '' : 'secondary'}" data-mate-share-n="${n}">${n === 1 ? '혼자' : `${n}명`}</button>`).join('')}<label class="mate-nin">직접<input id="mate-n" inputmode="numeric" maxlength="2" value="${f.n > 4 ? f.n : ''}" aria-label="함께 먹은 사람 수"></label></div>
  <p class="hint">${f.n > 1 ? `칼로리·탄단지를 ${f.n}분의 1로 나눠 내 몫만 기록해요.` : '전부 내가 먹은 걸로 기록해요.'} AI가 사진을 보고 초안을 만들면 확인한 뒤 저장해요(AI는 이 버튼을 누를 때만 불러요).</p>
  <button type="button" class="button" data-mate-foodgo ${f.busy ? 'disabled' : ''}>${f.busy ? '사진 준비 중…' : 'AI로 기록 초안 만들기'}</button></div></div>`;
}
function pickerSheet(){
  const pk = st().picker; if(!pk) return '';
  const rows = (pk.items || []).map(x => `<button type="button" class="mate-pickph" data-mate-pickph="${esc(x.roomId)}|${esc(x.id)}"><img alt="${esc(x.when)}에 찍은 사진" data-mate-key="${esc(x.photoKey)}"><span>${esc(x.when)}<small>${esc(x.room)}</small></span></button>`).join('');
  return `<div class="mate-ov" data-mate-ovclose><div class="mate-sheet" role="dialog" aria-label="메이트로그에서 가져오기"><div class="mate-sh"><b>메이트로그에서 가져오기</b><button type="button" class="mate-ib" data-mate-pickclose aria-label="닫기">✕</button></div>
  <p class="hint">최근 ${MATE_KEEP_DAYS}일 안에 내가 메이트 방에 올린 사진이에요. 고르면 '몇 명이서 먹었나요?'로 이어져요.</p>
  ${pk.loading ? '<p class="hint">불러오는 중…</p>' : rows ? `<div class="mate-pickgrid">${rows}</div>` : '<p class="hint">아직 올린 사진이 없어요. 메이트 탭에서 먹은 것을 찍어 올려 보세요.</p>'}</div></div>`;
}

export function matePageHTML(){
  const s = st();
  if(s.view === 'join') return `<section class="mate-page">${joinView()}</section>`;
  if($s.DEMO) return `<section class="mate-page">${head('메이트', '사진으로 함께 기록해요')}<div class="mate-card"><b>둘러보기에서는 메이트를 쓸 수 없어요</b><p class="hint">로그인하면 내 방·친구 방을 만들고, 앱 안에서 찍은 사진(찍은 시각이 새겨짐)을 메이트와 나눠요. 메이트의 체중·식단·운동은 방에서 공개한 것만 보기 전용으로 볼 수 있어요.</p></div></section>`;
  if(!ready()) return `<section class="mate-page">${head('메이트', '사진으로 함께 기록해요')}<div class="mate-card"><b>${cloudState.user ? '이용 승인 후 쓸 수 있어요' : '로그인하면 쓸 수 있어요'}</b><p class="hint">메이트는 사진과 기록 요약을 서버에 올려 메이트와 나누는 기능이라 로그인과 이용 승인이 필요해요.</p>${cloudState.user ? '' : '<button type="button" class="button" data-mate-login>로그인</button>'}</div></section>`;
  if(s.tagState === undefined){ s.tagState = 'loading'; loadMyTag().then(t => { s.tagState = t ? 'set' : 'none'; $f.render(); }).catch(() => { s.tagState = 'set'; $f.render(); }); listDirectInvites().then(x => { s.direct = x; $f.render(); }).catch(() => {}); }
  if(s.tagState === 'loading') return `<section class="mate-page">${head('메이트')}<p class="hint">불러오는 중…</p></section>`;
  if(s.tagState === 'none' || s.view === 'tag') return `<section class="mate-page">${tagView(s.tagState === 'none')}</section>`;
  if(s.rooms === null && s.loading !== 'rooms') queueMicrotask(() => loadRooms());
  const v = s.view;
  const main = v === 'room' || v === 'cam' ? roomView() : v === 'detail' ? detailView() : v === 'settings' ? settingsView() : v === 'invite' ? inviteView() : v === 'create' ? createView() : roomsView();
  return `<section class="mate-page">${s.err ? `<p class="hint warn" role="alert">${esc(s.err)}</p>` : ''}${main}${v === 'cam' ? camView() : ''}${s.cap ? postSheet() : ''}${s.mate && s.view === 'room' ? mateSheet() : ''}${s.food ? foodSheet() : ''}${s.picker ? pickerSheet() : ''}</section>`;
}
// 다른 화면(식사 기록 등)에서도 '메이트로그에서 가져오기' 창을 띄울 수 있게
export function mateOverlayHTML(){ const s = st(); return $s.page === 'mate' ? '' : `${s.food ? foodSheet() : ''}${s.picker ? pickerSheet() : ''}`; }

// ---------- 동작 ----------
let stampTimer = 0;
async function startCam(){
  const s = st(); s.camErr = '';
  await new Promise(r => globalThis.requestAnimationFrame ? requestAnimationFrame(r) : setTimeout(r, 0));
  const v = document.getElementById('mate-video'); if(!v) return;
  try{ await openCamera(v); }catch(e){ s.camErr = e.message; $f.render(); }
  clearInterval(stampTimer); stampTimer = setInterval(() => { const el = document.getElementById('mate-stamp'); if(!el){ clearInterval(stampTimer); return; } el.firstChild.textContent = stampText(); }, 15000);
}
function stopCam(){ closeCamera(); clearInterval(stampTimer); }
function go(view){
  const s = st(); s.err = '';
  if(view === 'room-mate'){ s.view = 'room'; $f.render(); fillPhotos(); return; }
  if(view === 'cam'){
    if(!cameraSupported()){ $f.toast('이 기기·브라우저에서는 카메라를 열 수 없어요.'); return; }
    s.view = 'cam'; $f.render(); startCam(); return;
  }
  if(view === 'invite'){ s.view = 'invite'; s.invite = null; $f.render(); const r = roomById(s.roomId); createMateInvite(r).then(code => { s.invite = {code}; $f.render(); }).catch(e => { s.err = e.message || '초대 링크를 만들지 못했어요.'; s.view = 'settings'; $f.render(); }); return; }
  if(view === 'rooms'){ if(s.view === 'join') clearPendingInvite(); s.view = 'rooms'; s.join = null; s.confirmLeave = false; $f.render(); loadRooms(true); return; }
  if(view === 'room'){ s.view = 'room'; s.confirmLeave = false; $f.render(); fillPhotos(); scrollFeedEnd(); return; }
  s.view = view; $f.render();
}
async function jpegData(blob){
  const url = URL.createObjectURL(blob);
  try{
    const img = await new Promise((ok, no) => { const i = new Image(); i.onload = () => ok(i); i.onerror = () => no(Error('사진을 읽지 못했어요.')); i.src = url; });
    const c = document.createElement('canvas'); c.width = img.width; c.height = img.height; c.getContext('2d').drawImage(img, 0, 0);
    const t = document.createElement('canvas'), k = Math.min(1, 320 / Math.max(img.width, img.height)); t.width = Math.round(img.width * k); t.height = Math.round(img.height * k); t.getContext('2d').drawImage(img, 0, 0, t.width, t.height);
    return {data: c.toDataURL('image/jpeg', 0.85).split(',')[1], thumb: t.toDataURL('image/jpeg', 0.7)};
  } finally { URL.revokeObjectURL(url); }
}
function openFood(post, roomName = ''){
  const s = st(), when = `${dayOf(post.takenAt || post.createdAt)} ${hmOf(post.takenAt || post.createdAt)}`;
  s.food = {post, n: 1, when, url: '', room: roomName}; $f.render();
  photoURL(post.photoKey).then(u => { if(s.food?.post === post){ s.food.url = u; $f.render(); } }).catch(() => {});
}
// 식사 기록 쪽에서 부르는 '메이트로그에서 가져오기'
export async function openMatePicker(){
  const s = st();
  if(!ready()){ $f.toast('메이트는 로그인·이용 승인 후 쓸 수 있어요.'); return; }
  s.picker = {loading: true, items: []}; $f.render();
  try{
    if(!s.rooms) s.rooms = await listRooms();
    const items = [];
    for(const r of s.rooms){ const ps = s.posts[r.id] || await listPosts(r.id, 40); s.posts[r.id] = ps; for(const p of ps) if(p.uid === me() && p.kind === 'photo' && p.photoKind !== 'scale') items.push({...p, roomId: r.id, room: r.name, when: `${dayOf(p.takenAt)} ${hmOf(p.takenAt)}`}); }
    const seen = new Set(); s.picker = {loading: false, items: items.sort((a, b) => b.takenAt - a.takenAt).filter(x => { const k = Math.round(x.takenAt / 60000); if(seen.has(k)) return false; seen.add(k); return true; }).slice(0, 30)};
  }catch(e){ s.picker = {loading: false, items: [], err: e.message}; $f.toast(e.message || '불러오지 못했어요.'); }
  $f.render(); fillPhotos();
}
export function openMateJoin(code){ const s = st(); $s.page = 'mate'; s.view = 'join'; s.join = {loading: true, code}; $f.render(); if(!ready()) return; readMateInvite(code).then(inv => { s.join = {inv}; $f.render(); }).catch(e => { s.join = {err: e.message}; $f.render(); }); }

export async function mateClick(t){
  if(!t?.closest) return false;
  const d = t.dataset || {}, s = st();
  if(d.mateTagedit !== undefined){ s.tag = {value: myTagCached(), msg: '', ok: false}; s.view = 'tag'; if($s.page !== 'mate') $s.page = 'mate'; $f.render(); return true; }
  if(d.mateTagcheck !== undefined){ const v = document.getElementById('mate-tag')?.value || ''; s.tag = {value: v, msg: '확인하는 중…', ok: false}; $f.render(); tagAvailable(v).then(r => { s.tag = {value: v, msg: r.msg, ok: r.ok}; $f.render(); }).catch(e => { s.tag = {value: v, msg: e.message, ok: false}; $f.render(); }); return true; }
  if(d.mateTagsave !== undefined){ const v = document.getElementById('mate-tag')?.value || ''; const p = tagProblem(v); if(p){ s.tag = {value: v, msg: p, ok: false}; $f.render(); return true; } s.busy = true; $f.render(); try{ const t = await setMyTag(v, {rooms: s.rooms || []}); s.busy = false; s.tagState = 'set'; s.view = 'rooms'; s.tag = null; $f.toast(`마이태그를 @${t}(으)로 정했어요.`); $f.render(); }catch(e){ s.busy = false; s.tag = {value: v, msg: e.message, ok: false}; $f.render(); } return true; }
  if(d.mateDirok){ const x = (s.direct || []).find(i => i.id === d.mateDirok); if(x){ s.direct = s.direct.filter(i => i.id !== x.id); dropDirectInvite(x.id); openMateJoin(x.code); } return true; }
  if(d.mateDirno){ s.direct = (s.direct || []).filter(i => i.id !== d.mateDirno); dropDirectInvite(d.mateDirno); $f.toast('초대를 거절했어요.'); $f.render(); return true; }
  if(d.matePicker !== undefined){ openMatePicker(); return true; }
  if(d.mateLogin !== undefined){ openAuth('pick', {reason: '메이트는 로그인하고 이용 승인을 받으면 쓸 수 있어요.'}); return true; }
  if(d.mateGo){ if(s.view === 'cam') stopCam(); go(d.mateGo); return true; }
  if(d.mateOpen){ s.roomId = d.mateOpen; s.view = 'room'; s.mate = null; $f.render(); loadRoom(d.mateOpen); return true; }
  if(d.mateCamclose !== undefined){ stopCam(); s.view = 'room'; s.camErr = ''; $f.render(); fillPhotos(); return true; }
  if(d.mateMode){ s.mode = d.mateMode; const el = document.querySelectorAll('[data-mate-mode]'); el.forEach(b => b.classList.toggle('on', b.dataset.mateMode === s.mode)); return true; }
  if(d.mateSnap !== undefined){
    const v = document.getElementById('mate-video');
    try{
      const shot = await capture(v);
      stopCam();
      const valid = new Set((s.rooms || []).map(r => r.id));
      let to = lastRooms().filter(id => valid.has(id)); if(!to.length && s.roomId) to = [s.roomId];
      s.cap = {...shot, mode: s.mode, url: URL.createObjectURL(shot.blob), to}; s.view = 'room'; $f.render();
    }catch(e){ $f.toast(e.message); }
    return true;
  }
  if(d.mateTo){ const c = s.cap, i = c.to.indexOf(d.mateTo); i < 0 ? c.to.push(d.mateTo) : c.to.splice(i, 1); $f.render(); return true; }
  if(d.mateCapcancel !== undefined){ if(s.cap?.url) URL.revokeObjectURL(s.cap.url); s.cap = null; $f.render(); fillPhotos(); return true; }
  if(d.mateUpload !== undefined){
    const c = s.cap; if(!c?.to.length || s.busy) return true;
    const kg = Number(String(document.getElementById('mate-kg')?.value || '').replace(',', '.'));
    let rec = '';
    if(c.mode === 'scale' && kg > 20 && kg < 400){ try{ const body = cleanBody({date: ymd(c.at), weight: Math.round(kg * 10) / 10, source: 'mate', measure: 'scale'}); $s.db = $f.save({...$s.db, body: [...($s.db.body || []), body]}); rec = `체중 ${body.weight}kg 기록`; }catch(e){ $f.toast(e.message); return true; } }
    s.busy = true; $f.render();
    const done = [], fail = [];
    for(const id of c.to){ try{ const key = await uploadPhoto(id, c.blob); await addPost(id, {kind: 'photo', photoKey: key, photoKind: c.mode, takenAt: c.at, rec}); done.push(id); }catch(e){ fail.push(e.message); } }
    s.busy = false;
    if(done.length){ saveLast([...c.to]); URL.revokeObjectURL(c.url); s.cap = null; const names = done.map(id => roomById(id)?.name).filter(Boolean).join(' · '); $f.toast(`${names}에 올렸어요${rec ? ` · ${rec}` : ''}. 다음에도 이 방들이 먼저 골라져요`); if(!done.includes(s.roomId)) s.roomId = done[0]; loadRoom(s.roomId); }
    else { $f.toast(fail[0] || '올리지 못했어요.'); $f.render(); }
    return true;
  }
  if(d.mateWho){ s.mate = d.mateWho; s.shares = null; $f.render(); const r = roomById(s.roomId); readShares(r, d.mateWho).then(x => { s.shares = x; $f.render(); }).catch(e => { s.shares = {body: {locked: true}, meal: {locked: true}, work: {locked: true}}; $f.toast(e.message); $f.render(); }); return true; }
  if(d.mateClose !== undefined){ s.mate = null; $f.render(); fillPhotos(); return true; }
  if(d.mateOvclose !== undefined && t.matches?.('[data-mate-ovclose]')){ return true; }
  if(d.mateDetail){ s.detail = d.mateDetail; s.view = 'detail'; $f.render(); globalThis.scrollTo?.(0, 0); return true; }
  if(d.mateDel){
    const r = roomById(s.roomId), p = (s.posts[r?.id] || []).find(x => x.id === d.mateDel); if(!p) return true;
    if(s.confirmDel !== p.id){ s.confirmDel = p.id; $f.toast('한 번 더 누르면 지워요(방에서만 지워지고, 기록에 남긴 숫자는 그대로).'); return true; }
    s.confirmDel = ''; deletePost(r.id, p).then(() => { s.posts[r.id] = (s.posts[r.id] || []).filter(x => x.id !== p.id); $f.toast('지웠어요.'); $f.render(); fillPhotos(); }).catch(e => $f.toast(e.message)); return true;
  }
  if(d.mateTofood){ const r = roomById(s.roomId), p = (s.posts[r?.id] || []).find(x => x.id === d.mateTofood); if(p) openFood(p, r?.name); return true; }
  if(d.matePickph){ const [rid, pid] = d.matePickph.split('|'), p = (s.posts[rid] || []).find(x => x.id === pid); s.picker = null; if(p) openFood(p, roomById(rid)?.name); return true; }
  if(d.matePickclose !== undefined){ s.picker = null; $f.render(); return true; }
  if(d.mateShareN){ s.food.n = Number(d.mateShareN); $f.render(); return true; }
  if(d.mateFoodclose !== undefined){ s.food = null; $f.render(); fillPhotos(); return true; }
  if(d.mateFoodgo !== undefined){
    const f = s.food; if(!f || f.busy) return true;
    const typed = Number(document.getElementById('mate-n')?.value || 0); const n = typed >= 2 && typed <= 20 ? Math.round(typed) : f.n;
    f.busy = true; $f.render();
    try{
      const {data, thumb} = await jpegData(await photoBlob(f.post.photoKey));
      const at = f.post.takenAt || f.post.createdAt;
      const text = `${ymd(at)} ${hmOf(at)}에 먹은 거예요(사진 찍은 시각).${n > 1 ? ` 이 양을 ${n}명이서 나눠 먹었어요. 칼로리·탄단지를 ${n}분의 1로 나눠 내 몫만 기록해 주세요.` : ' 혼자 다 먹었어요.'}`;
      s.food = null; openChatWithPhoto(data, thumb, text);
    }catch(e){ f.busy = false; $f.toast(e.message || '사진을 준비하지 못했어요.'); $f.render(); }
    return true;
  }
  if(d.mateCtype){ const c = s.create; c.name = document.getElementById('mate-cname')?.value || c.name; c.type = d.mateCtype; $f.render(); return true; }
  if(d.mateCscope){ const c = s.create; c.name = document.getElementById('mate-cname')?.value || c.name; c.scope[d.mateCscope] = !c.scope[d.mateCscope]; $f.render(); return true; }
  if(d.mateCreateok !== undefined){
    const c = s.create; if(s.busy) return true; c.name = document.getElementById('mate-cname')?.value || c.name;
    s.busy = true; $f.render();
    try{ const id = await createRoom(c); s.create = null; s.busy = false; s.rooms = await listRooms(); s.roomId = id; s.posts[id] = []; s.props[id] = []; if(c.type === 'friends') go('invite'); else { s.view = 'room'; $f.render(); } }
    catch(e){ s.busy = false; $f.toast(e.message || '방을 만들지 못했어요.'); $f.render(); }
    return true;
  }
  if(d.mateCopycode !== undefined){ try{ await navigator.clipboard.writeText(s.invite?.code || ''); $f.toast('초대 코드를 복사했어요.'); }catch{ $f.toast('복사하지 못했어요. 코드를 길게 눌러 복사해 주세요.'); } return true; }
  if(d.mateCopy !== undefined){ const link = inviteLink(s.invite?.code || ''); try{ await navigator.clipboard.writeText(link); $f.toast('링크를 복사했어요.'); }catch{ $f.toast('복사하지 못했어요. 링크를 길게 눌러 복사해 주세요.'); } return true; }
  if(d.mateShare !== undefined){ const r = roomById(s.roomId); try{ await navigator.share({title: '마이로그 메이트 초대', text: `'${r?.name || '메이트 방'}'에 같이 기록해요`, url: inviteLink(s.invite?.code || '')}); }catch{} return true; }
  if(d.mateJoinok !== undefined){
    const inv = s.join?.inv; if(!inv || s.busy) return true;
    s.busy = true; $f.render();
    try{ const id = await joinRoom(inv); s.busy = false; s.join = null; try{ history.replaceState(history.state, '', location.pathname + location.search); }catch{} s.rooms = await listRooms(); s.roomId = id; s.view = 'room'; $f.toast(`'${inv.roomName}'에 들어왔어요`); loadRoom(id); }
    catch(e){ s.busy = false; $f.toast(e.message); $f.render(); }
    return true;
  }
  if(d.mateHand){ const r = roomById(s.roomId); handOver(r, d.mateHand).then(() => { r.ownerUid = d.mateHand; $f.toast(`${r.memberNames[d.mateHand] || '메이트'} 님이 이제 방장이에요`); $f.render(); }).catch(e => $f.toast(e.message)); return true; }
  if(d.mateLeave){
    if(d.mateLeave === 'ask'){ s.confirmLeave = true; $f.render(); return true; }
    if(d.mateLeave === 'no'){ s.confirmLeave = false; $f.render(); return true; }
    const r = roomById(s.roomId); leaveRoom(r).then(() => { s.confirmLeave = false; s.rooms = null; s.view = 'rooms'; $f.toast('방에서 나왔어요.'); loadRooms(true); }).catch(e => $f.toast(e.message)); return true;
  }
  if(d.mateScope){
    const r = roomById(s.roomId), k = d.mateScope, to = !r.scope[k];
    propose(r, k, to).then(res => { if(res.applied){ r.scope[k] = to; $f.toast(`${MATE_KIND_LABEL[k]}를 ${to ? '공개' : '비공개'}로 바꿨어요.`); } else $f.toast(`메이트 ${r.memberIds.length - 1}명에게 물어봤어요. 모두 동의하면 바뀌어요.`); s.view = 'room'; loadRoom(r.id); }).catch(e => $f.toast(e.message || '요청하지 못했어요.'));
    return true;
  }
  if(d.mateVote){
    const [pid, yes] = d.mateVote.split('|'), r = roomById(s.roomId), p = (s.props[r.id] || []).find(x => x.id === pid); if(!p) return true;
    vote(r, p, yes === '1').then(res => { $f.toast(res === 'done' ? '모두 동의해서 공개 범위가 바뀌었어요.' : res === 'rejected' ? '거절했어요. 공개 범위는 그대로예요.' : '동의했어요. 다른 메이트를 기다려요.'); loadRoom(r.id); syncMyShares(s.rooms || [], $s.db, $f.today()).catch(() => {}); }).catch(e => $f.toast(e.message));
    return true;
  }
  return false;
}
export async function mateSubmit(form){
  const kind = form?.dataset?.mateForm; if(!kind) return false;
  const s = st();
  if(kind === 'code'){ const code = String(document.getElementById('mate-code')?.value || '').replace(/[\s-]/g, '').toUpperCase(); if(!/^[A-Z2-9]{8}$/.test(code)){ $f.toast('초대 코드 8자리를 확인해 주세요.'); return true; } openMateJoin(code); return true; }
  if(kind === 'tag'){ document.querySelector('[data-mate-tagsave]')?.click(); return true; }
  if(kind === 'taginv'){
    const el = document.getElementById('mate-taginv'), v = String(el?.value || '').trim().replace(/^@/, ''); if(!v) return true;
    const r = roomById(s.roomId); if(!r) return true;
    try{ const t = await inviteByTag(r, v, room => createMateInvite(room)); el.value = ''; $f.toast(`@${t} 님에게 초대를 보냈어요. 상대의 메이트 탭 '받은 초대'에 떠요.`); }catch(e){ $f.toast(e.message || '초대하지 못했어요.'); }
    return true;
  }
  if(kind === 'say'){
    const el = document.getElementById('mate-say'), text = String(el?.value || '').trim(); if(!text || !s.roomId) return true;
    el.value = '';
    try{ await addPost(s.roomId, {kind: 'text', text, takenAt: Date.now()}); loadRoom(s.roomId); }catch(e){ $f.toast(e.message || '보내지 못했어요.'); el.value = text; }
    return true;
  }
  return false;
}
// 앱이 켜질 때 주소가 '#mate-코드'면 초대받은 화면으로
export function mateBootHash(){ if(ready()) loadMyTag().then(() => $f.render()).catch(() => {}); const m = /^#mate-([A-Z2-9]{8})$/i.exec(globalThis.location?.hash || ''); if(m){ openMateJoin(m[1].toUpperCase()); return true; } const p = pendingInvite(); if(p){ if(ready()) clearPendingInvite(); openMateJoin(p); return true; } return false; }
// 로그인·승인이 끝난 뒤 초대 화면을 다시 불러온다
export function mateAfterLogin(){ const s = st(); if(s.view === 'join' && s.join?.code && !s.join.inv) openMateJoin(s.join.code); }
