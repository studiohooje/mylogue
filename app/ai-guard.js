// 4.29.x 불필요한 AI 호출 막기 — 앱 쪽(대표님 2026-11-25). 서버 쪽은 ai-worker/src/guards.js.
// 앱이 AI 서버를 부르는 길목(ai-client.js aiRequest) 한 곳에서만 쓴다. 실제 서버 호출에만 적용(둘러보기·가짜 AI는 비용이 없어 제외).
//  ① 같은 요청이 진행 중이면 새로 보내지 않고 그 답을 같이 기다린다(두 번 누르기·화면 다시 그리기 중복)
//  ② 같은 기능은 1.5초 안에 다시 부르지 않는다(연타)
//  ③ 이 기기에서 1분 8번·10분 40번을 넘으면 잠시 멈춘다(반복 루프 차단, 새로 고침해도 이어지게 기기에 기록)
//  ④ 서버·네트워크 실패가 3번 이어지면 1분 쉰다(서버가 아플 때 계속 두드리지 않기)
//  ⑤ 서버가 '너무 많다(429)'·'쉬는 중(503)'이라고 하면 그 기능은 30초 동안 다시 부르지 않는다
//  ⑥ 자동 재시도는 하지 않는다(다시 하기는 언제나 사람이 누른다)
export const AI_GUARD = Object.freeze({minGapMs: 1500, perMinute: 8, perTenMinutes: 40, failLimit: 3, failPauseMs: 60_000, coolMs: 30_000});
const KEY = 'mylogue.aiGuard';

export function createAIGuard({now = () => Date.now(), storage = globalThis.localStorage, limits = AI_GUARD} = {}) {
  const load = () => { try { const v = JSON.parse(storage?.getItem(KEY) || '{}'); return {stamps: Array.isArray(v.stamps) ? v.stamps.filter(Number.isFinite) : [], fails: Number(v.fails) || 0, pausedUntil: Number(v.pausedUntil) || 0, cool: v.cool && typeof v.cool === 'object' ? v.cool : {}, last: v.last && typeof v.last === 'object' ? v.last : {}}; } catch { return {stamps: [], fails: 0, pausedUntil: 0, cool: {}, last: {}}; } };
  const save = s => { try { storage?.setItem(KEY, JSON.stringify(s)); } catch {} };
  const inflight = new Map();
  const wait = ms => Math.max(1, Math.ceil(ms / 1000));
  const err = (msg, code) => Object.assign(Error(msg), {guard: code});
  function check(path) {
    const t = now(), s = load();
    s.stamps = s.stamps.filter(x => t - x < 10 * 60_000);
    if (s.pausedUntil > t) throw err(`AI 서버가 잠시 답하지 않아 기다리는 중이에요. ${wait(s.pausedUntil - t)}초 뒤에 다시 해 주세요.`, 'paused');
    if ((s.cool[path] || 0) > t) throw err(`조금 뒤에 다시 해 주세요(${wait(s.cool[path] - t)}초).`, 'cool');
    if (t - (s.last[path] || 0) < limits.minGapMs) throw err('방금 보냈어요. 답을 기다려 주세요.', 'gap');
    if (s.stamps.filter(x => t - x < 60_000).length >= limits.perMinute) throw err('AI를 너무 빠르게 여러 번 불렀어요. 1분쯤 뒤에 다시 해 주세요.', 'minute');
    if (s.stamps.length >= limits.perTenMinutes) throw err('AI를 짧은 시간에 너무 많이 불렀어요. 10분쯤 뒤에 다시 해 주세요.', 'window');
    s.stamps.push(t); s.last[path] = t; save(s);
  }
  function done(path, {ok = false, status = 0} = {}) {
    const t = now(), s = load();
    if (ok) s.fails = 0;
    else if (!status || status >= 500 || status === 429) { s.fails += 1; if (s.fails >= limits.failLimit) { s.pausedUntil = t + limits.failPauseMs; s.fails = 0; } }
    if (status === 429 || status === 503) s.cool[path] = t + limits.coolMs;
    for (const k of Object.keys(s.cool)) if (s.cool[k] <= t) delete s.cool[k];
    save(s);
  }
  // run: 같은 key가 진행 중이면 그 약속을 같이 쓰고, 아니면 검사 → 실행 → 결과 기록
  function run(path, key, fn) {
    if (inflight.has(key)) return inflight.get(key);
    check(path);
    const p = (async () => {
      try { const r = await fn(); done(path, {ok: true}); return r; }
      catch (e) { done(path, {status: Number(e?.status) || 0}); throw e; }
    })().finally(() => inflight.delete(key));
    inflight.set(key, p);
    return p;
  }
  return {check, done, run, inflightSize: () => inflight.size, reset: () => { inflight.clear(); save({stamps: [], fails: 0, pausedUntil: 0, cool: {}, last: {}}); }};
}
// 요청 본문으로 만든 짧은 열쇠(같은 요청 알아보기용, 사진 내용까지 포함)
export function requestKey(path, body) {
  const s = `${path}|${JSON.stringify(body ?? {})}`;
  let h1 = 0x811c9dc5, h2 = 0;
  for (let i = 0; i < s.length; i++) { const c = s.charCodeAt(i); h1 = Math.imul(h1 ^ c, 16777619) >>> 0; h2 = (h2 * 31 + c) >>> 0; }
  return `${path}:${s.length}:${h1.toString(36)}${h2.toString(36)}`;
}
