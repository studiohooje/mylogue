const esc=value=>String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
const positive=value=>Math.max(0,Number(value)||0);
const round=value=>Math.round(value*10)/10;

export function goalSettingsHTML(settings={}){
 const s=settings,mode=s.goalMode==='ratio'?'ratio':'grams';
 return `<section class="card nutrition-settings"><h3>일일 식단 목표</h3><p class="hint">g 또는 열량 비율로 설정하세요. 비율 모드에서는 목표 칼로리로 g을 계산합니다.</p><form id="goal-form" class="form-grid"><label class="field">목표 설정 방식<select name="goalMode"><option value="grams" ${mode==='grams'?'selected':''}>탄단지 g 직접 입력</option><option value="ratio" ${mode==='ratio'?'selected':''}>탄단지 열량 비율 %</option></select></label><label class="field">목표 칼로리 kcal<input name="calorieGoal" type="number" min="0" value="${esc(s.calorieGoal??2200)}"></label><label class="field">탄수화물 g<input name="carbsGoal" type="number" min="0" step="any" value="${esc(s.carbsGoal??250)}"></label><label class="field">단백질 g<input name="proteinGoal" type="number" min="0" step="any" value="${esc(s.proteinGoal??150)}"></label><label class="field">지방 g<input name="fatGoal" type="number" min="0" step="any" value="${esc(s.fatGoal??70)}"></label><div class="field wide"><strong>탄단지 목표 열량 비율</strong><p class="hint">비율 모드에서는 세 값을 합쳐 100%로 입력합니다.</p></div><label class="field">탄수화물 %<input name="carbsPctGoal" type="number" min="0" max="100" step="any" value="${esc(s.carbsPctGoal??40)}"></label><label class="field">단백질 %<input name="proteinPctGoal" type="number" min="0" max="100" step="any" value="${esc(s.proteinPctGoal??30)}"></label><label class="field">지방 %<input name="fatPctGoal" type="number" min="0" max="100" step="any" value="${esc(s.fatPctGoal??30)}"></label><label class="field wide">바벨 자체 중량 kg<input name="barbellWeightKg" type="number" min="0" step="0.5" value="${esc(s.barbellWeightKg??20)}"></label><button class="button wide">목표 저장</button></form></section>`;
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
export function macroGoalsHTML(day={},settings={},{meals=0}={}){
 const hasGoal=MACRO_ROWS.some(([, , ,gk])=>Number(settings[gk])>0);
 const kcal=macroStatus(day.calories,settings.calorieGoal);
 const head=kcal.state==='none'?'':kcal.state==='over'?`<span class="macro-chip over">+${num(kcal.diff)} kcal 초과</span>`:kcal.state==='under'?`<span class="macro-chip under">${num(-kcal.diff)} kcal 남음</span>`:'<span class="macro-chip met">✓ 목표 달성</span>';
 const rows=MACRO_ROWS.map(([cls,label,key,gk,unit])=>{
  const a=Number(day[key])||0,g=Number(settings[gk])||0,s=macroStatus(a,g),d=unit==='g'?1:0;
  const fill=Math.min(a,g||a)/s.scale*100,over=s.state==='over'?(a-g)/s.scale*100:0,mark=g?g/s.scale*100:0;
  const note=s.state==='none'?'<em class="macro-note">목표 없음</em>':s.state==='over'?`<em class="macro-note over">+${num(s.diff,d)}${unit} 초과</em>`:s.state==='under'?`<em class="macro-note under">${num(-s.diff,d)}${unit} 부족</em>`:'<em class="macro-note met">달성</em>';
  return `<div class="macro-row ${cls} ${s.state}"><span class="macro-label"><i aria-hidden="true"></i>${label}</span><span class="macro-bar" role="img" aria-label="${label} ${num(a,d)}${unit} / 목표 ${g?num(g,d)+unit:'없음'}"><b style="width:${fill.toFixed(1)}%"></b>${over?`<s style="left:${mark.toFixed(1)}%;width:${over.toFixed(1)}%"></s>`:''}${g?`<u style="left:${mark.toFixed(1)}%"></u>`:''}</span><span class="macro-val">${num(a,d)}<small>/${g?num(g,d):'—'}${unit}</small></span>${note}</div>`;
 }).join('');
 return `<div class="home-stat home-diet"><div class="home-diet-head"><div><small>식단</small><strong>${num(day.calories)}<span>/ ${settings.calorieGoal?num(settings.calorieGoal):'—'} kcal</span></strong></div>${head}</div><div class="macro-rows">${rows}</div><p>${meals}번의 식사${hasGoal?'':' · <button class="text-button" data-page="settings">목표를 정하면 부족·초과를 보여 줘요</button>'}</p></div>`;
}
