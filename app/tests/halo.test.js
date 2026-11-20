import test from 'node:test';
import assert from 'node:assert/strict';
import {dayRecords, rhythmFor, inRhythm, haloMessage, findZone, haloSVG, hourOn, nowHour, HALO_COLORS} from '../halo.js';

const iso = (date, h, m=0) => { const d = new Date(`${date}T00:00:00`); d.setHours(h, m); return d.toISOString(); };
const day = date => ({
 body:[{date, createdAt:iso(date,7,30)}],
 meals:[{date, mealGroupId:`${date}-a`, loggedAt:iso(date,8)},{date, mealGroupId:`${date}-a`, loggedAt:iso(date,8,5)},{date, mealGroupId:`${date}-b`, loggedAt:iso(date,12,30)},{date, mealGroupId:`${date}-c`, loggedAt:iso(date,19)}],
 workouts:[{date, createdAt:iso(date,18,30)}]
});
const merge = (...dbs) => ({body:dbs.flatMap(d=>d.body), meals:dbs.flatMap(d=>d.meals), workouts:dbs.flatMap(d=>d.workouts)});
const week = merge(day('2026-11-13'),day('2026-11-14'),day('2026-11-15'),day('2026-11-16'),day('2026-11-17'),day('2026-11-18'),day('2026-11-19'));

test('헤일로: 같은 식사 묶음은 한 번만, 시각순으로', () => {
 const recs = dayRecords(day('2026-11-20'), '2026-11-20');
 assert.deepEqual(recs.map(r=>r.kind), ['body','meal','meal','workout','meal']);
 assert.equal(recs[1].t, 8);
});

test('헤일로: 다른 날에 입력된 기록은 시각을 쓰지 않는다(종류만 센다)', () => {
 assert.equal(hourOn(iso('2026-11-21',9), '2026-11-20'), null);
 const recs = dayRecords({body:[{date:'2026-11-20', createdAt:iso('2026-11-21',9)}]}, '2026-11-20');
 assert.equal(recs.length, 1); assert.equal(recs[0].t, null);
});

test('헤일로: 기록이 3일 미만이면 06~24시 기본 범위와 리듬 학습 중', () => {
 const rh = rhythmFor(merge(day('2026-11-19')), '2026-11-20');
 assert.equal(rh.learning, true); assert.equal(rh.start, 6); assert.equal(rh.end, 24);
 assert.equal(inRhythm({kind:'meal', t:23}, rh), true);
});

test('헤일로: 고리 양 끝은 평소 첫 기록 −1시간 ~ 마지막 기록 +1시간', () => {
 const rh = rhythmFor(week, '2026-11-20');
 assert.equal(rh.learning, false);
 assert.equal(rh.start, 6.5); assert.equal(rh.end, 20);
});

test('헤일로: 평소 리듬은 같은 종류 ±1.5시간, 양은 보지 않는다', () => {
 const rh = rhythmFor(week, '2026-11-20');
 assert.equal(inRhythm({kind:'meal', t:13.5}, rh), true);
 assert.equal(inRhythm({kind:'meal', t:23}, rh), false);
 assert.equal(inRhythm({kind:'workout', t:5.3}, rh), false);
});

test('헤일로: 문구는 기록 습관을 말하고 판단하지 않는다', () => {
 const rh = rhythmFor(week, '2026-11-20');
 assert.match(haloMessage([], rh), /첫 기록/);
 assert.match(haloMessage(dayRecords(day('2026-11-20'),'2026-11-20'), rh), /완성/);
 assert.match(haloMessage([{kind:'meal', t:12.5}], rh), /몸·운동 기록을 더하면/);
 for(const m of [haloMessage([{kind:'meal',t:23}], rh), haloMessage([{kind:'body',t:7.5},{kind:'meal',t:23},{kind:'workout',t:5}], rh)]) assert.doesNotMatch(m, /과식|많이|나빠|실패/);
});

test('헤일로: 칸 찾기는 글자 줄 영역(+12px)을 피한다', () => {
 const rects = [{l:22,t:22,r:200,b:40},{l:22,t:52,r:330,b:120},{l:22,t:128,r:180,b:150}];
 const z = findZone(354, 230, rects);
 assert.ok(z);
 for(const r of rects){
  const overlapX = Math.min(z.x+z.w, r.r+12) - Math.max(z.x, r.l-12), overlapY = Math.min(z.y+z.h, r.b+12) - Math.max(z.y, r.t-12);
  assert.ok(overlapX<=0 || overlapY<=0, '칸이 글자 영역과 겹침');
 }
});

test('헤일로: 그림은 칸 밖으로 나가지 않는다(모든 좌표 검사)', () => {
 const rh = rhythmFor(week, '2026-11-20');
 const zone = {x:180, y:120, w:160, h:100, R:Math.min((160-16)/2,(100-10)/1.62)};
 for(const recs of [[], dayRecords(day('2026-11-20'),'2026-11-20'), [{kind:'workout',t:2},{kind:'meal',t:23.9}]]){
  const {svg} = haloSVG({zone, recs, rh, now:21});
  const draw = svg.slice(svg.indexOf('<g class="halo-draw">'));
  const xs = [...draw.matchAll(/ (?:cx|x)="([\d.]+)"/g)].map(m=>+m[1]), ys = [...draw.matchAll(/ (?:cy|y)="([\d.]+)"/g)].map(m=>+m[1]);
  const pathPts = [...draw.matchAll(/(?:M|A[\d.]+ [\d.]+ 0 0 1 )([\d.]+) ([\d.]+)/g)].map(m=>[+m[1],+m[2]]);
  pathPts.forEach(([x,y])=>{xs.push(x);ys.push(y)});
  assert.ok(Math.min(...xs) >= zone.x-10 && Math.max(...xs) <= zone.x+zone.w+10, 'x 범위');
  assert.ok(Math.min(...ys) >= zone.y-10 && Math.max(...ys) <= zone.y+zone.h+10, 'y 범위');
 }
});

test('헤일로: 세 종류를 모두 기록하면 아이콘 완성, 몸 색은 새벽 복숭아', () => {
 const rh = rhythmFor(week, '2026-11-20');
 const zone = {x:180, y:120, w:160, h:100, R:44};
 assert.equal(haloSVG({zone, recs:dayRecords(day('2026-11-20'),'2026-11-20'), rh, now:21}).done, true);
 assert.equal(haloSVG({zone, recs:[{kind:'meal',t:12}], rh, now:21}).done, false);
 assert.equal(HALO_COLORS.body, '#f2b49b');
 assert.equal(nowHour('2026-11-19', new Date('2026-11-20T10:00:00')), 24);
});
