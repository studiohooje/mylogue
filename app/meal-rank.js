import {helpOptionsHTML} from './input-sources.js';
import {memberCoachMealsHTML} from './coach-diet.js';
// 4.26.0 대표님 지시: 식단도 운동의 '많이 쓴 머신'처럼, 자주 먹은 것과 평소 이 시간쯤 먹던 것을 위로.
// 지난 식사 그대로는 어제 하나가 아니라 며칠 치를 작은 칩으로(지금 시각에 가까운 끼니 먼저).
// 이 파일은 app.js를 import하지 않는다(이중 로딩 방지).

const DAY = 86400000;
const pad = n => String(n).padStart(2, '0');
const noon = d => new Date(`${d}T12:00:00`).getTime();
const minsOf = iso => { const t = new Date(iso); return Number.isNaN(t.getTime()) ? null : t.getHours()*60 + t.getMinutes(); };
const hmMins = hm => { const [h, m] = String(hm || '12:00').split(':').map(Number); return (Number.isFinite(h) ? h : 12)*60 + (Number.isFinite(m) ? m : 0); };
// 하루를 원으로 본 두 시각의 차(분). 23:30과 00:30은 60분.
export const clockGap = (a, b) => { const d = Math.abs(a - b) % 1440; return Math.min(d, 1440 - d); };
export const usageKey = x => `${String(x?.name || '').toLocaleLowerCase('ko')}|${x?.servingUnit || 'g'}`;

// 음식별 점수: 최근일수록(반감기 21일) 크고, 지금 시각과 비슷한 때 먹었으면 더 크다. 그날 이전·실제로 먹은 기록만.
export function foodUsage(meals = [], date = '', time = '12:00', {days = 60, halfLife = 21, width = 75} = {}){
 const out = new Map(), target = hmMins(time), d0 = date ? noon(date) : Date.now();
 for (const m of meals) {
  if (m.planned || !m.name || !m.date || (date && m.date > date)) continue;
  const age = (d0 - noon(m.date)) / DAY; if (age < 0 || age > days) continue;
  const w = Math.pow(0.5, age / halfLife), at = minsOf(m.loggedAt), tm = at == null ? 0 : Math.exp(-Math.pow(clockGap(at, target) / width, 2));
  const k = usageKey(m), v = out.get(k) || {score: 0, timeScore: 0, count: 0};
  v.score += w * (1 + 2*tm); v.timeScore += w * tm; v.count++; out.set(k, v);
 }
 return out;
}
// '이 시간에 자주': 이 시간대에 최근 여러 번 먹은 음식
export const isTimeHabit = u => !!u && u.count >= 2 && u.timeScore >= 1.2;
// 이 시간에 자주 먹은 것 먼저, 그다음 기록 점수 순, 기록 없는 건 원래 순서대로 뒤에.
// (예전 주석) 기록이 있는 음식을 점수 순으로 앞에, 나머지는 원래 순서 그대로 뒤에.
export function rankByUsage(list = [], usage = new Map()){
 return list.map((x, i) => { const u = usage.get(usageKey(x)); return {x, i, h: isTimeHabit(u) ? 1 : 0, s: u?.score || 0}; }).sort((a, b) => (b.h - a.h) || (b.s - a.s) || (a.i - b.i)).map(r => r.x);
}

// 끼니 이름: 기록 시각으로(05~10 아침, 10~11 아점, 11~15 점심, 15~17 간식, 17~21 저녁, 그 밖 야식)
export function mealLabel(iso){ const m = minsOf(iso); if (m == null) return '식사'; const h = m / 60; return h >= 5 && h < 10 ? '아침' : h < 11 && h >= 10 ? '아점' : h >= 11 && h < 15 ? '점심' : h >= 15 && h < 17 ? '간식' : h >= 17 && h < 21 ? '저녁' : '야식'; }
export function dayLabel(d, today){ const n = Math.round((noon(today) - noon(d)) / DAY); return n === 1 ? '어제' : n > 1 && n <= 6 ? `${n}일 전` : `${Number(d.slice(5, 7))}/${Number(d.slice(8, 10))}`; }

// 지난 식사 그대로: 오늘 이전 N일의 끼니 묶음. 같은 구성은 가장 최근 하나만. 지금 시각에 가까운 끼니 → 최근 순.
export function pastMeals(meals = [], date, time = '12:00', {days = 7, limit = 8} = {}){
 const d0 = noon(date), target = hmMins(time), groups = new Map();
 for (const m of meals) {
  if (m.planned || !m.date || m.date >= date) continue;
  const age = (d0 - noon(m.date)) / DAY; if (age > days) continue;
  const k = m.mealGroupId || `${m.date}|${m.slot}`;
  if (!groups.has(k)) groups.set(k, {key: k, date: m.date, at: m.loggedAt || `${m.date}T12:00:00`, items: []});
  groups.get(k).items.push(m);
 }
 const seen = new Set(), list = [];
 for (const g of [...groups.values()].sort((a, b) => String(b.at).localeCompare(String(a.at)))) {
  const sig = g.items.map(x => x.name).sort().join('|'); if (!g.items.length || seen.has(sig)) continue; seen.add(sig);
  const at = minsOf(g.at), gap = at == null ? 720 : clockGap(at, target), age = (d0 - noon(g.date)) / DAY;
  list.push({...g, label: `${dayLabel(g.date, date)} ${mealLabel(g.at)}`, kcal: g.items.reduce((a, x) => a + (Number(x.calories) || 0), 0), score: Math.exp(-Math.pow(gap / 120, 2)) * 2 + Math.pow(0.5, age / 3)});
 }
 return list.sort((a, b) => b.score - a.score || String(b.at).localeCompare(String(a.at))).slice(0, limit);
}
const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
// 5.1.0 대표님(식사 창 목업 확정): '지난 식사에서 · 메이트로그에서 · 직접 입력하기' 세 갈래, 지난 식사는 좁은 카드(한 줄에 한 음식 · 앞부분… + 양, 3개 + 외 N, 총 칼로리)
export function mealSourceHTML(db, s, plans = [], photo = {limit: 3, left: 3}){
 /* 5.4.0 D16: 연동된 코치가 식단 제안을 한 번이라도 보냈으면 '코치 제안' 갈래 */
 const list = pastMeals(db.meals || [], s.date, s.time), src = s.src || (list.length && !String(s.query || '').trim() ? 'past' : 'self');
 const q = x => `${Number(x.servingQty) % 1 ? Number(x.servingQty).toFixed(1) : (x.servingQty ?? '')}${esc(x.servingUnit || '')}`;
 /* 5.4.0 대표님: 지난 식사 · 도움받기(코치 제안·메이트로그·AI 사진) · 직접 입력 세 갈래 */
 const tab = src === 'coach' || src === 'mate' ? 'help' : src;
 const tabs = [['past', '↻', '지난 식사에서', '먹었던 한 끼 통째로'], ['help', '✦', '도움받기', '코치 · 메이트로그 · AI 사진'], ['self', '✎', '직접 입력하기', '검색·직접 적기']];
 const card = g => { const rest = g.items.slice(3); return `<div class="mv-card"><div class="mv-top"><b class="mv-h">${esc(g.label)}</b><span class="mv-kcal">${Math.round(g.kcal).toLocaleString('ko-KR')}<small>kcal</small></span></div><ul>${g.items.slice(0, 3).map(x => `<li title="${esc(x.name)} ${q(x)}"><span class="mv-name">${esc(x.name)}</span><span class="mv-qty">${q(x)}</span></li>`).join('')}${rest.length ? `<li class="mv-more"><button type="button" class="mv-morebtn">… 외 ${rest.length}개</button><span class="mv-tip" role="tooltip">${rest.map(x => `<span>${esc(x.name)} <b>${q(x)}</b></span>`).join('')}</span></li>` : ''}</ul><div class="mv-acts"><button type="button" class="mv-go" data-q-again-save="${esc(g.key)}">통째로 기록</button><button type="button" class="mv-edit" data-q-again-meal="${esc(g.key)}">세부 수정</button></div></div>`; };
 const pcard = p => { const items = p.items || [], rest = items.slice(3), kcal = items.reduce((a, x) => a + (Number(x.calories) || 0), 0); return `<div class="mv-card mv-coach"><div class="mv-top"><b class="mv-h">${esc(p.title || p.slot || '식단 제안')}</b><span class="mv-kcal">${Math.round(kcal).toLocaleString('ko-KR')}<small>kcal</small></span></div><ul>${items.slice(0, 3).map(x => `<li title="${esc(x.name)} ${q(x)}"><span class="mv-name">${esc(x.name)}</span><span class="mv-qty">${q(x)}</span></li>`).join('')}${rest.length ? `<li class="mv-more"><button type="button" class="mv-morebtn">… 외 ${rest.length}개</button><span class="mv-tip" role="tooltip">${rest.map(x => `<span>${esc(x.name)} <b>${q(x)}</b></span>`).join('')}</span></li>` : ''}</ul>${p.note ? `<p class="mv-note">“${esc(p.note)}”</p>` : ''}<small class="mv-by">${esc(p.trainerName || '코치')} 코치님 제안</small><div class="mv-acts"><button type="button" class="mv-go" data-q-coach-save="${esc(p.id)}">통째로 기록</button><button type="button" class="mv-edit" data-q-coach-meal="${esc(p.id)}">세부 수정</button></div></div>`; };
 const helpBody = helpOptionsHTML([
  {ico: '🏋', title: '코치에게 제안받은 식단', sub: `${plans.length}개 · 통째로 기록하거나 양을 고쳐서`, attr: 'data-q-src="coach"', off: !plans.length, why: '연동된 코치님이 식단을 제안하면 열려요'},
  {ico: '📷', title: '메이트로그에서 가져오기', sub: '메이트 방에 올린 내 식사 사진으로 AI 초안', attr: 'data-mate-picker'},
  {ico: '✦', title: 'AI에게 사진 분석시키기', sub: '앱 안에서 찍으면 음식·양을 정리해요', attr: 'data-q-ai-photo', off: photo.left <= 0, why: `오늘 ${photo.limit}번을 다 썼어요 · 내일 다시 열려요`, badge: photo.left > 0 ? `오늘 ${photo.left}/${photo.limit}번` : ''},
 ]);
 const back = '<button type="button" class="text-button mi-back" data-q-src="help">‹ 도움받기</button>';
 const body = src === 'help' ? helpBody : src === 'mate' ? helpBody : src === 'coach' ? `${back}<p class="hint mi-coach-h">꼭 이대로 먹을 필요는 없어요. 담은 뒤 양을 바꿔도 돼요.</p>${memberCoachMealsHTML(plans.map(p => p.mode ? p : {...p, mode: 'single'}), {time: s.time})}` : src === 'past' ? (list.length ? `<div class="mv1">${list.map(card).join('')}</div>` : '<p class="hint mi-empty">아직 지난 식사가 없어요. 직접 입력하기로 첫 끼니를 남겨 보세요.</p>') : src === 'mate' ? `<div class="mi-mate"><p>메이트 방에 올린 <b>내 식사 사진</b>을 골라 AI가 음식·양을 정리해요. 정리된 초안은 고친 뒤 담아요.</p><button type="button" class="button quick-primary" data-mate-picker>메이트로그 사진 고르기</button></div>` : '';
 return {src, html: `<section class="mi-src"><div class="mi-tabs" role="tablist" aria-label="식사 넣는 방법">${tabs.map(([k, ic, t, sub]) => `<button type="button" role="tab" class="${k === tab ? 'on' : ''}" aria-selected="${k === tab}" data-q-src="${k}"><i aria-hidden="true">${ic}</i><b>${t}</b><small>${sub}</small></button>`).join('')}</div>${body}</section>`};
}
export function pastMealsHTML(db, s){
 const list = pastMeals(db.meals || [], s.date, s.time); if (!list.length) return '';
 const names = g => { const n = g.items.map(x => x.name); return n.length > 1 ? `${n[0]} 외 ${n.length - 1}` : n[0]; };
 return `<section class="quick-again compact" aria-label="지난 식사 그대로"><div class="qa-head"><span class="qa-ico" aria-hidden="true">↻</span><b>지난 식사 그대로</b><small>누르면 통째로 담겨요 · 양은 담은 뒤 바꿔요</small></div><div class="qa-scroll">${list.map(g => `<button type="button" class="qa-chip" data-q-again-meal="${esc(g.key)}" title="${esc(g.items.map(x => x.name).join(', '))}"><b>${esc(g.label)}</b><small>${esc(names(g))} · ${Math.round(g.kcal).toLocaleString('ko-KR')}kcal</small></button>`).join('')}</div></section>`;
}
