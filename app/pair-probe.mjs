import {connect} from './qa-cdp.mjs';
const port=Number(process.env.MYLOGUE_PAIR_PORT);
const c=await connect(9238,'http://localhost:4173/');
try{
 await c.send('Page.enable');
 await new Promise(r=>setTimeout(r,500));
 const result=await c.run(`fetch('http://127.0.0.1:${port}/pair',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({code:'00000000',uid:'test',idToken:'test'})}).then(async r=>({status:r.status,body:await r.json()})).catch(e=>({error:String(e)}))`);
 console.log(JSON.stringify(result));
 if(result.status!==403)process.exitCode=1;
}finally{c.close()}
