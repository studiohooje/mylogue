import test from 'node:test';
import assert from 'node:assert/strict';
import {EXERCISE_FAMILIES, familyOfExercise, familyChipsHTML} from '../exercise-family.js';
import {EXERCISE_CATALOG} from '../catalog.js';

test('종목 묶음: 모든 종목이 도감에 있고 한 묶음에만 들어 있다', () => {
  const ids = new Set(EXERCISE_CATALOG.map(e => e.id)), seen = new Map();
  for (const f of EXERCISE_FAMILIES) {
    assert.ok(f.items.length >= 2, f.name);
    for (const [label, id] of f.items) {
      assert.ok(ids.has(id), `${f.name}: ${id} 없음`);
      assert.ok(!seen.has(id), `${id}가 ${seen.get(id)}·${f.name} 두 묶음에`);
      seen.set(id, f.name);
      assert.ok(label.length <= 8, `${label} 칩 글자가 길다`);
    }
  }
  assert.equal(familyOfExercise('exercise:로프 푸시다운').name, '케이블 푸시다운');
  assert.match(familyChipsHTML('exercise:인클라인 벤치프레스'), /data-q-ex="exercise:디클라인 벤치프레스"/);
  assert.equal(familyChipsHTML('exercise:버피'), '');
});

// 2026-11-27 대표님: 가온핏 리니어 로우 + 와이드·내로우 그립
test('머신 로우 그립 방식과 가온핏 리니어 로우', async () => {
  const {genericMachinesFor, brandsOf} = await import('../machines-catalog.js');
  assert.equal(familyOfExercise('exercise:와이드 그립 머신 로우').name, '머신 로우');
  assert.match(familyChipsHTML('exercise:아이소래터럴 로우'), /내로우 그립/);
  assert.ok(brandsOf('gm:row-iso').some(b => b.manufacturer === '가온핏' && b.model === 'Linear Row'));
  for (const id of ['exercise:아이소래터럴 로우', 'exercise:와이드 그립 머신 로우', 'exercise:내로우 그립 머신 로우'])
    assert.ok(genericMachinesFor(id).some(m => m.id === 'gm:row-iso'), id);
});
