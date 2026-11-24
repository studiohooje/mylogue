import test from 'node:test';
import assert from 'node:assert/strict';
import {EXERCISE_CATALOG} from '../catalog.js';
import {EXERCISE_META} from '../exercise-meta.js';
import {patternOf, patternOfByName} from '../exercise-knowledge.js';
// 4.28.0 밤샘 B-1: 기본 종목 분류는 표가 기준. 이름 규칙을 바꿔 표와 달라지면 여기서 알려 준다(일부러 바꾼 거면 도구로 표를 다시 만든다).
test('기본 종목 229개 모두 표에 있고, 앱은 표 값을 쓴다', () => {
 assert.equal(Object.keys(EXERCISE_META).length, EXERCISE_CATALOG.length);
 for (const e of EXERCISE_CATALOG) assert.equal(patternOf(e), EXERCISE_META[e.id].p, e.name);
});
test('이름 규칙과 표가 어긋나면 알린다(규칙을 고친 뒤 표를 다시 만들었는지)', () => {
 const diff = EXERCISE_CATALOG.filter(e => patternOfByName(e) !== EXERCISE_META[e.id].p).map(e => `${e.name}: 표 ${EXERCISE_META[e.id].p} / 규칙 ${patternOfByName(e)}`);
 assert.deepEqual(diff, []);
});
test('내 종목(표에 없음)은 이름 규칙으로', () => {
 assert.equal(patternOf({name: '노르딕 햄스트링 컬'}), '고립');
 assert.equal(patternOf({name: '할로우 홀드'}), '코어');
});
