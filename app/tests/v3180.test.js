import test from 'node:test';
import assert from 'node:assert/strict';
import {cleanWorkout} from '../domain.js';
import {dayRecords, haloMessage} from '../halo.js';
import {renderHomeTimeline} from '../timeline-view.js';
import {quickWorkoutHTML, emptyQuickWorkout} from '../quick-entry.js';
import {EXERCISE_CATALOG} from '../catalog.js';

const D = '2026-11-21';
const rest = cleanWorkout({date:D, rest:true, exercises:[], loggedAt:`${D}T09:00:00`});

test('의도적 휴식: 종목 없이 저장되고, 헤일로는 운동을 채운 날로 본다', () => {
 assert.equal(rest.rest, true);
 assert.equal(rest.title, '의도적 휴식');
 assert.deepEqual(rest.exercises, []);
 assert.throws(() => cleanWorkout({date:D, exercises:[]}), /운동 종목/);
 const db = {body:[{date:D, createdAt:`${D}T07:00:00`}], meals:[{date:D, name:'밥', loggedAt:`${D}T12:00:00`}], workouts:[rest]};
 const recs = dayRecords(db, D);
 assert.ok(recs.some(r => r.kind==='workout'));
 assert.match(haloMessage(recs, {learning:true, base:{}}), /헤일로 완성/);
});

test('의도적 휴식은 기간 리포트의 운동 횟수에 들어가지 않고, 타임라인엔 휴식 카드', async () => {
 const {periodReport} = await import('../reports.js');
 assert.equal(periodReport({meals:[], workouts:[rest], body:[]}, 7, new Date(`${D}T12:00:00`)).workoutSessions, 0);
 const html = renderHomeTimeline({meals:[], workouts:[rest], body:[], settings:{}}, D);
 assert.match(html, /rest-card/);
 assert.match(html, /data-delete="workouts:/);
});

test('운동 기록 창에 휴식 버튼, 휴식한 날은 안내, 타임라인에 휴식 카드', () => {
 const s = emptyQuickWorkout(D);
 const db = {workouts:[], machines:[], settings:{gyms:[]}, meals:[], body:[]};
 assert.match(quickWorkoutHTML(db, s, EXERCISE_CATALOG), /id="q-rest"/);
 const after = quickWorkoutHTML({...db, workouts:[rest]}, s, EXERCISE_CATALOG);
 assert.doesNotMatch(after, /id="q-rest"/);
 assert.match(after, /의도적 휴식<\/b>으로 기록돼 있어요/);
});
