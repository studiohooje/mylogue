// 3.7.0 관리자 알림: 처리할 요청(기록 이용 신청, 공용 도감 등록 요청)을 오른쪽 위 팝업과 종 모양 숫자로 보여 준다.
// 관리자가 아니면 아무것도 그리지 않는다.
const h = v => String(v??'').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const when = t => { const d = t?.toDate ? t.toDate() : (t instanceof Date ? t : null); return d ? d.getTime() : 0; };
const TYPE = {machine:'머신·장비 등록 요청', exercise:'운동 종목 등록 요청', food:'음식 등록 요청'};
export const REQUEST_WAITING = ['pending','in_review'];

const AI_LABEL = {meal:'식단', workout:'운동', body:'수치', food:'새 음식', machine:'새 머신', exercise:'새 운동'};
const aiTitle = d => { const p = d.parsedData||{}; return d.type==='meal' ? `${p.items?.[0]?.slot||'식사'} · ${(p.items||[]).slice(0,2).map(x=>x.name).join(', ')}` : d.type==='workout' ? (p.title||'운동') : d.type==='body' ? `${p.date||''} 측정` : (p.name||'새 항목'); };
export function pendingItems({applicants=[], requests=[], aiDrafts=[]}={}){
 const users = applicants.filter(a => a && a.status==='pending').map(a => ({key:`user:${a.uid}`, kind:'user', id:a.uid, title:a.email||a.uid, sub:'기록 이용 신청', at:when(a.createdAt)}));
 const reqs = requests.filter(r => r && REQUEST_WAITING.includes(r.status||'pending')).map(r => ({key:`req:${r.id}`, kind:'request', id:r.id, title:r.name||r.model||r.manufacturer||'이름 없음', sub:`${TYPE[r.type]||'등록 요청'}${r.gymName?` · ${r.gymName}`:''}${r.status==='in_review'?' · 검토 중':''}`, at:when(r.createdAt)}));
 const ai = aiDrafts.filter(d => d && d.status==='pending').map(d => ({key:`ai:${d.id}`, kind:'ai', id:d.id, title:aiTitle(d), sub:`AI 초안 · ${AI_LABEL[d.type]||'기록'}`, at:when(d.createdAt)}));
 return [...ai, ...users, ...reqs].sort((a, b) => b.at - a.at);
}

export function bellHTML(count){
 return `<button type="button" class="admin-bell" id="admin-bell" aria-label="알림 ${count}건${count?' · 눌러서 보기':''}"><svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path d="M12 3a6 6 0 0 0-6 6v3.6L4.4 15.4A1 1 0 0 0 5.3 17h13.4a1 1 0 0 0 .9-1.6L18 12.6V9a6 6 0 0 0-6-6zm-2.4 15.5a2.5 2.5 0 0 0 4.8 0" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>${count?`<span class="admin-badge">${count>99?'99+':count}</span>`:''}</button>`;
}

const KIND = {ai:'AI 검토', user:'가입 승인', request:'등록 요청', plan:'확정 필요', remind:'리마인드', cost:'AI 비용'};
// state: {open:boolean, snoozed:Set<key>, done:[{key,title,result}]}
export function panelHTML(items, state){
 if(!state.open) return '';
 const shown = items.filter(x => !state.snoozed.has(x.key));
 const done = state.done||[];
 return `<aside class="admin-panel" role="dialog" aria-label="알림"><div class="admin-panel-head"><b>알림 <span>${items.length}건</span></b><button type="button" class="text-button" id="admin-later-all">모두 나중에 확인</button></div>${shown.filter(x => x.kind==='ai').length>1?`<div class="admin-bulk" role="group" aria-label="AI 초안 한 번에 처리"><span>AI 초안 ${shown.filter(x => x.kind==='ai').length}건</span><button type="button" class="button small" id="admin-ai-confirm-all">모두 확정</button><button type="button" class="button secondary small" id="admin-ai-reject-all">모두 버리기</button></div>`:''}
${done.map(d => `<div class="admin-done ${d.result}" role="status">${d.result==='approved'?(d.kind==='ai'?'✓ 확정했어요':'✓ 승인했어요'):(d.kind==='ai'?'버렸어요':'반려했어요')} · ${h(d.title)}</div>`).join('')}
${shown.length ? `<ul class="admin-items">${shown.map(x => `<li class="admin-item k-${x.kind}"><div class="admin-item-text"><span class="admin-kind">${KIND[x.kind]||'알림'}</span><b>${h(x.title)}</b><small>${h(x.sub)}</small></div><div class="admin-item-actions"><button type="button" class="button admin-approve" data-admin-approve="${h(x.key)}">${x.kind==='cost'?'확인했어요':x.kind==='remind'?'기록하기':x.kind==='ai'||x.kind==='plan'?'확정':'승인'}</button>${x.kind==='plan'||x.kind==='remind'||x.kind==='cost'?'':`<button type="button" class="button secondary" data-admin-reject="${h(x.key)}">${x.kind==='ai'?'버리기':'반려'}</button>`}<button type="button" class="text-button" data-admin-review="${h(x.key)}">${x.kind==='cost'?'사용량 보기':x.kind==='remind'?'알림 설정':x.kind==='plan'?'기록 보기':'검토하기'}</button><button type="button" class="text-button" data-admin-later="${h(x.key)}">나중에 확인</button></div></li>`).join('')}</ul>` : `<p class="admin-empty">${items.length?'남은 요청은 ‘나중에 확인’으로 접어 뒀어요.':'지금 확인할 알림이 없어요.'}</p>`}
</aside>`;
}

// 승인 상태를 사람이 읽는 말과 색으로
export const STATUS_LABEL = {pending:['승인 대기','wait'], in_review:['검토 중','wait'], approved:['승인됨','ok'], rejected:['반려됨','no'], needs_info:['추가 정보 요청','info']};
export function statusBadge(status){ const [t, c] = STATUS_LABEL[status] || ['상태 없음','info']; return `<span class="status-badge ${c}">${c==='ok'?'✓ ':''}${t}</span>`; }

// 3.16.3 바깥을 눌렀을 때 닫을지: 종을 눌러 연 알림(via 'bell')만 닫는다. 자동으로 뜬 중요한 알림은 '나중에 확인'으로만 닫는다.
export function closesOnOutside(state, target){
 if(!state?.open || !['bell','remind'].includes(state.via) || !target) return false;
 return !(target.closest?.('.admin-panel') || target.closest?.('#admin-bell'));
}

// 3.18.0 예정 기록(미래 시각으로 넣은 식사·운동)을 1시간 넘게 확정하지 않으면 중요 알림(종이 없어도 저절로 뜸)
export function planItems(db={}, now=Date.now()){
 const out = [], hour = 3600000, hm = t => { const d = new Date(t); return `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`; };
 const groups = new Map();
 for(const m of db.meals||[]) if(m.planned){ const k = m.mealGroupId||m.id; const g = groups.get(k) || {k, at:m.loggedAt, date:m.date, names:[]}; g.names.push(m.name); if(m.loggedAt<g.at) g.at = m.loggedAt; groups.set(k, g); }
 for(const g of groups.values()){ const t = new Date(g.at).getTime(); if(Number.isFinite(t) && now-t>=hour) out.push({key:`plan:meal:${g.k}`, kind:'plan', date:g.date, ref:`meal:${g.k}`, title:`${g.date.slice(5).replace('-','/')} ${hm(t)} 식사 · ${g.names.slice(0,2).join(', ')}${g.names.length>2?' 외':''}`, sub:'아직 확정하지 않았어요. 확정해야 기록에 반영돼요', at:t}); }
 for(const w of db.workouts||[]) if(w.planned){ const t = new Date(w.loggedAt || (w.exercises||[]).flatMap(e => [e.completedAt, ...(e.sets||[]).map(s => s.completedAt)]).filter(Boolean).sort()[0] || `${w.date}T23:59:00`).getTime(); if(Number.isFinite(t) && now-t>=hour) out.push({key:`plan:workout:${w.id}`, kind:'plan', date:w.date, ref:`workout:${w.id}`, title:`${w.date.slice(5).replace('-','/')} ${hm(t)} 운동 · ${w.title||'운동'}`, sub:'아직 확정하지 않았어요. 확정해야 기록에 반영돼요', at:t}); }
 return out.sort((a, b) => a.at - b.at);
}
