// 4.29.3 모든 운동은 기준 종목(앱 종목 도감의 한 종목) 밑에 있어야 그림·성장 기록이 이어진다.
// 직접 만든 종목은 baseExerciseId로, 내 머신은 exerciseId·baseId(머신 종류)로 기준 종목을 찾는다.
import {EXERCISE_CATALOG, resolveExercise} from './catalog.js';
import {genericMachine} from './machines-catalog.js';

const byId = id => id ? EXERCISE_CATALOG.find(x => x.id === id) || null : null;
const byName = n => n ? EXERCISE_CATALOG.find(x => x.name === n) || null : null;
const same = (a, b) => String(a || '').replace(/\s/g, '').toLowerCase() === String(b || '').replace(/\s/g, '').toLowerCase();

// 앱이 내 종목·머신을 알려 준다(기본 문맥)
let ctxOf = () => ({});
export const setBaseContext = fn => { ctxOf = typeof fn === 'function' ? fn : () => ({}); };
const ctxNow = c => { if(c) return c; try{ return ctxOf() || {}; }catch{ return {}; } };

// 기준 종목이 없어도 되는 것: 유산소·필라테스·휴식(근력 그림·성장 기록 대상이 아님)
export const needsBase = ex => !!ex && !['cardio', 'pilates', 'rest'].includes(ex.kind);

// 머신 → 기준 종목
export function machineBase(m){
 if(!m) return null;
 const own = byId(m.exerciseId); if(own) return own;
 const g = m.baseId ? genericMachine(m.baseId) : null;
 if(g) return byName(g.exercise) || resolveExercise(g.exercise);
 if(m.generic || m.builtin) return byName(m.exercise) || resolveExercise(m.exercise);
 return null;
}

// 직접 만든 종목 → 기준 종목
export function customBase(c){ return c ? byId(c.baseExerciseId) : null; }

// 운동 하나(기록·초안의 한 종목) → 기준 종목. 못 찾으면 null.
// ctx = {customs:[...], machineOf:id=>machine}
export function baseExerciseOf(ex, ctx){
 if(!ex) return null;
 ctx = ctxNow(ctx);
 const name = typeof ex === 'string' ? ex : ex.name;
 const id = typeof ex === 'object' ? ex.exerciseId : null;
 const hit = byId(id); if(hit) return hit;
 const customs = ctx.customs || [];
 const c = customs.find(x => (id && x.id === id) || same(x.name, name) || (x.aliases || []).some(a => same(a, name)));
 if(c){ const b = customBase(c); if(b) return b; }
 const mid = typeof ex === 'object' ? ex.machineId : null;
 if(mid && ctx.machineOf){ let m = null; try{ m = ctx.machineOf(mid); }catch{} const b = machineBase(m); if(b) return b; }
 return name ? resolveExercise(name) : null;
}

// 저장 전에: 기준 종목을 못 찾은 운동 이름들
export function missingBases(exercises, ctx){
 ctx = ctxNow(ctx);
 return [...new Set((exercises || []).filter(needsBase).filter(ex => !baseExerciseOf(ex, ctx)).map(ex => String(ex.name || '이름 없는 운동').trim()))];
}
export const missingBaseMessage = names => `‘${names.slice(0, 3).join('’, ‘')}’${names.length > 3 ? ` 외 ${names.length - 3}개` : ''}가 어떤 운동인지 골라 주세요. 기준 종목을 골라야 그림이 나오고 성장 기록이 이어져요.`;
