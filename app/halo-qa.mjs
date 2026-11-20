// 헤일로 화면 검사: 5개 폭 × 4가지 하루 × 보통/큰 글자에서 글자 겹침·가로 넘침이 0인지 확인한다.
// 사용: npm run serve 실행 후, 크롬을 --remote-debugging-port=9333 로 띄우고 node halo-qa.mjs <캡처 폴더>
// QA용 가상 기록: 지난 7일 평소 리듬 + 오늘(시나리오별)
import {normalizeDB} from './domain.js';
const pad=n=>String(n).padStart(2,'0');
const ds=d=>`${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
const at=(date,h,m=0)=>{const d=new Date(`${date}T00:00:00`);d.setHours(h,m);return d.toISOString()};
function seed(scenario,now=new Date()){
 const body=[],meals=[],workouts=[];
 const addDay=(date,parts)=>{for(const p of parts){
  if(p[0]==='body')body.push({date,weight:72.4,createdAt:at(date,p[1],p[2]||0)});
  if(p[0]==='meal'){const id=`${date}-${p[1]}`;meals.push({date,name:'현미밥',servingQty:210,servingUnit:'g',calories:330,carbs:72,protein:6,fat:2,slot:'식사',mealGroupId:id,loggedAt:at(date,p[1],p[2]||0),createdAt:at(date,p[1],p[2]||0)})}
  if(p[0]==='workout')workouts.push({date,title:'하체',createdAt:at(date,p[1],p[2]||0),exercises:[{name:'스쿼트',sets:[{weight:60,reps:10,completed:true},{weight:60,reps:10,completed:true}]}]});
 }};
 const usual=[['body',7,30],['meal',8],['meal',12,30],['workout',18,30],['meal',19]];
 for(let i=1;i<=7;i++){const d=new Date(now);d.setDate(d.getDate()-i);addDay(ds(d),usual)}
 const today=ds(now);
 const S={
  full:[['body',7,24],['meal',8,6],['meal',12,36],['workout',18,12],['meal',19,24]],
  less:[['meal',12,48]],
  off:[['body',10,24],['meal',10,54],['meal',16,12],['meal',23,6]].filter(p=>p[1]<=now.getHours()),
  none:[]
 }[scenario];
 addDay(today,S);
 return normalizeDB({schemaVersion:1,body,meals,workouts});
}
import {connect} from './qa-cdp.mjs';
import fs from 'node:fs/promises';
const out=process.argv[2]||'qa/halo';await fs.mkdir(out,{recursive:true});const wait=ms=>new Promise(r=>setTimeout(r,ms));const rep=[];let bad=0;
const measure=`(()=>{const h=document.querySelector('.timeline-hero');const hb=h.getBoundingClientRect();const g=h.querySelector('.halo-draw');const rects=[];h.querySelectorAll('.timeline-date,h2,.hero-msg').forEach(el=>{const rg=document.createRange();rg.selectNodeContents(el);for(const r of rg.getClientRects())if(r.width>0)rects.push(r)});let ov=0;if(g){const a=g.getBoundingClientRect();for(const r of rects)ov+=Math.max(0,Math.min(a.right,r.right)-Math.max(a.left,r.left))*Math.max(0,Math.min(a.bottom,r.bottom)-Math.max(a.top,r.top));}return {state:h.dataset.halo||'-',ov:Math.round(ov),h:Math.round(hb.height),msg:h.querySelector('.hero-msg')?.innerText,overflow:document.documentElement.scrollWidth>innerWidth,x:hb.left+scrollX,y:hb.top+scrollY,w:hb.width,hh:hb.height}})()`;
for(const [w,hgt] of [[360,740],[390,844],[412,846],[768,1024],[1280,800]]){
 const c=await connect(9333,'about:blank');
 await c.send('Emulation.setDeviceMetricsOverride',{width:w,height:hgt,deviceScaleFactor:2,mobile:w<700});
 await c.send('Page.enable');
 for(const sc of ['full','less','off','none']){
  for(const big of [false,true]){
   await c.send('Page.navigate',{url:'http://localhost:4173/'});await wait(1500);
   await c.run(`localStorage.setItem('mylogue.v1',${JSON.stringify(JSON.stringify(seed(sc)))});true`);
   await c.send('Page.reload');await wait(2200);
   if(big){await c.run(`(()=>{const s=document.createElement('style');s.textContent='.timeline-hero .timeline-date{font-size:16px!important}.timeline-hero h2{font-size:40px!important}.timeline-hero .hero-msg{font-size:19px!important}';document.head.appendChild(s);dispatchEvent(new Event('resize'));})()`);await wait(600);}
   const m=await c.run(measure);if(m.ov>0||m.overflow)bad++;
   rep.push(`${w} ${sc}${big?' 큰글자':''}: 상태=${m.state} 겹침=${m.ov} 카드높이=${m.h} 넘침=${m.overflow} | ${m.msg}`);
   if(w===360||w===412||w===1280||big){const s=await c.send('Page.captureScreenshot',{format:'png',captureBeyondViewport:true,clip:{x:m.x,y:m.y,width:m.w,height:m.hh,scale:1}});await fs.writeFile(`${out}/${w}-${sc}${big?'-big':''}.png`,Buffer.from(s.data,'base64'));}
  }
 }
 c.close();
}
console.log(rep.join('\n'));console.log('문제 건수:',bad);process.exitCode=bad?1:0;
