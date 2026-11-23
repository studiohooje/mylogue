import test from 'node:test';
import assert from 'node:assert/strict';
import {metFor, workoutBurn, strengthMinutes, dayBurn} from '../exercise-burn.js';

test('MET 찾기: 이름·별칭, 비슷한 이름은 근사', () => {
 assert.equal(metFor('러닝머신').met, 8.0);
 assert.equal(metFor('트레드밀').met, 8.0);
 assert.equal(metFor('천국의 계단').met, 9.3);
 assert.equal(metFor('필라테스 리포머').approx, true);
 assert.equal(metFor('폼롤러'), null);
});

test('운동 소모: 유산소는 MET×체중×시간, 근력은 세트 시각 범위 × 3.5, 순소모는 MET−1', () => {
 const run = {date:'2026-11-20', exercises:[{name:'러닝머신', kind:'cardio', durationMin:30}]};
 assert.deepEqual(workoutBurn(run, 70), {kcal:280, net:245, minutes:30, approx:false, unknown:0});
 const sets = ['10:00','10:05','10:10','10:20','10:28'].map(t => ({completed:true, completedAt:`2026-11-20T${t}`}));
 const lift = {date:'2026-11-20', exercises:[{name:'스쿼트', sets}]};
 assert.equal(strengthMinutes(lift), 30);
 const b = workoutBurn(lift, 70); assert.equal(b.kcal, Math.round(3.5*70*0.5)); assert.equal(b.approx, true);
 assert.equal(workoutBurn({...lift, duration:60, exercises:[...lift.exercises, {name:'걷기', kind:'cardio', durationMin:10}]}, 70).minutes, 60);
 assert.equal(workoutBurn(run, null), null, '체중 없으면 계산 안 함');
 assert.equal(workoutBurn({...run, planned:true}, 70), null, '예정은 빼기');
 assert.equal(workoutBurn({rest:true}, 70), null);
 assert.equal(dayBurn([run, lift], 70).kcal, 280 + b.kcal);
 assert.ok(workoutBurn(run, 70, {age:65}).kcal < 280, '60세 이상 보정');
});

test('머신 모델 대장: 570모델, 사양이 있으면 숫자 단계 제안', async () => {
 const {BRAND_MODELS, MACHINE_SPEC_BY_ID} = await import('../machine-brands.js');
 const {levelSuggest} = await import('../gym-machines.js');
 assert.equal(BRAND_MODELS.length, 570);
 const withStep = [...MACHINE_SPEC_BY_ID.values()].find(s => s.stepKg > 0);
 const sug = levelSuggest({}, withStep.id);
 assert.equal(sug.step, withStep.stepKg); assert.equal(sug.maker, true);
});

test('필라테스 동작 사전: 기구별 목록 확장, 이름·별칭으로 찾기', async () => {
 const {ALL_MOVES, moveInfo, MOVES} = await import('../pilates.js');
 assert.ok(ALL_MOVES.length > 300);
 assert.equal(moveInfo('헌드레드', '매트').en, 'The Hundred');
 assert.equal(moveInfo('더 헌드레드', '매트').name, '헌드레드');
 assert.ok(MOVES['리포머'].length > 50);
});
