// 5.0.6 밤샘 속도 측정: 폰 비슷한 조건(CPU 4배 느림 + 네트워크 지연)으로 첫 화면까지 무엇에 시간이 드는지.
// node tools/perf-probe.mjs [dist폴더=dist] [지연ms=150] [회수=3] [--warm]  → 요청 수·바이트·모듈 깊이·첫 화면 시각·긴 작업
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path'; import zlib from 'node:zlib'; import {spawn} from 'node:child_process'; import {fileURLToPath} from 'node:url'; import os from 'node:os';
import {connect} from '../qa-cdp.mjs';
const args = process.argv.slice(2), WARM = args.includes('--warm'), pos = args.filter(a => !a.startsWith('--'));
const LIVE = /^https?:/.test(pos[0] || ''), ROOT = LIVE ? '' : path.resolve(pos[0] || path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'dist')), RTT = Number(pos[1] || 150), RUNS = Number(pos[2] || 3);
const CHROME = [process.env.CHROME, 'C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'].filter(Boolean).find(p => fs.existsSync(p));
const wait = ms => new Promise(r => setTimeout(r, ms));
const MIME = {'.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.webmanifest': 'application/manifest+json', '.png': 'image/png', '.webp': 'image/webp', '.ttf': 'font/ttf', '.woff2': 'font/woff2', '.jpg': 'image/jpeg'};
// GitHub Pages처럼 gzip으로 보낸다
const server = http.createServer((req, res) => { let name = decodeURIComponent(new URL(req.url, 'http://x').pathname); if (name === '/') name = '/index.html'; const file = path.resolve(ROOT, '.' + name); if (!file.startsWith(ROOT) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.writeHead(404); res.end(); return; } const ext = path.extname(file), body = fs.readFileSync(file); const gz = /\.(js|css|json|html|svg|webmanifest)$/.test(ext); res.writeHead(200, {'content-type': MIME[ext] || 'application/octet-stream', ...(gz ? {'content-encoding': 'gzip'} : {}), 'cache-control': 'max-age=600'}); res.end(gz ? zlib.gzipSync(body) : body); });
await new Promise(r => server.listen(0, '127.0.0.1', r));
const debug = 9500 + Math.floor(Math.random() * 90), prof = fs.mkdtempSync(path.join(os.tmpdir(), 'mylogue-perf-'));
const chrome = spawn(CHROME, ['--headless=new', `--remote-debugging-port=${debug}`, `--user-data-dir=${prof}`, '--no-first-run', '--disable-gpu', 'about:blank'], {stdio: 'ignore'});
const out = [];
try {
  for (let i = 0; i < 40; i++) { try { await fetch(`http://127.0.0.1:${debug}/json/version`); break; } catch { await wait(250); } }
  const c = await connect(debug); await c.send('Page.enable'); await c.send('Network.enable'); await c.send('Runtime.enable');
  await c.send('Emulation.setDeviceMetricsOverride', {width: 412, height: 915, deviceScaleFactor: 2, mobile: true});
  await c.send('Emulation.setCPUThrottlingRate', {rate: 4});
  if (RTT > 0) await c.send('Network.emulateNetworkConditions', {offline: false, latency: RTT, downloadThroughput: 9 * 1024 * 1024 / 8, uploadThroughput: 1.5 * 1024 * 1024 / 8});
  const base = LIVE ? pos[0] : `http://127.0.0.1:${server.address().port}/`;
  // 처음 한 번: 둘러보기 끝낸 '돌아온 사용자'(랜딩 건너뜀 + 예시 없이 빈 기록)로 만든다
  await c.send('Page.navigate', {url: base}); await wait(4000);
  await c.run(`(()=>{localStorage.setItem('mylogue.landing.skip','1');return 1})()`);
  for (let run = 0; run < RUNS; run++) {
    if (!WARM) { await c.send('Network.clearBrowserCache'); await c.run(`(async()=>{for(const r of await navigator.serviceWorker?.getRegistrations?.()||[])await r.unregister();for(const k of await caches.keys())await caches.delete(k);return 1})()`); }
    const reqs = new Map(); let t0 = 0;
    const onMsg = ev => { const m = JSON.parse(ev.data); if (m.method === 'Network.requestWillBeSent') reqs.set(m.params.requestId, {url: m.params.request.url, t: m.params.timestamp}); if (m.method === 'Network.loadingFinished') { const r = reqs.get(m.params.requestId); if (r) { r.end = m.params.timestamp; r.bytes = m.params.encodedDataLength; } } };
    c.ws.addEventListener('message', onMsg);
    await c.send('Page.navigate', {url: base});
    const start = Date.now();
    let first = null;
    for (let i = 0; i < 400; i++) { await wait(50); const ok = await c.run(`!!document.querySelector('main, .landing, .ld-hero') && !document.querySelector('.boot-loading')`).catch(() => false); if (ok) { first = Date.now() - start; break; } }
    await wait(1500);
    c.ws.removeEventListener('message', onMsg);
    const perf = JSON.parse(await c.run(`JSON.stringify({dcl:performance.timing.domContentLoadedEventEnd-performance.timing.navigationStart,load:performance.timing.loadEventEnd-performance.timing.navigationStart})`));
    const list = [...reqs.values()].filter(r => r.end);
    const t00 = Math.min(...list.map(r => r.t));
    const byType = {}; for (const r of list) { const ext = (r.url.match(/\.(\w+)(\?|$)/) || [])[1] || 'other'; const host = new URL(r.url).host.includes('127.0.0.1') ? 'self' : new URL(r.url).host; const k = `${host}:${ext}`; byType[k] ||= {n: 0, kb: 0}; byType[k].n++; byType[k].kb += (r.bytes || 0) / 1024; }
    const slow = list.map(r => ({u: r.url.replace(base, '').slice(0, 70), ms: Math.round((r.end - r.t) * 1000), at: Math.round((r.t - t00) * 1000), kb: Math.round((r.bytes || 0) / 1024)})).sort((a, b) => b.at + b.ms - a.at - a.ms).slice(0, 12);
    out.push({run, firstScreenMs: first, ...perf, requests: list.length, kb: Math.round(list.reduce((a, r) => a + (r.bytes || 0), 0) / 1024), byType, lastFinished: slow});
    console.log(`run ${run}: 첫 화면 ${first}ms · 요청 ${list.length}개 · ${Math.round(list.reduce((a, r) => a + (r.bytes || 0), 0) / 1024)}KB · DCL ${perf.dcl} · load ${perf.load}`);
  }
} finally { chrome.kill(); server.close(); }
fs.writeFileSync(path.join(os.tmpdir(), 'mylogue-perf.json'), JSON.stringify(out, null, 1));
console.log(JSON.stringify(out.at(-1).byType)); console.log(out.at(-1).lastFinished.map(x => `${x.at}+${x.ms}ms ${x.kb}KB ${x.u}`).join('\n'));
