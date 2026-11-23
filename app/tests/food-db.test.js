import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync, existsSync} from 'node:fs';
import {unitName, buildRows} from '../tools/food-bundle.mjs';
import {setFoodRows, searchFoodDB, rowToFood, findFoodDB} from '../food-db.js';

test('음식 DB 단위 이름', () => {
 assert.equal(unitName('1그릇(뚝배기)'), '그릇');
 assert.equal(unitName('1회 제공량 762g'), '회');
 assert.equal(unitName('1회 제공량 473ml', 'ml'), '잔');
 assert.equal(unitName('전체 200g'), '개');
 assert.equal(unitName('1토막/1인분'), '토막');
 assert.equal(unitName('g'), '');
});

test('음식 DB 묶기: 한식 1회분, 밀도 1.0 추정, 프랜차이즈 식약처 행 제외, 통 전체는 100당, 빈 값 null', () => {
 const rows = buildRows({
  dishes:[{name:'비빔밥', defaultUnit:{label:'1그릇 (표준)', g:500}, nutrientsPerServing:{kcal:710, carbs:112.5, protein:22.35, fat:19.05}},
          {name:'장어덮밥', defaultUnit:{label:'1그릇', g:400}, nutrientsPerServing:null, source:{representative:{basis:'100ml', per100:{kcal:150, carbs:20, protein:8, fat:4}}}}],
  foodsDish:[{name:'비빔밥', basis:'g', per100:{kcal:142}, units:[{label:'1인분', g:450, default:true}]},
             {name:'흰죽', basis:'ml', per100:{kcal:64, carbs:13.49, protein:1.2, fat:0.28}, units:[{label:'1인분', ml:291.9, default:true}]},
             {name:'피자', maker:'피자집', basis:'g', per100:{kcal:250}, units:[]}],
  foodsRaw:[{name:'멥쌀', per100:{kcal:441, carbs:36.81, protein:20.27, fat:26.11}}],
  products:[{name:'프로틴', brand:'오빠닭', brandDisplay:'오빠닭(허닭)', group:'protein', confidence:'high', per100g:{kcal:114, carbs:10, protein:20, fat:1}, units:[{label:'전체 3360g', g:3360, default:true}]},
            {name:'생크림 케이크', brand:'케이크집', group:'lowsugar', confidence:'medium', flags:['kcalDensityLow'], per100g:{kcal:9, carbs:0, protein:0, fat:0.9}, units:[]},
            {name:'치킨마요', brand:'한솥', group:'franchise', per100g:null, label:{basis:'per serving', servingLabel:'1개', kcal:647}, units:[]},
            {name:'양념치킨', brand:'기영이', group:'franchise', source:{type:'estimate'}, per100g:{kcal:278, carbs:20, protein:18, fat:15}, units:[]},
            {name:'고구마 피자 L', brand:'피자알볼로', group:'franchise', per100g:{kcal:252, carbs:null, protein:8.6, fat:null}, units:[{label:'1회 제공량 1260g', g:1260, default:true}]}],
 });
 const by = n => rows.filter(r => r[0] === n);
 assert.deepEqual(by('비빔밥').map(r => r[8]), ['k']);
 assert.deepEqual(by('장어덮밥')[0].slice(2, 9), ['그릇', 400, 600, 80, 32, 16, 'e']);
 assert.equal(by('흰죽')[0][2], '인분');
 assert.equal(by('피자').length, 0);
 assert.deepEqual(by('프로틴')[0].slice(1, 5), ['오빠닭(허닭)', 'g', 0, 114]);
 assert.equal(by('생크림 케이크')[0][10], 1); assert.equal(by('프로틴')[0].length, 10);
 assert.equal(rowToFood(by('생크림 케이크')[0]).dbDoubt, true); assert.match(rowToFood(by('생크림 케이크')[0]).aiEvidence.note, /확인 필요/);
 assert.deepEqual(by('치킨마요')[0].slice(1, 5), ['한솥', '개', 0, 647]); // 중량 없이 1개 값만
 assert.equal(by('양념치킨')[0][8], 'x'); // 추정 꼬리표
 const pz = by('고구마 피자 L')[0]; assert.equal(pz[5], null); assert.equal(pz[7], null); assert.equal(pz[8], 'f');
});

test('음식 DB 검색: 초성·한영 자판·정확도, 프리셋 계약', () => {
 setFoodRows([
  ['비빔밥', '', '그릇', 500, 710, 112.5, 22.4, 19.1, 'k', ''],
  ['돌솥비빔밥', '', '그릇', 0, 650, 100, 20, 18, 'd', ''],
  ['멥쌀', '', 'g', 0, 441, 36.8, 20.3, 26.1, 'r', ''],
  ['닭가슴살 스테이크', '오빠닭(허닭)', '팩', 100, 130, 5, 22, 2, 'p', '닭스테이크'],
 ]);
 assert.equal(searchFoodDB('비빔밥')[0].name, '비빔밥');
 assert.equal(searchFoodDB('ㅂㅂㅂ')[0].name, '비빔밥');
 assert.equal(searchFoodDB('qlqla')[0].name, '비빔밥');
 const chicken = searchFoodDB('오빠닭')[0];
 assert.equal(chicken.name, '닭가슴살 스테이크 · 오빠닭(허닭)');
 assert.equal(chicken.servingUnit, '팩'); assert.equal(chicken.servingQty, 1); assert.equal(chicken.unitGrams, 100);
 const rice = rowToFood(['멥쌀', '', 'g', 0, 441, 36.8, 20.3, 26.1, 'r', '']);
 assert.equal(rice.servingQty, 100); assert.equal(rice.servingUnit, 'g');
 assert.equal(findFoodDB(chicken.id).calories, 130);
 assert.equal(searchFoodDB('오빠닭 스테이크')[0].name, '닭가슴살 스테이크 · 오빠닭(허닭)'); // 낱말 순서 상관없이
});

test('앱 번들 food-db.json이 있으면 형식 확인', {skip:!existsSync(new URL('../food-db.json', import.meta.url))}, () => {
 const j = JSON.parse(readFileSync(new URL('../food-db.json', import.meta.url), 'utf8'));
 assert.ok(j.rows.length > 30000);
 for (const r of j.rows.slice(0, 2000)) { assert.ok(r.length === 10 || (r.length === 11 && r[10] === 1) || (r.length === 12 && (r[10] === 0 || r[10] === 1) && Array.isArray(r[11]) && r[11].length === 4)); assert.ok(typeof r[0] === 'string' && r[0]); assert.ok(r[4] !== null); }
 setFoodRows(j.rows);
 const kimchi = searchFoodDB('김치찌개')[0]; assert.ok(kimchi.sodium > 0, '미량영양소(나트륨)가 음식 객체로 나온다');
 for (const q of ['비빔밥', '김치찌개', '닭가슴살', '쌀밥', '아메리카노', '제육볶음']) assert.ok(searchFoodDB(q).length > 0, q);
});
