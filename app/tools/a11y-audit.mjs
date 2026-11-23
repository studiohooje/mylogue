// 4.17.0 접근성 측정기(브라우저에서 import해서 실행): 이름 없는 버튼, 라벨 없는 입력칸, 대체글 없는 그림, 글자 대비(WCAG AA).
export function a11yAudit({contrast = true} = {}) {
  const out = [], vis = el => { const r = el.getBoundingClientRect(), cs = getComputedStyle(el); return r.width > 0 && r.height > 0 && cs.visibility !== 'hidden' && cs.display !== 'none' && Number(cs.opacity) > 0.05; };
  const nm = el => `${el.tagName.toLowerCase()}${el.id ? '#' + el.id : ''}${typeof el.className === 'string' && el.className ? '.' + el.className.trim().split(/\s+/).slice(0, 2).join('.') : ''}`;
  const accName = el => (el.getAttribute('aria-label') || el.getAttribute('title') || el.textContent || el.querySelector?.('img[alt]')?.alt || '').trim();
  for (const el of document.querySelectorAll('button,a[href],[role=button]')) if (vis(el) && !accName(el)) out.push({kind: '이름 없는 버튼', el: nm(el)});
  for (const el of document.querySelectorAll('input:not([type=hidden]),select,textarea')) {
    if (!vis(el) || el.classList.contains('when-native')) continue;
    const lab = el.closest('label') || (el.id && document.querySelector(`label[for="${CSS.escape(el.id)}"]`));
    if (!lab && !el.getAttribute('aria-label') && !el.getAttribute('aria-labelledby') && !el.getAttribute('title')) out.push({kind: '라벨 없는 입력칸', el: `${nm(el)} "${el.placeholder || ''}"`});
  }
  for (const el of document.querySelectorAll('img')) if (vis(el) && !el.hasAttribute('alt')) out.push({kind: '대체글 없는 그림', el: nm(el)});
  for (const el of document.querySelectorAll('svg[role=img]')) if (vis(el) && !el.getAttribute('aria-label') && !el.querySelector('title')) out.push({kind: '설명 없는 그래프', el: nm(el)});
  if (contrast) {
    const rgb = s => { const m = String(s).match(/rgba?\(([^)]+)\)/); if (!m) return null; const [r, g, b, a = 1] = m[1].split(',').map(x => parseFloat(x)); return {r, g, b, a}; };
    const lum = c => { const f = v => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b); };
    const bgOf = el => { for (let e = el; e && e !== document.documentElement; e = e.parentElement) { const cs = getComputedStyle(e); if (cs.backgroundImage && cs.backgroundImage !== 'none') return null; const c = rgb(cs.backgroundColor); if (c && c.a > 0.85) return c; } return rgb(getComputedStyle(document.body).backgroundColor); };
    const seen = new Set();
    for (const el of document.querySelectorAll('p,span,small,b,strong,label,li,h2,h3,h4,button,a,summary,td,th')) {
      if (!vis(el)) continue;
      const own = [...el.childNodes].some(n => n.nodeType === 3 && n.textContent.trim()); if (!own) continue;
      const cs = getComputedStyle(el), fg = rgb(cs.color), bg = bgOf(el); if (!fg || !bg) continue;
      const fgc = fg.a < 1 ? {r: fg.r * fg.a + bg.r * (1 - fg.a), g: fg.g * fg.a + bg.g * (1 - fg.a), b: fg.b * fg.a + bg.b * (1 - fg.a)} : fg;
      const L1 = lum(fgc), L2 = lum(bg), ratio = (Math.max(L1, L2) + 0.05) / (Math.min(L1, L2) + 0.05);
      const size = parseFloat(cs.fontSize), bold = Number(cs.fontWeight) >= 700, need = size >= 24 || (bold && size >= 18.66) ? 3 : 4.5;
      if (ratio < need) { const k = `${cs.color}|${size}`; if (seen.has(k)) continue; seen.add(k); out.push({kind: '글자 대비 부족', el: `${nm(el)} "${el.innerText.trim().slice(0, 18)}"`, v: `${ratio.toFixed(2)} < ${need} (${cs.color}, ${size}px)`}); }
    }
  }
  return out;
}
