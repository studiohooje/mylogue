// 4.21.0 세트 사이 휴식 화면(대표님 2026-11-24): 세트를 저장하면 위·아래로 나뉜다.
// 위: 원형 타이머(바깥 초침, 가운데 쉰 시간). 방식 3가지 — 지정해 두고 쉬기(시간이 되면 진동·소리), 시간만 재기(알림 없음), 사용 안 하기(아래 화면만).
// 아래: 다음 세트 준비 — 지금 정해진 다음 세트(그대로/바꿈) + 중량만 바꾸기 · 방식 바꾸기(방식이 여럿인 머신만) · 다른 운동으로.
// 어떤 방식이든 '🔥 휴식 끝, 다음 세트 시작'을 눌러야 다음 세트 입력으로 넘어간다.
import {unitText} from './domain.js';
import {specOptions} from './gym-machines.js';
import {GENERIC_MACHINES} from './machines-catalog.js';
import {planFor} from './workout-plan.js';
import {prefillFor} from './set-prefill.js';
import {matchScore} from './suggest.js';

const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));
const fmt = (v, d = 1) => Number(v || 0).toLocaleString('ko-KR', {maximumFractionDigits: d});
export const REST_MODES = [['alarm', '지정해 두고 쉬기'], ['track', '시간만 재기'], ['off', '사용 안 하기']];
export const REST_PRESETS = [60, 90, 120, 180];
export const SIDE_LABEL = {both: '양쪽 함께', single: '한쪽씩'};
export const restMode = db => ['alarm', 'track', 'off'].includes(db.settings?.restMode) ? db.settings.restMode : 'alarm';
export const clock = s => `${Math.floor(s / 60)}:${String(Math.max(0, Math.floor(s % 60))).padStart(2, '0')}`;
const R = 104, C = 2 * Math.PI * R;

// 이 종목에서 고를 수 있는 방식(양쪽 함께 · 한쪽씩) — 머신의 움직임 방식이 둘 이상일 때만
export function sideOptions(machine){
  if (!machine) return [];
  const base = GENERIC_MACHINES.find(g => g.id === (machine.baseId || machine.id));
  const load = machine.load || base?.load, o = specOptions(base?.load || load, load);
  return o.sided.length > 1 ? ['both', 'single'] : [];
}
// 세트를 저장한 직후 다음 세트(기본: 같은 종목, 웜업이면 웜업 다음은 메인)
export function defaultNext(s, {lastSession, db}){
  // 5.1.0 다음 세트 = 방금 한 세트 그대로. 방금이 웜업이었으면 일반 세트 갈래(오늘 마지막 일반 세트 → 지난 기록의 마지막 일반 세트)
  const done = s.sets.filter(x => x.exerciseId === s.exerciseId && x.machineId === s.machineId), last = done[done.length - 1] || {};
  let v = last;
  if (last.type === '웜업') { const m = prefillFor(s, db, {warm: false, lastSession}); if (m.weight != null) v = m; }
  return {exerciseId: s.exerciseId, machineId: s.machineId, weight: v.weight ?? s.weight, reps: v.reps ?? s.reps, unit: v.unit || last.unit || s.unit, kind: 'main', side: s.side || 'both', changed: false};
}

function dialHTML(s, mode){
  const ticks = Array.from({length: 60}, (_, i) => { const a = i * 6 * Math.PI / 180, big = i % 5 === 0, r1 = big ? 118 : 121; return `<line class="${big ? 'big' : ''}" x1="${(130 + r1 * Math.sin(a)).toFixed(1)}" y1="${(130 - r1 * Math.cos(a)).toFixed(1)}" x2="${(130 + 126 * Math.sin(a)).toFixed(1)}" y2="${(130 - 126 * Math.cos(a)).toFixed(1)}"/>`; }).join('');
  const target = s.rest.target;
  return `<div class="rt-dial" id="rt-dial" data-at="${s.rest.at}" data-target="${mode === 'alarm' ? target : 0}" data-mode="${mode}">
    <svg viewBox="0 0 260 260" aria-hidden="true"><defs><linearGradient id="rt-aurora" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#8ce4e0"/><stop offset=".55" stop-color="#b8aaf2"/><stop offset="1" stop-color="#f2b49b"/></linearGradient></defs>
    <g class="rt-ticks">${ticks}</g><circle class="rt-track" cx="130" cy="130" r="${R}"/><circle class="rt-prog" id="rt-prog" cx="130" cy="130" r="${R}" transform="rotate(-90 130 130)" style="stroke-dasharray:${C.toFixed(1)};stroke-dashoffset:${C.toFixed(1)}"/>
    <g class="rt-hand" id="rt-hand"><line x1="130" y1="44" x2="130" y2="8"/><circle cx="130" cy="26" r="5"/></g></svg>
    <div class="rt-center" role="timer"><span class="rt-lbl">쉬는 중</span><span class="rt-digits" id="rt-digits">0:00</span><span class="rt-goal" id="rt-goal">${mode === 'alarm' ? `목표 ${clock(target)}` : '시간만 재는 중'}</span></div>
  </div>`;
}

export function restScreenHTML(db, s, {selected, machine, catalog = [], recent = [], lastSession, exKeyOf}){
  const mode = restMode(db), n = s.next, panel = s.restPanel || 'main';
  const exOf = id => catalog.find(x => (x.id || x.name) === id) || recent.find(x => x.exerciseId === id) || null;
  const nextEx = exOf(n.exerciseId) || selected, same = n.exerciseId === s.exerciseId;
  const doneHere = s.sets.filter(x => x.exerciseId === s.exerciseId).length;
  const last = s.sets.filter(x => x.exerciseId === s.exerciseId).at(-1);
  const sides = sideOptions(machine);
  const head = `<div class="rt-head"><div><b>${esc(selected?.name || '')}</b><small>${doneHere}세트 끝${last ? ` · ${fmt(last.weight)}${unitText(last.unit)} × ${last.reps}회` : ''}</small></div><div class="rt-mode" role="group" aria-label="휴식 타이머">${REST_MODES.map(([k, l]) => `<button type="button" class="${mode === k ? 'on' : ''}" data-rest-mode="${k}" aria-pressed="${mode === k}">${l}</button>`).join('')}</div></div>`;
  const top = mode === 'off' ? '' : `<section class="rt-top">${dialHTML(s, mode)}${mode === 'alarm' ? `<div class="rt-presets" role="group" aria-label="휴식 시간">${REST_PRESETS.map(p => `<button type="button" class="chip small ${s.rest.target === p ? 'active' : ''}" data-rest-set="${p}">${p % 60 ? `${Math.floor(p / 60)}분 ${p % 60}초` : `${p / 60}분`}</button>`).join('')}</div><div class="rt-add" role="group" aria-label="휴식 늘리기">${[15, 30, 60].map(a => `<button type="button" class="chip small" data-rest-add="${a}">+${a < 60 ? `${a}초` : '1분'}</button>`).join('')}</div>` : ''}</section>`;
  const tag = `<span class="rt-tag${n.changed ? ' changed' : ''}">${n.changed ? '바꿈' : '그대로'}</span>`;
  const kindTag = n.kind === 'warm' ? '<em class="q-wm-tag warm">웜업</em>' : '';
  const nextNo = same ? doneHere + 1 : 1;
  /* 5.1.0 방금 한 세트(고치기) — 다음 세트 준비와 완전히 따로 */const lastCard = last ? `<div class="rt-last"><span><small>방금 한 세트</small><b>${doneHere}세트 · ${fmt(last.weight)}${unitText(last.unit)} × ${last.reps}회${last.type === '웜업' ? ' <em class="q-wm-tag warm">웜업</em>' : ''}</b></span><button type="button" class="button small secondary" data-rest-panel="fix">고치기</button></div>` : '';
  const summary = `<div class="rt-summary"><div><b>${same ? `${esc(nextEx?.name || '')} · ${doneHere + 1}세트` : `다음 운동 · ${esc(nextEx?.name || '')}`} ${kindTag}</b><small>${fmt(n.weight)}${unitText(n.unit)} × ${n.reps}회${sides.length || n.side === 'single' ? ` · ${SIDE_LABEL[n.side] || '양쪽 함께'}` : ''}</small></div>${tag}</div>`;
  const fire = `<button type="button" class="rt-fire" id="rest-go"><span class="rt-fire-ico" aria-hidden="true">🔥</span><span><b>휴식 끝, 다음 세트 시작</b><small>이걸 눌러야 다음 세트 기록으로 넘어가요</small></span></button>`;
  let body = '';
  if (panel === 'weight') {
    const warm = n.kind === 'warm', reps = warm ? [10, 15, 20, 30] : [1, 5, 8, 10, 12, 15];
    const step = n.unit === 'lb' ? 5 : n.unit === 'level' ? 1 : 2.5;
    body = `<button type="button" class="q-back" data-rest-panel="main"><span aria-hidden="true">‹</span> 다음 세트 준비로</button><h3 class="rt-h">${same ? `${nextNo}세트(다음 세트) 미리 바꾸기` : `${esc(nextEx?.name || '')} 첫 세트 정하기`}</h3>
    ${last && same ? `<p class="hint rt-keep">방금 한 <b>${doneHere}세트(${fmt(last.weight)}${unitText(last.unit)} × ${last.reps}회)는 그대로</b>예요. 여기서 바꾼 값은 ${nextNo}세트에만 들어가요.</p>` : ''}
    <button type="button" class="q-warm${warm ? ' on' : ''}" data-rest-warm aria-pressed="${warm}"><s aria-hidden="true"></s>웜업으로 하기</button>
    <p class="rt-lbl2">무게 <span class="qs-unitseg" role="group" aria-label="무게 단위">${['kg','lb'].map(u=>`<button type="button" class="${(n.unit||'kg')===u?'on':''}" data-rest-unit="${u}" aria-pressed="${(n.unit||'kg')===u}">${u}</button>`).join('')}${n.unit==='level'?'<button type="button" class="on" data-rest-unit="level" aria-pressed="true">단계</button>':''}</span></p><div class="rt-stepper"><button type="button" data-rest-w="-${step}" aria-label="${step} 줄이기">−</button><input id="rest-w" type="number" inputmode="decimal" min="0" step="any" value="${esc(n.weight)}" aria-label="다음 세트 무게"><button type="button" data-rest-w="${step}" aria-label="${step} 늘리기">+</button></div>
    <p class="rt-lbl2">횟수</p><div class="rt-stepper"><button type="button" data-rest-r="-1" aria-label="1회 줄이기">−</button><input id="rest-r" type="number" inputmode="numeric" min="1" step="1" value="${esc(n.reps)}" aria-label="다음 세트 횟수"><button type="button" data-rest-r="1" aria-label="1회 늘리기">+</button></div>
    <div class="chip-row qs-reps">${reps.map(x => `<button type="button" class="chip small ${Number(n.reps) === x ? 'active' : ''}" data-rest-reps="${x}">${x}회</button>`).join('')}</div>
    <button type="button" class="button rt-ok" id="rest-w-ok">${same ? `${nextNo}세트에 적용` : '이대로 정하기'}</button>`;
  } else if (panel === 'fix' && last) {
    const step = last.unit === 'lb' ? 5 : last.unit === 'level' ? 1 : 2.5;
    body = `<button type="button" class="q-back" data-rest-panel="main"><span aria-hidden="true">‹</span> 다음 세트 준비로</button><h3 class="rt-h">방금 한 ${doneHere}세트 고치기</h3><p class="hint">실제로 한 값으로 고쳐요. 다음 세트는 따로 정해요.</p>
    <button type="button" class="q-warm${last.type === '웜업' ? ' on' : ''}" data-rest-fix-warm aria-pressed="${last.type === '웜업'}"><s aria-hidden="true"></s>웜업 세트</button>
    <p class="rt-lbl2">무게 (${unitText(last.unit) || 'kg'})</p><div class="rt-stepper"><button type="button" data-rest-w="-${step}" aria-label="${step} 줄이기">−</button><input id="rest-w" type="number" inputmode="decimal" min="0" step="any" value="${esc(last.weight)}" aria-label="방금 세트 무게"><button type="button" data-rest-w="${step}" aria-label="${step} 늘리기">+</button></div>
    <p class="rt-lbl2">횟수</p><div class="rt-stepper"><button type="button" data-rest-r="-1" aria-label="1회 줄이기">−</button><input id="rest-r" type="number" inputmode="numeric" min="1" step="1" value="${esc(last.reps)}" aria-label="방금 세트 횟수"><button type="button" data-rest-r="1" aria-label="1회 늘리기">+</button></div>
    <div class="rt-fix-btns"><button type="button" class="button secondary danger-line" id="rest-fix-del">이 세트 지우기</button><button type="button" class="button rt-ok" id="rest-fix-ok">고친 값 저장</button></div>`;
  } else if (panel === 'mode') {
    body = `<button type="button" class="q-back" data-rest-panel="main"><span aria-hidden="true">‹</span> 다음 세트 준비로</button><h3 class="rt-h">방식 바꾸기</h3><p class="hint">이 머신에서 할 수 있는 방식만 보여요. 한쪽씩이면 한쪽 무게·한쪽 횟수로 적어요.</p>
    <div class="rt-sides">${(sides.length ? sides : ['both', 'single']).map(k => `<button type="button" class="rt-side ${n.side === k ? 'on' : ''}" data-rest-side="${k}" aria-pressed="${n.side === k}"><b>${SIDE_LABEL[k]}</b><small>${k === 'single' ? '한쪽 무게 · 한쪽 횟수' : '양쪽을 함께'}</small></button>`).join('')}</div>
    <button type="button" class="button rt-ok" id="rest-m-ok">확인</button>`;
  } else if (panel === 'ex' || panel === 'search') {
    const seen = new Set([s.exerciseId]), list = [], parts = (s.targets || []).filter(t => t.startsWith('웨이트:')).map(t => t.slice(4));
    const okPart = x => !parts.length || parts.includes('전신') || parts.includes(x?.part) || (x?.part === '팔' && (parts.includes('이두') || parts.includes('삼두'))) || (x?.alsoParts || []).some(p => parts.includes(p));
    const add = (key, name) => { if (key && !seen.has(key) && name) { seen.add(key); list.push({key, name}); } };
    for (const q of s.queue || []) add(q, exOf(q)?.name);
    for (const p of planFor(db, s.targets || [], s.date, {workoutId: s.workoutId, keyOf: exKeyOf})) if (okPart(exOf(p.key) || p)) add(p.key, p.name);
    /* 5.1.0 오늘 고른 부위의 운동 먼저(예전엔 하체 날 기록이 가슴·삼두 날에도 섞여 나왔음) */for (const r of recent) if (okPart(exOf(r.exerciseId) || r)) add(r.exerciseId || r.name, r.name);
    if (!parts.length) for (const r of recent) add(r.exerciseId || r.name, r.name);
    const q = String(s.restQuery || '').trim(), sc = x => matchScore(q, [x.name, ...(x.aliases || [])]), found = q ? catalog.filter(x => sc(x) > 0).sort((a, b) => sc(b) - sc(a)).slice(0, 12) : [];
    body = `<button type="button" class="q-back" data-rest-panel="main"><span aria-hidden="true">‹</span> 다음 세트 준비로</button><h3 class="rt-h">${mode === 'off' ? '다음 운동 고르기' : '다른 운동으로'}</h3><p class="hint">${parts.length ? `오늘 고른 <b>${esc(parts.join('·'))}</b> 운동부터 보여요. ` : ''}고르면 그 운동의 무게·횟수를 정해요.</p>
    ${panel === 'search' ? `<input id="rest-ex-search" type="search" aria-label="다른 운동 찾기" placeholder="운동 검색" value="${esc(q)}" autocomplete="off"><div class="rt-exlist">${found.map((x, i) => `<button type="button" class="rt-exopt" data-rest-ex="${esc(x.id || x.name)}"><span class="rt-num">${i + 1}</span><b>${esc(x.name)}</b><span aria-hidden="true">›</span></button>`).join('') || (q ? '<p class="hint">찾는 운동이 없어요.</p>' : '')}</div>` : `<div class="rt-exlist">${list.slice(0, 10).map((x, i) => `<button type="button" class="rt-exopt" data-rest-ex="${esc(x.key)}"><span class="rt-num">${i + 1}</span><b>${esc(x.name)}</b><span aria-hidden="true">›</span></button>`).join('') || '<p class="hint">최근에 한 운동이 없어요. 아래에서 찾아 주세요.</p>'}<button type="button" class="rt-exopt rt-find" data-rest-panel="search"><span class="rt-num">＋</span><b>다른 운동 찾기</b><span aria-hidden="true">›</span></button></div>`}`;
  } else {
    body = `${lastCard}<h3 class="rt-h">다음 세트 미리 준비</h3><p class="hint rt-sub">${mode === 'off' ? '바로 이어서 할 세트예요. 바꿀 게 없으면 아래 버튼만 누르세요.' : '휴식 끝을 누르면 이대로 바로 시작해요. 방금 한 세트는 바뀌지 않아요.'}</p>${summary}
    <div class="rt-opts"><button type="button" class="rt-opt" data-rest-panel="weight"><span class="rt-oico" aria-hidden="true">⚖️</span><span><b>다음 세트 무게·횟수 바꾸기</b><small>${same ? `${nextNo}세트에만 적용돼요` : '다음 운동 첫 세트에 적용돼요'}</small></span><span aria-hidden="true">›</span></button>
    ${sideOptions(same ? machine : null).length ? `<button type="button" class="rt-opt" data-rest-panel="mode"><span class="rt-oico" aria-hidden="true">🤲</span><span><b>방식 바꾸기</b><small>양쪽 함께 ↔ 한쪽씩</small></span><span aria-hidden="true">›</span></button>` : ''}
    <button type="button" class="rt-opt" data-rest-panel="ex"><span class="rt-oico" aria-hidden="true">➜</span><span><b>${mode === 'off' ? '다음 운동 고르기' : '다른 운동으로'}</b><small>${mode === 'off' ? '바로 다음에 할 운동을 골라요' : '다음에 할 운동을 미리 골라 둬요'}</small></span><span aria-hidden="true">›</span></button></div>
    <button type="button" class="text-button rt-quit" id="q-ex-back">이 종목 그만하고 종목 다시 고르기</button>`;
  }
  return `<div class="rest-screen mode-${mode}">${head}${top}<section class="rt-bottom">${body}</section>${panel === 'main' ? fire : ''}</div>`;
}

// 1초에 4번: 숫자·초침·진행 고리를 다시 그리고, 지정한 시간이 되면 한 번 알린다(다시 그리지 않음)
export function restTick(onAlarm){
  const el = typeof document !== 'undefined' && document.getElementById('rt-dial'); if (!el) return;
  const at = Number(el.dataset.at), target = Number(el.dataset.target), sec = Math.max(0, (Date.now() - at) / 1000), s = Math.floor(sec);
  const d = document.getElementById('rt-digits'); if (d) d.textContent = clock(s);
  const frac = target ? Math.min(1, sec / target) : (sec % 60) / 60;
  /* 5.1.0 초침과 고리를 같은 기준으로(예전: 초침은 1분 한 바퀴, 고리는 목표까지라 따로 놀았음). 목표를 넘기면 초침은 숨기고 고리 색만 바뀐다 */const hand = document.getElementById('rt-hand'); if (hand) { hand.style.transform = `rotate(${frac * 360}deg)`; hand.style.opacity = target && sec >= target ? '0' : '1'; }
  const prog = document.getElementById('rt-prog'); if (prog) prog.style.strokeDashoffset = (C * (1 - frac)).toFixed(1);
  const g = document.getElementById('rt-goal'), over = target > 0 && sec >= target;
  el.classList.toggle('over', over);
  if (g && target) g.textContent = over ? `목표보다 +${clock(s - target)}` : `목표 ${clock(target)} · ${clock(target - s)} 남음`;
  if (over && !el.dataset.alerted) { el.dataset.alerted = '1'; onAlarm?.(); }
}
// 알림: 진동(되는 기기) + 짧은 소리 세 번
export function restAlarm(){
  try { navigator.vibrate?.([220, 120, 220, 120, 320]); } catch {}
  try {
    const A = globalThis.AudioContext || globalThis.webkitAudioContext; if (!A) return;
    const ctx = new A(); [0, 0.28, 0.56].forEach((t, i) => { const o = ctx.createOscillator(), g = ctx.createGain(); o.type = 'sine'; o.frequency.value = i === 2 ? 1046 : 880; g.gain.setValueAtTime(0.0001, ctx.currentTime + t); g.gain.exponentialRampToValueAtTime(0.3, ctx.currentTime + t + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + t + 0.22); o.connect(g).connect(ctx.destination); o.start(ctx.currentTime + t); o.stop(ctx.currentTime + t + 0.24); });
    setTimeout(() => ctx.close?.(), 1200);
  } catch {}
}

// 4.23.0 화면이 꺼지거나 다른 앱에 있어도 휴식 끝을 알린다.
//  - 안드로이드 앱: 끝나는 시각에 기기 알림을 예약(화면이 꺼져도 울림). 휴식이 바뀌거나 끝나면 취소.
//  - 웹: 탭이 뒤에 있을 때 시간이 되면 알림(브라우저가 허락한 경우만).
const REST_NOTI_ID = 5102;
let notif = null;
function nativeNotif(){
  if (!globalThis.Capacitor?.isNativePlatform?.()) return null;
  try { notif = notif || globalThis.Capacitor.registerPlugin?.('LocalNotifications') || null; } catch { notif = null; }
  return notif;
}
export async function askRestNoticePermission(){
  const n = nativeNotif();
  if (n) { try { const p = await n.checkPermissions(); if (p.display !== 'granted') await n.requestPermissions(); } catch {} return; }
  try { if (globalThis.Notification && Notification.permission === 'default') await Notification.requestPermission(); } catch {}
}
// 4.27.0 전수검사 AA-04: 정확 알람('알람 및 리마인더')이 허용되지 않았으면 예약할 때마다 설정 화면이 떠 세트 기록이 끊겼다.
// 허용돼 있을 때만 정확 알람으로, 아니면 일반 알람(화면이 꺼져 있으면 조금 늦을 수 있음)으로 예약한다.
export async function exactAllowed(n){ try { const r = await n.checkExactNotificationSetting?.(); return r ? r.exact_alarm === 'granted' : true; } catch { return false; } }
export async function scheduleRestNotice(atMs, body){
  const n = nativeNotif(); if (!n) return;
  try { await n.cancel({notifications: [{id: REST_NOTI_ID}]}); if (atMs > Date.now() + 1000) await n.schedule({notifications: [{id: REST_NOTI_ID, title: '휴식 끝 · 마이로그', body, schedule: {at: new Date(atMs), allowWhileIdle: true}, isExactNotification: await exactAllowed(n)}]}); } catch {}
}
export async function cancelRestNotice(){ const n = nativeNotif(); if (!n) return; try { await n.cancel({notifications: [{id: REST_NOTI_ID}]}); } catch {} }
// 웹: 탭이 뒤에 있을 때만(앞에 있으면 화면 안 알림으로 충분)
export function webRestNotice(body){
  try {
    if (nativeNotif() || typeof document === 'undefined' || document.visibilityState !== 'hidden') return;
    if (!globalThis.Notification || Notification.permission !== 'granted') return;
    const show = r => r?.showNotification ? r.showNotification('휴식 끝 · 마이로그', {body, tag: 'mylogue-rest', renotify: true}) : new Notification('휴식 끝 · 마이로그', {body});
    if (navigator.serviceWorker?.ready) navigator.serviceWorker.ready.then(show).catch(() => show(null)); else show(null);
  } catch {}
}
// 알림 문구: 다음 세트
export function restNoticeBody(name, n){ return `${name || '다음 세트'} 준비됐어요 · ${fmt(n?.weight)}${unitText(n?.unit) || 'kg'} × ${n?.reps ?? ''}회. 🔥 버튼을 눌러 시작해요`; }
