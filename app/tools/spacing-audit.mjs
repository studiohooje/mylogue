// 4.17.0 글상자-글자 간격·줄 맞춤 측정기(브라우저 콘솔/자동화에서 실행). 결과는 문제 목록.
// 기준: 입력칸 안쪽 좌우 여백 12px 이상·높이 44px 이상, 버튼·칩 좌우 여백 10px 이상(아이콘 버튼 제외),
// 라벨 글자와 입력칸 사이 4px 이상, 같은 줄에 나란한 입력칸·버튼은 높이와 윗선이 같게, 글자가 상자 밖으로 넘치지 않게.
export function spacingAudit() {
  const vis = el => { const r = el.getBoundingClientRect(), cs = getComputedStyle(el); return r.width > 0 && r.height > 0 && cs.visibility !== 'hidden' && cs.display !== 'none' && !el.closest('[hidden],details:not([open]) > :not(summary)'); };
  const name = el => { const t = (el.getAttribute('aria-label') || el.placeholder || el.innerText || el.value || '').trim().replace(/\s+/g, ' ').slice(0, 24); return `${el.tagName.toLowerCase()}${el.id ? '#' + el.id : ''}${el.className && typeof el.className === 'string' ? '.' + el.className.trim().split(/\s+/).slice(0, 2).join('.') : ''} "${t}"`; };
  const px = v => parseFloat(v) || 0, out = [];
  for (const el of document.querySelectorAll('input:not([type=checkbox]):not([type=radio]):not([type=range]):not([type=hidden]):not(.when-native),select,textarea')) {
    if (!vis(el)) continue;
    const cs = getComputedStyle(el), r = el.getBoundingClientRect();
    const pl = px(cs.paddingLeft), pr = px(cs.paddingRight);
    if (pl < 12 && cs.textAlign !== 'center') out.push({kind: '입력칸 왼쪽 여백', el: name(el), v: pl});
    if (r.height < 44) out.push({kind: '입력칸 높이', el: name(el), v: Math.round(r.height)});
    if (px(cs.fontSize) < 16) out.push({kind: '입력칸 글자 16px 미만', el: name(el), v: px(cs.fontSize)});
    const lab = el.closest('label');
    if (lab) { const range = document.createRange(); const tn = [...lab.childNodes].find(n => n.nodeType === 3 && n.textContent.trim()); if (tn) { range.selectNodeContents(tn); const tr = range.getBoundingClientRect(); const gap = r.top - tr.bottom; if (tr.height && gap < 4 && gap > -40) out.push({kind: '라벨-칸 간격', el: name(el), v: Math.round(gap)}); } }
  }
  for (const el of document.querySelectorAll('button,.chip,a.button')) {
    if (!vis(el)) continue;
    const cs = getComputedStyle(el), r = el.getBoundingClientRect(), text = (el.innerText || '').trim();
    if (!text || text.length <= 1 || r.width <= 48) continue;
    const pl = px(cs.paddingLeft), pr = px(cs.paddingRight);
    if (Math.min(pl, pr) < 10 && cs.justifyContent !== 'center' && cs.textAlign !== 'center') out.push({kind: '버튼 좌우 여백', el: name(el), v: Math.min(pl, pr)});
    if (el.scrollWidth > el.clientWidth + 2 && cs.overflow !== 'visible') out.push({kind: '버튼 글자 잘림', el: name(el), v: el.scrollWidth - el.clientWidth});
    if (r.height < 40 && !el.classList.contains('text-button')) out.push({kind: '터치 높이 40 미만', el: name(el), v: Math.round(r.height)});
  }
  // 같은 줄(형제 필드)의 입력칸 높이·윗선 맞춤
  for (const grid of document.querySelectorAll('.form-grid,.quick-time,.field-row,.when-pill,.qs-steppers,.after-row,.set-input-grid')) {
    if (!vis(grid)) continue;
    const ctrls = [...grid.querySelectorAll(':scope > label input, :scope > label select, :scope > label button.when-btn, :scope > .field input, :scope > .field select')].filter(vis);
    const rows = new Map();
    for (const c of ctrls) { const r = c.getBoundingClientRect(), key = Math.round(r.top / 30); (rows.get(key) || rows.set(key, []).get(key)).push({c, r}); }
    for (const list of rows.values()) if (list.length > 1) { const hs = list.map(x => Math.round(x.r.height)), ts = list.map(x => Math.round(x.r.top)); if (Math.max(...hs) - Math.min(...hs) > 2 || Math.max(...ts) - Math.min(...ts) > 2) out.push({kind: '나란한 칸 높이·윗선 불일치', el: list.map(x => name(x.c)).join(' | '), v: `h ${hs.join('/')} · top ${ts.join('/')}`}); }
  }
  const seen = new Set();
  return out.filter(x => { const k = x.kind + x.el; if (seen.has(k)) return false; seen.add(k); return true; });
}
