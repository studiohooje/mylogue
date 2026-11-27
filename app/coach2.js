// 코치로그 v2 컨트롤러: 화면 상태·클릭·제출. coach-controller.js가 v2를 켜면 오늘·회원·일정·코치 설정을 여기로 넘긴다.
import * as D from './coach2-data.js';
import {todayHTML, clientsHTML, detailHTML, scheduleHTML, settingsHTML} from './coach2-ui.js';
import * as S from './coach2-sheets.js';
import {demoPT, demoPilates} from './coach2-demo.js';

export const V2_NAV = [['coach-dash', '오늘', 'home'], ['coach-clients', '회원', 'mate'], ['coach-schedule', '일정', 'calendar']];

export function createV2({data: rawData, put: rawPut, render, toast, setPage, getPage, demo, startLive, links = () => [], cloud = null, trainerName = () => '코치'}) {
  // 본 앱: 연동 문서(회원이 동의한 요약·출석 응답)를 화면용으로만 덧붙이고, 저장할 때는 떼어 낸다.
  const linkOf = c => c?.linkId ? links().find(l => l.id === c.linkId && l.status === 'active') || null : null;
  const ATT = {yes: 'yes', change: 'change', no: 'no'};
  function data() {
    const d = rawData(); if (demo()) return d;
    const ls = links(); if (!ls.length) return {...d, clients: d.clients.map(c => ({...c, linked: false}))};
    const clients = d.clients.map(c => { const l = linkOf(c); return l ? {...c, linked: true, shared: {scope: l.scope || {}, days: l.shared?.days || []}} : {...c, linked: false}; });
    const schedules = (d.schedules || []).map(x => { if (x.reply?.state) return x; for (const id of x.clientIds || []) { const l = linkOf(clients.find(c => c.id === id)); const v = l?.attend?.[x.id]; if (ATT[v]) return {...x, reply: {state: ATT[v], at: ''}}; } return x; });
    return {...d, clients, schedules};
  }
  const strip = ({linked, shared, ...c}) => c;
  const lastPt = new Map();
  function put(patch) {
    if (demo()) return rawPut(patch);
    rawPut(patch.clients ? {...patch, clients: patch.clients.map(strip)} : patch);
    if (!cloud) return;
    if (patch.clients) { const d = data(); for (const c of d.clients) { const l = linkOf(c); if (!l) continue; const pt = D.linkPassSummary(d, c); const key = JSON.stringify(pt); if (lastPt.get(l.id) === key) continue; lastPt.set(l.id, key); cloud.updateLink(l.id, {pt}).catch(() => {}); } }
    if (patch.schedules) Promise.resolve(cloud.syncSchedule?.()).catch(() => {});
  }
  const postTo = (c, txt) => { const l = linkOf(c); if (!l) return Promise.reject(Error('연동된 회원이 아니에요')); return cloud.postToRoom(l, txt); };
  const st = {open: '', tab: 'flow', filter: 'all', q: '', view: 'week', day: '', month: '', sheet: null, f: null, repNote: ''};
  const now = () => new Date();
  const today = () => D.ymd(now());
  const role = () => D.prefs2(data()).role;
  const seeded = () => !!data().prefs?.persona;
  function seed(r) {
    const s = (r === 'pilates' ? demoPilates : demoPT)(now());
    put({clients: s.clients, sessions: s.sessions, schedules: s.schedules, templates: s.templates, prefs: {...(data().prefs || {}), ...s.prefs}});
  }

  // ---------- 창 열기 ----------
  const sched = id => (data().schedules || []).find(x => x.id === id);
  function draftFrom(x) {
    const d = data(), f = {type: x.type || 'class', scheduleId: x.id, date: String(x.startAt).slice(0, 10), time: String(x.startAt).slice(11, 16), title: x.title || '', placeId: x.placeId || '', format: x.format || ((x.clientIds || []).length > 1 ? ((x.clientIds || []).length === 2 ? '듀엣' : '그룹') : '1:1'), clientIds: [...(x.clientIds || [])], statuses: {}, condition: {}, note: '', nextFocus: '', exceptions: {}, cancelReqAt: x.cancelReqAt || ''};
    if (role() === 'pilates') { const pm = D.prefillMoves(d, x); f.moves = pm.moves; f.from = pm.from; f.exceptions = {...(pm.exceptions || {})}; }
    else { f.exercises = D.prefillExercises(d, x); f.from = x.plan?.items?.length ? '수업 계획' : '지난 같은 수업'; }
    return f;
  }
  const open = (kind, extra = {}) => { st.sheet = {kind, ...extra}; render(); };
  const close = () => { st.sheet = null; render(); };
  function syncInputs() {
    if (!st.f) return;
    const g = id => document.getElementById(id);
    if (g('c2-note')) st.f.note = g('c2-note').value;
    if (g('c2-focus')) st.f.nextFocus = g('c2-focus').value;
    if (g('c2-memo')) st.f.memo = g('c2-memo').value;
    document.querySelectorAll('[data-c2-exc]').forEach(i => { st.f.exceptions[i.dataset.c2Exc] = i.value; });
    if (st.sheet?.kind === 'cond') for (const id of st.f.clientIds) { const v = document.querySelector(`input[name="feel-${id}"]:checked`)?.value; if (v) st.f.condition[id] = {...(st.f.condition[id] || {}), feel: v}; }
    const rn = g('c2-repnote'); if (rn) st.repNote = rn.value;
    const det = document.querySelector('.c2-more'); if (det) st.f.open = det.open;
  }

  // ---------- 화면 ----------
  function pageHTML(page) {
    if (demo() && !seeded()) seed('pt');
    const d = data(), n = now();
    let html = '';
    if (page === 'coach-clients') { const c = st.open && d.clients.find(x => x.id === st.open); html = c ? detailHTML(d, c, st, n) : clientsHTML(d, st, n); }
    else if (page === 'coach-schedule') html = scheduleHTML(d, st, n);
    else html = todayHTML(d, st, n);
    return html + sheetHTML();
  }
  function sheetHTML() {
    const s = st.sheet; if (!s) return '';
    const d = data(), n = now(), c = s.clientId ? d.clients.find(x => x.id === s.clientId) : null;
    if (s.kind === 'fin') return S.finishSheet(d, st.f, today());
    if (s.kind === 'rec') return role() === 'pilates' ? S.recordPilates(d, st.f) : S.recordPT(st.f);
    if (s.kind === 'cond') return S.condSheet(d, st.f, role());
    if (s.kind === 'slot') { const x = sched(s.id); return x ? S.slotSheet(d, x, n) : ''; }
    if (s.kind === 'book') return S.bookSheet(d, s, role());
    if (s.kind === 'client') return S.clientSheet(d, c, role());
    if (s.kind === 'pass' && c) return S.passSheet(d, c, s);
    if (s.kind === 'report' && c) return S.reportSheet(d, c, D.changeReport(d, c, {today: today()}), st, role());
    if (s.kind === 'react' && c) return S.reactSheet(d, c, s.date);
    if (s.kind === 'more' && c) return S.moreSheet(c);
    if (s.kind === 'preview' && c) return S.memberPreview(d, c, n);
    return '';
  }
  const settingsTop = () => settingsHTML(data());

  // ---------- 끝내기 ----------
  function done() {
    syncInputs();
    const d = data(), f = st.f; if (!f) return;
    const r = D.finishClass(d, {...f, note: f.note, nextFocus: f.nextFocus, condition: f.condition}, today());
    if (r.skipped) { toast('이미 끝낸 수업이에요.'); close(); return; }
    put({clients: r.data.clients, schedules: r.data.schedules, sessions: r.data.sessions});
    if (!demo() && cloud) { const s = r.data.sessions.find(x => x.id === r.sessionId), pl = D.placeOf(d, f.placeId);
      if (s && pl?.directMsg !== false) for (const t of s.targets.filter(t => t.status === 'attended')) { const cl = d.clients.find(x => x.id === t.clientId); if (!cl?.linked || !cl.memberUid) continue;
        cloud.sendSessionTo(D.sessionForMember(d, s, t), cl, {trainerName: trainerName()}).catch(e => toast(`${cl.name} 님에게 수업 기록을 보내지 못했어요: ${e.message || e}`)); } }
    const c = r.data.clients.find(x => x.id === f.clientIds[0]), p = c && D.activePass(c, f.format, today());
    const empty = f.clientIds.filter(id => { const cc = r.data.clients.find(x => x.id === id); return cc && f.type !== 'ot' && !D.activePass(cc, '', today()); }).length;
    st.f = null; st.sheet = null; toast(empty ? `끝냈어요 · 수강권이 끝난 회원 ${empty}명 — 새 수강권을 만들어 주세요` : '끝냈어요'); render();
  }

  // ---------- 클릭 ----------
  async function click(t) {
    const ds = t.dataset || {}, d = data();
    const has = k => ds[k] !== undefined;
    if (st.sheet) syncInputs();
    if (has('c2Close') || (has('c2Bg') && t.classList.contains('c2-sheet'))) { if (st.sheet?.kind === 'rec' && st.f) { st.sheet = {kind: 'fin'}; render(); return true; } close(); return true; }
    if (has('c2Start')) { const x = sched(ds.c2Start); if (!x) return true; st.f = draftFrom(x); open('cond'); return true; }
    if (has('c2Condok')) { st.f.condition = {}; open('rec'); return true; }
    if (has('c2Condgo')) { open('rec'); return true; }
    if (has('c2Pain')) { const [id, a] = ds.c2Pain.split(':'); const c = st.f.condition[id] || {}; const p = new Set(c.pain || []); p.has(a) ? p.delete(a) : p.add(a); st.f.condition[id] = {...c, pain: [...p]}; render(); return true; }
    if (has('c2Period')) { const id = ds.c2Period, c = st.f.condition[id] || {}; st.f.condition[id] = {...c, period: !c.period}; render(); return true; }
    if (has('c2Finish')) { const x = sched(ds.c2Finish); if (!x) return true; st.f = draftFrom(x); open('fin'); return true; }
    if (has('c2Record')) { open('rec'); return true; }
    if (has('c2Recdone')) { open('fin'); return true; }
    if (has('c2Live')) { const f = st.f; st.sheet = null; render(); startLive?.({clientIds: f.clientIds, names: f.clientIds.map(id => d.clients.find(c => c.id === id)?.name || ''), title: f.title, scheduleId: f.scheduleId, date: f.date, time: f.time}); return true; }
    if (has('c2Status')) { const [id, v] = ds.c2Status.split(':'); st.f.statuses[id] = v; render(); return true; }
    if (has('c2Cycle')) { const id = ds.c2Cycle, order = ['attended', 'noshow', 'late']; st.f.statuses[id] = order[(order.indexOf(st.f.statuses[id] || 'attended') + 1) % 3]; render(); return true; }
    if (has('c2Qn')) { st.f.note = [st.f.note, ds.c2Qn].filter(Boolean).join(' · '); st.f.open = true; render(); return true; }
    if (has('c2Nb')) { st.f.nextBook = st.f.nextBook?.date === ds.c2Nb ? null : {date: ds.c2Nb, time: st.f.time}; st.f.open = true; render(); return true; }
    if (has('c2Done')) { done(); return true; }
    if (has('c2Undo')) { const r = D.undoClass(d, ds.c2Undo); put({clients: r.clients, sessions: r.sessions, schedules: r.schedules}); st.sheet = null; toast('되돌렸어요. 장부에 되돌림 줄을 더했어요.'); render(); return true; }
    // 기록(PT)
    if (has('c2W')) { const [i, v] = ds.c2W.split(':'); const e = st.f.exercises[+i]; e.sets = e.sets.map(s => ({...s, weight: Math.max(0, Math.round(((Number(s.weight) || 0) + Number(v)) * 10) / 10)})); render(); return true; }
    if (has('c2S')) { const [i, v] = ds.c2S.split(':'); const e = st.f.exercises[+i]; if (+v > 0) e.sets.push({...(e.sets.at(-1) || {weight: 0, reps: 10, unit: 'kg'})}); else if (e.sets.length > 1) e.sets.pop(); render(); return true; }
    if (has('c2Rm')) { st.f.exercises.splice(+ds.c2Rm, 1); render(); return true; }
    if (has('c2Exadd')) { const n = document.getElementById('c2-exname')?.value.trim(); if (n) st.f.exercises.push({name: n, kind: 'strength', sets: [{weight: 0, unit: 'kg', reps: 10}, {weight: 0, unit: 'kg', reps: 10}, {weight: 0, unit: 'kg', reps: 10}]}); render(); return true; }
    // 레슨 노트(필라)
    if (has('c2Mv')) { const m = st.f.moves[+ds.c2Mv]; m.on = m.on === false; render(); return true; }
    if (has('c2Spedit')) { st.f.spEdit = st.f.spEdit === +ds.c2Spedit ? -1 : +ds.c2Spedit; render(); return true; }
    if (has('c2Sp')) { const [i, id, v] = ds.c2Sp.split(':'); const m = st.f.moves[+i]; const sp = [...(m.springs || [])]; const k = sp.findIndex(x => x.id === id); if (k < 0) sp.push({id, n: Math.max(0, +v)}); else sp[k] = {...sp[k], n: Math.max(0, sp[k].n + +v)}; m.springs = sp.filter(x => x.n > 0); render(); return true; }
    if (has('c2Obs')) { const m = st.f.moves[+ds.c2Obs], o = ['', '좋아짐', '어려워함', '불편감']; m.obs = o[(o.indexOf(m.obs || '') + 1) % o.length]; render(); return true; }
    if (has('c2Mvadd')) { const n = document.getElementById('c2-mvname')?.value.trim(); if (n) st.f.moves.push({name: n, apparatus: '리포머', springs: [], on: true, obs: ''}); render(); return true; }
    // 오늘·할 일
    if (has('c2Snooze')) { const p = d.prefs || {}; put({prefs: {...p, snooze: {...(p.snooze || {}), [ds.c2Snooze]: D.weekKey(today())}}}); toast('이번 주에는 숨겨요.'); render(); return true; }
    if (has('c2Todo')) { const [act, id, sid] = ds.c2Todo.split(':');
      if (act === 'finish' && sid) { st.f = draftFrom(sched(sid)); open('fin'); return true; }
      if (act === 'reschedule' && sid) { open('slot', {id: sid}); return true; }
      if (act === 'report') { st.repNote = ''; open('report', {clientId: id}); return true; }
      if (act === 'book') { open('book', {clientIds: [id], date: D.addDays(today(), 1), placeId: d.clients.find(c => c.id === id)?.placeId}); return true; }
      if (act === 'msg') { const c = d.clients.find(x => x.id === id); if (!c?.linked) { toast('마이로그 연동 전이라 카톡으로 축하해 주세요.'); return true; } open('react', {clientId: id, date: today()}); return true; }
      if (act === 'open') { open('client', {clientId: id}); return true; }
      st.open = id; st.tab = act === 'pass' ? 'pass' : 'flow'; setPage('coach-clients'); return true; }
    if (has('c2Slot')) { open('slot', {id: ds.c2Slot}); return true; }
    if (has('c2Book')) { const cidv = ds.c2Book; open('book', {clientIds: cidv ? [cidv] : [], date: ds.c2Date || st.day || today(), placeId: cidv ? d.clients.find(c => c.id === cidv)?.placeId : D.prefs2(d).places[0]?.id}); return true; }
    // 회원
    if (has('c2Open')) { st.open = ds.c2Open; st.tab = 'flow'; st.sheet = null; if (getPage() !== 'coach-clients') setPage('coach-clients'); else { render(); globalThis.scrollTo?.(0, 0); } return true; }
    if (has('c2Tab')) { st.tab = ds.c2Tab; st.more = false; render(); return true; }
    if (has('c2Moreflow')) { st.more = true; render(); return true; }
    if (has('c2Ledgerall')) { st.ledgerAll = true; render(); return true; }
    if (has('c2Tplundo')) { if (st.f?.undoMoves) { st.f.moves = st.f.undoMoves; st.f.undoMoves = null; render(); } return true; }
    if (has('c2Resolve')) { const [cId, pId, eId] = ds.c2Resolve.split(':'); put({clients: d.clients.map(c => c.id !== cId ? c : {...c, passes: D.passesOf(c).map(p => p.id !== pId ? p : {...p, log: p.log.map(e => e.id === eId ? {...e, resolvedAt: new Date().toISOString()} : e)})})}); toast('이의를 처리했어요. 차감을 바꾸려면 그 줄의 고치기를 눌러요.'); render(); return true; }
    if (has('c2Filter')) { st.filter = ds.c2Filter; render(); return true; }
    if (has('c2Newclient')) { open('client', {clientId: ''}); return true; }
    if (has('c2Editclient')) { open('client', {clientId: ds.c2Editclient}); return true; }
    if (has('c2More')) { open('more', {clientId: ds.c2More}); return true; }
    if (has('c2Preview')) { open('preview', {clientId: ds.c2Preview}); return true; }
    if (has('c2End')) { const id = ds.c2End; put({clients: d.clients.map(c => c.id === id ? {...c, stage: c.stage === 'ended' ? 'active' : 'ended'} : c)}); close(); return true; }
    if (has('c2Report')) { st.repNote = ''; open('report', {clientId: ds.c2Report}); return true; }
    if (has('c2Repsend')) { syncInputs(); if (!st.repNote.trim()) { toast('코치 코멘트를 먼저 써 주세요.'); return true; } const id = ds.c2Repsend; put({clients: d.clients.map(c => c.id === id ? {...c, reports: [...(c.reports || []), {date: today(), note: st.repNote}]} : c)}); const cc = d.clients.find(x => x.id === id), rr = D.changeReport(d, cc, {today: today()});
      if (!demo() && cloud) postTo(cc, `[${cc.name} 님 변화 리포트] ${D.md(rr.start)}부터\n출석 ${rr.attended}회${rr.body ? ` · 체중 ${rr.body.from.weight}→${rr.body.to.weight}kg` : ''}${rr.lifts.length ? ` · ${rr.lifts.map(([n, v]) => `${n} ${v.first}→${v.last}kg`).join(', ')}` : ''}\n${st.repNote}`.slice(0, 500)).then(() => toast('코치방으로 보냈어요.')).catch(e => toast(`보내지 못했어요: ${e.message || e}`));
      else toast('변화 리포트를 저장했어요.');
      close(); return true; }
    if (has('c2React')) { const [id, date] = ds.c2React.split(':'); open('react', {clientId: id, date}); return true; }
    if (has('c2Rq')) { const i = document.querySelector('#c2-react input[name=t]'); if (i) i.value = [i.value, ds.c2Rq].filter(Boolean).join(' · '); return true; }
    if (has('c2Fix')) { const [c, p, e] = ds.c2Fix.split(':'); open('pass', {sub: 'fix', clientId: c, passId: p, entryId: e}); return true; }
    if (has('c2Adjust')) { const [c, p] = ds.c2Adjust.split(':'); open('pass', {sub: 'adjust', clientId: c, passId: p}); return true; }
    if (has('c2Hold')) { const [c, p] = ds.c2Hold.split(':'); open('pass', {sub: 'hold', clientId: c, passId: p}); return true; }
    if (has('c2Newpass')) { open('pass', {sub: 'new', clientId: ds.c2Newpass}); return true; }
    // 회원 화면 미리보기에서 회원 쪽 동작 흉내
    if (has('c2Mreply')) { const [id, v] = ds.c2Mreply.split(':'); put({schedules: d.schedules.map(x => x.id === id ? {...x, reply: {state: v, at: new Date().toISOString(), wish: v === 'change' ? '다른 시간 원함' : ''}} : x)}); render(); return true; }
    if (has('c2Mconf') || has('c2Mdisp')) { const sid = ds.c2Mconf || ds.c2Mdisp, cId = st.sheet?.clientId, key = has('c2Mconf') ? 'confirmedAt' : 'disputedAt', ts = new Date().toISOString();
      put({sessions: d.sessions.map(s => s.id !== sid ? s : {...s, targets: s.targets.map(x => x.clientId === cId ? {...x, [key]: ts} : x)}), clients: d.clients.map(c => c.id !== cId ? c : {...c, passes: D.passesOf(c).map(p => ({...p, log: (p.log || []).map(e => e.sessionId === sid ? {...e, [key]: ts} : e)}))})});
      toast(key === 'disputedAt' ? '이의가 코치 할 일에 올라가요.' : '확인했어요.'); render(); return true; }
    // 일정
    if (has('c2View')) { st.view = ds.c2View; render(); return true; }
    if (has('c2Week')) { st.day = D.addDays(st.day || today(), 7 * +ds.c2Week); render(); return true; }
    if (has('c2Month')) { const m = D.at(`${(st.month || today()).slice(0, 7)}-01`, '12:00'); m.setMonth(m.getMonth() + +ds.c2Month); st.month = D.ymd(m); render(); return true; }
    if (has('c2Day')) { st.day = ds.c2Day; st.view = 'week'; render(); return true; }
    if (has('c2Move')) { const [id, to] = ds.c2Move.split('|'); put({schedules: d.schedules.map(x => x.id === id ? {...x, startAt: to, reply: null} : x)}); toast(`${D.md(to.slice(0, 10))} ${to.slice(11, 16)}로 옮겼어요.`); close(); return true; }
    if (has('c2Kakao')) { put({schedules: d.schedules.map(x => x.id === ds.c2Kakao ? {...x, reply: {state: 'kakao', at: new Date().toISOString()}} : x)}); render(); return true; }
    if (has('c2Cancel')) { const x = sched(ds.c2Cancel); if (!x) return true;
      if (x.type === 'block' || x.type === 'ot') { put({schedules: d.schedules.map(y => y.id === x.id ? {...y, status: 'canceled'} : y)}); close(); return true; }
      const c = d.clients.find(y => y.id === x.clientIds?.[0]), rule = D.ruleOf(d, c && D.activePass(c, x.format || '', today()), x.placeId);
      const late = (D.startOf(x) - now()) / 36e5 < rule.cutoffH;
      if (late) { st.f = {...draftFrom(x), cancelReqAt: `${today()}T${D.hm(now())}`}; for (const id of st.f.clientIds) st.f.statuses[id] = 'late'; open('fin'); toast(`취소 마감(${rule.cutoffH}시간) 안이라 늦은 취소로 끝내요. 규정에 따라 바꿀 수 있어요.`); return true; }
      put({schedules: d.schedules.map(y => y.id === x.id ? {...y, status: 'canceled', cancelReqAt: new Date().toISOString()} : y)}); toast('차감 없이 취소했어요.'); close(); return true; }
    // 설정
    if (has('c2Addplace')) { const p = d.prefs || {}; put({prefs: {...p, places: [...(p.places || []), {id: D.cid('pl'), name: '새 장소', ledger: 'mine', showLeft: true, directMsg: true, rule: {...D.DEFAULT_RULE}, apparatus: {brand: '밸런스드 바디'}}]}}); render(); return true; }
    if (has('c2Delplace')) { const p = d.prefs || {}; put({prefs: {...p, places: (p.places || []).filter((_, i) => i !== +ds.c2Delplace)}}); render(); return true; }
    if (has('c2Reseed')) { seed(role()); st.open = ''; toast('샘플을 다시 넣었어요.'); render(); return true; }
    return false;
  }

  // ---------- 입력·바꿈 ----------
  function input(t) {
    if (t?.matches?.('[data-c2-q]')) { st.q = t.value; const pos = t.selectionStart; render(); const n = document.querySelector('[data-c2-q]'); if (n) { n.focus(); try { n.setSelectionRange(pos, pos); } catch {} } return true; }
    if (t?.matches?.('[data-c2-tpl]') && t.value) { const tp = (data().templates || []).find(x => x.id === t.value); if (tp && st.f) { st.f.undoMoves = st.f.moves.map(m => ({...m})); const br = D.placeOf(data(), st.f.placeId)?.apparatus?.brand; st.f.moves = tp.moves.map(m => ({...m, on: true, obs: '', springs: D.normSprings(m.springs, br)})); st.f.from = tp.title; render(); } return true; }
    if (t?.matches?.('select[name="pl-brand"]')) { const box = t.closest('.c2-rule')?.querySelector('[data-c2-brandprev]'); if (box) box.innerHTML = D.springsOf(t.value).map(s => `<i style="background:${s.color}"></i>${s.name}`).join(' '); return true; }
    if (t?.matches?.('input[name="role"]') && demo()) { seed(t.value); st.open = ''; toast(t.value === 'pilates' ? '필라테스 강사 샘플로 바꿨어요.' : 'PT 트레이너 샘플로 바꿨어요.'); render(); return true; }
    return false;
  }

  // ---------- 제출 ----------
  function submit(form) {
    const d = data(), fd = new FormData(form), v = k => fd.get(k), sheetC = st.sheet?.clientId;
    if (form.id === 'c2-settings') {
      const places = [...form.querySelectorAll('.c2-place')].map((el, i) => { const old = D.prefs2(d).places[i] || {}; const q = n => el.querySelector(`[name="${n}"]`);
        return {...old, name: q('pl-name').value.trim() || old.name, ledger: el.querySelector(`input[name="pl-ledger-${i}"]:checked`)?.value || 'mine', showLeft: q('pl-showLeft').checked, directMsg: q('pl-directMsg').checked,
          rule: {...D.DEFAULT_RULE, ...(old.rule || {}), cutoffH: Number(q('pl-cutoff').value) || 0, late: q('pl-late').checked, noshow: q('pl-noshow').checked, ...(q('pl-duet') ? {duetAbsent: q('pl-duet').value} : {})},
          ...(q('pl-brand') ? {apparatus: {brand: q('pl-brand').value}} : {})}; });
      put({prefs: {...(d.prefs || {}), role: v('role') || 'pt', coachName: String(v('coachName') || ''), places, watch: {left: Number(v('w-left')), expireDays: Number(v('w-exp')), idleDays: Number(v('w-idle'))}, askDayBefore: !!v('ask'), quickNotes: String(v('quick') || '').split(',').map(s => s.trim()).filter(Boolean)}});
      toast('코치 설정을 저장했어요.'); render(); return true; }
    if (form.id === 'c2-book') {
      const type = v('type') || 'class', who = fd.getAll('who'), rep = fd.getAll('rep').map(Number), date = v('date'), time = v('time') || '19:00';
      if (type !== 'block' && !who.length) { toast('회원을 골라 주세요.'); return true; }
      const cPlace = d.clients.find(c => c.id === who[0])?.placeId || '';
      const base = {type, clientIds: type === 'block' ? [] : who, title: String(v('title') || (type === 'block' ? '막음' : type === 'ot' ? '체험 수업' : '')), durationMin: Number(v('dur')) || 50, placeId: v('place') || (type === 'block' ? '' : cPlace), format: v('format') || (who.length > 2 ? '그룹' : who.length === 2 ? '듀엣' : '1:1'), capacity: Number(v('cap')) || null, status: 'planned', repeat: rep.length ? {days: rep} : null};
      const dates = rep.length ? Array.from({length: 28}, (_, i) => D.addDays(date, i)).filter(x => rep.includes(D.at(x, '12:00').getDay())) : [date];
      const clash = dates.filter(x => (d.schedules || []).some(y => y.status === 'planned' && String(y.startAt) === `${x}T${time}` && (y.type === 'block' || (y.clientIds || []).some(id => who.includes(id)))));
      if (clash.length && !st.bookForce) { st.bookForce = true; toast(`${D.md(clash[0])} ${time}에 이미 예약·막음이 있어요. 그래도 넣으려면 한 번 더 눌러요.`); return true; }
      st.bookForce = false;
      const fut = rep.length ? dates.filter(x => `${x}T${time}` >= `${today()}T${D.hm(now())}`) : dates;
      put({schedules: [...(d.schedules || []), ...fut.map(x => ({...base, id: D.cid('b'), startAt: `${x}T${time}`}))]});
      toast(`${date}T${time}` < `${today()}T${D.hm(now())}` && !rep.length ? '지난 시각에 넣었어요 · 끝내기 전 수업으로 보여요' : rep.length ? `4주 동안 ${fut.length}번 예약했어요.` : '예약했어요.'); st.sheet = null; st.day = date; render(); return true; }
    if (form.id === 'c2-client') {
      const id = form.dataset.id, inj = String(v('injury') || '').trim();
      const patch = {name: String(v('name')).trim(), placeId: v('place'), goal: String(v('goal') || ''), birthday: v('birthday') || '', ...(v('stage') ? {stage: v('stage'), stageNote: String(v('stageNote') || '')} : {}), ...(v('level') ? {level: v('level')} : {}), ...(v('split') ? {program: {split: String(v('split')).split(/\s+/).filter(Boolean), week: 1}} : {}), ...(v('footbar') ? {setup: {footbar: v('footbar')}} : {})};
      if (id) { put({clients: d.clients.map(c => c.id !== id ? c : {...c, ...patch, injuries: inj ? [...(c.injuries || []), {date: today(), text: `${inj}(회원 진술)`}] : c.injuries})}); toast('저장했어요.'); }
      else { const total = Number(v('total')) || 0, months = Number(v('months')) || 3;
        const c = {id: D.cid('c'), stage: 'active', linked: false, ...patch, injuries: inj ? [{date: today(), text: `${inj}(회원 진술)`}] : [], passes: total ? [{id: D.cid('p'), name: `${role() === 'pt' ? 'PT' : ({'1:1': '개인', 듀엣: '듀엣', 그룹: '그룹'})[v('format') || '1:1']} ${total}회권`, kind: 'count', format: v('format') || '1:1', total, start: today(), expiresAt: D.addMonths(today(), months), price: Number(v('price')) || null, paidAt: today(), log: []}] : []};
        put({clients: [...d.clients, c]}); st.open = c.id; toast(`${c.name} 님을 추가했어요.`); }
      st.sheet = null; render(); return true; }
    if (form.id === 'c2-newpass') { const total = Number(v('total')) || 10, months = Number(v('months')) || 3; const fmt = v('format') || '1:1';
      const p = {id: D.cid('p'), name: `${role() === 'pt' ? 'PT' : ({'1:1': '개인', 듀엣: '듀엣', 그룹: '그룹'})[fmt]} ${total}회권`, kind: 'count', format: fmt, total, start: today(), expiresAt: D.addMonths(today(), months), price: Number(v('price')) || null, discount: Number(v('discount')) || null, paidAt: today(), ruleFrom: v('own') ? 'own' : 'place', log: []};
      put({clients: d.clients.map(c => c.id === sheetC ? {...c, passes: [...D.passesOf(c), p]} : c)}); toast('새 수강권을 만들었어요.'); st.sheet = null; render(); return true; }
    if (form.id === 'c2-fix') { const s = st.sheet, c = d.clients.find(x => x.id === s.clientId), e = D.passesOf(c).find(p => p.id === s.passId)?.log.find(x => x.id === s.entryId);
      if (!e) return true; put({clients: d.clients.map(x => x.id !== c.id ? x : D.addLog({...x, passes: D.passesOf(x)}, s.passId, {delta: -e.delta, reason: '고침', note: String(v('why') || ''), refId: e.id, sessionId: ''}))}); toast('고침 줄을 더했어요. 원래 줄은 남아요.'); st.sheet = null; render(); return true; }
    if (form.id === 'c2-adj') { const s = st.sheet, t = v('t'), delta = t === '조정-' ? -1 : 1, reason = t === '서비스' ? '서비스' : '조정';
      put({clients: d.clients.map(x => x.id !== s.clientId ? x : D.addLog({...x, passes: D.passesOf(x)}, s.passId, {delta, reason, note: String(v('why') || ''), sessionId: ''}))}); toast('장부에 더했어요.'); st.sheet = null; render(); return true; }
    if (form.id === 'c2-hold') { const s = st.sheet, days = Number(v('days')) || 7;
      put({clients: d.clients.map(x => x.id !== s.clientId ? x : D.addLog({...x, passes: D.passesOf(x).map(p => p.id !== s.passId ? p : {...p, expiresAt: p.expiresAt ? D.addDays(p.expiresAt, days) : p.expiresAt})}, s.passId, {delta: 0, reason: `홀딩 ${days}일`, sessionId: ''}))}); toast(`${days}일 홀딩했어요. 만료일이 늘었어요.`); st.sheet = null; render(); return true; }
    if (form.id === 'c2-react') { const id = form.dataset.c, date = form.dataset.d, txt = String(v('t') || '').trim(); if (!txt) return true;
      put({clients: d.clients.map(c => c.id === id ? {...c, reactions: {...(c.reactions || {}), [date]: txt}, seenLog: date} : c)}); const cc = d.clients.find(x => x.id === id);
      if (!demo() && cloud) postTo(cc, txt).then(() => toast('코치방으로 보냈어요.')).catch(e => toast(`보내지 못했어요: ${e.message || e}`)); else toast('보냈어요.');
      st.sheet = null; render(); return true; }
    return false;
  }

  // 수업 중 실시간 기록(기존 마이로그 입력)을 끝내면 끝내기 창으로
  function fromLive(v) {
    const x = sched(v.scheduleId) || {id: '', startAt: `${v.date}T${v.time || '19:00'}`, clientIds: v.clientIds, title: v.title};
    st.f = draftFrom(x);
    st.f.exercises = (v.rows || []).map(r => ({name: r.name, kind: 'strength', sets: r.exSets?.length ? r.exSets.map(s => ({...s})) : Array.from({length: Number(r.sets) || 1}, () => ({weight: Number(r.weight) || 0, unit: 'kg', reps: Number(r.reps) || 0}))}));
    st.f.note = v.memberNote || ''; st.sheet = {kind: 'fin'}; setPage('coach-dash');
  }
  return {pageHTML, settingsTop, click, input, submit, fromLive, get st() { return st; }};
}
