-- 사용자별·날짜별 AI 정리 횟수(하루 한도용). 기록 내용은 저장하지 않는다.
CREATE TABLE IF NOT EXISTS usage (
  uid TEXT NOT NULL,
  day TEXT NOT NULL,
  n INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (uid, day)
);
