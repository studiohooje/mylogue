# CLAUDE.md — 마이로그(Mylogue) 작업 지시서

> 2026-11-19 마웨로그(MyWeightLog)에서 이름을 바꾸고 이 폴더(`C:\VibeCoding Claude\Mylogue`)로 이관했다. 이전 폴더 `MyWeightLog`는 보존본이며 수정하지 않는다.

> Claude Code가 이 폴더에서 작업할 때 가장 먼저 읽는 문서. 2026-11-19 Claude가 전체 레거시를 검토한 뒤 작성했다.
> 대표님의 최신 대화 지시 > 이 문서 > `AGENTS.md`(Codex 시절 지침) 순으로 우선한다. 이 문서를 고치면 같은 작업의 작업로그에 남긴다.

## 0. 호칭·소통

- 사용자는 **대표님**. 한국어로 답한다. 대표님은 승인 범위를 넓게 주고 논스톱 진행을 선호한다. 단, 되돌릴 수 없는 일(공개 배포 외의 계정·권한·비용 변경, Firebase 요금제, 실데이터 삭제, 앱 ID 변경)은 미리 확인한다.
- 목업만 만들었으면 "앱에 적용"이라고 쓰지 않는다. 실행하지 않은 테스트는 "통과"라고 쓰지 않는다. 실기기·실계정 검증과 에뮬레이터·자동 시험을 구분한다.

## 1. 작업 시작 시 읽는 순서

1. `PROJECT_DIRECTION_AND_DECISIONS.md` — 확정 결정과 제안의 경계(가장 중요)
2. `README.md`, `CHANGELOG.md`, 최신 `releases/<버전>.md` — 실제 배포 상태
3. `docs/CLAUDE_INTAKE_REVIEW_2026-11-19.md` — Claude 인수 검토(발견한 문제·미해결 질문)
4. 해당 영역 문서: AI 입력은 `AI_RECORDING_GUIDE.md`·`agent-bridge/README.md`, 남은 결함은 `docs/archive/myweightlog/MWL_BETA_2_1_AURORA_AUDIT.md`, 최신 작업은 `docs/worklog/`

## 2. 제품 한 줄 요약

체성분·식단·웨이트 운동을 한 사람의 시간순 기록으로 잇는 개인 기록 앱. 사람이 직접 빠르게 입력하거나, 각자의 AI(Codex·Claude Code)가 로컬 MCP 도구로 **검토함 초안**을 쓰고 사람이 확정한다. 소수 테스터(대표님·친구) 베타. 장기적으로 앱 내 AI 구독 서비스 검증.

## 3. 구조 지도

| 위치 | 내용 |
|---|---|
| `app/` | **원본 소스**. 프레임워크 없는 ES 모듈 + 템플릿 문자열 렌더링. `app.js`(전역 상태·라우팅·이벤트, 약 107KB 한 줄 압축 스타일)가 중심 |
| `app/quick-entry.js` | 현재 주 입력 동선(빠른 검색 팔레트): 식사 `quick-meal`, 운동 `quick-workout` |
| `app/timeline-view.js` | 홈(히어로 → 빠른 기록 → 오늘 한눈에 → 타임라인) |
| `app/domain.js` | 데이터 정제·검증 계약(`cleanBody/cleanMeal/cleanWorkout`). 기록 형식 변경은 여기부터 |
| `app/store.js`·`storage-scope.js` | localStorage 키 `mylogue.v1`(+`.user.<uid>`), 사진 IndexedDB `mylogue.photos` |
| `app/cloud-*.js`, `firestore.rules` | Firebase(Spark) Google 로그인·관리자 승인·동기화. `mylogue-5ce38`(Google 계정 hwj.rouget@gmail.com, 서울 리전, Spark) |
| `app/ai-drafts.js`·`ai-inbox.js` | AI 초안 검토함 |
| CSS | `app.css`(기본) → `quick-entry.css` → `aurora-theme.css`(덮어쓰기) → `aurora-motion.css`. **세 층이 서로 덮어써서 정렬 불량의 주원인** |
| `app/android/` | Capacitor 8 Android. `applicationId pro.hooje.mylogue`, minSdk 24, target 36 |
| `app/dist/` | 빌드 산출물(직접 수정 금지) |
| `agent-bridge/` | AI용 로컬 stdio MCP 서버(`mylogue_connection_status`, `mylogue_search_records`, `mylogue_create_draft`, `mylogue_list_drafts`) |
| (배포) | 새 GitHub 저장소(`studiohooje/mylogue` 예정). 이전처럼 별도 체크아웃을 두지 않고 이 폴더를 저장소로 쓰는 방식을 우선 검토 |
| `deck-build/`, `deck-final/` | 이전 PPT 생성 스크립트(Codex 전용 도구 의존, 재사용 불가). 앞으로 사업계획서는 Claude 슬라이드 + PDF, 보관은 `docs/business-plan/` |
| `mockups/` | 시안(실제 앱 아님) |

## 4. 명령

Windows PowerShell, Node 22+. `app/`에서:

```powershell
npm ci; npm test; npm run build; node verify-build.mjs; npm run serve   # http://localhost:4173
```

Android 디버그 APK: 루트의 `build-android.ps1`(JDK `jdk21/`, SDK `%LOCALAPPDATA%\Android\Sdk`, 테스트→빌드→cap sync→assembleDebug). 디버그 서명은 이 PC의 `~/.android/debug.keystore`. **다른 PC에서 빌드하면 기존 설치본 위에 업데이트가 안 된다.**

## 5. 버전 올릴 때 함께 바꿔야 하는 곳 (하나라도 빠지면 캐시·업데이트 사고)

`app/package.json` version · `app/index.html`의 `?v=` 4곳 · `app/sw.js`의 `CACHE` 이름과 `FILES` 목록 · `app/build.mjs` 복사 목록(새 파일 추가 시) · `app/android/app/build.gradle` versionCode(+1)/versionName · 앱 화면의 버전 표기 · README/CHANGELOG/releases.
버전 규칙: `메이저.기능.수정`. 목업에는 버전을 올리지 않는다.

## 6. 배포 절차

원본 `app/` 수정·시험 → `public-release/`에 복사 → 그곳에서 시험·빌드 → commit/push(`git -c safe.directory=... -C public-release`) → GitHub Actions(`pages.yml`: 테스트·Firestore 에뮬레이터·빌드·Pages) 성공 확인 → 공개 URL HTTP 200·버전 확인. Android는 APK와 **같은 APK를 담은 ZIP을 항상 함께** `Mylogue-Beta-<버전>-debug.apk/.zip`으로 게시하고 해시를 기록한다.

## 7. 패치마다 만드는 문서 (대표님 2026-11-19 지시)

| 문서 | 독자 | 언제 | 위치·형식 |
|---|---|---|---|
| **작업로그** | 대표님·Claude | 모든 패치 | `docs/worklog/<버전>.md` — 요청, 결정, 바꾼 파일, 이유, 시험 명령과 결과, 실패·보류, 다음 할 일. 자세하게 |
| **패치노트** | 사용자 | 모든 패치 | `docs/patch-notes/<버전>.md` — 사용자 말투, 무엇이 좋아졌나 위주, 내부 용어·파일명·해시 없음. 앱 내 표시도 이 문서 기준 |
| **AI 입력 지침** | 사용자의 AI(Codex·Claude 등) | 메이저 패치·입력 계약 변경 시 | `AI_RECORDING_GUIDE.md`. `mwl_create_draft` 필드·타입·규칙이 바뀌면 반드시 갱신 |
| **사업계획서** | 외부 | 메이저 패치 | Claude 슬라이드로 만들고 **PDF를 항상 함께** `docs/business-plan/`에 저장. 실제 화면 캡처와 목업·가설 수치를 구분 |

3.0.0부터 검증·배포 증거는 작업로그에 함께 적는다. 이전 `releases/`는 `docs/archive/myweightlog/releases/`.
그리고 항상 `PROJECT_DIRECTION_AND_DECISIONS.md`에 새 결정·상태를 반영한다(과거 결정은 덮어쓰지 말고 변경 사유와 함께 남김).

## 8. UI 품질 기준 ("찐빠" 방지)

검증 뷰포트(세로, CSS px) — 모든 화면 변경은 이 다섯 폭에서 스크린샷으로 확인한다.

| 기기 | 뷰포트 | 비고 |
|---|---|---|
| 소형 안드로이드(갤럭시 S8급) | 360 × 740 | 가장 좁은 기준 |
| iPhone 일반(13~16) | 390 × 844 | PWA, 노치·홈 인디케이터 safe-area |
| **갤럭시 노트8** | 412 × 846 | 18.5:9, Android 9 최종 → Chrome/WebView 138에서 멈춤. 삼성 '화면 확대' 설정 시 폭이 더 좁아짐 |
| 태블릿 | 768 × 1024 | |
| 웹 데스크톱 | 1280 × 800 이상 | |

규칙:
- 입력창(`input/select/textarea`) 글자는 **16px 이상**(iPhone 자동 확대 방지). 현재 14px·12px이 섞여 있음.
- 글자 크기·줄간격·간격은 토큰으로만 쓴다(예: 12/13/14/16/18/21/26/32px, 간격 4의 배수). 10~11px 본문 금지(보조 라벨만 12px 하한).
- 미디어쿼리 경계는 한 세트로 통일(예: 380 / 650 / 1000). 현재 360·380·420·470·600·650·700 혼재.
- 숫자에는 `tabular-nums`, 한국어 줄바꿈 `word-break: keep-all`, 버튼·카드 텍스트 상하 중앙 정렬, 터치 영역 44px 이상.
- 고친 뒤 반드시 렌더링 결과를 눈으로 본다(impeccable `shot`/`audit` 또는 헤드리스 브라우저 캡처).

## 9. 지켜야 할 데이터 계약

- 빈 값은 0이 아니라 `null`/미입력. 추정치는 `aiEstimate`(중앙값+범위+근거)로 표시. 실제 완료한 세트만 볼륨·통계에 반영.
- 과거 기록은 당시 스냅샷을 보존하고, 도감 변경은 새 기록에만 적용.
- AI는 초안만 쓰고 사람이 확정. 계정 간 접근 금지(관리자 포함).
- 저장소 키·IndexedDB 이름·Firestore 경로·`applicationId`·JSON `type`(`mylogue.meal` 등, 이전 `myweightlog.*`도 가져오기 호환 유지)을 **이름 변경 때 바꾸면 기존 사용자 데이터가 끊긴다.** 바꾸려면 이전 키를 읽어 옮기는 마이그레이션과 시험을 먼저 만든다.
- 실제 건강 기록·백업 파일·키를 저장소에 올리지 않는다.

## 10. 사용할 외부 저장소·스킬 (2026-11-19 선정)

**사용(프로젝트에 설치됨: `.claude/skills/`)**
- `impeccable` — [pbakaus/impeccable](https://github.com/pbakaus/impeccable) v4.10.0, commit `b49177d`. Apache-2.0. UI 정렬·타이포·반응형 작업의 기본 도구. 자주 쓸 명령: `audit`(기술 품질), `critique`(UX 평가), `typeset`, `layout`, `adapt`(기기 대응), `polish`(마감), `harden`. 첫 사용 시 `/impeccable init`으로 `PRODUCT.md`·`DESIGN.md` 생성(Aurora Halo·SUIT·색 토큰 반영). 프로젝트 맥락 로딩은 `.claude/skills/impeccable/scripts/impeccable context`(Windows는 `.cmd`).
- `security-audit` — [cloudflare/security-audit-skill](https://github.com/cloudflare/security-audit-skill) commit `c1c8a8c`. MIT. `firestore.rules`·`agent-bridge`·인증 흐름을 바꾼 패치, 정식 배포·앱스토어 출시 전에 실행. 결과는 저장소 밖(`~/security-audit-skill/`)에 생성되며 실데이터를 외부로 보내지 않는다.

**필요할 때만**
- `hyperframes` — [heygen-com/hyperframes](https://github.com/heygen-com/hyperframes), Apache-2.0. HTML→MP4. 사업계획서용 시연 영상·앱스토어 미리보기 영상이 필요할 때 설치.
- `ponytail` — [DietrichGebert/ponytail](https://github.com/DietrichGebert/ponytail), MIT. "필요한 코드만" 쓰게 하는 상시 프롬프트 플러그인. 상시 적용·성능 수치 미검증이라 기본 미설치. 리팩터링이 과해질 때 `/ponytail-review` 용도로만 검토.
- `ECC` — [affaan-m/ECC](https://github.com/affaan-m/ECC), MIT. 에이전트·스킬·훅 대형 묶음. 전체 설치 금지. 특정 스킬이 필요하면 그 하나만 수동 복사.

**사용하지 않음(사유)**
- `taste-skill`: 랜딩페이지·회사 웹사이트 전용(앱 UI 아님). 마케팅 사이트를 만들 때만 재검토.
- `VoiceStudio`: AGPL-3.0 별도 음성 앱. 음성 입력은 OS/브라우저 내장 음성 인식으로 설계.
- `Agent-Reach`: SNS 수집·브라우저 로그인 복사. 건강기록 앱과 무관하고 위험.
- `freellmapi`: 무료 LLM 공급자 묶음, "개인 실험용". 건강 데이터를 보내면 안 됨.
- `DeepInfer`: 데이터센터 GPU 추론 엔진. 규모가 맞지 않음.
- `ghidra`: 역공학 도구. 무관.

`.agents/skills/`의 같은 두 스킬은 Codex용 옛 복사본(impeccable 11-07 버전). Claude는 `.claude/skills/`를 쓴다.

## 11. 진행 예정 과제 (대표님 예고, 2026-11-19)

0. 웹·폰·갤럭시 노트8 전 화면 정렬·간격 정리 → §8 기준
1. ~~앱 이름 변경~~ → 마이로그/Mylogue 확정·이관 완료(3.0.0). 새 GitHub·Firebase 등록과 관리자 UID 교체는 `docs/worklog/3.0.0.md` 남은 일 참조
2. 사람이 입력하기 쉬운 구조 5안 제안 → 선택 후 구현
3. 패치마다 §7 문서 세트
4. iPhone은 당분간 PWA만(대표님 결정). Android APK는 일반 폰·갤럭시 노트8 모두 호환 필수
