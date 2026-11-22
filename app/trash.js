// 4.7.0 휴지통: 지운 기록을 이 기기에 30일 보관하고 되살릴 수 있게 한다(되돌리기 6초를 놓쳐도).
// 저장 위치는 기기 안(localStorage, 계정별 키). 동기화하지 않는다 — 되살리면 일반 기록으로 다시 들어가 동기화된다.
const DAYS = 30, MAX = 300;
const h = v => String(v??'').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const KINDS = {meals:'식단', workouts:'운동', body:'수치', routines:'루틴'};
export function readTrash(key, now = Date.now()){
 try{ const a = JSON.parse(globalThis.localStorage?.getItem(key)||'[]'); return Array.isArray(a) ? a.filter(x => x && now - Number(x.at) < DAYS*86400000) : []; }catch{ return []; }
}
const write = (key, list) => { try{ globalThis.localStorage?.setItem(key, JSON.stringify(list.slice(-MAX))); }catch{} };
// 같은 동작으로 지운 기록은 한 묶음(group)으로 넣어 함께 되살린다
export function toTrash(key, kind, records, now = Date.now()){
 const recs = (records||[]).filter(Boolean); if(!recs.length || !KINDS[kind]) return null;
 const group = `t${now.toString(36)}${Math.random().toString(36).slice(2,6)}`;
 write(key, [...readTrash(key, now), {group, kind, at:now, records:recs}]); return group;
}
export function takeFromTrash(key, group){
 const list = readTrash(key), hit = list.find(x => x.group===group); if(!hit) return null;
 write(key, list.filter(x => x.group!==group)); return hit;
}
export function emptyTrash(key){ write(key, []); }
// 되살리기: 같은 id가 이미 있으면(되돌리기로 이미 살린 경우) 건너뛴다
export function restoreInto(db, item){ const have = new Set((db[item.kind]||[]).map(x => x.id)); const add = item.records.filter(r => !have.has(r.id)); return {db:{...db, [item.kind]:[...(db[item.kind]||[]), ...add]}, count:add.length}; }
const label = (kind, r) => kind==='meals' ? `${r.name||'음식'}${r.servingQty?` ${r.servingQty}${r.servingUnit||''}`:''}` : kind==='workouts' ? (r.rest ? '의도적 휴식' : r.title||'운동') : kind==='body' ? `${r.weight?`${r.weight}kg`:'수치'}${r.measure==='inbody'?' · 인바디':''}` : r.title||r.name||'루틴';
export function trashHTML(list){
 const items = [...list].reverse();
 if(!items.length) return ''; // 4.7.0 비어 있으면 카드를 보이지 않는다(되돌리기 토스트가 휴지통을 알려 줌)
 return `<section class="section card trash-card" id="trash"><h3>휴지통 <small>최근 ${DAYS}일 · 이 기기</small></h3>${items.length?`<ul class="trash-list">${items.map(x => { const d = new Date(x.at), first = x.records[0]; return `<li><span><b>${h(KINDS[x.kind])} · ${h(first?.date||'')}</b><small>${h(x.records.slice(0,3).map(r => label(x.kind, r)).join(', '))}${x.records.length>3?` 외 ${x.records.length-3}개`:''} · ${d.getMonth()+1}/${d.getDate()} 지움</small></span><button type="button" class="button small secondary" data-trash-restore="${h(x.group)}">되살리기</button></li>`; }).join('')}</ul><button type="button" class="text-button" id="trash-empty">휴지통 비우기</button>`:'<p class="hint">지운 기록이 없어요. 지운 기록은 여기서 30일 동안 되살릴 수 있어요.</p>'}</section>`;
}
