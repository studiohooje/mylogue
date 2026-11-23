// 4.15.0 관리로그 화면(관리자 전용, PC 웹). 베타 동안 계정별 기록 열람·수정·삭제·추가 — 대표님 결정 2026-11-23.
// 서버 쓰기는 cloud-sync.js의 adminWriteRecord(접근 기록 강제). 여기서는 화면과 기록 검증만 한다.
import {cleanBody, cleanMeal, cleanWorkout, cleanCheckin, cleanFoodPreset, uid as newId} from './domain.js';
import {stableJSON} from './cloud-model.js';

const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));
const fmt = (v, d = 1) => v == null || v === '' ? '' : String(Math.round(Number(v) * 10 ** d) / 10 ** d);
export const LIST_KINDS = ['body', 'meals', 'workouts'];
export const recordKey = (kind, id) => `${kind}~${encodeURIComponent(id)}`;

export function emptyAdminLog() { return {users: [], q: '', uid: '', email: '', loading: false, error: '', data: null, date: '', edit: null, add: null, log: null, viewed: {}}; }

// 그 날짜의 기록(목록형 + 날짜 키 지도형)
export function dayRecords(db, date) {
  const out = [];
  for (const kind of LIST_KINDS) for (const x of db?.[kind] || []) if (x.date === date) out.push({kind, key: recordKey(kind, x.id), value: x});
  for (const kind of ['checkins', 'dayStates']) if (db?.[kind] && Object.hasOwn(db[kind], date)) out.push({kind, key: recordKey(kind, date), value: db[kind][date]});
  return out;
}
export function recentDates(db, limit = 21) {
  const set = new Set();
  for (const kind of LIST_KINDS) for (const x of db?.[kind] || []) if (x.date) set.add(x.date);
  return [...set].sort().reverse().slice(0, limit);
}

function summary(r) {
  const v = r.value;
  if (r.kind === 'body') return `체중 ${fmt(v.weight)}kg${v.bodyFatPct != null ? ` · 체지방 ${fmt(v.bodyFatPct)}%` : ''}${v.skeletalMuscle != null ? ` · 골격근 ${fmt(v.skeletalMuscle)}kg` : ''}`;
  if (r.kind === 'meals') return `${esc(v.slot || '식사')} · ${esc(v.name)} ${esc(v.servingQty)}${esc(v.servingUnit)}${v.calories != null ? ` · ${fmt(v.calories, 0)}kcal` : ' · 영양값 없음'}${v.planned ? ' · 예정' : ''}`;
  if (r.kind === 'workouts') return v.rest ? '휴식' : `${esc(v.title || '운동')} · ${(v.exercises || []).length}종목${v.recalled ? ' · 기억해 적음' : ''}${v.planned ? ' · 예정' : ''}`;
  if (r.kind === 'checkins') return `컨디션 · 수면 ${v.sleep ?? '-'} · 에너지 ${v.energy ?? '-'} · 근육통 ${v.soreness ?? '-'}`;
  if (r.kind === 'dayStates') return `식단 상태 · ${esc(v)}`;
  return esc(JSON.stringify(v)).slice(0, 80);
}
const KIND_LABEL = {body: '수치', meals: '식사', workouts: '운동', checkins: '컨디션', dayStates: '식단 상태'};

export function adminLogHTML(s, {today}) {
  if (!s.uid) {
    const q = s.q.trim().toLowerCase(), users = s.users.filter(u => !q || String(u.email || '').toLowerCase().includes(q) || u.uid.includes(q));
    return `<div class="page-head"><div><span class="eyebrow">Admin</span><h2>관리로그</h2><p>계정을 골라 기록을 열람·수정해요. 모든 수정은 접근 기록에 남고, 고치기 전 내용도 저장돼요.</p></div></div>
<section class="section card"><label class="field">계정 찾기<input id="alog-q" type="search" value="${esc(s.q)}" placeholder="이메일 일부"></label>${s.error ? `<p class="error">${esc(s.error)}</p>` : ''}${s.loading ? '<p class="hint">불러오는 중…</p>' : ''}
<div class="alog-users">${users.map(u => `<button type="button" class="record alog-user" data-alog-open="${esc(u.uid)}"><div><strong>${esc(u.email || u.uid)}</strong><small>${esc(u.status || '')} · 가입 ${esc(String(u.createdAt?.toDate?.()?.toISOString?.() || '').slice(0, 10))}</small></div><span>열기 ›</span></button>`).join('') || (s.loading ? '' : '<p class="hint">계정이 없어요.</p>')}</div>
<button type="button" class="button secondary" data-alog-refresh>목록 새로 고침</button></section>`;
  }
  const db = s.data?.db, date = s.date || today, list = db ? dayRecords(db, date) : [];
  const dates = db ? recentDates(db) : [];
  const counts = db ? LIST_KINDS.map(k => `${KIND_LABEL[k]} ${(db[k] || []).length}`).join(' · ') : '';
  const row = r => {
    const editing = s.edit?.key === r.key;
    return `<div class="record alog-rec"><div><strong>${KIND_LABEL[r.kind] || r.kind}</strong><small>${summary(r)}</small></div><div class="record-actions"><button type="button" data-alog-edit="${esc(r.key)}">수정</button><button type="button" data-alog-del="${esc(r.key)}">삭제</button></div></div>${editing ? `<div class="alog-edit"><label class="field">기록 내용(JSON) <small>id는 바꾸지 마세요. 저장 전 앱 규칙으로 검사해요.</small><textarea id="alog-edit-text" rows="12" spellcheck="false">${esc(s.edit.text)}</textarea></label><div class="actions"><button type="button" class="button" data-alog-save>저장</button><button type="button" class="button secondary" data-alog-cancel>취소</button></div></div>` : ''}`;
  };
  const addForm = s.add ? (s.add.kind === 'meals'
    ? `<div class="alog-edit"><h4>식사 추가 · ${esc(date)}</h4><div class="form-grid"><label class="field">이름<input id="alog-a-name"></label><label class="field">끼니<input id="alog-a-slot" value="식사"></label><label class="field">양<input id="alog-a-qty" type="number" step="any" value="1"></label><label class="field">단위<input id="alog-a-unit" value="회"></label><label class="field">kcal<input id="alog-a-kcal" type="number" step="any"></label><label class="field">탄수 g<input id="alog-a-carbs" type="number" step="any"></label><label class="field">단백질 g<input id="alog-a-protein" type="number" step="any"></label><label class="field">지방 g<input id="alog-a-fat" type="number" step="any"></label></div><div class="actions"><button type="button" class="button" data-alog-addsave>추가</button><button type="button" class="button secondary" data-alog-cancel>취소</button></div></div>`
    : `<div class="alog-edit"><h4>수치 추가 · ${esc(date)}</h4><div class="form-grid"><label class="field">체중 kg<input id="alog-a-weight" type="number" step="any"></label><label class="field">체지방률 %<input id="alog-a-bf" type="number" step="any"></label><label class="field">골격근량 kg<input id="alog-a-smm" type="number" step="any"></label></div><div class="actions"><button type="button" class="button" data-alog-addsave>추가</button><button type="button" class="button secondary" data-alog-cancel>취소</button></div></div>`) : '';
  const logHTML = s.log ? `<section class="section card"><h3>접근 기록 (${s.log.length})</h3>${s.log.map(l => `<div class="record"><div><strong>${esc(String(l.at).slice(0, 16).replace('T', ' '))} · ${esc(l.action)}</strong><small>${esc(l.adminEmail)} · ${esc(l.recordId || '')} · 사유: ${esc(l.reason || '')}</small></div></div>`).join('') || '<p class="hint">기록이 없어요.</p>'}</section>` : '';
  return `<div class="alog-band" role="status">관리자 열람 중 · <b>${esc(s.email || s.uid)}</b> · 모든 수정은 이 계정의 접근 기록에 남아요 <button type="button" class="text-button" data-alog-back>목록으로</button></div>
<div class="page-head"><div><span class="eyebrow">Admin</span><h2>${esc(s.email || s.uid)}</h2><p>${counts}${s.loading ? ' · 불러오는 중…' : ''}</p></div></div>
${s.error ? `<p class="error">${esc(s.error)}</p>` : ''}
<section class="section card"><label class="field">수정 사유 <small>저장·삭제·추가에 꼭 필요해요(접근 기록에 남음)</small><input id="alog-reason" value="${esc(s.reason || '')}" placeholder="예: 식사 칼로리 문의 확인"></label>
<div class="alog-datebar"><button type="button" class="button secondary" data-alog-step="-1">‹</button><input id="alog-date" type="date" value="${esc(date)}"><button type="button" class="button secondary" data-alog-step="1">›</button></div>
<div class="chip-row wrap">${dates.map(d => `<button type="button" class="chip${d === date ? ' active' : ''}" data-alog-date="${d}">${d.slice(5)}</button>`).join('')}</div></section>
<section class="section card"><h3>${esc(date)} 기록 (${list.length})</h3>${list.map(row).join('') || '<p class="hint">이 날은 기록이 없어요.</p>'}
<div class="actions"><button type="button" class="button secondary" data-alog-add="meals">＋ 식사</button><button type="button" class="button secondary" data-alog-add="body">＋ 수치</button></div>${addForm}</section>
<section class="section"><button type="button" class="button secondary" data-alog-log>접근 기록 보기</button></section>${logHTML}`;
}

// 수정 JSON 검사: 종류별 앱 규칙(clean*)을 통과해야 저장. 반환: 서버에 넣을 payload 문자열
export function validatePayload(key, text) {
  const pos = key.indexOf('~'), kind = key.slice(0, pos), id = decodeURIComponent(key.slice(pos + 1));
  let v; try { v = JSON.parse(text); } catch { throw Error('JSON 형식이 아니에요.'); }
  const clean = {body: cleanBody, meals: cleanMeal, workouts: cleanWorkout, foods: cleanFoodPreset, checkins: cleanCheckin}[kind];
  if (['body', 'meals', 'workouts', 'foods'].includes(kind)) { if (v?.id !== id) throw Error('id를 바꾸면 안 돼요.'); v = clean(v); }
  else if (kind === 'checkins') v = clean(v);
  else if (kind === 'dayStates' && !['partial', 'complete', 'fasting', 'unrecorded'].includes(v)) throw Error('식단 상태 값을 확인해 주세요.');
  return stableJSON(v);
}

export function newMeal(date, f) {
  const n = x => (x === '' || x == null ? null : Number(x));
  const meal = cleanMeal({id: newId(), date, name: f.name, slot: f.slot || '식사', servingQty: n(f.qty) ?? 1, servingUnit: f.unit || '회', calories: n(f.kcal), carbs: n(f.carbs), protein: n(f.protein), fat: n(f.fat), source: 'admin', note: '관리자가 추가', mealGroupId: newId()});
  return {key: recordKey('meals', meal.id), payload: stableJSON(meal)};
}
export function newBody(date, f) {
  const n = x => (x === '' || x == null ? null : Number(x));
  const b = cleanBody({id: newId(), date, weight: n(f.weight), bodyFatPct: n(f.bf), skeletalMuscle: n(f.smm), source: 'admin', note: '관리자가 추가'});
  return {key: recordKey('body', b.id), payload: stableJSON(b)};
}
