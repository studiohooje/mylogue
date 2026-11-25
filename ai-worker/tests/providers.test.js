// 4.29.x 다른 회사 AI(OpenAI 형식) 연결: 메시지 변환, 사진, 답 길이 상한, 재시도 없음, 멈춤 이유
import test from 'node:test';
import assert from 'node:assert/strict';
import {toOpenAIMessages, callOpenAICompatible, pickProvider} from '../src/providers.js';

test('메시지 변환: 지시문은 system, 사진은 data URL, 어시스턴트는 글만', () => {
 const out = toOpenAIMessages('규칙', [
  {role: 'user', content: '점심'},
  {role: 'assistant', content: [{type: 'text', text: '기록할까요?'}]},
  {role: 'user', content: [{type: 'image', source: {type: 'base64', media_type: 'image/jpeg', data: 'QUJD'}}, {type: 'text', text: '체중계'}]},
 ]);
 assert.deepEqual(out[0], {role: 'system', content: '규칙'});
 assert.equal(out[2].content, '기록할까요?');
 assert.equal(out[3].content[0].image_url.url, 'data:image/jpeg;base64,QUJD');
 assert.equal(out[3].content[1].text, '체중계');
});
test('OpenAI 형식 호출: 주소·키·모델·답 길이 상한을 보내고 한 번만 부른다', async () => {
 const sent = [];
 const fetchImpl = async (url, init) => { sent.push({url, init}); return new Response(JSON.stringify({model: 'gemini-x', choices: [{finish_reason: 'length', message: {content: '```json\n{}\n```'}}]})); };
 const r = await callOpenAICompatible({AI_BASE_URL: 'https://generativelanguage.googleapis.com/v1beta/openai/', AI_API_KEY: 'k'}, [{role: 'user', content: '점심'}], {model: 'gemini-x', system: 's', maxTokens: 800}, fetchImpl);
 assert.equal(sent.length, 1);
 assert.equal(sent[0].url, 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions');
 const body = JSON.parse(sent[0].init.body);
 assert.equal(body.max_tokens, 800); assert.equal(body.model, 'gemini-x'); assert.equal(body.stream, false);
 assert.equal(sent[0].init.headers.authorization, 'Bearer k');
 assert.equal(r.stopReason, 'max_tokens');
});
test('OpenAI 형식: 실패해도 다시 부르지 않고, 429는 안내 문구로', async () => {
 let n = 0; const env = {AI_BASE_URL: 'https://api.example.com/v1', AI_API_KEY: 'k'};
 await assert.rejects(() => callOpenAICompatible(env, [{role: 'user', content: 'x'}], {model: 'm', system: 's'}, async () => { n++; return new Response('{}', {status: 500}); }), e => e.status === 502);
 await assert.rejects(() => callOpenAICompatible(env, [{role: 'user', content: 'x'}], {model: 'm', system: 's'}, async () => { n++; return new Response('{}', {status: 429}); }), e => e.status === 503);
 assert.equal(n, 2);
 await assert.rejects(() => callOpenAICompatible({AI_BASE_URL: 'http://insecure'}, [], {model: 'm', system: 's'}, async () => { throw Error('no'); }), e => e.status === 503);
});
test('회사 고르기: 기본은 Anthropic, gemini·openai·deepseek은 OpenAI 형식', async () => {
 let hit = 0; const f = async () => { hit++; return new Response(JSON.stringify({choices: [{finish_reason: 'stop', message: {content: 'ok'}}]})); };
 const call = pickProvider({AI_PROVIDER: 'gemini', AI_BASE_URL: 'https://g.example/', AI_API_KEY: 'k'}, f);
 assert.equal((await call([{role: 'user', content: 'x'}], {model: 'm', system: 's'})).text, 'ok');
 assert.equal(hit, 1);
});
