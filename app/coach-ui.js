// 3.18.2 AI 인사이트(프리미엄) 틀: 오늘 남은 식단 · 다음 운동 · 주간 코칭 · 체중 흐름.
// 대표님 결정: 나중에 AI 서버(ai-worker)와 구독이 준비되면 프리미엄 사용자만 쓴다.
// 지금은 '예시 화면'을 보여 준다. 사용자의 실제 기록 숫자(목표·오늘 먹은 양·최근 쓴 부위·자주 하는 종목·체중)를
// 예시 안에 넣어 '내 몸에 맞춰진다'는 느낌을 준다. 아래로 갈수록 흐려지고 '추후 공개 · 프리미엄' 막이 덮는다. 누를 수 있는 기능은 없다.
// 켤 때: COACH_ENABLED와 사용자의 구독 여부(premium)를 함께 확인하고, ai-worker에 /coach 엔드포인트를 더한다.
import {mealTotals, actualDB} from './domain.js';
import {todayMuscleLoads} from './timeline-view.js';
import {MUSCLE_LABELS} from './exercise-ui.js';
import {scaleRecords, inbodyRecords} from './body-series.js';

export const COACH_ENABLED = false;
const esc = v => String(v??'').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const n0 = v => Math.round(Number(v)||0).toLocaleString('ko-KR');
const n1 = v => (Math.round((Number(v)||0)*10)/10).toLocaleString('ko-KR');
const shift = (date, k) => { const d = new Date(`${date}T12:00:00`); d.setDate(d.getDate()+k); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; };
const WD = '일월화수목금토';

// 사용자의 기록에서 예시에 넣을 숫자를 뽑는다(없으면 예시 값).
export function coachFacts(db={}, today){
 const a = actualDB(db), s = db.settings||{};
 const from14 = shift(today, -13), from28 = shift(today, -27);
 const meals14 = new Set((a.meals||[]).filter(m => m.date>=from14 && m.date<=today).map(m => m.mealGroupId||`${m.date}|${m.slot}`)).size;
 const works14 = (a.workouts||[]).filter(w => w.date>=from14 && w.date<=today && !w.rest).length;
 const sc = scaleRecords(db), ib = inbodyRecords(db);
 const weigh14 = sc.filter(b => b.date>=from14).length, inbody = ib.length;
 const eaten = mealTotals((a.meals||[]).filter(m => m.date===today));
 const goal = {kcal:Number(s.calorieGoal)||2200, protein:Number(s.proteinGoal)||140, carbs:Number(s.carbsGoal)||250, fat:Number(s.fatGoal)||65};
 const left = {kcal:Math.max(0, goal.kcal-(eaten.calories||0)), protein:Math.max(0, goal.protein-(eaten.protein||0)), carbs:Math.max(0, goal.carbs-(eaten.carbs||0)), fat:Math.max(0, goal.fat-(eaten.fat||0))};
 const proteinPct = goal.protein ? Math.round((eaten.protein||0)/goal.protein*100) : 0;
 const recent = (a.workouts||[]).filter(w => w.date>=shift(today, -3) && w.date<today && !w.rest);
 const tired = todayMuscleLoads(recent).filter(x => x.score>=3).map(x => MUSCLE_LABELS[x.muscleId]).filter(Boolean).slice(0, 3);
 // 자주 하는 근력 종목과 마지막 최고 무게 → 다음 목표
 const freq = new Map();
 for(const w of (a.workouts||[]).filter(w => w.date>=from28)) for(const e of w.exercises||[]){ if(e.kind==='cardio') continue; const best = Math.max(0, ...(e.sets||[]).filter(x => x.completed!==false).map(x => Number(x.weight)||0)); const f = freq.get(e.name) || {name:e.name, n:0, best:0, unit:(e.sets||[])[0]?.unit||'kg', date:''}; f.n++; if(w.date>=f.date){ f.best = best; f.date = w.date; } freq.set(e.name, f); }
 const top = [...freq.values()].sort((x, y) => y.n-x.n)[0] || null;
 const w7 = sc.filter(b => b.date>shift(today, -7)), w14 = sc.filter(b => b.date>shift(today, -14) && b.date<=shift(today, -7));
 const avg = list => list.length ? list.reduce((t, b) => t+Number(b.weight), 0)/list.length : null;
 const trend = avg(w7)!=null && avg(w14)!=null ? avg(w7)-avg(w14) : null;
 const target = Number(s.nutritionProfile?.targetWeight) || null, nowW = sc.at(-1)?.weight ?? null;
 const days7 = [6,5,4,3,2,1,0].map(k => { const d = shift(today, -k); const ws = (a.workouts||[]).filter(w => w.date===d); return {wd:WD[new Date(`${d}T12:00:00`).getDay()], done:ws.some(w => !w.rest), rest:ws.some(w => w.rest), today:k===0}; });
 return {meals14, works14, weigh14, inbody, eaten, goal, left, proteinPct, tired, top, trend, target, nowW, days7, muscleNow:ib.at(-1)?.skeletalMuscle ?? null, muscleOld:ib.filter(b => b.date<=shift(today, -21)).at(-1)?.skeletalMuscle ?? null};
}

export function coachHTML({enabled = COACH_ENABLED, premium = false, db = {}, today = '', name = '나'} = {}){
 const open = enabled && premium;
 if(open) return `<section class="section coach" aria-labelledby="coach-title"><div class="coach-head"><h3 id="coach-title"><span class="coach-spark" aria-hidden="true">✦</span>AI 인사이트</h3><span class="coach-badge">프리미엄</span></div><div class="actions"><button type="button" class="button" data-coach="meal">오늘 남은 식단 제안</button><button type="button" class="button secondary" data-coach="workout">다음 운동 제안</button></div><div id="coach-result" aria-live="polite"></div></section>`;
 const date = today || new Date().toISOString().slice(0, 10), f = coachFacts(db, date);
 const who = name && name!=='내 계정' && name!=='나' ? `${name}님` : '내', whoSub = who==='내' ? '내' : who;
 const dLabel = `${Number(date.slice(5,7))}월 ${Number(date.slice(8,10))}일 ${WD[new Date(`${date}T12:00:00`).getDay()]}요일`;
 // 추천 메뉴: 남은 단백질에 맞춰 닭가슴살 양을 정한다(예시)
 const chicken = Math.min(200, Math.max(100, Math.round((f.left.protein-5)/0.31/10)*10));
 const pick = [{name:`닭가슴살 스테이크 ${chicken}g`, kcal:chicken*1.65, p:chicken*0.31, c:0, fat:chicken*0.036}, {name:'현미밥 ½공기', kcal:150, p:3, c:32, fat:1}, {name:'구운 채소 · 올리브유 1작은술', kcal:90, p:2, c:8, fat:5}];
 let short = f.left.protein - pick.reduce((t, x) => t+x.p, 0);
 if(short>12){ pick.push({name:'간식 · 프로틴 쉐이크 1잔', kcal:130, p:25, c:4, fat:2}); short -= 25; }
 if(short>10){ pick.push({name:'간식 · 그릭요거트 150g', kcal:110, p:15, c:6, fat:3}); }
 const sum = pick.reduce((t, x) => ({kcal:t.kcal+x.kcal, p:t.p+x.p, c:t.c+x.c, fat:t.fat+x.fat}), {kcal:0, p:0, c:0, fat:0});
 const after = [['칼로리', (f.eaten.calories||0)+sum.kcal, f.goal.kcal, 'kcal'], ['단백질', (f.eaten.protein||0)+sum.p, f.goal.protein, 'g'], ['탄수화물', (f.eaten.carbs||0)+sum.c, f.goal.carbs, 'g'], ['지방', (f.eaten.fat||0)+sum.fat, f.goal.fat, 'g']];
 const tiredTxt = f.tired.length ? f.tired.join('·') : '하체';
 const focus = f.tired.some(t => ['앞 허벅지','뒤 허벅지','둔근'].includes(t)) ? '등·이두' : f.tired.some(t => ['등'].includes(t)) ? '가슴·삼두' : '하체';
 const plan = focus==='등·이두' ? [['랫풀다운','4 × 10'],['시티드 케이블 로우','3 × 12'],['원암 덤벨 로우','3 × 10'],['바벨 컬','3 × 10']] : focus==='가슴·삼두' ? [['벤치프레스','4 × 8'],['인클라인 덤벨 프레스','3 × 10'],['펙덱 플라이','3 × 12'],['케이블 푸시다운','3 × 12']] : [['스쿼트','4 × 8'],['레그 프레스','3 × 12'],['루마니안 데드리프트','3 × 10'],['레그 컬','3 × 12']];
 const top = f.top ? `<li class="coach-pr"><b>${esc(f.top.name)}</b> 최근 ${n1(f.top.best)}${esc(f.top.unit)} · 반복을 다 채웠어요 → <em>다음엔 ${n1(f.top.best+2.5)}${esc(f.top.unit)} 도전</em></li>` : '';
 const trendTxt = f.trend!=null ? `7일 평균 ${f.trend>0?'+':''}${n1(f.trend)}kg` : '7일 평균 −0.4kg';
 const eta = f.target && f.nowW && f.trend && f.trend<0 ? (() => { const weeks = (f.nowW-f.target)/(-f.trend); if(!(weeks>0 && weeks<104)) return ''; const d = shift(date, Math.round(weeks*7)); return `지금 속도면 <b>${Number(d.slice(5,7))}월 ${Number(d.slice(8,10))}일</b>쯤 목표 ${n1(f.target)}kg에 닿아요`; })() : '지금 속도면 <b>12월 말</b>쯤 목표 체중에 닿아요';
 const bar = ([l, v, g, u]) => { const pct = g ? Math.round(v/g*100) : 0; return `<div class="cbar"><span>${l}</span><i><b style="width:${Math.min(100, pct)}%"></b></i><em>${pct}%</em></div>`; };
 return `<section class="section coach coach-teaser" aria-labelledby="coach-title"><div class="coach-head"><h3 id="coach-title"><span class="coach-spark" aria-hidden="true">✦</span>AI 인사이트</h3><span class="coach-badge">프리미엄 · 추후 공개</span></div>
<div class="coach-paper" aria-hidden="true">
<div class="coach-report-head"><div><small>${esc(dLabel)} · 오늘의 맞춤 코칭</small><b>${esc(who)} 몸에 맞춘 리포트</b></div><span class="coach-example">예시 화면</span></div>
<div class="coach-basis"><span>분석 근거</span><i>식사 ${f.meals14}끼</i><i>운동 ${f.works14}회</i><i>체중 ${f.weigh14}회</i><i>인바디 ${f.inbody}회</i><small>최근 14일</small></div>
<p class="coach-line">“단백질이 오늘 목표의 <b>${f.proteinPct}%</b>예요. 저녁 한 끼로 <b>${n0(f.left.protein)}g</b>을 채우면, 어제까지 쓴 <b>${esc(tiredTxt)}</b> 회복에도 도움이 돼요.”</p>
<article class="coach-block"><h4><span class="coach-num">1</span>오늘 남은 식단 · 저녁${pick.length>3?' + 간식':''}</h4><p class="coach-left">남은 목표 &nbsp;칼로리 ${n0(f.left.kcal)} · 단백질 ${n0(f.left.protein)}g · 탄수 ${n0(f.left.carbs)}g · 지방 ${n0(f.left.fat)}g</p><div class="coach-pick"><b>추천 구성</b><ul>${pick.map(x => `<li>${esc(x.name)}</li>`).join('')}</ul><small>약 ${n0(sum.kcal)} kcal · 단백질 ${n0(sum.p)}g</small></div><p class="coach-sub">추천대로 먹으면 오늘 하루</p><div class="cbars">${after.map(bar).join('')}</div><p class="coach-tip">대안: 연어 포케 볼(단백질 38g) · 편의점이면 닭가슴살 2팩 + 삶은 달걀</p></article>
<article class="coach-block"><h4><span class="coach-num">2</span>다음 운동 · 오늘 ${esc(focus)}</h4><p><b>${esc(tiredTxt)}</b> 부위는 아직 회복 중이라, 오늘은 <b>${esc(focus)}</b> 운동을 추천해요.</p><table class="coach-plan"><tbody>${plan.map(([x, y]) => `<tr><td>${esc(x)}</td><td>${esc(y)}</td></tr>`).join('')}</tbody></table><ul class="coach-notes">${top}<li>세트 사이 휴식 90초 · 마지막 세트는 2회 여유를 남기기</li></ul></article>
<article class="coach-block"><h4><span class="coach-num">3</span>이번 주 코칭</h4><div class="coach-week">${f.days7.map(d => `<span class="${d.done?'done':d.rest?'rest':''}${d.today?' today':''}"><b>${d.wd}</b><i></i></span>`).join('')}</div><ul><li>이번 주 ${f.days7.filter(d => d.done).length}회 운동 · 목표 주 4회까지 ${Math.max(0, 4-f.days7.filter(d => d.done).length)}회 남았어요</li><li>가슴 세트가 지난주보다 줄었어요. 금요일에 가슴·삼두를 넣어 볼까요?</li><li>잠이 짧았던 날은 무게를 10% 낮추는 걸 권해요</li></ul></article>
<article class="coach-block"><h4><span class="coach-num">4</span>체중 흐름 해석</h4><ul><li>${trendTxt} · 목표 속도(주 −0.5kg) 안에 있어요</li><li>${eta}</li><li>${f.muscleNow!=null&&f.muscleOld!=null?`인바디 골격근량 ${f.muscleNow-f.muscleOld>=0?'+':''}${n1(f.muscleNow-f.muscleOld)}kg(3주 전 대비)`:'탄수화물이 많은 다음 날 체중이 오르는 패턴(수분)이 보여요'}</li></ul></article>
</div>
<div class="coach-veil"><span class="coach-spark big" aria-hidden="true">✦</span><b>프리미엄 · 추후 공개</b><p>${esc(who==='내'?'내':who+'의')} 식단·운동·수치 기록을 매일 읽고, 오늘 남은 식단과 다음 운동을 ${esc(whoSub)} 몸에 맞춰 코칭해 드려요.</p><ul class="coach-perks"><li>남은 끼니 메뉴 · 탄단지 맞춤</li><li>회복 부위를 피한 운동 플랜</li><li>내 기록 기반 무게 진행</li><li>체중 목표 도달 예측</li></ul><span class="coach-soon">준비 중이에요</span></div>
</section>`;
}
