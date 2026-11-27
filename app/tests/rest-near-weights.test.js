import test from 'node:test';
import assert from 'node:assert/strict';
import {nearWeights} from '../rest-screen.js';

// 2026-11-27 대표님: 쉬는 시간 무게 칩은 지금 무게 근처만
test('근처 무게 칩', () => {
  assert.deepEqual(nearWeights(20, 'kg', '머신'), [10, 15, 20, 25, 30, 35]);
  assert.deepEqual(nearWeights(12, 'kg', '덤벨'), [8, 10, 12, 14, 16, 18]);
  assert.deepEqual(nearWeights(5, 'kg', '머신'), [5, 10, 15, 20, 25, 30]); // 0 이하는 빼고 위로 채움
  assert.deepEqual(nearWeights(4, 'level'), [2, 3, 4, 5, 6, 7]);
  assert.deepEqual(nearWeights(45, 'lb', '바벨'), [25, 35, 45, 55, 65, 75]);
});

// 2026-11-27 대표님: 머신 프리처 컬처럼 양손이 기본이어도 한쪽씩을 고를 수 있게
test('한쪽씩을 고를 수 있는 종목', async () => {
  const {canSingle} = await import('../rest-screen.js');
  const {EXERCISE_CATALOG: C} = await import('../catalog.js');
  const ex = n => C.find(x => x.name === n);
  assert.ok(canSingle(ex('머신 프리처 컬')));
  assert.ok(canSingle(ex('라잉 레그 컬')));
  assert.equal(canSingle(ex('레그 익스텐션')), false); // 싱글 레그 레그 익스텐션이 따로 있음
  assert.equal(canSingle(ex('고블릿 스쿼트')), false);
  assert.ok(canSingle(ex('케틀벨 스윙')));
  assert.ok(canSingle(ex('덤벨 컬')));
  assert.equal(canSingle(ex('원암 덤벨 로우')), false);
  assert.equal(canSingle(ex('벤치프레스')), false);
  assert.equal(canSingle(ex('푸시업')), false);
  assert.equal(canSingle(null), false);
});
