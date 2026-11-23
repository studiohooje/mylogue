import test from 'node:test';
import assert from 'node:assert/strict';
import {dailyOf, discoveries, journey, journeyHTML, strengthOf} from '../discovery.js';

// 4.17.0 나에 대한 발견·열리는 분석: 패턴이 있으면 표본 수와 함께, 없으면 보여 주지 않는다.
const DAY = 86400000, ymd = t => { const d = new Date(t); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
const START = new Date('2026-08-01T12:00:00').getTime();
const at = (date, h) => new Date(`${date}T${String(h).padStart(2, '0')}:30:00`).toISOString();
// days일치 가상 기록. opt로 패턴을 심는다(난수 대신 정해진 흔들림)
function make(days, {weekendExtra = 0, lateGain = 0, noise = true} = {}) {
  const db = {meals: [], workouts: [], body: [], checkins: {}};
  let w = 72;
  for (let i = 0; i < days; i++) {
    const date = ymd(START + i * DAY), dow = new Date(START + i * DAY).getDay(), wiggle = noise ? ((i * 37) % 7 - 3) * 25 : 0;
    const late = i % 3 === 0, kcal = 1800 + wiggle + ([0, 6].includes(dow) ? weekendExtra : 0);
    db.meals.push({date, name: '아침', calories: 400, protein: 25, loggedAt: at(date, 8)}, {date, name: '점심', calories: 700, protein: 35, loggedAt: at(date, 12)}, {date, name: '저녁', calories: kcal - 1100, protein: 30, loggedAt: at(date, late ? 22 : 19)});
    if ([2, 4].includes(dow)) db.workouts.push({date, exercises: [{name: '스쿼트'}]});
    w += -0.03 + (noise ? (((i * 13) % 5) - 2) * 0.05 : 0) + (i > 0 && (i - 1) % 3 === 0 ? lateGain : 0) - (i > 1 && (i - 2) % 3 === 0 ? lateGain : 0);
    db.body.push({date, weight: Math.round(w * 10) / 10});
  }
  return {db, today: ymd(START + (days - 1) * DAY)};
}

test('하루 묶음: 계획 기록 제외, 늦은 식사·첫 끼 시각', () => {
  const {db, today} = make(3);
  db.meals.push({date: today, name: '계획', calories: 999, planned: true});
  const d = dailyOf(db, today);
  assert.equal(d.length, 3); assert.equal(d[0].late, true); assert.equal(d[1].late, false);
  assert.equal(d[0].kcal, 1800 + ((0 * 37) % 7 - 3) * 25); assert.equal(Math.floor(d[0].firstMeal), 8); assert.equal(d[0].complete, true);
});
test('심은 패턴은 찾고, 패턴이 없으면 조용히', () => {
  const plain = make(60, {noise: true});
  assert.deepEqual(discoveries(plain.db, plain.today).filter(x => x.id === 'weekend-kcal'), []);
  const p = make(60, {weekendExtra: 450, lateGain: 0.5});
  const found = discoveries(p.db, p.today), ids = found.map(x => x.id);
  assert.ok(ids.includes('weekend-kcal'), ids.join()); assert.ok(ids.includes('late-meal'), ids.join()); assert.ok(ids.includes('workout-weekday'));
  const we = found.find(x => x.id === 'weekend-kcal'); assert.match(we.text, /주말에는 평일보다 하루 평균 [34]\d\dkcal 더/); assert.match(we.basis, /주말 \d+일 · 평일 \d+일/);
  assert.match(found.find(x => x.id === 'workout-weekday').text, /화·목요일|목·화요일/);
  for (const f of found) assert.ok(['strong', 'weak'].includes(f.strength));
});
test('표본이 적으면 발견을 만들지 않는다', () => { const p = make(10, {weekendExtra: 800}); assert.equal(discoveries(p.db, p.today).filter(x => x.id === 'weekend-kcal').length, 0); });
test('열리는 분석: 7·30·90일, 남은 날 표시, 범위', () => {
  const a = make(5); let j = journey(a.db, a.today); assert.deepEqual(j.open, []); assert.equal(j.next.left, 2); assert.equal(j.avg, undefined);
  assert.match(journeyHTML(j, []), /2일 더 기록하면 '나의 평균 하루'가 열려요/);
  const b = make(35); j = journey(b.db, b.today); assert.deepEqual(j.open, [7, 30]); assert.ok(j.avg.kcal > 1700 && j.avg.kcal < 1900); assert.ok(j.trend.perWeek < 0); assert.equal(j.range, undefined);
  assert.match(journeyHTML(j, []), /'나의 요일과 앞으로의 범위'가 열려요/);
  const c = make(95, {weekendExtra: 300}); j = journey(c.db, c.today); assert.deepEqual(j.open, [7, 30, 90]); assert.ok(j.range.low < j.range.high); assert.ok(['토', '일'].includes(j.weekday.high));
  assert.equal(j.next, null);
});
test('무료는 발견 개수 제한 + 잠금 한 줄, 글자는 이스케이프', () => {
  const p = make(60, {weekendExtra: 450, lateGain: 0.5}), j = journey(p.db, p.today), f = discoveries(p.db, p.today);
  const html = journeyHTML(j, [{id: 'x', strength: 'weak', title: '<b>', text: 't', basis: 'b'}, ...f], {limit: 1, esc: s => String(s).replace(/</g, '&lt;'), lockLine: '<p class="plus-lock">잠금</p>'});
  assert.equal((html.match(/class="jr-card"/g) || []).length, 1); assert.match(html, /잠금/); assert.doesNotMatch(html, /<strong><b>/);
});
test('차이 강도', () => { assert.equal(strengthOf([10, 11, 10, 11, 10], [20, 21, 20, 21, 20]), 'strong'); assert.equal(strengthOf([10, 30, 10, 30], [15, 25, 20, 20]), null); });
test('2차 발견: 아침 거른 날·운동 다음 날 체중·단백질과 포만감', () => {
  const db = {meals: [], body: [], workouts: [], checkins: {}};
  const START2 = new Date('2026-08-01T12:00:00').getTime(); let w = 70;
  for (let i = 0; i < 60; i++) {
    const date = ymd(START2 + i * DAY), skip = i % 3 === 0, hiP = i % 3 === 1, gym = i % 2 === 0;
    if (!skip) db.meals.push({date, name: '아침', calories: 400, protein: hiP ? 40 : 10, loggedAt: at(date, 8)});
    db.meals.push({date, name: '점심', calories: skip ? 1100 : 700, protein: hiP ? 50 : 20, loggedAt: at(date, 12)}, {date, name: '저녁', calories: hiP ? 500 : skip ? 1100 : 800, protein: hiP ? 50 : 20, loggedAt: at(date, 19)});
    if (gym) db.workouts.push({date, exercises: [{name: '스쿼트'}]});
    db.body.push({date, weight: Math.round((w + (i > 0 && (i - 1) % 2 === 0 ? 0.4 : 0)) * 10) / 10});
  }
  const ids = discoveries(db, ymd(START2 + 59 * DAY)).map(x => x.id);
  assert.ok(ids.includes('skip-breakfast'), ids.join()); assert.ok(ids.includes('after-workout-weight'), ids.join()); assert.ok(ids.includes('protein-full'), ids.join());
});
