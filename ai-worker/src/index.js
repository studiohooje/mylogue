// Cloudflare Workers 진입점: 실제 Claude SDK·D1·fetch를 route에 연결한다.
// 비밀값 ANTHROPIC_API_KEY는 코드·저장소에 두지 않고 `wrangler secret put ANTHROPIC_API_KEY`로만 넣는다(대표님이 직접).
// 4.17.0 모델: 기본 Claude Haiku 5.5(값싸고 빠름), 주간 리뷰 Claude Sonnet 5.5. 지시문은 프롬프트 캐시로 재사용.
import Anthropic from '@anthropic-ai/sdk';
import {route} from './routes.js';

export async function callClaude(env, messages, {model, system, effort = 'low'}) {
  const client = new Anthropic({apiKey: env.ANTHROPIC_API_KEY, maxRetries: 1, timeout: 60_000});
  // 지시문(공통)은 캐시해 두 번째 요청부터 싸게. 사용자 내용은 그 뒤(messages)에 둔다.
  const req = {model, max_tokens: 4000, system: [{type: 'text', text: system, cache_control: {type: 'ephemeral'}}], messages, output_config: {effort}};
  // Sonnet 5.5는 안전 분류기 거절 시 서버 쪽 대체 모델로 이어 처리(fallbacks). Haiku 5.5에는 서버 쪽 대체가 없다.
  const response = model.startsWith('claude-sonnet')
    ? await client.beta.messages.create({...req, betas: ['server-side-fallback-2026-07-01'], fallbacks: 'default'})
    : await client.messages.create(req);
  const text = response.content.filter(b => b.type === 'text').map(b => b.text).join('\n');
  return {text, stopReason: response.stop_reason, model: response.model};
}

export default {
  async fetch(request, env) {
    return route(request, {env, fetchImpl: fetch, callClaude: (messages, opts) => callClaude(env, messages, opts)});
  },
};
