# Aurora Halo 모션 10종 작업 기록

## 대표님 지시

- 고른 디자인은 기존 10번의 5번째 변형 **Aurora Halo (10-5번)**. 색·배치·표면은 고정.
- 호버/마우스오버, 앱 탭, 화면 전환, 팝업, 뒤로 가기, 저장 반응 등을 통일감 있는 규칙으로.
- **모션 콤비네이션 10종**을 실제로 눌러볼 수 있는 반응형 목업으로 제공.
- 실제 MyWeightLog 웹·Android 앱은 아직 수정하지 않는다.

## 조사 기준

- Apple HIG Motion: 움직임은 상태·인과관계의 이해를 돕고, 짧고 취소 가능해야 한다. 반복 동작의 과도한 애니메이션을 피하고 reduced motion 설정을 지원. https://developer.apple.com/design/human-interface-guidelines/motion
- Material 3 Motion: 이동과 효과에 공통 모션 토큰과 빠름/기본/느림 체계를 사용. https://m3.material.io/styles/motion

## 진행

- [x] 기존 Aurora Halo 10-5 디자인 복사 및 10개 모션 이름·방향 설정
- [x] 호버·탭·팝업·화면 이동·뒤로·저장 피드백 10개 모션 조합 구현
- [x] 390·768·1440px × 10종 = 30개 조합의 Chrome 검증. `qa-results.json` 오류 0. 화면 진입·뒤로·팝업·닫기, 휴대폰 프레임, reduced motion 확인. 최초 검증에서 1번 팝업 모션 누락을 발견해 수정한 후 전수 재검증 통과.
- [x] 조합별 동작표와 실행 방법을 `README.md`에 기록
- [x] 최종 대표님 전달 준비

## 주의

모션 비교를 위한 예시 데이터다. 실제 기록·Firebase·APK 연결이 없다. 실사용 적용 시 선택된 한 조합을 모션 토큰으로 통합해야 한다.
