// 5.0.5 밤샘: 계산 엔진 극단값 시험. 극단적인 기록(빈 기록·단식·폭식·긴 공백·체중 하나·같은 날 여러 번·미래 날짜·0/음수 아닌 이상값)을
// 수천 가지로 만들어 화면에 보이는 계산(식단 점수·흐름·유지칼로리·예측·체중 원인·이번 달 비교·체중 흐름·왜 이럴까·리포트·발견·실험·시뮬레이터·인사이트 요약)을 돌린다.
// 잡는 것: 예외, 결과 글자에 NaN·Infinity·undefined·[object, 숫자 칸의 비정상 값.
// node tools/engine-fuzz.mjs [횟수=3000] → 실패 묶음 요약
const N = Number(process.argv[2] || 3000);
globalThis.localStorage ??= {getItem: () => null, setItem() {}, removeItem() {}};
const {dietScore, dietSeries, dietFlowHTML} = await import('../diet-trends.js');
const {myMaintenance, maintenanceCardHTML} = await import('../maintenance.js');
const {forecast, forecastHTML, weightDrivers, driversHTML, monthCompare, monthHTML} = await import('../premium-analysis.js');
const {bodyOverviewHTML} = await import('../body-flow.js');
const {weightWhy, weightWhyHTML} = await import('../weight-why.js');
const {buildReport, reportHTML} = await import('../analysis-report.js');
const {discoveries, journey, journeyHTML} = await import('../discovery.js');
const {experimentsHTML} = await import('../experiment.js');
const {simulate, simulatorHTML} = await import('../plus-tools.js');
const {coachFacts, coachFactsText, coachHTML} = await import('../coach-ui.js');

let seed = 12345; const rnd = () => (seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648;
const pick = a => a[Math.floor(rnd() * a.length)];
const pad = n => String(n).padStart(2, '0'), ymd = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const TODAY = '2026-11-25';
const day = k => { const d = new Date(`${TODAY}T12:00:00`); d.setDate(d.getDate() - k); return ymd(d); };

function makeDB(){
  const kind = pick(['empty', 'onlyWeight1', 'fasting', 'binge', 'gap', 'dense', 'normal', 'future', 'noGoals', 'bulk', 'tinyValues', 'nullMacros', 'oneMeal', 'manyWeighins']);
  const days = pick([1, 2, 3, 7, 14, 30, 60, 120]);
  const s = kind === 'noGoals' ? {} : {calorieGoal: pick([0, 1200, 1900, 2500, 3500]), carbsGoal: pick([0, 150, 250]), proteinGoal: pick([0, 60, 140, 200]), fatGoal: pick([0, 40, 70]), goalWeight: pick([null, 60, 73, 90])};
  if (kind === 'bulk') s.phase = {type: pick(['bulk', 'leanbulk', {id: 'bulk'}]), startWeight: 70, target: {gainKg: 3}};
  if (rnd() < 0.2) s.phase = {type: 'cut', startWeight: 80, target: pick([{loseKg: 5}, {weight: 72}, {}])};
  const db = {settings: s, body: [], meals: [], workouts: [], routines: [], foods: [], machines: [], recipes: []};
  if (kind === 'empty') return {db, kind};
  let w = 40 + rnd() * 100;
  for (let k = days - 1; k >= 0; k--) {
    if (kind === 'gap' && k > 10 && k < days - 5) continue;
    const date = kind === 'future' && rnd() < 0.2 ? day(-3) : day(k);
    w += (rnd() - 0.5) * (kind === 'binge' ? 3 : 0.6);
    const nW = kind === 'manyWeighins' ? 4 : kind === 'onlyWeight1' ? (k === 0 ? 1 : 0) : rnd() < 0.7 ? 1 : 0;
    for (let j = 0; j < nW; j++) db.body.push({date, weight: Math.round(w * 10) / 10, measure: rnd() < 0.15 ? 'inbody' : 'scale', bodyFatPct: rnd() < 0.3 ? 10 + rnd() * 30 : null, skeletalMuscle: rnd() < 0.3 ? 20 + rnd() * 20 : null, bodyFatMass: rnd() < 0.3 ? 5 + rnd() * 30 : null, waistCm: rnd() < 0.1 ? 60 + rnd() * 50 : null, createdAt: `${date}T0${j}:00:00`});
    if (kind === 'onlyWeight1') continue;
    const nMeals = kind === 'fasting' ? (rnd() < 0.6 ? 0 : 1) : kind === 'oneMeal' ? 1 : kind === 'dense' ? 8 : Math.floor(rnd() * 5);
    for (let m = 0; m < nMeals; m++) {
      const big = kind === 'binge' && rnd() < 0.4;
      const tiny = kind === 'tinyValues';
      const nm = kind === 'nullMacros' && rnd() < 0.5;
      db.meals.push({date, name: pick(['밥', '닭가슴살', '라면', '샐러드', '피자']), servingQty: 1, servingUnit: '회', calories: tiny ? rnd() : big ? 2000 + rnd() * 3000 : rnd() * 900, carbs: nm ? null : tiny ? 0 : rnd() * 120, protein: nm ? null : tiny ? 0 : rnd() * 60, fat: nm ? null : tiny ? 0 : rnd() * 50, loggedAt: `${date}T${pad(6 + Math.floor(rnd() * 17))}:${pad(Math.floor(rnd() * 60))}:00`, planned: rnd() < 0.05});
    }
    if (rnd() < 0.45) db.workouts.push({date, title: pick(['하체', '등', '가슴']), rest: rnd() < 0.08, exercises: rnd() < 0.1 ? [] : [{name: pick(['스쿼트', '벤치프레스', '랫풀다운', '러닝']), part: pick(['하체', '가슴', '등', '유산소']), kind: rnd() < 0.15 ? 'cardio' : 'strength', durationMin: rnd() < 0.5 ? 30 : null, sets: Array.from({length: Math.floor(rnd() * 5)}, () => ({weight: pick([0, 20, 60, 100, 250, null]), reps: pick([1, 5, 10, 30, 0]), unit: 'kg', completed: rnd() < 0.9}))}], planned: rnd() < 0.05});
  }
  return {db, kind};
}

const BAD = /NaN|Infinity|undefined|\[object /;
const fails = new Map();
const note = (name, kind, e) => { const key = `${name} :: ${String(e).slice(0, 140)}`; const f = fails.get(key) || {n: 0, kinds: new Set()}; f.n++; f.kinds.add(kind); fails.set(key, f); };
const run = (name, kind, fn) => { try { const out = fn(); const text = typeof out === 'string' ? out.replace(/<[^>]+>/g, ' ') : JSON.stringify(out, (k, v) => (typeof v === 'number' && !Number.isFinite(v)) ? `!!${v}` : v); if (typeof out === 'string' ? BAD.test(text) : /!!(NaN|Infinity|-Infinity)/.test(text || '')) note(name, kind, `이상한 값: ${(text.match(/.{0,40}(NaN|Infinity|undefined|\[object |!!\w+).{0,30}/) || [''])[0]}`); } catch (e) { note(name, kind, e?.stack?.split('\n').slice(0, 2).join(' | ') || e); } };

for (let i = 0; i < N; i++) {
  const {db, kind} = makeDB();
  run('dietScore', kind, () => db.meals.length ? dietScore({calories: db.meals[0].calories, carbs: db.meals[0].carbs, protein: db.meals[0].protein, fat: db.meals[0].fat}, db.settings) : null);
  run('dietScore-range', kind, () => { for (const x of dietSeries(db, {days: 60, end: TODAY})) if (x.score != null && (x.score < 0 || x.score > 100)) throw Error(`점수 ${x.score}`); return ''; });
  run('maintenance-range', kind, () => { const m = myMaintenance(db, TODAY); const v = (m?.status === 'ready' || m?.status === 'stale') ? m.kcal : null; if (v != null && (v < 800 || v > 6000)) throw Error(`유지칼로리 ${Math.round(v)} (${kind})`); return ''; });
  run('forecast-range', kind, () => { const f = forecast(db, TODAY); if (f && (Math.abs(f.weekly) > 5)) throw Error(`주 ${f.weekly.toFixed(1)}kg 흐름`); return ''; });
  run('dietSeries', kind, () => dietSeries(db, {days: 30, end: TODAY}));
  run('dietFlowHTML', kind, () => dietFlowHTML(db, {period: pick([7, 30, 90]), end: TODAY}));
  run('maintenance', kind, () => maintenanceCardHTML(myMaintenance(db, TODAY, pick([null, 2000]))));
  run('forecast', kind, () => forecastHTML(forecast(db, TODAY), {today: TODAY}));
  run('drivers', kind, () => driversHTML(weightDrivers(db, TODAY)));
  run('month', kind, () => monthHTML(monthCompare(db, TODAY), {lose: rnd() < 0.5}));
  run('bodyOverview', kind, () => bodyOverviewHTML(db, {view: pick(['day', 'week', 'month']), today: TODAY}));
  run('weightWhy', kind, () => weightWhyHTML(weightWhy(db, TODAY)));
  run('report', kind, () => reportHTML(buildReport(db, new Date(`${TODAY}T20:00:00`), {focus: ''})));
  run('journey', kind, () => journeyHTML(journey(db, TODAY), discoveries(db, TODAY), {limit: 3}));
  run('experiments', kind, () => experimentsHTML(db, TODAY, {limit: 3}));
  run('simulate', kind, () => simulatorHTML({kcal: pick([-500, 0, 300]), workouts: pick([0, 3]), weeks: 12}, simulate(db, TODAY, {kcal: -300, workouts: 2, weeks: 12})));
  run('coachFacts', kind, () => coachFactsText(db, TODAY));
  run('coachHTML', kind, () => coachHTML({db, today: TODAY}));
}
console.log(`실행 ${N}개 DB · 실패 묶음 ${fails.size}`);
for (const [k, v] of [...fails.entries()].sort((a, b) => b[1].n - a[1].n)) console.log(`${v.n}\t[${[...v.kinds].join(',')}]\t${k}`);
