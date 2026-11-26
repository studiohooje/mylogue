// 5.4.2 코치로그(대표님 승인 목업): 수업 계획 미리 등록 · 회원에게 보내기 방식 · 회원 쪽 '내일 할 운동'.
// 수업 종류(웨이트·필라테스·요가·기타)는 회원 설정대로 미리 걸러지고, 그날만 바꾸거나 한 수업 안에 섞을 수 있다.
// 이 파일은 app.js를 import하지 않는다.
import {searchExercises} from './catalog.js';
import {MOVES} from './pilates.js';

const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));
const md = d => d ? `${Number(String(d).slice(5, 7))}/${Number(String(d).slice(8, 10))}` : '';
export const PLAN_KINDS = [['웨이트', '🏋'], ['필라테스', '🧘'], ['요가', '🌿'], ['기타', '🏃']];
export const DEFAULT_PREFS = {planSend: 'dayBefore', planTime: '20:00', planHours: 3, attendAsk: true, showPrice: true, quickNotes: ['자세 좋아요', '다음엔 +2.5kg', '호흡 잊지 않기', '목 길게']};
export const prefsOf = data => ({...DEFAULT_PREFS, ...(data?.prefs || {})});

// 수업 기록의 종목 → 수업 종류
export function kindOfExercise(e){
  if(e?.kind === 'pilates' || e?.moves?.length || e?.part === '필라테스' || /필라테스|리포머/.test(e?.sessionType || '')) return '필라테스';
  if(/요가/.test(`${e?.sessionType || ''}${e?.name || ''}`)) return '요가';
  if(e?.kind === 'cardio' || e?.kind === 'timed') return '기타';
  return '웨이트';
}
// 이 회원과 했던 운동: 자주 한 순서 · 지난 값
export function historyOf(data, clientId){
  const map = new Map();
  const mine = (data.sessions || []).filter(s => (s.targets || []).some(t => t.clientId === clientId)).sort((a, b) => String(a.date).localeCompare(String(b.date)));
  for(const s of mine) for(const e of s.exercises || []){
    const moves = e.moves?.length ? e.moves.map(m => ({name: m.name, kind: '필라테스', last: [m.spring, m.reps && `${m.reps}회`].filter(Boolean).join(' · ')})) : [{name: e.name, kind: kindOfExercise(e), last: e.kind === 'cardio' ? (e.durationMin ? `${e.durationMin}분` : '') : (() => { const w = (e.sets || []).filter(x => x.type !== '웜업'); const top = w.at(-1); return top ? `${top.weight || 0}kg×${top.reps || 0} · ${w.length}세트` : ''; })()}];
    for(const m of moves){ const k = `${m.kind}|${m.name}`; const was = map.get(k) || {name: m.name, kind: m.kind, count: 0}; map.set(k, {...was, count: was.count + 1, last: m.last || was.last, date: s.date}); }
  }
  return [...map.values()].sort((a, b) => b.count - a.count || String(b.date).localeCompare(String(a.date)));
}
export function suggest(query, kinds = []){
  const q = String(query || '').trim(); if(!q) return [];
  const out = [];
  if(!kinds.length || kinds.some(k => k !== '필라테스')) for(const e of searchExercises(q).slice(0, 6)) out.push({name: e.name, kind: kindOfExercise(e)});
  if(!kinds.length || kinds.includes('필라테스')) for(const [, list] of Object.entries(MOVES || {})) for(const m of (Array.isArray(list) ? list : [])){ const n = typeof m === 'string' ? m : m?.name; if(n && n.includes(q) && out.length < 10) out.push({name: n, kind: '필라테스'}); }
  return out.slice(0, 10);
}
export const emptyPlan = ({clientId, scheduleId = '', date = '', time = '', kinds = ['웨이트'], send = 'dayBefore'}) => ({clientId, scheduleId, date, time, title: '', kinds: [...kinds], items: [], note: '', send});
const itemLine = it => it.kind === '웨이트' ? `${it.weight ? `${it.weight}kg` : '무게 자유'} × ${it.reps || '-'} · ${it.sets || 3}세트` : [it.reps && `${it.reps}회`, it.min && `${it.min}분`, it.memo].filter(Boolean).join(' · ') || '자유롭게';
export const planItemsText = items => (items || []).map((it, i) => `${i + 1}. ${it.name} ${itemLine(it)}`).join('\n');

export function planSheetHTML(data, p, {client, today = ''} = {}){
  const rt = p.mode === 'routine';
  const hist = historyOf(data, p.clientId).filter(h => !p.kinds.length || p.kinds.includes(h.kind)).slice(0, 8);
  const sendOpts = [['now', '지금'], ['dayBefore', '하루 전'], ['hoursBefore', 'N시간 전'], ['manual', '직접 보낼게요'], ['none', '안 보냄']];
  const kinds = PLAN_KINDS.map(([k, ic]) => `<label class="ck-chip"><input type="checkbox" name="pkinds" value="${esc(k)}" data-cp-kind ${p.kinds.includes(k) ? 'checked' : ''}><span>${ic} ${esc(k)}</span></label>`).join('');
  const sections = [];
  let lastKind = '';
  p.items.forEach((it, i) => {
    if(it.kind !== lastKind){ sections.push(`<li class="cp-sec">${i === 0 && p.items.some(x => x.kind !== it.kind) ? '웜업 · ' : ''}${esc(it.kind)}</li>`); lastKind = it.kind; }
    sections.push(`<li class="cp-item"><span class="n">${i + 1}</span><span class="cp-t"><b>${esc(it.name)}</b>${it.kind === '웨이트' ? `<span class="cp-in"><input data-cp-f="${i}:weight" inputmode="decimal" value="${esc(it.weight ?? '')}" placeholder="kg" aria-label="${esc(it.name)} 무게">×<input data-cp-f="${i}:reps" inputmode="numeric" value="${esc(it.reps ?? '')}" placeholder="회" aria-label="횟수">·<input data-cp-f="${i}:sets" inputmode="numeric" value="${esc(it.sets ?? 3)}" aria-label="세트">세트</span>` : `<span class="cp-in"><input data-cp-f="${i}:reps" inputmode="numeric" value="${esc(it.reps ?? '')}" placeholder="회" aria-label="횟수">회 · <input data-cp-f="${i}:memo" value="${esc(it.memo ?? '')}" placeholder="스프링·메모" class="cp-memo" aria-label="메모"></span>`}</span><span class="cp-acts"><button type="button" data-cp-up="${i}" aria-label="위로">↑</button><button type="button" data-cp-del="${i}" aria-label="빼기">×</button></span></li>`);
  });
  return `<form id="coach-plan-form" class="cs-form">
  <div class="cl-band" style="margin:0"><span class="cl-av" style="background:#ffb36b">${esc(String(client?.name || '회')[0])}</span><div class="cl-band-t"><b>${esc(client?.name || '')} · ${rt ? '혼자 할 운동' : p.date ? `${md(p.date)} ${esc(p.time || '')}` : '날짜를 정해요'}</b><small>${client?.cautions ? `⚠ ${esc(client.cautions)}` : esc(client?.goal || '')}</small></div></div>
  ${rt ? `<p class="hint" style="margin:0">수업 없는 날 회원이 혼자 할 운동이에요. 회원 운동 창 '도움받기 › 코치 루틴'으로 가요.</p><div class="cs-step"><b>얼마나 자주</b><div class="ck-chips">${[1, 2, 3, 4].map(n => `<label class="ck-chip"><input type="radio" name="freq" value="${n}" ${Number(p.freq || 2) === n ? 'checked' : ''}><span>주 ${n}회</span></label>`).join('')}</div></div>` : p.scheduleId ? '' : `<div class="cs-step"><b>언제 <small>정하면 일정에도 예약돼요</small></b><div class="cp-when"><input type="date" name="date" data-no-when value="${esc(p.date || today)}" aria-label="날짜"><input type="time" name="time" data-no-when value="${esc(p.time || '19:00')}" aria-label="시각"></div></div>`}
  <label class="cs-step"><b>${rt ? '루틴 이름' : '수업 이름'}</b><input name="title" maxlength="40" value="${esc(p.title)}" placeholder="${rt ? '예: 혼자 하는 상체 A' : '예: 웜업 필라테스 + 상체'}" autocomplete="off"></label>
  <div class="cs-step"><b>수업 종류 <small>회원 설정대로 골라져 있어요 · 바꾸거나 섞어도 돼요</small></b><div class="ck-chips">${kinds}</div></div>
  <div class="cs-step"><b>${rt ? '수업에서 했던 운동에서 고르기 <small>혼자일 땐 무게 -10%로 넣어요</small>' : '이 회원과 했던 운동 <small>자주 한 순서 · 지난 값</small>'}</b>${hist.length ? hist.map(h => `<div class="cp-hist"><span class="mk-ico">${h.kind === '필라테스' ? '🧘' : h.kind === '요가' ? '🌿' : '🏋'}</span><span class="cp-t"><b>${esc(h.name)}</b><small>${esc(h.last || '')} · ${h.count}번 함</small></span><button type="button" class="cl-ghost" data-cp-add="${esc(h.kind)}|${esc(h.name)}" aria-label="${esc(h.name)} 넣기">＋</button></div>`).join('') : '<p class="hint" style="margin:0">아직 함께한 운동이 없어요. 아래에서 찾아 넣어요.</p>'}
   <input data-cp-search placeholder="종목 검색" autocomplete="off" aria-label="종목 찾기"><div class="cp-sugg" data-cp-sugg></div></div>
  <div class="cs-step"><b>${rt ? '루틴' : '수업 계획'} <small>${p.items.length}종목 · ↑로 순서 바꾸기</small></b>${p.items.length ? `<ul class="cp-plan">${sections.join('')}</ul>` : '<p class="hint" style="margin:0">위에서 운동을 넣어 주세요.</p>'}</div>
  <label class="cs-step"><b>회원에게 한마디 <small>선택</small></b><input name="note" maxlength="200" value="${esc(p.note)}" placeholder="예: 허리 괜찮으면 벤치 그대로 가요" autocomplete="off"></label>
  ${rt ? '' : `<div class="cs-step"><b>회원에게 보내기 <small>설정의 기본값 · 이 수업만 바꿀 수 있어요</small></b><div class="ck-seg cp-send">${sendOpts.map(([v, l]) => `<label><input type="radio" name="send" value="${v}" ${p.send === v ? 'checked' : ''}><span>${l}</span></label>`).join('')}</div></div>`}
  ${rt ? `<button class="cs-go" type="submit">${esc(client?.name || '회원')} 님에게 보내기</button>` : '<div class="mk-2"><button type="button" class="cl-ghost" id="cp-save-tpl">템플릿으로 저장</button><button class="cs-go" type="submit">계획 저장</button></div>'}</form>`;
}
// 화면의 값 → 계획(다시 그리기 전에 적던 값 보존)
export function readPlanForm(form, p){
  if(!form) return p;
  const items = p.items.map((it, i) => { const g = k => form.querySelector(`[data-cp-f="${i}:${k}"]`)?.value; const n = {...it}; for(const k of ['weight', 'reps', 'sets', 'memo']){ const v = g(k); if(v !== undefined) n[k] = k === 'memo' ? v : (v === '' ? '' : Number(v)); } return n; });
  const e = form.elements;
  return {...p, items, title: e.title?.value ?? p.title, note: e.note?.value ?? p.note, date: e.date?.value || p.date, time: e.time?.value || p.time, kinds: [...form.querySelectorAll('input[name=pkinds]:checked')].map(x => x.value), send: form.querySelector('input[name=send]:checked')?.value || p.send, freq: Number(form.querySelector('input[name=freq]:checked')?.value) || p.freq || 2};
}
// 회원에게 보일 시각(없으면 안 보냄)
export function planShowAt(x, prefs){
  const send = x.plan?.send || prefs.planSend;
  if(!x.plan?.items?.length || send === 'none') return '';
  if(send === 'manual') return x.plan.sentAt || '';
  if(send === 'now') return x.plan.savedAt || new Date().toISOString();
  const start = new Date(String(x.startAt));
  if(!Number.isFinite(start.getTime())) return '';
  if(send === 'hoursBefore') return new Date(start - (Number(prefs.planHours) || 3) * 3600e3).toISOString();
  const d = new Date(start); d.setDate(d.getDate() - 1); const [h, m] = String(prefs.planTime || '20:00').split(':').map(Number); d.setHours(h || 20, m || 0, 0, 0); return d.toISOString();
}
export const planVisible = (x, now = new Date()) => !!x?.plan?.items?.length && !!x.plan.showAt && new Date(x.plan.showAt) <= now;

// 회원(마이로그): 내일 할 운동
export function memberPlanHTML(x, {trainerName = '코치'} = {}){
  const items = x.plan?.items || [];
  let last = '';
  return `<div class="cl-card mp-card"><h3><span>${esc(md(String(x.startAt).slice(0, 10)))} ${esc(String(x.startAt).slice(11, 16))} · ${esc(x.title || '수업')}</span><small>${esc(trainerName)}</small></h3>${x.plan?.note ? `<p class="mk-note">“${esc(x.plan.note)}”</p>` : ''}
  <ul class="cp-plan">${items.map((it, i) => { const sec = it.kind !== last ? `<li class="cp-sec">${esc(it.kind)}</li>` : ''; last = it.kind; return `${sec}<li class="cp-item"><span class="n">${i + 1}</span><span class="cp-t"><b>${esc(it.name)}</b><small>${esc(itemLine(it))}</small></span></li>`; }).join('')}</ul></div>`;
}

// ---------- 개인 운동 루틴: 회원 쪽 진행 띠 · 이번 주 수행 ----------
export function routineProgress(routine, doneNames = []){
  const items = routine?.items || [], done = new Set(doneNames);
  const n = items.filter(x => done.has(x.name)).length, next = items.find(x => !done.has(x.name));
  return {n, total: items.length, next};
}
export function routineBandHTML(routine, doneNames = []){
  if(!routine?.items?.length) return '';
  const {n, total, next} = routineProgress(routine, doneNames);
  return `<div class="cl-band rt-band" role="status"><span class="cl-av" style="background:#8ce4e0">${Math.min(total, n + 1)}</span><div class="cl-band-t"><b>${esc(routine.from === 'class' ? '수업 운동' : '코치 루틴')} ${Math.min(total, n + (next ? 1 : 0))}/${total}${next ? ` · ${esc(next.name)}` : ' · 다 했어요 👏'}</b><small>${next ? `목표 ${esc(itemLine(next))}${routine.items[routine.items.indexOf(next) + 1] ? ` · 다음: ${esc(routine.items[routine.items.indexOf(next) + 1].name)}` : ''}` : '운동 끝내기를 누르면 코치님께 \'했어요\'가 가요'}</small></div></div>`;
}
export function weekDone(log = [], today = new Date()){
  const d0 = new Date(today); d0.setDate(d0.getDate() - ((d0.getDay() + 6) % 7)); const k = d0.toISOString().slice(0, 10);
  return (log || []).filter(x => String(x.date) >= k);
}
