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
// 5.0.4 대표님: 왼쪽 위 도장을 마이로그 스타일로. 반투명 유리 알약 + 헤일로 링(마이로그 그라데이션) + 큰 시각 + 날짜 · mylogue.
// 미리보기(.mate-stamp)와 저장되는 사진이 같은 모양이 되도록 stampParts를 함께 쓴다.
export const STAMP_GRAD = ['#8ce4e0', '#9fd2ee', '#b8aaf2', '#d4a6dc', '#f2a98a'];
export const stampParts = (d = new Date()) => ({time: `${p2(d.getHours())}:${p2(d.getMinutes())}`, date: `${p2(d.getMonth() + 1)}.${p2(d.getDate())} ${DAYS[d.getDay()]}`});
function pill(g, x, y, w, h, r){
  g.beginPath();
  if(g.roundRect){ g.roundRect(x, y, w, h, r); return; }
  g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath();
}
export function drawStamp(g, w, at){
  const {time, date} = stampParts(at);
  const s = Math.max(16, Math.round(w * 0.05)); // 시각 글자 크기
  const m = Math.round(s * 0.6), pad = Math.round(s * 0.45), orb = Math.round(s * 1.5), gap = Math.round(s * 0.45);
  const fam = 'SUIT, "Apple SD Gothic Neo", "Malgun Gothic", sans-serif';
  g.save();
  g.font = `800 ${s}px ${fam}`; const tw = g.measureText(time).width;
  const small = Math.round(s * 0.56);
  g.font = `600 ${small}px ${fam}`; const dw = g.measureText(`${date} · mylogue`).width;
  const bw = pad * 2 + orb + gap + Math.max(tw, dw), bh = pad * 2 + Math.max(orb, Math.round(s * 1.62)), r = bh / 2;
  // 유리 알약
  g.shadowColor = 'rgba(0,0,0,.35)'; g.shadowBlur = Math.round(s * 0.5); g.shadowOffsetY = Math.round(s * 0.08);
  pill(g, m, m, bw, bh, r); g.fillStyle = 'rgba(11,17,33,.55)'; g.fill();
  g.shadowColor = 'transparent';
  const grad = g.createLinearGradient(m, m, m + bw, m + bh); STAMP_GRAD.forEach((c, i) => grad.addColorStop(i / (STAMP_GRAD.length - 1), c));
  g.lineWidth = Math.max(1, s * 0.07); g.strokeStyle = grad; g.globalAlpha = 0.7; pill(g, m, m, bw, bh, r); g.stroke(); g.globalAlpha = 1;
  // 헤일로 링(마이로그 표시)
  const cx = m + pad + orb / 2, cy = m + bh / 2;
  g.lineWidth = Math.max(2, orb * 0.14); g.strokeStyle = grad; g.beginPath(); g.arc(cx, cy, orb / 2 - g.lineWidth / 2, 0, Math.PI * 2); g.stroke();
  g.fillStyle = 'rgba(255,255,255,.92)'; g.beginPath(); g.arc(cx, cy, orb * 0.14, 0, Math.PI * 2); g.fill();
  // 글자
  const tx = m + pad + orb + gap, ty = m + bh / 2;
  g.textBaseline = 'alphabetic'; g.fillStyle = '#fff';
  g.font = `800 ${s}px ${fam}`; g.fillText(time, tx, ty + s * 0.12);
  g.font = `600 ${small}px ${fam}`; g.fillStyle = 'rgba(234,244,255,.82)'; const dt = `${date} · `; g.fillText(dt, tx, ty + s * 0.72);
  g.fillStyle = grad; g.fillText('mylogue', tx + g.measureText(dt).width, ty + s * 0.72);
  g.restore();
}
