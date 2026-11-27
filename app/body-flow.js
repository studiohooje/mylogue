// 4.3.0 수치 '한눈에'(대표님: 마웨그처럼 볼거리 — 주간으로 얼마나 늘고 줄었는지 주봉처럼).
// 요약 줄 → 체중 큰 그래프(일간·주간·월간, 최고·최저·현재, 목표선) → 주간 변화 막대(목표 쪽이면 초록, 반대면 빨강)
// → 체성분 변화(인바디) → 식단과 함께(주별 평균 섭취·체중) → 요일 패턴.
// 4.4.0 목표 띠형으로 통일: 최고·최저·현재 색 배지와 축 숫자를 없애고, 목표 체중 ±1kg 띠 + 마우스오버.
import {mealTotals} from './domain.js';
import {scaleRecords, inbodyRecords, weightTrend, paceText, bodyChartHTML} from './body-series.js';
import {myMaintenance} from './maintenance.js';
import {estimate as energyEstimate} from './nutrition-plan.js';
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
function mainChart(rows, view, goal, dayAvg, trend = true){
 if(!rows.length) return '<p class="hint bf-empty">체중을 기록하면 여기에 흐름이 그려져요.</p>';
 const vals = rows.map(r => r.w);
 const tips = rows.map((r, i) => `<span class="d">${esc(view==='day'?md(r.key):view==='week'?`${r.label} 주`:r.label)}</span><b>${f1(r.w)}kg</b>${view==='day'&&dayAvg[i]!=null?`<span class="d">7일 평균 ${f1(dayAvg[i])}kg</span>`:''}${view!=='day'?`<span class="d">${r.n}번 잰 평균</span>`:''}${goal?`<span class="s">${Math.abs(r.w-goal)<=1?'목표 범위 안':`목표까지 ${f1(Math.abs(r.w-goal))}kg`}</span>`:''}`);
 // 5.0.4 대표님: 시안 A — 점은 옅게, 7일 평균 흐름을 굵은 그라데이션 선 + 띠로, 목표 체중은 점선, 옅은 격자 칸
 // 2026-11-27 대표님: 흐린 띠(±0.35kg)는 뜻이 안 보이고 복잡해 뺌. '추세선'을 끄면 잰 점만 이은 마이로그 민트 한 줄
 // 2026-11-27 대표님: 일간은 실제 날짜 비율로(띄엄띄엄 잰 기간이 한 칸으로 붙지 않게), 2주 넘게 빈 기간은 흐린 선
 const dno = k => Math.round(new Date(`${k}T12:00:00`) / 86400000), D0 = view==='day' ? dno(rows[0].key) : 0, SP = view==='day' ? Math.max(1, dno(rows.at(-1).key) - D0) : 1;
 const at = view==='day' && rows.length>1 ? rows.map(r => (dno(r.key) - D0) / SP) : null, gaps = at ? rows.map((r, i) => i>0 && dno(r.key) - dno(rows[i-1].key) > 14) : null;
 if(view==='day' && !trend) return lineChart({vals, goal, grid:true, solid:true, color:'#8ce4e0', h:190, tips, dateL:rows[0].label, dateR:rows.at(-1).label, label:'체중(잰 값)', at, gaps});
 return lineChart({at, gaps, vals, line:view==='day' ? dayAvg : null, goal, grad:true, grid:true, color:BODY, h:190, tips, dateL:rows[0].label, dateR:rows.at(-1).label, label:'체중 흐름'});
}
function changeBars(ch, goalDir){
 ch = ch.slice(-8);/* 2026-11-27 대표님: 16주가 한 줄에 몰려 숫자·날짜가 겹침 → 최근 8주만 */
 if(ch.length<2) return '';
 const good = d => goalDir ? Math.sign(d)===goalDir || d===0 : d<=0;
 const tips = ch.map(c => `<span class="d">${esc(c.label)} 주</span><b>${c.d>0?'+':''}${f1(c.d)}kg</b><span class="d">지난주 평균보다 ${c.d>0?'늘었어요':c.d<0?'줄었어요':'그대로예요'}</span>`);
 return `<div class="bf-sub"><b>주간 변화<i class="i-tip" tabindex="0" title="지난주 평균보다 늘었는지 줄었는지. 목표 쪽이면 초록, 반대면 분홍">i</i></b></div>${(mx => `<div class="bf-wk" role="img" aria-label="주간 체중 변화">${ch.map((c, i) => `<div class="bf-wc"><b class="${good(c.d)?'good':'bad'}">${c.d>0?'+':''}${f1(c.d)}</b><span class="bf-wz"><i class="${c.d>0?'up':'dn'} ${good(c.d)?'good':'bad'}" style="height:${Math.max(3, Math.round(Math.abs(c.d)/mx*26))}px"></i></span><small>${i===ch.length-1?'이번 주':esc(c.label)}</small></div>`).join('')}</div>`)(Math.max(0.3, ...ch.map(c => Math.abs(c.d))))/* 2026-11-27 대표님: 칸이 이상 — 주마다 한 칸, 값·날짜를 막대 위아래에(0에 가까운 주도 보이게) */}<p class="bf-last">이번 주 <b class="${good(ch.at(-1).d)?'good':'bad'}">${ch.at(-1).d>0?'+':''}${f1(ch.at(-1).d)}kg</b> · 지난 ${ch.length}주 중 ${ch.filter(c => good(c.d)).length}주가 목표 쪽</p>`;
}
// 2026-11-27 대표님(목업 승인): 체성분 막대 → '인바디' 카드 — 골격근량·체지방량·체지방률 세 칸, 최근 7회만.
// 칸마다 지금 값 · 7회 전보다 바뀐 양(근육은 늘면, 지방은 줄면 민트) · 작은 흐름선.
function sparkSVG(vals, color){
 const v = vals.filter(x => x!=null); if(v.length<2) return '';
 const mn = Math.min(...v), mx = Math.max(...v), r = mx-mn || 1;
 const pts = vals.map((x, i) => x==null ? null : [r1(i*(100/(vals.length-1))), r1(28-((x-mn)/r)*24)]).filter(Boolean);
 return `<svg viewBox="0 0 100 30" preserveAspectRatio="none" aria-hidden="true"><polyline points="${pts.map(p => p.join(',')).join(' ')}" fill="none" stroke="${color}" stroke-width="2" vector-effect="non-scaling-stroke" stroke-linejoin="round"/>${pts.map((p, i) => `<circle cx="${p[0]}" cy="${p[1]}" r="${i===pts.length-1?3.2:1.8}" fill="${color}" vector-effect="non-scaling-stroke"/>`).join('')}</svg>`;
}
export function compositionCard(db){
 const ib = inbodyRecords(db).filter(x => x.skeletalMuscle!=null || x.bodyFatMass!=null || x.bodyFatPct!=null).slice(-7);
 if(!ib.length) return '';
 const tile = (label, k, unit, upGood, color) => {
  const vals = ib.map(x => x[k]==null || x[k]==='' ? null : Number(x[k])), have = vals.filter(x => x!=null);
  if(!have.length) return `<div><small>${label}</small><b>—</b></div>`;
  const last = have.at(-1), d = r1(last-have[0]), good = upGood ? d>=0 : d<=0;
  // 2026-11-27 대표님: 흐름선의 점에 올리거나(PC) 누르면(폰) 변화량 자리에 그날 날짜·값
  const n = vals.length, hits = n>1 ? `<span class="ib-hits">${ib.map((x, i) => `<i class="ib-hit"${vals[i]==null ? '' : ` tabindex="0"><b>${md(x.date)} · ${f1(vals[i])}</b`}></i>`).join('')}</span>` : '';
  return `<div><small>${label}</small><b>${f1(last)}<i>${unit}</i></b>${have.length>1?`<em class="${d===0?'':good?'g':'b'}">${d>0?'+':d<0?'−':''}${f1(Math.abs(d))}${unit}</em>`:''}${sparkSVG(vals, color)}${hits}</div>`;
 };
 return `<section class="section card bf-card bf-ib"><div class="bf-sub"><b>인바디</b>${inbodyRecords(db).length>1?'<button type="button" class="text-button ib-all" data-ib-all>전체 기록 ›</button>':`<small>최근 ${ib.length}회</small>`}</div><div class="ibk">${tile('골격근량','skeletalMuscle','kg',true,'#8ce4e0')}${tile('체지방량','bodyFatMass','kg',false,'#f28a9b')}${tile('체지방률','bodyFatPct','%',false,'#b8aaf2')}</div>${ib.length>1?`<div class="ibd"><span>${md(ib[0].date)}</span><span>${md(ib.at(-1).date)}</span></div>`:''}</section>`;
}
function dietWithWeight(db, points, today){
 const weeks = []; let m = monday(today);
 for(let i=0; i<8; i++){ weeks.unshift(m); const d = new Date(`${m}T12:00:00`); d.setDate(d.getDate()-7); m = ymd(d); }
 const rows = weeks.map(k => { const end = new Date(`${k}T12:00:00`); end.setDate(end.getDate()+6); const e = ymd(end); const days = new Map(); for(const x of db.meals||[]) if(!x.planned && x.date>=k && x.date<=e){ if(!days.has(x.date)) days.set(x.date, []); days.get(x.date).push(x); } const kcal = days.size ? avg([...days.values()].map(ms => mealTotals(ms).calories)) : null; const ws = points.filter(p => p.date>=k && p.date<=e).map(p => p.w); return {k, kcal, w:ws.length ? avg(ws) : null}; });
 if(rows.filter(r => r.kcal!=null).length<4 || rows.filter(r => r.w!=null).length<4) return ''; /* 2026-11-27 기록 4주가 쌓일 때까지 숨김(2주뿐이면 빈 칸만) */
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

// 2026-11-27 대표님 C안: 기록이 쌓인 사람(나만의 유지칼로리 계산이 된 사람)에게만, 몸 화면에 내 유지 칼로리 추정 — 무료. AI 아님, 실제 먹은 양과 체중 흐름으로 계산
export function maintBoxHTML(db, today, goal){
 const m = myMaintenance(db, today, energyEstimate(db.settings?.nutritionProfile || {})?.tdee);
 if(m.status !== 'ready') return '';
 const n0 = v => Math.round(v).toLocaleString('ko-KR'), G = Number(db.settings?.calorieGoal) || 0;
 /* 위 칸의 주당 페이스·목표 도달 주수와 겹치거나 엇갈리는 숫자는 넣지 않는다 */
 return `<div class="bf-maint"><small>내 유지 칼로리<i class="i-tip" tabindex="0" title="최근 8주 동안 실제로 먹은 양(평균 ${n0(m.meanIntake)}kcal)과 체중 흐름으로 계산했어요.${G > 0 ? ` 지금 식단 목표는 ${n0(G)}kcal예요.` : ''}">i</i></small><b>약 ${n0(m.kcal)}kcal</b><button type="button" class="text-button" data-gw-mine>이 값으로 식단 목표 맞추기 ›</button></div>`;
}
export function bodyOverviewHTML(db, {view = 'day', today}){
 // 4.17.0 페이즈가 진행 중이고 목표 체중이 있으면 그 목표를 쓴다(홈 페이즈 카드와 같은 숫자)
 const ph = db.settings?.phase, tg = ph?.target || {}, sw = Number(ph?.startWeight)||0;
 const phGoal = Number(tg.weight) || (sw && tg.loseKg ? Math.round((sw - tg.loseKg)*10)/10 : sw && tg.gainKg ? Math.round((sw + Number(tg.gainKg))*10)/10 : null) || null;
 const points = weightPoints(db), goal = phGoal || Number(db.settings?.goalWeight)||null, s = summary(points, goal, today);
 const range = view==='day' ? points.slice(-90) : points;
 const rows = bucket(range, view).slice(view==='week' ? -26 : view==='month' ? -24 : -90);
 const dayAvg = view==='day' ? rows.map(r => { const t = new Date(`${r.key}T12:00:00`); return r1(avg(rows.filter(x => { const g = (t - new Date(`${x.key}T12:00:00`)) / 86400000; return g >= 0 && g < 7; }).map(x => x.w))); }) : [];/* 2026-11-27 대표님: 7번이 아니라 실제 7일 안에 잰 값의 평균 */
 const goalDir = goal && s ? Math.sign(goal - s.now) || -1 : -1;
 const stat = (k, v, cls = '') => `<div><small>${k}</small><b class="${cls}">${v}</b></div>`;
 return `<section class="section card bf-top">${s ? `<div class="bf-stats">${(tr => { const last = scaleRecords(db).filter(x => x.date <= today && Number(x.weight) > 0).at(-1); /* 2026-11-27 대표님: 직접 잰 값을 그대로(추세 체중 칸 없앰) — 가장 최근에 잰 체중과 그 날짜 */ return `${stat(`${!last || last.date===today ? '오늘' : md(last.date)} 체중`, `${f1(last ? Number(last.weight) : s.now)}kg`)}${tr && !tr.stale && tr.pace != null ? stat('주 페이스', paceText(tr.pace)) : stat('7일 평균', s.avg7!=null?`${f1(s.avg7)}kg`:'—')}`; })(weightTrend(db, today))}${s.restart?stat(s.change30!=null?'다시 시작 후':'다시 시작한 날', s.change30!=null?`${s.change30>0?'+':''}${f1(s.change30).replace('-','−')}kg`:md(s.restart)):stat('30일 변화', s.change30!=null?`${s.change30>0?'+':''}${f1(s.change30).replace('-','−')}kg`:'—')}${goal?stat(s.left===0?`${phGoal?'페이즈 목표':'목표'} ${goal}kg`:`${goal}kg까지`, s.left===0?'도착!':`${Math.abs(s.left)}kg`)/* 2026-11-27 좁은 폰에서도 한 칸에(목표까지 남은 양) */:`<div><small>목표 체중</small><button type="button" class="text-button" data-goal-weight-open>정하기</button></div>`}</div>` : ''}${s ? maintBoxHTML(db, today, goal) : ''}
 <form id="goal-weight-form" class="bf-goal-form" hidden><label class="field">목표 체중(kg)<input name="goalWeight" type="number" inputmode="decimal" step="0.1" min="20" max="300" value="${esc(goal||'')}"></label><button class="button small">저장</button></form>
 <div class="bf-head"><b class="bf-title">체중</b><div class="df-tools"><div class="df-period" role="group" aria-label="보기 단위">${[['day','일간'],['week','주간'],['month','월간']].map(([k, l]) => `<button type="button" class="${k===view?'on':''}" data-bf-view="${k}" aria-pressed="${k===view}">${l}</button>`).join('')}</div>${hoverButton()}</div></div>
 ${view==='day'?`<div class="bf-tgrow"><button type="button" class="sw-pill${db.settings?.preferences?.bodyTrend!==false?' on':''}" data-body-trend aria-pressed="${db.settings?.preferences?.bodyTrend!==false}"><i aria-hidden="true"></i>추세선</button></div>`:''}
 ${mainChart(rows, view, goal, dayAvg, db.settings?.preferences?.bodyTrend!==false)}
 ${changeBars(weeklyChanges(points), goalDir)}
 ${goal?'<p class="hint"><button type="button" class="text-button" data-goal-weight-open>목표 체중 바꾸기</button></p>':''}
 </section>${compositionCard(db)}${dietWithWeight(db, points, today)}${weekdayCard(points, today)}`;
}

// 2026-11-27 대표님: 인바디 전체 기록 — 1년·전체, 실제 날짜 비율 그래프(2주 넘게 빈 기간은 흐린 선), 월별 접기
export const IB_KEYS = [['skeletalMuscle','골격근량','kg'],['bodyFatMass','체지방량','kg'],['bodyFatPct','체지방률','%']];
export function inbodyAllHTML(db, {range = 'all', k = 'skeletalMuscle', today}){
 const all = inbodyRecords(db), [, name, unit] = IB_KEYS.find(x => x[0]===k) || IB_KEYS[0];
 const chip = (attr, v, l, on) => `<button type="button" class="chip${on?' active':''}" ${attr}="${v}" aria-pressed="${on}">${l}</button>`;
 const chart = bodyChartHTML([{name, unit, cls:'ib', pts:all.map(x => ({date:x.date, v:x[k]===''?null:x[k]}))}], {days:range==='year'?365:3650, today, gapDays:14, months:true, empty:'이 기간에 잰 기록이 없어요.'});
 const byM = new Map(); for(const x of [...all].reverse()){ const m = String(x.date).slice(0,7); if(!byM.has(m)) byM.set(m, []); byM.get(m).push(x); }
 const yr = String(today||'').slice(0,4), v = (x, key, u) => x[key]==null || x[key]==='' ? '—' : `${f1(x[key])}${u}`;
 const list = [...byM].map(([m, xs], i) => `<details class="rec-mon"${i===0?' open':''}><summary><span>${m.slice(0,4)!==yr?`${m.slice(0,4)}년 `:''}${+m.slice(5,7)}월</span><span class="pg-chev" aria-hidden="true">⌄</span></summary><div class="rec-list">${xs.map(x => `<div class="ib-row"><span>${md(x.date)}</span><span>골격근 <b>${v(x,'skeletalMuscle','')}</b></span><span>체지방 <b>${v(x,'bodyFatMass','')}</b></span><span>체지방률 <b>${v(x,'bodyFatPct','%')}</b></span></div>`).join('')}</div></details>`).join('');
 return `<div class="ib-all-sheet"><div class="chip-row">${chip('data-ib-range','year','1년',range==='year')}${chip('data-ib-range','all','전체',range!=='year')}</div><div class="chip-row">${IB_KEYS.map(([kk, l]) => chip('data-ib-k', kk, l, kk===k)).join('')}</div>${chart}${list}</div>`;
}
