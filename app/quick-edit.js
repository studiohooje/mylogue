// 3.10.0 쉬운 수정: 기록 카드에서 바로 여는 짧은 수정 화면.
// 식사 = 한 끼 전체(시각·끼니·날짜, 음식별 양 −/+, 음식 빼기). 양을 바꾸면 영양값은 같은 비율로 바뀐다.
// 운동 = 종목별 세트(무게·횟수·완료)만 바로 고치고, 세트 추가·삭제. 머신·컨디션 등은 '자세히 수정'(기존 화면).
import {cleanMeal, cleanWorkout, isFuture, MASS, unitFactor} from './domain.js';
import {mealGroups} from './timeline-view.js';
import {foodIssue} from './food-check.js';

const h = v => String(v??'').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmt = (n, d=0) => Number(n||0).toLocaleString('ko-KR', {maximumFractionDigits:d});
const r1 = v => Math.round(v*10)/10;
const pad = n => String(n).padStart(2, '0');
const hhmm = iso => { const d = new Date(iso); return Number.isNaN(d.getTime()) ? '12:00' : `${pad(d.getHours())}:${pad(d.getMinutes())}`; };
const SLOTS = ['아침','점심','저녁','간식','보충제','식사'];
// 4.2.1 단위 바로잡기(예: 1 mL로 잘못 저장된 '1회'). 단위만 바꾸고 영양값은 그대로다.
export const UNITS = ['회','개','g','ml','인분','공기','그릇','컵','잔','팩','봉','캔','병','조각','큰술','스쿱'];
const NUT = ['calories','carbs','protein','fat'];

// ── 식사 ──
export function quickMealState(db, date, key){
 const g = mealGroups((db.meals||[]).filter(m => m.date===date)).find(x => x.key===key);
 if(!g) return null;
 const first = g.items[0];
 return {key, date, newDate:date, slot:first.slot||'식사', time:hhmm(g.at), rows:g.items.map(m => ({id:m.id, name:m.name, unit:m.servingUnit||'회', origUnit:m.servingUnit||'회', qty:m.servingQty, base:{qty:m.servingQty, ...Object.fromEntries(NUT.map(k=>[k, m[k]]))}, removed:false}))};
}
export const stepFor = unit => MASS.has(unit) ? 10 : 0.5;
// 4.4.1 점검 D-2: 단위를 바꾸면 같은 양을 다른 단위로 적은 것으로 보고 영양값은 그대로 둔다(양 비율은 같은 단위일 때만).
export function rowTotals(row){ const unitChanged = row.origUnit && row.unit && row.unit!==row.origUnit; const f = unitChanged ? 1 : row.base.qty>0 ? Number(row.qty)/row.base.qty : 0; return Object.fromEntries(NUT.map(k => [k, row.base[k]==null ? null : r1(row.base[k]*f)])); }
export function readQuickMeal(st, root){
 if(!root) return st;
 const v = id => root.querySelector('#'+id)?.value;
 st.newDate = v('qm-date') || st.newDate; st.slot = v('qm-slot') || st.slot; st.time = v('qm-time') || st.time;
 st.rows.forEach((r, i) => { const q = Number(v(`qm-qty-${i}`)); if(Number.isFinite(q) && q>0) r.qty = q; const u = v(`qm-unit-${i}`); if(u) r.unit = u; });
 return st;
}
// 4.3.0 저장하면 무엇이 바뀌는지(개선안: 끼니 바구니)
export function mealDiff(st){ const q = st.rows.filter(r => !r.removed && Number(r.qty)!==Number(r.base.qty)).length, u = st.rows.filter(r => !r.removed && r.origUnit && r.unit!==r.origUnit).length, x = st.rows.filter(r => r.removed).length; const p = []; if(q) p.push(`${q}개 양 바꿈`); if(u) p.push(`${u}개 단위 바꿈`); if(x) p.push(`${x}개 뺌`); return p.join(' · ') || '바뀐 것 없음'; }
export function quickMealHTML(st){
 const live = st.rows.filter(r => !r.removed), tot = live.reduce((s, r) => { const t = rowTotals(r); for(const k of NUT) s[k] += t[k]||0; return s; }, {calories:0,carbs:0,protein:0,fat:0});
 return `<div class="qe"><div class="qe-meta"><label class="field">날짜<input id="qm-date" type="date" value="${h(st.newDate)}"></label><label class="field">끼니<select id="qm-slot">${[...new Set([st.slot, ...SLOTS])].map(s=>`<option ${s===st.slot?'selected':''}>${h(s)}</option>`).join('')}</select></label><label class="field">먹은 시각<input id="qm-time" type="time" value="${h(st.time)}"></label></div>
<ul class="qe-rows">${st.rows.map((r, i) => { const t = rowTotals(r); return `<li class="qe-row${r.removed?' removed':''}">${r.removed ? `<span class="qe-name"><s>${h(r.name)}</s> <small>빼기로 함</small></span><button type="button" class="text-button" data-qm-undo="${i}">되돌리기</button>` : `<div class="qe-name"><b>${h(r.name)}</b><small>${fmt(t.calories)}kcal · 탄${fmt(t.carbs)} 단${fmt(t.protein)} 지${fmt(t.fat)}</small>${(() => { const is = foodIssue({servingQty:r.qty, servingUnit:r.unit, ...t}); return is ? `<small class="qe-warn">⚠ ${h(is.text)}</small>` : ''; })()}</div><div class="qe-step"><button type="button" class="qe-btn" data-qm-step="${i}" data-d="-1" aria-label="${h(r.name)} 줄이기">−</button><input id="qm-qty-${i}" type="number" inputmode="decimal" min="0.1" step="any" value="${h(r.qty)}" aria-label="${h(r.name)} 양"><select id="qm-unit-${i}" class="qe-unit-sel" aria-label="${h(r.name)} 단위">${[...new Set([r.unit, ...UNITS])].map(u => `<option ${u===r.unit?'selected':''}>${h(u)}</option>`).join('')}</select><button type="button" class="qe-btn" data-qm-step="${i}" data-d="1" aria-label="${h(r.name)} 늘리기">＋</button></div><div class="qe-row-actions"><button type="button" class="text-button" data-meal-edit="${h(r.id)}">영양값 고치기</button><button type="button" class="text-button qe-del" data-qm-remove="${i}">빼기</button></div>`}</li>`; }).join('')}</ul>
<p class="qe-total">이 식사 <b>${fmt(tot.calories)}kcal</b> · 탄${fmt(tot.carbs)}g 단${fmt(tot.protein)}g 지${fmt(tot.fat)}g</p>
<p class="hint">양을 바꾸면 칼로리·탄단지도 같은 비율로 바뀌어요. 단위를 바꾸면 영양값은 그대로 두고 단위만 바꿔요(예: 210g → 1공기). 음식 이름이나 영양값 자체는 ‘영양값 고치기’에서.</p>
<div class="actions qe-actions"><button type="button" class="button qm-save-btn" id="qm-save">저장<small>${h(mealDiff(st))}</small></button><button type="button" class="button secondary" id="qm-add">음식 추가</button><button type="button" class="text-button qe-del" id="qm-delete-all">이 식사 모두 삭제</button></div></div>`;
}
export function applyQuickMeal(db, st){
 const ids = new Set(st.rows.map(r => r.id)), byId = new Map((db.meals||[]).map(m => [m.id, m]));
 if(!/^\d{2}:\d{2}$/.test(st.time)) throw Error('먹은 시각을 확인해 주세요.');
 const at = new Date(`${st.newDate}T${st.time}:00`); if(Number.isNaN(at.getTime())) throw Error('날짜를 확인해 주세요.');
 const kept = st.rows.filter(r => !r.removed).map(r => { const m = byId.get(r.id); if(!m) return null; const t = rowTotals(r); return cleanMeal({...m, planned:m.planned===true||isFuture(at), date:st.newDate, slot:st.slot, loggedAt:at.toISOString(), servingQty:r.qty, servingUnit:r.unit||m.servingUnit, ...t, updatedAt:new Date().toISOString()}); }).filter(Boolean);
 // 단위를 바로잡았으면 같은 이름·옛 단위의 저장된 음식도 함께 바로잡는다(다음에 또 잘못 나오지 않게)
 // 4.4.1 점검 D-2: 값도 새 단위 기준(1단위당·100당)으로 바꿔 넣는다. 같은 이름·새 단위가 이미 있으면 하나로.
 const fixes = st.rows.filter(r => !r.removed && r.unit && byId.get(r.id) && (byId.get(r.id).servingUnit||'회')!==r.unit).map(r => { const t = rowTotals(r), fac = unitFactor(r.qty, r.unit) || 1; return {name:byId.get(r.id).name, from:byId.get(r.id).servingUnit||'회', to:r.unit, per:Object.fromEntries(NUT.map(k => [k, t[k]==null ? null : Math.round(t[k]/fac*10)/10]))}; });
 let foods = db.foods;
 if(fixes.length){ foods = (db.foods||[]).filter(f => !fixes.some(z => z.name===f.name && z.to===(f.servingUnit||'회'))).map(f => { const x = fixes.find(z => z.name===f.name && z.from===(f.servingUnit||'회')); if(!x) return f; const {unitGrams, ...rest} = f; return {...rest, servingUnit:x.to, ...x.per, updatedAt:new Date().toISOString()}; }); }
 return {...db, foods, meals:[...(db.meals||[]).filter(m => !ids.has(m.id)), ...kept]};
}

// ── 운동 ──
export function quickWorkoutState(w, gyms=[]){
 if(!w) return null;
 const at = new Date(w.loggedAt||w.createdAt||''); return {id:w.id, date:w.date, title:w.title||'', gym:w.gymName||'', gyms:[...new Set([...(gyms||[]), ...(w.gymName?[w.gymName]:[])])], time:Number.isNaN(at.getTime())?'':hhmm(at.toISOString()), duration:w.duration??'', ex:(w.exercises||[]).map(e => ({id:e.id, name:e.name, kind:e.kind, removed:false, sets:(e.sets||[]).map(s => ({id:s.id, weight:s.originalWeight??s.weight, unit:s.originalUnit||s.unit||'kg', reps:s.reps, completed:s.completed!==false, removed:false})), durationMin:e.durationMin, distanceKm:e.distanceKm}))};
}
export function readQuickWorkout(st, root){
 if(!root) return st;
 const v = id => root.querySelector('#'+id);
 st.date = v('qw-date')?.value || st.date; st.title = v('qw-title')?.value ?? st.title; const gc = v('qw-gym-custom'); if(gc && gc.value.trim()) st.gym = gc.value.trim(); st.time = v('qw-time')?.value ?? st.time; const du = v('qw-duration'); if(du) st.duration = du.value;
 st.ex.forEach((e, i) => { if(e.kind==='cardio'){ const d=v(`qw-${i}-dur`), k=v(`qw-${i}-km`); if(d) e.durationMin = d.value===''?null:Number(d.value); if(k) e.distanceKm = k.value===''?null:Number(k.value); return; }
  e.sets.forEach((s, j) => { const w = v(`qw-${i}-${j}-w`), r = v(`qw-${i}-${j}-r`), c = v(`qw-${i}-${j}-c`); if(w) s.weight = w.value===''?null:Number(w.value); if(r) s.reps = r.value===''?null:Number(r.value); if(c) s.completed = c.checked; }); });
 return st;
}
export function quickWorkoutHTML(st){
 const vol = st.ex.filter(e=>!e.removed&&e.kind!=='cardio').reduce((s, e) => s + e.sets.filter(x=>!x.removed&&x.completed).reduce((a, x) => a + (Number(x.weight)||0)*(Number(x.reps)||0), 0), 0);
 const sets = st.ex.filter(e=>!e.removed).reduce((s, e) => s + e.sets.filter(x=>!x.removed&&x.completed).length, 0);
 return `<div class="qe"><div class="qe-meta"><label class="field">날짜<input id="qw-date" type="date" value="${h(st.date)}"></label><label class="field">운동한 시각<input id="qw-time" type="time" value="${h(st.time)}"></label><label class="field">운동 시간(분)<input id="qw-duration" type="number" inputmode="numeric" min="0" step="1" value="${h(st.duration)}" placeholder="예: 60"></label></div><label class="field">운동 이름<input id="qw-title" value="${h(st.title)}" placeholder="예: 하체"></label><div class="field qe-gym"><span>센터</span><div class="chips">${(st.gyms||[]).map(g => `<button type="button" class="chip${g===st.gym?' active':''}" data-qw-gym="${h(g)}" aria-pressed="${g===st.gym}">${h(g)}</button>`).join('')}<button type="button" class="chip${st.gym?'':' active'}" data-qw-gym="" aria-pressed="${!st.gym}">없음</button></div><input id="qw-gym-custom" placeholder="다른 곳이면 이름 입력" value=""></div>
${st.ex.map((e, i) => e.removed ? `<div class="qe-ex removed"><span><s>${h(e.name)}</s> <small>종목 빼기로 함</small></span><button type="button" class="text-button" data-qw-exundo="${i}">되돌리기</button></div>` : `<div class="qe-ex"><div class="qe-ex-head"><b>${h(e.name)}</b><button type="button" class="text-button qe-del" data-qw-exremove="${i}">종목 빼기</button></div>${e.kind==='cardio' ? `<div class="qe-cardio"><label class="field">시간 분<input id="qw-${i}-dur" type="number" inputmode="decimal" min="0" step="any" value="${h(e.durationMin??'')}"></label><label class="field">거리 km<input id="qw-${i}-km" type="number" inputmode="decimal" min="0" step="any" value="${h(e.distanceKm??'')}"></label></div>` : `<div class="qe-sets"><div class="qe-set qe-set-head" aria-hidden="true"><span>세트</span><span>무게</span><span>횟수</span><span>완료</span><span></span></div>${e.sets.map((s, j) => s.removed ? '' : `<div class="qe-set"><span class="qe-n">${e.sets.slice(0, j+1).filter(x=>!x.removed).length}</span><label class="qe-in"><input id="qw-${i}-${j}-w" type="number" inputmode="decimal" min="0" step="any" value="${h(s.weight??'')}" aria-label="${h(e.name)} 세트 무게"><small>${h(s.unit)}</small></label><label class="qe-in"><input id="qw-${i}-${j}-r" type="number" inputmode="numeric" min="0" step="1" value="${h(s.reps??'')}" aria-label="${h(e.name)} 세트 횟수"><small>회</small></label><label class="qe-check"><input id="qw-${i}-${j}-c" type="checkbox" ${s.completed?'checked':''} aria-label="완료"></label><button type="button" class="qe-x" data-qw-setremove="${i}:${j}" aria-label="이 세트 삭제">×</button></div>`).join('')}</div><button type="button" class="text-button qe-add" data-qw-setadd="${i}">＋ 세트 추가</button>`}</div>`).join('')}
<p class="qe-total">완료 <b>${sets}세트</b> · 볼륨 ${fmt(vol)}kg</p>
<div class="actions qe-actions"><button type="button" class="button" id="qw-save">저장</button><button type="button" class="button secondary" data-work-edit="${h(st.id)}">자세히 수정</button><button type="button" class="text-button qe-del" id="qw-delete">이 운동 삭제</button></div></div>`;
}
export function applyQuickWorkout(db, st){
 const w = (db.workouts||[]).find(x => x.id===st.id); if(!w) throw Error('운동 기록을 찾지 못했어요.');
 const exById = new Map(w.exercises.map(e => [e.id, e]));
 const exercises = st.ex.filter(e => !e.removed).map(e => { const orig = exById.get(e.id) || {}; if(e.kind==='cardio') return {...orig, durationMin:e.durationMin, distanceKm:e.distanceKm};
  const setById = new Map((orig.sets||[]).map(s => [s.id, s]));
  const sets = e.sets.filter(s => !s.removed).map(s => { const o = setById.get(s.id) || {}; if(s.weight===null || s.reps===null) throw Error(`${e.name}: 무게와 횟수를 모두 넣어 주세요.`); return {...o, id:o.id||s.id, weight:s.weight, originalWeight:s.weight, unit:s.unit, originalUnit:s.unit, reps:s.reps, completed:s.completed}; });
  if(!sets.length) throw Error(`${e.name}: 세트가 하나도 없으면 ‘종목 빼기’를 눌러 주세요.`);
  return {...orig, sets}; });
 if(!exercises.length) throw Error('남은 종목이 없어요. 운동을 지우려면 ‘이 운동 삭제’를 눌러 주세요.');
 const next = cleanWorkout({...w, planned:w.planned===true||(st.time?isFuture(`${st.date}T${st.time}:00`):false), date:st.date, title:st.title, gymName:st.gym||'', exercises, ...(st.time?{loggedAtTime:st.time}:{}), duration:st.duration===''||st.duration==null?null:Number(st.duration), updatedAt:new Date().toISOString()});
 return {...db, workouts:db.workouts.map(x => x.id===w.id ? next : x)};
}
