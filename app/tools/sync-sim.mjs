// 5.0.6 밤샘: 동기화 극단값 시험 — 기기 여러 대 + 서버(리비전 비교 후 쓰기)를 통째로 흉내 낸다.
// 기기마다 오프라인으로 만들기·고치기·지우기 → 제각각 동기화(읽은 뒤 다른 기기가 먼저 쓰는 경쟁 포함) → 충돌이면 사용자가 한쪽을 고름.
// 지키는 약속: ① 이 기기에서 바꾼 것은 충돌 없이 사라지지 않는다 ② 서버 값은 누군가 실제로 쓴 값이다(지어낸 값·되살아난 값 없음)
//              ③ 더 바꾸지 않으면 결국 모든 기기·서버가 같아진다 ④ 다시 계획하면 할 일이 없다
// node tools/sync-sim.mjs [시나리오 수=20000] [시드=1]
import {planSync, SYNC_CHUNK_SIM} from './sync-sim-shim.mjs';

export function simulate({n = 20000, seed = 1} = {}) {
  let s = seed; const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647, pick = a => a[Math.floor(rnd() * a.length)];
  const fails = {}, samples = []; let conflictsSeen = 0, casFails = 0, rounds = 0;
  const fail = (k, info) => { fails[k] = (fails[k] || 0) + 1; if (samples.length < 5) samples.push({k, ...info}); };
  for (let sc = 0; sc < n; sc++) {
    const server = {}; // key → {revision, payload}
    const nd = 2 + Math.floor(rnd() * 3), devices = Array.from({length: nd}, () => ({local: {}, baseline: {}, choices: {}}));
    const written = new Set([null]); let tok = 0;
    const keys = Array.from({length: 2 + Math.floor(rnd() * 6)}, (_, i) => `meals~k${i}`).concat(rnd() < 0.5 ? ['settings~goal'] : []);
    const edit = d => { const k = pick(keys), r = rnd(); if (r < 0.25 && d.local[k] != null) delete d.local[k]; else { const v = k.startsWith('settings') ? JSON.stringify({a: Math.floor(rnd() * 3), b: Math.floor(rnd() * 3)}) : `{"id":"${k.slice(7)}","v":${++tok}}`; d.local[k] = v; written.add(v); } };
    const syncOnce = (d, other) => {
      rounds++;
      const snapshot = JSON.parse(JSON.stringify(server));
      const plan = planSync(d.local, snapshot, d.baseline, d.choices, {fresh: Object.keys(d.baseline).length === 0 && Object.keys(d.local).length === 0});
      if (plan.conflicts.length) {
        conflictsSeen++;
        for (const c of plan.conflicts) d.choices[c.key] = {side: rnd() < 0.5 ? 'local' : 'remote', local: c.local, remote: c.remote};
        return 'conflict';
      }
      // 읽은 뒤 다른 기기가 먼저 쓰는 경쟁
      if (other && rnd() < 0.2) syncOnce(other, null);
      // 쓰기: 400개씩 묶음, 묶음 안 하나라도 리비전이 다르면 그 묶음 전체 실패(이미 쓴 묶음은 남음)
      const before = JSON.stringify(server);
      for (let i = 0; i < plan.writes.length; i += SYNC_CHUNK_SIM) {
        const part = plan.writes.slice(i, i + SYNC_CHUNK_SIM);
        if (part.some(w => (server[w.key]?.revision || 0) !== w.expectedRevision)) { casFails++; return 'cas'; }
        for (const w of part) { if (w.payload != null) written.add(w.payload); server[w.key] = {revision: w.expectedRevision + 1, payload: w.payload}; }
      }
      // 약속 ①: 이 기기에서 바꾼 키(기준과 다름)는, 고른 충돌 답이 '서버'가 아닌 한 그대로 남아야 한다
      for (const [k, l] of Object.entries({...Object.fromEntries(Object.keys(d.baseline).map(x => [x, null])), ...d.local})) {
        const b = d.baseline[k]?.payload ?? null, lv = d.local[k] ?? null, m = plan.merged[k] ?? null;
        if (lv !== b && m !== lv && !k.startsWith('settings') && !(d.choices[k]?.side === 'remote')) fail('silent-loss', {sc, k, local: lv, base: b, merged: m, before});
      }
      d.local = {...plan.merged};
      const nb = {...snapshot}; for (const w of plan.writes) nb[w.key] = {payload: w.payload, revision: w.expectedRevision + 1};
      d.baseline = nb; d.choices = {};
      // 약속 ④: 곧바로 다시 계획하면(서버가 그대로라면) 할 일이 없다
      if (JSON.stringify(server) === JSON.stringify(Object.fromEntries(Object.entries(nb)))) { const again = planSync(d.local, server, d.baseline, {}, {}); if (again.writes.length || again.conflicts.length) fail('not-idempotent', {sc}); }
      return 'ok';
    };
    const steps = 4 + Math.floor(rnd() * 20);
    for (let t = 0; t < steps; t++) { const d = pick(devices); if (rnd() < 0.6) edit(d); else syncOnce(d, pick(devices)); }
    // 더 바꾸지 않고 모두가 맞출 때까지(충돌은 고르면서)
    let quiet = false;
    for (let round = 0; round < 40 && !quiet; round++) {
      quiet = true;
      for (const d of devices) { for (let k = 0; k < 4; k++) { const r = syncOnce(d, null); if (r === 'ok') break; } }
      for (const d of devices) { const p = planSync(d.local, server, d.baseline, {}, {}); const same = JSON.stringify(Object.fromEntries(Object.entries(p.merged).sort())) === JSON.stringify(Object.fromEntries(Object.entries(d.local).sort())); if (p.writes.length || p.conflicts.length || !same) quiet = false; }
    }
    if (!quiet) { fail('no-convergence', {sc}); continue; }
    // 약속 ③: 모든 기기 = 서버
    const sv = Object.fromEntries(Object.entries(server).filter(([, v]) => v.payload != null).map(([k, v]) => [k, v.payload]));
    for (const d of devices) if (JSON.stringify(Object.fromEntries(Object.entries(d.local).sort())) !== JSON.stringify(Object.fromEntries(Object.entries(sv).sort()))) fail('diverged', {sc});
    // 약속 ②: 서버 값은 실제로 쓴 값(설정은 칸마다 합쳐 새 값이 될 수 있어 제외)
    for (const [k, v] of Object.entries(sv)) if (!k.startsWith('settings') && !written.has(v)) fail('fabricated', {sc, k, v});
  }
  return {n, fails, samples, conflictsSeen, casFails, rounds};
}
if (process.argv[1] && import.meta.url.endsWith(process.argv[1].replace(/\\/g, '/').split('/').pop())) {
  const r = simulate({n: Number(process.argv[2] || 20000), seed: Number(process.argv[3] || 1)});
  console.log(`시나리오 ${r.n} · 동기화 ${r.rounds}번 · 충돌 ${r.conflictsSeen} · 경쟁 실패 ${r.casFails}`);
  console.log('위반', JSON.stringify(r.fails)); if (r.samples.length) console.log(JSON.stringify(r.samples.slice(0, 2), null, 1).slice(0, 2500));
}
