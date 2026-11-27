// 5.7.7: 운동 이름은 마지막에(직접 쓰기 + 추천), 인바디 결과지 AI 읽기 → 입력 칸 채우기
import test from 'node:test';
import assert from 'node:assert/strict';
import {titleOptions} from '../workout-name.js';
import {inbodyPrefill} from '../inbody-ai.js';

const ex = (name, part, n) => ({name, part, sets: Array.from({length: n}, () => ({weight: 50, reps: 10, completed: true}))});
const push = {id: 'a', date: '2026-11-20', title: 'Push Day', exercises: [ex('벤치프레스', '가슴', 5), ex('숄더프레스', '어깨', 4), ex('푸시다운', '삼두', 3)]};
const leg = {id: 'b', date: '2026-11-21', title: 'Leg Day', exercises: [ex('스쿼트', '하체', 6)]};

test('운동 이름 추천: 내 이름은 오늘 부위에 맞을 때만, 이름 붙여 온 사람이면 그게 먼저', () => {
  const todayPush = {id: 'c', exercises: [ex('인클라인', '가슴', 4), ex('사레레', '어깨', 4), ex('로프 푸시다운', '삼두', 3)]};
  const todayLeg = {id: 'd', exercises: [ex('레그프레스', '하체', 5)]};
  const a = titleOptions({workouts: [push, leg]}, todayPush);
  assert.equal(a.first, 'Push Day'); assert.deepEqual(a.mine, ['Push Day']); assert.equal(a.parts, '가슴·어깨·삼두');
  const b = titleOptions({workouts: [push, leg]}, todayLeg);
  assert.ok(!b.mine.includes('Push Day'), '하체만 한 날엔 Push Day 안 나옴');
  const c = titleOptions({workouts: [{...push, title: '가슴·어깨·삼두'}]}, todayPush);
  assert.equal(c.namer, false); assert.equal(c.first, '가슴·어깨·삼두', '부위 이름만 써 온 사람은 많이 한 부위가 먼저');
});

test('인바디 AI 결과 → 입력 칸: 숫자만, 미래 날짜는 버림', () => {
  const p = inbodyPrefill({date: '2026-07-13', weight: 87.5, skeletalMuscle: 39.4, bmi: null, bmr: '1879'}, '2026-11-27');
  assert.deepEqual(p, {source: 'inbody', weight: 87.5, skeletalMuscle: 39.4, bmr: 1879, date: '2026-07-13'});
  assert.equal(inbodyPrefill({date: '2027-01-01', weight: 80}, '2026-11-27').date, undefined);
});

test('수치 인바디 카드: 최근 7회만, 근육 늘면·지방 줄면 민트', async () => {
  const {compositionCard} = await import('../body-flow.js');
  const body = Array.from({length: 10}, (_, i) => ({id: 'b' + i, date: `2026-11-${String(i + 10).padStart(2, '0')}`, measure: 'inbody', weight: 80 - i * 0.2, skeletalMuscle: 35 + i * 0.1, bodyFatMass: 18 - i * 0.2, bodyFatPct: 22 - i * 0.2}));
  const html = compositionCard({body});
  assert.match(html, /최근 7회/); assert.match(html, /11\/13[\s\S]*11\/19/);
  assert.match(html, /골격근량[\s\S]*class="g">\+0\.6kg/); assert.match(html, /체지방량[\s\S]*class="g">−1\.2kg/);
});
