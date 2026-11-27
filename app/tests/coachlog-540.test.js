// 5.4.0 코치로그 1·2차 + 입력 창 세 갈래(지난 · 도움받기 · 직접)
import test from 'node:test';
import assert from 'node:assert/strict';
import {rowsToExercises, coachDashHTML, coachClientsHTML, coachScheduleHTML, coachData, withCoach, planText} from '../coach.js';
import {workoutToRows, composeNote, mealPlanItem} from '../coach-live.js';
import {helpOptionsHTML, workSourceHTML, photoQuota, PHOTO_PER_DAY} from '../input-sources.js';
import {mealSourceHTML} from '../meal-rank.js';

test('실시간 입력 → 수업 줄: 세트별 무게·횟수 그대로, 웜업 표시 유지', () => {
  const w = {exercises: [{name: '스쿼트', part: '하체', sets: [{weight: 40, reps: 12, type: '웜업'}, {weight: 55, reps: 10}, {weight: 60, reps: 8}]}, {name: '러닝', kind: 'cardio', durationMin: 10}]};
  const rows = workoutToRows(w);
  assert.equal(rows.length, 2); assert.equal(rows[0].sets, 3); assert.equal(rows[1].kind, 'timed');
  const ex = rowsToExercises(rows);
  assert.deepEqual(ex[0].sets.map(s => `${s.weight}x${s.reps}${s.type ? 'W' : ''}`), ['40x12W', '55x10', '60x8']);
  assert.equal(ex[0].part, '하체');
  // 무게를 고치면 예전 방식(같은 세트 반복)으로
  const ex2 = rowsToExercises([{...rows[0], weight: 70}]);
  assert.equal(ex2[0].sets.length, 3); assert.ok(ex2[0].sets.every(s => s.weight === 70));
});
test('수업 정리 코멘트: 빠른 문장 + 좋아진 점 + 다음 포인트', () => {
  assert.equal(composeNote({notes: ['자세 좋아요'], good: '깊이 안정', next: ''}), '자세 좋아요\n좋아진 점: 깊이 안정');
});
test('식단 제안 항목: 날짜·아이디는 빼고 출처는 코치', () => {
  const it = mealPlanItem({id: 'm1', date: '2026-11-26', loggedAt: 'x', name: '현미밥', servingQty: 0.5, servingUnit: '공기', calories: 150, source: 'manual'});
  assert.equal(it.id, undefined); assert.equal(it.date, undefined); assert.equal(it.source, 'coach'); assert.equal(it.name, '현미밥');
  assert.match(planText({title: '점심', items: [it]}, '김민지'), /김민지 님 식단 제안\] 점심[\s\S]*현미밥 0.5공기 \(150kcal\)/);
});
test('도움받기: 못 쓰는 갈래는 숨기지 않고 회색 + 이유', () => {
  const h = helpOptionsHTML([{ico: 'a', title: '코치', sub: 's', attr: 'data-x', off: true, why: '코치가 없어요'}, {ico: 'b', title: 'AI', sub: 's2', attr: 'data-y', badge: '오늘 3/3번'}]);
  assert.match(h, /hs-opt off" aria-disabled="true" data-hs-off/); assert.match(h, /코치가 없어요/); assert.match(h, /오늘 3\/3번/);
  assert.equal(photoQuota(false).limit, PHOTO_PER_DAY.free); assert.equal(photoQuota(true).limit, PHOTO_PER_DAY.plus);
});
test('식사 창 세 갈래: 지난 식사 · 도움받기 · 직접, 코치 제안은 도움받기 안에서', () => {
  const s = {date: '2026-11-26', time: '12:00', src: 'help'};
  const none = mealSourceHTML({meals: []}, s, [], {limit: 3, left: 0}).html;
  assert.match(none, /지난 식사에서[\s\S]*도움받기[\s\S]*직접 입력/);
  assert.match(none, /코치 제안 식단[\s\S]*연동된 코치님이 식단을 제안하면 열려요/);
  assert.match(none, /오늘 3번을 다 썼어요/);
  const plans = [{id: 'p1', title: '점심 제안', trainerName: '이준호', items: [{name: '현미밥', servingQty: 1, servingUnit: '공기', calories: 300}]}];
  const coach = mealSourceHTML({meals: []}, {...s, src: 'coach'}, plans).html;
  assert.match(coach, /data-q-coach-save="p1~x"/); assert.match(coach, /이준호 코치님/); assert.match(coach, /class="on"[^>]*data-q-src="help"/);
});
test('운동 창 세 갈래: 지난 운동 · 도움받기(코치 루틴 · AI 사진) · 직접 고르기', () => {
  const h = workSourceHTML({src: 'help', routines: []});
  assert.match(h, /코치 제안 루틴[\s\S]*연동된 코치님이 루틴을 보내거나 수업을 확정하면 열려요/);
  const c = workSourceHTML({src: 'coach', routines: [{id: 'r1', title: '하체 숙제', trainerName: '이준호', items: [{name: '스쿼트'}]}]});
  assert.match(c, /data-q-wroutine="r1"/);
  assert.match(workSourceHTML({src: 'past', recent: [{id: 'w1', title: '하체', date: '2026-11-25', exCount: 4}]}), /data-q-wpast="w1"[\s\S]*11\/25 · 4종목/);
});
test('코치 화면: 빈 대시보드 · 회원 전용 화면 탭 · 일정 출석', () => {
  const empty = coachData(withCoach({settings: {}}, {}));
  assert.match(coachDashHTML(empty, {today: '2026-11-26'}), /첫 회원을 초대해 볼까요/);
  const data = coachData(withCoach({settings: {}}, {clients: [{id: 'c1', name: '김민지', pt: {total: 20, used: 11}, mealPlans: [{id: 'p', title: '점심', items: [{name: '현미밥', calories: 300}]}]}], schedules: [{id: 'b1', clientIds: ['c1'], startAt: '2026-11-25T19:00', status: 'planned', title: '하체'}]}));
  const d = coachClientsHTML(data, {open: 'c1', tab: 'diet', today: '2026-11-26'});
  assert.match(d, /data-coach-ctab="diet"/); assert.match(d, /식단 제안 만들기/); assert.match(d, /data-copy=/);
  assert.match(coachScheduleHTML(data, {today: '2026-11-26', day: '2026-11-25'}), /data-coach-attend="b1:noshow"/);
});
test('미가입 회원용 수업 글: 세트별 무게×횟수와 코치 한마디', async () => {
  const {sessionText} = await import('../coach.js');
  const t = sessionText({date: '2026-11-26', title: '하체 PT', exercises: [{name: '스쿼트', sets: [{weight: 55, reps: 10}, {weight: 60, reps: 8}]}, {name: '사이클', kind: 'cardio', durationMin: 10}], memberNote: '무릎 각도'}, '정해준');
  assert.match(t, /정해준 님 11\/26 수업\] 하체 PT/); assert.match(t, /스쿼트 55×10, 60×8/); assert.match(t, /사이클 10분/); assert.match(t, /코치 한마디: 무릎 각도/);
});
test('식단 제안 3가지: 하루 식단표·끼니별 조합·한 끼 — 회원은 지금 끼니가 먼저, 고르면 그 음식들', async () => {
  const {finalizeDiet, emptyDiet, coachPick, memberCoachMealsHTML} = await import('../coach-diet.js');
  const it = n => ({name: n, servingQty: 1, servingUnit: '개', calories: 100});
  const d = emptyDiet({clientId: 'c1', mode: 'day'}); d.slots[0].items.push(it('바나나')); d.slots[1].items.push(it('현미밥'), it('닭가슴살'));
  const day = finalizeDiet(d); assert.equal(day.slots.length, 2);
  const c = emptyDiet({clientId: 'c1', mode: 'combo'}); c.combos.점심.push({name: 'A 조합', items: [it('포케')]}, {name: 'B 조합', items: []});
  const combo = finalizeDiet(c); assert.equal(combo.combos.점심.length, 1); assert.equal(combo.combos.아침, undefined);
  const plans = [{...day, id: 'd1', trainerName: '이준호'}, {...combo, id: 'c1', trainerName: '이준호'}];
  const h = memberCoachMealsHTML(plans, {time: '12:10'});
  assert.ok(h.indexOf('점심 · 12:30') < h.indexOf('아침 · 08:00'), '지금 끼니(점심)가 먼저');
  assert.match(h, /data-q-coach-save="c1~c~점심~0"/);
  assert.deepEqual(coachPick(plans, 'd1~s~1').items.map(x => x.name), ['현미밥', '닭가슴살']);
  assert.equal(coachPick(plans, 'c1~c~점심~0').slot, '점심');
});
test('수업 계획: 회원 종류로 걸러진 함께한 운동 · 보낼 시각', async () => {
  const {historyOf, planShowAt, planVisible} = await import('../coach-plan.js');
  const data = {sessions: [{date: '2026-11-20', exercises: [{name: '벤치프레스', kind: 'strength', sets: [{weight: 60, reps: 8}]}, {name: '매트', kind: 'cardio', part: '필라테스', moves: [{name: '헌드레드', reps: 100}], sets: []}], targets: [{clientId: 'c1'}]}]};
  const h = historyOf(data, 'c1'); assert.deepEqual(h.map(x => `${x.kind}:${x.name}`).sort(), ['웨이트:벤치프레스', '필라테스:헌드레드']);
  const x = {startAt: '2026-11-28T19:00', plan: {items: [{name: '벤치프레스'}], send: 'dayBefore'}};
  const at = planShowAt(x, {planSend: 'dayBefore', planTime: '20:00'}); assert.equal(new Date(at).getDate(), 27); assert.equal(new Date(at).getHours(), 20);
  assert.equal(planShowAt({...x, plan: {...x.plan, send: 'none'}}, {}), '');
  assert.equal(planVisible({plan: {items: [1], showAt: '2000-01-01T00:00:00Z'}}), true);
});
