// 5.1.0 AI로 입력의 '사진 찍기'도 앱 안 카메라로(메이트로그와 같은 기본 2배 · 가로 4:3). 휴대폰 기본 카메라 앱은 광각으로 열려 음식이 작게 담겼다.
// 화면 다시 그리기와 무관한 독립 덮개(body에 붙임). 찍으면 File 하나를 돌려준다.
import {openCamera,closeCamera,capture,cameraSupported} from './mate-camera.js';
export {cameraSupported};
export function openSnapCamera(onFile,{title='사진 찍기'}={}){
 const box=document.createElement('div');box.className='mate-cam snap-cam';box.setAttribute('role','dialog');box.setAttribute('aria-label',title);
 box.innerHTML=`<div class="mate-cam-top"><button type="button" class="mate-ib" data-snap-close aria-label="닫기">✕</button><span>${title}</span><span style="width:44px"></span></div><div class="mate-vf"><video playsinline muted></video><p class="mate-cam-err" hidden></p></div><div class="mate-shutter-row"><span></span><button type="button" class="mate-shutter" data-snap-shot aria-label="찍기"></button><span></span></div>`;
 document.body.appendChild(box);
 const v=box.querySelector('video'),err=box.querySelector('.mate-cam-err');
 const done=()=>{closeCamera();box.remove()};
 openCamera(v).catch(e=>{err.hidden=false;err.textContent=e.message});
 box.addEventListener('click',async e=>{const b=e.target.closest('button');if(!b)return;if(b.dataset.snapClose!==undefined){done();return}if(b.dataset.snapShot!==undefined){try{const shot=await capture(v,{stamp:false,maxEdge:1600});done();onFile(new File([shot.blob],`mylogue-${shot.at}.${shot.blob.type==='image/webp'?'webp':'jpg'}`,{type:shot.blob.type}))}catch(x){err.hidden=false;err.textContent=x.message}}});
 return done;
}
