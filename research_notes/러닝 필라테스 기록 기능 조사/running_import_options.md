# 러닝·운동 기록 가져오기(Import) 경로 조사 (2026-11 기준)

전제: 마이로그 = vanilla-JS PWA(GitHub Pages) + Capacitor 8 Android 앱, 백엔드 서버 없음(Firebase Spark, Cloud Functions 없음), iPhone 사용자는 PWA만 사용, 테스터 소수.

## Android Health Connect — 종목/데이터/플러그인/심사/사이드로드

### Takeaway
Health Connect에는 `EXERCISE_TYPE_RUNNING`, `EXERCISE_TYPE_RUNNING_TREADMILL`, `EXERCISE_TYPE_PILATES`가 모두 있고 거리·속도·심박·칼로리·경로(ExerciseRoute)를 읽을 수 있어 "다른 앱에서 기록한 러닝/필라테스 보여주기"에 가장 적합한 경로다. 단 Capacitor 플러그인 중 검증된 것은 운동 요약(종류·시간·거리·칼로리)까지이고 경로(GPS)는 플러그인 미지원 가능성이 높으며, Play 배포 시 Health apps 선언 심사가 필요하고, 사이드로드 APK에서 권한이 정상 동작하는지는 실기기 테스트로 확인해야 한다.

### Cited Findings
- 운동 세션은 `ExerciseSessionRecord`(권한 `READ_EXERCISE`, 경로는 `READ_EXERCISE_ROUTE(S)`), 종목 목록에 `EXERCISE_TYPE_RUNNING`, `EXERCISE_TYPE_RUNNING_TREADMILL`, `EXERCISE_TYPE_PILATES`, `EXERCISE_TYPE_YOGA`, `EXERCISE_TYPE_STRENGTH_TRAINING`, `EXERCISE_TYPE_WEIGHTLIFTING` 등 포함 — [Health Connect data types](https://developer.android.com/health-and-fitness/guides/health-connect/plan/data-types)
- 운동 관련 별도 레코드: Distance(`READ_DISTANCE`), Speed(Series, `READ_SPEED`), Heart rate(Series, `READ_HEART_RATE`, BPM_AVG/MAX/MIN 집계), Active/Total calories burned, Elevation gained, Steps/StepsCadence, Power, VO2 max — 같은 페이지 — [Health Connect data types](https://developer.android.com/health-and-fitness/guides/health-connect/plan/data-types)
- 기본적으로 최근 30일보다 오래된 데이터를 읽으려면 `READ_HEALTH_DATA_HISTORY`, 백그라운드 읽기는 `READ_HEALTH_DATA_IN_BACKGROUND` 추가 권한 필요 — [Health Connect data types](https://developer.android.com/health-and-fitness/guides/health-connect/plan/data-types)
- 세션 데이터 자체에는 거리/심박이 들어있지 않고, 세션 시간 범위로 DistanceRecord 등을 따로 조회해 합치는 방식(공식 예제) — [Add exercise routes](https://developer.android.com/health-and-fitness/health-connect/features/exercise-routes)
- 경로: 위도/경도/고도/정확도/시각의 Location 목록. 다른 앱이 만든 경로는 "1회 읽기 허용" 사용자 다이얼로그(`ExerciseRouteResult.ConsentRequired`)를 거쳐야 하고, 백그라운드에서는 "항상 허용"이어도 읽기 불가 → 사용자가 화면에서 직접 열람할 때 요청 권장 — [Add exercise routes](https://developer.android.com/health-and-fitness/health-connect/features/exercise-routes)
- 경로 권한 이름 주의: 읽기 `READ_EXERCISE_ROUTES`(복수), 쓰기 `WRITE_EXERCISE_ROUTE`(단수) — [Add exercise routes](https://developer.android.com/health-and-fitness/health-connect/features/exercise-routes)
- Play 배포 시 Data safety + Play Console "Health apps" 선언 양식(데이터 타입별 사용 사유) 필수, 최소 권한만 요청, Play 스토어 페이지와 Health Connect 내 링크에 같은 개인정보처리방침 필요. 선언 없이 공개 배포하면 사용자에게 "This app can't access Health Connect" 다이얼로그. 승인은 패키지명 단위(버전 무관), 새 버전 제출 시 재검토될 수 있음 — [Declare access](https://developer.android.com/health-and-fitness/guides/health-connect/publish/declare-access)
- Capawesome Capacitor Health 플러그인: HealthKit + Health Connect 통합, 약 20개 타입(걸음, 거리, 칼로리, 심박, 수면, 체중 등) + `readWorkouts()`(시작/종료, duration, workout type, source, totalCalories, totalDistance). GPS 경로는 언급 없음. Capacitor 8 지원(0.x). **Capawesome Insiders 전용(유료 라이선스 키, Polar 통해 발급)**, 가격은 페이지에 없음. Android 9+(14+는 기본 내장), minSdk 26, 매니페스트에 개인정보처리방침 meta-data, Play Health apps 선언 필요 — [Capawesome Health docs](https://capawesome.io/docs/sdks/capacitor/health/)
- @capgo/capacitor-health: HealthKit/Health Connect, `queryWorkouts` 제공, 30일 초과 히스토리용 선택 권한 언급. 경로·운동 종류 세부·라이선스는 문서에서 확인 못함 — [Capgo Health docs](https://capgo.app/docs/plugins/health/)
- 사이드로드 앱: GrapheneOS 포럼에서 사이드로드 앱이 Health Connect 권한 화면이 안 뜨고 목록에도 안 나온다는 보고(미해결) / Stack Overflow 사례에서는 디버그 빌드는 잘 됐으나 Play closed testing 배포본에서 "can't access Health Connect" 발생(=Play 배포본에만 선언 강제) — [GrapheneOS 포럼](https://discuss.grapheneos.org/d/26322-sideloaded-app-fails-to-launch-health-connect-permission); [Stack Overflow 미러](https://kiwix.lema.org/stackoverflow.com_en_all_2023-11/questions/74497486/runtime-error-this-app-can-t-access-health-connect)

### Inferences
- 필라테스는 GPS가 없으므로 Health Connect의 세션(종류·시간) + 심박/칼로리 정도가 사실상 유일한 자동 경로. 러닝은 요약(거리·시간·페이스=거리/시간·심박·칼로리)은 쉽고, 지도 경로는 플러그인 커스텀(네이티브 Kotlin 몇십 줄) 필요.
- 사이드로드 APK는 "디버그/직접 설치는 동작, Play 배포본만 선언 강제"라는 보고가 더 많지만 상충 사례(GrapheneOS)가 있어 테스터 기기(특히 삼성)에서 실측 필요.
- 비용: Health Connect 자체 무료. Capawesome 플러그인은 유료 구독, 아니면 무료 플러그인(capgo) 또는 직접 Capacitor 플러그인 작성. 서버 불필요(기기 로컬 읽기 → Firestore 저장)라 Spark 플랜과 궁합이 좋음.
- 노력: 요약만 읽기 = 중(플러그인 설치 + 권한 UI + 매핑), 경로 포함 = 중상.

### Gaps
- 사이드로드 APK에서의 Health Connect 권한 동작에 대한 공식 문서는 찾지 못함(실기기 테스트로 확인 필요).
- capgo 플러그인의 운동 종류/심박/경로 반환 필드와 라이선스(무료 여부)는 GitHub 소스로 재확인 필요. `@kiwi-health`, cordova 계열 플러그인은 이번 조사에서 확인 못함.
- Play Health apps 선언 심사 소요 기간 공식 수치 없음.

## Samsung Health — Health Connect 연동 / SDK 상태

### Takeaway
삼성헬스는 설정에서 Health Connect 동기화를 켜면 운동 세션을 Health Connect로 쓰지만(주기적, 실시간 아님), GPS 경로가 넘어오는지는 공식 확인이 안 됐다. Samsung Health Data SDK는 "읽기만"이면 개발자 모드로 테스트 가능하나 배포(일반 사용자)엔 파트너 승인이 필요해 소규모 개인 앱에는 비현실적이다.

### Cited Findings
- 설정 경로: 삼성헬스 → 설정 → 데이터 관리 → Health Connect → 동기화, Health Connect 앱 권한에서 '운동' 쓰기 허용 확인. "Samsung Account 동기화"가 켜져 있어야 한다는 안내도 있음(서드파티/커뮤니티 출처) — [Samsung Community](https://us.community.samsung.com/t5/Samsung-Apps-and-Services/Health-Connect-not-syncing-with-Samsung-Health/td-p/3511569); [FitMesh 블로그](https://www.fitmesh.fit/en/blog/sync-samsung-health-google-fit)
- 동기화는 실시간이 아니라 주기적(대략 30~60분), 연결 이전 기록은 소급 안 될 수 있음, 상세 GPS 경로는 Health Connect로 안 넘어온다는 주장(벤더 블로그, 미검증) — [FitMesh 블로그](https://www.fitmesh.fit/en/blog/sync-samsung-health-google-fit)
- 2026년에도 "몇 주째 Health Connect 동기화 안 됨" 사용자 보고 존재 — [Samsung Community](https://us.community.samsung.com/t5/Samsung-Apps-and-Services/Health-Connect-not-syncing-with-Samsung-Health/td-p/3511569)
- Samsung Health Data SDK: 개발자 모드는 테스트/디버깅 전용. 읽기만 하면 파트너 요청 없이 개발자 모드로 개발·테스트 가능, 쓰기는 파트너 승인+access code 필요 — [Samsung Health developer mode](https://developer.samsung.com/health/data/guide/developer-mode.html); [Migration guide](https://developer.samsung.com/health/data/migration-guide/overview.html)
- 배포(일반 사용자)에는 파트너십 승인 및 앱 정보 등록 필요(2026-10 서드파티 글) — [Terra 블로그](https://tryterra.co/blog/samsung-health-medicare-app-library-developer-access); 파트너 신청이 일시 중단됐다는 포럼 글은 날짜 불명 — [Samsung dev forum](https://forum.developer.samsung.com/t/is-data-access-available-in-developer-mode/11321)

### Inferences
- 삼성폰 테스터는 "Health Connect 경유"가 현실적 유일 경로. 경로 지도까지 원하면 삼성헬스에서 GPX 수동 내보내기(아래 파일 import) 병행.
- 개발자 모드는 각 테스터가 삼성헬스 개발자 모드를 켜야 하므로 일반 사용자용으로 부적합.

### Gaps
- 삼성헬스가 Health Connect에 ExerciseRoute를 쓰는지 공식 출처 없음. 2026 현재 파트너 신청 개방 여부 확인 못함.
- 삼성헬스 GPX 내보내기 메뉴의 공식 안내는 확인 못함(커뮤니티 글에서 GPX에 케이던스 누락 보고만 있음 — [Samsung Community KR](https://r1.community.samsung.com/t5/samsung-health/%EA%B2%BD%EB%A1%9C-gpx-%ED%8C%8C%EC%9D%BC-%EB%A7%8C%EB%93%A4%EA%B8%B0%EC%8B%9C-%EC%BC%80%EC%9D%B4%EB%8D%98%EC%8A%A4-%EB%93%B1-%EB%8D%B0%EC%9D%B4%ED%84%B0-%EB%88%84%EB%9D%BD/td-p/31404692)).

## Apple Health / HealthKit — PWA에서 가능한가

### Takeaway
웹앱(PWA)은 HealthKit을 직접 읽을 수 없다(네이티브 iOS 앱 없음). 우회로는 (1) 건강 앱 "모든 건강 데이터 내보내기" zip(export.xml + workout-routes/*.gpx)을 사용자가 업로드, (2) 단축어(Shortcuts)/서드파티 앱으로 GPX·JSON을 만들어 PWA에 파일로 넘기기 — 둘 다 수동이다.

### Cited Findings
- 건강 앱 내보내기는 export.xml이 담긴 zip이고, 지도가 있는 운동은 `workout-routes` 폴더에 타임스탬프 GPX로 들어있음 — [Apple Discussions](https://discussions.apple.com/thread/251827779); [DuckDB healthkit_export](https://duckdb.org/community_extensions/extensions/healthkit_export)
- export.xml은 건강 앱의 데이터 포인트를 XML 요소로 담음(운동, 활동 링, 경로 GPX 포인트 파싱 가능) — [DuckDB healthkit_export](https://duckdb.org/community_extensions/extensions/healthkit_export)
- WorkoutGPX 앱은 단축어 액션("최근 운동 내보내기", 기간 지정 내보내기) 제공, GPX 1.1 출력 — [WorkoutGPX](https://objectgraph.com/workoutgpx)
- Health Auto Export 앱: 70개 운동 타입을 JSON/CSV/GPX로 내보내고 단축어 자동화 지원(유료 앱) — [Health Auto Export App Store](https://apps.apple.com/app/id1115567069)

### Inferences
- export.xml은 수년치면 수백 MB가 될 수 있어 브라우저 파싱 시 스트리밍(SAX) 파서가 필요할 것(추정). 개별 운동 GPX 업로드가 UX상 더 단순.
- iPhone에서 필라테스는 GPX가 없으므로 export.xml의 Workout 요소(종류 HKWorkoutActivityTypePilates, 시간, 칼로리)를 읽거나 수동 입력이 현실적.

### Gaps
- 단축어 기본 액션만으로(서드파티 앱 없이) 운동 목록을 JSON으로 뽑아 PWA로 넘기는 검증된 방법은 확인 못함.
- export.xml 실제 크기/파싱 성능 수치 없음.

## Strava API — 서버 없이 가능한가 / 2026 정책

### Takeaway
2026-06-01 시행 새 API 정책으로 서드파티 앱은 사실상 어렵다: 토큰 교환에 client_secret이 필수(PKCE 없음)라 서버(Cloud Functions 불가)가 없으면 안전하게 구현 불가, 신규 앱은 1명(본인)부터 시작해 10명까지는 셀프 업그레이드지만 Standard 개발자는 Strava 유료 구독 필수, 데이터는 해당 사용자에게만 표시·캐시 7일 제한, AI 사용 전면 금지. 마이로그에는 비추천, 대신 Strava 파일 내보내기 → 파일 import가 합리적.

### Cited Findings
- 토큰 교환 `POST /oauth/token`에 client_id + client_secret 필요, PKCE 언급 없음. access token 6시간 만료, refresh token 갱신 시 이전 refresh token 즉시 무효화. Android는 `https://www.strava.com/oauth/mobile/authorize` Intent로 앱 인증 — [Strava Authentication](https://developers.strava.com/docs/authentication/)
- API Policy 시행일 2026-06-01. Standard Tier(최대 10명 / 최대 9,999명), Extended(10,000명+, 개별 승인). Standard는 개발자 또는 지정 사용자가 Strava 구독 유지 필요. 증설·승인은 Strava 재량, 기한 보장 없음 — [Strava API Policy](https://www.strava.com/legal/api_policy)
- 표시 제한: 사용자 데이터는 그 사용자에게만 표시(2.3조, 공개 데이터여도). 캐시 최대 7일, 삭제 데이터는 48시간 내 제거 — [Strava API Policy](https://www.strava.com/legal/api_policy)
- AI: Strava 데이터를 AI 앱 개발/학습/운영(프롬프트, 임베딩, RAG 포함, 파생·익명 데이터도)에 사용 금지, 벡터스토어 등 영구 인덱스 저장 금지 — [Strava API Policy](https://www.strava.com/legal/api_policy)
- 신규 앱 athlete capacity 1("Single Player Mode"), 리뷰 전엔 다른 선수 인증 불가 — [Strava Rate Limits](https://developers.strava.com/docs/rate-limits/) (검색 스니펫 기준)
- 셀프 업그레이드(10명) 시 한도: 전체 400회/15분·4,000회/일, 비업로드 200회/15분·2,000회/일(앱 전체 공유). 신규 Standard 개발자는 2026-06-01부터, 기존은 2026-06-30까지 구독 필요. 2027-01-04 새 base URL(api-v3.strava.com), 2027-06-01 토큰을 헤더로만 전달 — [Terra: Strava API changes 2026](https://tryterra.co/blog/strava-api-changes-2026)
- 2024-11 변경(타 사용자에게 데이터 표시 제한, AI 학습 금지)부터 이어진 흐름 — [DC Rainmaker 2024-11](https://dcrainmaker.com/2024/11/stravas-changes-to-kill-off-apps.html)
- 파일 내보내기: 계정 전체 내보내기(zip, activities/ 폴더에 GPX/FIT/TCX 원본 + activities.csv, 수시간~최대 10일), 개별 활동은 메뉴의 Export GPX/Original 또는 URL `/export_gpx`, `/export_original` — [takeoutday 가이드](https://takeoutday.org/guides/how-to-export-strava-data); [indieweb Strava](https://indieweb.org/Strava); [StravaExportToGPX](https://github.com/flopp/StravaExportToGPX)

### Inferences
- client_secret을 APK/PWA에 넣으면 노출됨 → 보안상·약관상 부적절. Spark 플랜엔 서버 코드가 없으므로 사실상 불가(Cloudflare Workers 같은 외부 무료 서버를 추가하면 가능하지만 "서버 없음" 전제 깨짐).
- 10명 이하 베타라도 대표님(개발자)이 Strava 구독을 유지해야 하고, 마이로그에 AI 기능이 있거나 생길 경우 Strava 데이터와 섞는 것 자체가 금지.

### Gaps
- Strava 공식 지원 문서의 대량 내보내기 절차는 직접 열람 못함(서드파티 안내 간 파일명/형식 상충).
- capacity 1 상태의 정확한 rate limit 수치는 공식 페이지 미열람.

## Garmin Connect / Garmin Health API

### Takeaway
비즈니스 개발자 전용(무료지만 승인제)이고, 2026년 봄부터 신규 API 접근 승인이 무기한 중단된 상태라 현재 사실상 불가. 대안은 사용자가 Garmin Connect에서 FIT 파일을 내보내 업로드하거나 Health Connect 경유.

### Cited Findings
- Garmin Connect Developer Program은 승인된 비즈니스 개발자에게 무료, Activity API 등 일부는 상위 티어 협의 — [Garmin GC Developer Program overview](https://developer.garmin.com/gc-developer-program/overview); [Program FAQ](https://developer.garmin.com/gc-developer-program/program-faq)
- 과거 $5,000 수수료 언급은 2014년 자료로 현재와 다름(오래된 정보) — [DC Rainmaker 2014](https://dcrainmaker.com/2014/06/counterpoint-garmin-sync.html)
- 2026년 봄부터 신규 신청 처리 중단("API 프로그램 재설계·현대화"), 재개일 없음, 기존 연동은 유지. 대안으로 개별 FIT/전체 계정 내보내기 언급 — [the5krunner 2026-09-14](https://the5krunner.com/2026/09/14/garmin-developer-api-access-paused/); [Terra 블로그](https://tryterra.co/blog/garmin-connect-developer-program-pause)

### Inferences
- 개인 앱이 승인받을 가능성은 재개 후에도 낮음(비즈니스 대상). Garmin Connect 앱은 Health Connect 연동을 제공한다고 알려져 있으나 이번 조사에서 공식 확인은 못함.

### Gaps
- Garmin Connect → Health Connect 쓰기 범위(운동 세션/경로) 공식 문서 확인 못함.

## 파일 Import (GPX / TCX / FIT) — 브라우저 파싱과 앱별 내보내기

### Takeaway
서버·심사·비용 없이 iPhone PWA와 Android 모두에서 동작하는 유일한 공통 경로. FIT은 Garmin 공식 JS SDK(@garmin/fitsdk, 브라우저 동작, 디코드 전용)로, GPX/TCX는 XML이라 DOMParser로 직접 파싱 가능. 단점은 사용자가 매번 파일을 내보내 업로드해야 하는 수동 UX.

### Cited Findings
- @garmin/fitsdk: ES 모듈, 브라우저 호환, `Decoder`, `Stream.fromArrayBuffer`, `Decoder.isFIT`. CDN 미제공 → SDK의 JS 파일을 프로젝트에 복사하고 import map 사용(vanilla JS에 적합). 디코드만 지원 — [npm @garmin/fitsdk](https://npmjs.com/package/%40garmin%2Ffitsdk); [garmin/fit-javascript-sdk](https://github.com/garmin/fit-javascript-sdk); [Garmin 포럼: npm 없이 사용](https://forums.garmin.com/developer/fit-sdk/f/discussion/359510/javascript-sdk-without-node-js-npm)
- 대안 파서: fit-file-parser(jimmykane), fit-decoder(브라우저/Node 지원) — [jimmykane/fit-parser](https://github.com/jimmykane/fit-parser); [tomazs/fit-decoder](https://github.com/tomazs/fit-decoder)
- FIT은 GPS 좌표 + 시간·심박·파워·케이던스·랩 포함, GPX는 경로 중심(센서 데이터 적음), 변환 반복 시 세부 데이터 손실 — [yellowit 운동 로그 복구 글](https://yellowit.co.kr/it-review/%ec%9a%b4%eb%8f%99-%eb%a1%9c%ea%b7%b8-%eb%b3%b5%ea%b5%ac%c2%b7%ed%95%a9%ec%b9%98%ea%b8%b0%ef%bd%9c%eb%a7%88%eb%9d%bc%ed%86%a4-%eb%9f%ac%eb%8b%9d-%ec%9e%90%ec%a0%84%ea%b1%b0-fit%c2%b7gpx%c2%b7tcx/)
- 앱별 내보내기:
  - Strava: 개별 GPX/원본(FIT), 계정 전체 zip — 위 Strava 섹션 출처
  - Garmin: 개별 FIT 또는 전체 계정 데이터 대량 내보내기 — [the5krunner](https://the5krunner.com/2026/09/14/garmin-developer-api-access-paused/); 웹에서 대량은 CSV, 개별은 GPX라는 사용자 보고 — [Garmin 포럼](https://forums.garmin.com/apps-software/mobile-apps-web/f/garmin-connect-web/166824/is-there-a-way-to-export-bulk-data-to-tcx-or-gpx-files-seems-like-i-can-only-bulk-export-to-csv-and-individual-activities-to-gpx)
  - Apple Health: export.xml + workout-routes GPX — 위 Apple 섹션 출처
  - Samsung Health: GPX 내보내기 가능(커뮤니티 보고, 케이던스 누락) — 위 Samsung 섹션 출처
  - Nike Run Club / 런데이: 아래 섹션

### Inferences
- GPX/TCX 파싱은 라이브러리 없이 DOMParser + 하버사인 거리 계산 수십~백여 줄로 충분(추정). 거리·시간·페이스·고도·(TCX/GPX 확장의) 심박 추출 가능.
- 필라테스는 파일이 없는 경우가 대부분 → 파일 import는 러닝 전용, 필라테스는 Health Connect 또는 수동 입력.

### Gaps
- gpxparser 등 GPX 전용 npm 라이브러리 현황은 이번에 확인 못함.

## Nike Run Club / 런데이(RunDay) — 내보내기·API

### Takeaway
두 앱 모두 공개 API는 없다. NRC는 공식 개인정보(Nike 멤버 데이터) 요청 아카이브 또는 비공식 스크립트로 GPX를 얻을 수 있고, Apple Health/Health Connect에 운동 요약을 쓴다는 벤더 정보가 있다. 런데이는 GPX 내보내기나 Health Connect/Apple 건강 연동에 대한 공식 정보를 찾지 못했다.

### Cited Findings
- NRC 공식 운동 기록 내보내기 API 없음. Nike 멤버 데이터 아카이브에 활동별 GPX/FIT + JSON 메타데이터가 들어있다는 서드파티 안내(검증 필요) — [takeoutday NRC 가이드](https://takeoutday.org/guides/how-to-export-nike-run-club-data)
- 비공식 API 기반 오픈소스(nrc-exporter, nrc2strava)로 GPS가 있는 활동만 GPX 생성, Nike 변경 시 깨질 수 있음 — [nrc-exporter 미러](https://git.sudo.is/mirrors/nrc-exporter); [nrc2strava](https://github.com/alexpryshchepa/nrc2strava)
- NRC는 완료한 러닝(운동, 거리, 심박, 활동 에너지)을 Apple Health와 Health Connect에 기록한다는 벤더 페이지(경로 포함 여부 불명) — [Sahha NRC integration](https://sahha.ai/integrations/nike-run-club/)
- 런데이: 내보내기/Health Connect/애플 건강 연동에 대한 공식 문서를 검색에서 찾지 못함 — (검색 결과 없음)

### Inferences
- NRC 사용자(Android)는 Health Connect 경로로 요약은 받을 가능성이 높음. 런데이는 테스터 기기에서 Health Connect 앱 권한 목록에 런데이가 보이는지 직접 확인이 가장 빠름.

### Gaps
- 런데이의 Health Connect/Apple 건강 쓰기 지원 여부와 GPX 내보내기 기능: 공식 출처 없음(앱 설정 또는 고객센터 확인 필요).
- NRC가 Health Connect에 ExerciseRoute까지 쓰는지 확인 못함.
