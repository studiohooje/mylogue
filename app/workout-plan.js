// 4.19.0 체계적인 운동 기록(대표님 2026-11-24): 오늘 할 운동(큰 종류 → 웨이트 부위·필라테스 기구)을 먼저 고르면
// 그 조합으로 ① 운동 이름 ② 종목 순서(평소 하던 순서) ③ 웜업·메인 무게를 내 기록에서 제안한다. 모두 '기록하는 그날' 이전 기록만 본다.
// 저장: workout.targets = ['웨이트', '웨이트:가슴', '웨이트:삼두', '러닝·유산소', '필라테스', '필라테스:리포머', …]
import {EXERCISE_CATALOG, resolveExercise} from './catalog.js';

export const TARGET_CATS = ['웨이트', '러닝·유산소', '필라테스', '요가', '기타'];
export const WEIGHT_TARGETS = ['가슴', '등', '어깨', '이두', '삼두', '하체', '복근', '전신'];
export const PILATES_TARGETS = ['매트', '리포머', '캐딜락', '체어', '바렐'];
export const SUB_TARGETS = {'웨이트': WEIGHT_TARGETS, '필라테스': PILATES_TARGETS};
const MUSCLE_TO = {chest: '가슴', triceps: '삼두', biceps: '이두', forearms: '이두', back: '등', traps: '등', erectors: '등', shoulders: '어깨', quads: '하체', glutes: '하체', hamstrings: '하체', calves: '하체', adductors: '하체', abs: '복근', obliques: '복근'};
const PART_TO = {'가슴': '가슴', '등': '등', '어깨': '어깨', '하체': '하체', '복근': '복근', '전신': '전신'};
const DAY = 86400000;
const toT = s => new Date(String(s).slice(0, 10) + 'T12:00:00').getTime();

// 종목 한 개 → 큰 종류와 세부 타깃
export function catOfExercise(e = {}){
  const x = (e.exerciseId && EXERCISE_CATALOG.find(c => c.id === e.exerciseId)) || resolveExercise(e.name) || {};
  const part = x.part || e.part || '';
  if (e.kind === 'cardio' || x.kind === 'cardio' || part === '유산소') {
    if (part === '필라테스' || /필라테스/.test(e.name || x.name || '')) return '필라테스';
    if (part === '요가' || /요가/.test(e.name || x.name || '')) return '요가';
    return '러닝·유산소';
  }
  if (part === '필라테스') return '필라테스';
  if (part === '요가') return '요가';
  if (part === '기타') return '기타';
  return '웨이트';
}
export function exerciseTargets(e = {}){
  const cat = catOfExercise(e), out = new Set([cat]);
  if (cat === '웨이트') {
    const x = (e.exerciseId && EXERCISE_CATALOG.find(c => c.id === e.exerciseId)) || resolveExercise(e.name) || {};
    const prim = (e.primaryMuscleIds && e.primaryMuscleIds.length ? e.primaryMuscleIds : x.primaryMuscleIds) || [];
    const part = x.part || e.part;
    if (PART_TO[part]) out.add(`웨이트:${PART_TO[part]}`);
    for (const m of prim) if (MUSCLE_TO[m]) out.add(`웨이트:${MUSCLE_TO[m]}`);
    if (part === '팔' && !prim.some(m => MUSCLE_TO[m] === '이두' || MUSCLE_TO[m] === '삼두')) out.add('웨이트:이두');
  }
  if (cat === '필라테스') { const app = PILATES_TARGETS.find(a => (e.name || '').includes(a) || (e.name || '').includes(a === '바렐' ? '배럴' : a)); if (app) out.add(`필라테스:${app}`); for (const m of e.moves || []) { const a = PILATES_TARGETS.find(p => String(m.apparatus || '').includes(p) || (p === '바렐' && /배럴/.test(m.apparatus || ''))); if (a) out.add(`필라테스:${a}`); } }
  return [...out];
}
// 운동 한 번의 타깃: 저장된 것이 있으면 그것, 없으면 종목들로
export function workoutTargets(w = {}){
  if (Array.isArray(w.targets) && w.targets.length) return w.targets;
  const s = new Set(); for (const e of w.exercises || []) for (const t of exerciseTargets(e)) s.add(t); return [...s];
}
// 비슷한 정도: 세부 타깃이 있으면 세부끼리, 없으면 큰 종류끼리(자카드)
export function similarity(a = [], b = []){
  const sub = x => x.filter(t => t.includes(':')), A = sub(a).length && sub(b).length ? sub(a) : a, B = sub(a).length && sub(b).length ? sub(b) : b;
  if (!A.length || !B.length) return 0;
  const sa = new Set(A); let inter = 0; for (const t of new Set(B)) if (sa.has(t)) inter++;
  return inter / (new Set([...A, ...B]).size);
}
const before = (db, date, id) => (db.workouts || []).filter(w => !w.planned && !w.rest && w.id !== id && (!date || w.date <= date));
const recency = (d, date) => Math.pow(0.5, Math.max(0, (toT(date) - toT(d)) / DAY) / 90);
const DEFAULT_TITLES = new Set(['', '오늘의 운동', '운동', '의도적 휴식']);

// ① 운동 이름 제안: 같은(비슷한) 타깃으로 운동한 날 붙였던 이름 → 그 밖에 자주 쓴 이름. 기록이 없으면 빈 목록.
export function titleSuggestions(db, targets = [], date = '', {limit = 5, workoutId = null} = {}){
  const score = new Map();
  for (const w of before(db, date, workoutId)) {
    const t = String(w.title || '').trim(); if (DEFAULT_TITLES.has(t)) continue;
    const sim = targets.length ? similarity(targets, workoutTargets(w)) : 0, r = recency(w.date, date || w.date);
    score.set(t, (score.get(t) || 0) + (sim * 10 + 0.3) * r);
  }
  return [...score.entries()].sort((a, b) => b[1] - a[1]).slice(0, limit).map(x => x[0]);
}

// ② 종목 추천: 비슷한 타깃으로 운동한 날들에서 자주 한 종목, 그날 하던 순서(먼저 한 것 먼저)로
export function planFor(db, targets = [], date = '', {limit = 8, workoutId = null, keyOf = e => e.exerciseId || e.name} = {}){
  if (!targets.length) return [];
  const st = new Map();
  for (const w of before(db, date, workoutId)) {
    const sim = similarity(targets, workoutTargets(w)); if (sim <= 0) continue;
    const r = recency(w.date, date || w.date), ex = (w.exercises || []).filter(e => e.name);
    // 순서: 기록 시각이 있으면 그 순서, 없으면 적힌 순서
    const order = ex.map((e, i) => ({e, i, t: (e.sets || []).map(s => s.completedAt).filter(Boolean).sort()[0] || e.completedAt || ''})).sort((a, b) => (a.t && b.t ? a.t.localeCompare(b.t) : 0) || a.i - b.i);
    order.forEach(({e}, i) => {
      const tg = exerciseTargets(e); if (!tg.some(t => targets.includes(t))) return; // 오늘 타깃과 상관없는 종목은 빼기
      const k = keyOf(e); if (!k) return;
      const v = st.get(k) || {key: k, name: e.name, score: 0, pos: 0, n: 0};
      v.score += sim * r; v.pos += order.length > 1 ? i / (order.length - 1) : 0; v.n++; st.set(k, v);
    });
  }
  return [...st.values()].sort((a, b) => b.score - a.score).slice(0, limit).map(v => ({...v, pos: v.pos / v.n})).sort((a, b) => a.pos - b.pos);
}

// ③ 웜업·메인: 지난번 세트(시간 순)에서 가장 무거운 무게가 메인, 그 전에 한 가벼운 세트(메인의 80% 이하)가 웜업
export function warmMain(sets = []){
  const s = sets.filter(x => Number(x.weight) > 0 && Number(x.reps) > 0); if (!s.length) return null;
  const top = Math.max(...s.map(x => Number(x.weight))), firstMain = s.findIndex(x => Number(x.weight) >= top * 0.9);
  const warm = s.slice(0, firstMain).filter(x => Number(x.weight) <= top * 0.8), main = s.filter(x => Number(x.weight) >= top * 0.9);
  const lastMain = main[main.length - 1];
  return {main: {weight: lastMain.weight, reps: lastMain.reps, unit: lastMain.unit || 'kg', sets: main.length}, warm: warm.length ? {weight: warm[warm.length - 1].weight, reps: warm[warm.length - 1].reps, unit: warm[warm.length - 1].unit || 'kg', sets: warm.length} : null};
}
export const FILL_MODES = [['warm', '웜업부터'], ['main', '메인만'], ['off', '채우지 않기']];
// 다음 세트에 넣을 무게(오늘 이 종목을 몇 세트 했는지에 따라). null이면 채우지 않음.
export function nextFill(wm, doneCount = 0, mode = 'warm'){
  if (!wm || mode === 'off') return null;
  if (mode === 'warm' && wm.warm && doneCount < wm.warm.sets) return {...wm.warm, kind: 'warm'};
  return {...wm.main, kind: 'main'};
}

// 그날 기준 마지막으로 쓴 헬스장(등록된 헬스장 중)
export function lastGym(db, date = '', gyms = []){
  const ws = (db.workouts || []).filter(w => !w.planned && w.gymName && gyms.includes(w.gymName) && (!date || w.date <= date)).sort((a, b) => String(b.date).localeCompare(String(a.date)) || String(b.loggedAt || '').localeCompare(String(a.loggedAt || '')));
  return ws[0]?.gymName || gyms[0] || '';
}
