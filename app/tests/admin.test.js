import test from 'node:test';
import assert from 'node:assert/strict';
import {isAdminUser} from '../admin.js';
import {pendingItems, bellHTML, panelHTML, statusBadge} from '../admin-panel.js';
import {isCatalogAdmin} from '../catalog-cloud.js';

test('관리자: 기존 UID와 인증된 mooncurvv 이메일만 관리자', () => {
 assert.equal(isAdminUser({uid:'bulbnZbmC4PgH8tUAOjfPPLE7pA3'}), true);
 assert.equal(isAdminUser({uid:'x', email:'MoonCurvv@gmail.com', emailVerified:true}), true);
 assert.equal(isAdminUser({uid:'x', email:'mooncurvv@gmail.com', emailVerified:false}), false);
 assert.equal(isAdminUser({uid:'x', email:'someone@gmail.com', emailVerified:true}), false);
 assert.equal(isAdminUser(null), false);
 assert.equal(isCatalogAdmin({uid:'x', email:'mooncurvv@gmail.com', emailVerified:true}), true);
});

test('관리자 알림: 대기 중인 신청과 요청만 모으고 최신순', () => {
 const ts = ms => ({toDate:()=>new Date(ms)});
 const items = pendingItems({
  applicants:[{uid:'a', email:'a@x', status:'pending', createdAt:ts(1000)}, {uid:'b', email:'b@x', status:'approved'}],
  requests:[{id:'r1', type:'machine', name:'레그 익스텐션', status:'pending', createdAt:ts(2000)}, {id:'r2', name:'끝난 요청', status:'approved'}, {id:'r3', type:'food', name:'닭가슴살', status:'in_review', createdAt:ts(500)}]
 });
 assert.deepEqual(items.map(x=>x.key), ['req:r1', 'user:a', 'req:r3']);
 assert.match(items[0].sub, /머신·장비 등록 요청/);
});

test('관리자 알림: 종 숫자, 팝업 버튼, 나중에 확인한 항목 숨김', () => {
 assert.match(bellHTML(3), /admin-badge">3</);
 assert.doesNotMatch(bellHTML(0), /admin-badge/);
 const items = [{key:'user:a', kind:'user', id:'a', title:'<a@x>', sub:'기록 이용 신청'}, {key:'req:r1', kind:'request', id:'r1', title:'레그', sub:'요청'}];
 assert.equal(panelHTML(items, {open:false, snoozed:new Set()}), '');
 const html = panelHTML(items, {open:true, snoozed:new Set(['req:r1']), done:[]});
 assert.match(html, /data-admin-approve="user:a"/);
 assert.match(html, /data-admin-reject="user:a"/);
 assert.match(html, /data-admin-review="user:a"/);
 assert.match(html, /data-admin-later="user:a"/);
 assert.match(html, /id="admin-later-all"/);
 assert.doesNotMatch(html, /req:r1/);
 assert.match(html, /&lt;a@x&gt;/);
 assert.match(panelHTML(items, {open:true, snoozed:new Set(), done:[{key:'k', title:'a@x', result:'approved'}]}), /승인했어요/);
 assert.match(statusBadge('approved'), /승인됨/);
 assert.match(statusBadge('pending'), /승인 대기/);
});
