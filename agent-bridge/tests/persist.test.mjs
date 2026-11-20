import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {FirestoreBridge} from '../firebase.mjs';

test('저장된 갱신 토큰으로 요청 직전에 새 로그인 토큰을 받고, 바뀐 갱신 토큰은 저장 콜백으로 넘긴다', async () => {
 const calls = []; let saved = null;
 const fetcher = async (url, options) => {
  calls.push(url);
  if (url.startsWith('https://securetoken.googleapis.com/')) {
   assert.match(String(options.body), /grant_type=refresh_token/);
   return new Response(JSON.stringify({user_id:'member', id_token:'fresh-id-token', refresh_token:'rotated-refresh-token-123456', expires_in:'3600'}), {status:200});
  }
  assert.equal(options.headers.Authorization, 'Bearer fresh-id-token');
  return new Response(JSON.stringify({documents:[]}), {status:200});
 };
 const bridge = new FirestoreBridge({fetcher, onRefresh:s=>{saved = s}});
 bridge.setSession({uid:'member', refreshToken:'stored-refresh-token-123456', idToken:'', expiresAt:new Date(0).toISOString()});
 assert.equal(bridge.requireSession().uid, 'member', '만료 시각이 지나도 저장된 연결은 유지');
 await bridge.request('https://firestore.googleapis.com/v1/x');
 assert.equal(calls.filter(u=>u.includes('securetoken')).length, 1);
 assert.equal(saved.refreshToken, 'rotated-refresh-token-123456');
 await bridge.request('https://firestore.googleapis.com/v1/y');
 assert.equal(calls.filter(u=>u.includes('securetoken')).length, 1, '유효한 동안에는 다시 받지 않음');
});

test('갱신 토큰의 계정이 다르면 거절한다', async () => {
 const fetcher = async () => new Response(JSON.stringify({user_id:'someone-else', id_token:'t', expires_in:'3600'}), {status:200});
 const bridge = new FirestoreBridge({fetcher});
 bridge.setSession({uid:'member', refreshToken:'stored-refresh-token-123456', idToken:'', expiresAt:new Date(0).toISOString()});
 await assert.rejects(bridge.fresh(), /일치하지 않습니다/);
});

test('연결 저장·불러오기·해제', async () => {
 process.env.MYLOGUE_BRIDGE_HOME = mkdtempSync(join(tmpdir(), 'mylogue-bridge-'));
 const {loadPairing, savePairing, clearPairing, storePath} = await import('../store.mjs');
 assert.equal(loadPairing(), null);
 savePairing({uid:'member', refreshToken:'r-123456789012345678901', email:'a@b'});
 assert.equal(loadPairing().uid, 'member');
 assert.ok(storePath().startsWith(process.env.MYLOGUE_BRIDGE_HOME));
 clearPairing();
 assert.equal(loadPairing(), null);
});
