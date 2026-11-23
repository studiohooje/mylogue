import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {deriveKey,proof,newCode,validCode,showCode,sameHex} from '../bridge-proof.js';

test('앱과 연결 도구는 같은 증명 코드를 쓴다', () => {
 assert.equal(readFileSync(new URL('../bridge-proof.js',import.meta.url),'utf8'),readFileSync(new URL('../../agent-bridge/bridge-proof.mjs',import.meta.url),'utf8'));
});
test('연결 코드: 10자, 헷갈리는 글자 없음, 같은 코드는 같은 증명', async () => {
 const c=newCode();assert.ok(validCode(c));assert.doesNotMatch(c,/[01ILO]/);
 assert.match(showCode(c),/^[A-Z2-9]{5}-[A-Z2-9]{5}$/);
 assert.ok(validCode(showCode(c).toLowerCase()));
 const k=await deriveKey(c);assert.equal(k.length,64);
 assert.ok(sameHex(await proof(k,'info','a'.repeat(32)),await proof(await deriveKey(c),'info','a'.repeat(32))));
 assert.ok(!sameHex(await proof(k,'info','a'.repeat(32)),await proof(k,'pair','a'.repeat(32))));
 await assert.rejects(()=>deriveKey('짧은코드'));
});
