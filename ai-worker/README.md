# 마이로그 AI 서버 (Cloudflare Workers)

앱 안 'AI로 입력 → 말하듯 적어 주세요'를 처리하는 작은 서버다. 기록·로그인·동기화는 계속 Firebase(무료)에 있고, 이 서버는 AI 정리만 한다(투트랙).

```
앱 ── (Firebase 로그인 표 + 사용자의 말·사진) ──▶ 이 서버 ──▶ Claude API
앱 ◀────────────── 마이로그 코드(글) ─────────────── 이 서버
앱: 미리보기 → '검토함에 넣기' → 검토함에서 확정 (기존 흐름 그대로)
```

- 로그인 확인: Firebase ID 토큰 서명(RS256)·발급처·만료를 검사한다.
- 이용 승인 확인: 사용자 본인 토큰으로 자기 프로필(`users/{uid}`)만 읽는다. 관리자는 `app/admin.js` 목록과 같다.
- 하루 한도: D1에 사용자·날짜별 횟수만 저장한다(기본 30회, `DAILY_LIMIT`). 한도를 넘으면 AI를 부르지 않는다.
- 기록 내용·사진은 저장하지 않는다. AI 키는 Cloudflare 비밀값에만 있다.
- 지시문은 `app/ai-prompt.js`를 함께 쓴다. 앱 안에서는 코드 블록만 답하게 하고, 사용자 글 속 지시는 따르지 않게 덧붙였다.
- 모델(4.17.0): 기본 `MODEL`=Claude Haiku 5.5(값싸고 빠름, effort `low`), 주간 리뷰 `REVIEW_MODEL`=Claude Sonnet 5.5(effort `medium`, 안전 분류기 거절 시 서버 쪽 대체 모델로 이어서 처리). 공통 지시문은 프롬프트 캐시로 재사용한다.

## 4.17.0 플러스 기능 (주소별)

| 주소 | 기능 | 무료/플러스 하루 한도(`wrangler.toml`) |
|---|---|---|
| `POST /parse` | 말·사진 → 마이로그 코드. 사진이 있으면 '사진 기록'으로 센다 | 말 30(`DAILY_LIMIT`) · 사진 1/20(`LIMIT_PHOTO`) |
| `POST /review` | 이번 주 리뷰(앱이 계산한 요약만 보냄) | 0/3(`LIMIT_REVIEW`) |
| `POST /chat` | AI에게 묻기(최근 3일 기록 요약과 함께) | 0/20(`LIMIT_CHAT`) |
| `POST /recipe` | 레시피 글 → 재료 JSON(앱이 음식 DB로 영양 계산) | 0/10(`LIMIT_RECIPE`) |
| `POST /me` | 내 플러스 여부·한도·가짜 AI 여부 | 횟수 안 셈 |
| `GET /health` | 서버 살아 있는지 | — |

- 플러스 판단: 관리자이거나, `PLUS_ALL="1"`(베타 동안 승인된 모든 계정)이거나, 계정 문서 `plan`이 `plus`. 관리자는 앱 설정 › 신청 관리에서 계정별로 '플러스 켜기/끄기'를 누른다.
- 대표님 방침대로 인식 실패한 사진·같은 사진 재시도·AI 거절은 횟수에서 빼지 않는다(돌려준다). 한도에 닿아도 손 기록은 계속된다.
- `FAKE_AI="1"`이면 Claude를 부르지 않고 정해진 답을 준다(시험용). 실제 배포는 꼭 `"0"`.
- 앱 쪽 '가짜 AI 모드'(슈퍼관리자 설정 카드)는 서버 없이 앱 안에서만 정해진 답을 낸다. 키를 넣기 전에도 플러스 화면 흐름을 끝까지 볼 수 있다.

## 대표님이 해 주실 일 (계정·비밀번호·결제라 Claude가 대신하지 않음)

1. **Cloudflare 가입(무료)**: https://dash.cloudflare.com/sign-up. 무료 플랜은 카드 등록이 필요 없다.
2. **Claude API 준비**: https://console.anthropic.com 가입 → 결제(선불 크레딧) → API 키 발급.
   - 처음에는 소액(예: 5달러)만 충전하고 **자동 충전(auto-reload)은 끈다.** 크레딧이 떨어지면 요청이 실패할 뿐 추가 청구는 없다.
3. 아래 명령은 이 폴더(`ai-worker`)의 PowerShell에서 실행한다. 로그인·키 입력 창이 대표님 화면에 뜬다.

```powershell
npx wrangler login
```

```powershell
npx wrangler d1 create mylogue-ai
```

나온 `database_id`를 Claude에게 알려 주면 `wrangler.toml`에 넣는다(비밀값 아님). → 이미 넣어 둠(`a6e0775c-…`). 다시 만들 필요 없다.

```powershell
npx wrangler secret put ANTHROPIC_API_KEY
```

이 명령이 키를 물으면 대표님이 직접 붙여넣는다. 채팅에 키를 붙이지 않는다.

## 그다음 Claude가 할 일

```powershell
npx wrangler d1 execute mylogue-ai --remote --file=schema.sql
npx wrangler deploy
```

- `schema.sql`은 `CREATE TABLE IF NOT EXISTS`라 4.17.0 새 표(`usage_feature`, `photo_seen`)만 더해진다. 기존 횟수 기록은 그대로.
- 나온 주소(`https://mylogue-ai.<계정>.workers.dev`)를 `app/ai-config.js`의 `AI_WORKER_URL`에 넣는다.
- 실제 키 확인(선택, 약 0.01~0.03달러): 대표님 PC에서 `ai-worker/.dev.vars`에 키 한 줄을 넣고 `node tools/live-check.mjs`. 말 기록·주간 리뷰·묻기·위험 신호 안전 답·레시피 분해를 한 번씩 불러 형식과 금지어를 확인한다.
- 앱에서는 슈퍼관리자 설정 카드의 'AI 서버 상태 확인'으로 플러스·한도·가짜 AI 여부를 본다.
- 버전을 올리고 APK와 함께 배포한다. 그 전까지 앱에는 '말로 입력'이 보이지 않는다.

## 비용이 실수로 나가지 않게

| 항목 | 무료 범위 | 넘으면 |
|---|---|---|
| Workers 요청 | 하루 10만 회 | 무료 플랜은 **요청이 거절될 뿐 과금 없음**(유료 플랜은 직접 바꿔야 함) |
| D1 | 하루 읽기 500만·쓰기 10만 행 | 무료 플랜은 거절 |
| Claude API | 없음(쓴 만큼) | 선불 크레딧이 떨어지면 거절. 자동 충전을 끄면 추가 청구 없음 |

- 앱 쪽 하루 한도(`DAILY_LIMIT`)가 사용자 한 명이 비용을 끌어올리는 것을 막는다.
- 대략 비용(직접 계산한 값이니 공식 가격표로 확인): 글 한 번에 입력 약 1,700토큰·출력 약 700토큰 기준
  - Claude Haiku 5.5($0.10/$0.50 per 1M): 약 0.0005달러(1원 미만) — 기본
  - 주간 리뷰는 Sonnet 5.5라 한 번에 몇 원~십몇 원 수준(요약이 짧아서). 정확한 단가는 Anthropic 가격표 확인
  - 모델을 바꾸려면 `wrangler.toml`의 `MODEL`·`REVIEW_MODEL`만 바꾼다.

## 개발·시험

```powershell
npm test
npx wrangler dev --port 8787
```

- `npm test`: 로그인 표 위조·만료·다른 프로젝트 거부, 미승인 거부, 하루 한도, 입력 검사, 지시 주입 차단, AI 거절·오류 처리. Claude와 D1은 흉내로 대신한다.
- `wrangler dev`는 계정 없이 이 PC에서 돈다(D1도 로컬). 실제 AI 호출에는 `.dev.vars` 파일에 `ANTHROPIC_API_KEY=...`가 필요하다. 이 파일은 저장소에 올라가지 않는다.
- 앱에서 로컬 서버로 시험할 때는 localhost에서만 `localStorage.setItem('mylogue.aiWorkerUrl','http://127.0.0.1:8787')`.
