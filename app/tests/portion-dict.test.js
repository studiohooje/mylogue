import test from 'node:test';
import assert from 'node:assert/strict';
import {readAmount,portionOf,readQty,isShareFood,shareFactor} from '../portion-dict.js';

test('말하는 양을 수량·단위로 읽는다', () => {
 const cases={'밥 반 공기':[0.5,'공기','밥'],'치킨 두 조각':[2,'조각','치킨'],'피자3조각':[3,'조각','피자'],'현미밥 1공기 반':[1.5,'공기','현미밥'],'치킨 반 마리':[0.5,'마리','치킨'],'오이 두 개':[2,'개','오이'],'라면 1/2개':[0.5,'개','라면'],'삼겹살 2인분':[2,'인분','삼겹살']};
 for(const [t,[q,u,rest]] of Object.entries(cases)){const r=readAmount(t);assert.equal(r.qty,q,t);assert.equal(r.unit,u,t);assert.equal(r.rest,rest,t)}
 assert.equal(readQty('세'),3);assert.equal(readQty('반'),0.5);assert.equal(readQty('2.5'),2.5);
});
test('음식 종류별 g, 비율 단위, 일반 단위', () => {
 assert.equal(portionOf('현미밥','공기').grams,210);
 assert.equal(portionOf('김치찌개','그릇').grams,200);
 assert.equal(portionOf('피자','조각').perWhole,0.125);
 assert.equal(portionOf('처음 보는 음식','큰술').grams,15);
 assert.equal(portionOf('처음 보는 음식','공기'),null);
});
test('나눠 먹는 음식과 내 몫', () => {
 assert.ok(isShareFood('후라이드치킨'));assert.ok(isShareFood('족발'));assert.ok(!isShareFood('현미밥'));
 assert.equal(shareFactor(3),1/3);assert.equal(shareFactor(0),1);
});
