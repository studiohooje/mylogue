// 앱 설치 안내: 기기마다 다른 설치 경로를 한 버튼으로 안내한다.
// - 2026-11-27부터: 모든 기기에서 브라우저별 '홈 화면에 추가'(웹앱) 방법. APK 내려받기 안내는 뺐다(파일은 계속 올림)
// - 크롬이 바로 설치를 허락하면(beforeinstallprompt) 맨 위에 '지금 바로 앱으로 설치' 버튼
// - 이미 앱(APK) 안이거나 홈 화면 앱으로 실행 중이면 버튼을 숨긴다.
export const APP_VERSION = '5.10.1';

let deferredPrompt = null;
let rerender = () => {};

export function detectDevice(ua = globalThis.navigator?.userAgent || '', platform = globalThis.navigator?.platform || '', touch = globalThis.navigator?.maxTouchPoints || 0) {
  if (/iPad|iPhone|iPod/.test(ua) || (platform === 'MacIntel' && touch > 1)) return 'ios';
  if (/Android/i.test(ua)) return 'android';
  return 'desktop';
}

function isInstalledApp() {
  if (globalThis.Capacitor?.isNativePlatform?.()) return true;
  if (globalThis.navigator?.standalone) return true;
  return !!globalThis.matchMedia?.('(display-mode: standalone)').matches;
}

export function initInstall(onChange) {
  rerender = onChange || rerender;
  globalThis.addEventListener?.('beforeinstallprompt', event => {
    // 크롬 자동 배너 대신 설치 창 안의 '지금 바로 앱으로 설치' 버튼으로 띄운다
    event.preventDefault();
    deferredPrompt = event;
    rerender();
  });
  globalThis.addEventListener?.('appinstalled', () => { deferredPrompt = null; rerender(); });
}

const phoneIcon = '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="6" y="2.5" width="12" height="19" rx="2.5"/><path d="M12 7v7m-3-3 3 3 3-3"/></svg>';
const shareIcon = '<svg class="install-inline-icon" viewBox="0 0 24 24" width="18" height="18" aria-label="공유 아이콘" role="img" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v12M8 7l4-4 4 4"/><path d="M6 11H5a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-8a1 1 0 0 0-1-1h-1"/></svg>';
const plusIcon = '<svg class="install-inline-icon" viewBox="0 0 24 24" width="18" height="18" aria-label="더하기 아이콘" role="img" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="3.5" y="3.5" width="17" height="17" rx="4"/><path d="M12 8v8M8 12h8"/></svg>';

export function installChip() {
  if (isInstalledApp()) return '';
  return `<button type="button" class="install-chip" data-modal="install" aria-label="앱 설치 방법 보기">${phoneIcon}<span>앱 설치</span></button>`;
}

const steps = items => `<ol class="install-steps">${items.map(t => `<li>${t}</li>`).join('')}</ol>`;

// 2026-11-27 대표님: APK 내려받기는 빼고, 쓰는 브라우저를 누르면 '홈 화면에 추가'로 앱처럼 쓰는 방법만. 크롬·사파리를 맨 앞, 나머지는 뒤로
const menu = t => `<b>${t}</b>`;
export const BROWSERS = [
  ['chrome', '크롬', {
    android: [`오른쪽 위 ${menu('⋮')} 메뉴를 눌러요.`, `${menu('홈 화면에 추가')}(또는 ${menu('앱 설치')})를 눌러요.`, `${menu('설치')}를 누르면 홈 화면에 마이로그가 생겨요.`],
    ios: [`주소창 오른쪽 ${shareIcon} ${menu('공유')} 버튼을 눌러요.`, `${plusIcon} ${menu('홈 화면에 추가')}를 눌러요.`, `${menu('추가')}를 누르면 끝이에요.`],
    desktop: ['주소창 오른쪽 끝의 설치 아이콘(모니터 모양)을 눌러요.', `없으면 ${menu('⋮')} 메뉴 → ${menu('전송, 저장, 공유')} → ${menu('페이지를 앱으로 설치')}.`, `${menu('설치')}를 누르면 바탕화면·시작 메뉴에 생겨요.`]}],
  ['safari', '사파리', {
    ios: [`화면 아래(iPad는 위) ${shareIcon} ${menu('공유')} 버튼을 눌러요.`, `목록을 올려 ${plusIcon} ${menu('홈 화면에 추가')}를 눌러요.`, `오른쪽 위 ${menu('추가')}를 누르면 홈 화면에 마이로그가 생겨요.`],
    desktop: [`Mac 사파리: 메뉴 막대 ${menu('파일')} → ${menu('Dock에 추가')}.`, `${menu('추가')}를 누르면 Dock에 마이로그가 생겨요.`]}],
  ['samsung', '삼성 인터넷', {
    android: [`아래 ${menu('≡')} 메뉴를 눌러요.`, `${menu('현재 페이지 추가')}를 눌러요.`, `${menu('홈 화면')}을 고르면 홈 화면에 마이로그가 생겨요.`]}],
  ['whale', '네이버 웨일', {
    android: [`아래 ${menu('≡')} 메뉴를 눌러요.`, `${menu('홈 화면에 추가')}를 눌러요.`, `${menu('추가')}를 누르면 끝이에요.`]}],
  ['edge', '엣지', {
    android: [`아래 ${menu('···')} 메뉴를 눌러요.`, `${menu('휴대폰에 추가')}(또는 ${menu('홈 화면에 추가')})를 눌러요.`, `${menu('설치')}를 누르면 끝이에요.`],
    desktop: [`오른쪽 위 ${menu('···')} 메뉴 → ${menu('앱')} → ${menu('이 사이트를 앱으로 설치')}.`, `${menu('설치')}를 누르면 끝이에요.`]}],
  ['firefox', '파이어폭스', {
    android: [`오른쪽 위(또는 아래) ${menu('⋮')} 메뉴를 눌러요.`, `${menu('설치')} 또는 ${menu('홈 화면에 추가')}를 눌러요.`, `${menu('추가')}를 누르면 끝이에요.`]}],
  ['inapp', '카카오톡·네이버 앱 안', {
    any: [`앱 안에서 연 화면은 홈 화면에 추가가 안 돼요.`, `오른쪽 위(또는 아래) 메뉴에서 ${menu('다른 브라우저로 열기')}를 눌러요.`, '열린 브라우저에서 위 방법대로 하면 돼요.']}],
];
const ua0 = () => globalThis.navigator?.userAgent || '';
// 지금 쓰는 브라우저를 미리 골라 둔다(못 알아보면 크롬)
export function guessBrowser(ua = ua0(), device = detectDevice()) {
  if (/KAKAOTALK|NAVER\(inapp|Instagram|FBAN|FBAV|Line\//i.test(ua)) return 'inapp';
  if (/SamsungBrowser/i.test(ua)) return 'samsung';
  if (/Whale/i.test(ua)) return 'whale';
  if (/EdgA?|EdgiOS|Edg\//.test(ua)) return 'edge';
  if (/Firefox|FxiOS/i.test(ua)) return 'firefox';
  if (/CriOS|Chrome/i.test(ua)) return 'chrome';
  if (device === 'ios' || /Safari/i.test(ua)) return 'safari';
  return 'chrome';
}
let picked = null;
const stepsFor = (id, device) => { const b = BROWSERS.find(x => x[0] === id)?.[2] || {}; return b.any || b[device] || b.android || b.ios || b.desktop || []; };

export function installModalBody(device = detectDevice(), ua = ua0()) {
  const cur = picked || guessBrowser(ua, device);
  const chips = BROWSERS.filter(([, , m]) => m.any || m[device] || device === 'desktop').map(([id, label]) => `<button type="button" class="install-browser${id === cur ? ' on' : ''}" data-install-browser="${id}" aria-pressed="${id === cur}">${label}</button>`).join('');
  const pwa = deferredPrompt ? `<button type="button" class="button install-primary" id="install-pwa">지금 바로 앱으로 설치</button>` : '';
  return `<div class="install-sheet">${pwa}<section class="install-block">
<h3>쓰는 브라우저를 골라 주세요</h3>
<div class="install-browsers" role="group" aria-label="브라우저">${chips}</div>
${steps(stepsFor(cur, device))}
<p class="install-note">홈 화면 아이콘으로 열면 주소창 없이 앱처럼 쓸 수 있어요. 로그인하면 기록이 다른 기기와 이어져요.</p>
</section></div>`;
}

export async function installClick(target) {
  if (target.dataset?.installBrowser) { picked = target.dataset.installBrowser; rerender(); return true; }
  if (target.id !== 'install-pwa') return false;
  if (!deferredPrompt) return true;
  const prompt = deferredPrompt;
  deferredPrompt = null;
  await prompt.prompt();
  await prompt.userChoice.catch(() => null);
  rerender();
  return true;
}
