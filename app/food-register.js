// 4.26.0 대표님 지시: 식단 '검색에 없는 음식'을 예전 상세 입력 화면이 아니라 빠른 기록 안의 3단계로 등록한다
// (운동 직접 등록을 고친 방식과 같게). ① 이름·단위 ② 영양값(비슷한 음식에서 / 영양성분표 사진 / 직접 입력) ③ 먹은 양 → 이번 식사에 담기.
// 등록한 음식은 그 사용자의 '내 음식'에만 저장된다(공용 DB·다른 사람에게 가지 않음).
// 저장 규칙(기존과 같음): g·ml 음식은 100g(100ml)당 값, 그 밖의 단위는 1단위당 값 + 1단위 무게(unitGrams, 선택).
// 이 파일은 app.js를 import하지 않는다.
import {MASS} from './domain.js';

export const REG_UNITS = ['팩', '개', '봉', '그릇', '인분', '컵', '조각', 'g', 'ml'];
export const REG_NUTS = [['calories', '칼로리', 'kcal'], ['carbs', '탄수화물', 'g'], ['protein', '단백질', 'g'], ['fat', '지방', 'g']];
export const REG_MICRO = [['sugar', '당류', 'g'], ['fiber', '식이섬유', 'g'], ['sodium', '나트륨', 'mg'], ['satFat', '포화지방', 'g']];
const KEYS = [...REG_NUTS, ...REG_MICRO].map(x => x[0]);
const r1 = v => Math.round(v*10)/10;
const num = v => { if (v == null || v === '') return null; const n = Number(String(v).replace(/,/g, '')); return Number.isFinite(n) && n >= 0 ? n : null; };
const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmt = (v, d = 0) => Number(v || 0).toLocaleString('ko-KR', {maximumFractionDigits: d});
const massU = u => MASS.has(u);

export const newReg = (name = '') => ({step: 1, name: String(name || '').trim(), unit: '팩', unitGrams: '', basis: 'unit', servingG: '', vals: {}, source: 'manual', from: '', src: 'similar', qty: 1, ocr: '', ocrBusy: false, err: ''});

// 영양표 기준 고르기: g·ml 음식은 100당/1회 제공량당, 그 밖은 1단위당/100g당/1회 제공량당
export function basisOptions(reg){
 const u = reg.unit, w = massU(u) ? u : 'g';
 return massU(u) ? [['100', `100${u}당`], ['serving', `1회 제공량(${w})당`]] : [['unit', `1${u}당`], ['100', '100g당'], ['serving', '1회 제공량(g)당']];
}
export function setUnit(reg, unit){
 reg.unit = unit;
 if (massU(unit)) { reg.unitGrams = ''; if (reg.basis === 'unit') reg.basis = '100'; }
 else if (!reg.basis || reg.basis === '100' && !reg.unitGrams) reg.basis = 'unit';
 reg.qty = massU(unit) ? 100 : 1;
 return reg;
}

// 화면 입력칸 → 상태(다시 그리기 전에 부른다)
export function readReg(reg, root){
 if (!reg || !root?.querySelector) return reg;
 const v = id => root.querySelector('#' + id)?.value;
 if (v('reg-name') != null) reg.name = String(v('reg-name')).trim();
 if (v('reg-grams') != null) reg.unitGrams = v('reg-grams');
 if (v('reg-serving') != null) reg.servingG = v('reg-serving');
 if (v('reg-qty') != null && num(v('reg-qty')) > 0) reg.qty = num(v('reg-qty'));
 for (const k of KEYS) { const x = v(`reg-v-${k}`); if (x != null) { const n = num(x); if (n == null) delete reg.vals[k]; else reg.vals[k] = n; } }
 return reg;
}

// 기준에 맞춰 적은 값 → 저장 규칙(g·ml은 100당, 그 밖은 1단위당)으로. 무게가 필요한데 없으면 이유를 돌려준다.
export function toPreset(reg){
 const u = reg.unit, g = num(reg.unitGrams), sg = num(reg.servingG), mass = massU(u);
 if (!reg.name) return {error: '음식 이름을 적어 주세요.'};
 let f;
 if (mass) f = reg.basis === 'serving' ? (sg ? 100/sg : null) : 1;
 else f = reg.basis === 'unit' ? 1 : reg.basis === '100' ? (g ? g/100 : null) : (sg && g ? g/sg : null);
 if (f == null) return {error: mass ? '1회 제공량이 몇 g인지 적어 주세요.' : reg.basis === '100' ? `1${u}이 몇 g인지 적어 주세요(100g당 값을 1${u}로 바꾸려면 필요해요).` : `1회 제공량(g)과 1${u} 무게(g)를 둘 다 적어 주세요.`};
 const vals = Object.fromEntries(KEYS.map(k => [k, reg.vals[k] == null ? null : r1(reg.vals[k]*f)]));
 if (REG_NUTS.every(([k]) => vals[k] == null)) return {error: '칼로리나 탄단지 중 하나는 있어야 해요. 비슷한 음식에서 가져오거나 영양성분표 사진을 써 보세요.'};
 const micro = Object.fromEntries(REG_MICRO.map(([k]) => [k, vals[k]]).filter(([, v]) => v != null));
 const est = reg.source === 'similar' ? {aiEstimate: {estimated: true, basis: `비슷한 음식 값: ${reg.from}`.slice(0, 160)}} : {};
 return {preset: {name: reg.name, servingUnit: u, ...(mass ? {} : g ? {unitGrams: g} : {}), source: reg.source === 'similar' ? '비슷한 음식 추정' : reg.source === 'label' ? '영양성분표 사진' : 'manual', calories: vals.calories, carbs: vals.carbs, protein: vals.protein, fat: vals.fat, ...micro, ...est}};
}

// 탄단지로 계산한 열량과 적은 열량이 크게 다르면 한 줄 알림
export function macroCheck(vals = {}){
 const k = vals.calories, est = (vals.carbs || 0)*4 + (vals.protein || 0)*4 + (vals.fat || 0)*9;
 if (k == null || !(est > 0)) return '';
 return Math.abs(est - k) > Math.max(40, k*0.25) ? `탄단지로 계산하면 약 ${fmt(est)}kcal이에요. 칼로리나 탄단지를 한 번 확인해 주세요.` : '';
}

// ── 비슷한 음식 ── 이름 앞 단어를 하나씩 떼며 찾는다('우리집 수제 그래놀라' → '수제 그래놀라' → '그래놀라')
export function similarFoods(name, search, {limit = 5} = {}){
 const words = String(name || '').trim().split(/\s+/).filter(Boolean), seen = new Set(), out = [];
 for (let i = 0; i < words.length && out.length < limit; i++) {
  const q = words.slice(i).join(' '); if (q.length < 2) continue;
  for (const x of (search(q, {limit: 8}) || [])) { if (seen.has(x.id) || x.calories == null) continue; seen.add(x.id); out.push(x); if (out.length >= limit) break; }
 }
 return out;
}
// 그 음식의 100g당 값(무게를 모르면 null)
export function per100(item){
 if (!item) return null;
 const f = massU(item.servingUnit) ? 1 : item.unitGrams > 0 ? 100/item.unitGrams : null; if (f == null) return null;
 return Object.fromEntries(KEYS.map(k => [k, item[k] == null ? null : r1(item[k]*f)]));
}
export function applySimilar(reg, item){
 const p = per100(item), g = num(reg.unitGrams), pick = o => Object.fromEntries(KEYS.filter(k => o[k] != null).map(k => [k, o[k]]));
 if (massU(reg.unit)) { if (!p) return reg; reg.basis = '100'; reg.vals = pick(p); }
 else if (g && p) { reg.basis = 'unit'; reg.vals = pick(Object.fromEntries(KEYS.map(k => [k, p[k] == null ? null : r1(p[k]*g/100)]))); }
 else if (!massU(item.servingUnit)) { reg.basis = 'unit'; if (item.unitGrams && !g) reg.unitGrams = String(item.unitGrams); reg.vals = pick(item); }
 else if (p) { reg.basis = '100'; reg.vals = pick(p); }
 reg.source = 'similar'; reg.from = item.name; return reg;
}

// ── 영양성분표 사진 ── 글자로 읽은 내용에서 값과 기준을 찾는다(사진은 기기 안에서만 읽고 보내지 않음)
export function parseLabel(text){
 const t = String(text || '').normalize('NFKC').replace(/[|]/g, ' ').replace(/(\d)\s*[,]\s*(\d{3})/g, '$1$2').replace(/(\d)\s+\.\s*(\d)/g, '$1.$2');
 const n = re => { const m = t.match(re); return m ? Number(m[1]) : null; };
 const vals = {
  calories: n(/열\s*량[^\d]{0,12}(\d+(?:\.\d+)?)\s*k?\s*cal/i) ?? n(/(\d+(?:\.\d+)?)\s*kcal/i),
  carbs: n(/탄\s*수\s*화\s*물[^\d]{0,8}(\d+(?:\.\d+)?)\s*g/),
  sugar: n(/당\s*류[^\d]{0,8}(\d+(?:\.\d+)?)\s*g/),
  fiber: n(/식\s*이\s*섬\s*유[^\d]{0,8}(\d+(?:\.\d+)?)\s*g/),
  protein: n(/단\s*백\s*질[^\d]{0,8}(\d+(?:\.\d+)?)\s*g/),
  fat: n(/(?<![화스]\s*)지\s*방[^\d]{0,8}(\d+(?:\.\d+)?)\s*g/),
  satFat: n(/포\s*화\s*지\s*방[^\d]{0,8}(\d+(?:\.\d+)?)\s*g/),
  sodium: n(/나\s*트\s*륨[^\d]{0,8}(\d+(?:\.\d+)?)\s*mg/),
 };
 const total = n(/총\s*내\s*용\s*량[^\d]{0,10}(\d+(?:\.\d+)?)\s*(?:g|ml|mL)/), serving = n(/1\s*회\s*제\s*공\s*량[^\d]{0,10}(\d+(?:\.\d+)?)\s*(?:g|ml|mL)/);
 const basis = /100\s*(?:g|ml|mL)\s*당/.test(t) ? '100' : /총\s*내\s*용\s*량\s*당/.test(t) ? 'package' : /1\s*회\s*제\s*공\s*량\s*당/.test(t) ? 'serving' : null;
 const found = Object.fromEntries(Object.entries(vals).filter(([, v]) => v != null));
 return {vals: found, basis, total, serving, count: Object.keys(found).length};
}
export function applyLabel(reg, p){
 if (!p || !p.count) return reg;
 const mass = massU(reg.unit);
 if (p.basis === '100') { reg.basis = '100'; if (!mass && p.total && !num(reg.unitGrams)) reg.unitGrams = String(p.total); }
 else if (p.basis === 'package') { if (mass) { reg.basis = 'serving'; reg.servingG = String(p.total || ''); } else { reg.basis = 'unit'; if (p.total) reg.unitGrams = String(p.total); } }
 else if (p.basis === 'serving') { reg.basis = 'serving'; if (p.serving) reg.servingG = String(p.serving); if (!mass && p.total && !num(reg.unitGrams)) reg.unitGrams = String(p.total); }
 reg.vals = {...p.vals}; reg.source = 'label'; reg.from = '영양성분표 사진'; return reg;
}
export async function recognizeLabel(file, T){
 const base = new URL('.', location.href), worker = await T.createWorker('kor+eng', 1, {workerPath: new URL('vendor/worker.min.js', base).href, corePath: new URL('vendor/core', base).href, langPath: new URL('vendor/lang', base).href, workerBlobURL: false});
 try { const {data} = await worker.recognize(file); return data?.text || ''; } finally { await worker.terminate(); }
}

// ── 화면 ──
const basisText = reg => (basisOptions(reg).find(([k]) => k === reg.basis) || basisOptions(reg)[0])[1].replace('1회 제공량', reg.servingG ? `1회 제공량 ${reg.servingG}` : '1회 제공량');
export function regHTML(reg, {similar = [], dbReady = true} = {}){
 const u = reg.unit, mass = massU(u), steps = ['이름·단위', '영양값', '먹은 양'];
 const head = `<div class="quick-overlay-head"><h3>새 음식 등록</h3><button type="button" class="close" data-reg-close aria-label="새 음식 등록 닫기">×</button></div><ol class="reg-steps">${steps.map((s, i) => `<li class="${reg.step === i + 1 ? 'on' : reg.step > i + 1 ? 'done' : ''}">${i + 1}. ${s}</li>`).join('')}</ol>${reg.err ? `<p class="reg-err" role="alert">${esc(reg.err)}</p>` : ''}`;
 let body = '';
 if (reg.step === 1) {
  body = `<label class="field">음식 이름<input id="reg-name" value="${esc(reg.name)}" placeholder="예: 우리집 수제 그래놀라" autocomplete="off"></label>
<p class="reg-q">어떻게 먹었나요?</p><div class="chip-row" role="group" aria-label="단위">${REG_UNITS.map(x => `<button type="button" class="chip ${x === u ? 'active' : ''}" data-reg-unit="${esc(x)}">${esc(x)}</button>`).join('')}</div>
${mass ? '' : `<label class="field">1${esc(u)} 무게 · 선택<input id="reg-grams" type="number" inputmode="decimal" min="0" step="any" value="${esc(reg.unitGrams)}" placeholder="포장지의 총 내용량(g)"></label><p class="hint">몰라도 괜찮아요. 적어 두면 100g당 값도 1${esc(u)} 값으로 바꿔 드려요.</p>`}
<button type="button" class="button" data-reg-next>다음 · 영양값</button>`;
 } else if (reg.step === 2) {
  const tabs = [['similar', '비슷한 음식에서'], ['label', '영양성분표 사진'], ['manual', '직접 입력']];
  const src = reg.src === 'similar' ? (similar.length ? `<p class="hint">내 음식에만 쓰여요. 고른 값은 '추정'으로 표시되고 언제든 고칠 수 있어요.</p><div class="reg-sim">${similar.map(x => { const p = per100(x); return `<button type="button" class="quick-choice${reg.from === x.name ? ' active' : ''}" data-reg-sim="${esc(x.id)}"><strong>${esc(x.name)}</strong><small>${fmt(x.calories)}kcal / ${massU(x.servingUnit) ? `100${esc(x.servingUnit)}` : `1${esc(x.servingUnit)}${x.unitGrams ? `(${fmt(x.unitGrams)}g)` : ''}`}${p && !massU(x.servingUnit) ? ` · 100g당 ${fmt(p.calories)}kcal` : ''}</small></button>`; }).join('')}</div>` : `<p class="hint">${dbReady ? '이름으로 비슷한 음식을 못 찾았어요. 사진이나 직접 입력을 써 주세요.' : '음식 DB를 불러오는 중이에요…'}</p>`)
   : reg.src === 'label' ? `<label class="button secondary reg-photo-btn">${reg.ocrBusy ? '읽는 중…' : '영양성분표 찍기 · 고르기'}<input id="reg-photo" type="file" accept="image/*" capture="environment" hidden ${reg.ocrBusy ? 'disabled' : ''}></label><p class="hint">포장지 뒷면의 '영양정보' 표를 반듯하게 찍어 주세요. 사진은 이 기기 안에서만 읽어요.</p>${reg.ocr ? `<p class="reg-ok">${esc(reg.ocr)}</p>` : ''}`
   : '<p class="hint">포장지나 메뉴판에 적힌 값을 그대로 적어 주세요. 모르는 칸은 비워 두면 0이 아니라 \'모름\'으로 남아요.</p>';
  const basis = `<p class="reg-q">값의 기준</p><div class="chip-row" role="group" aria-label="영양값 기준">${basisOptions(reg).map(([k, l]) => `<button type="button" class="chip ${reg.basis === k ? 'active' : ''}" data-reg-basis="${k}">${esc(l)}</button>`).join('')}</div>${reg.basis === 'serving' ? `<label class="field">1회 제공량 · ${mass ? esc(u) : 'g'}<input id="reg-serving" type="number" inputmode="decimal" min="0" step="any" value="${esc(reg.servingG)}"></label>` : ''}${!mass && reg.basis !== 'unit' ? `<label class="field">1${esc(u)} 무게 · g<input id="reg-grams" type="number" inputmode="decimal" min="0" step="any" value="${esc(reg.unitGrams)}"></label>` : ''}`;
  const field = ([k, l, un]) => `<label class="field">${l} · ${un}<input id="reg-v-${k}" type="number" inputmode="decimal" min="0" step="any" value="${reg.vals[k] == null ? '' : esc(reg.vals[k])}"></label>`;
  const chk = macroCheck(reg.vals);
  body = `<div class="chip-row reg-src" role="tablist" aria-label="영양값 채우는 방법">${tabs.map(([k, l]) => `<button type="button" class="chip ${reg.src === k ? 'active' : ''}" data-reg-src="${k}" role="tab" aria-selected="${reg.src === k}">${l}</button>`).join('')}</div>${src}
${basis}${reg.source === 'similar' && reg.from ? `<p class="reg-from">추정 · ${esc(reg.from)} 값에서 가져왔어요</p>` : ''}<div class="form-grid reg-vals">${REG_NUTS.map(field).join('')}</div>
<details class="reg-micro"><summary>당류·식이섬유·나트륨·포화지방 · 선택</summary><div class="form-grid">${REG_MICRO.map(field).join('')}</div></details>${chk ? `<p class="reg-warn">⚠ ${esc(chk)}</p>` : ''}
<div class="reg-actions"><button type="button" class="button secondary" data-reg-back>이전</button><button type="button" class="button" data-reg-next>다음 · 먹은 양</button></div>`;
 } else {
  const r = toPreset(reg), p = r.preset || {}, opts = mass ? [50, 100, 150, 200, 300] : [0.5, 1, 1.5, 2, 3], f = mass ? reg.qty/100 : reg.qty;
  const eaten = REG_NUTS.map(([k]) => p[k] == null ? null : r1(p[k]*f));
  body = `<p class="reg-sum"><b>${esc(reg.name)}</b><small>${esc(mass ? `100${u}` : `1${u}${p.unitGrams ? `(${fmt(p.unitGrams)}g)` : ''}`)}당 ${p.calories == null ? '칼로리 모름' : `${fmt(p.calories)}kcal`} · 탄 ${p.carbs ?? '—'} · 단 ${p.protein ?? '—'} · 지 ${p.fat ?? '—'}${reg.source === 'similar' ? ' · 추정' : ''}</small></p>
<p class="reg-q">얼마나 먹었나요?</p><div class="chip-row">${opts.map(q => `<button type="button" class="chip ${Number(reg.qty) === q ? 'active' : ''}" data-reg-qty="${q}">${q === 0.5 && !mass ? '반' : q}${esc(u)}</button>`).join('')}</div>
<label class="field">직접 입력 · ${esc(u)}<input id="reg-qty" type="number" inputmode="decimal" min="0.01" step="any" value="${esc(reg.qty)}"></label>
<p class="quick-food-macro">${eaten[0] == null ? '칼로리 모름' : `${fmt(eaten[0])} kcal`} · 탄 ${eaten[1] ?? '—'}g · 단 ${eaten[2] ?? '—'}g · 지 ${eaten[3] ?? '—'}g</p>
<p class="hint">'내 음식'에 저장돼서 다음부터는 검색에 바로 나와요. 다른 사람에게는 보이지 않아요.</p>
<div class="reg-actions"><button type="button" class="button secondary" data-reg-back>이전</button><button type="button" class="button" data-reg-done>이 식사에 담기</button></div>`;
 }
 return `<div class="quick-overlay reg-overlay" role="dialog" aria-label="새 음식 등록">${head}${body}</div>`;
}
export {basisText};
