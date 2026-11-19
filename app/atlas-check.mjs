import {connect} from './qa-cdp.mjs';import fs from 'node:fs/promises';import path from 'node:path';import assert from 'node:assert/strict';
const c=await connect(9236,'http://localhost:4187');
const wait=async expr=>{for(let i=0;i<100;i++){if(await c.run(expr))return;await new Promise(r=>setTimeout(r,40))}throw Error('Timeout '+expr)};
const click=async selector=>{await c.run(`document.querySelector(${JSON.stringify(selector)}).click()`);await new Promise(r=>setTimeout(r,60))};
const capture=async(name,selector)=>{const rect=await c.run(`(()=>{const el=document.querySelector(${JSON.stringify(selector)});el.scrollIntoView({block:'center'});const r=el.getBoundingClientRect();return {x:Math.max(0,r.x+scrollX),y:Math.max(0,r.y+scrollY),width:r.width,height:r.height,scale:1}})()`);const img=await c.send('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});await fs.writeFile(`qa/${name}.png`,Buffer.from(img.data,'base64'))};
try{
 await c.send('Page.enable');await wait(`!!document.querySelector('[data-page="workout"]')`);
 // Refresh versioned caches without touching the synthetic records seeded by browser-check.
 await c.run(`(async()=>{for(const r of await navigator.serviceWorker.getRegistrations())await r.unregister();for(const k of await caches.keys())await caches.delete(k)})()`);await c.send('Page.reload',{ignoreCache:true});await wait(`!!document.querySelector('[data-page="workout"]')`);
 for(const width of [360,768,1200]){
  await c.send('Emulation.setDeviceMetricsOverride',{width,height:1050,deviceScaleFactor:1,mobile:width===360});
  await click('[data-page="workout"]');await click('[data-detail]');
  assert.equal(await c.run(`document.querySelectorAll('[data-atlas-design="technical-03"]').length>0`),true);
  assert.equal(await c.run(`document.querySelector('.sheet').scrollWidth<=document.querySelector('.sheet').clientWidth`),true);
  await capture(`atlas-03-target-${width}`,'[data-atlas-design]');await click('#close');
  await click('[data-page="analysis"]');await click('button[data-atlas-mode="load"]');assert.equal(await c.run(`!!document.querySelector('[data-atlas-mode="load"] .technical-atlas')`),true);
  await capture(`atlas-03-load-${width}`,'[data-atlas-design]');
  await click('button[data-atlas-mode="target"]');assert.equal(await c.run(`document.querySelector('button[data-atlas-mode="target"]').getAttribute('aria-pressed')`),'true');
  assert.equal(await c.run(`document.documentElement.scrollWidth<=innerWidth`),true);
 }
 await c.send('Page.setDownloadBehavior',{behavior:'allow',downloadPath:path.resolve('qa/exports')});await fs.mkdir('qa/exports',{recursive:true});
 await click('[data-page="workout"]');await click('[data-detail]');await click('#share-workout');
 for(let i=0;i<100;i++){const files=await fs.readdir('qa/exports');if(files.some(x=>x.endsWith('.png')))break;await new Promise(r=>setTimeout(r,50))}
 const files=(await fs.readdir('qa/exports')).filter(x=>x.endsWith('.png'));assert.ok(files.length);const img=await fs.readFile(path.join('qa/exports',files.at(-1)));assert.equal(img.subarray(1,4).toString(),'PNG');
 await fs.writeFile('qa/atlas-results.json',JSON.stringify({design:'03 Technical atlas',widths:[360,768,1200],targetAndLoadModes:true,overflow:false,pngExport:files.at(-1),source:'original approved mockup contours'},null,2));console.log('PASS approved atlas: target/load, 3 viewport widths, accessible switching, PNG result export');
}finally{await c.send('Page.close').catch(()=>{});c.close()}
