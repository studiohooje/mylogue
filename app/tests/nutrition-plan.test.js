import test from 'node:test';
import assert from 'node:assert/strict';
import {estimate, calorieOptions, presetOrder, grams, PRESETS, applyGoalWizard, goalWizardHTML, newGoalWizard, cleanProfile, dietNotes, WIZ_STEPS} from '../nutrition-plan.js';

const base = {sex:'male', age:32, heightCm:175, weightKg:75, activity:'moderate', goal:'lose', diets:[]};

test('유지 칼로리: 2025 KDRI 에너지필요추정량 식, 50 단위 (기초대사량은 Mifflin)', () => {
 const e = estimate(base);
 assert.equal(e.bmr, 1689); // 750+1093.75-160+5
 assert.equal(e.tdee, 3050); // 662-9.53×32 + 1.25×(15.91×75 + 539.6×1.75) = 3029 → 3050
 assert.equal(estimate({...base, age:null}), null);
 assert.equal(estimate({...base, sex:'none'}).bmr, 1606);
});

test('칼로리 제안: 목표별 여러 개, 추천 하나, 바닥 아래는 경고', () => {
 const lose = calorieOptions(base);
 assert.deepEqual(lose.map(o=>o.kcal), [2750, 2550, 2300, 3050]);
 assert.equal(lose.filter(o=>o.rec).length, 1);
 assert.equal(lose.find(o=>o.rec).kcal, 2550);
 const glp = calorieOptions({...base, diets:['glp1']});
 assert.equal(glp.some(o=>o.label==='빠른 감량'), false, 'GLP-1이면 빠른 감량 제외');
 assert.equal(glp.find(o=>o.rec).label, '완만한 감량');
 const small = calorieOptions({sex:'female', age:60, heightCm:150, weightKg:45, activity:'sedentary', goal:'lose', diets:[]});
 assert.ok(small.some(o=>o.below), '기초대사량 아래는 표시');
 assert.ok(small.filter(o=>o.below).every(o=>!o.rec));
 assert.equal(calorieOptions({...base, goal:'gain'}).find(o=>o.rec).kcal, 3300);
 assert.equal(calorieOptions({...base, goal:'maintain'}).find(o=>o.rec).kcal, 3050);
});

test('탄단지 제안: 성향·목표별 추천, 모든 비율 합 100, g 계산', () => {
 assert.equal(presetOrder(base).rec, 'cut');
 assert.equal(presetOrder({...base, diets:['keto']}).rec, 'keto');
 assert.equal(presetOrder({...base, diets:['glp1']}).rec, 'glp1');
 assert.equal(presetOrder({...base, goal:'gain'}).rec, 'perform');
 assert.equal(presetOrder({...base, goal:'maintain'}).rec, 'balance');
 for(const x of Object.values(PRESETS)) { assert.equal(x.c+x.p+x.f, 100); assert.ok(x.what && x.good && x.care); }
 assert.deepEqual(grams(2000, 40, 40, 20), {carbs:200, protein:200, fat:44});
});

test('문답 저장: 비율 모드 목표 + 답 보관, 직접 비율도 가능', () => {
 const db = {settings:{barbellWeightKg:20}, body:[{date:'2026-11-01', weight:74.2}]};
 const st = newGoalWizard(db);
 assert.equal(st.profile.weightKg, 74.2, '최근 체중 미리 채움');
 Object.assign(st.profile, base); st.kcal = 2150; st.preset = 'cut';
 const out = applyGoalWizard(db, st);
 assert.equal(out.settings.goalMode, 'ratio');
 assert.equal(out.settings.calorieGoal, 2150);
 assert.equal(out.settings.proteinPctGoal, 40);
 assert.equal(out.settings.proteinGoal, 215);
 assert.equal(out.settings.nutritionProfile.goal, 'lose');
 st.custom = {on:true, c:30, p:40, f:30};
 assert.equal(applyGoalWizard(db, st).settings.fatPctGoal, 30);
 assert.throws(() => applyGoalWizard(db, {...st, kcal:null}));
});

test('문답 화면: 단계별 내용과 주의 문구', () => {
 const st = {step:0, profile:cleanProfile({}), kcal:null, preset:null, custom:{on:false,c:40,p:30,f:30}};
 assert.match(goalWizardHTML(st), /유지 칼로리를 계산할게요/);
 Object.assign(st.profile, base, {diets:['glp1','if']});
 st.step = WIZ_STEPS.indexOf('diet'); assert.match(goalWizardHTML(st), /의료진/);
 st.step = WIZ_STEPS.indexOf('calories'); assert.match(goalWizardHTML(st), /추정 유지 칼로리 <b>3,050kcal/);
 st.kcal = 2350; st.step = WIZ_STEPS.indexOf('macros');
 const html = goalWizardHTML(st);
 assert.match(html, /단백질 우선\(GLP-1 사용 중\)<\/b><em class="gw-rec">추천/);
 assert.match(html, /효과 · /); assert.match(html, /주의 · /);
 assert.match(html, /직접 비율 입력/);
 assert.ok(dietNotes(st.profile).some(x=>/간헐적 단식/.test(x)));
});

test('4.12 KDRI 기준 확인: 여 50대 저활동 1,850(KDRI 산출 1,785) / 남 40세 저활동 2,600, 균형1·2·3', () => {
 assert.equal(estimate({sex:'female', age:57, heightCm:156, weightKg:57, activity:'light'}).tdee, 1850);
 assert.equal(estimate({sex:'male', age:40, heightCm:172, weightKg:72, activity:'light'}).tdee, 2600);
 assert.deepEqual([PRESETS.balance.c, PRESETS.balance.p, PRESETS.balance.f], [40,30,30]);
 assert.deepEqual([PRESETS.balance2.c, PRESETS.balance2.p, PRESETS.balance2.f], [50,20,30]);
 assert.deepEqual([PRESETS.balance3.c, PRESETS.balance3.p, PRESETS.balance3.f], [45,25,30]);
 assert.deepEqual(presetOrder({...base, goal:'maintain'}).order.slice(0,3), ['balance','balance2','balance3']);
});
