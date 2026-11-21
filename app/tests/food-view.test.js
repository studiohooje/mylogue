import test from 'node:test';
import assert from 'node:assert/strict';
import {emptyDB,cleanMeal} from '../domain.js';
import {renderFoodPage} from '../food-view.js';

test('AI가 남긴 영양 근거·정정 메모는 사용자 화면에 보이지 않는다(4.0.0, 데이터는 보관)',()=>{
 const db=emptyDB(),date='2026-11-18';
 db.meals=[cleanMeal({date,name:'예시 음식',calories:200,servingQty:1,servingUnit:'개',loggedAt:'2026-11-18T10:00:00+09:00',aiEvidence:{source:'제품 라벨',servingBasis:'1개',sourceUrl:'https://example.com/label'}})];
 const html=renderFoodPage(db,date);
 assert.doesNotMatch(html,/영양 근거/);
 assert.doesNotMatch(html,/example.com\/label/);
 assert.equal(db.meals[0].aiEvidence.source,'제품 라벨');
 db.meals[0].aiEvidence.sourceUrl='javascript:alert(1)';
 assert.doesNotMatch(renderFoodPage(db,date),/href="javascript:/);
});
