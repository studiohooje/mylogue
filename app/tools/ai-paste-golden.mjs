// 4.28.0 밤샘 D-4: AI 답 붙여넣기 해석 정답지. AI가 실제로 보낼 법한 모양(코드 블록·앞뒤 설명·굽은 따옴표·끝 쉼표·
// 한국어 키·'2팩'·'반 공기'·'1/2'·'한 개 반'·세트 줄임·lb)을 시드 고정으로 만들고, 기대값과 parsePaste 결과를 맞대 본다.
// 실행: node tools/ai-paste-golden.mjs [개수=1000] → app/tests/fixtures/ai-paste-golden.json·research_notes/night/D4/report.md
import {parsePaste} from '../ai-paste.js';
import {rng} from './sim-users.mjs';
const FOOD = [['닭가슴살', 'g'], ['현미밥', '공기'], ['라면', '봉지'], ['김치찌개', '인분'], ['프로틴 쉐이크', '스쿱'], ['바나나', '개'], ['우유', 'ml'], ['편의점 도시락', '개'], ['아메리카노', '잔'], ['샐러드', '그릇']];
const QTY = [ // [AI가 적은 양, 단위 칸 비움 여부, 기대 양, 기대 단위(빈 값이면 FOOD 단위)]
 [1, false, 1, ''], [2, false, 2, ''], [1.5, false, 1.5, ''], ['0.5', false, 0.5, ''], ['1/2', false, 0.5, ''], ['반', false, 0.5, ''],
 ['2팩', true, 2, '팩'], ['1 공기', true, 1, '공기'], ['반 공기', true, 0.5, '공기'], ['한 개', true, 1, '개'], ['두 개', true, 2, '개'], ['1개 반', true, 1.5, '개'],
 ['150g', true, 150, 'g'], ['200 ml', true, 200, 'ml'], ['3/4', false, 0.75, ''], ['1,000', false, 1000, ''],
];
const wrap = (json, k, r) => {
 const s = JSON.stringify(json, null, r() < 0.5 ? 2 : 0);
 switch (k) {
  case 0: return s;
  case 1: return '```json\n' + s + '\n```';
  case 2: return '정리했어요. 아래 코드를 마이로그에 붙여 넣으세요.\n\n```mylogue\n' + s + '\n```\n\n확정은 앱에서 해 주세요.';
  case 3: return '```\n' + s.replace(/"/g, (m, i) => i % 7 === 0 ? '"' : '"') + '\n```';
  case 4: return '```json\n' + s.replace(/\}(\s*)\]/, '},$1]') + '\n```'; // 끝 쉼표
  case 5: return '네!\n```json\n' + s + '\n```\n다른 것도 필요하면 말씀하세요.';
  default: return s;
 }
};
export function makeCases(n = 1000, seed = 11) {
 const r = rng(seed), pick = a => a[Math.floor(r() * a.length)], out = [];
 for (let i = 0; i < n; i++) {
  const date = `2026-11-${String(1 + Math.floor(r() * 24)).padStart(2, '0')}`, time = `${String(6 + Math.floor(r() * 16)).padStart(2, '0')}:${pick(['00', '15', '30', '45'])}`;
  const kind = r() < 0.6 ? 'meal' : r() < 0.6 ? 'workout' : 'body';
  let rec, expect;
  if (kind === 'meal') {
   const items = [], exp = [];
   for (let j = 0; j < 1 + Math.floor(r() * 3); j++) {
    const [name, unit] = pick(FOOD), [q, blankUnit, eq, eu] = pick(QTY), kor = r() < 0.2;
    const it = kor ? {이름: name, 양: q, ...(blankUnit ? {} : {단위: unit})} : {name, qty: q, ...(blankUnit ? {} : {unit})};
    const kcal = Math.round(50 + r() * 600); it.kcal = kcal; it.carbs = Math.round(r() * 80); it.protein = Math.round(r() * 40); it.fat = Math.round(r() * 25);
    items.push(it); exp.push({name, qty: eq, unit: eu || unit, kcal});
   }
   rec = {type: r() < 0.1 ? '식사' : 'meal', date, time, items}; expect = {type: 'meal', date, items: exp};
  } else if (kind === 'workout') {
   const lb = r() < 0.2, w = 20 + Math.floor(r() * 16) * 5, reps = 5 + Math.floor(r() * 8), n = 2 + Math.floor(r() * 4), short = r() < 0.4;
   const ex = short ? {name: '벤치프레스', sets: n, weight: w, reps, ...(lb ? {unit: 'lb'} : {})} : {name: '벤치프레스', sets: Array.from({length: n}, () => lb ? {lb: w, reps} : {kg: w, reps})};
   rec = {type: 'workout', date, title: '가슴', exercises: [ex, {name: '러닝머신', minutes: 20 + Math.floor(r() * 20)}]}; expect = {type: 'workout', date, sets: n, weight: w, unit: lb ? 'lb' : 'kg', reps};
  } else {
   const wt = Math.round((45 + r() * 60) * 10) / 10, fat = r() < 0.5 ? Math.round((10 + r() * 25) * 10) / 10 : null;
   rec = {type: r() < 0.2 ? '체중' : 'body', date, ...(r() < 0.3 ? {체중: String(wt)} : {weight: wt}), ...(fat != null ? {bodyFat: fat} : {})}; expect = {type: 'body', date, weight: wt, fat};
  }
  const json = r() < 0.15 ? [rec] : {mylogue: 1, said: '테스트', records: [rec]};
  out.push({id: i + 1, text: wrap(json, Math.floor(r() * 6), r), expect});
 }
 return out;
}
export function judge(c) {
 let d;
 try { d = parsePaste(c.text); } catch (e) { return {ok: false, why: `해석 실패: ${e.message}`}; }
 if (d.length !== 1) return {ok: false, why: `기록 수 ${d.length}`};
 const x = d[0], e = c.expect, p = x.parsedData;
 if (x.type !== e.type) return {ok: false, why: `종류 ${x.type}`};
 if (e.type === 'meal') {
  if (p.items[0].date !== e.date) return {ok: false, why: `날짜 ${p.items[0].date}`};
  for (let i = 0; i < e.items.length; i++) { const a = p.items[i], b = e.items[i]; if (!a) return {ok: false, why: `${i + 1}번째 음식 없음`}; if (a.name !== b.name) return {ok: false, why: `이름 ${a.name}`}; if (Math.abs(a.servingQty - b.qty) > 1e-9) return {ok: false, why: `${b.name} 양 ${a.servingQty}≠${b.qty} (${JSON.stringify(c.text.match(/"(qty|양)":\s*("[^"]*"|[\d.]+)/g)?.[i])})`}; if (a.servingUnit !== b.unit) return {ok: false, why: `${b.name} 단위 ${a.servingUnit}≠${b.unit}`}; }
 } else if (e.type === 'workout') {
  const ex = p.exercises[0];
  if (ex.sets.length !== e.sets) return {ok: false, why: `세트 수 ${ex.sets.length}≠${e.sets}`};
  const s = ex.sets[0];
  if (s.reps !== e.reps) return {ok: false, why: `횟수 ${s.reps}`};
  if ((s.unit || 'kg') !== e.unit || Math.abs((s.weight ?? s.kg) - e.weight) > 1e-9) return {ok: false, why: `무게 ${s.weight}${s.unit}≠${e.weight}${e.unit}`};
  if (p.exercises[1]?.kind !== 'cardio') return {ok: false, why: '유산소 분 못 읽음'};
 } else {
  if (p.weight !== e.weight) return {ok: false, why: `체중 ${p.weight}`};
  if ((p.bodyFatPct ?? null) !== e.fat) return {ok: false, why: `체지방 ${p.bodyFatPct}`};
 }
 return {ok: true};
}
import path from 'node:path';
import {fileURLToPath} from 'node:url';
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
 const fs = await import('node:fs');
 const n = Number(process.argv[2] || 1000), cases = makeCases(n), res = cases.map(c => ({...c, ...judge(c)}));
 const APP = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'), out = path.resolve(APP, '..', 'research_notes', 'night', 'D4');
 fs.mkdirSync(path.join(APP, 'tests', 'fixtures'), {recursive: true}); fs.mkdirSync(out, {recursive: true});
 fs.writeFileSync(path.join(APP, 'tests', 'fixtures', 'ai-paste-golden.json'), JSON.stringify(cases));
 const bad = res.filter(x => !x.ok), kinds = bad.reduce((m, x) => { const k = x.why.replace(/[\d.]+/g, '#').slice(0, 40); m[k] = (m[k] || 0) + 1; return m; }, {});
 fs.writeFileSync(path.join(out, 'report.md'), `# AI 붙여넣기 해석 정답지 (밤샘 D-4)\n\n- ${n}건 · 통과 ${n - bad.length} · 실패 ${bad.length}\n- 실패 유형: ${JSON.stringify(kinds)}\n\n${bad.slice(0, 40).map(x => `- #${x.id} ${x.why}\n  \`${x.text.replace(/\n/g, ' ').slice(0, 220)}\``).join('\n')}\n`);
 console.log(`통과 ${n - bad.length}/${n}`, kinds);
}
