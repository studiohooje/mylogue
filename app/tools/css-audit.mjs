// 5.0.5 밤샘 CSS 세 층 정리 도구: app.css → quick-entry.css → aurora-theme.css 가 서로 덮어쓰는 상태를 잰다.
// ① 죽은 규칙: 선택자의 클래스·아이디가 JS·HTML 어디에도 없는 규칙 ② 완전히 같은 규칙(선택자+선언)이 여러 번 ③ 같은 선택자가 여러 파일에 흩어진 수
// node tools/css-audit.mjs [--write]  → --write 면 ①·② 를 지운 새 CSS를 같은 자리에 쓴다(주석은 그대로)
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const APP = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const FILES = ['app.css', 'quick-entry.css', 'aurora-theme.css'];
const WRITE = process.argv.includes('--write');
// JS·HTML에 나오는 모든 글자(클래스 이름 후보)
const src = fs.readdirSync(APP).filter(f => /\.(js|html|mjs)$/.test(f) && !/\.test\./.test(f)).map(f => fs.readFileSync(path.join(APP, f), 'utf8')).join('\n');
const words = new Set(src.match(/[A-Za-z_][\w-]*/g));
// 동적으로 만드는 클래스 앞부분(예: hero-${slot}, s-${...}, mlg-…)
const dynPrefix = [...src.matchAll(/([a-z][\w-]*-)\$\{/g)].map(m => m[1]);
const known = t => words.has(t) || dynPrefix.some(p => t.startsWith(p));

// 아주 단순한 CSS 파서: @media·@supports 안도 규칙 단위로 자른다(@keyframes·@font-face는 통째로 둔다)
function parse(css){
  const out = []; let i = 0, depth = 0, stack = [];
  const re = /\/\*[\s\S]*?\*\/|[{}]|[^{}\/]+|\//g; let m, buf = '';
  const blocks = []; // {pre, sel, body, start, end, ctx}
  let tokStart = 0, selStart = 0, sel = '', ctx = [];
  for (let k = 0; k < css.length; k++) {
    const c = css[k];
    if (c === '/' && css[k + 1] === '*') { const e = css.indexOf('*/', k + 2); k = e < 0 ? css.length : e + 1; continue; }
    if (c === '{') { const s = css.slice(selStart, k).replace(/\/\*[\s\S]*?\*\//g, '').trim(); stack.push({sel: s, start: selStart, open: k}); selStart = k + 1; continue; }
    if (c === '}') { const top = stack.pop(); if (!top) { selStart = k + 1; continue; } const atRule = top.sel.startsWith('@'); const inner = stack.some(x => /^@(keyframes|font-face)/.test(x.sel)); if (!atRule && !inner) out.push({sel: top.sel, body: css.slice(top.open + 1, k).trim(), start: top.start, end: k + 1, ctx: stack.map(x => x.sel).join(' / ')}); selStart = k + 1; continue; }
  }
  return out;
}
const tokens = sel => [...sel.replace(/:not\([^)]*\)|::?[\w-]+(\([^)]*\))?|\[[^\]]*\]/g, ' ').matchAll(/[.#]([A-Za-z_][\w-]*)/g)].map(m => m[1]);
const dead = (sel) => sel.split(',').every(part => { const t = tokens(part); return t.length && t.some(x => !known(x)); });
const report = {};
const seenRule = new Map();
for (const f of FILES) {
  const css = fs.readFileSync(path.join(APP, f), 'utf8'), rules = parse(css);
  const del = [];
  let nDead = 0, nDup = 0;
  for (const r of rules) {
    const key = `${r.ctx}|${r.sel.replace(/\s+/g, ' ')}|${r.body.replace(/\s+/g, ' ')}`;
    if (dead(r.sel)) { nDead++; del.push(r); (report.deadList ||= []).push(`${f}: ${r.sel.slice(0, 90)}`); continue; }
    if (seenRule.has(key)) { nDup++; del.push(r); continue; }
    seenRule.set(key, f);
  }
  report[f] = {rules: rules.length, dead: nDead, dup: nDup, important: (css.match(/!important/g) || []).length, bytes: css.length};
  if (WRITE && del.length) {
    let out = css; for (const r of del.sort((a, b) => b.start - a.start)) out = out.slice(0, r.start) + out.slice(r.end);
    out = out.replace(/@media[^{]*\{\s*\}/g, '').replace(/\n{3,}/g, '\n\n');
    fs.writeFileSync(path.join(APP, f), out);
  }
}
// 같은 선택자가 여러 파일에 있는 경우(덮어쓰기)
const bySel = new Map();
for (const f of FILES) for (const r of parse(fs.readFileSync(path.join(APP, f), 'utf8'))) { const k = `${r.ctx}|${r.sel.replace(/\s+/g, ' ')}`; (bySel.get(k) || bySel.set(k, new Set()).get(k)).add(f); }
report.crossFile = [...bySel.values()].filter(s => s.size > 1).length;
console.log(JSON.stringify({...report, deadList: (report.deadList || []).slice(0, 80)}, null, 1));
