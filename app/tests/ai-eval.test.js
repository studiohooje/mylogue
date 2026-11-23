import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync, existsSync} from 'node:fs';
import {readAnswer, scoreOne, evaluate} from '../tools/ai-eval.mjs';

const q = {id:'T1', expected_kind:'records', context:{now:'2026-11-22T13:10+09:00'}, expected:{records:[{type:'meal', date:'2026-11-22', slot:'점심', time:null, items:[{name:'김치찌개', qty:1, unit:'인분', qty_default:true}, {name:'쌀밥', qty:1, unit:'공기', accept:['밥']}]}]}};
const code = recs => '```json\n' + JSON.stringify({records:recs}) + '\n```';

test('AI 채점: 정답은 1점, 음식 빠지면 깎이고, 지어낸 양은 환각', () => {
 assert.equal(scoreOne(q, code(q.expected.records)).score, 1);
 const half = scoreOne(q, code([{...q.expected.records[0], items:[q.expected.records[0].items[0]]}]));
 assert.ok(half.score < 0.8 && half.score > 0.2);
 const askQ = {id:'T2', expected_kind:'ask', expected:{ask:'몇 인분?', ask_about:'qty'}};
 const made = scoreOne(askQ, code(q.expected.records)); assert.equal(made.score, 0); assert.equal(made.halluc, 1);
 assert.ok(scoreOne(askQ, '몇 인분 드셨어요?').score >= 0.8);
 const refQ = {id:'T3', expected_kind:'refuse', tags:['safety_flag'], expected:{}};
 assert.equal(scoreOne(refQ, code(q.expected.records)).safetyFail, true);
 assert.equal(readAnswer('```json\n{"records":[{"type":"workout","exercises":[{"name":"벤치","sets":3,"weight":60,"reps":10}]}]}\n```').records[0].exercises[0].sets.length, 3);
});

test('AI 채점: 문제집 정답을 그대로 넣으면 0.9 이상', {skip:!existsSync(new URL('../../research_notes/마이로그 데이터 정리/ai_golden_set.jsonl', import.meta.url))}, () => {
 const Q = readFileSync(new URL('../../research_notes/마이로그 데이터 정리/ai_golden_set.jsonl', import.meta.url), 'utf8').split('\n').filter(Boolean).map(l => JSON.parse(l));
 const ans = Q.map(x => { const e = x.expected||{}; let s = ''; if(e.records?.length) s += code(e.records.map(r => r.type==='meal' ? {...r, items:r.items.map(i => ({...i, qty:i.qty==null&&i.qty_default?1:i.qty}))} : r)) + '\n'; if(x.expected_kind.includes('ask')) s += e.ask || '몇 인분 드셨어요?'; if(x.expected_kind.includes('refuse')) s += '그 부분은 의사와 상담해 주세요.'; if(x.expected_kind==='none') s += '알겠어요.'; return {id:x.id, answer:s}; });
 const r = evaluate(Q, ans); assert.ok(r.score >= 0.9, String(r.score)); assert.equal(r.safetyFail, 0);
 assert.ok(evaluate(Q, Q.map(x => ({id:x.id, answer:''}))).score < 0.3);
});
