// 4.7.0 헬스장 머신 한꺼번에 등록(대표님: 다니는 헬스장 머신을 싹 다 등록하고 싶다).
// - 헬스장마다 '어떤 머신이 있는지'를 공용 도감(gymMachines)에 둔다. 머신은 일반 머신 종류(gm:…)·앱 기본 제조사 모델(bm:…)·
//   관리자가 더한 제조사 모델(mm:…) 중에서 고른다.
// - 헬스장 구분: 지도(카카오)로 등록한 곳은 장소 ID로(이름을 조금 다르게 적어도 같은 곳), 이름만 적은 곳은 이름으로.
// - 관리자: 고른 대로 바로 공용에 저장(뺀 것은 removed:true — 규칙상 지우기 대신 표시).
// - 일반 사용자: 고른 것을 '등록 요청'으로 한 번에 보내고, 관리자가 '이 헬스장 요청 모두 승인'으로 한 번에 반영.
import {GENERIC_MACHINES, BUILTIN_BRANDS, brandModelId, gymMachineId, LOAD_LABEL, UNIT_LABEL} from './machines-catalog.js';
import {EXERCISE_CATALOG} from './catalog.js';

const h = v => String(v??'').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const PARTS = ['가슴','등','하체','어깨','팔','복근','전신','유산소'];
const partOf = g => EXERCISE_CATALOG.find(x => x.name===g.exercise)?.part || '기타';

export function gymKeyOf(settings = {}, name = ''){
 const p = (settings.gymPlaces||{})[name];
 return p?.provider==='kakao' && p.providerId ? `kakao:${p.providerId}` : `name:${String(name).trim()}`;
}
// 모든 고를 수 있는 머신: id → {id, name, kind:'generic'|'brand', baseId, manufacturer, model}
export function allModels(shared = {}){
 const out = new Map();
 for(const g of GENERIC_MACHINES) out.set(g.id, {id:g.id, name:g.name, kind:'generic', baseId:g.id, exercise:g.exercise});
 for(const b of BUILTIN_BRANDS) out.set(b.id, {id:b.id, name:b.name, kind:'brand', baseId:b.baseId, manufacturer:b.manufacturer, model:b.model, exercise:b.exercise});
 for(const m of shared.machineModels||[]) if(!out.has(m.id)) out.set(m.id, {id:m.id, name:m.manufacturer&&m.model?`${m.manufacturer} ${m.model}`:m.name, kind:'brand', baseId:m.baseId||'', manufacturer:m.manufacturer, model:m.model, exerciseId:m.exerciseId||''});
 return out;
}
// 4.7.0 대표님: 제조사 모델은 마이로그에 등록된 헬스장이 많은 순서대로(머신 종류마다 따로)
export function gymCounts(shared = {}){
 const by = new Map(), seen = new Set();
 for(const g of shared.gymMachines||[]){ if(g.removed) continue; const k = `${g.gymKey||g.gymName}|${g.modelId}`; if(seen.has(k)) continue; seen.add(k); by.set(g.modelId, (by.get(g.modelId)||0) + 1); }
 return by;
}
export function makerCounts(shared = {}){
 const models = allModels(shared), counts = gymCounts(shared), by = new Map();
 for(const m of models.values()) if(m.manufacturer) by.set(m.manufacturer, (by.get(m.manufacturer)||0) + (counts.get(m.id)||0));
 return [...by.entries()].sort((a, b) => b[1]-a[1] || a[0].localeCompare(b[0])).map(([name, n]) => ({name, n}));
}
// 4.7.0 대표님: 같은 제조사·모델이라도 연식에 따라 핀식·원판식이 다르니 자동으로 채우지 않고 헬스장 머신마다 고르게 한다.
// 머신 종류마다 실제로 가능한 것만 보인다(케이블은 케이블, 스미스는 스미스 바, 원판식은 숫자 단계 없음).
export const SIDED_SHORT = {both:'양쪽 함께', iso:'좌우 따로 움직임', single:'한쪽씩'};
const baseOf = (models, id) => GENERIC_MACHINES.find(g => g.id===(models.get(id)?.baseId||id));
export function specOptions(baseLoad, load){
 // 대표님: 케이블·스미스까지 세세히 물으면 번거로움 → 기본값으로 자동(무게 표시는 운동 기록 화면의 kg·lb·숫자 단계 버튼으로 바꿀 수 있음)
 const o = baseLoad==='cable' ? {load:['cable'], sided:['both'], unit:['kg']}
  : baseLoad==='smith' ? {load:['smith'], sided:['both'], unit:['kg']}
  : baseLoad==='body' ? {load:['stack'], sided:['both'], unit:['kg']}
  : {load:['plate','stack'], sided:['both','iso'], unit:['kg','lb','level']};
 if(load==='plate') o.unit = ['kg','lb'];
 return o;
}
// 고를 게 하나뿐인 칸은 미리 채우고, 둘 이상이면 비워 둔다(사용자가 직접 고름)
export function startSpec(models, id, prev){
 if(prev) return {...prev};
 const o = specOptions(baseOf(models, id)?.load), sp = {};
 for(const k of ['load','sided','unit']) if(o[k].length===1) sp[k] = o[k][0];
 return sp;
}
export function specMissing(st, shared = {}){
 const models = allModels(shared); let n = 0;
 for(const id of st.checked){ const sp = st.spec?.[id] || {}, o = specOptions(baseOf(models, id)?.load, sp.load); if(!o.load.includes(sp.load) || !o.sided.includes(sp.sided) || !o.unit.includes(sp.unit)) n++; }
 return n;
}
// 이 헬스장에 등록된 머신 id(뺀 것 제외)
export function registeredAt(shared = {}, key = '', name = ''){
 return new Set((shared.gymMachines||[]).filter(g => !g.removed && (g.gymKey ? g.gymKey===key : g.gymName===name)).map(g => g.modelId));
}
export function newGymPicker(shared, settings, gymName){
 const key = gymKeyOf(settings, gymName), have = registeredAt(shared, key, gymName), spec = {};
 for(const g of shared.gymMachines||[]) if(!g.removed && have.has(g.modelId) && (g.gymKey ? g.gymKey===key : g.gymName===gymName) && g.spec) spec[g.modelId] = {...g.spec};
 return {gymName, key, part:'가슴', open:{}, checked:new Set(have), initial:new Set(have), spec, initialSpec:JSON.parse(JSON.stringify(spec)), adding:false};
}
export function pickMachine(st, shared, id, on){
 if(on){ st.checked.add(id); st.spec = st.spec||{}; st.spec[id] = startSpec(allModels(shared), id, st.spec[id]); } else st.checked.delete(id);
 return st;
}
export function setSpec(st, id, k, v){
 st.spec = st.spec||{}; let sp = {...(st.spec[id]||{}), [k]:v};
 if(k==='levelPreset'){ const [f, s2] = String(v).split('/').map(Number); delete sp.levelPreset; sp = {...sp, levelFirst:f, levelStep:s2}; }
 if(k==='levelFirst'||k==='levelStep'){ const n = Number(v); if(v===''||!(n>=0)) delete sp[k]; else sp[k] = n; }
 if(k==='unit' && v!=='level'){ delete sp.levelFirst; delete sp.levelStep; }
 if(k==='load' && v==='plate' && sp.unit==='level') delete sp.unit;
 st.spec[id] = sp; return st;
}
const specHTML = (st, models, id) => { const sp = st.spec?.[id]||{}, o = specOptions(baseOf(models, id)?.load, sp.load), miss = !o.load.includes(sp.load) || !o.sided.includes(sp.sided) || !o.unit.includes(sp.unit);
 if(o.load.length+o.sided.length+o.unit.length===3) return '<small class="gm-auto">기본값으로 등록돼요</small>';
 const grp = (k, label, opts, names) => opts.length<2 ? '' : `<div class="gm-spec-row"><span>${label}</span><div class="gm-seg">${opts.map(v => `<button type="button" class="${sp[k]===v?'on':''}" data-gm-spec="${h(id)}|${k}|${v}" aria-pressed="${sp[k]===v}">${h(names[v]||v)}</button>`).join('')}</div></div>`;
 const sug = sp.unit==='level' ? levelSuggest(st._shared||{}, id) : null;
 const lvl = sp.unit==='level' ? `<div class="gm-spec-row gm-level"><span>숫자 → kg</span><div class="gm-lv"><label>첫 칸<input type="number" inputmode="decimal" min="0" step="any" data-gm-level="${h(id)}|levelFirst" value="${h(sp.levelFirst??'')}" placeholder="5">kg</label><label>한 칸마다<input type="number" inputmode="decimal" min="0" step="any" data-gm-level="${h(id)}|levelStep" value="${h(sp.levelStep??'')}" placeholder="5">kg</label>${sug?`<button type="button" class="gm-sug" data-gm-spec="${h(id)}|levelPreset|${sug.first}/${sug.step}">다른 헬스장 ${sug.n}곳: 첫 칸 ${sug.first} · 한 칸 ${sug.step}kg</button>`:''}<small>머신 옆 라벨에 적혀 있어요. 모르면 비워 두세요. 첫 칸 5kg · 한 칸 5kg으로 추정해 계산하고, 나중에 고칠 수 있어요.</small></div></div>` : '';
 return `<div class="gm-spec${miss?' miss':''}">${miss?'<small class="gm-need">이 헬스장 머신을 보고 골라 주세요</small>':''}${grp('load','무게 방식',o.load,LOAD_LABEL)}${grp('sided','움직임',o.sided,SIDED_SHORT)}${grp('unit','무게 표시',o.unit,UNIT_LABEL)}${lvl}</div>`; };
export function gymPickerHTML(st, shared = {}, {admin = false} = {}){
 st._shared = shared;
 const models = allModels(shared), brandsBy = new Map(), cnt = gymCounts(shared), makers = makerCounts(shared);
 for(const m of models.values()) if(m.kind==='brand' && m.baseId){ if(!brandsBy.has(m.baseId)) brandsBy.set(m.baseId, []); brandsBy.get(m.baseId).push(m); }
 // 머신 종류도 이 종류(+제조사 모델)를 등록한 헬스장이 많은 순서로
 const score = g => (cnt.get(g.id)||0) + (brandsBy.get(g.id)||[]).reduce((t, b) => t + (cnt.get(b.id)||0), 0);
 const gens = GENERIC_MACHINES.filter(g => partOf(g)===st.part).sort((a, b) => score(b) - score(a));
 const missing = specMissing(admin ? st : {...st, checked:new Set([...st.checked].filter(id => !st.initial.has(id)))}, shared), changedSpec = [...st.checked].filter(id => st.initial.has(id) && JSON.stringify(st.spec?.[id]||{})!==JSON.stringify(st.initialSpec?.[id]||{})).length;
 const count = [...st.checked].length, added = [...st.checked].filter(x => !st.initial.has(x)).length, removed = [...st.initial].filter(x => !st.checked.has(x)).length;
 const box = (m, sub = false) => `<div class="gm-item"><label class="gm-row${sub?' sub':''}${!admin&&st.initial.has(m.id)?' locked':''}"><input type="checkbox" data-gm-pick="${h(m.id)}" ${st.checked.has(m.id)?'checked':''} ${!admin&&st.initial.has(m.id)?'disabled title="이미 등록된 머신이에요"':''}><span>${h(m.name)}${!sub&&m.exercise?`<small>${h(m.exercise)}</small>`:''}${sub&&cnt.get(m.id)?`<small>마이로그 헬스장 ${cnt.get(m.id)}곳</small>`:''}</span></label>${st.checked.has(m.id)&&(admin||!st.initial.has(m.id))?specHTML(st, models, m.id):!admin&&st.initial.has(m.id)?'<small class="gm-done">등록됨</small>':''}</div>`;
 return `<div class="gm gap"><p class="hint"><b>${h(st.gymName)}</b>에 있는 머신을 골라요. ${admin?'관리자라 저장하면 바로 이 헬스장을 쓰는 모든 사람에게 보여요.':'보내면 관리자가 확인한 뒤 이 헬스장을 쓰는 모든 사람에게 보여요.'} 제조사를 모르면 머신 종류만 골라도 돼요.</p>
 ${admin?'':`<p class="gm-key">이미 등록된 머신은 '등록됨'으로 보여요. 다른 분이 먼저 요청한 머신은 자동으로 건너뛰고, 한 번에 ${MAX_PER_SEND}개·하루 ${MAX_PER_DAY}개까지 보낼 수 있어요. 방식이 틀린 머신은 운영진에게 알려 주세요.</p>`}<p class="gm-key">${st.key.startsWith('kakao:')?'지도에서 찾은 장소라 같은 곳을 등록한 사람과 함께 써요.':'이름만 적은 장소예요. 지도에서 찾아 등록하면 다른 사람과 더 잘 맞춰져요.'}</p>
 <div class="chip-row gm-parts" role="tablist">${PARTS.map(p => `<button type="button" class="chip ${p===st.part?'active':''}" data-gm-part="${p}">${p}</button>`).join('')}</div>
 <div class="gm-list">${gens.map(g => { const bs = (brandsBy.get(g.id)||[]).sort((a, b) => (cnt.get(b.id)||0) - (cnt.get(a.id)||0) || a.name.localeCompare(b.name)), on = st.open[g.id] || bs.some(b => st.checked.has(b.id)); return `<div class="gm-group">${box(g)}${bs.length?`<button type="button" class="gm-toggle" data-gm-open="${h(g.id)}" aria-expanded="${on}">제조사 모델 ${bs.length}개 ${on?'접기':'펼치기'}</button>${on?`<div class="gm-brands">${bs.map(b => box(b, true)).join('')}</div>`:''}`:''}</div>`; }).join('') || '<p class="hint">이 부위의 머신 종류가 없어요.</p>'}</div>
 <details class="gm-add" ${st.adding?'open':''}><summary>목록에 없는 제조사 모델 더하기</summary><div class="form-grid"><label class="field">제조사<input id="gm-new-maker" maxlength="60" list="gm-makers" placeholder="예: Hammer Strength" autocomplete="off"><datalist id="gm-makers">${makers.map(x => `<option value="${h(x.name)}">${x.n?`헬스장 ${x.n}곳`:''}</option>`).join('')}</datalist></label><label class="field">모델<input id="gm-new-model" maxlength="80" placeholder="예: Iso-Lateral Row"></label><label class="field wide">어떤 머신 종류인가요<select id="gm-new-base">${GENERIC_MACHINES.map(g => `<option value="${h(g.id)}">${h(partOf(g))} · ${h(g.name)}</option>`).join('')}</select></label><button type="button" class="button secondary wide" id="gm-new-add">이 모델 더하고 고르기</button></div></details>
 <div class="gm-foot"><span>${count}개 선택${added?` · 새로 ${added}`:''}${removed?` · 뺌 ${removed}`:''}${changedSpec?` · 방식 바꿈 ${changedSpec}`:''}${missing?` · <b class="gm-need">방식 고를 것 ${missing}개</b>`:''}${!admin&&added>MAX_PER_SEND?` · <b class="gm-need">한 번에 ${MAX_PER_SEND}개까지</b>`:''}</span><button type="button" class="button" id="gm-save" ${(added||removed||changedSpec)&&!missing&&(admin||added<=MAX_PER_SEND)?'':'disabled'}>${admin?'저장':'등록 요청 보내기'}</button></div></div>`;
}
// 목록에 없는 모델: 관리자는 공용 machineModels로, 일반 사용자는 요청에 담을 임시 모델로
export function newModel(maker, model, baseId){
 const m = String(maker||'').trim(), n = String(model||'').trim(); if(!m || !n) throw Error('제조사와 모델을 입력해 주세요.');
 const base = GENERIC_MACHINES.find(g => g.id===baseId); if(!base) throw Error('머신 종류를 골라 주세요.');
 const exId = EXERCISE_CATALOG.find(x => x.name===base.exercise)?.id || '';
 return {id:brandModelId(m, n), name:`${m} ${n}`, manufacturer:m, model:n, baseId, exerciseId:exId, targetIds:[]};
}
// 저장할 것(관리자): 더한 것은 gymMachines 새로, 뺀 것은 removed:true
export function gymChanges(st, shared = {}){
 const models = allModels(shared), add = [], remove = [];
 for(const id of st.checked) if(!st.initial.has(id)) add.push({id:gymMachineId(st.key, id), name:`${st.gymName} · ${models.get(id)?.name||id}`.slice(0, 160), gymName:st.gymName, gymKey:st.key, modelId:id, spec:{...(st.spec?.[id]||{})}});
 for(const id of st.checked) if(st.initial.has(id) && JSON.stringify(st.spec?.[id]||{})!==JSON.stringify(st.initialSpec?.[id]||{})){ const cur = (shared.gymMachines||[]).find(g => g.modelId===id && !g.removed && (g.gymKey ? g.gymKey===st.key : g.gymName===st.gymName)); if(cur) add.push({...cur, spec:{...st.spec[id]}}); }
 for(const id of st.initial) if(!st.checked.has(id)){ const cur = (shared.gymMachines||[]).find(g => g.modelId===id && !g.removed && (g.gymKey ? g.gymKey===st.key : g.gymName===st.gymName)); if(cur) remove.push({...cur, removed:true}); }
 return {add, remove};
}
// 일반 사용자 요청: 머신 하나당 요청 하나(기존 등록 요청 형식). 메모에 모델 id·헬스장 키를 넣어 관리자가 한 번에 승인.
export function gymRequests(st, shared = {}){
 const models = allModels(shared);
 return [...st.checked].filter(id => !st.initial.has(id)).map(id => { const m = models.get(id)||{}; const base = GENERIC_MACHINES.find(g => g.id===(m.baseId||id)); return {type:'machine', mode:'manual', name:base?.exercise||'', manufacturer:m.manufacturer||'일반 머신', model:m.model||m.name||id, gymName:st.gymName, targetIds:[], note:`[헬스장 머신] modelId=${encodeURIComponent(id)} gymKey=${encodeURIComponent(st.key)} spec=${[st.spec?.[id]?.load||'',st.spec?.[id]?.sided||'',st.spec?.[id]?.unit||'',st.spec?.[id]?.levelFirst??'',st.spec?.[id]?.levelStep??''].join('_')}${m.kind==='brand'&&!String(id).startsWith('bm:')&&!String(id).startsWith('gm:')?` base=${encodeURIComponent(m.baseId)}`:''}`.slice(0, 1000)}; });
}
// 요청 메모에서 모델·헬스장 키 읽기(관리자 승인 때)
export function parseGymRequest(note = ''){
 const m = /\[헬스장 머신\] modelId=(\S+) gymKey=(\S+)(?: spec=(\S*))?(?: base=(\S+))?/.exec(String(note)); const d = v => { try{ return decodeURIComponent(v||''); }catch{ return v||''; } }; if(!m) return null; const [load, sided, unit, lf, ls] = (r => r.split(r.includes('_') ? '_' : '.'))(String(m[3]||'')); const spec = load||sided||unit ? {load, sided, unit, ...(lf!==undefined&&lf!==''?{levelFirst:Number(lf)}:{}), ...(ls!==undefined&&ls!==''?{levelStep:Number(ls)}:{})} : null; return {modelId:d(m[1]), gymKey:d(m[2]), baseId:d(m[4]), spec};
}

// 4.7.0 중복 방지(대표님: 한 헬스장 머신을 여러 사람이 중복 등록하거나 관리자에게 무분별한 요청이 오면 안 됨)
// 1) 요청 문서 ID를 '헬스장+머신'으로 고정한다 → 같은 요청은 서버에 한 건만 생긴다(이미 있으면 Firestore 규칙상 덮어쓰기 불가 → 건너뜀).
// 2) 이미 등록된 머신은 일반 사용자 화면에서 체크 해제·재요청이 안 된다(빼기는 관리자만).
// 3) 한 번에 보낼 수 있는 수와 하루에 보낼 수 있는 수를 제한한다(이 기기 기준).
const fnv = str => { let h = 0x811c9dc5; for(const ch of String(str)){ h ^= ch.codePointAt(0); h = Math.imul(h, 0x01000193) >>> 0; } return h.toString(36); };
export const gymRequestId = (gymKey, modelId) => `gymreq_${fnv(gymKey)}_${fnv(modelId)}`;
export const MAX_PER_SEND = 40, MAX_PER_DAY = 80;
export function requestQuota(now = new Date()){
 const day = now.toISOString().slice(0,10); let st = {day, n:0};
 try{ const v = JSON.parse(globalThis.localStorage?.getItem('mylogue.gymReqQuota')||'null'); if(v?.day===day) st = v; }catch{}
 return {...st, left:Math.max(0, MAX_PER_DAY - st.n)};
}
export function useQuota(n, now = new Date()){ const q = requestQuota(now); try{ globalThis.localStorage?.setItem('mylogue.gymReqQuota', JSON.stringify({day:q.day, n:q.n + n})); }catch{} }

// 4.7.0 숫자 단계 → kg(대표님: 볼륨에서 빠지면 서운함). 헬스장 머신에 적은 첫 칸·한 칸 무게로, 없으면 5·5kg 추정.
export const LEVEL_DEFAULT = {first:5, step:5};
export function levelToKg(spec, n){ const v = Number(n); if(!(v>0)) return {kg:0, est:false}; const f = Number(spec?.levelFirst), s = Number(spec?.levelStep), est = !(f>=0 && s>=0 && spec?.levelFirst!=null && spec?.levelStep!=null); const first = est ? LEVEL_DEFAULT.first : f, step = est ? LEVEL_DEFAULT.step : s; return {kg:Math.round((first + (v-1)*step)*100)/100, est}; }
// 같은 모델을 다른 헬스장에서 등록한 값 중 가장 많은 것
export function levelSuggest(shared = {}, modelId = ''){
 if(String(modelId).startsWith('gm:')) return null;
 const c = new Map(); for(const g of shared.gymMachines||[]) if(!g.removed && g.modelId===modelId && g.spec?.unit==='level' && g.spec.levelFirst!=null && g.spec.levelStep!=null){ const k = `${g.spec.levelFirst}/${g.spec.levelStep}`; c.set(k, (c.get(k)||0) + 1); }
 const best = [...c.entries()].sort((a, b) => b[1]-a[1])[0]; if(!best) return null; const [f, s] = best[0].split('/').map(Number); return {first:f, step:s, n:best[1]};
}
