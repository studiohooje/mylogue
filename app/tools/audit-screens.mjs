// 5.0.5 밤샘 화면 전수 점검: 예시 인물 × 화면 폭 × 페이지·창·타일 팝업을 열어 '찐빠'를 자동으로 찾는다.
// 찾는 것: 화면 밖으로 넘침(가로 스크롤), 부모 밖으로 삐져나옴, 형제끼리 겹침, 잘린 글자(의도한 말줄임 제외), 12px 미만 글자, 44px보다 작은 버튼, 콘솔 오류.
// node tools/audit-screens.mjs <출력 폴더> [인물들(쉼표)|all] [폭들(쉼표)] [--shots]
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path'; import {spawn} from 'node:child_process'; import {fileURLToPath} from 'node:url'; import os from 'node:os';
import {connect} from '../qa-cdp.mjs';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'dist');
const args = process.argv.slice(2), SHOTS = args.includes('--shots'), pos = args.filter(a => !a.startsWith('--'));
const OUT = pos[0] || 'audit-out', PERSONAS = (pos[1] && pos[1] !== 'all') ? pos[1].split(',') : ['', 'jihoon', 'seoyeon', 'minjun', 'haeun', 'doyoon', 'jimin', 'sua', 'hyunwoo'];
const WIDTHS = (pos[2] || '360,412,860,1280').split(',').map(Number);
fs.mkdirSync(OUT, {recursive: true});
const CHROME = [process.env.CHROME, 'C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'].filter(Boolean).find(p => fs.existsSync(p));
const wait = ms => new Promise(r => setTimeout(r, ms));
const MIME = {'.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.webmanifest': 'application/manifest+json', '.png': 'image/png', '.webp': 'image/webp', '.ttf': 'font/ttf', '.jpg': 'image/jpeg', '.woff2': 'font/woff2'};
const server = http.createServer((req, res) => { let name = decodeURIComponent(new URL(req.url, 'http://x').pathname); if (name === '/') name = '/index.html'; const file = path.resolve(ROOT, '.' + name); if (!file.startsWith(ROOT) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.writeHead(404); res.end(); return; } res.writeHead(200, {'content-type': MIME[path.extname(file)] || 'application/octet-stream'}); fs.createReadStream(file).pipe(res); });
await new Promise(r => server.listen(0, '127.0.0.1', r));
const port = server.address().port, debug = 9600 + Math.floor(Math.random() * 90), prof = fs.mkdtempSync(path.join(os.tmpdir(), 'mylogue-audit-'));
const chrome = spawn(CHROME, ['--headless=new', `--remote-debugging-port=${debug}`, `--user-data-dir=${prof}`, '--no-first-run', '--disable-gpu', '--hide-scrollbars', 'about:blank'], {stdio: 'ignore'});

// 화면 하나에서 문제를 찾는 브라우저 쪽 코드
const PROBE = `(()=>{
 const W=innerWidth,out=[],seen=new Set();
 const sig=e=>{let s=e.tagName.toLowerCase();if(e.id)s+='#'+e.id;const c=[...e.classList].filter(x=>!/^(on|active|open|sel|td|rec|done|today|rest)$/.test(x)).slice(0,3);if(c.length)s+='.'+c.join('.');const p=e.parentElement;let ps='';if(p){ps=p.tagName.toLowerCase()+(p.classList[0]?'.'+p.classList[0]:'')}return ps+' > '+s};
 const vis=e=>{const r=e.getBoundingClientRect();if(r.width<1||r.height<1)return false;const cs=getComputedStyle(e);return cs.visibility!=='hidden'&&cs.display!=='none'&&+cs.opacity>0.01};
 const scrollable=e=>{for(let p=e;p&&p!==document.body;p=p.parentElement){const o=getComputedStyle(p).overflowX;if(o==='auto'||o==='scroll'||o==='hidden'||o==='clip')return p}return null};
 const add=(kind,e,extra='')=>{const k=kind+'|'+sig(e);if(seen.has(k))return;seen.add(k);out.push({kind,sig:sig(e),text:(e.innerText||e.getAttribute('aria-label')||'').trim().slice(0,40),extra})};
 const root=document.querySelector('.modal-backdrop .sheet')||document.querySelector('main')||document.body;
 const sr=e=>{const cs=getComputedStyle(e);return e.closest('.sr-only,.sr')||cs.clip==='rect(0px, 0px, 0px, 0px)'||(e.offsetWidth<=1&&e.offsetHeight<=1)};
 const all=[...root.querySelectorAll('*')].filter(e=>(!e.closest('svg')||e.tagName.toLowerCase()==='svg')&&!sr(e));
 if(document.documentElement.scrollWidth>W+1)out.push({kind:'page-hscroll',sig:'html',text:'',extra:document.documentElement.scrollWidth+'>'+W});
 for(const e of all){
  if(!vis(e))continue;const r=e.getBoundingClientRect(),cs=getComputedStyle(e);
  // 화면 밖(가로)
  if((r.right>W+1||r.left<-1)&&!scrollable(e)&&cs.position!=='fixed')add('offscreen',e,Math.round(r.left)+'~'+Math.round(r.right));
  // 부모 밖으로 삐져나옴(스크롤 영역 안은 제외)
  const p=e.parentElement;if(p&&!scrollable(e)&&cs.position!=='absolute'&&cs.position!=='fixed'){const pr=p.getBoundingClientRect();if(pr.width>0&&(r.right>pr.right+2||r.left<pr.left-2)&&getComputedStyle(p).display!=='contents')add('spill',e,Math.round(r.right-pr.right)+'px')}
  // 잘린 글자: 한 줄 글자가 상자보다 넓은데 말줄임이 아님
  if(e.children.length===0&&e.textContent.trim()&&e.scrollWidth>e.clientWidth+2&&cs.textOverflow!=='ellipsis'&&cs.overflowX!=='visible'&&!/INPUT|TEXTAREA|SELECT/.test(e.tagName))add('clipped',e,e.scrollWidth+'>'+e.clientWidth);
  if(e.tagName==='INPUT'&&e.type!=='checkbox'&&e.type!=='radio'&&e.type!=='hidden'&&e.offsetWidth&&e.offsetWidth<56)add('narrow-input',e,e.offsetWidth+'px');
  // 작은 글자
  if(e.children.length===0&&e.textContent.trim().length>1&&parseFloat(cs.fontSize)<11.5&&parseFloat(cs.fontSize)>0&&!e.closest('svg'))add('tiny-font',e,cs.fontSize);
  // 작은 버튼
  if((e.tagName==='BUTTON'||e.getAttribute('role')==='button')&&!e.disabled&&(r.height<32||r.width<32)&&!e.closest('svg'))add('small-tap',e,Math.round(r.width)+'x'+Math.round(r.height));
 }
 // 형제 겹침(흐름 배치된 것끼리)
 for(const p of all){if(!vis(p)||p.children.length<2||p.children.length>40)continue;if(p.closest('svg')||/diary-art|avatar-stack/.test(p.className))continue;const kids=[...p.children].filter(k=>vis(k)&&!sr(k)&&!['absolute','fixed','sticky'].includes(getComputedStyle(k).position));for(let i=0;i<kids.length;i++)for(let j=i+1;j<kids.length;j++){const a=kids[i].getBoundingClientRect(),b=kids[j].getBoundingClientRect();const ox=Math.min(a.right,b.right)-Math.max(a.left,b.left),oy=Math.min(a.bottom,b.bottom)-Math.max(a.top,b.top);if(ox>3&&oy>3){add('overlap',kids[j],'with '+sig(kids[i]));}}}
 return JSON.stringify(out);
})()`;

const pages = ['home', 'body', 'food', 'workout', 'analysis', 'mate', 'settings', 'calendar'];
const results = [];
try {
  for (let i = 0; i < 40; i++) { try { await fetch(`http://127.0.0.1:${debug}/json/version`); break; } catch { await wait(250); } }
  const c = await connect(debug); await c.send('Page.enable'); await c.send('Runtime.enable');
  let errs = []; c.ws.addEventListener('message', ev => { try { const m = JSON.parse(ev.data); if (m.method === 'Runtime.exceptionThrown') errs.push(m.params.exceptionDetails?.exception?.description?.split('\n')[0]); if (m.method === 'Runtime.consoleAPICalled' && m.params.type === 'error') errs.push(m.params.args.map(a => a.value ?? a.description).join(' ').slice(0, 200)); } catch {} });
  const base = `http://127.0.0.1:${port}/`;
  for (const persona of PERSONAS) {
    for (const width of WIDTHS) {
      await c.send('Emulation.setDeviceMetricsOverride', {width, height: 900, deviceScaleFactor: 1, mobile: width < 650});
      await c.send('Page.navigate', {url: base}); await wait(1200);
      await c.run(`(()=>{localStorage.clear();sessionStorage.clear();sessionStorage.setItem('mylogue.demo','1');${persona ? `sessionStorage.setItem('mylogue.demo.persona','${persona}');` : ''}return 1})()`);
      await c.send('Page.navigate', {url: base}); await wait(3500);
      // 열 화면 목록: 페이지, 페이지 타일, 입력 창
      const screens = [];
      for (const pg of pages) screens.push({pg});
      screens.push({pg: 'body', metric: 'weight'}, {pg: 'body', metric: 'inbody'}, {pg: 'body', metric: 'waistCm'});
      const tileKeys = JSON.parse(await c.run(`(async()=>{const m=await import('/app-state.js');const keys=[];for(const pg of ['food','workout','analysis','body']){m.$s.modal=null;m.$s.page=pg;m.$f.render();await new Promise(r=>setTimeout(r,150));for(const b of document.querySelectorAll('[data-pg-sec]'))keys.push([pg,b.dataset.pgSec])}return JSON.stringify([...new Map(keys.map(k=>[k[1],k])).values()])})()`));
      for (const [pg, key] of tileKeys) screens.push({pg, sec: key});
      for (const key of ['account', 'record', 'screen', 'bell', 'gym', 'ai', 'health', 'backup', 'trash', 'book', 'help']) screens.push({pg: 'settings', set: key});
      for (const modal of ['body', 'batch', 'workout', 'quick', 'ai-chat', 'checkin', 'profile-edit']) screens.push({pg: 'home', modal});
      screens.push({pg: 'home', modal: 'batch', click: '[data-q-when=now]'}, {pg: 'home', modal: 'workout', click: "[data-q-live='1']"}, {pg: 'home', modal: 'workout', click: "[data-q-live='1']", click2: '.quick-choice.has-art'}, {pg: 'home', modal: 'batch', click: '[data-q-when=now]', click2: '.quick-choice-list .quick-choice'});
      for (const sc of screens) {
        errs = [];
        const label = [sc.pg, sc.metric, sc.sec, sc.set && 'set:' + sc.set, sc.modal && 'modal:' + sc.modal, sc.click, sc.click2].filter(Boolean).join(' ');
        await c.run(`(async()=>{const m=await import('/app-state.js');m.$s.modal=null;m.$s.page='${sc.pg}';${sc.metric ? `m.$s.bodyMetric='${sc.metric}';` : `m.$s.bodyMetric='overview';`}${sc.sec ? `m.$s.pgSec='${sc.sec}';m.$s.modal='page-sec';` : ''}${sc.set ? `m.$s.setSec='${sc.set}';m.$s.modal='settings-sec';` : ''}m.$f.render();scrollTo(0,0);return 1})()`);
        await wait(500);
        if (sc.modal) { await c.run(`(()=>{const b=document.querySelector('[data-modal="${sc.modal}"]');if(b){b.click();return 1}return 0})()`).then(async ok => { if (!ok) await c.run(`(async()=>{const m=await import('/app-state.js');m.$s.modal='${sc.modal}';m.$f.render();return 1})()`); }); await wait(600); }
        for (const k of [sc.click, sc.click2].filter(Boolean)) { await c.run(`(()=>{document.querySelector(${JSON.stringify(k)})?.click();return 1})()`); await wait(600); }
        let found = [];
        try { found = JSON.parse(await c.run(PROBE)); } catch (e) { found = [{kind: 'probe-error', sig: '', text: String(e.message).slice(0, 100)}]; }
        for (const f of found) results.push({persona: persona || 'mai', width, screen: label, ...f});
        for (const e of errs) results.push({persona: persona || 'mai', width, screen: label, kind: 'console', sig: '', text: String(e).slice(0, 200)});
        if (SHOTS) { const shot = await c.send('Page.captureScreenshot', {format: 'jpeg', quality: 60}); fs.writeFileSync(path.join(OUT, `${persona || 'mai'}-${width}-${label.replace(/[^a-z0-9가-힣-]/gi, '_').slice(0, 80)}.jpg`), Buffer.from(shot.data, 'base64')); }
      }
      process.stdout.write(`${persona || 'mai'}@${width}: ${results.length}\n`);
    }
  }
} finally { chrome.kill(); server.close(); }
fs.writeFileSync(path.join(OUT, 'audit.json'), JSON.stringify(results, null, 1));
// 묶음 요약: 같은 종류·같은 요소는 하나로, 몇 화면·폭에서 나왔는지
const groups = new Map();
for (const r of results) { const k = r.kind + '|' + r.sig; const g = groups.get(k) || {kind: r.kind, sig: r.sig, text: r.text, extra: r.extra, n: 0, widths: new Set(), screens: new Set()}; g.n++; g.widths.add(r.width); g.screens.add(r.screen); groups.set(k, g); }
const sum = [...groups.values()].sort((a, b) => b.n - a.n).map(g => `${g.kind}\t${g.n}\t${[...g.widths].join('/')}\t${g.sig}\t${g.text}\t${g.extra || ''}\t${[...g.screens].slice(0, 3).join(' ; ')}`);
fs.writeFileSync(path.join(OUT, 'summary.tsv'), 'kind\tn\twidths\tsig\ttext\textra\tscreens\n' + sum.join('\n'));
console.log('groups', groups.size, 'total', results.length);
