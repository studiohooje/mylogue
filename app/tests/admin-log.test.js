import test from 'node:test';
import assert from 'node:assert/strict';
import {dayRecords, recentDates, adminLogHTML, validatePayload, newMeal, newBody, emptyAdminLog, recordKey} from '../admin-log.js';
import {cleanMeal, cleanBody, emptyDB} from '../domain.js';

const db = {...emptyDB(), meals: [cleanMeal({id: 'm1', date: '2026-11-20', name: '김치찌개', calories: 450})], body: [cleanBody({id: 'b1', date: '2026-11-20', weight: 70})], checkins: {'2026-11-20': {sleep: 3, energy: 4, soreness: null, pain: null, note: ''}}};

test('관리로그: 날짜별 기록과 최근 날짜', () => {
  const list = dayRecords(db, '2026-11-20');
  assert.deepEqual(list.map(r => r.key).sort(), ['body~b1', 'checkins~2026-11-20', 'meals~m1']);
  assert.deepEqual(recentDates(db), ['2026-11-20']);
});

test('관리로그 화면: 목록·열람 띠·수정 칸, 글자 이스케이프', () => {
  const s = {...emptyAdminLog(), users: [{uid: 'u1', email: '<b>a@x.com', status: 'approved'}]};
  const list = adminLogHTML(s, {today: '2026-11-23'});
  assert.match(list, /&lt;b&gt;a@x.com/); assert.doesNotMatch(list, /<b>a@x.com/);
  const open = adminLogHTML({...s, uid: 'u1', email: 'a@x.com', date: '2026-11-20', data: {db, records: {}}, edit: {key: 'meals~m1', text: '{}'}}, {today: '2026-11-23'});
  assert.match(open, /관리자 열람 중/); assert.match(open, /김치찌개/); assert.match(open, /alog-edit-text/);
});

test('수정 검사: id 변경·잘못된 값은 거부, 정상은 저장용 문자열', () => {
  const ok = validatePayload('meals~m1', JSON.stringify({...db.meals[0], calories: 500}));
  assert.equal(JSON.parse(ok).calories, 500);
  assert.throws(() => validatePayload('meals~m1', JSON.stringify({...db.meals[0], id: 'other'})), /id/);
  assert.throws(() => validatePayload('meals~m1', '{oops'), /JSON/);
  assert.throws(() => validatePayload('body~b1', JSON.stringify({...db.body[0], weight: -3})));
  assert.throws(() => validatePayload('dayStates~2026-11-20', '"weird"'));
});

test('추가: 식사·수치 새 기록은 앱 규칙을 통과하고 키가 맞음', () => {
  const m = newMeal('2026-11-21', {name: '닭가슴살', qty: '1', unit: '팩', kcal: '120'});
  assert.equal(m.key, recordKey('meals', JSON.parse(m.payload).id)); assert.equal(JSON.parse(m.payload).source, 'admin');
  const b = newBody('2026-11-21', {weight: '69.5'});
  assert.equal(JSON.parse(b.payload).weight, 69.5);
  assert.throws(() => newBody('2026-11-21', {}));
});
