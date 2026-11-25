import test from 'node:test';
import assert from 'node:assert/strict';
import {aiInputHTML, AI_PROMPT} from '../ai-paste.js';
import {AI_PROMPT as SHARED} from '../ai-prompt.js';
import {AI_WORKER_URL, aiWorkerUrl} from '../ai-config.js';

test('지시문은 앱과 AI 서버가 같은 파일을 쓴다', () => {
 assert.equal(AI_PROMPT, SHARED);
});

test('AI 서버가 없으면 붙여넣기만, 있으면 말로 입력이 맨 위·붙여넣기는 접어 둔다', () => {
 const off = aiInputHTML({}, {ready:true});
 assert.doesNotMatch(off, /id="ai-ask"/);
 assert.match(off, /id="ai-code"/);
 const on = aiInputHTML({say:'점심 제육덮밥', photos:['x'], left:29}, {ready:true, server:true});
 assert.ok(on.indexOf('id="ai-ask"') < on.indexOf('id="ai-code"'));
 assert.match(on, /<details class="ai-in-alt"/);
 assert.match(on, /사진 1장/);
 assert.match(on, /29번 남았어요/);
 assert.ok(on.indexOf('id="ai-in-preview"') > on.indexOf('</details>\n'), '미리보기는 접힌 칸 밖');
 assert.match(aiInputHTML({asking:true}, {ready:true, server:true}), /AI가 정리하는 중…[\s\S]*/);
 assert.match(aiInputHTML({}, {ready:false, server:true}), /id="ai-ask" disabled/);
});

test('4.29.2 AI 서버 주소: Cloudflare workers.dev(https)', () => {
 assert.match(AI_WORKER_URL, /^https:\/\/mylogue-ai\.[a-z0-9-]+\.workers\.dev$/);
 assert.equal(aiWorkerUrl(), AI_WORKER_URL);
});
