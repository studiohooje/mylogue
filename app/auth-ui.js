// 5.0.1 로그인·가입 창: 카카오 · Google · 이메일. 어디서 '로그인'을 눌러도 이 창이 뜬다(메이트 초대 화면 포함).
// 이메일은 가입 → 인증 메일 → 이용 신청. 카카오는 AI 서버가 카카오 확인 뒤 Firebase 로그인 표를 # 뒤로 돌려준다.
// 이 파일은 app.js를 import하지 않는다.
import {$s, $f} from './app-state.js';
import {cloudState, cloudLogin, emailSignIn, emailSignUp, emailReset, resendVerification, signInWithKakaoToken} from './cloud-sync.js';
import {aiWorkerUrl} from './ai-config.js';
import {isNative} from './native-auth.js';

const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));
const st = () => $s.auth;
export function openAuth(mode = 'pick', {reason = ''} = {}){ $s.auth = {mode, msg: '', busy: false, reason}; $f.render(); }
const closeAuth = () => { $s.auth = null; $f.render(); };
const KAKAO_STATE = 'mylogue.kakaoState';
// 5.0.1 앱이 켜지며 주소를 #home 등으로 바꾸기 전에 처음 주소(# 뒤)를 잡아 둔다(카카오 결과·초대 코드)
const BOOT_HASH = String(globalThis.location?.hash || '');
const PENDING_INVITE = 'mylogue.pendingInvite';
export const rememberInvite = code => { try { localStorage.setItem(PENDING_INVITE, JSON.stringify({code, at: Date.now()})); } catch {} };
export function pendingInvite(){ try { const v = JSON.parse(localStorage.getItem(PENDING_INVITE) || 'null'); if(v && Date.now() - v.at < 3 * 864e5 && /^[A-Z2-9]{8}$/.test(v.code)) return v.code; } catch {} return ''; }
export const clearPendingInvite = () => { try { localStorage.removeItem(PENDING_INVITE); } catch {} };

const KAKAO_SVG = '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="#191919" d="M12 3.5C6.75 3.5 2.5 6.87 2.5 11.03c0 2.67 1.76 5.02 4.42 6.36l-.9 3.3c-.08.3.26.54.52.37l3.94-2.6c.5.06 1 .1 1.52.1 5.25 0 9.5-3.37 9.5-7.53S17.25 3.5 12 3.5z"/></svg>';
const GOOGLE_SVG = '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="#4285F4" d="M21.6 12.23c0-.72-.06-1.25-.2-1.8H12v3.4h5.5c-.11.85-.7 2.13-2 2.99l3.07 2.38c1.84-1.7 3.03-4.2 3.03-6.97z"/><path fill="#34A853" d="M12 21.75c2.7 0 4.97-.89 6.63-2.42l-3.07-2.38c-.84.57-1.96.98-3.56.98a6.18 6.18 0 0 1-5.84-4.27H2.98v2.46A10 10 0 0 0 12 21.75z"/><path fill="#FBBC05" d="M6.16 13.66a6.2 6.2 0 0 1 0-3.97V7.23H2.98a10 10 0 0 0 0 8.9z"/><path fill="#EA4335" d="M12 5.98c1.88 0 3.15.81 3.87 1.49l2.83-2.76C16.96 3.09 14.7 2.25 12 2.25a10 10 0 0 0-9.02 4.98l3.18 2.46A6.2 6.2 0 0 1 12 5.98z"/></svg>';

export function authSheetHTML(){
  const a = st(); if(!a) return '';
  const head = (t, back = '') => `<div class="mate-sh"><b>${back ? `<button type="button" class="auth-back" data-auth="${back}" aria-label="뒤로">‹</button>` : ''}${esc(t)}</b><button type="button" class="mate-ib" data-auth="close" aria-label="닫기">✕</button></div>`;
  const msg = a.msg ? `<p class="hint ${a.ok ? '' : 'warn'}" role="${a.ok ? 'status' : 'alert'}">${esc(a.msg)}</p>` : '';
  let body = '';
  if(a.mode === 'pick') body = `${head('로그인 · 가입')}${a.reason ? `<p class="hint">${esc(a.reason)}</p>` : ''}
    <button type="button" class="auth-btn kakao" data-auth="kakao" ${a.busy ? 'disabled' : ''}>${KAKAO_SVG}<span>카카오로 계속하기</span></button>
    <button type="button" class="auth-btn google" data-auth="google" ${a.busy ? 'disabled' : ''}>${GOOGLE_SVG}<span>Google로 계속하기</span></button>
    <button type="button" class="auth-btn email" data-auth="email-in" ${a.busy ? 'disabled' : ''}><span aria-hidden="true">✉</span><span>이메일로 계속하기</span></button>
    ${msg}<p class="hint">처음이면 이 단계에서 바로 가입돼요. 가입한 뒤 이용 신청을 하고 승인되면 기록이 서버에 보관돼요.</p>`;
  if(a.mode === 'email-in' || a.mode === 'email-up'){
    const up = a.mode === 'email-up';
    body = `${head(up ? '이메일로 가입' : '이메일로 로그인', 'pick')}
    <div class="seg" role="group" aria-label="로그인 또는 가입"><button type="button" data-auth="email-in" class="${up ? '' : 'active'}" aria-pressed="${!up}">로그인</button><button type="button" data-auth="email-up" class="${up ? 'active' : ''}" aria-pressed="${up}">처음이에요(가입)</button></div>
    <form class="auth-form" data-auth-form="${up ? 'up' : 'in'}">
      ${up ? '<label class="field">이름(메이트에게 보일 이름)<input id="auth-name" maxlength="20" autocomplete="nickname" placeholder="예: 문대표"></label>' : ''}
      <label class="field">이메일<input id="auth-email" type="email" inputmode="email" autocomplete="email" required value="${esc(a.email || '')}"></label>
      <label class="field">비밀번호${up ? ' (8자 이상)' : ''}<input id="auth-pw" type="password" autocomplete="${up ? 'new-password' : 'current-password'}" required minlength="${up ? 8 : 1}"></label>
      ${up ? '<label class="field">비밀번호 다시<input id="auth-pw2" type="password" autocomplete="new-password" required></label>' : ''}
      ${msg}
      <button type="submit" class="button" ${a.busy ? 'disabled' : ''}>${a.busy ? '잠시만요…' : up ? '가입하고 인증 메일 받기' : '로그인'}</button>
    </form>
    ${up ? '<p class="hint">가입하면 인증 메일이 가요. 메일의 링크를 누른 뒤 이용 신청을 할 수 있어요.</p>' : '<button type="button" class="auth-link" data-auth="reset">비밀번호를 잊었어요</button>'}`;
  }
  if(a.mode === 'reset') body = `${head('비밀번호 찾기', 'email-in')}<form class="auth-form" data-auth-form="reset"><label class="field">가입한 이메일<input id="auth-email" type="email" inputmode="email" autocomplete="email" required value="${esc(a.email || '')}"></label>${msg}<button type="submit" class="button" ${a.busy ? 'disabled' : ''}>비밀번호 다시 정하는 메일 받기</button></form>`;
  return `<div class="mate-ov auth-ov"><div class="mate-sheet" role="dialog" aria-label="로그인 · 가입">${body}</div></div>`;
}
// 다른 화면 안에 넣는 작은 로그인 묶음(메이트 초대 화면 등)
export function authInlineHTML(){
  return `<div class="auth-inline"><button type="button" class="auth-btn kakao" data-auth="kakao">${KAKAO_SVG}<span>카카오로 계속하기</span></button><button type="button" class="auth-btn google" data-auth="google">${GOOGLE_SVG}<span>Google로 계속하기</span></button><button type="button" class="auth-btn email" data-auth="open-email"><span aria-hidden="true">✉</span><span>이메일로 계속하기</span></button></div>`;
}
// 이메일 가입 후 인증 안내(이용 신청 화면 위)
export function verifyNoticeHTML(){
  const u = cloudState.user; if(!u || u.emailVerified || !(u.providerData || []).some(p => p.providerId === 'password')) return '';
  return `<div class="alert auth-verify"><p><strong>${esc(u.email || '')}로 인증 메일을 보냈어요</strong></p><p>메일의 링크를 누른 뒤 아래 '이용 신청'을 눌러 주세요. 메일이 없으면 스팸함을 봐 주세요.</p><div class="actions"><button type="button" class="button secondary" data-auth="resend">인증 메일 다시 받기</button><button type="button" class="button secondary" data-auth="reload">인증했어요</button></div></div>`;
}

function startKakao(){
  const url = aiWorkerUrl(); if(!url){ $f.toast('카카오 로그인이 아직 준비되지 않았어요.'); return; }
  const a = new Uint8Array(18); crypto.getRandomValues(a);
  const state = Array.from(a, v => 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_'[v % 64]).join('');
  try { localStorage.setItem(KAKAO_STATE, JSON.stringify({state, at: Date.now()})); } catch {}
  const ret = isNative() ? 'https://localhost/' : `${location.origin}${location.pathname}`;
  location.href = `${url}/kakao/start?state=${state}&return=${encodeURIComponent(ret)}`;
}
// 앱이 켜질 때: 주소 # 뒤에 카카오 결과가 있으면 로그인(state가 맞을 때만)
export async function finishKakaoFromHash(){
  const h = BOOT_HASH;
  if(!/^#kakao(-error)?=/.test(h)) return false;
  const p = new URLSearchParams(h.slice(1));
  // 5.0.6 보안: 로그인 표(커스텀 토큰)가 주소창·화면 공유·주소 복사로 새지 않게 바로 지운다
  const clear = () => { try { history.replaceState(history.state, '', location.pathname + location.search); } catch {} };
  let saved = null; try { saved = JSON.parse(localStorage.getItem(KAKAO_STATE) || 'null'); localStorage.removeItem(KAKAO_STATE); } catch {}
  clear();
  if(p.get('kakao-error')){ setTimeout(() => $f.toast?.(p.get('kakao-error')), 300); return true; }
  if(!saved || saved.state !== p.get('s') || Date.now() - saved.at > 15 * 60_000){ setTimeout(() => $f.toast?.('카카오 로그인을 확인하지 못했어요. 다시 해 주세요.'), 300); return true; }
  try { await signInWithKakaoToken(p.get('kakao'), p.get('n') || ''); location.reload(); }
  catch(e){ setTimeout(() => $f.toast?.(e.message), 300); }
  return true;
}

export async function authClick(t){
  const k = t?.dataset?.auth; if(!k) return false;
  if(k === 'close'){ closeAuth(); return true; }
  if(k === 'open-email'){ openAuth('email-in'); return true; }
  if(k === 'pick' || k === 'email-in' || k === 'email-up' || k === 'reset'){ const email = document.getElementById('auth-email')?.value || st()?.email || ''; $s.auth = {...(st() || {}), mode: k, msg: '', email}; $f.render(); return true; }
  if(k === 'google'){ try { if(st()) st().busy = true; await cloudLogin(); } catch(e){ if(e?.silent){ if(st()){ st().busy = false; $f.render(); } return true; } if(st()){ st().busy = false; st().msg = e.message || '로그인하지 못했어요.'; $f.render(); } else $f.toast(e.message || '로그인하지 못했어요.'); } return true; }
  if(k === 'kakao'){ startKakao(); return true; }
  if(k === 'resend'){ try { await resendVerification(); $f.toast('인증 메일을 다시 보냈어요.'); } catch(e){ $f.toast(e.message); } return true; }
  if(k === 'reload'){ location.reload(); return true; }
  return false;
}
export async function authSubmit(form){
  const kind = form?.dataset?.authForm; if(!kind) return false;
  const a = st() || ($s.auth = {mode: 'email-in'});
  const v = id => document.getElementById(id)?.value || '';
  a.email = v('auth-email'); a.msg = ''; a.ok = false;
  if(kind === 'up' && v('auth-pw') !== v('auth-pw2')){ a.msg = '비밀번호가 서로 달라요.'; $f.render(); return true; }
  a.busy = true; $f.render();
  try {
    if(kind === 'in') await emailSignIn({email: a.email, password: v('auth-pw')});
    else if(kind === 'up') await emailSignUp({email: a.email, password: v('auth-pw'), name: v('auth-name')});
    else { await emailReset(a.email); a.ok = true; a.msg = '메일을 보냈어요. 메일의 링크에서 새 비밀번호를 정한 뒤 로그인해 주세요.'; }
  } catch(e){ a.msg = e.message || '처리하지 못했어요.'; }
  a.busy = false; $f.render();
  return true;
}
