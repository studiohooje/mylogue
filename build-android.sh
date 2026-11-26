#!/usr/bin/env bash
# 맥용 Android APK 빌드(윈도우 build-android.ps1과 같은 일). 실행: bash build-android.sh
# 필요: JDK 21(JAVA_HOME), Android SDK(ANDROID_HOME, 기본 ~/Library/Android/sdk), Node 22+.
# 서명: ~/.android/debug.keystore 가 노트북과 같은 파일이어야 폰의 기존 앱 위에 업데이트된다.
set -euo pipefail
project="$(cd "$(dirname "$0")" && pwd)"
app="$project/app"
export ANDROID_HOME="${ANDROID_HOME:-$HOME/Library/Android/sdk}"
if [ -z "${JAVA_HOME:-}" ]; then JAVA_HOME="$(/usr/libexec/java_home -v 21 2>/dev/null || true)"; export JAVA_HOME; fi
[ -n "${JAVA_HOME:-}" ] && [ -x "$JAVA_HOME/bin/java" ] || { echo "JDK 21을 찾을 수 없어요(brew install --cask temurin@21)"; exit 1; }
[ -x "$ANDROID_HOME/platform-tools/adb" ] || { echo "Android SDK를 찾을 수 없어요: $ANDROID_HOME (Android Studio 설치 후 SDK Manager)"; exit 1; }
[ -f "$HOME/.android/debug.keystore" ] || echo "주의: ~/.android/debug.keystore 가 없어요. 노트북의 키를 복사하지 않으면 폰에서 업데이트가 안 돼요."
export GRADLE_USER_HOME="$project/.gradle-cache"

cd "$app"
npm test
npm run build
node verify-build.mjs
rm -rf dist/downloads   # 웹 배포용 다운로드 폴더(APK·ZIP)는 앱 안에 넣지 않는다
npx cap sync android
cd android
chmod +x gradlew
./gradlew assembleRelease --no-daemon
apk="$app/android/app/build/outputs/apk/release/app-release.apk"
ls -l "$apk"
shasum -a 256 "$apk"
