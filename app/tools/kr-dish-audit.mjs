// 4.28.0 밤샘 A-1: 한식 대표값(k·e 294행)을 근거 자료와 맞대 보고, 근거가 분명할 때만 교체 표를 만든다.
// 근거 ① 식약처 식품영양성분DB(음식) 원본(research_notes/…/mfds/out/foods-dish.json)의 성인 1인분 행:
//        외식(분석·재료량 기반)·가정식(분석)·산업체급식. 학교 급식(1인분이 작음)과 프랜차이즈(다른 메뉴)는 뺀다.
//        행마다 '1인분 무게(foodSize) × 100g당 값'으로 1인분 값을 만든다(ml는 g와 같다고 봄 — 국물 음식 오차 작음).
// 근거 ② 집밥 표준 레시피(h, 원재료 합): 같은 이름 '…(집밥)'.
// 판정(1인분 열량 기준):
//   keep    지금 값이 근거 범위(최소×0.8 ~ 최대×1.2) 안 → 그대로. '확인 필요'였으면 해제
//   replace 지금 값이 범위 밖이고 성인 근거가 2행 이상 → 근거 중앙값으로 교체(탄단지 검산 ±20% 통과할 때만)
//   doubt   근거가 1행 이하이거나 교체값 검산 실패 → '확인 필요' 유지(값을 만들지 않음)
// 실행: node tools/kr-dish-audit.mjs [연구폴더] → research_notes/night/A1/kr-dish-proposal.json·.md, app/tools/kr-dish-fixes.json
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const HERE = path.dirname(fileURLToPath(import.meta.url)), APP = path.resolve(HERE, '..');
const BASE = process.argv[2] || path.resolve(APP, '..', 'research_notes', '마이로그 음식 데이터베이스');
const OUT = path.resolve(APP, '..', 'research_notes', 'night', 'A1');
const norm = s => String(s).replace(/\s+/g, '').replace(/\(집밥\)$/, '');
const pct = (a, p) => { const s = a.filter(Number.isFinite).sort((x, y) => x - y); if (!s.length) return null; const i = (s.length - 1) * p, l = Math.floor(i), h = Math.ceil(i); return s[l] + (s[h] - s[l]) * (i - l); };
const med = a => { const s = a.filter(Number.isFinite).sort((x, y) => x - y), n = s.length; return n ? (n % 2 ? s[(n - 1) / 2] : (s[n / 2 - 1] + s[n / 2]) / 2) : null; };
const r1 = v => v == null ? null : Math.round(v * 10) / 10;
const ADULT = /^(외식\((분석|재료량)|가정식|산업체급식)/;
const PART = /국물|건더기|면만|소스|양념|육수|간편조리세트/;
export function evidenceRows(dishes, name) {
 const n = norm(name);
 return dishes.filter(x => ADULT.test(x.origin || '') && !PART.test(x.name) && (norm(x.name) === n || norm(x.name).startsWith(n + '('))).map(x => {
  const size = parseFloat(String(x.foodSize || '').replace(/[^\d.]/g, ''));
  if (!(size > 0) || !x.per100 || x.per100.kcal == null) return null;
  const f = size / 100, v = k => x.per100[k] == null ? null : x.per100[k] * f;
  return {name: x.name, origin: x.origin, size: Math.round(size), kcal: Math.round(v('kcal')), carbs: r1(v('carbs')), protein: r1(v('protein')), fat: r1(v('fat')), id: x.id};
 }).filter(Boolean);
}
export function auditKrDishes(rows, dishes) {
 const h = rows.filter(r => r[8] === 'h' && r[3] > 0 && r[4] != null), out = [];
 for (const r of rows.filter(r => r[8] === 'k' || r[8] === 'e')) {
  const ev = evidenceRows(dishes, r[0]);
  const hs = h.filter(x => norm(x[0]) === norm(r[0])).map(x => ({name: x[0], origin: '집밥 표준(원재료 합)', size: x[3], kcal: x[4], carbs: x[5], protein: x[6], fat: x[7]}));
  const all = [...ev, ...hs], kc = all.map(x => x.kcal);
  // 지금 값을 1인분으로 본다(단위가 g·ml이면 100g당이라 비교하지 않음)
  const perServing = !['g', 'ml', ''].includes(r[2]) && r[4] != null;
  let verdict = 'doubt', why = '', proposal = null;
  if (!perServing) why = '지금 값이 100g당이라 1인분 비교 대상 아님';
  else if (!all.length) why = '같은 이름의 성인 1인분 근거 없음';
  else {
   // 근거가 4행 이상이면 가운데 절반(25~75%), 적으면 최소~최대를 범위로
   const lo = Math.round(all.length >= 4 ? pct(kc, 0.25) : Math.min(...kc)), hi = Math.round(all.length >= 4 ? pct(kc, 0.75) : Math.max(...kc));
   if (r[4] >= lo * 0.8 && r[4] <= hi * 1.2) { verdict = all.length >= 2 ? 'keep' : 'keep-1'; why = `지금 ${r[4]}kcal이 근거 ${all.length}행 범위(${lo}~${hi}kcal) 안${all.length < 2 ? ' — 근거 1행이라 확인 필요 표시는 유지' : ''}`; if (!(r[3] > 0) && all.length >= 2) proposal = {fillGrams: Math.round(med(all.map(x => x.size)))}; }
   else if (all.length >= 2) {
    const p = {unit: ['봉지', '개'].includes(r[2]) ? '인분' : r[2], grams: Math.round(med(all.map(x => x.size))), kcal: Math.round(med(kc)), carbs: r1(med(all.map(x => x.carbs))), protein: r1(med(all.map(x => x.protein))), fat: r1(med(all.map(x => x.fat)))};
    const calc = p.carbs * 4 + p.protein * 4 + p.fat * 9;
    if (Math.abs(calc - p.kcal) / p.kcal <= 0.2) { verdict = 'replace'; proposal = p; why = `지금 ${r[4]}kcal이 근거 ${all.length}행 범위(${lo}~${hi}kcal) 밖 → 중앙값`; }
    else why = `교체값 검산 불일치(탄단지 계산 ${Math.round(calc)} vs ${p.kcal})`;
   } else why = `근거 1행뿐(${all[0].origin} ${all[0].kcal}kcal) — 지금 값과 어긋나지만 한 행으로는 바꾸지 않음`;
  }
  out.push({name: r[0], tag: r[8], doubtNow: r[10] === 1, current: {unit: r[2], grams: r[3], kcal: r[4], carbs: r[5], protein: r[6], fat: r[7]}, evidence: all, verdict, why, proposal});
 }
 return out;
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
 const {rows} = JSON.parse(fs.readFileSync(path.join(APP, 'food-db.json'), 'utf8'));
 const dishes = JSON.parse(fs.readFileSync(path.join(BASE, 'mfds', 'out', 'foods-dish.json'), 'utf8'));
 const res = auditKrDishes(rows, dishes);
 fs.mkdirSync(OUT, {recursive: true});
 const rule = '성인 1인분 근거(식약처 외식·가정식·산업체급식 + 집밥 표준)의 범위 안이면 유지, 범위 밖이고 근거 2행 이상이면 중앙값으로 교체(탄단지 검산 ±20%). 근거가 없거나 1행이면 확인 필요 유지.';
 fs.writeFileSync(path.join(OUT, 'kr-dish-proposal.json'), JSON.stringify({builtAt: new Date().toISOString(), rule, items: res}, null, 1));
 // 앱 묶음 도구가 읽는 교체·해제 표(근거 ID 포함)
 const fixes = Object.fromEntries(res.filter(x => x.verdict !== 'doubt' || x.doubtNow).map(x => [x.name, {verdict: x.verdict, proposal: x.proposal, evidence: x.evidence.map(e => `${e.origin} ${e.size}g ${e.kcal}kcal${e.id ? ` ${e.id}` : ''}`)}]));
 fs.writeFileSync(path.join(APP, 'tools', 'kr-dish-fixes.json'), JSON.stringify({rule, checkedAt: new Date().toISOString().slice(0, 10), fixes}, null, 1));
 const count = res.reduce((m, x) => (m[x.verdict] = (m[x.verdict] || 0) + 1, m), {});
 const lines = res.filter(x => x.verdict === 'replace' || x.doubtNow).map(x => `| ${x.name} | ${x.verdict}${x.doubtNow ? ' (확인 필요였음)' : ''} | ${x.current.unit} ${x.current.grams}g ${x.current.kcal}kcal | ${x.proposal?.fillGrams ? `1인분 무게만 ${x.proposal.fillGrams}g로` : x.proposal ? `${x.proposal.unit} ${x.proposal.grams}g ${x.proposal.kcal}kcal (탄${x.proposal.carbs} 단${x.proposal.protein} 지${x.proposal.fat})` : '-'} | ${x.why} |`);
 fs.writeFileSync(path.join(OUT, 'kr-dish-proposal.md'), `# 한식 대표값 맞대 보기 (밤샘 A-1)\n\n- 대상 ${res.length}행 · 판정 ${JSON.stringify(count)}\n- 규칙: ${rule}\n- 근거 행은 kr-dish-proposal.json의 evidence(출처 구분·1인분 무게·식약처 ID)\n\n| 음식 | 판정 | 지금 | 제안 | 이유 |\n|---|---|---|---|---|\n${lines.join('\n')}\n`);
 console.log('판정', count);
}
