// 4.20.0 사진 스캔 이펙트: AI가 사진을 보는 동안에만, 하는 일 문구가 차례로
import test from 'node:test';
import assert from 'node:assert/strict';
import {scanHTML, scanLayerHTML, FOOD_STEPS} from '../scan-fx.js';
import {aiInputHTML} from '../ai-paste.js';

test('스캔 이펙트: 빛줄기·격자·모서리·찾은 지점·하는 일 문구', () => {
  const html = scanHTML(['data:image/jpeg;base64,AAAA']);
  for (const c of ['scan-beam', 'scan-grid', 'scan-corners', 'scan-dot', 'scan-label']) assert.match(html, new RegExp(c));
  for (const s of FOOD_STEPS) assert.ok(html.includes(s));
  assert.match(html, /role="status"/);
  assert.doesNotMatch(scanLayerHTML([]), /<b>/);
  assert.match(scanHTML(['a', 'b']), /scan-fx two/);
});

test('AI 정리: 사진을 넣고 정리 중일 때만 스캔, 평소엔 작은 미리보기', () => {
  const photos = ['AAAA'];
  assert.match(aiInputHTML({photos, asking: true}, {server: true}), /scan-fx/);
  assert.doesNotMatch(aiInputHTML({photos, asking: false}, {server: true}), /scan-fx/);
  assert.match(aiInputHTML({photos, asking: false}, {server: true}), /ai-photo-thumbs/);
});
