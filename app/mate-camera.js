// 5.0.0 로그메이트 카메라: 앱 안에서 찍기만(앨범에서 올리기 없음, 셋로그와 같음).
// 찍은 사진 왼쪽 위에 찍은 시각을 새겨 넣고(워터마크), 긴 변 720px로 줄여 WebP(안 되면 JPEG)로 만든다.
// 이 파일은 app.js를 import하지 않는다.
const DAYS = ['일', '월', '화', '수', '목', '금', '토'];
const p2 = n => String(n).padStart(2, '0');
export const stampText = (d = new Date()) => `${p2(d.getMonth() + 1)}.${p2(d.getDate())} (${DAYS[d.getDay()]}) ${p2(d.getHours())}:${p2(d.getMinutes())}`;
// 대표님(2026-11-25): 셋로그처럼 확대 없이 보는 크기로 낮춰 저장 비용을 줄인다(한 장 약 50~90KB)
export const MAX_EDGE = 720;
export const QUALITY = 0.72;

let stream = null;
export const cameraSupported = () => !!globalThis.navigator?.mediaDevices?.getUserMedia;
export async function openCamera(video, {facing = 'environment'} = {}){
  closeCamera();
  if(!cameraSupported()) throw Error('이 기기·브라우저에서는 카메라를 열 수 없어요.');
  try{
    stream = await navigator.mediaDevices.getUserMedia({video: {facingMode: {ideal: facing}, width: {ideal: 1920}, height: {ideal: 1440}}, audio: false});
  }catch(e){
    const n = e?.name || '';
    throw Error(n === 'NotAllowedError' ? '카메라 권한이 꺼져 있어요. 기기 설정에서 마이로그의 카메라 권한을 켜 주세요.' : n === 'NotFoundError' ? '쓸 수 있는 카메라가 없어요.' : '카메라를 열지 못했어요. 잠시 뒤 다시 해 주세요.');
  }
  video.srcObject = stream; video.setAttribute('playsinline', ''); video.muted = true;
  try{ await video.play(); }catch{}
  return stream;
}
export function closeCamera(){ if(stream){ for(const t of stream.getTracks()) t.stop(); stream = null; } }

// 비디오 한 장면 → 워터마크 → Blob
export async function capture(video, {at = new Date()} = {}){
  const vw = video.videoWidth, vh = video.videoHeight;
  if(!vw || !vh) throw Error('카메라가 아직 준비되지 않았어요. 잠시 뒤 다시 눌러 주세요.');
  const k = Math.min(1, MAX_EDGE / Math.max(vw, vh)), w = Math.round(vw * k), h = Math.round(vh * k);
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const g = c.getContext('2d');
  g.drawImage(video, 0, 0, w, h);
  drawStamp(g, w, at);
  const blob = await new Promise(res => c.toBlob(b => res(b), 'image/webp', QUALITY));
  const out = blob && blob.type === 'image/webp' ? blob : await new Promise(res => c.toBlob(b => res(b), 'image/jpeg', QUALITY));
  if(!out) throw Error('사진을 만들지 못했어요. 다시 찍어 주세요.');
  return {blob: out, at: at.getTime(), w, h};
}
export function drawStamp(g, w, at){
  const s = Math.max(16, Math.round(w * 0.045)), pad = Math.round(s * 0.7);
  g.save();
  g.font = `800 ${s}px SUIT, "Apple SD Gothic Neo", "Malgun Gothic", sans-serif`;
  g.textBaseline = 'top'; g.fillStyle = '#fff'; g.shadowColor = 'rgba(0,0,0,.75)'; g.shadowBlur = Math.round(s * 0.35); g.shadowOffsetY = Math.round(s * 0.06);
  g.fillText(stampText(at), pad, pad);
  g.font = `600 ${Math.round(s * 0.62)}px SUIT, sans-serif`; g.globalAlpha = 0.85;
  g.fillText('mylogue', pad, pad + Math.round(s * 1.15));
  g.restore();
}
