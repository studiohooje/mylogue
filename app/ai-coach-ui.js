// 4.17.0 AI 코치(플러스): 이번 주 리뷰, AI에게 묻기, 레시피 글 자동 분해.
// 숫자는 앱이 계산해 요약으로 보내고, AI는 그 숫자로 말만 만든다(지어내지 않게). 주간 리뷰 결과만 이 기기에 남긴다(4.29.3).
import {isPlus, lockHTML} from './plan.js';
import {aiUsable, aiConnected} from './ai-client.js';
import {fakeAI} from './plan.js';
import {scopedKey} from './storage-scope.js';

// 4.29.3 대표님(2026-11-25): 분석은 '분석받기'를 눌렀을 때만 새로 만든다(자동·실시간 호출 없음).
// 마지막 결과를 이 기기에 남겨 새로고침해도 다시 부르지 않게 하고, 기록이 그때와 같으면 다시 부르지 않는다.
const REVIEW_KEY = () => scopedKey('mylogue.aiReview');
export function lastReview(){ try{ const v = JSON.parse(globalThis.localStorage?.getItem(REVIEW_KEY()) || 'null'); return v && typeof v.text === 'string' ? v : null; }catch{ return null; } }
export function saveReview(text, summary){ try{ globalThis.localStorage?.setItem(REVIEW_KEY(), JSON.stringify({text: String(text || ''), summary: String(summary || ''), at: Date.now()})); }catch{} }
export const reviewUnchanged = summary => { const r = lastReview(); return !!r && r.summary === String(summary || ''); };
const when = ms => { const d = new Date(ms); return `${d.getMonth() + 1}월 ${d.getDate()}일 ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`; };

const DAY = 86400000;
const ymd = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const r0 = n => Math.round(n), r1 = n => Math.round(n * 10) / 10;

// 지난 7일 요약(한국어 몇 줄). 기록이 거의 없으면 짧아서 서버가 '기록 부족'으로 돌려보낸다.
export function weekSummaryText(db, todayStr) {
  const end = new Date(todayStr + 'T12:00:00'), days = [...Array(7)].map((_, i) => ymd(new Date(end - (6 - i) * DAY))), inWeek = d => days.includes(String(d || '').slice(0, 10));
  const meals = (db.meals || []).filter(m => inWeek(m.date) && !m.planned);
  const mealDays = days.filter(d => meals.some(m => m.date === d));
  const sum = k => meals.reduce((s, m) => s + (Number(m[k]) || 0), 0);
  const workouts = (db.workouts || []).filter(w => inWeek(w.date) && w.status !== 'planned' && !w.planned);
  const body = (db.body || []).filter(b => inWeek(b.date) && Number(b.weight) > 0).sort((a, b) => String(a.date).localeCompare(String(b.date)));
  const lines = [`기간: ${days[0]} ~ ${days[6]}`];
  lines.push(mealDays.length ? `식사 기록한 날: ${mealDays.length}일, 기록한 날 하루 평균 ${r0(sum('calories') / mealDays.length)}kcal · 단백질 ${r0(sum('protein') / mealDays.length)}g · 탄수화물 ${r0(sum('carbs') / mealDays.length)}g · 지방 ${r0(sum('fat') / mealDays.length)}g` : '식사 기록 없음');
  lines.push(workouts.length ? `운동한 날: ${new Set(workouts.map(w => w.date)).size}일(${workouts.length}회), 종목: ${[...new Set(workouts.flatMap(w => (w.exercises || []).map(e => e.name)))].slice(0, 8).join(', ')}` : '운동 기록 없음');
  if (body.length >= 2) lines.push(`체중: ${body[0].weight}kg → ${body.at(-1).weight}kg (${r1(body.at(-1).weight - body[0].weight) >= 0 ? '+' : ''}${r1(body.at(-1).weight - body[0].weight)}kg)`);
  else if (body.length) lines.push(`체중: ${body[0].weight}kg (한 번 기록)`);
  const goal = db.settings?.calorieGoal; if (goal) lines.push(`하루 목표: ${goal}kcal`);
  return lines.join('\n');
}
// 묻기용 짧은 맥락(최근 3일 식사 이름·합계, 최근 운동)
export function chatContext(db, todayStr) {
  const end = new Date(todayStr + 'T12:00:00'), days = [0, 1, 2].map(i => ymd(new Date(end - i * DAY)));
  return days.map(d => { const ms = (db.meals || []).filter(m => m.date === d && !m.planned); const kcal = ms.reduce((s, m) => s + (Number(m.calories) || 0), 0); const ws = (db.workouts || []).filter(w => w.date === d && w.status !== 'planned' && !w.planned); return `${d}: ${ms.length ? `${ms.map(m => m.name).slice(0, 8).join(', ')} (약 ${r0(kcal)}kcal)` : '식사 기록 없음'}${ws.length ? ` / 운동 ${ws.map(w => w.title || w.exercises?.[0]?.name || '운동').join(', ')}` : ''}`; }).join('\n');
}

// 레시피 재료 → 음식 DB 매칭 → 1인분 영양. search(name) → 후보 음식 목록(food-db rowToFood 형식)
export function perGram(food) {
  if (!food) return null;
  const g = food.servingUnit === 'g' || food.servingUnit === 'ml' ? food.servingQty : food.unitGrams;
  if (!(g > 0)) return null;
  return Object.fromEntries(['calories', 'carbs', 'protein', 'fat'].map(k => [k, food[k] == null ? null : food[k] / g]));
}
export function matchRecipe(recipe, search) {
  const servings = Math.max(1, Math.min(20, Number(recipe?.servings) || 1));
  const rows = (recipe?.ingredients || []).slice(0, 30).map(ing => {
    const name = String(ing.name || '').trim().slice(0, 30), g = Number(ing.g);
    const cands = name ? search(name) : [];
    const food = cands.find(f => perGram(f)) || null, pg = perGram(food);
    const ok = pg && g > 0;
    return {name, amount: String(ing.amount || '').slice(0, 20), g: g > 0 ? g : null, food: food ? food.name : '', ...(ok ? Object.fromEntries(Object.entries(pg).map(([k, v]) => [k, v == null ? null : v * g])) : {calories: null, carbs: null, protein: null, fat: null}), matched: !!ok};
  });
  const tot = k => rows.reduce((s, x) => s + (x[k] || 0), 0);
  const totalG = rows.reduce((s, x) => s + (x.matched ? x.g : 0), 0);
  const per = Object.fromEntries(['calories', 'carbs', 'protein', 'fat'].map(k => [k, r1(tot(k) / servings)]));
  return {name: String(recipe?.name || '내 레시피').trim().slice(0, 30) || '내 레시피', servings, rows, perServing: {...per, grams: r0(totalG / servings)}, matched: rows.filter(x => x.matched).length};
}
export const recipeFoodPreset = m => ({name: m.name, servingQty: 1, servingUnit: '인분', ...(m.perServing.grams > 0 ? {unitGrams: m.perServing.grams} : {}), calories: r0(m.perServing.calories), carbs: m.perServing.carbs, protein: m.perServing.protein, fat: m.perServing.fat, source: 'recipe'});

const note = () => fakeAI() ? '<p class="hint">가짜 AI 모드예요. 정해진 답이 나와요.</p>' : '';
export function aiCoachCardHTML(st, esc) {
  if (!isPlus()) return `<section class="section card ai-coach"><h3>AI 코치</h3>${lockHTML('ai-review', esc)}${lockHTML('ai-chat', esc)}</section>`;
  if (!aiUsable()) return `<section class="section card ai-coach"><h3>AI 코치 <span class="status-badge info plus-cap">✦ 플러스</span></h3><p class="hint">AI가 아직 연결되지 않았어요. 연결되면 이번 주 리뷰와 묻기를 바로 쓸 수 있어요.</p></section>`;
  const busy = st.busy, saved = lastReview(), review = st.review || saved?.text || '';
  return `<section class="section card ai-coach"><h3>AI 코치 <span class="status-badge info plus-cap">✦ 플러스</span></h3>${note()}
  <div class="actions"><button type="button" class="button" id="ai-review-run" ${busy ? 'disabled' : ''}>${busy === 'review' ? '분석하는 중…' : review ? '다시 분석받기' : '이번 주 분석받기'}</button><button type="button" class="button secondary" id="ai-recipe-open">레시피 글로 음식 만들기</button></div>
  ${review ? `<div class="ai-answer" role="status">${saved?.at ? `<small class="hint">${esc(when(saved.at))} 분석 · 누를 때만 새로 만들어요</small><br>` : ''}${esc(review).replace(/\n/g, '<br>')}</div>` : '<p class="hint">분석은 버튼을 누를 때만 만들어요. 저절로 바뀌지 않아요.</p>'}
  <form id="ai-chat-form" class="ai-chat"><label for="ai-chat-q">AI에게 묻기</label><textarea id="ai-chat-q" rows="2" maxlength="500" placeholder="예: 오늘 저녁 뭐 먹으면 좋을까요?">${esc(st.q || '')}</textarea><button type="submit" class="button secondary" ${busy ? 'disabled' : ''}>${busy === 'chat' ? '답 기다리는 중…' : '묻기'}</button></form>
  ${(st.chat || []).slice(-3).map(c => `<div class="ai-qa"><b>${esc(c.q)}</b><p>${esc(c.a).replace(/\n/g, '<br>')}</p></div>`).join('')}
  ${st.msg ? `<p class="hint warn">${esc(st.msg)}</p>` : ''}
  <p class="hint">AI 답은 참고용이에요. 진단이나 처방이 아니고, 몸 상태가 걱정되면 전문가와 상의해 주세요.${st.left != null ? ` · 오늘 남은 횟수 ${st.left}` : ''}</p></section>`;
}
export function recipeModalHTML(st, esc) {
  if (!isPlus()) return lockHTML('ai-recipe', esc);
  if (!aiUsable()) return '<p class="hint">AI가 아직 연결되지 않았어요.</p>';
  const m = st.match;
  return `${note()}<form id="ai-recipe-form"><label for="ai-recipe-text">레시피 글 붙여 넣기</label><textarea id="ai-recipe-text" rows="8" maxlength="3000" placeholder="블로그나 메모의 재료 부분을 붙여 넣어 주세요. 예: 김치찌개 2인분 / 김치 200g / 돼지고기 150g / 두부 반 모">${esc(st.text || '')}</textarea><button type="submit" class="button" ${st.busy ? 'disabled' : ''}>${st.busy ? '나누는 중…' : '재료 나누기'}</button></form>
  ${st.msg ? `<p class="hint warn">${esc(st.msg)}</p>` : ''}
  ${m ? `<div class="recipe-result"><h4>${esc(m.name)} · ${m.servings}인분 기준</h4><table class="mini-table"><thead><tr><th>재료</th><th>양</th><th>맞춘 음식</th><th>kcal</th></tr></thead><tbody>${m.rows.map(x => `<tr class="${x.matched ? '' : 'unmatched'}"><td>${esc(x.name)}</td><td>${esc(x.amount || (x.g ? x.g + 'g' : '-'))}</td><td>${x.matched ? esc(x.food) : '못 찾음'}</td><td>${x.calories == null ? '-' : r0(x.calories)}</td></tr>`).join('')}</tbody></table>
  <p><b>1인분</b> 약 ${r0(m.perServing.calories)}kcal · 탄 ${r0(m.perServing.carbs)}g · 단 ${r0(m.perServing.protein)}g · 지 ${r0(m.perServing.fat)}g${m.perServing.grams ? ` · 약 ${m.perServing.grams}g` : ''}</p>
  <p class="hint">재료 ${m.rows.length}개 중 ${m.matched}개를 음식 DB와 맞췄어요. 못 찾은 재료는 빠진 값이라 실제보다 적을 수 있어요.</p>
  <button type="button" class="button" id="ai-recipe-save" ${m.matched ? '' : 'disabled'}>내 음식으로 저장</button></div>` : ''}`;
}
export {aiConnected};
