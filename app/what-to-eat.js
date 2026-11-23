// 4.17.0 '오늘 남은 걸로 뭐 먹지'(대표님: 컨셉별로). 기분(보상·균형·타이트) × 장소(외식·배달·편의점·집밥)로 고르면
// 오늘 남은 칼로리·단백질에 맞는 메뉴를 음식 DB에서 찾아 '양까지' 제안한다. 보상이어도 꾸짖지 않고, 남은 양 대비 차이를 숫자로 보여 준다.
import {foodRows, rowToFood} from './food-db.js';

export const MOODS = [['reward', '보상', '오늘은 맛있게, 선은 지키면서'], ['balance', '균형', '남은 양에 맞춘 무난한 한 끼'], ['tight', '타이트', '단백질은 채우고 칼로리는 아끼기']];
export const PLACES = [['out', '외식'], ['delivery', '배달'], ['store', '편의점'], ['home', '집밥']];
const TASTY = /도시락|불닭|핫바|김밥|치킨|피자|버거|떡볶이|삼겹|파스타|라멘|라면|돈까스|돈가스|족발|보쌈|마라|짜장|짬뽕|탕수육|초밥|스테이크|곱창|막창|닭갈비|찜닭|냉면|국밥|감자탕|부대찌개|햄버거|타코|쌀국수|우동|김치볶음밥|제육|불고기|갈비/;
const LEAN = /닭가슴살|가슴살|샐러드|포케|두부|계란|달걀|연어|참치|그릭|요거트|프로틴|단백질|회덮밥|생선|구이|수육|닭안심|오트|곤약/;
const DELIVERY_BRAND = /치킨|피자|버거|맘스터치|롯데리아|맥도날드|버거킹|KFC|도미노|파파존스|미스터피자|피자헛|BBQ|bhc|교촌|굽네|또래오래|네네|60계|처갓집|페리카나|떡볶이|엽기|신전|족발|보쌈|마라|본죽|서브웨이|알볼로|지정환|피자마루|7번가|반올림|푸라닭|자담/i;
const DELIVERY_DISH = /짜장|짬뽕|탕수육|족발|보쌈|떡볶이|치킨|피자|찜닭|마라탕|쌀국수|초밥|돈까스|돈가스|부대찌개|감자탕|아구찜|곱창/;
const CAFE = /커피|카페|스타벅스|이디야|빽다방|투썸|파스쿠찌|할리스|메가|매머드|컴포즈|공차|팔공티|요거프레소|더벤티|바나프레소|폴바셋|커피빈|달콤|엔제리너스|드롭탑|배스킨|파리바게뜨|뚜레쥬르|더리터|아임일리터|커피/;
const STORE_NAME = /도시락|삼각김밥|김밥|샌드위치|샐러드|닭가슴살|컵밥|주먹밥|버거|핫바|구운\s?(계란|란)|훈제란|볶음밥|덮밥/;
const NOT_MEAL = /분말|파우더|아이솔릿|웨이\s?프로틴|프로틴\s?워터|워터|드링크|음료|쉐이크|셰이크|주스|우유|두유|시리얼|소스|드레싱|양념|믹스|가루|시럽|잼|원액|농축|스프레드|버터|오일|기름/;
const DRINK_UNIT = /^(잔|ml|mL|L|Tall|Grande|Venti|Short|Regular|Large|EX|Standard)$/i;

// 한 번 먹는 양(1회)의 영양: 질량 단위 행은 대표 g(r[3])으로, 개수 단위 행은 그대로
function serving(r) {
  const [name, brand, unit, grams, kcal, carbs, protein, fat, tag] = r;
  if (kcal == null || protein == null) return null;
  const mass = !unit || unit === 'g' || unit === 'ml';
  if (mass) { if (!(grams > 0) || grams > ((tag === 'p' || tag === 'm') ? 300 : 450)) return null; const f = grams / 100; return {name, brand, tag, unit: 'g', qty: grams, kcal: kcal * f, carbs: (carbs || 0) * f, protein: protein * f, fat: (fat || 0) * f}; }
  return {name, brand, tag, unit, qty: 1, kcal, carbs: carbs || 0, protein, fat: fat || 0};
}
export function placeOf(r) {
  const [name, brand, unit, , , , , , tag] = r, b = String(brand || ''), n = String(name || '');
  if (DRINK_UNIT.test(unit || '') || CAFE.test(b) || NOT_MEAL.test(n)) return null;
  const deliveryish = /피자|치킨|버거|족발|보쌈|떡볶이/.test(n);
  if (tag === 'h') return 'home';
  if (tag === 'f' || tag === 's') return DELIVERY_BRAND.test(b) || deliveryish ? 'delivery' : 'out';
  if (tag === 'p' || tag === 'm') return /GS25|CU|씨유|세븐일레븐|이마트24|미니스톱|편의점/.test(b) || (STORE_NAME.test(n) && /^(개|팩|줄|컵|봉|입|회)$/.test(unit || '')) ? 'store' : null;
  if (tag === 'k' || tag === 'd' || tag === 'e') return DELIVERY_DISH.test(n) || deliveryish ? 'delivery' : 'out';
  return null;
}
const baseName = n => String(n).replace(/\(.*?\)|\s*(한 마리|반 마리|라지|레귤러|미디엄|스몰|L|R|M)\b.*$/g, '').replace(/\s+/g, '').slice(0, 8);

// remain: {kcal, protein} 오늘 남은 양(음수면 이미 넘음). 결과 최대 limit개, 같은 계열은 하나씩
export function suggestMeals(remain, {mood = 'balance', place = 'out', limit = 6, rows = foodRows(), homeTag = null} = {}) {
  const R = Math.max(0, Math.round(remain.kcal || 0)), P = Math.max(0, Math.round(remain.protein || 0));
  const cap = mood === 'tight' ? Math.max(250, Math.min(R, 600)) : mood === 'reward' ? Math.max(450, Math.min(R + 300, 1100)) : Math.max(300, Math.min(R, 850));
  const floor = mood === 'tight' ? 150 : mood === 'reward' ? 300 : Math.min(cap * 0.5, 350);
  const out = [];
  for (const r of rows) {
    if (placeOf(r) !== place) continue;
    const s = serving(r); if (!s || s.kcal < 80) continue;
    if (place === 'store' && /프로틴|단백질|뉴케어/.test(s.name) && !/도시락|닭가슴살|샐러드|볶음밥|김밥/.test(s.name)) continue;
    if (place === 'store' && (s.kcal > 650 || !STORE_NAME.test(s.name))) continue; // 편의점은 한 개 단위 끼니만(포장 전체 값 제외)
    // 양 조절: 너무 크면 반, 작으면 1.5 (치킨 한 마리 → 반 마리 등)
    let factor = 1;
    if (s.kcal > cap) factor = s.kcal / 2 <= cap ? 0.5 : s.kcal / 3 <= cap && /마리|판|패밀리|라지/.test(s.name + s.unit) ? 1 / 3 : 0;
    else if (mood !== 'tight' && s.kcal * 1.5 <= cap && s.kcal < floor) factor = 1.5;
    if (!factor) continue;
    const kcal = s.kcal * factor, protein = s.protein * factor;
    if (kcal < floor * 0.8 || kcal > cap) continue;
    if (protein > 70 || protein * 4 > kcal * 0.95) continue; // 한 끼로 믿기 어려운 값(포장 전체 값이 1개로 들어간 행 등)은 빼기
    const pDensity = protein * 4 / kcal, tasty = TASTY.test(s.name), lean = LEAN.test(s.name);
    let score;
    if (mood === 'tight') score = pDensity * 100 + (lean ? 15 : 0) - kcal / 40 + Math.min(protein, P) / 3;
    else if (mood === 'reward') score = (tasty ? 40 : 0) + (tasty && 'kdeh'.includes(s.tag) ? 12 : 0) + (s.tag === 'f' || s.tag === 's' ? 4 : 0) - Math.abs(kcal - Math.min(cap, R + 150)) / 25 + pDensity * 20;
    else score = 30 - Math.abs(kcal - Math.min(cap, R * 0.8)) / 20 + pDensity * 40 + Math.min(protein, P) / 4;
    out.push({row: r, name: s.name, brand: s.brand, unit: s.unit, qty: Math.round(s.qty * factor * 100) / 100, factor, kcal: Math.round(kcal), protein: Math.round(protein), carbs: Math.round(s.carbs * factor), fat: Math.round(s.fat * factor), tasty, lean, score});
  }
  out.sort((a, b) => b.score - a.score);
  const seen = new Set(), picked = [];
  const brands = new Map();
  for (const x of out) { const k = (x.brand || '') + baseName(x.name); if (seen.has(k)) continue; if (x.brand && (brands.get(x.brand) || 0) >= 1) continue; const fam = (x.name.match(/닭가슴살|샐러드|도시락|김밥|피자|치킨|버거|덮밥|찌개|탕|구이/) || [''])[0]; if (fam && (brands.get('#' + fam) || 0) >= 2) continue; if (fam) brands.set('#' + fam, (brands.get('#' + fam) || 0) + 1); seen.add(k); if (x.brand) brands.set(x.brand, (brands.get(x.brand) || 0) + 1); picked.push(x); if (picked.length >= limit) break; }
  return picked.map(x => ({...x, diff: x.kcal - R, why: reasonOf(x, {mood, R, P})}));
}
function reasonOf(x, {mood, R, P}) {
  const portion = x.factor === 0.5 ? '반만 먹으면 ' : x.factor < 0.5 ? '3분의 1만 먹으면 ' : x.factor === 1.5 ? '1.5배로 ' : '';
  if (mood === 'tight') return `${portion}단백질 ${x.protein}g · ${x.kcal}kcal로 가볍게 채워요.`;
  if (mood === 'reward') return `${portion}맛있게 먹고 ${x.kcal - R > 0 ? `남은 양보다 ${x.kcal - R}kcal 더예요. 내일 조금만 조절하면 돼요.` : '남은 양 안이에요.'}`;
  return `${portion}남은 양에 맞고 단백질 ${x.protein}g${P ? `(남은 ${P}g 중)` : ''}을 채워요.`;
}
const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));
export const suggestionId = x => `fooddb:${x.row[8]}:${x.row[1]}|${x.row[0]}|${x.row[2]}`;
export function whatToEatHTML(st, remain, {ready = true, locked = '', results = null} = {}) {
  const R = Math.round(remain.kcal || 0), P = Math.round(remain.protein || 0);
  const head = `<section class="section card wte" id="wte"><div class="section-title"><h3>오늘 남은 걸로 뭐 먹지</h3><small>남은 ${R > 0 ? `${R.toLocaleString('ko-KR')}kcal` : '칼로리 없음'}${P > 0 ? ` · 단백질 ${P}g` : ''}</small></div>`;
  if (locked) return head + locked + '</section>';
  const chips = (list, key, cur) => `<div class="chip-row wte-chips" role="group">${list.map(([v, l]) => `<button type="button" class="chip ${cur === v ? 'active' : ''}" data-wte-${key}="${v}" aria-pressed="${cur === v}">${l}</button>`).join('')}</div>`;
  const body = !ready ? '<p class="hint">음식 DB를 불러오는 중이에요.</p>' : !results ? '' : results.length ? `<ul class="wte-list">${results.map((x, i) => `<li><div class="wte-main"><b>${esc(x.name)}</b>${x.brand ? `<small>${esc(x.brand)}</small>` : ''}<span class="wte-amt">${x.unit === 'g' ? `${Math.round(x.qty)}g` : `${x.factor === 1 ? '1' : x.factor === 0.5 ? '½' : x.factor < 0.5 ? '⅓' : '1.5'}${/^[가-힣]/.test(x.unit) ? '' : ' '}${esc(x.unit)}`} · ${x.kcal}kcal · 단 ${x.protein}g</span><p>${esc(x.why)}</p></div><button type="button" class="button small secondary" data-wte-add="${i}">기록</button></li>`).join('')}</ul>` : `<p class="hint">${R <= 0 ? '오늘 목표만큼 먹었어요. 출출하면 타이트로 가벼운 걸 골라 봐요.' : '이 조건에 맞는 메뉴를 못 찾았어요. 장소나 기분을 바꿔 봐요.'}</p>`;
  return `${head}<p class="hint">기분</p>${chips(MOODS.map(([v, l]) => [v, l]), 'mood', st.mood)}<p class="hint">어디서</p>${chips(PLACES, 'place', st.place)}${body}<p class="hint wte-note">음식 DB 기준 추정이에요. 실제 양에 따라 달라요.</p></section>`;
}
