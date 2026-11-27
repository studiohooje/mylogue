import {partOf} from './body-part.js';
import {passOf, passLeft, passCardHTML, passFormHTML, holdFormHTML, ledgerHTML, reportOf, reportHTML} from './coach-pass.js';
import {planSheetHTML, prefsOf, planVisible, memberPlanHTML, weekDone} from './coach-plan.js';
import {dietSummary, dietKcal} from './coach-diet.js';
// 4.0.0 코치 모드(대표님 결정: 이름 '코치 모드', 지금은 마스터 계정만 보이고 다른 계정에는 흔적도 없게).
// 설계: docs/plans/2026-11-21_강사버전_설계.md
// 코치 쪽 데이터(회원·템플릿·보낸 수업·그룹·예약·알림 설정)는 코치 본인 settings 키로 저장해 기존 동기화를 그대로 탄다.
// 계정 사이 데이터(초대·연동·수업 초안·회신)는 coach-cloud.js가 Firestore로 주고받는다.
import {isAdminUser} from './admin.js';
import {cloudState} from './cloud-sync.js';
import {cleanMoves, movesForMember, movesSummary, pilatesRowHTML, moveNamesDatalist, readMoves, lastMove, briefingHTML, assessmentHTML} from './pilates.js';

const esc = v => String(v??'').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const pad = n => String(n).padStart(2, '0');
const ymd = d => `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
const md = s => String(s||'').slice(5).replace('-', '/');
export const cid = (p='c') => `${p}${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
export const SEATS_FREE = 10;
export const PUSH_KEYS = [['sessions','코치 수업 도착'], ['schedule','수업 예약 알림(하루 전·1시간 전)'], ['planned','예정 기록 확정 알림'], ['inbox','AI 검토함'], ['acks','회원 확정·고침·거절(코치)']];
export const COACH_PAGES = ['coach-clients','coach-dash','coach-schedule','coach-send','coach-templates'];

// 지금은 마스터 계정만. 로컬 개발 화면 확인용(localhost + ?coach=demo)만 예외 — 배포 주소에서는 동작하지 않는다.
export function coachDemo(){ try{ return ['localhost','127.0.0.1'].includes(location.hostname) && new URLSearchParams(location.search).get('coach')==='demo'; }catch{ return false; } }
// 5.0.2 관리자가 코치 권한을 준 계정도(cloudState.coach)
export const coachAllowed = user => isAdminUser(user) || coachDemo() || (!!user && cloudState.coach === true && cloudState.approval === 'approved');

// ---- 코치 데이터 ----
export function coachData(db={}){
 const s = db.settings||{};
 return {clients:s.coachClients||[], templates:s.coachTemplates||[], sessions:s.coachSessions||[], groups:s.coachGroups||[], schedules:s.coachSchedules||[], prefs:s.coachPrefs||{}, push:{sessions:true, schedule:true, planned:true, inbox:true, acks:true, quiet:true, quietStart:'23:00', quietEnd:'07:00', ...(s.pushPrefs||{})}, seen:s.coachSeen||{}};
}
export function withCoach(db, patch){
 const map = {prefs:'coachPrefs', clients:'coachClients', templates:'coachTemplates', sessions:'coachSessions', groups:'coachGroups', schedules:'coachSchedules', push:'pushPrefs', seen:'coachSeen'};
 const settings = {...db.settings};
 for(const [k, v] of Object.entries(patch)) settings[map[k]||k] = v;
 return {...db, settings};
}
export const ptLeft = c => c?.pt?.total ? Math.max(0, (Number(c.pt.total)||0) - (Number(c.pt.used)||0)) : null;
export function clientStatus(c, links=[]){
 const l = links.find(x => x.id===c.linkId || (x.clientId===c.id && x.trainerUid));
 if(l?.status==='active') return ['연동', 'ok'];
 if(l?.status==='ended') return ['끊김', 'bad'];
 if(c.inviteCode && c.inviteExpires && new Date(c.inviteExpires) > new Date()) return ['초대 대기', 'wait'];
 return ['미가입', 'info'];
}

// ---- 수업 ----
// 입력 줄 → 운동 종목. 근력: 이름·무게·횟수·세트 수 / 시간 종목: 이름·분·형태·메모
export function rowsToExercises(rows=[]){
 return rows.filter(r => String(r.name||'').trim()).map(r => {
  const name = String(r.name).trim();
  if(r.kind==='pilates'){ const moves = cleanMoves(r.moves); return {name, part:'필라테스', kind:'cardio', durationMin:Number(r.min)||null, distanceKm:null, sessionType:r.type||'', note:String(r.note||'').slice(0,300), effort:null, avgHr:null, sets:[], ...(moves.length?{moves}:{})}; }
  if(r.kind==='timed') return {name, kind:'cardio', durationMin:Number(r.min)||null, distanceKm:null, sessionType:r.type||'', note:String(r.note||'').slice(0,300), effort:null, avgHr:null, sets:[]};
  /* 5.4.0 실시간 입력에서 온 줄은 세트별 무게·횟수 그대로(무게·횟수·세트 수를 고치지 않았을 때) */
  if(r.exSets?.length && Number(r.weight)===Number(r.exSets[0].weight) && Number(r.reps)===Number(r.exSets[0].reps) && Number(r.sets)===r.exSets.length) return {name, kind:'strength', ...(r.part?{part:r.part}:{}), sets:r.exSets.map(x => ({...x}))};
  const n = Math.max(1, Math.min(20, Math.round(Number(r.sets)||1)));
  return {name, kind:'strength', sets:Array.from({length:n}, () => ({weight:Number(r.weight)||0, unit:'kg', reps:Math.max(0, Math.round(Number(r.reps)||0))}))};
 });
}
export function exercisesToRows(ex=[]){
 return ex.map(e => e.kind==='cardio' && (e.moves?.length || e.part==='필라테스') ? {kind:'pilates', name:e.name, min:e.durationMin??'', type:e.sessionType||'', note:e.note||'', moves:structuredClone(e.moves||[])} : e.kind==='cardio' ? {kind:'timed', name:e.name, min:e.durationMin??'', type:e.sessionType||'', note:e.note||''} : {kind:'strength', name:e.name, weight:e.sets?.[0]?.weight??'', reps:e.sets?.[0]?.reps??'', sets:(e.sets||[]).length||1});
}
export function sessionSummary(s){
 const ex = s.exercises||[], sets = ex.reduce((a, e) => a + (e.kind==='cardio' ? 0 : (e.sets||[]).length), 0), min = ex.reduce((a, e) => a + (e.kind==='cardio' ? Number(e.durationMin)||0 : 0), 0);
 const moves = ex.flatMap(e => e.moves||[]);
 return [s.title||'수업', ex.length ? `${ex.length}종목` : '', sets ? `${sets}세트` : '', moves.length ? movesSummary(moves) : '', min ? `${min}분` : ''].filter(Boolean).join(' · ');
}
export const emptySend = (date, clientIds=[]) => ({date, time:'', title:'', clientIds, rows:[{kind:'strength', name:'', weight:'', reps:'', sets:3}], memberNote:'', privateNote:'', ptOff:[], step:'edit', scheduleId:''});

// 회원에게 갈 초안(검토함 형식). 회원이 확정해야 회원 기록이 된다.
export function sessionDraft(session, client, {trainerUid, trainerName}){
 const at = session.time ? `${session.date}T${session.time}:00` : null;
 return {type:'workout', sourceModel:'trainer', originalUtterance:`${trainerName} 코치님이 보낸 수업`.slice(0,4000), parsedData:{date:session.date, ...(session.time?{loggedAtTime:session.time}:{}), title:session.title||'코치 수업', gymName:session.place||'', note:session.memberNote||'', exercises:(session.exercises||[]).map(e => e.moves?.length ? {...e, moves:movesForMember(e.moves)} : e)}, uncertainty:{}, evidence:{trainerUid, trainerName, sessionId:session.id, clientId:client.id, ptDeduct:!(session.ptOff||[]).includes(client.id), memberNote:session.memberNote||''}, at};
}

// 회원 회신(sessionAcks)을 코치 데이터에 반영: 상태 갱신, 확정·고침이면 PT 차감(한 번만)
export function applyAcks(data, acks=[]){
 let changed = false;
 const clients = data.clients.map(c => ({...c, pt:{...(c.pt||{})}}));
 const sessions = data.sessions.map(s => {
  const targets = (s.targets||[]).map(t => {
   const client = clients.find(c => c.id===t.clientId);
   const ack = acks.find(a => a.sessionId===s.id && client?.memberUid && a.memberUid===client.memberUid);
   if(s.v2) return t; // v2 수업은 끝내기 때 차감했고, 회신은 coach2-data applyAcks2가 확인·이의로만 표시한다
   if(!ack || t.status===ack.result) return t;
   changed = true;
   const nt = {...t, status:ack.result, edits:ack.edits||'', feedback:ack.feedback||null, ackAt:ack.createdAt||''};
   if(ack.result!=='rejected' && t.ptDeduct && !t.ptCounted && client?.pt?.total){ client.pt.used = (Number(client.pt.used)||0) + 1; nt.ptCounted = true; client.pt.log = [...(client.pt.log||[]), {at:new Date().toISOString(), date:s.date, kind:'session', delta:-1, note:s.title||'수업', coachAt:s.sentAt||s.createdAt||'', memberAt:ack.createdAt||'', edited:ack.result==='edited'}].slice(-60); }
   return nt;
  });
  return {...s, targets};
 });
 return {changed, clients, sessions};
}

// ---- 대시보드 수치 ----
export function dashboardFacts(data, {today, links=[]}={}){
 const d0 = new Date(`${today}T12:00:00`), weekAgo = new Date(d0); weekAgo.setDate(d0.getDate()-6); const w0 = ymd(weekAgo);
 const month = today.slice(0, 7);
 const todays = data.schedules.filter(x => x.status!=='canceled' && String(x.startAt||'').slice(0,10)===today).sort((a, b) => String(a.startAt).localeCompare(String(b.startAt)));
 const targets = data.sessions.flatMap(s => (s.targets||[]).map(t => ({s, t})));
 const waiting = targets.filter(x => x.t.status==='sent'), edited = targets.filter(x => x.t.status==='edited' && !x.t.seen), rejected = targets.filter(x => x.t.status==='rejected' && !x.t.seen), queued = targets.filter(x => x.t.status==='queued');
 const soon = data.clients.filter(c => { const left = ptLeft(c); const exp = c.pt?.expiresAt ? (new Date(c.pt.expiresAt) - d0)/86400000 : null; return (left!==null && left<=3) || (exp!==null && exp<=14 && exp>=0); });
 const ptMonth = targets.filter(x => x.t.ptCounted && String(x.s.date||'').startsWith(month)).length;
 const perClient = data.clients.map(c => {
  const mine = targets.filter(x => x.t.clientId===c.id && x.t.status!=='rejected');
  const recent = mine.filter(x => x.s.date>=w0 && x.s.date<=today).length;
  const four = new Date(d0); four.setDate(d0.getDate()-27); const f0 = ymd(four);
  const month4 = mine.filter(x => x.s.date>=f0 && x.s.date<=today).length;
  const booked = data.schedules.filter(x => (x.clientIds||[]).includes(c.id) && String(x.startAt||'').slice(0,10)>=f0 && String(x.startAt||'').slice(0,10)<=today && x.status!=='canceled').length;
  const fb = mine.map(x => x.t.feedback).filter(Boolean), eff = fb.map(f => Number(f.effort)).filter(Boolean);
  const pains = fb.flatMap(f => f.pain||[]), painTop = Object.entries(pains.reduce((a, p) => (a[p]=(a[p]||0)+1, a), {})).sort((a, b) => b[1]-a[1]).slice(0,2).map(x => x[0]);
  const parts = {}; for(const {s} of mine.filter(x => x.s.date>=f0)) for(const e of s.exercises||[]) if(e.kind!=='cardio') { const p = partOf(e) || '기타'; parts[p] = (parts[p]||0) + (e.sets||[]).length; }
  const link = links.find(l => l.id===c.linkId);
  return {c, week:recent, month4, attend:booked ? Math.round(Math.min(1, month4/booked)*100) : null, effort:eff.length ? Math.round(eff.reduce((a, b) => a+b, 0)/eff.length*10)/10 : null, painTop, parts, shared:link?.status==='active' ? (link.shared||null) : null, scope:link?.scope||null};
 });
 return {todays, waiting, edited, rejected, queued, soon, ptMonth, perClient};
}

// ---- 화면 조각 ----
/* 5.4.0 코치로그 1차(대표님 승인 목업): 메뉴 5칸 — 템플릿은 수업 화면 '불러오기'에서 */
export const coachNav = () => [['coach-clients','회원','mate'], ['coach-dash','대시보드','analysis'], ['coach-schedule','일정','calendar'], ['coach-send','수업','workout'], ['settings','설정','settings']];
export function coachToggleHTML(on){ return `<div class="coach-toggle" role="group" aria-label="모드 전환"><button type="button" class="${on?'':'active'}" data-coach-mode="off" aria-pressed="${!on}">마이로그</button><button type="button" class="${on?'active':''}" data-coach-mode="on" aria-pressed="${on}">코치로그</button></div>`; }

const badge = ([t, k]) => `<span class="status-badge ${k}">${esc(t)}</span>`;
const AVC = ['#8ce4e0','#f2a98a','#b8aaf2','#f2d36b','#7fe0b0','#9fd2ee','#d4a6dc','#ffb3a1'];
const avColor = id => AVC[[...String(id)].reduce((a, ch) => a + ch.charCodeAt(0), 0) % AVC.length];
const lastSessionOf = (data, c) => data.sessions.filter(s => (s.targets||[]).some(t => t.clientId===c.id)).sort((a, b) => String(b.date).localeCompare(String(a.date)))[0];
export function coachClientsHTML(data, {links=[], open='', today='', form=false, assess='', tab='', passEdit='', holdOpen='', report='', reportNote=''}={}){
 /* 5.4.0 A5: 회원을 누르면 목록 아래에 펼치지 않고 회원 전용 화면으로 */
 const oc = open && data.clients.find(c => c.id===open);
 if(oc) return clientDetailHTML(data, oc, {links, today, assess, tab, passEdit, holdOpen, report, reportNote});
 const list = data.clients.map(c => { const left = ptLeft(c), last = lastSessionOf(data, c); return `<button type="button" class="card coach-client cl-crow" data-coach-client="${esc(c.id)}"><span class="cl-av" style="background:${avColor(c.id)}">${esc(String(c.name||'회')[0])}</span><span class="cl-who"><b>${esc(c.name)} ${(c.kinds||[]).map(kindTag).join('')} ${badge(clientStatus(c, links))}</b><small>${last?`${esc(last.title||'수업')} · ${md(last.date)}`:'아직 수업 없음'}${(c.groups||[]).length?` · ${esc(c.groups.join(', '))}`:''}</small></span>${left!==null?`<span class="cl-pill${left<=3?' warn':' mint'}">PT ${left}/${c.pt.total} 남음</span>`:''}</button>`; }).join('');
 return `<div class="coach-head2"><div><h2>회원</h2><small>${data.clients.length}명</small></div></div>
 <section class="section"><div class="actions"><button type="button" class="button" data-coach-new="invite">＋ 앱 회원 초대</button><button type="button" class="button secondary" data-coach-new="offline">＋ 미가입 회원</button></div>${form?clientFormHTML(form):''}</section>
 <section class="section coach-list">${list||'<p class="hint">아직 회원이 없어요. 앱을 쓰는 회원은 초대하고, 앱이 없는 회원은 이름만 넣어 먼저 기록해 둘 수 있어요.</p>'}</section>`;
}
/* 5.4.2 코치 시트: 운동·식단 입력 창처럼 아래에서 올라오는 창(코치 색). 칩은 라디오·체크로 CSS만 바뀌어 적던 값이 날아가지 않는다 */
export const KINDS = [['웨이트','🏋'], ['필라테스','🧘'], ['요가','🌿'], ['기타','🏃']];
export const kindTag = k => `<span class="ck-tag ${k==='웨이트'?'w':k==='필라테스'?'p':k==='요가'?'y':'e'}">${esc(k)}</span>`;
export const sheetHTML = (title, inner) => `<div class="modal-backdrop quick-palette coach-sheet" data-coach-sheet-bg><div class="sheet" role="dialog" aria-modal="true" aria-label="${esc(title)}"><div class="sheet-head"><h2>${esc(title)}</h2><button type="button" class="close" data-coach-sheet-close aria-label="닫기">✕</button></div><div class="cs-body">${inner}</div></div></div>`;
const radio = (name, v, label, on) => `<label class="ck-chip"><input type="radio" name="${name}" value="${esc(v)}" ${on?'checked':''}><span>${label}</span></label>`;
const check = (name, v, label, on) => `<label class="ck-chip"><input type="checkbox" name="${name}" value="${esc(v)}" ${on?'checked':''}><span>${label}</span></label>`;
const segRadio = (name, opts, cur) => `<div class="ck-seg">${opts.map(([v, l]) => `<label><input type="radio" name="${name}" value="${esc(v)}" ${String(cur)===String(v)?'checked':''}><span>${l}</span></label>`).join('')}</div>`;
function clientFormHTML(kind){
 return sheetHTML('회원 등록', `<form id="coach-client-form" class="cs-form" data-kind="${esc(kind)}">
 <div class="cs-step"><b>어떻게 기록할까요?</b>${segRadio('mode', [['invite','앱 회원 초대'], ['offline','미가입 회원(이름만)']], kind==='offline'?'offline':'invite')}</div>
 <label class="cs-step"><b>이름</b><input name="name" required maxlength="40" placeholder="예: 최지훈" autocomplete="off"></label>
 <div class="cs-step"><b>수업 종류 <small>여러 개 골라도 돼요 · 수업 화면에서 자동으로 걸러져요</small></b><div class="ck-chips">${KINDS.map(([k, ic], i) => check('kinds', k, `${ic} ${k}`, i===0)).join('')}</div></div>
 <div class="cs-step"><b>목표 <small>선택</small></b><div class="ck-chips">${['다이어트','근비대','자세 교정','체력','재활 후 운동'].map(g => radio('goalPick', g, g, false)).join('')}</div><input name="goal" maxlength="120" placeholder="직접 적기 · 예: 데드리프트 100kg" autocomplete="off"></div>
 <label class="cs-step"><b>주의할 점 <small>선택 · 수업 화면 위에 늘 떠요</small></b><input name="cautions" maxlength="200" placeholder="예: 허리 디스크 이력" autocomplete="off"></label>
 <label class="ck-sw"><input type="checkbox" name="withPass" checked><span><b>수강권도 지금 만들기</b><small>끄면 나중에 회원 화면 › 수강권에서</small></span><i aria-hidden="true"></i></label>
 <button class="cs-go" type="submit">추가하기</button></form>`);
}
function inviteHTML(c){
 if(!c.inviteCode) return `<button type="button" class="button secondary small" data-coach-invite="${esc(c.id)}">초대 코드 만들기</button>`;
 const url = `https://mylogue.fit/?invite=${c.inviteCode}`;
 return `<div class="invite-box"><div><small>초대 코드 · ${c.inviteExpires?`${md(String(c.inviteExpires).slice(0,10))}까지`:'7일'}</small><b class="invite-code">${esc(c.inviteCode)}</b></div><div class="invite-qr" aria-label="초대 QR">${qrSVG(url)}</div><div class="actions"><button type="button" class="button secondary small" data-copy="${esc(url)}">링크 복사</button><button type="button" class="button secondary small" data-copy="${esc(c.inviteCode)}">코드 복사</button><button type="button" class="text-button" data-coach-invite="${esc(c.id)}">새로 만들기</button></div></div>`;
}
export function clientDetailHTML(data, c, {links=[], today='', assess='', tab='', passEdit='', holdOpen='', report='', reportNote=''}={}){
 if(!c) return '';
 const left = ptLeft(c), st = clientStatus(c, links), link = links.find(l => l.id===c.linkId), scope = link?.scope || {};
 const mine = data.sessions.filter(s => (s.targets||[]).some(t => t.clientId===c.id)).sort((a, b) => String(b.date).localeCompare(String(a.date)));
 const tLabel = {queued:['대기(미가입)','info'], sent:['확정 대기','wait'], confirmed:['확정','ok'], edited:['고친 뒤 확정','wait'], rejected:['거절','bad']};
 const fb = mine.map(s => (s.targets||[]).find(t => t.clientId===c.id)?.feedback).filter(f => f && (f.effort || f.pain?.length || f.note));
 const d14 = (() => { const d = new Date(`${today||new Date().toISOString().slice(0,10)}T12:00:00`); d.setDate(d.getDate()-14); return d.toISOString().slice(0,10); })();
 const recent = mine.filter(s => s.date >= d14).length;
 const lines = [];
 if(fb[0]) lines.push(`지난 수업 ${fb[0].effort?`강도 ${fb[0].effort}/10`:''}${fb[0].pain?.length?` · 불편: ${fb[0].pain.join(', ')}`:''}${fb[0].note?` · “${fb[0].note}”`:''}`);
 if(link?.shared?.weights?.length > 1 && scope.body){ const w = link.shared.weights; lines.push(`체중 ${w.at(-1)}kg (${w.at(-1)-w[0]>0?'+':''}${Math.round((w.at(-1)-w[0])*10)/10}kg)`); }
 if(link?.shared?.dietDays7 != null && scope.diet) lines.push(`식단 기록 최근 7일 중 ${link.shared.dietDays7}일`);
 const T = tab || 'sessions';
 const tabs = [['sessions','수업'], ['diet','식단'], ['routine','루틴'], ['body','몸'], ['pass','수강권']];
 let inner = '';
 const planned = (data.schedules||[]).filter(x => x.status==='planned' && (x.clientIds||[]).includes(c.id) && String(x.startAt).slice(0,10) >= (today||'')).sort((a, b) => String(a.startAt).localeCompare(String(b.startAt))).slice(0, 3);
 const plannedHTML = planned.map(x => `<div class="cd-row cp-row"><span>📅 ${md(String(x.startAt).slice(0,10))} ${esc(String(x.startAt).slice(11,16))} · ${esc(x.title||'수업')}${x.plan?.items?.length?` · 계획 ${x.plan.items.length}종목`:''}</span><button type="button" class="cl-ghost" data-coach-plan="sched:${esc(x.id)}">${x.plan?.items?.length?'계획 고치기':'계획 짜기'}</button></div>`).join('');
 if(T==='sessions') inner = `${plannedHTML}<div class="cd-hist">${mine.length?mine.slice(0,20).map(s => { const t = (s.targets||[]).find(x => x.clientId===c.id); return `<div class="cd-row"><span>${md(s.date)} · ${esc(sessionSummary(s))}</span>${badge(tLabel[t.status]||['—','info'])}${t.edits?`<em>${esc(t.edits)}</em>`:''}${c.memberUid?'':`<button type="button" class="text-button" data-copy="${esc(sessionText(s, c.name))}">글로 복사</button>`}</div>`; }).join(''):'<p class="hint">아직 보낸 수업이 없어요.</p>'}</div>${fb.length?`<div class="cd-fb"><small>회원 피드백</small>${fb.slice(0,5).map(f => `<p>${f.effort?`강도 ${f.effort}/10`:''}${f.pain?.length?` · 불편: ${esc(f.pain.join(', '))}`:''}${f.note?` · “${esc(f.note)}”`:''}</p>`).join('')}</div>`:''}${briefingHTML(data, c, {today})}`;
 if(T==='diet') inner = `<div class="cl-plan-h"><p class="hint" style="margin:0">'이렇게 먹어 보세요' 제안이에요. 회원 식사 창의 '코치 제안'에서 통째로 기록하거나 양을 고쳐서 써요.</p><button type="button" class="cl-go" data-coach-meal-new="${esc(c.id)}">＋ 식단 제안 만들기</button></div>${(c.mealPlans||[]).slice().reverse().map(p => planCardHTML(p, c)).join('')||'<p class="hint">아직 보낸 식단 제안이 없어요.</p>'}`;
 if(T==='routine'){ const log = link?.routineLog || {};
  inner = `<div class="cl-plan-h"><p class="hint" style="margin:0">수업 없는 날 혼자 할 운동이에요. 회원 운동 창 '도움받기 › 코치 루틴'으로 가요.</p><button type="button" class="cl-go" data-coach-routine-new="${esc(c.id)}">＋ 개인 운동 루틴 만들기</button></div>${(c.routines||[]).slice().reverse().map(r => { const wk = weekDone(log[r.id]||[], new Date(`${today||new Date().toISOString().slice(0,10)}T12:00:00`)), f = r.freq||2; return `<article class="cl-plan"><div class="cl-plan-t"><b>${esc(r.title||'루틴')} <small class="hint">주 ${f}회 · ${(r.items||[]).length}종목</small></b><span>${wk.length}/${f}</span></div><div class="cl-bar"><i style="width:${Math.min(100, Math.round(wk.length/f*100))}%"></i></div><p class="hint" style="margin:4px 0">${esc((r.items||[]).map(x => x.name).join(' · '))}</p>${(log[r.id]||[]).slice(-3).reverse().map(x => `<div class="cd-row"><span>✓ ${md(x.date)} · ${x.done}/${x.total}종목${x.note?` · “${esc(x.note)}”`:''}</span></div>`).join('')}<div class="cl-plan-a"><small>${md(String(r.createdAt||'').slice(0,10))} 보냄 · ${c.memberUid?'회원 기록으로 확인':'미가입 · 연동되면 보여요'}</small><button type="button" class="text-button" data-copy="${esc(`[${c.name} 님 개인 운동] ${r.title}\n${(r.items||[]).map((x, i) => `${i+1}. ${x.name}${x.weight?` ${x.weight}kg`:''}${x.reps?` × ${x.reps}`:''}${x.sets?` · ${x.sets}세트`:''}`).join('\n')}`)}">글로 복사</button></div></article>`; }).join('')||'<p class="hint">아직 보낸 루틴이 없어요.</p>'}`; }
 if(T==='body') inner = `${link?.status==='active'?`<div class="cd-scope"><small>회원이 동의한 범위</small><p>${[['sessions','보낸 수업'], ['workouts','따로 한 운동'], ['diet','식단'], ['body','수치']].map(([k, l]) => `<span class="scope-chip${scope[k]?' on':''}">${scope[k]?'✓':'—'} ${l}</span>`).join('')}</p>${link.shared?sharedHTML(link.shared, scope):''}<p class="hint">수업 밖 기록은 회원이 켤 때만 보여요. 회원에게 공유를 절대 강요해선 안 됩니다.</p></div>`:'<p class="hint">연동된 회원이 수치·식단 공유를 켜면 여기에 보여요.</p>'}${assessmentHTML(c, {open:assess===c.id})}`;
 /* 5.4.0 D7·A6·D9 수강권 카드 · 회차 장부 · 회차 리포트 */
 if(T==='pass'){ const pp = passOf(c);
  inner = report===c.id ? `${reportHTML(reportOf(data, c, link, today), reportNote)}<div class="cl-btns cl-btns2" style="margin-top:10px">${link?.status==='active'?`<button type="button" class="cl-go" data-coach-report-room="${esc(c.id)}">코치방으로 보내기</button>`:`<button type="button" class="cl-go" data-coach-report-copy="${esc(c.id)}">글로 복사</button>`}<button type="button" class="cl-ghost" data-coach-report-img="${esc(c.id)}">이미지로 저장</button></div><button type="button" class="text-button" data-coach-report="">‹ 수강권으로</button>`
   : `${passEdit===c.id?sheetHTML(`${pp?'수강권 고치기':'수강권 만들기'} · ${c.name}`, passFormHTML(c, {today, showPrice:data.prefs?.showPrice!==false})):''}${holdOpen===c.id&&pp?sheetHTML(`일시정지(홀딩) · ${c.name}`, holdFormHTML(c)):''}${pp?passCardHTML(pp, {who:'coach', clientId:c.id}):`<button type="button" class="cl-go" data-coach-pass-edit="${esc(c.id)}">＋ 수강권 만들기</button>`}${pp&&c.passPrice?`<p class="hint">결제 ${Number(c.passPrice).toLocaleString('ko-KR')}원 · 회당 ${pp.total?Math.round(c.passPrice/pp.total).toLocaleString('ko-KR'):'—'}원 <small>(코치님만 봐요)</small></p>`:''}
   <h3 class="cl-sub">회차 장부 <small>회원과 같은 장부</small></h3>${ledgerHTML(pp)}${pp?`<button type="button" class="cl-ghost cl-addbook" data-coach-report="${esc(c.id)}">회차 리포트 만들기</button>`:''}`; }

 if(T==='memo') inner = `<form id="coach-kinds-form" class="cs-form" data-client="${esc(c.id)}"><div class="cs-step"><b>수업 종류 <small>여러 개 · 수업 화면에서 자동으로 걸러져요</small></b><div class="ck-chips">${KINDS.map(([k, ic]) => `<label class="ck-chip"><input type="checkbox" name="kinds" value="${esc(k)}" ${(c.kinds||[]).includes(k)?'checked':''}><span>${ic} ${esc(k)}</span></label>`).join('')}</div><button class="cl-ghost" type="submit">종류 저장</button></div></form><div class="cd-grid"><div><small>목표</small><p>${esc(c.goal||'—')}</p></div><div><small>주의사항</small><p>${esc(c.cautions||'—')}</p></div></div>${st[0]!=='연동'?inviteHTML(c):''}<div class="actions">${link?.status==='active'?`<button type="button" class="text-button danger" data-coach-unlink="${esc(link.id)}">연동 끊기</button>`:''}<button type="button" class="text-button" data-coach-remove="${esc(c.id)}">목록에서 빼기</button></div>`;
 return `<section class="coach-detail" id="coach-detail"><div class="coach-head2"><button type="button" class="cl-ib" data-coach-client="" aria-label="회원 목록으로">‹</button><div style="flex:1;min-width:0"><h2>${esc(c.name)} ${(c.kinds||[]).map(kindTag).join('')} ${badge(st)}</h2><small>${[c.goal&&`목표 ${c.goal}`, c.cautions&&`⚠ ${c.cautions}`].filter(Boolean).map(esc).join(' · ')||'목표·주의사항은 ⋯ 메모에서'}</small></div><button type="button" class="cl-ib" data-coach-ctab="memo" aria-label="메모·초대·종류">⋯</button></div>
 <section class="section card cl-card"><div class="cl-sum"><div><small>PT 남은</small><b>${left??'—'}${left!==null?`<span>/${c.pt.total}</span>`:''}</b></div><div><small>만료</small><b>${c.pt?.expiresAt?md(c.pt.expiresAt):'—'}</b></div><div><small>최근 2주</small><b>${recent}회</b></div></div>${lines.length?`<ul class="cl-lines">${lines.map(l => `<li>${esc(l)}</li>`).join('')}</ul>`:''}<div class="cl-btns cl-btns3"><button type="button" class="cl-go" data-coach-plan="client:${esc(c.id)}">수업 계획 짜기</button><button type="button" class="cl-ghost" data-coach-start-client="${esc(c.id)}">바로 수업 시작</button>${link?.status==='active'?`<button type="button" class="cl-ghost" data-coach-room="${esc(link.id)}">💬 코치방 열기</button>`:'<button type="button" class="cl-ghost" data-coach-ctab="memo">초대하기</button>'}</div></section>
 <div class="cl-tabs" role="tablist">${tabs.map(([k, l]) => `<button type="button" role="tab" aria-selected="${T===k}" class="${T===k?'on':''}" data-coach-ctab="${k}">${l}</button>`).join('')}</div>
 <section class="section card">${inner}</section></section>`;
}
/* 5.4.0 D18 미가입 회원: 수업 기록을 마이로그 모양 글로(카톡에 붙여 넣기) */
export const sessionText = (s, name='') => `[${name?`${name} 님 `:''}${md(s.date)} 수업] ${s.title||'수업'}\n${(s.exercises||[]).map(e => e.kind==='cardio' ? `· ${e.name}${e.durationMin?` ${e.durationMin}분`:''}` : `· ${e.name} ${(e.sets||[]).map(x => `${x.weight||0}×${x.reps||0}`).join(', ')}`).join('\n')}${s.memberNote?`\n코치 한마디: ${s.memberNote}`:''}\n— 마이로그 코치로그`;
/* 5.4.0 D15·D18 식단 제안 카드(미가입 회원은 글로 복사해 카톡으로) */
export const planText = (p, name='') => `[${name?`${name} 님 `:''}식단 제안] ${p.title||'식단'}\n${(p.items||[]).map(x => `· ${x.name} ${x.servingQty??''}${x.servingUnit||''}${x.calories!=null?` (${Math.round(x.calories)}kcal)`:''}`).join('\n')}\n합계 약 ${Math.round((p.items||[]).reduce((a, x) => a + (Number(x.calories)||0), 0))}kcal — 꼭 이대로가 아니어도 괜찮아요.`;
function planCardHTML(p, c){
 if(p.mode && p.mode!=='single') return `<article class="cl-plan"><div class="cl-plan-t"><b>${esc(p.title||'식단 제안')} <small class="hint">${p.mode==='day'?'하루 식단표':'끼니별 조합'}</small></b><span>${p.mode==='day'?`${Math.round(dietKcal(p)).toLocaleString('ko-KR')}kcal`:''}</span></div><p class="hint" style="margin:4px 0">${esc(dietSummary(p))}</p>${p.note?`<p class="mk-note">“${esc(p.note)}”</p>`:''}<div class="cl-plan-a"><small>${md(String(p.createdAt||'').slice(0,10))} · ${c.memberUid?(p.sentAt?'회원에게 보냄':'보내는 중'):'미가입'}</small><button type="button" class="text-button" data-coach-plan-del="${esc(c.id)}:${esc(p.id)}">지우기</button></div></article>`;
 const kcal = (p.items||[]).reduce((a, x) => a + (Number(x.calories)||0), 0);
 return `<article class="cl-plan"><div class="cl-plan-t"><b>${esc(p.title||'식단 제안')}</b><span>${Math.round(kcal).toLocaleString('ko-KR')}kcal</span></div><ul>${(p.items||[]).map(x => `<li><span>${esc(x.name)}</span><span>${esc(`${x.servingQty??''}${x.servingUnit||''}`)}</span></li>`).join('')}</ul><div class="cl-plan-a"><small>${md(String(p.createdAt||'').slice(0,10))} · ${c.memberUid?(p.sentAt?'회원에게 보냄':'보내는 중'):'미가입 · 글로 보내기'}</small><button type="button" class="text-button" data-copy="${esc(planText(p, c.name))}">글로 복사</button><button type="button" class="text-button" data-coach-plan-del="${esc(c.id)}:${esc(p.id)}">지우기</button></div></article>`;
}
function sharedHTML(sh, scope){
 const rows = [];
 if(scope.workouts && sh.workouts7!=null) rows.push(`수업 밖 운동 최근 7일 ${sh.workouts7}회`);
 if(scope.body && sh.weights?.length) rows.push(`체중 ${sh.weights.at(-1)}kg (${sh.weights.length>1?`${(sh.weights.at(-1)-sh.weights[0]>0?'+':'')}${Math.round((sh.weights.at(-1)-sh.weights[0])*10)/10}kg / 최근 기록`:'최근'})`);
 if(scope.diet && sh.dietDays7!=null) rows.push(`식단 기록 최근 7일 중 ${sh.dietDays7}일`);
 return rows.length ? `<ul class="cd-shared">${rows.map(r => `<li>${esc(r)} <span class="consent">회원 동의</span></li>`).join('')}</ul>` : '';
}

// 수업 입력
export function coachSendHTML(data, st, {links=[]}={}){
 const sel = new Set(st.clientIds||[]), clients = data.clients;
 const targets = clients.filter(c => sel.has(c.id));
 const tpls = [...data.templates].sort((a, b) => String(b.lastUsedAt||'').localeCompare(String(a.lastUsedAt||''))).filter(t => !t.clientId || sel.has(t.clientId)).slice(0, 8);
 const last = targets.length===1 ? data.sessions.filter(s => (s.targets||[]).some(t => t.clientId===targets[0].id)).sort((a, b) => String(b.date).localeCompare(String(a.date)))[0] : null;
 if(st.step==='confirm'){
  const ex = rowsToExercises(st.rows), s = {title:st.title, exercises:ex};
  return `<div class="page-head coach-head"><div><h2>보내기 확인</h2></div></div><section class="section card coach-confirm">${targets.map(c => { const off = (st.ptOff||[]).includes(c.id), left = ptLeft(c), linked = clientStatus(c, links)[0]==='연동'; return `<div class="cf-row"><p><b>${esc(c.name)}</b>님에게 ${md(st.date)} 수업(${esc(sessionSummary(s))})을 ${linked?'보낼까요?':'미리 기록해 둘까요? <small>(미가입 — 연동하면 한꺼번에 보내요)</small>'}</p>${off?'<p class="warn">⚠ 회차 차감이 꺼져 있어요. 이 수업은 PT 횟수에서 빠지지 않아요.</p>':left!==null?`<p class="hint">PT 1회 차감(남은 ${left}회 → ${Math.max(0, left-1)}회) · 회원이 확정하면 차감돼요</p>`:''}</div>`; }).join('')}<div class="actions"><button type="button" class="button" id="coach-send-go">보내기</button><button type="button" class="button secondary" data-coach-step="edit">고치기</button></div></section>`;
 }
 const one = targets.length===1 ? targets[0].id : '';
 const row = (r, i) => r.kind==='pilates' ? pilatesRowHTML(r, i, {lastOf:name => name ? lastMove(data.sessions, one, name) : null}) : r.kind==='timed'
  ? `<div class="cs-row timed" data-row="${i}"><input data-r="name" value="${esc(r.name)}" placeholder="수업·종목(예: 필라테스 리포머)" aria-label="종목"><input data-r="min" type="number" inputmode="numeric" min="0" value="${esc(r.min)}" placeholder="분" aria-label="분"><select data-r="type" aria-label="형태">${['','개인','듀엣','그룹'].map(t => `<option ${r.type===t?'selected':''} value="${t}">${t||'형태'}</option>`).join('')}</select><input data-r="note" value="${esc(r.note)}" placeholder="메모(기구·동작)" aria-label="메모"><button type="button" class="text-button" data-cs-del="${i}" aria-label="줄 지우기">×</button></div>`
  : `<div class="cs-row" data-row="${i}"><input data-r="name" value="${esc(r.name)}" placeholder="종목(예: 스쿼트)" aria-label="종목"><input data-r="weight" type="number" inputmode="decimal" min="0" step="0.5" value="${esc(r.weight)}" placeholder="kg" aria-label="무게"><input data-r="reps" type="number" inputmode="numeric" min="0" value="${esc(r.reps)}" placeholder="회" aria-label="횟수"><input data-r="sets" type="number" inputmode="numeric" min="1" max="20" value="${esc(r.sets)}" placeholder="세트" aria-label="세트 수"><button type="button" class="text-button" data-cs-del="${i}" aria-label="줄 지우기">×</button></div>`;
 return `<div class="coach-head2"><div><h2>수업 입력</h2><small>회원이 확정해야 회원 기록이 돼요.</small></div></div>
 <form id="coach-send-form" class="section coach-send">
 <div class="card"><h3>대상</h3>${clients.length?`<div class="chips">${clients.map(c => `<button type="button" class="chip${sel.has(c.id)?' active':''}" data-cs-client="${esc(c.id)}" aria-pressed="${sel.has(c.id)}">${esc(c.name)}</button>`).join('')}</div>${data.groups.length?`<div class="chips cs-groups"><small>그룹</small>${data.groups.map(g => `<button type="button" class="chip" data-cs-group="${esc(g.id)}">${esc(g.name)} ${g.clientIds.length}명</button>`).join('')}</div>`:''}${sel.size>1?`<button type="button" class="text-button" id="cs-save-group">이 회원들을 그룹으로 저장</button>`:''}`:'<p class="hint">먼저 ‘회원’에서 회원을 추가해 주세요.</p>'}</div>
 ${tpls.length||last?`<div class="card"><h3 class="cs-load-h">불러오기 <button type="button" class="text-button" data-page="coach-templates">템플릿 관리 ›</button></h3><div class="chips">${last?`<button type="button" class="chip" data-cs-load="session:${esc(last.id)}">지난 수업 · ${md(last.date)} ${esc(last.title||'')}</button>`:''}${tpls.map(t => `<button type="button" class="chip" data-cs-load="tpl:${esc(t.id)}">${t.clientId?'':'공용 · '}${esc(t.title)}</button>`).join('')}</div></div>`:''}
 <div class="card"><div class="grid2"><label class="field">날짜<input name="date" type="date" value="${esc(st.date)}"></label><label class="field">시각(선택)<input name="time" type="time" value="${esc(st.time)}"></label></div><label class="field">수업 이름<input name="title" value="${esc(st.title)}" maxlength="60" placeholder="예: 하체 PT, 리포머 그룹"></label>
 <div class="cs-rows">${(st.rows||[]).some(r => r.kind==='strength')?'<div class="cs-row cs-label" aria-hidden="true"><span>근력 종목</span><span>kg</span><span>회</span><span>세트</span><span></span></div>':''}${(st.rows||[]).map(row).join('')}</div>${moveNamesDatalist()}<div class="actions"><button type="button" class="button secondary small" data-cs-add="strength">＋ 근력 종목</button><button type="button" class="button secondary small" data-cs-add="pilates">＋ 필라테스 수업</button><button type="button" class="button secondary small" data-cs-add="timed">＋ 시간 종목(요가 등)</button></div></div>
 ${one?briefingHTML(data, targets[0], {today:st.date}):''}
 <div class="card"><label class="field">회원에게 보이는 코멘트<textarea name="memberNote" rows="2" maxlength="300" placeholder="예: 무릎 각도 신경 쓰기, 다음엔 5kg 올려요">${esc(st.memberNote)}</textarea></label><label class="field">나만 보는 메모<textarea name="privateNote" rows="2" maxlength="300">${esc(st.privateNote)}</textarea></label></div>
 ${targets.length?`<div class="card"><h3>PT 회차 차감</h3>${targets.map(c => { const on = !(st.ptOff||[]).includes(c.id); return `<label class="check-row"><input type="checkbox" data-cs-pt="${esc(c.id)}" ${on?'checked':''}> ${esc(c.name)} ${ptLeft(c)!==null?`<small>(남은 ${ptLeft(c)}회)</small>`:''}</label>`; }).join('')}<p class="hint">기본으로 켜져 있어요. 끄면 보내기 전에 한 번 더 알려 드려요.</p></div>`:''}
 <div class="actions"><button class="button" type="submit" ${targets.length?'':'disabled'}>보내기 전에 확인</button><button type="button" class="button secondary" id="cs-save-tpl">템플릿으로 저장</button><button type="button" class="button secondary" id="cs-send-routine" title="수업 없는 날 회원이 혼자 할 루틴으로 보내요">개인 운동 루틴으로 보내기</button></div></form>`;
}
export function readSendForm(form, st){
 if(!form) return st;
 const f = form.elements, rows = [...form.querySelectorAll('.cs-row:not(.cs-label)')].map(el => { const g = k => el.querySelector(`:scope > .pm-head [data-r="${k}"], :scope > [data-r="${k}"]`)?.value ?? ''; if(el.classList.contains('pilates')){ const prev = st.rows?.[Number(el.dataset.row)]; return {kind:'pilates', name:g('name'), min:g('min'), type:g('type'), note:g('note'), moves:readMoves(el, prev?.moves||[])}; } return el.classList.contains('timed') ? {kind:'timed', name:g('name'), min:g('min'), type:g('type'), note:g('note')} : {kind:'strength', name:g('name'), weight:g('weight'), reps:g('reps'), sets:g('sets')}; });
 rows.forEach((r, i) => { const pr = st.rows?.[i]; if(r.kind==='strength' && pr?.exSets) Object.assign(r, {exSets:pr.exSets, ...(pr.part?{part:pr.part}:{})}); });
 const ptOff = [...form.querySelectorAll('[data-cs-pt]')].filter(x => !x.checked).map(x => x.dataset.csPt);
 return {...st, date:f.date?.value||st.date, time:f.time?.value||'', title:f.title?.value||'', memberNote:f.memberNote?.value||'', privateNote:f.privateNote?.value||'', rows, ptOff};
}

// 대시보드
export function coachDashHTML(data, {today, links=[], warn=[]}={}){
 const f = dashboardFacts(data, {today, links});
 const warnHTML = warn.map(l => `<section class="section card coach-warn"><b>⚠ ${esc(l.memberName||'회원')}님과 연동됐어요</b><p>회원에게 수업 외 기록 공유를 <b>절대 강요해선 안 됩니다.</b> 회원은 언제든 공유를 끄거나 연동을 끊을 수 있어요.</p><button type="button" class="button small" data-coach-warned="${esc(l.id)}">확인했어요</button></section>`).join('');
 /* 5.4.0 A3: 회원이 없으면 0 칸 대신 '첫 회원 초대' 한 장 */
 if(!data.clients.length) return `<div class="coach-head2"><div><h2>대시보드</h2></div></div>${warnHTML}<section class="section card cl-empty"><div class="cl-big" aria-hidden="true">👋</div><h3>첫 회원을 초대해 볼까요?</h3><p>앱을 쓰는 회원은 코드·QR로 초대하고,<br>앱이 없는 회원은 이름만 넣어 먼저 기록해요.</p><div class="cl-btns"><button type="button" class="button" data-coach-new="invite">＋ 앱 회원 초대</button><button type="button" class="button secondary" data-coach-new="offline">미가입 회원으로 시작</button></div></section>`;/* 2026-11-27 대표님(목업 승인): 로고와 같은 '코치로그' 줄·아래 안내 뺌 */
 const dow = '일월화수목금토'[new Date(`${today}T12:00:00`).getDay()];
 const now = new Date().toTimeString().slice(0,5);
 const todayRow = x => { const t = String(x.startAt).slice(11,16), past = x.status==='planned' && t < now; return `<div class="cl-row"><span class="cl-time">${esc(t)}</span><div class="cl-who"><b>${esc(names(data, x.clientIds))}</b><small>${esc(x.title||'수업')}${x.clientIds?.length===1&&ptLeft(data.clients.find(c => c.id===x.clientIds[0]))!==null?` · PT 남은 ${ptLeft(data.clients.find(c => c.id===x.clientIds[0]))}회`:''}</small></div>${x.status==='done'?'<span class="cl-pill ok">✓ 출석</span>':x.status==='noshow'?'<span class="cl-pill warn">노쇼</span>':x.status==='canceled'?'<span class="cl-pill">취소</span>':past?attendHTML(x):`<button type="button" class="cl-go" data-coach-start="${esc(x.id)}">수업 시작</button>`}</div>`; };
 const todo = [[f.waiting.length,'회원 확정 기다림'],[f.edited.length+f.rejected.length,'회원이 고침·거절'],[f.soon.length,'재등록 상담 준비'],[f.queued.length,'미가입 회원 대기']].filter(([n]) => n);
 return `<div class="coach-head2"><div><h2>오늘</h2><small>${md(today)} (${dow}) · 수업 ${f.todays.length}개</small></div></div>${warnHTML}
 <section class="section card cl-card"><h3>오늘 수업 <small>지난 수업은 출석을 표시해요</small></h3>${f.todays.length?f.todays.map(todayRow).join(''):'<p class="hint">오늘 예약된 수업이 없어요. <button type="button" class="text-button" data-page="coach-schedule">일정에서 예약 ›</button></p>'}</section>
 ${todo.length?`<section class="section card cl-card"><h3>확인할 일</h3><div class="cl-alert">${todo.map(([n,l]) => `<div><b>${n}</b><small>${l}</small></div>`).join('')}</div>
 ${[...f.edited, ...f.rejected].map(({s, t}) => `<div class="cd-row"><span>${esc(names(data, [t.clientId]))} · ${md(s.date)} ${esc(s.title||'')}</span><span class="status-badge ${t.status==='rejected'?'bad':'wait'}">${t.status==='rejected'?'거절':'고침'}</span>${t.edits?`<em>${esc(t.edits)}</em>`:''}<button type="button" class="text-button" data-coach-seen="${esc(s.id)}:${esc(t.clientId)}">확인</button></div>`).join('')}
 ${f.queued.length?`<div class="cd-row"><span>미가입 회원에게 쌓인 수업 ${f.queued.length}개 · 초대를 수락하면 보낼 수 있어요</span><button type="button" class="button secondary small" id="coach-flush">한꺼번에 보내기</button></div>`:''}</section>`:''}
 ${f.soon.length?`<section class="section card cl-card"><h3>재등록 신호 <small>코치에게만 보여요</small></h3>${f.soon.map(c => `<div class="cl-row"><span class="cl-av" style="background:#b8aaf2">${esc(String(c.name||'회')[0])}</span><div class="cl-who"><b>${esc(c.name)}</b><small>남은 ${ptLeft(c)??'—'}회${c.pt?.expiresAt?` · ${md(c.pt.expiresAt)} 만료`:''}</small></div><button type="button" class="cl-ghost" data-coach-report-open="${esc(c.id)}">리포트 만들기</button></div>`).join('')}</section>`:''}
 <section class="section"><h3 class="section-title">회원별 흐름</h3><div class="cdash-cards">${f.perClient.map(p => `<article class="card cdash-card"><b>${esc(p.c.name)}</b><div class="cdash-mini"><span>최근 7일 <b>${p.week}</b>회</span><span>4주 <b>${p.month4}</b>회</span>${p.attend!==null?`<span>출석률 <b>${p.attend}%</b></span>`:''}${p.effort!==null?`<span>강도 평균 <b>${p.effort}</b></span>`:''}</div>${Object.keys(p.parts).length?`<p class="cdash-parts">${Object.entries(p.parts).sort((a, b) => b[1]-a[1]).map(([k, v]) => `${esc(k)} ${v}`).join(' · ')} <small>세트(4주, 보낸 수업)</small></p>`:''}${p.painTop.length?`<p class="warn small">반복되는 불편: ${esc(p.painTop.join(', '))}</p>`:''}${p.shared?sharedHTML(p.shared, p.scope||{}):''}</article>`).join('')}</div></section>`;
}
/* 5.4.0 C3: 예약 시각이 지난 수업은 출석·노쇼·취소 한 번 탭 */
export const attendHTML = x => `<div class="cl-att3" role="group" aria-label="출석 표시"><button type="button" class="cl-go" data-coach-attend="${esc(x.id)}:done">출석</button><button type="button" class="cl-ghost" data-coach-attend="${esc(x.id)}:noshow">노쇼</button><button type="button" class="cl-ghost" data-coach-attend="${esc(x.id)}:canceled">취소</button></div>`;
const names = (data, ids=[]) => ids.map(id => data.clients.find(c => c.id===id)?.name || '회원').join(', ');

// 일정(주간 타임테이블 + 예약 추가)
export function coachScheduleHTML(data, {today, week=0, form=null, day=''}={}){
 /* 5.4.0 C1·C3: 요일 칩으로 하루를 골라 보고, 예약에서 바로 '수업 시작', 시각이 지나면 출석·노쇼·취소 */
 const d0 = new Date(`${today}T12:00:00`); d0.setDate(d0.getDate() + week*7); const mon = new Date(d0); mon.setDate(d0.getDate() - ((d0.getDay()+6)%7));
 const days = [...Array(7).keys()].map(i => { const d = new Date(mon); d.setDate(mon.getDate()+i); return ymd(d); });
 const items = k => data.schedules.filter(x => String(x.startAt||'').slice(0,10)===k).sort((a, b) => String(a.startAt).localeCompare(String(b.startAt)));
 const sel = days.includes(day) ? day : days.includes(today) ? today : days[0];
 const nowKey = `${today}T${new Date().toTimeString().slice(0,5)}`;
 const row = x => { const past = String(x.startAt) < nowKey; const one = (x.clientIds||[]).length===1 ? data.clients.find(c => c.id===x.clientIds[0]) : null;
  return `<div class="cl-row"><span class="cl-time">${esc(String(x.startAt).slice(11,16))}</span><div class="cl-who"><b>${esc(names(data, x.clientIds))}</b><small>${esc(x.title||'수업')} · ${x.durationMin||50}분${x.place?` · ${esc(x.place)}`:''}${one&&ptLeft(one)!==null?` · PT 남은 ${ptLeft(one)}회`:''}</small></div>${x.status==='done'?'<span class="cl-pill ok">✓ 출석</span>':x.status==='noshow'?'<span class="cl-pill warn">노쇼 · 1회 차감</span>':x.status==='canceled'?'<span class="cl-pill">취소</span>':past?attendHTML(x):`<button type="button" class="cl-ghost cp-plan-btn" data-coach-plan="sched:${esc(x.id)}">${x.plan?.items?.length?`📋 ${x.plan.items.length}종목`:'계획'}</button>${x.plan?.send==='manual'&&!x.plan?.sentAt&&x.plan?.items?.length?`<button type="button" class="cl-ghost" data-coach-plan-send="${esc(x.id)}">계획 보내기</button>`:''}<button type="button" class="cl-go" data-coach-start="${esc(x.id)}">수업 시작</button><button type="button" class="text-button" data-coach-cancel="${esc(x.id)}">취소</button>`}</div>`; };
 const list = items(sel);
 return `<div class="coach-head2"><div><h2>일정</h2><small>${md(days[0])} – ${md(days[6])}</small></div><div class="cl-wk"><button type="button" class="cl-ib" data-coach-week="-1" aria-label="이전 주">‹</button><button type="button" class="cl-ib" data-coach-week="1" aria-label="다음 주">›</button></div></div>
 <div class="cl-days" role="tablist">${days.map((k, i) => { const n = items(k).filter(x => x.status!=='canceled').length; return `<button type="button" role="tab" aria-selected="${k===sel}" class="${k===sel?'on':''}${k===today?' today':''}" data-coach-day="${k}"><small>${'월화수목금토일'[i]}</small><b>${Number(k.slice(8))}</b><i>${n?'•'.repeat(Math.min(3, n)):''}</i></button>`; }).join('')}</div>
 <section class="section card cl-card"><h3>${md(sel)} (${'일월화수목금토'[new Date(`${sel}T12:00:00`).getDay()]})${sel===today?' · 오늘':''} <small>${list.length}개</small></h3>${list.map(row).join('')||'<p class="hint">예약이 없어요.</p>'}<button type="button" class="cl-ghost cl-addbook" data-coach-book="${sel}">＋ 예약 추가</button></section>
 <p class="hint">노쇼는 회원별 1회 차감하고 회차 기록에 사유와 함께 남아요. 출석·취소는 차감하지 않아요(차감은 수업을 보낼 때).</p>
 ${form?`<form id="coach-book-form" class="section card coach-form"><h3>${md(form.date)} 수업 예약</h3><div class="chips">${data.clients.map(c => `<label class="chip-check"><input type="checkbox" name="client" value="${esc(c.id)}"> ${esc(c.name)}</label>`).join('')||'<p class="hint">먼저 회원을 추가해 주세요.</p>'}</div><input type="hidden" name="date" value="${esc(form.date)}"><div class="grid2"><label class="field">시각<input name="time" type="time" required value="19:00"></label><label class="field">시간(분)<input name="duration" type="number" min="10" max="240" value="50"></label></div><label class="field">수업 이름<input name="title" maxlength="60" placeholder="예: 하체 PT"></label><label class="field">장소(선택)<input name="place" maxlength="60"></label><label class="field">매주 반복(주)<input name="repeat" type="number" min="1" max="12" value="1"></label><div class="actions"><button class="button" type="submit">예약</button><button type="button" class="button secondary" data-coach-book="">닫기</button></div></form>`:''}`;
}

// 템플릿
export function coachTemplatesHTML(data){
 const list = [...data.templates].sort((a, b) => String(b.lastUsedAt||'').localeCompare(String(a.lastUsedAt||'')));
 return `<div class="coach-head2"><div><h2>템플릿</h2><small>자주 하는 수업을 저장해 두고 불러와요. 최근에 쓴 순서예요.</small></div></div><section class="section">${list.map(t => `<article class="card coach-tpl"><div><b>${esc(t.title)}</b><small>${t.clientId?`${esc(names(data, [t.clientId]))} 전용`:'공용'} · ${esc(sessionSummary({exercises:t.exercises}))}${t.lastUsedAt?` · 최근 ${md(String(t.lastUsedAt).slice(0,10))}`:''}</small></div><div class="actions"><button type="button" class="button small" data-coach-use-tpl="${esc(t.id)}">이걸로 수업 입력</button><button type="button" class="text-button" data-coach-dup-tpl="${esc(t.id)}">복제</button><button type="button" class="text-button" data-coach-del-tpl="${esc(t.id)}">삭제</button></div></article>`).join('')||'<p class="hint">수업 입력 화면에서 ‘템플릿으로 저장’을 누르면 여기에 모여요.</p>'}</section>`;
}

// 설정(코치 모드에서): 알림 설정 + 회원 한도
export function coachSettingsHTML(data){
 /* 5.4.2 대표님: 수업 계획 보내기 방식을 마음대로(매번 직접 · 하루 전 · N시간 전 · 안 보냄) */
 const p = prefsOf(data), seg = (name, opts, cur) => `<div class="ck-seg">${opts.map(([v, l]) => `<label><input type="radio" name="${name}" value="${esc(v)}" ${String(cur)===String(v)?'checked':''}><span>${l}</span></label>`).join('')}</div>`;
 const r = (name, v, l, on) => `<label class="ck-chip"><input type="radio" name="${name}" value="${esc(v)}" ${on?'checked':''}><span>${l}</span></label>`;
 return `<form id="coach-prefs-form" class="cs-form">
 <section class="section card cl-card"><h3>수업 계획 보내기 <small>수업마다 바꿀 수도 있어요</small></h3>${seg('planSend', [['manual','매번 직접'], ['dayBefore','하루 전'], ['hoursBefore','N시간 전'], ['none','안 보냄']], p.planSend)}
  <div class="cs-step"><b>하루 전 몇 시에</b><div class="ck-chips">${['18:00','20:00','21:00'].map(t => r('planTime', t, t, p.planTime===t)).join('')}</div></div>
  <div class="cs-step"><b>N시간 전</b><div class="ck-chips">${[1,2,3,6,12].map(h => r('planHours', h, `${h}시간`, Number(p.planHours)===h)).join('')}</div></div></section>
 <section class="section card cl-card"><h3>전날 출석 확인</h3><label class="ck-sw"><input type="checkbox" name="attendAsk" ${p.attendAsk?'checked':''}><span><b>'갈게요 · 변경 · 못 가요' 묻기</b><small>회원 홈 '내 코치' 카드와 코치방에 떠요</small></span><i aria-hidden="true"></i></label></section>
 <section class="section card cl-card"><h3>수강권</h3><label class="ck-sw"><input type="checkbox" name="showPrice" ${p.showPrice?'checked':''}><span><b>결제 금액 칸 보이기</b><small>코치님만 봐요</small></span><i aria-hidden="true"></i></label></section>
 <section class="section card cl-card"><h3>자주 쓰는 코멘트 <small>쉼표로 나눠요</small></h3><input name="quickNotes" value="${esc((p.quickNotes||[]).join(', '))}" autocomplete="off"></section>
 <section class="section card cl-card"><h3>알림</h3><p class="hint" style="margin:0">회원 확정·고침·예약은 앱 안 알림으로 보여 드려요. 휴대폰 푸시는 붙는 대로 여기서 켜고 끌 수 있어요. 회원 ${data.clients.length}명 관리 중 · 지금은 무료예요.</p></section>
 <button class="cs-go" type="submit">설정 저장</button></form>`;
}


// ---- 회원 쪽(지금은 마스터 계정만) ----
export function memberCoachHTML(links=[], {code='', agree=false, scope={}, busy=false, msg=''}={}){
 const mine = links.filter(l => l.memberMine);
 return `<section class="section card member-coach" id="my-coach"><h3>내 코치</h3>
 ${mine.filter(l => l.status==='active').map(l => `<div class="mc-link"><div class="mc-head"><b>${esc(l.trainerName||'코치')} 코치님</b><span class="status-badge ok">연동</span></div>${l.pt?.total?`<p class="hint">PT 남은 ${Math.max(0,(l.pt.total||0)-(l.pt.used||0))}회${l.pt.expiresAt?` · ${md(l.pt.expiresAt)} 만료`:''} (코치님이 관리)</p>`:''}<div class="mc-scope"><small>공유 범위</small><label class="check-row disabled"><input type="checkbox" checked disabled> 코치님이 보낸 수업(항상)</label>${[['workouts','내가 따로 한 운동'], ['diet','식단'], ['body','수치']].map(([k, t]) => `<label class="check-row"><input type="checkbox" data-mc-scope="${esc(l.id)}:${k}" ${l.scope?.[k]?'checked':''}> ${t}</label>`).join('')}</div>${(l.schedule||[]).length?`<div class="mc-sched"><small>예약된 수업</small>${l.schedule.slice(0,5).map(x => `<p>${md(String(x.startAt).slice(0,10))} ${esc(String(x.startAt).slice(11,16))} · ${esc(x.title||'수업')}</p>`).join('')}</div>`:''}<button type="button" class="text-button danger" data-mc-end="${esc(l.id)}">연동 끊기</button></div>`).join('')}
 <form id="member-coach-form" class="mc-join"><label class="field">초대 코드<input name="code" maxlength="8" autocapitalize="characters" autocomplete="off" placeholder="코치님께 받은 8자리" value="${esc(code)}"></label>
 <div class="mc-scope"><small>처음 공유 범위(모두 꺼 둬도 돼요)</small>${[['workouts','내가 따로 한 운동'], ['diet','식단'], ['body','수치']].map(([k, t]) => `<label class="check-row"><input type="checkbox" name="scope-${k}" ${scope[k]?'checked':''}> ${t}</label>`).join('')}</div>
 <div class="coach-warn member"><b>⚠ 꼭 읽어 주세요</b><p>코치님께 기록 공유를 강요받지 않아도 돼요. 수업 기록 외의 운동·식단·수치는 원할 때만 켜고, 언제든 끌 수 있어요.</p><label class="check-row"><input type="checkbox" name="agree" ${agree?'checked':''}> 이해했어요</label></div>
 <button class="button" type="submit" ${busy?'disabled':''}>${busy?'연결하는 중…':'코치와 연동하기'}</button>${msg?`<p class="ai-in-msg">${esc(msg)}</p>`:''}</form></section>`;
}
// 회원이 동의한 범위의 요약만 연동 문서에 올린다(코치는 회원 기록 원본을 읽지 않는다).
export function sharedSummary(db, scope={}, today){
 const d0 = new Date(`${today}T12:00:00`), w = new Date(d0); w.setDate(d0.getDate()-6); const w0 = ymd(w);
 const out = {updatedAt:new Date().toISOString()};
 if(scope.workouts) out.workouts7 = new Set((db.workouts||[]).filter(x => !x.planned && !x.rest && x.date>=w0 && x.date<=today && !String(x.sourceDraftId||'').startsWith('ai-t-')).map(x => x.date)).size;
 if(scope.body) out.weights = (db.body||[]).filter(b => Number(b.weight)>0).sort((a, b) => String(a.date).localeCompare(String(b.date))).slice(-8).map(b => Math.round(b.weight*10)/10);
 if(scope.diet) out.dietDays7 = new Set((db.meals||[]).filter(m => !m.planned && m.date>=w0 && m.date<=today).map(m => m.date)).size;
 /* 코치로그 v2: 날짜별 하루 요약(최대 28일, 동의한 범위만). 끼니 내용·사진은 올리지 않는다. */
 const d28 = new Date(d0); d28.setDate(d0.getDate()-27); const f0 = ymd(d28), days = {};
 const day = k => days[k] || (days[k] = {date:k});
 if(scope.body) for(const b of (db.body||[])) if(Number(b.weight)>0 && b.date>=f0 && b.date<=today) day(b.date).weight = Math.round(b.weight*10)/10;
 if(scope.diet) for(const m of (db.meals||[])) if(!m.planned && m.date>=f0 && m.date<=today){ const x = day(m.date); (x._g || (x._g = new Set())).add(m.mealGroupId || m.id); x.meals = x._g.size; const kc = Number(m.calories) || 0, pr = Number(m.protein) || 0; x.kcal = Math.round((x.kcal||0)+kc); x.protein = Math.round((x.protein||0)+pr); }
 if(scope.workouts) for(const w of (db.workouts||[])) if(!w.planned && !w.rest && w.date>=f0 && w.date<=today && !String(w.sourceDraftId||'').startsWith('ai-t-')) day(w.date).workout = `혼자 운동${w.title?` · ${String(w.title).slice(0,20)}`:''}`;
 for(const x of Object.values(days)) delete x._g;
 out.days = Object.values(days).sort((a, b) => String(b.date).localeCompare(String(a.date)));
 return out;
}

// 아주 작은 QR(초대 링크용). 외부 서비스로 보내지 않고 앱 안에서 그린다.
import {qrMatrix} from './qr.js';
export function qrSVG(text){
 try{ const m = qrMatrix(text), n = m.length, q = 2; let d = ''; m.forEach((row, y) => row.forEach((on, x) => { if(on) d += `M${x+q} ${y+q}h1v1h-1z`; })); return `<svg viewBox="0 0 ${n+q*2} ${n+q*2}" width="132" height="132" shape-rendering="crispEdges" role="img" aria-label="초대 QR 코드"><rect width="100%" height="100%" fill="#fff"/><path d="${d}" fill="#111"/></svg>`; }catch{ return ''; }
}

// 5.4.0 A9 회원 홈 '내 코치' 카드: 남은 회차 · 다음 수업(전날 출석 응답) · 확정 기다리는 수업
export function memberHomeCardHTML(links=[], {pending=0, now=new Date(), openPlan='', lastClass=null}={}){
 const mine = links.filter(l => l.memberMine && l.status==='active'); if(!mine.length) return '';
 const nowKey = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}T${now.toTimeString().slice(0,5)}`;
 const ans = {yes:'갈게요 ✓', change:'변경 요청함', no:'못 가요'};
 return mine.map(l => { const v2 = l.pt?.v2, show = !v2 || l.pt.showLeft !== false; const left = show && l.pt?.total ? Math.max(0, (l.pt.total||0)-(l.pt.used||0)) : null;
  /* 코치로그 v2: 수강권별 남은 회차와 내 장부(사유·날짜). 센터 장부 장소는 코치가 숨기면 안 보임 */
  const ledger = v2 && show && (l.pt.passes||[]).length ? `<details class="mh-ledger"><summary>내 장부${(l.pt.passes||[]).length>1?` · ${(l.pt.passes||[]).map(p => `${esc(p.name)} ${p.left}회`).join(' · ')}`:''}${l.pt.ledger==='center'?' · 코치 기록 기준':''}<i class="i-tip c2-tip" tabindex="0" title="차감이 이상하면 수업 기록에서 '이의'를 눌러 코치님께 알려요" style="margin-left:6px">i</i></summary>${(l.pt.passes||[]).flatMap(p => (p.log||[]).map(e => ({...e, pn:(l.pt.passes||[]).length>1?p.name:''}))).sort((a, b) => String(b.at).localeCompare(String(a.at))).slice(0, 20).map(e => `<div class="c2-lrow"><span>${e.at?md(String(e.at).slice(0,10)):''}</span><span>${esc(e.reason)}${e.pn?` · ${esc(e.pn)}`:''}${e.note?` · ${esc(e.note)}`:''}</span><b>${e.delta>0?`+${e.delta}`:e.delta<0?`−${-e.delta}`:'0'}</b></div>`).join('')}</details>` : '';
  const next = (l.schedule||[]).filter(x => x.status!=='canceled' && String(x.startAt) >= nowKey).sort((a, b) => String(a.startAt).localeCompare(String(b.startAt)))[0];
  const a = next ? l.attend?.[next.id] : '';
  return `<section class="section card cl-card mh-coach"><h3><span>🏋 ${esc(l.trainerName||'코치')} 코치${left!==null?` <span class="cl-pill">${esc(v2 && l.pt.name ? l.pt.name.replace(/\s*\d+회권$/, '') : 'PT')} ${left}회 남음</span>`:''}</span><button type="button" class="cl-ghost" data-coach-room="${esc(l.id)}">💬 코치방</button></h3>
  ${next?`<div class="cl-row"><span class="cl-time">${esc(String(next.startAt).slice(11,16))}</span><div class="cl-who"><b>${md(String(next.startAt).slice(0,10))} ${esc(next.title||'수업')}</b><small>${planVisible(next)?`코치님이 짠 ${next.plan.items.length}종목 · `:''}${a?esc(ans[a]||''):'갈 수 있는지 알려 주세요'}</small></div>${planVisible(next)?`<button type="button" class="cl-go" data-mc-plan="${esc(l.id)}:${esc(next.id)}">계획 보기</button>`:''}</div>${openPlan===`${l.id}:${next.id}`&&planVisible(next)?`<div class="mc-plan-open">${memberPlanHTML(next, {trainerName:l.trainerName})}</div>`:''}${a?'':`<div class="cl-att3 mh-att" role="group" aria-label="출석 응답"><button type="button" class="cl-go" data-mc-attend="${esc(l.id)}:${esc(next.id)}:yes">갈게요</button><button type="button" class="cl-ghost" data-mc-attend="${esc(l.id)}:${esc(next.id)}:change">변경 요청</button><button type="button" class="cl-ghost" data-mc-attend="${esc(l.id)}:${esc(next.id)}:no">못 가요</button></div>`}`:''}
  ${lastClass?`<div class="cl-row"><span class="cl-pill">지난 수업</span><div class="cl-who"><small>${md(lastClass.date)} ${esc(lastClass.title||'수업')} · ${(lastClass.exercises||[]).length}종목</small></div><button type="button" class="cl-ghost" data-mc-solo="${esc(lastClass.id)}">혼자 해 보기</button></div>`:''}
  ${pending?`<div class="cl-row"><span class="cl-pill warn">확정 전 ${pending}</span><div class="cl-who"><small>코치님이 보낸 수업 기록이 와 있어요</small></div><button type="button" class="cl-go" data-page="ai-inbox">보기</button></div>`:''}
  ${ledger}
  ${(l.mealPlans||[]).length||(l.routines||[]).length?`<p class="hint" style="margin:0">식단 제안 ${(l.mealPlans||[]).length}개 · 루틴 ${(l.routines||[]).length}개 — 식사·운동 창의 '도움받기'에서 써요.</p>`:''}</section>`; }).join('');
}
