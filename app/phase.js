// 4.17.0 목표 페이즈(대표님 2026-11-23): 다이어트·린매스업·바디 리컴포지션·벌크업·유지.
// 유형마다 다른 질문으로 목표치와 기간을 정하고, 매일의 체중·인바디 변화에 맞춰 조용히 제안한다. 끝나면 '페이즈 회고'.
// 저장: settings.phase(진행 중 하나), settings.phaseHistory(끝난 것). 설정 동기화 칸을 그대로 쓴다.
import {shareButtonsHTML} from './share-cards.js';
const DAY = 86400000;
const toD = s => new Date(String(s).slice(0, 10) + 'T12:00:00');
const ymd = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const addDays = (s, n) => ymd(new Date(toD(s).getTime() + n * DAY));
const days = (a, b) => Math.round((toD(b) - toD(a)) / DAY);
const r1 = n => Math.round(n * 10) / 10;
const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));
const num = v => { if (v === '' || v == null) return null; const n = Number(v); return Number.isFinite(n) ? n : null; };
const sign = n => `${n > 0 ? '+' : ''}${r1(n)}`;

// 유형: 질문(fields), 식단 목표 방향(goal: 식단 문답의 lose/maintain/gain), 기본 칼로리 차이(delta)
export const PHASE_TYPES = [
  {id: 'diet', name: '다이어트', short: '체지방을 줄여요', goal: 'lose', weeks: [8, 12, 16], fields: [['loseKg', '몇 kg 감량이 목표예요?', 'kg', 1, 40, 0.5], ['fatPct', '목표 체지방률(선택)', '%', 5, 50, 0.5, true]]},
  {id: 'leanbulk', name: '린매스업', short: '체지방은 거의 그대로, 근육을 천천히', goal: 'gain', weeks: [12, 16, 24], fields: [['gainKg', '몇 kg 늘리는 게 목표예요?', 'kg', 0.5, 15, 0.5], ['fatCap', '체지방률이 이 아래면 좋겠어요', '%', 8, 35, 0.5, true]]},
  // 4.18.0 대표님: 한국에선 '상승 다이어트'라고도 부른다
  {id: 'recomp', name: '상승 다이어트(리컴프)', short: '체중은 비슷하게, 지방↓ 근육↑', goal: 'maintain', weeks: [12, 16, 24], fields: [['fatPct', '목표 체지방률', '%', 5, 45, 0.5], ['muscleKg', '골격근량 몇 kg 늘리기(선택)', 'kg', 0.3, 10, 0.1, true]]},
  {id: 'bulk', name: '벌크업', short: '체중과 힘을 확실하게 늘려요', goal: 'gain', weeks: [8, 12, 16], fields: [['gainKg', '몇 kg 늘리는 게 목표예요?', 'kg', 1, 25, 0.5]]},
  {id: 'maintain', name: '유지', short: '지금 몸을 지키며 생활 리듬 만들기', goal: 'maintain', weeks: [4, 8, 12], fields: [['rangeKg', '이 범위 안이면 유지(±kg)', 'kg', 0.5, 5, 0.5]]},
  // 4.18.0 목표 종류 더하기(대표님: 세 가지뿐이면 너무 적다)
  {id: 'peak', name: '바디프로필·대회 준비', short: '날짜를 정해 짧고 굵게 체지방을 줄여요', goal: 'lose', weeks: [8, 12, 16], fields: [['loseKg', '몇 kg 감량이 목표예요?', 'kg', 1, 30, 0.5], ['fatPct', '목표 체지방률(선택)', '%', 5, 40, 0.5, true]]},
  {id: 'gainweight', name: '체중 늘리기', short: '마른 체형, 먹는 양부터 늘려요', goal: 'gain', weeks: [8, 12, 16], fields: [['gainKg', '몇 kg 늘리는 게 목표예요?', 'kg', 1, 20, 0.5]]},
  {id: 'reverse', name: '리버스 다이어트', short: '감량을 마친 뒤 칼로리를 천천히 올려요', goal: 'maintain', weeks: [4, 6, 8], fields: [['startDeficit', '지금 유지보다 하루 몇 kcal 적게 먹고 있어요?', 'kcal', 100, 1000, 50], ['rangeKg', '이만큼 늘면 속도를 늦출게요(kg)', 'kg', 0.5, 4, 0.5]]},
  {id: 'dietbreak', name: '다이어트 휴식', short: '감량 중 1~2주 유지 칼로리로 쉬어 가요', goal: 'maintain', weeks: [1, 2], fields: [['rangeKg', '이 범위 안이면 괜찮아요(±kg)', 'kg', 0.5, 3, 0.5]]},
];
const DIET_LIKE = new Set(['diet', 'peak']), GAIN_LIKE = new Set(['leanbulk', 'bulk', 'gainweight']), HOLD_LIKE = new Set(['maintain', 'dietbreak']);
export const typeOf = id => PHASE_TYPES.find(t => t.id === id) || null;

// 지금 몸 상태(최근 체중·인바디)
export function bodyNow(db, until = '9999-12-31') {
  const rows = [...(db.body || [])].filter(b => b.date <= until).sort((a, b) => String(a.date).localeCompare(String(b.date)));
  const last = k => { for (let i = rows.length - 1; i >= 0; i--) if (Number(rows[i][k]) > 0) return {v: Number(rows[i][k]), date: rows[i].date}; return null; };
  return {weight: last('weight'), fatPct: last('bodyFatPct'), muscle: last('skeletalMuscle')};
}
// 체중 7일 평균(그날 기준 앞 7일). 하루 출렁임 대신 흐름으로 비교한다.
export function avgWeight(db, date, span = 7) {
  const w = (db.body || []).filter(b => Number(b.weight) > 0 && b.date <= date && days(b.date, date) < span).map(b => Number(b.weight));
  return w.length ? w.reduce((s, x) => s + x, 0) / w.length : null;
}

export function newPhaseWizard(db, type = '') {
  const now = bodyNow(db);
  return {step: type ? 'target' : 'type', type, answers: {}, weeks: typeOf(type)?.weeks[1] || 12, start: '', now: {weight: now.weight?.v ?? null, fatPct: now.fatPct?.v ?? null, muscle: now.muscle?.v ?? null}, startAvg: (a => a == null ? null : r1(a))(avgWeight(db, now.weight?.date || '9999-12-31')), error: ''};
}
// 목표치 → 주당 속도·안전 안내
export function planCheck(st) {
  const t = typeOf(st.type), a = st.answers, w = st.now.weight, weeks = Number(st.weeks) || 0, out = {notes: [], warn: []};
  if (!t || !weeks) return out;
  if (DIET_LIKE.has(t.id) && a.loseKg) {
    const perWk = a.loseKg / weeks; out.perWeek = -perWk;
    out.notes.push(`주당 약 ${r1(perWk)}kg 감량 속도예요.`);
    if (w && perWk > w * 0.01) out.warn.push(`체중의 1%(주 ${r1(w * 0.01)}kg)보다 빨라요. 근육이 같이 빠지기 쉬워서 기간을 늘리는 걸 권해요.`);
    if (w && a.loseKg > w * 0.15) out.warn.push('한 페이즈에 체중의 15%가 넘는 감량은 나눠서 하는 걸 권해요.');
  }
  if (GAIN_LIKE.has(t.id) && a.gainKg) {
    const perWk = a.gainKg / weeks; out.perWeek = perWk;
    out.notes.push(`주당 약 ${r1(perWk)}kg 증량 속도예요.`);
    const cap = t.id === 'leanbulk' ? 0.25 : 0.5;
    if (t.id === 'gainweight') out.notes.push('근력운동을 같이 하면 늘어난 무게가 근육 쪽으로 더 가요.');
    if (perWk > cap) out.warn.push(t.id === 'leanbulk' ? '린매스업은 주 0.25kg 안팎이 체지방을 덜 늘려요. 기간을 늘리거나 목표를 줄여 보세요.' : '주 0.5kg보다 빠르면 늘어난 무게 중 지방 비중이 커져요.');
  }
  if (t.id === 'recomp') {
    if (st.now.fatPct == null) out.warn.push('리컴포지션은 체중보다 체지방률·근육량이 기준이라, 인바디를 4주마다 재는 걸 권해요.');
    if (a.fatPct && st.now.fatPct && st.now.fatPct - a.fatPct > weeks * 0.35) out.warn.push('체중을 유지하면서 줄이기엔 체지방률 목표가 커요. 다이어트 페이즈를 먼저 해 보는 것도 방법이에요.');
    out.perWeek = 0;
  }
  if (HOLD_LIKE.has(t.id)) out.perWeek = 0;
  if (t.id === 'peak') out.notes.push('끝난 뒤엔 리버스 다이어트로 칼로리를 천천히 올리면 요요가 덜해요.');
  if (t.id === 'reverse' && a.startDeficit) { const step = Math.min(100, Math.max(50, Math.round(a.startDeficit / weeks / 25) * 25)); out.perWeek = 0; out.notes.push(`주마다 하루 ${step}kcal씩 올려 ${Math.ceil(a.startDeficit / step)}주쯤 뒤 유지 칼로리에 닿아요.`); }
  if (t.id === 'dietbreak') out.notes.push('쉬는 동안 체중이 0.5~1kg 오르는 건 대부분 수분·글리코겐이에요. 다시 감량하면 금방 빠져요.');
  return out;
}
export function readPhaseAnswers(st, form) {
  const t = typeOf(st.type), a = {};
  for (const [key, , , min, max, , optional] of t.fields) {
    const v = num(form[key]);
    if (v == null) { if (!optional) throw Error('목표치를 넣어 주세요.'); continue; }
    if (v < min || v > max) throw Error(`${min}~${max} 사이로 넣어 주세요.`);
    a[key] = v;
  }
  return a;
}
// 저장할 페이즈
// 4.27.0 전수검사 C-02: 주당 체중의 1.5%보다 빠른 감량, 목표 BMI 18.5 미만은 저장하지 않는다(경고만 띄우고 저장되던 것)
export function buildPhase(st, today, {heightCm = null, cautions = [], age = null} = {}) {
  const t = typeOf(st.type); if (!t) throw Error('페이즈 종류를 골라 주세요.');
  // 4.27.0 재검사 C-03: 식단 목표 문답과 같게, 임신·수유 중이거나 18세 이하면 감량·증량 페이즈를 저장하지 않는다
  if ((DIET_LIKE.has(t.id) || GAIN_LIKE.has(t.id) || t.id === 'recomp') && ((cautions || []).some(c => c === 'pregnant' || c === 'breastfeeding') || (age != null && Number(age) <= 18))) throw Error('임신·수유 중이거나 18세 이하는 체중을 줄이거나 늘리는 페이즈를 시작하지 않아요. 유지 페이즈를 쓰거나 의료진과 먼저 상의해 주세요.');
  const weeks = Math.round(Number(st.weeks)), minW = t.id === 'dietbreak' ? 1 : 2; if (!(weeks >= minW && weeks <= 52)) throw Error(`기간은 ${minW}~52주 사이로 정해 주세요.`);
  const start = st.start || today, w = st.now.weight;
  const target = {...st.answers};
  const base = st.startAvg ?? w;
  if (DIET_LIKE.has(t.id) && base) target.weight = r1(base - target.loseKg);
  if (DIET_LIKE.has(t.id) && target.loseKg) {
    const ref = base || null;
    if (ref && target.loseKg / weeks > ref * 0.015 + 1e-9) throw Error(`주당 ${(target.loseKg / weeks).toFixed(2)}kg은 체중의 1.5%(주 ${(ref * 0.015).toFixed(2)}kg)보다 빨라 저장하지 않았어요. 기간을 늘리거나 목표를 줄여 주세요.`);
    if (!ref && target.loseKg / weeks > 1) throw Error('주 1kg보다 빠른 감량은 저장하지 않았어요. 체중을 먼저 기록하거나 기간을 늘려 주세요.');
    const h = Number(heightCm) / 100;
    if (ref && h > 1 && (ref - target.loseKg) / (h * h) < 18.5) throw Error(`목표 체중 ${r1(ref - target.loseKg)}kg은 키 대비 저체중(BMI 18.5 미만)이라 저장하지 않았어요. 목표를 줄여 주세요.`);
    // 4.27.0 재검사 C-02: 키를 모르면 저체중 확인을 못 하므로, 한 페이즈에 체중의 15%를 넘는 감량은 키를 먼저 받는다
    if (ref && !(h > 1) && target.loseKg > ref * 0.15) throw Error('한 번에 체중의 15%가 넘는 감량은 키를 알아야 안전한지 볼 수 있어요. 식단 목표에서 키를 먼저 적거나 목표를 줄여 주세요.');
  }
  // 4.27.0 재검사 C-02: 증량도 상한(주당 체중의 1%, 체중을 모르면 주 0.75kg)
  if (GAIN_LIKE.has(t.id) && target.gainKg) {
    const ref = base || null;
    if (ref && target.gainKg / weeks > ref * 0.01 + 1e-9) throw Error(`주당 ${(target.gainKg / weeks).toFixed(2)}kg 증량은 체중의 1%(주 ${(ref * 0.01).toFixed(2)}kg)보다 빨라 저장하지 않았어요. 기간을 늘리거나 목표를 줄여 주세요.`);
    if (!ref && target.gainKg / weeks > 0.75) throw Error('주 0.75kg보다 빠른 증량은 저장하지 않았어요. 체중을 먼저 기록하거나 기간을 늘려 주세요.');
  }
  if (GAIN_LIKE.has(t.id) && base) target.weight = r1(base + target.gainKg);
  return {id: `ph-${Date.now().toString(36)}`, type: t.id, start, weeks, end: addDays(start, weeks * 7), startWeight: st.startAvg ?? w, startFatPct: st.now.fatPct, startMuscle: st.now.muscle, target, perWeek: planCheck(st).perWeek ?? 0, createdAt: new Date().toISOString()};
}
// 식단 목표 칼로리 차이(유지 칼로리 기준). 감량은 속도에서, 나머지는 유형 기본값
// 4.18.0 리버스 다이어트는 날짜에 따라(주마다 50~100kcal씩 올려 0에서 멈춤)
export function kcalDelta(phase, today = '') {
  if (!phase) return 0;
  if (phase.type === 'reverse') { const d0 = phase.target?.startDeficit || 300, step = Math.min(100, Math.max(50, Math.round(d0 / (phase.weeks || 6) / 25) * 25)), wk = today ? Math.max(0, Math.floor(days(phase.start, today) / 7)) : 0; return Math.min(0, step * wk - d0) || 0; }
  if (DIET_LIKE.has(phase.type)) return -Math.min(750, Math.max(200, Math.round(Math.abs(phase.perWeek || 0.5) * 7700 / 7 / 50) * 50));
  return {leanbulk: 250, bulk: 400, gainweight: 350, recomp: -150, maintain: 0, dietbreak: 0}[phase.type] ?? 0;
}
export const nutritionGoalOf = phase => typeOf(phase?.type)?.goal || 'maintain';

// 진행 상황
export function phaseStatus(db, today) {
  const p = db.settings?.phase; if (!p || !typeOf(p.type)) return null;
  const t = typeOf(p.type), day = Math.max(0, days(p.start, today)), week = Math.min(p.weeks, Math.floor(day / 7) + 1), total = p.weeks * 7;
  const now = bodyNow(db, today), avg = avgWeight(db, today), base = p.startWeight;
  const s = {phase: p, type: t, day, week, weeks: p.weeks, timePct: Math.min(1, day / total), over: day >= total, left: Math.max(0, total - day)};
  if (avg != null && base) s.weightChange = r1(avg - base);
  if (now.fatPct && p.startFatPct) s.fatChange = r1(now.fatPct.v - p.startFatPct);
  if (now.muscle && p.startMuscle) s.muscleChange = r1(now.muscle.v - p.startMuscle);
  s.fatNow = now.fatPct; s.muscleNow = now.muscle;
  const tg = p.target || {};
  if (DIET_LIKE.has(t.id) && tg.loseKg && s.weightChange != null) s.goalPct = Math.max(0, Math.min(1, -s.weightChange / tg.loseKg));
  if (GAIN_LIKE.has(t.id) && tg.gainKg && s.weightChange != null) s.goalPct = Math.max(0, Math.min(1, s.weightChange / tg.gainKg));
  if (t.id === 'recomp' && tg.fatPct && p.startFatPct && now.fatPct) s.goalPct = Math.max(0, Math.min(1, (p.startFatPct - now.fatPct.v) / Math.max(0.1, p.startFatPct - tg.fatPct)));
  if ((HOLD_LIKE.has(t.id) || t.id === 'reverse') && s.weightChange != null) s.inRange = Math.abs(s.weightChange) <= (tg.rangeKg || 1);
  // 예정 대비: 지금쯤 바뀌어 있을 양(직선)
  if (p.perWeek && s.weightChange != null) s.expected = r1(p.perWeek * day / 7);
  return s;
}
export function progressLine(s) {
  const t = s.type, tg = s.phase.target || {};
  if (t.id === 'reverse') return s.weightChange == null ? `하루 ${tg.startDeficit}kcal 부족 → 유지까지` : `${sign(s.weightChange)}kg · 하루 ${tg.startDeficit}kcal 부족 → 유지까지`;
  if (DIET_LIKE.has(t.id)) return s.weightChange == null ? `목표 -${tg.loseKg}kg` : `${sign(s.weightChange)}kg / 목표 -${tg.loseKg}kg`;
  if (GAIN_LIKE.has(t.id)) return s.weightChange == null ? `목표 +${tg.gainKg}kg` : `${sign(s.weightChange)}kg / 목표 +${tg.gainKg}kg`;
  if (t.id === 'recomp') return s.fatNow ? `체지방률 ${s.fatNow.v}% · 목표 ${tg.fatPct}%` : `목표 체지방률 ${tg.fatPct}%`;
  return s.weightChange == null ? `±${tg.rangeKg}kg 유지` : `${sign(s.weightChange)}kg · ±${tg.rangeKg}kg 안${s.inRange ? '' : '을 벗어났어요'}`;
}
// 5.3.1 대표님: '1/16주차'는 날짜처럼 읽히고, 배지에 지금 체지방률이 그대로 보이는 건 어색 → '16주 중 1주째' + 진행 막대 + '목표 N%'
export function badgeProg(s) {
  if (s.goalPct != null) return `달성 ${Math.round(s.goalPct * 100)}%`;
  if (s.inRange != null) return s.inRange ? '유지 범위 안' : '유지 범위 밖';
  if (s.type.id === 'recomp') return '인바디를 재면 진행도가 보여요';
  return `기간 ${Math.round(s.timePct * 100)}%`;
}
export function phaseBadgeHTML(s) {
  if (!s) return `<button type="button" class="phase-badge empty" data-modal="phase">지금 목표 페이즈 정하기</button>`;
  return `<button type="button" class="phase-badge ph-${s.type.id}" data-modal="phase" title="${esc(s.type.name)} · ${s.over ? '기간 끝' : `${s.weeks}주 중 ${s.week}주째`}" aria-label="${esc(s.type.name)} 페이즈 자세히"><b>${esc(s.type.name)}</b><span class="ph-week">${s.over ? '기간 끝' : `${s.weeks}주 중 ${s.week}주째`}</span><span class="ph-bar" aria-hidden="true"><i style="width:${Math.round((s.goalPct ?? s.timePct) * 100)}%"></i></span><span class="ph-prog">${esc(badgeProg(s))}</span></button>`;
}

// 매일·인바디 변화에 맞춘 제안(최대 2개, 재촉 없이). 2주 전엔 판단하지 않는다.
export function phaseAdvice(db, today) {
  const s = phaseStatus(db, today); if (!s) return [];
  const out = [], p = s.phase, t = s.type.id, tg = p.target || {};
  if (s.over) return [{kind: 'end', text: `${s.type.name} 페이즈 기간이 끝났어요. 회고를 보고 다음 페이즈를 정해 봐요.`}];
  const lastInbody = s.fatNow?.date || s.muscleNow?.date;
  if (['recomp', 'leanbulk'].includes(t) && (!lastInbody || days(lastInbody, today) > 35)) out.push({kind: 'inbody', text: '인바디를 잰 지 5주가 넘었어요. 이 페이즈는 체지방률·근육량으로 판단해서, 이번 주에 한 번 재 보면 좋아요.'});
  if (s.day < 14 || s.weightChange == null) return out.slice(0, 2);
  const diff = s.weightChange - (s.expected ?? 0);
  if (DIET_LIKE.has(t)) {
    const rate = -s.weightChange / (s.day / 7);
    if (p.startWeight && rate > p.startWeight * 0.01) out.push({kind: 'fast', text: `생각보다 빨리 빠지고 있어요(주 ${r1(rate)}kg). 근육을 지키려면 하루 100~200kcal 더 먹거나 단백질을 챙겨도 괜찮아요.`});
    else if (s.day >= 21 && diff > Math.max(0.5, Math.abs(s.expected) * 0.4) && !(p.startWeight && rate >= p.startWeight * 0.005)) out.push({kind: 'slow', text: `계획보다 ${r1(diff)}kg 덜 빠졌어요. 하루 100~150kcal를 줄이거나 걷기를 조금 늘려 보는 정도면 충분해요.`});
    else out.push({kind: 'on', text: `계획대로 가고 있어요. 지금 ${sign(s.weightChange)}kg.`});
    if (s.muscleChange != null && s.muscleChange <= -0.8) out.push({kind: 'muscle', text: `골격근량이 ${s.muscleChange}kg 줄었어요. 단백질(체중 1kg당 1.6g 안팎)과 근력운동을 우선해요.`});
  } else if (GAIN_LIKE.has(t)) {
    const rate = s.weightChange / (s.day / 7), cap = t === 'leanbulk' ? 0.35 : 0.6;
    if (rate > cap) out.push({kind: 'fast', text: `주 ${r1(rate)}kg씩 늘고 있어요. ${t === 'leanbulk' ? '린매스업치고 빨라서 ' : ''}하루 150kcal쯤 줄이면 지방이 덜 붙어요.`});
    else if (s.day >= 21 && rate < (p.perWeek || 0.25) * 0.4) out.push({kind: 'slow', text: '체중이 거의 그대로예요. 하루 150~250kcal(밥 반 공기~한 공기)를 더해 봐요.'});
    else out.push({kind: 'on', text: `계획대로 늘고 있어요. 지금 ${sign(s.weightChange)}kg.`});
    if (tg.fatCap && s.fatNow && s.fatNow.v > tg.fatCap) out.push({kind: 'cap', text: `체지방률이 정해 둔 ${tg.fatCap}%를 넘었어요(${s.fatNow.v}%). 리컴포지션이나 유지 페이즈로 잠깐 바꾸는 것도 방법이에요.`});
  } else if (t === 'recomp') {
    if (Math.abs(s.weightChange) > 1.5) out.push({kind: 'drift', text: `체중이 ${sign(s.weightChange)}kg 바뀌었어요. 리컴포지션은 체중을 비슷하게 두는 게 핵심이라 칼로리를 ${s.weightChange > 0 ? '조금 줄여' : '조금 늘려'} 봐요.`});
    if (s.fatChange != null && s.muscleChange != null) out.push({kind: 'comp', text: `시작보다 체지방률 ${sign(s.fatChange)}%p, 골격근량 ${sign(s.muscleChange)}kg${s.fatChange < 0 && s.muscleChange >= 0 ? '. 리컴포지션이 되고 있어요.' : '.'}`});
  } else if (t === 'reverse') {
    out.push({kind: s.inRange ? 'on' : 'drift', text: s.inRange ? `체중이 안정적이에요(${sign(s.weightChange)}kg). 이번 주도 계획대로 올려요.` : `체중이 ${sign(s.weightChange)}kg 늘었어요. 이번 주는 칼로리를 올리지 말고 한 주 쉬어 가요.`});
  } else if (HOLD_LIKE.has(t)) {
    out.push({kind: s.inRange ? 'on' : 'drift', text: s.inRange ? `유지 범위 안이에요(${sign(s.weightChange)}kg). 지금 리듬 그대로요.` : `유지 범위를 벗어났어요(${sign(s.weightChange)}kg). 한 주만 평소 식사로 돌아와 봐요.`});
  }
  return out.slice(0, 2);
}

// 페이즈 끝 → 회고
export function phaseRecap(db, phase, endDate) {
  const end = endDate < phase.end ? endDate : phase.end, t = typeOf(phase.type);
  const ws = (db.workouts || []).filter(w => !w.planned && !w.rest && w.date >= phase.start && w.date <= end);
  const wAvg = avgWeight(db, end), now = bodyNow(db, end);
  const rec = new Set([...(db.meals || []).filter(m => !m.planned).map(m => m.date), ...(db.body || []).map(b => b.date), ...ws.map(w => w.date)].filter(d => d >= phase.start && d <= end));
  const weeks = Math.max(1, Math.round(days(phase.start, end) / 7));
  return {type: t.name, start: phase.start, end, weeks, workouts: ws.length, workoutDays: new Set(ws.map(w => w.date)).size, recordDays: rec.size,
    weightChange: wAvg != null && phase.startWeight ? r1(wAvg - phase.startWeight) : null,
    fatChange: now.fatPct && phase.startFatPct ? r1(now.fatPct.v - phase.startFatPct) : null,
    muscleChange: now.muscle && phase.startMuscle ? r1(now.muscle.v - phase.startMuscle) : null};
}
export function recapHTML(r) {
  const row = (k, v) => v == null ? '' : `<div class="onb-row"><span>${k}</span><b>${v}</b></div>`;
  return `<div class="phase-recap"><p class="onb-q">${esc(r.type)} 페이즈 회고</p><p class="onb-s">${r.start} ~ ${r.end} · ${r.weeks}주</p><div class="onb-sum">${row('기록한 날', `${r.recordDays}일`)}${row('운동한 날', `${r.workoutDays}일`)}${row('체중(7일 평균)', r.weightChange == null ? null : `${sign(r.weightChange)}kg`)}${row('체지방률', r.fatChange == null ? null : `${sign(r.fatChange)}%p`)}${row('골격근량', r.muscleChange == null ? null : `${sign(r.muscleChange)}kg`)}</div><p class="hint">${r.workoutDays >= r.weeks * 2 ? '꾸준히 움직인 페이즈였어요.' : r.recordDays >= r.weeks * 4 ? '기록을 꾸준히 남긴 페이즈였어요.' : '끝까지 온 것 자체가 한 페이즈를 마친 거예요.'}</p></div>`;
}
export function endPhase(settings, recap, today) {
  const p = settings.phase; if (!p) return settings;
  const history = [...(settings.phaseHistory || []), {...p, endedAt: today, recap}].slice(-30);
  const {phase, ...rest} = settings;
  return {...rest, phaseHistory: history};
}

// 4.29.0 페이즈 시작 정리 화면의 '앞으로 이렇게'(보수적인 일반 안내, 점수·단정 없이)
const DONE_TIPS = {
  lose: ['체중은 하루하루 오르내려요. 주 평균으로 흐름을 볼게요.', '단백질을 끼니마다 챙기면 근육을 지키며 빼기 좋아요.', '2주쯤 지나면 속도를 보고 칼로리를 조금씩 맞춰 드려요.'],
  gain: ['체중이 천천히 오르는지 주 평균으로 볼게요.', '운동은 무게·횟수를 조금씩 늘려 가는 게 핵심이에요.', '2주쯤 지나면 늘어나는 속도를 보고 칼로리를 맞춰 드려요.'],
  recomp: ['체중보다 체지방률·골격근량 변화를 함께 볼게요.', '단백질과 꾸준한 근력 운동이 가장 중요해요.', '인바디를 2~4주마다 재면 변화가 잘 보여요.'],
  reverse: ['칼로리를 조금씩 올려도 체중이 크게 늘지 않는지 볼게요.', '체중이 빠르게 오르면 올리는 속도를 늦춰 드려요.', '먹는 양이 늘어난 만큼 운동 컨디션도 함께 기록해 보세요.'],
  hold: ['정한 범위 안에서 지내는지 주 평균으로 볼게요.', '먹는 양과 운동 리듬을 지키는 게 목표예요.', '범위를 벗어나면 부드럽게 알려 드려요.'],
};
function goalText(p) {
  const a = p?.target || {}, parts = [];
  if (a.loseKg) parts.push(`${a.loseKg}kg 감량`); if (a.gainKg) parts.push(`${a.gainKg}kg 증가`); if (a.fatPct) parts.push(`체지방률 ${a.fatPct}%`); if (a.muscleKg) parts.push(`골격근량 +${a.muscleKg}kg`); if (a.rangeKg) parts.push(`±${a.rangeKg}kg 안에서 유지`);
  return parts.join(' · ');
}
// 문답 화면
export function phaseWizardHTML(st, db, today) {
  const s = phaseStatus(db, today);
  const err = st.error ? `<p class="hint warn" role="alert">${esc(st.error)}</p>` : '';
  if (st.step === 'view' && s) {
    const adv = phaseAdvice(db, today);
    return `<div class="phase-view"><p class="onb-q">${esc(s.type.name)} 페이즈 · ${s.over ? '기간 끝' : `${s.week}/${s.weeks}주차`}</p><p class="onb-s">${esc(s.phase.start)} 시작 · ${esc(s.phase.end)} 끝 예정</p>
    <div class="ph-bars"><div class="ph-bar"><span>기간</span><i style="width:${Math.round(s.timePct * 100)}%"></i><b>${Math.round(s.timePct * 100)}%</b></div>${s.goalPct != null ? `<div class="ph-bar goal"><span>목표</span><i style="width:${Math.round(s.goalPct * 100)}%"></i><b>${Math.round(s.goalPct * 100)}%</b></div>` : ''}</div>
    <p class="ph-line">${esc(progressLine(s))}</p>${(s.fatChange || s.muscleChange) ? `<p class="hint">인바디: ${s.fatChange != null ? `체지방률 ${sign(s.fatChange)}%p` : ''}${s.fatChange != null && s.muscleChange != null ? ' · ' : ''}${s.muscleChange != null ? `골격근량 ${sign(s.muscleChange)}kg` : ''} (시작 대비)</p>` : ''}
    ${adv.length ? `<ul class="ph-advice">${adv.map(a => `<li class="k-${a.kind}">${esc(a.text)}</li>`).join('')}</ul>` : '<p class="hint">2주쯤 지나면 흐름을 보고 제안해 드려요.</p>'}
    <div class="onb-btns"><button type="button" class="button secondary" id="ph-new">다른 페이즈로 바꾸기</button><button type="button" class="button" id="ph-end">이 페이즈 마치기</button></div></div>`;
  }
  // 4.29.0 대표님: 페이즈를 정하면 '이렇게 정했어요' 정리와 응원 한마디를 보여 주고, 화면 아무 데나 누르면 닫는다(저장은 이미 끝남)
  if (st.step === 'done' && s) {
    const tips = DONE_TIPS[DIET_LIKE.has(s.type.id) ? 'lose' : GAIN_LIKE.has(s.type.id) ? 'gain' : s.type.id === 'recomp' ? 'recomp' : s.type.id === 'reverse' ? 'reverse' : 'hold'];
    const goal = goalText(s.phase);
    return `<button type="button" class="ph-done" data-ph-done aria-label="정리 화면 닫기"><span class="ph-done-mark" aria-hidden="true">✓</span><span class="ph-done-title">${esc(s.type.name)} 페이즈를<br>시작했어요</span>
    <span class="ph-done-list"><span><b>기간</b><span><span class="nb">${esc(s.phase.start)} ~ ${esc(s.phase.end)}</span> <span class="nb">· ${s.weeks}주</span></span></span>${goal ? `<span><b>목표</b><span>${esc(goal)}</span></span>` : ''}${st.kcal ? `<span><b>하루 목표</b><span>${Number(st.kcal).toLocaleString('ko-KR')}kcal로 맞췄어요</span></span>` : '<span><b>식단 목표</b><span>설정 › 식단 목표에서 맞출 수 있어요</span></span>'}</span>
    <span class="ph-done-sub">앞으로 이렇게 함께 볼게요</span><span class="ph-done-tips">${tips.map(t => `<span>${esc(t)}</span>`).join('')}</span>
    <span class="ph-done-cheer">하루하루보다 흐름이 중요해요. 기록만 이어 가면 충분해요. 화이팅!</span><span class="ph-done-tap">화면을 누르면 닫혀요</span></button>`;
  }
  if (st.step === 'recap') return `${recapHTML(st.recap)}${shareButtonsHTML('phase')}<div class="onb-btns"><button type="button" class="button" id="ph-after-recap">다음 페이즈 정하기</button><button type="button" class="button secondary" id="ph-close">닫기</button></div>`;
  if (st.step === 'type') return `<div class="onb gw"><p class="onb-q">지금 어떤 페이즈예요?</p><p class="onb-s">페이즈마다 목표와 기간을 정하고, 기록에 맞춰 제안해 드려요.</p>${err}<div class="onb-opts">${PHASE_TYPES.map(t => `<button type="button" class="onb-opt ${st.type === t.id ? 'on' : ''}" data-ph-type="${t.id}"><span><b>${t.name}</b><small>${t.short}</small></span></button>`).join('')}</div></div>`;
  const t = typeOf(st.type), n = st.now, chk = planCheck(st);
  if (st.step === 'target') return `<form id="ph-form" class="onb gw"><p class="onb-q">${t.name} 목표</p><p class="onb-s">지금 ${n.weight ? `체중 ${n.weight}kg` : '체중 기록 없음'}${n.fatPct ? ` · 체지방률 ${n.fatPct}%` : ''}${n.muscle ? ` · 골격근량 ${n.muscle}kg` : ''}</p>${err}
    ${t.fields.map(([k, label, unit, min, max, step, opt]) => `<label class="field" for="ph-${k}">${label}${opt ? ' <small>선택</small>' : ''}<span class="field-unit"><input id="ph-${k}" name="${k}" type="number" inputmode="decimal" min="${min}" max="${max}" step="${step}" value="${st.answers[k] ?? ''}"><em>${unit}</em></span></label>`).join('')}
    <fieldset class="ph-weeks"><legend>기간</legend><div class="chip-row">${t.weeks.map(w => `<button type="button" class="chip ${Number(st.weeks) === w ? 'on' : ''}" data-ph-weeks="${w}" aria-pressed="${Number(st.weeks) === w}">${w}주</button>`).join('')}<label class="field inline" for="ph-weeks-in">직접 <input id="ph-weeks-in" name="weeks" type="number" min="2" max="52" value="${esc(st.weeks)}"> 주</label></div></fieldset>
    <label class="field" for="ph-start">시작일<input id="ph-start" name="start" type="date" value="${esc(st.start || today)}"></label>
    ${chk.notes.length || chk.warn.length ? `<div class="ph-check">${chk.notes.map(x => `<p class="hint">${esc(x)}</p>`).join('')}${chk.warn.map(x => `<p class="hint warn">${esc(x)}</p>`).join('')}</div>` : ''}
    <div class="onb-btns"><button type="button" class="button secondary" id="ph-back">이전</button><button type="submit" class="button">이대로 시작</button></div></form>`;
  return '';
}
export function phaseSettingsHTML(db, today) {
  const s = phaseStatus(db, today), hist = (db.settings?.phaseHistory || []).slice(-5).reverse();
  return `<section class="section card" id="phase-settings"><h3>목표 페이즈</h3>${s ? `<p>${esc(s.type.name)} 페이즈 · ${s.over ? '기간 끝' : `${s.week}/${s.weeks}주차`} · ${esc(progressLine(s))}</p>` : '<p class="hint">다이어트·바디프로필·유지·상승 다이어트·린매스업·벌크업·리버스 다이어트 등 지금 페이즈를 정하면 목표에 맞춰 제안해요.</p>'}<button type="button" class="button ${s ? 'secondary' : ''}" data-modal="phase">${s ? '페이즈 보기' : '페이즈 정하기'}</button>${hist.length ? `<details><summary>지난 페이즈 ${hist.length}개</summary><ul class="plus-list">${hist.map(h => `<li><b>${esc(typeOf(h.type)?.name || '')}</b> <small>${esc(h.start)} ~ ${esc(h.endedAt)}${h.recap?.weightChange != null ? ` · ${sign(h.recap.weightChange)}kg` : ''}</small></li>`).join('')}</ul></details>` : ''}</section>`;
}
