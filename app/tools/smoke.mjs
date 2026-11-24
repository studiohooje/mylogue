// 4.27.0 전수검사 패턴 ①(M-18 재발 방지): 시험이 모듈만 보고 화면 연결을 타지 않아 '정의되지 않은 함수 호출'이 배포됐다.
// 배포 전 연기 시험: 빌드본(dist)을 띄워 헤드리스 크롬으로 둘러보기(데모)를 열고, 일곱 탭과 주요 창을 차례로 연 뒤
// 화면 숨김·복귀 이벤트까지 내서 콘솔 오류·잡히지 않은 예외가 0인지 본다. 0이 아니면 종료 코드 1.
// 실행: npm run build && node tools/smoke.mjs   (크롬이 없으면 건너뛴다고 알리고 0으로 끝냄)
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import os from 'node:os';
import {connect} from '../qa-cdp.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'dist');
const CHROME = [process.env.CHROME, 'C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', '/usr/bin/google-chrome', '/usr/bin/chromium'].filter(Boolean).find(p => fs.existsSync(p));
const wait = ms => new Promise(r => setTimeout(r, ms));
const MIME = {'.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.webmanifest': 'application/manifest+json', '.wasm': 'application/wasm'};

if (!fs.existsSync(path.join(ROOT, 'index.html'))) { console.error('dist가 없어요. 먼저 npm run build'); process.exit(1); }
// 4.27.0 재검사 N-10: CI(GitHub Actions)에서는 크롬이 없으면 통과가 아니라 실패
if (!CHROME) { if (process.env.CI) { console.error('CI에서 크롬을 찾지 못했어요(CHROME 환경 변수로 지정).'); process.exit(1); } console.log('크롬을 찾지 못해 연기 시험을 건너뛰어요.'); process.exit(0); }

const server = http.createServer((req, res) => { let name = decodeURIComponent(new URL(req.url, 'http://x').pathname); if (name === '/') name = '/index.html'; const file = path.resolve(ROOT, '.' + name); if (!file.startsWith(ROOT)) { res.writeHead(403).end(); return; } fs.readFile(file, (e, d) => { if (e) { res.writeHead(404).end(); return; } res.writeHead(200, {'Content-Type': MIME[path.extname(file)] || 'application/octet-stream'}).end(d); }); });
await new Promise(r => server.listen(0, '127.0.0.1', r));
const port = server.address().port, debug = 9400 + Math.floor(Math.random() * 400);
const prof = fs.mkdtempSync(path.join(os.tmpdir(), 'mylogue-smoke-'));
const chrome = spawn(CHROME, ['--headless=new', `--remote-debugging-port=${debug}`, `--user-data-dir=${prof}`, '--no-first-run', '--disable-gpu', ...(process.env.CI ? ['--no-sandbox'] : []), 'about:blank'], {stdio: 'ignore'});
let errors = [], code = 0; const flowErrors = [];
try {
 for (let i = 0; i < 40; i++) { try { await fetch(`http://127.0.0.1:${debug}/json/version`); break; } catch { await wait(250); } }
 const c = await connect(debug);
 const ws = c; // 콘솔·예외 모으기
 await c.send('Runtime.enable'); await c.send('Log.enable'); await c.send('Page.enable');
 await c.send('Emulation.setDeviceMetricsOverride', {width: 412, height: 915, deviceScaleFactor: 1, mobile: true});
 const base = `http://127.0.0.1:${port}/`;
 await c.send('Page.navigate', {url: base}); await wait(1500);
 // 예외·콘솔 오류는 페이지 안에서 모은다(연결 도우미가 이벤트를 넘기지 않으므로)
 const hook = `(()=>{window.__smokeErr=window.__smokeErr||[];addEventListener('error',e=>__smokeErr.push('error: '+(e.message||e.error)));addEventListener('unhandledrejection',e=>__smokeErr.push('reject: '+(e.reason?.message||e.reason)));const ce=console.error.bind(console);console.error=(...a)=>{__smokeErr.push('console: '+a.map(String).join(' ').slice(0,300));ce(...a)};return true})()`;
 await c.run(`localStorage.setItem('mylogue.landing.skip','1');true`);
 await c.send('Page.addScriptToEvaluateOnNewDocument', {source: hook});
 await c.send('Page.navigate', {url: base}); await wait(2500);
 // 둘러보기(데모) 시작 — 버튼이 있으면 누르고, 없으면 지금 화면 그대로
 await c.run(`(()=>{const b=[...document.querySelectorAll('button')].find(x=>/둘러보기/.test(x.innerText));b?.click();return !!b})()`); await wait(2500);
 const steps = [];
 for (const p of ['home', 'body', 'food', 'workout', 'analysis', 'calendar', 'settings', 'home']) {
  const ok = await c.run(`(()=>{const b=document.querySelector('[data-page="${p}"]');if(!b)return false;b.click();return true})()`); await wait(700); steps.push(`${p}:${ok ? 'ok' : '없음'}`);
 }
 // 기록 창 열고 닫기(식사·운동·수치)
 // 4.27.0 재검사 N-10: 빠른 식사(검색까지)·운동 실시간 입력·AI 입력·무엇을 기록할까 창까지
 for (const m of ['batch', 'body', 'quick', 'meal', 'workout', 'ai-input']) {
  // 홈에서 시작하고, 버튼이 홈에 없으면 '무엇을 기록할까요'(quick) 창 안에서 찾는다
  await c.run(`(()=>{document.querySelector('.sheet .close')?.click();document.querySelector('[data-page="home"]')?.click();return true})()`); await wait(500);
  const opened = await c.run(`(()=>{let b=document.querySelector('[data-modal="${m}"]');if(!b&&'${m}'!=='quick'){document.querySelector('[data-modal="quick"]')?.click();b=document.querySelector('.sheet [data-modal="${m}"]')}b?.click();return !!b})()`); await wait(900); steps.push(`창 ${m}:${opened ? 'ok' : '없음'}`);
  if (m === 'meal') { await c.run(`(()=>{const i=document.getElementById('q-food-search');if(!i)return false;i.value='닭가슴살';i.dispatchEvent(new Event('input',{bubbles:true}));return true})()`); await wait(1200); }
  await c.run(`(()=>{const x=document.querySelector('.sheet .close, .sheet [aria-label*="닫기"], #modal-close');x?.click();return true})()`); await wait(500);
 }
 // 4.28.0: 운동 기록 안에서 헬스장 새로 추가 → 바로 골라져야 한다
 {
  await c.run(`(()=>{document.querySelector('.sheet .close')?.click();document.querySelector('[data-page="home"]')?.click();return true})()`); await wait(500);
  await c.run(`(()=>{let b=document.querySelector('[data-modal="workout"]');if(!b){document.querySelector('[data-modal="quick"]')?.click();b=document.querySelector('.sheet [data-modal="workout"]')}b?.click();return !!b})()`); await wait(900);
  await c.run(`(()=>{document.querySelector('[data-q-live]')?.click();return true})()`); await wait(700);
  const opened = await c.run(`(()=>{const b=document.getElementById('q-gym-add-open');if(b){b.click();return 'btn'}const sel=document.querySelector('select[data-q-work="gymName"]');if(!sel)return 'none';sel.value='__new__';sel.dispatchEvent(new Event('change',{bubbles:true}));return 'select'})()`); await wait(600);
  const added = await c.run(`(()=>{const i=document.getElementById('q-gym-new');if(!i)return 'no-input';i.value='연기시험짐';document.getElementById('q-gym-save').click();return 'saved'})()`); await wait(700);
  const picked = await c.run(`[...document.querySelectorAll('select[data-q-work="gymName"]')].some(x=>x.value==='연기시험짐')`);
  steps.push(`헬스장 추가:${opened}/${added}/${picked ? '골라짐' : '안 골라짐'}`);
  if (!picked) flowErrors.push('운동 기록 안 헬스장 추가 뒤 선택이 안 됨');
 }
 await c.run(`(()=>{document.querySelector('.sheet .close')?.click();document.querySelector('[data-page="home"]')?.click();return true})()`); await wait(700);
 steps.push('끝 창:' + await c.run(`document.querySelector('.sheet h2')?.innerText||'없음'`)); if (process.env.SMOKE_DEBUG) console.log(await c.run(`document.querySelector('main')?.innerText.slice(0,400)`));
 await c.run(`(()=>{document.dispatchEvent(new Event('visibilitychange'));dispatchEvent(new Event('pagehide'));return true})()`); await wait(500);
 errors = [...await c.run(`window.__smokeErr||[]`), ...flowErrors];
 const text = await c.run(`document.querySelector('main')?.innerText.length||0`);
 console.log('연기 시험', steps.join(' '), `· 본문 ${text}자`);
 if (!text) errors.push('화면이 비어 있어요');
 c.close();
} catch (e) { errors.push('시험 실행 오류: ' + e.message); }
finally {
 chrome.kill(); server.close();
 try { fs.rmSync(prof, {recursive: true, force: true}); } catch {}
}
if (errors.length) { console.error('콘솔 오류 ' + errors.length + '건'); for (const e of errors.slice(0, 20)) console.error(' - ' + e); code = 1; }
else console.log('콘솔 오류 0건');
process.exit(code);
