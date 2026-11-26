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
export function workSourceHTML({src = 'self', recent = [], routines = [], classes = [], photo = {limit: 3, left: 3}, find = null} = {}){
  const tab = src === 'coach' ? 'help' : src;
  const tabs = [['past', '↻', '지난 운동에서', '했던 운동 그대로'], ['help', '✦', '도움받기', '코치 루틴 · 기구 찾기'], ['self', '✎', '직접 고르기', '부위·종목 고르기']];
  const md = d => `${Number(String(d).slice(5, 7))}/${Number(String(d).slice(8, 10))}`;
  let body = '';
  if(src === 'past') body = recent.length ? `<div class="hs-list">${recent.map(w => `<button type="button" class="hs-opt" data-q-wpast="${esc(w.id)}"><span class="hs-ico" aria-hidden="true">↻</span><span class="hs-t"><b>${esc(w.title || '운동')}</b><small>${md(w.date)} · ${w.exCount}종목 · 고른 부위 그대로 시작</small></span><i aria-hidden="true">›</i></button>`).join('')}</div>` : '<p class="hint">아직 지난 운동이 없어요. 직접 고르기로 시작해요.</p>';
  if(src === 'help') body = helpOptionsHTML([
    {ico: '🏋', title: '코치에게 제안받은 루틴 · 수업 운동', sub: `루틴 ${routines.length}개 · 수업 ${classes.length}개 · 혼자 할 때`, attr: 'data-q-wsrc="coach"', off: !routines.length && !classes.length, why: '연동된 코치님이 루틴을 보내거나 수업을 확정하면 열려요'},
    {ico: '📷', title: '이 기구 뭐지? 사진으로 찾기', sub: '헬스장 기구를 찍으면 이름·쓰는 근육·사용법을 알려 주고 바로 그 종목으로 시작해요', attr: 'data-q-ai-wphoto', off: photo.left <= 0, why: `오늘 ${photo.limit}번을 다 썼어요 · 내일 다시 열려요`, badge: photo.left > 0 ? `오늘 ${photo.left}/${photo.limit}번` : ''},
  ]);
  if(src === 'coach') body = `<button type="button" class="text-button mi-back" data-q-wsrc="help">‹ 도움받기</button><div class="hs-list">${classes.map(w => `<button type="button" class="hs-opt" data-q-wclass="${esc(w.id)}"><span class="hs-ico" aria-hidden="true">📋</span><span class="hs-t"><b>${esc(md(w.date))} 수업 그대로</b><small>${esc(w.title || '코치 수업')} · ${w.exCount}종목 · 무게는 혼자용으로 -10%</small></span><i aria-hidden="true">›</i></button>`).join('')}${routines.map(r => `<button type="button" class="hs-opt" data-q-wroutine="${esc(r.id)}"><span class="hs-ico" aria-hidden="true">🏋</span><span class="hs-t"><b>${esc(r.title || '코치 루틴')}</b><small>${esc((r.items || []).map(x => x.name).slice(0, 4).join(' · '))}${(r.items || []).length > 4 ? ` 외 ${r.items.length - 4}` : ''} · ${esc(r.trainerName || '코치')} 코치님</small></span><i aria-hidden="true">›</i></button>`).join('')}</div>`;
  if(src === 'help' && find) body = machineFindHTML(find) + body;
  return `<section class="mi-src ws-src"><div class="mi-tabs" role="tablist" aria-label="운동 넣는 방법">${tabs.map(([k, ic, t, sub]) => `<button type="button" role="tab" class="${k === tab ? 'on' : ''}" aria-selected="${k === tab}" data-q-wsrc="${k}"><i aria-hidden="true">${ic}</i><b>${t}</b><small>${sub}</small></button>`).join('')}</div>${body}</section>`;
}

// 5.4.5 대표님: 운동 '도움받기'의 사진 = 기록이 아니라 '이게 무슨 기구인지' 찾는 도구
export function machineFindHTML(f = {}){
  const esc2 = v => String(v ?? '').replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));
  const shot = f.thumb ? `<img class="mf-shot" src="${esc2(f.thumb)}" alt="찍은 기구 사진">` : '';
  if(f.loading) return `<div class="mf-card" role="status">${shot}<div><b>기구를 알아보는 중…</b><small>사진 한 장으로 이름·쓰는 근육·사용법을 찾고 있어요</small></div></div>`;
  if(f.err) return `<div class="mf-card warn" role="alert">${shot}<div><b>${esc2(f.err)}</b><small>기구 전체가 보이게, 옆에서 한 번 더 찍어 보세요</small><div class="mf-acts"><button type="button" class="chip" data-q-ai-wphoto>다시 찍기</button><button type="button" class="chip" data-q-mfclose>닫기</button></div></div></div>`;
  const m = f.m || {}; if(!m.name) return `<div class="mf-card warn" role="status">${shot}<div><b>무슨 기구인지 알아보지 못했어요</b><small>${esc2(m.note || '기구 전체나 이름표가 보이게 다시 찍어 주세요')} · 횟수는 돌려드렸어요</small><div class="mf-acts"><button type="button" class="chip" data-q-ai-wphoto>다시 찍기</button><button type="button" class="chip" data-q-mfclose>닫기</button></div></div></div>`;
  const conf = {high: '거의 확실', medium: '아마도', low: '확실하지 않음'}[m.confidence] || '';
  const go = (f.matches || []).map(x => `<button type="button" class="chip mf-go" data-q-ex="${esc2(x.key)}">${esc2(x.name)} 시작</button>`).join('');
  return `<div class="mf-card">${shot}<div class="mf-body"><span class="mf-eyebrow">이 기구는${conf ? ` · ${conf}` : ''}</span><b class="mf-name">${esc2(m.name)}</b>${m.aka?.length || m.brand ? `<small>${esc2([m.brand, ...(m.aka || [])].filter(Boolean).join(' · '))}</small>` : ''}
  ${m.muscles?.length ? `<p class="mf-row"><span>주로 쓰는 근육</span>${esc2(m.muscles.join(' · '))}</p>` : ''}
  ${m.how?.length ? `<ol class="mf-how">${m.how.map(h => `<li>${esc2(h)}</li>`).join('')}</ol>` : ''}
  <div class="mf-acts">${go}<button type="button" class="chip" data-q-mfsearch="${esc2(m.exercises?.[0] || m.name)}">종목 검색에서 보기</button><button type="button" class="chip" data-q-ai-wphoto>다른 기구 찍기</button><button type="button" class="chip ghost" data-q-mfclose>닫기</button></div>
  <p class="hint mf-note">AI가 사진으로 짐작한 거예요. 기록은 만들지 않아요.</p></div></div>`;
}
