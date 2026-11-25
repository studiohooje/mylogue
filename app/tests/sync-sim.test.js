import test from 'node:test';
import assert from 'node:assert/strict';
import {simulate} from '../tools/sync-sim.mjs';
// 5.0.6 밤샘: 기기 여러 대 + 서버 흉내(오프라인 수정·삭제, 읽은 뒤 다른 기기가 먼저 쓰는 경쟁, 충돌 고르기). 큰 실행은 node tools/sync-sim.mjs 20000
test('동기화 극단값 600가지: 바꾼 것은 말없이 사라지지 않고, 지어낸 값 없이, 결국 모두 같아진다', () => {
  const r = simulate({n: 600, seed: 3});
  assert.deepEqual(r.fails, {}, JSON.stringify(r.samples.slice(0, 2)));
  assert.ok(r.conflictsSeen > 0 && r.casFails > 0, '충돌·경쟁 상황이 실제로 만들어진다');
});
