// 4.3.0 이상한 음식 값 찾기와 정리(대표님: 'CCA 주스 1 mL'처럼 잘못 들어간 값을 바로잡기).
// 고칠 때는 그 기록 하나만 고친다(과거 기록을 한꺼번에 바꾸지 않음 — 대표님 결정).
// 저장된 음식(내 음식)은 앞으로 고를 때 쓰이므로 따로 정리한다.
import {MASS} from './domain.js';

const esc = v => String(v??'').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const n0 = v => Math.round(Number(v)||0).toLocaleString('ko-KR');

// 기록(먹은 양 기준 값) 또는 저장된 음식(100g/1단위 기준 값) 하나를 검사. 문제 없으면 null.
export function foodIssue(x, {kind = 'meal'} = {}){
 const qty = Number(x.servingQty), unit = x.servingUnit || '회', kcal = Number(x.calories);
 if(!(qty > 0)) return {code:'qty', text:'먹은 양이 비어 있어요'};
 if(MASS.has(unit)){
  // 기록은 먹은 양 전체 값, 저장된 음식은 100당 값
  const per100 = kind==='meal' ? kcal/qty*100 : kcal;
  if(kind==='meal' && qty <= 5 && kcal >= 15 && per100 > 950) return {code:'tiny', text:`${qty}${unit}에 ${n0(kcal)}kcal는 이상해요. 1${unit}이 아니라 1회·1병이었나요?`};
  if(per100 > 950) return {code:'dense', text:`100${unit}에 ${n0(per100)}kcal는 불가능한 값이에요(기름도 약 900kcal). 단위를 확인해 주세요.`};
 }
 // 4.28.0 F-06: 탄·단·지 중 하나라도 비어 있으면(업체 미제공) 검산하지 않는다
 if(x.carbs == null || x.protein == null || x.fat == null || x.carbs === '' || x.protein === '' || x.fat === '') return null;
 const p = Number(x.carbs)||0, pr = Number(x.protein)||0, f = Number(x.fat)||0, est = p*4 + pr*4 + f*9;
 if(kcal > 0 && est > 0 && Math.abs(est - kcal) > Math.max(120, kcal*0.6)) return {code:'macro', text:`탄단지로 계산하면 약 ${n0(est)}kcal인데 ${n0(kcal)}kcal로 적혀 있어요`};
 return null;
}

export function foodIssues(db){
 const ok = new Set(db.settings?.foodCheckOk || []);
 const meals = (db.meals||[]).filter(m => !ok.has(`meal:${m.id}`)).map(m => ({kind:'meal', rec:m, issue:foodIssue(m)})).filter(x => x.issue).sort((a, b) => String(b.rec.date).localeCompare(String(a.rec.date)));
 const foods = (db.foods||[]).filter(f => !f.catalog && f.source!=='대표값' && !ok.has(`food:${f.id}`)).map(f => ({kind:'food', rec:f, issue:foodIssue(f, {kind:'food'})})).filter(x => x.issue);
 return [...foods, ...meals];
}

// 한 건 고치기: 단위만 바꾸기(값은 그대로) / 그대로 두기
export function applyFoodFix(db, code){
 const [kind, id, action, arg] = String(code).split(':');
 const list = kind==='food' ? 'foods' : 'meals';
 if(action==='ok') return {...db, settings:{...db.settings, foodCheckOk:[...new Set([...(db.settings?.foodCheckOk||[]), `${kind}:${id}`])]}};
 if(action==='unit') return {...db, [list]:(db[list]||[]).map(x => x.id===id ? {...x, servingUnit:arg, ...(kind==='food'?{}:{servingQty:Number(x.servingQty)>0?Number(x.servingQty):1}), updatedAt:new Date().toISOString()} : x)};
 return db;
}

export function foodCheckHTML(db, {open = false} = {}){
 const items = foodIssues(db);
 if(!items.length) return '';
 const row = ({kind, rec, issue}) => { const key = `${kind}:${rec.id}`; // 4.25.0 AI 검토함 단위 칸 버그(팩·그릇·공기가 g로 저장)를 되돌릴 수 있게 흔한 단위를 더 보여 준다
 const units = MASS.has(rec.servingUnit) ? ['팩','개','회','인분','그릇','공기','병','봉'] : [];
  return `<li class="fc-item"><div class="fc-what"><b>${esc(rec.name)}</b> <small>${kind==='food'?'저장된 음식':`${esc(String(rec.date).slice(5).replace('-','/'))} 기록`} · ${esc(rec.servingQty)}${esc(rec.servingUnit||'')}</small><p>⚠ ${esc(issue.text)}</p></div><div class="fc-fix">${units.map(u => `<button type="button" class="chip" data-fc="${key}:unit:${u}">단위를 ‘${u}’로</button>`).join('')}${kind==='meal'?`<button type="button" class="chip" data-qm="${esc(rec.mealGroupId||`legacy:${rec.slot||'식사'}`)}" data-qm-date="${esc(rec.date)}">직접 고치기</button>`:''}<button type="button" class="text-button" data-fc="${key}:ok">그대로 두기</button></div></li>`; };
 return `<section class="section card food-check"><details ${open?'open':''}><summary><b>정리할 값 ${items.length}개</b><small>이상해 보이는 음식 값이 있어요 · 고치면 그 기록만 바뀌어요</small></summary><ul class="fc-list">${items.slice(0, 30).map(row).join('')}</ul>${items.length>30?`<p class="hint">외 ${items.length-30}개</p>`:''}</details></section>`;
}
