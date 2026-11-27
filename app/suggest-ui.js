import {exArtHTML} from './exercise-art-ui.js';
import {MASS} from './domain.js';
// 3.14.0 검색어 추천 화면: 검색창 바로 아래 가로 캡슐(최대 5개) → 대분류를 누르면 소분류 목록.
import {matchScore, rankItems, normKey} from './suggest.js';
import {FOOD_CATALOG} from './food-catalog.js';
import {genericMachinesFor, brandMachinesAt, needsMachine, brandsOf} from './machines-catalog.js';
import {EXERCISE_CATALOG} from './catalog.js';

const h = v => String(v??'').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmt = v => Number(v||0).toLocaleString('ko-KR', {maximumFractionDigits:0});
export const popKey = t => String(t||'').toLocaleLowerCase('ko').replace(/[\s·()\-_.,]/g,'').replace(/\//g,'_').slice(0,120)||'_';
export const foodKeyOf = x => `${String(x.name).toLocaleLowerCase('ko')}|${x.servingUnit||'g'}`;

// ── 음식 ──
const GROUPS = (() => { const m = new Map(); for(const f of FOOD_CATALOG){ const g = m.get(f.group) || {name:f.group, aliases:new Set([f.group])}; for(const a of f.aliases||[]) a.length<=6 && g.aliases.add(a); m.set(f.group, g); } return [...m.values()].map(g => ({name:g.name, aliases:[...g.aliases]})); })();
export const foodGroupOf = item => item.group || GROUPS.find(g => normKey(item.name).includes(normKey(g.name)))?.name || '';
export function mealCounts(meals=[]){ const c = new Map(); for(const m of meals){ const k = normKey(m.name); c.set(k, (c.get(k)||0) + 1); } return c; }

export function foodSuggestions(query, foods, {meals=[], pop={}}={}){
 const q = String(query||'').trim(); if(!q) return {chips:[]};
 const mine = mealCounts(meals), g = pop.foods||{};
 const groups = GROUPS.map(gr => { const members = foods.filter(f => foodGroupOf(f)===gr.name); return {kind:'group', name:gr.name, names:[gr.name, ...gr.aliases], m:members.reduce((s, f) => s + (mine.get(normKey(f.name))||0), 0), g:members.reduce((s, f) => s + (g[popKey(f.name)]||0), 0), size:members.length}; }).filter(x => x.size);
 const rankedGroups = rankItems(q, groups, {names:x => x.names, mine:x => x.m, global:x => x.g});
 const loose = foods.filter(f => !foodGroupOf(f));
 const rankedItems = rankItems(q, loose, {names:x => [x.name, ...(x.aliases||[])], mine:x => mine.get(normKey(x.name))||0, global:x => g[popKey(x.name)]||0});
 const chips = [...rankedGroups.map(r => ({kind:'group', label:r.x.name, key:r.x.name, mine:r.m})), ...rankedItems.map(r => ({kind:'item', label:r.x.name, key:foodKeyOf(r.x), mine:r.m}))].slice(0, 5);
 return {chips};
}
// 대분류 안의 제품: 내가 많이 먹은 순 → 전체 사용자가 많이 먹은 순 → 대표값
export function foodGroupItems(group, foods, {meals=[], pop={}}={}){
 const mine = mealCounts(meals), g = pop.foods||{};
 return foods.filter(f => foodGroupOf(f)===group).map(f => ({f, m:mine.get(normKey(f.name))||0, gl:g[popKey(f.name)]||0, base:f.source==='대표값'}))
  .sort((a, b) => b.m - a.m || (b.gl>0) - (a.gl>0) || b.gl - a.gl || a.base - b.base || a.f.name.localeCompare(b.f.name, 'ko'));
}
export function foodSuggestHTML(state, foods, ctx){
 const {chips} = foodSuggestions(state.query, foods, ctx);
 const open = state.sgGroup ? foodGroupItems(state.sgGroup, foods, ctx) : [];
 return `${chips.length?`<div class="sg-chips" role="listbox" aria-label="검색어 추천">${chips.map(c => c.kind==='group' ? `<button type="button" class="sg-chip group ${state.sgGroup===c.key?'on':''}" data-sg-food-group="${h(c.key)}" aria-expanded="${state.sgGroup===c.key}">${h(c.label)}<span aria-hidden="true">▾</span></button>` : `<button type="button" class="sg-chip" data-q-food="${h(c.key)}">${h(c.label)}</button>`).join('')}</div>`:''}${open.length?`<div class="sg-list" aria-label="${h(state.sgGroup)} 제품"><p class="sg-list-head">${h(state.sgGroup)}</p>${open.slice(0, 12).map(({f, m, gl, base}) => `<button type="button" class="sg-row${f.personal?' mine-value':''}" data-q-food="${h(foodKeyOf(f))}"><b>${h(f.name)}${f.personal?'<em class="mine-badge">내 값</em>':''}</b><small>${f.calories!=null?`${fmt(f.calories)}kcal/${MASS.has(f.servingUnit)?`100${f.servingUnit}`:`1${h(f.servingUnit||'회')}${f.unitGrams?`(${f.unitGrams}g)`:''}`}`:''}${m?`<i class="sg-n">${m}회</i>`:''}</small></button>`).join('')}</div>`:''}`;
}

// ── 운동 ──
export function exerciseCounts(workouts=[]){ const ex = new Map(), mc = new Map(), none = new Map(); for(const w of workouts) for(const e of w.exercises||[]){ const n = (e.sets||[]).filter(s => s.completed!==false).length || (e.kind==='cardio'?1:0); if(!n) continue; const k = e.exerciseId || e.name; ex.set(k, (ex.get(k)||0) + 1); if(e.machineId) mc.set(e.machineId, (mc.get(e.machineId)||0) + 1); else none.set(k, (none.get(k)||0) + 1); } return {ex, mc, none}; }
export function exerciseSuggestions(query, catalog, {workouts=[], pop={}}={}){
 const q = String(query||'').trim(); if(!q) return [];
 const {ex} = exerciseCounts(workouts), g = pop.exercises||{};
 return rankItems(q, catalog, {names:x => [x.name, ...(x.aliases||[])], mine:x => ex.get(x.id||x.name)||0, global:x => g[popKey(x.id||x.name)]||0, limit:5}).map(r => r.x);
}
// 종목 안의 머신: 머신 종류 → 내가 쓴 머신·제조사 모델 → 나머지. 앱 기본 제조사 모델은 종류 아래에 접어 둔다.
export function machineChoices(exerciseId, {db={}, shared={}, gymName='', gymKey='', pop={}}={}){
 const {mc, none} = exerciseCounts(db.workouts||[]), g = pop.machines||{};
 const ex = EXERCISE_CATALOG.find(x => x.id===exerciseId);
 const atGym = new Set(brandMachinesAt(shared, gymName, exerciseId, gymKey).filter(m => m.generic).map(m => m.id));
 const generic = genericMachinesFor(exerciseId).filter(m => !atGym.has(m.id)).map(m => ({m, tag:'일반'}));
 const free = ex && !needsMachine(ex) ? [{m:{id:'', name:'머신 없이', free:true}, tag:ex.equipment||'프리웨이트', n:none.get(exerciseId)||0}] : [];
 const mine = (db.machines||[]).filter(m => m.exerciseId===exerciseId && (!gymName || !m.location || m.location===gymName)).map(m => ({m, tag:'내 머신', n:mc.get(m.id)||0}));
 const brands = brandMachinesAt(shared, gymName, exerciseId, gymKey).map(m => ({m, tag:'이 헬스장', n:mc.get(m.id)||0, gl:(g[popKey(m.id)]||0) + 1000}));
 // 내가 쓴 적 있는 앱 기본 제조사 모델은 위로 올린다.
 const builtinUsed = generic.flatMap(({m:gm}) => brandsOf(gm.id)).map(m => ({m, tag:gmName(m), n:mc.get(m.id)||0})).filter(x => x.n>0);
 brands.push(...builtinUsed);
 const used = [...mine, ...brands, ...free].filter(x => x.n>0).sort((a, b) => b.n - a.n);
 const rest = [...mine, ...brands].filter(x => !x.n).sort((a, b) => (b.gl||0) - (a.gl||0));
 // 4.7.0 이 헬스장에 등록된 머신은 맨 위(이미 쓴 것은 '자주 쓴 것' 순서대로)
 return [...rest.filter(x => x.m.atGym), ...generic, ...used, ...rest.filter(x => !x.m.atGym), ...free.filter(x => !x.n)];
}
const gmName = b => genericMachinesFor(b.exerciseId||'').find(g => g.id===b.baseId)?.name || '';
export function exerciseSuggestHTML(state, catalog, ctx){
 const chips = exerciseSuggestions(state.query, catalog, ctx);
 const open = state.sgEx ? machineChoices(state.sgEx, ctx) : [];
 const label = m => m.generic || m.free ? m.name : `${m.manufacturer||''} ${m.model||m.name||''}`.trim();
 const row = ({m, tag, n}, sub) => `<button type="button" class="sg-row${m.free?' plain':''}${sub?' sub':''}" data-sg-pick="${h(state.sgEx)}" data-sg-machine="${h(m.id)}"><b>${m.makerLabel&&!m.generic&&!m.free?`<span class="m-maker">${h(m.makerLabel)}</span><span class="m-model">${h(m.modelLabel)}</span>`:h(label(m))}</b><small>${h(m.lineLabel&&tag===m.line?m.lineLabel:tag)}${n?`<i class="sg-n">${n}회</i>`:''}</small></button>`;
 const item = x => { if(!x.m.generic) return row(x); const bs = brandsOf(x.m.id), on = state.sgBrand===x.m.id; return `<div class="sg-row-wrap">${row(x)}${bs.length?`<button type="button" class="sg-brand-toggle ${on?'on':''}" data-sg-brand="${h(x.m.id)}" aria-expanded="${on}">제조사 ${bs.length}<span aria-hidden="true">▾</span></button>`:''}</div>${on?bs.map(b => row({m:b, tag:b.line}, true)).join(''):''}`; };
 return `${chips.length?`<div class="sg-chips" role="listbox" aria-label="종목 추천">${chips.map(x => { const has = machineChoices(x.id||x.name, ctx).some(c => !c.m.free); return `<button type="button" class="sg-chip ${has?'group':''} ${state.sgEx===(x.id||x.name)?'on':''}" ${has?`data-sg-ex="${h(x.id||x.name)}" aria-expanded="${state.sgEx===(x.id||x.name)}"`:`data-q-ex="${h(x.id||x.name)}"`}>${exArtHTML(x.name)}${h(x.name)}${has?'<span aria-hidden="true">▾</span>':''}</button>`; }).join('')}</div>`:''}${open.length?`<div class="sg-list" aria-label="머신 고르기"><p class="sg-list-head">머신 고르기</p>${open.slice(0, 16).map(item).join('')}</div>`:''}`;
}
