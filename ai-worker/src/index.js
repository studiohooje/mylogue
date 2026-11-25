// Cloudflare Workers 진입점: 고른 회사의 AI·D1·fetch를 route에 연결한다.
// 비밀값(ANTHROPIC_API_KEY 또는 AI_API_KEY)은 코드·저장소에 두지 않고 `wrangler secret put …`으로만 넣는다(대표님이 직접).
// 4.29.x 어느 회사 AI를 쓸지는 wrangler.toml의 AI_PROVIDER·AI_BASE_URL·MODEL로 정한다(providers.js).
import {route} from './routes.js';
import {pickProvider, callAnthropic} from './providers.js';

// 예전 이름 호환(시험·문서)
export const callClaude = callAnthropic;

export default {
  async fetch(request, env) {
    return route(request, {env, fetchImpl: fetch, callModel: pickProvider(env, fetch)});
  },
};
