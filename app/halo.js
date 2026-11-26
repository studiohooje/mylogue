// 3.3.0 '완성되는 헤일로': 오늘의 기록을 홈 히어로 위 하나의 원호로 그린다.
// 원칙(대표님 확정 2026-11-20, 목업 mockups/record-trajectory/v3.html)
// - 모양은 먹은 양·세트 수가 아니라 '기록 습관'만 반영한다. 모든 선은 같은 원 위 → 뾰족해지지 않는다.
// - 고리 양 끝 = 나의 평소 첫 기록 −1시간 ~ 마지막 기록 +1시간(지난 7일). 기록이 3일 미만이면 06~24시.
// - 평소 리듬 = 같은 종류의 지난 7일 기록 시각 ±1.5시간. 리듬 안 = 밝은 선, 밖 = 속 빈 구슬과 옅은 선.
// - 몸·식사·운동을 모두 기록하면 아래 세 점이 켜지며 앱 아이콘 모양이 완성된다.
// - 글자를 침범하지 않는다: 글자 줄 영역(+12px)을 피해 그릴 칸을 찾고, 그린 뒤 겹침이 있으면 지운다.
// 계산은 모두 기기 안에서만 한다.

import {prefsOf} from './prefs.js';

export const HALO_COLORS = {body:'#f2b49b', meal:'#8ce4e0', workout:'#b8aaf2'};
const KINDS = ['body','meal','workout'];
const LABEL = {body:'수치', meal:'식사', workout:'운동'};
const RHYTHM_WINDOW = 1.5;
const pad2 = n => String(n).padStart(2,'0');
const localDate = d => `${d.getFullYear()}-${pad2(d.getMonth()+1)}-${pad2(d.getDate())}`;

export function hourOn(iso, date){
 if(!iso) return null;
 const d = new Date(iso);
 if(Number.isNaN(d.getTime()) || localDate(d) !== date) return null;
 return d.getHours() + d.getMinutes()/60;
}

export function dayRecords(db, date){
 const out = [];
 for(const b of db.body||[]) if(b.date===date) out.push({kind:'body', t:hourOn(b.createdAt, date)});
 const groups = new Map();
 for(const m of db.meals||[]){
  if(m.date!==date) continue;
  const key = m.mealGroupId || `legacy:${m.slot||'식사'}`;
  const t = hourOn(m.loggedAt||m.createdAt, date);
  if(!groups.has(key) || (t!=null && (groups.get(key)==null || t<groups.get(key)))) groups.set(key, t);
 }
 for(const t of groups.values()) out.push({kind:'meal', t});
 for(const w of db.workouts||[]) if(w.date===date) out.push({kind:'workout', t:hourOn(w.loggedAt||w.createdAt, date)});
 return out.sort((a,b)=>(a.t??99)-(b.t??99));
}

const shiftDate = (date, days) => { const d = new Date(`${date}T12:00:00`); d.setDate(d.getDate()+days); return localDate(d); };

export function rhythmFor(db, date){
 const base = {body:[], meal:[], workout:[]}, firsts = [], lasts = [];
 let days = 0;
 for(let i=1;i<=7;i++){
  const recs = dayRecords(db, shiftDate(date, -i)).filter(r=>r.t!=null);
  if(!recs.length) continue;
  days++;
  recs.forEach(r=>base[r.kind].push(r.t));
  firsts.push(recs[0].t); lasts.push(recs[recs.length-1].t);
 }
 if(days<3) return {learning:true, start:6, end:24, base};
 const avg = a => a.reduce((s,v)=>s+v,0)/a.length;
 let start = Math.max(0, avg(firsts)-1), end = Math.min(24, avg(lasts)+1);
 if(end-start<8){ const mid=(start+end)/2; start=Math.max(0,mid-4); end=Math.min(24,mid+4); }
 return {learning:false, start, end, base};
}

export function inRhythm(rec, rh){
 if(rh.learning || rec.t==null) return true;
 const times = rh.base[rec.kind]||[];
 if(!times.length) return true;
 return times.some(t=>Math.abs(t-rec.t)<=RHYTHM_WINDOW);
}

// tracks: 사용자가 '기록할 것'으로 고른 종류(3.4.0). 고른 것만 채우면 완성.
export function haloMessage(recs, rh, tracks=KINDS){
 const want = KINDS.filter(k=>tracks.includes(k));
 recs = recs.filter(r=>want.includes(r.kind));
 if(!recs.length) return '첫 기록을 남기면 고리에 첫 빛이 맺혀요.';
 const kinds = new Set(recs.map(r=>r.kind));
 const off = recs.filter(r=>!inRhythm(r, rh)).length;
 const all = want.every(k=>kinds.has(k)), word = want.length===3?'세 가지 모두':want.length===2?'두 가지 모두':'오늘 기록';
 const did = want.length===1 ? '오늘 기록을 남겼어요' : `${word} 기록했어요`;
 if(all && !off) return rh.learning ? `${did}. 오늘의 헤일로 완성!` : `${want.length===1?'평소 리듬 그대로 기록했어요':word+', 평소 리듬 그대로'}. 오늘의 헤일로 완성!`;
 if(all) return `${did}. 시각은 평소와 조금 달랐어요.`;
 const miss = want.filter(k=>!kinds.has(k)).map(k=>LABEL[k]).join('·');
 return `${miss} 기록을 더하면 헤일로가 완성돼요.`;
}

export const nowHour = (date, now=new Date()) => localDate(now)===date ? now.getHours()+now.getMinutes()/60 : 24;

// 그릴 칸 안에 헤일로(반원 + 아래 세 점)를 맞출 때의 반지름
export const fitRadius = (w, h) => Math.min((w-16)/2, (h-10)/1.62);

// 글자 줄 영역(여백 m 포함)을 피해 오른쪽 아래에 붙는 가장 큰 칸을 찾는다.
export function findZone(W, H, rects, pad=14, m=12){
 const ex = rects.map(r=>({l:r.l-m, t:r.t-m, r:r.r+m, b:r.b+m}));
 let best = null;
 for(let y=pad; y<=H-pad-30; y+=2){
  let x0 = pad;
  for(const r of ex) if(r.b>y && r.t<H-pad) x0 = Math.max(x0, r.r);
  const w = W-pad-x0, h = H-pad-y;
  if(w<40) continue;
  const R = fitRadius(w, h);
  if(!best || R>best.R) best = {x:x0, y, w, h, R};
 }
 return best;
}

const f1 = v => v.toFixed(1);

// 순수 함수: 칸(zone)과 기록으로 SVG 내용을 만든다.
export function haloSVG({zone, recs, rh, now, tracks=KINDS}){
 const want = KINDS.filter(k=>tracks.includes(k));
 recs = recs.filter(r=>want.includes(r.kind));
 const R = Math.min(zone.R, 74);
 const cx = zone.x + zone.w - R - 8, baseY = zone.y + zone.h - 0.62*R - 6;
 const span = Math.max(1, rh.end-rh.start);
 const u = t => Math.min(1, Math.max(0, (t-rh.start)/span));
 const P = (t, rr=R) => { const a = Math.PI + u(t)*Math.PI; return [cx+rr*Math.cos(a), baseY+rr*Math.sin(a)]; };
 const arc = (t1, t2, rr=R) => { const [x1,y1]=P(t1,rr), [x2,y2]=P(t2,rr); return `M${f1(x1)} ${f1(y1)}A${f1(rr)} ${f1(rr)} 0 0 1 ${f1(x2)} ${f1(y2)}`; };
 const timed = recs.filter(r=>r.t!=null);
 const kinds = new Set(recs.map(r=>r.kind));
 const done = want.every(k=>kinds.has(k));
 const C = HALO_COLORS;
 const lit = (t1, t2, color, ok, id) => {
  if(u(t2)-u(t1) < 0.002) return '';
  const [x1,y1]=P(t1), [x2,y2]=P(t2);
  const stroke = Array.isArray(color) ? `url(#${id})` : color;
  const grad = Array.isArray(color) ? `<linearGradient id="${id}" gradientUnits="userSpaceOnUse" x1="${f1(x1)}" y1="${f1(y1)}" x2="${f1(x2)}" y2="${f1(y2)}"><stop offset="0" stop-color="${color[0]}"/><stop offset="1" stop-color="${color[1]}"/></linearGradient>` : '';
  return `${grad?`<defs>${grad}</defs>`:''}${ok?`<path d="${arc(t1,t2)}" fill="none" stroke="${stroke}" stroke-width="7" stroke-opacity=".25" filter="url(#halo-blur)"/>`:''}<path d="${arc(t1,t2)}" fill="none" stroke="${stroke}" stroke-width="${ok?3:1.4}" stroke-opacity="${ok?1:.55}" stroke-linecap="round"/>`;
 };
 let g = '';
 g += `<path d="${arc(rh.start, rh.end)}" fill="none" stroke="#c9d6e6" stroke-opacity=".22" stroke-width="1.2" stroke-dasharray="1.5 4" stroke-linecap="round"/>`;
 g += `<path d="${arc(rh.start, Math.min(now, rh.end))}" fill="none" stroke="#c9d6e6" stroke-opacity=".28" stroke-width="1.4"/>`;
 if(timed.length){
  const f = timed[0], l = timed[timed.length-1];
  g += lit(rh.start, f.t, C[f.kind], inRhythm(f, rh));
  for(let i=0;i<timed.length-1;i++){ const a=timed[i], b=timed[i+1]; g += lit(a.t, b.t, [C[a.kind], C[b.kind]], inRhythm(a,rh)&&inRhythm(b,rh), `halo-s${i}`); }
  if(now>=rh.end) g += lit(l.t, rh.end, C[l.kind], inRhythm(l, rh));
 }
 for(const r of timed){
  const [x,y] = P(r.t);
  g += inRhythm(r, rh)
   ? `<circle cx="${f1(x)}" cy="${f1(y)}" r="9" fill="${C[r.kind]}" opacity=".22" filter="url(#halo-blur)"/><circle cx="${f1(x)}" cy="${f1(y)}" r="4" fill="${C[r.kind]}" stroke="#101625" stroke-width="1.2"/>`
   : `<circle cx="${f1(x)}" cy="${f1(y)}" r="3.6" fill="#101625" stroke="${C[r.kind]}" stroke-width="1.6"/>`;
 }
 const [nx, ny] = P(Math.min(now, rh.end));
 g += `<circle cx="${f1(nx)}" cy="${f1(ny)}" r="8" fill="url(#halo-now)"/><circle cx="${f1(nx)}" cy="${f1(ny)}" r="2.2" fill="#fff"/>`;
 const dy = baseY + 0.36*R, gap = 0.42*R;
 want.forEach((k,i)=>{
  const x = cx + (i-(want.length-1)/2)*gap, on = kinds.has(k);
  if(done&&want.length===3) g += `<path d="M${f1(x)} ${f1(baseY-R*0.02)}V${f1(dy-5)}" stroke="${C[k]}" stroke-opacity=".7" stroke-width="2" stroke-linecap="round"/>`;
  g += on
   ? `<circle cx="${f1(x)}" cy="${f1(dy)}" r="7" fill="${C[k]}" opacity=".25" filter="url(#halo-blur)"/><circle cx="${f1(x)}" cy="${f1(dy)}" r="3.6" fill="${C[k]}"/>`
   : `<circle cx="${f1(x)}" cy="${f1(dy)}" r="3.2" fill="none" stroke="#c9d6e6" stroke-opacity=".45" stroke-width="1.3"/>`;
 });
 if(done&&want.length===3){ const mid=(rh.start+rh.end)/2, q=(rh.end-rh.start)*0.125; g += `<path d="${arc(mid-q, mid+q, R*0.5)}" fill="none" stroke="#b8aaf2" stroke-width="2.4" stroke-linecap="round" opacity=".9"/>`; }
 const fmt = t => `${pad2(Math.floor(t))}:${pad2(Math.round((t%1)*60)%60)}`;
 const [sx,sy] = P(rh.start), [ex,ey] = P(rh.end);
 g += `<text x="${f1(sx)}" y="${f1(sy+13)}" fill="#c9d6e6" fill-opacity=".7" font-size="9" text-anchor="middle">${fmt(rh.start)}</text><text x="${f1(ex)}" y="${f1(ey+13)}" fill="#c9d6e6" fill-opacity=".7" font-size="9" text-anchor="middle">${fmt(rh.end===24?24:rh.end)}</text>`;
 const veil = `<ellipse cx="${f1(cx)}" cy="${f1(baseY-R*0.2)}" rx="${f1(R*1.45)}" ry="${f1(R*1.25)}" fill="url(#halo-veil)"/>`;
 const defs = `<defs><filter id="halo-blur" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="2.4"/></filter><radialGradient id="halo-veil"><stop offset="0" stop-color="#0b1226" stop-opacity=".78"/><stop offset=".65" stop-color="#0b1226" stop-opacity=".45"/><stop offset="1" stop-color="#0b1226" stop-opacity="0"/></radialGradient><radialGradient id="halo-now"><stop offset="0" stop-color="#fff" stop-opacity=".9"/><stop offset="1" stop-color="#8ce4e0" stop-opacity="0"/></radialGradient></defs>`;
 return {svg:`${defs}${veil}<g class="halo-draw">${g}</g>`, R, done};
}

// 화면에 붙이기: 글자 위치를 재서 칸을 찾고, 그린 뒤 겹침이 있으면 지운다.
let lastMount = null, bound = false, observer = null, observed = null, lastWidth = 0;
function remountSoon(delay=80){
 clearTimeout(remountSoon.tm);
 remountSoon.tm = setTimeout(()=>{ const h=document.querySelector('.timeline-hero'); if(h&&lastMount) mountHalo(h, lastMount.db, lastMount.date); }, delay);
}
/* 5.4.5 대표님: 날짜를 바꿔도 큰 박스 높이는 오늘 크기 그대로(내용이 바뀌어 위아래로 출렁이지 않게).
   오늘 화면에서 잰 높이를 폭별로 기억했다가 다른 날은 그만큼 최소 높이로. 더 긴 글이 오면 그때만 늘어난다. */
const heroH = new Map();
const ymdOf = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
export function lockHeroHeight(hero, date, now = new Date()){
 if(!hero?.style) return;
 const w = Math.round(hero.clientWidth || 0);
 if(date === ymdOf(now)){ hero.style.minHeight = ''; const h = hero.offsetHeight; if(w && h) heroH.set(w, h); return; }
 const h = heroH.get(w); hero.style.minHeight = h ? `${h}px` : '';
}
export function mountHalo(hero, db, date, now=new Date()){
 if(!hero || typeof document==='undefined') return null;
 const svg = hero.querySelector('.halo-art');
 if(!svg) return null;
 lastMount = {db, date};
 lockHeroHeight(hero, date, now);
 // 글꼴이 늦게 로드되거나 화면 크기·글자 크기가 바뀌면 글자 폭이 달라지므로 다시 잰다.
 if(!bound){
  bound = true;
  if(typeof addEventListener==='function') addEventListener('resize', ()=>remountSoon(120));
  if(document.fonts){ document.fonts.ready?.then(()=>remountSoon(0)); document.fonts.addEventListener?.('loadingdone', ()=>remountSoon(0)); }
  if(typeof ResizeObserver==='function') observer = new ResizeObserver(entries=>{ for(const e of entries){ const w=Math.round(e.contentRect.width); if(w!==lastWidth){ lastWidth=w; remountSoon(60); } } });
 }
 if(observer && observed!==hero){ observer.disconnect(); hero.querySelectorAll('.timeline-date,h2,.hero-msg').forEach(el=>observer.observe(el)); observed=hero; lastWidth=0; }
 const recs = dayRecords(db, date), rh = rhythmFor(db, date), nh = nowHour(date, now), pf = prefsOf(db);
 hero.style.paddingBottom = '';
 svg.innerHTML = '';
 if(!pf.halo){ hero.dataset.halo='off'; return {hidden:true, overlap:0}; }
 const measure = () => {
  const hb = hero.getBoundingClientRect(), s = hb.width/(hero.clientWidth||hb.width||1);
  const rects = [];
  // 4.29.0 대표님 폰(약 620px·글자 크게)에서 큰 제목 끝과 원호가 겹침 → 제목·날짜 줄은 오른쪽 끝까지 막힌 것으로 보고(글자 크기 설정·글꼴 차이 여유),
  // 페이즈 칩·주간 배지처럼 글이 든 다른 요소도 함께 잰다. 헤일로는 제목 아래 빈 곳에만 그린다.
  const W = hero.clientWidth || hb.width/s;
  hero.querySelectorAll('.timeline-date,h2,.hero-msg').forEach(el=>{ const wide = el.matches('h2,.timeline-date'); const rg=document.createRange(); rg.selectNodeContents(el); for(const r of rg.getClientRects()) if(r.width>0) rects.push({l:(r.left-hb.left)/s, t:(r.top-hb.top)/s, r:wide ? W : (r.right-hb.left)/s, b:(r.bottom-hb.top)/s}); });
  hero.querySelectorAll(':scope > :not(.halo-art):not(.hero-glow):not(h2):not(.hero-msg):not(.timeline-date)').forEach(el=>{ const r = el.getBoundingClientRect(); if(r.width>0 && r.height>0 && el.textContent.trim()) rects.push({l:(r.left-hb.left)/s, t:(r.top-hb.top)/s, r:(r.right-hb.left)/s, b:(r.bottom-hb.top)/s}); });
  return {rects, s};
 };
 let {rects} = measure();
 let zone = findZone(hero.clientWidth, hero.clientHeight, rects);
 if(!zone || zone.R<36){
  const basePad = parseFloat(getComputedStyle(hero).paddingBottom)||24;
  hero.style.paddingBottom = `${basePad + Math.ceil(42*1.62+20)}px`;
  ({rects} = measure());
  zone = findZone(hero.clientWidth, hero.clientHeight, rects);
 }
 if(!zone || zone.R<24){ hero.style.paddingBottom=''; hero.dataset.halo='hidden'; return {hidden:true, overlap:0}; }
 svg.setAttribute('viewBox', `0 0 ${hero.clientWidth} ${hero.clientHeight}`);
 const out = haloSVG({zone, recs, rh, now:nh, tracks:pf.tracks});
 svg.innerHTML = out.svg;
 // 안전장치: 그린 그림과 글자 줄이 조금이라도 겹치면 지운다.
 const {rects:after, s} = measure(), hb = hero.getBoundingClientRect(), ab = svg.querySelector('.halo-draw').getBoundingClientRect();
 const A = {l:(ab.left-hb.left)/s, t:(ab.top-hb.top)/s, r:(ab.right-hb.left)/s, b:(ab.bottom-hb.top)/s};
 const overlap = after.reduce((sum,r)=>sum+Math.max(0,Math.min(A.r,r.r)-Math.max(A.l,r.l))*Math.max(0,Math.min(A.b,r.b)-Math.max(A.t,r.t)),0);
 if(overlap>0){ svg.innerHTML=''; hero.style.paddingBottom=''; hero.dataset.halo='hidden'; return {hidden:true, overlap}; }
 hero.dataset.halo = out.done ? 'complete' : 'shown';
 return {hidden:false, overlap:0, R:out.R};
}
