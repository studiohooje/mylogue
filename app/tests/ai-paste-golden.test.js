import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {judge} from '../tools/ai-paste-golden.mjs';
import {parsePaste, aiPreviewHTML} from '../ai-paste.js';
import {renderAIInbox} from '../ai-inbox.js';
import {emptyDB} from '../domain.js';
// 4.28.0 밤샘 D-4·F-3: AI 답 붙여넣기 해석 정답지 1,000건과 주입 묶음
const cases = JSON.parse(readFileSync(new URL('./fixtures/ai-paste-golden.json', import.meta.url), 'utf8'));
test('정답지 1,000건: 모양(코드 블록·설명·끝 쉼표·한국어 키·2팩·반 공기·1/2·lb·세트 줄임)이 달라도 같은 값으로 읽는다', () => {
 const bad = cases.map(c => ({id: c.id, ...judge(c)})).filter(x => !x.ok);
 assert.equal(cases.length, 1000);
 assert.deepEqual(bad.slice(0, 5), []);
});
test('채점기가 실제로 틀린 것을 잡는다', () => {
 const c = structuredClone(cases.find(x => x.expect.type === 'meal'));
 c.expect.items[0].qty += 1;
 assert.equal(judge(c).ok, false);
});
const PAYLOADS = ['<img src=x onerror=alert(1)>', '"><script>alert(1)</script>', '`${alert(1)}`', '{{constructor.constructor("alert(1)")()}}', "'; DROP TABLE meals; --", '‮역방향 글자', 'a'.repeat(5000)];
test('주입 묶음: 음식·운동 이름·말한 내용에 HTML·스크립트가 들어와도 미리보기·검토함에 그대로 찍히지 않는다', () => {
 for (const p of PAYLOADS) {
  const text = '```json\n' + JSON.stringify({mylogue: 1, said: p, records: [{type: 'meal', date: '2026-11-24', time: '12:00', items: [{name: p, qty: 1, unit: '개', kcal: 100, carbs: 10, protein: 5, fat: 3}]}, {type: 'workout', date: '2026-11-24', title: p, exercises: [{name: p, sets: 2, weight: 20, reps: 10}]}]}) + '\n```';
  let drafts; try { drafts = parsePaste(text); } catch { continue; } // 거절도 안전
  const html = aiPreviewHTML(text) + renderAIInbox(drafts.map((d, i) => ({id: `d${i}`, status: 'pending', createdAt: '2026-11-24T00:00:00Z', ...d})), emptyDB(), {local: true});
  assert.doesNotMatch(html, /<img src=x|<script>/, p);
 }
});
