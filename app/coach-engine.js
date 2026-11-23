// 4.17.0 코칭 규칙 엔진 — 기록을 읽고 '알아챌 신호'를 고른다. 숫자 계산은 코드가, 문장은 정해진 틀(나중에 AI가 다듬음).
// 원칙: 안전 신호가 있으면 감량·칭찬 신호보다 먼저, 꾸짖지 않음, 재촉 없음, 의료 판단 없음, 확실하지 않으면 말하지 않음.
// 결과: [{id, level:'safety'|'info'|'praise', text, why, source}] — 케이스 정답지(tests/coach-golden.test.js)로 늘 시험한다.
import {knowledge, hasBanned} from './coach-knowledge.js';

const DAY = 86400000;
const toD = s => new Date(`${s}T12:00:00`);
const ymd = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const addDays = (s, n) => ymd(new Date(toD(s).getTime() + n * DAY));
const avg = a => a.length ? a.reduce((x, y) => x + y, 0) / a.length : null;
const r1 = v => Math.round(v * 10) / 10;

// 사용자 상태(프로필·주의 항목)
export function profileOf(db) {
  const p = db.settings?.nutritionProfile || {}, prefs = db.settings?.prefs || {};
  const cautions = new Set(Array.isArray(p.cautions) ? p.cautions : []);
  return {sex: p.sex || 'none', age: Number(p.age) || null, goal: p.goal || 'maintain', glp1: !!prefs.glp1, cautions};
}
// 날짜별 합계
export function dailyIntake(db, from, to) {
  const out = {};
  for (const m of db.meals || []) { if (m.planned || m.date < from || m.date > to) continue; const d = out[m.date] ||= {kcal: 0, protein: 0, sodium: 0, n: 0}; d.kcal += Number(m.calories) || 0; d.protein += Number(m.protein) || 0; d.sodium += Number(m.sodium) || 0; d.n++; }
  return out;
}
export function weights(db, from, to) {
  return (db.body || []).filter(b => b.weight != null && b.date >= from && b.date <= to).sort((a, b) => String(a.date).localeCompare(String(b.date))).map(b => ({date: b.date, w: Number(b.weight)}));
}
const weekAvg = (ws, end) => avg(ws.filter(x => x.date > addDays(end, -7) && x.date <= end).map(x => x.w));

export function analyze(db, today) {
  const pr = profileOf(db), out = [];
  const add = (id, level, text, kid) => { const k = kid ? knowledge(kid) : null; out.push({id, level, text, why: k?.rule || '', source: k?.source || ''}); };
  const intake = dailyIntake(db, addDays(today, -13), addDays(today, -1));
  const loggedDays = Object.entries(intake).filter(([, d]) => d.n >= 2); // 하루 2끼 이상 적은 날만 판단(빠뜨린 날을 저섭취로 오해하지 않게)
  const ws = weights(db, addDays(today, -42), today);
  const lastW = ws.at(-1)?.w || null;
  const teen = pr.age != null && pr.age <= 18, pregnant = pr.cautions.has('pregnant') || pr.cautions.has('breastfeeding');

  // ── 안전 ──
  if (teen) add('safety.teen', 'safety', '성장기에는 체중을 줄이기보다 골고루 먹고 즐겁게 움직이는 게 먼저예요. 체중 목표는 보호자·의료진과 함께 정해 주세요.', 'teen');
  if (pregnant) add('safety.pregnancy', 'safety', '임신·수유 중에는 감량보다 충분히 먹는 게 중요해요. 체중 변화는 담당 의료진과 이야기해 주세요.', 'pregnancy');
  if (pr.cautions.has('diabetes-med')) add('safety.diabetes-med', 'safety', '혈당약을 드신다면 식사량이나 운동을 크게 바꾸기 전에 의료진과 먼저 상의해 주세요.', 'diabetes-med');
  const low = knowledge('low-intake').value, lowLine = (pr.sex === 'male' ? low.male : low.female) * low.ratio;
  const lowDays = loggedDays.filter(([, d]) => d.kcal > 0 && d.kcal < lowLine).length;
  const lastWeekLow = loggedDays.filter(([date, d]) => date > addDays(today, -8) && d.kcal > 0 && d.kcal < lowLine).length;
  const binge = loggedDays.some(([, d]) => d.kcal > (pr.sex === 'male' ? 3800 : 3200));
  if (lastWeekLow >= low.days && binge) add('safety.ed-pattern', 'safety', '아주 적게 먹는 날과 많이 먹는 날이 번갈아 나타나고 있어요. 몸과 마음이 지치기 쉬운 흐름이에요. 숫자를 잠시 가리고, 힘들면 전문가와 이야기해 보세요(정신건강 위기상담 109).', 'ed-signals');
  else if (lastWeekLow >= low.days) add('safety.low-intake', 'safety', `최근 일주일 중 ${lastWeekLow}일은 섭취가 꽤 적었어요. 너무 적게 먹으면 오히려 지치고 반동이 오기 쉬워요. 끼니를 조금 더 챙겨 보세요.`, 'low-intake');
  // 감량 속도: 최근 7일 평균 vs 14일 전 7일 평균
  const nowAvg = weekAvg(ws, today), prevAvg = weekAvg(ws, addDays(today, -14));
  if (nowAvg && prevAvg && ws.filter(x => x.date > addDays(today, -7)).length >= 3 && ws.filter(x => x.date > addDays(today, -21) && x.date <= addDays(today, -14)).length >= 3) {
    const weeklyPct = (prevAvg - nowAvg) / prevAvg * 100 / 2;
    if (weeklyPct > knowledge('loss-rate').value.maxWeeklyPct) add('safety.loss-too-fast', 'safety', `2주 동안 주에 약 ${r1(weeklyPct)}%씩 빠지고 있어요. 이보다 천천히(주 0.5~1%) 빼야 근육을 지키고 다시 찌지 않아요.`, 'loss-rate');
  }
  const safety = out.some(x => x.level === 'safety');

  // ── 정보(안전 신호가 있으면 감량 관련 정보는 내지 않는다) ──
  const protLoggedDays = loggedDays.filter(([date]) => date > addDays(today, -8));
  if (!safety && !pr.cautions.has('kidney') && lastW && protLoggedDays.length >= 4) {
    const pPerKg = avg(protLoggedDays.map(([, d]) => d.protein)) / lastW, need = knowledge('protein-cut').value.perKg[0];
    if (pr.glp1 && pPerKg < need) add('info.glp1-protein', 'info', `요즘 단백질이 체중 1kg당 ${r1(pPerKg)}g 정도예요. 약을 쓰는 동안에는 단백질을 먼저 드시면 근육을 지키는 데 도움이 돼요.`, 'protein-glp1');
    else if (pr.goal === 'lose' && pPerKg < need) add('info.protein-low', 'info', `감량 중에는 단백질을 체중 1kg당 1.2g 넘게 먹으면 근육을 지키기 쉬워요. 요즘은 ${r1(pPerKg)}g 정도예요.`, 'protein-cut');
  }
  // 하루 체중 출렁임: 오늘 체중이 7일 평균보다 1kg 넘게 높고, 어제 나트륨이 많았거나 생리 전후로 표시됐으면 설명
  const todayW = ws.find(x => x.date === today)?.w, avg7 = avg(ws.filter(x => x.date < today && x.date >= addDays(today, -7)).map(x => x.w));
  if (todayW && avg7 && todayW - avg7 >= 1) {
    const y = intake[addDays(today, -1)], reasons = [];
    if (y?.sodium >= 3000) reasons.push('어제 짠 음식');
    if (y?.kcal >= 2800) reasons.push('어제 많이 먹은 식사');
    if ((db.checkins || []).some(c => c.date === today && c.cycle)) reasons.push('생리 전후');
    add('info.water-swing', 'info', `오늘 체중이 평소보다 ${r1(todayW - avg7)}kg 높아요.${reasons.length ? ` ${reasons.join('·')} 때문일 수 있어요.` : ''} 하루 차이는 대부분 수분이에요. 일주일 평균을 봐 주세요.`, 'water-swing');
  }
  // 정체기: 3주 넘게 주간 평균 변화가 거의 없고 감량 목표
  if (!safety && pr.goal === 'lose') {
    const a = weekAvg(ws, today), b = weekAvg(ws, addDays(today, -21));
    if (a && b && ws.length >= 12 && Math.abs((b - a) / b * 100) / 3 < knowledge('plateau').value.flatPctPerWeek) add('info.plateau', 'info', '3주째 체중이 비슷해요. 더 굶기보다 빠뜨린 간식·음료가 없는지, 잠과 활동량은 어떤지 먼저 살펴봐요.', 'plateau');
  }
  // 큰 식사 다음 날 안심(회식·명절)
  const y = intake[addDays(today, -1)];
  // 4.17.0 목표 칼로리의 115%(증량 페이즈는 125%) 안이면 '푸짐하게' 말을 하지 않는다(가상 인물 점검에서 발견: 벌크업 3,100kcal 목표에 3,244kcal)
  const gainPhase = ['bulk', 'leanbulk'].includes(db.settings?.phase?.type) || db.settings?.nutritionProfile?.goal === 'gain', kcalGoal = Number(db.settings?.calorieGoal) || 0;
  if (y && y.kcal >= Math.max(3000, kcalGoal * 1.15) && !(gainPhase && kcalGoal && y.kcal <= kcalGoal * 1.25) && !out.some(x => x.id === 'safety.ed-pattern')) add('info.after-feast', 'info', '어제 푸짐하게 드셨네요. 오늘은 평소대로 드시면 돼요. 끼니를 거르며 메우지 않아도 괜찮아요.', 'water-swing');

  // ── 칭찬(운동한 사실, 기록한 사실). 안전 신호가 있어도 '움직였다'는 칭찬은 한다 ──
  const moved = new Set((db.workouts || []).filter(w => !w.planned && !w.rest && w.date > addDays(today, -7)).map(w => w.date)).size;
  if (moved >= 1) add('praise.moved', 'praise', `이번 주 ${moved}일 움직였어요. 잘하고 있어요.`, 'activity-min');
  return out.filter(x => !hasBanned(x.text).length);
}
export const ids = list => list.map(x => x.id);
