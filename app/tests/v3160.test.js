import test from 'node:test';
import assert from 'node:assert/strict';
import {parsePaste, extractCode, matchMachine, aiContextText, aiInputHTML, AI_PROMPT} from '../ai-paste.js';
import {findExercise} from '../catalog.js';
import {quickFoodCandidates} from '../quick-entry.js';

const answer = `점심 기록했어요! 제육덮밥은 식당 1인분 기준으로 추정했어요.
\`\`\`json
{"mylogue":1,"said":"점심 제육덮밥, 콜라 한 캔. 저녁 하체. 45도 레그프레스 100키로 12개 3세트. 아침 체중 72.4",
"records":[
 {"type":"meal","date":"2026-11-21","time":"12:30","slot":"점심","items":[
  {"name":"제육덮밥","qty":1,"unit":"그릇","kcal":850,"carbs":105,"protein":35,"fat":28,"estimate":{"kcal":[700,1000],"basis":"식당 1인분 기준 추정"}},
  {"name":"코카콜라","qty":355,"unit":"ml","kcal":150,"carbs":39,"protein":0,"fat":0},
 ]},
 {"type":"workout","date":"2026-11-21","time":"19:00","title":"하체","exercises":[
  {"name":"레그 프레스","machine":"45도 레그프레스","sets":3,"weight":100,"unit":"kg","reps":12},
  {"name":"러닝머신","minutes":20,"km":3}
 ]},
 {"type":"body","date":"2026-11-21","weight":72.4,"bodyFat":null}
]}
\`\`\`
확인하고 확정해 주세요.`;

test('AI 답(설명 글·코드 블록·끝 쉼표 포함)을 식사·운동·몸 초안으로 바꾼다', () => {
 const d = parsePaste(answer);
 assert.deepEqual(d.map(x => x.type), ['meal','workout','body']);
 const meal = d[0].parsedData.items;
 assert.equal(meal.length, 2);
 assert.equal(meal[0].servingUnit, '그릇');
 assert.equal(meal[0].calories, 850);
 assert.equal(meal[0].aiEstimate.caloriesMin, 700);
 assert.equal(meal[0].slot, '점심');
 assert.equal(meal[1].aiEstimate, undefined);
 const w = d[1].parsedData;
 assert.equal(w.exercises[0].machineId, 'gm:leg-press-45');
 assert.equal(w.exercises[0].sets.length, 3);
 assert.deepEqual(w.exercises[0].primaryMuscleIds, ['quads','glutes']);
 assert.equal(w.exercises[1].kind, 'cardio');
 assert.equal(w.exercises[1].durationMin, 20);
 assert.equal(d[2].parsedData.weight, 72.4);
 assert.match(d[0].originalUtterance, /제육덮밥/);
});

test('둥근 따옴표·한 기록만·코드 블록 없이도 읽고, 틀리면 어느 기록인지 알려 준다', () => {
 assert.equal(extractCode('{“type”:“body”,“weight”:70}').type, 'body');
 assert.equal(parsePaste('{"type":"체중","weight":70}')[0].type, 'body');
 assert.throws(() => parsePaste('그냥 인사말'), /마이로그 코드를 찾지 못했어요/);
 assert.throws(() => parsePaste('{"records":[{"type":"meal","items":[{"name":"밥","kcal":-5}]}]}'), /1번째 기록\(식사\)/);
 assert.throws(() => parsePaste('{"records":[{"type":"sleep"}]}'), /종류\(type\)/);
});

test('lb 세트·제조사 머신 이름을 맞춘다', () => {
 const d = parsePaste('{"type":"workout","exercises":[{"name":"레그 프레스","machine":"Hammer Strength Linear Leg Press","sets":[{"lb":225,"reps":10}]}]}');
 const ex = d[0].parsedData.exercises[0];
 assert.equal(ex.machineId, 'bm:hammer-strength:plate-loaded:linear-leg-press');
 assert.equal(ex.sets[0].unit, 'lb');
 assert.equal(ex.sets[0].weight, 225);
 assert.equal(matchMachine('없는 머신', findExercise('레그 프레스')), null);
});

test('지시문은 무료·휴대폰 AI에서도 쓰도록 형식과 중복 방지 규칙을 담는다', () => {
 assert.match(AI_PROMPT, /"mylogue":1/);
 assert.match(AI_PROMPT, /전에 쓴 이름·단위·값을 그대로/);
 const html = aiInputHTML({}, {pending:2, ready:true});
 assert.match(html, /무료 버전·휴대폰 앱 모두 괜찮아요/);
 assert.match(html, /id="ai-copy-prompt"/);
 assert.match(html, /id="ai-copy-mine"/);
 assert.match(html, /data-page="ai-inbox"/);
 assert.match(aiInputHTML({}, {ready:false}), /승인된 계정/);
});

test('AI로 확정한 음식은 오래돼도 내 값으로 하나만 남고, 내 목록 복사에 들어간다', () => {
 const meal = (d, kcal) => ({id:'m'+d+kcal, date:d, name:'제육덮밥', servingQty:1, servingUnit:'그릇', calories:kcal, carbs:100, protein:30, fat:25, source:'ai-estimated', updatedAt:d});
 const old = Array.from({length:30}, (_, i) => ({id:'x'+i, date:'2026-11-20', name:'음식'+i, servingQty:1, servingUnit:'회', calories:100}));
 const db = {meals:[meal('2026-10-01', 850), meal('2026-10-05', 900), ...old], foods:[]};
 const list = quickFoodCandidates(db).filter(f => f.name==='제육덮밥');
 assert.equal(list.length, 1);
 assert.equal(list[0].calories, 900);
 assert.equal(list[0].personal, true);
 const text = aiContextText({...db, foods:[{name:'내 쉐이크', servingQty:1, servingUnit:'잔', calories:180}], workouts:[{date:'2026-11-20', exercises:[{name:'레그 프레스', machineId:'gm:leg-press-45'}]}]});
 assert.match(text, /음식29 · 1회 · 100kcal/, '오래된 기록·한 번만 먹은 것도 들어간다');
 assert.match(text, /내 쉐이크 · 1잔 · 180kcal/);
 assert.equal((text.match(/제육덮밥/g)||[]).length, 1, '같은 음식은 한 줄');
 assert.match(text, /제육덮밥 · 1그릇 · 900kcal/);
 assert.doesNotThrow(() => aiContextText({}));
 assert.match(text, /레그 프레스 · 45° 레그 프레스/);
});
