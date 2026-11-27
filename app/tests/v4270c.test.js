import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {emptyDB, cleanBody, cleanMeal, cleanWorkout, normalizeDB} from '../domain.js';
import {planSync, recordsToDB, quarantineKeys, cloudRecords, mergeSetting} from '../cloud-model.js';
import {buildPhase} from '../phase.js';
import {estimateAt, progressOf} from '../maintenance.js';
import {exerciseFormHTML} from '../profile-forms.js';
import {mealFormHTML} from '../ui-helpers.js';

// 4.27.0 Fable 재검사에서 나온 새 문제(N-1~N-10)와 일부만 고쳐진 항목
const src = f => readFileSync(new URL(`../${f}`, import.meta.url), 'utf8');
const bad7 = {id: 'b7', date: '2026-11-02', weight: 7, createdAt: '2026-11-02T00:00:00.000Z'};

test('N-1: 따로 보관한 기록은 동기화가 서버에 삭제로 올리지 않는다', () => {
 const db = normalizeDB({...emptyDB(), body: [bad7, {id: 'b70', date: '2026-11-03', weight: 70}]}, {lenient: true});
 assert.equal(db.body.length, 1);
 assert.equal(db.quarantine[0].id, 'b7');
 const hold = quarantineKeys(db);
 assert.ok(hold.has('body~b7'));
 const local = cloudRecords(db), remote = {'body~b7': {payload: JSON.stringify(bad7), revision: 1}, 'body~b70': {payload: local['body~b70'], revision: 1}};
 const base = {'body~b7': {payload: JSON.stringify(bad7), revision: 1}, 'body~b70': {payload: local['body~b70'], revision: 1}};
 const plan = planSync(local, remote, base, {}, {hold});
 assert.equal(plan.writes.some(w => w.key === 'body~b7'), false);
 assert.equal(plan.conflicts.length, 0);
 assert.equal(plan.merged['body~b7'], JSON.stringify(bad7)); // 서버 값 그대로
 // 보관 키를 넘기지 않으면 예전처럼 삭제로 올라간다(대조)
 assert.equal(planSync(local, remote, base).writes.find(w => w.key === 'body~b7').payload, null);
});
test('N-1: 서버에서 받은 틀린 기록 한 건이 동기화 전체를 막지 않고 따로 보관된다(중복 없이)', () => {
 const ok = cleanBody({id: 'b70', date: '2026-11-03', weight: 70});
 const records = {'body~b7': JSON.stringify(bad7), 'body~b70': JSON.stringify(ok), 'meals~mx': '{깨진'};
 const local = {...emptyDB(), quarantine: [{kind: 'body', id: 'b7', raw: bad7, reason: 'x'}]};
 const db = recordsToDB(records, local);
 assert.equal(db.body.length, 1);
 assert.equal(db.quarantine.filter(q => q.id === 'b7').length, 1);
 assert.ok(db.quarantine.some(q => q.kind === 'meals' && q.id === 'mx'));
});
test('N-1·N-8: 보관분은 백업 파일(엄격 검사)에도 이어지고, 빈 목록 저장으로 사라지지 않으며, 날짜별 상태 불량도 보관', () => {
 const strict = normalizeDB({...emptyDB(), quarantine: [{kind: 'body', id: 'b7', raw: bad7}]});
 assert.equal(strict.quarantine.length, 1);
 const len = normalizeDB({...emptyDB(), dayStates: {'2026-11-01': '이상한값'}}, {lenient: true});
 assert.deepEqual(len.quarantine.map(q => [q.kind, q.id]), [['dayStates', '2026-11-01']]);
 assert.match(src('store.js'), /!db\.quarantine\?\.length/);
 assert.match(src('app.js'), /이 기기와 서버 어디에서도 지우지 않았고/);
});
test('N-5: 목록 설정은 양쪽에서 더한 것을 모두 남기고, 한쪽이 뺀 것만 뺀다', () => {
 const j = JSON.stringify;
 assert.deepEqual(JSON.parse(mergeSetting(j(['A', 'X']), j(['A', 'Y']), j(['A']))), ['A', 'X', 'Y']);
 assert.deepEqual(JSON.parse(mergeSetting(j(['X']), j(['A', 'Y']), j(['A']))), ['X', 'Y']);
});
test('N-2: 목록 밖 지금 값도 이스케이프해서 그린다', () => {
 const x = '"><img src=x onerror=alert(1)>';
 const e = exerciseFormHTML({name: '테스트', part: x, equipment: x});
 assert.doesNotMatch(e, /<img src=x/);
 const m = mealFormHTML(cleanMeal({date: '2026-11-24', name: '밥', calories: 300, source: x}));
 assert.doesNotMatch(m, /<img src=x/);
});
test('N-3·N-4·N-6: 계정 삭제 때 사본 삭제, 철회는 서버 저장 뒤에만, 둘러보기는 로그인 기록이 아님', async () => {
 const cs = src('cloud-sync.js'), app = src('app.js');
 assert.match(cs, /kvDel\(`mylogue\.cloud\.before-sync\$\{tail\}`\)/);
 assert.match(app, /consent-operator-toggle'\)\{[^]*?await saveAccountConsent\(rec\)[^]*?\$s\.db=save/);
 assert.match(app, /\.items\?\.operator===true\)!==\(cloudState\.consent\?\.items\?\.operator===true\)/);
 const {hadAccountOnDevice} = await import('../cloud-sync.js');
 const data = new Map([['mylogue.v1.user.demo-tour', '{}']]);
 globalThis.localStorage = {get length() { return data.size; }, key: i => [...data.keys()][i] ?? null, getItem: k => data.get(k) ?? null, setItem: (k, v) => data.set(k, v), removeItem: k => data.delete(k)};
 assert.equal(hadAccountOnDevice(), false);
 data.set('mylogue.v1.user.u1', '{}');
 assert.equal(hadAccountOnDevice(), true);
});
const phase = (type, answers, now = 50) => ({type, weeks: 14, answers, now: {weight: now}, startAvg: now});
test('C-02·C-03: 증량 상한, 키 모를 때 큰 감량, 임신·수유·18세 이하 페이즈', () => {
 assert.throws(() => buildPhase({...phase('leanbulk', {gainKg: 30}), weeks: 4}, '2026-11-24'), /체중의 1%/);
 assert.ok(buildPhase(phase('leanbulk', {gainKg: 3}), '2026-11-24'));
 assert.throws(() => buildPhase(phase('diet', {loseKg: 10}), '2026-11-24'), /키를 알아야/);
 assert.ok(buildPhase(phase('diet', {loseKg: 6}), '2026-11-24'));
 assert.throws(() => buildPhase(phase('diet', {loseKg: 3}), '2026-11-24', {heightCm: 170, cautions: ['pregnant']}), /임신·수유/);
 assert.throws(() => buildPhase(phase('bulk', {gainKg: 3}), '2026-11-24', {heightCm: 170, age: 17}), /18세 이하/);
 assert.ok(buildPhase({type: 'maintain', weeks: 8, answers: {}, now: {weight: 50}}, '2026-11-24', {cautions: ['pregnant']}));
 assert.match(src('app.js'), /cautions:\$s\.db\.settings\?\.nutritionProfile\?\.cautions\|\|\[\]/);
});
const day = i => new Date(Date.UTC(2026, 8, 1 + i)).toISOString().slice(0, 10);
const mk = fn => { const db = emptyDB(); for (let i = 0; i < 56; i++) { const d = day(i), r = fn(i); if (r.kcal > 0) db.meals.push(cleanMeal({date: d, name: 'x', calories: r.kcal, loggedAt: d + 'T03:00:00.000Z'})); if (r.w) db.body.push(cleanBody({date: d, weight: r.w})); db.workouts.push(cleanWorkout({date: d, rest: true})); } return db; };
test('C-05·C-06: 표시 안 한 5:2 단식도 반영, 공식 없을 때 낮은 값은 보류하고 프로필을 권함', () => {
 const marked = estimateAt(mk(i => ({kcal: i % 7 < 2 ? 500 : 2600, w: 75})), day(55));
 assert.ok(marked.ok && marked.intakeDays === 56 && marked.kcal <= 2100);
 const low = estimateAt(mk(() => ({kcal: 1250, w: 75})), day(55));
 assert.equal(low.ok, false); assert.equal(low.noFormula, true);
 assert.ok(progressOf({status: 'collecting', ...low}).need.some(x => /키·나이/.test(x)));
});
test('N-9: 감량 상한 문구가 반올림으로 같은 숫자를 보이지 않는다', () => {
 assert.throws(() => buildPhase({type: 'diet', weeks: 10, answers: {loseKg: 12.1}, now: {weight: 80}, startAvg: 80}, '2026-11-24', {heightCm: 175}), /1\.21kg은 체중의 1\.5%\(주 1\.20kg\)/);
});
test('DOC-03·B-05: 계정 삭제가 내 등록 요청도 지우고, 안내 문구가 사실과 맞는다', () => {
 assert.match(src('cloud-sync.js'), /where\('requesterUid','==',uid\)/);
 assert.match(src('firestore.rules'), /allow delete: if signedIn\(\) && resource\.data\.requesterUid == request\.auth\.uid;/);
 const page = src('delete-account.html');
 assert.doesNotMatch(page, /개인을 알 수 없는 형태/);
 assert.match(page, /음식·머신 등록 요청\(사진 포함\)/);
});
test('S-08·DOC-02·B-27·AA-01·N-10: 문구와 경로', () => {
 const p = src('privacy.html');
 assert.doesNotMatch(p, /볼 때마다 기록이 남아요/);
 assert.match(p, /사용 횟수 집계/); assert.match(p, /jsDelivr/); assert.match(p, /콩팥 질환, 혈당약 사용/);
 assert.doesNotMatch(src('landing.js'), /기록은 지금처럼 무료예요/);
 const app = src('app.js');
 assert.match(app, /function downloadBlob\(name,blob\)/);
 assert.doesNotMatch(app, /a\.href=item\.url;a\.download/);
 assert.match(readFileSync(new URL('../../.github/workflows/pages.yml', import.meta.url), 'utf8'), /run: npm run smoke/);
 assert.match(src('tools/smoke.mjs'), /'meal', 'workout', 'ai-chat'/);
});
