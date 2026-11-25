// 5.0.1 카카오 로그인: 카카오가 확인한 사용자에게 Firebase 로그인 표(커스텀 토큰)를 만들어 앱으로 돌려준다.
// 비밀값(KAKAO_REST_KEY·KAKAO_CLIENT_SECRET·FIREBASE_SA)은 `wrangler secret put`으로만(대표님이 직접). 코드·저장소에 두지 않는다.
// 흐름: 앱 → /kakao/start?state&return → 카카오 로그인 → /kakao/callback?code&state → 앱 주소#kakao=표&s=state&n=이름
const enc = s => btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const b64url = buf => enc(String.fromCharCode(...new Uint8Array(buf)));
const json64 = o => enc(unescape(encodeURIComponent(JSON.stringify(o))));
const unjson64 = s => { try { return JSON.parse(decodeURIComponent(escape(atob(String(s).replace(/-/g, '+').replace(/_/g, '/'))))); } catch { return null; } };

// 돌아갈 주소는 허용한 곳(ALLOWED_ORIGINS)으로 시작해야 한다(다른 사이트로 표가 새지 않게).
export function safeReturn(r, env) {
  const allowed = String(env.ALLOWED_ORIGINS || '').split(',').map(s => s.trim()).filter(Boolean);
  try { const u = new URL(String(r || '')); return allowed.includes(u.origin) ? `${u.origin}${u.pathname}` : ''; } catch { return ''; }
}
const callbackUrl = request => `${new URL(request.url).origin}/kakao/callback`;
const back = (r, frag) => new Response(null, {status: 302, headers: {location: `${r}#${frag}`, 'cache-control': 'no-store', 'referrer-policy': 'no-referrer'}});

async function importKey(pem) {
  const b = atob(String(pem).replace(/-----[^-]+-----/g, '').replace(/\s+/g, ''));
  const buf = new Uint8Array(b.length); for (let i = 0; i < b.length; i++) buf[i] = b.charCodeAt(i);
  return crypto.subtle.importKey('pkcs8', buf, {name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256'}, false, ['sign']);
}
// Firebase 커스텀 토큰(서비스 계정으로 서명, 1시간)
export async function customToken(sa, uid, claims = {}, now = Date.now()) {
  const iat = Math.floor(now / 1000);
  const head = json64({alg: 'RS256', typ: 'JWT'});
  const body = json64({iss: sa.client_email, sub: sa.client_email, aud: 'https://identitytoolkit.googleapis.com/google.identity.identitytoolkit.v1.IdentityToolkit', iat, exp: iat + 3600, uid, claims});
  const sig = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', await importKey(sa.private_key), new TextEncoder().encode(`${head}.${body}`));
  return `${head}.${body}.${b64url(sig)}`;
}

export async function kakaoRoute(path, request, {env, fetchImpl = fetch, now = Date.now()}) {
  const url = new URL(request.url);
  if (path === 'kakao/start') {
    const r = safeReturn(url.searchParams.get('return'), env), s = String(url.searchParams.get('state') || '');
    if (!r || !/^[A-Za-z0-9_-]{16,64}$/.test(s)) return new Response('잘못된 요청이에요.', {status: 400});
    if (!env.KAKAO_REST_KEY) return back(r, 'kakao-error=' + encodeURIComponent('카카오 로그인이 아직 준비되지 않았어요.'));
    const q = new URLSearchParams({client_id: env.KAKAO_REST_KEY, redirect_uri: callbackUrl(request), response_type: 'code', state: json64({s, r})});
    return new Response(null, {status: 302, headers: {location: `https://kauth.kakao.com/oauth/authorize?${q}`, 'cache-control': 'no-store'}});
  }
  if (path === 'kakao/callback') {
    const st = unjson64(url.searchParams.get('state')), r = safeReturn(st?.r, env), s = String(st?.s || '');
    if (!r || !/^[A-Za-z0-9_-]{16,64}$/.test(s)) return new Response('잘못된 요청이에요.', {status: 400});
    const fail = m => back(r, `kakao-error=${encodeURIComponent(m)}&s=${s}`);
    const code = url.searchParams.get('code');
    if (!code) return fail(url.searchParams.get('error') === 'access_denied' ? '카카오 로그인을 취소했어요.' : '카카오 로그인에 실패했어요.');
    try {
      const form = new URLSearchParams({grant_type: 'authorization_code', client_id: env.KAKAO_REST_KEY, redirect_uri: callbackUrl(request), code});
      if (env.KAKAO_CLIENT_SECRET) form.set('client_secret', env.KAKAO_CLIENT_SECRET);
      const t = await fetchImpl('https://kauth.kakao.com/oauth/token', {method: 'POST', headers: {'content-type': 'application/x-www-form-urlencoded;charset=utf-8'}, body: form});
      if (!t.ok) return fail('카카오 확인에 실패했어요. 다시 해 주세요.');
      const {access_token} = await t.json();
      const m = await fetchImpl('https://kapi.kakao.com/v2/user/me', {headers: {authorization: `Bearer ${access_token}`}});
      if (!m.ok) return fail('카카오 계정 정보를 받지 못했어요.');
      const me = await m.json(), id = String(me?.id || '');
      if (!/^\d{1,20}$/.test(id)) return fail('카카오 계정 정보를 확인하지 못했어요.');
      const name = String(me?.kakao_account?.profile?.nickname || me?.properties?.nickname || '').slice(0, 20);
      let sa = null; try { sa = JSON.parse(env.FIREBASE_SA || ''); } catch {}
      if (!sa?.client_email || !sa?.private_key) return fail('카카오 로그인이 아직 준비되지 않았어요.');
      const token = await customToken(sa, `kakao:${id}`, {provider: 'kakao'}, now);
      return back(r, `kakao=${token}&s=${s}&n=${encodeURIComponent(name)}`);
    } catch (e) {
      console.error(e);
      return fail('카카오 로그인에 실패했어요. 잠시 뒤 다시 해 주세요.');
    }
  }
  return new Response('없는 주소예요.', {status: 404});
}
