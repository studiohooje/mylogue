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

export const TIMEOUT_MS = 45_000;

export async function callAnthropic(env, messages, {model, system, effort = 'low', maxTokens = 1500}) {
  const client = new Anthropic({apiKey: env.ANTHROPIC_API_KEY, maxRetries: 0, timeout: TIMEOUT_MS});
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
  const ctl = new AbortController(), timer = setTimeout(() => ctl.abort(), TIMEOUT_MS);
  let r;
  try {
    r = await fetchImpl(url, {method: 'POST', signal: ctl.signal, headers: {authorization: `Bearer ${env.AI_API_KEY}`, 'content-type': 'application/json'},
      body: JSON.stringify({model, messages: toOpenAIMessages(system, messages), [tokenField]: maxTokens, n: 1, stream: false})});
  } catch (e) { throw new HttpError(504, 'AI 응답이 늦어요. 잠시 뒤 다시 해 주세요.'); }
  finally { clearTimeout(timer); }
  if (r.status === 429) throw new HttpError(503, 'AI 회사 쪽이 지금 바빠요. 잠시 뒤 다시 해 주세요.');
  if (!r.ok) throw new HttpError(502, 'AI 처리에 실패했어요. 잠시 뒤 다시 해 주세요.');
  const j = await r.json(), c = j?.choices?.[0];
  const content = c?.message?.content, text = Array.isArray(content) ? content.map(p => p?.text || '').join('\n') : String(content ?? '');
  return {text, stopReason: c?.message?.refusal ? 'refusal' : (STOP[c?.finish_reason] || 'end_turn'), model: j?.model || model, usage: j?.usage || null};
}

export function pickProvider(env, fetchImpl = fetch) {
  const p = String(env.AI_PROVIDER || 'anthropic').toLowerCase();
  if (p === 'openai-compatible' || p === 'openai' || p === 'gemini' || p === 'deepseek') return (messages, opts) => callOpenAICompatible(env, messages, opts, fetchImpl);
  return (messages, opts) => callAnthropic(env, messages, opts);
}
