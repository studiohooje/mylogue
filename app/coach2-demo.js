// 코치로그 v2 시제품 샘플: PT 트레이너 '한도윤' / 필라테스 강사 '서하린'. 날짜·시각은 지금 기준으로 만든다.
import {ymd, addDays, cid, DEFAULT_RULE} from './coach2-data.js';

const pad = n => String(n).padStart(2, '0');
const t10 = d => `${pad(d.getHours())}:${pad(Math.floor(d.getMinutes() / 10) * 10)}`;
const rel = (now, min) => { const d = new Date(now.getTime() + min * 6e4); return {date: ymd(d), time: t10(d)}; };
const S = (now, min, o) => { const r = rel(now, min); return {id: cid('b'), type: 'class', status: 'planned', durationMin: 50, ...o, startAt: `${r.date}T${r.time}`}; };
const log = (n, reason, date, sessionId = '') => ({id: cid('l'), at: `${date}T12:00:00`, delta: n, reason, sessionId, by: 'coach'});
const days = (today, n, f) => Array.from({length: n}, (_, i) => f(addDays(today, -i), i)).filter(Boolean);

export function demoPT(now = new Date()) {
  const today = ymd(now);
  const places = [
    {id: 'pl1', name: '헬스플러스 안산', ledger: 'center', showLeft: false, directMsg: false, rule: {...DEFAULT_RULE}},
    {id: 'pl2', name: '도윤 PT 스튜디오', ledger: 'mine', showLeft: true, directMsg: true, rule: {...DEFAULT_RULE, cutoffH: 12}}
  ];
  const ex = (name, w, reps = 10, n = 3) => ({name, kind: 'strength', sets: Array.from({length: n}, () => ({weight: w, unit: 'kg', reps}))});
  const split = {
    '하체': w => [ex('레그 프레스', 100 + w * 5), ex('루마니안 데드리프트', 40 + w * 2.5), ex('레그 익스텐션', 35 + w * 2.5, 12), ex('힙 어브덕션', 40, 15)],
    '상체': w => [ex('체스트 프레스', 25 + w * 2.5), ex('숄더 프레스 머신', 20 + w * 2.5), ex('케이블 푸시다운', 15, 12)],
    '등': w => [ex('랫 풀다운', 40 + w * 2.5), ex('시티드 케이블 로우', 45 + w * 2.5), ex('케이블 컬', 12.5, 12)]
  };
  const sessions = [], clients = [];
  const mk = (c, plan) => { const ps = []; let logs = [];
    plan.forEach(([dd, title, w], i) => { const date = addDays(today, -dd), id = cid('s'); sessions.push({id, date, time: '19:00', title, placeId: c.placeId, format: '1:1', targets: [{clientId: c.id, status: 'attended', deducted: -1, passId: 'pa'}], exercises: split[title](w), nextFocus: i === plan.length - 1 ? c._focus || '' : '', v2: true, finishedAt: `${date}T20:00:00`}); logs.push(log(-1, '출석', date, id)); });
    return logs; };
  const c1 = {id: 'c1', name: '김지수', placeId: 'pl2', linked: true, stage: 'active', birthday: '1994-03-02', program: {split: ['하체', '상체', '등'], week: 3}, injuries: [{date: addDays(today, -40), text: '오른쪽 무릎 통증(회원 진술)'}], goal: '체지방 5kg 감량 · 3월 결혼식', _focus: '레그 프레스 무릎 안쪽으로 모이는지'};
  c1.passes = [{id: 'pa', name: 'PT 20회권', kind: 'count', format: '1:1', total: 20, start: addDays(today, -60), expiresAt: addDays(today, 60), price: 1400000, paidAt: addDays(today, -60), log: [...mk(c1, [[25, '하체', 0], [23, '상체', 0], [21, '등', 0], [18, '하체', 1], [16, '상체', 1], [14, '등', 1], [11, '하체', 2], [9, '상체', 2], [7, '등', 2], [4, '하체', 3], [2, '상체', 3]]), log(1, '서비스', addDays(today, -30)), log(-1, '노쇼', addDays(today, -12)), log(-1, '출석', addDays(today, -45))]}];
  c1.shared = {scope: {body: true, diet: true, workouts: true}, days: days(today, 14, (d, i) => ({date: d, weight: +(71.8 - i * -0.05 - (14 - i) * 0.04).toFixed(1), meals: i % 4 === 3 ? 0 : 3, kcal: i % 4 === 3 ? 0 : 1650 + (i % 3) * 120, protein: 95 + (i % 3) * 8, workout: i % 3 === 1 ? '혼자 운동 · 상체' : ''}))};
  c1.body = [{date: addDays(today, -56), weight: 73.4, muscle: 26.1, fat: 24.8}, {date: addDays(today, -28), weight: 72.2, muscle: 26.4, fat: 23.1}, {date: addDays(today, -1), weight: 71.2, muscle: 26.7, fat: 21.9}];
  const c2 = {id: 'c2', name: '박민호', placeId: 'pl1', linked: true, stage: 'active', birthday: `1990-${addDays(today, 3).slice(5)}`, program: {split: ['가슴', '등', '하체'], week: 6}, goal: '벤치 80kg'};
  split['가슴'] = w => [ex('벤치 프레스', 60 + w * 2.5, 8, 4), ex('인클라인 덤벨 프레스', 20 + w * 2), ex('케이블 플라이', 12.5, 12)];
  c2.passes = [{id: 'pa', name: 'PT 10회권', kind: 'count', format: '1:1', total: 10, start: addDays(today, -40), expiresAt: addDays(today, 12), price: 700000, log: [...Array.from({length: 4}, (_, i) => log(-1, '출석', addDays(today, -38 + i * 5))), ...mk(c2, [[13, '가슴', 2], [9, '등', 0], [5, '가슴', 3]].map(([a, t, w]) => [a, t === '등' ? '등' : t, w]))]}];
  c2.shared = {scope: {body: true, diet: false, workouts: true}, days: days(today, 10, (d, i) => i % 2 ? null : {date: d, weight: 82.4 - i * 0.05, workout: i % 4 === 0 ? '혼자 운동 · 가슴' : ''})};
  const c3 = {id: 'c3', name: '최유나', placeId: 'pl1', linked: false, stage: 'active', goal: '허리 통증 없이 등산', injuries: [{date: addDays(today, -300), text: '허리 디스크 이력(회원 진술)'}]};
  c3.passes = [{id: 'pa', name: 'PT 30회권', kind: 'count', format: '1:1', total: 30, start: addDays(today, -70), expiresAt: addDays(today, 110), price: 1950000, log: Array.from({length: 12}, (_, i) => log(-1, '출석', addDays(today, -68 + i * 5)))}];
  const c4 = {id: 'c4', name: '정우진', placeId: 'pl2', linked: true, stage: 'active', goal: '데드리프트 자세'};
  c4.passes = [{id: 'pa', name: 'PT 10회권', kind: 'count', format: '1:1', total: 10, start: addDays(today, -50), expiresAt: addDays(today, 40), price: 650000, log: mk(c4, [[30, '등', 1], [24, '하체', 1], [20, '등', 2], [16, '하체', 2]])}];
  c4.shared = {scope: {body: true, diet: true, workouts: true}, days: days(today, 6, (d, i) => i > 3 ? null : {date: d, weight: 78.0 + i * 0.1, meals: 2, kcal: 2100})};
  const c5 = {id: 'c5', name: '이서준', placeId: 'pl1', linked: false, stage: 'ot', goal: '체력', passes: []};
  const c6 = {id: 'c6', name: '한소희', placeId: 'pl1', linked: false, stage: 'consult', stageNote: '가격 고민 · 다음 주 다시', goal: '다이어트', passes: []};
  clients.push(c1, c2, c3, c4, c5, c6);
  sessions.push({id: cid('s'), date: addDays(today, -1), time: '18:00', title: 'OT', placeId: 'pl1', format: '1:1', targets: [{clientId: 'c5', status: 'attended', deducted: 0}], exercises: [ex('레그 프레스', 60)], v2: true, finishedAt: `${addDays(today, -1)}T19:00:00`});
  const schedules = [
    S(now, -100, {clientIds: ['c2'], title: '가슴', placeId: 'pl1', reply: {state: 'yes', at: new Date().toISOString()}}),
    S(now, 60, {clientIds: ['c1'], title: '하체', placeId: 'pl2', reply: {state: 'yes', at: new Date().toISOString()}, repeat: {days: [3, 5]}}),
    S(now, 180, {clientIds: ['c3'], title: '등', placeId: 'pl1', reply: {state: 'change', wish: '내일 저녁 7시로', at: new Date().toISOString()}}),
    S(now, -2 * 1440 - 60, {clientIds: ['c3'], title: '하체', placeId: 'pl1'}),
    S(now, 1440 + 30, {clientIds: ['c4'], title: '하체', placeId: 'pl2'}),
    S(now, 2 * 1440, {clientIds: ['c1'], title: '상체', placeId: 'pl2', repeat: {days: [3, 5]}}),
    S(now, 1440 - 120, {type: 'block', clientIds: [], title: '센터 회의', placeId: 'pl1', durationMin: 60}),
    S(now, 3 * 1440, {type: 'ot', clientIds: ['c6'], title: '체험 수업', placeId: 'pl1'})
  ];
  return {clients, sessions, schedules, templates: [], prefs: {role: 'pt', coachName: '한도윤', persona: 'pt', places, quickNotes: ['자세 좋아요', '다음엔 +2.5kg', '무릎 각도 좋았어요', '호흡 잊지 않기', '오늘 강도 딱 좋았어요']}};
}

export function demoPilates(now = new Date()) {
  const today = ymd(now);
  const places = [
    {id: 'pa1', name: '하루 필라테스', ledger: 'center', showLeft: false, directMsg: false, rule: {...DEFAULT_RULE, duetAbsent: 'duet'}, apparatus: {brand: '밸런스드 바디'}},
    {id: 'pa2', name: '모먼트 필라테스', ledger: 'center', showLeft: true, directMsg: true, rule: {...DEFAULT_RULE, cutoffH: 12, duetAbsent: 'private'}, apparatus: {brand: '그라츠'}}
  ];
  const mv = (name, springs, apparatus = '리포머') => ({name, apparatus, springs, on: true, obs: ''});
  const seqA = [mv('풋워크', [{id: 'r', n: 2}, {id: 'b', n: 1}]), mv('헌드레드', [{id: 'r', n: 1}, {id: 'b', n: 1}]), mv('코디네이션', [{id: 'r', n: 1}]), mv('숏스파인 마사지', [{id: 'r', n: 2}]), mv('롱스트레치', [{id: 'r', n: 1}, {id: 'b', n: 1}]), mv('엘리펀트', [{id: 'r', n: 1}, {id: 'b', n: 1}]), mv('쇼트박스', [{id: 'b', n: 1}]), mv('머메이드', [{id: 'b', n: 1}])];
  const seqB = [mv('풋워크', [{id: 's', n: 3}]), mv('헌드레드', [{id: 's', n: 2}]), mv('브릿지', [{id: 's', n: 2}]), mv('니스트레치', [{id: 's', n: 2}]), mv('러닝', [{id: 's', n: 3}]), mv('머메이드', [{id: 's', n: 1}])];
  const sessions = [];
  const pass = (name, format, total, used, extra = {}) => ({id: cid('p'), name, kind: 'count', format, total, start: addDays(today, -60), expiresAt: addDays(today, 50), log: Array.from({length: used}, (_, i) => log(-1, '출석', addDays(today, -58 + i * 4))), ...extra});
  const k1 = {id: 'k1', name: '윤서아', placeId: 'pa1', linked: true, stage: 'active', level: '중급', setup: {footbar: '2단', headrest: '올림', stopper: '2'}, injuries: [{date: addDays(today, -20), text: '허리 아래쪽 불편(회원 진술)'}], goal: '허리 편하게 · 롤업 혼자 하기', passes: [pass('개인 20회권', '1:1', 20, 0)]};
  const k2 = {id: 'k2', name: '장미래', placeId: 'pa2', linked: true, stage: 'active', level: '입문 2', setup: {footbar: '3단', headrest: '평평'}, goal: '어깨 결림', passes: [pass('듀엣 10회권', '듀엣', 10, 3)]};
  const k3 = {id: 'k3', name: '오수빈', placeId: 'pa2', linked: false, stage: 'active', level: '입문 2', goal: '자세', passes: [pass('듀엣 10회권', '듀엣', 10, 3), pass('개인 5회권', '1:1', 5, 1)]};
  const k4 = {id: 'k4', name: '문하은', placeId: 'pa1', linked: true, stage: 'active', level: '입문 1', birthday: `1996-${addDays(today, 2).slice(5)}`, goal: '산후 회복', injuries: [{date: addDays(today, -60), text: '출산 6개월(회원 진술)'}], passes: [pass('개인 10회권', '1:1', 10, 8)]};
  const gNames = ['배유리', '신지아', '홍다인', '김나래', '류하나', '조은솔'];
  const g = gNames.map((name, i) => ({id: `g${i + 1}`, name, placeId: 'pa1', linked: i < 2, stage: 'active', level: '입문 2', passes: [pass('그룹 20회권', '그룹', 20, 4 + i)]}));
  // 윤서아 지난 개인 레슨들
  k1.passes[0].log = [];
  [26, 19, 12, 5].forEach((dd, i) => { const date = addDays(today, -dd), id = cid('s'); sessions.push({id, date, time: '10:00', title: '리포머 개인', placeId: 'pa1', format: '1:1', targets: [{clientId: 'k1', status: 'attended', deducted: -1, passId: 'pa'}], moves: seqA.map(m => ({...m})), condition: {k1: {pain: i === 3 ? ['허리'] : [], feel: '보통'}}, memo: '골반 중립 큐잉 반응 좋음', nextFocus: i === 3 ? '롤업 준비: 쇼트박스 라운드백 길게' : '', v2: true, finishedAt: `${date}T11:00:00`}); k1.passes[0].log.push(log(-1, '출석', date, id)); });
  for (let i = 0; i < 9; i++) k1.passes[0].log.push(log(-1, '출석', addDays(today, -59 + i * 3)));
  // 듀엣 지난 수업(모먼트, 그라츠)
  const dId = cid('s'); sessions.push({id: dId, date: addDays(today, -4), time: '19:00', title: '리포머 듀엣', placeId: 'pa2', format: '듀엣', targets: [{clientId: 'k2', status: 'attended', deducted: -1, passId: 'pa'}, {clientId: 'k3', status: 'attended', deducted: -1, passId: 'pa'}], moves: seqB.map(m => ({...m})), exceptions: {k3: '러닝 스프링 2로'}, nextFocus: '장미래 어깨 내리기', v2: true, finishedAt: `${addDays(today, -4)}T20:00:00`});
  k1.shared = {scope: {body: true, diet: false, workouts: true}, days: days(today, 10, (d, i) => i % 2 ? null : {date: d, weight: 56.2 + i * 0.03, workout: i === 2 ? '혼자 운동 · 매트 20분' : ''})};
  k1.quotes = [{date: addDays(today, -26), text: '아침에 허리가 뻣뻣해요'}, {date: addDays(today, -5), text: '요즘 아침에 덜 뻣뻣해요'}];
  const clients = [k1, k2, k3, k4, ...g];
  const schedules = [
    S(now, -90, {clientIds: g.map(x => x.id), title: '리포머 그룹', placeId: 'pa1', format: '그룹', capacity: 6, waitlist: 2}),
    S(now, 60, {clientIds: ['k1'], title: '리포머 개인', placeId: 'pa1', format: '1:1', reply: {state: 'yes', at: new Date().toISOString()}, repeat: {days: [2, 5]}}),
    S(now, 200, {clientIds: ['k2', 'k3'], title: '리포머 듀엣', placeId: 'pa2', format: '듀엣', reply: {state: 'yes', at: new Date().toISOString()}}),
    S(now, -2 * 1440, {clientIds: ['k4'], title: '리포머 개인', placeId: 'pa1', format: '1:1'}),
    S(now, 1440 + 60, {clientIds: ['k4'], title: '리포머 개인', placeId: 'pa1', format: '1:1'}),
    S(now, 1440 + 180, {clientIds: g.map(x => x.id), title: '리포머 그룹', placeId: 'pa1', format: '그룹', capacity: 6, waitlist: 1}),
    S(now, 2 * 1440 + 30, {type: 'block', clientIds: [], title: '쉬는 날', placeId: '', durationMin: 600})
  ];
  const templates = [
    {id: 't1', title: '입문 1 · 리포머', moves: seqA.slice(0, 5).map(m => ({...m}))},
    {id: 't2', title: '중급 · 리포머', moves: seqA.map(m => ({...m}))},
    {id: 't3', title: '허리 편하게', moves: [mv('풋워크', [{id: 'r', n: 2}]), mv('브릿지', [{id: 'r', n: 1}]), mv('머메이드', [{id: 'b', n: 1}])]}
  ];
  return {clients, sessions, schedules, templates, prefs: {role: 'pilates', coachName: '서하린', persona: 'pilates', places, quickNotes: ['호흡이 좋아졌어요', '골반 중립 잘 지켰어요', '어깨 힘 빼기', '오늘 집중 최고']}};
}
