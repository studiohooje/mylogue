import {EXERCISE_ART} from './exercise-art.js';
const h = v => String(v??'').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const hasExerciseArt = name => !!EXERCISE_ART[name];
export function exArtHTML(name, cls = 'ex-art-sm'){ const f = EXERCISE_ART[name]; return f ? `<img class="ex-art ${cls}" src="art/ex/${h(f)}.webp" alt="" loading="lazy" decoding="async" width="${cls==='ex-art-lg'?96:cls==='ex-art-md'?48:28}" height="${cls==='ex-art-lg'?96:cls==='ex-art-md'?48:28}">` : ''; }
