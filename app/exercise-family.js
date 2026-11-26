// 5.4.9 대표님: 한 종목 안의 소분류(방식). 예: 덤벨 데드리프트 = 일반 · 스티프 레그 · 루마니안.
// 각 방식은 따로 있는 기본 종목이라 기록·성장은 방식별로 쌓이고, 운동 창에서는 한 묶음으로 보여 바로 바꿀 수 있다.
// 이 파일은 app.js를 import하지 않는다.
export const EXERCISE_FAMILIES = Object.freeze([
 {name: '덤벨 데드리프트', items: [['일반', 'exercise:덤벨 데드리프트'], ['스티프 레그', 'exercise:덤벨 스티프 레그 데드리프트'], ['루마니안', 'exercise:덤벨 루마니안 데드리프트']]},
]);
export function familyOfExercise(id){ return EXERCISE_FAMILIES.find(f => f.items.some(([, x]) => x === id)) || null; }
// 운동 창의 '선택한 종목' 아래: 같은 묶음의 방식 칩(누르면 그 종목으로 바뀜, data-q-ex는 기존 종목 고르기와 같다)
export function familyChipsHTML(id, esc = v => String(v ?? '')){
 const f = familyOfExercise(id); if(!f) return '';
 return `<div class="q-family" role="group" aria-label="${esc(f.name)} 방식"><span class="q-family-label">${esc(f.name)} · 방식</span><div class="q-family-row">${f.items.map(([label, x]) => `<button type="button" class="chip ${x === id ? 'active' : ''}" data-q-ex="${esc(x)}" aria-pressed="${x === id}">${esc(label)}</button>`).join('')}</div></div>`;
}
