// 4.28.0 밤샘 E-1: 가상 사용자 N명 × D일 기록을 만들고, 앱의 계산·정제·동기화·화면 함수를 돌려 '늘 지켜야 할 규칙(불변식)'을 검사한다.
// 지난 두 번의 검사에서 손으로 찾던 종류의 문제(NaN·undefined가 화면에 찍힘, 동기화 왕복에서 값이 바뀜, 점수가 범위를 벗어남,
// 금지 표현, 날짜 순서에 따라 결과가 달라짐)를 기계가 밤마다 찾게 한다. 실제 사용자 데이터는 쓰지 않는다(시드 고정 난수).
// 실행: node tools/sim-users.mjs [사용자 수=2000] [일수=365] [시드=1]  → research_notes/night/E1/report.json·.md
// 시험에서는 simulate({users:40, days:120})처럼 작게 돌린다(tests/invariants.test.js).
import {emptyDB, normalizeDB, cleanMeal, cleanBody, cleanWorkout, mealTotals} from '../domain.js';
import {cloudRecords, recordsToDB, planSync} from '../cloud-model.js';
import {dietScore, dietSeries, dietFlowHTML} from '../diet-trends.js';
import {myMaintenance, maintenanceCardHTML, estimateAt} from '../maintenance.js';
import {analyze} from '../coach-engine.js';
import {hasBanned} from '../coach-knowledge.js';
import {discoveries, journey, journeyHTML} from '../discovery.js';
import {renderFoodPage} from '../food-view.js';
import {macroGoalsHTML} from '../nutrition-goals.js';
import {renderHomeTimeline} from '../timeline-view.js';

export function rng(seed = 1) { let s = seed >>> 0 || 1; return () => { s ^= s << 13; s >>>= 0; s ^= s >> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; }; }
const FOODS = [
 ['현미밥', 1, '공기', 315, 68, 7, 2], ['닭가슴살', 130, 'g', 214, 0, 40, 5], ['김치찌개', 1, '인분', 199, 12, 17, 8], ['비빔밥', 1, '그릇', 600, 90, 20, 16],
 ['라면', 1, '인분', 553, 84, 14, 17.5], ['그릭요거트', 150, 'g', 146, 6, 15, 6], ['바나나', 1, '개', 105, 27, 1, 0.4], ['아메리카노', 1, '잔', 10, 2, 0, 0],
 ['치킨', 3, '조각', 690, 30, 45, 42], ['샐러드', 1, '그릇', 180, 12, 6, 12], ['삼겹살', 200, 'g', 660, 0, 34, 58], ['떡볶이', 1, '인분', 480, 98, 9, 6],
 ['프로틴 쉐이크', 1, '스쿱', 120, 3, 24, 1], ['피자', 2, '조각', 560, 64, 24, 22], ['소주', 1, '병', 405, 0, 0, 0], ['업체 미제공 메뉴', 1, '개', 774, null, 50, null],
];
const EX = ['스쿼트', '벤치프레스', '데드리프트', '랫풀다운', '레그프레스', '덤벨 숄더 프레스', '시티드 로우', '런지'];
// 사람 유형: 기록 습관(빈도·공백·폭식·오타)과 목표
const TYPES = [
 {id: 'steady', logP: 0.95, gapP: 0.002, bingeP: 0.03, typoP: 0.002, workP: 0.75},
 {id: 'sparse', logP: 0.45, gapP: 0.01, bingeP: 0.05, typoP: 0.004},
 {id: 'gappy', logP: 0.8, gapP: 0.03, bingeP: 0.06, typoP: 0.003},
 {id: 'binge', logP: 0.85, gapP: 0.005, bingeP: 0.2, typoP: 0.003},
 {id: 'faster', logP: 0.9, gapP: 0.004, bingeP: 0.02, typoP: 0.002, fast: true, workP: 0.7},
 {id: 'messy', logP: 0.7, gapP: 0.01, bingeP: 0.08, typoP: 0.03},
];
const ymd = t => new Date(t).toISOString().slice(0, 10);
export function makeUser(i, {days = 365, seed = 1, today = '2026-11-24'} = {}) {
 const r = rng(seed * 100003 + i * 7919), pick = a => a[Math.floor(r() * a.length)], T = TYPES[i % TYPES.length];
 const db = emptyDB(), end = Date.parse(`${today}T12:00:00Z`), w0 = 50 + r() * 60, goal = 1500 + Math.round(r() * 12) * 100;
 db.settings = {...db.settings, calorieGoal: goal, carbsGoal: Math.round(goal * 0.45 / 4), proteinGoal: Math.round(w0 * 1.6), fatGoal: Math.round(goal * 0.25 / 9)};
 if (r() < 0.5) db.settings.nutritionProfile = {sex: r() < 0.5 ? 'male' : 'female', age: 18 + Math.floor(r() * 50), heightCm: 150 + Math.floor(r() * 40), weightKg: Math.round(w0), activity: 'light', goal: 'lose', cautions: r() < 0.05 ? ['pregnant'] : []};
 let w = w0, gap = 0, n = 0;
 for (let k = days - 1; k >= 0; k--) {
  const date = ymd(end - k * 86400e3);
  if (gap > 0) { gap--; continue; }
  if (r() < T.gapP) { gap = 3 + Math.floor(r() * 25); continue; }
  if (r() > T.logP) continue;
  w += (T.fast ? -0.12 : -0.03) + (r() - 0.5) * 0.4;
  if (r() < 0.7) {
   let kg = Math.round(w * 10) / 10;
   if (r() < T.typoP) kg = Math.round(kg * 10); // 70.5 → 705 오타
   try { db.body.push(cleanBody({id: `b${i}-${n++}`, date, weight: kg, createdAt: `${date}T07:00:00.000Z`})); } catch { db.body.push({id: `b${i}-${n++}`, date, weight: kg, createdAt: `${date}T07:00:00.000Z`}); } // 범위 밖은 그대로 넣어 '따로 보관' 길을 탄다
  }
  const binge = r() < T.bingeP, mealsN = 1 + Math.floor(r() * 4) + (binge ? 2 : 0);
  for (let m = 0; m < mealsN; m++) {
   const [name, qty, unit, kcal, c, p, f] = pick(FOODS), scale = binge ? 1.5 : 0.6 + r() * 0.8, h = 7 + m * 4;
   const planned = k === 0 && m === mealsN - 1 && r() < 0.3;
   db.meals.push(cleanMeal({id: `m${i}-${n++}`, date, loggedAt: `${date}T${String(Math.min(23, h)).padStart(2, '0')}:00:00.000Z`, slot: ['아침', '점심', '저녁', '간식'][m % 4], mealGroupId: `g${i}-${date}-${m}`, name, servingQty: Math.round(qty * scale * 10) / 10, servingUnit: unit, calories: Math.round(kcal * scale), carbs: c == null ? null : Math.round(c * scale * 10) / 10, protein: p == null ? null : Math.round(p * scale * 10) / 10, fat: f == null ? null : Math.round(f * scale * 10) / 10, ...(planned ? {planned: true} : {})}));
  }
  if (r() < (T.workP ?? 0.35)) db.workouts.push(cleanWorkout({id: `w${i}-${n++}`, date, title: '운동', exercises: [{name: pick(EX), sets: Array.from({length: 3}, () => ({weight: Math.round(20 + r() * 80), reps: 5 + Math.floor(r() * 8), done: true}))}]}));
  if (r() < 0.05) db.dayStates[date] = r() < 0.5 ? 'complete' : 'fasting';
 }
 return {db, type: T.id, today};
}
const BAD_TEXT = /NaN|undefined|Infinity|\[object Object\]|null kcal|>null</;
export function checkUser({db: raw, type, today}, cover = {}) {
 const seen = k => { cover[k] = (cover[k] || 0) + 1; };
 const fails = [], fail = (rule, detail) => fails.push({rule, type, detail: String(detail).slice(0, 200)});
 let db;
 try { db = normalizeDB(JSON.parse(JSON.stringify(raw)), {lenient: true}); } catch (e) { fail('I1 정제가 열리지 않음', e.message); return fails; }
 if (db.quarantine?.length) seen('따로 보관 있음');
 // I2 정제는 두 번 해도 같다
 try { const again = normalizeDB(JSON.parse(JSON.stringify(db)), {lenient: true}); const strip = x => JSON.stringify({...x, quarantine: (x.quarantine || []).map(q => ({...q, at: ''}))}); if (strip(again) !== strip(db)) fail('I2 정제가 멱등이 아님', ''); } catch (e) { fail('I2 두 번째 정제 실패', e.message); }
 // I3 동기화 왕복(cloudRecords → recordsToDB)에서 기록이 바뀌지 않는다
 try { const back = recordsToDB(cloudRecords(db), db); for (const k of ['body', 'meals', 'workouts']) if (back[k].length !== db[k].length) fail('I3 동기화 왕복에서 개수가 바뀜', `${k} ${db[k].length}→${back[k].length}`); } catch (e) { fail('I3 동기화 왕복 실패', e.message); }
 // I4 같은 것끼리 동기화하면 쓰기·충돌 0
 try { const rec = cloudRecords(db), remote = Object.fromEntries(Object.entries(rec).map(([k, v]) => [k, {payload: v, revision: 1}])); const p = planSync(rec, remote, remote); if (p.writes.length || p.conflicts.length) fail('I4 같은 상태 동기화에 쓰기·충돌', `${p.writes.length}/${p.conflicts.length}`); } catch (e) { fail('I4 계획 실패', e.message); }
 // I5 하루 합계: 음수·NaN 없음, 열량 합 = 기록 합(예정 제외)
 const dates = [...new Set(db.meals.map(m => m.date))].slice(-30);
 for (const d of dates) {
  const ms = db.meals.filter(m => m.date === d && !m.planned), t = mealTotals(ms), sum = ms.reduce((a, m) => a + (Number(m.calories) || 0), 0);
  if (!['calories', 'carbs', 'protein', 'fat'].every(k => Number.isFinite(t[k]) && t[k] >= 0)) fail('I5 합계에 음수·NaN', d);
  if (t.missingMacros) seen('탄지 미제공 날');
  if (Math.abs(t.calories - sum) > 1) fail('I5 열량 합 불일치', `${d} ${t.calories} vs ${sum}`);
  const sc = dietScore(t, db.settings);
  if (sc && !(sc.total >= 0 && sc.total <= 100)) fail('I6 식단 점수 범위 밖', `${d} ${sc.total}`);
 }
 // I7 유지칼로리: 준비됨이면 숫자가 유한하고 범위 안, 날짜 순서를 섞어도 같다
 try {
  const m = myMaintenance(db, today, null); seen(`유지칼로리 ${m.status}${m.implausible ? '(보류)' : ''}`);
  if (m.status === 'ready' && !(Number.isFinite(m.kcal) && m.lo <= m.kcal && m.kcal <= m.hi && m.kcal > 0)) fail('I7 유지칼로리 값 이상', JSON.stringify([m.lo, m.kcal, m.hi]));
  const shuffled = {...db, body: [...db.body].reverse(), meals: [...db.meals].reverse()};
  const a = estimateAt(db, today), b = estimateAt(shuffled, today);
  if (a.ok !== b.ok || (a.ok && a.kcal !== b.kcal)) fail('I8 기록 순서에 따라 유지칼로리가 달라짐', `${a.kcal} vs ${b.kcal}`);
  const html = maintenanceCardHTML(m); if (BAD_TEXT.test(html)) fail('I9 유지칼로리 카드에 이상한 글자', html.match(BAD_TEXT)[0]);
 } catch (e) { fail('I7 유지칼로리 계산 실패', e.message); }
 // I10 코치 문구: 금지 표현 없음
 try { for (const x of analyze(db, today)) { seen(`코치 ${x.id}`); const b = hasBanned(x.text); if (b.length) fail('I10 코치 금지 표현', `${x.id}: ${b.join(',')}`); if (BAD_TEXT.test(x.text)) fail('I9 코치 문구에 이상한 글자', x.id); } } catch (e) { fail('I10 코치 분석 실패', e.message); }
 // I11 화면 조각: 이상한 글자가 찍히지 않는다
 const screens = [
  ['식단 화면', () => renderFoodPage(db, today)],
  ['하루 목표 막대', () => macroGoalsHTML(mealTotals(db.meals.filter(m => m.date === today && !m.planned)), db.settings, {meals: 1})],
  ['식단 흐름', () => dietFlowHTML(db, {metric: 'score', period: 30, end: today})],
  ['홈 타임라인', () => renderHomeTimeline(db, today)],
  ['나에 대한 발견', () => journeyHTML(journey(db, today), discoveries(db, today))],
 ];
 for (const [name, fn] of screens) { try { const h = String(fn()); const m = h.match(BAD_TEXT); if (m) fail('I11 화면에 이상한 글자', `${name}: …${h.slice(Math.max(0, m.index - 60), m.index + 20).replace(/<[^>]+>/g, ' ')}`); } catch (e) { fail('I12 화면 그리기 실패', `${name}: ${e.message}`); } }
 // I13 식단 흐름 점수: 모든 날 0~100
 try { for (const x of dietSeries(db, {days: 60, end: today})) if (x.score != null && !(x.score >= 0 && x.score <= 100)) fail('I6 식단 흐름 점수 범위 밖', x.date); } catch (e) { fail('I13 식단 흐름 실패', e.message); }
 return fails;
}
export function simulate({users = 2000, days = 365, seed = 1, onProgress} = {}) {
 const all = [], byRule = {}, cover = {}, t0 = Date.now();
 for (let i = 0; i < users; i++) {
  const u = makeUser(i, {days, seed});
  const f = checkUser(u, cover);
  for (const x of f) { byRule[x.rule] = (byRule[x.rule] || 0) + 1; if (all.length < 400) all.push({user: i, ...x}); }
  if (onProgress && i % 100 === 99) onProgress(i + 1, Date.now() - t0);
 }
 return {users, days, seed, ms: Date.now() - t0, byRule, cover, samples: all};
}
import path from 'node:path';
import {fileURLToPath} from 'node:url';
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
 const fs = await import('node:fs');
 const [users = 2000, days = 365, seed = 1] = process.argv.slice(2).map(Number);
 const res = simulate({users, days, seed, onProgress: (n, ms) => console.log(`${n}명 · ${(ms / 1000).toFixed(0)}초`)});
 const out = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', 'research_notes', 'night', 'E1');
 fs.mkdirSync(out, {recursive: true});
 fs.writeFileSync(path.join(out, 'report.json'), JSON.stringify(res, null, 1));
 fs.writeFileSync(path.join(out, 'report.md'), `# 가상 사용자 불변식 검사 (밤샘 E-1)\n\n- ${users}명 × ${days}일, 시드 ${seed}, ${(res.ms / 1000).toFixed(0)}초\n- 규칙별 위반: ${Object.keys(res.byRule).length ? Object.entries(res.byRule).map(([k, v]) => `${k} ${v}건`).join(' · ') : '없음'}\n- 거쳐 간 길(횟수): ${Object.entries(res.cover).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k} ${v}`).join(' · ')}\n\n## 표본\n${res.samples.slice(0, 80).map(x => `- 사용자 ${x.user}(${x.type}) · ${x.rule} · ${x.detail}`).join('\n')}\n`);
 console.log('위반', res.byRule);
}
