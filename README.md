# 마이로그 (Mylogue)

체중·체성분, 식단, 운동을 한 사람의 시간순 기록으로 잇는 개인 기록 앱입니다. 기록(log)이 쌓이면 나의 이야기(logue)가 된다는 뜻을 이름에 담았습니다.

- 웹: https://studiohooje.github.io/mylogue/ (아이폰은 Safari에서 ‘홈 화면에 추가’)
- Android: 웹의 ‘앱 설치’ 버튼으로 받는 베타 APK
- 변경 내용: [CHANGELOG.md](CHANGELOG.md) · 사용자용 패치노트 [docs/patch-notes/](docs/patch-notes/)

## 지금 상태

- **비공개 베타**입니다. 로그인 없이 이 기기에서만 쓰거나, Google 로그인 후 이용 신청 → 승인되면 기기 간 동기화를 씁니다.
- 승인 전에도 모든 기록과 ‘AI 답 붙여넣기’(이 기기 검토함)를 쓸 수 있습니다.
- AI는 기록 **초안**만 만들고, 저장은 사람이 확인한 뒤에만 됩니다.
- 코치 모드(강사–회원 연결)와 필라테스 수업 기록은 **비공개 시험 중**입니다.
- 계정 삭제는 앱의 ‘설정 › 계정 삭제’에서 서버 기록까지 바로 지울 수 있습니다.

## 실행과 빌드

Node.js 22 이상. `app` 폴더에서:

```powershell
npm ci
npm test
npm run build
npm run serve   # http://localhost:4173
```

Android 디버그 APK는 루트의 `build-android.ps1`로 만듭니다(JDK 21, Android SDK 필요). 루트에 `Mylogue-Beta-<버전>-debug.apk`를 두고 `npm run build`를 실행하면 같은 APK를 담은 ZIP과 함께 `dist/downloads/`에 들어갑니다.

## 데이터

- 기록은 먼저 기기(브라우저·앱)에 저장되고, 승인 계정은 서버(Google Firebase, 서울 리전)와 동기화합니다.
- 빈 값은 0이 아니라 ‘입력 안 함’으로 둡니다. 추정치는 추정이라고 표시합니다.
- 실제 건강 기록·백업 파일·키는 이 저장소에 올리지 않습니다.
- 개인정보처리방침·이용약관: 앱의 설정 맨 아래, 또는 `app/privacy.html`·`app/terms.html`.

문의: studiohooje@gmail.com
