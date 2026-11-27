import test from 'node:test';
import assert from 'node:assert/strict';

globalThis.navigator ??= {userAgent:'node',platform:'',maxTouchPoints:0};
globalThis.addEventListener ??= () => {};
const {detectDevice, installModalBody, APP_VERSION, guessBrowser, BROWSERS} = await import('../install.js');
const pkg = JSON.parse(await (await import('node:fs/promises')).readFile(new URL('../package.json', import.meta.url), 'utf8'));

test('설치 안내: 기기 판별', () => {
  assert.equal(detectDevice('Mozilla/5.0 (Linux; Android 9; SM-N950N) Chrome/138', 'Linux armv8l', 5), 'android');
  assert.equal(detectDevice('Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) Safari', 'iPhone', 5), 'ios');
  assert.equal(detectDevice('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Safari', 'MacIntel', 5), 'ios'); // iPadOS 데스크톱 모드
  assert.equal(detectDevice('Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/140', 'Win32', 0), 'desktop');
});

test('설치 안내: 앱 버전은 package.json 버전과 같다', () => {
  assert.equal(APP_VERSION, pkg.version);
});

test('설치 안내(2026-11-27): APK 없이 브라우저별 홈 화면 추가, 크롬·사파리가 앞', () => {
  const and = installModalBody('android', 'Mozilla/5.0 (Linux; Android 14) Chrome/140 Mobile');
  const ios = installModalBody('ios', 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) Version/18 Mobile Safari/604');
  const pc = installModalBody('desktop', 'Mozilla/5.0 (Windows NT 10.0) Chrome/140');
  for(const h of [and, ios, pc]) assert.doesNotMatch(h, /APK|\.apk/);
  assert.match(and, /data-install-browser="chrome" aria-pressed="true"/); assert.match(and, /홈 화면에 추가/); assert.doesNotMatch(and, /data-install-browser="safari"/);
  assert.match(ios, /data-install-browser="safari" aria-pressed="true"/); assert.match(ios, /홈 화면에 추가/);
  assert.ok(ios.indexOf('"chrome"') < ios.indexOf('"inapp"'));
  assert.equal(guessBrowser('Mozilla/5.0 (Linux; Android 14) SamsungBrowser/27 Chrome/125', 'android'), 'samsung');
  assert.equal(guessBrowser('Mozilla/5.0 (Linux; Android 14) KAKAOTALK 10', 'android'), 'inapp');
  assert.ok(BROWSERS[0][0] === 'chrome' && BROWSERS[1][0] === 'safari');
});
