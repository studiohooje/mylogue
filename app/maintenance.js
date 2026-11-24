// 4.18.0 나만의 유지칼로리(대표님 2026-11-24): 공식(남들 평균)이 아니라 내 기록으로 만든 유지칼로리.
// 사용자에게는 '헤일로 N번'으로 쉽게 보여 주고, 안에서는 아래처럼 더 꼼꼼히 계산한다(설명할 필요는 없음).
//  ① 최근 8주(56일)만 본다. 오래된 기록은 지금 몸과 다르다. 최근일수록 무게를 더 준다(반감기 21일).
//  ② 섭취: '다 적은 날'만 — 그날 열량이 내 평소(중앙값)의 60% 미만이거나 800kcal 미만이면 덜 적은 날로 보고 뺀다.
//  ③ 체중: 하루 값 대신 추세선(가중 회귀)의 기울기. 물·염분 출렁임(±1~2kg)을 걸러 낸다.
//  ④ 내 유지칼로리 ≈ 평균 섭취 − 체중 기울기 × 7,700kcal/kg. 섭취를 매번 비슷하게 덜 적어도 그 오차는 상쇄된다.
//  ⑤ 공식 값(KDRI)을 처음 값으로 두고, 기록이 쌓여 오차가 줄수록 내 기록 쪽으로 옮긴다(갑자기 튀지 않게).
//  ⑥ 단계: 헤일로 21번 '가닥', 28번 '나만의 유지칼로리', 42번 '꽤 정확' — 단, 오차·체중 횟수·기간 조건을 함께 채워야 오른다.
//  ⑦ 최근 기록이 부족하면 예전에 계산된 값을 '대략·부정확'으로 보여 준다(몇 주 전 기록인지와 함께).
// 숫자 근거: 하루 체중 오차 약 0.6kg로 보면 기울기 오차가 3주 ±200, 4주 ±130, 6주 ±70kcal 안팎(어림, 실제 기록으로 다시 확인할 것).
const DAY = 86400000, WINDOW = 56, HALF = 21, KCAL_PER_KG = 7700;
export const HALO_STEPS = [21, 28, 42];
const toT = s => new Date(String(s).slice(0, 10) + 'T12:00:00').getTime();
const ymd = t => { const d = new Date(t); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
const r50 = n => Math.round(n / 50) * 50;

// 하루 섭취 합계(예정 기록 제외)
function intakeByDay(db){ const m = new Map(); for(const x of db.meals||[]){ if(x.planned) continue; const k = Number(x.calories ?? x.kcal); if(!(k >= 0)) continue; m.set(x.date, (m.get(x.date)||0) + k); } return m; }
function weightsByDay(db){ const m = new Map(); for(const b of db.body||[]) if(Number(b.weight) > 0) m.set(b.date, Number(b.weight)); return m; }
// 4.23.0 체중이 흔들릴 만한 일: 그날 꼬리표(생리·짠 음식·아픔)는 덜 믿고, 약 용량·크레아틴은 체중 높이가 한 번에 바뀌는 '계단'으로 본다
const SOFT = new Set(['period', 'salty', 'sick']), STEP = new Set(['med', 'creatine']);
function flagsByDay(db){ const m = new Map(); for(const b of db.body||[]) if(Array.isArray(b.flags)) m.set(b.date, new Set([...(m.get(b.date)||[]), ...b.flags])); return m; }
// 가중 최소제곱(작은 연립방정식) — 기울기와 계단 높이를 함께 맞춘다
function wls(rows, cols){ const k = cols, A = Array.from({length: k}, () => Array(k).fill(0)), y = Array(k).fill(0); for(const {x, kg, w} of rows){ for(let i = 0; i < k; i++){ y[i] += w * x[i] * kg; for(let j = 0; j < k; j++) A[i][j] += w * x[i] * x[j]; } } for(let i = 0; i < k; i++){ let p = i; for(let r = i + 1; r < k; r++) if(Math.abs(A[r][i]) > Math.abs(A[p][i])) p = r; [A[i], A[p]] = [A[p], A[i]]; [y[i], y[p]] = [y[p], y[i]]; if(Math.abs(A[i][i]) < 1e-12) return null; for(let r = 0; r < k; r++){ if(r === i) continue; const f = A[r][i] / A[i][i]; for(let c = i; c < k; c++) A[r][c] -= f * A[i][c]; y[r] -= f * y[i]; } } return y.map((v, i) => v / A[i][i]); }
// 헤일로: 몸·식사·운동(의도적 휴식 포함) 세 가지를 다 적은 날
export function haloDays(db, from, to){
 const has = k => new Set(k.filter(Boolean)), body = has((db.body||[]).map(b => b.date)), meal = has((db.meals||[]).filter(m => !m.planned).map(m => m.date)), work = has((db.workouts||[]).filter(w => !w.planned).map(w => w.date));
 let n = 0; for(let t = toT(from); t <= toT(to); t += DAY){ const d = ymd(t); if(body.has(d) && meal.has(d) && work.has(d)) n++; } return n;
}

// end 날짜 기준 한 번 계산(조건이 안 되면 ok:false와 무엇이 부족한지)
export function estimateAt(db, end, formula = null){
 const endT = toT(end), from = ymd(endT - (WINDOW - 1) * DAY);
 const w = t => Math.pow(0.5, (endT - t) / DAY / HALF);
 // 4.27.0 전수검사 C-05: '의도적 단식'으로 표시한 날은 0kcal로 넣고, '다 적었어요'로 표시한 날은 적게 먹었어도 버리지 않는다(간헐적 단식이면 값이 수백 kcal 높게 나왔다)
 const states = db.dayStates || {}, byDay = intakeByDay(db);
 for(const [d, st] of Object.entries(states)) if(st === 'fasting' && d >= from && d <= end && !byDay.has(d)) byDay.set(d, 0);
 const intake = [...byDay].filter(([d]) => d >= from && d <= end);
 const med = intake.length ? [...intake.map(x => x[1])].sort((a, b) => a - b)[Math.floor(intake.length / 2)] : 0;
 const low = ([, k]) => k < 800 || k < med * 0.6, lowByDow = new Map();
 for(const x of intake) if(low(x)){ const dw = new Date(toT(x[0])).getUTCDay(); lowByDow.set(dw, (lowByDow.get(dw) || 0) + 1); }
 // 4.27.0 재검사 C-05: 단식일을 표시하지 않아도 같은 요일에 3번 이상 되풀이되면 계획된 낮은 날로 보고 넣는다
 const planned = ([d]) => (lowByDow.get(new Date(toT(d)).getUTCDay()) || 0) >= 3;
 const full = intake.filter(x => states[x[0]] === 'fasting' || states[x[0]] === 'complete' || !low(x) || planned(x));
 const weights = [...weightsByDay(db)].filter(([d]) => d >= from && d <= end).map(([d, kg]) => ({t: toT(d), kg})).sort((a, b) => a.t - b.t); // 4.27.0 전수검사 C-01: 날짜순으로(지난 날짜 체중을 나중에 넣거나 동기화 병합 뒤 순서가 섞이면 기간이 음수가 되어 '수집 중'으로 돌아갔다)
 const halos = haloDays(db, from, end);
 const span = weights.length ? Math.round((weights.at(-1).t - weights[0].t) / DAY) : 0, lastGap = weights.length ? Math.round((endT - Math.max(...weights.map(x => x.t))) / DAY) : 99;
 const facts = {halos, intakeDays: full.length, weighIns: weights.length, span, lastGap, from, end};
 if(full.length < 14 || weights.length < 10 || span < 18 || lastGap > 10) return {ok: false, ...facts};
 // 가중 평균 섭취
 let sw = 0, si = 0; for(const [d, k] of full){ const x = w(toT(d)); sw += x; si += x * k; } const meanIn = si / sw;
 let sv = 0; for(const [d, k] of full){ const x = w(toT(d)); sv += x * (k - meanIn) ** 2; } const sdIn = Math.sqrt(sv / sw), seIn = sdIn / Math.sqrt(full.length);
 // 가중 회귀(체중 ~ 날짜). 4.23.0: 꼬리표 날은 덜 믿고(0.3), 갑자기 튄 체중은 자동으로 덜 믿고(허버 가중 3회),
 // 약 용량·크레아틴 시작이 있으면 그 뒤 7일은 빼고 체중 높이가 바뀐 계단을 함께 맞춘다(기울기만 쓴다).
 const fl = flagsByDay(db), stepDays = [...fl].filter(([d, f]) => d >= from && d <= end && [...f].some(x => STEP.has(x))).map(([d]) => toT(d)).sort((a, b) => a - b);
 const stepAt = stepDays.at(-1) || 0, pts = weights.filter(p => !stepAt || p.t < stepAt || p.t >= stepAt + 7 * DAY);
 const useStep = stepAt && pts.some(p => p.t < stepAt) && pts.filter(p => p.t >= stepAt + 7 * DAY).length >= 3;
 const tm = pts.reduce((a, p) => a + p.t, 0) / pts.length;
 let rows = pts.map(p => { const d = ymd(p.t), f = fl.get(d); return {x: [1, (p.t - tm) / DAY, ...(useStep ? [p.t >= stepAt ? 1 : 0] : [])], kg: p.kg, base: w(p.t) * (f && [...f].some(x => SOFT.has(x)) ? 0.3 : 1), t: p.t}; });
 let coef = null;
 for(let it = 0; it < 4; it++){ rows = rows.map(r => ({...r, w: r.base * (r.hub ?? 1)})); coef = wls(rows, useStep ? 3 : 2); if(!coef) break; rows = rows.map(r => { const res = r.kg - r.x.reduce((a, v, i) => a + v * coef[i], 0); return {...r, res, hub: Math.min(1, 0.8 / Math.max(1e-6, Math.abs(res)))}; }); }
 if(!coef) return {ok: false, ...facts};
 const slope = coef[1], W = rows.reduce((a, r) => a + r.w, 0), rss = rows.reduce((a, r) => a + r.w * (r.res ?? 0) ** 2, 0);
 const mtd = rows.reduce((a, r) => a + r.w * r.x[1], 0) / W, sxx = rows.reduce((a, r) => a + r.w * (r.x[1] - mtd) ** 2, 0);
 const sdW = Math.max(0.35, Math.sqrt(rss / W)), neff = W * W / rows.reduce((a, r) => a + r.w ** 2, 0);
 const seSlope = sdW / Math.sqrt(sxx / W * neff) * (useStep ? 1.15 : 1);
 facts.adjusted = {soft: rows.filter(r => r.base < w(r.t)).length, step: useStep ? ymd(stepAt) : '', dropped: weights.length - pts.length};
 const obs = meanIn - slope * KCAL_PER_KG, seObs = Math.sqrt((seSlope * KCAL_PER_KG) ** 2 + seIn ** 2);
 // 공식 값과 합치기(공식은 ±300kcal 정도 틀릴 수 있다고 봄)
 const prior = Number(formula) > 0 ? Number(formula) : null, sp = 300;
 const kcal = prior ? (prior / sp ** 2 + obs / seObs ** 2) / (1 / sp ** 2 + 1 / seObs ** 2) : obs, se = prior ? Math.sqrt(1 / (1 / sp ** 2 + 1 / seObs ** 2)) : seObs;
 const byHalo = halos >= HALO_STEPS[2] ? 3 : halos >= HALO_STEPS[1] ? 2 : halos >= HALO_STEPS[0] ? 1 : 0, byErr = seObs <= 100 ? 3 : seObs <= 160 ? 2 : seObs <= 260 ? 1 : 0;
 // 4.27.0 전수검사 C-06: 결과가 공식값의 ±40% 밖이거나 체중이 주 1.5kg 넘게 변하면 계산을 보류(덜 적은 식단·물 체중이면 1,250kcal '꽤 정확' 같은 값이 나왔다)
 const weeklyKg = Math.abs(slope * 7), implausible = weeklyKg > 1.5 || (prior ? (kcal < prior * 0.6 || kcal > prior * 1.4) : (kcal < 1400 || kcal > 4500));
 if(implausible && !prior) facts.noFormula = true;
 const level = implausible ? 0 : Math.min(byHalo, byErr);
 if(implausible) facts.implausible = true;
 return {ok: level > 0, level, kcal: r50(kcal), lo: r50(Math.max(0, kcal - 1.28 * se)), hi: r50(kcal + 1.28 * se), observed: Math.round(obs), seObs: Math.round(seObs), slopeKgWeek: Math.round(slope * 7 * 100) / 100, meanIntake: Math.round(meanIn), ...facts};
}

// 지금 보여 줄 것: 오늘 기준으로 되면 'ready', 안 되면 예전(최대 26주 전)에 됐던 값을 'stale'로, 그것도 없으면 'collecting'
export function myMaintenance(db, today, formula = null){
 const now = estimateAt(db, today, formula);
 if(now.ok) return {status: 'ready', ...now, formula};
 for(let wk = 1; wk <= 26; wk++){
  const end = ymd(toT(today) - wk * 7 * DAY), past = estimateAt(db, end, formula);
  if(past.ok) return {status: 'stale', ...past, weeksAgo: wk, now, formula};
 }
 return {status: 'collecting', ...now, formula};
}

// 진행 막대·남은 것
export function progressOf(m){
 const target = HALO_STEPS[1], pct = Math.min(1, (m.status === 'stale' ? m.now.halos : m.halos) / target);
 const f = m.status === 'stale' ? m.now : m, need = [];
 if(f.weighIns < 10) need.push(`체중 기록 ${10 - f.weighIns}번 더`);
 if(f.intakeDays < 14) need.push(`식단을 다 적은 날 ${14 - f.intakeDays}일 더`);
 if(f.weighIns && f.lastGap > 10) need.push('최근 열흘 안의 체중 기록');
 if(f.implausible) need.push('값이 평소와 너무 달라 계산을 잠시 미뤘어요(식단을 덜 적었거나 체중이 물로 크게 출렁였을 수 있어요)');
 if(f.noFormula) need.push('식단 목표에서 키·나이를 적으면 이 값이 맞는지 더 잘 확인할 수 있어요');
 return {pct, halos: f.halos, target, need};
}

const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));
const n0 = n => Number(n || 0).toLocaleString('ko-KR');
const LEVEL = ['', '가닥이 잡혔어요', '나만의 유지칼로리', '꽤 정확해요'];
// 물음표: PC는 마우스를 올리면, 폰은 누르면 설명(tabindex로 포커스되면 보임)
export function helpHTML(m){
 const p = progressOf(m);
 return `<span class="mt-help" tabindex="0" role="button" aria-label="나만의 유지칼로리는 어떻게 계산하나요">?<span class="mt-tip" role="tooltip"><b>진짜 내 유지칼로리는 기록이 쌓여야 알 수 있어요</b>
 <span>인바디가 제안하는 값이나 계산식으로 나온 값은 많은 사람의 평균이라, 나와는 수백 kcal씩 다를 수 있어요. 인바디 수치나 직접 정한 값을 써도 되지만,</span>
 <span>마이로그는 내가 먹은 것과 체중 흐름을 맞춰 보고 '내 몸이 실제로 쓰는 양'을 계산해요. 완벽하진 않지만 내 진짜 기록으로 만든 값이라 비교적 정확해요.</span>
 <span><b>헤일로 ${HALO_STEPS[0]}번</b>이면 가닥이 잡히고, <b>${HALO_STEPS[1]}번</b>이면 목표를 세울 만큼, <b>${HALO_STEPS[2]}번</b>이면 꽤 정확해져요. 헤일로는 몸·식사·운동(의도적 휴식 포함)을 다 적은 날이에요.</span>
 <span>최근 8주 기록으로 계산해서, 기록을 오래 쉬면 정확도가 내려가요. 식단은 하루치를 다 적고, 체중은 주 3번 이상 재면 좋아요.</span>
 <span>체중을 적을 때 '생리 중·짠 음식·아픔·약 용량 바뀜·크레아틴 시작'을 골라 두면 그날 출렁임을 걸러서 더 정확해져요.</span>
 <span class="mt-now">지금 최근 8주 헤일로 ${p.halos}번 / ${p.target}번</span></span></span>`;
}
export function progressBarHTML(m){
 const p = progressOf(m);
 return `<div class="mt-progress" role="progressbar" aria-valuemin="0" aria-valuemax="${p.target}" aria-valuenow="${p.halos}" aria-label="나만의 유지칼로리까지 헤일로"><i style="width:${Math.round(p.pct * 100)}%"></i></div><p class="mt-progress-label">헤일로 <b>${p.halos}</b> / ${p.target}번${p.halos < p.target ? ` · ${p.target - p.halos}번 더 쌓으면 계산할 수 있어요` : ''}${p.need.length ? `<small>${esc(p.need.join(' · '))}</small>` : ''}</p>`;
}
// 분석 탭 카드
export function maintenanceCardHTML(m){
 const head = `<div class="section-title"><h3>나만의 유지칼로리 ${helpHTML(m)}</h3></div>`;
 const formula = m.formula ? `<p class="hint">계산식(키·체중·나이·활동량) 기준 ${n0(m.formula)}kcal — 참고값이에요.</p>` : '';
 if(m.status === 'ready') return `<section class="section card mt-card">${head}<p class="mt-value"><b>${n0(m.kcal)}</b><small>kcal</small></p><p class="mt-range">${n0(m.lo)}~${n0(m.hi)}kcal · ${LEVEL[m.level]} <span class="mt-dots" aria-label="정확도 ${m.level}/3">${'●'.repeat(m.level)}${'○'.repeat(3 - m.level)}</span></p><p class="hint">최근 8주 평균 ${n0(m.meanIntake)}kcal를 먹었고 체중은 주 ${m.slopeKgWeek > 0 ? '+' : ''}${m.slopeKgWeek}kg 흐름이에요. 완벽하진 않지만 내 진짜 기록으로 만든 값이에요.</p>${m.adjusted && (m.adjusted.step || m.adjusted.soft) ? `<p class="hint">${m.adjusted.step ? `${esc(m.adjusted.step.slice(5).replace('-', '/'))}에 바뀐 체중 높이(약·크레아틴)를 따로 맞췄어요. ` : ''}${m.adjusted.soft ? `체중이 흔들릴 만한 날 ${m.adjusted.soft}번은 덜 반영했어요.` : ''}</p>` : ''}${m.level < 3 ? progressBarHTML(m) : ''}${formula}</section>`;
 if(m.status === 'stale') return `<section class="section card mt-card stale">${head}<p class="mt-value"><b>약 ${n0(m.kcal)}</b><small>kcal</small></p><p class="mt-range warn">${m.weeksAgo}주 전 기록으로 계산한 값이에요. 최근 기록이 부족해 지금은 부정확할 수 있어요.</p>${progressBarHTML(m)}${formula}</section>`;
 return `<section class="section card mt-card">${head}<p class="hint">내 기록이 쌓이면 계산식이 아닌 진짜 내 유지칼로리를 알려 드려요.</p>${progressBarHTML(m)}${formula}</section>`;
}
// 식단 목표(칼로리 고르기)의 '내 유지칼로리를 기반으로 계산하기'
export function useMineHTML(m, on){
 const usable = m && (m.status === 'ready' || m.status === 'stale');
 return `<div class="mt-use"><button type="button" class="onb-opt ${on && usable ? 'on' : ''}" id="gw-use-mine" aria-pressed="${!!(on && usable)}" ${usable ? '' : 'disabled'}><span><b>내 유지칼로리를 기반으로 계산하기</b><small>${usable ? `${m.status === 'stale' ? '약 ' : ''}${n0(m.kcal)}kcal${m.status === 'stale' ? ` · ${m.weeksAgo}주 전 기록이라 부정확할 수 있어요` : ` · ${LEVEL[m.level]}`}` : '아직 기록이 부족해요'}</small></span></button>${helpHTML(m || {status: 'collecting', halos: 0, weighIns: 0, intakeDays: 0, lastGap: 99})}${usable ? '' : progressBarHTML(m || {status: 'collecting', halos: 0, weighIns: 0, intakeDays: 0, lastGap: 99})}</div>`;
}
