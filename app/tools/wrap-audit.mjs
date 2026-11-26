// 4.29.0 줄바꿈 점검기(대표님 2026-11-25 "문맥이 뚝뚝 끊기는 설명"): 둘러보기로 일곱 탭과 주요 창을 360·412·860·1280 폭에서 열고,
// 두 줄 이상으로 그려진 글 묶음마다 '실제로 어디서 줄이 바뀌었는지'를 줄 단위로 뽑는다.
// 의심 표시: ① 마지막 줄이 4글자 이하(외톨이) ② 문장 중간에서 바뀌었는데 다음 줄이 1~3글자로 끝나는 짧은 조각 ③ 한 줄에 문장 끝(요./다.)이 있고 다음 문장 첫 낱말만 붙은 줄.
// 실행: npm run build && node tools/wrap-audit.mjs <저장 폴더>  → wrap-<폭>.txt(전체)·wrap-flags.txt(의심만)
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import os from 'node:os';
import {connect} from '../qa-cdp.mjs';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'dist');
const OUT = path.resolve(process.argv[2] || os.tmpdir());
const CHROME = [process.env.CHROME, 'C:/Program Files/Google/Chrome/Application/chrome.exe', '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'].find(p => p && fs.existsSync(p));
const wait = ms => new Promise(r => setTimeout(r, ms));
const MIME = {'.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.webmanifest': 'application/manifest+json', '.png': 'image/png', '.ttf': 'font/ttf', '.wasm': 'application/wasm'};
const server = http.createServer((req, res) => { let name = decodeURIComponent(new URL(req.url, 'http://x').pathname); if (name === '/') name = '/index.html'; const file = path.resolve(ROOT, '.' + name); if (!file.startsWith(ROOT) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.writeHead(404); res.end(); return; } res.writeHead(200, {'content-type': MIME[path.extname(file)] || 'application/octet-stream'}); fs.createReadStream(file).pipe(res); });
await new Promise(r => server.listen(0, '127.0.0.1', r));
const port = server.address().port, debug = 9600 + Math.floor(Math.random() * 90), base = `http://127.0.0.1:${port}/`;
const prof = fs.mkdtempSync(path.join(os.tmpdir(), 'mylogue-wrap-'));
const chrome = spawn(CHROME, ['--headless=new', `--remote-debugging-port=${debug}`, `--user-data-dir=${prof}`, '--no-first-run', '--disable-gpu', 'about:blank'], {stdio: 'ignore'});
// 페이지 안에서: 글이 직접 들어 있는 블록마다 글자 위치로 줄을 나눈다
const PROBE = `(()=>{
 const out=[],seen=new Set();
 const blocks=[...document.querySelectorAll('p,li,small,h1,h2,h3,h4,b,span,label,div,button,summary,dd,td')].filter(el=>{
  if(!el.offsetParent&&getComputedStyle(el).position!=='fixed')return false;
  const own=[...el.childNodes].some(n=>n.nodeType===3&&n.textContent.trim().length>1);if(!own)return false;
  const cs=getComputedStyle(el);return cs.display!=='inline'||el.tagName==='SPAN'&&cs.display==='inline'&&!el.closest('p,li,small,h1,h2,h3,h4,button,label,summary');
 });
 for(const el of blocks){
  let host=el;while(host&&getComputedStyle(host).display==='inline')host=host.parentElement;
  if(!host||seen.has(host))continue;seen.add(host);
  const w=document.createTreeWalker(host,NodeFilter.SHOW_TEXT);const lines=[];let lastTop=null,cur='';
  for(let n=w.nextNode();n;n=w.nextNode()){
   if(!n.textContent.trim()&&!cur)continue;
   const t=n.textContent;
   for(let i=0;i<t.length;i++){
    const r=document.createRange();r.setStart(n,i);r.setEnd(n,i+1);const b=r.getClientRects()[0];
    if(!b){cur+=t[i];continue}
    const top=Math.round(b.top);
    if(lastTop!==null&&top-lastTop>b.height*0.6){lines.push(cur.trim());cur=''}
    lastTop=top;cur+=t[i];
   }
  }
  if(cur.trim())lines.push(cur.trim());
  if(lines.length>=2)out.push({cls:(host.className&&typeof host.className==='string'?host.className.split(' ')[0]:host.tagName.toLowerCase()),align:getComputedStyle(host).textAlign,lines});
 }
 return JSON.stringify(out);
})()`;
const flag = lines => {
 const f = [], last = lines.at(-1).replace(/\s/g, '');
 if (last.length <= 4 && !/^[\d.,~·()%kcalgkm]+$/i.test(last)) f.push('외톨이 끝줄');
 for (let i = 0; i < lines.length - 1; i++) {
  const a = lines[i], b = lines[i + 1];
  if (/[.?!]$|요$|다$|[,·:]$|—$/.test(a)) continue; // 문장·구 끝에서 바뀜
  if (/(요|다)\.\s+\S{1,4}$/.test(a)) f.push(`다음 문장 첫 낱말만 붙음: "${a.slice(-12)}"`);
 }
 return f;
};
const flagged = [];
try {
 for (let i = 0; i < 40; i++) { try { await fetch(`http://127.0.0.1:${debug}/json/version`); break; } catch { await wait(250); } }
 const c = await connect(debug);
 await c.send('Page.enable');
 for (const [W, H] of [[360, 740], [412, 915], [860, 1000], [1280, 800]]) {
  await c.send('Emulation.setDeviceMetricsOverride', {width: W, height: H, deviceScaleFactor: 1, mobile: W < 650});
  const rows = [];
  // 랜딩(로그인 전)
  await c.send('Page.navigate', {url: base}); await wait(800);
  await c.run(`localStorage.clear();sessionStorage.clear();true`);
  await c.send('Page.navigate', {url: base}); await wait(3200);
  rows.push(['랜딩', JSON.parse(await c.run(PROBE))]);
  for (const page of ['story.html', 'privacy.html', 'terms.html']) { await c.send('Page.navigate', {url: base + page}); await wait(1200); rows.push([page, JSON.parse(await c.run(PROBE))]); }
  // 둘러보기
  await c.send('Page.navigate', {url: base}); await wait(600);
  await c.run(`localStorage.setItem('mylogue.landing.skip','1');sessionStorage.setItem('mylogue.demo','1');sessionStorage.setItem('mylogue.demo.persona','jihoon');true`);
  await c.send('Page.navigate', {url: base}); await wait(3000);
  for (const tab of ['home', 'body', 'food', 'workout', 'analysis', 'calendar', 'settings']) {
   await c.run(`(()=>{document.querySelector('.sheet .close')?.click();document.querySelector('[data-page="${tab}"]')?.click();scrollTo(0,0);return 1})()`); await wait(900);
   rows.push([tab, JSON.parse(await c.run(PROBE))]);
  }
  for (const m of ['quick', 'meal', 'workout', 'body', 'ai-chat']) {
   await c.run(`(()=>{document.querySelector('.sheet .close')?.click();document.querySelector('[data-page="home"]')?.click();return 1})()`); await wait(500);
   await c.run(`(()=>{let b=document.querySelector('[data-modal="${m}"]');if(!b&&'${m}'!=='quick'){document.querySelector('[data-modal="quick"]')?.click();b=document.querySelector('.sheet [data-modal="${m}"]')}b?.click();return 1})()`); await wait(900);
   rows.push([`창 ${m}`, JSON.parse(await c.run(PROBE))]);
  }
  let txt = '';
  for (const [where, list] of rows) for (const b of list) {
   const fl = flag(b.lines);
   txt += `[${where}] .${b.cls} (${b.align})${fl.length ? '  ⚠ ' + fl.join(', ') : ''}\n${b.lines.map(l => '  | ' + l).join('\n')}\n`;
   if (fl.length) flagged.push(`${W} [${where}] .${b.cls}: ${fl.join(', ')}\n${b.lines.map(l => '  | ' + l).join('\n')}`);
  }
  fs.writeFileSync(path.join(OUT, `wrap-${W}.txt`), txt);
 }
 fs.writeFileSync(path.join(OUT, 'wrap-flags.txt'), flagged.join('\n'));
 console.log('saved', OUT, '의심', flagged.length);
} finally { chrome.kill(); server.close(); }
process.exit(0);
