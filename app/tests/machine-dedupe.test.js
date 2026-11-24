// 4.18.0 머신 중복 막기: 띄어쓰기·표기만 다른 머신은 같은 머신, 새 ID는 정리한 이름, 이미 생긴 중복은 불러올 때 하나로
import test from 'node:test';
import assert from 'node:assert/strict';
import {machineKey, canonicalModelId, findSameMachines, dedupeMachines, resolveMachineId, BUILTIN_BRANDS} from '../machines-catalog.js';
import {newModel} from '../gym-machines.js';

test('띄어쓰기·대소문자·꼬리말·한영 표기가 달라도 같은 머신', () => {
  const k = machineKey('뉴텍', '레그프레스 머신');
  for (const [a, b] of [['뉴텍', '레그 프레스 머신'], ['뉴텍', '뉴텍레그프레스머신'], ['Newtech Wellness', 'Leg Press'], ['뉴텍(Newtech Wellness)', 'leg-press'], ['NEWTECH', 'LegPress Machine']]) assert.equal(machineKey(a, b), k, `${a} ${b}`);
  assert.notEqual(machineKey('싸이벡스', '레그프레스'), k); // 제조사가 다르면 다른 머신
  assert.equal(machineKey('싸이벡스', '레그프레스'), machineKey('Cybex', 'Leg Press'));
  assert.notEqual(machineKey('뉴텍', '시티드 레그프레스'), k); // 모델이 다르면 다른 머신
  assert.equal(canonicalModelId('뉴텍', '레그 프레스 머신'), canonicalModelId('Newtech', 'Leg Press'));
});

test('새로 더할 때 이미 있는 머신이면 만들지 않는다', () => {
  const shared = {machineModels: [{id: 'mm:뉴텍:레그프레스', name: '뉴텍 레그프레스', manufacturer: '뉴텍', model: '레그프레스', baseId: 'gm:leg-press-45'}]};
  const r = newModel('뉴텍', '레그 프레스 머신', 'gm:leg-press-45', shared);
  assert.equal(r.existing[0].id, 'mm:뉴텍:레그프레스');
  const fresh = newModel('뉴텍', '파워 레그프레스', 'gm:leg-press-45', shared);
  assert.ok(!fresh.existing); assert.equal(fresh.id, canonicalModelId('뉴텍', '파워 레그프레스'));
  assert.throws(() => newModel('모름', '레그프레스', 'gm:leg-press-45', shared), /머신 종류만/);
  // 앱 기본 모델(영문)과도 맞춘다
  const b = BUILTIN_BRANDS.find(x => /cybex/i.test(x.manufacturer));
  assert.ok(findSameMachines('싸이벡스', b.model.toUpperCase(), {}).some(x => x.id === b.id));
});

test('이미 생긴 중복은 하나로 합치고, 헬스장 등록·옛 기록 ID를 잇는다', () => {
  const shared = {
    machineModels: [
      {id: 'mm:뉴텍:레그 프레스 머신', manufacturer: '뉴텍', model: '레그 프레스 머신', name: '뉴텍 레그 프레스 머신'},
      {id: 'mm:뉴텍:레그프레스', manufacturer: '뉴텍', model: '레그프레스', name: '뉴텍 레그프레스'},
      {id: 'mm:뉴텍:뉴텍레그프레스머신', manufacturer: '뉴텍', model: '뉴텍레그프레스머신', name: '뉴텍 뉴텍레그프레스머신'},
    ],
    gymMachines: [
      {id: 'g1', gymKey: 'kakao:1', gymName: '헬스플러스 안산1호점', modelId: 'mm:뉴텍:레그프레스'},
      {id: 'g2', gymKey: 'kakao:1', gymName: '헬스플러스 안산1호점', modelId: 'mm:뉴텍:뉴텍레그프레스머신'},
      {id: 'g3', gymKey: 'kakao:1', gymName: '헬스플러스 안산1호점', modelId: 'mm:뉴텍:레그 프레스 머신', removed: true},
    ],
  };
  const d = dedupeMachines(shared);
  assert.equal(d.machineModels.length, 1);
  const keep = d.machineModels[0].id;
  assert.equal(d.gymMachines.filter(g => !g.removed).length, 1);
  assert.equal(d.gymMachines.filter(g => g.removed).length, 0); // 같은 머신이 살아 있으면 '뺌' 표시는 버림
  for (const m of shared.machineModels) assert.equal(resolveMachineId(d, m.id), keep);
});

test('제조사가 다른 레그프레스도 한 종목으로 쌓고, 나눠 볼 때만 제조사별', async () => {
  const {machineBreakdown} = await import('../reports.js');
  const {makerKey} = await import('../machines-catalog.js');
  const d = n => { const x = new Date(); x.setDate(x.getDate() - n); return x.toISOString().slice(0, 10); };
  const set = (weight, reps) => ({weight, reps, unit: 'kg', completed: true});
  const ex = (machineId, w) => ({name: '레그 프레스', exerciseId: 'leg-press', machineId, sets: [set(w, 10)]});
  const db = {workouts: [
    {date: d(1), exercises: [ex('m-newtech', 120)]}, {date: d(3), exercises: [ex('m-newtech2', 130)]},
    {date: d(5), exercises: [ex('m-cybex', 110)]}, {date: d(7), exercises: [ex('gm:leg-press-45', 100)]}, {date: d(9), exercises: [ex('', 90)]},
  ]};
  const makers = {'m-newtech': '뉴텍', 'm-newtech2': 'Newtech Wellness', 'm-cybex': '싸이벡스'};
  const group = id => !id ? {key: 'free', label: '프리웨이트'} : makers[id] ? {key: makerKey(makers[id]), label: makers[id]} : {key: 'generic', label: '일반 머신'};
  const rows = machineBreakdown(db, e => e.exerciseId === 'leg-press', group, 30);
  assert.equal(rows.reduce((a, r) => a + r.days, 0), 5); // 합치면 5일
  assert.equal(rows[0].key, 'newtech'); assert.equal(rows[0].days, 2); // 뉴텍·Newtech 표기가 달라도 한 제조사
  assert.deepEqual(rows.map(r => r.key).sort(), ['cybex', 'free', 'generic', 'newtech']);
});

test('직접 적은 이름·제조사 머신도 상위 종목의 그림으로, 상위 종류가 없으면 목록에', async () => {
  const {artFile, setMachineResolver} = await import('../exercise-art-ui.js');
  const {inferBaseId, orphanMachines} = await import('../machines-catalog.js');
  for (const n of ['아웃타이 (힙 어브덕션)', '이너타이 (힙 어덕션)', '핵프레스 (양발)', '뉴텍 레그프레스', 'Cybex Leg Press']) assert.ok(artFile(n), n);
  setMachineResolver(id => id === 'mm:x' ? {exerciseId: 'exercise:레그 프레스'} : null);
  assert.ok(artFile({name: '이상한 이름', machineId: 'mm:x'}));
  setMachineResolver(null);
  assert.ok(inferBaseId({manufacturer: '뉴텍', model: '레그프레스 머신'}).startsWith('gm:leg-press'));
  const o = orphanMachines({machineModels: [{id: 'mm:a', manufacturer: 'A', model: '뭔지 모를 기구', name: 'A 뭔지 모를 기구'}, {id: 'mm:b', manufacturer: '뉴텍', model: '레그프레스'}]}, []);
  assert.deepEqual(o.map(x => x.id), ['mm:a']);
});
