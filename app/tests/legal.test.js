import test from 'node:test';
import assert from 'node:assert/strict';
import {consentOK, consentRecord, consentHTML, CONSENT_ITEMS, CONSENT_VERSION, legalFooterHTML} from '../legal.js';

test('가입 동의: 필수 항목을 모두 동의해야 통과', () => {
 const all = Object.fromEntries(CONSENT_ITEMS.map(([k]) => [k, true]));
 assert.equal(consentOK({}), false);
 assert.equal(consentOK({consent:consentRecord(all)}), true);
 assert.equal(consentOK({consent:consentRecord({...all, health:false})}), false, '건강정보 별도 동의 없으면 안 됨');
 assert.equal(consentOK({consent:{...consentRecord(all), version:'old'}}), false, '방침이 바뀌면 다시 동의');
 assert.equal(consentRecord(all).version, CONSENT_VERSION);
 assert.deepEqual(CONSENT_ITEMS.map(x => x[0]), ['age','terms','privacy','health','overseas','operator']);
});

test('동의 화면·하단 고지', () => {
 const html = consentHTML({name:'마이', checked:{}});
 assert.match(html, /id="consent-all"/); assert.match(html, /data-consent="health"/); assert.match(html, /aria-disabled="true"/);
 assert.match(html, /privacy.html#overseas/);
 const foot = legalFooterHTML({at:'2026-11-23T01:00:00Z'});
 assert.match(foot, /개인정보처리방침/); assert.match(foot, /가입 동의 2026-11-23/); assert.match(foot, /©/);
});
