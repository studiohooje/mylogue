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
 assert.match(html, /오늘 운동 · /); assert.match(html, /한 운동/); assert.match(html, /운동 흐름/);
 assert.match(html, />이두</, '팔 기록이 이두로 보임'); assert.doesNotMatch(html, />팔</);
 assert.match(html, /62\.5<small>kg<\/small>/, '펼친 세트: 무게에 단위를 붙여 한 줄');
 assert.match(html, /×12/);
 assert.match(html, /data-wp-open="b#1"/);
 const empty = workoutDayHTML(db, '2026-11-25', {today: '2026-11-27'});
 assert.match(empty, /운동 기록이 없어요/);
});
