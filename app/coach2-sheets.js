// 코치로그 v2 창(시트): 끝내기·기록·컨디션·예약·회원·수강권·변화 리포트·회원 화면 미리보기.
import * as D from './coach2-data.js';
import {esc, tip, whoLine, fmtWon} from './coach2-ui.js';
import {MOVES, AREAS} from './pilates.js';

export const sheet = (title, inner, cls = '') => `<div class="modal-backdrop quick-palette coach-sheet c2-sheet ${cls}" data-c2-bg><div class="sheet" role="dialog" aria-modal="true" aria-label="${esc(title)}"><div class="sheet-head"><h2>${esc(title)}</h2><button type="button" class="close" data-c2-close aria-label="닫기">✕</button></div><div class="cs-body">${inner}</div></div></div>`;
const seg = (name, opts, cur) => `<div class="c2-seg2">${opts.map(([v, l]) => `<label><input type="radio" name="${name}" value="${esc(v)}" ${String(cur) === String(v) ? 'checked' : ''}><span>${esc(l)}</span></label>`).join('')}</div>`;
const nm = (data, id) => data.clients.find(c => c.id === id)?.name || '회원';

// ---------- 끝내기 ----------
export function finishSheet(data, f, today) {
  const p = D.prefs2(data), pl = D.placeOf(data, f.placeId), ids = f.clientIds || [];
  const group = ids.length > 2;
  const rows = ids.map(id => { const c = data.clients.find(x => x.id === id); const status = f.statuses[id] || 'attended';
    const others = ids.filter(x => x !== id).map(x => f.statuses[x] || 'attended');
    const d = c ? D.deductionFor(data, c, {status, format: f.format, placeId: f.placeId, others, type: f.type}, today) : {label: ''};
    return {id, c, status, d}; });
  const summary = f.exercises?.length ? D.exSummary(f.exercises) : f.moves?.length ? `${f.moves.filter(m => m.on !== false).length}동작` : '기록 없음';
  const lateInfo = r => r.status === 'attended' ? '' : tip(`${f.cancelReqAt ? `${D.md(f.cancelReqAt.slice(0, 10))} ${f.cancelReqAt.slice(11, 16)} 취소 요청 · ` : ''}규정: 취소 ${r.d.rule?.cutoffH}시간 전까지 · ${r.status === 'late' ? `늦은 취소 ${r.d.rule?.late ? '차감' : '차감 없음'}` : `노쇼 ${r.d.rule?.noshow ? '차감' : '차감 없음'}`}`);
  const memberRows = group
    ? `<p class="c2-gsum">${rows.filter(r => r.status === 'attended').length}/${ids.length} 출석${['noshow', 'late'].map(k => rows.filter(r => r.status === k).length ? ` · ${D.STATUS.find(s => s[0] === k)[1]} ${rows.filter(r => r.status === k).length}` : '').join('')}${tip(`칩을 누르면 출석 → 노쇼 → 늦은 취소 · 규정: 취소 ${rows[0]?.d.rule?.cutoffH ?? 24}시간 전까지 · 늦은 취소 ${rows[0]?.d.rule?.late ? '차감' : '차감 없음'} · 노쇼 ${rows[0]?.d.rule?.noshow ? '차감' : '차감 없음'}`)}</p><div class="c2-gchips">${rows.map(r => `<button type="button" class="c2-gchip ${r.status}${r.d.warn ? ' warn' : ''}" data-c2-cycle="${r.id}" aria-label="${esc(r.c?.name)} ${D.STATUS.find(s => s[0] === r.status)[1]}">${esc(r.c?.name)}<small>${r.status === 'attended' ? '' : `${D.STATUS.find(s => s[0] === r.status)[1]} · `}${esc(r.d.label.replace(/^남은 /, ''))}</small></button>`).join('')}</div>`
    : rows.map(r => `<div class="c2-frow">${ids.length > 1 ? `<b>${esc(r.c?.name)}</b>` : ''}<div class="c2-st" role="group">${D.STATUS.map(([v, l]) => `<button type="button" class="${r.status === v ? 'on' : ''}" data-c2-status="${r.id}:${v}">${l}</button>`).join('')}</div><span class="c2-ded${r.d.warn ? ' warn' : ''}">${esc(r.d.label)}${r.d.note ? ` · ${esc(r.d.note)}` : ''}${lateInfo(r)}</span></div>`).join('');
  const linked = ids.some(id => data.clients.find(c => c.id === id)?.linked), canMsg = linked && pl?.directMsg !== false;
  const nextExists = (data.schedules || []).some(x => x.status === 'planned' && x.id !== f.scheduleId && (x.clientIds || []).some(id => ids.includes(id)) && String(x.startAt) > `${today}T23:59`);
  const nb = D.addDays(f.date || today, 7);
  return sheet(`끝내기 · ${whoLine(data, f)}`, `<p class="c2-fsum">${summary}<button type="button" class="text-button" data-c2-record>기록 고치기</button></p>
  ${memberRows}
  <details class="c2-more"${f.open ? ' open' : ''}><summary>한 줄 · 다음 준비 · 다음 수업</summary>
   ${canMsg ? `<label class="field">회원에게 한 줄<input id="c2-note" maxlength="120" value="${esc(f.note || '')}" placeholder="잘한 점 하나 + 다음에 할 하나" autocomplete="off"></label><div class="c2-qchips">${p.quickNotes.map(q => `<button type="button" class="chip" data-c2-qn="${esc(q)}">${esc(q)}</button>`).join('')}</div>` : `<p class="c2-grey">회원에게 한 줄 · ${linked ? '스튜디오 정책으로 꺼짐' : '마이로그 연동 전'}</p>`}
   <label class="field">다음 준비사항<input id="c2-focus" maxlength="120" value="${esc(f.nextFocus || '')}" placeholder="다음 수업 브리핑 맨 위에 떠요" autocomplete="off"></label>
   ${nextExists ? '<p class="c2-grey">다음 수업 예약 있음</p>' : `<div class="c2-qchips"><button type="button" class="chip${f.nextBook?.date === nb ? ' on' : ''}" data-c2-nb="${nb}">다음 주 같은 시간 ${D.md(nb)}</button><button type="button" class="chip${f.nextBook?.date === D.addDays(f.date || today, 2) ? ' on' : ''}" data-c2-nb="${D.addDays(f.date || today, 2)}">${D.md(D.addDays(f.date || today, 2))}</button></div>`}
  </details><button type="button" class="cl-go c2-big c2-sticky" data-c2-done>끝내기</button>`, 'c2-fin');
}

// ---------- 수업 기록(PT) ----------
export function recordPT(f) {
  const rows = (f.exercises || []).map((e, i) => { const s0 = e.sets?.[0] || {}; return `<div class="c2-exrow"><b>${esc(e.name)}</b><span class="c2-exv">${s0.weight || 0}kg × ${s0.reps || 0} × ${e.sets?.length || 0}세트</span>
   <div class="c2-exb"><button type="button" data-c2-w="${i}:-2.5" aria-label="무게 내리기">−2.5</button><button type="button" data-c2-w="${i}:2.5" aria-label="무게 올리기">+2.5</button><button type="button" data-c2-s="${i}:-1" aria-label="세트 빼기">−세트</button><button type="button" data-c2-s="${i}:1" aria-label="세트 더하기">+세트</button><button type="button" class="c2-x" data-c2-rm="${i}" aria-label="종목 빼기">✕</button></div></div>`; }).join('');
  return sheet(`수업 기록 · ${esc(f.title || '')}`, `${rows || '<p class="c2-empty">종목이 없어요</p>'}
  <div class="c2-addrow"><input id="c2-exname" list="c2-exlist" placeholder="종목 더하기" autocomplete="off"><datalist id="c2-exlist">${['레그 프레스', '스쿼트', '루마니안 데드리프트', '레그 익스텐션', '레그 컬', '힙 어브덕션', '체스트 프레스', '벤치 프레스', '숄더 프레스 머신', '랫 풀다운', '시티드 케이블 로우', '케이블 컬', '케이블 푸시다운', '런지', '플랭크'].map(n => `<option value="${n}">`).join('')}</datalist><button type="button" class="cl-ghost" data-c2-exadd>더하기</button></div>
  <div class="cl-btns"><button type="button" class="cl-go" data-c2-recdone>끝내기로</button><button type="button" class="cl-ghost" data-c2-live>수업 중 실시간 기록</button></div>`, 'c2-rec');
}

// ---------- 레슨 노트(필라테스) ----------
export function recordPilates(data, f) {
  const pl = D.placeOf(data, f.placeId), brand = pl?.apparatus?.brand || '밸런스드 바디', sp = D.springsOf(brand);
  const ids = f.clientIds || [];
  const rows = (f.moves || []).map((m, i) => `<div class="c2-mvrow${m.on === false ? ' off' : ''}"><button type="button" class="c2-mvname" data-c2-mv="${i}" aria-pressed="${m.on !== false}"><i class="c2-check" aria-hidden="true">${m.on === false ? '' : '✓'}</i>${esc(m.name)}</button>
   <button type="button" class="c2-spr${f.spEdit === i ? ' on' : ''}" data-c2-spedit="${i}">${f.spEdit === i ? '닫기' : esc(D.springText(m.springs, brand))}</button>
   <button type="button" class="c2-obs ${m.obs ? 'on' : ''}" data-c2-obs="${i}">${esc(m.obs || '관찰')}</button></div>
   ${f.spEdit === i ? `<div class="c2-spedit">${sp.map(s => { const n = D.normSprings(m.springs, brand).find(x => x.id === s.id)?.n || 0; return `<span><i style="background:${s.color}"></i>${esc(s.name)}<button type="button" data-c2-sp="${i}:${s.id}:-1" aria-label="${esc(s.name)} 빼기">−</button><b>${n}</b><button type="button" data-c2-sp="${i}:${s.id}:1" aria-label="${esc(s.name)} 더하기">+</button></span>`; }).join('')}</div>` : ''}`).join('');
  const tpls = (data.templates || []).map(t => `<option value="${t.id}">${esc(t.title)}</option>`).join('');
  const exc = ids.length > 1 ? `<p class="c2-sub">회원별 예외</p>${ids.map(id => `<label class="c2-exc"><span>${esc(nm(data, id))}</span><input data-c2-exc="${id}" value="${esc(f.exceptions?.[id] || '')}" placeholder="예: 풋워크 스프링 하나 덜" autocomplete="off"></label>`).join('')}` : '';
  return sheet(`레슨 노트 · ${esc(f.title || '')}`, `<div class="c2-tpl"><select data-c2-tpl aria-label="시퀀스 불러오기"><option value="">시퀀스 불러오기</option>${tpls}</select>${f.undoMoves ? '<button type="button" class="text-button" data-c2-tplundo>되돌리기</button>' : ''}</div>
  <div class="c2-mvs">${rows || '<p class="c2-empty">동작이 없어요</p>'}</div>
  <div class="c2-addrow"><input id="c2-mvname" list="c2-mvlist" placeholder="동작 더하기" autocomplete="off"><datalist id="c2-mvlist">${(MOVES['리포머'] || []).concat(MOVES['매트'] || []).slice(0, 80).map(n => `<option value="${esc(n)}">`).join('')}</datalist><button type="button" class="cl-ghost" data-c2-mvadd>더하기</button></div>
  ${exc}<label class="field">수업 메모(큐잉·핸즈온)<textarea id="c2-memo" rows="2" maxlength="300">${esc(f.memo || '')}</textarea></label>
  <button type="button" class="cl-go c2-wide" data-c2-recdone>끝내기로</button>`, 'c2-rec');
}

// ---------- 수업 전 컨디션 ----------
export function condSheet(data, f, role) {
  const ids = f.clientIds || [];
  const one = id => { const c = f.condition?.[id] || {}; return `<div class="c2-cond"><b>${esc(nm(data, id))}</b>
   <div class="c2-qchips">${AREAS.map(a => `<button type="button" class="chip${(c.pain || []).includes(a) ? ' on' : ''}" data-c2-pain="${id}:${a}">${a}</button>`).join('')}${role === 'pilates' ? `<button type="button" class="chip${c.period ? ' on' : ''}" data-c2-period="${id}">생리</button>` : ''}</div>
   ${seg(`feel-${id}`, [['좋음', '좋음'], ['보통', '보통'], ['피곤', '피곤']], c.feel || '보통')}</div>`; };
  const any = ids.some(id => { const c = f.condition?.[id] || {}; return (c.pain || []).length || c.period || (c.feel && c.feel !== '보통'); });
  return sheet('오늘 컨디션', `${ids.map(one).join('')}<p class="c2-grey">코치만 봐요${tip('통증·생리·컨디션은 회원에게 가는 기록·리포트에 넣지 않아요.')}</p><button type="button" class="cl-go c2-big" data-c2-condgo>${any ? '시작' : '특이 없음 · 시작'}</button>`, 'c2-condsheet');
}

// ---------- 일정 한 칸 ----------
export function slotSheet(data, x, now) {
  const ended = D.endOf(x) <= now, today = D.ymd(now);
  const ids = x.clientIds || [];
  const linkedAsk = ids.some(id => data.clients.find(c => c.id === id)?.linked) && D.placeOf(data, x.placeId)?.directMsg !== false;
  const d = String(x.startAt).slice(0, 10), t = String(x.startAt).slice(11, 16);
  const shift = (dd, mm) => { const base = D.at(d, t); base.setDate(base.getDate() + dd); base.setMinutes(base.getMinutes() + mm); return `${D.ymd(base)}T${D.hm(base)}`; };
  if (x.type === 'block') return sheet(x.title || '막음', `<p>${D.md(d)} ${t} · ${x.durationMin}분</p><button type="button" class="cl-ghost c2-wide" data-c2-cancel="${x.id}">막음 풀기</button>`);
  if (x.status === 'done') { const s = (data.sessions || []).find(y => y.id === x.sessionId); return sheet(whoLine(data, x), `<p>${D.md(d)} ${t} · 끝냄</p>${s && String(s.finishedAt).slice(0, 10) === today ? `<button type="button" class="cl-ghost c2-wide" data-c2-undo="${s.id}">되돌리기</button>` : ''}`); }
  const reply = x.reply?.state === 'change' ? `<p class="c2-warnline">회원 요청: ${esc(x.reply.wish || '시간 변경')}</p>` : '';
  return sheet(whoLine(data, x), `<p class="c2-fsum">${D.md(d)} (${D.wd(d)}) ${t} · ${esc(x.title || '')}</p>${reply}
  ${ended ? `<button type="button" class="cl-go c2-big" data-c2-finish="${x.id}">끝내기</button>` : `<div class="cl-btns"><button type="button" class="cl-go" data-c2-start="${x.id}">수업 시작</button><button type="button" class="cl-ghost" data-coach-plan="sched:${x.id}">계획</button></div>`}
  ${!ended ? `<p class="c2-sub">시간 바꾸기</p><div class="c2-qchips"><button type="button" class="chip" data-c2-move="${x.id}|${shift(1, 0)}">다음 날 같은 시간</button><button type="button" class="chip" data-c2-move="${x.id}|${shift(0, 60)}">1시간 뒤</button><button type="button" class="chip" data-c2-move="${x.id}|${shift(0, -60)}">1시간 앞</button><button type="button" class="chip" data-c2-move="${x.id}|${shift(7, 0)}">다음 주</button></div>
  ${x.reply?.state ? '' : `<div class="c2-qchips">${linkedAsk ? '' : `<button type="button" class="chip" data-c2-kakao="${x.id}">카톡으로 확인함</button>`}</div>`}
  <button type="button" class="text-button c2-danger" data-c2-cancel="${x.id}">수업 취소</button>` : ''}`);
}

// ---------- 예약 ----------
export function bookSheet(data, b, role) {
  const p = D.prefs2(data);
  const cl = data.clients.filter(c => c.stage !== 'ended');
  return sheet('+ 예약', `<form id="c2-book">${seg('type', [['class', '수업'], ['ot', 'OT·체험'], ['block', '막기']], b.type || 'class')}
  <fieldset class="c2-who"><legend>회원</legend><div class="c2-qchips">${cl.map(c => `<label class="ck-chip"><input type="checkbox" name="who" value="${c.id}" ${(b.clientIds || []).includes(c.id) ? 'checked' : ''}><span>${esc(c.name)}</span></label>`).join('')}</div></fieldset>
  <label class="field">수업 이름<input name="title" maxlength="30" value="${esc(b.title || '')}" placeholder="${role === 'pt' ? '예: 하체' : '예: 리포머 개인'}"></label>
  <div class="c2-two"><label class="field">날짜<input type="date" name="date" value="${b.date}"></label><label class="field">시간<input type="time" name="time" value="${b.time || '19:00'}" step="600"></label></div>
  <div class="c2-two"><label class="field">길이<select name="dur">${[30, 50, 60, 90].map(n => `<option ${n === 50 ? 'selected' : ''}>${n}</option>`).join('')}</select></label><label class="field">장소<select name="place"><option value="">회원 장소</option>${p.places.map(pl => `<option value="${pl.id}" ${b.placeId === pl.id ? 'selected' : ''}>${esc(pl.name)}</option>`).join('')}</select></label></div>
  ${role === 'pilates' ? `<label class="field">형태<select name="format">${['1:1', '듀엣', '그룹'].map(v => `<option>${v}</option>`).join('')}</select></label><label class="field">정원<input type="number" name="cap" min="1" max="12" value="${b.capacity || ''}" placeholder="그룹만"></label>` : ''}
  <fieldset class="c2-who"><legend>매주 반복</legend><div class="c2-qchips">${D.W.map((w, i) => `<label class="ck-chip"><input type="checkbox" name="rep" value="${i}"><span>${w}</span></label>`).join('')}</div></fieldset>
  <button type="submit" class="cl-go c2-wide">예약</button></form>`);
}

// ---------- 회원 추가·고치기 ----------
export function clientSheet(data, c, role) {
  const p = D.prefs2(data), isNew = !c?.id;
  return sheet(isNew ? '+ 회원' : '정보 고치기', `<form id="c2-client" data-id="${esc(c?.id || '')}">
  <label class="field">이름<input name="name" required maxlength="20" value="${esc(c?.name || '')}"></label>
  <label class="field">장소<select name="place">${p.places.map(pl => `<option value="${pl.id}" ${c?.placeId === pl.id ? 'selected' : ''}>${esc(pl.name)}</option>`).join('')}</select></label>
  ${role === 'pt' ? `<p class="c2-sub">단계</p>${seg('stage', [['active', '등록'], ['ot', 'OT 예정'], ['consult', '상담 중']], c?.stage || 'active')}<label class="field">상담 기록<input name="stageNote" maxlength="60" value="${esc(c?.stageNote || '')}" placeholder="예: 가격 고민 · 다음 주 다시"></label>` : `<label class="field">레벨<select name="level">${['입문 1', '입문 2', '중급', '고급'].map(v => `<option ${c?.level === v ? 'selected' : ''}>${v}</option>`).join('')}</select></label>`}
  <label class="field">목표<input name="goal" maxlength="40" value="${esc(c?.goal || '')}"></label>
  <label class="field">부상·통증(회원 진술)<input name="injury" maxlength="60" placeholder="예: 오른쪽 무릎 통증"></label>
  <div class="c2-two"><label class="field">생일<input type="date" name="birthday" value="${esc(c?.birthday || '')}"></label>${role === 'pt' ? `<label class="field">프로그램 순서<input name="split" value="${esc((c?.program?.split || []).join(' '))}" placeholder="하체 상체 등"></label>` : `<label class="field">풋바<input name="footbar" value="${esc(c?.setup?.footbar || '')}" placeholder="2단"></label>`}</div>
  ${isNew ? `<p class="c2-sub">수강권(선택)</p><div class="c2-two"><label class="field">횟수<input type="number" name="total" min="1" max="200" placeholder="20"></label><label class="field">금액(코치만)<input type="number" name="price" min="0" step="10000" placeholder="1400000"></label></div><div class="c2-two"><label class="field">기간(개월)<input type="number" name="months" min="1" max="24" value="3"></label>${role === 'pilates' ? `<label class="field">형태<select name="format">${['1:1', '듀엣', '그룹'].map(v => `<option>${v}</option>`).join('')}</select></label>` : ''}</div>` : ''}
  <button type="submit" class="cl-go c2-wide">${isNew ? '회원 추가' : '저장'}</button></form>`);
}

// ---------- 수강권 ----------
export function passSheet(data, c, k) {
  const p = D.passesOf(c).find(x => x.id === k.passId);
  if (k.sub === 'fix') { const e = p?.log.find(x => x.id === k.entryId); return sheet('장부 고치기', `<p class="c2-fsum">${e?.at ? D.md(e.at.slice(0, 10)) : ''} · ${esc(e?.reason)} · ${e?.delta}</p><form id="c2-fix"><label class="field">사유(필수)<input name="why" required maxlength="60" placeholder="예: 강사 사정으로 취소된 수업"></label><p class="c2-grey">원래 줄은 남기고 반대 줄을 더해요</p><button type="submit" class="cl-go c2-wide">되돌리는 줄 더하기</button></form>`); }
  if (k.sub === 'adjust') return sheet('회차 조정', `<form id="c2-adj">${seg('t', [['서비스', '서비스 +1'], ['조정+', '+1'], ['조정-', '−1']], '서비스')}<label class="field">사유<input name="why" maxlength="60" placeholder="예: 재등록 기념"></label><button type="submit" class="cl-go c2-wide">장부에 더하기</button></form>`);
  if (k.sub === 'hold') return sheet('홀딩', `<form id="c2-hold"><label class="field">며칠<input type="number" name="days" min="1" max="60" value="7"></label><p class="c2-grey">만료일이 그만큼 늘어요 · ${p?.expiresAt ? `지금 ${D.md(p.expiresAt)}` : ''}</p><button type="submit" class="cl-go c2-wide">홀딩</button></form>`);
  const role = D.prefs2(data).role;
  return sheet('새 수강권', `<form id="c2-newpass"><div class="c2-two"><label class="field">횟수<input type="number" name="total" min="1" max="200" value="20"></label><label class="field">기간(개월)<input type="number" name="months" min="1" max="24" value="3"></label></div>${role === 'pilates' ? `<label class="field">형태<select name="format">${['1:1', '듀엣', '그룹'].map(v => `<option>${v}</option>`).join('')}</select></label>` : ''}<div class="c2-two"><label class="field">금액(코치만)<input type="number" name="price" min="0" step="10000"></label><label class="field">할인<input type="number" name="discount" min="0" step="10000"></label></div><label class="c2-sw"><input type="checkbox" name="own"><span>내 규정으로(장소 규정 대신)</span></label><button type="submit" class="cl-go c2-wide">만들기</button></form>`);
}

// ---------- 변화 리포트 ----------
export function reportSheet(data, c, r, st, role) {
  const pl = D.placeOf(data, c.placeId), canSend = c.linked && pl?.directMsg !== false;
  const b = r.body ? [['체중', 'weight', 'kg'], ['골격근', 'muscle', 'kg'], ['체지방', 'fat', 'kg']].map(([l, k, u]) => { const a = r.body.from[k], z = r.body.to[k]; if (a == null || z == null) return ''; const dd = +(z - a).toFixed(1); return `<div><small>${l}</small><b>${z}<span>${u}</span></b><em class="${dd ? (k === 'muscle' ? (dd > 0 ? 'g' : 'b') : (dd < 0 ? 'g' : 'b')) : ''}">${dd > 0 ? '+' : dd < 0 ? '−' : '±'}${Math.abs(dd)}</em></div>`; }).join('') : '';
  const lifts = r.lifts.map(([n, v]) => `<li>${esc(n)} ${v.first} → <b>${v.last}kg</b></li>`).join('');
  const quotes = r.quotes.map(q => `<li>${D.md(q.date)} “${esc(q.text)}”</li>`).join('');
  const pre = `<div class="c2-rep"><p class="c2-sub">${D.md(r.start)}부터 · ${esc(c.name)}</p>
   ${role === 'pilates' ? `${quotes ? `<p class="c2-sub">회원이 한 말${tip('회원이 직접 한 말만 보내요. 빼고 싶으면 코치 코멘트로 대신해요.')}</p><ul>${quotes}</ul>` : ''}<p>배운 동작 <b>${r.moves}</b>개</p>${b ? `<div class="cl-sum c2-body">${b}</div>` : ''}` : `${b ? `<div class="cl-sum c2-body">${b}</div><small class="c2-grey">인바디 ${D.md(r.body.from.date)} → ${D.md(r.body.to.date)}${tip('같은 시간·공복 등 같은 조건으로 잰 값끼리 비교해요')}</small>` : ''}${lifts ? `<ul>${lifts}</ul>` : ''}<p class="c2-grey">눈바디 비교 · 사진 없음</p>`}
   <p>출석 <b>${r.attended}</b>회${r.classes > r.attended ? ` (전체 ${r.classes}회)` : ''} · 혼자 운동 <b>${r.soloDays}</b>일 · 기록한 날 <b>${r.logDays}</b>일</p>
   ${st.repNote ? `<p class="c2-quote">“${esc(st.repNote)}”</p>` : ''}</div>`;
  return sheet('변화 리포트', `${pre}<label class="field">코치 코멘트(필수)<textarea id="c2-repnote" rows="3" maxlength="300" placeholder="잘한 점 · 아쉬운 점과 이유 · 다음 몇 주 계획">${esc(st.repNote || '')}</textarea></label>
  ${canSend ? `<button type="button" class="cl-go c2-wide" data-c2-repsend="${c.id}">회원에게 보내기</button>` : `<button type="button" class="cl-ghost c2-wide" disabled>회원에게 보내기</button><p class="c2-grey">${c.linked ? '스튜디오 정책으로 직접 메시지 꺼짐' : '마이로그 연동 전'} · 화면을 보여 주며 상담해요</p>`}`, 'c2-repsheet');
}

// ---------- 한 줄(마이로그 하루) ----------
export function reactSheet(data, c, date) {
  const d = D.sharedDays(c).find(x => x.date === date) || {};
  const p = D.prefs2(data);
  return sheet(`${c.name} · ${D.md(date)}`, `<p class="c2-fsum">${esc([d.weight && `체중 ${d.weight}kg`, d.meals && `식사 ${d.meals}끼`, d.workout].filter(Boolean).join(' · '))}</p><form id="c2-react" data-c="${c.id}" data-d="${date}"><label class="field">한 줄<input name="t" maxlength="100" required placeholder="숫자 말고 행동을 칭찬해요" autocomplete="off"></label><div class="c2-qchips">${['기록 꾸준해요', '단백질 잘 챙겼어요', '혼자 운동 멋져요', '다시 와서 반가워요', ...p.quickNotes.slice(0, 2)].map(q => `<button type="button" class="chip" data-c2-rq="${esc(q)}">${esc(q)}</button>`).join('')}</div><p class="c2-grey">밤 9시~아침 8시에 보내면 아침에 도착해요</p><button type="submit" class="cl-go c2-wide">보내기</button></form>`);
}

// ---------- ⋯ 더 보기 ----------
export function moreSheet(c) {
  return sheet(c.name, `<button type="button" class="cl-ghost c2-wide" data-c2-preview="${c.id}">회원 화면 미리보기</button>
  <button type="button" class="cl-ghost c2-wide" disabled>초대 링크</button><p class="c2-grey">시제품에서는 꺼짐</p>
  <button type="button" class="cl-ghost c2-wide" disabled>다른 코치에게 인계</button><p class="c2-grey">본 앱 연결 때</p>
  <button type="button" class="text-button c2-danger" data-c2-end="${c.id}">${c.stage === 'ended' ? '다시 활성' : '수업 끝난 회원으로'}</button>`);
}

// ---------- 회원 화면 미리보기(마이로그 쪽) ----------
const passesForShow = (c, today) => D.passesOf(c).some(p => p.kind !== 'period');
export function memberPreview(data, c, now) {
  const today = D.ymd(now), pl = D.placeOf(data, c.placeId), ps = D.activePass(c, '', today);
  const coach = D.prefs2(data).coachName || '코치';
  const n = (data.schedules || []).filter(x => x.status === 'planned' && (x.clientIds || []).includes(c.id) && D.endOf(x) > now).sort((a, b) => String(a.startAt).localeCompare(String(b.startAt)))[0];
  const last = D.sessionsOf(data, c.id)[0], t = last ? (last.targets || []).find(x => x.clientId === c.id) : null;
  const showLeft = pl && D.showLeftOf(pl) && ps && ps.kind !== 'period' && passesForShow(c, today);
  const passes = D.passesOf(c).filter(p => p.kind !== 'period' && (!p.expiresAt || p.expiresAt >= today));
  const log = passes.flatMap(p => (p.log || []).map(e => ({...e, pn: passes.length > 1 ? p.name : ''}))).sort((a, b) => String(b.at).localeCompare(String(a.at))).slice(0, 8);
  return sheet(`회원 화면 · ${c.name}`, `<div class="c2-mcard"><b>${esc(coach)} 코치</b>${n ? `<p>다음 수업 ${D.md(String(n.startAt).slice(0, 10))} (${D.wd(String(n.startAt).slice(0, 10))}) ${String(n.startAt).slice(11, 16)}</p><div class="c2-qchips"><button type="button" class="chip${n.reply?.state === 'yes' ? ' on' : ''}" data-c2-mreply="${n.id}:yes">갈게요</button><button type="button" class="chip${n.reply?.state === 'change' ? ' on' : ''}" data-c2-mreply="${n.id}:change">시간 변경 요청</button></div>` : '<p>예정된 수업 없음</p>'}${showLeft ? passes.map(p => `<p>${esc(p.name)} 남은 <b>${D.passLeft(p)}</b>회${pl?.ledger === 'center' ? ' · 코치 기록 기준' : ''}</p>`).join('') : ''}</div>
  ${last && t ? `<div class="c2-mcard"><b>${D.md(last.date)} 수업 기록</b><p>${esc(last.title || '')} · ${last.exercises?.length ? D.exSummary(last.exercises) : last.moves?.length ? `${last.moves.filter(m => m.on !== false).length}동작` : ''}</p>${t.note ? `<p class="c2-quote">“${esc(t.note)}”</p>` : ''}<div class="c2-qchips"><button type="button" class="chip${t.confirmedAt ? ' on' : ''}" data-c2-mconf="${last.id}">확인</button><button type="button" class="chip${t.disputedAt ? ' on' : ''}" data-c2-mdisp="${last.id}">이의 있어요</button></div></div>` : ''}
  ${showLeft ? `<div class="c2-mcard"><b>내 장부</b>${log.map(e => `<div class="c2-lrow"><span>${e.at ? D.md(String(e.at).slice(0, 10)) : ''}</span><span>${esc(e.reason)}${e.pn ? ` · ${esc(e.pn)}` : ''}${e.note ? ` · ${esc(e.note)}` : ''}</span><b>${e.delta > 0 ? `+${e.delta}` : e.delta < 0 ? `−${-e.delta}` : '0'}</b></div>`).join('')}</div>` : `<div class="c2-mcard"><b>남은 회차</b><p class="c2-grey">센터에서 확인해요</p></div>`}
  <div class="c2-mcard"><b>코치님이 보는 것</b><p>${c.linked ? esc(['체중·인바디', '식단 기록', '운동'].filter((_, i) => [c.shared?.scope?.body, c.shared?.scope?.diet, c.shared?.scope?.workouts][i]).join(' · ') || '없음') : '연동 전'}</p><button type="button" class="text-button" disabled>범위 바꾸기 · 회원 앱에서</button></div>`, 'c2-member');
}
