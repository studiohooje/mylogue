import test from 'node:test';
import assert from 'node:assert/strict';
import {allCases,PERSONAS,SITUATIONS} from '../tools/coach-cases.mjs';
import {analyze} from '../coach-engine.js';
import {hasBanned,KNOWLEDGE} from '../coach-knowledge.js';

// 4.17.0 케이스 스터디 정답지: 사람 유형 12 × 상황 12 = 144건. 규칙을 바꿀 때마다 전부 통과해야 한다.
test('코칭 정답지 144건 — 알아챌 신호, 하면 안 되는 말, 금지어', () => {
 const cases=allCases();
 assert.equal(cases.length,PERSONAS.length*SITUATIONS.length);
 const fails=[];
 for(const cs of cases){
  const r=analyze(cs.db,cs.today),ids=r.map(x=>x.id);
  const miss=cs.expect.filter(x=>!ids.includes(x)),bad=cs.forbid.filter(x=>ids.includes(x)),ban=r.flatMap(x=>hasBanned(x.text));
  if(miss.length||bad.length||ban.length)fails.push(`${cs.id} 빠짐:${miss} 금지:${bad} 금지어:${ban}`);
 }
 assert.deepEqual(fails,[]);
});
test('안전 신호가 있으면 감량 정보(단백질·정체기)는 내지 않는다', () => {
 for(const cs of allCases()){const r=analyze(cs.db,cs.today);if(r.some(x=>x.level==='safety'))assert.ok(!r.some(x=>['info.protein-low','info.glp1-protein','info.plateau'].includes(x.id)),cs.id)}
});
test('지식 베이스 항목은 출처와 근거 수준이 있다', () => {
 for(const k of KNOWLEDGE){assert.ok(k.source&&['A','B','C'].includes(k.evidence),k.id)}
});
