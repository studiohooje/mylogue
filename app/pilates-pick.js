// 4.17.0 빠른 운동 기록에서 필라테스 동작 고르기(대표님: "필라테스 카테고리에 5개밖에 안 보여").
// 수업 종류 5가지 아래에 기구별 동작(사전 479개)을 바로 보여 주고, 고르면 그 기구의 수업 기록에 동작이 담긴다.
import {PILATES_DICT} from './pilates-moves-data.js';
import {MOVES} from './pilates.js';
import {pilatesArtHTML} from './pilates-art.js';
import {matchScore} from './suggest.js';

const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));
export const PM_APPS = ['매트', '리포머', '캐딜락', '체어', '래더 배럴', '스파인 코렉터', '아크 배럴', '리포머 타워'];
// 기구 → 수업 종목 이름(운동 도감)
export const classOf = app => ({'매트': '필라테스 매트', '캐딜락': '필라테스 캐딜락', '리포머 타워': '필라테스 리포머 타워', '체어': '필라테스 체어', '래더 배럴': '필라테스 바렐', '스파인 코렉터': '필라테스 스파인 코렉터', '아크 배럴': '필라테스 아크 배럴'})[app] || '필라테스 리포머';
const INFO = new Map(PILATES_DICT.map(r => [`${r[0]}|${r[1]}`, r]));
export function movesFor(app) { return (MOVES[app] || []).map(name => { const r = INFO.get(`${name}|${app}`); return {name, apparatus: app, level: r?.[4] || '', en: r?.[2] || ''}; }); }
export function searchMoves(query, limit = 40) {
  const q = String(query || '').trim(); if (!q) return [];
  const out = [];
  for (const app of PM_APPS) for (const name of MOVES[app] || []) {
    const r = INFO.get(`${name}|${app}`), score = matchScore(q, [name, r?.[2] || '', ...(r?.[3] || [])]);
    if (score > 0) out.push({name, apparatus: app, level: r?.[4] || '', en: r?.[2] || '', score});
  }
  return out.sort((a, b) => b.score - a.score).slice(0, limit);
}
export const totalMoves = () => PM_APPS.reduce((n, a) => n + (MOVES[a] || []).length, 0);
const moveBtn = m => `<button type="button" class="pm-pick" data-q-pmove="${esc(m.name)}|${esc(m.apparatus)}">${pilatesArtHTML(m, 'ex-art-xs')}<span><b>${esc(m.name)}</b><small>${esc(m.apparatus)}${m.level ? ` · ${esc(m.level)}` : ''}</small></span></button>`;
// 필라테스 카테고리·검색 결과 아래에 붙는 동작 목록
export function pilatesMovesHTML(s, {open = false} = {}) {
  const q = String(s.query || '').trim();
  if (q) { const found = searchMoves(q, open ? 60 : 12); return found.length ? `<div class="pm-block"><p class="pm-head">필라테스 동작 <small>${found.length}개</small></p><div class="pm-grid">${found.map(moveBtn).join('')}</div></div>` : ''; }
  const app = PM_APPS.includes(s.pmApp) ? s.pmApp : '매트', list = movesFor(app);
  return `<div class="pm-block"><p class="pm-head">동작으로 고르기 <small>전체 ${totalMoves()}개 · 고르면 그 기구 수업에 담겨요</small></p><div class="chip-row pm-apps">${PM_APPS.filter(a => (MOVES[a] || []).length).map(a => `<button type="button" class="chip small ${a === app ? 'active' : ''}" data-q-pmapp="${esc(a)}">${esc(a)} <small>${(MOVES[a] || []).length}</small></button>`).join('')}</div><div class="pm-grid${open ? ' open' : ''}">${list.map(moveBtn).join('')}</div></div>`;
}
// 수업 기록 화면 안: 담은 동작
export function pickedMovesHTML(s) {
  const list = s.pmoves || [];
  return `<div class="pm-picked"><p class="pm-head">오늘 한 동작 <small>${list.length ? `${list.length}개` : '선택 · 위 목록에서 눌러 담아요'}</small></p>${list.length ? `<div class="pm-chips">${list.map((m, i) => `<span class="pm-chip">${pilatesArtHTML(m, 'ex-art-xs')}<b>${esc(m.name)}</b><button type="button" data-q-pmove-del="${i}" aria-label="${esc(m.name)} 빼기">×</button></span>`).join('')}</div>` : ''}</div>`;
}
export function addPickedMove(s, value) {
  const [name, apparatus] = String(value || '').split('|');
  if (!name) return s;
  const list = s.pmoves || [];
  if (list.some(m => m.name === name && m.apparatus === apparatus)) return s;
  return {...s, pmoves: [...list, {name, apparatus}].slice(0, 60)};
}

// 5.4.9 대표님: 필라테스는 '큰 종목(매트·리포머…) → 수업 전체 시간 또는 그 기구 동작'. 동작 목록과 검색은 수업 칸 안에.
export const appOfClass = name => PM_APPS.find(a => classOf(a) === name) || '';
export function classMovesHTML(s, className) {
  const app = appOfClass(className), list = app ? movesFor(app) : [];
  const picked = pickedMovesHTML(s).replace('선택 · 위 목록에서 눌러 담아요', '선택 · 아래에서 눌러 담아요');
  if (!list.length) return picked;
  const key = m => `${m.name} ${m.en}`.toLocaleLowerCase('ko').replace(/\s+/g, '');
  return `${picked}<div class="pm-class"><p class="pm-head">${esc(app)} 동작 <small>${list.length}개 · 선택</small></p><input class="pm-filter" data-pm-filter type="search" autocomplete="off" placeholder="${esc(app)} 동작 검색 (예: ${esc(list.slice(0, 2).map(m => m.name).join(', '))})" aria-label="${esc(app)} 동작 검색"><div class="pm-grid pm-in-class">${list.map(m => moveBtn(m).replace('<button type="button" class="pm-pick"', `<button type="button" class="pm-pick" data-pm-key="${esc(key(m))}"`)).join('')}</div><p class="hint pm-none" hidden>찾는 동작이 없어요.</p></div>`;
}
// 동작 검색: 목록을 다시 그리지 않고 이 칸 안에서만 걸러 보인다(글자 입력이 끊기지 않게)
if (typeof document !== 'undefined' && typeof document.addEventListener === 'function') document.addEventListener('input', e => {
  const t = e.target; if (!t?.matches?.('[data-pm-filter]')) return;
  const q = String(t.value || '').toLocaleLowerCase('ko').replace(/\s+/g, ''), box = t.closest('.pm-class'); if (!box) return;
  let n = 0; box.querySelectorAll('[data-pm-key]').forEach(b => { const on = !q || b.dataset.pmKey.includes(q); b.hidden = !on; if (on) n++; });
  const none = box.querySelector('.pm-none'); if (none) none.hidden = n > 0;
});
