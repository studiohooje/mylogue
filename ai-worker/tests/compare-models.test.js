// 4.29.x 모델 비교 도구: 모델 적는 법, 문제 고르기(종류별 고르게·고정), 사진 채점, 키 없는 시험 실행
import test from 'node:test';
import assert from 'node:assert/strict';
import os from 'node:os';
import fs from 'node:fs';
import path from 'node:path';
import {parseModel, pickQuestions, scorePhoto, run} from '../tools/compare-models.mjs';

test('모델 적는 법', () => {
 assert.deepEqual(parseModel('openai:gpt-5-nano'), {provider: 'openai', model: 'gpt-5-nano', base: 'https://api.openai.com/v1/', label: 'openai:gpt-5-nano'});
 assert.equal(parseModel('compat:my-model@https://x.example/v1').base, 'https://x.example/v1');
 assert.throws(() => parseModel('gpt-5-nano'));
 assert.throws(() => parseModel('who:m'));
});
test('문제 고르기: 종류별 고르게, 같은 seed면 같은 문제', () => {
 const all = Array.from({length: 60}, (_, i) => ({id: `Q${i}`, category: ['a', 'b', 'c'][i % 3]}));
 const p = pickQuestions(all, 9, 3);
 assert.equal(p.length, 9);
 assert.deepEqual(Object.values(p.reduce((m, q) => (m[q.category] = (m[q.category] || 0) + 1, m), {})), [3, 3, 3]);
 assert.deepEqual(pickQuestions(all, 9, 3).map(q => q.id), p.map(q => q.id));
});
test('사진 채점: 이름 0.6 + 열량 ±15% 0.4', () => {
 const F = '`'.repeat(3), ans = items => `${F}json\n${JSON.stringify({mylogue: 1, records: [{type: 'meal', items}]})}\n${F}`;
 const prods = [{brand: '맛있닭', name: '닭가슴살 스테이크', variant: '오리지널', kcal: 165}];
 assert.equal(scorePhoto(prods, ans([{name: '맛있닭 닭가슴살 스테이크', qty: 1, unit: '팩', kcal: 170}])), 1);
 assert.equal(scorePhoto(prods, ans([{name: '닭가슴살 스테이크', qty: 1, unit: '팩', kcal: 300}])), 0.6);
 assert.equal(scorePhoto(prods, ans([{name: '바나나', kcal: 165}])), 0);
 assert.equal(scorePhoto(prods, '모르겠어요'), 0);
});
test('키 없는 시험 실행: 결과표·답·나란히 파일을 만들고 호출하지 않는다', async () => {
 const out = fs.mkdtempSync(path.join(os.tmpdir(), 'cmp-'));
 const r = await run({a: 'anthropic:claude-haiku-5-5', b: 'openai:gpt-5-nano', n: 16, photos: 2, maxWon: 1, out, dry: true, reasoning: 'minimal', tokenField: '', usdKrw: 1450, seed: 7}, {log: () => {}});
 assert.ok(fs.existsSync(path.join(out, '결과.md')) && fs.existsSync(path.join(out, '나란히.csv')));
 assert.ok(r.A.text > r.B.text);
 assert.equal(r.stopped, '');
});
