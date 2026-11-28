// 코치로그 v2 화면(오늘·회원·일정·코치 설정). 계산은 coach2-data.js, 창은 coach2-sheets.js.
import * as D from './coach2-data.js';
export const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));
const COLORS = ['#8ce4e0', '#b8aaf2', '#f2a98a', '#8fc9f2', '#f7c270', '#a8e6a1', '#f28a9b'];
export const av = c => `<span class="cl-av" style="background:${COLORS[[...String(c?.id || '')].reduce((s, ch) => s + ch.charCodeAt(0), 0) % COLORS.length]}" aria-hidden="true">${esc(String(c?.name || '?')[0])}</span>`;
export const tip = t => `<i class="i-tip c2-tip" tabindex="0" title="${esc(t)}">ⓘ</i>`;
const names = (data, ids = []) => ids.map(id => data.clients.find(c => c.id === id)?.name || '회원');
export const whoLine = (data, x) => { const n = names(data, x.clientIds); return n.length > 2 ? `${x.title || '그룹'} · ${n.length}명` : n.join(' · ') || x.title || ''; };
const time = x => String(x.startAt).slice(11, 16);
const dateOf = x => String(x.startAt).slice(0, 10);
const placeName = (data, id) => D.placeOf(data, id)?.name || '';
const replyChip = x => { const r = x.reply?.state; if (r === 'yes') return '<span class="c2-chip ok">갈게요</span>'; if (r === 'change') return '<span class="c2-chip warn">변경 요청</span>'; if (r === 'kakao') return '<span class="c2-chip">카톡 확인</span>'; return ''; };
export const fmtWon = n => n ? `${Number(n).toLocaleString('ko-KR')}원` : '';

// ---------- 오늘 ----------
export function todayHTML(data, st, now = new Date()) {
  const p = D.prefs2(data), today = D.ymd(now);
  const justEnded = D.unprocessed(data, now).filter(x => dateOf(x) === today).slice(0, 3);
  const doneToday = (data.sessions || []).filter(s => s.v2 && !s.undone && String(s.finishedAt || '').slice(0, 10) === today).slice(-3).reverse();
  const nx = D.nextClass(data, now);
  const rest = D.classesOn(data, today).filter(x => x.status === 'planned' && D.endOf(x) > now && x.id !== nx?.id);
  const shown = new Set([...justEnded, ...(nx ? [nx] : [])].flatMap(x => x.clientIds || []).concat(doneToday.flatMap(s => s.targets.map(t => t.clientId))));
  // 위 칸에 이미 나온 회원은 숫자 알림(남은·만료·생일·수업 없음)만 빼고, 처리할 일(끝내기 전·변경 요청·이의·상담)은 남긴다
  const todo = D.todos(data, now).filter(t => !(shown.has(t.clientId) && ['left', 'expire', 'bday', 'idle'].includes(t.kind)));
  const head = `<div class="coach-head2"><div><h2>오늘</h2><small>${D.md(today)} (${D.wd(today)})</small></div><button type="button" class="cl-ib" data-page="settings" aria-label="코치 설정">⚙</button></div>`;
  const ended = justEnded.length ? `<section class="section card cl-card c2-hot"><h3>방금 끝난 수업</h3>${justEnded.map(x => `<div class="cl-row"><span class="cl-time">${time(x)}</span><div class="cl-who"><b>${esc(whoLine(data, x))}</b><small>${esc([(x.clientIds || []).length > 2 ? '' : x.title, placeName(data, x.placeId)].filter(Boolean).join(' · '))}</small></div><button type="button" class="cl-go" data-c2-finish="${x.id}">끝내기</button></div>`).join('')}</section>` : '';
  const done = doneToday.length ? `<div class="c2-done">${doneToday.map(s => `<span>✓ ${esc(names(data, s.targets.map(t => t.clientId)).join('·'))} ${esc(s.title || '')}</span><button type="button" class="text-button" data-c2-undo="${s.id}">되돌리기</button>`).join('')}</div>` : '';
  const next = nx ? nextCardHTML(data, nx, today) : `<section class="section card cl-card"><h3>다음 수업</h3><p class="c2-empty">예정된 수업이 없어요</p><button type="button" class="cl-ghost" data-c2-book="">+ 예약</button></section>`;
  const restHTML = rest.length ? `<section class="section card cl-card"><h3>오늘 남은 수업</h3>${groupByPlace(data, rest, p.role === 'pilates').map(([pl, xs]) => `${pl ? `<p class="c2-sub">${esc(pl)}</p>` : ''}${xs.map(x => `<button type="button" class="cl-row c2-rowbtn" data-c2-slot="${x.id}"><span class="cl-time">${time(x)}</span><div class="cl-who"><b>${esc(whoLine(data, x))}</b><small>${esc(x.title || '')}${x.capacity ? ` · ${x.clientIds.length}/${x.capacity}${x.waitlist ? ` · 대기 ${x.waitlist}` : ''}` : ''}</small></div>${replyChip(x)}</button>`).join('')}`).join('')}</section>` : '';
  const ACT = {finish: '끝내기', reschedule: '답하기', pass: '장부 보기', open: '상담 기록', report: '변화 리포트', book: '수업 잡기', msg: '한 줄'};
  const todoHTML = todo.length ? `<section class="section card cl-card"><h3>할 일${tip(`남은 ${p.watch.left}회 이하 · 만료 ${p.watch.expireDays}일 이내 · ${p.watch.idleDays}일 수업 없음 · 생일 주간 · 끝내기 전 수업 · 변경 요청 · 이의. 회원마다 가장 급한 것 하나만.`)}</h3>${todo.map(t => { const c = data.clients.find(x => x.id === t.clientId); return `<div class="cl-row c2-todo">${av(c)}<div class="cl-who"><b>${esc(t.name)}</b><small>${esc(t.text)}</small></div><button type="button" class="cl-ghost" data-c2-todo="${t.act}:${t.clientId}:${t.scheduleId || ''}">${ACT[t.act]}</button><button type="button" class="c2-x" data-c2-snooze="${t.clientId}" aria-label="이번 주 숨기기">✕</button></div>`; }).join('')}</section>` : '';
  return `<div class="c2">${head}${ended}${done}${next}${restHTML}${todoHTML}</div>`;
}
function groupByPlace(data, xs, on) {
  if (!on) return [['', xs]];
  const m = new Map(); for (const x of xs) { const k = placeName(data, x.placeId); m.set(k, [...(m.get(k) || []), x]); } return [...m];
}
export function nextCardHTML(data, x, today) {
  const ids = x.clientIds || [], c = data.clients.find(y => y.id === ids[0]);
  const pass = c ? D.activePass(c, x.format || '', today) : null, left = pass ? D.passLeft(pass) : null;
  const p = D.prefs2(data);
  const chips = [left !== null && left <= p.watch.left + 1 ? `<span class="c2-chip warn">${left <= 1 ? '마지막 회차' : `남은 ${left}회`}</span>` : '', c?.birthday && D.daysBetween(today, `${today.slice(0, 4)}-${c.birthday.slice(-5)}`) >= 0 && D.daysBetween(today, `${today.slice(0, 4)}-${c.birthday.slice(-5)}`) <= 6 ? '<span class="c2-chip">생일 주간</span>' : '', replyChip(x), x.type === 'ot' ? '<span class="c2-chip">OT·체험</span>' : ''].filter(Boolean).join('');
  const brief = ids.length === 1 ? D.briefOf(data, x, today) : [];
  const ICON = {focus: '◎', plan: '▤', last: '↺', warn: '⚠'};
  const when = dateOf(x) === today ? time(x) : `${D.md(dateOf(x))} ${time(x)}`;
  return `<section class="section card cl-card c2-next"><div class="c2-next-h"><span class="c2-when">${when}</span><div class="cl-who"><b>${esc(whoLine(data, x))}</b><small>${esc([x.title, placeName(data, x.placeId)].filter(Boolean).join(' · '))}</small></div></div>${chips ? `<div class="c2-chips">${chips}</div>` : ''}${brief.length ? `<ul class="c2-brief">${brief.map(([k, t]) => `<li class="${k}"><span aria-hidden="true">${ICON[k]}</span>${esc(t)}</li>`).join('')}</ul>` : ''}<div class="cl-btns"><button type="button" class="cl-go" data-c2-start="${x.id}">수업 시작</button><button type="button" class="cl-ghost" data-coach-plan="sched:${x.id}">계획</button></div></section>`;
}

// ---------- 회원 ----------
export function clientsHTML(data, st, now = new Date()) {
  const today = D.ymd(now), q = String(st.q || '').trim(), f = st.filter || 'all', role = D.prefs2(data).role;
  const todoIds = new Set(D.todos(data, now).map(t => t.clientId));
  const nextOf = c => (data.schedules || []).filter(x => x.status === 'planned' && (x.clientIds || []).includes(c.id) && D.endOf(x) > now).sort((a, b) => String(a.startAt).localeCompare(String(b.startAt)))[0];
  const weekEnd = D.addDays(today, 7);
  let list = data.clients.filter(c => !q || c.name.includes(q));
  if (f === 'todo') list = list.filter(c => todoIds.has(c.id));
  if (f === 'week') list = list.filter(c => { const n = nextOf(c); return n && dateOf(n) <= weekEnd; });
  if (f === 'stage') list = list.filter(c => c.stage === 'ot' || c.stage === 'consult');
  if (f === 'ended') list = list.filter(c => c.stage === 'ended' || !D.activePass(c, '', today) && c.stage === 'active');
  else list = list.filter(c => f === 'all' || c.stage !== 'ended');
  const FIL = [['all', '전체'], ['todo', '할 일'], ['week', '이번 주 수업'], ...(role === 'pt' ? [['stage', 'OT·상담']] : []), ['ended', '수강권 끝남']];
  const row = c => { const n = nextOf(c), ps = D.activePass(c, '', today), left = ps ? D.passLeft(ps) : null;
    const sub = c.stage === 'ot' ? 'OT' : c.stage === 'consult' ? '상담 중' : n ? `다음 ${dateOf(n) === today ? '오늘' : D.md(dateOf(n))} ${time(n)}` : '예약 없음';
    return `<button type="button" class="cl-row c2-crow" data-c2-open="${c.id}">${av(c)}<div class="cl-who"><b>${esc(c.name)}${c.linked ? '<i class="c2-dot link" title="마이로그 연동"></i>' : ''}${D.hasNewLog(c, today) ? '<i class="c2-dot new" title="새 기록"></i>' : ''}</b><small>${esc(sub)}</small></div>${left !== null ? `<span class="cl-pill${left <= D.prefs2(data).watch.left ? ' warn' : ''}">${ps.kind === 'period' ? '기간권' : `남은 ${left}`}</span>` : ''}</button>`; };
  return `<div class="c2"><div class="coach-head2"><div><h2>회원${tip('하늘색 점: 마이로그 연동 · 주황 점: 어제·오늘 새 기록')}</h2></div><button type="button" class="cl-go c2-add" data-c2-newclient>+ 회원</button></div>
  <input class="c2-search" type="search" placeholder="이름 찾기" value="${esc(q)}" data-c2-q aria-label="회원 이름 찾기">
  <div class="c2-filter" role="tablist">${FIL.map(([k, l]) => `<button type="button" class="${f === k ? 'on' : ''}" data-c2-filter="${k}">${l}</button>`).join('')}</div>
  <section class="section card cl-card c2-list">${list.length ? list.map(row).join('') : '<p class="c2-empty">해당하는 회원이 없어요</p>'}</section></div>`;
}

export function detailHTML(data, c, st, now = new Date()) {
  const today = D.ymd(now), role = D.prefs2(data).role, tab = st.tab || 'flow';
  const pst = D.passState(c, today), ps = pst.pass, left = ps && ps.kind !== 'period' ? D.passLeft(ps) : null;
  const n = (data.schedules || []).filter(x => x.status === 'planned' && (x.clientIds || []).includes(c.id) && D.endOf(x) > now).sort((a, b) => String(a.startAt).localeCompare(String(b.startAt)))[0];
  const stage = c.stage === 'ot' ? '<span class="c2-chip">OT</span>' : c.stage === 'consult' ? '<span class="c2-chip warn">상담 중</span>' : '';
  const head = `<div class="coach-head2"><button type="button" class="cl-ib" data-c2-open="" aria-label="회원 목록으로">‹</button><div style="flex:1;min-width:0"><h2>${esc(c.name)} ${stage}${c.level ? `<span class="c2-chip">${esc(c.level)}</span>` : ''}</h2></div><button type="button" class="cl-ib" data-c2-more="${c.id}" aria-label="더 보기">⋯</button></div>`;
  const sum = `<section class="section card cl-card"><div class="cl-sum"><div><small>${D.passesOf(c).length > 1 && ps ? esc(ps.name) : '남은'}</small><b>${left === null ? (ps?.kind === 'period' ? '기간권' : '—') : `${left}<span>/${ps.total}</span>`}</b></div><div><small>${pst.state === 'expired' ? '만료됨' : '만료'}</small><b${pst.state === 'expired' ? ' class="c2-warn"' : ''}>${ps?.expiresAt ? D.md(ps.expiresAt) : '—'}</b></div><div><small>다음 수업</small><b>${n ? `${dateOf(n) === today ? '오늘' : D.md(dateOf(n))} ${time(n)}` : '—'}</b></div></div><div class="cl-btns">${n ? `<button type="button" class="cl-go" data-c2-start="${n.id}">수업 시작</button>` : `<button type="button" class="cl-go" data-c2-book="${c.id}">수업 잡기</button>`}${n ? `<button type="button" class="cl-ghost" data-coach-plan="sched:${n.id}">계획</button>` : ''}</div></section>`;
  const tabs = `<div class="cl-tabs" role="tablist">${[['flow', '흐름'], ['pass', '수강권'], ['info', '정보']].map(([k, l]) => `<button type="button" role="tab" aria-selected="${tab === k}" class="${tab === k ? 'on' : ''}" data-c2-tab="${k}">${l}</button>`).join('')}</div>`;
  const body = tab === 'pass' ? passTabHTML(data, c, today, st) : tab === 'info' ? infoTabHTML(data, c, role) : flowTabHTML(data, c, st, today);
  return `<div class="c2">${head}${sum}${tabs}${body}</div>`;
}

function flowTabHTML(data, c, st, today) {
  const ss = D.sessionsOf(data, c.id), days = D.sharedDays(c);
  const dates = [...new Set([...ss.map(s => s.date), ...days.map(d => d.date)])].sort().reverse().slice(0, st.more ? 60 : 10);
  const pl = D.placeOf(data, c.placeId), canMsg = c.linked && pl?.directMsg !== false;
  const reacted = c.reactions || {};
  const sessCard = s => { const t = (s.targets || []).find(x => x.clientId === c.id) || {};
    const st2 = t.status === 'attended' ? '' : `<span class="c2-chip warn">${D.STATUS.find(z => z[0] === t.status)?.[1] || ''}</span>`;
    const what = s.exercises?.length ? D.exSummary(s.exercises) : s.moves?.length ? `${s.moves.filter(m => m.on !== false).length}동작` : '';
    const conf = t.disputedAt ? '<span class="c2-chip warn">이의</span>' : t.confirmedAt ? '<span class="c2-chip ok">회원 확인</span>' : '';
    return `<div class="c2-fcard c2-class"><b>${esc(s.title || '수업')} ${st2}${conf}</b><small>${esc([what, s.time].filter(Boolean).join(' · '))}</small>${t.note ? `<p>“${esc(t.note)}”</p>` : ''}</div>`; };
  const dayCard = d => { const bits = [d.weight ? `체중 ${(+d.weight).toFixed(1)}kg` : '', d.meals ? `식사 ${d.meals}끼${d.kcal ? ` · ${Number(d.kcal).toLocaleString('ko-KR')}kcal` : ''}${d.protein ? ` · 단백질 ${d.protein}g` : ''}` : '', d.workout || ''].filter(Boolean);
    if (!bits.length) return '';
    const r = reacted[d.date];
    return `<div class="c2-fcard c2-log"><b>마이로그</b><small>${esc(bits.join(' · '))}</small>${r ? `<p>“${esc(r)}”</p>` : canMsg ? `<button type="button" class="cl-ghost c2-mini" data-c2-react="${c.id}:${d.date}">한 줄</button>` : ''}</div>`; };
  const items = dates.map(dt => { const cards = [...ss.filter(s => s.date === dt).map(sessCard), ...days.filter(d => d.date === dt).map(dayCard)].filter(Boolean).join('');
    return cards ? `<p class="c2-day">${dt === today ? '오늘' : `${D.md(dt)} (${D.wd(dt)})`}</p>${cards}` : ''; }).join('');
  const note = !c.linked ? '<p class="c2-grey">마이로그 연동 전 · 회원 기록은 연동 뒤 보여요</p>' : '';
  const all = new Set([...ss.map(s => s.date), ...days.map(d => d.date)]).size;
  return `<section class="section card c2-flow"><button type="button" class="cl-ghost c2-report-btn" data-c2-report="${c.id}">변화 리포트</button>${note}${items || '<p class="c2-empty">아직 기록이 없어요</p>'}${!st.more && all > 10 ? '<button type="button" class="text-button c2-wide" data-c2-moreflow>지난 기록 더 보기</button>' : ''}</section>`;
}

function passTabHTML(data, c, today, st) {
  const ps = D.passesOf(c), pl = D.placeOf(data, c.placeId);
  const card = p => { const rule = D.ruleOf(data, p, c.placeId);
    const ledgerTxt = pl?.ledger === 'center' && p.ruleFrom !== 'own' ? '센터 장부: 공식 장부는 센터 프로그램, 여기는 내 기록용 · ' : '';
    const ruleTxt = `${ledgerTxt}취소 ${rule.cutoffH}시간 전까지 · 늦은 취소 ${rule.late ? '차감' : '차감 없음'} · 노쇼 ${rule.noshow ? '차감' : '차감 없음'}${p.format === '듀엣' ? ` · 짝 결석 시 ${({duet: '듀엣 차감', private: '개인 전환', none: '차감 없음'})[rule.duetAbsent]}` : ''}`;
    const svc = D.passService(p);
    const log = (p.log || []).slice().sort((a, b) => String(b.at).localeCompare(String(a.at)));
    const lim = st?.ledgerAll ? 999 : 10;
    return `<article class="c2-pass"><div class="c2-pass-h"><b>${esc(p.name)}${tip(ruleTxt)}</b><span>${D.passesOf(c).length > 1 && p.kind !== 'period' ? `남은 ${D.passLeft(p)}` : ''}</span></div>
    <small class="c2-pass-m">${esc([p.start ? `${D.md(p.start)} 시작` : '', svc ? `서비스 ${svc}회` : '', fmtWon(p.price)].filter(Boolean).join(' · '))}</small>
    <div class="c2-ledger">${log.slice(0, lim).map(e => `<div class="c2-lrow${e.refId ? ' rev' : ''}"><span>${e.at ? D.md(String(e.at).slice(0, 10)) : ''}</span><span>${esc(e.reason)}${e.note ? ` · ${esc(e.note)}` : ''}${e.disputedAt && !e.resolvedAt ? ` <button type="button" class="c2-chip warn" data-c2-resolve="${c.id}:${p.id}:${e.id}">이의 처리</button>` : ''}</span><b>${e.delta > 0 ? `+${e.delta}` : e.delta < 0 ? `−${-e.delta}` : '0'}</b>${e.delta && !e.refId && !(p.log || []).some(y => y.refId === e.id) ? `<button type="button" class="text-button" data-c2-fix="${c.id}:${p.id}:${e.id}">고치기</button>` : '<span></span>'}</div>`).join('') || '<p class="c2-empty">아직 장부가 비어 있어요</p>'}${log.length > lim ? '<button type="button" class="text-button" data-c2-ledgerall>전부 보기</button>' : ''}</div>
    <div class="c2-pass-a"><button type="button" class="cl-ghost" data-c2-adjust="${c.id}:${p.id}">＋ 조정</button><button type="button" class="cl-ghost" data-c2-hold="${c.id}:${p.id}">홀딩</button></div></article>`; };
  return `<section class="section card">${ps.map(card).join('') || '<p class="c2-empty">수강권이 없어요</p>'}<button type="button" class="cl-ghost c2-wide" data-c2-newpass="${c.id}">＋ 새 수강권</button></section>`;
}

function infoTabHTML(data, c, role) {
  const row = (k, v) => v ? `<div class="c2-info"><small>${k}</small><p>${v}</p></div>` : '';
  const sc = c.shared?.scope;
  return `<section class="section card">${row('목표', esc(c.goal))}${row('부상·통증', (c.injuries || []).map(i => `${i.date ? `${D.md(i.date)} ` : ''}${esc(i.text)}`).join('<br>'))}${row('생일', c.birthday ? D.md(c.birthday) : '')}${row('장소', esc(D.placeOf(data, c.placeId)?.name))}
  ${role === 'pt' ? row('프로그램', c.program?.split ? esc(`${c.program.split.join(' → ')}${c.program.week ? ` · ${c.program.week}주 차` : ''}`) : '') : row('기구 기본 세팅', c.setup ? esc(Object.entries({footbar: '풋바', headrest: '헤드레스트', stopper: '스토퍼'}).filter(([k]) => c.setup[k]).map(([k, l]) => `${l} ${c.setup[k]}`).join(' · ')) : '')}
  ${row('마이로그 공유', c.linked ? esc(sc ? ['체중·인바디', '식단 기록', '운동'].filter((_, i) => [sc.body, sc.diet, sc.workouts][i]).join(' · ') || '없음' : '—') : '<span class="c2-grey">연동 전</span>')}${row('메모', esc(c.memo))}
  <button type="button" class="cl-ghost c2-wide" data-c2-editclient="${c.id}">정보 고치기</button></section>`;
}

// ---------- 일정 ----------
export function scheduleHTML(data, st, now = new Date()) {
  const today = D.ymd(now), view = st.view || 'week', day = st.day || today;
  const seg = `<div class="cl-tabs c2-seg" role="tablist"><button type="button" class="${view === 'week' ? 'on' : ''}" data-c2-view="week">주</button><button type="button" class="${view === 'month' ? 'on' : ''}" data-c2-view="month">월</button></div>`;
  if (view === 'month') {
    const m = (st.month || today).slice(0, 7), first = D.at(`${m}-01`, '12:00'), start = D.addDays(`${m}-01`, -((first.getDay() + 6) % 7));
    const cnt = D.monthCounts(data, m);
    const cells = Array.from({length: 42}, (_, i) => { const d = D.addDays(start, i), n = D.classesOn(data, d).filter(x => (x.type || 'class') !== 'block').length, blk = D.classesOn(data, d).some(x => x.type === 'block');
      return `<button type="button" class="c2-mcell${d.slice(0, 7) !== m ? ' out' : ''}${d === today ? ' today' : ''}" data-c2-day="${d}"><b>${Number(d.slice(8))}</b>${n ? `<i>${n}</i>` : ''}${blk ? '<s>막음</s>' : ''}</button>`; }).join('');
    return `<div class="c2"><div class="coach-head2"><div><h2>일정</h2><small>${Number(m.slice(5))}월</small></div><div class="c2-arw"><button type="button" class="cl-ib" data-c2-month="-1" aria-label="이전 달">‹</button><button type="button" class="cl-ib" data-c2-month="1" aria-label="다음 달">›</button></div></div>${seg}
    <p class="c2-count">이번 달 끝낸 수업 ${Object.entries(cnt).map(([k, v]) => `${esc(k)} <b>${v}</b>`).join(' · ') || '<b>0</b>'}</p>
    <div class="c2-month">${['월', '화', '수', '목', '금', '토', '일'].map(w => `<i>${w}</i>`).join('')}${cells}</div></div>`;
  }
  const ws = D.addDays(day, -((D.at(day, '12:00').getDay() + 6) % 7));
  const strip = Array.from({length: 7}, (_, i) => { const d = D.addDays(ws, i), n = D.classesOn(data, d).length; return `<button type="button" class="c2-dbtn${d === day ? ' on' : ''}${d === today ? ' today' : ''}" data-c2-day="${d}"><small>${D.wd(d)}</small><b>${Number(d.slice(8))}</b>${n ? '<i></i>' : ''}</button>`; }).join('');
  const list = D.classesOn(data, day);
  const stChip = x => x.type === 'block' ? '<span class="c2-chip">막음</span>' : x.status === 'done' ? '<span class="c2-chip ok">끝냄</span>' : D.endOf(x) <= now ? '<span class="c2-chip warn">끝내기 전</span>' : replyChip(x);
  const rows = list.map(x => `<button type="button" class="cl-row c2-rowbtn${x.type === 'block' ? ' c2-block' : ''}" data-c2-slot="${x.id}"><span class="cl-time">${time(x)}</span><div class="cl-who"><b>${esc(x.type === 'block' ? x.title : whoLine(data, x))}</b><small>${esc([x.type === 'block' ? '' : x.title, x.type === 'ot' ? 'OT·체험' : '', placeName(data, x.placeId), x.repeat?.days?.length ? `매주 ${x.repeat.days.map(d => D.W[d]).join('·')}` : '', x.capacity ? `${x.clientIds.length}/${x.capacity}${x.waitlist ? ` · 대기 ${x.waitlist}` : ''}` : ''].filter(Boolean).join(' · '))}</small></div>${stChip(x)}</button>`).join('');
  return `<div class="c2"><div class="coach-head2"><div><h2>일정</h2><small>${D.md(ws)} - ${D.md(D.addDays(ws, 6))}</small></div><div class="c2-arw"><button type="button" class="cl-ib" data-c2-week="-1" aria-label="이전 주">‹</button><button type="button" class="cl-ib" data-c2-week="1" aria-label="다음 주">›</button></div></div>${seg}
  <div class="c2-strip">${strip}</div>
  <section class="section card cl-card"><h3>${D.md(day)} (${D.wd(day)})${day === today ? ' · 오늘' : ''}</h3>${rows || '<p class="c2-empty">수업 없음</p>'}<button type="button" class="cl-ghost c2-wide" data-c2-book="" data-c2-date="${day}">+ 예약</button></section></div>`;
}

// ---------- 코치 설정(설정 페이지 위) ----------
export function settingsHTML(data) {
  const p = D.prefs2(data);
  const place = (pl, i) => `<fieldset class="c2-place" data-i="${i}"><input class="c2-plname" name="pl-name" value="${esc(pl.name)}" aria-label="장소 이름" maxlength="30">
   <div class="c2-seg2"><label><input type="radio" name="pl-ledger-${i}" value="center" ${pl.ledger === 'center' ? 'checked' : ''}><span>센터 장부</span></label><label><input type="radio" name="pl-ledger-${i}" value="mine" ${pl.ledger !== 'center' ? 'checked' : ''}><span>내 장부</span></label>${tip('센터 장부: 공식 장부는 센터 프로그램이에요. 코치로그 장부는 내 기록용이고, 회원 화면에 남은 회차를 보내지 않아요.')}</div>
   <label class="c2-sw${pl.ledger === 'center' ? ' off' : ''}"><input type="checkbox" name="pl-showLeft" ${pl.ledger !== 'center' && pl.showLeft ? 'checked' : ''} ${pl.ledger === 'center' ? 'disabled' : ''}><span>회원에게 남은 회차 보이기</span><small class="c2-why" ${pl.ledger === 'center' ? '' : 'hidden'}>센터 장부는 공식 숫자가 센터에 있어 보내지 않아요</small></label>
   <label class="c2-sw"><input type="checkbox" name="pl-directMsg" ${pl.directMsg ? 'checked' : ''}><span>회원에게 직접 메시지</span>${tip('끄면 한 줄·안부·변화 리포트 보내기가 회색이 돼요(스튜디오 정책).')}</label>
   <div class="c2-rule"><label>취소 마감<input type="number" name="pl-cutoff" min="0" max="72" value="${pl.rule?.cutoffH ?? 24}" inputmode="numeric">시간 전</label>
   <label class="c2-sw"><input type="checkbox" name="pl-late" ${pl.rule?.late !== false ? 'checked' : ''}><span>늦은 취소 차감</span></label><label class="c2-sw"><input type="checkbox" name="pl-noshow" ${pl.rule?.noshow !== false ? 'checked' : ''}><span>노쇼 차감</span></label>
   ${p.role === 'pilates' ? `<label>짝 결석 시<select name="pl-duet">${[['duet', '듀엣 차감'], ['private', '개인 전환'], ['none', '차감 없음']].map(([v, l]) => `<option value="${v}" ${pl.rule?.duetAbsent === v ? 'selected' : ''}>${l}</option>`).join('')}</select></label>
   <label>리포머<select name="pl-brand">${Object.keys(D.BRANDS).map(b => `<option ${pl.apparatus?.brand === b ? 'selected' : ''}>${b}</option>`).join('')}</select></label><span class="c2-springs" data-c2-brandprev>${D.springsOf(pl.apparatus?.brand).map(s => `<i style="background:${s.color}"></i>${s.name}`).join(' ')}</span>` : ''}</div>
   <button type="button" class="text-button" data-c2-delplace="${i}">장소 빼기</button></fieldset>`;
  return `<section class="section card c2-set"><form id="c2-settings">
  <div class="c2-seg2 role">${D.ROLES.map(([v, l]) => `<label><input type="radio" name="role" value="${v}" ${p.role === v ? 'checked' : ''}><span>${l}</span></label>`).join('')}</div>
  <label class="field">코치 이름<input name="coachName" value="${esc(p.coachName)}" maxlength="20"></label>
  <h3>장소</h3>${p.places.map(place).join('')}<button type="button" class="cl-ghost c2-wide" data-c2-addplace>+ 장소</button>
  <h3>할 일 기준</h3><div class="c2-rule"><label>남은<input type="number" name="w-left" min="0" max="10" value="${p.watch.left}">회 이하</label><label>만료<input type="number" name="w-exp" min="1" max="30" value="${p.watch.expireDays}">일 이내</label><label>수업 없이<input type="number" name="w-idle" min="3" max="60" value="${p.watch.idleDays}">일</label></div>
  <label class="c2-sw"><input type="checkbox" name="ask" ${p.askDayBefore ? 'checked' : ''}><span>전날 저녁 출석 묻기</span>${tip('마이로그 연동 회원 + 직접 메시지 허용 장소만. 밤 9시~아침 8시 회원 알림은 아침에 모아 보내요.')}</label>
  <label class="field">자주 쓰는 한 줄<textarea name="quick" rows="2">${esc(p.quickNotes.join(', '))}</textarea></label>
  <button type="submit" class="cl-go c2-wide">설정 저장</button></form>
  <button type="button" class="text-button" data-c2-reseed>샘플 다시 넣기</button></section>`;
}
