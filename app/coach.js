// 4.0.0 코치 모드(대표님 결정: 이름 '코치 모드', 지금은 마스터 계정만 보이고 다른 계정에는 흔적도 없게).
// 설계: docs/plans/2026-11-21_강사버전_설계.md
// 코치 쪽 데이터(회원·템플릿·보낸 수업·그룹·예약·알림 설정)는 코치 본인 settings 키로 저장해 기존 동기화를 그대로 탄다.
// 계정 사이 데이터(초대·연동·수업 초안·회신)는 coach-cloud.js가 Firestore로 주고받는다.
import {isAdminUser} from './admin.js';

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
export const coachAllowed = user => isAdminUser(user) || coachDemo();

// ---- 코치 데이터 ----
export function coachData(db={}){
 const s = db.settings||{};
 return {clients:s.coachClients||[], templates:s.coachTemplates||[], sessions:s.coachSessions||[], groups:s.coachGroups||[], schedules:s.coachSchedules||[], push:{sessions:true, schedule:true, planned:true, inbox:true, acks:true, quiet:true, quietStart:'23:00', quietEnd:'07:00', ...(s.pushPrefs||{})}, seen:s.coachSeen||{}};
}
export function withCoach(db, patch){
 const map = {clients:'coachClients', templates:'coachTemplates', sessions:'coachSessions', groups:'coachGroups', schedules:'coachSchedules', push:'pushPrefs', seen:'coachSeen'};
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
  if(r.kind==='timed') return {name, kind:'cardio', durationMin:Number(r.min)||null, distanceKm:null, sessionType:r.type||'', note:String(r.note||'').slice(0,300), effort:null, avgHr:null, sets:[]};
  const n = Math.max(1, Math.min(20, Math.round(Number(r.sets)||1)));
  return {name, kind:'strength', sets:Array.from({length:n}, () => ({weight:Number(r.weight)||0, unit:'kg', reps:Math.max(0, Math.round(Number(r.reps)||0))}))};
 });
}
export function exercisesToRows(ex=[]){
 return ex.map(e => e.kind==='cardio' ? {kind:'timed', name:e.name, min:e.durationMin??'', type:e.sessionType||'', note:e.note||''} : {kind:'strength', name:e.name, weight:e.sets?.[0]?.weight??'', reps:e.sets?.[0]?.reps??'', sets:(e.sets||[]).length||1});
}
export function sessionSummary(s){
 const ex = s.exercises||[], sets = ex.reduce((a, e) => a + (e.kind==='cardio' ? 0 : (e.sets||[]).length), 0), min = ex.reduce((a, e) => a + (e.kind==='cardio' ? Number(e.durationMin)||0 : 0), 0);
 return [s.title||'수업', ex.length ? `${ex.length}종목` : '', sets ? `${sets}세트` : '', min ? `${min}분` : ''].filter(Boolean).join(' · ');
}
export const emptySend = (date, clientIds=[]) => ({date, time:'', title:'', clientIds, rows:[{kind:'strength', name:'', weight:'', reps:'', sets:3}], memberNote:'', privateNote:'', ptOff:[], step:'edit', scheduleId:''});

// 회원에게 갈 초안(검토함 형식). 회원이 확정해야 회원 기록이 된다.
export function sessionDraft(session, client, {trainerUid, trainerName}){
 const at = session.time ? `${session.date}T${session.time}:00` : null;
 return {type:'workout', sourceModel:'trainer', originalUtterance:`${trainerName} 코치님이 보낸 수업`.slice(0,4000), parsedData:{date:session.date, ...(session.time?{loggedAtTime:session.time}:{}), title:session.title||'코치 수업', gymName:session.place||'', note:session.memberNote||'', exercises:session.exercises}, uncertainty:{}, evidence:{trainerUid, trainerName, sessionId:session.id, clientId:client.id, ptDeduct:!(session.ptOff||[]).includes(client.id), memberNote:session.memberNote||''}, at};
}

// 회원 회신(sessionAcks)을 코치 데이터에 반영: 상태 갱신, 확정·고침이면 PT 차감(한 번만)
export function applyAcks(data, acks=[]){
 let changed = false;
 const clients = data.clients.map(c => ({...c, pt:{...(c.pt||{})}}));
 const sessions = data.sessions.map(s => {
  const targets = (s.targets||[]).map(t => {
   const client = clients.find(c => c.id===t.clientId);
   const ack = acks.find(a => a.sessionId===s.id && client?.memberUid && a.memberUid===client.memberUid);
   if(!ack || t.status===ack.result) return t;
   changed = true;
   const nt = {...t, status:ack.result, edits:ack.edits||'', feedback:ack.feedback||null, ackAt:ack.createdAt||''};
   if(ack.result!=='rejected' && t.ptDeduct && !t.ptCounted && client?.pt?.total){ client.pt.used = (Number(client.pt.used)||0) + 1; nt.ptCounted = true; }
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
  const parts = {}; for(const {s} of mine.filter(x => x.s.date>=f0)) for(const e of s.exercises||[]) if(e.kind!=='cardio') parts[e.part||'기타'] = (parts[e.part||'기타']||0) + (e.sets||[]).length;
  const link = links.find(l => l.id===c.linkId);
  return {c, week:recent, month4, attend:booked ? Math.round(Math.min(1, month4/booked)*100) : null, effort:eff.length ? Math.round(eff.reduce((a, b) => a+b, 0)/eff.length*10)/10 : null, painTop, parts, shared:link?.status==='active' ? (link.shared||null) : null, scope:link?.scope||null};
 });
 return {todays, waiting, edited, rejected, queued, soon, ptMonth, perClient};
}

// ---- 화면 조각 ----
export const coachNav = () => [['coach-clients','회원','body'], ['coach-dash','대시보드','analysis'], ['coach-schedule','일정','calendar'], ['coach-send','수업 입력','add'], ['coach-templates','템플릿','workout'], ['settings','설정','settings']];
export function coachToggleHTML(on){ return `<div class="coach-toggle" role="group" aria-label="모드 전환"><button type="button" class="${on?'':'active'}" data-coach-mode="off" aria-pressed="${!on}">내 기록</button><button type="button" class="${on?'active':''}" data-coach-mode="on" aria-pressed="${on}">코치</button></div>`; }

const badge = ([t, k]) => `<span class="status-badge ${k}">${esc(t)}</span>`;
export function coachClientsHTML(data, {links=[], open='', today='', form=false}={}){
 const used = data.clients.length;
 const list = data.clients.map(c => { const left = ptLeft(c), last = data.sessions.filter(s => (s.targets||[]).some(t => t.clientId===c.id)).map(s => s.date).sort().at(-1); return `<button type="button" class="card coach-client" data-coach-client="${esc(c.id)}"><div class="cc-main"><b>${esc(c.name)}</b>${badge(clientStatus(c, links))}${(c.groups||[]).map(g => `<span class="cc-tag">${esc(g)}</span>`).join('')}</div><div class="cc-sub"><span>${last?`최근 수업 ${md(last)}`:'아직 수업 없음'}</span>${left!==null?`<span class="cc-pt${left<=3?' low':''}">PT 남은 ${left}회${c.pt?.expiresAt?` · ~${md(c.pt.expiresAt)}`:''}</span>`:''}</div></button>`; }).join('');
 return `<div class="page-head coach-head"><div><span class="eyebrow">Coach</span><h2>회원</h2><p>관리하는 회원을 모아 보고, 수업을 보내요. 회원 ${used}/${SEATS_FREE}명 · 무료</p></div></div>
 <section class="section"><div class="actions"><button type="button" class="button" data-coach-new="invite">＋ 앱 회원 초대</button><button type="button" class="button secondary" data-coach-new="offline">＋ 미가입 회원으로 기록 시작</button></div>${form?clientFormHTML(form):''}</section>
 <section class="section coach-list">${list||'<p class="hint">아직 회원이 없어요. 앱을 쓰는 회원은 초대하고, 앱이 없는 회원은 이름만 넣어 먼저 기록해 둘 수 있어요.</p>'}</section>
 ${open?clientDetailHTML(data, data.clients.find(c => c.id===open), {links, today}):''}`;
}
function clientFormHTML(kind){
 return `<form id="coach-client-form" class="card coach-form" data-kind="${esc(kind)}"><h3>${kind==='invite'?'앱 회원 초대':'미가입 회원'}</h3><label class="field">이름<input name="name" required maxlength="40" placeholder="예: 김회원"></label><label class="field">목표(선택)<input name="goal" maxlength="120" placeholder="예: 체지방 줄이기, 데드리프트 100kg"></label><label class="field">주의사항·부상(선택)<input name="cautions" maxlength="200" placeholder="예: 왼쪽 무릎 통증"></label><div class="grid2"><label class="field">PT 총 회차(선택)<input name="ptTotal" type="number" inputmode="numeric" min="0" max="500"></label><label class="field">만료일(선택)<input name="ptExpires" type="date" data-no-when></label></div><div class="actions"><button class="button" type="submit">${kind==='invite'?'추가하고 초대 코드 만들기':'추가'}</button><button type="button" class="button secondary" data-coach-new="">취소</button></div>${kind==='offline'?'<p class="hint">나중에 회원이 앱을 쓰게 되면 초대해서, 미리 기록한 수업을 한꺼번에 보낼 수 있어요.</p>':''}</form>`;
}
function inviteHTML(c){
 if(!c.inviteCode) return `<button type="button" class="button secondary small" data-coach-invite="${esc(c.id)}">초대 코드 만들기</button>`;
 const url = `https://studiohooje.github.io/mylogue/?invite=${c.inviteCode}`;
 return `<div class="invite-box"><div><small>초대 코드 · ${c.inviteExpires?`${md(String(c.inviteExpires).slice(0,10))}까지`:'7일'}</small><b class="invite-code">${esc(c.inviteCode)}</b></div><div class="invite-qr" aria-label="초대 QR">${qrSVG(url)}</div><div class="actions"><button type="button" class="button secondary small" data-copy="${esc(url)}">링크 복사</button><button type="button" class="button secondary small" data-copy="${esc(c.inviteCode)}">코드 복사</button><button type="button" class="text-button" data-coach-invite="${esc(c.id)}">새로 만들기</button></div></div>`;
}
export function clientDetailHTML(data, c, {links=[], today=''}={}){
 if(!c) return '';
 const left = ptLeft(c), st = clientStatus(c, links), link = links.find(l => l.id===c.linkId);
 const hist = data.sessions.filter(s => (s.targets||[]).some(t => t.clientId===c.id)).sort((a, b) => String(b.date).localeCompare(String(a.date))).slice(0, 12);
 const tLabel = {queued:['대기(미가입)','info'], sent:['확정 대기','wait'], confirmed:['확정','ok'], edited:['고친 뒤 확정','wait'], rejected:['거절','bad']};
 const fb = hist.map(s => (s.targets||[]).find(t => t.clientId===c.id)?.feedback).filter(f => f && (f.effort || f.pain?.length || f.note));
 const scope = link?.scope || {};
 return `<section class="section card coach-detail" id="coach-detail"><div class="cd-head"><h3>${esc(c.name)} ${badge(st)}</h3><button type="button" class="close" data-coach-client="" aria-label="닫기">×</button></div>
 <div class="cd-grid"><div><small>목표</small><p>${esc(c.goal||'—')}</p></div><div><small>주의사항</small><p>${esc(c.cautions||'—')}</p></div></div>
 <form id="coach-pt-form" class="cd-pt" data-client="${esc(c.id)}"><small>PT 회차</small><div class="cd-pt-row"><label>총<input name="total" type="number" min="0" max="500" value="${esc(c.pt?.total??'')}"></label><label>사용<input name="used" type="number" min="0" max="500" value="${esc(c.pt?.used??'')}"></label><label>만료<input name="expiresAt" type="date" data-no-when value="${esc(c.pt?.expiresAt||'')}"></label><button class="button small" type="submit">저장</button></div>${left!==null?`<p class="hint">남은 ${left}회</p>`:''}</form>
 ${st[0]!=='연동'?inviteHTML(c):''}
 ${link?.status==='active'?`<div class="cd-scope"><small>회원이 동의한 범위</small><p>${[['sessions','보낸 수업'], ['workouts','따로 한 운동'], ['diet','식단'], ['body','수치']].map(([k, l]) => `<span class="scope-chip${scope[k]?' on':''}">${scope[k]?'✓':'—'} ${l}</span>`).join('')}</p>${link.shared?sharedHTML(link.shared, scope):''}<p class="hint">수업 밖 기록은 회원이 켤 때만 보여요. 회원에게 공유를 절대 강요해선 안 됩니다.</p></div>`:''}
 <div class="cd-hist"><small>보낸 수업</small>${hist.length?hist.map(s => { const t = (s.targets||[]).find(x => x.clientId===c.id); return `<div class="cd-row"><span>${md(s.date)} · ${esc(sessionSummary(s))}</span>${badge(tLabel[t.status]||['—','info'])}${t.edits?`<em>${esc(t.edits)}</em>`:''}</div>`; }).join(''):'<p class="hint">아직 보낸 수업이 없어요.</p>'}</div>
 ${fb.length?`<div class="cd-fb"><small>회원 피드백</small>${fb.slice(0,5).map(f => `<p>${f.effort?`강도 ${f.effort}/10`:''}${f.pain?.length?` · 불편: ${esc(f.pain.join(', '))}`:''}${f.note?` · “${esc(f.note)}”`:''}</p>`).join('')}</div>`:''}
 <div class="actions"><button type="button" class="button" data-coach-send-to="${esc(c.id)}">이 회원에게 수업 입력</button>${link?.status==='active'?`<button type="button" class="text-button danger" data-coach-unlink="${esc(link.id)}">연동 끊기</button>`:''}<button type="button" class="text-button" data-coach-remove="${esc(c.id)}">목록에서 빼기</button></div></section>`;
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
  return `<div class="page-head coach-head"><div><span class="eyebrow">Coach</span><h2>보내기 확인</h2></div></div><section class="section card coach-confirm">${targets.map(c => { const off = (st.ptOff||[]).includes(c.id), left = ptLeft(c), linked = clientStatus(c, links)[0]==='연동'; return `<div class="cf-row"><p><b>${esc(c.name)}</b>님에게 ${md(st.date)} 수업(${esc(sessionSummary(s))})을 ${linked?'보낼까요?':'미리 기록해 둘까요? <small>(미가입 — 연동하면 한꺼번에 보내요)</small>'}</p>${off?'<p class="warn">⚠ 회차 차감이 꺼져 있어요. 이 수업은 PT 횟수에서 빠지지 않아요.</p>':left!==null?`<p class="hint">PT 1회 차감(남은 ${left}회 → ${Math.max(0, left-1)}회) · 회원이 확정하면 차감돼요</p>`:''}</div>`; }).join('')}<div class="actions"><button type="button" class="button" id="coach-send-go">보내기</button><button type="button" class="button secondary" data-coach-step="edit">고치기</button></div></section>`;
 }
 const row = (r, i) => r.kind==='timed'
  ? `<div class="cs-row timed" data-row="${i}"><input data-r="name" value="${esc(r.name)}" placeholder="수업·종목(예: 필라테스 리포머)" aria-label="종목"><input data-r="min" type="number" inputmode="numeric" min="0" value="${esc(r.min)}" placeholder="분" aria-label="분"><select data-r="type" aria-label="형태">${['','개인','듀엣','그룹'].map(t => `<option ${r.type===t?'selected':''} value="${t}">${t||'형태'}</option>`).join('')}</select><input data-r="note" value="${esc(r.note)}" placeholder="메모(기구·동작)" aria-label="메모"><button type="button" class="text-button" data-cs-del="${i}" aria-label="줄 지우기">×</button></div>`
  : `<div class="cs-row" data-row="${i}"><input data-r="name" value="${esc(r.name)}" placeholder="종목(예: 스쿼트)" aria-label="종목"><input data-r="weight" type="number" inputmode="decimal" min="0" step="0.5" value="${esc(r.weight)}" placeholder="kg" aria-label="무게"><input data-r="reps" type="number" inputmode="numeric" min="0" value="${esc(r.reps)}" placeholder="회" aria-label="횟수"><input data-r="sets" type="number" inputmode="numeric" min="1" max="20" value="${esc(r.sets)}" placeholder="세트" aria-label="세트 수"><button type="button" class="text-button" data-cs-del="${i}" aria-label="줄 지우기">×</button></div>`;
 return `<div class="page-head coach-head"><div><span class="eyebrow">Coach</span><h2>수업 입력</h2><p>회원이 확정해야 회원 기록이 돼요.</p></div></div>
 <form id="coach-send-form" class="section coach-send">
 <div class="card"><h3>대상</h3>${clients.length?`<div class="chips">${clients.map(c => `<button type="button" class="chip${sel.has(c.id)?' active':''}" data-cs-client="${esc(c.id)}" aria-pressed="${sel.has(c.id)}">${esc(c.name)}</button>`).join('')}</div>${data.groups.length?`<div class="chips cs-groups"><small>그룹</small>${data.groups.map(g => `<button type="button" class="chip" data-cs-group="${esc(g.id)}">${esc(g.name)} ${g.clientIds.length}명</button>`).join('')}</div>`:''}${sel.size>1?`<button type="button" class="text-button" id="cs-save-group">이 회원들을 그룹으로 저장</button>`:''}`:'<p class="hint">먼저 ‘회원’에서 회원을 추가해 주세요.</p>'}</div>
 ${tpls.length||last?`<div class="card"><h3>불러오기</h3><div class="chips">${last?`<button type="button" class="chip" data-cs-load="session:${esc(last.id)}">지난 수업 · ${md(last.date)} ${esc(last.title||'')}</button>`:''}${tpls.map(t => `<button type="button" class="chip" data-cs-load="tpl:${esc(t.id)}">${t.clientId?'':'공용 · '}${esc(t.title)}</button>`).join('')}</div></div>`:''}
 <div class="card"><div class="grid2"><label class="field">날짜<input name="date" type="date" value="${esc(st.date)}"></label><label class="field">시각(선택)<input name="time" type="time" value="${esc(st.time)}"></label></div><label class="field">수업 이름<input name="title" value="${esc(st.title)}" maxlength="60" placeholder="예: 하체 PT, 리포머 그룹"></label>
 <div class="cs-rows">${(st.rows||[]).some(r => r.kind!=='timed')?'<div class="cs-row cs-label" aria-hidden="true"><span>근력 종목</span><span>kg</span><span>회</span><span>세트</span><span></span></div>':''}${(st.rows||[]).map(row).join('')}</div><div class="actions"><button type="button" class="button secondary small" data-cs-add="strength">＋ 근력 종목</button><button type="button" class="button secondary small" data-cs-add="timed">＋ 시간 종목(필라테스·요가 등)</button></div></div>
 <div class="card"><label class="field">회원에게 보이는 코멘트<textarea name="memberNote" rows="2" maxlength="300" placeholder="예: 무릎 각도 신경 쓰기, 다음엔 5kg 올려요">${esc(st.memberNote)}</textarea></label><label class="field">나만 보는 메모<textarea name="privateNote" rows="2" maxlength="300">${esc(st.privateNote)}</textarea></label></div>
 ${targets.length?`<div class="card"><h3>PT 회차 차감</h3>${targets.map(c => { const on = !(st.ptOff||[]).includes(c.id); return `<label class="check-row"><input type="checkbox" data-cs-pt="${esc(c.id)}" ${on?'checked':''}> ${esc(c.name)} ${ptLeft(c)!==null?`<small>(남은 ${ptLeft(c)}회)</small>`:''}</label>`; }).join('')}<p class="hint">기본으로 켜져 있어요. 끄면 보내기 전에 한 번 더 알려 드려요.</p></div>`:''}
 <div class="actions"><button class="button" type="submit" ${targets.length?'':'disabled'}>보내기 전에 확인</button><button type="button" class="button secondary" id="cs-save-tpl">템플릿으로 저장</button></div></form>`;
}
export function readSendForm(form, st){
 if(!form) return st;
 const f = form.elements, rows = [...form.querySelectorAll('.cs-row')].map(el => { const g = k => el.querySelector(`[data-r="${k}"]`)?.value ?? ''; return el.classList.contains('timed') ? {kind:'timed', name:g('name'), min:g('min'), type:g('type'), note:g('note')} : {kind:'strength', name:g('name'), weight:g('weight'), reps:g('reps'), sets:g('sets')}; });
 const ptOff = [...form.querySelectorAll('[data-cs-pt]')].filter(x => !x.checked).map(x => x.dataset.csPt);
 return {...st, date:f.date?.value||st.date, time:f.time?.value||'', title:f.title?.value||'', memberNote:f.memberNote?.value||'', privateNote:f.privateNote?.value||'', rows, ptOff};
}

// 대시보드
export function coachDashHTML(data, {today, links=[], warn=[]}={}){
 const f = dashboardFacts(data, {today, links});
 const box = (t, n, k='') => `<div class="cdash-stat ${k}"><small>${t}</small><b>${n}</b></div>`;
 return `<div class="page-head coach-head"><div><span class="eyebrow">Coach</span><h2>대시보드</h2><p>오늘 할 일과 회원 흐름을 한눈에 봐요.</p></div></div>
 ${warn.map(l => `<section class="section card coach-warn"><b>⚠ ${esc(l.memberName||'회원')}님과 연동됐어요</b><p>회원에게 수업 외 기록 공유를 <b>절대 강요해선 안 됩니다.</b> 회원은 언제든 공유를 끄거나 연동을 끊을 수 있어요.</p><button type="button" class="button small" data-coach-warned="${esc(l.id)}">확인했어요</button></section>`).join('')}
 <section class="section cdash-grid">${box('오늘 예약', f.todays.length)}${box('확정 대기', f.waiting.length, f.waiting.length?'wait':'')}${box('회원이 고침', f.edited.length, f.edited.length?'wait':'')}${box('회차 곧 끝남', f.soon.length, f.soon.length?'bad':'')}${box('이번 달 차감', `${f.ptMonth}회`)}</section>
 ${f.queued.length?`<section class="section card"><h3>미가입 회원에게 쌓인 수업 ${f.queued.length}개</h3><p class="hint">회원이 초대를 수락하면 ‘한꺼번에 보내기’가 열려요.</p><button type="button" class="button secondary small" id="coach-flush">연동된 회원에게 한꺼번에 보내기</button></section>`:''}
 <section class="section card"><h3>오늘</h3>${f.todays.length?f.todays.map(x => `<div class="cd-row"><span>${esc(String(x.startAt).slice(11,16))} · ${esc(names(data, x.clientIds))} · ${esc(x.title||'수업')}</span><button type="button" class="button small" data-coach-from-schedule="${esc(x.id)}">수업 입력</button></div>`).join(''):'<p class="hint">오늘 예약된 수업이 없어요.</p>'}
 ${[...f.edited, ...f.rejected].map(({s, t}) => `<div class="cd-row"><span>${esc(names(data, [t.clientId]))} · ${md(s.date)} ${esc(s.title||'')}</span><span class="status-badge ${t.status==='rejected'?'bad':'wait'}">${t.status==='rejected'?'거절':'고침'}</span>${t.edits?`<em>${esc(t.edits)}</em>`:''}<button type="button" class="text-button" data-coach-seen="${esc(s.id)}:${esc(t.clientId)}">확인</button></div>`).join('')}
 ${f.soon.map(c => `<div class="cd-row"><span>${esc(c.name)} · PT 남은 ${ptLeft(c)??'—'}회${c.pt?.expiresAt?` · ${md(c.pt.expiresAt)} 만료`:''}</span><span class="status-badge bad">곧 끝남</span></div>`).join('')}</section>
 <section class="section"><h3 class="section-title">회원별</h3><div class="cdash-cards">${f.perClient.map(p => `<article class="card cdash-card"><b>${esc(p.c.name)}</b><div class="cdash-mini"><span>최근 7일 <b>${p.week}</b>회</span><span>4주 <b>${p.month4}</b>회</span>${p.attend!==null?`<span>출석률 <b>${p.attend}%</b></span>`:''}${p.effort!==null?`<span>강도 평균 <b>${p.effort}</b></span>`:''}</div>${Object.keys(p.parts).length?`<p class="cdash-parts">${Object.entries(p.parts).sort((a, b) => b[1]-a[1]).map(([k, v]) => `${esc(k)} ${v}`).join(' · ')} <small>세트(4주, 보낸 수업)</small></p>`:''}${p.painTop.length?`<p class="warn small">반복되는 불편: ${esc(p.painTop.join(', '))}</p>`:''}${p.shared?sharedHTML(p.shared, p.scope||{}):''}</article>`).join('')||'<p class="hint">회원을 추가하면 회원별 흐름이 보여요.</p>'}</div></section>
 <section class="section card coach-next"><b>✦ 다음 수업 추천</b><p class="hint">AI 인사이트와 연결되면 회원별 다음 수업을 제안해 드릴 예정이에요.</p></section>`;
}
const names = (data, ids=[]) => ids.map(id => data.clients.find(c => c.id===id)?.name || '회원').join(', ');

// 일정(주간 타임테이블 + 예약 추가)
export function coachScheduleHTML(data, {today, week=0, form=null}={}){
 const d0 = new Date(`${today}T12:00:00`); d0.setDate(d0.getDate() + week*7); const mon = new Date(d0); mon.setDate(d0.getDate() - ((d0.getDay()+6)%7));
 const days = [...Array(7).keys()].map(i => { const d = new Date(mon); d.setDate(mon.getDate()+i); return ymd(d); });
 const items = k => data.schedules.filter(x => String(x.startAt||'').slice(0,10)===k).sort((a, b) => String(a.startAt).localeCompare(String(b.startAt)));
 return `<div class="page-head coach-head"><div><span class="eyebrow">Coach</span><h2>일정</h2><p>수업을 예약하고, 끝나면 바로 수업 입력으로 이어가요.</p></div></div>
 <div class="row sc-month"><button class="button secondary" data-coach-week="-1" aria-label="이전 주">〈</button><h3>${md(days[0])} – ${md(days[6])}</h3><button class="button secondary" data-coach-week="1" aria-label="다음 주">〉</button></div>
 <section class="section coach-week">${days.map((k, i) => `<div class="cw-day${k===today?' today':''}"><b>${'월화수목금토일'[i]} <small>${md(k)}</small></b>${items(k).map(x => `<div class="cw-item ${esc(x.status)}"><span>${esc(String(x.startAt).slice(11,16))} ${esc(names(data, x.clientIds))}</span><small>${esc(x.title||'수업')}${x.place?` · ${esc(x.place)}`:''} · ${x.durationMin||50}분</small><div class="cw-act">${x.status==='planned'?`<button type="button" class="text-button" data-coach-from-schedule="${esc(x.id)}">수업 입력</button><button type="button" class="text-button" data-coach-cancel="${esc(x.id)}">취소</button>`:x.status==='done'?'<em>완료</em>':'<em>취소됨</em>'}</div></div>`).join('')||'<span class="cw-none">예약 없음</span>'}<button type="button" class="text-button cw-add" data-coach-book="${k}">＋ 예약</button></div>`).join('')}</section>
 ${form?`<form id="coach-book-form" class="section card coach-form"><h3>${md(form.date)} 수업 예약</h3><div class="chips">${data.clients.map(c => `<label class="chip-check"><input type="checkbox" name="client" value="${esc(c.id)}"> ${esc(c.name)}</label>`).join('')||'<p class="hint">먼저 회원을 추가해 주세요.</p>'}</div><input type="hidden" name="date" value="${esc(form.date)}"><div class="grid2"><label class="field">시각<input name="time" type="time" required value="19:00"></label><label class="field">시간(분)<input name="duration" type="number" min="10" max="240" value="50"></label></div><label class="field">수업 이름<input name="title" maxlength="60" placeholder="예: 하체 PT"></label><label class="field">장소(선택)<input name="place" maxlength="60"></label><label class="field">매주 반복(주)<input name="repeat" type="number" min="1" max="12" value="1"></label><div class="actions"><button class="button" type="submit">예약</button><button type="button" class="button secondary" data-coach-book="">닫기</button></div></form>`:''}`;
}

// 템플릿
export function coachTemplatesHTML(data){
 const list = [...data.templates].sort((a, b) => String(b.lastUsedAt||'').localeCompare(String(a.lastUsedAt||'')));
 return `<div class="page-head coach-head"><div><span class="eyebrow">Coach</span><h2>템플릿</h2><p>자주 하는 수업을 저장해 두고 불러와요. 최근에 쓴 순서예요.</p></div></div><section class="section">${list.map(t => `<article class="card coach-tpl"><div><b>${esc(t.title)}</b><small>${t.clientId?`${esc(names(data, [t.clientId]))} 전용`:'공용'} · ${esc(sessionSummary({exercises:t.exercises}))}${t.lastUsedAt?` · 최근 ${md(String(t.lastUsedAt).slice(0,10))}`:''}</small></div><div class="actions"><button type="button" class="button small" data-coach-use-tpl="${esc(t.id)}">이걸로 수업 입력</button><button type="button" class="text-button" data-coach-dup-tpl="${esc(t.id)}">복제</button><button type="button" class="text-button" data-coach-del-tpl="${esc(t.id)}">삭제</button></div></article>`).join('')||'<p class="hint">수업 입력 화면에서 ‘템플릿으로 저장’을 누르면 여기에 모여요.</p>'}</section>`;
}

// 설정(코치 모드에서): 알림 설정 + 회원 한도
export function coachSettingsHTML(data){
 const p = data.push;
 return `<section class="section card coach-settings"><h3>알림 설정</h3>${PUSH_KEYS.map(([k, l]) => `<label class="check-row"><input type="checkbox" data-push="${k}" ${p[k]!==false?'checked':''}> ${l}</label>`).join('')}<label class="check-row"><input type="checkbox" data-push="quiet" ${p.quiet!==false?'checked':''}> 조용한 시간 ${esc(p.quietStart)}~${esc(p.quietEnd)}에는 보내지 않기</label><p class="hint">휴대폰 푸시는 준비 중이에요. 지금은 앱 안 알림으로 보여 드려요.</p></section>
 <section class="section card"><h3>회원 한도</h3><p>회원 ${data.clients.length}/${SEATS_FREE}명 · 지금은 무료예요.</p><label class="check-row disabled"><input type="checkbox" disabled> ${SEATS_FREE}명을 넘으면 프리미엄(준비 중)</label></section>`;
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
 return out;
}

// 아주 작은 QR(초대 링크용). 외부 서비스로 보내지 않고 앱 안에서 그린다.
import {qrMatrix} from './qr.js';
export function qrSVG(text){
 try{ const m = qrMatrix(text), n = m.length, q = 2; let d = ''; m.forEach((row, y) => row.forEach((on, x) => { if(on) d += `M${x+q} ${y+q}h1v1h-1z`; })); return `<svg viewBox="0 0 ${n+q*2} ${n+q*2}" width="132" height="132" shape-rendering="crispEdges" role="img" aria-label="초대 QR 코드"><rect width="100%" height="100%" fill="#fff"/><path d="${d}" fill="#111"/></svg>`; }catch{ return ''; }
}
