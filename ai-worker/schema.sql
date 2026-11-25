-- 사용자별·날짜별 AI 정리 횟수(하루 한도용). 기록 내용은 저장하지 않는다.
CREATE TABLE IF NOT EXISTS usage (
  uid TEXT NOT NULL,
  day TEXT NOT NULL,
  n INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (uid, day)
);

-- 4.17.0 기능별 하루 사용 횟수(사진·리뷰·묻기·레시피). 기록 내용은 저장하지 않는다.
CREATE TABLE IF NOT EXISTS usage_feature (
  uid TEXT NOT NULL,
  day TEXT NOT NULL,
  feature TEXT NOT NULL,
  n INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (uid, day, feature)
);
-- 같은 사진 재시도 감지(사진 내용이 아니라 SHA-256 해시만, 하루 단위)
CREATE TABLE IF NOT EXISTS photo_seen (
  uid TEXT NOT NULL,
  day TEXT NOT NULL,
  hash TEXT NOT NULL,
  tries INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (uid, day, hash)
);
-- 4.29.x 같은 요청 되풀이 막기(내용은 저장하지 않고 해시·시각만, 사람별로 1분 지난 것은 지움)
CREATE TABLE IF NOT EXISTS recent_req (
  uid TEXT NOT NULL,
  hash TEXT NOT NULL,
  at INTEGER NOT NULL,
  PRIMARY KEY (uid, hash)
);
