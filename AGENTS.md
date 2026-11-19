# 마이로그(Mylogue) 작업 지침 — 공통

Claude Code는 `CLAUDE.md`를 우선한다. 다른 AI 도구도 같은 규칙을 따른다.

작업 시작 시 `PROJECT_DIRECTION_AND_DECISIONS.md`로 대표님의 확정 결정과 제안·목업의 경계를 확인하고, 실제 구현 상태는 `README.md`, `CHANGELOG.md`, `docs/worklog/`와 코드로 확인한다.

작업 종료 전 새 결정·범위·구현·검증·배포 상태를 `PROJECT_DIRECTION_AND_DECISIONS.md`에 반영한다. 배포가 있었다면 같은 작업에서 `CHANGELOG.md`, `docs/worklog/<버전>.md`(내부), `docs/patch-notes/<버전>.md`(사용자용)를 만든다. 목업만 만들었으면 앱에 적용했다고 쓰지 않는다. 시험을 실행하지 못했으면 통과했다고 보고하지 않는다.

대표님의 최신 대화 지시가 이 문서보다 우선한다.
