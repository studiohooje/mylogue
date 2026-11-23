// 4.17.0 홈 한마디 다시 만들기(대표님: "너무 미미한 존재감"). 홈 맨 위 큰 글씨 자리에, 내 기록에서 나온 한마디를 둔다.
// 우선순위: 페이즈 제안 > 이어지는 흐름(연속 운동·기록) > 어제 일(짠 식사·늦은 저녁 → 오늘 아침 체중 설명) > 오늘 할 일(시간대) > 일반 문장.
// 원칙: 칭찬과 설명, 재촉·꾸짖음·끊김 말 없음. 같은 말이 연달아 나오지 않게 날마다 돌린다.
import {phaseStatus, phaseAdvice, progressLine} from './phase.js';
import {todayLine} from './motivation.js';

const DAY = 86400000;
const toD = s => new Date(String(s).slice(0, 10) + 'T12:00:00');
const ymd = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const addDays = (s, n) => ymd(new Date(toD(s).getTime() + n * DAY));
const r1 = n => Math.round(n * 10) / 10;
const pick = (list, seed) => list[Math.abs(seed) % list.length];
const seedOf = s => [...String(s)].reduce((a, c) => a * 31 + c.charCodeAt(0) | 0, 7);

function streak(dates, today) {
  let n = 0, d = dates.has(today) ? today : addDays(today, -1);
  while (dates.has(d)) { n++; d = addDays(d, -1); }
  return n;
}
export function voiceCandidates(db, today, now = new Date()) {
  const out = [], add = (kind, title, sub = '', action = null, weight = 1) => out.push({kind, title, sub, action, weight});
  const ph = phaseStatus(db, today), adv = ph ? phaseAdvice(db, today) : [];
  if (ph && adv.length) add('phase', adv[0].text.split(/(?<=[.요])\s/)[0], adv[0].text.split(/(?<=[.요])\s/).slice(1).join(' ') || progressLine(ph), {modal: 'phase', label: '페이즈 보기'}, 5);
  const wDates = new Set((db.workouts || []).filter(w => !w.planned && !w.rest).map(w => w.date));
  const ws = streak(wDates, today);
  if (ws >= 2) add('streak', pick([`운동 ${ws}일째 이어지고 있어요.`, `${ws}일 연속으로 움직였어요.`], seedOf(today)), ws >= 4 ? '몸이 무거우면 오늘은 가볍게 쉬어 가도 흐름은 그대로예요.' : '오늘도 하면 좋고, 쉬어도 괜찮아요.', null, 4);
  const recDates = new Set([...(db.meals || []).filter(m => !m.planned).map(m => m.date), ...(db.body || []).map(b => b.date), ...wDates]);
  const rs = streak(recDates, today);
  if (rs >= 3) add('record', `${rs}일째 기록을 남기고 있어요.`, rs >= 7 ? '한 주가 넘었어요. 이제 내 평균이 보이기 시작해요.' : '짧게라도 이어지면 흐름이 보여요.', null, 3);
  // 어제 일 → 오늘 아침 체중 설명
  const y = addDays(today, -1), ym = (db.meals || []).filter(m => m.date === y && !m.planned);
  const sodium = ym.reduce((s, m) => s + (Number(m.sodium) || 0), 0), late = ym.some(m => { const t = m.loggedAt ? new Date(m.loggedAt) : null; return t && !Number.isNaN(t.getTime()) && ymd(t) === y && t.getHours() >= 21; });
  const bw = id => (db.body || []).find(b => b.date === id && Number(b.weight) > 0);
  const wt = bw(today), wy = bw(y);
  if (wt && wy && wt.weight - wy.weight >= 0.4 && (sodium >= 3000 || late)) add('water', `어제보다 ${r1(wt.weight - wy.weight)}kg 늘었지만 물 무게일 가능성이 커요.`, sodium >= 3000 ? `어제 나트륨이 ${Math.round(sodium).toLocaleString('ko-KR')}mg이었어요. 보통 2~3일이면 돌아와요.` : '어제 늦게 먹은 음식 무게가 아직 남아 있을 수 있어요.', null, 5);
  else if (!wt && sodium >= 3000 && now.getHours() < 12) add('water', '오늘 아침 체중은 조금 높게 나와도 괜찮아요.', `어제 나트륨이 ${Math.round(sodium).toLocaleString('ko-KR')}mg이라 물이 잠깐 머물 수 있어요.`, {modal: 'body', label: '체중 남기기'}, 3);
  // 7일 평균 흐름
  const avg = (end) => { const w = (db.body || []).filter(b => Number(b.weight) > 0 && b.date <= end && (toD(end) - toD(b.date)) / DAY < 7).map(b => Number(b.weight)); return w.length >= 3 ? w.reduce((s, x) => s + x, 0) / w.length : null; };
  const a1 = avg(today), a0 = avg(addDays(today, -7));
  if (a1 != null && a0 != null && Math.abs(a1 - a0) >= 0.3) {
    const goalUp = ph && ['leanbulk', 'bulk'].includes(ph.type.id), good = goalUp ? a1 > a0 : a1 < a0;
    if (good) add('trend', `한 주 평균 체중이 ${r1(Math.abs(a1 - a0))}kg ${a1 < a0 ? '내려왔어요' : '올라왔어요'}.`, '하루하루보다 이 흐름이 진짜예요.', null, 3);
  }
  // 오늘 할 일(시간대)
  const todayMeals = (db.meals || []).filter(m => m.date === today && !m.planned).length, h = now.getHours();
  if (!todayMeals && !wt && h >= 5 && h < 11) add('morning', '좋은 아침이에요. 체중 한 번이면 오늘 기록은 시작이에요.', '재고 나서 숫자는 흘려 봐도 돼요. 흐름은 앱이 볼게요.', {modal: 'body', label: '체중 남기기'}, 2);
  if (!todayMeals && h >= 19) add('evening', '오늘 먹은 것 중 기억나는 것만 남겨 볼까요?', '다 채우지 않아도 흐름은 이어져요.', {modal: 'batch', label: '식사 남기기'}, 2);
  // 일반 문장(항상 후보)
  const l = todayLine(now); add('general', l.text, ph ? `${ph.type.name} 페이즈 ${ph.over ? '마무리' : `${ph.week}주차`}` : '', null, 1);
  return out;
}
// 하루 동안은 같은 한마디(새로고침마다 바뀌지 않게), 날마다 가중치 순서 안에서 돌린다.
export function homeVoice(db, today, now = new Date()) {
  const c = voiceCandidates(db, today, now);
  const top = Math.max(...c.map(x => x.weight)), best = c.filter(x => x.weight >= top - 1);
  return pick(best.length ? best : c, seedOf(today + best.length));
}
const esc = v => String(v ?? '').replace(/[&<>"']/g, ch => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[ch]));
export function voiceHTML(v, badgeHTML = '') {
  if (!v) return '';
  return `<div class="home-voice v-${esc(v.kind)}">${badgeHTML}<p class="hv-title">${esc(v.title)}</p>${v.sub ? `<p class="hv-sub">${esc(v.sub)}</p>` : ''}${v.action ? `<button type="button" class="button small hv-act" data-modal="${esc(v.action.modal)}">${esc(v.action.label)}</button>` : ''}</div>`;
}
