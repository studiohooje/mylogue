// 4.28.0 대표님(2026-11-24): 관리자 계정에 쌓인 '내 값'(내 음식·내 종목) 가운데 공용으로 쓸 만한 것을 공용 도감으로 한 번에 올린다.
// - 이미 공용 도감·기본 종목에 같은 이름이 있으면 빼고, 값이 미심쩍으면(탄단지 빈 값·검산 어긋남) 기본으로 체크하지 않는다.
// - 실제로 올리는 것은 관리자가 화면에서 고르고 누를 때만(saveSharedCatalogItem, 규칙상 관리자만 쓰기).
// 이 파일은 app.js를 import하지 않는다.
import {foodIssue} from './food-check.js';
const norm = s => String(s || '').toLocaleLowerCase('ko').replace(/\s+/g, '').replace(/[()（）\[\]·.,_-]/g, '');
const idPart = s => String(s || '').replace(/[^\p{L}\p{N}._: -]/gu, '-').slice(0, 80);
const CATALOG_UNITS = new Set(['g', '개', '회']);
export function promoteCandidates(db = {}, {sharedFoods = [], sharedExercises = [], baseExercises = []} = {}) {
 const haveFood = new Set(sharedFoods.map(x => norm(x.name)));
 const haveEx = new Set([...baseExercises, ...sharedExercises].flatMap(x => [x.name, ...(x.aliases || [])]).map(norm));
 const foods = [], seen = new Set();
 for (const f of db.foods || []) {
  if (f.catalog || f.source === '대표값' || !String(f.name || '').trim()) continue;
  const key = norm(f.name); if (seen.has(key)) continue; seen.add(key);
  const unitOk = CATALOG_UNITS.has(f.servingUnit), unit = unitOk ? f.servingUnit : '회';
  const name = unitOk || !f.servingUnit ? f.name.trim() : `${f.name.trim()} (1${f.servingUnit})`;
  const item = {id: `food:mine:${idPart(f.name)}`, name, servingQty: unitOk ? Number(f.servingQty) || (unit === 'g' ? 100 : 1) : 1, servingUnit: unit, calories: f.calories, carbs: f.carbs, protein: f.protein, fat: f.fat};
  let reason = '';
  if (haveFood.has(norm(name)) || haveFood.has(key)) reason = '공용 도감에 같은 이름이 있어요';
  else if ([item.calories, item.carbs, item.protein, item.fat].some(v => v == null || v === '' || !Number.isFinite(Number(v)) || Number(v) < 0)) reason = '열량·탄단지 중 빈 값이 있어요';
  else { const is = foodIssue(f, {kind: 'food'}); if (is) reason = is.text; }
  foods.push({kind: 'foods', item, ok: !reason, reason, note: unitOk ? '' : `단위 '${f.servingUnit}'는 공용 도감에서 '1회'로`});
 }
 const exercises = [], seenEx = new Set();
 for (const e of db.customExercises || []) {
  const key = norm(e.name); if (!key || seenEx.has(key)) continue; seenEx.add(key);
  const item = {id: `ex:mine:${idPart(e.name)}`, name: String(e.name).trim(), part: e.part || '기타', equipment: e.equipment || '기타', kind: e.kind === 'cardio' ? 'cardio' : 'strength', aliases: (e.aliases || []).slice(0, 12), primaryMuscleIds: e.primaryMuscleIds || [], secondaryMuscleIds: e.secondaryMuscleIds || []};
  const reason = haveEx.has(key) ? '기본·공용 종목에 같은 이름이 있어요' : '';
  exercises.push({kind: 'exercises', item, ok: !reason, reason, note: ''});
 }
 return {foods, exercises};
}
export function promoteHTML(c, esc, picked = null) {
 const all = [...c.foods, ...c.exercises];
 if (!all.length) return `<section class="section card" id="catalog-promote"><h3>내 값 → 공용 도감</h3><p class="hint">이 계정에 공용으로 올릴 내 음식·내 종목이 없어요.</p></section>`;
 const on = x => picked ? picked.has(x.item.id) : x.ok;
 const row = x => `<label class="promote-row ${x.ok ? '' : 'muted'}"><input type="checkbox" data-promote="${esc(x.item.id)}" ${on(x) ? 'checked' : ''}><span><b>${esc(x.item.name)}</b> <small>${x.kind === 'foods' ? `${esc(x.item.servingQty)}${esc(x.item.servingUnit)} · ${esc(x.item.calories)}kcal · 탄${esc(x.item.carbs)} 단${esc(x.item.protein)} 지${esc(x.item.fat)}` : `${esc(x.item.part)} · ${esc(x.item.equipment)}`}</small>${x.reason ? `<small class="warn">${esc(x.reason)}</small>` : ''}${x.note ? `<small>${esc(x.note)}</small>` : ''}</span></label>`;
 const n = all.filter(on).length;
 return `<section class="section card" id="catalog-promote"><h3>내 값 → 공용 도감 <span class="status-badge info">관리자</span></h3><p class="hint">이 계정의 내 음식·내 종목 가운데 공용 도감에 없는 것이에요. 값이 미심쩍은 것은 체크하지 않았어요. 올리면 승인된 모든 사용자가 검색에서 볼 수 있어요(내 기록은 그대로).</p>${c.foods.length ? `<h4>내 음식 ${c.foods.length}</h4>${c.foods.map(row).join('')}` : ''}${c.exercises.length ? `<h4>내 종목 ${c.exercises.length}</h4>${c.exercises.map(row).join('')}` : ''}<button type="button" class="button" id="promote-run" ${n ? '' : 'disabled'}>고른 ${n}개 공용 도감에 올리기</button></section>`;
}
