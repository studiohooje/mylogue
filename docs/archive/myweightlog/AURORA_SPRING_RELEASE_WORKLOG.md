# MWL Beta 2.1.0 Aurora Halo + Spring Touch 작업 기록

대표님 승인: 2026-11-19. 실제 웹·Android 공통 앱 수정, 테스트, GitHub Pages 배포, APK 빌드·배포까지 승인. 기준 시안은 `mockups/aurora-variations-5/`의 5번 Aurora Halo, 모션은 `mockups/aurora-motion-10/`의 6번 Spring Touch.

## 수정 대상

1. 홈: 빠른 기록을 요약 지표보다 위로, 한 줄 낮은 버튼으로 변경. 실제 몸·식단·운동 데이터 기반 지표와 타임라인을 표시하고 빈 기록 상태를 다듬기.
2. 공통 화면: 배경·표면·글꼴·헤더·하단 탐색·카드·버튼·입력창·팝업·토스트·검색 패널의 Aurora Halo 토큰 적용. 웹·Android 동일 소스.
3. 모션: Spring Touch의 호버, 눌림·복귀, 화면 진입/뒤로, 팝업 열기/닫기, 저장 피드백. 화면을 반복 입력할 때 방해하지 않는 속도, `prefers-reduced-motion` 지원.
4. 자산·캐시: 로컬 글꼴 포함, 빌드·서비스워커·manifest 업데이트.
5. 버전: `2.1.0-beta`, Android versionCode 증가, `CHANGELOG.md`, `releases/2.1.0.md`, README, `PROJECT_DIRECTION_AND_DECISIONS.md` 갱신.
6. 검증: 자동 테스트, 웹 빌드, 화면 390·768·1200px, 주요 클릭·팝업·뒤로, Android 빌드·에뮬레이터, 배포 웹/다운로드 확인.

## 상태

- [x] 적용 범위와 기존 코드·배포 방식 조사
- [x] 홈과 공통 디자인 구현
- [x] 모션 및 동작 줄이기 구현
- [x] 버전·문서 갱신
- [x] 웹/Android 테스트와 시각 검수: 114/115 자동 테스트 통과(1개 에뮬레이터 전용 건너뜀), 웹 빌드·정적 검증, Android 빌드·에뮬레이터 설치 및 홈/팝업 확인
- [x] GitHub Pages와 APK 배포 확인: commit `54e2a36`, Actions 성공, 웹/CSS/APK HTTP 200

완료 표시에는 실제 실행 증거를 `releases/2.1.0.md`에 남긴다. 중단되면 이 문서의 미완료 항목부터 재개한다.
