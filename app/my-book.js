// 5.4.9 대표님: 설정 › 음식·운동 도감 안에 '내 음식·내 종목' 목록과 지우기.
// 기본 DB(앱 안 음식 DB)·기본 종목에 같은 게 있으면 표시하고 한 번에 지울 수 있다. 지워도 지난 식사·운동 기록의 숫자는 그대로(기록은 그때 값을 따로 저장).
// 이 파일은 app.js를 import하지 않는다($s·$f로 앱과 이어진다).
import {partOf} from './body-part.js';
import {$s, $f} from './app-state.js';
import {foodDBReady, loadFoodDB, isPublicFoodName, searchFoodDB} from './food-db.js';
import {resolveExercise} from './catalog.js';
const norm = v => String(v || '').toLocaleLowerCase('ko').replace(/\s+/g, '').replace(/[()（）\[\]·.,_-]/g, '');
const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));
let loading = false;
export function foodInBase(f){
 if(!foodDBReady()) return null;
 const n = String(f?.name || '').trim(); if(!n) return false;
 if(isPublicFoodName(n)) return true;
 const k = norm(n);
 return searchFoodDB(n, {limit: 8}).some(x => norm(String(x.name).split(' · ')[0]) === k || norm(x.name) === k || (x.aliases || []).some(a => norm(a) === k));
}
export function exerciseInBase(e){ const r = resolveExercise(e?.name || ''); return !!(r && r.id && String(r.id).startsWith('exercise:')); }
const fmtQty = f => `${Number(f.servingQty) || 1}${f.servingUnit || ''}`;
export function myBookHTML(){
 const db = $s.db || {}, foods = db.foods || [], exs = db.customExercises || [];
 if(!foodDBReady() && !loading){ loading = true; loadFoodDB().then(() => { loading = false; $f.render(); }).catch(() => { loading = false; }); }
 const tab = $s.myBookTab === 'ex' ? 'ex' : 'food';
 const rows = tab === 'food'
  ? foods.map(f => ({id: f.id, kind: 'food', name: f.name, sub: `${fmtQty(f)} · ${Math.round((Number(f.calories) || 0) * 10) / 10}kcal`, dup: foodInBase(f)}))
  : exs.map(e => ({id: e.id, kind: 'ex', name: e.name, sub: [partOf(e), e.equipment].filter(Boolean).join(' · '), dup: exerciseInBase(e)}));
 const dupN = rows.filter(r => r.dup === true).length;
 const tag = r => r.dup === null ? '<span class="mb-tag wait">확인 중</span>' : r.dup ? `<span class="mb-tag dup">${tab === 'food' ? '기본 DB에 있음' : '기본 종목에 있음'}</span>` : '<span class="mb-tag own">나만 쓰는 값</span>';
 const list = rows.map(r => `<div class="mb-row"><span class="mb-name"><b>${esc(r.name)}</b><small>${esc(r.sub)}</small></span>${tag(r)}<button type="button" class="mb-del" data-mybook-del="${r.kind}:${esc(r.id)}" aria-label="${esc(r.name)} 지우기">지우기</button></div>`).join('');
 return `<section class="section card my-book"><h3>내 음식·내 종목 <small class="hint">이 계정에만 보여요</small></h3><div class="mb-tabs" role="tablist"><button type="button" role="tab" class="${tab === 'food' ? 'on' : ''}" aria-selected="${tab === 'food'}" data-mybook-tab="food">내 음식 ${foods.length}</button><button type="button" role="tab" class="${tab === 'ex' ? 'on' : ''}" aria-selected="${tab === 'ex'}" data-mybook-tab="ex">내 종목 ${exs.length}</button></div>${list || `<p class="hint">${tab === 'food' ? '직접 등록한 음식이 없어요.' : '직접 등록한 종목이 없어요.'}</p>`}${dupN ? `<button type="button" class="mb-all" data-mybook-dupdel="${tab}">${tab === 'food' ? '기본 DB' : '기본 종목'}에 있는 것 ${dupN}개 한 번에 지우기</button>` : ''}<p class="hint">지워도 지난 ${tab === 'food' ? '식사' : '운동'} 기록의 숫자는 그대로 남아요.</p></section>`;
}
export function myBookClick(t){
 const d = t.dataset || {};
 if(d.mybookTab){ $s.myBookTab = d.mybookTab; $f.render(); return true; }
 if(d.mybookDel){
  const [kind, ...rest] = d.mybookDel.split(':'), id = rest.join(':'), key = kind === 'food' ? 'foods' : 'customExercises';
  const item = ($s.db[key] || []).find(x => x.id === id); if(!item) return true;
  if(!confirm(`'${item.name}'을(를) 내 ${kind === 'food' ? '음식' : '종목'}에서 지울까요? 지난 기록의 숫자는 그대로예요.`)) return true;
  $s.db = $f.save({...$s.db, [key]: ($s.db[key] || []).filter(x => x.id !== id)}); $f.render(); $f.toast(`'${item.name}'을(를) 지웠어요.`); return true;
 }
 if(d.mybookDupdel){
  const food = d.mybookDupdel === 'food', key = food ? 'foods' : 'customExercises';
  const gone = ($s.db[key] || []).filter(x => (food ? foodInBase(x) : exerciseInBase(x)) === true); if(!gone.length) return true;
  if(!confirm(`${food ? '기본 DB' : '기본 종목'}에 이미 있는 ${gone.length}개를 내 ${food ? '음식' : '종목'}에서 지울까요?\n${gone.map(x => '· ' + x.name).join('\n')}\n지난 기록의 숫자는 그대로예요.`)) return true;
  const ids = new Set(gone.map(x => x.id));
  $s.db = $f.save({...$s.db, [key]: ($s.db[key] || []).filter(x => !ids.has(x.id))}); $f.render(); $f.toast(`${gone.length}개를 지웠어요.`); return true;
 }
 return false;
}
