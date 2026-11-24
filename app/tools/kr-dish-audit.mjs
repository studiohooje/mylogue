// 4.28.0 밤샘 A-1: 한식 대표값(k·e 294행)을 저장소 안의 두 독립 근거와 맞대 본다.
//   ① d: 식약처 식품영양성분 DB 음식 행(같은 이름 또는 '이름(재료)' 변형들, 1인분 값)
//   ② h: 집밥 표준 레시피(원재료 행 r로 재료 합을 계산한 값, 이름 '…(집밥)')
// 비교는 '1g당 열량(밀도)'로 한다(1인분 무게가 출처마다 달라서). 판정:
//   keep      지금 값이 근거(d 중앙값 또는 h)와 ±25% 안 → 그대로, '확인 필요'였으면 해제 후보
//   replace   지금 값이 근거와 25% 넘게 어긋나고, d와 h가 서로 ±25% 안에서 맞음 → d 기준 값으로 교체(1인분 무게는 d 중앙값)
//   replace-d d 변형이 3개 이상이고 서로 촘촘(사분위 폭 ±25%)한데 h가 없음 → 교체 후보(대표님 확인 표시)
//   doubt     근거가 없거나 근거끼리 어긋남 → '확인 필요' 유지(값을 만들지 않음)
// 실행: node tools/kr-dish-audit.mjs → research_notes/night/A1/kr-dish-proposal.json·.md
// 근거 없이 값을 만들지 않는다(대표님 원칙). 결과의 replace만 food-bundle의 교체 표로 반영한다.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const HERE = path.dirname(fileURLToPath(import.meta.url)), APP = path.resolve(HERE, '..');
const OUT = path.resolve(APP, '..', 'research_notes', 'night', 'A1');
const norm = s => String(s).replace(/\s+/g, '').replace(/\(집밥\)$/, '');
const med = a => { const s = [...a].sort((x, y) => x - y), n = s.length; return n ? (n % 2 ? s[(n - 1) / 2] : (s[n / 2 - 1] + s[n / 2]) / 2) : null; };
const q = (a, p) => { const s = [...a].sort((x, y) => x - y); if (!s.length) return null; const i = (s.length - 1) * p, lo = Math.floor(i), hi = Math.ceil(i); return s[lo] + (s[hi] - s[lo]) * (i - lo); };
const within = (a, b, tol = 0.25) => a > 0 && b > 0 && Math.abs(a - b) / b <= tol;
const r1 = v => v == null ? null : Math.round(v * 10) / 10;
// 같은 음식으로 볼 d 행: 이름이 같거나 '이름(…)'. 단 '라면(용기면, 국물)'처럼 일부만인 행, g 단위(100g당) 행은 뺀다.
const PART = /국물|건더기|면만|소스|양념|육수/;
export function auditKrDishes(rows) {
 const d = rows.filter(r => r[8] === 'd' && r[3] > 0 && r[4] != null && !PART.test(r[0])), h = rows.filter(r => r[8] === 'h' && r[3] > 0 && r[4] != null);
 const out = [];
 for (const r of rows.filter(r => r[8] === 'k' || r[8] === 'e')) {
  const n = norm(r[0]);
  const ds = d.filter(x => { const m = norm(x[0]); return m === n || m.startsWith(n + '('); });
  const hs = h.filter(x => norm(x[0]) === n);
  const dens = x => x[4] / x[3];
  const dD = ds.map(dens), dMed = med(dD), dIqr = ds.length >= 3 ? [q(dD, 0.25), q(dD, 0.75)] : null;
  const hD = hs.length ? med(hs.map(dens)) : null;
  const cur = r[3] > 0 && r[4] != null ? r[4] / r[3] : null;
  let verdict = 'doubt', why = '';
  const dTight = dIqr && dMed > 0 && dIqr[0] >= dMed * 0.75 && dIqr[1] <= dMed * 1.25;
  const ref = dMed ?? hD;
  if (cur != null && ((dMed && within(cur, dMed)) || (hD && within(cur, hD)))) { verdict = 'keep'; why = `지금 값의 1g당 열량 ${r1(cur)}이 근거(${dMed ? `식약처 ${r1(dMed)}` : ''}${dMed && hD ? '·' : ''}${hD ? `집밥 ${r1(hD)}` : ''})와 25% 안`; }
  else if (dMed && hD && within(dMed, hD)) { verdict = 'replace'; why = `식약처 ${ds.length}행 중앙값 ${r1(dMed)}과 집밥 ${r1(hD)}이 서로 맞고, 지금 값 ${cur == null ? '(무게 없음)' : r1(cur)}과 어긋남`; }
  else if (dTight && ds.length >= 3) { verdict = 'replace-d'; why = `식약처 변형 ${ds.length}행이 촘촘(${r1(dIqr[0])}~${r1(dIqr[1])})하고 집밥 근거 없음, 지금 값 ${cur == null ? '(무게 없음)' : r1(cur)}`; }
  else why = ds.length || hs.length ? `근거끼리 어긋남(식약처 ${dMed ? r1(dMed) : '-'}${dIqr ? ` 범위 ${r1(dIqr[0])}~${r1(dIqr[1])}` : ''}, 집밥 ${hD ? r1(hD) : '-'})` : '같은 이름의 근거 행 없음';
  let proposal = null;
  if (verdict === 'replace' || verdict === 'replace-d') {
   // 1인분 무게는 식약처 변형의 중앙값, 영양은 식약처 변형의 1g당 중앙값 × 무게
   const g = Math.round(med(ds.map(x => x[3])));
   const per = i => med(ds.filter(x => x[i] != null).map(x => x[i] / x[3]));
   proposal = {unit: r[2] === '봉지' ? '인분' : (r[2] || '인분'), grams: g, kcal: Math.round(dMed * g), carbs: r1(per(5) * g), protein: r1(per(6) * g), fat: r1(per(7) * g)};
   // 검산: 탄×4+단×4+지×9가 열량과 ±20% 안이어야 채택
   const calc = proposal.carbs * 4 + proposal.protein * 4 + proposal.fat * 9;
   if (!within(calc, proposal.kcal, 0.2)) { verdict = 'doubt'; why += ` · 교체값 검산 불일치(계산 ${Math.round(calc)} vs ${proposal.kcal})`; proposal = null; }
  }
  out.push({name: r[0], tag: r[8], doubtNow: r[10] === 1, current: {unit: r[2], grams: r[3], kcal: r[4], carbs: r[5], protein: r[6], fat: r[7]}, evidence: {mfds: ds.map(x => ({name: x[0], g: x[3], kcal: x[4]})), home: hs.map(x => ({name: x[0], g: x[3], kcal: x[4]}))}, verdict, why, proposal});
 }
 return out;
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
 const {rows} = JSON.parse(fs.readFileSync(path.join(APP, 'food-db.json'), 'utf8'));
 const res = auditKrDishes(rows);
 fs.mkdirSync(OUT, {recursive: true});
 fs.writeFileSync(path.join(OUT, 'kr-dish-proposal.json'), JSON.stringify({builtAt: new Date().toISOString(), rule: '1g당 열량 비교 ±25%, 교체는 식약처·집밥이 서로 맞을 때(replace) 또는 식약처 변형 3개 이상이 촘촘할 때(replace-d), 탄단지 검산 ±20%', items: res}, null, 1));
 const count = res.reduce((m, x) => (m[x.verdict] = (m[x.verdict] || 0) + 1, m), {});
 const lines = res.filter(x => x.verdict.startsWith('replace') || x.doubtNow).map(x => `| ${x.name} | ${x.verdict} | ${x.current.grams}g ${x.current.kcal}kcal | ${x.proposal ? `${x.proposal.grams}g ${x.proposal.kcal}kcal (탄${x.proposal.carbs} 단${x.proposal.protein} 지${x.proposal.fat})` : '-'} | ${x.why} |`);
 fs.writeFileSync(path.join(OUT, 'kr-dish-proposal.md'), `# 한식 대표값 맞대 보기 (밤샘 A-1)\n\n- 대상 ${res.length}행 · 판정 ${JSON.stringify(count)}\n- 규칙: ${'1g당 열량 비교 ±25%. 교체는 식약처 변형 중앙값과 집밥(원재료 합) 값이 서로 맞을 때, 또는 식약처 변형 3개 이상이 촘촘할 때. 탄단지 검산 ±20%. 근거가 없으면 확인 필요 유지.'}\n\n| 음식 | 판정 | 지금 | 제안 | 이유 |\n|---|---|---|---|---|\n${lines.join('\n')}\n`);
 console.log('판정', count);
}
