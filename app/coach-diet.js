// 5.4.2 코치로그(대표님 승인 목업): 식단 '제안' — 하루 식단표 · 끼니별 조합 · 한 끼만 콕.
// 음식 고르기는 마이로그 식사 창(검색·양)을 그대로 쓰고, 제안을 짜는 화면은 코치 전용. 회원은 식사 창 '도움받기 › 코치 제안'에서 쓴다.
// 이 파일은 app.js를 import하지 않는다.
const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));
export const SLOTS = [['아침', '08:00'], ['점심', '12:30'], ['간식', '16:00'], ['저녁', '19:30']];
export const MODES = [['day', '📋', '하루 식단표', '아침·점심·저녁·간식을 하나씩 정해 줘요. 목표 칼로리·탄단지에 맞춰 합계가 보여요.'], ['combo', '🍱', '끼니별 조합 고르기', '아침에 좋은 조합 몇 가지, 점심 몇 가지… 회원이 그날 골라 먹어요.'], ['single', '✍', '한 끼만 콕', '"오늘 저녁은 이렇게" 같은 한 번짜리 제안']];
const kcal = items => (items || []).reduce((a, x) => a + (Number(x.calories) || 0), 0);
const sum = (items, k) => Math.round((items || []).reduce((a, x) => a + (Number(x[k]) || 0), 0));
const q = x => `${Number(x.servingQty) % 1 ? Number(x.servingQty).toFixed(1) : (x.servingQty ?? '')}${esc(x.servingUnit || '')}`;
const ABC = 'ABCDEF';

export function emptyDiet({clientId, mode = '', target = 1600}){
  return {clientId, mode, title: '', target, note: '', keep: 'always', slots: SLOTS.map(([slot, time]) => ({slot, time, items: [], alt: ''})), combos: {아침: [], 점심: [], 저녁: []}, single: {slot: '저녁', items: [], alt: ''}};
}
export function allItems(p){
  if(p.mode === 'day') return p.slots.flatMap(s => s.items);
  if(p.mode === 'single') return p.single.items;
  return [];
}
const itemRows = (items, path) => items.length ? `<ul class="cd-items">${items.map((x, i) => `<li><span>${esc(x.name)}</span><span>${q(x)}</span><span class="k">${Math.round(Number(x.calories) || 0)}</span><button type="button" data-cd-del="${path}:${i}" aria-label="${esc(x.name)} 빼기">×</button></li>`).join('')}</ul>` : '';

export function dietSheetHTML(p, {client} = {}){
  if(!p.mode) return `<div class="cs-form"><p class="hint" style="margin:0">'이렇게 먹어 보세요' 제안이에요. 회원은 식사 창 '도움받기 › 코치 제안'에서 골라 기록해요.</p>
   <div class="cs-step"><b>어떻게 제안할까요?</b>${MODES.map(([k, ic, t, d]) => `<button type="button" class="q-live-card ${k === 'day' ? 'live' : ''}" data-cd-mode="${k}"><span class="q-live-ico">${ic}</span><span><b>${t}</b><small>${d}</small></span></button>`).join('')}</div></div>`;
  const totals = allItems(p), tk = kcal(totals);
  const head = `<label class="cs-step"><b>이름</b><input name="title" maxlength="30" value="${esc(p.title)}" placeholder="${p.mode === 'combo' ? '예: 평일 끼니별 조합' : p.mode === 'single' ? '예: 운동한 날 저녁' : '예: 평일 다이어트 식단'}" autocomplete="off"></label>`;
  const sumCard = p.mode === 'combo' ? '' : `<div class="cl-card cd-sum"><h3>합계 <small>목표 <input name="target" inputmode="numeric" value="${esc(p.target)}" class="cd-target" aria-label="목표 칼로리">kcal</small></h3><div class="cl-bar"><i style="width:${Math.min(100, Math.round(tk / Math.max(1, Number(p.target) || 1600) * 100))}%"></i></div><div class="cd-macro"><div><small>칼로리</small><b>${Math.round(tk).toLocaleString('ko-KR')}</b></div><div><small>탄수</small><b>${sum(totals, 'carbs')}g</b></div><div><small>단백질</small><b>${sum(totals, 'protein')}g</b></div><div><small>지방</small><b>${sum(totals, 'fat')}g</b></div></div></div>`;
  let body = '';
  if(p.mode === 'day') body = p.slots.map((s, i) => `<div class="cd-meal"><div class="h"><b>${esc(s.slot)} · ${esc(s.time)}</b><span>${Math.round(kcal(s.items))}kcal</span></div>${itemRows(s.items, `s${i}`)}<button type="button" class="ck-chip-btn" data-cd-add="s${i}">＋ 음식</button><input data-cd-alt="s${i}" maxlength="80" value="${esc(s.alt)}" placeholder="↔ 대체 음식 · 예: 바나나 대신 블루베리 100g도 OK" autocomplete="off"></div>`).join('');
  if(p.mode === 'single') body = `<div class="cs-step"><b>언제</b><div class="ck-chips">${SLOTS.map(([s]) => `<label class="ck-chip"><input type="radio" name="sslot" value="${s}" ${p.single.slot === s ? 'checked' : ''}><span>${s}</span></label>`).join('')}</div></div><div class="cd-meal">${itemRows(p.single.items, 'x')}<button type="button" class="ck-chip-btn" data-cd-add="x">＋ 음식</button><input data-cd-alt="x" maxlength="80" value="${esc(p.single.alt)}" placeholder="↔ 대체 음식(선택)" autocomplete="off"></div>`;
  if(p.mode === 'combo') body = Object.entries(p.combos).map(([slot, list]) => `<div class="cs-step"><b>${esc(slot)}에 좋은 조합 <small>${list.length}가지</small></b><div class="cd-combos">${list.map((c, i) => `<div class="cd-meal"><div class="h"><b>${esc(c.name)}</b><span>${Math.round(kcal(c.items))}kcal</span></div>${itemRows(c.items, `c${slot}|${i}`)}<div class="cd-cbtn"><button type="button" class="ck-chip-btn" data-cd-add="c${slot}|${i}">＋ 음식</button><button type="button" class="text-button" data-cd-cdel="${slot}|${i}">조합 빼기</button></div></div>`).join('')}<button type="button" class="cd-newc" data-cd-cnew="${slot}">＋ ${esc(slot)} 조합 ${ABC[list.length] || ''}</button></div></div>`).join('') + `<div class="cs-step"><b>회원에게 보일 기간</b><div class="ck-seg"><label><input type="radio" name="keep" value="week" ${p.keep === 'week' ? 'checked' : ''}><span>이번 주</span></label><label><input type="radio" name="keep" value="always" ${p.keep !== 'week' ? 'checked' : ''}><span>계속(바꿀 때까지)</span></label></div></div>`;
  return `<form id="coach-diet-form" class="cs-form">${head}${sumCard}${body}<label class="cs-step"><b>코치 한마디 <small>선택</small></b><input name="note" maxlength="120" value="${esc(p.note)}" placeholder="예: 단백질 먼저, 밥은 반 공기" autocomplete="off"></label>
  <div class="mk-2"><button type="button" class="cl-ghost" data-cd-mode="">방식 바꾸기</button><button class="cs-go" type="submit">${esc(client?.name || '회원')} 님에게 보내기</button></div></form>`;
}
export function readDietForm(form, p){
  if(!form) return p;
  const e = form.elements, n = {...p, title: e.title?.value ?? p.title, note: e.note?.value ?? p.note, target: Number(e.target?.value) || p.target, keep: form.querySelector('input[name=keep]:checked')?.value || p.keep};
  n.slots = p.slots.map((s, i) => ({...s, alt: form.querySelector(`[data-cd-alt="s${i}"]`)?.value ?? s.alt}));
  n.single = {...p.single, slot: form.querySelector('input[name=sslot]:checked')?.value || p.single.slot, alt: form.querySelector('[data-cd-alt="x"]')?.value ?? p.single.alt};
  return n;
}
// 경로(s0 · x · c점심|1)에 음식 넣기·빼기
export function dietItemsAt(p, path){
  if(path === 'x') return p.single.items;
  if(path[0] === 's') return p.slots[Number(path.slice(1))]?.items;
  if(path[0] === 'c'){ const [slot, i] = path.slice(1).split('|'); return p.combos[slot]?.[Number(i)]?.items; }
  return null;
}
export const dietPathLabel = (p, path) => path === 'x' ? p.single.slot : path[0] === 's' ? p.slots[Number(path.slice(1))]?.slot : path[0] === 'c' ? `${path.slice(1).split('|')[0]} 조합 ${p.combos[path.slice(1).split('|')[0]]?.[Number(path.split('|')[1])]?.name || ''}` : '';
export const newCombo = (p, slot) => ({name: `${ABC[(p.combos[slot] || []).length] || '+'} 조합`, items: []});
// 보낼 모양(빈 끼니·빈 조합은 뺀다)
export function finalizeDiet(p){
  const base = {id: p.id || `mp${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`, mode: p.mode, title: (p.title || '').trim() || (p.mode === 'combo' ? '끼니별 조합' : p.mode === 'single' ? `${p.single.slot} 제안` : '하루 식단표'), note: p.note || '', createdAt: new Date().toISOString()};
  if(p.mode === 'day') return {...base, target: Number(p.target) || null, slots: p.slots.filter(s => s.items.length)};
  if(p.mode === 'single') return {...base, slot: p.single.slot, items: p.single.items, alt: p.single.alt || ''};
  const combos = Object.fromEntries(Object.entries(p.combos).map(([k, v]) => [k, v.filter(c => c.items.length)]).filter(([, v]) => v.length));
  return {...base, keep: p.keep, until: p.keep === 'week' ? new Date(Date.now() + 7 * 864e5).toISOString() : '', combos};
}
export const dietSummary = p => p.mode === 'day' ? `${(p.slots || []).map(s => `${s.slot} ${Math.round(kcal(s.items))}`).join(' · ')}` : p.mode === 'combo' ? Object.entries(p.combos || {}).map(([k, v]) => `${k} ${v.length}가지`).join(' · ') : (p.items || []).map(x => x.name).slice(0, 3).join(' · ');
export const dietKcal = p => p.mode === 'day' ? (p.slots || []).reduce((a, s) => a + kcal(s.items), 0) : p.mode === 'combo' ? 0 : kcal(p.items);

// ---------- 회원: 식사 창 '코치 제안' ----------
const slotOfTime = t => { const h = Number(String(t || '12:00').slice(0, 2)); return h < 10 ? '아침' : h < 15 ? '점심' : h < 17 ? '간식' : '저녁'; };
// 고른 키 → 담을 음식들
export function coachPick(plans, key){
  const [id, kind, a, b] = String(key).split('~'); const p = plans.find(x => x.id === id); if(!p) return null;
  if(kind === 's') return p.slots?.[Number(a)] ? {items: p.slots[Number(a)].items, slot: p.slots[Number(a)].slot} : null;
  if(kind === 'c') return p.combos?.[a]?.[Number(b)] ? {items: p.combos[a][Number(b)].items, slot: a} : null;
  return {items: p.items || [], slot: p.slot || ''};
}
const card = (title, k, items, key, {alt = '', by = '', on = false} = {}) => { const rest = items.slice(3); return `<div class="mv-card mv-coach${on ? ' mv-now' : ''}"><div class="mv-top"><b class="mv-h">${esc(title)}</b><span class="mv-kcal">${Math.round(k).toLocaleString('ko-KR')}<small>kcal</small></span></div><ul>${items.slice(0, 3).map(x => `<li title="${esc(x.name)} ${q(x)}"><span class="mv-name">${esc(x.name)}</span><span class="mv-qty">${q(x)}</span></li>`).join('')}${rest.length ? `<li class="mv-more"><button type="button" class="mv-morebtn">… 외 ${rest.length}개</button><span class="mv-tip" role="tooltip">${rest.map(x => `<span>${esc(x.name)} <b>${q(x)}</b></span>`).join('')}</span></li>` : ''}</ul>${alt ? `<p class="mv-note">↔ ${esc(alt)}</p>` : ''}${by ? `<small class="mv-by">${esc(by)}</small>` : ''}<div class="mv-acts"><button type="button" class="mv-go" data-q-coach-save="${esc(key)}">통째로 기록</button><button type="button" class="mv-edit" data-q-coach-meal="${esc(key)}">세부 수정</button></div></div>`; };
export function memberCoachMealsHTML(plans, {time = '12:00'} = {}){
  const now = slotOfTime(time), out = [];
  for(const p of plans){
    const by = `${p.trainerName || '코치'} 코치님`;
    if(p.mode === 'day'){ const order = (p.slots || []).map((s, i) => [s, i]).sort(([a], [b]) => (b.slot === now) - (a.slot === now)); out.push(`<div class="mc-plan-h"><b>${esc(p.title)}</b><small>${by}${p.note ? ` · “${esc(p.note)}”` : ''}</small></div><div class="mv1">${order.map(([s, i]) => card(`${s.slot} · ${s.time}`, kcal(s.items), s.items, `${p.id}~s~${i}`, {alt: s.alt, on: s.slot === now})).join('')}</div>`); }
    else if(p.mode === 'combo'){ if(p.until && new Date(p.until) < new Date()) continue; const slots = Object.keys(p.combos || {}).sort((a, b) => (b === now) - (a === now)); out.push(`<div class="mc-plan-h"><b>${esc(p.title)}</b><small>${by} · 하나 골라요${p.note ? ` · “${esc(p.note)}”` : ''}</small></div>${slots.map(sl => `<p class="mc-slot">${esc(sl)}${sl === now ? ' · 지금' : ''}</p><div class="mv1">${p.combos[sl].map((c, i) => card(c.name, kcal(c.items), c.items, `${p.id}~c~${sl}~${i}`, {on: sl === now && i === 0})).join('')}</div>`).join('')}`); }
    else out.push(`<div class="mc-plan-h"><b>${esc(p.title)}</b><small>${by}</small></div><div class="mv1">${card(p.slot || p.title || '제안', kcal(p.items), p.items || [], `${p.id}~x`, {alt: p.alt, by: p.note ? `“${p.note}”` : ''})}</div>`);
  }
  return out.join('');
}
