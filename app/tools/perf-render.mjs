// 5.0.6 화면 다시 그리기 시간: 예시 인물 기록으로 페이지마다 render() 시간(CPU 4배 느림)
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path'; import {spawn} from 'node:child_process'; import {fileURLToPath} from 'node:url'; import os from 'node:os';
import {connect} from '../qa-cdp.mjs';
const ROOT = path.resolve(process.argv[2] || path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'dist')), PERSONA = process.argv[3] || 'jihoon';
const CHROME = [process.env.CHROME, 'C:/Program Files/Google/Chrome/Application/chrome.exe'].filter(Boolean).find(p => fs.existsSync(p));
const wait = ms => new Promise(r => setTimeout(r, ms));
const MIME = {'.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.webp': 'image/webp', '.webmanifest': 'application/manifest+json'};
const server = http.createServer((req, res) => { let name = decodeURIComponent(new URL(req.url, 'http://x').pathname); if (name === '/') name = '/index.html'; const file = path.resolve(ROOT, '.' + name); if (!file.startsWith(ROOT) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.writeHead(404); res.end(); return; } res.writeHead(200, {'content-type': MIME[path.extname(file)] || 'application/octet-stream'}); fs.createReadStream(file).pipe(res); });
await new Promise(r => server.listen(0, '127.0.0.1', r));
const debug = 9400 + Math.floor(Math.random() * 90), prof = fs.mkdtempSync(path.join(os.tmpdir(), 'mylogue-pr-'));
const chrome = spawn(CHROME, ['--headless=new', `--remote-debugging-port=${debug}`, `--user-data-dir=${prof}`, '--no-first-run', '--disable-gpu', 'about:blank'], {stdio: 'ignore'});
try {
  for (let i = 0; i < 40; i++) { try { await fetch(`http://127.0.0.1:${debug}/json/version`); break; } catch { await wait(250); } }
  const c = await connect(debug); await c.send('Page.enable');
  await c.send('Emulation.setDeviceMetricsOverride', {width: 412, height: 915, deviceScaleFactor: 2, mobile: true});
  const base = `http://127.0.0.1:${server.address().port}/`;
  await c.send('Page.navigate', {url: base}); await wait(1500);
  await c.run(`(()=>{localStorage.clear();sessionStorage.clear();sessionStorage.setItem('mylogue.demo','1');sessionStorage.setItem('mylogue.demo.persona','${PERSONA}');return 1})()`);
  await c.send('Page.navigate', {url: base}); await wait(5000);
  await c.send('Emulation.setCPUThrottlingRate', {rate: 4});
  const r = JSON.parse(await c.run(`(async()=>{const m=await import('/app-state.js');const out={};const t=async(label,fn)=>{const a=[];for(let i=0;i<3;i++){const s=performance.now();fn();await new Promise(r=>requestAnimationFrame(()=>setTimeout(r,0)));a.push(performance.now()-s)}out[label]=Math.round(a.sort((x,y)=>x-y)[1])};
   for(const pg of ['home','body','food','workout','analysis','mate','settings']){await t('page:'+pg,()=>{m.$s.modal=null;m.$s.page=pg;m.$f.render()})}
   m.$s.page='home';await t('modal:workout',()=>{m.$s.modal='workout';m.$f.render()});await t('modal:batch',()=>{m.$s.modal='batch';m.$f.render()});m.$s.modal=null;
   m.$s.page='workout';m.$s.modal='workout';m.$f.render();await t('modal:workout same-render(창 안 버튼)',()=>m.$f.render());m.$s.modal=null;
   m.$s.page='food';m.$f.render();await t('food:same-render',()=>m.$f.render());
   const s0=performance.now();for(let i=0;i<5;i++)m.$f.render();out['food:render x5 sync']=Math.round(performance.now()-s0);
   return JSON.stringify(out)})()`));
  console.log(PERSONA, JSON.stringify(r));
  // 어디에 시간이 드는지: CPU 프로필 한 번(식단·운동·분석)
  await c.send('Profiler.enable'); await c.send('Profiler.start');
  await c.run(process.argv[4]==='modal'?`(async()=>{const m=await import('/app-state.js');m.$s.page='workout';m.$s.modal='workout';m.$f.render();for(let i=0;i<8;i++)m.$f.render();m.$s.modal=null;m.$f.render();return 1})()`:`(async()=>{const m=await import('/app-state.js');for(const pg of ['food','workout','analysis','home','body'])for(let i=0;i<2;i++){m.$s.page=pg;m.$f.render()}return 1})()`);
  const {profile} = await c.send('Profiler.stop');
  const self = new Map(); const byId = new Map(profile.nodes.map(n => [n.id, n]));
  const dt = profile.timeDeltas; const samples = profile.samples;
  for (let i = 0; i < samples.length; i++) { const n = byId.get(samples[i]); const k = `${n.callFrame.functionName || '(anon)'} ${n.callFrame.url.split('/').pop().split('?')[0]}:${n.callFrame.lineNumber}`; self.set(k, (self.get(k) || 0) + (dt[i] || 0)); }
  const total = [...self.values()].reduce((a, b) => a + b, 0);
  console.log('자기 시간 상위(ms):'); for (const [k, v] of [...self.entries()].sort((a, b) => b[1] - a[1]).slice(0, 25)) console.log(Math.round(v / 1000), Math.round(v / total * 100) + '%', k);
} finally { chrome.kill(); server.close(); }
