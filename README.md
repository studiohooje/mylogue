# 마이로그 (Mylogue)

체중·체성분, 식단, 운동을 한 사람의 시간순 기록으로 잇는 개인 기록 앱입니다. 기록(log)이 쌓이면 나의 이야기(logue)가 된다는 뜻을 이름에 담았습니다.

- 웹: https://studiohooje.github.io/mylogue/ (아이폰은 Safari에서 ‘홈 화면에 추가’)
- Android: 웹의 ‘앱 설치’ 버튼으로 받는 베타 APK
- 변경 내용: [CHANGELOG.md](CHANGELOG.md) · 사용자용 패치노트 [docs/patch-notes/](docs/patch-notes/)

## 지금 상태 (5.0.4)

- **베타**입니다. 로그인 없이 이 기기에서만 쓰거나, 카카오·Google·이메일로 가입하면 승인 없이 바로 기기 간 동기화를 씁니다.
- 화면은 페이지마다 '요약 → 그래프 → 기록 → 맨 아래 더 보기 타일' 순서로 정리되어 있고, 날짜 선택은 제목 아래 작은 칸입니다.
- AI는 기록 **초안**만 만들고, 저장은 사람이 확인한 뒤에만 됩니다.
- **프리미엄**(관리자가 지정한 시험 계정): AI 인사이트(버튼을 누를 때만, 하루 3번), 목표 도달 예측·체중을 움직인 것·이번 달 vs 지난 달, AI 대화 입력·묻기 등. 손 기록·그래프·검색은 무료입니다.
- **메이트로그**: 친구·가족과 방을 만들어 사진으로 기록을 나눕니다(앱 안 카메라, 시각 도장, 사진 90일 보관). 마이태그로 초대할 수 있습니다.
- 코치 모드(강사–회원 연결)와 필라테스 수업 기록은 **시험 중**입니다.
- 계정 삭제는 앱의 ‘설정 › 계정·마이태그’에서 서버 기록까지 바로 지울 수 있습니다.

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

- 기록은 먼저 기기(브라우저·앱)에 저장되고, 로그인한 계정은 서버(Google Firebase, 서울 리전)와 동기화합니다. 메이트 사진은 Cloudflare R2에 90일 보관됩니다.
- 빈 값은 0이 아니라 ‘입력 안 함’으로 둡니다. 추정치는 추정이라고 표시합니다.
- 실제 건강 기록·백업 파일·키는 이 저장소에 올리지 않습니다.
- 개인정보처리방침·이용약관: 앱의 설정 › 도움말·소개, 또는 `app/privacy.html`·`app/terms.html`.

문의: studiohooje@gmail.com
