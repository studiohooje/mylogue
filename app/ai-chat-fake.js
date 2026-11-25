// 4.28.x 'AI 기록' 대화의 예시 답(둘러보기·가짜 AI 모드). 실제 AI 없이 화면 흐름을 시험한다.
// 질문이면 글 답, '제로였어'·'반 공기' 같은 고치기면 앞 기록을 고쳐 다시, 사진이면 포장지·체중계 예시, 말이면 적은 음식 예시.
const FENCE = '`'.repeat(3);
const code = (said, recs) => `${FENCE}json\n${JSON.stringify({mylogue: 1, said: String(said).slice(0, 200), records: recs})}\n${FENCE}`;
const QUESTION = /\?|？|뭐 ?먹|어땠|어때|할까|추천|알려/;
export function fakeConverse(body = {}, demoItems = () => []) {
 const msgs = body.messages || [], last = String(msgs.at(-1)?.text || ''), day = body.today || new Date().toISOString().slice(0, 10), now = body.now || '12:00';
 const photos = (body.images || []).length;
 if (!photos && QUESTION.test(last)) return {text: '오늘 남은 건 약 660kcal · 단백질 48g이에요. 점심이 탄수화물 위주였으니 저녁은 단백질 많은 쪽이 좋아요. 예를 들어 닭가슴살 샐러드에 고구마 1개, 또는 연어구이에 잡곡밥 반 공기요. (둘러보기 예시 답이에요)', left: 17, fake: true};
 const prev = [...msgs].reverse().find(m => m.role === 'assistant' && m.text.includes(FENCE));
 if (prev && /제로|다이어트|반 ?공기|반만/.test(last)) {
  try {
   const body2 = prev.text.split(FENCE)[1].replace(/^[a-z]*\s*/, '');
   const j = JSON.parse(body2);
   for (const r of j.records || []) for (const it of r.items || []) {
    if (/제로|다이어트/.test(last) && /콜라(?!비)|사이다|펩시|스프라이트/.test(it.name) && !/제로/.test(it.name)) { it.name = `${it.name} 제로`; it.kcal = 0; it.carbs = 0; it.fat = 0; it.protein = 0; delete it.estimate; }
    if (/반 ?공기|반만/.test(last) && /밥/.test(it.name)) { it.qty = 0.5; for (const k of ['kcal', 'carbs', 'protein', 'fat']) if (it[k] != null) it[k] = Math.round(it[k] / 2); }
   }
   return {text: `말씀대로 고쳤어요.\n${code(last, j.records)}`, left: 16, fake: true};
  } catch { /* 아래로 */ }
 }
 if (photos) {
  if (/체중|몸무게|인바디/.test(last) || !last.trim()) return {text: `체중계 숫자를 84.0kg으로 읽었어요. 맞나요? (둘러보기 예시)\n${code(last, [{type: 'body', date: day, weight: 84.0}])}`, left: 0, fake: true};
  return {text: `포장지 두 개가 보여요. 제품 이름과 중량을 읽었어요. (둘러보기 예시)\n${code(last, [{type: 'meal', date: day, time: now, items: [
   {name: '훈제 닭가슴살 · 포장 제품', qty: 1, unit: '팩', grams: 100, kcal: 115, carbs: 2, protein: 23, fat: 1.5},
   {name: '샐러드 주스', qty: 1, unit: '팩', grams: 160, kcal: 60, carbs: 14, protein: 1, fat: 0, estimate: {kcal: [50, 80], basis: '포장지 일부만 보임'}},
  ]}])}`, left: 0, fake: true};
 }
 const items = demoItems(last);
 return {text: `이렇게 기록할까요? (둘러보기 예시)\n${code(last, [{type: 'meal', date: day, time: now, items}])}`, left: 17, fake: true};
}
