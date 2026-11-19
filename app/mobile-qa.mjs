import fs from 'node:fs/promises';
import {connect} from './qa-cdp.mjs';
const c=await connect(9238,'http://localhost:4173');
try{
 await c.send('Page.enable');
 await c.send('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});
 await c.send('Emulation.setTouchEmulationEnabled',{enabled:true});
 for(let i=0;i<40;i++){if(await c.run('!!document.querySelector(".nav")'))break;await new Promise(r=>setTimeout(r,100))}
 const dims=await c.run('({innerWidth,scrollWidth:document.documentElement.scrollWidth,bodyWidth:document.body.scrollWidth})');
 console.log(JSON.stringify(dims));
 if(dims.scrollWidth>dims.innerWidth)throw Error(`Horizontal overflow: ${dims.scrollWidth} > ${dims.innerWidth}`);
 const shot=await c.send('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});
 await fs.writeFile('../artifacts/qa-mobile-home-1.5.png',Buffer.from(shot.data,'base64'));
 await c.run('document.querySelector(`[data-page="food"]`).click()');
 const foodDims=await c.run('({innerWidth,scrollWidth:document.documentElement.scrollWidth})');
 if(foodDims.scrollWidth>foodDims.innerWidth)throw Error('Food page horizontal overflow');
 const food=await c.send('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});
 await fs.writeFile('../artifacts/qa-mobile-food-1.5.png',Buffer.from(food.data,'base64'));
 await c.run('document.querySelector(`[data-modal="batch"]`).click()');
 const meal=await c.send('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});
 await fs.writeFile('../artifacts/qa-mobile-meal-1.5.png',Buffer.from(meal.data,'base64'));
 await c.run('document.querySelector(`#close`).click()');
 await c.run('document.querySelector(`[data-page="workout"]`).click()');
 await c.run('document.querySelector(`[data-modal="workout"]`).click()');
 await c.run('(()=>{const e=document.querySelector(`#q-ex-search`);e.value="불가리안";e.dispatchEvent(new Event("input",{bubbles:true}))})()');
 await c.run('document.querySelector(`[data-q-ex="exercise:불가리안 스플릿 스쿼트"]`).click()');
 await c.run('document.querySelector(`.sheet`).scrollTop=730');
 const workout=await c.send('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});
 await fs.writeFile('../artifacts/qa-mobile-workout-1.5.png',Buffer.from(workout.data,'base64'));
}finally{c.close()}
