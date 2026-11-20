// Cloudflare Workers 진입점: 실제 Claude SDK·D1·fetch를 handler에 연결한다.
// 비밀값 ANTHROPIC_API_KEY는 코드·저장소에 두지 않고 `wrangler secret put ANTHROPIC_API_KEY`로만 넣는다.
import Anthropic from '@anthropic-ai/sdk';
import {handle} from './handler.js';

export async function callClaude(env, messages, {model, system}){
 const client = new Anthropic({apiKey:env.ANTHROPIC_API_KEY, maxRetries:1, timeout:60_000});
 // 기록 정리는 단순 추출이라 effort low. 안전 분류기 거절 시 서버 쪽 대체 모델로 이어서 처리(fallbacks).
 const response = await client.beta.messages.create({
  model,
  max_tokens:8000,
  system,
  messages,
  output_config:{effort:'low'},
  betas:['server-side-fallback-2026-07-01'],
  fallbacks:'default',
 });
 const text = response.content.filter(b => b.type==='text').map(b => b.text).join('\n');
 return {text, stopReason:response.stop_reason, model:response.model};
}

export default {
 async fetch(request, env){
  return handle(request, {env, fetchImpl:fetch, callClaude:(messages, opts) => callClaude(env, messages, opts)});
 },
};
