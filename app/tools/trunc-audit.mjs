// 4.17.0 잘린 글자 찾기(브라우저): 말줄임(…)이나 넘침 숨김으로 실제로 잘려 보이는 글자를 페이지마다 센다.
// title 속성으로 전체 글이 따로 있는 것(의도한 말줄임)은 '의도'로 따로 센다.
export async function truncAudit(pages = ['home', 'food', 'workout', 'body', 'analysis', 'calendar', 'settings']) {
  const w = ms => new Promise(r => setTimeout(r, ms)), out = {};
  for (const p of pages) {
    [...document.querySelectorAll(`[data-page="${p}"]`)].find(b => b.offsetParent)?.click(); await w(1300);
    const hits = [...document.querySelectorAll('main *')].filter(e => {
      if (!e.offsetParent || !e.textContent.trim()) return false;
      const cs = getComputedStyle(e);
      const x = cs.textOverflow === 'ellipsis' && e.scrollWidth > e.clientWidth + 1;
      const y = cs.overflow === 'hidden' && !e.children.length && e.scrollHeight > e.clientHeight + 3 && e.textContent.trim().length > 2;
      return x || y;
    });
    const intended = hits.filter(e => e.closest('[title]'));
    out[p] = {cut: hits.filter(e => !e.closest('[title]')).slice(0, 10).map(e => `${String(e.className || e.tagName).slice(0, 24)}: ${e.textContent.trim().slice(0, 28)}`), intended: intended.length};
  }
  return out;
}
