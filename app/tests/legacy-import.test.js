import test from 'node:test';
import assert from 'node:assert/strict';
import {parseCodexRecord} from '../ai-adapter.js';
import {importBody} from '../domain.js';

test('이전 마웨로그 숫자 파일도 마이로그에서 가져온다', () => {
  const meal = parseCodexRecord({type:'myweightlog.meal',version:1,meal:{date:'2026-11-01',name:'현미밥',servingQty:210,servingUnit:'g',calories:300}});
  assert.equal(meal.kind,'meals');
  const workout = parseCodexRecord({type:'myweightlog.workout',version:1,workout:{date:'2026-11-01',title:'하체',exercises:[{name:'레그프레스',sets:[{weight:40,reps:15}]}]}});
  assert.equal(workout.kind,'workouts');
  assert.equal(importBody({type:'myweightlog.body',version:1,measurement:{date:'2026-11-01',weight:72.4}}).weight,72.4);
});

test('새 마이로그 형식 파일을 가져온다', () => {
  assert.equal(parseCodexRecord({type:'mylogue.meal',version:1,meal:{date:'2026-11-01',name:'닭가슴살',servingQty:200,servingUnit:'g'}}).kind,'meals');
  assert.equal(importBody({type:'mylogue.body',version:1,measurement:{date:'2026-11-01',weight:70}}).weight,70);
});
