import test from 'node:test';
import assert from 'node:assert/strict';
import {fuzz} from '../tools/sync-fuzz.mjs';
// 4.28.0 밤샘 E-2: 동기화 계획 무작위 시험(시드 고정). 전체 5만 가지는 node tools/sync-fuzz.mjs
test('동기화 무작위 5,000가지: 안 바뀐 것은 안 쓰고, 한쪽만 바뀐 건 그쪽이 이기고, 다시 계획하면 할 일이 없다', () => {
 const r = fuzz({n: 5000, seed: 7});
 assert.deepEqual(r.fails, {}, JSON.stringify(r.samples.slice(0, 3)));
 assert.ok(r.conflicts > 0); // 충돌 상황도 실제로 만들어진다
});
