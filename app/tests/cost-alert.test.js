// 4.29.x 슈퍼관리자 AI 비용 알림: 70·90·100% 단계, 오늘 상한, 확인하면 다시 안 뜸, 한 시간에 한 번만 서버에 묻기
import test from 'node:test';
import assert from 'node:assert/strict';
const mem = new Map();
globalThis.localStorage = {getItem: k => mem.get(k) ?? null, setItem: (k, v) => mem.set(k, String(v)), removeItem: k => mem.delete(k)};
const {costItems, refreshCostInfo, markCostSeen, costLineHTML} = await import('../cost-alert.js');
const g = (monthWon, extra = {}) => ({day: '2026-11-25', month: '2026-11', monthWon, dayWon: 100, dailyCap: 1000, monthlyCap: 30000, alertWon: 20000, ...extra});

test('알림 기준의 70·90·100%에서 단계별로 하나씩', () => {
 assert.equal(costItems(g(13000), {seen: new Set()}).length, 0);
 assert.match(costItems(g(14000), {seen: new Set()})[0].title, /70%/);
 assert.match(costItems(g(18500), {seen: new Set()})[0].title, /90%/);
 assert.match(costItems(g(21000), {seen: new Set()})[0].title, /넘었어요/);
 assert.equal(costItems(null).length, 0);
});
test('오늘 상한에 닿으면 따로 알림', () => {
 const items = costItems(g(100, {dayWon: 1000}), {seen: new Set()});
 assert.ok(items.some(x => /오늘 AI 사용 상한/.test(x.title)));
});
test('확인한 단계는 다시 안 뜨고, 다음 단계는 뜬다', () => {
 markCostSeen('cost:2026-11:70');
 assert.equal(costItems(g(14000)).length, 0);
 assert.equal(costItems(g(18500)).length, 1);
});
test('서버에는 한 시간에 한 번만 묻는다(화면을 여러 번 그려도)', async () => {
 let calls = 0; const fetchMe = async () => { calls++; return {global: g(5000)}; };
 await refreshCostInfo(fetchMe, {now: 1_000_000, force: true});
 await refreshCostInfo(fetchMe, {now: 1_000_000 + 10 * 60_000});
 await refreshCostInfo(fetchMe, {now: 1_000_000 + 30 * 60_000});
 assert.equal(calls, 1);
 await refreshCostInfo(fetchMe, {now: 1_000_000 + 61 * 60_000});
 assert.equal(calls, 2);
});
test('설정 한 줄: 장부 금액·알림 기준·실제 청구 안내', () => {
 assert.match(costLineHTML(g(5000)), /5,000원.*20,000원.*25%/);
 assert.match(costLineHTML(g(5000)), /각 회사 콘솔/);
});
