import {EXERCISE_ART} from './exercise-art.js';
import {EXERCISE_CATALOG, findExercise} from './catalog.js';
const h = v => String(v??'').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
// 4.16.0 그림 찾기: 이름이 정확히 같지 않아도(별칭·예전 이름·직접 입력) 종목 번호와 별칭으로 찾는다.
export function artFile(x){
 const name = typeof x === 'string' ? x : x?.name, id = typeof x === 'object' ? x?.exerciseId : null;
 if(name && EXERCISE_ART[name]) return EXERCISE_ART[name];
 const byId = id ? EXERCISE_CATALOG.find(e => e.id === id) : null;
 if(byId && EXERCISE_ART[byId.name]) return EXERCISE_ART[byId.name];
 const hit = name ? findExercise(name) : null;
 return hit && EXERCISE_ART[hit.name] ? EXERCISE_ART[hit.name] : '';
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
