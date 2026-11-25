// 5.0.5 밤샘 CSS 세 층 정리(2): 같은 선택자·같은 @media 안에서 뒤(뒤 파일 포함)에 같은 속성이 다시 나오면, 앞의 선언은 화면에 영향이 없다 → 지운다.
// 안전 규칙: ① 선택자 글자와 @media 맥락이 완전히 같을 때만 ② 속성 이름이 정확히 같을 때만(padding ↔ padding-left 같은 줄임 속성은 건드리지 않음)
// ③ 앞이 !important 이고 뒤가 아니면 앞이 이기므로 지우지 않음 ④ 뒤 값이 새 단위·함수(dvh·svh·env()·color-mix·:has 등)면 옛 기기용 대비값일 수 있어 지우지 않음
// ⑤ 같은 규칙 안의 두 번 선언(대비값)은 건드리지 않음.  선언을 다 지워 빈 규칙이 되면 규칙째 지운다.
// node tools/css-override-prune.mjs [--write]
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const APP = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const FILES = ['app.css', 'quick-entry.css', 'aurora-theme.css'];
const WRITE = process.argv.includes('--write');
const RISKY = /dvh|svh|lvh|env\(|color-mix|has\(|@supports|-webkit-|-moz-/;

function parse(css){
  const out = [], stack = []; let selStart = 0;
  for (let k = 0; k < css.length; k++) {
    const c = css[k];
    if (c === '/' && css[k + 1] === '*') { const e = css.indexOf('*/', k + 2); k = e < 0 ? css.length : e + 1; continue; }
    if (c === '"' || c === "'") { const e = css.indexOf(c, k + 1); k = e < 0 ? css.length : e; continue; }
    if (c === '{') { stack.push({sel: css.slice(selStart, k).replace(/\/\*[\s\S]*?\*\//g, '').trim(), open: k, start: selStart}); selStart = k + 1; continue; }
    if (c === '}') { const top = stack.pop(); if (top && !top.sel.startsWith('@') && !stack.some(x => /^@(keyframes|font-face)/.test(x.sel))) out.push({sel: top.sel.replace(/\s+/g, ' '), bodyStart: top.open + 1, bodyEnd: k, start: top.start, end: k + 1, ctx: stack.map(x => x.sel.replace(/\s+/g, ' ')).join(' / ')}); selStart = k + 1; }
  }
  return out;
}
// 본문을 선언으로 나눈다(괄호·따옴표 안의 ; 는 무시)
function decls(body){
  const out = []; let depth = 0, q = '', s = 0;
  for (let i = 0; i <= body.length; i++) {
    const c = body[i];
    if (q) { if (c === q) q = ''; continue; }
    if (c === '"' || c === "'") { q = c; continue; }
    if (c === '(') depth++; else if (c === ')') depth--;
    if ((c === ';' && depth === 0) || i === body.length) { const raw = body.slice(s, i); const t = raw.replace(/\/\*[\s\S]*?\*\//g, '').trim(); if (t) { const j = t.indexOf(':'); if (j > 0) out.push({prop: t.slice(0, j).trim().toLowerCase(), val: t.slice(j + 1).trim(), important: /!important\s*$/.test(t), raw, from: s, to: i}); } s = i + 1; }
  }
  return out;
}
const texts = Object.fromEntries(FILES.map(f => [f, fs.readFileSync(path.join(APP, f), 'utf8')]));
// 모든 규칙을 '적용 순서'대로(파일 순서 → 파일 안 순서)
const all = [];
for (const f of FILES) for (const r of parse(texts[f])) all.push({...r, f, d: decls(texts[f].slice(r.bodyStart, r.bodyEnd))});
const lastBy = new Map(); // ctx|sel|prop → {important, val}  (뒤에서부터 훑으며 '이 뒤에 나오는 값')
const kill = new Map(); // f → [{bodyStart, from, to}]
let removed = 0, examples = [];
for (let i = all.length - 1; i >= 0; i--) {
  const r = all[i];
  const seenHere = new Set();
  for (let j = r.d.length - 1; j >= 0; j--) {
    const d = r.d[j], key = `${r.ctx}|${r.sel}|${d.prop}`;
    if (seenHere.has(d.prop)) continue; // 같은 규칙 안 대비값
    seenHere.add(d.prop);
    const later = lastBy.get(key);
    if (later && (!d.important || later.important) && !RISKY.test(later.val) && !RISKY.test(d.val) && !d.prop.startsWith('--')) {
      (kill.get(r.f) || kill.set(r.f, []).get(r.f)).push({abs: r.bodyStart + d.from, absTo: Math.min(r.bodyEnd, r.bodyStart + d.to + 1)});
      removed++; if (examples.length < 25) examples.push(`${r.f}: ${r.sel} { ${d.prop}: ${d.val} } → 뒤 ${later.f}: ${later.val}`);
      continue;
    }
    if (!later || (d.important && !later.important)) lastBy.set(key, {important: d.important, val: d.val, f: r.f});
  }
}
console.log('지울 선언', removed); for (const e of examples) console.log(' ', e);
if (WRITE) for (const [f, list] of kill) {
  let s = texts[f];
  for (const k of list.sort((a, b) => b.abs - a.abs)) s = s.slice(0, k.abs) + s.slice(k.absTo);
  // 빈 규칙 지우기
  for (let n = 0; n < 3; n++) s = s.replace(/(^|[}\n;])\s*([^{}@;\/][^{}]*?)\{\s*\}/g, '$1');
  s = s.replace(/@media[^{]*\{\s*\}/g, '');
  fs.writeFileSync(path.join(APP, f), s);
}
