// 4.21.0 세트 사이 휴식 화면(대표님 2026-11-24): 세트를 저장하면 위·아래로 나뉜다.
// 위: 원형 타이머(바깥 초침, 가운데 쉰 시간). 방식 3가지 — 지정해 두고 쉬기(시간이 되면 진동·소리), 시간만 재기(알림 없음), 사용 안 하기(아래 화면만).
// 아래: 다음 세트 준비 — 지금 정해진 다음 세트(그대로/바꿈) + 중량만 바꾸기 · 방식 바꾸기(방식이 여럿인 머신만) · 다른 운동으로.
// 어떤 방식이든 '🔥 휴식 끝, 다음 세트 시작'을 눌러야 다음 세트 입력으로 넘어간다.
import {unitText, setLoadText, setSideTag} from './domain.js';
import {specOptions} from './gym-machines.js';
import {GENERIC_MACHINES, armsIso, perSideFor, pairLever} from './machines-catalog.js';
import {planFor} from './workout-plan.js';
import {prefillFor} from './set-prefill.js';
import {matchScore} from './suggest.js';

const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));
const fmt = (v, d = 1) => Number(v || 0).toLocaleString('ko-KR', {maximumFractionDigits: d});
export const REST_MODES = [['alarm', '지정해 두고 쉬기'], ['track', '시간만 재기'], ['off', '사용 안 하기']];
export const REST_PRESETS = [60, 90, 120, 180];
export const SIDE_LABEL = {both: '양쪽 함께', single: '한쪽씩', alt: '번갈아'};
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
// 2026-11-27 대표님: 머신·케이블·덤벨 종목은 양쪽 함께가 기본이고 한쪽씩(한 손·한 다리)도 고를 수 있게. 이름부터 한쪽인 종목·바벨·맨몸은 제외
// 전수 점검(2026-11-27): 한쪽씩이 말이 안 되는 것(덤벨 하나를 두 손으로·두 발로만 하는 머신·바 하나 잡는 케이블)과
// 한쪽 전용 종목이 따로 있는 것(원암 덤벨 로우·싱글 레그 프레스 등 — 같은 운동이 두 갈래로 쌓이지 않게)은 뺀다
const NO_SINGLE = new Set(["고블릿 스쿼트","케틀벨 고블릿 스쿼트","덤벨 풀오버","덤벨 스퀴즈 프레스","덤벨 힙 쓰러스트","스모 스쿼트","덤벨 스모 데드리프트","케틀벨 데드리프트","파머스 워크","덤벨 레그 컬","덤벨 스쿼트","덤벨 프론트 스쿼트","덤벨 데드리프트","덤벨 루마니안 데드리프트","덤벨 스티프 레그 데드리프트",
 "덤벨 로우","덤벨 벤치프레스","덤벨 트라이셉스 익스텐션",
 "레그 프레스","수평 레그 프레스","버티컬 레그 프레스","레그 익스텐션","핵 스쿼트","브이 스쿼트","벨트 스쿼트","파워 스쿼트","펜듈럼 스쿼트","리버스 핵 스쿼트","힙 쓰러스트 머신","힙 어브덕션","힙 어덕션","어시스트 풀업","어시스트 딥스","트라이셉스 딥 머신","앱도미널 크런치 머신","시티드 백 익스텐션 머신","머신 슈러그","리버스 하이퍼","글루트 햄 레이즈","체스트 서포티드 T바 로우","풀오버 머신","랫풀다운",
 "케이블 크런치","케이블 풀스루","케이블 업라이트 로우","비하인드 넥 풀다운","클로즈그립 랫풀다운","언더그립 랫풀다운","와이드 그립 시티드 로우","시티드 케이블 로우","로프 해머 컬","로프 푸시다운","케이블 푸시다운","케이블 플라이","케이블 크로스오버"]);
const YES_SINGLE = new Set(["케틀벨 스윙","오버헤드 트라이셉스 익스텐션"]);
export function canSingle(ex, machine){
  if (sideOptions(machine).length) return true;
  if (!ex || ex.kind === "cardio" || ex.repBasis === "per-side" || NO_SINGLE.has(ex.name)) return false;
  if (YES_SINGLE.has(ex.name)) return true;
  return /^(머신|케이블|덤벨|덤벨\/케틀벨|케틀벨)$/.test(ex.equipment || "") && !/원암|원 암|싱글|한쪽|한 손|원레그|원 레그|얼터네이트|교대/.test(ex.name || "");
}
// 2026-11-27 대표님: 같은 무게라도 양쪽 함께·한쪽씩·번갈아 — 양팔이 따로 움직이는 머신과 양손 덤벨은 '번갈아'까지
export function sideModes(ex, machine){
  if (!canSingle(ex, machine)) return [];
  return armsIso(machine) || (ex?.weightBasis === 'per-hand' && ex?.handCount === 2) ? ['both', 'single', 'alt'] : ['both', 'single'];
}
export function sideSegHTML(modes, cur = 'both', attr = 'data-q-side'){
  if (!modes.length) return '';
  const on = modes.includes(cur) ? cur : 'both';
  return `<div class="qs-side"><span class="qs-label">방식</span><span class="qs-unitseg" role="group" aria-label="방식">${modes.map(k => `<button type="button" class="${on === k ? 'on' : ''}" ${attr}="${k}" aria-pressed="${on === k}">${SIDE_LABEL[k]}</button>`).join('')}</span></div>`;
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
    ${mode === 'alarm' ? restSoundButton() : ''}<div class="rt-center" role="timer"><span class="rt-lbl">쉬는 중</span><span class="rt-digits" id="rt-digits">0:00</span><span class="rt-goal" id="rt-goal">${mode === 'alarm' ? `${clock(target)} 남음` : '시간만 재는 중'}</span></div>
  </div>`;
}

// 2026-11-27 대표님: 횟수 칩처럼 무게도 지금 무게 근처만(덤벨·케틀벨 2kg, 그 밖은 5kg, lb는 5·10, 단계는 1)
export function nearWeights(w, unit = "kg", equipment = ""){
  const db = /덤벨|케틀벨/.test(equipment), step = unit === "level" ? 1 : unit === "lb" ? (db ? 5 : 10) : (db ? 2 : 5), v = Number(w) || 0, out = [];
  for (let k = -2; out.length < 6 && k < 12; k++){ const x = Math.round((v + k * step) * 100) / 100; if (x > 0) out.push(x); }
  return out;
}
export function restScreenHTML(db, s, {selected, machine, catalog = [], recent = [], lastSession, exKeyOf}){
  const mode = restMode(db), n = s.next, panel = s.restPanel || 'main';
  const exOf = id => catalog.find(x => (x.id || x.name) === id) || recent.find(x => x.exerciseId === id) || null;
  const nextEx = exOf(n.exerciseId) || selected, same = n.exerciseId === s.exerciseId;
  const doneHere = s.sets.filter(x => x.exerciseId === s.exerciseId).length;
  const last = s.sets.filter(x => x.exerciseId === s.exerciseId).at(-1);
  const sides = sideOptions(machine);
  /* 2026-11-27 원판 양쪽 머신은 '40kg씩 (총 80kg)'처럼 — 기록 화면과 같은 글자 */const exL = {...(selected || {}), machineId: s.machineId, ...(perSideFor(machine, selected) ? {weightBasis: 'per-hand', handCount: 2, ...(pairLever(machine) ? {oneLever: true} : {})} : {})}, lt = x => esc(setLoadText(exL, x, fmt));
  const head = `<div class="rt-head"><div><b>${esc(selected?.name || '')}</b></div><div class="rt-mode" role="group" aria-label="휴식 타이머">${REST_MODES.map(([k, l]) => `<button type="button" class="${mode === k ? 'on' : ''}" data-rest-mode="${k}" aria-pressed="${mode === k}">${l}</button>`).join('')}</div></div>`;
  const top = mode === 'off' ? '' : `<section class="rt-top">${dialHTML(s, mode)}${mode === 'alarm' ? `<div class="rt-presets" role="group" aria-label="휴식 시간">${REST_PRESETS.map(p => `<button type="button" class="chip small ${s.rest.target === p ? 'active' : ''}" data-rest-set="${p}">${p % 60 ? `${Math.floor(p / 60)}분 ${p % 60}초` : `${p / 60}분`}</button>`).join('')}</div><div class="rt-add" role="group" aria-label="휴식 늘리기">${[15, 30, 60].map(a => `<button type="button" class="chip small" data-rest-add="${a}">+${a < 60 ? `${a}초` : '1분'}</button>`).join('')}</div>` : ''}</section>`;
  /* 2026-11-28 대표님: 바꾼 다음 세트를 처음 값(방금 한 세트 그대로)으로 되돌리기 */const tag = `${n.changed ? '<button type="button" class="rt-reset" id="rest-reset">초기화</button>' : ''}<span class="rt-tag${n.changed ? ' changed' : ''}">${n.changed ? '바꿈' : '그대로'}</span>`;
  const kindTag = n.kind === 'warm' ? '<em class="q-wm-tag warm">웜업</em>' : '';
  const nextNo = same ? doneHere + 1 : 1;
  /* 5.1.0 방금 한 세트(고치기) — 다음 세트 준비와 완전히 따로 */const lastCard = last ? `<div class="rt-last"><span><small>방금 한 세트</small><b>${doneHere}세트 · ${lt(last)} × ${last.reps}회${setSideTag(last)}${last.type === '웜업' ? ' <em class="q-wm-tag warm">웜업</em>' : ''}</b></span><button type="button" class="button small secondary" data-rest-panel="fix">고치기</button></div>` : '';
  const summary = `<div class="rt-summary"><div><b>${same ? `${esc(nextEx?.name || '')} · ${doneHere + 1}세트` : `다음 운동 · ${esc(nextEx?.name || '')}`} ${kindTag}</b><small>${same ? lt(n) : `${fmt(n.weight)}${unitText(n.unit)}`} × ${n.reps}회${setSideTag(n)}</small></div>${tag}</div>`;
  /* 2026-11-27 대표님(목업 승인): 휴식 화면 설명 줄·같은 말 반복 뺌 */
  const fire = `<button type="button" class="rt-fire" id="rest-go"><span class="rt-fire-ico" aria-hidden="true">🔥</span><span><b>휴식 끝, 다음 세트 시작</b></span></button>`;
  let body = '';
  if (panel === 'weight') {
    const warm = n.kind === 'warm', reps = warm ? [10, 15, 20, 30] : [1, 5, 8, 10, 12, 15];
    const step = n.unit === 'lb' ? 5 : n.unit === 'level' ? 1 : 2.5;
    body = `<button type="button" class="q-back" data-rest-panel="main"><span aria-hidden="true">‹</span> 다음 세트 준비로</button><h3 class="rt-h">${same ? `${nextNo}세트(다음 세트) 미리 바꾸기` : `${esc(nextEx?.name || '')} 첫 세트 정하기`}</h3>
    ${last && same ? `<p class="hint rt-keep">방금 한 <b>${doneHere}세트(${lt(last)} × ${last.reps}회${setSideTag(last)})는 그대로</b>예요. 여기서 바꾼 값은 ${nextNo}세트에만 들어가요.</p>` : ''}
    <div class="rt-toggles"><button type="button" class="q-warm${warm ? ' on' : ''}" data-rest-warm aria-pressed="${warm}"><s aria-hidden="true"></s>웜업으로 하기</button></div>${sideSegHTML(sideModes(nextEx, same ? machine : null), n.side || "both", "data-rest-nside")}
    <p class="rt-lbl2">무게 <span class="qs-unitseg" role="group" aria-label="무게 단위">${['kg','lb'].map(u=>`<button type="button" class="${(n.unit||'kg')===u?'on':''}" data-rest-unit="${u}" aria-pressed="${(n.unit||'kg')===u}">${u}</button>`).join('')}${n.unit==='level'?'<button type="button" class="on" data-rest-unit="level" aria-pressed="true">단계</button>':''}</span></p><div class="rt-stepper"><button type="button" data-rest-w="-${step}" aria-label="${step} 줄이기">−</button><input id="rest-w" type="number" inputmode="decimal" min="0" step="any" value="${esc(n.weight)}" aria-label="다음 세트 무게"><button type="button" data-rest-w="${step}" aria-label="${step} 늘리기">+</button></div>
    <div class="chip-row qs-reps" role="group" aria-label="근처 무게">${nearWeights(n.weight, n.unit, nextEx?.equipment).map(x => `<button type="button" class="chip small ${Number(n.weight) === x ? "active" : ""}" data-rest-wpick="${x}">${fmt(x)}${n.unit === "level" ? "단계" : unitText(n.unit) || "kg"}</button>`).join("")}</div>
    <p class="rt-lbl2">횟수</p><div class="rt-stepper"><button type="button" data-rest-r="-1" aria-label="1회 줄이기">−</button><input id="rest-r" type="number" inputmode="numeric" min="1" step="1" value="${esc(n.reps)}" aria-label="다음 세트 횟수"><button type="button" data-rest-r="1" aria-label="1회 늘리기">+</button></div>
    <div class="chip-row qs-reps">${reps.map(x => `<button type="button" class="chip small ${Number(n.reps) === x ? 'active' : ''}" data-rest-reps="${x}">${x}회</button>`).join('')}</div>
    <button type="button" class="button rt-ok" id="rest-w-ok">${same ? `${nextNo}세트에 적용` : '이대로 정하기'}</button>`;
  } else if (panel === 'fix' && last) {
    const step = last.unit === 'lb' ? 5 : last.unit === 'level' ? 1 : 2.5;
    /* 2026-11-27 고치던 값은 다른 앱에 다녀오거나 앱이 다시 열려도 그대로 */const fd = s.fixDraft?.rowId === last.id ? s.fixDraft : null, fw = fd?.weight ?? last.weight, fr = fd?.reps ?? last.reps, fWarm = fd ? fd.warm : last.type === '웜업', fSide = fd?.side ?? (last.side || 'both');
    body = `<button type="button" class="q-back" data-rest-panel="main"><span aria-hidden="true">‹</span> 다음 세트 준비로</button><h3 class="rt-h">방금 한 ${doneHere}세트 고치기</h3><p class="hint">실제로 한 값으로 고쳐요. 다음 세트는 따로 정해요.</p>
    <div class="rt-toggles"><button type="button" class="q-warm${fWarm ? ' on' : ''}" data-rest-fix-warm aria-pressed="${fWarm}"><s aria-hidden="true"></s>웜업 세트</button></div>${sideSegHTML(sideModes(selected, machine), fSide, 'data-rest-fix-side')}
    <p class="rt-lbl2">무게 (${unitText(last.unit) || 'kg'})</p><div class="rt-stepper"><button type="button" data-rest-w="-${step}" aria-label="${step} 줄이기">−</button><input id="rest-w" type="number" inputmode="decimal" min="0" step="any" value="${esc(fw)}" aria-label="방금 세트 무게"><button type="button" data-rest-w="${step}" aria-label="${step} 늘리기">+</button></div>
    <p class="rt-lbl2">횟수</p><div class="rt-stepper"><button type="button" data-rest-r="-1" aria-label="1회 줄이기">−</button><input id="rest-r" type="number" inputmode="numeric" min="1" step="1" value="${esc(fr)}" aria-label="방금 세트 횟수"><button type="button" data-rest-r="1" aria-label="1회 늘리기">+</button></div>
    <div class="rt-fix-btns"><button type="button" class="button secondary danger-line" id="rest-fix-del">이 세트 지우기</button><button type="button" class="button rt-ok" id="rest-fix-ok">고친 값 저장</button></div>`;
  } else if (panel === 'mode') {
    body = `<button type="button" class="q-back" data-rest-panel="main"><span aria-hidden="true">‹</span> 다음 세트 준비로</button><h3 class="rt-h">방식 바꾸기</h3><p class="hint">이 머신에서 할 수 있는 방식만 보여요. 한쪽씩이면 한쪽 무게·한쪽 횟수로 적어요.</p>
    <div class="rt-sides">${(sides.length ? sides : ['both', 'single']).map(k => `<button type="button" class="rt-side ${n.side === k ? 'on' : ''}" data-rest-side="${k}" aria-pressed="${n.side === k}"><b>${SIDE_LABEL[k]}</b><small>${k === 'single' ? '한쪽 무게 · 한쪽 횟수' : k === 'alt' ? '번갈아 · 한쪽 횟수' : '양쪽을 함께'}</small></button>`).join('')}</div>
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
    body = `${lastCard}<h3 class="rt-h">다음 세트 미리 준비</h3>${summary}
    <div class="rt-opts"><button type="button" class="rt-opt" data-rest-panel="weight"><span class="rt-oico" aria-hidden="true">⚖️</span><span><b>다음 세트 무게·횟수 바꾸기</b></span><span aria-hidden="true">›</span></button>
    <button type="button" class="rt-opt" data-rest-panel="ex"><span class="rt-oico" aria-hidden="true">➜</span><span><b>${mode === 'off' ? '다음 운동 고르기' : '다른 운동으로'}</b></span><span aria-hidden="true">›</span></button></div>`; /* 2026-11-27 대표님: '이 종목 그만하고 종목 다시 고르기'는 '다른 운동으로'와 중복이라 뺌 */
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
  if (g && target) g.textContent = over ? `목표보다 +${clock(s - target)}` : `${clock(target - s)} 남음`;/* 2026-11-27: 목표는 아래 칩에 이미 켜져 있음 */
  if (over && !el.dataset.alerted) { el.dataset.alerted = '1'; onAlarm?.(); }
}
// 2026-11-27 대표님: 휴식이 끝나면 트레이너가 박수 쳐 주듯 '짝짝짝' 세 번(남은 초 알림 없음). 소리는 타이머 오른쪽 위 버튼으로 켜고 끔(이 기기에 기억), 진동은 그대로.
const SND_KEY = 'mylogue.restSound';
export const restSoundOn = () => { try { return globalThis.localStorage?.getItem(SND_KEY) !== 'off'; } catch { return true; } };
export const setRestSound = on => { try { globalThis.localStorage?.setItem(SND_KEY, on ? 'on' : 'off'); } catch {} };
export const restSoundButton = () => { const on = restSoundOn(); return `<button type="button" class="rt-snd${on ? '' : ' off'}" data-rest-sound aria-pressed="${on}" aria-label="휴식 끝 소리 ${on ? '끄기' : '켜기'}" title="휴식 끝 박수 소리">${on ? '🔊' : '🔇'}</button>`; };
export function clapSound(){
  const A = globalThis.AudioContext || globalThis.webkitAudioContext; if (!A) return;
  const ctx = new A(), len = Math.floor(ctx.sampleRate * 0.2), buf = ctx.createBuffer(1, len, ctx.sampleRate), d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  const clap = t0 => { [0, 0.011, 0.022].forEach((o, k) => { const src = ctx.createBufferSource(), bp = ctx.createBiquadFilter(), hp = ctx.createBiquadFilter(), g = ctx.createGain(), t = t0 + o, tail = k === 2 ? 0.14 : 0.01;
    src.buffer = buf; bp.type = 'bandpass'; bp.frequency.value = 1300; bp.Q.value = 0.9; hp.type = 'highpass'; hp.frequency.value = 500;
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.9, t + 0.002); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.008 + tail);
    src.connect(bp).connect(hp).connect(g).connect(ctx.destination); src.start(t); src.stop(t + 0.2); }); };
  const now = ctx.currentTime + 0.03; [0, 0.3, 0.6].forEach(x => clap(now + x));
  setTimeout(() => ctx.close?.(), 1500);
}
export function restAlarm(){
  try { navigator.vibrate?.([220, 120, 220, 120, 320]); } catch {}
  try { if (restSoundOn()) clapSound(); } catch {}
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
