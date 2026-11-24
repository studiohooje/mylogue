// 앱 설치 안내: 기기마다 다른 설치 경로를 한 버튼으로 안내한다.
// - Android 브라우저: 실제 APK 내려받기(크롬의 자동 '웹앱 설치' 배너는 막고 APK로 유도)
// - iPhone·iPad: Safari '홈 화면에 추가' 방법을 팝업으로 안내(PWA)
// - PC: 이 PC에 웹앱 설치(가능할 때) + 휴대폰별 방법
// - 이미 앱(APK) 안이거나 홈 화면 앱으로 실행 중이면 버튼을 숨긴다.
export const APP_VERSION = '4.18.1';
const APK_SIZE_MB = 44;
const apkFile = `downloads/Mylogue-Beta-${APP_VERSION}-debug.apk`;
const zipFile = `downloads/Mylogue-Beta-${APP_VERSION}-debug.zip`;

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
    // Android에서는 크롬 자동 배너 대신 APK 설치로 안내한다. PC는 버튼 안에서 직접 띄운다.
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

function androidBlock() {
  return `<section class="install-block">
<h3>Android 휴대폰</h3>
<a class="button install-primary" href="${apkFile}" download>APK 내려받기 <small>약 ${APK_SIZE_MB}MB</small></a>
${steps(['위 버튼으로 파일을 내려받아요.', '다 받으면 알림이나 \'내 파일 → 다운로드\'에서 파일을 눌러요.', '\'출처를 알 수 없는 앱\' 허용을 물으면 이번 한 번 허용해요.', '\'설치\'를 누르면 끝이에요.'])}
<p class="install-note">이미 설치했다면 같은 방법으로 받아 설치하면 기록을 그대로 둔 채 업데이트돼요. <a href="${zipFile}" download>파일이 안 받아지면 ZIP으로 받기</a></p>
</section>`;
}

function iosBlock() {
  return `<section class="install-block">
<h3>iPhone·iPad</h3>
${steps([`Safari에서 이 페이지를 열어요.`, `화면 아래(iPad는 위) ${shareIcon} <b>공유</b> 버튼을 눌러요.`, `목록을 올려 ${plusIcon} <b>홈 화면에 추가</b>를 눌러요.`, `오른쪽 위 <b>추가</b>를 누르면 홈 화면에 마이로그가 생겨요.`])}
<p class="install-note">홈 화면 아이콘으로 열면 주소창 없이 앱처럼 쓸 수 있어요. 로그인하면 기록이 다른 기기와 동기화돼요.</p>
</section>`;
}

function desktopBlock() {
  if (!deferredPrompt) return '';
  return `<section class="install-block">
<h3>이 컴퓨터</h3>
<button type="button" class="button install-primary" id="install-pwa">이 컴퓨터에 앱으로 설치</button>
</section>`;
}

export function installModalBody(device = detectDevice()) {
  if (device === 'android') return `<div class="install-sheet">${androidBlock()}</div>`;
  if (device === 'ios') return `<div class="install-sheet">${iosBlock()}</div>`;
  return `<div class="install-sheet">${desktopBlock()}${androidBlock()}${iosBlock()}</div>`;
}

export async function installClick(target) {
  if (target.id !== 'install-pwa') return false;
  if (!deferredPrompt) return true;
  const prompt = deferredPrompt;
  deferredPrompt = null;
  await prompt.prompt();
  await prompt.userChoice.catch(() => null);
  rerender();
  return true;
}
