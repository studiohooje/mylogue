import test from 'node:test';
import assert from 'node:assert/strict';

globalThis.navigator ??= {userAgent:'node',platform:'',maxTouchPoints:0};
globalThis.addEventListener ??= () => {};
const {detectDevice, installModalBody, APP_VERSION} = await import('../install.js');
const pkg = JSON.parse(await (await import('node:fs/promises')).readFile(new URL('../package.json', import.meta.url), 'utf8'));

test('설치 안내: 기기 판별', () => {
  assert.equal(detectDevice('Mozilla/5.0 (Linux; Android 9; SM-N950N) Chrome/138', 'Linux armv8l', 5), 'android');
  assert.equal(detectDevice('Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) Safari', 'iPhone', 5), 'ios');
  assert.equal(detectDevice('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Safari', 'MacIntel', 5), 'ios'); // iPadOS 데스크톱 모드
  assert.equal(detectDevice('Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/140', 'Win32', 0), 'desktop');
});

test('설치 안내: 앱 버전과 APK 파일 이름이 package.json 버전과 같다', () => {
  assert.equal(APP_VERSION, pkg.version);
  assert.match(installModalBody('android'), new RegExp(`downloads/Mylogue-Beta-${APP_VERSION.replaceAll('.', '\.')}-debug\.apk`));
});

test('설치 안내: 안드로이드는 APK, 아이폰은 홈 화면 추가, PC는 둘 다', () => {
  const android = installModalBody('android'), ios = installModalBody('ios'), desktop = installModalBody('desktop');
  assert.match(android, /APK 내려받기/); assert.doesNotMatch(android, /홈 화면에 추가/);
  assert.match(ios, /홈 화면에 추가/); assert.doesNotMatch(ios, /APK/);
  assert.match(desktop, /APK 내려받기/); assert.match(desktop, /홈 화면에 추가/);
});
