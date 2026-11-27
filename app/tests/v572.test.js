// 5.7.2: 이두·삼두 나눔, 운동 페이지 2안(하루 운동·운동 흐름·칭찬 한 줄), 설치 안내는 install.test.js
import test from 'node:test';
import assert from 'node:assert/strict';
import {armPart, partOf} from '../body-part.js';
import {EXERCISE_CATALOG} from '../catalog.js';
import {cleanWorkout} from '../domain.js';

test('이두·삼두: 도감에 팔이 남지 않고, 컬은 이두·푸시다운은 삼두', () => {
 assert.equal(EXERCISE_CATALOG.filter(x => x.part === '팔').length, 0);
 const p = n => EXERCISE_CATALOG.find(x => x.name === n)?.part;
 assert.equal(p('케이블 컬'), '이두'); assert.equal(p('머신 프리처 컬'), '이두'); assert.equal(p('리스트 컬'), '이두');
 assert.equal(p('로프 푸시다운'), '삼두'); assert.equal(p('EZ바 스컬 크러셔'), '삼두'); assert.equal(p('케이블 푸시다운'), '삼두');
});

test('예전 기록의 팔은 원본 그대로, 보여 줄 때만 이두·삼두', () => {
 assert.equal(partOf({part: '팔', name: '케이블 바이셉스 컬'}), '이두');
 assert.equal(partOf({part: '팔', name: '라잉 트라이셉스 익스텐션'}), '삼두');
 assert.equal(partOf({part: '팔', name: '아무거나', primaryMuscleIds: ['triceps']}), '삼두');
 assert.equal(partOf({part: '등', name: '시티드 로우'}), '등');
 assert.equal(armPart('해머 컬', ['biceps', 'forearms']), '이두');
});

test('운동 페이지 2안: 그날 운동 요약·한 운동 줄·칭찬(늘었다·처음)', async () => {
 const {workoutDayHTML, exerciseNote} = await import('../workout-day.js');
 const set = (w, r, at) => ({weight: w, unit: 'kg', reps: r, completed: true, completedAt: at});
 const w1 = cleanWorkout({id: 'a', date: '2026-11-23', title: '등', exercises: [{name: '시티드 케이블 로우', part: '등', sets: [set(55, 10, '2026-11-23T08:00')]}]});
 const w2 = cleanWorkout({id: 'b', date: '2026-11-27', title: '등 이두', gymName: '헬스장', exercises: [
  {name: '시티드 케이블 로우', part: '등', sets: [set(55, 12, '2026-11-27T07:39'), set(62.5, 12, '2026-11-27T07:47')]},
  {name: '케이블 컬', part: '팔', sets: [set(15, 12, '2026-11-27T08:21')]},
 ]});
 const db = {workouts: [w1, w2], settings: {}};
 assert.deepEqual(exerciseNote(db, '2026-11-27', w2.exercises[0]), {k: 'up', t: '최고 무게 55 → 62.5kg'});
 assert.equal(exerciseNote(db, '2026-11-27', w2.exercises[1]).k, 'new');
 const html = workoutDayHTML(db, '2026-11-27', {today: '2026-11-27', open: 'b#0'});
 assert.match(html, /오늘 운동<span class="wd-parts">/); assert.match(html, /<h3>종목/); assert.match(html, /운동 흐름/);
 assert.match(html, />이두</, '팔 기록이 이두로 보임'); assert.doesNotMatch(html, />팔</);
 assert.match(html, /62\.5<small>kg<\/small>/, '펼친 세트: 무게에 단위를 붙여 한 줄');
 assert.match(html, /×12/);
 assert.match(html, /data-wp-open="b#1"/);
 const empty = workoutDayHTML(db, '2026-11-25', {today: '2026-11-27'});
 assert.match(empty, /운동 기록이 없어요/);
});

test('최고 기록·칭찬: 양쪽 함께와 한쪽씩은 따로 비교', async () => {
 const {exerciseNote} = await import('../workout-day.js');
 const {newRecords} = await import('../workout-flow.js');
 const st = (w, r, one) => ({weight: w, unit: 'kg', reps: r, completed: true, ...(one ? {side: 'single'} : {})});
 const a = cleanWorkout({id: 'a', date: '2026-11-20', exercises: [{name: '시티드 로우', part: '등', sets: [st(60, 10)]}]});
 const b = cleanWorkout({id: 'b', date: '2026-11-23', exercises: [{name: '시티드 로우', part: '등', sets: [st(55, 10, true)]}]});
 const c = cleanWorkout({id: 'c', date: '2026-11-27', exercises: [{name: '시티드 로우', part: '등', sets: [st(62.5, 12, true)]}]});
 const db = {workouts: [a, b, c], settings: {}};
 assert.deepEqual(exerciseNote(db, '2026-11-23', b.exercises[0]), {k: 'new', t: '한쪽씩 첫 기록'}, '양쪽 60kg보다 가벼워도 한쪽씩은 첫 기록');
 assert.deepEqual(exerciseNote(db, '2026-11-27', c.exercises[0]), {k: 'up', t: '최고 무게 55 → 62.5kg'}, '한쪽씩끼리 비교');
 const prs = newRecords(db, '2026-11-27');
 assert.ok(prs.some(r => r.name === '시티드 로우 (한쪽씩)' && r.from === 55 && r.to === 62.5));
 assert.ok(!prs.some(r => r.name === '시티드 로우' && r.to === 62.5), '양쪽 기록(60)과 섞지 않음');
});

test('머신 도감: 다 받은 뒤 쓴 머신만 작은 사본으로', async () => {
 const mem = new Map(); globalThis.localStorage = {getItem: k => mem.get(k) ?? null, setItem: (k, v) => mem.set(k, String(v)), removeItem: k => mem.delete(k)};
 const {rememberBrands, brandsReady, BUILTIN_BRANDS, genericMachine} = await import('../machines-catalog.js');
 assert.equal(brandsReady(), true, '시험(Node)에서는 처음부터 전체');
 const id = 'bm:cybex:ft-360:ft-360-functional-trainer';
 assert.ok(genericMachine(id), '도감에 있음');
 assert.equal(rememberBrands([id, 'bm:없는:모델:x']), 1);
 const saved = JSON.parse(mem.get('mylogue.brandCache.v1'));
 assert.equal(saved[0].id, id); assert.equal(saved[0].makerKo, '사이벡스'); assert.equal(saved[0].name, undefined, '파생값은 빼고 원래 행만');
 assert.ok(BUILTIN_BRANDS.length > 1900);
});

test('음식 DB: 제조사명이 이름에 붙은 같은 제품 두 줄은 하나로(열량 다르면 둘 다)', async () => {
 const {dedupeBrandRows} = await import('../food-dedupe.js');
 const rows = [
  ['기대식 저당 닭가슴살 커리맛', '기대식', '개', 0, 119, 1, 2, 3, 'm'],
  ['저당 닭가슴살 커리맛', '기대식', '개', 0, 119, 1, 2, 3, 'p'],
  ['널담 고단백 저당 쿠키', '널담', '개', 0, 224, 1, 2, 3, 'p'],
  ['고단백 저당 쿠키', '널담', '개', 0, 260, 1, 2, 3, 'p'],
 ];
 const out = dedupeBrandRows(rows).map(r => r[0]);
 assert.deepEqual(out, ['저당 닭가슴살 커리맛', '널담 고단백 저당 쿠키', '고단백 저당 쿠키']);
});

test('리캡 식단 점: 목표를 조금 넘겨도 잘 맞춰 먹었으면 파랑(75점 이상)', async () => {
 const {monthRecap} = await import('../monthly-recap.js').catch(() => ({}));
 const {dietScore} = await import('../diet-trends.js');
 const s = {calorieGoal: 2300, carbsGoal: 260, proteinGoal: 170, fatGoal: 65};
 assert.ok(dietScore({calories: 2480, carbs: 270, protein: 175, fat: 70}, s).total >= 75, '칼로리 +8%여도 75점 이상');
 assert.ok(dietScore({calories: 3400, carbs: 420, protein: 90, fat: 120}, s).total < 75, '크게 넘치면 75점 미만');
});

test('세트 색: 내 기록 기준 4단계·새 최고, 지난 기록 없으면 그날 세트끼리', async () => {
 const {setLevels} = await import('../workout-day.js');
 const st = (w, r) => ({weight: w, unit: 'kg', reps: r, completed: true});
 const a = cleanWorkout({id: 'a', date: '2026-11-20', exercises: [{name: '레그 프레스', part: '하체', sets: [st(100, 10)]}]});
 const b = cleanWorkout({id: 'b', date: '2026-11-27', exercises: [{name: '레그 프레스', part: '하체', sets: [st(60, 10), st(90, 10), st(100, 10), st(110, 10)]}, {name: '처음 종목', part: '등', sets: [st(20, 10), st(40, 10)]}]});
 const db = {workouts: [a, b]};
 assert.deepEqual(setLevels(db, '2026-11-27', b.exercises[0]), ['lv1', 'lv3', 'lv4', 'pr']);
 assert.deepEqual(setLevels(db, '2026-11-27', b.exercises[1]), ['lv1', 'lv4'], '지난 기록 없으면 그날 최고 기준');
 assert.deepEqual(setLevels(db, '2026-11-20', a.exercises[0]), ['lv4'], '지난 날은 그날 이전 기록만 봄');
});
