# Claude Code 인수인계 프롬프트 — 마이로그(Mylogue) · 2026-11-19 대화 전체

> 사용법: Claude Code를 `C:\VibeCoding Claude\Mylogue` 폴더에서 연 뒤 첫 메시지로 **"docs/CLAUDE_CODE_HANDOFF_2026-11-19.md를 읽고 이어서 작업해"**라고 하거나, 이 문서 전체를 붙여 넣는다.
> 이 문서는 2026-11-19 Claude 앱 대화(약 18:47~19:58)의 전 과정을 기록한다. `CLAUDE.md`(상시 지시서)와 함께 읽는다.

---

## 0. 너(Claude Code)에게 주는 지시

1. 사용자는 **대표님**. 한국어로 답한다. 대표님은 승인 범위를 넓게 주고 **논스톱 진행**을 원한다("승인이 필요한 부분이 있으면 다 승인해줄테니 논스톱으로 작업해"). 단 되돌릴 수 없는 일(실데이터 삭제, 요금제·결제, 계정 권한)은 확인한다.
2. **배포까지 항상 네가 직접 한다.** 대표님은 "매번 내가 배포하는 것 말고 너가 배포까지 했으면 좋겠다"고 명시했다. 이전 대화 환경(클라우드 + 리눅스 VM)에서는 Windows의 GitHub 로그인을 쓸 수 없어 대표님이 직접 실행해야 했다. Claude Code는 Windows에서 돌므로 `git push`, `build-android.ps1` 등을 직접 실행한다.
3. 먼저 읽을 것: `CLAUDE.md` → `PROJECT_DIRECTION_AND_DECISIONS.md` → `docs/worklog/3.0.0.md`, `docs/worklog/3.0.1.md` → `docs/CLAUDE_INTAKE_REVIEW_2026-11-19.md`.
4. 실행하지 않은 시험을 통과라고 쓰지 않는다. 목업을 앱 적용이라고 쓰지 않는다.

## 1. 지금 당장 이어서 할 일 (우선순위 순)

### 1-1. 3.0.1 배포 (미완료일 가능성 높음)
- 로컬에는 3.0.1 변경(상단 계정 버튼)이 커밋되지 않은 상태로 있다. 대표님께 `publish.cmd` 더블클릭을 부탁했으나 실행 여부 미확인.
- 확인: `git status`, `git log --oneline -3`, GitHub Actions(https://github.com/studiohooje/mylogue/actions).
- 미배포라면 네가 직접: `git config i18n.commitEncoding utf-8` → `git add -A` → UTF-8 파일로 커밋 메시지 작성 후 `git commit -F <파일>` → `git push` → Actions 성공 확인 → https://studiohooje.github.io/mylogue/ 에서 버전 3.0.1·우상단 '로그인' 버튼 확인.
- 주의: PowerShell에서 한글 커밋 메시지를 `-m`으로 넣으면 깨진다(첫 커밋 `0d60b8a`의 메시지가 깨져 있음). `publish.cmd`(chcp 65001 + `publish-msg.txt`) 또는 `publish.ps1 "메시지"`를 쓴다. `publish-msg.txt`, `.tmp-qa/`는 gitignore됨.
- `.tmp-qa/dist.tgz`는 시각 검수용 임시 파일. 지워도 된다.

### 1-2. 관리자 지정 + Firestore 보안 규칙 게시 (서버 기능이 아직 전부 막혀 있음)
- 새 Firebase 프로젝트는 **규칙 게시 전이라 Firestore 접근이 전부 거부**된다(프로덕션 모드 기본 규칙). 로그인은 되지만 승인 신청·동기화·공용 도감이 동작하지 않는다.
- 관리자 UID가 이전 프로젝트 값 `x65cKbgpsQVk6oj7JIDnLVFDYtN2`로 하드코딩되어 있다(UID는 프로젝트마다 다름). 위치: `app/firestore.rules`, `app/storage.rules`, `app/catalog-cloud.js`, `app/cloud-sync.js`, `app/cloud-ui.js`, `app/tests/approval-rules.test.js`, `app/tests/rules-emulator.mjs`.
- 순서: 대표님이 새 웹앱 우상단 **로그인** 버튼으로 앱에서 쓸 Google 계정 로그인 → Firebase 콘솔 Authentication > 사용자에서 새 UID 확인 → 위 파일 전부 교체 → `npm test` → Firestore 규칙 게시 → (Storage는 Spark에서 미사용이지만 규칙 파일은 맞춰 둠) → 배포.
- 규칙 게시 방법: Firebase CLI가 있으면 `npx firebase-tools login` 후 `npx firebase-tools deploy --only firestore:rules --project mylogue-5ce38` (app 폴더, `firebase.json` 있음). 없으면 콘솔 Firestore > 규칙에 `app/firestore.rules` 내용을 붙여 넣고 게시.
- 대표님의 앱 로그인 계정이 Firebase 소유 계정(hwj.rouget@gmail.com)과 같은지는 미확인. 로그인한 계정의 UID를 쓴다.
- 그 뒤 승인 흐름 확인: 로그인 → 신청 → 관리자 승인 화면 → 승인 → 기록 저장·동기화.

### 1-3. Android APK (노트8·일반폰 모두 호환 필수)
- 새 폴더에는 `node_modules`가 없다 → `cd app; npm ci` 먼저.
- `build-android.ps1` (JDK: 이 폴더 `jdk21\jdk-21.0.13.0.2+1`, SDK: `%LOCALAPPDATA%\Android\Sdk`, `GRADLE_USER_HOME=.gradle-cache`). 내부적으로 npm test → build → verify-build → `npx cap sync android` → `gradlew assembleDebug`.
- `npx cap sync android`가 `app/android/app/src/main/assets/public`(이전 이름이 섞인 오래된 사본)을 새로 덮어쓴다.
- Android 프로젝트 이름 변경 반영됨: `namespace/applicationId pro.hooje.mylogue`, `MainActivity.java`는 `java/pro/hooje/mylogue/`(옛 빈 폴더 `java/pro/hooje/myweightlog/`는 삭제 권한이 없어 남아 있음 → 지워도 됨), `strings.xml` 앱 이름 '마이로그', versionCode 12 / versionName 3.0.1-beta.
- `app/android/app/google-services.json`은 콘솔 값으로 **직접 작성**했다(다운로드가 막혀서). 내용: project 348245522814 / mylogue-5ce38, android app `1:348245522814:android:aab4c0a6138c03070adb2f`, Android OAuth client `348245522814-rjh61nseblvc06aqjcc5n5o3vlmrlqbb...`, web client(type 3) `348245522814-qt717a4ukheq2b7d5c5ng66tnghi2epv.apps.googleusercontent.com`, Android API key(콘솔 'Android key (auto created by Firebase)'), certificate_hash `aac127f8d4d450c60c1f899818de13df7939a8bc`. 빌드나 Google 로그인에서 문제가 나면 콘솔(프로젝트 설정 > Mylogue Android)에서 공식 파일을 내려받아 교체한다.
- 디버그 서명 SHA-1 `AA:C1:27:F8:D4:D4:50:C6:0C:1F:89:98:18:DE:13:DF:79:39:A8:BC` — 2.1.1 APK 서명 블록에서 추출했고 이전 Firebase에 등록된 값과 같다 = 이 PC의 `~/.android/debug.keystore`. Firebase Android 앱에 등록 완료. 다른 PC에서 빌드하면 서명이 달라 업데이트 설치 불가.
- APK는 루트에 `Mylogue-Beta-<버전>-debug.apk`로 복사 후 `npm run build` → `dist/downloads/`에 APK와 ZIP 생성. **APK와 ZIP 항상 함께 게시**(대표님 요청). APK도 커밋해야 Pages에 올라간다(Actions는 저장소 내용으로 빌드).
- 실기기: 갤럭시 노트8(APK 사용)과 일반 폰 모두 설치·실행·Google 로그인 확인. 노트8은 Android 9가 마지막이라 Chrome/WebView 138에서 멈춘 상태. minSdk 24라 설치 자체는 가능.

### 1-4. 이후 대표님이 예고한 큰 과제 (아직 미착수)
- **0번 "찐빠" 정리**: 줄간격·자간·텍스트박스와 글씨 간격·좌우/상하 정렬. 웹 / 일반 폰 / 갤럭시 노트8 모두. 근본 원인 분석은 `docs/CLAUDE_INTAKE_REVIEW_2026-11-19.md` 2절(CSS 3층 덮어쓰기 `app.css`→`quick-entry.css`→`aurora-theme.css`, 미디어쿼리 경계 7종, 글자 크기 40종+, 10~11px 다수, 입력창 14px·12px → iPhone 자동 확대). 기준은 `CLAUDE.md` 8절(360/390/412/768/1280 다섯 폭 캡처 검증, 입력 16px 이상, 토큰화). impeccable 스킬(`.claude/skills/impeccable`) 사용.
- **2번 입력 방식 개선 5안** — 대표님께 이미 제안함. 아직 선택 안 받음. 공통 선행: 식사 입력 3경로 통합(홈 '식사 기록'→빠른 팔레트 / 하단 '추가'→'식단'→옛 긴 폼 `mealFormHTML` / '식사 상세 입력'→배치 폼), 몸 기록 11칸 → 체중 1칸+펼치기.
  1. 한 줄 입력(`닭가슴살 200 현미밥 210`, `레그프레스 40x15 60x12`, `체중 72.4` → 기기 내 규칙 파서)
  2. '평소처럼' 예측 카드(시간대·요일·최근 기록 기반 1~3장, 한 번 탭)
  3. 운동 중 모드(큰 세트 완료 버튼, ±스테퍼, 자동 휴식 타이머, 화면 꺼짐 방지)
  4. 먼저 찍고 나중에 정리(사진+시각만 저장 → 정리 대기열 → 사람 또는 AI)
  5. 음성 한 마디(1안 파서 재사용)
  - 추천 순서: 2·3 → 1 → 4. 과거에 이미 만든 시안(V01~V05, entry-surface-5, 빠른 검색 팔레트 채택)과 겹치지 않게 한다.
- **사업계획서**: 앞으로 Claude 슬라이드(Slides 아티팩트)로 만들고 **PDF를 항상 함께** 만들어 `docs/business-plan/`에 둔다. 이전 PPT 생성 스크립트(`deck-build/`)는 Codex 전용 `@oai/artifact-tool`에 의존해 재사용 불가. 이전 PPT는 `docs/business-plan/legacy/`.
- **iPhone**: 당분간 **PWA만**. 네이티브 앱은 나중에. (조사 결과는 아래 5절)

## 2. 이 대화에서 확정된 결정

| 항목 | 결정 |
|---|---|
| 개발 도구 | Codex → **Claude Code**로 전환, 전권 위임 |
| 앱 이름 | **마이로그 / Mylogue** (My + -logue, '나와 나누는 기록'). 약어 MCL 고수 안 함 |
| 이전 이름 | 마웨로그 / MyWeightLog / MWL — 기록·보존용 |
| 신규 생성 원칙 | 앱 ID·GitHub·Pages 주소·Firebase를 기존 것을 바꾸지 않고 **새로 등록**. 이전 MyWeightLog 폴더·저장소·Firebase는 그대로 둠 |
| 버전 | 3.0.0(이름·플랫폼 교체) → 3.0.1(계정 버튼). 규칙 `메이저.기능.수정` |
| Android | APK로 **일반폰 + 노트8 모두 호환** |
| iPhone | PWA만 |
| 이관 제외 | 구 APK·ZIP, jdk21.zip, 테스트 브라우저 프로필, 빌드 산출물, public-release (jdk21 폴더는 빌드용으로 복사함) |
| 사업계획서 | Claude 슬라이드 + PDF 항상 |
| 패치 문서 | 매 패치: `docs/worklog/<버전>.md`(내부, 자세히) + `docs/patch-notes/<버전>.md`(사용자용). 메이저: `AI_RECORDING_GUIDE.md`(사용자 AI에게 주는 입력 지침 — 대표님이 말한 'AI에게 입력시키는 방법을 학습하는 컨텍스트'로 이해함, 대표님 확인은 아직 안 받음) + 사업계획서 |
| 배포 주체 | **Claude가 직접**(Claude Code에서) |
| UI 요청 | 로그인 버튼·사용자 프로필이 명확히 보여야 함 → 3.0.1에서 상단 계정 버튼 구현 |

### 이름 결정 과정 (재논의 방지용)
- MyConditionLogs(MCL): 한국어 '컨디션'은 좋지만 영어권 앱스토어에서 condition = 질병·증상 추적 앱 이미지. MCL은 무릎 내측측부인대 약어와도 겹침.
- 마이로그/MyLog 단독: 동명 서비스 다수(앱스토어 'mylog - Record daily life'(한국어 지원 브이로그 SNS), 일본 'MyLog - Private Social Journal', 국내 강좌 'mylog, 일상의 기록' PWA, 유사 '마이델로지', '마인드로그', '밀로그'). 일반 단어라 상표 식별력 약함.
- MAI LOG: 'MaiLog Viewer'(메일 로그), npm 'mailog' 존재, mail log로 읽힘.
- MyoLog: MyoLogic(의수 앱), Myo(운동 앱), MyoAmigo(MCP로 AI 연결하는 운동 기록 앱 — 우리 개념과 유사) 등 Myo 계열 혼잡.
- **Mylogue**: 같은 철자 서비스 검색되지 않음 → 확정. KIPRIS 상표 검색은 아직 안 함(앱스토어·사업화 전 필요).

## 3. 이 대화에서 실제로 한 작업 (완료)

### 3-1. 레거시 전체 검토 (MyWeightLog)
- 문서 40여 개, `app/`(약 2,700줄 압축 스타일 JS·CSS), 테스트 29개 파일, `agent-bridge/`, `public-release/`, `deck-build/`, `mockups/`, Android 설정 검토. 결과는 `docs/CLAUDE_INTAKE_REVIEW_2026-11-19.md`.
- 발견 사항 10개(식사 입력 3경로, 몸 기록 11칸, 입력 글자 14/12px, CSS 3층, PPT 스크립트 Codex 의존, 이름 변경 시 끊길 식별자, 버전 표기 7곳 분산, 루트 대용량 파일, AI 연결 데스크톱 전용, 문서 역할 중복).

### 3-2. 외부 저장소 11개 선정 (`CLAUDE.md` 10절)
- 사용(설치됨 `.claude/skills/`): **impeccable**(v4.10.0, commit b49177d, Apache-2.0 — UI 품질), **security-audit**(Cloudflare, commit c1c8a8c, MIT — 규칙·인증 변경과 출시 전).
- 필요할 때만: hyperframes(HTML→영상), ponytail(상시 프롬프트 플러그인, 기본 미설치), ECC(대형 묶음, 전체 설치 금지).
- 제외: taste-skill(랜딩페이지 전용), VoiceStudio(AGPL 별도 앱), Agent-Reach(SNS 수집), freellmapi(개인 실험용, 건강 데이터 금지), DeepInfer(데이터센터 GPU), ghidra(역공학).
- `.agents/skills/`는 Codex용 옛 복사본.

### 3-3. 리서치 결과
- 갤럭시 노트8: 1440×2960(기본 FHD+), CSS 뷰포트 약 412×846, Android 9 최종 → Chrome 138이 마지막(139부터 Android 10+). 삼성 화면 확대·글자 크기 설정이 폭을 바꿈.
- 갤럭시 S8급 360×740 → 최소 기준폭.
- iPhone: 입력 글자 16px 미만이면 포커스 시 자동 확대.
- iOS 네이티브 경로(보류됨): Apple Developer Program 연 USD 99(약 ₩129,000), Capacitor 8은 Xcode 26+·iOS 15+ 필요, 2026-04-28부터 App Store Connect가 구 Xcode 빌드 거절, Mac 없으면 Codemagic(월 500분 무료 후 분당 $0.095)·GitHub Actions macOS. App Store 공개 시 구글 로그인 제공하면 개인정보 보호형 로그인(애플 로그인 등) 필요(지침 4.8), 웹 래퍼 수준이면 4.2 거절 위험.

### 3-4. 새 폴더 이관 `C:\VibeCoding Claude\Mylogue`
- rsync 복제(제외 목록은 `docs/worklog/3.0.0.md`).
- 코드 66개 파일 일괄 치환: `myweightlog`→`mylogue`, `MyWeightLog`→`Mylogue`, `마웨로그`→`마이로그`, `MWLSUIT`→`MylogueSUIT`, CSS `mwl-`→`mlg-`, MCP 도구 `mwl_*`→`mylogue_*`, `MWL-Beta`→`Mylogue-Beta`.
- 저장 키 `mylogue.*`로 변경(새 Pages도 `studiohooje.github.io` 같은 출처라 마웨로그와 섞이지 않게). **이전 `myweightlog.*` 백업·JSON 가져오기 호환 유지**: `backup.js` LEGACY_TYPE, `domain.js` importBody, `ai-adapter.js` parseCodexRecord, 시험 `tests/legacy-import.test.js`.
- 이전 기록 이관 방법(사용자용): 마웨로그 설정 → 백업 내려받기 → 마이로그 설정 → 백업 복원(사진 포함).
- 문서 재배치: 루트에 README, CHANGELOG, CLAUDE.md, AGENTS.md, PROJECT_DIRECTION_AND_DECISIONS.md, AI_RECORDING_GUIDE.md(구 MWL_AI_RECORDING_PROMPT.md), build-android.ps1, publish.ps1, publish.cmd, publish-first.ps1. 나머지 → `docs/archive/myweightlog/`(구 보고서·감사·releases·루트 스크린샷), `docs/research/`, `docs/reference/`(JSON_IMPORT_FORMAT.md 등), `docs/business-plan/legacy/`.
- `.github/workflows/pages.yml`: 이전 저장소에서 복사(에뮬레이터 프로젝트명 `demo-mylogue-approval`).
- 이 폴더 자체가 git 저장소(main). 이전처럼 별도 `public-release` 체크아웃 없음.

### 3-5. 외부 서비스 신규 등록 (브라우저로 진행)
- **GitHub** `studiohooje/mylogue` 공개 저장소, Pages 소스 = GitHub Actions. 첫 푸시는 대표님이 `publish-first.ps1` 실행 → commit `0d60b8a`, Actions #1 성공(1분 18초), https://studiohooje.github.io/mylogue/ 정상(제목 '마이로그', 콘솔 오류 없음).
- **Firebase** `mylogue-5ce38` (Google 계정 hwj.rouget@gmail.com, Spark). 이 계정에는 moonpd, raidkorea 프로젝트도 있음. 이전 `myweightlog-b7ae7`는 다른 Google 계정 소유.
  - Gemini·Google 애널리틱스 끔.
  - 웹 앱 'Mylogue Web' `1:348245522814:web:36abb4fa96dc088a0adb2f` → `app/firebase-config.js`(apiKey AIzaSyDHU0…, authDomain mylogue-5ce38.firebaseapp.com 등), `agent-bridge/firebase.mjs`(PROJECT, API_KEY) 반영.
  - Authentication: Google 사용, 공개 이름 '마이로그', 지원 이메일 hwj.rouget@gmail.com, 승인 도메인 `studiohooje.github.io` 추가(localhost 기본 포함).
  - Firestore `(default)` Standard, **asia-northeast3(서울)**, 프로덕션 모드. 규칙 미게시.
  - Android 앱 'Mylogue Android' `pro.hooje.mylogue` + SHA-1 등록.
- 이 대화 환경에서 막혔던 것: GitHub CLI 설치(안전 확인 차단), 터미널 입력(화면 조작은 터미널·탐색기 클릭만 허용). → Claude Code에서는 해당 없음.

### 3-6. 3.0.1 — 상단 계정 버튼 (구현·로컬 검증 완료, 배포는 1-1 확인)
- 대표님 요청: "로그인 버튼이나 사용자 프로필이 명확하게 보여야 한다."
- `app/app.js`: `header` 상수 → `header()` 함수, `accountChip()` 추가, `nativeAuthAvailable` import. 상태: 미설정·Android 모듈 없음 = 숨김 / 로그아웃 = `#cloud-login` 버튼(사람 아이콘·'로그인'·'기록 동기화') / 로그인 = 프로필 사진 또는 이름 첫 글자 + 이름 + 승인 상태(승인됨 청록 / 승인 대기·신청 필요 주황 / 반려됨 분홍) → 설정 화면.
- `app/aurora-theme.css` 끝에 `.account-chip` 등. 44px 터치, 650px 이하 부제 숨김, 380px 이하 로그인 칩은 '로그인'만·계정 칩은 상태만.
- 시험: npm test 117건 중 116 통과(1 에뮬레이터 전용 건너뜀), build·verify-build 통과, 헤드리스 Chrome 360/390/412/1280 캡처로 정렬·넘침 없음 확인(로그인 상태는 예시 칩 주입). 실제 로그인 후 사진·이름 표시는 미확인.
- 버전: package.json/lock 3.0.1, index.html `?v=3.0.1`, sw.js 캐시 `mylogue-shell-v3-0-1-account`, 헤더 'BETA 3.0.1', Android versionCode 12.
- 문서: CHANGELOG, `docs/worklog/3.0.1.md`, `docs/patch-notes/3.0.1.md`.

## 4. 알아두어야 할 기술 사항

- 코드 스타일: 프레임워크 없는 ES 모듈, 템플릿 문자열로 `root.innerHTML` 전체 재렌더, 한 줄 압축 스타일. 클릭은 `root`에 위임(`event.target.closest('button,[data-page],...')`), `id`/`data-*`로 분기. `cloud-` 접두 id는 `cloudClick`이 처리.
- 새 파일 추가 시 `app/build.mjs` 복사 목록과 `app/sw.js` FILES 둘 다 수정.
- 시험: `cd app; npm test`. Firestore 규칙 시험은 Actions에서 에뮬레이터로(`tests/approval-rules.test.js`).
- 이전 기록 계약: 빈 값은 null, 추정치는 `aiEstimate`(중앙값+범위+근거), 실제 완료 세트만 통계 반영, AI는 초안만 쓰고 사람이 확정.
- AI 연결(agent-bridge): 같은 PC의 브라우저와 로컬 MCP를 포트+8자리 코드로 짝짓기. 폰에서는 불가(알려진 한계).
- Firebase Spark 유지, Blaze 전환 보류, 서버 사진 업로드 없음.

## 5. 대표님께 아직 확인 못 받은 것

1. `AI_RECORDING_GUIDE.md`가 'AI에게 입력시키는 방법을 학습하는 컨텍스트'가 맞는지.
2. 앱 로그인용 Google 계정(관리자가 될 계정).
3. '일반폰' 기종(현재는 360·412폭 기준으로 검증).
4. 입력 방식 5안 중 선택.
5. 상표(KIPRIS) 확인 여부.

## 6. 참고: 대표님 원래 지시 원문 요약 (2026-11-19 18:47)

- 폴더 전체 빠짐없이 검토, 누락·불확실 정보는 질문. 리서치 필요한 건 실제 리서치.
- 저장소 11개 중 작업에 맞는 것을 골라 계속 쓰도록 컨텍스트 지시서에 남기기.
- 0. 찐빠(줄간격·자간·텍스트박스와 글씨 간격·좌우/상하 정렬) — 웹, 폰, 일반폰, 갤럭시 노트8 모두 감안.
- 1. 이름 변경(→ Mylogue 확정) 후 완전히 새 폴더로 복제·이관.
- 2. 입력 방식: 현재 구조를 완벽히 파악한 뒤 '인간'이 쉽게 입력할 수 있는 안 5가지.
- 3. 패치마다: 작업로그(우리용, 자세히), 패치노트(유저용), 메이저 때 AI 입력 학습 컨텍스트, 사업계획서(외부 PPT용 플랫폼 설명서).
- 4. 아이폰 앱 방법(→ 당분간 PWA).
- 승인 다 해줄 테니 논스톱으로.
