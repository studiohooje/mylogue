# MyWeightLog 홈 디자인 10종 작업 기록

## 대표님 요청

- 메인화면만 10가지 **서로 다른 시각 디자인**의 조작 가능한 프로토타입 목업 제작.
- 현재 홈의 큰 정보 구조는 유지. 색, 글꼴, 크기, 간격, 버튼, 카드, 팝업, 헤더, 푸터까지 비교.
- 과도하게 단순한 컨셉 화면이 아닌 실제 상용 앱처럼 충분한 콘텐츠 밀도와 마감.
- 실제 국내외 서비스 조사 후 마웨로그에 맞게 응용. 기존 서비스의 화면을 그대로 복제하지 않음.
- 모바일과 웹 화면에서 검수. 실제 앱 코드는 아직 변경하지 않음.

## 현재 홈 기준

`app/timeline-view.js`의 순서: 메시지/날짜 → 오늘의 타임라인(식사·운동) → 빠른 기록 → AI 검토함. `app/app.js`에서 헤더, 하단 탐색, 기록 버튼을 제공. 목업은 체성분 요약을 추가해 세 축을 한눈에 보되 순서를 크게 바꾸지 않는다. 모든 수치는 예시.

## 조사에서 확인한 패턴

- WHOOP 홈: 핵심 지표와 그날의 활동, 계획, 개인화 대시보드를 한 화면의 세로 흐름으로 배치. 빠른 기록 진입점 제공. https://www.whoop.com/us/en/thelocker/the-all-new-whoop-home-screen/
- MacroFactor: 열량 및 매크로를 목표와 함께 보여주고, 섭취/남은 양 관점을 전환. https://help.macrofactorapp.com/en/articles/225-understanding-the-widgets-at-the-top-of-the-dashboard
- Hevy: 기록 중심의 짧은 입력 흐름과 최근 세트 값 재사용. https://www.hevyapp.com/compare/bevel/
- Linear: 글꼴 크기, 밝고 어두운 테마 등 표현 체계를 개인화. https://linear.app/docs/account-preferences
- Uber Base: 제목과 본문을 모듈형 타이포그래피로 구분하고 카드·버튼을 일관된 디자인 언어로 관리. https://base.uber.com/6d2425e9f/p/976582-typography/b/98142c
- Spotify: 대표색은 강한 식별 요소로 쓰고 중립색으로 화면의 균형을 잡음. https://developer.spotify.com/documentation/design
- Duolingo: 선명한 색, 둥근 버튼, 연속 사용 표시를 명확한 시각 신호로 활용. https://blog.duolingo.com/shape-language-duolingos-art-style/

## 10종의 디자인 가설

| 번호 | 표현 방향 | 관찰한 원리의 응용 |
| --- | --- | --- |
| 01 | Midnight Performance | WHOOP식 한 화면 지표 흐름에 청록색 기록 신호 |
| 02 | Porcelain Studio | Uber식 차분한 제목·버튼 계층을 따뜻한 밝은 표면에 적용 |
| 03 | Cobalt Current | Spotify식 강한 대표색과 중립색 대비를 스포츠 톤으로 재구성 |
| 04 | Sage Ledger | Linear식 테마 선택 가능성을 자연색 기록장으로 해석 |
| 05 | Copper Club | Hevy식 운동 기록 중심 정보를 묵직한 클럽 톤으로 표현 |
| 06 | Nordic Signal | Uber식 정보·컴포넌트 일관성을 냉색 데이터 화면에 적용 |
| 07 | Coral Pulse | Duolingo식 연속 기록 신호를 따뜻한 강조색으로 번역 |
| 08 | Graphite Lab | MacroFactor식 목표·수치 강조를 분석 도구 톤에 결합 |
| 09 | Aster Editorial | 일지의 이야기성과 데이터 카드를 편집형 타이포그래피로 결합 |
| 10 | Aurora Motion | Spotify식 풍부한 브랜드 표면과 일일 기록을 미래적 톤에 결합 |

색상, 타이포그래피, 표면 형태, 헤더·하단 탐색, 카드, 버튼, 팝업은 모두 이 폴더의 독립된 시안이다. 위 서비스의 UI, 로고, 문구, 일러스트를 복제하지 않았다.

## 구현·검증 체크리스트

- [x] 현 홈 구조와 공식 제품 자료 조사
- [x] 10개 디자인 방향, 각기 다른 팔레트와 표면/타이포그래피 정의
- [x] 단일 HTML 프로토타입에서 10종 전환, 모바일/웹 반응형, 버튼·팝업 동작
- [x] 10종 화면 캡처와 390·768·1440px 줄바꿈·가로 넘침 검수 (`qa-results.json`: 30개 조합 오류 0)
- [x] 빠른 기록 팝업 열림 및 테마 반영 확인
- [x] 컴퓨터용 웹/휴대폰 앱 화면 전환 추가. 390px 프레임과 시안 연동, 실제 Chrome 캡처 확인.
- [x] 최종 대표님 전달 준비

## 결정 경계

이 폴더는 디자인 선택용 목업이다. Firebase, 실제 식단·운동 기록, 사용자의 개인정보와 연결하지 않는다. 대표님이 선택한 시안을 기준으로 이후 실제 웹·Android 스타일을 수정한다.
