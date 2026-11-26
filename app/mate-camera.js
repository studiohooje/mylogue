// 5.0.0 로그메이트 카메라: 앱 안에서 찍기만(앨범에서 올리기 없음, 셋로그와 같음).
// 찍은 사진 왼쪽 위에 찍은 시각을 새겨 넣고(워터마크), 긴 변 720px로 줄여 WebP(안 되면 JPEG)로 만든다.
// 이 파일은 app.js를 import하지 않는다.
const DAYS = ['일', '월', '화', '수', '목', '금', '토'];
const p2 = n => String(n).padStart(2, '0');
export const stampText = (d = new Date()) => `${p2(d.getMonth() + 1)}.${p2(d.getDate())} (${DAYS[d.getDay()]}) ${p2(d.getHours())}:${p2(d.getMinutes())}`;
// 대표님(2026-11-25): 셋로그처럼 확대 없이 보는 크기로 낮춰 저장 비용을 줄인다(한 장 약 50~90KB)
export const MAX_EDGE = 720;
export const QUALITY = 0.72;

let stream = null, digitalZoom = 1;
export const ZOOM = 2;
export const ASPECT = 4 / 3; // 5.1.0 세로로 들어도 가로로 넓게(가로 4 : 세로 3)
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
  /* 5.1.0 대표님: 기본이 너무 광각 → 2배로. 카메라가 줌을 지원하면 하드웨어 줌, 아니면 가운데를 잘라 2배(미리보기도 같은 배율) */
  digitalZoom = 2;
  /* 5.4.3 대표님(셋로그처럼): 하드웨어 줌은 폰마다 미리보기와 찍힌 장면이 달라질 수 있어 쓰지 않는다. 화면 확대(가운데 2배)만 쓰고, 찍을 때는 화면에 보이는 영역을 그대로 자른다 */
  video.style.transform = digitalZoom > 1 ? `scale(${digitalZoom})` : '';
  video.srcObject = stream; video.setAttribute('playsinline', ''); video.muted = true;
  try{ await video.play(); }catch{}
  return stream;
}
export function closeCamera(){ if(stream){ for(const t of stream.getTracks()) t.stop(); stream = null; } }

// 비디오 한 장면 → 워터마크 → Blob
export async function capture(video, {at = new Date(), stamp = true, maxEdge = MAX_EDGE} = {}){
  const vw = video.videoWidth, vh = video.videoHeight;
  if(!vw || !vh) throw Error('카메라가 아직 준비되지 않았어요. 잠시 뒤 다시 눌러 주세요.');
  /* 5.4.3 화면에 보이는 그대로: 미리보기 칸(보이는 창)의 위치를 영상 픽셀로 거꾸로 계산(object-fit: cover + CSS 확대 + 가운데 정렬 모두 반영) */
  let sx, sy, cw, ch;
  const box = video.parentElement?.getBoundingClientRect?.(), vr = video.getBoundingClientRect?.(), W = video.offsetWidth, H = video.offsetHeight;
  if(box && vr && W > 0 && H > 0 && box.width > 0){
    const kz = vr.width / W, s = Math.max(W / vw, H / vh), ox = (W - vw * s) / 2, oy = (H - vh * s) / 2, cx = vr.left + vr.width / 2, cy = vr.top + vr.height / 2;
    const toV = (px, py) => [((W / 2 + (px - cx) / kz) - ox) / s, ((H / 2 + (py - cy) / kz) - oy) / s];
    const [x0, y0] = toV(Math.max(box.left, vr.left), Math.max(box.top, vr.top)), [x1, y1] = toV(Math.min(box.right, vr.right), Math.min(box.bottom, vr.bottom));
    sx = Math.max(0, x0); sy = Math.max(0, y0); cw = Math.min(vw, x1) - sx; ch = Math.min(vh, y1) - sy;
  }
  if(!(cw > 8 && ch > 8)){ cw = vw / digitalZoom; ch = vh / digitalZoom; if(cw / ch < ASPECT) ch = cw / ASPECT; else cw = ch * ASPECT; sx = (vw - cw) / 2; sy = (vh - ch) / 2; }
  const k = Math.min(1, maxEdge / cw), w = Math.round(cw * k), h = Math.round(ch * k);
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const g = c.getContext('2d');
  g.drawImage(video, sx, sy, cw, ch, 0, 0, w, h);
  if(stamp) drawStamp(g, w, at);
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
