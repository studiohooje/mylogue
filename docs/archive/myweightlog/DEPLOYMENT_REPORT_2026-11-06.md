# 배포 검증 및 재개 기록 — 2026-11-06

## 완료
- 공개 저장소 https://github.com/studiohooje/MyWeightLog
- 웹 https://studiohooje.github.io/MyWeightLog/
- 기능 커밋 6d78634 GitHub Actions success 확인. 설명 수정 2e4aa32 push 완료.
- Firebase myweightlog-b7ae7 / Spark / Firestore Seoul.
- Google Auth 사용자 studiohooje 계정 UID 확인. 이는 현재 앱 로그인 완료 증거가 아님.
- 대표님 실행 시점 승인 후 소유자 전용 Firestore 규칙 게시. 새로고침 뒤 UID 규칙 유지 확인. 원본 app/firestore.rules에 실제 UID 저장. 공개 저장소 규칙은 배포 템플릿으로 유지.
- 최종 단위 테스트 84/84 통과, public build/verify 통과. 이전 규칙 에뮬레이터 11 케이스 통과 기록 존재.
- Android 1.2-beta versionCode3 / pro.hooje.myweightlog 빌드 및 에뮬레이터 업데이트 설치 성공.
- 실기동 검사에서 Capacitor.registerPlugin 누락 발견. 공식 @capacitor/core 8.6.0 ESM 번들 등록으로 수정, 재빌드.
- app/qa/android-native-v4.json: 네이티브 브리지 getCurrentUser 실제 응답, Firebase 초기화, 로컬 SDK, 게스트 공간 모두 통과.
- APK artifacts/MyWeightLog-v4-1.2-beta.apk
- SHA256 48AC43B52F4107DACD016CE194D460AA67A61133E664D0000F3E105E8D83A066

## 미완료 — 완료로 보고하지 말 것
1. 실제 웹 Google 로그인 반환: Chrome 계정 선택에서 Loading 정지. 선택 Enter/click, 새로고침, 다른 계정 로그인도 미해결. Firebase 로그인 이력만 확인했으며 현재 세션 로그인 성공으로 간주하면 안 됨.
2. 소유자 실제 서버 저장/불러오기/두 클라이언트 동기화. 로그인 장애 해결 뒤 합성 데이터로 검증 필요.
3. Android 실제 Google 계정 로그인 및 웹과 동기화. 에뮬레이터 네이티브 브리지 테스트만 통과.
4. v4 업그레이드 데이터 보존 검증은 미실행. 기존 android-upgrade.json은 이전 v1→v2 결과이며 v4 증거가 아님.
5. README 마지막 커밋 2e4aa32 배포 결과 확인.

## 재개 지점
- Chrome browser ID2 (현재 ID3는 IAB이므로 혼동 금지).
- 기존 앱 탭1315301099는 Debugger unattached. 새 앱1315301231, Google 팝업1315301234에서 로딩 정지.
- Firebase rules 탭1315301228: 게시 후 새로고침 검증 완료.
- 대표님께 반복 로그인 요청하지 말고 Google 인증 로딩 원인 해결부터 진행.
- 서명키/데이터 삭제/Chrome 전체 쿠키 삭제 금지. 다른 Google 계정으로 임의 전환 금지.
- Android adb emulator-5554, QA forward9237 사용. PID는 재조회.
- 새 APK는 기존 버전 위 업데이트 가능하나 대표님 폰에서 실제 확인 필요.

## 추가 검증 — 2026-11-06 17:18 KST
- 대표님이 데스크톱 Chrome에서 로그인 완료 후 앱 Settings의 studiohooje 계정/UID를 직접 확인.
- 실제 동기화 실행 후 마지막 완료 2026-11-06 17:18:52 표시 확인.
- Firebase Console records에서 settings 5개 문서 생성 확인. 실제 서버 쓰기 성공.
- 증거 artifacts/web-sync-success.png.
- 앞선 미완료 1번(현재 웹 로그인 반환)은 해결. 2번은 최초 서버 저장 확인까지 진행. 두 클라이언트 변경/삭제 왕복과 Android 실제 계정 동기화는 여전히 미검증.
- Google 로딩 정지의 정확한 근본 원인은 확정되지 않음. 현재 성공으로만 보고할 것.
