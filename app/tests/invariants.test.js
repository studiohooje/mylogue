import test from 'node:test';
import assert from 'node:assert/strict';
import {simulate, makeUser, checkUser} from '../tools/sim-users.mjs';

// 4.28.0 밤샘 E-1: 가상 사용자 불변식(작게). 전체(2,000명×365일)는 node tools/sim-users.mjs로.
test('가상 사용자 36명×200일: 불변식 위반 0, 주요 길(유지칼로리 준비·따로 보관·탄지 미제공·코치 안전)을 실제로 지난다', () => {
 const r = simulate({users: 36, days: 200, seed: 3});
 assert.deepEqual(r.byRule, {}, JSON.stringify(r.samples.slice(0, 5)));
 assert.ok(r.cover['따로 보관 있음'] > 0);
 assert.ok(r.cover['탄지 미제공 날'] > 0);
 assert.ok(Object.keys(r.cover).some(k => k.startsWith('코치 safety')));
});
test('검사기가 실제로 잡는다: 일부러 망가뜨린 기록(음수 열량·잘못된 점수 설정·화면 NaN)', () => {
 const u = makeUser(1, {days: 60, seed: 9});
 // ① 음수 열량은 정제가 막는다 → 정제가 받아들이면 I5가 잡아야 한다
 const bad = JSON.parse(JSON.stringify(u.db));
 bad.settings.calorieGoal = 'abc'; // 목표가 숫자가 아니면 점수는 null이어야 하고 화면에 NaN이 찍히면 안 된다
 const f1 = checkUser({...u, db: bad});
 assert.ok(f1.every(x => !/NaN/.test(x.detail)), JSON.stringify(f1));
 // ② 동기화 왕복에서 기록이 사라지는 상황을 흉내 → I3가 잡는다
 const ghost = JSON.parse(JSON.stringify(u.db));
 ghost.meals.push({...ghost.meals[0], id: ghost.meals[1]?.id || 'dup'}); // 같은 ID 두 개 → 동기화 기록 키 중복
 const f2 = checkUser({...u, db: ghost});
 assert.ok(f2.some(x => x.rule.startsWith('I3')), JSON.stringify(f2));
});
