// 4.17.0 영양 심화 리포트(프리미엄): 나트륨·당류·식이섬유·포화지방을 주 단위로, 어디서 많이 왔는지까지.
// 참고선(2020 한국인 영양소 섭취기준): 나트륨 만성질환위험감소섭취량 2,300mg, 식이섬유 충분섭취량 남 30g·여 20g(19~64세),
// 포화지방 에너지의 7% 미만, 총당류 에너지의 10~20%(20% 넘지 않게). 판정이 아니라 비교용 참고선.
// 값이 없는 음식(가공식품·외식은 식이섬유 표시 의무가 없음)은 0으로 세지 않고, '값이 있는 비율'을 함께 보여 준다.
const DAY = 86400000;
const ymd = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
export const MICRO_INFO = {
  sodium: {label: '나트륨', unit: 'mg', ref: () => 2300, kind: 'max', refText: '하루 2,300mg 아래'},
  sugar: {label: '당류', unit: 'g', ref: kcal => Math.round(kcal * 0.2 / 4), kind: 'max', refText: '하루 열량의 20% 아래'},
  satFat: {label: '포화지방', unit: 'g', ref: kcal => Math.round(kcal * 0.07 / 9), kind: 'max', refText: '하루 열량의 7% 아래'},
  fiber: {label: '식이섬유', unit: 'g', ref: (kcal, sex) => sex === 'female' ? 20 : sex === 'male' ? 30 : 25, kind: 'min', refText: '하루 남 30g · 여 20g'},
};
export function microReport(db, today, days = 7) {
  const end = new Date(`${today}T12:00:00`), dates = [...Array(days)].map((_, i) => ymd(new Date(end - (days - 1 - i) * DAY)));
  const meals = (db.meals || []).filter(m => !m.planned && dates.includes(m.date));
  const recDays = new Set(meals.map(m => m.date)).size;
  if (!recDays) return null;
  const kcalTotal = meals.reduce((a, m) => a + (Number(m.calories) || 0), 0), kcalDay = kcalTotal / recDays;
  const sex = db.settings?.nutritionProfile?.sex || '';
  const out = {days: recDays, kcalDay: Math.round(kcalDay), items: {}};
  for (const [k, info] of Object.entries(MICRO_INFO)) {
    const known = meals.filter(m => Number.isFinite(m[k]));
    const knownKcal = known.reduce((a, m) => a + (Number(m.calories) || 0), 0);
    const total = known.reduce((a, m) => a + m[k], 0);
    const coverage = kcalTotal ? knownKcal / kcalTotal : 0;
    // 값이 있는 음식의 열량 비율로 하루 양을 보정(빠진 음식이 많으면 '최소 이 정도')
    const perDay = recDays ? total / recDays : 0;
    const byFood = new Map(); for (const m of known) byFood.set(m.name, (byFood.get(m.name) || 0) + m[k]);
    const top = [...byFood].sort((a, b) => b[1] - a[1]).slice(0, 5).map(([name, v]) => ({name, v: Math.round(v / recDays * 10) / 10, share: total ? Math.round(v / total * 100) : 0}));
    const ref = info.ref(kcalDay, sex), ratio = ref ? perDay / ref : null;
    out.items[k] = {...info, perDay: Math.round(perDay * 10) / 10, ref, ratio, coverage: Math.round(coverage * 100), top, status: coverage < 0.4 ? 'unknown' : info.kind === 'max' ? (ratio > 1.15 ? 'high' : ratio > 0.9 ? 'near' : 'ok') : (ratio < 0.6 ? 'low' : ratio < 0.9 ? 'near' : 'ok')};
  }
  return out;
}
const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));
const fmt = n => Number(n).toLocaleString('ko-KR');
const STATUS = {high: '참고선보다 많아요', near: '참고선 근처예요', ok: '참고선 안이에요', low: '참고선보다 적어요', unknown: '값이 있는 음식이 적어 판단하기 어려워요'};
// 무료: 오늘 한 줄(나트륨·당류), 프리미엄: 주간 전체
export function microTodayLine(db, today) {
  const ms = (db.meals || []).filter(m => !m.planned && m.date === today);
  const s = ms.filter(m => Number.isFinite(m.sodium)).reduce((a, m) => a + m.sodium, 0), g = ms.filter(m => Number.isFinite(m.sugar)).reduce((a, m) => a + m.sugar, 0);
  return ms.length ? `오늘 나트륨 ${fmt(Math.round(s))}mg · 당류 ${Math.round(g)}g (값이 있는 음식 기준)` : '';
}
export function microReportHTML(r, {locked = '', today = ''} = {}) {
  const head = `<section class="section card micro-report"><div class="section-title"><h3>영양 심화 리포트</h3><small>최근 7일 · 기록한 ${r?.days || 0}일</small></div>`;
  if (locked) return head + (today ? `<p class="mr-today">${esc(today)}</p>` : '') + locked + '</section>';
  if (!r) return head + '<p class="hint">최근 7일 식사 기록이 있으면 보여 드려요.</p></section>';
  const rows = Object.entries(r.items).map(([k, x]) => {
    const pct = x.ref ? Math.min(160, Math.round(x.perDay / x.ref * 100)) : 0;
    return `<div class="mr-row s-${x.status}"><div class="mr-head"><b>${esc(x.label)}</b><span>${x.coverage ? `하루 ${fmt(x.unit === 'mg' ? Math.round(x.perDay) : x.perDay)}${x.unit}` : '값 없음'} <small>/ 참고 ${esc(x.refText)}</small></span></div><div class="mr-bar" aria-hidden="true"><i style="width:${Math.min(100, pct / 1.6)}%"></i><u style="left:${100 / 1.6}%"></u></div><p class="mr-status">${STATUS[x.status]}<small> · 값이 있는 음식 ${x.coverage}%</small></p>${x.top.length ? `<p class="mr-top">많이 준 음식: ${x.top.slice(0, 3).map(t => `${esc(t.name)} ${t.share}%`).join(' · ')}</p>` : ''}</div>`;
  }).join('');
  return `${head}${rows}<p class="hint">2020 한국인 영양소 섭취기준을 참고선으로 썼어요. 진단이 아니라 비교예요. 가공식품·외식은 식이섬유 표시 의무가 없어서 값이 비는 경우가 많아요.</p></section>`;
}
