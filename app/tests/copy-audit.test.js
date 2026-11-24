import test from 'node:test';
import assert from 'node:assert/strict';
import {auditApp, auditText} from '../tools/copy-audit.mjs';
// 4.28.0 밤샘 C-3: 화면 문구 말투 검사(비난·진단·예측·단정·운동 점수·대분류)
test('앱 화면 문구 전체: 말투 규칙에 걸리는 문장 0', () => {
 const r = auditApp();
 assert.ok(r.strings > 5000);
 assert.deepEqual(r.hits.map(h => `${h.file}:${h.line} ${h.rule} ${h.text}`), []);
});
test('검사기가 실제로 잡는다(지난 검사에서 나온 종류)', () => {
 for (const s of ['어제도 또 안 하셨네요.', '이대로면 4주 뒤 3kg 빠질 거예요.', '반드시 탄수화물을 줄여야 해요.', '오늘 운동 점수는 80점이에요.', '대분류를 고르세요.', '섭식장애 증상이에요.'])
  assert.ok(auditText(s).length > 0, s);
 for (const s of ['데이터 저장에 실패했어요.', '돼지고기 김치찌개', '마이로그는 진단·처방을 하지 않아요.', '힘들면 전문가와 이야기해 보세요(정신건강 위기상담 109).'])
  assert.deepEqual(auditText(s), [], s);
});
