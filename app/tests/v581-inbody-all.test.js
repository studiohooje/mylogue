// 2026-11-27 인바디 전체 기록·날짜 비율 그래프
import test from 'node:test';
import assert from 'node:assert/strict';
import {inbodyAllHTML, compositionCard, bodyOverviewHTML} from '../body-flow.js';
import {lineChart} from '../band-chart.js';

const ib = (date, sm, fm, fp) => ({id: date, date, measure: 'inbody', weight: 70, skeletalMuscle: sm, bodyFatMass: fm, bodyFatPct: fp});
const db = {body: [ib('2026-03-01', 31, 18, 22), ib('2026-06-15', 32, 16, 20), ib('2026-10-30', 33.6, 13, 16.6), ib('2026-11-01', 33.5, 13.3, 16.7), ib('2026-11-26', 34.2, 12.1, 15.2)], settings: {}};

test('인바디 카드: 점마다 날짜·값, 전체 기록 버튼', () => {
 const h = compositionCard(db);
 assert.match(h, /data-ib-all/);
 assert.match(h, /10\/30 · 33\.6</);
});
test('전체 기록: 월별 접기, 2주 넘게 빈 구간은 흐린 선, 1년 고르면 1년 안만', () => {
 const h = inbodyAllHTML(db, {range: 'all', k: 'skeletalMuscle', today: '2026-11-27'});
 assert.match(h, /class="rec-mon" open><summary><span>11월/);
 assert.match(h, /style="opacity:\.55"/);
 assert.match(h, /3월/);
 const y = inbodyAllHTML({...db, body: [ib('2025-01-01', 30, 20, 25), ...db.body]}, {range: 'year', today: '2026-11-27'});
 assert.match(y, /2025년 1월/, '목록은 전체');
});
test('선 그래프: at을 주면 날짜 비율 위치, gaps는 흐린 선', () => {
 const h = lineChart({vals: [1, 2, 3], at: [0, 0.1, 1], gaps: [false, false, true], color: '#fff'});
 assert.match(h, /data-x="2,11\.6,98"/);
 assert.match(h, /stroke-opacity="\.45"/);
});
test('체중 일간: 띄엄띄엄 잰 날도 날짜 비율', () => {
 const w = (date, weight) => ({id: date, date, weight, measure: 'scale'});
 const h = bodyOverviewHTML({body: [w('2026-11-01', 80), w('2026-11-02', 79.8), w('2026-11-27', 78)], settings: {}}, {view: 'day', today: '2026-11-27'});
 assert.match(h, /data-x="2,5\.69,98"/);
});
