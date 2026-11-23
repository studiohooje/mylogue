// 4.17.0 몰입감 1차: '나에 대한 발견'과 '기록이 쌓일수록 열리는 분석'.
// 원칙: 내 기록에서만 계산한다. 표본 수를 같이 적고, 차이가 약하면 보여 주지 않는다. 판단·점수·재촉 없이 사실만.
const DAY = 86400000, WD = ['일', '월', '화', '수', '목', '금', '토'];
const toDate = s => new Date(String(s).slice(0, 10) + 'T12:00:00');
const ymd = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const nextDay = s => ymd(new Date(toDate(s).getTime() + DAY));
const mean = a => a.reduce((s, x) => s + x, 0) / a.length;
const sd = a => { if (a.length < 2) return 0; const m = mean(a); return Math.sqrt(a.reduce((s, x) => s + (x - m) ** 2, 0) / (a.length - 1)); };
const r0 = n => Math.round(n), r1 = n => Math.round(n * 10) / 10;
const fmt = n => r0(n).toLocaleString('ko-KR');
// 두 묶음의 차이가 우연보다 큰지(대략적 t 값). 2 이상 '확실한 편', 1.5 이상 '참고 정도', 그 아래는 숨김
export function strengthOf(a, b) {
  const se = Math.sqrt(sd(a) ** 2 / a.length + sd(b) ** 2 / b.length);
  const t = se > 0 ? Math.abs(mean(a) - mean(b)) / se : (mean(a) === mean(b) ? 0 : 9);
  return t >= 2 ? 'strong' : t >= 1.5 ? 'weak' : null;
}
export const STRENGTH_LABEL = {strong: '확실한 편', weak: '참고 정도'};

// 날짜별 묶음. 식사 합계가 800kcal 이상이거나 식사 3번 이상이면 '하루를 다 적은 날'로 본다(빠뜨린 날이 평균을 끌어내리지 않게).
export function dailyOf(db, today) {
  const days = new Map(), get = d => { if (!days.has(d)) days.set(d, {date: d, kcal: 0, protein: 0, carbs: 0, sodium: 0, sodiumKnown: 0, meals: 0, mealKeys: new Set(), late: false, firstMeal: null, workout: false, weight: null, sleep: null}); return days.get(d); };
  for (const m of db.meals || []) {
    if (m.planned || !m.date || m.date > today) continue;
    const x = get(m.date); x.mealKeys.add(m.mealGroupId || `${m.slot || ''}|${String(m.loggedAt || '').slice(0, 13)}`); x.meals = x.mealKeys.size; x.kcal += Number(m.calories) || 0; x.protein += Number(m.protein) || 0; x.carbs += Number(m.carbs) || 0;
    if (Number.isFinite(m.sodium)) { x.sodium += m.sodium; x.sodiumKnown++; }
    const at = m.loggedAt ? new Date(m.loggedAt) : null;
    if (at && !Number.isNaN(at.getTime()) && ymd(at) === m.date) { const h = at.getHours() + at.getMinutes() / 60; if (h >= 21) x.late = true; if (h >= 4 && (x.firstMeal == null || h < x.firstMeal)) x.firstMeal = h; }
  }
  for (const w of db.workouts || []) if (!w.planned && !w.rest && w.date && w.date <= today) get(w.date).workout = true;
  for (const b of [...(db.body || [])].sort((a, b) => String(a.date).localeCompare(String(b.date)))) if (b.date && b.date <= today && Number(b.weight) > 0) { const x = get(b.date); if (x.weight == null) x.weight = Number(b.weight); }
  for (const [d, c] of Object.entries(db.checkins || {})) if (d <= today && Number(c?.sleep) > 0) get(d).sleep = Number(c.sleep);
  for (const x of days.values()) x.complete = x.kcal >= 800 || x.meals >= 3;
  return [...days.values()].sort((a, b) => a.date.localeCompare(b.date));
}
// 다음 날 아침 체중 변화(연이은 두 날 모두 체중이 있을 때만)
function nextWeightDeltas(daily) {
  const by = new Map(daily.map(x => [x.date, x]));
  return daily.filter(x => x.weight != null && by.get(nextDay(x.date))?.weight != null).map(x => ({day: x, delta: by.get(nextDay(x.date)).weight - x.weight}));
}

export function discoveries(db, today) {
  const daily = dailyOf(db, today), full = daily.filter(x => x.complete), out = [];
  const add = (id, a, b, make) => { const s = strengthOf(a, b); if (s) out.push({id, strength: s, ...make(mean(a), mean(b))}); };
  // 1) 주말과 평일 식사량
  const we = full.filter(x => [0, 6].includes(toDate(x.date).getDay())).map(x => x.kcal), wd = full.filter(x => ![0, 6].includes(toDate(x.date).getDay())).map(x => x.kcal);
  if (we.length >= 4 && wd.length >= 8 && Math.abs(mean(we) - mean(wd)) >= 150) add('weekend-kcal', we, wd, (a, b) => ({title: '주말의 나', text: `주말에는 평일보다 하루 평균 ${fmt(Math.abs(a - b))}kcal ${a > b ? '더' : '덜'} 먹었어요.`, basis: `주말 ${we.length}일 · 평일 ${wd.length}일`}));
  // 2) 늦은 식사(밤 9시 이후) 다음 날 아침 체중
  const deltas = nextWeightDeltas(daily).filter(x => x.day.complete);
  const lt = deltas.filter(x => x.day.late).map(x => x.delta), nl = deltas.filter(x => !x.day.late).map(x => x.delta);
  if (lt.length >= 5 && nl.length >= 5 && Math.abs(mean(lt) - mean(nl)) >= 0.2) add('late-meal', lt, nl, (a, b) => ({title: '늦은 저녁과 다음 날 체중', text: `밤 9시 넘어 먹은 다음 날 아침 체중은 그렇지 않은 날보다 평균 ${r1(Math.abs(a - b))}kg ${a > b ? '높았어요' : '낮았어요'}. 대부분 물과 음식 무게라 며칠 안에 돌아오는 경우가 많아요.`, basis: `늦게 먹은 날 ${lt.length}번 · 아닌 날 ${nl.length}번`}));
  // 3) 짜게 먹은 날(나트륨 기록이 있는 날 중 위쪽 절반) 다음 날 체중
  const sod = deltas.filter(x => x.day.sodiumKnown >= 2);
  if (sod.length >= 10) { const med = [...sod].map(x => x.day.sodium).sort((a, b) => a - b)[sod.length >> 1]; const hi = sod.filter(x => x.day.sodium > med).map(x => x.delta), lo = sod.filter(x => x.day.sodium <= med).map(x => x.delta); if (hi.length >= 5 && lo.length >= 5 && mean(hi) - mean(lo) >= 0.2) add('sodium-water', hi, lo, (a, b) => ({title: '짠 날의 물 무게', text: `나트륨이 많았던 날 다음 아침 체중이 평균 ${r1(a - b)}kg 더 올라갔어요. 살이 아니라 물이라 2~3일이면 빠지는 편이에요.`, basis: `짠 날 ${hi.length}번 · 덜 짠 날 ${lo.length}번`})); }
  // 4) 운동한 날과 쉰 날의 식사량
  const wk = full.filter(x => x.workout).map(x => x.kcal), rs = full.filter(x => !x.workout).map(x => x.kcal);
  if (wk.length >= 5 && rs.length >= 5 && Math.abs(mean(wk) - mean(rs)) >= 150) add('workout-kcal', wk, rs, (a, b) => ({title: '운동한 날의 식사', text: `운동한 날은 쉰 날보다 평균 ${fmt(Math.abs(a - b))}kcal ${a > b ? '더' : '덜'} 먹었어요.`, basis: `운동한 날 ${wk.length}일 · 쉰 날 ${rs.length}일`}));
  // 5) 잠을 설친 날(수면 1~2)과 잘 잔 날(4~5)의 식사량
  const bad = full.filter(x => x.sleep != null && x.sleep <= 2).map(x => x.kcal), good = full.filter(x => x.sleep != null && x.sleep >= 4).map(x => x.kcal);
  if (bad.length >= 4 && good.length >= 6 && Math.abs(mean(bad) - mean(good)) >= 150) add('sleep-kcal', bad, good, (a, b) => ({title: '잠과 식욕', text: `잠을 설친 날은 잘 잔 날보다 평균 ${fmt(Math.abs(a - b))}kcal ${a > b ? '더' : '덜'} 먹었어요.`, basis: `설친 날 ${bad.length}일 · 잘 잔 날 ${good.length}일`}));
  // 6) 운동 요일(빈도 패턴: 통계 검정 대신 비율이 뚜렷할 때만)
  const wdays = daily.filter(x => x.workout).map(x => toDate(x.date).getDay());
  if (wdays.length >= 8) { const cnt = WD.map((_, i) => wdays.filter(d => d === i).length), top = cnt.map((c, i) => [c, i]).sort((a, b) => b[0] - a[0]).slice(0, 2), share = (top[0][0] + top[1][0]) / wdays.length; if (share >= 0.5 && top[1][0] >= 2) out.push({id: 'workout-weekday', strength: share >= 0.65 ? 'strong' : 'weak', title: '나의 운동 요일', text: `운동은 주로 ${WD[top[0][1]]}·${WD[top[1][1]]}요일에 했어요.`, basis: `운동한 ${wdays.length}일 중 ${top[0][0] + top[1][0]}일`}); }
  // 4.17.0 2차 ─────────────────────────────
  // 7) 아침을 거른 날(첫 끼 11시 이후)의 하루 칼로리
  const skip = full.filter(x => x.firstMeal != null && x.firstMeal >= 11).map(x => x.kcal), ate = full.filter(x => x.firstMeal != null && x.firstMeal < 10).map(x => x.kcal);
  if (skip.length >= 4 && ate.length >= 6 && Math.abs(mean(skip) - mean(ate)) >= 150) add('skip-breakfast', skip, ate, (a, b) => ({title: '아침을 거른 날', text: `아침을 거른 날은 하루 전체로 ${fmt(Math.abs(a - b))}kcal ${a > b ? '더' : '덜'} 먹었어요.`, basis: `거른 날 ${skip.length}일 · 먹은 날 ${ate.length}일`}));
  // 8) 근력 운동 다음 날 아침 체중(근육 회복 중 물)
  const afterW = deltas.filter(x => x.day.workout).map(x => x.delta), afterR = deltas.filter(x => !x.day.workout).map(x => x.delta);
  if (afterW.length >= 5 && afterR.length >= 5 && mean(afterW) - mean(afterR) >= 0.15) add('after-workout-weight', afterW, afterR, (a, b) => ({title: '운동 다음 날 체중', text: `운동한 다음 날 아침 체중이 평균 ${r1(a - b)}kg 더 올라 있었어요. 근육이 회복하며 물을 머금는 거라 걱정하지 않아도 돼요.`, basis: `운동 다음 날 ${afterW.length}번 · 쉰 다음 날 ${afterR.length}번`}));
  // 9) 단백질 비중이 높은 날의 칼로리(포만감)
  const ratio = full.filter(x => x.kcal > 0).map(x => ({k: x.kcal, r: x.protein * 4 / x.kcal})).sort((a, b) => a.r - b.r);
  if (ratio.length >= 18) { const third = Math.floor(ratio.length / 3), lo = ratio.slice(0, third).map(x => x.k), hi = ratio.slice(-third).map(x => x.k); if (mean(lo) - mean(hi) >= 150) add('protein-full', hi, lo, (a, b) => ({title: '단백질과 포만감', text: `단백질 비중이 높은 날은 낮은 날보다 하루 ${fmt(b - a)}kcal 덜 먹었어요.`, basis: `높은 날 ${hi.length}일 · 낮은 날 ${lo.length}일`})); }
  // 10) 잘 잔 날의 운동
  const slept = daily.filter(x => x.sleep != null);
  const goodW = slept.filter(x => x.sleep >= 4).map(x => x.workout ? 1 : 0), badW = slept.filter(x => x.sleep <= 2).map(x => x.workout ? 1 : 0);
  if (goodW.length >= 8 && badW.length >= 5 && mean(goodW) - mean(badW) >= 0.2) out.push({id: 'sleep-move', strength: mean(goodW) - mean(badW) >= 0.35 ? 'strong' : 'weak', title: '잠과 운동', text: `잘 잔 날은 ${Math.round(mean(goodW) * 100)}%, 설친 날은 ${Math.round(mean(badW) * 100)}% 운동했어요.`, basis: `잘 잔 날 ${goodW.length}일 · 설친 날 ${badW.length}일`});
  // 11) 주말 사이 체중(금 → 월)과 평일 사이(월 → 목)
  const wmap = new Map(daily.filter(x => x.weight != null).map(x => [x.date, x.weight])), addD = (s, n) => { const d = toDate(s); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10); };
  const wkd = [], wd2 = [];
  for (const [d, w] of wmap) { const dow = toDate(d).getDay(); if (dow === 5 && wmap.has(addD(d, 3))) wkd.push(wmap.get(addD(d, 3)) - w); if (dow === 1 && wmap.has(addD(d, 3))) wd2.push(wmap.get(addD(d, 3)) - w); }
  if (wkd.length >= 4 && wd2.length >= 4 && mean(wkd) >= 0.15 && mean(wkd) - mean(wd2) >= 0.2) add('weekend-weight', wkd, wd2, (a, b) => ({title: '주말 사이 체중', text: `월요일 체중이 금요일보다 평균 ${r1(a)}kg 높았어요. 같은 사흘이라도 평일 사이엔 ${r1(b) > 0 ? '+' : ''}${r1(b)}kg였어요. 주말 무게는 대개 주중에 다시 빠져요.`, basis: `주말 ${wkd.length}번 · 평일 ${wd2.length}번`}));
  // 12) 운동한 날의 단백질
  const pW = full.filter(x => x.workout).map(x => x.protein), pR = full.filter(x => !x.workout).map(x => x.protein);
  if (pW.length >= 5 && pR.length >= 5 && Math.abs(mean(pW) - mean(pR)) >= 10) add('workout-protein', pW, pR, (a, b) => ({title: '운동한 날의 단백질', text: `운동한 날은 쉰 날보다 단백질을 ${Math.round(Math.abs(a - b))}g ${a > b ? '더' : '덜'} 먹었어요.${a < b ? ' 운동한 날 한 끼에 단백질 반찬 하나를 더해 보면 회복에 좋아요.' : ''}`, basis: `운동한 날 ${pW.length}일 · 쉰 날 ${pR.length}일`}));
  return out.sort((a, b) => (a.strength === 'strong' ? 0 : 1) - (b.strength === 'strong' ? 0 : 1));
}

// 기록이 쌓일수록 열리는 분석: 기록한 날 수(빠진 날이 있어도 줄지 않음) 7 · 30 · 90
export const STAGES = [{days: 7, name: '나의 평균 하루'}, {days: 30, name: '추세와 출렁임'}, {days: 90, name: '나의 요일과 앞으로의 범위'}];
export function journey(db, today) {
  const daily = dailyOf(db, today), recorded = daily.filter(x => x.meals || x.workout || x.weight != null).length, full = daily.filter(x => x.complete);
  const open = STAGES.filter(s => recorded >= s.days).map(s => s.days), next = STAGES.find(s => recorded < s.days) || null;
  const res = {recorded, open, next: next ? {...next, left: next.days - recorded} : null};
  if (open.includes(7)) {
    const fm = full.map(x => x.firstMeal).filter(h => h != null).sort((a, b) => a - b);
    const weeks = Math.max(1, (toDate(today) - toDate(daily[0].date)) / DAY / 7);
    res.avg = full.length ? {kcal: r0(mean(full.map(x => x.kcal))), protein: r0(mean(full.map(x => x.protein))), meals: r1(mean(full.map(x => x.meals))), firstMeal: fm.length >= 3 ? fm[fm.length >> 1] : null, days: full.length} : null;
    res.workoutsPerWeek = r1(daily.filter(x => x.workout).length / weeks);
  }
  const ws = daily.filter(x => x.weight != null && toDate(today) - toDate(x.date) <= 41 * DAY);
  if (open.includes(30) && ws.length >= 8) {
    const t0 = toDate(ws[0].date).getTime(), xs = ws.map(x => (toDate(x.date).getTime() - t0) / DAY), ys = ws.map(x => x.weight), mx = mean(xs), my = mean(ys);
    const slope = xs.reduce((s, x, i) => s + (x - mx) * (ys[i] - my), 0) / (xs.reduce((s, x) => s + (x - mx) ** 2, 0) || 1);
    const resid = ys.map((y, i) => y - (my + slope * (xs[i] - mx)));
    res.trend = {perWeek: r1(slope * 7), wobble: r1(sd(resid)), n: ws.length, now: r1(my + slope * (xs.at(-1) - mx))};
    if (open.includes(90)) { const spread = Math.max(0.5, 2 * sd(resid) + Math.abs(slope * 28) * 0.5); res.range = {low: r1(res.trend.now + slope * 28 - spread), high: r1(res.trend.now + slope * 28 + spread)}; }
  }
  if (open.includes(90) && full.length >= 21) { const by = WD.map((_, i) => full.filter(x => toDate(x.date).getDay() === i).map(x => x.kcal)); const avgs = by.map(a => a.length >= 2 ? mean(a) : null), ok = avgs.filter(v => v != null); if (ok.length >= 5) { const hi = avgs.indexOf(Math.max(...ok)), lo = avgs.indexOf(Math.min(...ok)); res.weekday = {high: WD[hi], highKcal: r0(avgs[hi]), low: WD[lo], lowKcal: r0(avgs[lo])}; } }
  return res;
}
const subj = w => { const c = String(w).slice(-1).charCodeAt(0); return w + (c >= 0xAC00 && c <= 0xD7A3 && (c - 0xAC00) % 28 ? '이' : '가'); };
const hm = h => `${Math.floor(h)}시${Math.round((h % 1) * 60) ? ` ${String(Math.round((h % 1) * 60)).padStart(2, '0')}분` : ''}`;
export function journeyHTML(j, found, {limit = Infinity, esc = s => s, lockLine = ''} = {}) {
  if (!j.recorded) return '';
  const rows = [];
  if (j.avg) rows.push(`<div class="jr-stage"><b>7일 · 나의 평균 하루</b><p>다 적은 날(${j.avg.days}일) 기준 하루 ${fmt(j.avg.kcal)}kcal · 단백질 ${j.avg.protein}g · 식사 ${j.avg.meals}번${j.avg.firstMeal != null ? ` · 첫 끼는 보통 ${hm(j.avg.firstMeal)}` : ''}${j.workoutsPerWeek ? ` · 운동 주 ${j.workoutsPerWeek}번` : ''}</p></div>`);
  if (j.trend) rows.push(`<div class="jr-stage"><b>30일 · 추세와 출렁임</b><p>하루하루 ±${j.trend.wobble}kg 안에서 출렁이고, 그 아래 흐름은 주당 ${j.trend.perWeek > 0 ? '+' : ''}${j.trend.perWeek}kg이에요.${Math.abs(j.trend.perWeek) < 0.1 ? ' 거의 그대로 유지하고 있어요.' : ''} <small>체중 ${j.trend.n}번 기준</small></p></div>`);
  if (j.range || j.weekday) rows.push(`<div class="jr-stage"><b>90일 · 나의 요일과 앞으로의 범위</b>${j.weekday ? `<p>가장 많이 먹는 요일은 ${j.weekday.high}요일(${fmt(j.weekday.highKcal)}kcal), 가장 적게 먹는 요일은 ${j.weekday.low}요일(${fmt(j.weekday.lowKcal)}kcal)이에요.</p>` : ''}${j.range ? `<p>지금 흐름이면 4주 뒤 체중은 대략 ${j.range.low}~${j.range.high}kg 사이일 거예요. <small>예측이 아니라 범위예요.</small></p>` : ''}</div>`);
  const shown = found.slice(0, limit);
  const disc = shown.length ? `<div class="jr-found"><b>나에 대한 발견</b>${shown.map(d => `<div class="jr-card"><span class="jr-tag ${d.strength}">${STRENGTH_LABEL[d.strength]}</span><strong>${esc(d.title)}</strong><p>${esc(d.text)}</p><small>${esc(d.basis)}</small></div>`).join('')}${found.length > shown.length ? lockLine : ''}</div>` : '';
  const next = j.next ? `<p class="hint jr-next">${j.next.left}일 더 기록하면 '${j.next.name}'${subj(j.next.name).slice(-1)} 열려요. 빠진 날이 있어도 열린 분석은 사라지지 않아요.</p>` : '';
  return `<section class="section card journey"><h3>기록이 알려 준 나</h3><p class="hint">기록한 날 ${j.recorded}일 · 내 기록으로만 계산해요.</p>${rows.join('')}${disc}${next}</section>`;
}
