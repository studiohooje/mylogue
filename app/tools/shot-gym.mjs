// 4.28.0 운동 기록 안 '헬스장 새로 추가' 화면 캡처(412·860 폭). 실행: npm run build && node tools/shot-gym.mjs <저장 폴더>
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import os from 'node:os';
import {connect} from '../qa-cdp.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'dist');
const OUT = path.resolve(process.argv[2] || os.tmpdir());
const CHROME = [process.env.CHROME, 'C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'].find(p => p && fs.existsSync(p));
const wait = ms => new Promise(r => setTimeout(r, ms));
const MIME = {'.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.webmanifest': 'application/manifest+json', '.png': 'image/png', '.ttf': 'font/ttf', '.wasm': 'application/wasm'};
const server = http.createServer((req, res) => { let name = decodeURIComponent(new URL(req.url, 'http://x').pathname); if (name === '/') name = '/index.html'; const file = path.resolve(ROOT, '.' + name); if (!file.startsWith(ROOT) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.writeHead(404); res.end(); return; } res.writeHead(200, {'content-type': MIME[path.extname(file)] || 'application/octet-stream'}); fs.createReadStream(file).pipe(res); });
await new Promise(r => server.listen(0, '127.0.0.1', r));
const port = server.address().port, debug = 9700 + Math.floor(Math.random() * 90);
const prof = fs.mkdtempSync(path.join(os.tmpdir(), 'mylogue-shot-'));
const chrome = spawn(CHROME, ['--headless=new', `--remote-debugging-port=${debug}`, `--user-data-dir=${prof}`, '--no-first-run', '--disable-gpu', 'about:blank'], {stdio: 'ignore'});
const base = `http://127.0.0.1:${port}/`;
try {
 for (let i = 0; i < 40; i++) { try { await fetch(`http://127.0.0.1:${debug}/json/version`); break; } catch { await wait(250); } }
 const c = await connect(debug);
 await c.send('Page.enable');
 for (const [w, h] of [[412, 915], [860, 1000]]) {
  await c.send('Emulation.setDeviceMetricsOverride', {width: w, height: h, deviceScaleFactor: 1, mobile: w < 650});
  await c.send('Page.navigate', {url: base}); await wait(1500);
  await c.run(`localStorage.setItem('mylogue.landing.skip','1');true`);
  await c.send('Page.navigate', {url: base}); await wait(2500);
  await c.run(`(()=>{const b=[...document.querySelectorAll('button')].find(x=>/둘러보기/.test(x.innerText));b?.click();return 1})()`); await wait(2500);
  await c.run(`(()=>{let b=document.querySelector('[data-modal="workout"]');if(!b){document.querySelector('[data-modal="quick"]')?.click();b=document.querySelector('.sheet [data-modal="workout"]')}b?.click();return 1})()`); await wait(900);
  await c.run(`(()=>{document.querySelector('[data-q-live]')?.click();return 1})()`); await wait(700);
  await c.run(`(()=>{const b=document.getElementById('q-gym-add-open');if(b){b.click();return 1}const s=document.querySelector('select[data-q-work="gymName"]');if(s){s.value='__new__';s.dispatchEvent(new Event('change',{bubbles:true}))}return 2})()`); await wait(700);
  const shot = await c.send('Page.captureScreenshot', {format: 'png'});
  fs.writeFileSync(path.join(OUT, `gym-add-${w}.png`), Buffer.from(shot.data, 'base64'));
 }
 console.log('saved', OUT);
} finally { chrome.kill(); server.close(); }
process.exit(0);
