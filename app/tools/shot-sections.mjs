// 목업용: 둘러보기(예시 기록)로 수치·식단·운동·분석 화면을 열어 main 안의 칸을 하나씩 캡처한다(실제 화면 그대로).
// 실행: npm run build && node tools/shot-sections.mjs <저장 폴더>
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import os from 'node:os';
import {connect} from '../qa-cdp.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'dist');
const OUT = path.resolve(process.argv[2] || 'shots');
fs.mkdirSync(OUT, {recursive: true});
const CHROME = [process.env.CHROME, 'C:/Program Files/Google/Chrome/Application/chrome.exe', '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'].filter(Boolean).find(p => fs.existsSync(p));
const wait = ms => new Promise(r => setTimeout(r, ms));
const MIME = {'.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.webmanifest': 'application/manifest+json', '.png': 'image/png', '.webp': 'image/webp', '.ttf': 'font/ttf', '.jpg': 'image/jpeg'};
const server = http.createServer((req, res) => { let name = decodeURIComponent(new URL(req.url, 'http://x').pathname); if (name === '/') name = '/index.html'; const file = path.resolve(ROOT, '.' + name); if (!file.startsWith(ROOT) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.writeHead(404); res.end(); return; } res.writeHead(200, {'content-type': MIME[path.extname(file)] || 'application/octet-stream'}); fs.createReadStream(file).pipe(res); });
await new Promise(r => server.listen(0, '127.0.0.1', r));
const port = server.address().port, debug = 9800 + Math.floor(Math.random() * 100);
const prof = fs.mkdtempSync(path.join(os.tmpdir(), 'mylogue-shot-'));
const chrome = spawn(CHROME, ['--headless=new', `--remote-debugging-port=${debug}`, `--user-data-dir=${prof}`, '--no-first-run', '--disable-gpu', '--hide-scrollbars', 'about:blank'], {stdio: 'ignore'});
const manifest = {};
try {
  for (let i = 0; i < 40; i++) { try { await fetch(`http://127.0.0.1:${debug}/json/version`); break; } catch { await wait(250); } }
  const c = await connect(debug);
  await c.send('Page.enable');
  await c.send('Emulation.setDeviceMetricsOverride', {width: 412, height: 915, deviceScaleFactor: 2, mobile: true});
  const base = `http://127.0.0.1:${port}/`;
  await c.send('Page.navigate', {url: base}); await wait(1500);
  await c.run(`(()=>{localStorage.clear();return 1})()`);
  await c.send('Page.navigate', {url: base}); await wait(2500);
  const started = await c.run(`(()=>{const b=document.getElementById('landing-demo');b?.click();return !!b})()`); await wait(4000);
  console.log('둘러보기', started, await c.run(`(async()=>{const m=await import('/app-state.js');return !!m.$s.DEMO})()`));
  for (const page of ['body', 'food', 'workout', 'analysis']) {
    await c.run(`(async()=>{const m=await import('/app-state.js');m.$s.page='${page}';m.$f.render();return 1})()`); await wait(1500);
    await c.run(`(()=>{for(const e of document.querySelectorAll('body *')){const p=getComputedStyle(e).position;if(p==='fixed'||p==='sticky')e.style.visibility='hidden'}return 1})()`);
    const n = await c.run(`document.querySelector('main').children.length`);
    manifest[page] = [];
    for (let i = 0; i < n; i++) {
      const info = JSON.parse(await c.run(`(()=>{const e=document.querySelector('main').children[${i}];e.scrollIntoView({block:'start'});const r=e.getBoundingClientRect();const h=(e.querySelector('h2,h3,summary,b')?.innerText||'').split('\\n')[0].slice(0,40);return JSON.stringify({x:r.left+scrollX,y:r.top+scrollY,w:r.width,h:r.height,cls:String(e.className||''),title:h})})()`));
      if (info.h < 8) continue;
      await wait(250);
      const shot = await c.send('Page.captureScreenshot', {format: 'jpeg', quality: 82, captureBeyondViewport: true, clip: {x: 0, y: Math.max(0, info.y - 6), width: 412, height: Math.min(info.h + 12, 6000), scale: 1}});
      const file = `${page}-${String(i).padStart(2, '0')}.jpg`;
      fs.writeFileSync(path.join(OUT, file), Buffer.from(shot.data, 'base64'));
      manifest[page].push({i, file, h: Math.round(info.h), cls: info.cls, title: info.title});
    }
    // 하단 메뉴(고정)도 한 장
  }
  // 분석 리포트 안의 카드와, 인사이트(버튼을 눌러 받은 상태)를 따로
  await c.run(`(async()=>{const m=await import('/app-state.js');m.$s.page='analysis';m.$f.render();return 1})()`); await wait(800);
  await c.run(`(()=>{document.querySelector('[data-insight-run]')?.click();return 1})()`); await wait(1500);
  await c.run(`(()=>{for(const e of document.querySelectorAll('body *')){const p=getComputedStyle(e).position;if(p==='fixed'||p==='sticky')e.style.visibility='hidden'}return 1})()`);
  manifest.extra = [];
  const sels = ['.coach-live', ...Array.from({length: 8}, (_, k) => `main .ar > :nth-child(${k + 1})`)];
  for (const [k, sel] of sels.entries()) {
    const info = JSON.parse(await c.run(`(()=>{const e=document.querySelector(${JSON.stringify(sel)});if(!e)return 'null';e.scrollIntoView({block:'start'});const r=e.getBoundingClientRect();return JSON.stringify({y:r.top+scrollY,h:r.height,title:(e.querySelector('h2,h3,h4,b')?.innerText||'').split(String.fromCharCode(10))[0].slice(0,40)})})()`));
    if (!info) continue; await wait(250);
    const shot = await c.send('Page.captureScreenshot', {format: 'jpeg', quality: 82, captureBeyondViewport: true, clip: {x: 0, y: Math.max(0, info.y - 6), width: 412, height: info.h + 12, scale: 1}});
    const file = `extra-${String(k).padStart(2, '0')}.jpg`; fs.writeFileSync(path.join(OUT, file), Buffer.from(shot.data, 'base64'));
    manifest.extra.push({i: k, file, h: Math.round(info.h), title: info.title, sel});
  }
  // 입력 창(체중·인바디 / 식단 / 운동): 창을 페이지 흐름으로 펼쳐서 안의 칸을 하나씩
  for (const [key, modal, steps] of [['in-body', 'body', []], ['in-meal', 'meal', ['방금 먹은 것']], ['in-meal2', 'meal', ['방금 먹은 것', '@[data-q-food],[data-q-add],.quick-choice']], ['in-work', 'workout', ['실시간 입력']], ['in-work2', 'workout', ['실시간 입력', '@[data-q-ex]']]]) {
    await c.run(`(async()=>{const m=await import('/app-state.js');m.$s.page='home';m.$s.modal=null;m.$f.render();return 1})()`); await wait(600);
    await c.run(`(()=>{document.querySelector('[data-input-toggle]')?.click();return 1})()`); await wait(300);
    await c.run(`(()=>{document.querySelector('.nav6-pop [data-modal="${modal}"]')?.click();return 1})()`); await wait(1500);
    for (const stp of steps) { await c.run(`(()=>{const t=${JSON.stringify(stp)};let el=null;if(t.startsWith('@')){el=document.querySelector('.sheet '+t.slice(1).split(',').join(',.sheet '))}else{el=[...document.querySelectorAll('.sheet button,.sheet [role=button],.sheet label')].find(b=>b.innerText.includes(t))}el?.click();return !!el})()`); await wait(1500); }
    await c.run(`(()=>{const st=document.createElement('style');st.textContent='.modal-backdrop{position:static!important;inset:auto!important;background:none!important;display:block!important}.sheet{position:static!important;max-height:none!important;overflow:visible!important;transform:none!important;margin:0 auto!important}main,.nav,header{display:none!important}';document.head.appendChild(st);for(const e of document.querySelectorAll('body *')){const p=getComputedStyle(e).position;if(p==='fixed'||p==='sticky')e.style.visibility='hidden'}return 1})()`); await wait(500);
    const n = await c.run(`(()=>{const sh=document.querySelector('.sheet');if(!sh)return 0;let box=sh;for(let k=0;k<3;k++){const kids=[...box.children];const big=kids.sort((a,b)=>b.children.length-a.children.length)[0];if(big&&big.children.length>=3&&big.getBoundingClientRect().height>sh.getBoundingClientRect().height*.5){box=big}else break}window.__box=box;return box.children.length})()`);
    manifest[key] = [];
    const head = JSON.parse(await c.run(`(()=>{const h=document.querySelector('.sheet .sheet-head');if(!h)return 'null';const r=h.getBoundingClientRect();return JSON.stringify({y:r.top+scrollY,h:r.height,title:h.innerText.split(String.fromCharCode(10))[0]})})()`));
    if (head) { const shot = await c.send('Page.captureScreenshot', {format: 'jpeg', quality: 82, captureBeyondViewport: true, clip: {x: 0, y: Math.max(0, head.y - 4), width: 412, height: head.h + 8, scale: 1}}); fs.writeFileSync(path.join(OUT, `${key}-head.jpg`), Buffer.from(shot.data, 'base64')); manifest[key + '_title'] = head.title; }
    for (let i = 0; i < n; i++) {
      const info = JSON.parse(await c.run(`(()=>{const e=window.__box.children[${i}];const r=e.getBoundingClientRect();if(r.height<6)return 'null';return JSON.stringify({y:r.top+scrollY,h:r.height,cls:String(e.className||''),title:(e.querySelector('h2,h3,h4,b,strong,label,summary')?.innerText||e.innerText||'').split(String.fromCharCode(10))[0].slice(0,40)})})()`));
      if (!info) continue;
      const shot = await c.send('Page.captureScreenshot', {format: 'jpeg', quality: 82, captureBeyondViewport: true, clip: {x: 0, y: Math.max(0, info.y - 6), width: 412, height: Math.min(info.h + 12, 5000), scale: 1}});
      const file = `${key}-${String(i).padStart(2, '0')}.jpg`; fs.writeFileSync(path.join(OUT, file), Buffer.from(shot.data, 'base64'));
      manifest[key].push({i, file, h: Math.round(info.h), cls: info.cls, title: info.title});
    }
    await c.send('Page.reload'); await wait(3500);
    await c.run(`(()=>{const b=document.getElementById('landing-demo');b?.click();return 1})()`); await wait(3000);
  }
  await c.run(`scrollTo(0,0);true`);
  const nav = await c.send('Page.captureScreenshot', {format: 'jpeg', quality: 85, clip: {x: 0, y: 915 - 70, width: 412, height: 70, scale: 1}});
  fs.writeFileSync(path.join(OUT, 'nav.jpg'), Buffer.from(nav.data, 'base64'));
  fs.writeFileSync(path.join(OUT, 'manifest.json'), JSON.stringify(manifest, null, 1));
  c.close();
} finally { chrome.kill(); server.close(); try { fs.rmSync(prof, {recursive: true, force: true}); } catch {} }
console.log(Object.entries(manifest).map(([k, v]) => `${k}:${v.length}`).join(' '));
