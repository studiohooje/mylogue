// 3.9.0 식단 목표 문답: 기본 정보로 유지 칼로리를 대략 추정하고, 목표·식단 성향에 맞춰
// 칼로리와 탄단지 비율을 '여러 개 제안'한다(추천 표시 + 설명·효과·주의). 직접 입력(고급)도 둔다.
// 계산: Mifflin-St Jeor 기초대사량 × 활동 계수. 일반 성인 기준의 대략값이며 의료 조언이 아니다.
import {saveGoalSettings} from './nutrition-goals.js';

const h = v => String(v??'').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const n0 = v => Math.round(Number(v)||0).toLocaleString('ko-KR');
const r50 = v => Math.round(v/50)*50;

export const ACTIVITY = [
 ['sedentary', 1.2,  '거의 안 움직여요', '앉아서 일하고 운동은 거의 안 해요'],
 ['light',     1.375,'가볍게 움직여요', '주 1~3회 운동하거나 자주 걸어요'],
 ['moderate',  1.55, '꾸준히 운동해요', '주 3~5회 운동해요'],
 ['active',    1.725,'많이 운동해요',   '주 6~7회, 땀 나게 운동해요'],
 ['athlete',   1.9,  '아주 많이 움직여요','몸 쓰는 일 + 매일 운동'],
];
export const GOALS = [['lose','감량','체지방을 줄이고 싶어요'],['maintain','유지','지금 체중을 지키며 몸을 다듬고 싶어요'],['gain','증량','근육·체중을 늘리고 싶어요']];
export const DIETS = [['glp1','GLP-1 계열 약 사용 중','위고비·마운자로 등'],['keto','저탄고지·키토',''],['if','간헐적 단식',''],['vegetarian','채식',''],['highprotein','고단백 위주로 먹어요',''],['none','특별히 없어요','']];

export const PRESETS = {
 balance:  {name:'균형1 · 40:30:30', c:40, p:30, f:30, what:'탄수 4 : 단백질 3 : 지방 3. 마이로그 기본 균형이에요.', good:'단백질을 넉넉히 챙기면서 탄수·지방도 고르게 먹어요. 운동하는 분께 무난해요.', care:'2025 한국인 영양소 섭취기준 적정비율(탄 50~65·단 7~20·지 15~30%)보다 단백질이 높아요. 신장 질환이 있으면 의료진과 정하세요.'},
 balance2: {name:'균형2 · 50:20:30', c:50, p:20, f:30, what:'2025 한국인 영양소 섭취기준 적정비율 안의 비율이에요.', good:'한식·외식과 잘 맞고 오래 지키기 쉬워요.', care:'운동을 많이 하거나 감량 중이면 단백질이 모자랄 수 있어요.'},
 balance3: {name:'균형3 · 45:25:30', c:45, p:25, f:30, what:'균형1과 균형2의 중간이에요.', good:'밥을 너무 줄이지 않으면서 단백질도 챙겨요.', care:'처음엔 단백질 25%를 채우기 어렵다면 균형2부터 시작해도 좋아요.'},
 protein:  {name:'고단백', c:35, p:35, f:30, what:'단백질을 넉넉히, 탄수화물과 지방은 고르게.', good:'감량 중 근육을 지키고 포만감이 오래가요.', care:'신장 질환이 있으면 단백질 양을 의료진과 정하세요.'},
 cut:      {name:'고단백 감량 4:4:2', c:40, p:40, f:20, what:'탄수화물 4 : 단백질 4 : 지방 2. 근력운동하며 감량할 때 많이 쓰는 비율이에요.', good:'근육 손실을 줄이며 체지방을 빼는 데 유리해요.', care:'지방이 낮아 오래 하면 허기·피로가 올 수 있어요. 견과·생선 같은 좋은 지방은 챙기세요.'},
 perform:  {name:'운동 퍼포먼스', c:55, p:25, f:20, what:'탄수화물을 넉넉히 둬서 운동 에너지를 채워요.', good:'고강도 운동·증량 때 힘이 잘 나요.', care:'활동량이 적은 날엔 남는 탄수화물이 체지방이 될 수 있어요.'},
 lowcarb:  {name:'저탄수', c:25, p:35, f:40, what:'탄수화물을 줄이고 단백질·지방으로 채워요.', good:'혈당 변동과 식후 졸림이 줄 수 있어요.', care:'고강도 운동 수행이 떨어질 수 있어요. 당뇨약을 먹고 있다면 의료진과 상의하세요.'},
 keto:     {name:'저탄고지(키토)', c:5, p:25, f:70, what:'탄수화물을 하루 30~50g 안쪽으로 제한하는 식단이에요.', good:'키토를 이미 하는 분의 기록 기준으로 맞아요.', care:'초기 피로·변비가 흔하고, 콜레스테롤 수치를 확인하세요. 당뇨·신장 질환이 있으면 의료진과 상의하세요.'},
 glp1:     {name:'단백질 우선(GLP-1 사용 중)', c:35, p:35, f:30, what:'단백질을 체중 기준(1kg당 1.4~1.6g)으로 먼저 정하고, 나머지를 탄수·지방으로 나눠요. 식사량이 줄어도 단백질은 줄지 않아요.', good:'적게 먹는 기간에 근육 손실을 줄이는 데 도움이 돼요.', care:'약 용량·식단은 의료진 지시가 우선이에요. 메스꺼우면 기름진 음식을 줄이고 물을 충분히 드세요.'},
};

export function cleanProfile(p={}){
 const num = (v, lo, hi) => { const x = Number(v); return Number.isFinite(x) && x>=lo && x<=hi ? x : null; };
 return {
  sex: ['male','female','none'].includes(p.sex) ? p.sex : 'none',
  age: num(p.age, 14, 100), heightCm: num(p.heightCm, 120, 230), weightKg: num(p.weightKg, 30, 300),
  activity: ACTIVITY.some(a=>a[0]===p.activity) ? p.activity : 'light',
  goal: GOALS.some(g=>g[0]===p.goal) ? p.goal : 'maintain',
  diets: Array.isArray(p.diets) ? [...new Set(p.diets.filter(d => DIETS.some(x=>x[0]===d) && d!=='none'))] : [],
 };
}

// 4.12 유지 칼로리 = 2025 한국인 영양소 섭취기준(KDRI) 에너지필요추정량 식(2005 미국·캐나다 DRI 식, KDRI 2025 1권 표 7).
//  남 662 − 9.53×나이 + PA×(15.91×체중kg + 539.6×키m), 여 354 − 6.91×나이 + PA×(9.36×체중kg + 726×키m)
//  PA(신체활동계수) 남 1.0/1.11/1.25/1.48, 여 1.0/1.12/1.27/1.45 = 비활동/저활동/활동/매우 활동.
//  앱 활동 단계: 거의 안 움직임=비활동, 가볍게=저활동, 꾸준히=활동, 많이·아주 많이=매우 활동('아주 많이'는 +10% 추정).
//  성별 '선택 안 함'은 남녀 평균. 기초대사량(바닥 계산용)은 Mifflin-St Jeor 그대로.
//  이전(4.11까지)은 Mifflin × 1.2~1.9 관행 계수 → KDRI보다 14~21% 낮았음(docs/reviews/2026-11-23_유지칼로리_전후비교.md).
export const PA = {male:{sedentary:1.0, light:1.11, moderate:1.25, active:1.48, athlete:1.48}, female:{sedentary:1.0, light:1.12, moderate:1.27, active:1.45, athlete:1.45}};
export function eer(sex, age, heightCm, weightKg, activity){
 const H = heightCm/100, extra = activity==='athlete' ? 1.1 : 1;
 const m = (662 - 9.53*age + PA.male[activity]*(15.91*weightKg + 539.6*H))*extra;
 const f = (354 - 6.91*age + PA.female[activity]*(9.36*weightKg + 726*H))*extra;
 return sex==='male' ? m : sex==='female' ? f : (m+f)/2;
}
export function estimate(profile){
 const p = cleanProfile(profile);
 if(p.age===null || p.heightCm===null || p.weightKg===null) return null;
 const base = 10*p.weightKg + 6.25*p.heightCm - 5*p.age;
 const bmr = base + (p.sex==='male' ? 5 : p.sex==='female' ? -161 : -78);
 return {bmr:Math.round(bmr), tdee:r50(eer(p.sex, p.age, p.heightCm, p.weightKg, p.activity)), floor:Math.max(Math.round(bmr), p.sex==='male'?1500:p.sex==='female'?1200:1350), basis:'KDRI2025-EER'};
}

// 칼로리 제안: 목표별 2~3개 + 추천 표시. 바닥(기초대사량·최소 섭취) 아래는 빼고 이유를 남긴다.
export function calorieOptions(profile){
 const p = cleanProfile(profile), e = estimate(p); if(!e) return [];
 const glp = p.diets.includes('glp1');
 const raw = p.goal==='lose' ? [
   {d:-300, label:'완만한 감량', note:'주 0.3kg 안팎. 배고픔이 덜해 오래 가기 쉬워요.', rec:glp},
   {d:-500, label:'표준 감량', note:'주 0.5kg 안팎. 가장 많이 쓰는 감량 폭이에요.', rec:!glp},
   ...(glp ? [] : [{d:-750, label:'빠른 감량', note:'주 0.7kg 안팎. 4~6주만 짧게 하고, 근력운동과 단백질을 꼭 챙기세요.'}]),
   {d:0, label:'유지(참고)', note:'추정 유지 칼로리예요. 감량 정체기에 1~2주 쉬어 갈 때 써요.'},
  ] : p.goal==='gain' ? [
   {d:250, label:'린 벌크', note:'주 0.25kg 안팎. 체지방을 덜 늘리며 근육을 늘려요.', rec:true},
   {d:400, label:'표준 증량', note:'주 0.4kg 안팎. 근력운동을 꾸준히 할 때 맞아요.'},
   {d:0, label:'유지(참고)', note:'추정 유지 칼로리예요.'},
  ] : [
   {d:-150, label:'가볍게 다듬기', note:'체중은 거의 그대로, 체지방을 조금씩 줄여요.'},
   {d:0, label:'유지', note:'추정 유지 칼로리예요. 2~3주 체중 변화를 보고 조정하세요.', rec:true},
   {d:150, label:'운동량 많은 날 기준', note:'운동을 많이 해서 배고프거나 기운이 없을 때.'},
  ];
 return raw.map(o => {
  const kcal = r50(e.tdee + o.d), below = kcal < e.floor;
  return {...o, kcal, below, note: below ? `${o.note} 다만 기초대사량·최소 섭취량(${n0(e.floor)}kcal)보다 낮아 권하지 않아요.` : o.note, rec: !!o.rec && !below};
 });
}

export function presetOrder(profile){
 const p = cleanProfile(profile);
 const rec = p.diets.includes('keto') ? 'keto' : p.diets.includes('glp1') ? 'glp1' : p.goal==='lose' ? 'cut' : p.goal==='gain' ? 'perform' : p.diets.includes('highprotein') ? 'protein' : 'balance';
 const order = ['balance','balance2','balance3','protein','cut','perform','lowcarb','keto','glp1'];
 return {rec, order:[rec, ...order.filter(k=>k!==rec)]};
}

// 4.7.0 GLP-1 사용 중: 단백질을 칼로리 %가 아니라 체중 기준으로 먼저 정한다(적게 먹을수록 단백질이 같이 줄지 않게).
// 근거: ACLM·ASN·OMA·TOS 공동 권고(2025, Am J Lifestyle Med, doi:10.1177/15598276251344827) — 감량 중 1.2~1.6 g/kg/일 제안,
// 비만이면 실제 체중으로 계산할 때 과대평가될 수 있음. → 기준 체중: 실제 체중이 BMI 22 체중의 1.2배를 넘으면 보정 체중(BMI 22 체중 + 0.4×차이).
// 대표님 방향(단백질을 최대한 챙기게)에 맞춰 권고 범위(1.2~1.6)의 위쪽: 활동이 적으면 1.4, 가볍게 1.5, 꾸준히 이상 1.6 g/kg. 그다음 원문의 절대량 80~120g/일 안으로 맞추고, 실제 체중 2 g/kg 미만으로. 지방 30%, 나머지 탄수.
export function refWeight(profile){
 const p = cleanProfile(profile); if(!p.weightKg) return null;
 if(!p.heightCm) return p.weightKg;
 const ibw = 22 * (p.heightCm/100) ** 2;
 return p.weightKg > ibw*1.2 ? Math.round((ibw + 0.4*(p.weightKg-ibw))*10)/10 : p.weightKg;
}
export function glp1Macros(profile, kcal){
 const p = cleanProfile(profile), ref = refWeight(p);
 if(!ref || !kcal) return {...PRESETS.glp1, proteinG:Math.round(kcal*PRESETS.glp1.p/100/4), perKg:null, ref:null};
 const perKg = p.activity==='sedentary' ? 1.4 : p.activity==='light' ? 1.5 : 1.6;
 // 권고 원문: 절대량 80~120g/일이 지키기 쉽다, 2g/kg/일 이상을 오래 먹는 건 피한다 → 80~120g 안으로, 실제 체중 2g/kg 미만으로
 let g = Math.round(ref*perKg/5)*5; g = Math.min(120, Math.max(80, g)); g = Math.min(g, Math.floor(p.weightKg*1.95/5)*5); g = Math.min(g, Math.floor(kcal*0.5/4/5)*5);
 const pp = Math.round(g*4/kcal*100), f = 30, c = Math.max(0, 100 - pp - f);
 return {...PRESETS.glp1, c, p:pp, f, proteinG:g, perKg, ref};
}
const macrosFor = (key, profile, kcal) => key==='glp1' ? glp1Macros(profile, kcal) : PRESETS[key];
export const grams = (kcal, c, p, f) => ({carbs:Math.round(kcal*c/100/4), protein:Math.round(kcal*p/100/4), fat:Math.round(kcal*f/100/9)});

export function dietNotes(profile){
 const p = cleanProfile(profile), out = [];
 if(p.diets.includes('if')) out.push('간헐적 단식: 목표량은 같고 먹는 시간대만 정하면 돼요. 끼니 수가 줄면 한 끼에 단백질 30g 이상을 챙기세요.');
 if(p.diets.includes('vegetarian')) out.push('채식: 두부·콩·달걀·유제품·단백질 보충제로 단백질을 채우기 쉬워요.');
 if(p.diets.includes('glp1')){ const ref = refWeight(p);
  out.push(`GLP-1 사용 중: 너무 적게 먹게 되기 쉬워요. 칼로리보다 단백질·수분을 먼저 채우고, 끼니마다 단백질 반찬을 하나씩 챙기세요.${ref&&ref!==p.weightKg?` 단백질은 체중이 많이 나가는 분께 맞게 보정 체중(${ref}kg)으로 계산했어요.`:''}`);
  out.push('단백질만으로는 근육을 지키기 어려워요. 근력운동 주 3회 이상과 걷기 같은 유산소 주 150분 이상을 함께 권해요. 끼니에서는 단백질 음식을 먼저 드세요. 너무 적게 먹으면(여성 1,200kcal·남성 1,800kcal 아래) 비타민·무기질이 모자라기 쉬워요. 신장 질환이 있거나 약 용량을 바꾸는 중이면 목표량을 의료진과 정하세요.'); }
 if(p.weightKg) out.push(`참고: 근력운동을 한다면 단백질은 체중 1kg당 1.6g(${Math.round(p.weightKg*1.6)}g) 안팎을 많이 권해요.`);
 return out;
}

// ── 문답 상태와 화면 ──
export const WIZ_STEPS = ['basic','activity','goal','diet','calories','macros','done'];
export function newGoalWizard(db){
 const saved = cleanProfile(db.settings?.nutritionProfile||{});
 const lastW = [...(db.body||[])].filter(b=>b.weight).sort((a,b)=>String(b.date).localeCompare(String(a.date)))[0]?.weight;
 return {step:0, profile:{...saved, weightKg:saved.weightKg ?? lastW ?? null}, kcal:null, preset:null, custom:{on:false, kcal:'', c:40, p:30, f:30}};
}

const dots = st => `<div class="onb-dots" aria-label="${st.step+1} / ${WIZ_STEPS.length-1}">${WIZ_STEPS.slice(0,-1).map((_,i)=>`<i class="${i<=st.step?'on':''}"></i>`).join('')}</div>`;
const nav = (st, nextLabel='다음', nextId='gw-next') => `<div class="onb-btns">${st.step?'<button type="button" class="button secondary" id="gw-prev">이전</button>':''}<button type="button" class="button" id="${nextId}">${nextLabel}</button></div>`;
const opt = (attr, v, on, title, sub='', extra='') => `<button type="button" class="onb-opt ${on?'on':''}" ${attr}="${h(v)}" aria-pressed="${on}"><span><b>${title}</b>${sub?`<small>${sub}</small>`:''}${extra}</span></button>`;

export function goalWizardHTML(st){
 const p = st.profile, step = WIZ_STEPS[st.step], e = estimate(p);
 const top = `<div class="onb-top">${dots(st)}<button type="button" class="text-button" id="gw-skip">나중에 할게요</button></div>`;
 if(step==='basic') return `<div class="onb gw">${top}<p class="onb-q">유지 칼로리를 계산할게요</p><p class="onb-s">대략적인 계산에만 쓰고, 언제든 바꿀 수 있어요.</p><form id="gw-basic" class="gw-basic"><div class="pref-seg" role="radiogroup" aria-label="계산용 성별">${[['male','남성'],['female','여성'],['none','선택 안 함']].map(([v,t])=>`<button type="button" class="${p.sex===v?'on':''}" data-gw-sex="${v}" aria-pressed="${p.sex===v}">${t}</button>`).join('')}</div><div class="gw-fields"><label class="field">나이<input name="age" type="number" inputmode="numeric" min="14" max="100" value="${h(p.age??'')}" placeholder="예: 32" required></label><label class="field">키 cm<input name="heightCm" type="number" inputmode="decimal" min="120" max="230" step="0.1" value="${h(p.heightCm??'')}" placeholder="예: 170" required></label><label class="field">체중 kg<input name="weightKg" type="number" inputmode="decimal" min="30" max="300" step="0.1" value="${h(p.weightKg??'')}" placeholder="예: 68" required></label></div><p class="hint">성별은 칼로리 계산에만 써요. ‘선택 안 함’이면 남녀 중간값으로 계산해요.</p></form>${nav(st)}</div>`;
 if(step==='activity') return `<div class="onb gw">${top}<p class="onb-q">평소에 얼마나 움직여요?</p><div class="onb-opts">${ACTIVITY.map(([v,,t,d])=>opt('data-gw-activity',v,p.activity===v,t,d)).join('')}</div>${nav(st)}</div>`;
 if(step==='goal') return `<div class="onb gw">${top}<p class="onb-q">목표가 뭐예요?</p><div class="onb-opts">${GOALS.map(([v,t,d])=>opt('data-gw-goal',v,p.goal===v,t,d)).join('')}</div>${nav(st)}</div>`;
 if(step==='diet') return `<div class="onb gw">${top}<p class="onb-q">해당되는 게 있나요?</p><p class="onb-s">여러 개 골라도 돼요. 제안할 때 참고해요.</p><div class="onb-chips">${DIETS.map(([v,t,d])=>`<button type="button" class="onb-chip ${(v==='none'?!p.diets.length:p.diets.includes(v))?'on':''}" data-gw-diet="${v}" aria-pressed="${v==='none'?!p.diets.length:p.diets.includes(v)}">${t}${d?` <small>${d}</small>`:''}</button>`).join('')}</div>${p.diets.includes('glp1')?'<p class="gw-care">약을 쓰는 중이라면 식단·체중 목표는 처방한 의료진의 안내가 먼저예요. 마이로그의 제안은 참고용이에요.</p>':''}${nav(st)}</div>`;
 if(step==='calories'){
  const list = calorieOptions(p);
  return `<div class="onb gw">${top}<p class="onb-q">하루 목표 칼로리를 골라 주세요</p><p class="onb-s">추정 유지 칼로리 <b>${n0(e?.tdee)}kcal</b> · 기초대사량 ${n0(e?.bmr)}kcal</p><p class="onb-s gw-basis">2025 한국인 영양소 섭취기준의 에너지필요추정량 식으로 계산한 대략값이에요. 2~3주 체중 변화를 보고 조정하세요.</p><div class="onb-opts">${list.map(o=>opt('data-gw-kcal',o.kcal,st.kcal===o.kcal&&!st.custom.kcalOn,`${n0(o.kcal)} kcal <em class="gw-tag">${o.label}</em>${o.rec?'<em class="gw-rec">추천</em>':''}`,o.note,'',)).join('')}</div><details class="gw-custom" ${st.custom.kcalOn?'open':''}><summary>직접 입력</summary><label class="field">목표 칼로리 kcal<input id="gw-kcal-custom" type="number" inputmode="numeric" min="800" max="6000" step="10" value="${h(st.custom.kcal)}" placeholder="${n0(e?.tdee)}"></label></details>${nav(st)}</div>`;
 }
 if(step==='macros'){
  const kcal = st.kcal, {rec, order} = presetOrder(p);
  const cards = order.map(k => { const x = macrosFor(k, p, kcal), g = grams(kcal, x.c, x.p, x.f), on = st.preset===k && !st.custom.on;
   return `<button type="button" class="gw-preset ${on?'on':''}" data-gw-preset="${k}" aria-pressed="${on}"><span class="gw-preset-top"><b>${x.name}</b>${k===rec?'<em class="gw-rec">추천</em>':''}<span class="gw-ratio">탄 ${x.c} : 단 ${x.p} : 지 ${x.f}</span></span><span class="gw-bar" aria-hidden="true"><i style="width:${x.c}%" class="c"></i><i style="width:${x.p}%" class="p"></i><i style="width:${x.f}%" class="f"></i></span><span class="gw-grams">탄수화물 ${g.carbs}g · 단백질 ${g.protein}g · 지방 ${g.fat}g${p.weightKg?` <small>(단백질 체중당 ${(g.protein/p.weightKg).toFixed(1)}g)</small>`:''}</span><span class="gw-desc">${x.what}</span><span class="gw-good">효과 · ${x.good}</span><span class="gw-care">주의 · ${x.care}</span></button>`; }).join('');
  const c = st.custom, sum = Number(c.c)+Number(c.p)+Number(c.f);
  return `<div class="onb gw">${top}<p class="onb-q">탄단지 비율을 골라 주세요</p><p class="onb-s">하루 ${n0(kcal)}kcal 기준으로 계산했어요.</p><div class="gw-presets">${cards}</div><details class="gw-custom" ${c.on?'open':''}><summary>직접 비율 입력(고급)</summary><div class="gw-fields"><label class="field">탄수화물 %<input id="gw-c" type="number" min="0" max="100" value="${h(c.c)}"></label><label class="field">단백질 %<input id="gw-p" type="number" min="0" max="100" value="${h(c.p)}"></label><label class="field">지방 %<input id="gw-f" type="number" min="0" max="100" value="${h(c.f)}"></label></div><p class="hint" id="gw-sum">합계 ${sum}%${sum!==100?' · 100%로 맞춰 주세요':''}</p><button type="button" class="button secondary" id="gw-custom-use">이 비율로 하기</button></details>${dietNotes(p).map(x=>`<p class="hint gw-note">${h(x)}</p>`).join('')}${nav(st,'이대로 저장','gw-save')}</div>`;
 }
 const s = st.result || {};
 return `<div class="onb gw"><p class="onb-q">식단 목표를 정했어요</p><div class="onb-sum"><div class="onb-row"><span>목표 칼로리</span><b>${n0(s.calorieGoal)} kcal</b></div><div class="onb-row"><span>탄수화물</span><b>${n0(s.carbsGoal)} g (${s.carbsPctGoal}%)</b></div><div class="onb-row"><span>단백질</span><b>${n0(s.proteinGoal)} g (${s.proteinPctGoal}%)</b></div><div class="onb-row"><span>지방</span><b>${n0(s.fatGoal)} g (${s.fatPctGoal}%)</b></div></div><p class="hint">홈 ‘오늘 식단’에서 부족·초과를 바로 보여 줘요. 바꾸려면 설정 › 일일 식단 목표.</p><p class="hint">일반 성인 기준의 대략적인 계산이에요. 질환·임신·약 복용 중이면 의료진과 상의하세요.</p><div class="onb-btns"><button type="button" class="button" id="gw-close">확인</button></div></div>`;
}

// 저장: 기존 목표 형식(비율 모드)으로 바꿔 넣고, 문답 답은 nutritionProfile로 남긴다.
export function applyGoalWizard(db, st){
 const c = st.custom.on ? {c:Number(st.custom.c), p:Number(st.custom.p), f:Number(st.custom.f)} : st.preset ? macrosFor(st.preset, st.profile, st.kcal) : null;
 if(!c) throw Error('탄단지 비율을 골라 주세요.');
 if(!st.kcal || st.kcal < 800) throw Error('목표 칼로리를 골라 주세요.');
 const settings = saveGoalSettings(db.settings, {goalMode:'ratio', calorieGoal:st.kcal, carbsPctGoal:c.c, proteinPctGoal:c.p, fatPctGoal:c.f, barbellWeightKg:db.settings?.barbellWeightKg ?? 20});
 return {...db, settings:{...settings, nutritionProfile:{...cleanProfile(st.profile), preset:st.custom.on?'custom':st.preset, savedAt:new Date().toISOString()}}};
}
