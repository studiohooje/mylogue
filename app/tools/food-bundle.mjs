// 4.12(예정) 음식 DB 앱 번들 만들기 — 연구 폴더의 정리 결과를 앱 검색용 축약 파일(app/food-db.json)로 묶는다.
// 원천: research_notes/마이로그 음식 데이터베이스/
//   link/dishes_linked.json(한식 대표 328, 1회분 영양) · mfds/out/foods-dish.json(식약처 음식, 프랜차이즈 행 제외 — 제품 통합본에 이미 있음)
//   mfds/out/foods-raw.json(원재료) · products_merged/products.json(제품: 닭가슴살·프로틴·저당·프랜차이즈, 식약처 프랜차이즈 후보 포함)
// 행 형식(배열): [이름, 브랜드표시, 단위, 단위g(0=없음), kcal, 탄, 단, 지, 출처태그, 별칭(공백 구분), (값 확인 필요면 1)]
//   값 확인 필요: 병합 검수에서 100g당/1회분 혼동 의심·열량 0인데 탄단지·재확인 미해결 등 값 자체가 미심쩍은 제품(열량 검산 차이만은 알룰로스·당알코올로 흔해 제외)
//   단위가 g·ml이면 영양값은 100g(ml)당, 그 밖의 단위는 1단위당(앱의 음식 프리셋 계약과 같음). 빈 값은 null(0 아님).
//   출처태그: k 한식 대표(1회분) · d 식약처 음식 · r 원재료 · p 제품 라벨 확인 · m 제품 식약처 값 · f 프랜차이즈 · e 추정(밀도 1.0 등)
// 실행: node tools/food-bundle.mjs [연구폴더]  → app/food-db.json
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {flagDoubts} from './food-db-check.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const APP = path.resolve(HERE, '..');
const BASE = process.argv[2] || path.resolve(APP, '..', 'research_notes', '마이로그 음식 데이터베이스');
const r1 = v => v == null || !Number.isFinite(Number(v)) ? null : Math.round(Number(v) * 10) / 10;

// '1그릇(뚝배기)' → '그릇', '1회 제공량 762g' → '회', '전체 200g' → '개', '1토막/1인분' → '토막'
export function unitName(label = '', basis = 'g'){
  let s = String(label).trim();
  if (/^전체/.test(s)) return '개';
  s = s.replace(/^[\d.]+\s*/, '').split(/[\s(/]/)[0] || '';
  if (/^회$/.test(s) && basis === 'ml') return '잔';
  if (!s || /^(g|ml|mL)$/.test(s)) return '';
  return s.replace(/제공량$/, '') || '회';
}
// kcal은 정수(100당 값을 1단위로 바꿀 때 619.9처럼 보이지 않게), 탄단지는 소수 한 자리
const per = (n, factor) => [n.kcal == null ? null : Math.round(n.kcal * factor), r1(n.carbs == null ? null : n.carbs * factor), r1(n.protein == null ? null : n.protein * factor), r1(n.fat == null ? null : n.fat * factor)];

// 4.17.0 미량영양소: [당류 g, 식이섬유 g, 포화지방 g, 나트륨 mg]. 모두 없으면 null(행에 안 붙임). 행 12번째 칸.
export const micro = (n, factor) => { const v = [n.sugar, n.fiber, n.satFat, n.sodium].map((x, i) => x == null || !Number.isFinite(Number(x)) ? null : i === 3 ? Math.round(Number(x) * factor) : r1(Number(x) * factor)); return v.every(x => x == null) ? null : v; };
export const DOUBT_FLAGS = new Set(['kcalDensityLow', 'kcalDensityHigh', 'zeroKcalWithMacros', 'recheckUnresolved', 'calcCheckMismatch', 'fatPartsGtFat', 'sugarGtCarbs']);
// 4.17.0 값 의심(1)과 '단종됐을 수 있는 메뉴'(2)를 나눈다. 2는 식약처 DB의 업체 제공 공식 값이라 값 자체는 의심하지 않는다.
const GONE_ONLY = new Set(['mfdsCandidate', 'sizeVariant']);
// 4.17.0 오탐 줄이기(값은 그대로): ① 공식 페이지로 다시 확인한 값(recheckConfirmed)의 검산 차이 ② 30kcal 이하 음료의 반올림 차이
// ③ 원래 열량 밀도가 낮은 음료·샐러드·국물·소스·토핑의 '밀도 낮음'은 의심하지 않는다. 피자·빵·케이크의 밀도 낮음은 그대로 의심.
const LOW_DENSITY_OK = /우유|커피|콜드 ?브루|라떼|아메리카노|티$|티 |차$|차 |에이드|주스|스무디|음료|워터|샐러드|스프|수프|탕$|국$|소스|케첩|토핑|할라피뇨|피클|치킨무|코울슬로|잼|요거트|두유|밀크|어묵|김치|깍두기|단무지|국수|냉면|우동|소바|오뎅|빙수|마끼아또|모카|요구르트|프라페|곤약|아이스 /;
// 4.17.1 감미료(알룰로스·에리스리톨 등)는 탄수화물로 표시되지만 열량이 거의 없다. 이름이 제로·무설탕 계열이고 당·단백질·지방이 거의 없으면
// '열량 0인데 탄수화물 있음'·'검산 차이'·'밀도 낮음'은 라벨상 정상이다(식품 등의 표시기준: 100ml당 4kcal 미만은 0 표시 가능).
export const SWEETENER = /제로|무설탕|알룰로스|에리스리톨|스테비아|슈가프리|sugar ?free|저칼로리|0kcal|0칼로리|zero/i;
const sweetenerLike = p => { const n = p.per100g || p.per100ml || {}; return SWEETENER.test(`${p.name || ''} ${p.displayName || ''}`) && (n.sugar ?? 0) <= 1.5 && (n.protein ?? 0) <= 1.5 && (n.fat ?? 0) <= 1.5 && (n.kcal ?? 0) <= 60; };
// 4.17.2 감미료로 설명되는 검산 차이: 이름이 감미료·저당 계열이고, 표시 열량이 검산보다 낮으며(감미료는 낮추기만 한다)
// 단백질·지방 열량만으로는 표시 열량을 넘지 않을 때(탄수화물이 검산 열량의 절반 이상인 제품만 — 고기·우유처럼 탄수화물이 적은 건 감미료로 설명 안 됨). 탄수화물 일부가 알룰로스·에리스리톨이면 정상인 라벨이다.
export const SWEET_NAME = /제로|무설탕|알룰로스|에리스리톨|스테비아|슈가프리|sugar ?free|저칼로리|0 ?kcal|0칼로리|zero|저당|라이트 ?슈가|로우 ?슈가|당 ?제로|키토/i;
export const sweetenerExplains = (name, kcal, carbs, protein, fat) => {
  if (kcal == null || !SWEET_NAME.test(name || '')) return false;
  const calc = (carbs || 0) * 4 + (protein || 0) * 4 + (fat || 0) * 9, rest = (protein || 0) * 4 + (fat || 0) * 9;
  return (carbs || 0) * 4 >= calc * 0.5 && kcal <= calc + 5 && rest <= kcal * 1.15 + 10;
};
const sweetP = p => { const n = p.per100g || p.per100ml || {}; return sweetenerExplains(`${p.name || ''} ${p.displayName || ''}`, n.kcal, n.carbs, n.protein, n.fat); };
const softDoubt = (c, p) => {
  if ((c === 'calcCheckMismatch' || c === 'kcalDensityLow' || c === 'zeroKcalWithMacros') && sweetP(p)) return true;
  const kcal = p.label?.kcal ?? p.per100g?.kcal ?? p.per100ml?.kcal;
  if (c === 'calcCheckMismatch') return (p.flags || []).includes('recheckConfirmed') || (kcal != null && kcal <= 30) || sweetenerLike(p);
  if (c === 'kcalDensityLow') return LOW_DENSITY_OK.test(`${p.name || ''} ${p.displayName || ''}`) || sweetenerLike(p) || !!servingAsPer100(p);
  if (c === 'zeroKcalWithMacros') return sweetenerLike(p);
  if (c === 'recheckUnresolved') return !!servingAsPer100(p);
  return false;
};
// 4.17.1 단백질 보충제 중 식약처 DB에 '100g당'으로 올라갔지만 열량·단백질 수준이 1회 제공량(1스쿱)인 것: 원천 메모가 직접 지적한 경우.
// 100g당 250kcal 미만인데 단백질이 15g 이상이고 검산이 맞으면, 값은 그대로 두고 단위를 '1회분'으로 바꾼다(값을 고쳐 쓰지 않음).
export const servingAsPer100 = p => {
  if (p.category !== 'protein-powder' || !p.per100g) return null;
  const n = p.per100g; if (n.kcal == null || n.kcal >= 250 || (n.protein ?? 0) < 15) return null;
  // 통 하나(전체 300g 이상)로 파는 가루 제품만 — 한 봉지 45g·120g 같은 1회용은 100g당이 맞을 수도 있어 건드리지 않는다
  const d = (p.units || []).find(u => u.default); if (!d || !/^전체/.test(d.label || '') || (d.g || 0) < 300) return null;
  const calc = (n.carbs || 0) * 4 + (n.protein || 0) * 4 + (n.fat || 0) * 9;
  return Math.abs(calc - n.kcal) <= Math.max(15, n.kcal * 0.15) ? n : null;
};
export const isDoubtful = p => {
  const codes = (p.flags || []).map(f => typeof f === 'string' ? f : f?.code);
  if (codes.some(c => DOUBT_FLAGS.has(c) && !softDoubt(c, p))) return 1;
  const hard = codes.filter(c => DOUBT_FLAGS.has(c));
  if (hard.length && p.confidence !== 'low') return 0;
  if (p.confidence === 'low' && p.source?.type !== 'estimate') return codes.length && codes.every(c => GONE_ONLY.has(c)) ? 2 : 1;
  return 0;
};

// 4.17.1 정리 기록(빌드 요약에 출력): 싣지 않은 불가능한 값, 띄어쓰기 중복으로 합친 메뉴
export const dropped = [], merged = [];
const SAME_NAME_OK = new Set(['sameNameDiffValues', 'mfdsCandidate', 'sizeVariant']);
export function buildRows({dishes = [], foodsDish = [], foodsRaw = [], products = [], recipes = [], popular = []}){
  const rows = [], seen = new Set(), loose = new Map(); let cur = null;
  dropped.length = 0; merged.length = 0;
  const push = (name, brand, unit, grams, vals, tag, aliases = [], doubt = false, mic = null) => {
    if (!name || vals[0] == null) return;
    const key = `${brand}|${name}|${unit}`.toLocaleLowerCase('ko');
    const key2 = `${brand}|${name}|${vals[0]}`.toLocaleLowerCase('ko');
    if (seen.has(key) || (brand && seen.has(key2))) return;
    // 4.17.1 띄어쓰기만 다른 같은 메뉴(식약처에 두 번 올라간 '딸기와우유생크림1호'/'딸기와우유 생크림 1호' 등)는 열량 차이가 8% 이내면 하나만 둔다.
    // 남는 행은 '같은 이름 다른 값'만 이유로 붙은 의심 표시를 떼어 낸다(값 자체는 공식 값).
    const lkey = brand && `${brand}|${name.replace(/[\s()·]/g, '')}|${unit}`.toLocaleLowerCase('ko');
    if (lkey && loose.has(lkey)) { const r = loose.get(lkey); if (Math.abs(r[4] - vals[0]) <= Math.max(10, r[4] * 0.08)) { merged.push(`${brand} ${name}`); seen.add(key); seen.add(key2); if (r._sameNameOnly != null) r[10] = r._sameNameOnly; return; } }
    seen.add(key); seen.add(key2);
    aliases = [...aliases, ...autoAliases(name)];
    const row = [name, brand || '', unit, grams ? Math.round(grams * 10) / 10 : 0, ...vals, tag, [...new Set(aliases.filter(a => a && a !== name))].join(' '), ...(mic ? [doubt ? Number(doubt) : 0, mic] : doubt ? [Number(doubt)] : [])];
    rows.push(row);
    if (lkey) { const codes = (cur?.flags || []).map(f => typeof f === 'string' ? f : f?.code); row._sameNameOnly = row[10] === 1 && codes.includes('sameNameDiffValues') && codes.every(c => SAME_NAME_OK.has(c)) ? (codes.some(c => GONE_ONLY.has(c)) ? 2 : 0) : null; loose.set(lkey, row); }
  };
  const dishAlias = new Map(foodsDish.filter(f => !f.maker).map(f => [f.name, f.search?.aliases || []]));
  const kNames = new Set();
  // 1) 한식 대표 328: 기본 단위 1회분 값. 값이 없고 100ml 기준 행만 있으면 밀도 1.0 g/ml로 환산(대표님 결정: Claude 권장안, 'e' 추정 표시)
  for (const d of dishes) {
    const u = d.defaultUnit || {}, unit = unitName(u.label) || '인분', grams = u.g || u.ml || 0;
    kNames.add(d.name); const al = [...(d.aliases || []), ...(dishAlias.get(d.name) || [])];
    if (d.nutrientsPerServing) { push(d.name, '', unit, grams, per(d.nutrientsPerServing, 1), 'k', al, false, micro(d.nutrientsPerServing, 1)); continue; }
    const rep = [d.source?.representative, ...(d.source?.alternatives || [])].find(x => x?.per100 && x.basis === '100ml');
    if (rep && grams) push(d.name, '', unit, grams, per(rep.per100, grams / 100), 'e', al, false, micro(rep.per100, grams / 100)); else kNames.delete(d.name);
  }
  // 2) 식약처 음식(프랜차이즈 행 제외): 기본 단위가 g·ml이 아니면 1단위당, 아니면 100당
  for (const f of foodsDish) {
    if (f.maker || kNames.has(f.name)) continue;
    const def = (f.units || []).find(u => u.default), amount = def ? (def.g || def.ml) : 0, unit = def ? unitName(def.label, f.basis) : '';
    if (unit && amount) push(f.name, '', unit, amount, per(f.per100 || {}, amount / 100), 'd', f.search?.aliases || [], false, micro(f.per100 || {}, amount / 100));
    else push(f.name, '', f.basis === 'ml' ? 'ml' : 'g', 0, per(f.per100 || {}, 1), 'd', f.search?.aliases || [], false, micro(f.per100 || {}, 1));
  }
  // 2-1) 4.17.0 집밥 표준 레시피(recipes/recipes.json): 1인분 단위, 'h'
  for (const r of recipes) push(r.name, '', '인분', r.grams, [r.kcal, r.carbs, r.protein, r.fat], 'h', r.aliases || [], false, r.micro);
  // 3) 원재료: 100g당
  for (const f of foodsRaw) push(f.name, '', 'g', 0, per(f.per100 || {}, 1), 'r', f.search?.aliases || [], false, micro(f.per100 || {}, 1));
  // 4) 제품: 기본 단위(1팩 100g 등)가 있으면 1단위당, 없으면 100당. 브랜드는 표기 규칙(brandDisplay)이 있으면 그것.
  for (const p of products) {
    cur = p;
    // 중량 없이 1회(1개) 값만 공개된 메뉴(한솥 열량 등): 100당으로 바꿀 수 없으니 라벨 1회 값을 '1개당'으로 넣는다
    if (!p.per100g && !p.per100ml) {
      const lb = p.labelCorrected || p.label || {};
      if (lb.kcal != null && /serving/.test(lb.basis || 'per serving')) {
        const st = p.source?.type || '', tag1 = st === 'estimate' ? 'x' : (st === 'store-post' || st === 'press-report' || st === 'public-test') ? 's' : p.group === 'franchise' ? 'f' : 'm';
        push(p.displayName || p.name, p.brandDisplay || p.brand || '', unitName(lb.servingLabel || '1개') || '개', 0, per(lb, 1), tag1, [...(p.search?.aliases || []), ...(p.search?.brandAliases || [])], isDoubtful(p), micro(lb, 1));
      }
      continue;
    }
    // 4.17.1 물리적으로 불가능한 값(100g당 900kcal 초과 등, 원천 검수 kcalImpossible)은 앱에 싣지 않는다 — '확인 필요'로 보여 줘도 틀린 숫자라서
    if ((p.flags || []).some(f => (typeof f === 'string' ? f : f?.code) === 'kcalImpossible')) { dropped.push(p.id || p.name); continue; }
    const asServing = servingAsPer100(p);
    if (asServing) { push(p.displayName || p.name, p.brandDisplay || p.brand || '', '회', 0, per(asServing, 1), 'm', [...(p.search?.aliases || []), ...(p.search?.brandAliases || [])], isDoubtful(p), micro(asServing, 1)); continue; }
    const base = p.per100g || p.per100ml || {}, ml = !p.per100g && !!p.per100ml;
    const def = (p.units || []).find(u => u.default), amount = def ? (def.g || def.ml) : 0, unit = def ? unitName(def.label, ml ? 'ml' : 'g') : '';
    const st = p.source?.type || '';
    const tag = st === 'estimate' ? 'x' : (st === 'store-post' || st === 'press-report' || st === 'public-test') ? 's' : p.group === 'franchise' && p.category !== 'franchise-hmr' ? 'f' : p.confidence === 'high' ? 'p' : 'm';
    const brand = p.brandDisplay || p.brand || '', aliases = [...(p.search?.aliases || []), ...(p.search?.brandAliases || [])];
    // '전체 3360g'처럼 통 전체가 기본 단위면 1회분으로 쓰기엔 커서 100당으로 둔다
    const whole = /^전체/.test(def?.label || '') && amount > 600, doubt = isDoubtful(p);
    if (unit && amount && amount !== 1 && !whole) push(p.displayName || p.name, brand, unit, amount, per(base, amount / 100), tag, aliases, doubt, micro(base, amount / 100));
    else push(p.displayName || p.name, brand, ml ? 'ml' : 'g', 0, per(base, 1), tag, aliases, doubt, micro(base, 1));
  }
  // 5) 4.17.1 많이 먹는 국민 상품(라면·과자·아이스크림·음료) — 식약처 가공식품 원문 값(tools/popular-products.mjs가 고름)
  cur = null;
  for (const o of popular) {
    const n = o.per100 || {}, ml = o.basis === 'ml', u = popularUnit(o);
    const aliases = [o.target, ...String(o.aliases || '').split(' ')].filter(Boolean);
    const name = o.generic ? o.name : o.name.replace(/\s+/g, ' ').trim();
    if (u) push(name, o.brand || '', u.unit, u.amount, per(n, u.amount / 100), 'm', aliases, false, micro(n, u.amount / 100));
    else push(name, o.brand || '', ml ? 'ml' : 'g', 0, per(n, 1), 'm', aliases, false, micro(n, 1));
  }
  // 6) 4.17.1 주류 추정: 식약처 DB에 주류 영양 표시가 거의 없어(표시 의무 없음) 도수로 계산한 일반 행 — 'x'(추정)
  for (const a of ALCOHOL_EST) push(a.name, '', a.unit, a.ml, [a.kcal, a.carbs, a.protein, 0], 'x', a.aliases.split(' '), false, null);
  return rows;
}

// 4.17.1 국민 상품 단위: 한 봉지·한 병(400g·600ml 이하)이면 '개/병', 라면 묶음(536g=4봉)이면 1봉으로 나누고,
// 큰 통(1.5L 콜라·900ml 아이스크림)은 식약처 1회 섭취참고량(200ml→'잔', 30g→'회')으로, 그것도 없으면 100당.
const ICE = /빙과|아이스크림|빙菓/;
export function popularUnit(o){
  // 4.17.2 편의점 간편식(도시락·김밥 등)은 1개 그대로
  if (o.whole) { const w = String(o.foodSize || '').match(/^([\d.]+)\s*g$/i); if (w) return {unit: '개', amount: Number(w[1])}; }
  const ml = o.basis === 'ml', m = String(o.foodSize || '').match(/^([\d.]+)\s*(g|ml|kg|l)$/i);
  let size = m ? Number(m[1]) * (/^(kg|l)$/i.test(m[2]) ? 1000 : 1) : 0;
  const cls = Object.values(o.cls || {}).join(' '), ice = ICE.test(cls), noodle = /면류|유탕면|라면/.test(cls), snack = /과자/.test(cls) && !/빙과/.test(cls);
  // 묶음 나누기: 라면 봉지 묶음(536g=4×134), 컵라면 묶음(372g=6×62) — 나누어 떨어지는 1개 무게
  const split = (lo, hi, ks) => { for (const k of ks) { const each = size / k; if (each >= lo && each <= hi && Math.abs(each - Math.round(each)) < 0.15) return {unit: '개', amount: Math.round(each)}; } return null; };
  if (size && noodle && size > 200) { const r = /컵|사발|용기/.test(o.name) ? split(55, 90, [6, 4, 3, 2, 5]) : split(95, 145, [2, 3, 4, 5, 6]); if (r) return r; }
  // 아이스크림 묶음·통(420ml·910ml)은 1개 크기를 알 수 없어 식약처 1회 섭취참고량(100ml)으로
  // 큰 과자 봉지(180g 새우깡·364g 에이스)는 한 번에 먹는 양이 아니라 식약처 1회 섭취참고량(30g)으로
  if (size && size <= (ice ? 200 : ml ? 750 : snack ? 100 : 400)) return {unit: ml ? (ice ? '개' : '병') : '개', amount: size};
  const s = String(o.servingRef || '').match(/^([\d.]+)\s*(g|ml)(\((g|ml)\))?$/i);
  if (s) return {unit: ml ? (ICE.test(cls) ? '회' : '잔') : '회', amount: Number(s[1])};
  return null;
}

// 4.17.1 주류 도수 추정(에탄올 0.789g/ml × 7kcal/g + 탄수화물 4kcal/g). 식약처에 표시가 있는 '새로'(16도, 100ml당 89kcal)와 맞춰 봄.
export const ALCOHOL_EST = [
  {name: '소주 1병(16도)', unit: '병', ml: 360, kcal: 320, carbs: 0, protein: 0, aliases: '소주 참이슬 처음처럼 진로 좋은데이 대선 한라산 소주한병'},
  {name: '소주 1잔(16도)', unit: '잔', ml: 50, kcal: 45, carbs: 0, protein: 0, aliases: '소주 소주한잔 참이슬 처음처럼 진로 소주잔'},
  {name: '맥주 1캔 500ml(4.5도)', unit: '캔', ml: 500, kcal: 185, carbs: 15, protein: 1.5, aliases: '맥주 카스 테라 켈리 하이트 클라우드 캔맥주 라거'},
  {name: '맥주 1캔 355ml(4.5도)', unit: '캔', ml: 355, kcal: 131, carbs: 10.7, protein: 1.1, aliases: '맥주 카스 테라 켈리 하이트 클라우드 캔맥주 라거'},
  {name: '생맥주 500cc(4.5도)', unit: '잔', ml: 500, kcal: 185, carbs: 15, protein: 1.5, aliases: '생맥 생맥주 맥주 호프 500cc'},
  {name: '레드와인 1잔(13도)', unit: '잔', ml: 150, kcal: 125, carbs: 3.9, protein: 0.1, aliases: '와인 레드와인 적포도주 포도주'},
  {name: '화이트와인 1잔(12도)', unit: '잔', ml: 150, kcal: 120, carbs: 3.9, protein: 0.1, aliases: '와인 화이트와인 백포도주 포도주'},
  {name: '위스키 1잔(40도, 30ml)', unit: '잔', ml: 30, kcal: 66, carbs: 0, protein: 0, aliases: '위스키 양주 샷'},
  {name: '하이볼 1잔(위스키+탄산수)', unit: '잔', ml: 300, kcal: 70, carbs: 0, protein: 0, aliases: '하이볼 위스키하이볼'},
  {name: '하이볼 1잔(위스키+토닉·진저에일)', unit: '잔', ml: 300, kcal: 160, carbs: 23, protein: 0, aliases: '하이볼 진저하이볼 토닉하이볼'},
];

// 4.17.1 사람들이 실제로 치는 줄임말(검색 점검에서 놓친 말). 이름에서 규칙으로 붙인다.
export function autoAliases(name = ''){
  const n = String(name), out = [];
  const ice = /ICED|아이스|ice|콜드|\(I\)/i.test(n), hot = /HOT|따뜻|뜨거운|\(H\)/i.test(n);
  if (/아메리카노/.test(n) && !/라떼|에이드|티$|티 /.test(n)) { if (ice || !hot) out.push('아아'); if (hot || !ice) out.push('뜨아'); }
  if (/바닐라 ?라떼/.test(n) && (ice || !hot)) out.push('아바라');
  if (/카페 ?라떼|^라떼/.test(n) && ice) out.push('아라');
  if (/^부대찌개/.test(n)) out.push('부찌');
  if (/^김치찌개/.test(n)) out.push('김찌');
  if (/^된장찌개/.test(n)) out.push('된찌');
  if (/^김치볶음밥/.test(n)) out.push('김볶');
  if (/(큰사발|사발면|컵라면|용기면)/.test(n) || (/컵$|컵 /.test(n) && /면|라면|우동|짬뽕|탕/.test(n))) out.push('컵라면');
  return out;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const read = f => JSON.parse(fs.readFileSync(path.join(BASE, f), 'utf8'));
  const rows = buildRows({
    dishes: read('link/dishes_linked.json').dishes,
    foodsDish: read('mfds/out/foods-dish.json'),
    foodsRaw: read('mfds/out/foods-raw.json'),
    products: read('products_merged/products.json').products,
    recipes: fs.existsSync(path.join(BASE, 'recipes/recipes.json')) ? read('recipes/recipes.json').rows : [],
    popular: ['popular', 'convenience'].flatMap(f => fs.existsSync(path.join(BASE, `products_popular/${f}.json`)) ? read(`products_popular/${f}.json`).rows : []),
  });
  const flagged = flagDoubts(rows); console.log(`품질 검사: 확인 필요 표시 ${flagged}행 추가 · 불가능한 값 제외 ${dropped.length} · 띄어쓰기 중복 합침 ${merged.length}`);
  const cnt = {}; for (const r of rows) cnt[r[10] || 0] = (cnt[r[10] || 0] || 0) + 1; console.log('표시별 행 수', cnt);
  const out = {v: 1, builtAt: new Date().toISOString().slice(0, 10), source: '식품의약품안전처 식품영양성분 데이터베이스(공공데이터포털)·농촌진흥청 국가표준식품성분표·제조사 라벨', rows};
  const json = JSON.stringify(out);
  fs.writeFileSync(path.join(APP, 'food-db.json'), json);
  const tags = {}; for (const r of rows) tags[r[8]] = (tags[r[8]] || 0) + 1;
  const zlib = await import('node:zlib');
  console.log(`음식 DB ${rows.length}개 ${JSON.stringify(tags)} · ${(json.length / 1048576).toFixed(1)}MB · gzip ${(zlib.gzipSync(json).length / 1024).toFixed(0)}KB`);
}
