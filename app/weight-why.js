// 4.17.0 흔들림 설명기: 오늘 아침 체중이 어제와 0.3kg 넘게 달라졌을 때, 어제 기록에서 원인 후보를 찾아 설명한다.
// 원칙: 확실하지 않으면 '아마'로, 살이 아니라 물·음식 무게일 가능성을 먼저. 꾸짖지 않는다.
const DAY = 86400000;
const ymd = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const prev = s => ymd(new Date(new Date(`${s}T12:00:00`).getTime() - DAY));
const r1 = n => Math.round(n * 10) / 10;
function dayStats(db, date) {
  const ms = (db.meals || []).filter(m => m.date === date && !m.planned);
  const sum = k => ms.reduce((a, m) => a + (Number(m[k]) || 0), 0);
  const late = ms.some(m => { const t = m.loggedAt ? new Date(m.loggedAt) : null; return t && !Number.isNaN(t.getTime()) && ymd(t) === date && t.getHours() >= 21; });
  return {n: ms.length, kcal: sum('calories'), carbs: sum('carbs'), sodium: ms.filter(m => Number.isFinite(m.sodium)).length ? sum('sodium') : null, late,
    workout: (db.workouts || []).some(w => w.date === date && !w.planned && !w.rest && (w.exercises || []).some(e => e.kind !== 'cardio')), sleep: Number(db.checkins?.[date]?.sleep) || null};
}
const firstWeight = (db, date) => (db.body || []).filter(b => b.date === date && Number(b.weight) > 0).sort((a, b) => String(a.createdAt || '').localeCompare(String(b.createdAt || '')))[0]?.weight;
export function weightWhy(db, today) {
  const t = firstWeight(db, today), y = prev(today), w0 = firstWeight(db, y);
  if (t == null || w0 == null) return null;
  const diff = r1(t - w0); if (Math.abs(diff) < 0.3) return null;
  const s = dayStats(db, y), base = [2, 3, 4, 5, 6, 7, 8].map(i => dayStats(db, ymd(new Date(new Date(`${today}T12:00:00`).getTime() - i * DAY)))).filter(x => x.n >= 2);
  const avg = k => base.length ? base.reduce((a, x) => a + (x[k] || 0), 0) / base.length : null;
  const reasons = [];
  if (diff > 0) {
    if (s.sodium != null && s.sodium >= 3000) reasons.push(`어제 나트륨이 ${Math.round(s.sodium).toLocaleString('ko-KR')}mg으로 많았어요. 짠 음식은 물을 잠깐 붙잡아요.`);
    if (s.late) reasons.push('어제 밤 9시 넘어 먹었어요. 아직 소화 중인 음식 무게가 남아 있을 수 있어요.');
    const ac = avg('carbs'); if (ac && s.carbs > ac * 1.3) reasons.push(`어제 탄수화물이 평소보다 많았어요(${Math.round(s.carbs)}g). 탄수화물은 물과 함께 저장돼요.`);
    if (s.workout) reasons.push('어제 근력 운동을 했어요. 근육이 회복하면서 물을 잠깐 머금어요.');
    if (s.sleep && s.sleep <= 2) reasons.push('어젯밤 잠을 설쳤어요. 잠이 부족하면 몸이 물을 더 붙잡기도 해요.');
    const ak = avg('kcal'); if (!reasons.length && ak && s.kcal > ak + 500) reasons.push(`어제 평소보다 ${Math.round(s.kcal - ak)}kcal쯤 더 먹었어요. 하루치로는 대부분 음식·물 무게예요.`);
  } else {
    const ak = avg('kcal'); if (ak && s.n >= 2 && s.kcal < ak - 400) reasons.push('어제 평소보다 적게 먹었어요. 음식 무게가 줄어든 몫이 커요.');
    if (s.sodium != null && s.sodium < 1500) reasons.push('어제 싱겁게 먹었어요. 붙잡고 있던 물이 빠졌을 수 있어요.');
  }
  const head = diff > 0 ? `어제보다 ${diff}kg 늘었어요.` : `어제보다 ${Math.abs(diff)}kg 줄었어요.`;
  const tail = diff > 0 ? '하루 사이 변화는 대부분 물과 음식 무게라 2~3일이면 돌아오는 경우가 많아요. 7일 평균을 봐 주세요.' : '하루 사이 변화라 너무 기뻐하거나 실망하지 않아도 돼요. 7일 평균이 진짜 흐름이에요.';
  return {diff, head, reasons: reasons.slice(0, 3), tail, sure: reasons.length > 0};
}
const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));
export function weightWhyHTML(w) {
  if (!w) return '';
  return `<section class="section card weight-why"><div class="section-title"><h3>오늘 체중, 왜 이럴까</h3><small>어제 기록으로 본 후보</small></div><p class="ww-head"><b>${esc(w.head)}</b></p>${w.reasons.length ? `<ul class="ww-list">${w.reasons.map(r => `<li>${esc(r)}</li>`).join('')}</ul>` : '<p class="hint">어제 기록에서는 뚜렷한 이유가 안 보여요. 측정 시각·옷·화장실 같은 작은 차이도 0.5kg쯤 움직여요.</p>'}<p class="hint">${esc(w.tail)}</p></section>`;
}
