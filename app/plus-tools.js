// 4.17.0 플러스 도구: 목표 시뮬레이터, 상황 대비 플랜, 더 나은 선택 제안.
// 원칙: 숫자 하나가 아니라 범위로, 꾸짖지 않고, 너무 빠른 목표엔 안전 안내.
import {journey} from './discovery.js';
const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));
const r1 = n => Math.round(n * 10) / 10;

// ① 목표 시뮬레이터: 지금 흐름(30일 추세) + 바꾸려는 것(하루 칼로리 차이, 주 운동 횟수 차이)
export function simulate(db, today, {kcal = 0, workouts = 0, weeks = 12} = {}) {
  const j = journey(db, today), now = j.trend?.now ?? [...(db.body || [])].filter(b => Number(b.weight) > 0).sort((a, b) => String(b.date).localeCompare(String(a.date)))[0]?.weight;
  if (!now) return null;
  const base = j.trend?.perWeek ?? 0, wobble = j.trend?.wobble ?? 0.5;
  const perWeek = base + (kcal * 7) / 7700 - (workouts * 250) / 7700;
  const mid = now + perWeek * weeks, spread = Math.max(0.6, wobble * 1.5 + Math.abs(perWeek) * weeks * 0.25);
  const warn = perWeek < -now * 0.01 ? '주 체중 1%보다 빠른 감량이에요. 근육이 같이 빠지기 쉬워 권하지 않아요.' : perWeek > 0.6 ? '주 0.6kg보다 빠른 증량이에요. 늘어난 무게 중 지방이 많아질 수 있어요.' : '';
  return {now: r1(now), base: r1(base), perWeek: r1(perWeek), weeks, low: r1(mid - spread), high: r1(mid + spread), mid: r1(mid), warn, hasTrend: !!j.trend};
}
export function simulatorHTML(st, sim) {
  const head = '<section class="section card plus-sim"><div class="section-title"><h3>목표 시뮬레이터</h3><small>지금 흐름에서 바꿔 보면</small></div>';
  if (!sim) return head + '<p class="hint">체중 기록이 몇 번 쌓이면 계산할 수 있어요.</p></section>';
  const seg = (key, list, cur, fmt) => `<div class="chip-row sim-seg">${list.map(v => `<button type="button" class="chip ${cur === v ? 'active' : ''}" data-sim-${key}="${v}" aria-pressed="${cur === v}">${fmt(v)}</button>`).join('')}</div>`;
  return `${head}<p class="hint">하루 칼로리</p>${seg('kcal', [-500, -300, -150, 0, 150, 300], st.kcal, v => v > 0 ? `+${v}` : v === 0 ? '지금대로' : `${v}`)}<p class="hint">운동 횟수(주)</p>${seg('workouts', [-1, 0, 1, 2, 3], st.workouts, v => v > 0 ? `+${v}번` : v === 0 ? '지금대로' : `${v}번`)}<p class="hint">기간</p>${seg('weeks', [4, 8, 12, 16, 24], st.weeks, v => `${v}주`)}
  <div class="sim-out"><p><b>${sim.weeks}주 뒤 체중은 대략 ${sim.low}~${sim.high}kg</b></p><p class="hint">지금 ${sim.now}kg · ${sim.hasTrend ? `지금 흐름 주 ${sim.base > 0 ? '+' : ''}${sim.base}kg` : '흐름 계산 전(체중 기록이 더 쌓이면 정확해져요)'} → 바꾸면 주 ${sim.perWeek > 0 ? '+' : ''}${sim.perWeek}kg</p>${sim.warn ? `<p class="hint warn">${esc(sim.warn)}</p>` : ''}</div>
  <p class="hint">예측이 아니라 범위예요. 몸은 계산보다 천천히, 들쑥날쑥 반응해요.</p></section>`;
}

// ② 상황 대비 플랜: 전날·당일·다음 날. 무료는 '다음 날 안심 안내'만
export const SITUATIONS = [
  {id: 'dinner', name: '회식', before: ['점심은 평소대로, 단백질 위주로 먹어 둬요(굶고 가면 더 먹게 돼요).', '물 한 병 챙겨 두기.'], day: ['처음 30분은 고기·채소 위주로, 술은 잔을 천천히.', '마지막 식사(볶음밥·국수)는 반만.', '술 한 잔에 물 한 잔.'], after: ['아침 체중이 1kg 넘게 올라도 대부분 물과 음식 무게예요. 2~3일이면 돌아와요.', '굶지 말고 평소처럼 세 끼, 국물은 줄여요.', '가볍게 30분 걷기.']},
  {id: 'trip', name: '여행', before: ['꼭 먹고 싶은 것 한두 개만 정해 두기.'], day: ['하루 한 끼는 맛있게, 나머지는 가볍게.', '많이 걷는 날은 그 자체로 운동이에요.'], after: ['돌아온 날 체중은 재도 되고 안 재도 돼요. 이틀 뒤부터 보면 정확해요.', '첫날은 평소 식사로 리듬만 되돌려요.']},
  {id: 'holiday', name: '명절', before: ['명절 전 주는 평소 리듬 그대로(미리 굶지 않기).'], day: ['전·튀김은 한 접시에 담아 먹기.', '식후 산책 20분.', '떡·과일은 한 번에 정해서.'], after: ['명절 뒤 체중 증가는 대부분 물이에요. 짠 음식 줄이고 물 많이.', '운동은 평소 강도의 70%로 다시 시작.']},
  {id: 'overtime', name: '야근', before: ['간식으로 단백질(우유·삶은 달걀·닭가슴살) 챙겨 두기.'], day: ['저녁을 미루면 오후 5시쯤 작은 끼니.', '늦은 밤 라면·배달은 반만, 국물 빼고.'], after: ['잠이 부족한 날은 식욕이 늘어요. 아침 단백질을 챙겨요.', '운동은 쉬어도 괜찮아요. 걷기만.']},
  {id: 'party', name: '생일·파티', before: ['그날 먹을 케이크·디저트는 미리 정해 두기.'], day: ['먹고 싶은 건 맛있게, 대신 천천히.', '사진 찍고 기록은 대충이라도.'], after: ['다음 날은 평소대로. 하루 많이 먹은 걸로 흐름은 안 바뀌어요.']},
  {id: 'business', name: '출장', before: ['숙소 근처 편의점 단백질(달걀·닭가슴살·그릭요거트) 확인.'], day: ['조식은 달걀·채소·과일 먼저.', '호텔 방에서 맨몸 15분(스쿼트·푸시업·런지).'], after: ['돌아와서 하루 쉬고 평소 운동으로.']},
  {id: 'exam', name: '시험·마감 주간', before: ['한 주 운동 목표를 2번으로 낮춰 두기.'], day: ['간식은 견과·과일로, 카페인은 오후 3시 전까지.', '10분 걷기로 머리 식히기.'], after: ['끝난 날 폭식하기 쉬워요. 먹고 싶은 걸 한 끼 제대로 먹고 끝내요.']},
  {id: 'sick', name: '아플 때', before: [], day: ['체중·목표는 잠시 내려놓고 물과 잘 먹는 것 먼저.', '운동은 쉬어요. 기록도 쉬어도 돼요.'], after: ['나은 뒤 첫 주는 가볍게. 백 온 트랙이 도와줄게요.']},
];
export function situationHTML(st, {full = true, lock = ''} = {}) {
  const s = SITUATIONS.find(x => x.id === st.sit) || null;
  const chips = `<div class="chip-row sit-chips">${SITUATIONS.map(x => `<button type="button" class="chip ${st.sit === x.id ? 'active' : ''}" data-sit="${x.id}" aria-pressed="${st.sit === x.id}">${x.name}</button>`).join('')}</div>`;
  const block = (t, list) => list.length ? `<div class="sit-step"><b>${t}</b><ul>${list.map(x => `<li>${esc(x)}</li>`).join('')}</ul></div>` : '';
  return `<section class="section card plus-sit"><div class="section-title"><h3>상황 대비 플랜</h3><small>미리 알면 덜 흔들려요</small></div>${chips}${s ? (full ? block('전날', s.before) + block('당일', s.day) + block('다음 날', s.after) : block('다음 날', s.after) + lock) : '<p class="hint">다가오는 상황을 고르면 전날·당일·다음 날 할 일을 알려 드려요.</p>'}</section>`;
}

// ③ 더 나은 선택 제안: 오늘 먹은 것 중 열량이 큰 음식 → 같은 계열에서 덜 짜거나 단백질이 많거나 열량이 낮은 대안
const FAMILY = /치킨|피자|버거|라면|짜장|짬뽕|떡볶이|김밥|덮밥|비빔밥|국밥|찌개|파스타|샐러드|샌드위치|돈까스|돈가스|볶음밥|냉면|우동|커피|라떼|빵|케이크|아이스크림|과자|도시락/;
export function betterChoices(meals, today, search, limit = 3) {
  const todays = (meals || []).filter(m => m.date === today && !m.planned && Number(m.calories) > 150);
  const target = todays.sort((a, b) => b.calories - a.calories).find(m => FAMILY.test(m.name));
  if (!target) return null;
  const fam = target.name.match(FAMILY)[0];
  const base = {kcal: Number(target.calories) || 0, protein: Number(target.protein) || 0, sodium: Number(target.sodium) || null};
  const cands = (search(fam, {limit: 60}) || []).filter(f => f.name !== target.name && f.calories != null && f.protein != null);
  const scored = [];
  for (const f of cands) {
    const mass = f.servingUnit === 'g' || f.servingUnit === 'ml';
    const k = mass ? f.calories * (target.servingQty && /g|ml/.test(target.servingUnit) ? target.servingQty / 100 : 2.5) : f.calories;
    const p = mass ? f.protein * (k / Math.max(1, f.calories)) : f.protein;
    if (!(k > 100) || k > base.kcal * 1.05) continue;
    const save = base.kcal - k, pGain = p - base.protein;
    const why = save >= 80 && pGain >= 3 ? `${Math.round(save)}kcal 덜고 단백질 ${Math.round(pGain)}g 더` : save >= 80 ? `${Math.round(save)}kcal 덜` : pGain >= 5 ? `단백질 ${Math.round(pGain)}g 더` : '';
    if (!why) continue;
    scored.push({name: f.name, kcal: Math.round(k), protein: Math.round(p), why, score: save / 50 + pGain / 3});
  }
  const seen = new Set();
  const list = scored.sort((a, b) => b.score - a.score).filter(x => { const k = x.name.replace(/\s*[·(].*$/, ''); if (seen.has(k)) return false; seen.add(k); return true; }).slice(0, limit);
  return list.length ? {from: {name: target.name, kcal: Math.round(base.kcal)}, list: list.filter(x => x.score > 0)} : null;
}
export function betterChoicesHTML(r, {limit = 3, lock = ''} = {}) {
  if (!r) return '';
  return `<section class="section card plus-better"><div class="section-title"><h3>다음에 골라 볼 만한 것</h3><small>${esc(r.from.name)} ${r.from.kcal}kcal 대신</small></div><ul class="better-list">${r.list.slice(0, limit).map(x => `<li><b>${esc(x.name)}</b><span>${x.kcal}kcal · 단 ${x.protein}g</span><small>${esc(x.why)}</small></li>`).join('')}</ul>${r.list.length > limit ? lock : ''}<p class="hint">오늘 먹은 건 그대로 괜찮아요. 다음에 같은 게 당길 때 참고만 해요.</p></section>`;
}
