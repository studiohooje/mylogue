import http from 'node:http';
import {createInterface} from 'node:readline';
import {FirestoreBridge,verifyUserToken,exchangeRefreshToken} from './firebase.mjs';
import {loadPairing,savePairing,clearPairing} from './store.mjs';

// 3.8.0: 한 번 연결하면 이 PC에서 계속 쓴다. 고정 포트(기본 43127)에서 앱이 버튼 한 번으로 연결하고,
// 갱신 토큰을 이 PC 사용자 폴더에 저장해 도구를 다시 켜도 자동으로 이어진다. 연결 해제 시 파일을 지운다.
const VERSION='3.8.0';
const DEFAULT_PORT=Number(process.env.MYLOGUE_BRIDGE_PORT||43127);
const bridge=new FirestoreBridge({onRefresh:s=>{try{savePairing({uid:s.uid,refreshToken:s.refreshToken,email:s.email||''})}catch{}}});
const saved=loadPairing();
if(saved)bridge.setSession({uid:saved.uid,email:saved.email||'',refreshToken:saved.refreshToken,idToken:'',expiresAt:new Date(0).toISOString()});
const origins=new Set(['https://studiohooje.github.io','http://localhost:4173','http://127.0.0.1:4173','capacitor://localhost','http://localhost','https://localhost']);
let failures=0;
const respond=(res,status,body)=>{res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});res.end(JSON.stringify(body))};
const status=()=>{const s=bridge.session;return {running:true,version:VERSION,paired:!!s,uid:s?.uid||'',email:s?.email||'',persistent:!!s?.refreshToken}};
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
 // 브라우저의 마이로그 화면(허용된 주소)에서 온 요청만 받는다.
 if(!origins.has(origin)){respond(res,403,{error:'마이로그 앱에서만 연결할 수 있습니다.'});return}
 if(req.url==='/status'&&req.method==='GET'){respond(res,200,status());return}
 if(req.url==='/unpair'&&req.method==='POST'){bridge.clearSession();clearPairing();respond(res,200,{ok:true,...status()});return}
 if(req.url!=='/pair'||req.method!=='POST'){respond(res,404,{error:'not found'});return}
 if(failures>=10){respond(res,429,{error:'연결 시도가 너무 많습니다. 도구를 다시 시작해 주세요.'});return}
 let raw='';for await(const chunk of req){raw+=chunk;if(raw.length>16000){respond(res,413,{error:'요청이 너무 큽니다.'});return}}
 let data;try{data=JSON.parse(raw)}catch{respond(res,400,{error:'요청 형식이 올바르지 않습니다.'});return}
 try{
  const user=await verifyUserToken(data.idToken,data.uid);
  let session={...user,email:String(data.email||''),idToken:data.idToken};
  if(data.remember!==false&&typeof data.refreshToken==='string'&&data.refreshToken){
   const next=await exchangeRefreshToken(data.refreshToken);
   if(next.uid!==user.uid)throw Error('마이로그 로그인 계정이 일치하지 않습니다.');
   session={...session,...next};savePairing({uid:session.uid,refreshToken:session.refreshToken,email:session.email});
  }else clearPairing();
  bridge.setSession(session);failures=0;
  respond(res,200,{ok:true,uid:session.uid,expiresAt:session.refreshToken?null:session.expiresAt,persistent:!!session.refreshToken});
 }catch(error){failures++;respond(res,403,{error:error.message})}
});
let fellBack=false;
const listen=port=>httpServer.listen(port,'127.0.0.1');
httpServer.on('error',error=>{if(error.code==='EADDRINUSE'&&!fellBack){fellBack=true;process.stderr.write(`마이로그 AI 연결: 기본 포트 ${DEFAULT_PORT}을 다른 프로그램이 쓰고 있어 임시 포트로 엽니다.\n`);listen(0)}else process.stderr.write(`마이로그 AI 연결 오류: ${error.message}\n`)});
httpServer.on('listening',()=>{
 const port=httpServer.address().port;
 process.stderr.write(saved?`마이로그 AI 연결: 이 PC에 저장된 계정으로 자동 연결됨(포트 ${port}).\n`:`마이로그 AI 연결: 포트 ${port}에서 기다리는 중. 같은 PC의 마이로그 설정 › 내 AI 연결에서 ‘이 PC의 AI 도구와 연결’을 누르세요.\n`);
});
listen(DEFAULT_PORT);

const TOOLS=[
 {name:'mylogue_connection_status',description:'현재 사용자별 마이로그 연결 상태를 확인합니다.',inputSchema:{type:'object',properties:{}}},
 {name:'mylogue_search_records',description:'로그인한 사용자의 기존 음식·머신·운동과 공용 도감을 검색합니다. 신규 등록 전에 반드시 호출하세요.',inputSchema:{type:'object',properties:{query:{type:'string'},kind:{type:'string',enum:['all','foods','machines','customExercises','meals','workouts']},limit:{type:'integer'}},required:['query']}},
 {name:'mylogue_create_draft',description:'사용자 본인의 검토함에 식사·운동·몸 기록 또는 신규 음식·운동·머신 초안을 만듭니다. 확정 기록은 만들지 않습니다. 새 머신은 전체·명판 사진 두 장과 제조사·모델 식별이 필요합니다. requestId를 재시도에 재사용하면 중복을 막습니다.',inputSchema:{type:'object',properties:{type:{type:'string',enum:['meal','workout','body','food','machine','exercise']},requestId:{type:'string'},sourceModel:{type:'string'},originalUtterance:{type:'string'},parsedData:{type:'object'},uncertainty:{type:'object'},evidence:{type:'object'}},required:['type','requestId','originalUtterance','parsedData']}},
 {name:'mylogue_list_drafts',description:'로그인한 사용자의 최근 AI 검토함 초안을 확인합니다.',inputSchema:{type:'object',properties:{limit:{type:'integer'}}}}
];
const handlers={
 mylogue_connection_status:async()=>{try{const s=await bridge.fresh();return {connected:true,uid:s.uid,persistent:!!s.refreshToken,expiresAt:s.refreshToken?null:s.expiresAt}}catch(error){return {connected:false,message:error.message}}},
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
  if(msg.method==='initialize'){if(id!==undefined)send({jsonrpc:'2.0',id,result:{protocolVersion:protocol,capabilities:{tools:{listChanged:false}},serverInfo:{name:'mylogue-agent-bridge',version:'3.8.1-beta'}}});return}
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
