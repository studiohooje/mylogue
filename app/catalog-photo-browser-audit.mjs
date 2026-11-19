import assert from 'node:assert/strict';
import {connect} from './qa-cdp.mjs';

const c=await connect(9239,'http://localhost:4173');
try{
 await c.send('Page.enable');
 for(let attempt=0;attempt<50;attempt++){
  if(await c.run('!!document.querySelector(`[data-page="settings"]`)'))break;
  await new Promise(resolve=>setTimeout(resolve,100));
 }
 const image=await c.run(`(async()=>{
  const m=await import('./catalog-cloud.js');const result=[];
  for(const type of ['image/jpeg','image/png']){
   const canvas=document.createElement('canvas');canvas.width=900;canvas.height=700;
   const ctx=canvas.getContext('2d');ctx.fillStyle='#3678dd';ctx.fillRect(0,0,900,700);
   ctx.fillStyle='white';ctx.font='80px sans-serif';ctx.fillText('MACHINE',90,350);
   const blob=await new Promise(resolve=>canvas.toBlob(resolve,type));
   const url=await m.compressRequestPhoto(new File([blob],'machine.'+(type==='image/png'?'png':'jpg'),{type}));
   result.push({input:type,output:url.slice(0,23),chars:url.length});
  }
  return result;
})()`);
 assert.equal(image.length,2);
 for(const item of image){assert.equal(item.output,'data:image/jpeg;base64,');assert.ok(item.chars<=180000,item.chars)}
 await c.run('document.querySelector(`[data-page="settings"]`).click()');
 await c.run('document.querySelector(`[data-modal="catalog-request"]`).click()');
 const ui=await c.run(`(()=>{
  const form=document.querySelector('#catalog-request-form');
  const mode=form.elements.mode,kind=form.elements.type,fields=form.querySelector('[data-photo-fields]');
  const initial={hidden:fields.hidden,required:form.elements.wholePhoto.required,nameplateRequired:form.elements.nameplatePhoto.required};
  mode.value='photo';mode.dispatchEvent(new Event('change',{bubbles:true}));
  const photo={hidden:fields.hidden,required:form.elements.wholePhoto.required,nameplateRequired:form.elements.nameplatePhoto.required};
  mode.value='manual';mode.dispatchEvent(new Event('change',{bubbles:true}));
  const manual={hidden:fields.hidden,required:form.elements.wholePhoto.required,nameplateRequired:form.elements.nameplatePhoto.required};
  return {initial,photo,manual};
})()`);
 assert.deepEqual(ui,{initial:{hidden:true,required:false,nameplateRequired:false},photo:{hidden:false,required:true,nameplateRequired:true},manual:{hidden:true,required:false,nameplateRequired:false}});
 console.log(JSON.stringify({image,ui}));
}finally{c.close()}
