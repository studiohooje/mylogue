// 4.3.0 수치 '한눈에'(대표님: 마웨그처럼 볼거리 — 주간으로 얼마나 늘고 줄었는지 주봉처럼).
// 요약 줄 → 체중 큰 그래프(일간·주간·월간, 최고·최저·현재, 목표선) → 주간 변화 막대(목표 쪽이면 초록, 반대면 빨강)
// → 체성분 변화(인바디) → 식단과 함께(주별 평균 섭취·체중) → 요일 패턴.
// 4.4.0 목표 띠형으로 통일: 최고·최저·현재 색 배지와 축 숫자를 없애고, 목표 체중 ±1kg 띠 + 마우스오버.
import {mealTotals} from './domain.js';
import {scaleRecords, inbodyRecords} from './body-series.js';
import {lineChart, barChart, hoverButton} from './band-chart.js';

const esc = v => String(v??'').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const pad = n => String(n).padStart(2, '0');
const ymd = d => `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
const r1 = v => Math.round(v*10)/10;
const f1 = v => (Math.round(v*10)/10).toFixed(1);
const md = s => `${Number(s.slice(5,7))}/${Number(s.slice(8,10))}`;
const CW = () => Math.max(320, Math.min(760, ((globalThis.innerWidth||700) > 760 ? 760 : (globalThis.innerWidth||700) - 56)));
const avg = a => a.reduce((x, y) => x + y, 0) / a.length;
const monday = date => { const d = new Date(`${date}T12:00:00`); d.setDate(d.getDate() - ((d.getDay()+6)%7)); return ymd(d); };

export function weightPoints(db){
 const sc = scaleRecords(db).filter(x => Number(x.weight)>0);
 const src = sc.length ? sc : (db.body||[]).filter(x => Number(x.weight)>0);
 const byDay = new Map(); for(const x of [...src].sort((a, b) => String(a.date).localeCompare(String(b.date)))) byDay.set(x.date, Number(x.weight));
 return [...byDay.entries()].map(([date, w]) => ({date, w}));
}
export function bucket(points, view){
 if(view==='day') return points.map(p => ({key:p.date, label:md(p.date), w:p.w, n:1}));
 const m = new Map();
 for(const p of points){ const k = view==='week' ? monday(p.date) : p.date.slice(0,7); if(!m.has(k)) m.set(k, []); m.get(k).push(p.w); }
 return [...m.entries()].map(([k, ws]) => ({key:k, label:view==='week' ? md(k) : `${Number(k.slice(5,7))}월`, w:r1(avg(ws)), n:ws.length}));
}
// 주간 변화: 주 평균의 전주 대비
export function weeklyChanges(points, weeks = 16){
 const b = bucket(points, 'week');
 return b.slice(1).map((x, i) => ({key:x.key, label:x.label, d:r1(x.w - b[i].w)})).slice(-weeks);
}
export function summary(points, goal, today){
 if(!points.length) return null;
 const last = points.at(-1), t = new Date(`${today}T12:00:00`);
 const within = days => points.filter(p => (t - new Date(`${p.date}T12:00:00`))/86400000 < days);
 const w7 = within(7), w30 = within(30);
 // 4.17.0 백 온 트랙 2단계: 14일 넘게 비었다가 다시 잰 경우, 공백 앞 체중과 비교하지 않는다('다시 시작한 날'부터 센다).
 let restart = null;
 for(let i = points.length-1; i > 0; i--){ if((new Date(`${points[i].date}T12:00:00`) - new Date(`${points[i-1].date}T12:00:00`))/86400000 >= 14){ restart = points[i]; break; } }
 const since = restart && (t - new Date(`${restart.date}T12:00:00`))/86400000 < 30 ? restart : null;
 const base = since ? w30.filter(p => p.date >= since.date) : w30;
 const change30 = base.length>1 ? r1(last.w - base[0].w) : null;
 let eta = null;
 if(goal && base.length>1){ const span = Math.max(1, (new Date(`${last.date}T12:00:00`) - new Date(`${base[0].date}T12:00:00`))/86400000), perDay = (last.w - base[0].w)/span, left = goal - last.w; if(perDay && Math.sign(perDay)===Math.sign(left)) eta = Math.ceil(Math.abs(left/perDay)/7); }
 return {now:last.w, nowDate:last.date, restart:since?since.date:null, avg7:w7.length ? r1(avg(w7.map(p => p.w))) : null, change30, goal:goal||null, left:goal ? r1(goal - last.w) : null, eta};
}

const BODY = '#f2b49b', DOWN = '#6fd6a3', UP = '#ff7b93';
function mainChart(rows, view, goal, dayAvg){
 if(!rows.length) return '<p class="hint bf-empty">체중을 기록하면 여기에 흐름이 그려져요.</p>';
 const vals = rows.map(r => r.w), lo = goal ? goal-1 : null, hi = goal ? goal+1 : null;
 const tips = rows.map((r, i) => `<span class="d">${esc(view==='day'?md(r.key):view==='week'?`${r.label} 주`:r.label)}</span><b>${f1(r.w)}kg</b>${view==='day'&&dayAvg[i]!=null?`<span class="d">7일 평균 ${f1(dayAvg[i])}kg</span>`:''}${view!=='day'?`<span class="d">${r.n}번 잰 평균</span>`:''}${goal?`<span class="s">${Math.abs(r.w-goal)<=1?'목표 범위 안':`목표까지 ${f1(Math.abs(r.w-goal))}kg`}</span>`:''}`);
 return lineChart({vals, line:view==='day' ? dayAvg : null, lo, hi, color:BODY, h:170, tips, dateL:rows[0].label, dateR:rows.at(-1).label, label:'체중 흐름'});
}
function changeBars(ch, goalDir){
 if(ch.length<2) return '';
 const good = d => goalDir ? Math.sign(d)===goalDir || d===0 : d<=0;
 const tips = ch.map(c => `<span class="d">${esc(c.label)} 주</span><b>${c.d>0?'+':''}${f1(c.d)}kg</b><span class="d">지난주 평균보다 ${c.d>0?'늘었어요':c.d<0?'줄었어요':'그대로예요'}</span>`);
 return `<div class="bf-sub"><b>주간 변화</b><small>목표 쪽이면 초록, 반대면 분홍</small></div>${barChart({bars:ch.map(c => ({v:c.d, color:good(c.d)?DOWN:UP})), signed:true, h:72, tips, dateL:ch[0].label, dateR:'이번 주', label:'주간 체중 변화'})}<p class="bf-last">이번 주 <b class="${good(ch.at(-1).d)?'good':'bad'}">${ch.at(-1).d>0?'+':''}${f1(ch.at(-1).d)}kg</b> · 지난 ${ch.length}주 중 ${ch.filter(c => good(c.d)).length}주가 목표 쪽</p>`;
}
function compositionCard(db){
 const ib = inbodyRecords(db).filter(x => Number(x.weight)>0 && (x.skeletalMuscle!=null || x.bodyFatMass!=null)).slice(-6);
 if(!ib.length) return '';
 const bars = ib.map(x => { const m = Number(x.skeletalMuscle)||0, f = Number(x.bodyFatMass)||0; return {stack:[{v:m, color:DOWN}, {v:f, color:UP}, {v:Math.max(0, Number(x.weight)-m-f), color:'#3a4a66'}]}; });
 const tips = ib.map(x => `<span class="d">${md(x.date)} 인바디</span><b>${f1(Number(x.weight))}kg</b><span class="d">골격근 ${x.skeletalMuscle!=null?f1(x.skeletalMuscle)+'kg':'—'} · 체지방 ${x.bodyFatMass!=null?f1(x.bodyFatMass)+'kg':'—'}</span>`);
 const a = ib[0], b = ib.at(-1), dm = r1((b.skeletalMuscle||0)-(a.skeletalMuscle||0)), df = r1((b.bodyFatMass||0)-(a.bodyFatMass||0));
 return `<section class="section card bf-card"><div class="bf-sub"><b>체성분 변화</b><small>인바디 ${ib.length}회</small></div>${barChart({bars, h:120, tips, dateL:md(a.date), dateR:md(b.date), label:'인바디별 골격근·체지방'})}<div class="bf-legend"><span><i style="background:${DOWN}"></i>골격근</span><span><i style="background:${UP}"></i>체지방</span><span><i style="background:#3a4a66"></i>그 외</span></div>${ib.length>1?`<p class="bf-last">첫 측정보다 골격근 <b class="${dm>=0?'good':'bad'}">${dm>0?'+':''}${f1(dm)}kg</b> · 체지방 <b class="${df<=0?'good':'bad'}">${df>0?'+':''}${f1(df)}kg</b></p>`:''}</section>`;
}
function dietWithWeight(db, points, today){
 const weeks = []; let m = monday(today);
 for(let i=0; i<8; i++){ weeks.unshift(m); const d = new Date(`${m}T12:00:00`); d.setDate(d.getDate()-7); m = ymd(d); }
 const rows = weeks.map(k => { const end = new Date(`${k}T12:00:00`); end.setDate(end.getDate()+6); const e = ymd(end); const days = new Map(); for(const x of db.meals||[]) if(!x.planned && x.date>=k && x.date<=e){ if(!days.has(x.date)) days.set(x.date, []); days.get(x.date).push(x); } const kcal = days.size ? avg([...days.values()].map(ms => mealTotals(ms).calories)) : null; const ws = points.filter(p => p.date>=k && p.date<=e).map(p => p.w); return {k, kcal, w:ws.length ? avg(ws) : null}; });
 if(rows.filter(r => r.kcal!=null).length<2 || rows.filter(r => r.w!=null).length<2) return '';
 // 4.7.0 목표 띠형으로: 위 = 주별 평균 섭취(민트 막대), 아래 = 주별 평균 체중(살구 선). 같은 8주 칸을 쓴다.
 const kTips = rows.map(r => r.kcal==null ? '' : `<span class="d">${md(r.k)} 주</span><b>${Math.round(r.kcal).toLocaleString('ko-KR')}kcal</b><span class="d">하루 평균 섭취</span>`);
 const wTips = rows.map(r => r.w==null ? '' : `<span class="d">${md(r.k)} 주</span><b>${f1(r.w)}kg</b><span class="d">주 평균 체중</span>`);
 return `<section class="section card bf-card"><div class="bf-sub"><b>식단과 함께</b><small>주별 평균 섭취와 체중</small></div><div class="bf-legend"><span><i style="background:#8ce4e0"></i>평균 섭취 kcal</span></div>${barChart({bars:rows.map(r => ({v:r.kcal||0})), color:'#8ce4e0', h:70, tips:kTips, label:'주별 평균 섭취 칼로리'})}<div class="bf-legend"><span><i style="background:${BODY}"></i>체중</span></div>${lineChart({vals:rows.map(r => r.w==null ? null : r1(r.w)), color:BODY, h:80, tips:wTips, dateL:'8주 전', dateR:'이번 주', label:'주별 평균 체중'})}</section>`;
}
export function weekdayPattern(points, today){
 const from = new Date(`${today}T12:00:00`); from.setDate(from.getDate()-56); const f = ymd(from);
 const recent = points.filter(p => p.date>=f); if(recent.length<10) return null;
 const wk = new Map(); for(const p of recent){ const k = monday(p.date); if(!wk.has(k)) wk.set(k, []); wk.get(k).push(p.w); }
 const dev = Array.from({length:7}, () => []);
 for(const p of recent){ const m = avg(wk.get(monday(p.date))); dev[(new Date(`${p.date}T12:00:00`).getDay()+6)%7].push(p.w - m); }
 return dev.map(a => a.length ? r1(avg(a)) : null);
}
function weekdayCard(points, today){
 const d = weekdayPattern(points, today); if(!d) return '';
 const top = d.reduce((a, v, i) => v!=null && (a<0 || v>d[a]) ? i : a, -1), W7 = '월화수목금토일';
 const tips = d.map((v, i) => v==null ? '' : `<span class="d">${W7[i]}요일</span><b>${v>0?'+':''}${f1(v)}kg</b><span class="d">그 주 평균과의 차이</span>`);
 return `<section class="section card bf-card"><div class="bf-sub"><b>요일 패턴</b><small>최근 8주 · 그 주 평균과의 차이</small></div>${barChart({bars:d.map(v => ({v:v||0, color:v>0?BODY:DOWN})), signed:true, h:80, tips, label:'요일별 체중 차이'})}<div class="bf-days" aria-hidden="true">${[...W7].map(x => `<span>${x}</span>`).join('')}</div>${top>=0&&d[top]>0.1?`<p class="bf-last">${W7[top]}요일에 평균보다 <b class="bad">${f1(d[top])}kg</b> 무거워요</p>`:''}</section>`;
}

export function bodyOverviewHTML(db, {view = 'day', today}){
 // 4.17.0 페이즈가 진행 중이고 목표 체중이 있으면 그 목표를 쓴다(홈 페이즈 카드와 같은 숫자)
 const ph = db.settings?.phase, tg = ph?.target || {}, sw = Number(ph?.startWeight)||0;
 const phGoal = Number(tg.weight) || (sw && tg.loseKg ? Math.round((sw - tg.loseKg)*10)/10 : sw && tg.gainKg ? Math.round((sw + Number(tg.gainKg))*10)/10 : null) || null;
 const points = weightPoints(db), goal = phGoal || Number(db.settings?.goalWeight)||null, s = summary(points, goal, today);
 const range = view==='day' ? points.slice(-90) : points;
 const rows = bucket(range, view).slice(view==='week' ? -26 : view==='month' ? -24 : -90);
 const dayAvg = view==='day' ? rows.map((r, i) => r1(avg(rows.slice(Math.max(0, i-6), i+1).map(x => x.w)))) : [];
 const goalDir = goal && s ? Math.sign(goal - s.now) || -1 : -1;
 const stat = (k, v, cls = '') => `<div><small>${k}</small><b class="${cls}">${v}</b></div>`;
 return `<section class="section card bf-top">${s ? `<div class="bf-stats">${stat('지금', `${f1(s.now)}kg`)}${stat('7일 평균', s.avg7!=null?`${f1(s.avg7)}kg`:'—')}${s.restart?stat(s.change30!=null?'다시 시작 후':'다시 시작한 날', s.change30!=null?`${s.change30>0?'+':''}${f1(s.change30)}kg`:md(s.restart)):stat('30일 변화', s.change30!=null?`${s.change30>0?'+':''}${f1(s.change30)}kg`:'—')}${goal?stat(`${phGoal?'페이즈 목표':'목표'} ${goal}kg`, s.left===0?'도착!':`${Math.abs(s.left)}kg ${s.left<0?'남음':'더'}${s.eta?` · 약 ${s.eta}주`:''}`):`<div><small>목표 체중</small><button type="button" class="text-button" data-goal-weight-open>정하기</button></div>`}</div>` : ''}
 <form id="goal-weight-form" class="bf-goal-form" hidden><label class="field">목표 체중(kg)<input name="goalWeight" type="number" inputmode="decimal" step="0.1" min="20" max="300" value="${esc(goal||'')}"></label><button class="button small">저장</button></form>
 <div class="bf-head"><b class="bf-title">체중</b><div class="df-tools"><div class="df-period" role="group" aria-label="보기 단위">${[['day','일간'],['week','주간'],['month','월간']].map(([k, l]) => `<button type="button" class="${k===view?'on':''}" data-bf-view="${k}" aria-pressed="${k===view}">${l}</button>`).join('')}</div>${hoverButton()}</div></div>
 ${mainChart(rows, view, goal, dayAvg)}
 ${view==='day'?`<p class="hint bf-note">점은 매일 잰 값, 선은 최근 7일 평균이에요.${goal?' 띠는 목표 체중 ±1kg이에요.':''} 인바디 체중은 기계가 달라 섞지 않아요.</p>`:''}
 ${changeBars(weeklyChanges(points), goalDir)}
 ${goal?'<p class="hint"><button type="button" class="text-button" data-goal-weight-open>목표 체중 바꾸기</button></p>':''}
 </section>${compositionCard(db)}${dietWithWeight(db, points, today)}${weekdayCard(points, today)}`;
}
