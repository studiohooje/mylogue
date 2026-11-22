// 4.5.0 종목 그림 넣기: exercise-art/*.png(GPT 원본, 1024px) → art/ex/<이름>.webp(192px) + exercise-art.js 다시 만들기.
// 사용: 그림을 exercise-art/ 에 지시서의 파일 이름 그대로 저장 → `npm run art` → 빌드·배포.
import fs from 'node:fs/promises';import path from 'node:path';import {fileURLToPath} from 'node:url';import sharp from 'sharp';
const root=path.dirname(fileURLToPath(import.meta.url)),src=path.join(root,'exercise-art'),out=path.join(root,'art','ex');
await fs.mkdir(out,{recursive:true});
const csv=await fs.readFile(path.join(root,'..','docs','art','exercise-art-list.csv'),'utf8');
const byFile=new Map(csv.replace(/^﻿/,'').trim().split(/\r?\n/).slice(1).map(l=>l.split(',')).map(c=>[c[3],c[2]]));
const map={},unknown=[];
for(const f of (await fs.readdir(src).catch(()=>[])).filter(f=>/\.png$/i.test(f)).sort()){
 const name=byFile.get(f);if(!name){unknown.push(f);continue}
 const slug=f.replace(/\.png$/i,'');
 // 흰 배경으로 받은 그림도 쓰도록: 거의 흰 픽셀을 투명으로(가장자리에서만 이어진 부분은 아니지만 이 그림체엔 충분)
 const {data,info}=await sharp(path.join(src,f)).ensureAlpha().raw().toBuffer({resolveWithObject:true});
 let white=0;for(let i=0;i<data.length;i+=4)if(data[i+3]>0&&data[i]>245&&data[i+1]>245&&data[i+2]>245)white++;
 const corner=[0,(info.width-1)*4,(info.height-1)*info.width*4].every(o=>data[o+3]===0||(data[o]>245&&data[o+1]>245&&data[o+2]>245));
 if(corner&&white>info.width*info.height*0.2)for(let i=0;i<data.length;i+=4)if(data[i]>245&&data[i+1]>245&&data[i+2]>245)data[i+3]=0;
 await sharp(data,{raw:info}).trim().resize(192,192,{fit:'contain',background:{r:0,g:0,b:0,alpha:0}}).webp({quality:86,alphaQuality:90}).toFile(path.join(out,`${slug}.webp`));
 map[name]=slug;
}
const body=Object.entries(map).map(([k,v])=>` ${JSON.stringify(k)}:${JSON.stringify(v)},`).join('\n');
await fs.writeFile(path.join(root,'exercise-art.js'),`// 4.5.0 종목 그림(GPT로 만든 그림 → art/ex/<파일>.webp). 이 파일은 \`npm run art\`가 다시 만든다(직접 고치지 않기).\n// 그림이 있는 종목만 들어 있다. 없으면 화면은 지금처럼 근육 지도만 보인다.\nexport const EXERCISE_ART = {\n${body}\n};\n`);
console.log(`그림 ${Object.keys(map).length}개 넣음${unknown.length?` · 목록에 없는 파일 이름 ${unknown.length}개: ${unknown.join(', ')}`:''}`);
