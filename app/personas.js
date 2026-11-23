// 4.17.0 가상 인물(대표님: 랜딩에서 다양한 체중·체지방률·성별의 예시를 바꿔 보기 + 시뮬레이션 점검용).
// 같은 날짜·같은 인물이면 늘 같은 기록(새로고침해도 그래프가 흔들리지 않게). 120일치라 7·30·90일 분석이 모두 열린다.
const r1 = n => Math.round(n * 10) / 10;
const ymd = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const noise = (i, k = 1) => { const x = Math.sin(i * 12.9898 + k * 78.233) * 43758.5453; return (x - Math.floor(x)) - 0.5; };
export const PERSONA_DAYS = 120;
// 나트륨(mg) 대략: 국물·배달 음식은 높게, 손질한 재료는 낮게(예시 기록용 추정)
const SODIUM = [[/치킨|피자|짜장|족발|떡볶이|순대/, 1500], [/찌개|국밥|칼국수|국|탕|볶음 정식|김치/, 1400], [/불고기|제육|볶음|비빔밥|김밥/, 900], [/라면|과자/, 800], [/토스트|빵|버터/, 350]];
// 식이섬유·당류·포화지방 대략(예시 기록용 추정): 채소·잡곡·과일은 섬유, 단 음식은 당류, 튀김·고기는 포화지방
const microOf = (name, carbs, fat, scale) => ({fiber: Math.round((/샐러드|채소|브로콜리|양배추|현미|잡곡|고구마|오트|블루베리|사과|바나나|김치|된장|비빔밥|나물/.test(name) ? 4 : /밥|빵|면|국수|떡/.test(name) ? 1.2 : 0.6) * scale * 10) / 10, sugar: Math.round((/과자|라떼|바나나|사과|블루베리|떡볶이|짜장|요거트|우유|토스트|땅콩버터|불고기/.test(name) ? Math.max(6, carbs * 0.35) : carbs * 0.06) * scale * 10) / 10, satFat: Math.round(fat * (/치킨|피자|삼겹|족발|버터|소고기|돼지|제육|불고기|국밥/.test(name) ? 0.38 : 0.25) * scale * 10) / 10});
const sodiumOf = (name, scale) => Math.round((SODIUM.find(([re]) => re.test(name))?.[1] ?? 120) * scale);

// [이름, 양, 단위, kcal, 탄, 단, 지]
const M = {
  clean: {
    b: [[['그릭요거트 (플레인)', 150, 'g', 97, 4, 10, 4], ['바나나', 1, '개', 105, 27, 1, 0]], [['오트밀 (마른 것)', 40, 'g', 152, 27, 5, 3], ['우유', 200, 'ml', 120, 10, 6, 6], ['블루베리', 80, 'g', 46, 11, 1, 0]], [['삶은 달걀', 2, '개', 156, 1, 12, 10], ['통밀식빵', 1, '장', 95, 16, 4, 1]]],
    l: [[['닭가슴살 (익힌 것)', 130, 'g', 215, 0, 40, 5], ['현미밥', 1, '공기', 315, 68, 7, 2], ['샐러드 채소', 100, 'g', 20, 4, 1, 0]], [['연어 포케', 1, '그릇', 560, 62, 32, 18]], [['닭가슴살 샐러드', 1, '그릇', 380, 22, 38, 14], ['고구마 (찐 것)', 150, 'g', 130, 31, 1, 0]]],
    d: [[['소고기 우둔 구이', 150, 'g', 180, 0, 30, 6], ['현미밥', 1, '공기', 315, 68, 7, 2], ['브로콜리 (데친 것)', 100, 'g', 35, 7, 3, 0]], [['두부', 200, 'g', 168, 4, 18, 10], ['잡곡밥', 1, '공기', 320, 68, 8, 2], ['배추김치', 50, 'g', 18, 4, 1, 0]], [['연어 구이', 150, 'g', 309, 0, 33, 18], ['쌀밥 (백미)', 0.7, '공기', 210, 46, 4, 1]]],
    s: [[['프로틴 쉐이크', 1, '스쿱', 120, 3, 24, 1]], [['아몬드', 1, '줌', 165, 6, 6, 14]]],
  },
  korean: {
    b: [[['쌀밥 (백미)', 1, '공기', 300, 66, 5, 1], ['된장국', 1, '그릇', 80, 8, 6, 3], ['계란말이', 2, '조각', 140, 2, 10, 10]], [['토스트', 1, '개', 350, 40, 12, 15], ['아메리카노', 1, '잔', 10, 2, 0, 0]], [['김밥', 1, '줄', 420, 70, 12, 10]]],
    l: [[['김치찌개 정식', 1, '인분', 650, 80, 30, 22]], [['제육볶음 정식', 1, '인분', 720, 85, 34, 24]], [['비빔밥', 1, '그릇', 600, 90, 20, 16]], [['돼지국밥', 1, '그릇', 650, 70, 35, 22]], [['칼국수', 1, '그릇', 550, 95, 18, 10]]],
    d: [[['된장찌개', 1, '인분', 180, 12, 13, 9], ['쌀밥 (백미)', 1, '공기', 300, 66, 5, 1], ['고등어구이', 1, '토막', 230, 0, 22, 15]], [['소불고기', 1, '인분', 410, 15, 31, 25], ['쌀밥 (백미)', 1, '공기', 300, 66, 5, 1]], [['닭볶음탕', 1, '인분', 537, 30, 42, 26], ['쌀밥 (백미)', 0.7, '공기', 210, 46, 4, 1]]],
    s: [[['과자', 1, '봉', 250, 30, 3, 13]], [['라떼', 1, '잔', 180, 15, 9, 9]]],
  },
  delivery: {
    d: [[['후라이드치킨', 0.5, '마리', 850, 40, 55, 50]], [['짜장면', 1, '그릇', 800, 125, 22, 22]], [['페퍼로니피자', 3, '조각', 850, 90, 33, 38]], [['족발', 1, '인분', 600, 10, 60, 35]], [['떡볶이', 1, '인분', 630, 120, 12, 10], ['순대', 0.5, '인분', 220, 25, 10, 9]]],
  },
  bulk: {
    s: [[['프로틴 쉐이크', 1, '스쿱', 120, 3, 24, 1], ['바나나', 1, '개', 105, 27, 1, 0], ['땅콩버터', 1, '큰술', 95, 3, 4, 8]], [['땅콩버터 토스트', 2, '장', 480, 50, 18, 24]], [['우유', 400, 'ml', 240, 20, 12, 12]]],
  },
};
const W = {
  weights: [{title: '하체 데이', ex: [['스쿼트', '하체', 60, 2.5, 8], ['레그프레스', '하체', 140, 5, 12], ['루마니안 데드리프트', '하체', 50, 2.5, 10]]}, {title: '등 데이', ex: [['랫풀다운', '등', 45, 2.5, 10], ['시티드 로우 머신', '등', 40, 2.5, 12], ['덤벨 로우', '등', 16, 1, 10]]}, {title: '가슴·어깨', ex: [['벤치프레스', '가슴', 40, 2.5, 8], ['인클라인 덤벨 프레스', '가슴', 14, 1, 10], ['덤벨 숄더 프레스', '어깨', 10, 1, 10]]}],
  light: [{title: '전신 머신', ex: [['레그프레스', '하체', 40, 5, 12], ['랫풀다운', '등', 20, 2.5, 12], ['체스트 프레스 머신', '가슴', 15, 2.5, 12]]}],
  home: [{title: '홈트', ex: [['스쿼트', '하체', 0, 0, 20], ['푸시업', '가슴', 0, 0, 12], ['런지', '하체', 0, 0, 12]]}],
};
// sex, age, h(cm), w0→w1(kg), f0→f1(체지방률), m0→m1(골격근), kcal, 단백질, 식단, 운동(요일: 'w0','w1','w2','light','home','run','pilates','walk'), 기타
export const PERSONAS = [
  {id: 'jihoon', name: '지훈', sex: 'male', age: 32, h: 176, w: [84, 78.2], f: [27, 22.4], m: [33.5, 33.9], kcal: 2000, protein: 150, diet: 'clean', phase: 'diet', week: {1: 'w0', 2: 'w1', 3: 'run', 4: 'w2', 6: 'run'}, line: '다이어트 · 헬스 주 3회 + 러닝'},
  {id: 'seoyeon', name: '서연', sex: 'female', age: 28, h: 162, w: [53.8, 55.6], f: [26.5, 24.6], m: [20.6, 22.0], kcal: 1950, protein: 110, diet: 'clean', phase: 'leanbulk', week: {1: 'w0', 3: 'pilates', 4: 'w2', 6: 'pilates'}, line: '린매스업 · 필라테스와 웨이트'},
  {id: 'minjun', name: '민준', sex: 'male', age: 24, h: 180, w: [68, 73.4], f: [14, 16.8], m: [31, 33.6], kcal: 3100, protein: 160, diet: 'clean', bulk: true, phase: 'bulk', week: {1: 'w0', 2: 'w1', 3: 'w2', 4: 'w0', 5: 'w1'}, line: '벌크업 · 헬스 주 5회'},
  {id: 'haeun', name: '하은', sex: 'female', age: 35, h: 165, w: [61.4, 60.6], f: [31, 27.4], m: [21.4, 22.6], kcal: 1700, protein: 105, diet: 'korean', phase: 'recomp', week: {1: 'home', 3: 'pilates', 5: 'home', 6: 'pilates'}, line: '바디 리컴포지션 · 홈트와 필라테스'},
  {id: 'doyoon', name: '도윤', sex: 'male', age: 45, h: 172, w: [79.5, 79.0], f: [29, 28.6], m: [30.5, 30.2], kcal: 2300, protein: 100, diet: 'korean', delivery: 3, gap: [60, 71], phase: 'maintain', week: {2: 'walk', 4: 'walk', 6: 'light'}, line: '유지 · 직장인, 회식·배달 잦음, 쉬었다 복귀'},
  {id: 'jimin', name: '지민', sex: 'female', age: 41, h: 158, w: [72, 64.6], f: [38, 33.5], m: [20.8, 20.4], kcal: 1350, protein: 95, diet: 'clean', glp1: true, phase: 'diet', week: {1: 'walk', 3: 'light', 5: 'walk', 6: 'walk'}, line: '다이어트 · GLP-1 사용, 단백질 챙기기'},
  {id: 'sua', name: '수아', sex: 'female', age: 22, h: 168, w: [57.2, 57.0], f: [22, 21.4], m: [23, 23.3], kcal: 2100, protein: 90, diet: 'korean', phase: 'maintain', week: {1: 'run', 3: 'run', 5: 'run', 6: 'run'}, line: '유지 · 러닝 주 4회'},
  {id: 'hyunwoo', name: '현우', sex: 'male', age: 38, h: 174, w: [90.4, 85.6], f: [32, 29], m: [33, 33.2], kcal: 2100, protein: 140, diet: 'korean', delivery: 1, plateau: true, phase: 'diet', week: {2: 'w0', 5: 'w1'}, line: '다이어트 · 6주째 정체기'},
];
export const personaOf = id => PERSONAS.find(p => p.id === id) || null;

export function personaRecords(id, todayStr, now = new Date()) {
  const P = personaOf(id); if (!P) throw Error('없는 예시 인물이에요.');
  const base = new Date(`${todayStr}T12:00:00`), body = [], meals = [], workouts = [];
  const seed = [...P.id].reduce((a, c) => a + c.charCodeAt(0), 0);
  const at = (date, h, m = 0) => { const d = new Date(`${date}T${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:00`); if (date === todayStr && d > now) d.setTime(now.getTime() - 3600e3 * (22 - h) / 4); return d; };
  const addMeal = (date, h, slot, items, scale = 1) => { const t = at(date, h); const gid = `p-${date}-${slot}`; for (const [name, qty, unit, kcal, c, p, f] of items) meals.push({date, loggedAt: t.toISOString(), slot, mealGroupId: gid, name, servingQty: r1(qty * scale), servingUnit: unit, calories: Math.round(kcal * scale), carbs: r1(c * scale), protein: r1(p * scale), fat: r1(f * scale), sodium: sodiumOf(name, scale), ...microOf(name, c, f, scale), source: 'demo'}); };
  const N = PERSONA_DAYS, checkins = {};
  let bump = 0;
  for (let k = N - 1; k >= 0; k--) {
    const d = new Date(base); d.setDate(base.getDate() - k);
    const date = ymd(d), i = N - 1 - k, dow = d.getDay();
    if (P.gap && i >= P.gap[0] && i <= P.gap[1]) continue; // 기록 공백(복귀 장면)
    const prog = P.plateau ? Math.min(1, i / (N * 0.6)) : i / (N - 1);
    const wt = r1(P.w[0] + (P.w[1] - P.w[0]) * prog + noise(i + seed) * 0.45 + ((dow === 0 || dow === 1) ? 0.2 : 0) + bump); bump = 0;
    if (i % 7 !== 3 || P.id === 'jihoon') body.push({date, weight: wt, measure: 'scale', source: 'demo', createdAt: at(date, 7, 15).toISOString()});
    if (i % 14 === 0 || k === 0) { const fp = r1(P.f[0] + (P.f[1] - P.f[0]) * prog), mm = r1(P.m[0] + (P.m[1] - P.m[0]) * prog); body.push({date, weight: wt, bodyFatPct: fp, skeletalMuscle: mm, bodyFatMass: r1(wt * fp / 100), bmi: r1(wt / ((P.h / 100) ** 2)), measure: 'inbody', source: 'demo', createdAt: at(date, 8, 30).toISOString()}); }
    // 식사: 하루 목표 근처(±10%), 주말엔 조금 더
    const lib = M[P.diet], target = P.kcal * (1 + noise(i + seed, 3) * 0.2 + (dow === 6 || dow === 0 ? 0.08 : 0));
    const pick = (list, n) => list[(i * n + seed) % list.length];
    const late = (dow === 5 || dow === 6) && (i + seed) % 3 !== 0, sleep = Math.max(1, Math.min(5, Math.round(3.4 + noise(i + seed, 7) * 3.2))), poorSleep = sleep <= 2;
    checkins[date] = {sleep, energy: Math.max(1, Math.min(5, sleep + (noise(i, 9) > 0.2 ? 1 : 0))), soreness: null, pain: null, note: ''};
    const plan = [['아침', 8, pick(lib.b, 1)], ['점심', 12, pick(lib.l, 3)], ['저녁', late ? 21 : 19, P.delivery && (i + seed) % 7 < P.delivery ? pick(M.delivery.d, 5) : pick(lib.d, 5)]];
    if (P.bulk) plan.push(['간식', 16, pick(M.bulk.s, 2)], ['간식', 21, pick(M.bulk.s, 4)]); else if (lib.s && i % 2 === 0) plan.push(['간식', 16, pick(lib.s, 2)]);
    if (P.glp1) plan.splice(0, 1); // 아침을 거르는 날이 많음
    const sum = plan.reduce((a, [, , items]) => a + items.reduce((s, x) => s + x[3], 0), 0), scale = Math.max(0.55, Math.min(1.6, target / Math.max(1, sum)));
    if (poorSleep) plan.push(['간식', 15, [['과자', 1, '봉', 250, 30, 3, 13]]]); // 잠을 설친 날은 간식이 늘어나는 사람이 많음
    for (const [slot, h, items] of plan) addMeal(date, h, slot, items, Math.round(scale * 10) / 10);
    const salty = plan.some(([, , items]) => items.some(x => /치킨|피자|짜장|족발|떡볶이|찌개|국밥|탕/.test(x[0])));
    bump = (late ? 0.35 : 0) + (salty ? 0.3 : 0); // 늦은 저녁·짠 음식 다음 날 물 무게
    // 운동
    const kind = P.week[dow], wk = Math.floor(i / 7), t = at(date, kind === 'run' || kind === 'walk' ? 7 : 19);
    if (/^w[0-9]$/.test(kind || '')) { const r = W.weights[Number(kind.slice(1))]; workouts.push({date, title: r.title, loggedAtTime: `${String(t.getHours()).padStart(2, '0')}:00`, exercises: r.ex.map(([name, part, w0, step, reps]) => ({name, part, kind: 'strength', sets: [0, 1, 2, 3].map(s => ({weight: r1((P.sex === 'female' ? w0 * 0.6 : w0) + step * Math.min(wk, P.plateau ? 6 : 99) * (P.bulk ? 1.2 : 1) - (s === 3 ? step : 0)), unit: 'kg', reps: reps + (s === 3 ? 2 : 0), completed: true}))}))}); }
    else if (kind === 'light' || kind === 'home') { const r = W[kind][0]; workouts.push({date, title: r.title, loggedAtTime: '19:00', exercises: r.ex.map(([name, part, w0, step, reps]) => ({name, part, kind: 'strength', sets: [0, 1, 2].map(() => ({weight: r1(w0 + step * Math.floor(wk / 2)), unit: 'kg', reps, completed: true}))}))}); }
    else if (kind === 'run') workouts.push({date, title: '러닝', loggedAtTime: '07:00', exercises: [{name: '러닝', part: '유산소', kind: 'cardio', durationMin: 30 + (i % 3) * 10, distanceKm: r1(5 + (i % 3) * 1.6 + wk * 0.05), sets: []}]});
    else if (kind === 'walk') workouts.push({date, title: '걷기', loggedAtTime: '07:30', exercises: [{name: '걷기', part: '유산소', kind: 'cardio', durationMin: 40, distanceKm: 3.5, sets: []}]});
    else if (kind === 'pilates') workouts.push({date, title: '필라테스 리포머', loggedAtTime: '10:00', exercises: [{name: '필라테스 리포머', part: '필라테스', kind: 'cardio', durationMin: 50, sessionType: '그룹', sets: [], moves: [{name: '풋워크', apparatus: '리포머'}, {name: '헌드레드', apparatus: '리포머'}, {name: '엘리펀트', apparatus: '리포머'}]}]});
    else if (dow === 0 && k > 0) workouts.push({date, rest: true, title: '의도적 휴식', loggedAtTime: '09:00', exercises: []});
    // 수면·컨디션(가끔)
  }
  const start = ymd(new Date(base.getTime() - 84 * 86400000));
  const kcalGoal = P.kcal, pG = P.protein, fG = Math.round(kcalGoal * 0.27 / 9), cG = Math.round((kcalGoal - pG * 4 - fG * 9) / 4);
  const goalW = P.phase === 'diet' ? r1(P.w[0] - (P.w[0] - P.w[1]) * 1.3) : P.phase === 'bulk' || P.phase === 'leanbulk' ? r1(P.w[1] + 0.8) : P.w[0];
  const target = P.phase === 'diet' ? {loseKg: r1((P.w[0] - P.w[1]) * 1.3)} : P.phase === 'bulk' || P.phase === 'leanbulk' ? {gainKg: r1(P.w[1] - P.w[0] + 1), ...(P.phase === 'leanbulk' ? {fatCap: r1(P.f[0] + 1)} : {})} : P.phase === 'recomp' ? {fatPct: r1(P.f[1] - 1.5), muscleKg: 1.5} : {rangeKg: 1.5};
  const weeks = 16;
  const settings = {calorieGoal: kcalGoal, carbsGoal: cG, proteinGoal: pG, fatGoal: fG, goalWeight: goalW, demoPersona: P.id,
    nutritionProfile: {sex: P.sex, age: P.age, heightCm: P.h, weightKg: P.w[1], activity: 'moderate', goal: P.phase === 'diet' ? 'lose' : P.phase === 'bulk' || P.phase === 'leanbulk' ? 'gain' : 'maintain', diets: P.glp1 ? ['glp1'] : []},
    phase: {id: `ph-demo-${P.id}`, type: P.phase, start, weeks, end: ymd(new Date(new Date(`${start}T12:00:00`).getTime() + weeks * 7 * 86400000)), startWeight: r1(P.w[0] + (P.w[1] - P.w[0]) * (P.plateau ? Math.min(1, (N - 85) / (N * 0.6)) : (N - 85) / (N - 1))), startFatPct: r1(P.f[0] + (P.f[1] - P.f[0]) * 0.3), startMuscle: r1(P.m[0] + (P.m[1] - P.m[0]) * 0.3), target, perWeek: P.phase === 'diet' ? -r1(target.loseKg / weeks) : target.gainKg ? r1(target.gainKg / weeks) : 0, createdAt: new Date(`${start}T09:00:00`).toISOString()}};
  return {body, meals, workouts, settings, checkins};
}
export function personaCardsHTML({current = '', compact = false} = {}) {
  const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));
  return `<div class="persona-grid${compact ? ' compact' : ''}">${PERSONAS.map(p => `<button type="button" class="persona-card${current === p.id ? ' on' : ''}" data-persona="${p.id}" aria-pressed="${current === p.id}"><b>${esc(p.name)} <small>${p.sex === 'male' ? '남' : '여'} · ${p.age}세 · ${p.h}cm</small></b><span>${esc(p.line)}</span><span class="pc-num">체중 ${p.w[0]}kg에서 ${p.w[1]}kg · 체지방 ${p.f[0]}%에서 ${p.f[1]}%</span></button>`).join('')}</div>`;
}
