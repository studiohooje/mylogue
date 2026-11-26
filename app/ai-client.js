// 4.17.0 AI 서버 요청 한 곳: 사진·말 기록(parse), 주간 리뷰(review), 묻기(chat), 레시피 분해(recipe), 내 상태(me).
// - AI 서버 주소(ai-config.js)가 있으면 로그인 표와 함께 보낸다. 키는 서버에만 있다(앱에는 없음).
// - 관리자 '가짜 AI 모드'면 서버 없이 정해진 답을 준다(흐름 시험용, 비용 0).
import {aiWorkerUrl} from './ai-config.js';
import {fakeConverse} from './ai-chat-fake.js';
import {createAIGuard, requestKey} from './ai-guard.js';
import {fakeAI, isDemo, adminView} from './plan.js';
import {firestoreContext} from './ai-drafts.js';
import {searchFoodDB, foodDBReady} from './food-db.js';

// 4.27.0 전수검사 M-01: 둘러보기에서 무엇을 적든 '가짜 AI 비빔밥'이 나오던 것.
// 적은 말에서 음식 이름을 골라 음식 DB 값으로 채운다(예시임은 답에 적는다). 못 찾으면 이름만 두고 값은 비운다(0으로 채우지 않음).
const DEMO_SPLIT = /[,，、\n]|그리고|하고 |이랑|랑 |먹고 |마시고 /;
const DEMO_TAIL = /\s*(을|를|이|가|도|은|는)?\s*(먹었|먹음|마셨|마심|했|조금|많이|반\s|한\s|두\s|세\s).*$/;
const DEMO_QTY = /[0-9.]+\s*(g|그램|개|팩|봉지|봉|그릇|공기|잔|캔|인분|ml)?/g;
// 4.27.0 재검사 N-9: 운동·체중 문장은 음식으로 만들지 않는다
const DEMO_NOT_FOOD = /kg|킬로|체중|몸무게|인바디|체지방|골격근|운동|스쿼트|벤치|데드|프레스|런지|풀업|푸시업|플랭크|러닝|달리|조깅|걷|산책|자전거|수영|필라테스|요가|세트|헬스/;
const DEMO_WHEN = /^(오늘|어제)?\s*(아침|점심|저녁|간식|야식)?(에|으로|은|는)?\s*/;
export function demoItems(text = ''){
 const parts = String(text).split(DEMO_SPLIT).map(w => w.replace(DEMO_WHEN, '').replace(DEMO_TAIL, '').replace(DEMO_QTY, '').trim()).filter(w => w.length >= 1 && w.length <= 20 && !DEMO_NOT_FOOD.test(w)).slice(0, 4);
 const items = parts.map(w => {
  const f = foodDBReady() ? (searchFoodDB(w, {limit: 1}) || [])[0] : null;
  if (!f || f.calories == null) return {name: `${w}(예시)`, qty: 1, unit: '회', kcal: null, carbs: null, protein: null, fat: null};
  const mass = f.servingUnit === 'g' || f.servingUnit === 'ml';
  return {name: f.name, qty: mass ? 100 : 1, unit: f.servingUnit, ...(f.unitGrams ? {grams: f.unitGrams} : {}), kcal: f.calories, carbs: f.carbs, protein: f.protein, fat: f.fat, estimate: {kcal: [Math.round(f.calories * 0.8), Math.round(f.calories * 1.2)], basis: '둘러보기 예시: 음식 DB 값'}};
 });
 return items.length ? items : [{name: '예시 음식', qty: 1, unit: '회', kcal: null, carbs: null, protein: null, fat: null}];
}

export const aiConnected = () => !!aiWorkerUrl();
export const aiUsable = () => aiConnected() || fakeAI() || isDemo();
const PATHS = ['parse', 'review', 'chat', 'recipe', 'converse', 'me', 'insight', 'machine'];

export function fakeReply(path, body = {}) {
  if (path === 'converse') return fakeConverse(body, demoItems);
  if (path === 'me') return {plus: true, admin: true, fake: true, limits: {parse: 30, photo: 20, review: 1, chat: 10, recipe: 10}, month: null};
  if (path === 'review') {
    // 예시 리뷰: 앱이 보낸 요약 숫자로만 만든다(둘러보기·가짜 AI 모드). 요약이 없으면 짧은 기본 문장.
    const sum = String(body.summary || ''), num = re => Number((sum.match(re) || [])[1] || 0);
    const wd = num(/운동한 날: (\d+)일/), md = num(/식사 기록한 날: (\d+)일/), kc = num(/하루 평균 (\d+)kcal/), pr = num(/단백질 (\d+)g/), wch = (sum.match(/\(([+-]?[\d.]+)kg\)/) || [])[1];
    const lines = [wd ? `이번 주 ${wd}일 움직였어요. ${wd >= 3 ? '리듬이 잘 잡혀 있어요.' : '한 번만 더 움직이면 리듬이 생겨요.'}` : '이번 주도 꾸준히 기록하셨어요.'];
    if (md) lines.push(`식사는 ${md}일 기록했고, 기록한 날 평균 ${kc ? `${kc.toLocaleString('ko-KR')}kcal` : '—'}${pr ? ` · 단백질 ${pr}g` : ''}이에요.`);
    if (wch) lines.push(`체중은 한 주 동안 ${wch}kg 달라졌어요. 하루하루보다 이 흐름을 봐 주세요.`);
    lines.push(pr && pr < 100 ? '다음 주에는 한 끼에 단백질 반찬 하나를 더해 봐요.' : '다음 주도 지금 리듬 그대로 이어 가요.');
    return {text: lines.join('\n') + '\n(예시 답이에요. 실제 연결 뒤에는 AI가 써요.)', left: 2, fake: true};
  }
  if (path === 'machine') return {machine: {name: '시티드 로우 머신', aka: ['로우 머신'], brand: '', muscles: ['광배근', '능형근', '이두'], exercises: ['시티드 로우 머신', '시티드 케이블 로우'], how: ['가슴 패드에 가슴을 대고 허리를 곧게 세워요.', '팔이 아니라 등으로 당긴다는 느낌으로 견갑을 모아요.', '돌아갈 때 무게를 천천히 버텨요.'], confidence: 'medium', note: '둘러보기 예시 답이에요.'}, left: 19, fake: true};
  if (path === 'insight') return {insight: {headline: '오늘도 기록을 이어 가고 있어요 (예시 답)', meal: {title: '저녁 · 단백질 채우기', items: ['닭가슴살 150g', '현미밥 ½공기', '구운 채소'], note: '남은 단백질을 한 끼로 채우면 회복에 좋아요.'}, workout: {title: '다음 운동 · 등·이두', plan: [['랫풀다운', '4 × 10'], ['시티드 케이블 로우', '3 × 12'], ['바벨 컬', '3 × 10']], note: '하체는 아직 회복 중이라 오늘은 상체를 권해요.'}, week: ['이번 주 3번 움직였어요. 리듬이 잘 잡혀 있어요.'], weight: ['7일 평균이 조금 내려왔어요. 하루하루보다 흐름을 봐 주세요.']}, left: 2, fake: true};
  if (path === 'chat') return {text: `"${String(body.question || '').slice(0, 40)}"에 대한 가짜 AI 답이에요. 실제 연결 뒤에는 내 기록을 근거로 답해요.`, left: 19, fake: true};
  if (path === 'recipe') {
    const t = String(body.text || '');
    const found = [...t.matchAll(/([가-힣A-Za-z]+)\s*(\d+(?:\.\d+)?)\s*(g|그램|ml)/g)].slice(0, 12).map(m => ({name: m[1], g: Number(m[2]), amount: m[2] + m[3]}));
    return {recipe: {name: (t.split('\n')[0] || '가짜 레시피').slice(0, 30), servings: Number(t.match(/(\d+)\s*인분/)?.[1]) || 1, ingredients: found.length ? found : [{name: '배추김치', g: 200, amount: '2컵'}, {name: '돼지고기', g: 150, amount: '150g'}, {name: '두부', g: 150, amount: '반 모'}]}, left: 9, fake: true};
  }
  const now = body.now || '12:00', day = body.today || new Date().toISOString().slice(0, 10);
  // 사진이 있으면 사진 예시(양이 애매한 음식은 추정 범위를 넓게), 없으면 말 예시
  const items = (body.images || []).length
    ? [{name: '비빔밥', qty: 1, unit: '그릇', kcal: 620, carbs: 92, protein: 21, fat: 17, estimate: {kcal: [450, 850], basis: '사진 예시: 그릇 크기로 추정'}}, {name: '된장국', qty: 1, unit: '그릇', kcal: 80, carbs: 8, protein: 6, fat: 3, estimate: {kcal: [70, 100], basis: '사진 예시'}}]
    : demoItems(body.text);
  return {text: '```json\n' + JSON.stringify({mylogue: 1, said: String(body.text || '둘러보기 예시').slice(0, 200), records: [{type: 'meal', date: day, time: now, items}]}) + '\n```\n둘러보기 예시예요. 실제 AI 대신 적은 말에서 음식 이름을 골라 음식 DB 값으로 채웠어요.', left: 29, fake: true};
}

export async function aiRequest(path, body = {}, {fetchImpl = globalThis.fetch, token = null} = {}) {
  if (!PATHS.includes(path)) throw Error('없는 AI 기능이에요.');
  if (fakeAI() || isDemo()) return fakeReply(path, body);
  // 슈퍼관리자 '보기 기준'(일반/플러스)을 서버에도 알린다. 서버는 일반으로 낮추는 것만 받아들인다.
  if (adminView() === 'free') body = {...body, viewPlan: 'free'};
  const url = aiWorkerUrl();
  if (!url) throw Error('AI가 아직 연결되지 않았어요. 연결되면 바로 쓸 수 있어요.');
  // 4.29.x 불필요한 호출 막기(ai-guard.js): 같은 요청 진행 중이면 그 답을 같이 기다리고, 연타·반복·연속 실패면 부르지 않는다. 자동 재시도 없음.
  return aiGuard().run(path, requestKey(path, body), async () => {
    const tok = token || await (await firestoreContext()).user.getIdToken();
    let r;
    try { r = await fetchImpl(`${url}/${path}`, {method: 'POST', headers: {authorization: `Bearer ${tok}`, 'content-type': 'application/json'}, body: JSON.stringify(body), credentials: 'omit', referrerPolicy: 'no-referrer', cache: 'no-store'}); }
    catch { throw Error('AI 서버에 연결하지 못했어요. 인터넷 연결을 확인해 주세요.'); }
    const out = await r.json().catch(() => ({}));
    if (!r.ok) { const e = Error(out.error || 'AI 처리에 실패했어요.'); e.status = r.status; throw e; }
    return out;
  });
}
let guardInst = null;
export const aiGuard = () => (guardInst ||= createAIGuard());
export const setAIGuardForTest = g => { guardInst = g; };
