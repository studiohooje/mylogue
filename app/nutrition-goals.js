const esc=value=>String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
const positive=value=>Math.max(0,Number(value)||0);
const round=value=>Math.round(value*10)/10;

export function goalSettingsHTML(settings={}){
 const s=settings,mode=s.goalMode==='ratio'?'ratio':'grams';
 return `<section class="card nutrition-settings"><h3>일일 식단 목표</h3><div class="gw-entry"><div><b>잘 모르겠다면 추천받기</b><small>나이·키·체중·목표로 유지 칼로리를 계산하고 칼로리·탄단지 비율을 여러 개 제안해요.</small></div><button type="button" class="button" id="gw-open">추천받아 정하기</button></div><p class="hint">직접 정하려면(고급) 아래에 g 또는 열량 비율로 입력하세요. 비율 모드에서는 목표 칼로리로 g을 계산합니다.</p><form id="goal-form" class="form-grid"><label class="field">목표 설정 방식<select name="goalMode"><option value="grams" ${mode==='grams'?'selected':''}>탄단지 g 직접 입력</option><option value="ratio" ${mode==='ratio'?'selected':''}>탄단지 열량 비율 %</option></select></label><label class="field">목표 칼로리 kcal<input name="calorieGoal" type="number" min="0" value="${esc(s.calorieGoal??2200)}"></label><label class="field">탄수화물 g<input name="carbsGoal" type="number" min="0" step="any" value="${esc(s.carbsGoal??250)}"></label><label class="field">단백질 g<input name="proteinGoal" type="number" min="0" step="any" value="${esc(s.proteinGoal??150)}"></label><label class="field">지방 g<input name="fatGoal" type="number" min="0" step="any" value="${esc(s.fatGoal??70)}"></label><div class="field wide"><strong>탄단지 목표 열량 비율</strong><p class="hint">비율 모드에서는 세 값을 합쳐 100%로 입력합니다.</p></div><label class="field">탄수화물 %<input name="carbsPctGoal" type="number" min="0" max="100" step="any" value="${esc(s.carbsPctGoal??40)}"></label><label class="field">단백질 %<input name="proteinPctGoal" type="number" min="0" max="100" step="any" value="${esc(s.proteinPctGoal??30)}"></label><label class="field">지방 %<input name="fatPctGoal" type="number" min="0" max="100" step="any" value="${esc(s.fatPctGoal??30)}"></label><label class="field wide">바벨 자체 중량 kg<input name="barbellWeightKg" type="number" min="0" step="0.5" value="${esc(s.barbellWeightKg??20)}"></label><button class="button wide">목표 저장</button></form></section>`;
}

export function saveGoalSettings(settings={},data={}){
 const mode=data.goalMode==='ratio'?'ratio':'grams';
 const out={...settings,goalMode:mode,calorieGoal:positive(data.calorieGoal),barbellWeightKg:positive(data.barbellWeightKg),carbsPctGoal:positive(data.carbsPctGoal),proteinPctGoal:positive(data.proteinPctGoal),fatPctGoal:positive(data.fatPctGoal)};
 if(mode==='ratio'){
  const sum=out.carbsPctGoal+out.proteinPctGoal+out.fatPctGoal;
  if(Math.abs(sum-100)>0.001)throw Error('탄단지 목표 비율의 합계를 100%로 맞춰 주세요.');
  out.carbsGoal=round(out.calorieGoal*out.carbsPctGoal/100/4);
  out.proteinGoal=round(out.calorieGoal*out.proteinPctGoal/100/4);
  out.fatGoal=round(out.calorieGoal*out.fatPctGoal/100/9);
 }else{
  out.carbsGoal=positive(data.carbsGoal);out.proteinGoal=positive(data.proteinGoal);out.fatGoal=positive(data.fatGoal);
 }
 return out;
}

// 3.8.0 홈 '오늘 식단' 카드: 칼로리·탄단지를 목표선과 함께. 넘친 만큼은 다른 색, 모자란 만큼은 숫자로.
const num=(v,d=0)=>Number(v||0).toLocaleString('ko-KR',{maximumFractionDigits:d});
export const MACRO_ROWS=[['kcal','칼로리','calories','calorieGoal','kcal'],['carbs','탄수화물','carbs','carbsGoal','g'],['protein','단백질','protein','proteinGoal','g'],['fat','지방','fat','fatGoal','g']];
export function macroStatus(actual,goal){
 const a=Math.max(0,Number(actual)||0),g=Math.max(0,Number(goal)||0);
 if(!g)return {state:'none',diff:0,scale:Math.max(a,1)};
 const diff=a-g,tol=g*0.05;
 return {state:Math.abs(diff)<=tol?'met':diff>0?'over':'under',diff,scale:Math.max(g*1.25,a)};
}
// 3.18.0 막대 축(대표님 결정): 평소엔 막대 끝 = 목표×1.25(목표선 80% 자리). 어느 하나라도 막대 끝을 넘으면
// 네 막대 모두 끝을 목표×2로, 그것도 넘으면 ×4, ×8…로 함께 늘린다. 넘친 부분은 붉은 줄무늬, 예정분(아직 안 먹음)은 반투명.
export function sharedScale(pairs){
 let m = 1.25;
 const worst = Math.max(0, ...pairs.filter(([, g]) => g>0).map(([t, g]) => t/g));
 while(worst>m) m = m===1.25 ? 2 : m*2;
 return m;
}
export function barParts(a, g, p=0, m=1.25){
 a = Math.max(0, Number(a)||0); g = Math.max(0, Number(g)||0); p = Math.max(0, Number(p)||0);
 const total = a + p;
 if(!g){ const sc = Math.max(total, 1); return {fill:a/sc*100, over:0, mark:0, plan:p/sc*100, planLeft:a/sc*100, m}; }
 const sc = m*g, cap = v => Math.min(v, sc), mark = 100/m;
 return {fill:Math.min(a, g)/sc*100, over:a>g ? (cap(a)-g)/sc*100 : 0, mark, plan:(cap(total)-cap(a))/sc*100, planLeft:cap(a)/sc*100, m};
}
const pct = v => `${Math.max(0, v).toFixed(1)}%`;
export function barInner(a, g, p=0, m=1.25){
 const b = barParts(a, g, p, m);
 return `<b style="width:${pct(b.fill)}"></b>${b.over?`<s style="left:${pct(b.mark)};width:${pct(b.over)}"></s>`:''}${b.plan?`<em class="plan" style="left:${pct(b.planLeft)};width:${pct(b.plan)}"></em>`:''}${g?`<u style="left:${pct(b.mark)}"></u>`:''}`;
}
// 4.0.0 대표님 지시: 넘친 영양소 막대만 늘린다(다른 막대는 그대로)
export const rowAxis = (total, g) => sharedScale([[total, g]]);
const axisOf = (day, settings, extra) => sharedScale(MACRO_ROWS.map(([, , key, gk]) => [(Number(day[key])||0)+extra(key), Number(settings[gk])||0]));
const axisNote = m => m>1.25 ? `<span class="axis-note" title="많이 넘친 항목이 있어 모든 막대의 끝을 목표의 ${m}배로 늘렸어요">막대 끝 = 목표×${m}</span>` : '';
export function macroGoalsHTML(day={},settings={},{meals=0,planned=null,plannedCount=0,showPlanned=false}={}){
 const hasGoal=MACRO_ROWS.some(([, , ,gk])=>Number(settings[gk])>0);
 const extra=k=>showPlanned&&planned?Number(planned[k])||0:0;
 const kcal=macroStatus((Number(day.calories)||0)+extra('calories'),settings.calorieGoal);
 const head=kcal.state==='none'?'':kcal.state==='over'?`<span class="macro-chip over">+${num(kcal.diff)} kcal 초과</span>`:kcal.state==='under'?`<span class="macro-chip under">${num(-kcal.diff)} kcal 남음</span>`:'<span class="macro-chip met">✓ 목표 달성</span>';
 const rows=MACRO_ROWS.map(([cls,label,key,gk,unit])=>{
  const a=Number(day[key])||0,e=extra(key),g=Number(settings[gk])||0,s=macroStatus(a+e,g),d=unit==='g'?1:0;
  const note=s.state==='none'?'<em class="macro-note">목표 없음</em>':s.state==='over'?`<em class="macro-note over">+${num(s.diff,d)}${unit} 초과</em>`:s.state==='under'?`<em class="macro-note under">${num(-s.diff,d)}${unit} 부족</em>`:'<em class="macro-note met">달성</em>';
  return `<div class="macro-row ${cls} ${s.state}${g&&a+e>g*1.25?' far':''}"><span class="macro-label"><i aria-hidden="true"></i>${label}</span><span class="macro-bar" role="img" aria-label="${label} ${num(a,d)}${unit}${e?` · 예정 포함 ${num(a+e,d)}${unit}`:''} / 목표 ${g?num(g,d)+unit:'없음'}">${barInner(a,g,e,rowAxis(a+e,g))}</span><span class="macro-val">${num(a+e,d)}<small>/${g?num(g,d):'—'}${unit}</small></span>${note}</div>`;
 }).join('');
 return `<div class="home-stat home-diet"><div class="home-diet-head"><div><small>식단</small><strong>${num((Number(day.calories)||0)+extra('calories'))}<span>/ ${settings.calorieGoal?num(settings.calorieGoal):'—'} kcal</span></strong></div>${head}</div>${plannedToggle(plannedCount,showPlanned)}<div class="macro-rows">${rows}</div><p>${meals}번의 식사${hasGoal?'':' · <button type="button" class="text-button" id="gw-open">목표를 정하면 부족·초과를 보여 줘요 ›</button>'}</p></div>`;
}
// '예정 포함' 토글: 먹을 예정으로 넣은 식사가 있을 때만 보인다. 기본은 실제로 먹은 것만.
export function plannedToggle(count, on){
 if(!count) return '';
 return `<button type="button" class="plan-toggle ${on?'on':''}" data-plan-toggle aria-pressed="${on}"><span class="plan-switch" aria-hidden="true"></span>예정 포함 <small>${count}끼</small></button>`;
}

// 3.11.0 홈 3칸용 작은 식단 카드 → 3.18.0 '먹은 양 / 목표'를 숫자로, 막대는 2배 축.
export function macroMiniHTML(day={},settings={},{planned=null,showPlanned=false,proteinFirst=false}={}){
 const extra=k=>showPlanned&&planned?Number(planned[k])||0:0;
 const cal=(Number(day.calories)||0)+extra('calories'),goal=Number(settings.calorieGoal)||0;
 const rows=proteinFirst?[MACRO_ROWS[2],MACRO_ROWS[0],MACRO_ROWS[1],MACRO_ROWS[3]]:MACRO_ROWS;
 const bars=rows.map(([cls,label,key,gk,unit])=>{const a=Number(day[key])||0,e=extra(key),g=Number(settings[gk])||0,s=macroStatus(a+e,g);
  return `<div class="mini-row ${cls} ${s.state}${g&&a+e>g*1.25?' far':''}" title="${label} ${num(a+e)}${unit} / ${g?num(g)+unit:'목표 없음'}${s.state==='over'?` · +${num(s.diff)}${unit} 초과`:s.state==='under'?` · ${num(-s.diff)}${unit} 부족`:''}"><i>${label[0]}</i><span class="mini-bar">${barInner(a,g,e,rowAxis(a+e,g))}</span></div>`}).join('');
 return `<button type="button" class="home-stat home-stat-diet" data-page="food" aria-label="식단 ${num(cal)}${goal?` / 목표 ${num(goal)}`:''}kcal, 자세히 보기"><span class="stat-head"><small>식단</small>${proteinFirst&&Number(settings.proteinGoal)?`<small class="stat-prot">단백질 ${num(Number(day.protein)||0)}/${num(settings.proteinGoal)}g</small>`:''}</span><strong>${num(cal)}${goal?`<span class="stat-goal">/ ${num(goal)}</span>`:'<span>kcal</span>'}</strong><div class="stat-vis mini-bars" aria-hidden="true">${bars}</div></button>`;
}
