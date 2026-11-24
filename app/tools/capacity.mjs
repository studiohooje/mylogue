// 4.28.0 밤샘 E-4: 오래 쓴 사용자(1·3·5년)의 저장 크기와 열기·저장·계산 시간 기준선. 실행: node tools/capacity.mjs
import {makeUser} from './sim-users.mjs';
import {normalizeDB, mealTotals} from '../domain.js';
import {cloudRecords} from '../cloud-model.js';
import {myMaintenance} from '../maintenance.js';
import {renderFoodPage} from '../food-view.js';
import {dietFlowHTML} from '../diet-trends.js';
const t = fn => { const a = performance.now(); const r = fn(); return [r, Math.round(performance.now() - a)]; };
const rows = [];
for (const years of [1, 3, 5]) {
 const {db} = makeUser(0, {days: 365 * years, seed: 3}); // steady 유형(하루 식사 1~4번·운동)
 const json = JSON.stringify(db);
 const [n, tOpen] = t(() => normalizeDB(JSON.parse(json), {lenient: true}));
 const [rec, tRec] = t(() => cloudRecords(n));
 const [, tMaint] = t(() => myMaintenance(n, '2026-11-24'));
 const [, tFood] = t(() => renderFoodPage(n, '2026-11-24'));
 const [, tFlow] = t(() => dietFlowHTML(n, {metric: 'score', period: 90, end: '2026-11-24'}));
 rows.push({years, meals: n.meals.length, body: n.body.length, workouts: n.workouts.length, sizeKB: Math.round(json.length / 1024), recordKeys: Object.keys(rec).length, openMs: tOpen, recordsMs: tRec, maintMs: tMaint, foodPageMs: tFood, flowMs: tFlow});
}
console.table(rows);
console.log('localStorage 한도(브라우저 약 5MB) 대비:', rows.map(r => `${r.years}년 ${(r.sizeKB / 5120 * 100).toFixed(0)}%`).join(' · '), '(동기화 직전 사본은 IndexedDB, 사진은 별도 IndexedDB)');
