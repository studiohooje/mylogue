import http from 'node:http';
import {createInterface} from 'node:readline';
import {FirestoreBridge,verifyUserToken,exchangeRefreshToken} from './firebase.mjs';
import {loadPairing,savePairing,clearPairing,loadOrCreateCode} from './store.mjs';
import {deriveKey,proof,validNonce,sameHex,newCode,showCode} from './bridge-proof.mjs';

// 4.0.0(앱 4.17.0): 보안 점검 후속. 이 도구와 앱은 '연결 코드'로 서로를 확인한다.
// - /status는 켜져 있는지만 알려 준다(계정 정보 없음).
// - /hello: 도구가 코드로 만든 증명을 돌려준다(앱은 이게 맞을 때만 토큰을 보낸다. 포트를 가로챈 프로그램은 코드를 몰라 실패).
// - /info·/pair·/unpair: 앱이 코드로 만든 증명을 붙여야 한다(같은 PC의 다른 사용자가 조작하지 못함).
// 연결 코드는 이 PC 사용자 폴더에 저장되고, AI에게 "마이로그 연결 코드 알려줘"라고 하면 mylogue_connection_status가 알려 준다.
const VERSION='4.0.0';
const DEFAULT_PORT=Number(process.env.MYLOGUE_BRIDGE_PORT||43127);
const bridge=new FirestoreBridge({onRefresh:s=>{try{savePairing({uid:s.uid,refreshToken:s.refreshToken,email:s.email||''})}catch{}}});
const saved=loadPairing();
if(saved)bridge.setSession({uid:saved.uid,email:saved.email||'',refreshToken:saved.refreshToken,idToken:'',expiresAt:new Date(0).toISOString()});
const code=loadOrCreateCode(newCode);
const keyPromise=deriveKey(code);
// 보안 점검(2026-11-22): 포트 없는 http://localhost(다른 로컬 웹 서버)는 뺐다. 안드로이드 앱은 https://localhost.
const origins=new Set(['https://mylogue.fit','https://www.mylogue.fit','https://studiohooje.github.io','http://localhost:4173','http://127.0.0.1:4173','capacitor://localhost','https://localhost']);
// 증명 실패는 10분에 10번까지. 넘으면 10분 잠금(다시 시작하지 않아도 풀림).
let failures=[],lockedUntil=0;
const fail=()=>{const now=Date.now();failures=failures.filter(t=>now-t<600000);failures.push(now);if(failures.length>=10)lockedUntil=now+600000};
const locked=()=>Date.now()<lockedUntil;
const used=new Set();const useNonce=n=>{if(used.has(n))return false;used.add(n);if(used.size>2000)used.delete(used.values().next().value);return true};
let boundPort=0;
const respond=(res,status,body)=>{res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});res.end(JSON.stringify(body))};
const detail=()=>{const s=bridge.session;return {running:true,version:VERSION,paired:!!s,uid:s?.uid||'',email:s?.email||'',persistent:!!s?.refreshToken}};
async function readJSON(req){let raw='';for await(const chunk of req){raw+=chunk;if(raw.length>16000)throw Object.assign(Error('요청이 너무 큽니다.'),{status:413})}try{return JSON.parse(raw)}catch{throw Object.assign(Error('요청 형식이 올바르지 않습니다.'),{status:400})}}
async function checkApp(data,label){
 if(locked())throw Object.assign(Error('잘못된 연결 코드가 너무 많이 들어왔어요. 10분 뒤 다시 해 주세요.'),{status:429});
 if(!validNonce(data?.nonce)||!useNonce(data.nonce)){fail();throw Object.assign(Error('연결 요청이 올바르지 않아요.'),{status:403})}
 const expect=await proof(await keyPromise,label,data.nonce);
 if(!sameHex(expect,data.proof)){fail();throw Object.assign(Error('연결 코드가 맞지 않아요. AI 도구가 알려 준 코드를 다시 확인해 주세요.'),{status:403})}
}
const httpServer=http.createServer(async(req,res)=>{
 const origin=req.headers.origin||'';
 if(origin&&origins.has(origin)){
  res.setHeader('Access-Control-Allow-Origin',origin);
  res.setHeader('Vary','Origin');
  res.setHeader('Access-Control-Allow-Methods','GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers','Content-Type');
  res.setHeader('Access-Control-Allow-Private-Network','true');
 }
 if(req.method==='OPTIONS'){respond(res,origin&&!origins.has(origin)?403:204,{});return}
 // 브라우저의 마이로그 화면(허용된 주소)에서 온 요청만 받는다(1차 거름망). 진짜 확인은 연결 코드 증명.
 if(!origins.has(origin)){respond(res,403,{error:'마이로그 앱에서만 연결할 수 있습니다.'});return}
 try{
  if(req.url==='/status'&&req.method==='GET'){respond(res,200,{running:true,version:VERSION,protocol:4});return}
  if(req.method!=='POST'){respond(res,404,{error:'not found'});return}
  const data=await readJSON(req);
  if(req.url==='/hello'){
   if(!validNonce(data?.nonce)){respond(res,400,{error:'요청 형식이 올바르지 않습니다.'});return}
   respond(res,200,{proof:await proof(await keyPromise,'bridge',data.nonce,String(boundPort))});return;
  }
  if(req.url==='/info'){await checkApp(data,'info');respond(res,200,detail());return}
  if(req.url==='/unpair'){await checkApp(data,'unpair');bridge.clearSession();clearPairing();respond(res,200,{ok:true,...detail()});return}
  if(req.url!=='/pair'){respond(res,404,{error:'not found'});return}
  await checkApp(data,'pair');
  const user=await verifyUserToken(data.idToken,data.uid);
  let session={...user,idToken:data.idToken};
  if(data.remember!==false&&typeof data.refreshToken==='string'&&data.refreshToken){
   const next=await exchangeRefreshToken(data.refreshToken);
   if(next.uid!==user.uid)throw Error('마이로그 로그인 계정이 일치하지 않습니다.');
   session={...session,...next,email:user.email};savePairing({uid:session.uid,refreshToken:session.refreshToken,email:session.email});
  }else clearPairing();
  bridge.setSession(session);
  respond(res,200,{ok:true,uid:session.uid,expiresAt:session.refreshToken?null:session.expiresAt,persistent:!!session.refreshToken});
 }catch(error){respond(res,error.status||403,{error:error.message})}
});
let fellBack=false;
const listen=port=>httpServer.listen(port,'127.0.0.1');
httpServer.on('error',error=>{if(error.code==='EADDRINUSE'&&!fellBack){fellBack=true;process.stderr.write(`마이로그 AI 연결: 기본 포트 ${DEFAULT_PORT}을 다른 프로그램이 쓰고 있어 임시 포트로 엽니다. 앱의 '고급: 포트 바꾸기'에 아래 포트를 넣어 주세요.\n`);listen(0)}else process.stderr.write(`마이로그 AI 연결 오류: ${error.message}\n`)});
httpServer.on('listening',()=>{
 boundPort=httpServer.address().port;
 process.stderr.write(saved?`마이로그 AI 연결: 이 PC에 저장된 계정으로 자동 연결됨(포트 ${boundPort}).\n`:`마이로그 AI 연결: 포트 ${boundPort}에서 기다리는 중. 마이로그 설정 › 내 AI 연결에 연결 코드 ${showCode(code)} 를 넣어 주세요.\n`);
});
listen(DEFAULT_PORT);

const TOOLS=[
 {name:'mylogue_connection_status',description:'마이로그 연결 상태와, 앱에 넣을 연결 코드를 알려 줍니다. 사용자가 연결 코드를 물으면 이 도구를 부르세요.',inputSchema:{type:'object',properties:{}}},
 {name:'mylogue_search_records',description:'로그인한 사용자의 기존 음식·머신·운동과 공용 도감을 검색합니다. 신규 등록 전에 반드시 호출하세요.',inputSchema:{type:'object',properties:{query:{type:'string'},kind:{type:'string',enum:['all','foods','machines','customExercises','meals','workouts']},limit:{type:'integer'}},required:['query']}},
 {name:'mylogue_create_draft',description:'사용자 본인의 검토함에 식사·운동·몸 기록 또는 신규 음식·운동·머신 초안을 만듭니다. 확정 기록은 만들지 않습니다. 새 머신은 전체·명판 사진 두 장과 제조사·모델 식별이 필요합니다. requestId를 재시도에 재사용하면 중복을 막습니다.',inputSchema:{type:'object',properties:{type:{type:'string',enum:['meal','workout','body','food','machine','exercise']},requestId:{type:'string'},sourceModel:{type:'string'},originalUtterance:{type:'string'},parsedData:{type:'object'},uncertainty:{type:'object'},evidence:{type:'object'}},required:['type','requestId','originalUtterance','parsedData']}},
 {name:'mylogue_list_drafts',description:'로그인한 사용자의 최근 AI 검토함 초안을 확인합니다.',inputSchema:{type:'object',properties:{limit:{type:'integer'}}}}
];
const handlers={
 mylogue_connection_status:async()=>{const pairing={pairingCode:showCode(code),port:boundPort,howTo:'마이로그 앱 설정 › 내 AI 연결에서 이 연결 코드를 넣으면 이 PC의 도구와 연결돼요. 코드는 이 PC 사용자 폴더에만 저장돼요.'};try{const s=await bridge.fresh();return {connected:true,uid:s.uid,persistent:!!s.refreshToken,expiresAt:s.refreshToken?null:s.expiresAt,...pairing}}catch(error){return {connected:false,message:error.message,...pairing}}},
 mylogue_search_records:args=>bridge.searchRecords(args),
 mylogue_create_draft:args=>bridge.createDraft(args),
 mylogue_list_drafts:args=>bridge.listDrafts(args)
};
const send=value=>process.stdout.write(`${JSON.stringify(value)}\n`);
const protocol='2025-03-26';
createInterface({input:process.stdin,crlfDelay:Infinity}).on('line',async line=>{
 let msg;try{msg=JSON.parse(line)}catch{return}
 if(!msg||typeof msg!=='object'||!msg.method)return;
 const id=msg.id;
 try{
  if(msg.method==='notifications/initialized')return;
  if(msg.method==='initialize'){if(id!==undefined)send({jsonrpc:'2.0',id,result:{protocolVersion:protocol,capabilities:{tools:{listChanged:false}},serverInfo:{name:'mylogue-agent-bridge',version:'4.0.0-beta'}}});return}
  if(msg.method==='tools/list'){if(id!==undefined)send({jsonrpc:'2.0',id,result:{tools:TOOLS}});return}
  if(msg.method==='tools/call'){
   const name=msg.params?.name;if(!Object.hasOwn(handlers,name))throw Error('지원하지 않는 도구입니다.');
   try{const result=await handlers[name](msg.params?.arguments||{});send({jsonrpc:'2.0',id,result:{content:[{type:'text',text:JSON.stringify(result)}]}})}
   catch(error){send({jsonrpc:'2.0',id,result:{isError:true,content:[{type:'text',text:error.message}]}})}return;
  }
  if(id!==undefined)send({jsonrpc:'2.0',id,error:{code:-32601,message:'Method not found'}});
 }catch(error){if(id!==undefined)send({jsonrpc:'2.0',id,error:{code:-32603,message:error.message}})}
});
process.stdin.on('end',()=>httpServer.close());
