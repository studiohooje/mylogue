// 둘러보기(예시 기록)로 페이지를 통째로 찍는다: node tools/shot-pages.mjs <출력> page1,page2[+selector클릭] [폭]
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path'; import {spawn} from 'node:child_process'; import {fileURLToPath} from 'node:url'; import os from 'node:os';
import {connect} from '../qa-cdp.mjs';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'dist');
const [OUT, list = 'home', width = '412'] = process.argv.slice(2); fs.mkdirSync(OUT, {recursive: true});
const CHROME = [process.env.CHROME, 'C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'].filter(Boolean).find(p => fs.existsSync(p));
const wait = ms => new Promise(r => setTimeout(r, ms));
const MIME = {'.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.webmanifest': 'application/manifest+json', '.png': 'image/png', '.webp': 'image/webp', '.ttf': 'font/ttf', '.jpg': 'image/jpeg', '.woff2': 'font/woff2'};
const server = http.createServer((req, res) => { let name = decodeURIComponent(new URL(req.url, 'http://x').pathname); if (name === '/') name = '/index.html'; const file = path.resolve(ROOT, '.' + name); if (!file.startsWith(ROOT) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.writeHead(404); res.end(); return; } res.writeHead(200, {'content-type': MIME[path.extname(file)] || 'application/octet-stream'}); fs.createReadStream(file).pipe(res); });
await new Promise(r => server.listen(0, '127.0.0.1', r));
const port = server.address().port, debug = 9700 + Math.floor(Math.random() * 90), prof = fs.mkdtempSync(path.join(os.tmpdir(), 'mylogue-pg-'));
const chrome = spawn(CHROME, ['--headless=new', `--remote-debugging-port=${debug}`, `--user-data-dir=${prof}`, '--no-first-run', '--disable-gpu', '--hide-scrollbars', 'about:blank'], {stdio: 'ignore'});
try {
  for (let i = 0; i < 40; i++) { try { await fetch(`http://127.0.0.1:${debug}/json/version`); break; } catch { await wait(250); } }
  const c = await connect(debug); await c.send('Page.enable'); await c.send('Runtime.enable');
  const errs = []; c.ws?.addEventListener?.('message', ev => { try { const m = JSON.parse(ev.data); if (m.method === 'Runtime.exceptionThrown') errs.push(m.params.exceptionDetails?.exception?.description?.split('\n')[0]); if (m.method === 'Runtime.consoleAPICalled' && m.params.type === 'error') errs.push(m.params.args.map(a => a.value ?? a.description).join(' ').slice(0, 200)); } catch {} });
  await c.send('Emulation.setDeviceMetricsOverride', {width: Number(width), height: 900, deviceScaleFactor: 1, mobile: Number(width) < 650});
  const base = `http://127.0.0.1:${port}/`;
  await c.send('Page.navigate', {url: base}); await wait(1500); await c.run(`(()=>{localStorage.clear();return 1})()`);
  await c.send('Page.navigate', {url: base}); await wait(2500);
  await c.run(`(()=>{document.getElementById('landing-demo')?.click();return 1})()`); await wait(4000);
  if (process.env.SIMPLE) { await c.run(`(()=>{localStorage.setItem('mylogue.simpleDraft','1');return 1})()`); }
  if (process.env.LIGHT) { await c.run(`(()=>{localStorage.setItem('mylogue.theme','light');document.documentElement.dataset.theme='light';return 1})()`); await wait(300); }
  for (const item of list.split(',')) {
    const [page, ...clicks] = item.split('+');
    await c.run(`(async()=>{const m=await import('/app-state.js');m.$s.modal=null;m.$s.page='${page}';m.$f.render();scrollTo(0,0);return 1})()`); await wait(1200);
    for (const sel of clicks) { await c.run(`(()=>{document.querySelector(${JSON.stringify(sel)})?.click();return 1})()`); await wait(700); }
    const modal = await c.run(`!!document.querySelector(".modal-backdrop")`); if (modal) await c.run(`(()=>{const s=document.querySelector(".modal-backdrop .sheet");if(s){s.style.maxHeight="none";s.style.height="auto";s.style.overflow="visible";const b=document.querySelector(".modal-backdrop");b.style.position="absolute";b.style.overflow="visible";b.style.height="auto"}return 1})()`);
    const h = modal ? await c.run(`Math.ceil(Math.max(document.documentElement.scrollHeight, document.querySelector(".modal-backdrop").scrollHeight))`) : await c.run(`Math.ceil(document.documentElement.scrollHeight)`);
    const shot = await c.send('Page.captureScreenshot', {format: 'jpeg', quality: 78, captureBeyondViewport: true, clip: {x: 0, y: 0, width: Number(width), height: Math.min(h, 16000), scale: 1}});
    fs.writeFileSync(path.join(OUT, `${item.replace(/[^a-z0-9-]/gi, '_')}-${width}.jpg`), Buffer.from(shot.data, 'base64'));
    console.log(item, h);
  }
  console.log('errors', JSON.stringify(errs));
} finally { chrome.kill(); server.close(); }
