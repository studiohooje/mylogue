// 5.4.0 대표님(2026-11-26): 식사·운동 입력 창의 '도움받기' 갈래 — 코치 제안 · 메이트로그 · AI 사진 분석.
// 쓸 수 없는 갈래도 숨기지 않고 회색으로 보여 준다(왜 안 되는지 한 줄). AI 사진은 하루 횟수(무료/플러스)를 보여 준다.
// 이 파일은 app.js를 import하지 않는다.
import {scopedKey} from './storage-scope.js';

export const PHOTO_PER_DAY = {free: 3, plus: 20};
const KEY = () => scopedKey('mylogue.aiPhotoDay');
const today = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
function read(){ try{ const v = JSON.parse(globalThis.localStorage?.getItem(KEY()) || 'null'); return v && v.date === today() ? v : {date: today(), used: 0}; }catch{ return {date: today(), used: 0}; } }
export function photoQuota(plus = false){ const limit = plus ? PHOTO_PER_DAY.plus : PHOTO_PER_DAY.free, used = read().used; return {limit, used, left: Math.max(0, limit - used)}; }
export function usePhoto(){ const v = read(); v.used += 1; try{ globalThis.localStorage?.setItem(KEY(), JSON.stringify(v)); }catch{} return v.used; }

const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));
// opts: [{key, ico, title, sub, attr, off, why}]
export function helpOptionsHTML(opts){
  return `<div class="hs-list">${opts.map(o => `<button type="button" class="hs-opt${o.off ? ' off' : ''}" ${o.off ? 'aria-disabled="true" data-hs-off' : o.attr} ${o.off ? `data-hs-why="${esc(o.why || '')}"` : ''}><span class="hs-ico" aria-hidden="true">${o.ico}</span><span class="hs-t"><b>${esc(o.title)}</b><small>${esc(o.off ? (o.why || o.sub) : o.sub)}</small></span>${o.badge ? `<span class="hs-badge">${esc(o.badge)}</span>` : '<i aria-hidden="true">›</i>'}</button>`).join('')}</div>`;
}

// ---------- 운동 창: 지난 운동에서 · 도움받기 · 직접 고르기 (식사 창과 같은 모양) ----------
// recent: [{id, title, date, targets, exCount}], routines: [{id, title, trainerName, items:[{name}]}]
export function workSourceHTML({src = 'self', recent = [], routines = [], photo = {limit: 3, left: 3}} = {}){
  const tab = src === 'coach' ? 'help' : src;
  const tabs = [['past', '↻', '지난 운동에서', '했던 운동 그대로'], ['help', '✦', '도움받기', '코치 루틴 · AI 사진'], ['self', '✎', '직접 고르기', '부위·종목 고르기']];
  const md = d => `${Number(String(d).slice(5, 7))}/${Number(String(d).slice(8, 10))}`;
  let body = '';
  if(src === 'past') body = recent.length ? `<div class="hs-list">${recent.map(w => `<button type="button" class="hs-opt" data-q-wpast="${esc(w.id)}"><span class="hs-ico" aria-hidden="true">↻</span><span class="hs-t"><b>${esc(w.title || '운동')}</b><small>${md(w.date)} · ${w.exCount}종목 · 고른 부위 그대로 시작</small></span><i aria-hidden="true">›</i></button>`).join('')}</div>` : '<p class="hint">아직 지난 운동이 없어요. 직접 고르기로 시작해요.</p>';
  if(src === 'help') body = helpOptionsHTML([
    {ico: '🏋', title: '코치에게 제안받은 루틴', sub: `${routines.length}개 · 수업 없는 날 개인 운동으로`, attr: 'data-q-wsrc="coach"', off: !routines.length, why: '연동된 코치님이 루틴을 보내면 열려요'},
    {ico: '✦', title: 'AI에게 사진 분석시키기', sub: '다른 앱 화면·화이트보드 사진으로 운동 정리', attr: 'data-q-ai-wphoto', off: photo.left <= 0, why: `오늘 ${photo.limit}번을 다 썼어요 · 내일 다시 열려요`, badge: photo.left > 0 ? `오늘 ${photo.left}/${photo.limit}번` : ''},
  ]);
  if(src === 'coach') body = `<button type="button" class="text-button mi-back" data-q-wsrc="help">‹ 도움받기</button><div class="hs-list">${routines.map(r => `<button type="button" class="hs-opt" data-q-wroutine="${esc(r.id)}"><span class="hs-ico" aria-hidden="true">🏋</span><span class="hs-t"><b>${esc(r.title || '코치 루틴')}</b><small>${esc((r.items || []).map(x => x.name).slice(0, 4).join(' · '))}${(r.items || []).length > 4 ? ` 외 ${r.items.length - 4}` : ''} · ${esc(r.trainerName || '코치')} 코치님</small></span><i aria-hidden="true">›</i></button>`).join('')}</div>`;
  return `<section class="mi-src ws-src"><div class="mi-tabs" role="tablist" aria-label="운동 넣는 방법">${tabs.map(([k, ic, t, sub]) => `<button type="button" role="tab" class="${k === tab ? 'on' : ''}" aria-selected="${k === tab}" data-q-wsrc="${k}"><i aria-hidden="true">${ic}</i><b>${t}</b><small>${sub}</small></button>`).join('')}</div>${body}</section>`;
}
