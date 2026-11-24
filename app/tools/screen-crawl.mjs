// 4.28.0 밤샘 E-5: 화면 순회 점검기. 둘러보기 예시 인물 8명 × 폭(360·412·860) × 일곱 탭을 열고
// ① 가로로 넘치는 요소(본문 폭보다 넓음) ② 화면 글자의 NaN·undefined·Infinity·[object ③ 콘솔 오류를 모은다.
// 실행: npm run build && node tools/screen-crawl.mjs → research_notes/night/E5/crawl.csv·report.md (캡처는 E5/shots)
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import os from 'node:os';
import {connect} from '../qa-cdp.mjs';
const APP = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'), ROOT = path.join(APP, 'dist'), OUT = path.resolve(APP, '..', 'research_notes', 'night', 'E5');
const CHROME = [process.env.CHROME, 'C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', '/usr/bin/google-chrome'].find(p => p && fs.existsSync(p));
const wait = ms => new Promise(r => setTimeout(r, ms));
const MIME = {'.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.webmanifest': 'application/manifest+json', '.png': 'image/png', '.ttf': 'font/ttf', '.wasm': 'application/wasm'};
const server = http.createServer((req, res) => { let name = decodeURIComponent(new URL(req.url, 'http://x').pathname); if (name === '/') name = '/index.html'; const file = path.resolve(ROOT, '.' + name); if (!file.startsWith(ROOT) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.writeHead(404); res.end(); return; } res.writeHead(200, {'content-type': MIME[path.extname(file)] || 'application/octet-stream'}); fs.createReadStream(file).pipe(res); });
await new Promise(r => server.listen(0, '127.0.0.1', r));
const port = server.address().port, debug = 9600 + Math.floor(Math.random() * 90), base = `http://127.0.0.1:${port}/`;
const prof = fs.mkdtempSync(path.join(os.tmpdir(), 'mylogue-crawl-'));
const chrome = spawn(CHROME, ['--headless=new', `--remote-debugging-port=${debug}`, `--user-data-dir=${prof}`, '--no-first-run', '--disable-gpu', 'about:blank'], {stdio: 'ignore'});
const PEOPLE = (process.env.PEOPLE || 'jihoon,seoyeon,minjun,haeun,doyoon,jimin,sua,hyunwoo').split(','), WIDTHS = [360, 412, 860], TABS = ['home', 'body', 'food', 'workout', 'analysis', 'calendar', 'settings'];
const PROBE = `(()=>{const vw=document.documentElement.clientWidth,over=[];for(const el of document.querySelectorAll('main *')){const r=el.getBoundingClientRect();const clipped=e=>{for(let p=e.parentElement;p&&p!==document.body;p=p.parentElement){const o=getComputedStyle(p).overflowX;if(o!=='visible')return true}return false};if(r.width>0&&r.right>vw+2&&getComputedStyle(el).position!=='fixed'&&!el.closest('svg')&&!clipped(el))over.push((el.className&&typeof el.className==='string'?el.className.split(' ')[0]:el.tagName)+':'+Math.round(r.right-vw))}const t=document.querySelector('main')?.innerText||'';const bad=(t.match(/NaN|undefined|Infinity|\\[object/g)||[]);const pageScroll=document.documentElement.scrollWidth>vw+2?'페이지 가로 스크롤 '+(document.documentElement.scrollWidth-vw)+'px':'';if(pageScroll)over.unshift(pageScroll);return {over:[...new Set(over)].slice(0,8),bad:bad.slice(0,5),len:t.length,err:(window.__crawlErr||[]).splice(0)}})()`;
const rows = [['인물', '폭', '탭', '본문 글자', '가로 넘침', '이상 글자', '콘솔 오류']];
fs.mkdirSync(path.join(OUT, 'shots'), {recursive: true});
try {
 for (let i = 0; i < 40; i++) { try { await fetch(`http://127.0.0.1:${debug}/json/version`); break; } catch { await wait(250); } }
 const c = await connect(debug);
 await c.send('Page.enable');
 await c.send('Page.addScriptToEvaluateOnNewDocument', {source: `window.__crawlErr=[];addEventListener('error',e=>__crawlErr.push(String(e.message||e.error)));addEventListener('unhandledrejection',e=>__crawlErr.push('reject: '+String(e.reason?.message||e.reason)));const _ce=console.error;console.error=(...a)=>{__crawlErr.push(a.map(String).join(' ').slice(0,200));_ce(...a)};`});
 for (const who of PEOPLE) {
  for (const w of WIDTHS) {
   await c.send('Emulation.setDeviceMetricsOverride', {width: w, height: w < 650 ? 900 : 1000, deviceScaleFactor: 1, mobile: w < 650});
   await c.send('Page.navigate', {url: base}); await wait(800);
   await c.run(`localStorage.setItem('mylogue.landing.skip','1');sessionStorage.setItem('mylogue.demo','1');sessionStorage.setItem('mylogue.demo.persona','${who}');true`);
   await c.send('Page.navigate', {url: base}); await wait(2500);
   for (const tab of TABS) {
    await c.run(`(()=>{document.querySelector('[data-page="${tab}"]')?.click();return 1})()`); await wait(700);
    const r = await c.run(PROBE);
    rows.push([who, w, tab, r.len, r.over.join(' '), r.bad.join(' '), r.err.join(' | ')]);
    if ((r.over.length || r.bad.length) && w !== 860) { const s = await c.send('Page.captureScreenshot', {format: 'png'}); fs.writeFileSync(path.join(OUT, 'shots', `${who}-${w}-${tab}.png`), Buffer.from(s.data, 'base64')); }
   }
  }
  console.log(who, '끝');
 }
} finally { chrome.kill(); server.close(); }
const csv = rows.map(r => r.map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');
fs.writeFileSync(path.join(OUT, 'crawl.csv'), '\ufeff' + csv);
const prob = rows.slice(1).filter(r => r[4] || r[5] || r[6]);
fs.writeFileSync(path.join(OUT, 'report.md'), `# 화면 순회 점검 (밤샘 E-5)\n\n- 인물 ${PEOPLE.length} × 폭 ${WIDTHS.join('·')} × 탭 ${TABS.length} = ${rows.length - 1}화면\n- 문제 있는 화면 ${prob.length}\n\n| 인물 | 폭 | 탭 | 가로 넘침(요소:넘친 px) | 이상 글자 | 콘솔 오류 |\n|---|---|---|---|---|---|\n${prob.map(r => `| ${r[0]} | ${r[1]} | ${r[2]} | ${r[4]} | ${r[5]} | ${String(r[6]).slice(0, 160)} |`).join('\n')}\n`);
console.log('화면', rows.length - 1, '· 문제', prob.length);
process.exit(0);
