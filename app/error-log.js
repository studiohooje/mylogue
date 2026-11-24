// 4.27.0 전수검사 AA-07(최소): 사용자가 겪은 오류를 알 방법이 메일뿐이었다.
// ① 잡히지 않은 오류를 이 기기에만 최근 30건 쌓아 두고(기록 내용은 넣지 않음: 오류 문장 앞부분·파일 위치·화면·버전·시각),
//    도움말에서 '문의 메일에 오류 기록 붙이기'로 사용자가 직접 보낸다. 자동으로 서버에 보내지 않는다.
// ② 원격 공지: 배포 폴더의 notice.json 한 개를 읽어 한 줄 안내를 띄운다(서버 없이, 운영자가 파일만 바꿔 배포).
// 이 파일은 app.js를 import하지 않는다.
const KEY = 'mylogue.errlog', MAX = 30, SEEN = 'mylogue.notice.seen';
const ls = {get: k => { try { return globalThis.localStorage?.getItem(k); } catch { return null; } }, set: (k, v) => { try { globalThis.localStorage?.setItem(k, v); } catch {} }, del: k => { try { globalThis.localStorage?.removeItem(k); } catch {} }};
const clip = (v, n) => String(v ?? '').replace(/\s+/g, ' ').trim().slice(0, n);
// 이메일·긴 숫자 열은 가린다(오류 문장에 기록 값이 섞여 들어오는 경우 대비)
const scrub = s => s.replace(/[\w.+-]+@[\w-]+\.[\w.]+/g, '(이메일)').replace(/\d{6,}/g, '(숫자)');
export function readErrors() { try { const a = JSON.parse(ls.get(KEY) || '[]'); return Array.isArray(a) ? a : []; } catch { return []; } }
export function logError(err, {where = '', version = '', page = '', now = new Date()} = {}) {
 const msg = scrub(clip(err?.message ?? err?.reason?.message ?? err?.reason ?? err, 200));
 if (!msg) return null;
 const stack = clip(err?.stack ?? err?.reason?.stack ?? '', 400).split(' at ').slice(1, 4).map(x => x.replace(/https?:\/\/[^/]+/, '').replace(/\?v=[\d.]+/, '')).join(' < ');
 const list = readErrors(), last = list.at(-1);
 // 같은 오류가 연달아 나면 횟수만 늘린다
 if (last && last.msg === msg && last.page === page) { last.n = (last.n || 1) + 1; last.at = now.toISOString(); ls.set(KEY, JSON.stringify(list)); return last; }
 const item = {at: now.toISOString(), msg, where: clip(where, 40), stack: scrub(stack), page: clip(page, 30), v: clip(version, 20), n: 1};
 ls.set(KEY, JSON.stringify([...list, item].slice(-MAX)));
 return item;
}
export const clearErrors = () => ls.del(KEY);
export function installErrorLog({version = '', page = () => ''} = {}) {
 const g = globalThis;
 if (!g.addEventListener || g.__mylogueErrLog) return false;
 g.__mylogueErrLog = true;
 g.addEventListener('error', e => { try { logError(e.error || e.message, {where: 'error', version, page: page()}); } catch {} });
 g.addEventListener('unhandledrejection', e => { try { logError(e.reason, {where: 'promise', version, page: page()}); } catch {} });
 return true;
}
// 문의 메일 본문(사용자가 보내기 전에 메일 앱에서 그대로 볼 수 있다)
export function errorReportText({version = '', ua = '', list = readErrors()} = {}) {
 const lines = list.slice(-10).map(x => `- ${x.at.slice(0, 16).replace('T', ' ')} [${x.page || '-'}] ${x.msg}${x.n > 1 ? ` (${x.n}번)` : ''}${x.stack ? `\n  ${x.stack}` : ''}`);
 return `마이로그 ${version} 오류 기록 (최근 ${lines.length}건)\n기기: ${clip(ua, 160)}\n\n${lines.join('\n') || '- 쌓인 오류 없음'}\n\n(이 기록에는 식단·체중 같은 내 기록 내용은 들어 있지 않아요)`;
}
export function errorMailHref(opts = {}) {
 const body = errorReportText(opts).slice(0, 1800);
 return `mailto:studiohooje@gmail.com?subject=${encodeURIComponent('마이로그 문의 · 오류 기록')}&body=${encodeURIComponent(body)}`;
}
export function errorHelpHTML(esc, {version = '', ua = ''} = {}) {
 const n = readErrors().length;
 return `<section class="help-cat help-errors"><h4>오류가 났을 때</h4><p class="hint">앱이 이 기기에 오류 기록을 ${n ? `${n}건` : '쌓고 있지 않아요(아직 없음)'}${n ? ' 남겨 두었어요' : ''}. 문의할 때 붙이면 원인을 찾기 쉬워요. 내 식단·체중 기록은 들어 있지 않고, 보내기 전에 메일에서 내용을 볼 수 있어요.</p><div class="actions"><a class="button secondary" href="${esc(errorMailHref({version, ua}))}">문의 메일에 오류 기록 붙이기</a>${n ? '<button type="button" class="button secondary" id="errlog-clear">오류 기록 지우기</button>' : ''}</div></section>`;
}
// ---- 원격 공지 ----
// notice.json 형식: {"id":"2026-11-25-a","text":"…","level":"info|warn","until":"2026-12-01","link":"https://…(선택)"}
export function cleanNotice(raw, today = new Date().toISOString().slice(0, 10)) {
 if (!raw || typeof raw !== 'object') return null;
 const id = clip(raw.id, 60), text = clip(raw.text, 240);
 if (!id || !text) return null;
 if (raw.until && String(raw.until) < today) return null;
 const link = /^https:\/\/[^\s"'<>]+$/.test(String(raw.link || '')) ? String(raw.link) : '';
 return {id, text, level: raw.level === 'warn' ? 'warn' : 'info', link};
}
export async function loadNotice(fetchImpl = globalThis.fetch, today) {
 try {
  const r = await fetchImpl(`notice.json?t=${Date.now()}`, {cache: 'no-store'});
  if (!r?.ok) return null;
  const n = cleanNotice(await r.json(), today);
  return n && ls.get(SEEN) !== n.id ? n : null;
 } catch { return null; }
}
export const dismissNotice = id => ls.set(SEEN, String(id || ''));
export function noticeHTML(n, esc) {
 if (!n) return '';
 return `<section class="card remote-notice ${n.level}" role="status"><p>${esc(n.text)}${n.link ? ` <a href="${esc(n.link)}" target="_blank" rel="noopener">자세히</a>` : ''}</p><button type="button" class="chip" id="notice-dismiss" data-notice-id="${esc(n.id)}">확인했어요</button></section>`;
}
