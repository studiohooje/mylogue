// 4.29.x 어느 회사 AI를 부를지 고른다(대표님 2026-11-25: Anthropic만 고집하지 말고 값싼 다른 회사도).
// AI_PROVIDER = "anthropic"(기본) | "openai-compatible"
//  - openai-compatible: OpenAI 형식 /chat/completions를 쓰는 곳 모두. 주소(AI_BASE_URL)와 모델 이름만 바꾸면 된다.
//      OpenAI            https://api.openai.com/v1/
//      Google Gemini     https://generativelanguage.googleapis.com/v1beta/openai/   (무료 등급은 보낸 내용을 Google이 제품 개선에 씀 → 건강 기록에는 유료 등급만)
//      DeepSeek          https://api.deepseek.com/                                 (중국 서버 → 국외 이전 고지·동의 확인 필요)
//    비밀값 AI_API_KEY는 `wrangler secret put AI_API_KEY`로만(대표님이 직접).
// 공통 원칙: 자동 재시도 없음(한 번 실패하면 그대로 돌려줌 → 비용이 두 배로 새지 않게), 45초 시간 제한, 답 길이 상한(maxTokens).
import Anthropic from '@anthropic-ai/sdk';
import {HttpError} from './handler.js';
import {safeNum} from './guards.js';

export const TIMEOUT_MS = 45_000;
// Fable L-5: 이 값을 지우면 SDK 기본(재시도 2번·10분)으로 돌아가 한 번 누른 것이 세 번 청구될 수 있어 시험으로 묶는다
export const ANTHROPIC_CLIENT_OPTIONS = Object.freeze({maxRetries: 0, timeout: TIMEOUT_MS});

export async function callAnthropic(env, messages, {model, system, effort = 'low', maxTokens = 1500}) {
  const client = new Anthropic({apiKey: env.ANTHROPIC_API_KEY, ...ANTHROPIC_CLIENT_OPTIONS});
  // 지시문(공통)은 캐시해 두 번째 요청부터 싸게. 사용자 내용은 그 뒤(messages)에 둔다.
  const req = {model, max_tokens: maxTokens, system: [{type: 'text', text: system, cache_control: {type: 'ephemeral'}}], messages, output_config: {effort}};
  // Sonnet 5.5는 안전 분류기 거절 시 서버 쪽 대체 모델로 이어 처리(fallbacks). Haiku 5.5에는 서버 쪽 대체가 없다.
  const response = String(model).startsWith('claude-sonnet')
    ? await client.beta.messages.create({...req, betas: ['server-side-fallback-2026-07-01'], fallbacks: 'default'})
    : await client.messages.create(req);
  const text = response.content.filter(b => b.type === 'text').map(b => b.text).join('\n');
  return {text, stopReason: response.stop_reason, model: response.model, usage: response.usage || null};
}

// 마이로그 내부 메시지(Anthropic 모양: content가 글 또는 [{type:'text'},{type:'image',source:{base64}}]) → OpenAI 모양
export function toOpenAIMessages(system, messages) {
  const out = [{role: 'system', content: system}];
  for (const m of messages) {
    if (typeof m.content === 'string') { out.push({role: m.role, content: m.content}); continue; }
    const parts = m.content.map(b => b.type === 'image'
      ? {type: 'image_url', image_url: {url: `data:${b.source.media_type};base64,${b.source.data}`}}
      : {type: 'text', text: b.text});
    // 어시스턴트 말은 글만(이미지 없음)
    out.push(m.role === 'assistant' ? {role: 'assistant', content: parts.filter(p => p.type === 'text').map(p => p.text).join('\n')} : {role: m.role, content: parts});
  }
  return out;
}
const STOP = {stop: 'end_turn', length: 'max_tokens', content_filter: 'refusal', tool_calls: 'end_turn'};

export async function callOpenAICompatible(env, messages, {model, system, maxTokens = 1500}, fetchImpl = fetch) {
  const base = String(env.AI_BASE_URL || '').trim();
  if (!/^https:\/\//.test(base)) throw new HttpError(503, 'AI 연결 설정이 아직 끝나지 않았어요.');
  const url = base.replace(/\/+$/, '') + '/chat/completions';
  const tokenField = env.AI_TOKEN_FIELD === 'max_completion_tokens' ? 'max_completion_tokens' : 'max_tokens';
  // Fable M-5: 생각하는(추론형) 모델은 보이지 않는 생각 토큰도 출력 한도·요금에 들어간다 → 노력 정도를 낮게 지정할 수 있게
  const extra = env.AI_REASONING_EFFORT ? {reasoning_effort: String(env.AI_REASONING_EFFORT)} : {};
  const ms = safeNum(env.AI_TIMEOUT_MS, TIMEOUT_MS, {allowZero: false});
  const ctl = new AbortController(), timer = setTimeout(() => ctl.abort(), ms);
  // Fable L-6: 시간 제한을 본문 읽기까지 걸고, 실패 때는 상태 코드·오류 종류만 기록(키·내용은 남기지 않음)
  let j;
  try {
    const r = await fetchImpl(url, {method: 'POST', signal: ctl.signal, headers: {authorization: `Bearer ${env.AI_API_KEY}`, 'content-type': 'application/json'},
      body: JSON.stringify({model, messages: toOpenAIMessages(system, messages), [tokenField]: maxTokens, n: 1, stream: false, ...extra})});
    if (r.status === 429) { console.error('ai-provider 429'); throw new HttpError(503, 'AI 회사 쪽이 지금 바빠요. 잠시 뒤 다시 해 주세요.'); }
    if (!r.ok) { let kind = ''; try { const e = await r.json(); kind = String(e?.error?.type || e?.error?.code || '').slice(0, 60); } catch {} console.error('ai-provider error', r.status, kind); throw new HttpError(502, 'AI 처리에 실패했어요. 잠시 뒤 다시 해 주세요.'); }
    j = await r.json();
  } catch (e) {
    if (e instanceof HttpError) throw e;
    if (e?.name === 'AbortError' || ctl.signal.aborted) throw new HttpError(504, 'AI 응답이 늦어요. 잠시 뒤 다시 해 주세요.');
    console.error('ai-provider fetch', e?.name);
    throw new HttpError(502, 'AI 서버에 연결하지 못했어요. 잠시 뒤 다시 해 주세요.');
  } finally { clearTimeout(timer); }
  const c = j?.choices?.[0];
  const content = c?.message?.content, text = Array.isArray(content) ? content.map(p => p?.text || '').join('\n') : String(content ?? '');
  const stopReason = c?.message?.refusal ? 'refusal' : (STOP[c?.finish_reason] || 'end_turn');
  if (!text.trim() && stopReason !== 'refusal') throw new HttpError(502, stopReason === 'max_tokens' ? 'AI 답이 너무 길어 끊겼어요. 나눠서 보내 주세요.' : 'AI가 빈 답을 보냈어요. 잠시 뒤 다시 해 주세요.');
  return {text, stopReason, model: j?.model || model, usage: j?.usage || null};
}

export function pickProvider(env, fetchImpl = fetch) {
  const p = String(env.AI_PROVIDER || 'anthropic').trim().toLowerCase();
  if (p === 'openai-compatible' || p === 'openai' || p === 'gemini' || p === 'deepseek') return (messages, opts) => callOpenAICompatible(env, messages, opts, fetchImpl);
  if (p === 'anthropic') return (messages, opts) => callAnthropic(env, messages, opts);
  // Fable L-6: 오타면 말없이 다른 회사로 가지 않고 멈춘다
  return async () => { throw new HttpError(503, 'AI 연결 설정이 올바르지 않아요.'); };
}
