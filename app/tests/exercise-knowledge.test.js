import test from 'node:test';
import assert from 'node:assert/strict';
import {patternOf,cautionsOf,ladderOf,alternativesFor,validLadders,LADDERS,firstTimes} from '../exercise-knowledge.js';

test('사다리 종목 이름은 모두 도감에 있다', () => {
 for(const l of LADDERS){const v=validLadders().find(x=>x.id===l.id);assert.deepEqual(v?.steps,l.steps,l.id)}
});
test('움직임 유형·주의 관절·단계·대체 운동', () => {
 assert.equal(patternOf('벤치프레스'),'수평 밀기');assert.equal(patternOf('랫풀다운'),'수직 당기기');assert.equal(patternOf('데드리프트'),'힌지');assert.equal(patternOf('사이드 레터럴 레이즈'),'고립');
 assert.ok(cautionsOf('데드리프트').includes('허리'));assert.ok(cautionsOf('스쿼트').includes('무릎'));
 const l=ladderOf('푸시업');assert.equal(l.easier,'니 푸시업');assert.equal(l.harder,'다이아몬드 푸시업');
 const alt=alternativesFor('바벨 컬').map(x=>x.name);assert.ok(alt.length>=2);assert.ok(!alt.includes('바벨 컬'));
 assert.ok(alternativesFor('스쿼트',{avoidJoint:'무릎'}).every(x=>!cautionsOf(x).includes('무릎')));
});
test('처음 해낸 단계(계획·미완료 제외)', () => {
 const w=[{date:'2026-11-01',exercises:[{name:'니 푸시업',sets:[{completed:true}]}]},{date:'2026-11-10',exercises:[{name:'푸시업',sets:[{completed:true}]}]},{date:'2026-11-20',planned:true,exercises:[{name:'디클라인 푸시업',sets:[{completed:true}]}]}];
 const f=firstTimes(w);assert.deepEqual(f.map(x=>x.name).sort(),['니 푸시업','푸시업']);
});
