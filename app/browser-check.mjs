// Isolated local Chromium/CDP integration check. Never points at a user's app origin.
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
const tab=await (await fetch('http://localhost:9236/json/new?http://localhost:4187',{method:'PUT'})).json();
const ws=new WebSocket(tab.webSocketDebuggerUrl);await new Promise(r=>ws.addEventListener('open',r,{once:true}));
let id=0;const pending=new Map(),errors=[];
ws.addEventListener('message',e=>{const m=JSON.parse(e.data);if(m.id){const p=pending.get(m.id);pending.delete(m.id);m.error?p.reject(Error(JSON.stringify(m.error))):p.resolve(m.result)}if(m.method==='Runtime.exceptionThrown')errors.push(m.params.exceptionDetails.text+' '+(m.params.exceptionDetails.exception?.description||''));if(m.method==='Page.javascriptDialogOpening')send('Page.handleJavaScriptDialog',{accept:true}).catch(()=>{})});
function send(method,params={}){return new Promise((resolve,reject)=>{const n=++id;pending.set(n,{resolve,reject});ws.send(JSON.stringify({id:n,method,params}))})}
async function run(expression){const r=await send('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true});if(r.exceptionDetails)throw Error(r.exceptionDetails.exception?.description||r.exceptionDetails.text);return r.result.value}
async function wait(expression){for(let i=0;i<100;i++){if(await run(expression))return;await new Promise(r=>setTimeout(r,50))}throw Error('Timed out: '+expression)}
async function click(selector){await run(`document.querySelector(${JSON.stringify(selector)}).click()`);await new Promise(r=>setTimeout(r,60))}
async function fill(selector,value){await run(`(()=>{const t=document.querySelector(${JSON.stringify(selector)});if(!t)throw Error('missing '+${JSON.stringify(selector)});t.value=${JSON.stringify(value)};t.dispatchEvent(new Event('input',{bubbles:true}));t.dispatchEvent(new Event('change',{bubbles:true}))})()`)}
async function submit(selector){await run(`document.querySelector(${JSON.stringify(selector)}).requestSubmit()`);await new Promise(r=>setTimeout(r,80))}
const disk=()=>run(`JSON.parse(localStorage.getItem('mylogue.v1'))`);
const results=[];const pass=name=>{results.push(name);console.log('PASS',name)};
try{
 await send('Runtime.enable');await send('Page.enable');
 await wait(`!!document.querySelector('[data-modal="body"]')`);
 // Only this explicitly isolated QA profile/origin is reset.
 await run(`localStorage.clear();(async()=>{for(const r of await navigator.serviceWorker.getRegistrations())await r.unregister();for(const k of await caches.keys())await caches.delete(k)})()`);
 await send('Page.reload',{ignoreCache:true});await wait(`!!document.querySelector('[data-modal="body"]')`);await run(`(async()=>{const {photoStorage}=await import('./backup.js');await photoStorage.replaceAll([])})()`);
 await click('[data-modal="body"]');await fill('#body-form [name="weight"]','80');await submit('#body-form');
 await click('[data-body-edit]');await fill('#body-form [name="weight"]','81.2');await submit('#body-form');
 assert.equal((await disk()).body.length,1);assert.equal((await disk()).body[0].weight,81.2);pass('body create/edit retains one record');
 await click('[data-page="food"]');await click('[data-modal="batch"]');
 await fill('[data-food-field="name"]','QA 식사');await fill('[data-food-field="calories"]','200');await fill('[data-food-field="servingQty"]','2');await fill('#batch-form [name="recipeName"]','QA 한 끼');await submit('#batch-form');
 assert.equal((await disk()).meals[0].calories,400);assert.equal((await disk()).recipes.length,1);
 await click('[data-diet-state="complete"]');assert.equal(Object.values((await disk()).dayStates)[0],'complete');pass('batch meals recipe and complete state');
 await click('[data-page="workout"]');await click('[data-modal="workout"]');
 await click('[data-pick-exercise]');await fill('[data-set="weight"]','100');await fill('[data-set="unit"]','lb');
 // Unit selector converts the amount: re-enter 100 lb as the actual source input.
 await fill('[data-set="weight"]','100');await fill('[data-set="unit"]','kg');await fill('[data-set="unit"]','lb');
 assert.equal(await run(`document.querySelector('[data-set="weight"]').value`),'100');
 await click('[data-new-machine]');await fill('#machine-form [name="name"]','QA 머신');await fill('#machine-form [name="manufacturer"]','수동');await fill('#machine-form [name="model"]','테스트 A');await fill('#machine-form [name="unit"]','lb');await submit('#machine-form');
 assert.equal((await disk()).machines.length,1);
 await fill('#workout-form [name="title"]','QA 운동 초안');await fill('#workout-form [name="energy"]','4');
 await send('Page.reload',{ignoreCache:true});await wait(`!!document.querySelector('[data-page="workout"]')`);await click('[data-page="workout"]');await click('#resume-session');
 assert.equal(await run(`document.querySelector('#workout-form [name="title"]').value`),'QA 운동 초안');assert.equal(await run(`document.querySelector('#workout-form [name="energy"]').value`),'4');
 assert.equal(await run(`document.querySelector('[data-set="weight"]').value`),'100');pass('machine unit roundtrip and draft survive page restart');
 await run(`document.querySelector('.sheet').scrollTop=400`);const beforeScroll=await run(`document.querySelector('.sheet').scrollTop`);await click('[data-step-set="0:0:reps:1"]');assert.equal(await run(`document.querySelector('.sheet').scrollTop`),beforeScroll);pass('step editing retains sheet scroll position');
 await click('[data-set="completed"]');await click('[data-copy-set]');await click('[data-si="1"] [data-set="completed"]');await click('[data-si="1"] [data-copy-set]');await click('[data-si="2"] [data-set="completed"]');await submit('#workout-form');
 const workout=(await disk()).workouts[0];assert.equal(workout.exercises[0].sets.length,3);assert.equal(workout.exercises[0].sets[0].unit,'lb');assert.equal(workout.exercises[0].sets[0].weight,100);assert.equal(await run(`localStorage.getItem('mylogue.draft.v1')`),null);pass('three mixed unit capable sets saved and draft cleared');
 await click('[data-modal="checkin"]');await fill('[name="pain"]','true');await submit('#checkin-form');assert.match(await run(`document.body.innerText`),/통증.*보류/);pass('pain checkin withholds load recommendation');
 const backupResult=await run(`(async()=>{const {saveProgressPhoto,deleteProgressPhoto}=await import('./ui-helpers.js');const {createBackup,validateBackup,restoreBackup,photoStorage}=await import('./backup.js');const {load}=await import('./store.js');const bytes=Uint8Array.from(atob('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wl2nS8AAAAASUVORK5CYII='),c=>c.charCodeAt(0));const id=await saveProgressPhoto(new File([bytes],'test.png',{type:'image/png'}),'2026-11-02');const backup=await createBackup(load());await deleteProgressPhoto(id);await restoreBackup(backup);const restored=await photoStorage.readAll();const checked=await validateBackup(backup);const tampered=structuredClone(backup);tampered.photos[0].data='AAAA';let rejected=false;try{await restoreBackup(tampered)}catch{rejected=true}return {count:restored.length,bytes:Array.from(new Uint8Array(await restored.find(x=>x.id===id).blob.arrayBuffer())),expected:Array.from(bytes),rejected,body:checked.db.body.length}})()`);
 assert.equal(backupResult.count,1);assert.deepEqual(backupResult.bytes,backupResult.expected);assert.equal(backupResult.rejected,true);assert.equal(backupResult.body,1);pass('real IndexedDB photo bytes and records restored; tamper rejected');
 await click('[data-page="settings"]');await click('[data-modal="restore"]');
 await run(`(async()=>{const file=new File([JSON.stringify(JSON.parse(localStorage.getItem('mylogue.v1')))],'legacy.json',{type:'application/json'});const dt=new DataTransfer();dt.items.add(file);const input=document.querySelector('#restore-file');input.files=dt.files;input.dispatchEvent(new Event('change',{bubbles:true}))})()`);await click('#restore-preview');await wait(`!document.querySelector('#restore-confirm').disabled`);await click('#restore-confirm');await wait(`!document.querySelector('#restore-file')`);pass('legacy backup UI preview and restore');
 for(const width of [360,768,1200]){await send('Emulation.setDeviceMetricsOverride',{width,height:900,deviceScaleFactor:1,mobile:width===360});await click('[data-page="workout"]');assert.equal(await run(`document.documentElement.scrollWidth<=innerWidth`),true);await click('[data-modal="workout"]');assert.equal(await run(`document.querySelector('.sheet').scrollWidth<=document.querySelector('.sheet').clientWidth`),true);const img=await send('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});await fs.mkdir('qa',{recursive:true});await fs.writeFile(`qa/workout-${width}.png`,Buffer.from(img.data,'base64'));await click('#close');pass(`workout layout ${width}px no horizontal overflow`)}
 assert.deepEqual(errors,[]);await fs.writeFile('qa/browser-results.json',JSON.stringify({results,errors},null,2));console.log('BROWSER CHECK COMPLETE',results.length);
}finally{await send('Page.close').catch(()=>{});ws.close()}
