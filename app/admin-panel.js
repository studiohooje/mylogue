// 3.7.0 관리자 알림: 처리할 요청(기록 이용 신청, 공용 도감 등록 요청)을 오른쪽 위 팝업과 종 모양 숫자로 보여 준다.
// 관리자가 아니면 아무것도 그리지 않는다.
const h = v => String(v??'').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const when = t => { const d = t?.toDate ? t.toDate() : (t instanceof Date ? t : null); return d ? d.getTime() : 0; };
const TYPE = {machine:'머신·장비 등록 요청', exercise:'운동 종목 등록 요청', food:'음식 등록 요청'};
export const REQUEST_WAITING = ['pending','in_review'];

const AI_LABEL = {meal:'식단', workout:'운동', body:'몸', food:'새 음식', machine:'새 머신', exercise:'새 운동'};
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

const KIND = {ai:'AI 검토', user:'가입 승인', request:'등록 요청'};
// state: {open:boolean, snoozed:Set<key>, done:[{key,title,result}]}
export function panelHTML(items, state){
 if(!state.open) return '';
 const shown = items.filter(x => !state.snoozed.has(x.key));
 const done = state.done||[];
 return `<aside class="admin-panel" role="dialog" aria-label="알림"><div class="admin-panel-head"><b>알림 <span>${items.length}건</span></b><button type="button" class="text-button" id="admin-later-all">모두 나중에 확인</button></div>
${done.map(d => `<div class="admin-done ${d.result}" role="status">${d.result==='approved'?(d.kind==='ai'?'✓ 확정했어요':'✓ 승인했어요'):(d.kind==='ai'?'버렸어요':'반려했어요')} · ${h(d.title)}</div>`).join('')}
${shown.length ? `<ul class="admin-items">${shown.map(x => `<li class="admin-item k-${x.kind}"><div class="admin-item-text"><span class="admin-kind">${KIND[x.kind]||'알림'}</span><b>${h(x.title)}</b><small>${h(x.sub)}</small></div><div class="admin-item-actions"><button type="button" class="button admin-approve" data-admin-approve="${h(x.key)}">${x.kind==='ai'?'확정':'승인'}</button><button type="button" class="button secondary" data-admin-reject="${h(x.key)}">${x.kind==='ai'?'버리기':'반려'}</button><button type="button" class="text-button" data-admin-review="${h(x.key)}">검토하기</button><button type="button" class="text-button" data-admin-later="${h(x.key)}">나중에 확인</button></div></li>`).join('')}</ul>` : `<p class="admin-empty">${items.length?'남은 요청은 ‘나중에 확인’으로 접어 뒀어요.':'지금 확인할 알림이 없어요.'}</p>`}
</aside>`;
}

// 승인 상태를 사람이 읽는 말과 색으로
export const STATUS_LABEL = {pending:['승인 대기','wait'], in_review:['검토 중','wait'], approved:['승인됨','ok'], rejected:['반려됨','no'], needs_info:['추가 정보 요청','info']};
export function statusBadge(status){ const [t, c] = STATUS_LABEL[status] || ['상태 없음','info']; return `<span class="status-badge ${c}">${c==='ok'?'✓ ':''}${t}</span>`; }
