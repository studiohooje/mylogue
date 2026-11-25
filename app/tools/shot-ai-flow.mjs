// 4.28.x 'AI 기록' 대화창 흐름을 둘러보기(예시 답) 모드로 실제 캡처. 실행: npm run build && node tools/shot-ai-flow.mjs <저장 폴더> [사진 경로] [폭=412]
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import os from 'node:os';
import {connect} from '../qa-cdp.mjs';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'dist');
const OUT = path.resolve(process.argv[2] || os.tmpdir()), PHOTO = process.argv[3] || '', W = Number(process.argv[4] || 412), H = W < 650 ? 915 : 1000;
const CHROME = [process.env.CHROME, 'C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'].find(p => p && fs.existsSync(p));
const wait = ms => new Promise(r => setTimeout(r, ms));
const MIME = {'.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.webmanifest': 'application/manifest+json', '.png': 'image/png', '.ttf': 'font/ttf', '.wasm': 'application/wasm'};
const server = http.createServer((req, res) => { let name = decodeURIComponent(new URL(req.url, 'http://x').pathname); if (name === '/') name = '/index.html'; const file = path.resolve(ROOT, '.' + name); if (!file.startsWith(ROOT) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.writeHead(404); res.end(); return; } res.writeHead(200, {'content-type': MIME[path.extname(file)] || 'application/octet-stream'}); fs.createReadStream(file).pipe(res); });
await new Promise(r => server.listen(0, '127.0.0.1', r));
const port = server.address().port, debug = 9500 + Math.floor(Math.random() * 90), base = `http://127.0.0.1:${port}/`;
const prof = fs.mkdtempSync(path.join(os.tmpdir(), 'mylogue-ai-'));
const chrome = spawn(CHROME, ['--headless=new', `--remote-debugging-port=${debug}`, `--user-data-dir=${prof}`, '--no-first-run', '--disable-gpu', 'about:blank'], {stdio: 'ignore'});
let n = 0;
try {
 for (let i = 0; i < 40; i++) { try { await fetch(`http://127.0.0.1:${debug}/json/version`); break; } catch { await wait(250); } }
 const c = await connect(debug);
 await c.send('Page.enable'); await c.send('DOM.enable');
 await c.send('Emulation.setDeviceMetricsOverride', {width: W, height: H, deviceScaleFactor: 2, mobile: W < 650});
 const shot = async name => { await c.run(`(()=>{const s=document.querySelector('.sheet');if(s)s.scrollTop=s.scrollHeight;return 1})()`); await wait(300); const s = await c.send('Page.captureScreenshot', {format: 'jpeg', quality: 82}); fs.writeFileSync(path.join(OUT, `chat${W}-${String(++n).padStart(2, '0')}-${name}.jpg`), Buffer.from(s.data, 'base64')); };
 const run = js => c.run(`(()=>{${js};return 1})()`);
 const type = async v => { await run(`const t=document.getElementById('chat-text');t.value=${JSON.stringify(v)};t.dispatchEvent(new Event('input',{bubbles:true}))`); await wait(200); await run(`document.getElementById('chat-send').click()`); await wait(1800); };
 const photo = async () => { const {root} = await c.send('DOM.getDocument', {depth: -1}); const {nodeId} = await c.send('DOM.querySelector', {nodeId: root.nodeId, selector: '#chat-photo'}); if (nodeId && PHOTO) { await c.send('DOM.setFileInputFiles', {nodeId, files: [path.resolve(PHOTO)]}); await wait(1800); } };
 await c.send('Page.navigate', {url: base}); await wait(1200);
 await c.run(`localStorage.setItem('mylogue.landing.skip','1');sessionStorage.setItem('mylogue.demo','1');sessionStorage.setItem('mylogue.demo.persona','jihoon');true`);
 await c.send('Page.navigate', {url: base}); await wait(3000);
 await run(`document.querySelector('[data-modal="quick"]')?.click()`); await wait(800);
 await run(`document.querySelector('.sheet [data-modal="ai-chat"]')?.click()`); await wait(1200); await run(`document.querySelector('[data-ai-mode="chat"]')?.click()`); await wait(400); await run(`document.querySelector('[data-ai-always="chat"]')?.click()`); await wait(1000);
 await c.run(`(()=>{const s=document.querySelector('.sheet');if(s)s.scrollTop=0;return 1})()`); const s0 = await c.send('Page.captureScreenshot', {format: 'jpeg', quality: 82}); fs.writeFileSync(path.join(OUT, `chat${W}-${String(++n).padStart(2, '0')}-empty.jpg`), Buffer.from(s0.data, 'base64'));
 await type('점심에 제육덮밥 먹고 콜라 한 캔'); await shot('record');
 await type('아 콜라는 제로였어'); await shot('fix');
 await run(`[...document.querySelectorAll('[data-chat-save]')].at(-1)?.click()`); await wait(800); await shot('saved');
 await type('오늘 저녁 뭐 먹으면 좋을까?'); await shot('question');
 await photo(); await shot('photo-choose');
 await run(`document.querySelector('[data-chat-photo="ai"]')?.click()`); await wait(2000); await shot('photo-result');
 await run(`[...document.querySelectorAll('[data-chat-swap]')].at(-1)?.click()`); await wait(500);
 await run(`const i=document.getElementById('chat-swap-q');i.value='닭가슴살';i.dispatchEvent(new Event('input',{bubbles:true}))`); await wait(2500); await shot('swap');
 await run(`document.querySelector('[data-chat-pick="0"]')?.click()`); await wait(600); await shot('swapped');
 await run(`const t=document.getElementById('chat-text');t.value='아침 체중계';t.dispatchEvent(new Event('input',{bubbles:true}))`); await photo(); await run(`document.querySelector('[data-chat-photo="ai"]')?.click()`); await wait(2000); await shot('scale');
 const errs = await c.run(`(window.__e||[]).length`);
 console.log('saved', n, OUT, errs);
} finally { chrome.kill(); server.close(); }
process.exit(0);
