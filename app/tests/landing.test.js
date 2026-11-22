import test from 'node:test';
import assert from 'node:assert/strict';
import {showLanding, demoRecords, landingHTML, demoBannerHTML, hasRecords, viewLanding, closeLanding} from '../landing.js';
import {cleanBody, cleanMeal, cleanWorkout, emptyDB} from '../domain.js';

test('랜딩은 로그인 전·기록 없음·건너뛰지 않음·둘러보기 아님일 때만', () => {
 const mem = new Map(); globalThis.localStorage = {getItem:k => mem.get(k)??null, setItem:(k, v) => mem.set(k, v), removeItem:k => mem.delete(k)};
 const empty = emptyDB();
 assert.equal(showLanding({user:null, db:empty, demo:false}), true);
 assert.equal(showLanding({user:{uid:'u'}, db:empty, demo:false}), false, '로그인하면 안 보임');
 assert.equal(showLanding({user:null, db:empty, demo:true}), false, '둘러보기 중에는 안 보임');
 assert.equal(showLanding({user:null, db:{...empty, meals:[{}]}, demo:false}), false, '이미 쓰던 게스트는 그대로');
 mem.set('mylogue.landing.skip', '1');
 assert.equal(showLanding({user:null, db:empty, demo:false}), false, '가입 없이 시작을 고르면 안 보임');
 const smem = new Map(); globalThis.sessionStorage = {getItem:k => smem.get(k)??null, setItem:(k, v) => smem.set(k, v), removeItem:k => smem.delete(k)};
 viewLanding();
 assert.equal(showLanding({user:null, db:{...empty, meals:[{}]}, demo:false}), true, '설정에서 다시 보기를 누르면 기록이 있어도 보임');
 assert.equal(showLanding({user:{uid:'u'}, db:empty, demo:false}), false, '로그인 상태에선 안 보임');
 closeLanding();
 assert.equal(showLanding({user:null, db:empty, demo:false}), false);
 assert.match(landingHTML({returning:true}), /내 기록으로 돌아가기/);
});

test('둘러보기 예시 기록은 저장 계약을 통과한다', () => {
 const r = demoRecords('2026-11-22');
 const body = r.body.map(cleanBody), meals = r.meals.map(cleanMeal), workouts = r.workouts.map(cleanWorkout);
 assert.ok(body.length >= 14 && meals.length >= 40 && workouts.length >= 6);
 assert.ok(body.some(b => b.measure==='inbody'));
 assert.ok(workouts.some(w => w.exercises.some(e => e.moves?.length)), '필라테스 동작 포함');
 assert.ok(hasRecords({body, meals, workouts}));
 assert.equal(body.at(-1).date <= '2026-11-22', true);
});

test('랜딩·배너 화면', () => {
 const html = landingHTML();
 for(const id of ['landing-signup', 'landing-demo', 'landing-guest', 'landing-login']) assert.match(html, new RegExp(`id="${id}"`));
 assert.match(html, /기록만으로/); assert.match(html, /href="story.html"/);
 assert.match(demoBannerHTML(), /id="demo-exit"/);
});
