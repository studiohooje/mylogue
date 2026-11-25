import test from 'node:test';
import assert from 'node:assert/strict';

// 4.17.0 플러스 판단·관리자 보기 전환·가짜 AI·레시피 매칭·주간 요약
const mem = new Map();
globalThis.localStorage = {getItem: k => mem.has(k) ? mem.get(k) : null, setItem: (k, v) => mem.set(k, String(v)), removeItem: k => mem.delete(k)};
const {cloudState} = await import('../cloud-sync.js');
const plan = await import('../plan.js');
const {aiRequest, fakeReply, aiUsable} = await import('../ai-client.js');
const {matchRecipe, perGram, recipeFoodPreset, weekSummaryText, chatContext, aiCoachCardHTML} = await import('../ai-coach-ui.js');
const {ADMIN_EMAILS} = await import('../admin.js');
const esc = s => String(s).replace(/[&<>"']/g, c => `&#${c.charCodeAt(0)};`);

test('일반 사용자: 승인 전 무료, 승인 후 베타 플러스, 계정 plan 반영', () => {
  cloudState.user = {uid: 'u1', email: 'a@x.test', emailVerified: true}; cloudState.approval = 'pending'; cloudState.plan = 'free';
  assert.equal(plan.planOf(), 'free'); assert.equal(plan.can('ai-chat'), false); assert.equal(plan.allowance('discovery'), 2);
  cloudState.approval = 'approved';
  assert.equal(plan.planOf(), plan.BETA_ALL_PLUS ? 'plus' : 'free');
  // 일반 사용자는 관리자 보기 전환이 안 먹는다
  plan.setAdminView('free'); assert.equal(plan.adminView(), null);
  plan.setFakeAI(true); assert.equal(plan.fakeAI(), false);
});
test('슈퍼관리자: 기본 플러스, 일반 보기로 바꾸면 기능도 무료 기준', () => {
  cloudState.user = {uid: 'admin-x', email: ADMIN_EMAILS[0], emailVerified: true}; cloudState.approval = 'approved';
  assert.equal(plan.isSuperAdmin(), true); assert.equal(plan.planOf(), 'plus');
  plan.setAdminView('free'); assert.equal(plan.planOf(), 'free'); assert.equal(plan.can('ai-review'), false);
  assert.match(aiCoachCardHTML({}, esc), /프리미엄에서 쓸 수 있어요/);
  plan.setAdminView('plus'); assert.equal(plan.isPlus(), true); assert.equal(plan.allowance('ai-chat'), 10);
  assert.match(plan.adminPlanCardHTML(esc), /data-plan-view="free"/);
});
test('가짜 AI 모드: 서버를 부르지 않고 기능별 답(4.29.2 서버 연결 뒤에도)', async () => {
  plan.setFakeAI(false); assert.equal(aiUsable(), true, '서버 주소가 있으면 쓸 수 있음');
  plan.setFakeAI(true); assert.equal(aiUsable(), true);
  assert.match((await aiRequest('chat', {question: '단백질?'})).text, /가짜 AI/);
  assert.match((await aiRequest('review', {summary: 'x'})).text, /예시 답/);
  const rc = await aiRequest('recipe', {text: '된장찌개 2인분\n두부 150g\n애호박 100g'});
  assert.equal(rc.recipe.servings, 2); assert.equal(rc.recipe.ingredients.length, 2);
  assert.match((await aiRequest('parse', {today: '2026-11-23', now: '12:30'})).text, /2026-11-23/);
  assert.equal((await aiRequest('me')).fake, true);
  await assert.rejects(aiRequest('nope'), /없는 AI 기능/);
  assert.match(aiCoachCardHTML({review: '좋아요<script>'}, esc), /좋아요&#60;script&#62;/);
  plan.setFakeAI(false);
});
test('실서버 요청: 표와 경로, 오류 문구 전달', async () => {
  globalThis.location = {hostname: 'localhost'}; mem.set('mylogue.aiWorkerUrl', 'https://ai.example/');
  const seen = [];
  const ok = await aiRequest('chat', {question: 'q'}, {token: 't1', fetchImpl: async (url, o) => { seen.push([url, o.headers.authorization, JSON.parse(o.body)]); return new Response(JSON.stringify({text: 'a', left: 3})); }});
  assert.deepEqual(seen[0], ['https://ai.example/chat', 'Bearer t1', {question: 'q'}]); assert.equal(ok.left, 3);
  await assert.rejects(aiRequest('review', {}, {token: 't', fetchImpl: async () => new Response(JSON.stringify({error: 'AI 주간 리뷰은 플러스에서 쓸 수 있어요.'}), {status: 402})}), e => e.status === 402 && /플러스/.test(e.message));
  mem.delete('mylogue.aiWorkerUrl'); delete globalThis.location;
});
test('레시피 매칭: g당 영양으로 1인분 계산, 못 찾은 재료 표시', () => {
  const DB = {두부: {name: '두부', servingQty: 100, servingUnit: 'g', calories: 80, carbs: 2, protein: 9, fat: 4}, 달걀: {name: '달걀', servingQty: 1, servingUnit: '개', unitGrams: 50, calories: 70, carbs: 0.5, protein: 6, fat: 5}};
  assert.equal(perGram(DB.두부).calories, 0.8); assert.equal(perGram(DB.달걀).calories, 1.4); assert.equal(perGram({servingUnit: '개', servingQty: 1, calories: 1}), null);
  const m = matchRecipe({name: '두부달걀', servings: 2, ingredients: [{name: '두부', g: 300}, {name: '달걀', g: 100}, {name: '비법소스', g: 20}]}, n => DB[n] ? [DB[n]] : []);
  assert.equal(m.matched, 2); assert.equal(m.rows[2].matched, false);
  assert.equal(m.perServing.calories, 190); assert.equal(m.perServing.grams, 200);
  const preset = recipeFoodPreset(m); assert.equal(preset.servingUnit, '인분'); assert.equal(preset.unitGrams, 200); assert.equal(preset.calories, 190);
});
test('주간 요약: 계획된 기록은 빼고 숫자는 앱이 계산', () => {
  const db = {settings: {calorieGoal: 1800}, meals: [{date: '2026-11-20', name: '비빔밥', calories: 600, protein: 20, carbs: 90, fat: 15}, {date: '2026-11-21', name: '샐러드', calories: 400, protein: 30, carbs: 20, fat: 20}, {date: '2026-11-23', name: '계획', calories: 999, planned: true}], workouts: [{date: '2026-11-22', exercises: [{name: '스쿼트'}]}, {date: '2026-11-24', planned: true, exercises: [{name: '벤치'}]}], body: [{date: '2026-11-18', weight: 70}, {date: '2026-11-23', weight: 69.4}]};
  const s = weekSummaryText(db, '2026-11-23');
  assert.match(s, /식사 기록한 날: 2일, 기록한 날 하루 평균 500kcal · 단백질 25g/);
  assert.match(s, /운동한 날: 1일\(1회\), 종목: 스쿼트/); assert.match(s, /70kg → 69.4kg \(-0.6kg\)/); assert.match(s, /1800kcal/);
  assert.ok(s.length >= 20);
  assert.match(chatContext(db, '2026-11-21'), /2026-11-21: 샐러드 \(약 400kcal\)/);
});
test('fakeReply parse는 마이로그 코드 형식', () => { assert.match(fakeReply('parse', {}).text, /"mylogue":1/); });
test('사진 예시 답: 양이 애매한 음식을 짚어 줌', async () => {
  const {uncertainItems, uncertainHTML} = await import('../ai-paste.js');
  const r = fakeReply('parse', {images: [{data: 'x'}], today: '2026-11-23', now: '12:00'});
  const u = uncertainItems(r.text);
  assert.equal(u.length, 1); assert.equal(u[0].name, '비빔밥');
  assert.match(uncertainHTML(r.text), /양을 확인해 주세요/);
  assert.equal(uncertainHTML(fakeReply('parse', {}).text), '');
});

// 4.29.x Fable L-5: aiRequest가 실제로 호출 방지 장치를 거친다(같은 요청 동시 두 번 → 서버 1번, 바로 이어 다른 요청 → 간격으로 막힘)
test('실서버 요청은 호출 방지 장치를 거친다', async () => {
  const {setAIGuardForTest} = await import('../ai-client.js');
  const {createAIGuard} = await import('../ai-guard.js');
  let t = 5_000_000; const store = new Map();
  setAIGuardForTest(createAIGuard({now: () => t, storage: {getItem: k => store.get(k) ?? null, setItem: (k, v) => store.set(k, v), removeItem: k => store.delete(k)}}));
  globalThis.location = {hostname: 'localhost'}; mem.set('mylogue.aiWorkerUrl', 'https://ai.example/');
  let hits = 0, release;
  const fetchImpl = async () => { hits++; await new Promise(r => { release = r; }); return new Response(JSON.stringify({text: 'a'}), {status: 200}); };
  const a = aiRequest('chat', {question: '같은 질문'}, {token: 't', fetchImpl}), b = aiRequest('chat', {question: '같은 질문'}, {token: 't', fetchImpl});
  await new Promise(r => setTimeout(r, 0)); release();
  assert.deepEqual(await a, await b); assert.equal(hits, 1);
  await assert.rejects(aiRequest('chat', {question: '다른 질문'}, {token: 't', fetchImpl}), e => e.guard === 'gap');
  t += 2000;
  const c = aiRequest('chat', {question: '다른 질문'}, {token: 't', fetchImpl}); await new Promise(r => setTimeout(r, 0)); release(); await c;
  assert.equal(hits, 2);
  setAIGuardForTest(null); mem.delete('mylogue.aiWorkerUrl'); delete globalThis.location;
});
