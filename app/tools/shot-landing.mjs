// 4.27.0 랜딩·부팅 화면 캡처(4.29.0부터 360·412·860·1280 폭, 페이지 전체). 실행: npm run build && node tools/shot-landing.mjs <저장 폴더>
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
const port = server.address().port, debug = 9800 + Math.floor(Math.random() * 100);
const prof = fs.mkdtempSync(path.join(os.tmpdir(), 'mylogue-shot-'));
const chrome = spawn(CHROME, ['--headless=new', `--remote-debugging-port=${debug}`, `--user-data-dir=${prof}`, '--no-first-run', '--disable-gpu', 'about:blank'], {stdio: 'ignore'});
try {
 for (let i = 0; i < 40; i++) { try { await fetch(`http://127.0.0.1:${debug}/json/version`); break; } catch { await wait(250); } }
 const c = await connect(debug);
 await c.send('Page.enable');
 for (const [w, h] of [[360, 740], [412, 915], [860, 1000], [1280, 800]]) {
  await c.send('Emulation.setDeviceMetricsOverride', {width: w, height: h, deviceScaleFactor: 1, mobile: w < 650});
  await c.send('Page.navigate', {url: `http://127.0.0.1:${port}/`}); await wait(3500);
  const full = await c.run(`Math.ceil(document.documentElement.scrollHeight)`);
  await c.send('Emulation.setDeviceMetricsOverride', {width: w, height: Math.min(full, 9000), deviceScaleFactor: 1, mobile: w < 650}); await wait(600);
  const shot = await c.send('Page.captureScreenshot', {format: 'png'});
  fs.writeFileSync(path.join(OUT, `landing-${w}.png`), Buffer.from(shot.data, 'base64'));
 }
 // 부팅 문구(앱 스크립트가 돌기 전 정적 화면)
 await c.send('Emulation.setDeviceMetricsOverride', {width: 412, height: 915, deviceScaleFactor: 1, mobile: true});
 await c.send('Page.navigate', {url: `http://127.0.0.1:${port}/index.html?boot`}); await wait(600);
 await c.run(`document.getElementById('app').innerHTML=${JSON.stringify(fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8').match(/<div id="app">([\s\S]*?)<\/div><script/)[1])};true`);
 const s2 = await c.send('Page.captureScreenshot', {format: 'png'});
 fs.writeFileSync(path.join(OUT, 'boot-412.png'), Buffer.from(s2.data, 'base64'));
 console.log('saved', OUT);
} finally { chrome.kill(); server.close(); }
process.exit(0);
