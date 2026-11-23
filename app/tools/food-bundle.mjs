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

export const DOUBT_FLAGS = new Set(['kcalDensityLow', 'kcalDensityHigh', 'zeroKcalWithMacros', 'recheckUnresolved', 'calcCheckMismatch', 'fatPartsGtFat', 'sugarGtCarbs']);
export const isDoubtful = p => (p.flags || []).some(f => DOUBT_FLAGS.has(typeof f === 'string' ? f : f?.code));

export function buildRows({dishes = [], foodsDish = [], foodsRaw = [], products = []}){
  const rows = [], seen = new Set();
  const push = (name, brand, unit, grams, vals, tag, aliases = [], doubt = false) => {
    if (!name || vals[0] == null) return;
    const key = `${brand}|${name}|${unit}`.toLocaleLowerCase('ko');
    if (seen.has(key)) return; seen.add(key);
    rows.push([name, brand || '', unit, grams ? Math.round(grams * 10) / 10 : 0, ...vals, tag, [...new Set(aliases.filter(a => a && a !== name))].join(' '), ...(doubt ? [1] : [])]);
  };
  const dishAlias = new Map(foodsDish.filter(f => !f.maker).map(f => [f.name, f.search?.aliases || []]));
  const kNames = new Set();
  // 1) 한식 대표 328: 기본 단위 1회분 값. 값이 없고 100ml 기준 행만 있으면 밀도 1.0 g/ml로 환산(대표님 결정: Claude 권장안, 'e' 추정 표시)
  for (const d of dishes) {
    const u = d.defaultUnit || {}, unit = unitName(u.label) || '인분', grams = u.g || u.ml || 0;
    kNames.add(d.name); const al = [...(d.aliases || []), ...(dishAlias.get(d.name) || [])];
    if (d.nutrientsPerServing) { push(d.name, '', unit, grams, per(d.nutrientsPerServing, 1), 'k', al); continue; }
    const rep = [d.source?.representative, ...(d.source?.alternatives || [])].find(x => x?.per100 && x.basis === '100ml');
    if (rep && grams) push(d.name, '', unit, grams, per(rep.per100, grams / 100), 'e', al); else kNames.delete(d.name);
  }
  // 2) 식약처 음식(프랜차이즈 행 제외): 기본 단위가 g·ml이 아니면 1단위당, 아니면 100당
  for (const f of foodsDish) {
    if (f.maker || kNames.has(f.name)) continue;
    const def = (f.units || []).find(u => u.default), amount = def ? (def.g || def.ml) : 0, unit = def ? unitName(def.label, f.basis) : '';
    if (unit && amount) push(f.name, '', unit, amount, per(f.per100 || {}, amount / 100), 'd', f.search?.aliases || []);
    else push(f.name, '', f.basis === 'ml' ? 'ml' : 'g', 0, per(f.per100 || {}, 1), 'd', f.search?.aliases || []);
  }
  // 3) 원재료: 100g당
  for (const f of foodsRaw) push(f.name, '', 'g', 0, per(f.per100 || {}, 1), 'r', f.search?.aliases || []);
  // 4) 제품: 기본 단위(1팩 100g 등)가 있으면 1단위당, 없으면 100당. 브랜드는 표기 규칙(brandDisplay)이 있으면 그것.
  for (const p of products) {
    const base = p.per100g || p.per100ml || {}, ml = !p.per100g && !!p.per100ml;
    const def = (p.units || []).find(u => u.default), amount = def ? (def.g || def.ml) : 0, unit = def ? unitName(def.label, ml ? 'ml' : 'g') : '';
    const tag = p.group === 'franchise' ? 'f' : p.confidence === 'high' ? 'p' : 'm';
    const brand = p.brandDisplay || p.brand || '', aliases = [...(p.search?.aliases || []), ...(p.search?.brandAliases || [])];
    // '전체 3360g'처럼 통 전체가 기본 단위면 1회분으로 쓰기엔 커서 100당으로 둔다
    const whole = /^전체/.test(def?.label || '') && amount > 600, doubt = isDoubtful(p);
    if (unit && amount && amount !== 1 && !whole) push(p.displayName || p.name, brand, unit, amount, per(base, amount / 100), tag, aliases, doubt);
    else push(p.displayName || p.name, brand, ml ? 'ml' : 'g', 0, per(base, 1), tag, aliases, doubt);
  }
  return rows;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const read = f => JSON.parse(fs.readFileSync(path.join(BASE, f), 'utf8'));
  const rows = buildRows({
    dishes: read('link/dishes_linked.json').dishes,
    foodsDish: read('mfds/out/foods-dish.json'),
    foodsRaw: read('mfds/out/foods-raw.json'),
    products: read('products_merged/products.json').products,
  });
  const out = {v: 1, builtAt: new Date().toISOString().slice(0, 10), source: '식품의약품안전처 식품영양성분 데이터베이스(공공데이터포털)·농촌진흥청 국가표준식품성분표·제조사 라벨', rows};
  const json = JSON.stringify(out);
  fs.writeFileSync(path.join(APP, 'food-db.json'), json);
  const tags = {}; for (const r of rows) tags[r[8]] = (tags[r[8]] || 0) + 1;
  const zlib = await import('node:zlib');
  console.log(`음식 DB ${rows.length}개 ${JSON.stringify(tags)} · ${(json.length / 1048576).toFixed(1)}MB · gzip ${(zlib.gzipSync(json).length / 1024).toFixed(0)}KB`);
}
