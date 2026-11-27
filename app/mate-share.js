// 5.0.0 로그메이트: 메이트에게 보여 줄 '읽기 전용 요약'을 내 기록에서 만든다.
// 원본 기록(users/{uid})은 계속 나만 본다. 방에서 공개한 종류(수치·식단·운동)만 이 요약으로 방에 올린다.
// 이 파일은 app.js를 import하지 않는다(순수 함수, 시험 가능).
const DAYS = ['일', '월', '화', '수', '목', '금', '토'];
const ymd = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const addDays = (s, n) => { const d = new Date(`${s}T12:00:00`); d.setDate(d.getDate() + n); return ymd(d); };
const num = v => (v === null || v === undefined || v === '' || !Number.isFinite(Number(v))) ? null : Number(v);
const r0 = v => Math.round(v), r1 = v => Math.round(v * 10) / 10;
const hm = s => { const m = String(s || '').match(/T(\d{2}):(\d{2})/); return m ? `${m[1]}:${m[2]}` : ''; };
const real = x => x && x.planned !== true;

export const MATE_KINDS = ['body', 'meal', 'work'];
export const MATE_KIND_LABEL = {body: '수치', meal: '식단', work: '운동'};

export function bodySummary(db, today){
  const list = (db.body || []).filter(real).filter(b => num(b.weight) != null && b.date <= today).sort((a, b) => `${a.date}${a.loggedAt || ''}`.localeCompare(`${b.date}${b.loggedAt || ''}`));
  if(!list.length) return {empty: true};
  const byDay = new Map(); for(const b of list) byDay.set(b.date, b);
  const days = [...byDay.values()], last = days[days.length - 1];
  return {
    kg: r1(num(last.weight)), date: last.date, fat: num(last.bodyFatPct) != null ? r1(num(last.bodyFatPct)) : null,
    trend: days.slice(-14).map(b => r1(num(b.weight))),
    list: days.slice(-10).reverse().map(b => ({date: b.date, kg: r1(num(b.weight)), fat: num(b.bodyFatPct) != null ? r1(num(b.bodyFatPct)) : null, muscle: num(b.skeletalMuscle) != null ? r1(num(b.skeletalMuscle)) : null})),
  };
}

export function mealSummary(db, today){
  const s = db.settings || {}, meals = (db.meals || []).filter(real);
  const on = d => meals.filter(m => m.date === d);
  const sum = (arr, k) => arr.reduce((a, m) => a + (num(m[k]) || 0), 0);
  const t = on(today);
  const days = Array.from({length: 7}, (_, i) => addDays(today, i - 6)).map(d => ({date: d, kcal: r0(sum(on(d), 'calories'))}));
  return {
    date: today, kcal: r0(sum(t, 'calories')), goal: num(s.calorieGoal),
    macros: {carbs: r0(sum(t, 'carbs')), protein: r0(sum(t, 'protein')), fat: r0(sum(t, 'fat'))},
    goals: {carbs: num(s.carbsGoal), protein: num(s.proteinGoal), fat: num(s.fatGoal)},
    meals: t.sort((a, b) => String(a.loggedAt).localeCompare(String(b.loggedAt))).slice(0, 20).map(m => ({slot: String(m.slot || '식사').slice(0, 10), name: String(m.name).slice(0, 40), kcal: num(m.calories) != null ? r0(num(m.calories)) : null, at: hm(m.loggedAt)})),
    days,
  };
}

const doneSets = ex => (ex.sets || []).filter(x => x && x.completed !== false).length;
export function workSummary(db, today){
  const ws = (db.workouts || []).filter(real).filter(w => w.date <= today);
  const on = d => ws.filter(w => w.date === d);
  const partsOf = list => [...new Set(list.flatMap(w => (w.exercises || []).filter(e => e.kind !== 'cardio' ? doneSets(e) > 0 : true).map(e => String(partOf(e) || '').trim()).filter(Boolean)))];
  const t = on(today);
  const days = Array.from({length: 7}, (_, i) => addDays(today, i - 6)).map(d => { const p = partsOf(on(d)); return {d: DAYS[new Date(`${d}T12:00:00`).getDay()], date: d, parts: p.slice(0, 3).join('·'), rest: !p.length}; });
  const sessions = ws.slice().sort((a, b) => b.date.localeCompare(a.date)).slice(0, 6).map(w => ({date: w.date, title: String(w.title || '운동').slice(0, 30), items: (w.exercises || []).slice(0, 12).map(e => ({name: String(e.name || '').slice(0, 40), sets: e.kind === 'cardio' ? null : doneSets(e), min: e.kind === 'cardio' ? num(e.durationMin) : null}))}));
  const muscles = [...new Set(t.flatMap(w => (w.exercises || []).flatMap(e => e.primaryMuscleIds || [])))].slice(0, 12);
  return {date: today, sets: t.reduce((a, w) => a + (w.exercises || []).reduce((b, e) => b + (e.kind === 'cardio' ? 0 : doneSets(e)), 0), 0), rest: !t.length, days, sessions, muscles};
}

const MAKERS = {body: bodySummary, meal: mealSummary, work: workSummary};
// 방 공개 범위에서 켜진 종류만 만든다.
export function sharesFor(db, today, scope = {}){
  const out = {};
  for(const k of MATE_KINDS) if(scope[k] === true) out[k] = MAKERS[k](db, today);
  return out;
}
// 같은 내용이면 다시 올리지 않으려고 비교용 문자열
export const shareKey = data => JSON.stringify(data);import {partOf} from './body-part.js';

