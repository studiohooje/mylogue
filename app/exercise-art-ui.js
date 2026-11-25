import {baseExerciseOf} from './exercise-base.js';
import {EXERCISE_ART} from './exercise-art.js';
import {EXERCISE_CATALOG, findExercise, resolveExercise} from './catalog.js';
// 4.18.0 머신 기록은 머신 종류(상위 종목)의 그림으로: app이 머신 찾는 함수를 넣어 준다(공용 도감의 제조사 모델까지)
let machineOf = () => null;
export const setMachineResolver = fn => { machineOf = typeof fn === 'function' ? fn : () => null; };
const h = v => String(v??'').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
// 4.16.0 그림 찾기: 이름이 정확히 같지 않아도(별칭·예전 이름·직접 입력) 종목 번호와 별칭으로 찾는다.
export function artFile(x){
 const name = typeof x === 'string' ? x : x?.name, id = typeof x === 'object' ? x?.exerciseId : null;
 if(name && EXERCISE_ART[name]) return EXERCISE_ART[name];
 const byId = id ? EXERCISE_CATALOG.find(e => e.id === id) : null;
 if(byId && EXERCISE_ART[byId.name]) return EXERCISE_ART[byId.name];
 const hit = name ? resolveExercise(name) : null;
 if(hit && EXERCISE_ART[hit.name]) return EXERCISE_ART[hit.name];
 // 머신 종류(상위 종목)의 그림
 const mid = typeof x === 'object' ? x?.machineId : null;
 if(mid){ let m = null; try{ m = machineOf(mid); }catch{} const ex = m?.exercise || (m?.exerciseId ? EXERCISE_CATALOG.find(e => e.id === m.exerciseId)?.name : '') || ''; if(ex && EXERCISE_ART[ex]) return EXERCISE_ART[ex]; const r = ex ? resolveExercise(ex) : null; if(r && EXERCISE_ART[r.name]) return EXERCISE_ART[r.name]; }
 // 4.29.3 직접 만든 종목은 고른 기준 종목의 그림으로
 { const b = baseExerciseOf(x); if(b && EXERCISE_ART[b.name]) return EXERCISE_ART[b.name]; }
 return '';
}
export const hasExerciseArt = x => !!artFile(x);
const SIZE = {'ex-art-lg':96, 'ex-art-md':48, 'ex-art-sm':28};
// 그림이 없는 종목은 부위 글자 아이콘으로 자리를 채운다(fallback: true일 때)
const PART_GLYPH = {'가슴':'가슴','등':'등','하체':'하체','어깨':'어깨','팔':'팔','복근':'코어','전신':'전신','유산소':'유산소','필라테스':'필라','요가':'요가'};
export function exArtHTML(x, cls = 'ex-art-sm', {fallback = false} = {}){
 const f = artFile(x), s = SIZE[cls] || 28;
 if(f) return `<img class="ex-art ${cls}" src="art/ex/${h(f)}.webp" alt="" loading="lazy" decoding="async" width="${s}" height="${s}">`;
 if(!fallback) return '';
 const part = typeof x === 'object' ? (x?.kind === 'cardio' ? '유산소' : x?.part) : (findExercise(x)?.part);
 return `<span class="ex-art ex-art-ph ${cls}" aria-hidden="true" style="width:${s}px;height:${s}px">${h(PART_GLYPH[part] || '운동')}</span>`;
}
