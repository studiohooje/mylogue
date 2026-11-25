import {macroPlanCardHTML} from './macro-plan.js';
import {scaleRecords} from './body-series.js';
import {mealTotals} from './domain.js';
import {macroGoalsHTML} from './nutrition-goals.js';
import {mealGroups,mealNames} from './timeline-view.js';
import {prefsOf} from './prefs.js';
import {emptyArt} from './brand-icons.js';
import {emptyLine,emptyAction} from './motivation.js';
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmt=(n,d=0)=>Number(n||0).toLocaleString('ko-KR',{maximumFractionDigits:d});
const pct=(value,total)=>total>0?`${Math.round(value/total*100)}%`:'—';
const time=value=>{const d=new Date(value);return Number.isNaN(d.getTime())?'—':`${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`};
function evidenceLabel(item){
 const e=item.aiEvidence;if(!e)return '';
 const parts=[e.source,e.servingBasis,e.note].filter(Boolean).map(esc);
 let link='';try{const url=new URL(e.sourceUrl);if(url.protocol==='https:')link=` <a href="${esc(url.href)}" target="_blank" rel="noopener noreferrer">출처 열기</a>`}catch{}
 // 4.0.0 AI가 남긴 근거·정정 메모는 내부 기록이라 사용자 화면에 보이지 않는다(데이터에는 그대로 보관)
 return '';
}
function calorieLabel(item){
 const e=item.aiEstimate;
 if(!e?.estimated)return `<span>${fmt(item.calories)} kcal</span>`;
 const hasRange=e.caloriesMin!=null&&e.caloriesMax!=null;
 const range=hasRange?`${fmt(e.caloriesMin)}~${fmt(e.caloriesMax)} kcal`:'추정 범위 미제공';
 const macros=[['carbs','탄수화물'],['protein','단백질'],['fat','지방']].filter(([key])=>e[`${key}Min`]!=null&&e[`${key}Max`]!=null).map(([key,label])=>`${label} ${fmt(e[`${key}Min`],1)}~${fmt(e[`${key}Max`],1)} g`);
 return `<details class="nutrition-estimate" title="${esc(range)}"><summary>약 ${fmt(item.calories)} kcal · 추정</summary><small>${esc(range)}${macros.length?` · ${esc(macros.join(' · '))}`:''} · 정확하지 않을 수 있음${e.note?` · ${esc(e.note)}`:''}</small></details>`;
}
function goalRow(key,label,actual,goal,unit){const rate=goal>0?actual/goal:0,over=goal>0&&actual>goal,remaining=Math.max(0,goal-actual),extra=Math.max(0,actual-goal);return `<div class="nutrition-goal ${key}"><div class="nutrition-goal-head"><strong>${label}</strong><span>${fmt(actual,1)} / ${fmt(goal,1)} ${unit}</span></div><div class="nutrition-track"><i style="width:${Math.min(rate*100,100)}%"></i>${over?`<b style="width:${Math.min((rate-1)*100,30)}%"></b>`:''}</div><small>${goal<=0?'목표 미설정':over?`목표 초과 +${fmt(extra,1)} ${unit}`:remaining?`목표까지 ${fmt(remaining,1)} ${unit} 남음`:'목표 달성'}</small></div>`}
// 4.17.0 나트륨·당류·식이섬유: 값이 있는 음식만 더해 조용히 한 줄(목표·경고 없음, 참고용). 하나도 없으면 안 보임.
export function microLineHTML(meals){
 const keys=[['sodium','나트륨','mg'],['sugar','당류','g'],['fiber','식이섬유','g']];
 const parts=[];for(const [k,l,u] of keys){const has=meals.filter(m=>m[k]!=null);if(!has.length)continue;const sum=has.reduce((a,m)=>a+Number(m[k]||0),0);parts.push(`${l} <b>${Math.round(sum).toLocaleString('ko-KR')}</b>${u}`)}
 if(!parts.length)return '';const known=meals.filter(m=>keys.some(([k])=>m[k]!=null)).length;
 return `<p class="micro-line">${parts.join(' · ')}<small>${known<meals.length?` · 값이 있는 음식 ${known}/${meals.length}개만 합산`:''} · 참고용</small></p>`;
}
export function renderFoodPage(db,date,{stateHtml='',trendHtml='',planned=null,plannedCount=0,showPlanned=false,dateBar='',checkHtml='',openMeal=null,tiles=''}={}){
 const meals=(db.meals||[]).filter(x=>x.date===date),groups=mealGroups(meals),day=mealTotals(meals.filter(x=>!x.planned)),s=db.settings||{};
 const header=`<div class="page-head"><div><h2>식단 기록</h2>${dateBar||'<p>먹은 음식과 양을 하나씩 남겨보세요.</p>'}</div><button class="button" data-modal="batch">＋ 식사 기록</button></div>${dateBar?'':`<label class="field nutrition-date">기록 날짜<input id="selected-date" type="date" value="${esc(date)}"></label>`}`;
 const lastW=scaleRecords(db).at(-1)?.weight||[...(db.body||[])].filter(x=>x.weight).sort((x,y)=>String(x.date).localeCompare(String(y.date))).at(-1)?.weight||null;
 const ratio=macroPlanCardHTML(s,lastW?Number(lastW):null);
 // 4.7.0 지난 날 섭취가 권고의 영양 부족 위험선(여성 1,200·남성 1,800kcal)보다 많이 낮으면 조용히 한 줄(재촉 없음, 지난 날만)
 const sex=s.nutritionProfile?.sex,lowLine=sex==='male'?1800:1200,today0=new Date(),td=`${today0.getFullYear()}-${String(today0.getMonth()+1).padStart(2,'0')}-${String(today0.getDate()).padStart(2,'0')}`,lowNote=date<td&&day.calories>0&&day.calories<lowLine*0.85?`<small class="pf-low">이 날은 ${Math.round(day.calories).toLocaleString('ko-KR')}kcal로 적게 드셨어요. 이런 날이 이어지면 비타민·무기질이 모자라기 쉬워요. 걱정되면 의료진과 이야기해 보세요.</small>`:'';
 const pg=Number(s.proteinGoal)||0,protFirst=prefsOf(db).glp1&&pg?`<div class="prot-first" role="group" aria-label="단백질 먼저"><div class="pf-head"><b>단백질 먼저</b><span><strong>${Math.round(day.protein||0)}</strong> / ${Math.round(pg)} g</span></div><span class="pf-bar"><i style="width:${Math.min(100,Math.round((day.protein||0)/pg*100))}%"></i></span><small>${(day.protein||0)>=pg?'이 날 단백질을 다 채웠어요.':`${Math.round(pg-(day.protein||0))}g 남았어요. 적게 먹는 날일수록 끼니마다 단백질 반찬을 먼저 드세요.`}</small>${lowNote}</div>`:'';
 const summary=`<section class="section nutrition-summary-v2"><div class="section-title"><h3>하루 누적 · 지금까지</h3><button class="text-button" data-page="settings">목표 수정 →</button></div>${protFirst}${macroGoalsHTML(day,s,{meals:groups.filter(g=>!g.planned).length,planned,plannedCount,showPlanned})}${microLineHTML(meals.filter(x=>!x.planned))}${ratio}</section>`;
 const mealNm=mealNames(groups,prefsOf(db).mealLabel),ordered=[...groups.filter(g=>!g.planned),...groups.filter(g=>g.planned)],firstPlan=ordered.findIndex(g=>g.planned);
 const content=ordered.map((g,i)=>{const ahead=i===firstPlan?'<p class="meal-ahead">앞으로 · 예정</p>':'';const total=mealTotals(g.items),parts=[['kcal','칼로리','calories','kcal'],['carbs','탄수화물','carbs','g'],['protein','단백질','protein','g'],['fat','지방','fat','g']];/* 5.0.4 대표님: 끼니마다 한 줄(시각·음식 이름·탄단지 막대·칼로리), 누르면 펼쳐서 음식별 수정 */const open=openMeal===g.key,kc=(total.carbs||0)*4+(total.protein||0)*4+(total.fat||0)*9||1,line=`<button type="button" class="meal-line" data-meal-open="${esc(g.key)}" aria-expanded="${open}"><span class="ml-tm"><b>${time(g.at)}</b>${esc(mealNm.get(g.key))}</span><span class="ml-nm"><span>${g.items.map(x=>esc(String(x.name||'').replace(/ \(.*\)$/,''))).join(' · ')}</span><span class="ml-bar" aria-hidden="true"><i style="width:${(total.carbs||0)*4/kc*100}%;background:#f0d466"></i><i style="width:${(total.protein||0)*4/kc*100}%;background:#6fd6a3"></i><i style="width:${(total.fat||0)*9/kc*100}%;background:#ff7b93"></i></span></span><span class="ml-kc">${fmt(total.calories)}<small>kcal</small></span><span class="ml-chev" aria-hidden="true">›</span></button>`;if(!open)return ahead+`<article class="card nutrition-meal meal-fold${g.planned?' planned':''}">${line}</article>`;
 return ahead+`<article class="card nutrition-meal meal-fold open${g.planned?' planned':''}">${line}<div class="nutrition-meal-head"><h4>${mealNm.get(g.key)}${g.planned?'<span class="plan-badge">예정</span>':''}</h4><span class="tl-right"><time>${time(g.at)}</time>${g.planned?`<button type="button" class="button small tl-confirm" data-plan-confirm="meal:${esc(g.key)}">먹었어요</button>`:''}<button type="button" class="button secondary small" data-qm="${esc(g.key)}" data-qm-date="${esc(date)}">식사 수정</button></span></div><div class="nutrition-food-list">${g.items.map(x=>`<div class="nutrition-food"><div><strong>${esc(x.name)}</strong><small>${fmt(x.servingQty,1)} ${esc(x.servingUnit||'회')}</small>${evidenceLabel(x)}</div><div class="nutrition-food-side">${calorieLabel(x)}<button data-meal-edit="${esc(x.id)}" aria-label="${esc(x.name)} 수정">수정</button></div></div>`).join('')}</div><div class="nutrition-meal-stats">${parts.map(([cl,label,key,unit])=>`<div class="nutrition-share ${cl}"><span>${label}</span><strong>${fmt(total[key],1)} ${unit}</strong><small>${g.planned?'예정 · 누적에 안 들어가요':`오늘 누적의 ${pct(total[key],day[key])}`}</small></div>`).join('')}</div></article>`}).join('');
 return `${header}${checkHtml}${summary}${trendHtml}<section class="section nutrition-meals"><div class="section-title"><h3>먹은 것</h3><small class="meal-legend"><i style="background:#f0d466"></i>탄 <i style="background:#6fd6a3"></i>단 <i style="background:#ff7b93"></i>지</small></div><div class="nutrition-meal-list">${content||emptyArt('food',emptyLine('meal'),'card',emptyAction('meal'))}</div></section>${tiles||stateHtml}`;
}
