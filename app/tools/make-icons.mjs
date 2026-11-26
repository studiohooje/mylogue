// 4.29.0 아이콘·링크 미리보기 그림 만들기(대표님 2026-11-25: 헤일로 + Mylogue + 한 줄 소개 디자인을 카톡 미리보기·아이콘에).
// icon.svg(원본) → icon-192/512.png, apple-touch-icon.png(180), 안드로이드 런처(일반·둥근·적응형 앞그림),
// og-image.png(1200×630, 카카오톡·문자·SNS 링크 미리보기). 헤드리스 크롬으로 그린다.
// 실행: node tools/make-icons.mjs
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import os from 'node:os';
import {connect} from '../qa-cdp.mjs';
const APP = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const RES = path.join(APP, 'android', 'app', 'src', 'main', 'res');
const CHROME = [process.env.CHROME, 'C:/Program Files/Google/Chrome/Application/chrome.exe', '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'].find(p => p && fs.existsSync(p));
const wait = ms => new Promise(r => setTimeout(r, ms));
const MIME = {'.html': 'text/html; charset=utf-8', '.svg': 'image/svg+xml', '.ttf': 'font/ttf'};
const pages = {};
const server = http.createServer((req, res) => {
 const name = decodeURIComponent(new URL(req.url, 'http://x').pathname);
 if (pages[name]) { res.writeHead(200, {'content-type': MIME['.html']}); res.end(pages[name]); return; }
 const file = path.resolve(APP, '.' + name);
 if (!file.startsWith(APP) || !fs.existsSync(file)) { res.writeHead(404); res.end(); return; }
 res.writeHead(200, {'content-type': MIME[path.extname(file)] || 'application/octet-stream'}); fs.createReadStream(file).pipe(res);
});
await new Promise(r => server.listen(0, '127.0.0.1', r));
const port = server.address().port, debug = 9700 + Math.floor(Math.random() * 90);
const prof = fs.mkdtempSync(path.join(os.tmpdir(), 'mylogue-icons-'));
const chrome = spawn(CHROME, ['--headless=new', `--remote-debugging-port=${debug}`, `--user-data-dir=${prof}`, '--no-first-run', '--disable-gpu', '--hide-scrollbars', 'about:blank'], {stdio: 'ignore'});

const svg = fs.readFileSync(path.join(APP, 'icon.svg'), 'utf8');
// 적응형 아이콘 앞그림: 배경(#101625)은 안드로이드가 깔아 주므로 판을 빼고, 108dp 중 가운데 66%(안전 영역) 안에 들게 줄인다
const fg = svg.replace(/<rect[^>]*\/>/, '').replace(/<svg ([^>]*)viewBox="0 0 512 512"/, '<svg $1viewBox="-64 -64 640 640"');
// 둥근 아이콘: 판을 원으로
const round = svg.replace(/<rect width="512" height="512" rx="112"/, '<circle cx="256" cy="256" r="256"').replace(/(<circle cx="256" cy="256" r="256"[^>]*)\/>/, '$1/>');
const page = (inner, w, h, bg = 'transparent') => `<!doctype html><meta charset="utf-8"><style>html,body{margin:0;width:${w}px;height:${h}px;background:${bg};overflow:hidden}svg{display:block;width:${w}px;height:${h}px}</style>${inner}`;
const og = `<!doctype html><meta charset="utf-8"><style>
@font-face{font-family:S;src:url('/fonts/SUIT-Regular.ttf');font-weight:400}@font-face{font-family:S;src:url('/fonts/SUIT-SemiBold.ttf');font-weight:600}@font-face{font-family:S;src:url('/fonts/SUIT-Bold.ttf');font-weight:700}
html,body{margin:0;width:1200px;height:630px;overflow:hidden;background:#0b1020;font-family:S,sans-serif;color:#edf4f8}
.sky{position:absolute;inset:0;background:radial-gradient(42% 52% at 30% 34%,rgba(140,228,224,.24),transparent 70%),radial-gradient(40% 50% at 72% 30%,rgba(180,140,255,.26),transparent 70%),radial-gradient(40% 36% at 50% 92%,rgba(242,180,155,.12),transparent 70%)}
.wrap{position:relative;height:100%;display:flex;flex-direction:column;align-items:center;justify-content:center}
svg{width:330px;height:216px}
.word{font-size:112px;font-weight:700;letter-spacing:-.04em;line-height:1;margin-top:6px}
.word b{background:linear-gradient(100deg,#8ce4e0,#b48cff);-webkit-background-clip:text;background-clip:text;color:transparent}
.what{font-size:34px;font-weight:600;color:#dfe7f2;margin-top:26px;letter-spacing:-.01em}
</style><div class="sky"></div><div class="wrap"><svg viewBox="0 0 320 210"><defs><linearGradient id="g" x1="0" x2="1"><stop offset="0" stop-color="#f2b49b"/><stop offset=".5" stop-color="#8ce4e0"/><stop offset="1" stop-color="#b48cff"/></linearGradient></defs><path d="M40 150 A120 120 0 0 1 280 150" fill="none" stroke="rgba(255,255,255,.08)" stroke-width="10" stroke-linecap="round"/><path d="M40 150 A120 120 0 0 1 280 150" fill="none" stroke="url(#g)" stroke-width="10" stroke-linecap="round"/><circle cx="110" cy="188" r="12" fill="#f2b49b"/><circle cx="160" cy="188" r="12" fill="#8ce4e0"/><circle cx="210" cy="188" r="12" fill="#b8aaf2"/></svg><div class="word">My<b>log</b>ue</div><div class="what">체중·식단·운동을 한 줄로 남기는 건강 기록 앱</div></div>`;

const jobs = [
 ['icon-192.png', page(svg, 192, 192), 192, 192],
 ['icon-512.png', page(svg, 512, 512), 512, 512],
 ['apple-touch-icon.png', page(svg.replace(/rx="112"/, 'rx="0"'), 180, 180), 180, 180], // iOS가 모서리를 직접 깎는다
 ['og-image.png', og, 1200, 630],
];
for (const [dir, s] of [['mdpi', 48], ['hdpi', 72], ['xhdpi', 96], ['xxhdpi', 144], ['xxxhdpi', 192]]) {
 jobs.push([path.join(RES, `mipmap-${dir}`, 'ic_launcher.png'), page(svg, s, s), s, s]);
 jobs.push([path.join(RES, `mipmap-${dir}`, 'ic_launcher_round.png'), page(round, s, s), s, s]);
 const f = Math.round(s * 108 / 48);
 jobs.push([path.join(RES, `mipmap-${dir}`, 'ic_launcher_foreground.png'), page(fg, f, f), f, f]);
}
try {
 for (let i = 0; i < 40; i++) { try { await fetch(`http://127.0.0.1:${debug}/json/version`); break; } catch { await wait(250); } }
 const c = await connect(debug);
 await c.send('Page.enable');
 let k = 0;
 for (const [out, html, w, h] of jobs) {
  const name = `/job${k++}.html`; pages[name] = html;
  await c.send('Emulation.setDeviceMetricsOverride', {width: w, height: h, deviceScaleFactor: 1, mobile: false});
  await c.send('Emulation.setDefaultBackgroundColorOverride', {color: {r: 0, g: 0, b: 0, a: 0}});
  await c.send('Page.navigate', {url: `http://127.0.0.1:${port}${name}`}); await wait(name === '/job3.html' || out.endsWith('og-image.png') ? 1500 : 400);
  const s = await c.send('Page.captureScreenshot', {format: 'png', clip: {x: 0, y: 0, width: w, height: h, scale: 1}});
  const file = path.isAbsolute(out) ? out : path.join(APP, out);
  fs.writeFileSync(file, Buffer.from(s.data, 'base64'));
 }
 console.log('만든 그림', jobs.length);
} finally { chrome.kill(); server.close(); }
process.exit(0);
