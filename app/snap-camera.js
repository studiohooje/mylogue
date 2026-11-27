// 5.1.0 AI로 입력의 '사진 찍기'도 앱 안 카메라로(메이트로그와 같은 기본 2배 · 가로 4:3). 휴대폰 기본 카메라 앱은 광각으로 열려 음식이 작게 담겼다.
// 화면 다시 그리기와 무관한 독립 덮개(body에 붙임). 찍으면 File 하나를 돌려준다.
import {openCamera,closeCamera,capture,cameraSupported} from './mate-camera.js';
export {cameraSupported};
// 2026-11-27 대표님: 메이트로그 방에 올리는 것 말고는 모두 앨범에서도 고를 수 있게 — 카메라 왼쪽 아래 앨범 버튼
export function openSnapCamera(onFile,{title='사진 찍기',album=true}={}){
 const box=document.createElement('div');box.className='mate-cam snap-cam';box.setAttribute('role','dialog');box.setAttribute('aria-label',title);
 box.innerHTML=`<div class="mate-cam-top"><button type="button" class="mate-ib" data-snap-close aria-label="닫기">✕</button><span>${title}</span><span style="width:44px"></span></div><div class="mate-vf"><video playsinline muted></video><p class="mate-cam-err" hidden></p></div><div class="mate-shutter-row">${album?'<label class="snap-album" aria-label="앨범에서 고르기"><span aria-hidden="true">🖼</span><small>앨범</small><input type="file" accept="image/*" hidden data-snap-album></label>':'<span></span>'}<button type="button" class="mate-shutter" data-snap-shot aria-label="찍기"></button><span></span></div>`;
 document.body.appendChild(box);
 const v=box.querySelector('video'),err=box.querySelector('.mate-cam-err');
 const done=()=>{closeCamera();box.remove()};
 openCamera(v).catch(e=>{err.hidden=false;err.textContent=`${e.message}${album?' 왼쪽 아래 앨범에서 고를 수 있어요.':''}`});
 box.addEventListener('change',e=>{const f=e.target.matches?.('[data-snap-album]')&&e.target.files?.[0];if(!f)return;done();onFile(f)});
 box.addEventListener('click',async e=>{const b=e.target.closest('button');if(!b)return;if(b.dataset.snapClose!==undefined){done();return}if(b.dataset.snapShot!==undefined){try{const shot=await capture(v,{stamp:false,maxEdge:1600});done();onFile(new File([shot.blob],`mylogue-${shot.at}.${shot.blob.type==='image/webp'?'webp':'jpg'}`,{type:shot.blob.type}))}catch(x){err.hidden=false;err.textContent=x.message}}});
 return done;
}
