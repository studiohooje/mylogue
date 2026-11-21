// 4.0.0 코치 모드 화면 상태와 이벤트. app.js는 이 컨트롤러에 클릭·제출·변경과 화면 그리기를 넘긴다.
// 마스터 계정이 아니면 visible()이 false라 어떤 버튼·메뉴·문구도 그리지 않는다.
import {coachAllowed, coachData, withCoach, cid, emptySend, readSendForm, rowsToExercises, exercisesToRows, sessionSummary, applyAcks, clientStatus,
 coachNav, coachToggleHTML, coachClientsHTML, coachSendHTML, coachDashHTML, coachScheduleHTML, coachTemplatesHTML, coachSettingsHTML, memberCoachHTML, sharedSummary, COACH_PAGES} from './coach.js';
import * as cloud from './coach-cloud.js';

const MODE_KEY = 'mylogue.coachMode';
export function createCoachController({getDB, save, render, toast, setPage, getPage, today, user, profileName}){
 let on = false; try{ on = localStorage.getItem(MODE_KEY)==='on'; }catch{}
 let links = [], acks = [], loaded = false, busy = false, sharedPushed = new Set();
 const st = {open:'', form:'', send:null, week:0, book:null};
 const member = {code:'', agree:false, scope:{}, busy:false, msg:''};
 const visible = () => coachAllowed(user());
 const active = () => visible() && on;
 const data = () => coachData(getDB());
 const put = patch => save(withCoach(getDB(), patch));
 const demo = () => !user();   // 로컬 화면 확인(?coach=demo)일 때는 서버 호출을 하지 않는다
 const trainerName = () => profileName() || '코치';
 const sendState = () => st.send || (st.send = emptySend(today()));

 async function refresh({quiet=true}={}){
  if(!visible() || demo() || busy) return;
  busy = true;
  try{
   links = await cloud.listLinks();
   const mineAsTrainer = links.filter(l => l.trainerMine);
   // 초대 수락으로 생긴 연동을 회원 목록에 이어 붙인다(미가입 회원 → 연동)
   let d = data(), changed = false;
   const clients = d.clients.map(c => { const l = mineAsTrainer.find(x => x.clientId===c.id); if(l && (c.linkId!==l.id || c.memberUid!==l.memberUid)){ changed = true; return {...c, linkId:l.id, memberUid:l.memberUid, inviteCode:''}; } return c; });
   if(changed){ put({clients}); d = data(); }
   if(mineAsTrainer.length){ acks = await cloud.listAcks(); const r = applyAcks(d, acks); if(r.changed){ put({clients:r.clients, sessions:r.sessions}); syncPT(r.clients).catch(() => {}); const n = acks.filter(a => !d.seen[a.id]).length; if(n && !quiet) toast(`회원 회신 ${n}건이 도착했어요.`); } }
   // 회원: 동의한 범위의 요약만 올린다(한 세션에 한 번)
   for(const l of links.filter(x => x.memberMine && x.status==='active')){ const sc = l.scope||{}; if(!(sc.workouts||sc.diet||sc.body) || sharedPushed.has(l.id)) continue; sharedPushed.add(l.id); cloud.updateLink(l.id, {shared:sharedSummary(getDB(), sc, today())}).catch(() => {}); }
   loaded = true;
  }catch(e){ console.error('코치 연동 불러오기', e); }
  finally{ busy = false; render(); }
 }
 async function syncPT(clients){ for(const c of clients) if(c.linkId && c.pt?.total){ const l = links.find(x => x.id===c.linkId); if(l?.status==='active' && JSON.stringify(l.pt||{})!==JSON.stringify(c.pt)) await cloud.updateLink(c.linkId, {pt:c.pt}); } }
 async function syncSchedule(){ const d = data(); for(const c of d.clients) if(c.linkId){ const l = links.find(x => x.id===c.linkId); if(l?.status!=='active') continue; const sched = d.schedules.filter(x => x.status==='planned' && (x.clientIds||[]).includes(c.id) && String(x.startAt)>=today()).sort((a, b) => String(a.startAt).localeCompare(String(b.startAt))).slice(0, 20).map(x => ({startAt:x.startAt, durationMin:x.durationMin||50, title:x.title||'', place:x.place||''})); await cloud.updateLink(c.linkId, {schedule:sched}).catch(() => {}); } }

 // 헤더·메뉴
 const headerExtra = () => visible() ? coachToggleHTML(on) : '';
 const navItems = () => active() ? coachNav() : null;
 const headerClass = () => active() ? ' coach-mode' : '';
 function pageHTML(page){
  const d = data(), t = today();
  if(page==='coach-clients') return coachClientsHTML(d, {links, open:st.open, today:t, form:st.form});
  if(page==='coach-send') return coachSendHTML(d, sendState(), {links});
  if(page==='coach-schedule') return coachScheduleHTML(d, {today:t, week:st.week, form:st.book});
  if(page==='coach-templates') return coachTemplatesHTML(d);
  const warn = links.filter(l => l.trainerMine && l.status==='active' && !l.warnedTrainerAt);
  return coachDashHTML(d, {today:t, links, warn});
 }
 const settingsTop = () => active() ? coachSettingsHTML(data()) : '';
 const settingsMember = () => visible() && !active() ? memberCoachHTML(links, member) : '';
 // 회원 일정에 코치 예약 표시
 const memberSchedule = date => links.filter(l => l.memberMine && l.status==='active').flatMap(l => (l.schedule||[]).filter(x => String(x.startAt).slice(0,10)===date).map(x => ({...x, trainerName:l.trainerName})));
 const fixPage = page => { if(!visible()) return COACH_PAGES.includes(page) ? 'home' : page; if(active() && !COACH_PAGES.includes(page) && page!=='settings' && page!=='ai-inbox') return 'coach-dash'; if(!active() && COACH_PAGES.includes(page)) return 'home'; return page; };

 // 클릭(처리했으면 true)
 async function click(t){
  if(!visible()) return false;
  const ds = t.dataset||{};
  if(ds.coachMode){ on = ds.coachMode==='on'; try{ localStorage.setItem(MODE_KEY, on?'on':'off'); }catch{} setPage(on ? 'coach-dash' : 'home'); if(on) refresh(); return true; }
  if(t.id==='coach-reload'){ await refresh({quiet:false}); return true; }
  if(ds.mcEnd){ if(!confirmInline(t, '정말 끊을까요? 다시 누르면 끊겨요.')) return true; await cloud.updateLink(ds.mcEnd, {status:'ended'}); toast('연동을 끊었어요. 코치님은 이제 내 기록을 볼 수 없어요.'); await refresh(); return true; }
  if(!active()) return false;
  const d = data();
  if(ds.coachNew!==undefined){ st.form = ds.coachNew; render(); return true; }
  if(ds.coachClient!==undefined){ st.open = ds.coachClient; render(); if(st.open) setTimeout(() => document.getElementById('coach-detail')?.scrollIntoView?.({behavior:'smooth', block:'start'}), 30); return true; }
  if(ds.coachInvite){ const c = d.clients.find(x => x.id===ds.coachInvite); if(!c) return true; if(demo()){ put({clients:d.clients.map(x => x.id===c.id ? {...x, inviteCode:'DEMO2345', inviteExpires:new Date(Date.now()+7*864e5).toISOString()} : x)}); render(); return true; } const r = await cloud.createInvite({clientId:c.id, trainerName:trainerName()}); put({clients:d.clients.map(x => x.id===c.id ? {...x, inviteCode:r.code, inviteExpires:r.expiresAt} : x)}); render(); toast('초대 코드를 만들었어요. 7일 동안 쓸 수 있어요.'); return true; }
  if(ds.copy){ try{ await navigator.clipboard.writeText(ds.copy); toast('복사했어요.'); }catch{ toast(ds.copy); } return true; }
  if(ds.coachUnlink){ if(!confirmInline(t, '다시 누르면 연동이 끊겨요')) return true; await cloud.updateLink(ds.coachUnlink, {status:'ended'}); toast('연동을 끊었어요.'); await refresh(); return true; }
  if(ds.coachRemove){ if(!confirmInline(t, '다시 누르면 목록에서 빠져요')) return true; put({clients:d.clients.filter(c => c.id!==ds.coachRemove)}); st.open = ''; render(); return true; }
  if(ds.coachSendTo){ st.send = emptySend(today(), [ds.coachSendTo]); setPage('coach-send'); return true; }
  if(ds.coachWarned){ if(!demo()) await cloud.updateLink(ds.coachWarned, {warnedTrainerAt:true}); links = links.map(l => l.id===ds.coachWarned ? {...l, warnedTrainerAt:new Date().toISOString()} : l); render(); return true; }
  if(ds.coachSeen){ const [sid, clientId] = ds.coachSeen.split(':'); put({sessions:d.sessions.map(s => s.id!==sid ? s : {...s, targets:s.targets.map(x => x.clientId===clientId ? {...x, seen:true} : x)})}); render(); return true; }
  if(t.id==='coach-flush'){ await flushQueued(); return true; }
  if(ds.coachWeek){ st.week += Number(ds.coachWeek); render(); return true; }
  if(ds.coachBook!==undefined){ st.book = ds.coachBook ? {date:ds.coachBook} : null; render(); return true; }
  if(ds.coachCancel){ put({schedules:d.schedules.map(x => x.id===ds.coachCancel ? {...x, status:'canceled'} : x)}); render(); syncSchedule(); return true; }
  if(ds.coachFromSchedule){ const x = d.schedules.find(y => y.id===ds.coachFromSchedule); if(!x) return true; st.send = {...emptySend(String(x.startAt).slice(0,10), x.clientIds||[]), time:String(x.startAt).slice(11,16), title:x.title||'', scheduleId:x.id, place:x.place||''}; setPage('coach-send'); return true; }
  if(ds.coachUseTpl){ const tp = d.templates.find(x => x.id===ds.coachUseTpl); if(!tp) return true; st.send = {...emptySend(today(), tp.clientId?[tp.clientId]:[]), title:tp.title, rows:exercisesToRows(tp.exercises), memberNote:tp.notes||''}; setPage('coach-send'); return true; }
  if(ds.coachDupTpl){ const tp = d.templates.find(x => x.id===ds.coachDupTpl); if(tp) put({templates:[...d.templates, {...structuredClone(tp), id:cid('t'), title:`${tp.title} (복사)`, lastUsedAt:''}]}); render(); return true; }
  if(ds.coachDelTpl){ if(!confirmInline(t, '다시 누르면 삭제돼요')) return true; put({templates:d.templates.filter(x => x.id!==ds.coachDelTpl)}); render(); return true; }
  // 수업 입력 화면
  const form = document.getElementById('coach-send-form');
  if(ds.csClient || ds.csGroup || ds.csLoad || ds.csAdd || ds.csDel!==undefined || t.id==='cs-save-group' || t.id==='cs-save-tpl' || ds.coachStep){
   let s = st.send = readSendForm(form, sendState());
   if(ds.csClient){ const ids = new Set(s.clientIds); ids.has(ds.csClient) ? ids.delete(ds.csClient) : ids.add(ds.csClient); s.clientIds = [...ids]; }
   if(ds.csGroup){ const g = d.groups.find(x => x.id===ds.csGroup); if(g) s.clientIds = [...new Set([...s.clientIds, ...g.clientIds])]; }
   if(t.id==='cs-save-group'){ const name = prompt?.('그룹 이름', '그룹 수업') || ''; if(name.trim()) { put({groups:[...d.groups, {id:cid('g'), name:name.trim().slice(0,30), clientIds:s.clientIds}]}); toast('그룹을 저장했어요.'); } }
   if(ds.csLoad){ const [k, id] = ds.csLoad.split(':'); const src = k==='tpl' ? d.templates.find(x => x.id===id) : d.sessions.find(x => x.id===id); if(src){ s.rows = exercisesToRows(src.exercises); s.title = src.title||s.title; if(k==='tpl') put({templates:d.templates.map(x => x.id===id ? {...x, lastUsedAt:new Date().toISOString()} : x)}); } }
   if(ds.csAdd) s.rows = [...s.rows, ds.csAdd==='timed' ? {kind:'timed', name:'', min:'', type:'', note:''} : {kind:'strength', name:'', weight:'', reps:'', sets:3}];
   if(ds.csDel!==undefined){ s.rows = s.rows.filter((_, i) => i!==Number(ds.csDel)); if(!s.rows.length) s.rows = emptySend(s.date).rows; }
   if(t.id==='cs-save-tpl'){ const ex = rowsToExercises(s.rows); if(!ex.length) throw Error('종목을 하나 이상 적어 주세요.'); put({templates:[...d.templates, {id:cid('t'), clientId:s.clientIds.length===1?s.clientIds[0]:'', title:s.title||'수업 템플릿', exercises:ex, notes:s.memberNote||'', lastUsedAt:new Date().toISOString()}]}); toast('템플릿으로 저장했어요.'); }
   if(ds.coachStep) s.step = ds.coachStep;
   render(); return true;
  }
  if(t.id==='coach-send-go'){ await sendNow(); return true; }
  return false;
 }
 // 두 번 눌러야 실행(확인 창 대신)
 function confirmInline(btn, msg){ if(btn.dataset.armed==='1') return true; btn.dataset.armed = '1'; const old = btn.textContent; btn.textContent = msg; setTimeout(() => { if(btn.isConnected){ btn.dataset.armed = ''; btn.textContent = old; } }, 3500); return false; }

 async function sendNow(){
  const d = data(), s = st.send; const ex = rowsToExercises(s.rows);
  if(!ex.length) throw Error('종목을 하나 이상 적어 주세요.');
  const session = {id:cid('s'), date:s.date, time:s.time||'', title:s.title||'수업', place:s.place||'', exercises:ex, memberNote:s.memberNote||'', privateNote:s.privateNote||'', ptOff:s.ptOff||[], group:s.clientIds.length>1, createdAt:new Date().toISOString(), targets:[]};
  let sent = 0, queued = 0;
  for(const id of s.clientIds){ const c = d.clients.find(x => x.id===id); if(!c) continue; const ptDeduct = !(s.ptOff||[]).includes(id), linked = clientStatus(c, links)[0]==='연동';
   if(linked && !demo()){ try{ const r = await cloud.sendSessionTo(session, c, {trainerName:trainerName()}); session.targets.push({clientId:id, ptDeduct, status:'sent', draftId:r.id, sentAt:new Date().toISOString()}); sent++; continue; }catch(e){ console.error(e); toast(`${c.name}님에게 보내지 못했어요: ${e.message||e}`); } }
   session.targets.push({clientId:id, ptDeduct, status:'queued'}); queued++; }
  const schedules = s.scheduleId ? d.schedules.map(x => x.id===s.scheduleId ? {...x, status:'done', sessionId:session.id} : x) : d.schedules;
  put({sessions:[...d.sessions, session], schedules, clients:d.clients.map(c => s.clientIds.includes(c.id) ? {...c, lastSessionAt:s.date} : c)});
  st.send = null; setPage('coach-dash');
  toast(sent && queued ? `${sent}명에게 보냈고, ${queued}명은 연동되면 보낼게요.` : sent ? `${sent}명에게 보냈어요. 회원이 확정하면 알려 드려요.` : `미리 기록해 뒀어요(${queued}명). 연동되면 한꺼번에 보낼 수 있어요.`);
 }
 async function flushQueued(){
  const d = data(); let n = 0;
  const sessions = [];
  for(const s of d.sessions){ const targets = []; for(const t of s.targets||[]){ const c = d.clients.find(x => x.id===t.clientId); if(t.status==='queued' && c?.memberUid && clientStatus(c, links)[0]==='연동' && !demo()){ try{ const r = await cloud.sendSessionTo(s, c, {trainerName:trainerName()}); targets.push({...t, status:'sent', draftId:r.id, sentAt:new Date().toISOString()}); n++; continue; }catch(e){ console.error(e); } } targets.push(t); } sessions.push({...s, targets}); }
  put({sessions}); render(); toast(n ? `쌓인 수업 ${n}개를 보냈어요.` : '보낼 수 있는 회원이 아직 없어요. 회원이 초대를 수락해야 해요.');
 }

 // 제출(처리했으면 true)
 async function submit(form, f){
  if(!visible()) return false;
  if(form.id==='member-coach-form'){
   member.code = String(f.code||'').toUpperCase(); member.scope = {workouts:!!f['scope-workouts'], diet:!!f['scope-diet'], body:!!f['scope-body']}; member.agree = !!f.agree;
   if(!member.agree){ member.msg = '안내를 읽고 ‘이해했어요’에 표시해 주세요.'; render(); return true; }
   member.busy = true; member.msg = ''; render();
   try{ await cloud.acceptInvite(member.code, {scope:member.scope, memberName:profileName()}); member.code = ''; member.agree = false; toast('코치님과 연동됐어요. 수업이 오면 검토함으로 들어와요.'); await refresh(); }
   catch(e){ member.msg = e.message||'연동하지 못했어요.'; }
   finally{ member.busy = false; render(); }
   return true;
  }
  if(!active()) return false;
  const d = data();
  if(form.id==='coach-client-form'){
   const name = String(f.name||'').trim(); if(!name) throw Error('이름을 적어 주세요.');
   const c = {id:cid('c'), name:name.slice(0,40), memberUid:null, linkId:null, goal:String(f.goal||'').slice(0,120), cautions:String(f.cautions||'').slice(0,200), pt:f.ptTotal?{total:Number(f.ptTotal)||0, used:0, expiresAt:f.ptExpires||''}:{}, groups:[], createdAt:new Date().toISOString()};
   put({clients:[...d.clients, c]}); const kind = form.dataset.kind; st.form = ''; st.open = c.id;
   if(kind==='invite'){ if(demo()) put({clients:data().clients.map(x => x.id===c.id ? {...x, inviteCode:'DEMO2345', inviteExpires:new Date(Date.now()+7*864e5).toISOString()} : x)}); else { const r = await cloud.createInvite({clientId:c.id, trainerName:trainerName()}); put({clients:data().clients.map(x => x.id===c.id ? {...x, inviteCode:r.code, inviteExpires:r.expiresAt} : x)}); } }
   render(); toast(kind==='invite' ? `${c.name}님 초대 코드를 만들었어요. 코드·링크·QR 중 편한 걸 보내 주세요.` : `${c.name}님을 추가했어요.`); return true;
  }
  if(form.id==='coach-pt-form'){ const id = form.dataset.client; const total = f.total===''?null:Number(f.total), used = f.used===''?0:Number(f.used); if(total!==null && used>total) throw Error('사용 회차가 총 회차보다 많아요.'); const clients = d.clients.map(c => c.id===id ? {...c, pt:total===null?{}:{total, used, expiresAt:f.expiresAt||''}} : c); put({clients}); syncPT(clients).catch(() => {}); render(); toast('PT 회차를 저장했어요.'); return true; }
  if(form.id==='coach-send-form'){ st.send = readSendForm(form, sendState()); if(!st.send.clientIds.length) throw Error('보낼 회원을 골라 주세요.'); if(!rowsToExercises(st.send.rows).length) throw Error('종목을 하나 이상 적어 주세요.'); st.send.step = 'confirm'; render(); globalThis.scrollTo?.(0, 0); return true; }
  if(form.id==='coach-book-form'){
   const ids = [...form.querySelectorAll('[name=client]:checked')].map(x => x.value); if(!ids.length) throw Error('회원을 골라 주세요.');
   const reps = Math.max(1, Math.min(12, Number(f.repeat)||1)), base = new Date(`${f.date}T${f.time||'19:00'}:00`), add = [];
   for(let i=0; i<reps; i++){ const at = new Date(base); at.setDate(base.getDate()+i*7); const p = n => String(n).padStart(2,'0'); add.push({id:cid('b'), clientIds:ids, startAt:`${at.getFullYear()}-${p(at.getMonth()+1)}-${p(at.getDate())}T${p(at.getHours())}:${p(at.getMinutes())}`, durationMin:Number(f.duration)||50, title:String(f.title||'').slice(0,60), place:String(f.place||'').slice(0,60), status:'planned'}); }
   put({schedules:[...d.schedules, ...add]}); st.book = null; render(); syncSchedule(); toast(reps>1 ? `매주 ${reps}번 예약했어요.` : '예약했어요.'); return true;
  }
  return false;
 }
 // 체크박스 변경(처리했으면 true)
 async function change(t){
  if(!visible()) return false;
  const ds = t.dataset||{};
  if(ds.push){ const d = data(); put({push:{...d.push, [ds.push]:t.checked}}); toast('알림 설정을 저장했어요.'); return true; }
  if(ds.mcScope){ const [id, k] = ds.mcScope.split(':'); const l = links.find(x => x.id===id); if(!l) return true; const scope = {sessions:true, workouts:!!l.scope?.workouts, diet:!!l.scope?.diet, body:!!l.scope?.body, [k]:t.checked};
   try{ await cloud.updateLink(id, {scope, shared:sharedSummary(getDB(), scope, today())}); l.scope = scope; toast(t.checked ? '공유를 켰어요. 언제든 끌 수 있어요.' : '공유를 껐어요. 코치님은 이제 이 기록을 볼 수 없어요.'); }catch(e){ t.checked = !t.checked; toast(e.message||'바꾸지 못했어요.'); }
   render(); return true; }
  return false;
 }
 // ?invite=코드 링크로 들어오면 내 코치 칸에 채운다(마스터 계정만)
 function takeInvite(code){ if(!visible() || !/^[A-Z2-9]{8}$/.test(String(code||'').toUpperCase())) return false; member.code = String(code).toUpperCase(); on = false; return true; }
 return {visible, active, refresh, headerExtra, headerClass, navItems, pageHTML, settingsTop, settingsMember, memberSchedule, fixPage, click, submit, change, takeInvite, get loaded(){ return loaded; }};
}
