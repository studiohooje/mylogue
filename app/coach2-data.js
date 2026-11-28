// 코치로그 v2 — 계산·데이터(화면 없음). 설계: docs/plans/coachlog-v2/design-v2.1.md
// 원칙: 장부는 더하기만(되돌리기·고치기는 반대 줄), 남은 회차는 장부에서 계산, 수업 하나·회원 하나는 한 번만 차감.
// 이 파일은 app.js를 import하지 않는다(시험에서 그대로 부름).

export const cid = (p = 'x') => `${p}${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
const pad = n => String(n).padStart(2, '0');
// 한국 날짜: 기기 시각 기준(toISOString은 세계 표준시라 아침 9시 전에 하루 밀림)
export const ymd = (d = new Date()) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const hm = (d = new Date()) => `${pad(d.getHours())}:${pad(d.getMinutes())}`;
export const addDays = (date, n) => { const d = new Date(`${date}T12:00:00`); d.setDate(d.getDate() + n); return ymd(d); };
export const at = (date, time = '00:00') => new Date(`${date}T${time}:00`);
export const addMonths = (date, n) => { const [y, m, d] = date.split('-').map(Number); const t = new Date(y, m - 1 + n, 1); const last = new Date(t.getFullYear(), t.getMonth() + 1, 0).getDate(); return ymd(new Date(t.getFullYear(), t.getMonth(), Math.min(d, last))); };
export const md = date => `${Number(String(date).slice(5, 7))}/${Number(String(date).slice(8, 10))}`;
export const W = ['일', '월', '화', '수', '목', '금', '토'];
export const wd = date => W[at(date, '12:00').getDay()];
export const daysBetween = (a, b) => Math.round((at(b, '12:00') - at(a, '12:00')) / 864e5);

export const ROLES = [['pt', 'PT 트레이너'], ['pilates', '필라테스 강사']];
export const STATUS = [['attended', '출석'], ['late', '늦은 취소'], ['noshow', '노쇼']];
export const DEFAULT_RULE = {cutoffH: 24, late: true, noshow: true, duetAbsent: 'duet'};
export const DEFAULT_WATCH = {left: 2, expireDays: 7, idleDays: 14};
export const BRANDS = {
  '밸런스드 바디': [['y', '노랑', '#f2c94c'], ['b', '파랑', '#3e7bfa'], ['r', '빨강', '#e5484d'], ['g', '초록', '#30a46c']],
  '스톳(메리스류)': [['w', '흰색', '#e8e8e8'], ['b', '파랑', '#3e7bfa'], ['r', '빨강', '#e5484d'], ['k', '검정', '#2b2b2b']],
  '피크': [['b', '파랑', '#3e7bfa'], ['y', '노랑', '#f2c94c'], ['r', '빨강', '#e5484d']],
  '그라츠': [['s', '스프링', '#9aa0a6']]
};
export function normSprings(springs, brand) { const sp = springsOf(brand); if (brand === '그라츠') { const n = (springs || []).reduce((s, x) => s + (Number(x.n) || 0), 0); return n ? [{id: 's', n}] : []; } return (springs || []).filter(x => sp.some(y => y.id === x.id)); }
export const springsOf = brand => (BRANDS[brand] || BRANDS['밸런스드 바디']).map(([id, name, color]) => ({id, name, color}));

// ---------- 설정 ----------
export function prefs2(data) {
  const p = data?.prefs || {};
  return {role: p.role || 'pt', places: p.places || [], watch: {...DEFAULT_WATCH, ...(p.watch || {})}, quickNotes: p.quickNotes || ['자세 좋아요', '다음엔 +2.5kg', '호흡 잊지 않기', '오늘 강도 딱 좋았어요'], askDayBefore: p.askDayBefore !== false, snooze: p.snooze || {}, coachName: p.coachName || '', persona: p.persona || ''};
}
export const placeOf = (data, id) => prefs2(data).places.find(p => p.id === id) || null;
export const ruleOf = (data, pass, placeId) => pass?.ruleFrom === 'own' && pass.rule ? {...DEFAULT_RULE, ...pass.rule} : {...DEFAULT_RULE, ...(placeOf(data, placeId)?.rule || {})};

// ---------- 수강권·장부 ----------
// 예전 c.pt(하나)는 passes[0]로 읽는다(옛 데이터 호환).
export function passesOf(c) {
  if (Array.isArray(c?.passes)) return c.passes;
  const pt = c?.pt; if (!pt || (!pt.total && pt.kind !== 'period')) return [];
  const log = (pt.log || []).map((x, i) => ({id: `old${i}`, at: x.at, delta: Number(x.delta) || -1, reason: x.reason || x.note || '출석', sessionId: x.sessionId || ''}));
  const used = Number(pt.used) || 0, logged = -log.reduce((s, x) => s + Math.min(0, x.delta), 0);
  if (used > logged) log.unshift({id: 'old-base', at: pt.start || '', delta: -(used - logged), reason: '이전 기록', sessionId: ''});
  return [{id: 'p0', name: pt.name || `PT ${pt.total}회권`, kind: pt.kind || 'count', format: pt.format || '1:1', total: Number(pt.total) || 0, start: pt.start || '', expiresAt: pt.expiresAt || '', price: pt.price || null, log}];
}
export const passLeft = p => p.kind === 'period' ? null : (Number(p.total) || 0) + (p.log || []).reduce((s, x) => s + (Number(x.delta) || 0), 0);
export const passService = p => (p.log || []).filter(x => x.reason === '서비스').reduce((s, x) => s + (Number(x.delta) || 0), 0);
export const passUsed = p => -(p.log || []).reduce((s, x) => s + (Number(x.delta) || 0), 0) + passService(p);
export function activePass(c, format = '', today = ymd()) {
  const ps = passesOf(c).filter(p => !p.closed && (!p.expiresAt || p.expiresAt >= today) && (p.kind === 'period' || passLeft(p) > 0)).sort((a, b) => String(a.expiresAt || '9999').localeCompare(String(b.expiresAt || '9999')));
  return ps.find(p => !format || p.format === format) || ps[0] || null;
}
// 쓸 수 있는 게 없을 때 가장 최근 수강권(끝남·만료 안내용)
export const latestPass = c => passesOf(c).slice().sort((a, b) => String(b.start || '').localeCompare(String(a.start || '')))[0] || null;
export function passState(c, today = ymd()) { const a = activePass(c, '', today); if (a) return {pass: a, state: 'ok'}; const l = latestPass(c); if (!l) return {pass: null, state: 'none'}; if (l.expiresAt && l.expiresAt < today) return {pass: l, state: 'expired'}; return {pass: l, state: 'empty'}; }
const fmtOf = n => n <= 1 ? '1:1' : n === 2 ? '듀엣' : '그룹';
// 이 수업·이 회원에 대한 장부 합(같은 수업 두 번 차감 막기)
export const netFor = (c, sessionId) => passesOf(c).flatMap(p => p.log || []).filter(x => x.sessionId === sessionId).reduce((s, x) => s + (Number(x.delta) || 0), 0);

export function addLog(c, passId, entry) {
  const passes = passesOf(c).map(p => p.id !== passId ? p : {...p, log: [...(p.log || []), {id: cid('l'), at: new Date().toISOString(), by: 'coach', ...entry}]});
  return {...c, passes};
}

// 끝내기에서 회원 하나의 차감 판단 → {delta, passId, reason, label}
export function deductionFor(data, c, {status, format = '1:1', placeId = '', others = [], type = 'class'}, today = ymd()) {
  if (type === 'ot') return {delta: 0, passId: '', reason: 'OT·체험', label: '차감 없음', rule: ruleOf(data, null, placeId)};
  let pass = activePass(c, format, today);
  const rule = ruleOf(data, pass, placeId);
  const reason = STATUS.find(s => s[0] === status)?.[1] || '출석';
  if (!pass) { const ps = passState(c, today); return {delta: 0, passId: '', reason, label: ps.state === 'expired' ? '수강권 만료' : ps.state === 'empty' ? '수강권 끝남' : '수강권 없음', warn: true, rule}; }
  if (pass.kind === 'period') return {delta: 0, passId: pass.id, reason, label: status === 'attended' ? '참여' : reason, rule};
  if (status === 'late' && !rule.late) return {delta: 0, passId: pass.id, reason, label: '차감 없음', rule};
  if (status === 'noshow' && !rule.noshow) return {delta: 0, passId: pass.id, reason, label: '차감 없음', rule};
  // 듀엣에서 짝이 안 왔을 때(출석한 쪽) 장소 규정
  if (status === 'attended' && format === '듀엣' && others.some(o => o !== 'attended')) {
    if (rule.duetAbsent === 'none') return {delta: 0, passId: pass.id, reason: '짝 결석', label: '차감 없음', rule};
    if (rule.duetAbsent === 'private') { const pv = activePass(c, '1:1', today); if (pv && pv.format === '1:1') pass = pv; else { const left0 = passLeft(pass); return {delta: -1, passId: pass.id, reason, label: `${pass.name} ${left0} → ${left0 - 1}`, note: '개인권 없음', rule, passName: pass.name}; } }
  }
  const left = passLeft(pass), many = passesOf(c).filter(p => p.kind !== 'period').length > 1;
  return {delta: -1, passId: pass.id, reason, label: `${many ? `${pass.name} ` : '남은 '}${left} → ${left - 1}`, rule, passName: pass.name};
}

// ---------- 수업 끝내기 ----------
// draft: {scheduleId, date, time, title, placeId, format, clientIds, statuses{id:status}, exercises?, moves?, exceptions?, condition?, note, nextFocus, nextBook?{date,time}}
export function actualStart(draft, sch, now = new Date()) {
  if (!draft.date || !draft.time) return {};
  const planned = new Date(`${draft.date}T${draft.time}`);
  if (!(planned > now)) return {};
  const st = new Date(now.getTime() - (Number(sch?.durationMin) || 50) * 60000), day = ymd(now);
  const s2 = ymd(st) === day ? st : new Date(`${day}T00:00`);
  return {date: day, time: hm(s2)};
}
export function finishClass(data, draft, today = ymd(), now = new Date()) {
  const sid = draft.sessionId || cid('s');
  if ((data.sessions || []).some(s => s.id === sid && !s.undone)) return {data, sessionId: sid, skipped: true};
  const sch = (data.schedules || []).find(x => x.id === draft.scheduleId);
  if (sch && sch.status === 'done') return {data, sessionId: sch.sessionId, skipped: true};
  const statuses = draft.statuses || {};
  const targets = [];
  let clients = data.clients;
  for (const id of draft.clientIds || []) {
    const c = clients.find(x => x.id === id); if (!c) continue;
    const status = statuses[id] || 'attended';
    const others = (draft.clientIds || []).filter(x => x !== id).map(x => statuses[x] || 'attended');
    const d = deductionFor(data, c, {status, format: draft.format, placeId: draft.placeId, others, type: draft.type || sch?.type || 'class'}, today);
    let next = c;
    if (d.passId && d.delta && netFor(c, sid) === 0) next = addLog(c, d.passId, {delta: d.delta, reason: d.reason, sessionId: sid});
    else if (d.passId && !d.delta) next = addLog(c, d.passId, {delta: 0, reason: d.reason, sessionId: sid});
    clients = clients.map(x => x.id === id ? next : x);
    targets.push({clientId: id, passId: d.passId, status, deducted: d.delta, note: status === 'attended' ? (draft.note || '') : ''});
  }
  // 2026-11-28 대표님 검수: 예약 시각보다 먼저 끝내면(수업을 당겨서 함) 예약 시각이 아니라 실제로 한 시각으로 남긴다(끝낸 시각 - 수업 길이)
  const at = actualStart(draft, sch, now);
  const session = {id: sid, date: at.date || draft.date || today, time: at.time ?? (draft.time || ''), title: draft.title || '', placeId: draft.placeId || '', format: draft.format || '1:1', scheduleId: draft.scheduleId || '', targets,
    exercises: draft.exercises || [], moves: draft.moves || [], exceptions: Object.fromEntries(Object.entries(draft.exceptions || {}).filter(([, v]) => String(v || '').trim())), condition: draft.condition || {}, memo: draft.memo || '', type: draft.type || sch?.type || 'class', cancelReqAt: draft.cancelReqAt || '', nextFocus: draft.nextFocus || '', finishedAt: new Date().toISOString(), sentAt: new Date().toISOString(), v2: true};
  let schedules = (data.schedules || []).map(x => x.id === draft.scheduleId ? {...x, status: 'done', sessionId: sid, ...(draft.cancelReqAt ? {cancelReqAt: draft.cancelReqAt} : {})} : x);
  if (draft.nextBook?.date) { const src = schedules.find(x => x.id === draft.scheduleId) || {}; schedules = [...schedules, {id: cid('b'), type: 'class', clientIds: draft.clientIds, startAt: `${draft.nextBook.date}T${draft.nextBook.time || draft.time || '19:00'}`, durationMin: src.durationMin || 50, title: draft.title || src.title || '', placeId: draft.placeId || src.placeId || '', format: draft.format || src.format || '1:1', status: 'planned'}]; }
  return {data: {...data, clients, schedules, sessions: [...(data.sessions || []), session]}, sessionId: sid};
}
// 당일 되돌리기: 장부에 반대 줄을 더하고 수업은 '되돌림' 표시, 예약은 다시 예정으로
export function undoClass(data, sessionId) {
  const s = (data.sessions || []).find(x => x.id === sessionId); if (!s || s.undone) return data;
  const clients = data.clients.map(c => {
    let next = c;
    for (const p of passesOf(c)) for (const e of (p.log || []).filter(x => x.sessionId === sessionId && x.delta && !x.refId)) {
      if ((p.log || []).some(y => y.refId === e.id)) continue;
      next = addLog(next, p.id, {delta: -e.delta, reason: '되돌림', sessionId: '', refId: e.id});
    }
    return next;
  });
  return {...data, clients, sessions: data.sessions.map(x => x.id === sessionId ? {...x, undone: new Date().toISOString()} : x), schedules: (data.schedules || []).map(x => x.sessionId === sessionId ? {...x, status: 'planned', sessionId: ''} : x)};
}

// ---------- 일정 ----------
export const endOf = x => new Date(at(String(x.startAt).slice(0, 10), String(x.startAt).slice(11, 16)).getTime() + (Number(x.durationMin) || 50) * 6e4);
export const startOf = x => at(String(x.startAt).slice(0, 10), String(x.startAt).slice(11, 16));
export const classesOn = (data, date) => (data.schedules || []).filter(x => String(x.startAt).slice(0, 10) === date && x.status !== 'canceled').sort((a, b) => String(a.startAt).localeCompare(String(b.startAt)));
const isClass = x => (x.type || 'class') !== 'block';
// 끝났는데 끝내기 안 한 수업(OT·체험 포함, 막기 제외)
// 예전 데이터에 출석 표시 안 한 지난 예약이 많을 수 있어 최근 14일만 본다
export const unprocessed = (data, now = new Date()) => (data.schedules || []).filter(x => isClass(x) && x.status === 'planned' && endOf(x) <= now && endOf(x) >= new Date(now.getTime() - 14 * 864e5)).sort((a, b) => String(b.startAt).localeCompare(String(a.startAt)));
export function nextClass(data, now = new Date()) {
  return (data.schedules || []).filter(x => isClass(x) && x.status === 'planned' && endOf(x) > now).sort((a, b) => String(a.startAt).localeCompare(String(b.startAt)))[0] || null;
}
export const monthCounts = (data, month) => {
  const out = {};
  for (const s of data.sessions || []) if (!s.undone && String(s.date).startsWith(month)) { const k = placeOf(data, s.placeId)?.name || '장소 없음'; out[k] = (out[k] || 0) + 1; }
  return out;
};

// ---------- 브리핑 ----------
export const sessionsOf = (data, clientId) => (data.sessions || []).filter(s => !s.undone && (s.targets || []).some(t => t.clientId === clientId)).sort((a, b) => `${b.date}${b.time}`.localeCompare(`${a.date}${a.time}`));
export function briefOf(data, x, today = ymd()) {
  const role = prefs2(data).role, ids = x.clientIds || [];
  const c = data.clients.find(y => y.id === ids[0]); if (!c) return [];
  if (ids.length > 2) return [];
  const DONE = ['attended', 'confirmed', 'edited', 'sent', 'queued']; // 예전 방식(보낸 수업·회원 확정)도 지난 수업으로
  const last = sessionsOf(data, c.id).find(s => DONE.includes((s.targets || []).find(t => t.clientId === c.id)?.status));
  const out = [];
  if (last?.nextFocus) out.push(['focus', last.nextFocus]);
  if (role === 'pt') {
    const pg = c.program; if (pg?.split?.length) { const n = sessionsOf(data, c.id).filter(s => s.title).length; out.push(['plan', `${pg.split.join(' → ')}${pg.week ? ` · ${pg.week}주 차` : ''}`]); }
    if (last?.exercises?.length) { const top = last.exercises.map(e => ({n: e.name, w: Math.max(0, ...(e.sets || []).map(s => Number(s.weight) || 0))})).sort((a, b) => b.w - a.w)[0]; out.push(['last', `지난 ${md(last.date)} ${last.title || ''}${top?.w ? ` · ${top.n} ${top.w}kg` : ''}`]); }
  } else if (last?.moves?.length) {
    const on = last.moves.filter(m => m.on !== false);
    out.push(['last', `지난 ${md(last.date)} · ${on.slice(0, 3).map(m => m.name).join('·')}${on.length > 3 ? ` 외 ${on.length - 3}` : ''}`]);
  }
  const warns = [];
  for (const id of ids) { const m = data.clients.find(y => y.id === id); if (!m) continue;
    const inj = (m.injuries || []).filter(i => !i.date || daysBetween(i.date, today) <= 180).slice(-1)[0];
    const ls = sessionsOf(data, m.id)[0]; const pain = (ls?.condition?.[m.id]?.pain || []).filter(a => !String(inj?.text || '').includes(a)).join('·');
    const t = [inj?.text, pain && `지난번 ${pain} 불편`].filter(Boolean).join(' · '); if (t) warns.push(ids.length > 1 ? `${m.name}: ${t}` : t); }
  for (const w of warns) out.push(['warn', w]);
  return out;
}

// ---------- 할 일(회원당 한 줄, 가장 급한 이유) ----------
export function todos(data, now = new Date()) {
  const p = prefs2(data), today = ymd(now), wk = weekKey(today), out = [];
  const seen = new Set();
  const push = (c, kind, text, act, prio, extra = {}) => { if (seen.has(c.id) || p.snooze[c.id] === wk) return; seen.add(c.id); out.push({clientId: c.id, name: c.name, kind, text, act, prio, ...extra}); };
  const todayEnded = new Set(unprocessed(data, now).filter(x => String(x.startAt).slice(0, 10) === today).map(x => x.id));
  const old = unprocessed(data, now).filter(x => !todayEnded.has(x.id));
  const cands = [];
  for (const x of old) for (const id of x.clientIds || []) { const c = data.clients.find(y => y.id === id); if (c) cands.push([0, c, 'unproc', `${md(String(x.startAt).slice(0, 10))} 수업 끝내기 전`, 'finish', {scheduleId: x.id}]); }
  for (const x of data.schedules || []) if (x.reply?.state === 'change' && x.status === 'planned') for (const id of x.clientIds || []) { const c = data.clients.find(y => y.id === id); if (c) cands.push([1, c, 'change', `시간 변경 요청 · ${x.reply.wish || ''}`.trim(), 'reschedule', {scheduleId: x.id}]); }
  for (const c of data.clients) {
    if (c.stage === 'ended') continue;
    for (const ps of passesOf(c)) for (const e of ps.log || []) if (e.disputedAt && !e.resolvedAt) cands.push([0.5, c, 'dispute', `${e.reason} 차감에 이의`, 'pass', {}]);
    const pst = passState(c, today), pass = pst.pass, left = pass && pst.state !== 'expired' ? passLeft(pass) : null;
    if (c.stage === 'ot' || c.stage === 'consult') cands.push([2, c, 'stage', c.stage === 'ot' ? 'OT 뒤 상담 전' : `상담 보류${c.stageNote ? ` · ${c.stageNote}` : ''}`, 'open', {}]);
    else if (pst.state === 'expired') cands.push([2, c, 'left', `수강권 만료 · ${passLeft(pass)}회 남음`, 'report', {}]);
    else if (left !== null && left <= p.watch.left) cands.push([2, c, 'left', left === 0 ? '수강권 끝남' : `남은 ${left}회`, 'report', {}]);
    else if (pass?.expiresAt && daysBetween(today, pass.expiresAt) <= p.watch.expireDays) cands.push([3, c, 'expire', `${md(pass.expiresAt)} 만료`, 'report', {}]);
    const lastS = sessionsOf(data, c.id)[0], future = (data.schedules || []).some(x => x.status === 'planned' && (x.clientIds || []).includes(c.id) && String(x.startAt).slice(0, 10) >= today);
    if (c.stage !== 'ot' && c.stage !== 'consult' && !future && lastS && daysBetween(lastS.date, today) >= p.watch.idleDays) cands.push([4, c, 'idle', `${daysBetween(lastS.date, today)}일 수업 없음`, 'book', {}]);
    if (c.birthday) { const b = `${today.slice(0, 4)}-${c.birthday.slice(-5)}`, dd = daysBetween(today, b); if (dd >= 0 && dd <= 6) cands.push([5, c, 'bday', dd === 0 ? '오늘 생일' : `${md(b)} 생일`, 'msg', {}]); }
  }
  cands.sort((a, b) => a[0] - b[0]);
  for (const [prio, c, kind, text, act, extra] of cands) push(c, kind, text, act, prio, extra);
  return out;
}
export function weekKey(date) { const d = at(date, '12:00'); const day = (d.getDay() + 6) % 7; d.setDate(d.getDate() - day); return ymd(d); }

// ---------- 마이로그 요약(연동·동의 범위 안) ----------
// 본 앱: links.shared.days[](회원 기기가 올림). 시제품: client.shared.days 샘플.
export const sharedDays = c => (c?.shared?.days || []).slice().sort((a, b) => String(b.date).localeCompare(String(a.date)));
export const hasNewLog = (c, today = ymd()) => sharedDays(c).some(d => d.date >= addDays(today, -1) && !(c.seenLog >= d.date));

// ---------- 변화 리포트 ----------
export function changeReport(data, c, {from = '', today = ymd()} = {}) {
  const ss = sessionsOf(data, c.id).slice().reverse();
  const start = from || ss[0]?.date || today;
  const inS = ss.filter(s => s.date >= start);
  const att = inS.filter(s => (s.targets || []).find(t => t.clientId === c.id)?.status === 'attended').length;
  const days = sharedDays(c).filter(d => d.date >= start);
  const body = (c.body || []).filter(b => b.date >= addDays(start, -14)).sort((a, b) => a.date.localeCompare(b.date));
  const first = body[0], last = body[body.length - 1];
  const lifts = {};
  for (const s of inS) for (const e of s.exercises || []) { const w = Math.max(0, ...(e.sets || []).map(x => Number(x.weight) || 0)); if (!w) continue; lifts[e.name] = lifts[e.name] || {first: w, last: w}; lifts[e.name].last = w; }
  const pains = inS.map(s => s.condition?.[c.id]?.pain || []).filter(p => p.length);
  return {start, attended: att, classes: inS.length, logDays: days.length, soloDays: days.filter(d => d.workout).length,
    body: first && last && first !== last ? {from: first, to: last} : (last ? {from: last, to: last} : null),
    lifts: Object.entries(lifts).filter(([, v]) => v.last !== v.first).slice(0, 3),
    moves: [...new Set(inS.flatMap(s => (s.moves || []).filter(m => m.on !== false).map(m => m.name)))].length,
    painFirst: pains[0] || [], painLast: pains[pains.length - 1] || [], quotes: (c.quotes || []).slice(-2)};
}

// ---------- 미리 채우기(수업 직후 바뀐 것만 고치게) ----------
export function prefillExercises(data, x) {
  const id = (x.clientIds || [])[0];
  if (x.plan?.items?.length) return x.plan.items.filter(i => i.kind !== '필라테스').map(i => ({name: i.name, kind: 'strength', sets: Array.from({length: Number(i.sets) || 3}, () => ({weight: Number(i.weight) || 0, unit: 'kg', reps: Number(i.reps) || 10}))}));
  const ss = sessionsOf(data, id).filter(s => s.exercises?.length);
  const same = ss.find(s => x.title && s.title === x.title) || ss[0];
  return (same?.exercises || []).map(e => ({...e, sets: (e.sets || []).map(s => ({...s}))}));
}
export function prefillMoves(data, x) {
  const ids = x.clientIds || [];
  const ss = (data.sessions || []).filter(s => !s.undone && s.moves?.length && s.placeId === x.placeId && (s.targets || []).some(t => ids.includes(t.clientId))).sort((a, b) => `${b.date}${b.time}`.localeCompare(`${a.date}${a.time}`));
  const brand = placeOf(data, x.placeId)?.apparatus?.brand;
  if (ss[0]) return {moves: ss[0].moves.map(m => ({...m, on: m.on !== false, obs: '', springs: normSprings(m.springs, brand)})), from: `지난 ${md(ss[0].date)}`, exceptions: {...(ss[0].exceptions || {})}};
  const c = data.clients.find(y => y.id === ids[0]);
  const t = (data.templates || []).find(t => c?.level && t.title.startsWith(c.level)) || (data.templates || [])[0];
  return t ? {moves: t.moves.map(m => ({...m, on: true, obs: '', springs: normSprings(m.springs, brand)})), from: t.title, exceptions: {}} : {moves: [], from: '', exceptions: {}};
}
export const exSummary = ex => `${ex.length}종목 · ${ex.reduce((s, e) => s + (e.sets || []).length, 0)}세트`;
export const springText = (springs, brand) => { const ns = normSprings(springs, brand); if (brand === '그라츠') return ns[0] ? `${ns[0].n}개` : '—'; const sp = springsOf(brand); return ns.filter(s => s.n).map(s => `${sp.find(y => y.id === s.id).name.slice(0, 1)}${s.n}`).join(' ') || '—'; };

// ---------- 본 앱 연결(클라우드) ----------
// 회원 회신(sessionAcks)을 v2 수업에 반영: 차감은 끝내기 때 이미 했으므로 '확인' 또는 '이의'만 표시한다.
export function applyAcks2(data, acks = []) {
  let changed = false;
  let clients = data.clients;
  const sessions = (data.sessions || []).map(s => {
    if (!s.v2) return s;
    const targets = (s.targets || []).map(t => {
      const c = clients.find(x => x.id === t.clientId);
      const a = acks.find(k => k.sessionId === s.id && c?.memberUid && k.memberUid === c.memberUid);
      if (!a) return t;
      const key = a.result === 'rejected' ? 'disputedAt' : 'confirmedAt';
      if (t[key]) return t;
      changed = true;
      const when = a.createdAt || new Date().toISOString();
      if (key === 'disputedAt') clients = clients.map(x => x.id !== c.id ? x : {...x, passes: passesOf(x).map(p => ({...p, log: (p.log || []).map(e => e.sessionId === s.id ? {...e, disputedAt: when} : e)}))});
      return {...t, [key]: when, ackResult: a.result, edits: a.edits || ''};
    });
    return {...s, targets};
  });
  return {changed, clients, sessions};
}
// 연동 문서(links.pt)에 올릴 수강권 요약: 회원 화면은 이것만 본다. 금액·규정 원문은 올리지 않는다.
// 2026-11-28 대표님 검수: 센터 장부면 공식 숫자는 센터 프로그램에 있어 코치 개인 기록을 회원에게 '남은 회차'로 보내지 않는다(숫자가 달라질 위험)
export const showLeftOf = pl => !pl || (pl.ledger !== 'center' && pl.showLeft !== false);
export function linkPassSummary(data, c, today = ymd()) {
  const pl = placeOf(data, c.placeId), ps = passesOf(c).filter(p => p.kind !== 'period' || !p.expiresAt || p.expiresAt >= addDays(today, -30));
  const act = activePass(c, '', today);
  const passes = ps.map(p => ({name: p.name, total: Number(p.total) || 0, left: passLeft(p), start: p.start || '', expiresAt: p.expiresAt || '', log: (p.log || []).slice().sort((a, b) => String(b.at).localeCompare(String(a.at))).slice(0, 30).map(e => ({at: e.at || '', delta: Number(e.delta) || 0, reason: String(e.reason || ''), note: String(e.note || '').slice(0, 60), sessionId: e.sessionId || ''}))}));
  return {v2: true, showLeft: showLeftOf(pl), ledger: pl?.ledger || 'mine', passes, total: act ? Number(act.total) || 0 : 0, used: act ? (Number(act.total) || 0) - passLeft(act) : 0, name: act?.name || '', expiresAt: act?.expiresAt || ''};
}
// 회원에게 보낼 수업 기록(예전 sessionDraft 모양으로)
export function sessionForMember(data, s, target) {
  const on = (s.moves || []).filter(m => m.on !== false);
  const exercises = s.exercises?.length ? s.exercises : on.length ? [{name: s.title || '필라테스', kind: 'cardio', part: '필라테스', durationMin: 50, moves: on.map(m => ({name: m.name, apparatus: m.apparatus || '리포머', springs: [], reps: m.reps || '', cue: ''}))}] : [];
  return {id: s.id, date: s.date, time: s.time || '', title: s.title || '', place: placeOf(data, s.placeId)?.name || '', memberNote: target.note || '', exercises, ptOff: target.deducted ? [] : [target.clientId]};
}
