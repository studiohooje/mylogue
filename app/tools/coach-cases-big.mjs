// 4.28.0 밤샘 D-1: 코칭 정답지를 144건 → 6,000건으로. 사람 유형을 무작위로 500명 만들고(성별·나이·체중·목표·주의 항목·GLP-1)
// 상황 12가지와 곱한 뒤, 기록에 작은 흔들림(열량 ±5%, 체중 ±0.2kg)을 더해 '경계에서만 맞는 규칙'을 찾는다.
// 정답(알아챌 신호·하면 안 되는 말)은 기존 정답지(tools/coach-cases.mjs buildCase)의 규칙을 그대로 쓴다.
// 실행: node tools/coach-cases-big.mjs [사람 수=500] → research_notes/night/D1/report.md
import {SITUATIONS, buildCase} from './coach-cases.mjs';
import {analyze} from '../coach-engine.js';
import {hasBanned} from '../coach-knowledge.js';
import {rng} from './sim-users.mjs';
export function makePersonas(n = 500, seed = 5) {
 const r = rng(seed), out = [];
 for (let i = 0; i < n; i++) {
  const sex = r() < 0.5 ? 'male' : 'female', teen = r() < 0.06, age = teen ? 14 + Math.floor(r() * 5) : 19 + Math.floor(r() * 57);
  const goal = ['lose', 'lose', 'maintain', 'gain'][Math.floor(r() * 4)];
  const cautions = [];
  if (sex === 'female' && age < 45 && r() < 0.06) cautions.push(r() < 0.5 ? 'pregnant' : 'breastfeeding');
  if (r() < 0.05) cautions.push('kidney');
  if (r() < 0.05) cautions.push('diabetes-med');
  const w = Math.round((sex === 'male' ? 60 : 48) + r() * 55);
  out.push({id: `rp${i}`, label: `${sex === 'male' ? '남' : '여'} ${age}세 ${w}kg ${goal}${cautions.length ? ' ' + cautions.join('+') : ''}`, profile: {sex, age, goal, ...(cautions.length ? {cautions} : {})}, w, glp1: goal === 'lose' && r() < 0.12});
 }
 return out;
}
export function jitter(db, r) {
 for (const m of db.meals) m.calories = Math.round(m.calories * (0.95 + r() * 0.1));
 for (const b of db.body) b.weight = Math.round((b.weight + (r() - 0.5) * 0.4) * 10) / 10;
 return db;
}
export function runBig({people = 500, seed = 5} = {}) {
 const r = rng(seed * 31), ps = makePersonas(people, seed), fails = [], byKey = {};
 let n = 0;
 for (const p of ps) for (const s of SITUATIONS) {
  const cs = buildCase(p, s); jitter(cs.db, r); n++;
  const out = analyze(cs.db, cs.today), ids = out.map(x => x.id);
  const miss = cs.expect.filter(x => !ids.includes(x)), bad = cs.forbid.filter(x => ids.includes(x)), ban = out.flatMap(x => hasBanned(x.text));
  const safetyLeak = out.some(x => x.level === 'safety') && ids.some(x => ['info.protein-low', 'info.glp1-protein', 'info.plateau'].includes(x));
  if (miss.length || bad.length || ban.length || safetyLeak) {
   const k = `${s.id} · ${miss.length ? '빠짐 ' + miss.join(',') : ''}${bad.length ? ' 금지 ' + bad.join(',') : ''}${ban.length ? ' 금지어' : ''}${safetyLeak ? ' 안전+감량정보' : ''}`;
   byKey[k] = (byKey[k] || 0) + 1;
   if (fails.length < 300) fails.push({persona: p.label, situation: s.id, miss, bad, ban, ids});
  }
 }
 return {cases: n, fails, byKey};
}
import path from 'node:path';
import {fileURLToPath} from 'node:url';
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
 const fs = await import('node:fs');
 const res = runBig({people: Number(process.argv[2] || 500)});
 const out = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', 'research_notes', 'night', 'D1');
 fs.mkdirSync(out, {recursive: true});
 fs.writeFileSync(path.join(out, 'report.md'), `# 코칭 정답지 확대 (밤샘 D-1)\n\n- ${res.cases}건 · 어긋남 ${Object.values(res.byKey).reduce((a, b) => a + b, 0)}\n\n| 상황·어긋남 | 건수 |\n|---|---|\n${Object.entries(res.byKey).sort((a, b) => b[1] - a[1]).map(([k, v]) => `| ${k} | ${v} |`).join('\n')}\n\n## 표본\n${res.fails.slice(0, 60).map(f => `- ${f.persona} · ${f.situation} · 빠짐 ${f.miss} · 금지 ${f.bad} · 나온 것 ${f.ids}`).join('\n')}\n`);
 console.log(res.cases, '건', res.byKey);
}
