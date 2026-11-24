import test from 'node:test';
import assert from 'node:assert/strict';
import {load, save, getStorageStatus} from '../store.js';
import {emptyDB, cleanMeal, normalizeDB} from '../domain.js';
import {quickMealState, applyQuickMeal} from '../quick-edit.js';

const D = '2026-11-24';
const mem = () => { const data = new Map(); globalThis.localStorage = {getItem: k => data.get(k) ?? null, setItem: (k, v) => data.set(k, v), removeItem: k => data.delete(k)}; return data; };

test('DAT-01: 틀린 기록 1건이 있어도 앱이 열리고 저장되며, 그 기록은 지우지 않고 따로 보관', () => {
 const data = mem();
 const db = emptyDB();
 db.meals = [cleanMeal({date: D, name: '밥', servingQty: 1, servingUnit: '공기', calories: 300})];
 db.foods = [{id: 'bad', name: '빈 음식', servingQty: 1, servingUnit: 'g', calories: null, carbs: null, protein: null, fat: null}];
 data.set('mylogue.v1', JSON.stringify(db));
 const loaded = load();
 assert.equal(getStorageStatus().blocked, false);
 assert.equal(loaded.meals.length, 1);
 assert.equal(loaded.foods.length, 0);
 assert.equal(loaded.quarantine.length, 1);
 assert.equal(loaded.quarantine[0].raw.id, 'bad');
 const next = save({...loaded, meals: [...loaded.meals, cleanMeal({date: D, name: '국', servingQty: 1, servingUnit: '그릇', calories: 80})]});
 assert.equal(next.meals.length, 2);
 const again = load();
 assert.equal(again.meals.length, 2);
 assert.equal(again.quarantine.length, 1, '보관한 기록이 계속 남음');
 save({...emptyDB(), meals: again.meals});
 assert.equal(load().quarantine.length, 1, 'db를 새로 만들어 저장해도 보관분 유지');
 assert.throws(() => normalizeDB(JSON.parse(data.get('mylogue.v1').replace('"foods":[]', '"foods":[{"name":""}]'))), '백업 검사는 그대로 엄격');
});

test('DAT-01 원인: 영양값이 빈 식사의 단위를 바꿔도 내 음식을 빈 값으로 덮어쓰지 않는다', () => {
 const db = {meals: [{id: 'm', date: D, mealGroupId: 'g', loggedAt: `${D}T03:00:00.000Z`, name: '무명', servingQty: 1, servingUnit: 'mL', calories: null, carbs: null, protein: null, fat: null}], foods: [{id: 'f', name: '무명', servingQty: 1, servingUnit: 'mL', calories: 50, carbs: 1, protein: 1, fat: 1}]};
 const st = quickMealState(db, D, 'g'); st.rows[0].unit = '회';
 const out = applyQuickMeal(db, st);
 assert.deepEqual(out.foods, db.foods);
});

test('DAT-08: 옛 백업 복원 뒤(기준 비움) 동기화는 서버의 새 기록을 지우지 않고 되살린다', async () => {
 const {planSync} = await import('../cloud-model.js');
 const remote = {'meals~m1': {revision: 1, payload: '{"id":"m1"}'}, 'meals~new1': {revision: 1, payload: '{"id":"new1"}'}};
 const local = {'meals~m1': '{"id":"m1"}'};
 const withBaseline = planSync(local, remote, remote);
 assert.ok(withBaseline.writes.some(w => w.key === 'meals~new1' && w.payload === null), '예전 동작: 서버 새 기록 삭제');
 const after = planSync(local, remote, {});
 assert.equal(after.writes.length, 0);
 assert.ok(after.merged['meals~new1'], '새 기록 되살림');
});

test('DAT-10: 선택칸 목록에 없는 지금 값도 선택된 채로 남는다(열고 저장해도 그대로)', async () => {
 const {mealFormHTML} = await import('../ui-helpers.js');
 const {exerciseFormHTML, machineFormHTML} = await import('../profile-forms.js');
 const m = mealFormHTML({meal: {date: D, name: '밥', servingQty: 1, servingUnit: '공기', calories: 300, source: 'ai-reviewed'}, date: D});
 assert.match(m, /<option value="ai-reviewed" selected>/);
 const e = exerciseFormHTML({name: '리포머 풋워크', part: '필라테스', equipment: '케틀벨'});
 assert.match(e, /<option selected>필라테스<\/option>/); assert.match(e, /<option selected>케틀벨<\/option>/);
 assert.match(machineFormHTML({name: 'x', unit: 'level'}), /<option value="level" selected>단계<\/option>/);
 const {workoutFormHTML} = await import('../ui-helpers.js');
 assert.ok(typeof workoutFormHTML === 'function');
});

test('F-02: 모양이 어긋난 초안이 있어도 검토함이 그려지고 그 초안만 "열 수 없음"', async () => {
 const {renderAIInbox} = await import('../ai-inbox.js');
 const bad = {id: 'bad', type: 'workout', status: 'pending', createdAt: `${D}T03:00:00Z`, originalUtterance: 'x', parsedData: {date: D, exercises: [{name: '스쿼트', sets: 3}]}};
 const good = {id: 'good', type: 'body', status: 'pending', createdAt: `${D}T03:00:00Z`, originalUtterance: '체중', parsedData: {date: D, weight: 70}};
 const html = renderAIInbox([bad, good], {meals: [], workouts: [], body: []});
 assert.match(html, /열 수 없는 초안/);
 assert.match(html, /data-ai-reject="bad"/);
 assert.match(html, /data-ai-quick="good"/);
});

test('S-01: 헬스장 머신 방식 값은 허용 목록만(HTML이 공용 도감으로 들어가지 않음)', async () => {
 const {parseGymRequest, cleanGymSpec} = await import('../gym-machines.js');
 const {safeGymSpec} = await import('../machines-catalog.js');
 const {validateCatalogItem} = await import('../catalog-cloud.js');
 const {unitText} = await import('../domain.js');
 const r = parseGymRequest('[헬스장 머신] modelId=m1 gymKey=g1 spec=stack_both_<iframe/srcdoc=x>');
 assert.deepEqual(r.spec, {load: 'stack', sided: 'both', unit: ''});
 assert.equal(cleanGymSpec({unit: '<b>'}), null);
 assert.equal(safeGymSpec({load: 'plate', unit: '<script>'}).unit, '');
 assert.throws(() => validateCatalogItem('gymMachines', {id: 'gm1', name: 'x', spec: {unit: '<img>'}}));
 assert.ok(validateCatalogItem('gymMachines', {id: 'gm1', name: 'x', spec: {load: 'stack', unit: 'level', levelFirst: 5, levelStep: 5}}));
 assert.equal(unitText('<img onerror=1>'), 'kg');
});

test('C-01: 체중을 날짜 순서와 다르게 넣어도 유지칼로리가 수집 중으로 돌아가지 않는다', async () => {
 const {estimateAt} = await import('../maintenance.js');
 const day = n => { const d = new Date(`${D}T12:00:00`); d.setDate(d.getDate() - n); return d.toISOString().slice(0, 10); };
 const body = [], meals = [];
 for (let i = 40; i >= 0; i--) { body.push({id: 'b' + i, date: day(i), weight: 80 - (40 - i) * 0.02}); meals.push({id: 'm' + i, date: day(i), name: '식사', servingQty: 1, servingUnit: '회', calories: 2300, loggedAt: `${day(i)}T03:00:00Z`}); }
 const sorted = estimateAt({body, meals, workouts: []}, D);
 const shuffled = estimateAt({body: [body[20], ...body.slice(0, 20), ...body.slice(21).reverse()], meals, workouts: []}, D);
 assert.equal(sorted.span, 40);
 assert.equal(shuffled.span, 40, '순서가 섞여도 기간이 같다(예전엔 음수)');
 assert.equal(shuffled.kcal, sorted.kcal);
 assert.ok(sorted.kcal > 0);
});

test('F-01·F-04: 근거 없는 한식 대표값은 확인 필요로, 통째 제품은 "통"으로', async () => {
 const fs = await import('node:fs');
 const db = JSON.parse(fs.readFileSync(new URL('../food-db.json', import.meta.url), 'utf8'));
 const row = name => db.rows.find(r => r[0] === name && r[8] === 'k');
 assert.equal(row('라면')[10], 1); assert.equal(row('설렁탕')[10], 1); assert.ok(!row('쌀밥')[10]);
 assert.ok(!db.rows.some(r => r[2] === '개' && r[3] >= 250 && ['m', 'p'].includes(r[8]) && r[4] / r[3] >= 2.5));
});

test('EX-01·EX-04: 이름 일부로 잘못 잡히던 운동 분류', async () => {
 const {familyOf, cautionsOf, patternOf, alternativesFor} = await import('../exercise-knowledge.js');
 assert.notEqual(familyOf('일립티컬'), '이두');
 assert.ok(!cautionsOf('레그 컬').includes('손목'));
 assert.ok(!cautionsOf('버티컬 레그 프레스').includes('손목'));
 assert.ok(cautionsOf('바벨 컬').includes('손목'));
 assert.equal(patternOf({name: '할로우 바디 홀드'}), '코어');
 assert.notEqual(patternOf({name: '노르딕 햄스트링 컬'}), '힌지');
 assert.notEqual(patternOf({name: '업라이트 로우'}), '수평 당기기');
 assert.ok(!alternativesFor('일립티컬').some(x => /구기|요가/.test(x.name || '')));
});

test('M-01: 둘러보기 AI는 적은 말의 음식 이름을 쓰고, 못 찾으면 값을 비운다', async () => {
 const {demoItems} = await import('../ai-client.js');
 const items = demoItems('점심에 제육덮밥 먹고 콜라 한 캔');
 assert.ok(items.length >= 2);
 assert.ok(!items.some(x => /가짜 AI/.test(x.name)));
 assert.ok(items.every(x => x.kcal == null || x.kcal > 0));
 const p = await import('node:fs').then(fs => fs.readFileSync(new URL('../privacy.html', import.meta.url), 'utf8'));
 assert.doesNotMatch(p, /운영자를 포함해 <b>다른 계정은 내 기록을 볼 수 없어요/, 'B-03 처리방침 첫 상자 모순 해소');
 assert.match(p, /헬스 커넥트/); assert.match(p, /카카오 지도/);
});

test('DAT-04: 동기화 쓰기를 400건씩 나눈다', async () => {
 const {chunk, SYNC_CHUNK} = await import('../cloud-sync.js');
 assert.equal(SYNC_CHUNK, 400);
 const parts = chunk(Array.from({length: 1000}, (_, i) => i), SYNC_CHUNK);
 assert.deepEqual(parts.map(p => p.length), [400, 400, 200]);
});

test('C-02·03·05·06·10·11: 위험한 계획·비현실 값 막기', async () => {
 const {buildPhase} = await import('../phase.js');
 const st = w => ({type: 'diet', weeks: 2, now: {weight: w}, startAvg: w, answers: {loseKg: 40}});
 assert.throws(() => buildPhase(st(50), D), /1.5%/);
 assert.throws(() => buildPhase({type: 'diet', weeks: 12, now: {weight: 45}, startAvg: 45, answers: {loseKg: 6}}, D, {heightCm: 160}), /저체중/);
 assert.ok(buildPhase({type: 'diet', weeks: 12, now: {weight: 80}, startAvg: 80, answers: {loseKg: 6}}, D, {heightCm: 175}).target.weight === 74);
 const {calorieOptions} = await import('../nutrition-plan.js');
 const preg = calorieOptions({sex: 'female', age: 30, heightCm: 160, weightKg: 55, goal: 'lose', cautions: ['pregnant']});
 assert.deepEqual(preg.map(o => o.label), ['유지']);
 assert.ok(calorieOptions({sex: 'female', age: 16, heightCm: 160, weightKg: 50, goal: 'lose'}).every(o => o.label === '유지'));
 const {saveGoalSettings} = await import('../nutrition-goals.js');
 assert.throws(() => saveGoalSettings({}, {goalMode: 'grams', calorieGoal: 300}), /800/);
 assert.doesNotThrow(() => saveGoalSettings({}, {goalMode: 'grams', calorieGoal: 0}));
 const {cleanBody} = await import('../domain.js');
 assert.throws(() => cleanBody({date: D, weight: 7}), /20~400/);
 assert.throws(() => cleanBody({date: D, weight: 700}), /20~400/);
 assert.equal(cleanBody({date: D, weight: 72.4}).weight, 72.4);
 const {estimateAt} = await import('../maintenance.js');
 const day = n => { const d = new Date(`${D}T12:00:00`); d.setDate(d.getDate() - n); return d.toISOString().slice(0, 10); };
 const body = [], meals = [], dayStates = {};
 for (let i = 50; i >= 0; i--) { body.push({id: 'b' + i, date: day(i), weight: 75}); if (i % 7 === 1 || i % 7 === 4) dayStates[day(i)] = 'fasting'; else meals.push({id: 'm' + i, date: day(i), name: '식사', servingQty: 1, servingUnit: '회', calories: 2300, loggedAt: `${day(i)}T03:00:00Z`}); }
 const r = estimateAt({body, meals, workouts: [], dayStates}, D);
 assert.ok(r.meanIntake < 2000, '단식일을 0kcal로 넣어 평균이 내려감');
 const under = estimateAt({body, meals: meals.map(m => ({...m, calories: 1000})), workouts: []}, D, 2500);
 assert.equal(under.ok, false); assert.equal(under.implausible, true);
});

test('DAT-03: 저장 공간이 가득 차면 한국어로 알리고 기존 기록은 그대로', () => {
 const data = new Map();
 globalThis.localStorage = {getItem: k => data.get(k) ?? null, setItem: (k, v) => { if (String(v).length > 200) { const e = new Error('Setting the value exceeded the quota.'); e.name = 'QuotaExceededError'; throw e; } data.set(k, v); }, removeItem: k => data.delete(k)};
 load();
 assert.throws(() => save({...emptyDB(), meals: Array.from({length: 5}, (_, i) => cleanMeal({date: D, name: '밥' + i, servingQty: 1, servingUnit: '공기', calories: 300}))}), /저장 공간이 가득/);
});

test('DAT-05·07·C-04: 설정은 칸마다 합치고, 헬스 걷기 출처를 남기고, 페이즈 시작 때 탄단지도 다시', async () => {
 const {planSync, mergeSetting} = await import('../cloud-model.js');
 const b = JSON.stringify({a: 1, lastGrams: {밥: 210}, goal: 2000});
 const l = JSON.stringify({a: 1, lastGrams: {밥: 150}, goal: 2000});
 const r = JSON.stringify({a: 1, lastGrams: {밥: 210}, goal: 1800});
 const plan = planSync({'settings~main': l}, {'settings~main': {revision: 2, payload: r}}, {'settings~main': {revision: 1, payload: b}});
 assert.equal(plan.conflicts.length, 0);
 assert.deepEqual(JSON.parse(plan.merged['settings~main']), {a: 1, lastGrams: {밥: 150}, goal: 1800});
 assert.equal(mergeSetting('x', 'y', null), 'x');
 const meal = planSync({'meals~m1': '{"q":1}'}, {'meals~m1': {revision: 2, payload: '{"q":2}'}}, {'meals~m1': {revision: 1, payload: '{"q":0}'}});
 assert.equal(meal.conflicts.length, 1, '기록은 예전처럼 물어봄');
 const {cleanWorkout} = await import('../domain.js');
 const w = cleanWorkout({date: D, title: '걷기(헬스 연동)', source: 'health', healthSteps: 8123, exercises: [{name: '걷기', kind: 'cardio', sets: [], durationMin: 60}]});
 assert.equal(w.source, 'health'); assert.equal(w.healthSteps, 8123);
 const {rescaleMacros} = await import('../nutrition-goals.js');
 const s = rescaleMacros({carbsPctGoal: 50, proteinPctGoal: 25, fatPctGoal: 25, carbsGoal: 250, proteinGoal: 125, fatGoal: 56}, 1600);
 assert.equal(s.carbsGoal, 200); assert.equal(s.proteinGoal, 100);
 const glp = rescaleMacros({macroPlan: {rules: {protein: {mode: 'perKg'}}}, carbsPctGoal: 40, proteinPctGoal: 35, fatPctGoal: 25, proteinGoal: 120}, 1500);
 assert.equal(glp.proteinGoal, 120, '체중 기준 단백질은 그대로');
});
