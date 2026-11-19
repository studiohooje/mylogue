# 마이로그 (Mylogue)

체중·체성분, 식단, 운동을 한 사람의 시간순 기록으로 잇는 개인 기록 앱. 웹/PWA(아이폰은 홈 화면 추가)와 Android APK가 같은 화면 코드를 쓴다. 이전 이름은 **마웨로그(MyWeightLog)**이며 2026-11-19 이름을 바꾸고 새 저장소·새 Firebase로 옮겼다.

## 현재 상태 (Mylogue Beta 3.0.0 · 2026-11-19)

- 이름·앱 ID(`pro.hooje.mylogue`)·저장 키를 새로 정했다. 화면·기능은 마웨로그 2.1.1과 같다.
- 이전 앱의 백업 파일과 JSON 기록 파일을 그대로 가져올 수 있다.
- 저장소 `studiohooje/mylogue`, 웹 주소 https://studiohooje.github.io/mylogue/ (첫 업로드 후 열림), Firebase `mylogue-1eedb`(studiohooje 계정). 관리자 UID 교체·규칙 게시 전까지 승인·서버 동기화는 동작하지 않는다.
- 배포 기록: [작업로그](docs/worklog/3.0.0.md) · [패치노트](docs/patch-notes/3.0.0.md)

## 문서 지도

| 문서 | 내용 |
|---|---|
| `CLAUDE.md` | Claude Code 작업 지시서(먼저 읽기) |
| `PROJECT_DIRECTION_AND_DECISIONS.md` | 대표님 확정 결정 기록 |
| `CHANGELOG.md` | 버전별 변경 요약 |
| `docs/worklog/` | 버전별 작업로그(내부) |
| `docs/patch-notes/` | 버전별 패치노트(사용자용) |
| `AI_RECORDING_GUIDE.md` | 사용자의 AI(Codex·Claude 등)에게 주는 기록 입력 지침 |
| `agent-bridge/` | AI용 로컬 MCP 연결 도구 |
| `docs/reference/` | JSON 가져오기 형식, 계정 승인 운영, 도감 관리 |
| `docs/research/` | 경쟁 앱·기능 조사 |
| `docs/business-plan/` | 사업계획서(이전 PPT는 `legacy/`) |
| `docs/archive/myweightlog/` | 마웨로그 시절 보고서·감사·배포 기록(당시 경로 기준이라 일부 링크는 깨질 수 있음) |

## 실행 및 빌드

Node.js 22 이상. `app` 폴더에서:

```powershell
npm ci
npm test
npm run build
npm run serve   # http://localhost:4173
```

Android 디버그 APK는 루트의 `build-android.ps1`(이 폴더의 `jdk21/`, Android SDK 사용). 버전별 APK를 루트에 `Mylogue-Beta-<버전>-debug.apk`로 두고 `npm run build`를 다시 실행하면 같은 APK를 담은 ZIP과 함께 `dist/downloads/`에 들어간다. **이 폴더에는 `node_modules`가 없으니 처음 한 번 `npm ci`를 실행한다.**

## 데이터 주의

기록은 먼저 기기 브라우저/웹뷰에 저장된다. 승인 계정은 Firebase 동기화를 쓸 수 있다. 실제 건강 기록·백업 파일은 저장소에 올리지 않는다.
