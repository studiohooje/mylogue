// 4.17.0 음식 DB 품질 검사기 — app/food-db.json 전체를 훑어 의심 행을 찾는다. 데이터를 늘릴 때마다 돌린다.
// 검사: ① 열량 ≈ 탄4+단4+지9 검산(알코올·당알코올 의심은 따로) ② 불가능한 값(음수, 100g당 탄단지 합>100, 100g당 900kcal 초과)
//       ③ 같은 이름·브랜드·단위 중복 ④ 1회 단위 열량 극단값 ⑤ 출처 태그 비율(브랜드별)
// 실행: node tools/food-db-check.mjs [--json] → 요약 출력, research_notes/.../quality/report.json 저장(있을 때)
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const APP = path.resolve(HERE, '..');
const MASS = new Set(['g', 'ml', '']);
const ALCOHOL = /소주|맥주|와인|막걸리|사케|위스키|하이볼|칵테일|보드카|진토닉|리큐르|청주|약주|복분자주|매실주|샴페인|사와|酒/;
const SUGAR_ALCOHOL = /제로|무설탕|알룰로스|에리스리톨|스테비아|슈가프리|sugar ?free|저당|키토/i;

export function checkRow(r){
  const [name, brand, unit, grams, kcal, carbs, protein, fat, tag] = r;
  const issues = [];
  const vals = [kcal, carbs, protein, fat];
  if (vals.some(v => v != null && v < 0)) issues.push({code: 'negative', msg: '음수 값'});
  const mass = MASS.has(unit || '');
  if (mass) {
    if (kcal != null && kcal > 900) issues.push({code: 'kcal-per100-high', msg: `100g당 ${kcal}kcal`});
    const sum = (carbs || 0) + (protein || 0) + (fat || 0);
    if (sum > 101) issues.push({code: 'macro-sum-over-100', msg: `100g당 탄단지 합 ${Math.round(sum)}g`});
  } else if (kcal != null && kcal > 3500) issues.push({code: 'kcal-unit-high', msg: `1${unit}당 ${kcal}kcal`});
  if ([kcal, carbs, protein, fat].every(v => v != null)) {
    const calc = carbs * 4 + protein * 4 + fat * 9;
    const diff = kcal - calc, tol = Math.max(30, kcal * 0.25);
    if (Math.abs(diff) > tol) {
      const why = ALCOHOL.test(`${name} ${r[9] || ''}`) ? 'alcohol' : SUGAR_ALCOHOL.test(name) ? 'sugar-alcohol' : 'mismatch';
      issues.push({code: `kcal-${why}`, msg: `표시 ${kcal}kcal · 검산 ${Math.round(calc)}kcal`});
    }
  }
  if (kcal == null && [carbs, protein, fat].every(v => v == null)) issues.push({code: 'no-values', msg: '영양 값 없음'});
  if (kcal === 0 && (carbs || protein || fat)) issues.push({code: 'kcal-zero-with-macros', msg: '열량 0인데 탄단지 있음'});
  return issues;
}

export function checkDB(rows){
  const byCode = {}, flagged = [], seen = new Map(), brands = {};
  for (const [i, r] of rows.entries()) {
    const issues = checkRow(r);
    const key = `${r[0]}|${r[1]}|${r[2]}`;
    if (seen.has(key)) { const j = seen.get(key); const a = rows[j]; const same = a.slice(3, 8).every((v, k) => v === r[3 + k]); issues.push({code: same ? 'dup-identical' : 'dup-conflict', msg: `${j}번 행과 이름·브랜드·단위 같음${same ? '(값도 같음)' : '(값 다름)'}`}); }
    else seen.set(key, i);
    const b = r[1] || '(브랜드 없음)'; brands[b] ??= {rows: 0, tags: {}}; brands[b].rows++; brands[b].tags[r[8]] = (brands[b].tags[r[8]] || 0) + 1;
    for (const x of issues) byCode[x.code] = (byCode[x.code] || 0) + 1;
    if (issues.length) flagged.push({i, name: r[0], brand: r[1], unit: r[2], issues});
  }
  return {rows: rows.length, flagged: flagged.length, byCode, brands, examples: flagged};
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const raw = JSON.parse(fs.readFileSync(path.join(APP, 'food-db.json'), 'utf8'));
  const rows = Array.isArray(raw) ? raw : raw.rows;
  const rep = checkDB(rows);
  console.log(`행 ${rep.rows} · 의심 ${rep.flagged}`);
  console.log(Object.entries(rep.byCode).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k} ${v}`).join('\n'));
  if (process.argv.includes('--examples')) for (const c of Object.keys(rep.byCode)) console.log(`\n## ${c}\n` + rep.examples.filter(x => x.issues.some(y => y.code === c)).slice(0, 8).map(x => `${x.i} ${x.name} · ${x.brand} · ${x.unit} — ${x.issues.find(y => y.code === c).msg}`).join('\n'));
  const out = path.resolve(APP, '..', 'research_notes', '마이로그 음식 데이터베이스', 'quality');
  try { fs.mkdirSync(out, {recursive: true}); fs.writeFileSync(path.join(out, 'report.json'), JSON.stringify({...rep, examples: rep.examples.slice(0, 3000)}, null, 1)); } catch {}
}

// 번들에 '값 확인 필요'(11번째 칸=1) 표시를 붙인다. 공식 원재료(r)는 값이 불가능할 때만, 제품·프랜차이즈는 검산이 크게 어긋날 때.
// 값을 고쳐 쓰지는 않는다(근거 없이 바꾸지 않음). 앱은 '확인 필요'로 보여 준다.
export function flagDoubts(rows){
  let n = 0;
  // 출처 표의 열 순서 해석이 확인되지 않은 브랜드(종합보고 2026-11-23): 값 전체를 '확인 필요'로
  // 2026-11-24 피자알볼로는 해제: 식약처 행(175)은 칸 순서가 고정이고, 공식 앱 표(61)는 콜라 1.25L 550kcal·당 138g, 스프라이트 1.5L 660kcal이
  // 실제 라벨(100ml당 약 43~44kcal)과 맞아 '중량·열량·당류·단백질·포화지방·나트륨' 해석이 맞다고 판단.
  const UNVERIFIED_BRANDS = new Set([]);
  for (const r of rows) {
    if (r[1] === '피자알볼로' && r[2] === 'L') r[2] = '회';
    if (r[10]) continue;
    if (UNVERIFIED_BRANDS.has(r[1])) { while (r.length < 10) r.push(''); r[10] = 1; n++; continue; }
    const codes = checkRow(r).map(x => x.code), tag = r[8];
    const [kcal, carbs, protein, fat] = r.slice(4, 8);
    let doubt = codes.includes('negative') || codes.includes('macro-sum-over-100');
    if (!doubt && tag !== 'r' && tag !== 'x' && codes.includes('kcal-mismatch')) { const calc = carbs * 4 + protein * 4 + fat * 9; doubt = Math.abs(kcal - calc) > Math.max(40, kcal * 0.4); }
    // 4.17.1 제로·무설탕 이름이고 단백질·지방이 거의 없으면 탄수화물은 감미료(열량 0 표시 가능) — 의심하지 않는다
    if (!doubt && tag !== 'r' && codes.includes('kcal-zero-with-macros')) doubt = (carbs || 0) + (protein || 0) + (fat || 0) > 2 && !(SUGAR_ALCOHOL.test(r[0]) && (protein || 0) <= 1.5 && (fat || 0) <= 1.5);
    if (doubt) { while (r.length < 10) r.push(''); r[10] = 1; n++; }
  }
  return n;
}
