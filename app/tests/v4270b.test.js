import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {CARDIO_TEMPLATES} from '../templates-data.js';
import {consentOK, consentHTML, consentRecord, CONSENT_ITEMS, requiredChecked, operatorAllowed, operatorToggleHTML} from '../legal.js';
import {landingHTML} from '../landing.js';
import {withTimeout, markReviewed, hadAccountOnDevice} from '../cloud-sync.js';

// 4.27.0 전수검사 이어서(EX-06·E-01·M-02·DOC-05·B-05·B-08·AA-08)
test('EX-06: 유산소 프로그램 네 개 모두 주차 내용이 있다', () => {
 for (const t of CARDIO_TEMPLATES) {
  assert.ok(t.weeks.length >= 8, t.id);
  for (const [w, n, m, note] of t.weeks) { assert.ok(w > 0 && n && typeof m === 'number' && m > 0, `${t.id} ${w}주`); assert.equal(typeof note, 'string'); }
 }
});
test('B-08: 운영자 열람은 선택 — 빼고 동의해도 로그인 가능, 표시도 선택', () => {
 const checked = Object.fromEntries(CONSENT_ITEMS.map(([k]) => [k, k !== 'operator']));
 assert.equal(requiredChecked(checked), true);
 const rec = consentRecord(checked);
 assert.equal(consentOK({consent: rec}), true);
 assert.equal(operatorAllowed({consent: rec}), false);
 assert.equal(consentOK({consent: consentRecord({...checked, health: false})}), false);
 const html = consentHTML({checked});
 assert.match(html, /<em class="opt">선택<\/em> 베타 기간 운영자/);
 assert.doesNotMatch(html, /consent-agree" aria-disabled/);
 assert.match(operatorToggleHTML(rec), /동의 안 함.*동의하기/);
 assert.match(operatorToggleHTML({...rec, items: {...rec.items, operator: true}}), /동의함.*동의 철회/);
});
test('B-08: Firestore 규칙이 운영자 열람 거부를 지킨다(관리자 읽기·쓰기 모두)', () => {
 const rules = readFileSync(new URL('../firestore.rules', import.meta.url), 'utf8');
 assert.match(rules, /function operatorAllowed\(uid\)/);
 assert.match(rules, /admin\(\) && recentLogin\(\) && operatorAllowed\(uid\)/);
 assert.match(rules, /allow read: if \(owner\(uid\) && approved\(\)\) \|\| \(admin\(\) && operatorAllowed\(uid\)\)/);
});
test('M-02: 랜딩 첫 화면에 무슨 앱인지와 베타 승인제가 보인다', () => {
 const html = landingHTML();
 const hero = html.slice(0, html.indexOf('</section>'));
 assert.match(hero, /건강 기록 앱/);
 assert.match(hero, /지금은 베타예요/);
});
test('E-01: 서버 확인에 시간 제한, 로그인한 적 없는 기기 판별', async () => {
 await assert.rejects(withTimeout(new Promise(() => {}), 20), e => e.code === 'timeout');
 assert.equal(await withTimeout(Promise.resolve(3), 20), 3);
 const data = new Map();
 globalThis.localStorage = {get length() { return data.size; }, key: i => [...data.keys()][i] ?? null, getItem: k => data.get(k) ?? null, setItem: (k, v) => data.set(k, v), removeItem: k => data.delete(k)};
 data.set('mylogue.v1', '{}');
 assert.equal(hadAccountOnDevice(), false);
 data.set('mylogue.v1.user.abc', '{}');
 assert.equal(hadAccountOnDevice(), true);
 const index = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
 assert.match(index, /<div id="app"><div class="boot-loading"[^>]*>.*기록을 여는 중이에요/);
});
test('AA-08: 승인 뒤 목록 전체를 다시 읽지 않고 그 계정만 바꾼다', () => {
 const list = [{uid: 'a', status: 'pending'}, {uid: 'b', status: 'pending'}, {uid: 'c', status: 'approved'}];
 const out = markReviewed(['a', 'b'], 'approved', list);
 assert.deepEqual(out.map(x => x.status), ['approved', 'approved', 'approved']);
 assert.equal(list[0].status, 'pending');
});
test('DOC-05: 의료 오해 표현 세 곳을 관찰·단순 계산 말투로', () => {
 const src = ['coach-engine.js', 'discovery.js', 'plus-tools.js'].map(f => readFileSync(new URL(`../${f}`, import.meta.url), 'utf8')).join('\n');
 assert.doesNotMatch(src, /몸과 마음이 지치기 쉬운 흐름/);
 assert.doesNotMatch(src, /빼야 근육을 지키고 다시 찌지 않아요/);
 assert.doesNotMatch(src, /예측이 아니라 범위예요/);
 assert.match(src, /단순 계산/);
});
test('B-05: 앱 없이 계정 삭제를 요청하는 웹 페이지가 있고 빌드·오프라인 목록에 들어 있다', () => {
 const page = readFileSync(new URL('../delete-account.html', import.meta.url), 'utf8');
 assert.match(page, /앱 없이 요청하기/);
 assert.match(page, /7일 안에/);
 assert.match(readFileSync(new URL('../build.mjs', import.meta.url), 'utf8'), /'delete-account\.html'/);
 assert.match(readFileSync(new URL('../sw.js', import.meta.url), 'utf8'), /'\.\/delete-account\.html'/);
 assert.match(readFileSync(new URL('../privacy.html', import.meta.url), 'utf8'), /href="delete-account\.html"/);
});
