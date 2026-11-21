// 3.19.0 탄단지 목표를 영양소마다 다른 방식으로 정한다(대표님 요청).
// 방식: ratio(목표 칼로리의 %), perKg(최근 체중 × g), grams(고정 g), rest(나머지 칼로리를 비율로 나눠 가짐)
// 결과는 기존과 같은 settings.calorieGoal·carbsGoal·proteinGoal·fatGoal(g)로 저장해 다른 화면은 그대로 동작한다.
// 체중 대비 방식은 체중이 바뀌면 다시 계산한다(refreshMacroGoals).
const esc = v => String(v??'').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const KCAL = {carbs:4, protein:4, fat:9};
export const MACROS = [['carbs','탄수화물','탄'], ['protein','단백질','단'], ['fat','지방','지']];
export const MODES = [['ratio','비율 %'], ['perKg','체중 × g'], ['grams','고정 g'], ['rest','나머지']];
const r1 = v => Math.round(v*10)/10;
const n0 = v => Math.round(Number(v)||0).toLocaleString('ko-KR');

// 지금 저장된 목표에서 계획을 만든다(처음 열 때)
export function planFromSettings(s={}){
 if(s.goalMode==='plan' && s.macroPlan?.rules) return structuredClone(s.macroPlan);
 if(s.goalMode==='ratio') return {calorieGoal:Number(s.calorieGoal)||2000, rules:{carbs:{mode:'ratio', value:Number(s.carbsPctGoal)||40}, protein:{mode:'ratio', value:Number(s.proteinPctGoal)||30}, fat:{mode:'ratio', value:Number(s.fatPctGoal)||30}}};
 if(Number(s.carbsGoal) || Number(s.proteinGoal) || Number(s.fatGoal)) return {calorieGoal:Number(s.calorieGoal)||2000, rules:{carbs:{mode:'grams', value:Number(s.carbsGoal)||0}, protein:{mode:'grams', value:Number(s.proteinGoal)||0}, fat:{mode:'grams', value:Number(s.fatGoal)||0}}};
 return {calorieGoal:Number(s.calorieGoal)||2000, rules:{carbs:{mode:'ratio', value:40}, protein:{mode:'ratio', value:30}, fat:{mode:'ratio', value:30}}};
}

// 빠른 선택(초보자도 고르기 쉽게)
export const PRESETS = [
 {id:'balance', label:'균형 40·30·30', rules:{carbs:{mode:'ratio', value:40}, protein:{mode:'ratio', value:30}, fat:{mode:'ratio', value:30}}},
 {id:'protein', label:'단백질 체중×2 · 지방 25% · 나머지 탄수', rules:{protein:{mode:'perKg', value:2}, fat:{mode:'ratio', value:25}, carbs:{mode:'rest', value:1}}},
 {id:'muscle', label:'단백질 체중×1.8 · 탄수 체중×4 · 나머지 지방', rules:{protein:{mode:'perKg', value:1.8}, carbs:{mode:'perKg', value:4}, fat:{mode:'rest', value:1}}},
 {id:'lowcarb', label:'저탄수 · 탄수 체중×1 · 단백질 체중×1.6 · 나머지 지방', rules:{carbs:{mode:'perKg', value:1}, protein:{mode:'perKg', value:1.6}, fat:{mode:'rest', value:1}}},
];

// 계획 → g·kcal·%. weight가 없는데 체중 대비 방식이면 error.
export function computeMacroPlan(plan, weight){
 const kcal = Math.max(0, Number(plan?.calorieGoal)||0), rules = plan?.rules||{}, g = {}, err = [];
 let used = 0;
 for(const [k, label] of MACROS){
  const r = rules[k]||{mode:'rest', value:1}, v = Math.max(0, Number(r.value)||0);
  if(r.mode==='rest') continue;
  if(r.mode==='perKg' && !(weight>0)){ err.push(`${label}을(를) 체중 대비로 계산하려면 체중 기록이 필요해요.`); g[k] = 0; continue; }
  g[k] = r.mode==='ratio' ? kcal*v/100/KCAL[k] : r.mode==='perKg' ? v*weight : v;
  used += g[k]*KCAL[k];
 }
 const rest = MACROS.map(([k]) => k).filter(k => (rules[k]||{mode:'rest'}).mode==='rest');
 const remaining = kcal - used;
 if(rest.length){
  if(remaining<0) err.push(`정해 둔 영양소만으로 목표 칼로리를 ${n0(-remaining)} kcal 넘어요. 값을 줄이거나 칼로리를 올려 주세요.`);
  const w = rest.map(k => Math.max(0, Number(rules[k]?.value)||1)), sum = w.reduce((a, b) => a+b, 0)||1;
  rest.forEach((k, i) => { g[k] = Math.max(0, remaining)*w[i]/sum/KCAL[k]; });
 }
 for(const [k] of MACROS) g[k] = r1(g[k]||0);
 const kc = Object.fromEntries(MACROS.map(([k]) => [k, g[k]*KCAL[k]]));
 const total = kc.carbs + kc.protein + kc.fat;
 const pct = Object.fromEntries(MACROS.map(([k]) => [k, total ? Math.round(kc[k]/total*100) : 0]));
 const diff = Math.round(total - kcal);
 if(!rest.length && Math.abs(diff)>Math.max(30, kcal*0.03)) err.push(`탄단지 합계가 ${n0(total)} kcal로 목표(${n0(kcal)} kcal)와 ${diff>0?'+':''}${n0(diff)} kcal 차이 나요. '나머지'를 하나 두면 자동으로 맞춰져요.`);
 const ratioSum = MACROS.filter(([k]) => rules[k]?.mode==='ratio').reduce((a, [k]) => a+(Number(rules[k].value)||0), 0);
 if(MACROS.every(([k]) => rules[k]?.mode==='ratio') && Math.abs(ratioSum-100)>0.5) err.push(`비율 합계가 ${r1(ratioSum)}%예요. 100%로 맞춰 주세요.`);
 return {g, kcal:kc, pct, total:Math.round(total), goal:kcal, diff, errors:err};
}

export const ruleLabel = (r, weight) => r?.mode==='ratio' ? '비율' : r?.mode==='perKg' ? `체중 × ${r1(r.value)}${weight?'':''}` : r?.mode==='grams' ? '고정' : '나머지';

// 계획을 저장 형식으로
export function applyMacroPlan(settings={}, plan, weight){
 const c = computeMacroPlan(plan, weight);
 if(c.errors.length) throw Error(c.errors[0]);
 return {...settings, goalMode:'plan', macroPlan:{...structuredClone(plan), weightUsed:weight||null}, calorieGoal:c.goal, carbsGoal:c.g.carbs, proteinGoal:c.g.protein, fatGoal:c.g.fat, carbsPctGoal:c.pct.carbs, proteinPctGoal:c.pct.protein, fatPctGoal:c.pct.fat};
}
// 체중 대비 방식이면 최근 체중으로 다시 계산(체중이 바뀌었을 때만). 바뀌지 않으면 같은 객체를 돌려준다.
export function refreshMacroGoals(settings={}, weight){
 const p = settings.macroPlan;
 if(!p?.rules || !(weight>0) || !Object.values(p.rules).some(r => r.mode==='perKg') || p.weightUsed===weight) return settings;
 try{ return applyMacroPlan(settings, p, weight); }catch{ return settings; }
}

// 식단 화면 목표 카드(탄단지 고유 색, 방식 표시, 수정·제안 버튼)
export function macroPlanCardHTML(settings={}, weight){
 const has = Number(settings.calorieGoal)>0;
 const plan = planFromSettings(settings), c = computeMacroPlan(plan, weight);
 const g = has ? {carbs:Number(settings.carbsGoal)||0, protein:Number(settings.proteinGoal)||0, fat:Number(settings.fatGoal)||0} : c.g;
 const tot = g.carbs*4 + g.protein*4 + g.fat*9 || 1;
 const pct = k => Math.round(g[k]*KCAL[k]/tot*100);
 return `<div class="mplan-card"><div class="mplan-head"><div><small>목표 칼로리</small><b>${has?n0(settings.calorieGoal):'—'}<span> kcal</span></b></div><div class="mplan-actions"><button type="button" class="button secondary small" id="gw-open">제안해 주세요</button><button type="button" class="button small" data-modal="macro-plan">수정</button></div></div>${has?`<div class="mplan-bar" aria-hidden="true">${MACROS.map(([k]) => `<i class="m-${k}" style="width:${pct(k)}%"></i>`).join('')}</div><div class="mplan-list">${MACROS.map(([k, label]) => `<div class="mplan-item m-${k}"><span class="dot"></span><span class="mplan-name">${label}</span><b>${n0(g[k])}g</b><small>${pct(k)}% · ${esc(plan.rules?.[k] ? ruleLabel(plan.rules[k]) : '')}</small></div>`).join('')}</div>${plan.rules&&Object.values(plan.rules).some(r => r.mode==='perKg')?`<p class="hint mplan-note">체중 대비 값은 최근 체중 ${weight?`${r1(weight)}kg`:'(기록 없음)'} 기준이며, 체중이 바뀌면 자동으로 다시 계산돼요.</p>`:''}`:'<p class="hint">아직 목표가 없어요. ‘제안해 주세요’로 시작하거나 ‘수정’에서 직접 정해요.</p>'}</div>`;
}

// 수정 창
export function macroPlanFormHTML(plan, weight){
 const c = computeMacroPlan(plan, weight);
 const row = ([k, label]) => { const r = plan.rules?.[k]||{mode:'rest', value:1}; const unit = r.mode==='ratio' ? '%' : r.mode==='perKg' ? 'g/kg' : r.mode==='grams' ? 'g' : '몫'; return `<div class="mp-row m-${k}"><div class="mp-row-head"><span class="dot"></span><b>${label}</b><span class="mp-result">${n0(c.g[k])}g · ${c.pct[k]}%</span></div><div class="seg mp-modes" role="group" aria-label="${label} 정하는 방식">${MODES.map(([m, ml]) => `<button type="button" class="${r.mode===m?'active':''}" data-mp-mode="${k}:${m}" aria-pressed="${r.mode===m}">${ml}</button>`).join('')}</div><label class="mp-val"><input type="number" inputmode="decimal" step="0.1" min="0" data-mp-value="${k}" value="${esc(r.value)}" aria-label="${label} 값"><span>${unit}</span></label>${r.mode==='perKg'?`<small class="hint">${weight?`최근 체중 ${r1(weight)}kg × ${r1(r.value)} = ${n0(c.g[k])}g`:'체중 기록이 필요해요'}</small>`:r.mode==='rest'?'<small class="hint">다른 영양소를 채우고 남은 칼로리를 가져가요(나머지가 둘이면 이 숫자 비율로 나눠요)</small>':''}</div>`; };
 return `<form id="macro-plan-form" class="mp-form"><label class="field">목표 칼로리(kcal)<input type="number" inputmode="numeric" min="800" max="6000" step="10" data-mp-kcal value="${esc(plan.calorieGoal)}"></label>
 <div class="mp-presets"><small>빠른 선택</small>${PRESETS.map(p => `<button type="button" class="chip" data-mp-preset="${p.id}">${esc(p.label)}</button>`).join('')}</div>
 ${MACROS.map(row).join('')}
 <div class="mp-sum"><div class="mplan-bar" aria-hidden="true">${MACROS.map(([k]) => `<i class="m-${k}" style="width:${c.pct[k]}%"></i>`).join('')}</div><p>합계 <b>${n0(c.total)} kcal</b> · 목표 ${n0(c.goal)} kcal</p>${c.errors.map(e => `<p class="mp-err">${esc(e)}</p>`).join('')}</div>
 <div class="actions"><button class="button" type="submit" ${c.errors.length?'disabled':''}>이 목표로 저장</button><button class="button secondary" type="button" id="gw-open">제안해 주세요</button></div></form>`;
}
