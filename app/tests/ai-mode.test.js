// 4.29.0 'AI로 입력' 방식 고르기: 세 가지, 고른 뒤 '항상?' 묻기, 기본 저장
import test from 'node:test';
import assert from 'node:assert/strict';
import {aiPickHTML, aiModeDefault, setAiModeDefault, AI_MODES, changeModeButton} from '../ai-mode.js';

test('플러스가 아니어도 세 가지 방식을 고를 수 있고, 무료 안내가 붙는다', () => {
 const html = aiPickHTML({}, {plus: false});
 for (const m of AI_MODES) assert.match(html, new RegExp(`data-ai-mode="${m}"`));
 assert.match(html, /무료로도 하루 몇 번/);
 assert.match(html, /지시문/);
 assert.match(html, /연결/);
});
test('고른 뒤에는 항상 이 방식인지 묻는다', () => {
 const html = aiPickHTML({chosen: 'prompt'});
 assert.match(html, /data-ai-always="prompt"/);
 assert.match(html, /data-ai-once="prompt"/);
 assert.match(html, /바로 열까요/);
});
test('기본 방식 저장·지우기, 엉뚱한 값은 무시', () => {
 const mem = new Map();
 globalThis.localStorage = {getItem: k => mem.get(k) ?? null, setItem: (k, v) => mem.set(k, String(v)), removeItem: k => mem.delete(k)};
 assert.equal(aiModeDefault(), '');
 setAiModeDefault('chat'); assert.equal(aiModeDefault(), 'chat');
 assert.match(aiPickHTML({}, {current: 'chat'}), /지금 기본/);
 setAiModeDefault('evil'); assert.equal(aiModeDefault(), '');
 assert.match(changeModeButton(), /data-ai-pick/);
});
