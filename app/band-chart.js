// 4.4.0 그래프 공통(대표님 선택: 목표 띠형).
// · 한 그래프에는 한 색. 목표 범위는 같은 색의 옅은 띠, 범위 안은 꽉 찬 점, 밖은 빈 점, 마지막(오늘)은 큰 점.
// · 축 숫자 없음. 날짜는 그래프 아래 HTML로 양 끝만("4주 전 · 이번 주").
// · SVG는 가로 100 단위로 그리고 preserveAspectRatio="none"으로 늘린다. 선·점은 non-scaling-stroke라
//   폭이 달라도 굵기·동그라미가 그대로라서 카드 폭에 상관없이 한 벌의 코드로 그린다.
// · 마우스를 올리거나(휴대폰은 손가락) 누르면 그 날 값이 뜬다. 카드 구석 ⓘ로 끌 수 있고 기기에 기억한다.
const esc = v => String(v??'').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const HOVER_KEY = 'mylogue.chartHover';
export function hoverOn(){ try{ return globalThis.localStorage?.getItem(HOVER_KEY)!=='off'; }catch{ return true; } }
export const hoverButton = () => `<button type="button" class="gc-hov" data-chart-hover aria-pressed="${hoverOn()}" title="그래프에 올리면 값 보기 (눌러서 끄기·켜기)" aria-label="그래프 값 보기 켜기·끄기">ⓘ</button>`;

const BG = '#1b2843';
const f = v => +v.toFixed(2);
const dotPath = (x, y) => `M${f(x)} ${f(y)}h0`;
const wrap = (svg, {xs, ys, tips, kind, color, h, dateL, dateR, label}) =>
 `<div class="gc" style="--gc:${color}" data-kind="${kind}" data-x="${xs.join(',')}" data-y="${ys.join(',')}" data-h="${h}" data-tips="${esc(JSON.stringify(tips))}">${svg}<i class="gc-cross" aria-hidden="true"></i><i class="gc-dot" aria-hidden="true"></i><div class="gc-tip" role="status"></div>${dateL||dateR?`<div class="gc-x"><span>${esc(dateL||'')}</span><span>${esc(dateR||'')}</span></div>`:''}</div>`;

// 선 그래프(+목표 띠). vals에 null이 있으면 끊어 그린다. line을 주면 선은 line(예: 7일 평균), 점은 vals.
// 5.0.4 대표님(수치 그래프 시안 A): grid=옅은 격자 칸(가로 kg·세로 주), goal=목표선(점선), band=7일 평균 둘레의 흐름 띠, grad=평균선 마이로그 그라데이션
export function lineChart({vals, line, lo = null, hi = null, color, h = 120, tips = [], dateL, dateR, label = '그래프', dots = true, grid = false, goal = null, band = 0, grad = false}){
 const n = vals.length;
 const all = [...vals, ...(line||[]), lo, hi, goal].filter(v => v!=null && Number.isFinite(v));
 if(!all.length) return '';
 let a = Math.min(...all), b = Math.max(...all); const p = (b-a)*0.14 || Math.max(1, Math.abs(a)*0.05); a -= p; b += p;
 const T = 10, B = 10, x = i => n===1 ? 50 : 2 + i*96/(n-1), y = v => T + (h-T-B)*(1 - (v-a)/(b-a));
 let g = '', ylab = '';
 if(grid){
  const span = b - a, step = span < 3 ? 0.5 : span < 8 ? 1 : span < 20 ? 2 : 5;
  for(let v = Math.ceil(a/step)*step; v <= b; v += step){ g += `<line x1="0" x2="100" y1="${f(y(v))}" y2="${f(y(v))}" stroke="#fff" stroke-opacity=".07" vector-effect="non-scaling-stroke"/>`; ylab += `<span style="top:${f(y(v))}px">${Number.isInteger(v) ? v : v.toFixed(1)}</span>`; }
  for(let i = n-1; i > 0; i -= 7) g += `<line x1="${f(x(i))}" x2="${f(x(i))}" y1="0" y2="${h}" stroke="#fff" stroke-opacity=".06" vector-effect="non-scaling-stroke"/>`;
 }
 if(band && line){ const up = [], dn = []; line.forEach((v, i) => { if(v==null) return; up.push(`${f(x(i))} ${f(y(v+band))}`); dn.unshift(`${f(x(i))} ${f(y(v-band))}`); }); if(up.length > 1) g += `<path d="M${up.join(' L')} L${dn.join(' L')} Z" fill="${color}" opacity=".12"/>`; }
 if(goal!=null) g += `<line x1="0" x2="100" y1="${f(y(goal))}" y2="${f(y(goal))}" stroke="#f2a98a" stroke-opacity=".8" stroke-dasharray="4 4" vector-effect="non-scaling-stroke"/>`;
 if(lo!=null && hi!=null){
  g += `<rect x="0" width="100" y="${f(y(hi))}" height="${f(Math.max(1, y(lo)-y(hi)))}" fill="${color}" opacity=".13"/>`;
  for(const v of [lo, hi]) g += `<line x1="0" x2="100" y1="${f(y(v))}" y2="${f(y(v))}" stroke="${color}" stroke-opacity=".35" stroke-dasharray="3 4" vector-effect="non-scaling-stroke"/>`;
 }
 const L = line||vals; let d = '', open = false;
 L.forEach((v, i) => { if(v==null){ open = false; return; } d += `${open?'L':'M'}${f(x(i))} ${f(y(v))} `; open = true; });
 const gid = `lg${Math.random().toString(36).slice(2, 8)}`;
 if(d && grad) g += `<defs><linearGradient id="${gid}" x1="0" x2="1"><stop offset="0" stop-color="#8ce4e0"/><stop offset=".55" stop-color="#b8aaf2"/><stop offset="1" stop-color="#f2a98a"/></linearGradient></defs>`;
 if(d) g += `<path d="${d}" fill="none" stroke="${grad ? `url(#${gid})` : color}" stroke-width="${line?(grad?3:2.2):1.6}" stroke-opacity="${line?.95:.55}" stroke-linejoin="round" stroke-linecap="round" vector-effect="non-scaling-stroke"/>`;
 const last = vals.reduce((k, v, i) => v!=null ? i : k, -1);
 const r = n>45 ? 3.4 : n>14 ? 4.8 : 6.4;
 if(dots) vals.forEach((v, i) => {
  if(v==null || i===last) return;
  const inb = lo==null || (v>=lo && v<=hi), op = line ? .55 : 1;
  g += `<path d="${dotPath(x(i), y(v))}" stroke="${color}" stroke-width="${r}" stroke-linecap="round" opacity="${op}" vector-effect="non-scaling-stroke"/>`;
  if(!inb) g += `<path d="${dotPath(x(i), y(v))}" stroke="${BG}" stroke-width="${f(r-2.6)}" stroke-linecap="round" vector-effect="non-scaling-stroke"/>`;
 });
 if(last>=0){ const lx = x(last), ly = y(vals[last]); g += `<path d="${dotPath(lx, ly)}" stroke="${color}" stroke-width="18" stroke-linecap="round" opacity=".18" vector-effect="non-scaling-stroke"/><path d="${dotPath(lx, ly)}" stroke="#0c1220" stroke-width="12" stroke-linecap="round" vector-effect="non-scaling-stroke"/><path d="${dotPath(lx, ly)}" stroke="${color}" stroke-width="9" stroke-linecap="round" vector-effect="non-scaling-stroke"/>`; }
 const xs = vals.map((_, i) => f(x(i))), ys = vals.map((v, i) => v==null ? (line&&line[i]!=null ? f(y(line[i])) : -1) : f(y(v)));
 const out = wrap(`<svg class="gc-svg" viewBox="0 0 100 ${h}" preserveAspectRatio="none" style="height:${h}px" role="img" aria-label="${esc(label)}">${g}</svg>`, {xs, ys, tips, kind:'line', color, h, dateL, dateR, label});
 return grid || goal!=null ? `<div class="gc-grid">${out}${ylab ? `<div class="gc-ylab" aria-hidden="true">${ylab}</div>` : ''}${goal!=null ? `<span class="gc-goal" style="top:${f(y(goal))}px">목표 ${goal}</span>` : ''}</div>` : out;
}

// 막대 그래프. bars: [{v, color}] 또는 쌓기 [{stack:[{v,color}]}]. signed면 0을 가운데 두고 위아래로.
export function barChart({bars, color, h = 100, tips = [], dateL, dateR, label = '막대 그래프', signed = false}){
 const n = bars.length; if(!n) return '';
 const tot = b => b.stack ? b.stack.reduce((s, x) => s + x.v, 0) : b.v||0;
 const max = Math.max(signed ? 0.3 : 1, ...bars.map(b => Math.abs(tot(b))));
 const T = 6, B = 4, slot = 100/n, bw = Math.min(slot*0.62, 9), x = i => slot*(i+0.5);
 const zero = signed ? h/2 : h-B, span = signed ? h/2-T : h-T-B, hh = v => Math.abs(v)/max*span;
 let g = signed ? `<line x1="0" x2="100" y1="${zero}" y2="${zero}" stroke="#fff" stroke-opacity=".14" vector-effect="non-scaling-stroke"/>` : '';
 const ys = [];
 bars.forEach((b, i) => {
  const op = i===n-1 ? 1 : .78;
  if(b.stack){ let yy = zero; for(const s of b.stack){ const hv = hh(s.v); yy -= hv; g += `<rect x="${f(x(i)-bw/2)}" y="${f(yy)}" width="${f(bw)}" height="${f(Math.max(0, hv-1))}" fill="${s.color}" opacity="${op}"/>`; } ys.push(f(yy)); return; }
  const v = b.v||0, hv = Math.max(v ? 2 : 0, hh(v)), top = v>0 || !signed ? zero-hv : zero;
  g += `<rect x="${f(x(i)-bw/2)}" y="${f(top)}" width="${f(bw)}" height="${f(hv)}" fill="${b.color||color}" opacity="${op}"/>`; ys.push(f(v>0||!signed ? top : top+hv));
 });
 return wrap(`<svg class="gc-svg" viewBox="0 0 100 ${h}" preserveAspectRatio="none" style="height:${h}px" role="img" aria-label="${esc(label)}">${g}</svg>`, {xs:bars.map((_, i) => f(x(i))), ys, tips, kind:'bar', color, h, dateL, dateR, label});
}

// 마우스오버(문서에 한 번만 건다. 화면을 다시 그려도 그대로 동작)
export function installChartHover(doc = globalThis.document){
 if(!doc || typeof doc.addEventListener!=='function' || doc.__mylogueChartHover) return; doc.__mylogueChartHover = true;
 let cur = null;
 const hide = () => { if(cur){ cur.classList.remove('hovering'); cur = null; } };
 const show = e => {
  const el = e.target?.closest?.('.gc'); if(!el){ if(e.type==='pointerdown') hide(); return; }
  if(!hoverOn()){ hide(); return; }
  const xs = el.dataset.x.split(',').map(Number), ys = el.dataset.y.split(',').map(Number), n = xs.length, svg = el.querySelector('svg'), r = svg.getBoundingClientRect();
  const fx = (e.clientX - r.left)/r.width*100;
  let i = 0, best = Infinity; xs.forEach((v, k) => { const d = Math.abs(v-fx); if(d<best){ best = d; i = k; } });
  let tips = []; try{ tips = JSON.parse(el.dataset.tips||'[]'); }catch{}
  if(!tips[i]){ hide(); return; }
  if(cur && cur!==el) cur.classList.remove('hovering'); cur = el;
  const left = xs[i]/100*r.width, top = ys[i]>=0 ? ys[i]/Number(el.dataset.h)*r.height : r.height/2;
  const tip = el.querySelector('.gc-tip'), cross = el.querySelector('.gc-cross'), dot = el.querySelector('.gc-dot');
  tip.innerHTML = tips[i];
  const tw = tip.offsetWidth || 120; tip.style.left = `${Math.max(tw/2, Math.min(r.width - tw/2, left))}px`; tip.style.top = `${top}px`;
  cross.style.left = `${left}px`; cross.style.height = `${r.height}px`;
  dot.style.left = `${left}px`; dot.style.top = `${top}px`; dot.hidden = el.dataset.kind!=='line' || ys[i]<0;
  el.classList.add('hovering');
 };
 doc.addEventListener('pointermove', show);
 doc.addEventListener('pointerdown', show);
 doc.addEventListener('pointerout', e => { if(cur && !cur.contains(e.relatedTarget)) hide(); });
 doc.addEventListener('scroll', hide, {passive:true, capture:true});
 doc.addEventListener('click', e => {
  const b = e.target?.closest?.('[data-chart-hover]'); if(!b) return;
  const on = !hoverOn(); try{ globalThis.localStorage?.setItem(HOVER_KEY, on?'on':'off'); }catch{}
  doc.querySelectorAll('[data-chart-hover]').forEach(x => x.setAttribute('aria-pressed', String(on))); hide();
 });
}
