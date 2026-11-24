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
