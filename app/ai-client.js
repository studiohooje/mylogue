// 4.17.0 AI 서버 요청 한 곳: 사진·말 기록(parse), 주간 리뷰(review), 묻기(chat), 레시피 분해(recipe), 내 상태(me).
// - AI 서버 주소(ai-config.js)가 있으면 로그인 표와 함께 보낸다. 키는 서버에만 있다(앱에는 없음).
// - 관리자 '가짜 AI 모드'면 서버 없이 정해진 답을 준다(흐름 시험용, 비용 0).
import {aiWorkerUrl} from './ai-config.js';
import {fakeAI} from './plan.js';
import {firestoreContext} from './ai-drafts.js';

export const aiConnected = () => !!aiWorkerUrl();
export const aiUsable = () => aiConnected() || fakeAI();
const PATHS = ['parse', 'review', 'chat', 'recipe', 'me'];

export function fakeReply(path, body = {}) {
  if (path === 'me') return {plus: true, admin: true, fake: true, limits: {parse: 30, photo: 20, review: 3, chat: 20, recipe: 10}};
  if (path === 'review') return {text: '이번 주도 꾸준히 기록하셨어요. (가짜 AI 답)\n운동한 날이 이어졌고, 기록이 빠진 날이 적었어요.\n다음 주에는 저녁 단백질을 한 번 더 챙겨 봐요.', left: 2, fake: true};
  if (path === 'chat') return {text: `"${String(body.question || '').slice(0, 40)}"에 대한 가짜 AI 답이에요. 실제 연결 뒤에는 내 기록을 근거로 답해요.`, left: 19, fake: true};
  if (path === 'recipe') {
    const t = String(body.text || '');
    const found = [...t.matchAll(/([가-힣A-Za-z]+)\s*(\d+(?:\.\d+)?)\s*(g|그램|ml)/g)].slice(0, 12).map(m => ({name: m[1], g: Number(m[2]), amount: m[2] + m[3]}));
    return {recipe: {name: (t.split('\n')[0] || '가짜 레시피').slice(0, 30), servings: Number(t.match(/(\d+)\s*인분/)?.[1]) || 1, ingredients: found.length ? found : [{name: '배추김치', g: 200, amount: '2컵'}, {name: '돼지고기', g: 150, amount: '150g'}, {name: '두부', g: 150, amount: '반 모'}]}, left: 9, fake: true};
  }
  const now = body.now || '12:00', day = body.today || new Date().toISOString().slice(0, 10);
  return {text: '```json\n' + JSON.stringify({mylogue: 1, said: '가짜 AI', records: [{type: 'meal', date: day, time: now, items: [{name: '가짜 AI 비빔밥', qty: 1, unit: '그릇', kcal: 560, carbs: 85, protein: 18, fat: 14}]}]}) + '\n```', left: 29, fake: true};
}

export async function aiRequest(path, body = {}, {fetchImpl = globalThis.fetch, token = null} = {}) {
  if (!PATHS.includes(path)) throw Error('없는 AI 기능이에요.');
  if (fakeAI()) return fakeReply(path, body);
  const url = aiWorkerUrl();
  if (!url) throw Error('AI가 아직 연결되지 않았어요. 연결되면 바로 쓸 수 있어요.');
  const tok = token || await (await firestoreContext()).user.getIdToken();
  let r;
  try { r = await fetchImpl(`${url}/${path}`, {method: 'POST', headers: {authorization: `Bearer ${tok}`, 'content-type': 'application/json'}, body: JSON.stringify(body), credentials: 'omit', referrerPolicy: 'no-referrer', cache: 'no-store'}); }
  catch { throw Error('AI 서버에 연결하지 못했어요. 인터넷 연결을 확인해 주세요.'); }
  const out = await r.json().catch(() => ({}));
  if (!r.ok) { const e = Error(out.error || 'AI 처리에 실패했어요.'); e.status = r.status; throw e; }
  return out;
}
