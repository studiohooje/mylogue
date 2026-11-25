import test from 'node:test';
import assert from 'node:assert/strict';
import {route} from '../src/routes.js';
import {safeReturn, customToken} from '../src/kakao.js';

// 5.0.1 카카오 로그인: 허용한 곳으로만 돌아가고, 서비스 계정으로 서명한 Firebase 표를 돌려준다. 외부 호출은 가짜.
const {publicKey, privateKey} = await crypto.subtle.generateKey({name: 'RSASSA-PKCS1-v1_5', modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256'}, true, ['sign', 'verify']);
const pkcs8 = Buffer.from(await crypto.subtle.exportKey('pkcs8', privateKey)).toString('base64');
const SA = {client_email: 'firebase-adminsdk@mylogue-1eedb.iam.gserviceaccount.com', private_key: `-----BEGIN PRIVATE KEY-----\n${pkcs8}\n-----END PRIVATE KEY-----\n`};
const env = {ALLOWED_ORIGINS: 'https://studiohooje.github.io,https://localhost,http://localhost:4173', KAKAO_REST_KEY: 'rest-key', KAKAO_CLIENT_SECRET: 'sec', FIREBASE_SA: JSON.stringify(SA)};
const calls = [];
const fetchImpl = async (url, opts = {}) => {
  calls.push(String(url));
  if (String(url).startsWith('https://kauth.kakao.com/oauth/token')) { const b = new URLSearchParams(opts.body); assert.equal(b.get('client_secret'), 'sec'); return new Response(JSON.stringify(b.get('code') === 'good' ? {access_token: 'at'} : {}), {status: b.get('code') === 'good' ? 200 : 400}); }
  if (String(url).startsWith('https://kapi.kakao.com/v2/user/me')) return new Response(JSON.stringify({id: 12345, kakao_account: {profile: {nickname: '문대표'}}}));
  throw Error('unexpected ' + url);
};
const deps = {env, fetchImpl, now: () => Date.parse('2026-11-25T12:00:00Z')};
const get = p => route(new Request(`https://ai.example/${p}`), deps);
const S = 'abcdefghijklmnop1234';

test('카카오 시작: 허용한 곳만, 카카오로 보낸다', async () => {
  assert.equal(safeReturn('https://evil.example/x', env), '');
  assert.equal(safeReturn('https://studiohooje.github.io/mylogue/?a=1#b', env), 'https://studiohooje.github.io/mylogue/');
  assert.equal((await get(`kakao/start?state=${S}&return=${encodeURIComponent('https://evil.example/')}`)).status, 400);
  const r = await get(`kakao/start?state=${S}&return=${encodeURIComponent('https://studiohooje.github.io/mylogue/')}`);
  assert.equal(r.status, 302);
  const loc = new URL(r.headers.get('location'));
  assert.equal(loc.origin, 'https://kauth.kakao.com'); assert.equal(loc.searchParams.get('client_id'), 'rest-key');
  assert.equal(loc.searchParams.get('redirect_uri'), 'https://ai.example/kakao/callback');
});
test('카카오 돌아오기: 표를 만들어 앱 주소 # 뒤로, 실패는 이유와 함께', async () => {
  const start = new URL((await get(`kakao/start?state=${S}&return=${encodeURIComponent('https://localhost/')}`)).headers.get('location'));
  const st = start.searchParams.get('state');
  const ok = await get(`kakao/callback?code=good&state=${st}`);
  assert.equal(ok.status, 302);
  const loc = ok.headers.get('location'); assert.ok(loc.startsWith('https://localhost/#kakao='));
  const frag = new URLSearchParams(loc.split('#')[1]);
  assert.equal(frag.get('s'), S); assert.equal(frag.get('n'), '문대표');
  const [h, b, sig] = frag.get('kakao').split('.');
  const body = JSON.parse(Buffer.from(b, 'base64url').toString());
  assert.equal(body.uid, 'kakao:12345'); assert.equal(body.iss, SA.client_email); assert.equal(body.exp - body.iat, 3600);
  assert.ok(await crypto.subtle.verify('RSASSA-PKCS1-v1_5', publicKey, Buffer.from(sig, 'base64url'), new TextEncoder().encode(`${h}.${b}`)), '서명 확인');
  const bad = await get(`kakao/callback?code=bad&state=${st}`);
  assert.match(decodeURIComponent(bad.headers.get('location')), /#kakao-error=카카오 확인에 실패/);
  const cancel = await get(`kakao/callback?error=access_denied&state=${st}`);
  assert.match(decodeURIComponent(cancel.headers.get('location')), /취소/);
  assert.equal((await get('kakao/callback?code=good&state=garbage')).status, 400);
});
test('카카오 키가 없으면 앱으로 돌아가 안내', async () => {
  const r = await route(new Request(`https://ai.example/kakao/start?state=${S}&return=${encodeURIComponent('https://localhost/')}`), {...deps, env: {...env, KAKAO_REST_KEY: ''}});
  assert.match(decodeURIComponent(r.headers.get('location')), /#kakao-error=카카오 로그인이 아직 준비되지/);
  assert.ok(typeof await customToken(SA, 'kakao:1') === 'string');
});
