// 4.17.0 안드로이드 홈 위젯에 오늘 한 줄을 보낸다. 점수·평가 없이 '한 것'만 적는다.
// 웹(브라우저)에서는 아무 일도 하지 않는다.
const fmt = n => Math.round(n).toLocaleString('ko-KR');
export function widgetSummary(db, today) {
  const meals = (db.meals || []).filter(m => m.date === today && !m.planned);
  const kcal = meals.reduce((a, m) => a + (Number(m.calories) || 0), 0);
  const goal = Number(db.settings?.calorieGoal) || 0;
  const wos = (db.workouts || []).filter(w => w.date === today && !w.planned);
  const rest = wos.some(w => w.rest), moved = wos.some(w => !w.rest);
  const body = [...(db.body || [])].filter(b => b.weight != null).sort((a, b) => String(b.date).localeCompare(String(a.date)))[0];
  const [, m, d] = today.split('-').map(Number);
  const parts = [];
  parts.push(meals.length ? `식사 ${fmt(kcal)}${goal ? ` / ${fmt(goal)}` : ''}kcal` : '아직 식사 기록 전');
  if (moved) { const n = wos.filter(w => !w.rest).reduce((a, w) => a + (w.exercises?.length || 1), 0); parts.push(`운동 ${n}종목 했어요`); }
  else if (rest) parts.push('오늘은 쉬는 날');
  if (body) parts.push(`체중 ${Number(body.weight).toFixed(1)}kg${body.date === today ? '' : `(${Number(body.date.slice(5, 7))}/${Number(body.date.slice(8, 10))})`}`);
  return {title: `${m}월 ${d}일 · 마이로그`, line: parts.join(' · ')};
}
let last = '';
export function syncWidget(db, today) {
  const C = globalThis.Capacitor;
  if (C?.getPlatform?.() !== 'android' || !C.isPluginAvailable?.('MylogueWidget')) return false;
  const s = widgetSummary(db, today), key = s.title + s.line;
  if (key === last) return false;
  last = key;
  try { C.Plugins.MylogueWidget.update(s).catch(() => {}); } catch {}
  return true;
}
