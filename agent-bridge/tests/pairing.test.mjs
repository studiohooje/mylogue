import test from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {mkdtempSync,readFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {deriveKey,proof,newNonce,normCode} from '../bridge-proof.mjs';

// 4.0.0 연결 코드 방식: 도구를 임시 폴더·임시 포트로 띄워 HTTP 요청으로 확인한다(외부 네트워크 없음: 로그인 확인 전 단계까지만).
const here=dirname(fileURLToPath(import.meta.url));
const ORIGIN='http://localhost:4173';
async function startBridge(){
 const home=mkdtempSync(join(tmpdir(),'mylogue-bridge-'));
 const port=40000+Math.floor(Math.random()*9000);
 const child=spawn(process.execPath,[join(here,'..','mcp.mjs')],{env:{...process.env,MYLOGUE_BRIDGE_HOME:home,MYLOGUE_BRIDGE_PORT:String(port)},stdio:['pipe','pipe','pipe']});
 await new Promise((ok,no)=>{const t=setTimeout(()=>no(Error('도구가 켜지지 않음')),8000);child.stderr.on('data',d=>{if(/포트 \d+/.test(String(d))){clearTimeout(t);ok()}})});
 const code=readFileSync(join(home,'ai-bridge-code.txt'),'utf8').trim();
 return {child,port,code,key:await deriveKey(code),stop:()=>{child.stdin.end();child.kill()}};
}
const call=async(port,path,body,origin=ORIGIN)=>{const r=await fetch(`http://127.0.0.1:${port}${path}`,body===undefined?{headers:{Origin:origin}}:{method:'POST',headers:{Origin:origin,'Content-Type':'application/json'},body:JSON.stringify(body)});return {status:r.status,body:await r.json().catch(()=>({}))}};

test('연결 코드 방식: 상태에는 계정 정보가 없고, 도구는 코드로 자기를 증명한다', async () => {
 const b=await startBridge();
 try{
  assert.equal(normCode(b.code).length,10);
  const st=await call(b.port,'/status');
  assert.equal(st.status,200);assert.equal(st.body.protocol,4);
  assert.equal(st.body.uid,undefined);assert.equal(st.body.email,undefined);
  const nonce=newNonce();
  const hello=await call(b.port,'/hello',{nonce});
  assert.equal(hello.body.proof,await proof(b.key,'bridge',nonce,String(b.port)));
  // 다른 포트로 옮겨 쓴 증명은 맞지 않는다(포트를 가로챈 프로그램이 진짜 도구에 대신 물어보는 경우)
  assert.notEqual(hello.body.proof,await proof(b.key,'bridge',nonce,'43127'));
  // 허용되지 않은 주소에서 온 요청은 거절
  assert.equal((await call(b.port,'/status',undefined,'https://evil.example')).status,403);
 }finally{b.stop()}
});

test('정보 보기·해제·연결은 코드 증명이 있어야 하고, 같은 요청을 다시 쓸 수 없으며, 틀리면 잠긴다', async () => {
 const b=await startBridge();
 try{
  const wrongKey=await deriveKey('ABCDEFGHJK');
  let nonce=newNonce();
  assert.equal((await call(b.port,'/info',{nonce,proof:await proof(wrongKey,'info',nonce)})).status,403);
  nonce=newNonce();
  const ok=await call(b.port,'/info',{nonce,proof:await proof(b.key,'info',nonce)});
  assert.equal(ok.status,200);assert.equal(ok.body.paired,false);
  // 같은 nonce 재사용 거절
  assert.equal((await call(b.port,'/info',{nonce,proof:await proof(b.key,'info',nonce)})).status,403);
  // 해제도 증명 필요
  nonce=newNonce();
  assert.equal((await call(b.port,'/unpair',{nonce,proof:'00'})).status,403);
  // 연결: 증명이 틀리면 로그인 토큰을 확인하기 전에 거절(외부 요청 없음)
  nonce=newNonce();
  assert.equal((await call(b.port,'/pair',{nonce,proof:'00',uid:'u',idToken:'x'.repeat(120)})).status,403);
  // 10분에 10번 틀리면 잠금
  for(let i=0;i<10;i++){const n=newNonce();await call(b.port,'/info',{nonce:n,proof:'00'})}
  nonce=newNonce();
  assert.equal((await call(b.port,'/info',{nonce,proof:await proof(b.key,'info',nonce)})).status,429);
 }finally{b.stop()}
});
