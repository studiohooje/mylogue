# 마웨로그 Beta 2.1.0 · Aurora Halo 사업계획서 발표 노트

최종 파일: [`MWL_Beta_2_1_Aurora_Business_Plan.pptx`](MWL_Beta_2_1_Aurora_Business_Plan.pptx). 2026-11-19, 18장. 이전 Beta 2.0.1 자료는 보존하고 이 파일을 현재 발표본으로 사용한다.

## 개정 내용

- 앱의 Aurora Halo 남청·청록·푸른 보라와 SUIT 글꼴을 PPT 전체에 적용했다. 표지, 카드형 흐름, 2열 설명, 비교표, SWOT 등으로 슬라이드 구성을 달리했다.
- 표지와 제품 화면 네 장을 **Beta 2.1.0 Android 에뮬레이터 실제 캡처**로 교체했다. 홈·식단·운동·몸 화면에 기록이 없거나 시험 기록이 있는 상태를 각 슬라이드에 명시했다.
- 과거 자료의 설명용 인바디·음식 수치를 실제 제품 화면처럼 보이게 두지 않았다. AI 입력은 현재 로컬 연결과 향후 앱 내부 API를 구분했다.
- 빠른 기록의 우선 배치, Aurora Halo 및 Spring Touch, 관리자 승인제 기록, 사용자가 AI 초안을 확인·확정하는 흐름을 현재 제품 상태에 맞췄다.
- 사업 모델은 구독 가설로, 원가·가격·매출·시장 규모는 실측 전으로 표시했다. SWOT와 검증 지표를 포함했다.

## 슬라이드 흐름

1. 제품 비전과 현재 홈
2. 한 문장 제품 정의
3. 지속 기록 문제에 관한 외부 연구
4. 몸·식단·운동의 입력 장벽
5. 사진·말 → 검색 → 초안 → 사람 검토 → 기록
6. 실제 홈과 디자인 선택
7. 실제 식단 화면과 기록 방식
8. 실제 운동 화면과 세트·머신 재사용
9. 실제 몸 화면과 인바디 검토
10. 경쟁·대안 비교
11. 확인 가능한 기록 가설
12. 현재 로컬 AI와 향후 앱 내 AI 구조
13. 내부 실사용 검증 지표
14. 수익 모델 및 비용 가설
15. 단계별 초기 고객 검증
16. 현재 구현과 다음 결정
17. SWOT
18. 근거와 제품 자료

## 화면과 수치의 출처

- 실제 화면: `artifacts/aurora-final-android.png`, `artifacts/aurora-food-android.png`, `artifacts/aurora-workout-android.png`, `artifacts/aurora-body-android.png`. 모두 Beta 2.1.0 APK의 Android 에뮬레이터 촬영이다. 운동 화면에 보이는 숫자는 시험 계정의 기록이며 실사용 성과가 아니다.
- 외부 연구: [Turner-McGrievy 등, 2019](https://pubmed.ncbi.nlm.nih.gov/31155473/). 슬라이드의 수치는 해당 연구 완료자 분석에 한정된다.
- 경쟁 기능: [Hevy](https://www.hevyapp.com/features/), [FatSecret](https://www.fatsecret.com/fatsecret-app-help), [MacroFactor](https://help.macrofactorapp.com/en/articles/258-ai-food-logging) 공식 안내.
- 발표 구조: [Sequoia 사업계획서 가이드](https://articles.sequoiacap.com/writing-a-business-plan), [Y Combinator 발표 자료 가이드](https://www.ycombinator.com/library/4T-how-to-design-a-better-pitch-deck).

## 검증

- PowerPoint에서 18장 모두 열고 1280×720 PNG로 렌더링해 전 장의 정렬·자간·텍스트 잘림을 육안 확인했다.
- PPT 패키지 무결성 검사: 오류 0건. 슬라이드 배치 검사: 오류·경고 0건.
- 두 실제 사용자 계정의 종단 간 AI 입력, 4주 지속 기록, 영양·머신 인식 정확도, 구독 의향·호출 원가는 아직 측정 전이다.
