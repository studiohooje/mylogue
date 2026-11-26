// 3.13.0 운동 분석 'A 주간 리포트형': 숫자보다 말로 먼저, 다음 할 일, 새 기록 축하, 식단·몸 연결.
// 모든 값은 사용자가 입력한 완료 세트에서 계산한 '대략'이며 건강 상태를 판단하지 않는다.
import {workoutTotals, setWeightKg, estimate1RM} from './domain.js';
import {anatomySvg, MUSCLE_LABELS} from './exercise-ui.js';
import {EXERCISE_CATALOG} from './catalog.js';
import {lineChart} from './band-chart.js';

const h = v => String(v??'').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const n0 = (v, d=0) => Number(v||0).toLocaleString('ko-KR', {maximumFractionDigits:d});
const josa = w => { const c=String(w??'').trim().slice(-1).charCodeAt(0); return c>=0xAC00&&c<=0xD7A3&&(c-0xAC00)%28 ? '은' : '는'; };
const pad = n => String(n).padStart(2, '0');
export const ymd = d => `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
const at = (date, hh=12) => new Date(`${date}T${pad(hh)}:00:00`);
const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate()+n); return x; };
export const weekStart = d => { const x = new Date(d.getFullYear(), d.getMonth(), d.getDate()); const wd = (x.getDay()+6)%7; return addDays(x, -wd); };
const PARTS = ['가슴','등','어깨','팔','하체','복근'];
const MUSCLE_PART = {chest:'가슴',back:'등',erectors:'등',traps:'등',shoulders:'어깨',biceps:'팔',triceps:'팔',forearms:'팔',quads:'하체',hamstrings:'하체',glutes:'하체',calves:'하체',adductors:'하체',abs:'복근',obliques:'복근'};
const PUSH = new Set(['chest','shoulders','triceps']), PULL = new Set(['back','biceps','traps']);
const done = ex => (ex.sets||[]).filter(s => s.completed!==false && s.type!=='워밍업');
const primaryOf = e => e.primaryMuscleIds?.length ? e.primaryMuscleIds : (EXERCISE_CATALOG.find(x => x.id===e.exerciseId || x.name===e.name)?.primaryMuscleIds || []);
const partOf = e => { const p = primaryOf(e)[0]; return MUSCLE_PART[p] || (PARTS.includes(e.part) ? e.part : e.part==='전신' ? '하체' : null); };
const when = w => { const v = new Date(w.loggedAt || ''); return Number.isNaN(v.getTime()) ? at(w.date, 18) : v; };
const best1RM = ex => Math.max(0, ...done(ex).filter(s => s.type !== '웜업').map(s => estimate1RM(setWeightKg(s), Number(s.reps)||0)));
const exKey = e => e.exerciseId || e.name;

export function buildReport(db, now=new Date(), {focus=''}={}){
 const today = ymd(now), ws = (db.workouts||[]).filter(w => w.date<=today && !w.rest && !w.planned);
 const inRange = (from, to) => ws.filter(w => w.date>=ymd(from) && w.date<=ymd(to));
 const sum = list => list.reduce((s, w) => { const t = workoutTotals(w); s.sets += t.sets; s.volume += t.volume; return s; }, {sets:0, volume:0});
 // 이번 주(최근 7일)와 지난주
 const wk = inRange(addDays(now,-6), now), prev = inRange(addDays(now,-13), addDays(now,-7));
 const W = sum(wk), P = sum(prev);
 const sessions = new Set(wk.map(w => w.date)).size;
 const partSets = Object.fromEntries(PARTS.map(p => [p, 0]));
 let push = 0, pull = 0;
 for(const w of wk) for(const e of w.exercises||[]){ if(e.kind==='cardio') continue; const n = done(e).length, p = partOf(e); if(p) partSets[p] += n; const ids = primaryOf(e); if(ids.some(x => PUSH.has(x))) push += n; if(ids.some(x => PULL.has(x))) pull += n; }
 const topPart = Object.entries(partSets).sort((a, b) => b[1]-a[1])[0];
 // 부위별 마지막 운동일 → 오래 쉰 부위
 const lastPart = {};
 for(const w of ws) for(const e of w.exercises||[]){ const p = partOf(e); if(p && done(e).length && (!lastPart[p] || w.date > lastPart[p])) lastPart[p] = w.date; }
 const restDays = p => lastPart[p] ? Math.round((at(today) - at(lastPart[p]))/86400000) : null;
 const rested = ['등','가슴','하체','어깨','팔'].map(p => [p, restDays(p)]).filter(([, d]) => d!==null && d>=4).sort((a, b) => b[1]-a[1])[0] || null;
 const volDelta = P.volume>0 ? Math.round((W.volume-P.volume)/P.volume*100) : null;
 // 회복 지도(근육별 마지막 자극과 지난 시간)
 const lastHit = new Map();
 for(const w of ws) for(const e of w.exercises||[]){ if(e.kind==='cardio' || !done(e).length) continue; const t = when(w); for(const id of primaryOf(e)){ const prevT = lastHit.get(id); if(!prevT || t > prevT.t) lastHit.set(id, {t, sets:done(e).length}); } }
 const recovery = [...lastHit.entries()].map(([muscleId, x]) => { const hours = (now - x.t)/3600000; const state = hours < 48 ? 'recovering' : hours < 72 ? 'almost' : 'ready'; return {muscleId, hours, state, readyAt:new Date(x.t.getTime()+72*3600000)}; });
 const recLoads = recovery.filter(x => x.state!=='ready').map(x => ({muscleId:x.muscleId, score:x.state==='recovering'?6:3}));
 const soonest = recovery.filter(x => x.state==='recovering').sort((a, b) => a.readyAt-b.readyAt);
 // 이번 달 새 기록(이번 달 최고 추정 1RM이 그 전 최고보다 높으면)
 const monthStart = `${today.slice(0,7)}-01`, beforeBest = new Map(), monthBest = new Map();
 for(const w of ws) for(const e of w.exercises||[]){ if(e.kind==='cardio') continue; const b = best1RM(e); if(!b) continue; const k = exKey(e); const target = w.date>=monthStart ? monthBest : beforeBest; const cur = target.get(k); if(!cur || b > cur.e1rm){ const top = done(e).reduce((a, s) => estimate1RM(setWeightKg(s), Number(s.reps)||0) > estimate1RM(setWeightKg(a), Number(a.reps)||0) ? s : a, done(e)[0]); target.set(k, {name:e.name, e1rm:b, weight:top.originalWeight??top.weight, unit:top.originalUnit||top.unit||'kg', reps:top.reps}); } }
 const prs = [...monthBest.entries()].filter(([k, m]) => beforeBest.has(k) && m.e1rm > beforeBest.get(k).e1rm).map(([k, m]) => ({...m, gain:Math.round((m.e1rm-beforeBest.get(k).e1rm)*10)/10})).sort((a, b) => b.gain-a.gain);
 // 주 단위 연속(주 3회 이상 / 1회 이상)
 const weekCount = new Map(); for(const w of ws){ const k = ymd(weekStart(at(w.date))); weekCount.set(k, (weekCount.get(k)||new Set()).add(w.date)); }
 const streak = min => { let n = 0, d = weekStart(now); if((weekCount.get(ymd(d))?.size||0) < min) d = addDays(d, -7); while((weekCount.get(ymd(d))?.size||0) >= min){ n++; d = addDays(d, -7); } return n; };
 const streak3 = streak(3), streak1 = streak(1);
 // 성장: 가장 자주 한 종목(또는 고른 종목)의 주별 최고 추정 1RM, 12주
 // 4.18.0 같은 종목(exerciseId)은 머신·이름이 달라도 하나로 센다
 const freq = new Map(), label = new Map(); for(const w of inRange(addDays(now,-83), now)) for(const e of w.exercises||[]) if(e.kind!=='cardio'){ const k = exKey(e); if(!label.has(k)) label.set(k, EXERCISE_CATALOG.find(x => x.id && x.id===e.exerciseId)?.name || e.name); freq.set(k, (freq.get(k)||0) + done(e).length); }
 const keys = [...freq.entries()].sort((a, b) => b[1]-a[1]).map(x => x[0]), names = [...new Set(keys.map(k => label.get(k)))];
 const gName = names.includes(focus) ? focus : names[0] || '', gKeys = new Set(keys.filter(k => label.get(k)===gName));
 const weekly = []; for(let i = 11; i >= 0; i--){ const s = addDays(weekStart(now), -7*i), e = addDays(s, 6); let b = 0; for(const w of inRange(s, e)) for(const x of w.exercises||[]) if(gKeys.has(exKey(x))) b = Math.max(b, best1RM(x)); weekly.push({week:ymd(s), e1rm:b}); }
 const pts = weekly.filter(x => x.e1rm > 0);
 const growth = {name:gName, names, points:pts, change4w: pts.length>=2 ? Math.round((pts.at(-1).e1rm - (weekly.slice(0, 8).filter(x => x.e1rm).at(-1)?.e1rm ?? pts[0].e1rm))*10)/10 : null};
 // 꾸준함: 12주 × 7일
 const daySets = new Map(); for(const w of ws){ const t = workoutTotals(w); /* 유산소·필라테스만 한 날도 '움직인 날'로 칠한다 */ daySets.set(w.date, (daySets.get(w.date)||0) + Math.max(t.sets, (w.exercises||[]).length ? 1 : 0)); }
 const grid = []; const g0 = addDays(weekStart(now), -77); for(let i = 0; i < 84; i++){ const d = ymd(addDays(g0, i)); grid.push({date:d, sets:d>today ? -1 : daySets.get(d)||0}); }
 const monthDays = new Set(ws.filter(w => w.date>=monthStart).map(w => w.date)).size;
 // 이번 달 카드
 const mws = ws.filter(w => w.date>=monthStart), M = sum(mws);
 const mFreq = new Map(); for(const w of mws) for(const e of w.exercises||[]) if(e.kind!=='cardio') mFreq.set(e.name, (mFreq.get(e.name)||0) + done(e).length);
 const topEx = [...mFreq.entries()].sort((a, b) => b[1]-a[1])[0]?.[0] || '';
 // 식단·몸 연결(최근 30일)
 const d30 = ymd(addDays(now, -29)), goal = Number(db.settings?.proteinGoal)||0;
 const proteinByDay = new Map(); for(const m of db.meals||[]) if(m.date>=d30 && m.date<=today && !m.planned) proteinByDay.set(m.date, (proteinByDay.get(m.date)||0) + (Number(m.protein)||0));
 const proteinHit = goal ? [...proteinByDay.values()].filter(v => v >= goal*0.95).length : null;
 const bodyPts = (db.body||[]).filter(b => b.date>=d30 && b.date<=today && b.skeletalMuscle!=null).sort((a, b) => a.date.localeCompare(b.date));
 const smmChange = bodyPts.length>=2 ? Math.round((bodyPts.at(-1).skeletalMuscle - bodyPts[0].skeletalMuscle)*10)/10 : null;
 return {today, week:{sessions, sets:W.sets, volume:W.volume, volDelta, partSets, topPart:topPart&&topPart[1]>0?topPart[0]:null, push, pull, rested}, recovery, recLoads, soonest, prs, streak3, streak1, growth, grid, monthDays, month:{volume:M.volume, sets:M.sets, prs:prs.length, topEx, label:`${Number(today.slice(5,7))}월`}, diet:{goal, proteinHit, mealDays:proteinByDay.size, smmChange, bodyPts}};
}

// ── 화면 ──
const HEAD = {가슴:'가슴을 제대로 채운', 등:'등을 넓힌', 어깨:'어깨에 공들인', 팔:'팔에 집중한', 하체:'하체에 진심인', 복근:'코어를 다진'};
export function headline(r){
 if(!r.week.sessions) return r.streak1 ? '이번 주는 아직 쉬는 중이에요' : '첫 운동을 기록해 볼까요?';
 return `${HEAD[r.week.topPart] || '꾸준히 움직인'} 한 주였어요`;
}
const timeWord = d => { const now = new Date(), days = Math.round((new Date(d.getFullYear(), d.getMonth(), d.getDate()) - new Date(now.getFullYear(), now.getMonth(), now.getDate()))/86400000); const part = d.getHours() < 12 ? '오전' : d.getHours() < 18 ? '오후' : '저녁'; return `${days<=0?'오늘':days===1?'내일':days===2?'모레':`${days}일 뒤`} ${part}`; };

export function reportHTML(r, {exerciseOptions=[], grass='', only=null}={}){
 const w = r.week, tons = v => v >= 1000 ? `${n0(v/1000, 1)}t` : `${n0(v)}kg`;
 const story = `<section class="ar-card ar-hi"><p class="ar-eyebrow">이번 주 리포트 · 최근 7일</p><h2 class="ar-h">${h(headline(r))}</h2>${w.sessions?`<p class="ar-big">${w.sessions}회 · ${n0(w.sets)}세트 · ${tons(w.volume)}</p><p>${w.volDelta===null?'지난주 기록이 없어 비교는 다음 주부터예요.':`지난주보다 볼륨 <b class="${w.volDelta>=0?'up':'down'}">${w.volDelta>=0?'+':''}${w.volDelta}%</b>.`}${r.prs[0]?` ${h(r.prs[0].name)} 추정 최대 <b class="up">+${n0(r.prs[0].gain,1)}kg</b>.`:''}</p>`:''}${w.rested?`<p class="ar-warn">${h(w.rested[0])}${josa(w.rested[0])} ${w.rested[1]}일째 쉬고 있어요. 오늘은 ${h(w.rested[0])} 운동이 좋아요.</p>`:''}<div class="ar-actions"><button type="button" class="button" id="apply-recommendation">오늘 추천 운동으로 시작</button></div></section>`;
 const recover = `<section class="ar-card"><div class="ar-head"><b>회복 지도</b><small>최근 자극 · 지난 시간</small></div>${r.recovery.length?`<div class="ar-body">${anatomySvg([], [], {side:'front', mode:'load', loads:r.recLoads, key:'ar-f'})}${anatomySvg([], [], {side:'back', mode:'load', loads:r.recLoads, key:'ar-b'})}</div><p class="ar-legend"><i class="d r"></i>회복 중(2일 안) <i class="d o"></i>거의 회복 <i class="d g"></i>준비됨</p>${r.soonest[0]?`<p class="ar-hint">${(t=>h(t)+josa(t))([...new Set(r.soonest.slice(0,2).map(x => MUSCLE_LABELS[x.muscleId]))].join('·'))} ${timeWord(r.soonest[0].readyAt)}쯤 다시 준비돼요.</p>`:'<p class="ar-hint">지금은 모든 부위가 준비돼 있어요.</p>'}`:'<p class="ar-hint">운동을 기록하면 부위별 회복 상태가 보여요.</p>'}<p class="ar-note">마지막 자극 뒤 48시간은 ‘회복 중’, 72시간까지 ‘거의 회복’으로 보는 일반적인 기준이에요.</p></section>`;
 const badges = [...r.prs.slice(0, 2).map(p => `<div class="ar-pr"><span aria-hidden="true">🏆</span><b>${h(p.name)}</b><small>${n0(p.weight,1)}${h(p.unit)} × ${p.reps} · 추정 ${n0(p.e1rm,1)}kg</small></div>`), ...(r.streak3>=2?[`<div class="ar-pr"><span aria-hidden="true">🔥</span><b>${r.streak3}주 연속</b><small>주 3회 이상</small></div>`]:r.streak1>=2?[`<div class="ar-pr"><span aria-hidden="true">🔥</span><b>${r.streak1}주 연속</b><small>매주 운동</small></div>`]:[])];
 const prs = `<section class="ar-card"><div class="ar-head"><b>이번 달 새 기록</b><small>${r.prs.length}개</small></div>${badges.length?`<div class="ar-prs">${badges.join('')}</div>`:'<p class="ar-hint">이번 달은 아직 새 기록이 없어요. 지난 최고 기록보다 조금만 더 들어 보세요.</p>'}</section>`;
 const g = r.growth;
 const growth = `<section class="ar-card"><div class="ar-head"><b>${h(g.name||'종목')} 성장</b><small>추정 최대 중량 · 12주</small></div>${exerciseOptions.length>1?`<label class="field ar-pick">종목<select id="ar-exercise">${exerciseOptions.map(n => `<option ${n===g.name?'selected':''}>${h(n)}</option>`).join('')}</select></label>`:''}${g.points.length>=2?`${lineChart({vals:g.points.map(x => x.e1rm), color:'#8ce4e0', h:110, tips:g.points.map(x => `<span class="d">${Number(x.week.slice(5,7))}/${Number(x.week.slice(8,10))} 주</span><b>추정 ${n0(x.e1rm,1)}kg</b>`), dateL:'12주 전', dateR:'이번 주', label:`${g.name} 추정 최대 중량 12주 그래프`})}<p class="ar-hint">${g.change4w===null?'':g.change4w>0?`한 달 전보다 <b class="up">+${n0(g.change4w,1)}kg</b>.`:g.change4w<0?`한 달 전보다 ${n0(g.change4w,1)}kg. 컨디션·자세 점검 시기일 수 있어요.`:'한 달 전과 같아요.'} 지금 추정 ${n0(g.points.at(-1).e1rm,1)}kg.</p>`:'<p class="ar-hint">같은 종목을 두 주 이상 기록하면 성장 그래프가 그려져요.</p>'}<p class="ar-note">추정 최대 중량(Epley 공식)은 실제 1회 최대와 다를 수 있어요.</p></section>`;
 const maxSets = Math.max(26, ...Object.values(w.partSets));
 const balance = `<section class="ar-card"><div class="ar-head"><b>부위 균형</b><small>최근 7일 세트 · 회색 띠 = 권장 10~20</small></div>${PARTS.map(p => { const v = w.partSets[p], s = v < 10 ? 'low' : v > 20 ? 'high' : 'ok'; return `<div class="ar-sb"><span>${p}</span><div class="ar-sbar"><i class="band" style="left:${10/maxSets*100}%;width:${10/maxSets*100}%"></i><b class="${s}" style="width:${Math.min(v, maxSets)/maxSets*100}%"></b></div><em class="${s}">${v}세트</em></div>`; }).join('')}<p class="ar-hint">${w.push+w.pull?`밀기 ${w.push} : 당기기 ${w.pull}${w.pull*1.5 < w.push?' — 등 운동을 2~3세트씩 더해 보세요.':w.push*1.5 < w.pull?' — 가슴·어깨 밀기 운동을 조금 더해 보세요.':' — 균형이 좋아요.'}`:'이번 주 근력 운동 기록이 쌓이면 균형을 보여 줘요.'}</p><p class="ar-note">부위별 주 10~20세트는 근육을 키우는 데 흔히 쓰는 범위예요(사람마다 달라요).</p></section>`;
 const heat = grass ? `<section class="ar-card ar-grass">${grass}<p class="ar-hint">이번 달 ${r.monthDays}일 운동${r.streak1?` · 매주 운동 ${r.streak1}주째`:''}</p></section>` : `<section class="ar-card"><div class="ar-head"><b>꾸준함</b><small>최근 12주</small></div><div class="ar-heat" role="img" aria-label="최근 12주 운동한 날">${r.grid.map(c => `<i class="${c.sets<0?'f':c.sets>=20?'h3':c.sets>=10?'h2':c.sets>0?'h1':''}" title="${c.date}${c.sets>0?` · ${c.sets}세트`:''}"></i>`).join('')}</div><p class="ar-hint">이번 달 ${r.monthDays}일 운동${r.streak1?` · 매주 운동 ${r.streak1}주째`:''}</p></section>`;
 const suv = Math.round(r.month.volume/2000);
 const card = `<section class="ar-card ar-share" id="ar-share-card"><p class="ar-eyebrow">${h(r.month.label)} 리포트 카드</p><p class="ar-big">이번 달 들어 올린 무게</p><p class="ar-huge">${tons(r.month.volume)}</p>${suv>=1?`<p>= 중형 SUV ${suv}대 🚙</p>`:''}<p class="ar-hint">새 기록 ${r.month.prs}개${r.month.topEx?` · 가장 많이 한 운동 ${h(r.month.topEx)}`:''}</p><button type="button" class="button secondary" id="ar-share">이미지로 저장</button></section>`;
 const d = r.diet;
 const diet = `<section class="ar-card"><div class="ar-head"><b>식단·수치와 함께 보기</b><small>최근 30일</small></div><p>${d.goal?`단백질 목표를 채운 날 <b>${d.proteinHit}/${d.mealDays||0}일</b>`:'단백질 목표를 정하면 채운 날을 세어 줘요'}${d.smmChange!==null?(d.smmChange===0?' · 골격근량 변화 없음':` · 골격근량 <b class="${d.smmChange>0?'up':'down'}">${d.smmChange>0?'+':''}${n0(d.smmChange,1)}kg</b>`):''}</p>${d.bodyPts.length>=2?lineChart({vals:d.bodyPts.map(b => b.skeletalMuscle), color:'#6fd6a3', h:80, tips:d.bodyPts.map(b => `<span class="d">${Number(b.date.slice(5,7))}/${Number(b.date.slice(8,10))}</span><b>골격근량 ${n0(b.skeletalMuscle,1)}kg</b>`), label:'최근 30일 골격근량 그래프'}):'<p class="ar-hint">인바디(골격근량)를 두 번 이상 기록하면 운동·식단과 함께 변화를 보여 줘요.</p>'}</section>`;
 // 5.0.4 only: 분석 페이지는 리포트 카드만(나머지는 운동 페이지로)
 const parts = {story, recover, prs, growth, balance, heat, card, diet};
 return `<div class="ar">${(only || Object.keys(parts)).map(k => parts[k] || '').join('')}</div>`;
}

// 리포트 카드를 PNG로 그린다(브라우저 전용).
export function drawShareCard(r){
 const c = document.createElement('canvas'); c.width = 1080; c.height = 1350; const x = c.getContext('2d');
 const g = x.createLinearGradient(0, 0, 1080, 1350); g.addColorStop(0, '#1d2a44'); g.addColorStop(1, '#101625'); x.fillStyle = g; x.fillRect(0, 0, 1080, 1350);
 x.fillStyle = 'rgba(184,170,242,.18)'; x.beginPath(); x.arc(880, 220, 320, 0, Math.PI*2); x.fill();
 const font = (s, w=700) => `${w} ${s}px MylogueSUIT, 'Malgun Gothic', sans-serif`;
 x.textAlign = 'center'; x.fillStyle = '#8ce4e0'; x.font = font(40); x.fillText(`MYLOGUE · ${r.month.label} 리포트`, 540, 180);
 x.fillStyle = '#edf4f8'; x.font = font(56); x.fillText('이번 달 들어 올린 무게', 540, 420);
 x.fillStyle = '#8ce4e0'; x.font = font(200); x.fillText(r.month.volume >= 1000 ? `${(r.month.volume/1000).toFixed(1)}t` : `${Math.round(r.month.volume)}kg`, 540, 640);
 const suv = Math.round(r.month.volume/2000); x.fillStyle = '#edf4f8'; x.font = font(52, 600); if(suv >= 1) x.fillText(`= 중형 SUV ${suv}대`, 540, 760);
 x.fillStyle = '#a9bbce'; x.font = font(44, 600); x.fillText(`새 기록 ${r.month.prs}개 · 운동 ${r.monthDays}일`, 540, 900); if(r.month.topEx) x.fillText(`가장 많이 한 운동 ${r.month.topEx}`, 540, 970);
 x.fillStyle = '#7f93ab'; x.font = font(34, 400); x.fillText('기록이 쉬워지면, 변화가 보입니다.', 540, 1240);
 return c;
}
