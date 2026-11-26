// 목업(mockups/<이름>) 확인용: 페이지 버튼을 하나씩 눌러 폰 화면 전체를 길게 찍는다.
// node tools/shot-mockup.mjs <목업 폴더> <출력 폴더> page1,page2,... [폭]
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import {spawn} from 'node:child_process';
import os from 'node:os';
import {connect} from '../qa-cdp.mjs';

const [dir, OUT, list = '', width = '1280'] = process.argv.slice(2);
const ROOT = path.resolve(dir);
fs.mkdirSync(OUT, {recursive: true});
const CHROME = [process.env.CHROME, 'C:/Program Files/Google/Chrome/Application/chrome.exe', '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'].filter(Boolean).find(p => fs.existsSync(p));
const wait = ms => new Promise(r => setTimeout(r, ms));
const MIME = {'.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.json': 'application/json', '.jpg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp'};
const server = http.createServer((req, res) => { let name = decodeURIComponent(new URL(req.url, 'http://x').pathname); if (name === '/') name = '/index.html'; const file = path.resolve(ROOT, '.' + name); if (!file.startsWith(ROOT) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.writeHead(404); res.end(); return; } res.writeHead(200, {'content-type': MIME[path.extname(file)] || 'application/octet-stream'}); fs.createReadStream(file).pipe(res); });
await new Promise(r => server.listen(0, '127.0.0.1', r));
const debug = 9900 + Math.floor(Math.random() * 90);
const prof = fs.mkdtempSync(path.join(os.tmpdir(), 'mylogue-mock-'));
const chrome = spawn(CHROME, ['--headless=new', `--remote-debugging-port=${debug}`, `--user-data-dir=${prof}`, '--no-first-run', '--disable-gpu', '--hide-scrollbars', 'about:blank'], {stdio: 'ignore'});
try {
  for (let i = 0; i < 40; i++) { try { await fetch(`http://127.0.0.1:${debug}/json/version`); break; } catch { await wait(250); } }
  const c = await connect(debug);
  await c.send('Page.enable');
  await c.send('Emulation.setDeviceMetricsOverride', {width: Number(width), height: 900, deviceScaleFactor: 1, mobile: Number(width) < 600});
  await c.send('Page.navigate', {url: `http://127.0.0.1:${server.address().port}/`}); await wait(2000);
  await c.run(`(()=>{window.__errs=[];addEventListener('error',e=>__errs.push(String(e.message)));return 1})()`);
  for (const page of list.split(',').filter(Boolean)) {
    const [pg, ...clicks] = page.split('+');
    await c.run(`(()=>{document.querySelector('[data-page="${pg}"]')?.click();return 1})()`); await wait(500);
    for (const sel of clicks) { await c.run(`(()=>{document.querySelector('${sel}')?.click();return 1})()`); await wait(300); }
    await c.run(`(()=>{const p=document.getElementById('phone');p.style.height='auto';const s=document.getElementById('scr');s.style.position='static';s.style.overflow='visible';return 1})()`); await wait(1200);
    const h = await c.run(`Math.ceil(document.documentElement.scrollHeight)`);
    const shot = await c.send('Page.captureScreenshot', {format: 'jpeg', quality: 80, captureBeyondViewport: true, clip: {x: 0, y: 0, width: Number(width), height: Math.min(h, 12000), scale: 1}});
    fs.writeFileSync(path.join(OUT, `${page.replace(/[^a-z0-9-]/gi, '_')}.jpg`), Buffer.from(shot.data, 'base64'));
    console.log(page, h);
  }
  const errs = await c.run(`JSON.stringify(window.__errs||[])`); console.log('errs', errs);
} finally { chrome.kill(); server.close(); }
