export async function connect(port,url){
 const data=await (await fetch(`http://localhost:${port}/json${url?'/new?'+url:''}`,url?{method:'PUT'}:{})).json();
 const tab=Array.isArray(data)?data.find(x=>x.type==='page')||data[0]:data;if(!tab?.webSocketDebuggerUrl)throw Error('No debug page: '+JSON.stringify(data));
 const ws=new WebSocket(tab.webSocketDebuggerUrl);await new Promise(r=>ws.addEventListener('open',r,{once:true}));let id=0;const pending=new Map();
 ws.addEventListener('message',e=>{const m=JSON.parse(e.data);if(m.id){const p=pending.get(m.id);pending.delete(m.id);m.error?p.reject(Error(JSON.stringify(m.error))):p.resolve(m.result)}});
 const send=(method,params={})=>new Promise((resolve,reject)=>{const n=++id;pending.set(n,{resolve,reject});ws.send(JSON.stringify({id:n,method,params}))});
 const run=async expression=>{const r=await send('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true});if(r.exceptionDetails)throw Error(r.exceptionDetails.exception?.description||r.exceptionDetails.text);return r.result.value};
 return {send,run,ws,close:()=>ws.close()};
}
