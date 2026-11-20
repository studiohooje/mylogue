# 필라테스 세션 기록: 앱·실무자는 무엇을 기록하고, 사용자는 무엇을 원하는가 (2026-11 기준)

> 조사 방식: 웹 검색과 페이지 열람 약 20회. 검색 도구가 요약해 준 결과가 많아서 1차 출처(공식 문서)를 직접 열어 확인한 항목과 검색 요약으로만 확인한 항목을 구분했다. Reddit r/pilates 스레드와 네이버 블로그/카페 원문은 검색에 걸리지 않아 직접 확인하지 못했다(Gaps에 적음).

## 1. 범용 피트니스 플랫폼은 Pilates 활동에 무엇을 기록하나

### Takeaway
Apple·Strava·Health Connect·Garmin 모두 "Pilates"를 운동 종류 값으로만 두고, 기록하는 것은 시간·심박·칼로리 같은 공통 지표뿐이다. 기구, 동작, 스프링 같은 필라테스 고유 필드를 둔 범용 플랫폼은 찾지 못했다. 따라서 마이로그가 연동을 붙이더라도 받아올 수 있는 것은 "종류=Pilates + 시간/심박/칼로리"가 전부라고 보면 된다.

### Cited Findings
- Apple Watch: Apple 공식 지원 페이지 "Workout types on Apple Watch"에 Pilates가 독립 운동 유형으로 올라 있다(Barre, Mind & Body 등과 함께). — [Apple Support HT207934](https://support.apple.com/en-us/ht207934)
- Apple Watch에서 Tai Chi와 Pilates가 정식 운동 유형이 된 것은 **watchOS 8**(2021)부터다. 브리핑의 "watchOS 10에서 추가"는 정확하지 않다. watchOS 10은 Wikipedia가 지원 목록을 정리한 시점일 뿐이다. 측정은 "custom-built heart rate and motion algorithms" 기반이라는 설명만 있고, 필라테스 전용 지표는 없다. — [MacRumors 2021-06-07](https://www.macrumors.com/2021/06/07/apple-fitness-workout-types/); [Wikipedia: Workouts (Apple)](https://en.wikipedia.org/wiki/Workouts_(Apple))
- watchOS 8 이전에는 "Other(기타)"로 시작한 뒤 이름을 Pilates로 붙이는 방식이었다. — [Apple Community](https://discussions.apple.com/thread/250275180)
- Health Connect(Android): AndroidX `ExerciseSessionRecord.EXERCISE_TYPE_PILATES = 48`. 프레임워크 API(API 34+)에서는 `ExerciseSessionType.EXERCISE_SESSION_TYPE_PILATES = 27`이다. 세션 레코드에는 시작/종료 시각, 제목, 메모, 구간(segment)/랩이 있고, 필라테스 전용 필드는 없다. — [AndroidX ExerciseSessionRecord](https://developer.android.com/reference/kotlin/androidx/health/connect/client/records/ExerciseSessionRecord); [ExerciseSessionType](https://developer.android.com/reference/kotlin/android/health/connect/datatypes/ExerciseSessionType); [Health Connect data types](https://developer.android.com/health-and-fitness/health-connect/data-types)
- Strava: 공식 지원 목록에 Pilates 스포츠 타입이 있다(Yoga, Weight Training, HIIT 등과 함께). 2026년 2월에 농구·크리켓·댄스·파델·배구가, 2026-04-30에 Physical Therapy가 추가됐다. Pilates가 처음 추가된 날짜는 찾지 못했다. — [Strava Supported Activity Types](https://support.strava.com/hc/en-us/articles/216919407-Supported-Activity-Types-on-Strava); [9to5Mac 2026-02-20](https://9to5mac.com/2026/02/20/strava-adds-five-activity-modalities-including-dancing/); [Marathon Handbook](https://marathonhandbook.com/strava-adds-physical-therapy-as-a-trackable-activity/)
- Garmin: 시계에 Pilates 전용 프로필이 있다는 공식 문서는 찾지 못했다. 사용자 포럼에서는 Yoga나 Cardio로 기록한 뒤 Garmin Connect에서 활동 유형을 Pilates로 바꾸는 방법을 쓴다(공식 문서가 아니라 커뮤니티 답변). 근력 프로필은 손목 움직임으로 렙을 세고 4회 이상부터 표시하며, 다리 운동은 잘 안 잡힌다. 바닥·하체 동작이 많은 필라테스에는 렙 자동 카운트가 맞지 않는다는 뜻이다. — [Garmin Forum: pilates activity](https://forums.garmin.com/outdoor-recreation/outdoor-recreation/f/instinct/195025/pilates-activity); [Garmin Forum: pilates as an activity](https://forums.garmin.com/outdoor-recreation/outdoor-recreation-archive/f/instinct/291271/pilates-as-an-activity); [Garmin 매뉴얼: Recording a Strength Training Activity](https://www8.garmin.com/manuals/webhelp/GUID-C2B794A7-F2FB-456B-B090-69C0111C43CB/EN-US/GUID-E46EDB3B-A02B-42C5-8FF5-AAD914F354C0.html)
- Garmin 2024 Connect 데이터 리포트에서 Pilates는 전년 대비 +42%로, 가장 크게 늘어난 활동 중 하나였다(검색 요약 기준). — [Athletech News](https://athletechnews.com/track-running-hiit-pilates-garmin-data-report/)
- Samsung Health: iFIT 제휴 콘텐츠의 7개 카테고리 중 하나가 Pilates다(2025-11). 갤럭시 워치는 이 세션에서 시간·심박·칼로리를 보여 주고 건강 프로필에 저장한다. 필라테스 전용 지표는 확인하지 못했다. — [9to5Google 2025-11-10](https://9to5google.com/2025/11/10/samsung-health-adding-guided-workouts-for-galaxy-watch-but-with-a-subscription/); [Droid Life](https://www.droid-life.com/2025/11/10/samsung-adds-ifit-workouts-to-samsung-health-and-galaxy-watches/); [Samsung 운동 타입 API](https://developer.samsung.com/health/android/data/api-reference/EXERCISE_TYPE.html)

### Inferences
- 범용 플랫폼의 공통 필드는 사실상 운동 종류, 시작/종료(시간), 심박, 칼로리, 메모, 체감 강도(일부)다. 마이로그의 최소 기록에 이 필드를 맞춰 두면 나중에 Health Connect/HealthKit으로 내보낼 때 손실 없이 매핑된다(Health Connect 세션 type=48, 메모 필드에 요약).
- 손목 렙 카운트는 필라테스에서 거의 쓸모가 없다. 렙은 수동 입력이나 "기본값 10회" 같은 프리셋이 현실적이다.

### Gaps
- Fitbit/Google(Pixel Watch) 앱에 Pilates 운동 유형이 있는지는 이번 조사에서 확인하지 못했다.
- Samsung Health의 기본 운동 목록(iFIT가 아닌 것)에 Pilates가 따로 있는지 원문으로 확인하지 못했다. 개발자 문서 발췌에서는 Pilates 항목이 보이지 않았다.
- Apple의 HKWorkoutActivityType 공식 페이지를 직접 열지 못해 상수 이름(`.pilates`)과 도입 버전을 1차 출처로 확인하지 못했다.

## 2. 필라테스 전용 앱·스튜디오 소프트웨어는 무엇을 기록하나

### Takeaway
세 부류로 나뉜다. (a) 소비자용 온디맨드 앱(Pilates Anytime 등)은 수업 라이브러리가 중심이고 개인 기록은 약하다. (b) 스튜디오 예약 앱(Club Pilates, 바디코디, 모던필라테스 등)은 출석·누적 수업 수·잔여 횟수·스트릭이 중심이다. (c) 강사용 CRM(Arketa, Mindbody)은 세션 노트를 자유 텍스트로 받는다. 스프링·동작을 구조화된 필드로 받는 곳은 스마트 리포머(장비 연동)나 강사용 수업 설계 앱 정도다.

### Cited Findings
- Pilates Anytime: 3,700개 이상 수업, 200명 이상 강사, 40개 이상 유파. 기구와 길이로 분류되어 있다. 앱이 리디자인됐고 검색 기록이 웹/모바일에서 동기화된다. 분 수·스트릭·이력 통계 기능은 확인되지 않았다. — [The Manual: best pilates apps](https://themanual.com/fitness/best-pilates-apps); [App Store: Pilates Anytime](https://apps.apple.com/us/app/pilates-anytime-workouts/id646991927); [Pilates Anytime 지원: 새 앱](https://support.pilatesanytime.com/hc/en-us/articles/35818879115547-Welcome-to-the-New-App)
- Club Pilates 앱은 Apple Health와 연동하고, 누적 수업 수(lifetime classes)와 주간 스트릭 목표를 보여 준다(검색 요약 기준). — [App Store: Club Pilates](https://apps.apple.com/app/club-pilates/id1485767959)
- 스마트 리포머: Frame 리포머는 구독으로 운동을 자동 추적한다("no notebook or spreadsheet"). Flexia는 사용한 저항과 반복 횟수를 추적한다고 소개한다. NordicTrack/iFIT 리포머는 멤버십이 있어야 추적 기능을 쓸 수 있다. PILATIX 앱은 운동 이력, 일일 스트릭, 체중, 진행 사진을 기록한다. — [Frame Fitness 블로그](https://framefitness.com/blogs/guest-blog/four-ways-a-pilates-reformer-helps-you-stick-to-your-fitness-goals); [NordicTrack smart reformer](https://www.nordictrack.com/blog/smart-reformer-pilates); [PILATIX](https://mwm.ai/apps/pilatix/6758964188)
- 강사용 앱 Reformly: 수업 기록과 회고, 동작별 스프링 설정 표시, 강의 이력과 플로우별 통계를 제공한다. — [Reformly](https://mwm.ai/apps/reformly-pilates-classes/6787813302)
- Arketa: 노트 유형이 Client note(목표·선호·병력), Check-in note, Session note(무엇을 했는지·진행·후속 조치)로 나뉜다. 세션 노트는 예약에 붙고 고객 타임라인에 시간순으로 쌓인다. 기본은 스태프 전용이며 "Visible to customer"를 켜면 고객도 볼 수 있다. 스프링 전용 필드는 없다. — [Arketa: Client and session notes](https://help.arketa.com/clients/notes/client-session-notes); [Arketa: Note types](https://help.arketa.com/clients/notes/note-types)
- Mindbody: 예약 단위 SOAP 노트(텍스트 필드 4개)와 역시간순 이력을 제공한다. — [Mindbody: SOAP notes](https://www.mindbodyonline.com/education/blog/soap-notes-for-appointments)
- 호주 Pilates 협회(PAA)는 케이스 노트 양식(PDF)을 배포한다. 임상 필라테스 쪽은 기록 관행이 더 정형화돼 있다. — [PAA case notes template 2023](https://pilates.org.au/wp-content/uploads/PAA-case-notes-template-2023.pdf)
- 바디코디 회원용 앱(한국): 수업 예약, 모바일 회원증, 강사와 소통, 커뮤니티 게시글 공유(2024-06 개편), 강사가 회원의 "체형, 운동모습 숏폼 영상"을 올려 주는 기능, 전자계약서 PDF를 지원한다. — [App Store KR: 바디코디 회원용](https://apps.apple.com/kr/app/%EB%B0%94%EB%94%94%EC%BD%94%EB%94%94-%EB%A9%A4%EB%B2%84%EC%8A%A4-bodycodi-members/id1557408918)
- 모던필라테스 등 센터 앱(한국): 이용 내역을 스케줄러로 보고 남은 기간·횟수를 확인한다(검색 요약 기준). — [App Store: 모던필라테스](https://apps.apple.com/us/app/%EB%AA%A8%EB%8D%98%ED%95%84%EB%9D%BC%ED%85%8C%EC%8A%A4/id1438225008?l=ko)

### Inferences
- 한국 사용자는 이미 센터 앱으로 예약과 잔여 횟수를 확인한다. 마이로그가 경쟁할 이유는 없고, "센터 앱에는 없는 개인 기록"(내 느낌, 어려웠던 동작, 스프링 메모, 통증, 체형 변화를 체중·인바디와 함께 보는 것)이 차별점이 된다. 다만 사용자가 마이로그에서 직접 관리하고 싶어 할 수 있으니, 수강권 잔여 횟수는 선택 기능 정도로 둘 만하다.
- 어떤 소프트웨어도 스프링을 표준 필드로 두지 않는다. 대부분 자유 텍스트로 처리한다는 점이 요구 수준을 가늠하는 신호다.

### Gaps
- 스튜디오메이트, 하이짐, 짐다의 회원 앱 기능(수업 기록 열람 여부)은 검색으로 확인하지 못했다.
- Alo Moves, Glo, Pilatesology, Bloom, Balanced Body 앱의 개인 기록 기능은 원문으로 확인하지 못했다.

## 3. 기구/수업 유형 분류

### Takeaway
현실적인 분류는 기구 축(Mat / Reformer / Cadillac(Tower) / Chair / Barrel(Ladder, Spine Corrector) / 소도구)과 수업 형태 축(그룹 / 1:1 / 듀엣(2:1) / 홈·영상)이다. 그 위에 레벨(입문/기초·중급·고급)을 얹는다. Pilates Anytime도 수업을 기구 기준으로 분류한다.

### Cited Findings
- Pilates Anytime은 수업을 기구와 길이로 분류한다. — [The Manual](https://themanual.com/fitness/best-pilates-apps)
- 클래식 매트 레퍼토리는 레벨(basic/intermediate/advanced)로 나뉜다. — [Pilatesology: Classical Mat Exercises Basic/Intermediate/Advanced (PDF)](https://pilatesology.com/wp-content/uploads/2024/04/Classical-Mat-Exercises-Basic-Intermediate-Advanced-With-LINKS.pdf)
- 한국 강사 블로그는 1:1 수업과 그룹 수업을 구분하고, 그룹 수업에서는 놓친 동작이나 질문거리를 기록하라고 권한다. — [miso.kr: 수업 후 관리 꿀팁](https://miso.kr/blog/thread/%ED%95%84%EB%9D%BC%ED%85%8C%EC%8A%A4-%EC%88%98%EC%97%85-%ED%9B%84-%EA%B4%80%EB%A6%AC-%EA%BF%80%ED%8C%81)

### Inferences
- 한 수업에서 기구를 여러 개 쓰는 경우가 흔하다(예: 1:1에서 Reformer와 Chair). 기구 필드는 단일 선택보다 다중 선택이 맞다.
- 한국 스튜디오의 그룹 수업은 흔히 "기구 그룹"(리포머 위주)과 "매트 그룹"으로 나뉘는 것으로 보인다. 다만 이를 뒷받침하는 1차 출처는 찾지 못했다.

### Gaps
- 한국 스튜디오 수업명의 실제 분포(예: "기구 그룹 6:1", "듀엣", "체어 클래스")를 보여 주는 정량 자료는 없다.

## 4. 강사 측 세션 노트와 회원 측 기록의 무게

### Takeaway
강사 노트는 관찰(골반 드롭, 신전 통증 등), 수행한 운동(종류·횟수·강도), 피드백(잘된 점·개선점), 숙제, 회차/잔여 회차가 핵심이다. 회원 쪽 권장 기록은 훨씬 가볍다. 어려웠던 동작, 느낌·감각, 통증 여부, 질문거리 정도이고, 스프링은 "숫자보다 흔들림 정도"로 기억하라는 조언이 있다. 그래서 동작마다 스프링과 렙을 적게 하는 것은 1:1 수강자나 홈 리포머 사용자에게만 맞는 선택 기능으로 보는 것이 맞다.

### Cited Findings
- 한국 필라테스 강사의 회원차트(Brunch)에는 다음 항목이 있다.
  - 회원 DB: 회원권 기간, 잔여 수업 횟수, 재등록 시기, 목표 분류(다이어트/통증관리/체력증진), 누적 세션, 결석
  - 강사 비공개 특이사항: 한다리 지지 시 골반 드롭, 허리 신전 시 통증 등
  - 세션 기록지: 회차/잔여 회차, 잔여 3회 이하 재등록 알림, 오늘의 목표, 실시한 운동(종류·횟수·강도), 잘된 점·개선할 점, 비교 사진, 숙제·영상 링크
  - 5세션마다 중간점검 설문
  - 원문에 스프링 필드는 따로 없다.
  — [Brunch: 90%가 재등록하는 회원차트 작성법](https://brunch.co.kr/@lingel92/32)
- 회원용 수업 후 복기 권장 항목(한국 블로그): 가장 어려웠던 동작, 잘 잡힌 감각과 차이, 호흡 신호, 골반 위치, 스프링(가벼움보다 몸이 얼마나 흔들렸는지로 난이도를 기억), 근육통과 구분되는 찌르는 통증·저림, 그룹 수업 질문거리(동작 1개, 자세 신호 1개). — [miso.kr: 수업 후 관리 꿀팁](https://miso.kr/blog/thread/%ED%95%84%EB%9D%BC%ED%85%8C%EC%8A%A4-%EC%88%98%EC%97%85-%ED%9B%84-%EA%B4%80%EB%A6%AC-%EA%BF%80%ED%8C%81); 관련 글: [miso.kr: 가벼운 스프링이 더 어려운 이유](https://miso.kr/blog/thread/%ED%95%84%EB%9D%BC%ED%85%8C%EC%8A%A4-%EC%9D%BC%EB%8C%80%EC%9D%BC-%EC%88%98%EC%97%85-%EA%BF%80%ED%8C%81)
- Arketa 세션 노트는 "무엇을 했는지·진행·후속 조치"를 담는 자유 텍스트이고, 고객 공개 여부를 선택할 수 있다. — [Arketa](https://help.arketa.com/clients/notes/client-session-notes)
- 영미권 스튜디오 블로그들은 운동명·렙/세트·사용한 modification 기록, 리포머 스프링 설정, 좋은 폼으로 완수한 렙, 플랭크·티저 유지 시간, 강사에게 폼 피드백 요청을 권한다(검색 요약으로 확인했고 개별 문장 대조는 하지 못함). — [S2 Fitness Studio](https://s2fitnessstudio.com/blog/the-ultimate-guide-to-tracking-your-pilates-results-over-time); [A4 Fitness](https://www.a4fitness.com/how-do-you-track-pilates-i/); [ABsolute Pilates](https://absolutepilates.ca/2025/07/30/how-to-track-your-pilates-progress-2/)

### Inferences
- 그룹 수업 수강자는 수업 중에 동작명이나 스프링을 정확히 알기 어렵고, 강사가 진행을 주도한다. 동작마다 입력하라고 하면 이탈할 가능성이 크다. 권장 구조는 "세션 단위 필수 + 동작 단위 선택"이다.
- 스프링이 가벼울수록 더 어려운 동작이 있다(miso.kr 글 제목 그대로 "가벼운 스프링이 더 어려운 이유"). 스프링 숫자를 kg처럼 "높을수록 강하다"는 진척 지표로 쓰면 오해를 낳는다(5절 참고).

### Gaps
- 회원이 동작별 스프링·렙 기록을 원하는지 정량으로 보여 주는 자료(설문, Reddit 투표)는 찾지 못했다.

## 5. 실천자가 추적하고 싶어 하는 것

### Takeaway
반복해서 나오는 것은 다음과 같다. ① 출석·스트릭·누적 수업 수, ② 수강권 잔여 횟수(한국 센터 앱의 핵심), ③ "쉬워진 동작"과 고급 동작 해금 같은 질적 진척, ④ 플랭크·티저 유지 시간이나 손 뻗기 거리 같은 간단한 수치, ⑤ 체형 사진·둘레, ⑥ 통증 변화, ⑦ 느낌과 감각 메모.

### Cited Findings
- 누적 수업 수와 주간 스트릭 목표(Club Pilates 앱). — [App Store: Club Pilates](https://apps.apple.com/app/club-pilates/id1485767959)
- 진행 사진과 일일 스트릭(PILATIX 앱). — [PILATIX](https://mwm.ai/apps/pilatix/6758964188)
- 잔여 횟수, 누적 세션, 결석, 목표 분류(통증관리 등), 재등록 알림(한국 강사 차트). — [Brunch](https://brunch.co.kr/@lingel92/32)
- 스튜디오 블로그 권장: 주간 몸 상태 메모, 쉬워지거나 어려워진 동작, 손 뻗기 거리, 일정한 조명·포즈로 찍는 진행 사진, 신체 둘레. — [ABsolute Pilates](https://absolutepilates.ca/2025/07/30/how-to-track-your-pilates-progress-2/); [RTR Pilates](https://rtrpilates.com/setting-pilates-goals-and-tracking-improvement-as-a-beginner/); [Pilates Moves You](https://pilatesmovesyou.com/how-to-track-your-pilates-progress/)
- 한국 블로그: 통증 신호를 근육통과 구분해 기록할 것. — [miso.kr](https://miso.kr/blog/thread/%ED%95%84%EB%9D%BC%ED%85%8C%EC%8A%A4-%EC%88%98%EC%97%85-%ED%9B%84-%EA%B4%80%EB%A6%AC-%EA%BF%80%ED%8C%81)

### Inferences
- 마이로그는 이미 체중과 체성분을 기록하므로, "필라테스 횟수와 체성분·체형 사진 추이를 한 화면에" 보여 주는 것이 다른 앱이 갖기 어려운 강점이다.
- RPE(1–10)나 "오늘 강도(쉬움/적당/힘듦)" 한 개 필드는 웨이트 기록과 형식을 통일하기에 좋다. 다만 필라테스 쪽에서 RPE를 쓰라는 출처는 찾지 못했다(일반 원칙에서 나온 추론).

### Gaps
- Reddit r/pilates와 네이버 카페 원문 스레드는 검색에 잡히지 않았다. 커뮤니티의 실제 요구(예: "springs log 원함" vs "귀찮음")는 직접 확인하지 못했다.

## 6. 연구에서 쓰는 결과 지표와 셀프 측정 가능성

### Takeaway
연구에서 많이 쓰는 지표는 유연성(sit-and-reach), 복부/코어 지구력(컬업, 플랭크 계열), 균형, 자세다. 효과의 근거는 "운동 안 함" 대비로는 유연성·복부 지구력에서 비교적 일관되지만, 다른 운동과 비교하면 차이가 작거나 없고 근거 질이 낮다. 셀프 기록용으로는 손 뻗기 거리(cm), 플랭크 유지 시간(초), 한발 서기 시간(초), 정면·측면 자세 사진 정도가 현실적이다.

### Cited Findings
- 2022 Heliyon 체계적 고찰·메타분석: 다른 운동과 비교했을 때 Pilates는 유연성·균형에서 차이가 없었고 근거 수준은 very low~low였다. — [PMC9681646](https://pmc.ncbi.nlm.nih.gov/articles/PMC9681646)
- 건강한 성인 대상 체계적 고찰: 유연성 개선 근거는 strong(훈련 종료 시점까지만), 근지구력 근거는 moderate. — [A Systematic Review of the Effects of Pilates Method of Exercise in Healthy People (Univ. Évora)](https://dev.rdpc.dspace.uevora.pt/items/ac6bc14e-1983-4a1c-bffc-a151366ef97c)
- 건강한 사람 대상 메타분석: 운동 안 함 대비 복부 지구력은 개선됐지만 유연성은 유의하지 않았다. 앞 고찰과 상충한다. — [Effect of the Pilates method on physical conditioning of healthy subjects: SR & MA](https://vufind-test.katalog.k.utb.cz/SummonRecord/FETCH-LOGICAL-p305t-da3e3003dd11518e638e004ab1bf5a1d7f9f05fafc0c471a9a4aa935b4023f8c2)
- 운동선수 대상 메타분석: sit-and-reach에서 대조군 대비 유의한 개선이 없었고 이질성이 매우 컸다(검색 요약, 원문 미대조). — [comum.rcaap.pt](https://comum.rcaap.pt/bitstreams/d1441ec2-220b-4571-a7aa-453084ef0830/download)
- 실천 권장 지표: 플랭크·티저 유지 시간, 손 뻗기 거리. — [S2 Fitness Studio](https://s2fitnessstudio.com/blog/the-ultimate-guide-to-tracking-your-pilates-results-over-time); [ABsolute Pilates](https://absolutepilates.ca/2025/07/30/how-to-track-your-pilates-progress-2/)

### Inferences
- 셀프 측정은 "월 1회 체크" 형식이 적당하다: 앉아 손 뻗기(cm, 발끝 기준 ±), 플랭크(초), 한발 서기(초), 롤업 가능 여부(예/아니오), 자세 사진. 매 세션 입력할 필요는 없다.
- 연구 근거가 혼재하므로 앱이 "필라테스로 유연성이 X% 오른다" 같은 효과를 주장해서는 안 된다.

### Gaps
- 자세 지표 메타분석 원문은 확인하지 못했다(2차 출처에서만 언급됨).

## 7. (추가 요청) 웨이트 구조(기구 레지스트리 + 운동 카탈로그)와 대응시키기

### 7-1. 기구(apparatus) 축: 머신/프리웨이트에 대응

### Takeaway
기구 축은 웨이트의 "머신 vs 프리웨이트" 축과 잘 대응한다. 대형 기구(Reformer, Cadillac/Tower, Chair, Barrel 계열)는 "머신"처럼 브랜드·스튜디오마다 다르고, Mat와 소도구는 "프리웨이트/맨몸"에 해당한다. 다만 웨이트와 달리 같은 기구라도 브랜드에 따라 부하(스프링) 체계가 다르다. 그래서 체육관별 머신 레지스트리처럼 "스튜디오별 리포머 브랜드"를 저장해 두면 실제로 쓸모가 있다(7-3 참고).

### Cited Findings
- 리포머 브랜드별 스프링 체계가 다르고(Balanced Body, Merrithew STOTT, Peak, BASI, Align, Flexia, Gratz, AeroPilates), 브랜드 간 스프링은 호환되지 않는다("Don't mix brands"). — [Studio Growth: Reformer Spring Conversion Guide](https://studiogrowth.com/reformer-spring-conversion-guide/)
- Pilates Anytime는 수업을 기구별로 분류한다. — [The Manual](https://themanual.com/fitness/best-pilates-apps)
- BASI 출판물(Isacowitz)은 Reformer 외에 Spine Corrector 같은 기구별 플로우를 둔다. — [Pilates Anytime: BASI Flow Spine Corrector](https://www.pilatesanytime.com/class-view/3137/video/Pilates-BASI-Flow-Spine-Corrector-by-Rael-Isacowitz)

### Inferences (제안 분류)
- 대형 기구("머신"에 대응): Reformer(리포머), Reformer+Tower(콤비), Cadillac/Trapeze Table(캐딜락), Tower/Wall unit(타워·스프링보드), Chair(Wunda/Combo/Split pedal, 체어), Ladder Barrel(래더배럴), Spine Corrector/Step Barrel(스파인코렉터), Arc/Baby Arc
- 맨몸·소도구("프리웨이트/맨몸"에 대응): Mat, Magic Circle(링), Small ball(소프트볼), Theraband(밴드), Foam roller, Toe corrector·Foot corrector 등은 선택
- 기구 레지스트리(스튜디오별): 스튜디오 이름 + 리포머 브랜드(BB/STOTT/Gratz/Peak/기타·모름). 웨이트의 "체육관별 머신 레지스트리"와 같은 위치에 둔다.

### 7-2. 레퍼토리(동작) 카탈로그 축

### Takeaway
보편적인 단일 표준 분류는 없다. 다만 사실상의 기준점이 두 가지 있다. ① 클래식 매트 34동작(Joseph Pilates, *Return to Life Through Contrology*)으로 순서가 정해진 목록이다. ② BASI Block System으로 Warm-up, Footwork, Abdominal, Hip work, Spinal articulation… 순으로 블록을 나누는 "분류(filing) 체계"이며, BASI는 이를 "hundreds of exercises"를 정리하는 틀이라고 설명한다. STOTT와 Balanced Body도 각자 커리큘럼 명칭을 쓰고, 같은 동작도 유파마다 이름이 다르다.

### Cited Findings
- 클래식 매트 34동작은 *Return to Life*에 수행 순서대로 실려 있다. 초판 연도는 1945년과 1954년 판이 혼재해 출처마다 다르다. — [Pilates Anytime: The 34 Pilates Mat Exercises](https://www.pilatesanytime.com/blog/mat/the-34-pilates-mat-exercises-); [Alo Moves: Original 34](https://blog.alomoves.com/movement/original-34-pilates-exercises); [Pilates Anytime: Understanding Return to Life](https://www.pilatesanytime.com/blog/legacy/understanding-return-to-life)
- Pilatesology는 클래식 매트를 Basic/Intermediate/Advanced로 나눈다. 시작 순서는 The Hundred, Roll Up, Single Leg Circles, Rolling Like a Ball, Single Leg Stretch, Double Leg Stretch…이다. — [Pilatesology PDF](https://pilatesology.com/wp-content/uploads/2024/04/Classical-Mat-Exercises-Basic-Intermediate-Advanced-With-LINKS.pdf)
- BASI Block System: Rael Isacowitz가 고안한, 레퍼토리의 "hundreds of exercises"를 논리적 순서로 정리하는 filing system이다. — [BASI: Block System](https://www.basipilates.com/innovation/basi-block-system/)
- Isacowitz *Pilates*(2판) 발췌의 Reformer Fundamental 프로그램은 Roll-down 웜업 후 Footwork, Abdominal work, Hip work, Spinal articulation 블록 순서로 진행하고, 블록마다 동작이 배정된다. — [Human Kinetics: The Fundamental Apparatus Program](https://us.humankinetics.com/blogs/excerpt/the-fundamental-apparatus-program)

### Inferences (카탈로그 설계)
- 카탈로그 필드 제안: `id, 영문명(정식), 한국어 표기(예: 헌드레드, 풋워크, 숏스파인, 엘리펀트, 티저), 별칭[](유파별 이름), 기구[](다중: 예 Teaser→Mat/Reformer/Cadillac/Chair), 블록/부위(Footwork·Abdominal·Hip·Spinal articulation·Stretch·Full body·Arms·Legs·Lateral·Back extension), 레벨(기초/중급/고급)`
- 규모 추정(근거 일부): 매트 34개(클래식)에 리포머 기초~중급 약 40–60개, 체어·캐딜락·배럴 각 15–30개를 더하면 **실용 카탈로그는 120–180개**쯤이다. 이 수치는 출처가 아니라 추정이다. BASI가 "hundreds"라고 하므로 전체 레퍼토리는 수백 개가 맞다. 초기에는 매트 34개와 리포머 핵심 40개 정도로 시작하고, 사용자 정의 동작 추가를 열어 두는 것이 웨이트 카탈로그와 같은 전략이다.
- 같은 이름이 기구마다 다른 동작인 경우가 많다(예: Footwork는 Reformer/Chair/Cadillac에 모두 있다). 그래서 카탈로그 키는 "동작 + 기구" 조합으로 두거나, 동작 하나에 기구를 다중으로 달고 기록 시점에 기구를 선택하게 해야 한다.

### 7-3. 부하/난이도: kg 대신 무엇인가

### Takeaway
필라테스의 "부하"는 ① 스프링 조합, ② 렙, ③ 레벨/변형(modification)을 함께 봐야 한다. 스프링은 브랜드마다 색상의 의미가 다르고(BB의 빨강=중간, STOTT·BASI·Peak의 빨강=무거움), 같은 브랜드에서도 캐리지 위치나 기어, 스프링 마모에 따라 체감이 달라서 **스튜디오 간 비교는 사실상 불가능**하다. 또 스프링이 가벼울수록 더 어려워지는 동작이 있어서 "스프링↑ = 진척"이라는 공식이 성립하지 않는다. 웨이트의 kg처럼 볼륨(무게×렙)을 계산하는 것은 부적절하다.

### Cited Findings
- 브랜드별 색상과 강도(가벼움→무거움):
  - Balanced Body: Yellow(아주 가벼움) < Blue < Red(중간) < Green(무거움). 표준 세트에는 Green이 없어서 대부분의 기계에서는 Red가 가장 무겁다.
  - Merrithew STOTT: White < Blue < Red < Black
  - Peak: Blue < Yellow < Red
  - BASI: Yellow < Blue < Red(기어 설정에 따라 체감이 달라짐)
  - Flexia: White < Orange < Blue < Black
  - Gratz(클래식): 색 없이 동일한 스프링 4개, 끼우는 개수로 조절
  - AeroPilates: 스프링이 아닌 번지 코드
  - 같은 색이라도 브랜드에 따라 부하가 다르므로 색이 아니라 부하 단계로 맞추고, 스프링 하나가 아니라 **전체 조합의 총 부하**로 비교하라고 권한다. 예: BB의 Red 2+Blue 1 ≈ STOTT의 White 1+Blue 2. 캐리지 위치, 체격, 스프링 마모(약 2년마다 교체)가 체감 차이를 만든다.
  — [Studio Growth: Reformer Spring Conversion Guide](https://studiogrowth.com/reformer-spring-conversion-guide/)
- STOTT의 공칭 비율(100/50/25%)은 실제와 다르며 실제는 100/66/41%에 가깝다. 출처에 따라 Black을 125%로 표기한다. — [Studio Growth](https://studiogrowth.com/reformer-spring-conversion-guide/); [Fold Reformer: spring comparison](https://foldreformer.com/blogs/into-the-fold/pilates-reformer-springs-comparison)
- Balanced Body의 표준 구성은 출처마다 다르다. 판매처 기준 "Red 3·Blue 1·Yellow 1"과 매뉴얼 기준 Studio 구성 "Red 3·Blue 1·Green 1"이 상충한다. — [Peak Primal Wellness](https://peakprimalwellness.com/blogs/wellness/pilates-reformer-spring-settings); [Balanced Body Studio Reformer 매뉴얼](https://www.manualslib.es/manual/235763/Balanced-Body-Studio-Reformer.html?page=5)
- Gratz 스프링은 BB의 heavy 스프링과 비슷한 강도로 묘사된다. — [Online Pilates Classes: Reformer vs Gratz](https://onlinepilatesclasses.com/blog/reformer-vs-gratz-reformer/); [Pilates Anytime: BB vs Gratz](https://www.pilatesanytime.com/workshop-view/1318/video/Pilates-Balanced-Body-vs-Gratz-by-Carrie-Samper)
- 스프링 가이드 자료(브랜드별 설명). — [Pilatesology: Reformer Springs Guide (PDF, 2026-05)](https://pilatesology.com/wp-content/uploads/2026/05/Pilates-Reformer-Springs-Guide-1.pdf); [Pilates Anytime: Reformer Springs](https://www.pilatesanytime.com/blog/reformer/reformer-springs)
- 한국 블로그: 스프링이 가벼울수록 더 어려운 동작이 있으니, 난이도는 스프링의 가벼움보다 몸의 흔들림으로 기억하라. — [miso.kr: 가벼운 스프링이 더 어려운 이유](https://miso.kr/blog/thread/%ED%95%84%EB%9D%BC%ED%85%8C%EC%8A%A4-%EC%9D%BC%EB%8C%80%EC%9D%BC-%EC%88%98%EC%97%85-%EA%BF%80%ED%8C%81)

### Inferences (부하 필드 설계)
- 동작 1건의 선택 필드: `스프링(자유 입력 또는 색 칩 다중 선택: 예 "빨2 파1"), 렙, 세트(선택), 변형/레벨 태그(기초·수정·고급 버전), 체감 난이도(쉬움/적당/힘듦), 메모`
- 색 칩은 스튜디오에 등록한 브랜드에 맞는 팔레트를 보여 준다(BB/STOTT/Peak/BASI). 모르면 "색+개수" 자유 입력으로 받는다. 비교는 **같은 스튜디오, 같은 기구, 같은 동작** 안에서만 의미가 있다고 UI에 표시한다.
- 진척 지표는 kg 대신 다음을 쓴다. (a) 같은 동작의 스프링 변화(방향은 동작마다 다르므로 해석하지 않고 이력만 보여 줌), (b) 렙 증가, (c) 변형에서 정식 버전, 고급 버전으로 올라간 "레벨 해금", (d) 체감 난이도 하락. 웨이트처럼 총 볼륨(kg×렙)을 계산해서는 안 된다.

### Gaps
- 브랜드별 스프링의 실제 lbs/kg 값은 Studio Growth 페이지에 없었다. Align이 kg을 공개한다는 언급만 있다. 수치 비교표가 필요하면 각 제조사 매뉴얼을 확인해야 한다.
- STOTT와 Balanced Body 커리큘럼의 공식 동작 수, 블록 명칭은 확인하지 못했다.
- 한국 스튜디오에서 많이 쓰는 리포머 브랜드 점유율 자료는 찾지 못했다.

---

### 부록: 최소~풍부 기록안 (위 근거로 종합한 추론)
- **최소(필수, 10초 입력)**: 날짜, 수업 형태(그룹/1:1/듀엣/홈), 기구(다중), 시간(분), 체감 강도(3단계 또는 RPE), 한 줄 메모
- **보통(선택)**: 스튜디오(브랜드 포함 레지스트리), 강사, 수강권 잔여 횟수, 통증 여부·부위, 어려웠던 동작이나 좋았던 동작(카탈로그에서 선택), 그룹 수업 질문거리
- **풍부(1:1·홈 리포머용 선택)**: 동작별로 스프링·렙·변형·체감, 강사 피드백(잘된 점/개선점), 숙제
- **주기 체크(월 1회)**: 손 뻗기(cm), 플랭크(초), 한발 서기(초), 롤업·티저 가능 여부, 자세 사진. 이 체크를 기존 체중·체성분 기록과 같은 그래프에 겹쳐 보여 준다.
