// 4.29.x 시 칩 → 10분 칩(대표님 2026-11-25): 시를 누르면 그 시의 10분 칩, 같은 시를 다시 누르면 처음 칩, 직접 입력 칸은 늘 있음
import test from 'node:test';
import assert from 'node:assert/strict';
import {hourMinuteChipsHTML, toggleHour, setManualTime, mealWhenBarHTML} from '../meal-when.js';

test('시를 누르면 정각으로 열리고, 같은 시를 다시 누르면 접힌다(시각은 그대로)', () => {
 const s = {when: 'past', date: '2026-11-25', time: '12:00', hourOpen: null};
 toggleHour(s, 10); assert.equal(s.time, '10:00'); assert.equal(s.hourOpen, 10);
 s.time = '10:30'; toggleHour(s, 10); assert.equal(s.hourOpen, null); assert.equal(s.time, '10:30');
});
test('열린 상태: 그 시 칩 + 10·20·30·40·50분 칩 + 직접 입력 칸, 다른 시 칩은 없다', () => {
 const html = hourMinuteChipsHTML({hours: ['12:00', '11:00', '10:00'], time: '10:20', openHour: 10});
 assert.match(html, /data-q-when-hour="10"/); assert.doesNotMatch(html, /data-q-when-hour="11"/);
 for (const m of ['10', '20', '30', '40', '50']) assert.match(html, new RegExp(`data-q-when-time="10:${m}"`));
 assert.match(html, /class="chip active" data-q-when-time="10:20"/);
 assert.match(html, /type="time" data-no-when data-q-when-manual value="10:20"/);
});
test('접힌 상태: 시 칩 전부 + 직접 입력 칸', () => {
 const html = hourMinuteChipsHTML({hours: ['12:00', '11:00', '10:00'], time: '10:35', openHour: null});
 assert.equal((html.match(/data-q-when-hour=/g) || []).length, 3);
 assert.match(html, /class="chip active" data-q-when-hour="10"/);
 assert.match(html, /data-q-when-manual value="10:35"/);
});
test('오늘 전에 먹은 것: 지금보다 뒤 분 칩은 숨긴다', () => {
 const s = {when: 'past', date: '2026-11-25', time: '11:00', hourOpen: 11};
 const html = mealWhenBarHTML(s, new Date('2026-11-25T11:25:00'));
 assert.match(html, /data-q-when-time="11:20"/); assert.doesNotMatch(html, /data-q-when-time="11:30"/);
});
test('직접 입력: 형식이 맞을 때만 바꾸고, 그 시로 연다', () => {
 const s = {time: '10:00', hourOpen: null};
 assert.equal(setManualTime(s, '10:35'), true); assert.equal(s.time, '10:35'); assert.equal(s.hourOpen, 10);
 assert.equal(setManualTime(s, ''), false); assert.equal(s.time, '10:35');
});

test('2026-11-28 미리 먹을 것: 13시 05분에 13시 칸이 있고, 누르면 13:10부터, 13:30도 고를 수 있다', async () => {
 const {hourChips, mealWhenBarHTML} = await import('../meal-when.js');
 const pad = n => String(n).padStart(2, '0'), now = new Date(2026, 10, 28, 13, 5), D = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
 assert.equal(hourChips('plan', D, now)[0], '13:00');
 assert.equal(hourChips('plan', D, new Date(2026, 10, 28, 13, 55))[0], '14:00', '13:55면 13시에 남은 칸이 없다');
 const s = {when: 'plan', date: D, time: '14:00'};
 toggleHour(s, 13, now); assert.equal(s.time, '13:10'); assert.equal(s.hourOpen, 13);
 const h = mealWhenBarHTML(s, now);
 assert.match(h, /data-q-when-time="13:30"/); assert.doesNotMatch(h, /data-q-when-time="13:00"/);
});
