// 4.28.x 'AI 기록' 대화창 — 기록하기와 묻기를 한 창에서(대표님 2026-11-25 목업 A·B).
// - 말하듯 적거나 사진을 보내면 AI 답이 대화로 오고, 기록은 대화 안의 카드로 나온다.
// - 카드에서 양을 한 번 눌러 바꾸고(반·1·1.5, g은 ±), '다른 음식'으로 바로 교체, '기록하기'로 바로 저장, '나중에 확인'은 검토함으로.
// - 앞의 대화를 함께 보내 "콜라는 제로였어"처럼 이어서 고칠 수 있다(AI 서버 converse).
// - 사진은 'AI가 읽어 주기'와 '사진만 남기고 직접 입력' 중에서 고른다.
// 이 파일은 app.js를 import하지 않는다. 저장·검토함 넣기는 app이 넘겨준 함수로 한다.
import {cameraSupported} from './snap-camera.js';
import {parsePaste} from './ai-paste.js';
import {MASS} from './domain.js';

const r1 = v => Math.round(Number(v) * 10) / 10;
const n0 = v => Math.round(Number(v) || 0).toLocaleString('ko-KR');
const hm = (d = new Date()) => `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
export const CHAT_MAX = 60;
export const newChat = () => ({msgs: [], input: '', photos: [], thumbs: [], choose: false, asking: false, left: null, search: null, loaded: false});
let seq = 0;
const mid = () => `c${Date.now().toString(36)}${(seq++).toString(36)}`;

// AI 답 → 대화 한 줄(요약 글 + 기록 카드). 코드가 없으면 글만.
export function replyToMsg(raw) {
 const text = String(raw || '');
 let cards = [];
 try { cards = parsePaste(text).map((d, i) => ({...d, key: `${mid()}-${i}`, status: 'open'})); } catch { cards = []; }
 const summary = text.replace(/```[a-zA-Z]*\s*[\s\S]*?```/g, '').replace(/\n{3,}/g, '\n\n').trim();
 return {id: mid(), role: 'ai', text: summary || (cards.length ? '이렇게 기록할까요? 양은 눌러서 바로 바꿀 수 있어요.' : '정리할 내용을 찾지 못했어요. 조금 더 자세히 적어 주세요.'), raw: text, cards, at: Date.now()};
}
// 서버로 보낼 앞의 대화(글만). AI 말은 원문(코드 포함)을 보내야 고칠 때 전체 기록을 다시 만들 수 있다.
export function historyForServer(st, limit = 10) {
 return st.msgs.filter(m => m.role === 'user' || m.role === 'ai').slice(-limit).map(m => ({role: m.role === 'ai' ? 'assistant' : 'user', text: m.role === 'ai' ? (m.raw || m.text) : (m.text || (m.photos?.length ? '(사진)' : ''))})).filter(m => m.text);
}
// 양 바꾸기: 지금 값은 '먹은 양 전체' 값 → 1단위 값으로 되돌려 새 양을 곱한다
export function scaleItem(item, qty) {
 const q = Number(qty), old = Number(item.servingQty) || 1;
 if (!(q > 0)) return item;
 const f = q / old, out = {...item, servingQty: r1(q)};
 for (const k of ['calories', 'carbs', 'protein', 'fat', 'sugar', 'fiber', 'satFat', 'sodium']) if (item[k] != null && item[k] !== '') out[k] = k === 'calories' ? Math.round(Number(item[k]) * f) : r1(Number(item[k]) * f);
 if (item.aiEstimate?.estimated) { const e = {...item.aiEstimate}; for (const k of Object.keys(e)) if (/Min$|Max$/.test(k) && e[k] != null) e[k] = r1(e[k] * f); out.aiEstimate = e; }
 return out;
}
export function qtyOptions(item) {
 const q = Number(item.servingQty) || 1, unit = item.servingUnit || '';
 if (MASS.has(unit)) { const step = q >= 300 ? 50 : q >= 100 ? 20 : 10, base = Math.round(q / step) * step || q; return [...new Set([Math.max(step, base - step), q, base + step].map(r1))]; }
 return [...new Set([0.5, 1, 1.5, 2, q].map(r1))].sort((a, b) => a - b);
}
// '다른 음식'으로 바꾸기(음식 DB 결과 rowToFood 모양). 무게 단위면 지금 무게를, 아니면 1단위로.
export function swapItem(item, food) {
 const mass = MASS.has(food.servingUnit);
 const grams = MASS.has(item.servingUnit) ? Number(item.servingQty) : (Number(item.unitGrams) || 0) * (Number(item.servingQty) || 1);
 const qty = mass ? (grams > 0 ? grams : 100) : (MASS.has(item.servingUnit) ? 1 : Number(item.servingQty) || 1);
 const f = mass ? qty / 100 : qty;
 const val = k => food[k] == null ? null : (k === 'calories' ? Math.round(food[k] * f) : r1(food[k] * f));
 const out = {...item, name: food.name, servingQty: qty, servingUnit: food.servingUnit, calories: val('calories'), carbs: val('carbs'), protein: val('protein'), fat: val('fat'), source: 'ai-reviewed', foodId: food.id};
 delete out.aiEstimate; if (food.unitGrams) out.unitGrams = food.unitGrams; else delete out.unitGrams;
 return out;
}
export const cardKcal = d => d.type === 'meal' ? (d.parsedData.items || []).reduce((s, it) => s + (Number(it.calories) || 0), 0) : null;
export const looksLikeQuestion = t => /\?|？|뭐 ?먹|어땠|어때|할까|알려|추천|왜 /.test(String(t || ''));

const qtyLabel = (q, unit) => MASS.has(unit) ? `${n0(q)}${unit}` : `${r1(q)}${unit || ''}`;
function mealCardHTML(d, mi, ci, st, esc) {
 const items = d.parsedData.items || [], open = d.status === 'open';
 const at = items[0]?.loggedAt ? hm(new Date(items[0].loggedAt)) : '';
 const rows = items.map((it, ii) => {
  const key = `${mi}|${ci}|${ii}`, searching = st.search?.key === key;
  const est = it.aiEstimate?.estimated && it.aiEstimate.caloriesMin != null ? ` · AI 추정 ${n0(it.aiEstimate.caloriesMin)}~${n0(it.aiEstimate.caloriesMax)}kcal` : '';
  const macro = [it.carbs, it.protein, it.fat].some(v => v != null) ? ` · 탄 ${r1(it.carbs ?? 0)} 단 ${r1(it.protein ?? 0)} 지 ${r1(it.fat ?? 0)}` : '';
  return `<div class="chat-item"><div class="chat-item-main"><b>${esc(it.name)}</b><small>${esc(qtyLabel(it.servingQty, it.servingUnit))}${esc(macro)}${esc(est)}</small></div><span class="chat-kcal">${it.calories == null ? '—' : n0(it.calories)}</span>${open ? `<div class="chips chat-chips">${qtyOptions(it).map(q => `<button type="button" class="chip ${Number(q) === Number(it.servingQty) ? 'active' : ''}" data-chat-qty="${key}|${q}">${esc(qtyLabel(q, it.servingUnit))}</button>`).join('')}<button type="button" class="chip chat-swap" data-chat-swap="${key}">다른 음식</button></div>` : ''}${searching ? `<div class="chat-search"><input id="chat-swap-q" type="search" placeholder="'${esc(it.name)}' 대신 찾기" value="${esc(st.search.q || '')}" autocomplete="off"><div class="chat-search-res">${(st.search.results || []).slice(0, 6).map((f, fi) => `<button type="button" class="chat-res" data-chat-pick="${fi}"><span>${esc(f.name)}</span><small>${f.calories == null ? '' : `${n0(f.calories)}kcal / ${MASS.has(f.servingUnit) ? `100${f.servingUnit}` : `1${f.servingUnit}`}`}</small></button>`).join('') || (st.search.q ? '<p class="hint">찾는 음식이 없어요.</p>' : '<p class="hint">이름을 적으면 바로 찾아요.</p>')}</div><button type="button" class="text-button" data-chat-swap-close>닫기</button></div>` : ''}</div>`;
 }).join('');
 return `<div class="chat-card"><div class="chat-card-head"><span>식사${at ? ` · ${at}` : ''}</span><span class="pill-kcal">${(d.parsedData.items || []).some(it => it.calories == null) ? (cardKcal(d) ? `${n0(cardKcal(d))}kcal+` : '열량 확인 필요') : `${n0(cardKcal(d))}kcal`}</span></div>${rows}${cardActions(d, mi, ci)}</div>`;
}
function bodyCardHTML(d, mi, ci, esc) {
 const p = d.parsedData, open = d.status === 'open';
 const vals = [p.weight != null && `체중 ${Number(p.weight).toFixed(1)}kg`, p.bodyFatPct != null && `체지방률 ${r1(p.bodyFatPct)}%`, p.skeletalMuscle != null && `골격근량 ${r1(p.skeletalMuscle)}kg`, p.waistCm != null && `허리 ${r1(p.waistCm)}cm`].filter(Boolean).join(' · ');
 return `<div class="chat-card"><div class="chat-card-head"><span>체중·인바디</span></div><div class="chat-item"><div class="chat-item-main"><b>${esc(vals || '수치')}</b><small>${esc(p.date || '')}</small></div>${open && p.weight != null ? `<div class="chips chat-chips"><button type="button" class="chip" data-chat-w="${mi}|${ci}|-0.1">− 0.1</button><button type="button" class="chip active" disabled>${Number(p.weight).toFixed(1)}</button><button type="button" class="chip" data-chat-w="${mi}|${ci}|0.1">+ 0.1</button></div>` : ''}</div>${cardActions(d, mi, ci)}</div>`;
}
function workoutCardHTML(d, mi, ci, esc) {
 const ex = d.parsedData.exercises || [];
 return `<div class="chat-card"><div class="chat-card-head"><span>운동 · ${esc(d.parsedData.title || '')}</span></div>${ex.map(e => `<div class="chat-item"><div class="chat-item-main"><b>${esc(e.name)}</b><small>${e.kind === 'cardio' ? `${e.durationMin ?? '-'}분` : `${(e.sets || []).length}세트 · ${(e.sets || []).map(s => `${r1(s.weight)}${s.unit || 'kg'}×${s.reps}`).slice(0, 3).join(', ')}`}</small></div></div>`).join('')}${cardActions(d, mi, ci)}</div>`;
}
function cardActions(d, mi, ci) {
 if (d.status === 'saved') return `<div class="chat-done">✓ 기록했어요 <button type="button" class="text-button" data-chat-undo="${mi}|${ci}">되돌리기</button></div>`;
 if (d.status === 'later') return '<div class="chat-done">검토함에 넣었어요</div>';
 return `<div class="actions chat-actions"><button type="button" class="button" data-chat-save="${mi}|${ci}">기록하기</button><button type="button" class="button secondary" data-chat-later="${mi}|${ci}">나중에 확인</button></div>`;
}
const SUGGEST = [['🍚 점심 기록', '점심에 '], ['⚖️ 체중계 사진', '#photo'], ['🏋️ 오늘 운동', '오늘 운동: '], ['🤔 저녁 뭐 먹지?', '!오늘 저녁 뭐 먹으면 좋을까?'], ['📊 이번 주 어땠어?', '!이번 주 기록 어땠어?']];
export function chatHTML(st, esc, {plus = false, left = null, connected = true, adminView = null} = {}) {
 const msgs = st.msgs.map((m, mi) => {
  if (m.role === 'user') return `<div class="chat-msg me">${(m.photos || []).length ? `<div class="chat-photos">${m.photos.map(p => `<img src="${esc(p)}" alt="보낸 사진">`).join('')}</div>` : ''}${m.text ? `<p>${esc(m.text).replace(/\n/g, '<br>')}</p>` : ''}</div>`;
  if (m.role === 'note') return `<div class="chat-note">${esc(m.text)}${m.action === 'meal' ? ' <button type="button" class="text-button" data-modal="meal">식사 직접 입력 ›</button>' : ''}</div>`;
  return `<div class="chat-msg ai"><span class="who">마이로그 AI</span><p>${esc(m.text).replace(/\n/g, '<br>')}</p></div>${(m.cards || []).map((d, ci) => d.type === 'meal' ? mealCardHTML(d, mi, ci, st, esc) : d.type === 'body' ? bodyCardHTML(d, mi, ci, esc) : d.type === 'workout' ? workoutCardHTML(d, mi, ci, esc) : '').join('')}`;
 }).join('');
 const empty = !st.msgs.length ? `<div class="chat-msg ai"><span class="who">마이로그 AI</span><p>먹은 것, 한 운동, 체중을 말하듯 적거나 사진을 보내 주세요. 포장지나 체중계 사진도 읽어요. 확정은 언제나 직접 해요.</p></div><div class="chips chat-suggest">${SUGGEST.map(([l, v]) => `<button type="button" class="chip" data-chat-suggest="${esc(v)}">${esc(l)}</button>`).join('')}</div>` : '';
 const choose = st.photos.length && !st.asking ? `<div class="chat-choose"><div class="chat-photos">${st.thumbs.map(p => `<img src="${esc(p)}" alt="고른 사진">`).join('')}</div><button type="button" class="chat-opt pick" data-chat-photo="ai"><b>✦ AI가 음식·양을 읽어 줘요</b><small>${plus ? '플러스' : '무료는 하루 1번'} · 포장지 글자·체중계 숫자도 읽어요</small></button><button type="button" class="chat-opt" data-chat-photo="only"><b>사진만 남기고 직접 입력</b><small>사진은 대화에 남고, 음식은 평소처럼 골라요</small></button><button type="button" class="text-button" data-chat-photo="cancel">사진 빼기</button></div>` : '';
 const switchBar = st.pickAsk ? `<div class="ai-switch-warn" role="alertdialog" aria-label="다른 방법으로 입력"><b>다른 방법으로 입력할까요?</b><span>지금 대화와 고른 사진이 지워져요. 이미 저장한 기록은 그대로예요.</span><div class="actions"><button type="button" class="button" data-ai-pick-ok>지우고 바꾸기</button><button type="button" class="button secondary" data-ai-pick-no>계속 입력</button></div></div>` : '';
 return `<div class="ai-chat-wrap"><button type="button" class="ai-back" data-ai-pick aria-label="뒤로 가서 다른 방법으로 입력">‹ 다른 방법으로 입력</button>${switchBar}<div class="chat-top">${adminView ? `<span class="seg chat-view" role="group" aria-label="슈퍼관리자 보기 기준">${[['free', '일반'], ['plus', '플러스']].map(([k, l]) => `<button type="button" class="${adminView === k ? 'active' : ''}" data-plan-view="${k}" aria-pressed="${adminView === k}">${l}</button>`).join('')}</span>` : plus ? '<span class="status-badge info">플러스</span>' : ''}${left != null ? `<span class="hint">오늘 AI ${left}번 남음</span>` : ''}</div>
 ${connected ? '' : '<p class="hint warn">AI가 아직 연결되지 않았어요. 연결되면 바로 대화할 수 있어요.</p>'}
 <div class="chat-log" id="chat-log" aria-live="polite">${empty}${msgs}${st.asking ? '<div class="chat-msg ai typing"><span class="who">마이로그 AI</span><p>정리하는 중…</p></div>' : ''}</div>
 ${choose}
 ${st.camMenu ? `<div class="chat-cam-menu" role="menu" aria-label="사진 넣기">${cameraSupported()?`<button type="button" class="chat-cam-item" role="menuitem" id="chat-cam-live">📸 사진 찍기</button>`:`<label class="chat-cam-item" role="menuitem">📸 사진 찍기<input id="chat-photo-cam" type="file" accept="image/*" capture="environment" hidden></label>`}<label class="chat-cam-item" role="menuitem">🖼 앨범에서 고르기<input id="chat-photo" type="file" accept="image/jpeg,image/png,image/webp" multiple hidden></label><button type="button" class="chat-cam-item" role="menuitem" data-mate-picker>👥 메이트로그에서 가져오기</button></div>` : ''}<div class="chat-input"><button type="button" class="chat-cam" data-chat-cam aria-label="사진 넣기(찍기·앨범·메이트로그)" aria-expanded="${!!st.camMenu}">📷</button><textarea id="chat-text" rows="1" placeholder="말하듯 적어 주세요" ${st.asking ? 'disabled' : ''}>${esc(st.input || '')}</textarea><button type="button" class="chat-send" id="chat-send" aria-label="보내기" ${st.asking ? 'disabled' : ''}>↑</button></div>
 <p class="hint chat-foot">AI 답은 참고용이에요. 진단이나 처방이 아니에요.</p></div>`;
}
