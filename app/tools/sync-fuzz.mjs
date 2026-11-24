// 4.28.0 밤샘 E-2: 동기화 계획(planSync)·설정 합치기(mergeSetting)를 무작위 상태 수만 개로 시험한다.
// 4.27.0에서 고치다 새로 생긴 문제가 모두 동기화였다(N-1·N-5). 실제 서버 없이, 시드를 고정해 실패를 그대로 재현할 수 있다.
// 불변식
//  F1 어느 쪽도 안 바꾼 기록은 쓰지 않는다(l===r → 쓰기 없음)
//  F2 한쪽만 바꾼 기록은 그 쪽 값이 이긴다(이 기기만: l, 서버만: r) — 따로 보관(hold) 중인 키는 예외
//  F3 계획을 서버에 적용하고 기준을 맞춘 뒤 다시 계획하면 쓰기·충돌 0(수렴)
//  F4 따로 보관(hold) 중이고 이 기기에 없는 키는 절대 쓰지 않는다
//  F5 서버에 있는 기록(리비전>0)을 기준 없이(새 기기) 지우지 않는다
//  F6 쓰기의 expectedRevision은 서버의 지금 리비전과 같다
//  F7 설정 합치기 결과는 늘 JSON이고, 양쪽이 같은 값이면 그 값
// 실행: node tools/sync-fuzz.mjs [횟수=50000] [시드=1] → research_notes/night/E2/report.md
import {planSync, mergeSetting} from '../cloud-model.js';
import {rng} from './sim-users.mjs';
const KINDS = ['meals', 'body', 'workouts', 'settings', 'dayStates', 'favorites'];
function makeCase(r) {
 const keys = Array.from({length: 1 + Math.floor(r() * 8)}, (_, i) => `${KINDS[Math.floor(r() * KINDS.length)]}~k${i}`);
 const val = key => key.startsWith('settings~') ? (r() < 0.5 ? JSON.stringify({a: Math.floor(r() * 3), b: Math.floor(r() * 3)}) : JSON.stringify(['A', 'B', 'C'].filter(() => r() < 0.5))) : JSON.stringify({id: key.split('~')[1], v: Math.floor(r() * 4)});
 const local = {}, remote = {}, baseline = {}, hold = new Set();
 const hasBase = r() < 0.8;
 for (const k of keys) {
  const b = hasBase && r() < 0.85 ? val(k) : null;
  if (b != null) baseline[k] = {payload: b, revision: 1 + Math.floor(r() * 3)};
  const lChange = r() < 0.35, rChange = r() < 0.35;
  const l = lChange ? (r() < 0.2 ? null : val(k)) : b; const rv = rChange ? (r() < 0.2 ? null : val(k)) : b;
  if (l != null) local[k] = l;
  if (rv != null || (b != null && rChange)) remote[k] = {payload: rv, revision: (baseline[k]?.revision || 0) + (rChange ? 1 : 0) || 1};
  if (l == null && r() < 0.1) hold.add(k);
 }
 return {local, remote, baseline, hold};
}
export function fuzz({n = 50000, seed = 1} = {}) {
 const r = rng(seed), fails = {}, samples = [], fail = (rule, c, extra = '') => { fails[rule] = (fails[rule] || 0) + 1; if (samples.length < 40) samples.push({rule, case: JSON.stringify(c).slice(0, 600), extra}); };
 let conflicts = 0;
 for (let i = 0; i < n; i++) {
  const c = makeCase(r), {local, remote, baseline, hold} = c;
  let p; try { p = planSync(local, remote, baseline, {}, {hold}); } catch (e) { fail('F0 계획 실패', c, e.message); continue; }
  if (p.conflicts.length) conflicts++;
  const writes = new Map(p.writes.map(w => [w.key, w]));
  for (const key of new Set([...Object.keys(local), ...Object.keys(remote), ...Object.keys(baseline)])) {
   const l = local[key] ?? null, rv = remote[key]?.payload ?? null, b = baseline[key]?.payload ?? null;
   const conflicted = p.conflicts.some(x => x.key === key);
   if (l === rv && writes.has(key)) fail('F1 안 바뀐 기록을 씀', c, key);
   if (hold.has(key) && l === null) { if (writes.has(key)) fail('F4 따로 보관 키를 씀', c, key); continue; }
   if (!conflicted && b != null && l !== b && rv === b && (p.merged[key] ?? null) !== l) fail('F2 이 기기만 바꾼 값이 짐', c, key);
   if (!conflicted && b != null && l === b && rv !== b && (p.merged[key] ?? null) !== rv) fail('F2 서버만 바꾼 값이 짐', c, key);
   const w = writes.get(key);
   if (w && w.expectedRevision !== (remote[key]?.revision || 0)) fail('F6 기대 리비전 불일치', c, key);
   if (w && w.payload === null && !Object.keys(baseline).length && remote[key]?.payload != null) fail('F5 새 기기가 서버 기록을 지움', c, key);
  }
  if (!p.conflicts.length) {
   // 적용: 서버 ← 쓰기, 기준 ← 결과, 이 기기 ← 결과 → 다시 계획하면 할 일 없음
   const remote2 = {...remote}; for (const w of p.writes) remote2[w.key] = {payload: w.payload, revision: w.expectedRevision + 1};
   const local2 = {...p.merged}, base2 = {...remote2};
   const p2 = planSync(local2, remote2, base2, {}, {hold});
   if (p2.writes.length || p2.conflicts.length) fail('F3 다시 계획하면 할 일이 남음', c, `${p2.writes.length}/${p2.conflicts.length}`);
  }
 }
 // F7 설정 합치기
 for (let i = 0; i < Math.min(n, 20000); i++) {
  const v = () => r() < 0.5 ? JSON.stringify({a: Math.floor(r() * 3), b: r() < 0.3 ? undefined : Math.floor(r() * 3)}) : JSON.stringify(['A', 'B', 'C', 'D'].filter(() => r() < 0.5));
  const l = v(), rv = v(), b = r() < 0.8 ? v() : null;
  let m; try { m = mergeSetting(l, rv, b); JSON.parse(m); } catch (e) { fail('F7 설정 합치기 결과가 JSON 아님', {l, rv, b}, e.message); continue; }
  if (l === rv && m !== l && JSON.stringify(JSON.parse(m)) !== JSON.stringify(JSON.parse(l))) fail('F7 같은 값인데 결과가 다름', {l, rv, b}, m);
 }
 return {n, seed, conflicts, fails, samples};
}
import path from 'node:path';
import {fileURLToPath} from 'node:url';
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
 const fs = await import('node:fs');
 const [n = 50000, seed = 1] = process.argv.slice(2).map(Number), t0 = Date.now();
 const res = fuzz({n, seed});
 const out = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', 'research_notes', 'night', 'E2');
 fs.mkdirSync(out, {recursive: true});
 fs.writeFileSync(path.join(out, 'report.md'), `# 동기화 무작위 시험 (밤샘 E-2)\n\n- ${n}가지 상태, 시드 ${seed}, ${((Date.now() - t0) / 1000).toFixed(0)}초, 충돌로 물어본 경우 ${res.conflicts}\n- 위반: ${Object.keys(res.fails).length ? JSON.stringify(res.fails) : '없음'}\n\n${res.samples.map(x => `- ${x.rule} · ${x.extra}\n  \`${x.case}\``).join('\n')}\n`);
 console.log('위반', res.fails, '충돌', res.conflicts);
}
