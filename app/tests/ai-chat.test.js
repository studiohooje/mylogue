// 4.29.0 'AI 기록' 대화창: 답→카드, 양 바꾸기, 다른 음식, 서버로 보낼 대화, 예시 답(고치기·사진)
import test from 'node:test';
import assert from 'node:assert/strict';
import {replyToMsg, historyForServer, scaleItem, qtyOptions, swapItem, newChat, cardKcal, chatHTML} from '../ai-chat.js';
import {fakeConverse} from '../ai-chat-fake.js';

const F = '`'.repeat(3);
const rec = recs => `이렇게 기록할까요?\n${F}json\n${JSON.stringify({mylogue: 1, said: '점심', records: recs})}\n${F}`;
const meal = {type: 'meal', date: '2026-11-25', time: '12:30', items: [{name: '제육덮밥', qty: 1, unit: '그릇', kcal: 659, carbs: 92.3, protein: 19.6, fat: 23.5}, {name: '펩시', qty: 1, unit: '잔', kcal: 90, carbs: 22, protein: 0, fat: 0}]};
const esc = s => String(s).replace(/[&<>"]/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'})[c]);

test('AI 답의 코드는 카드가 되고 글에는 남지 않는다', () => {
 const m = replyToMsg(rec([meal]));
 assert.equal(m.role, 'ai');
 assert.equal(m.text, '이렇게 기록할까요?');
 assert.equal(m.cards.length, 1);
 assert.equal(m.cards[0].type, 'meal');
 assert.equal(m.cards[0].status, 'open');
 assert.equal(cardKcal(m.cards[0]), 749);
 assert.match(m.raw, /json/);
});
test('코드 없는 답은 글만, 빈 답은 안내 문장', () => {
 assert.equal(replyToMsg('단백질을 조금 더 드세요.').cards.length, 0);
 assert.match(replyToMsg('').text, /찾지 못했어요/);
});
test('서버로는 AI 원문(코드 포함)을 보내 고칠 때 전체 기록을 다시 만들 수 있다', () => {
 const st = newChat();
 st.msgs.push({role: 'user', text: '점심 제육덮밥'}, replyToMsg(rec([meal])), {role: 'note', text: '안내'}, {role: 'user', text: '', photos: ['x']});
 const h = historyForServer(st);
 assert.deepEqual(h.map(m => m.role), ['user', 'assistant', 'user']);
 assert.match(h[1].text, new RegExp(F));
 assert.equal(h[2].text, '(사진)');
 assert.equal(historyForServer({msgs: Array.from({length: 30}, (_, i) => ({role: 'user', text: `m${i}`}))}, 10).length, 10);
});
test('양 바꾸기는 1단위 값에 새 양을 곱하고 추정 범위도 함께 바꾼다', () => {
 const it = {name: '밥', servingQty: 1, servingUnit: '공기', calories: 300, carbs: 65, protein: 6, fat: 0.6, aiEstimate: {estimated: true, caloriesMin: 240, caloriesMax: 360}};
 const half = scaleItem(it, 0.5);
 assert.equal(half.servingQty, 0.5);
 assert.equal(half.calories, 150);
 assert.equal(half.carbs, 32.5);
 assert.equal(half.aiEstimate.caloriesMin, 120);
 assert.equal(scaleItem(half, 2).calories, 600);
 assert.equal(scaleItem(it, 0), it);
});
test('양 버튼: 개수 단위는 반·1·1.5·2와 지금 값, 무게 단위는 지금 값 앞뒤', () => {
 assert.deepEqual(qtyOptions({servingQty: 3, servingUnit: '개'}), [0.5, 1, 1.5, 2, 3]);
 assert.deepEqual(qtyOptions({servingQty: 100, servingUnit: 'g'}), [80, 100, 120]);
 assert.deepEqual(qtyOptions({servingQty: 350, servingUnit: 'g'}), [300, 350, 400]);
});
test('다른 음식: 무게 음식이면 지금 무게를, 아니면 같은 개수로 바꾸고 AI 추정은 지운다', () => {
 const chicken = {id: 'fooddb:k:1', name: '닭가슴살', servingUnit: 'g', calories: 110, carbs: 0, protein: 23, fat: 1.2};
 const a = swapItem({name: '닭고기', servingQty: 150, servingUnit: 'g', calories: 300, aiEstimate: {estimated: true}}, chicken);
 assert.equal(a.servingQty, 150);
 assert.equal(a.calories, 165);
 assert.equal(a.source, 'ai-reviewed');
 assert.equal(a.foodId, 'fooddb:k:1');
 assert.equal(a.aiEstimate, undefined);
 const bowl = {id: 'x', name: '제육덮밥', servingUnit: '그릇', calories: 659, carbs: 92, protein: 20, fat: 23};
 const b = swapItem({name: '덮밥', servingQty: 2, servingUnit: '인분', calories: 900}, bowl);
 assert.equal(b.servingQty, 2);
 assert.equal(b.calories, 1318);
});
test('대화창 화면: 카드·양 버튼·사진 갈래·입력칸이 그려진다', () => {
 const st = newChat();
 st.msgs.push({role: 'user', text: '점심 <b>'}, replyToMsg(rec([meal])));
 const html = chatHTML(st, esc, {plus: true, left: 17, connected: true});
 assert.match(html, /data-chat-save="1\|0"/);
 assert.match(html, /data-chat-qty="1\|0\|0\|0.5"/);
 assert.match(html, /data-chat-swap="1\|0\|1"/);
 assert.match(html, /id="chat-text"/);
 assert.ok(!html.includes('점심 <b>'), '사람이 쓴 글은 이스케이프');
 st.thumbs = ['data:image/jpeg;base64,AA']; st.photos = ['AA']; st.choose = true;
 assert.match(chatHTML(st, esc, {plus: false, connected: true}), /data-chat-photo="only"/);
});
test('예시 답: 질문은 글, 고치기는 앞 기록을 고쳐 다시, 사진은 체중계·포장지', () => {
 const q = fakeConverse({messages: [{role: 'user', text: '저녁 뭐 먹을까?'}]});
 assert.ok(!q.text.includes(F));
 const fixed = fakeConverse({messages: [{role: 'user', text: '점심'}, {role: 'assistant', text: rec([meal])}, {role: 'user', text: '아 콜라는 제로였어'}]});
 const m = replyToMsg(fixed.text).cards[0];
 assert.equal(m.parsedData.items[1].name, '펩시 제로');
 assert.equal(m.parsedData.items[1].calories, 0);
 assert.equal(m.parsedData.items[0].calories, 659);
 const scale = replyToMsg(fakeConverse({messages: [{role: 'user', text: '아침 체중계'}], images: [{}]}).text).cards[0];
 assert.equal(scale.type, 'body');
 assert.equal(scale.parsedData.weight, 84);
 const pack = replyToMsg(fakeConverse({messages: [{role: 'user', text: '간식'}], images: [{}]}).text).cards[0];
 assert.equal(pack.type, 'meal');
 assert.equal(pack.parsedData.items.length, 2);
});
