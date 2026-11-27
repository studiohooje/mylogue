// 2026-11-27 메이트로그 사진: 서버에서도 위치·기기 정보(EXIF·XMP)를 한 번 더 지운다.
// 앱은 카메라→캔버스로 다시 그려 올려서 보통 없지만, 다른 경로로 들어온 사진도 막기 위해. 그림 데이터는 건드리지 않는다.
export function stripMeta(buf, type){
 const b = new Uint8Array(buf);
 if(type === 'image/jpeg') return stripJpeg(b);
 if(type === 'image/webp') return stripWebp(b);
 return b;
}
function stripJpeg(b){
 if(b[0] !== 0xFF || b[1] !== 0xD8) return b;
 const out = [b.subarray(0, 2)]; let i = 2;
 while(i + 4 <= b.length){
  if(b[i] !== 0xFF) return b; // 모르는 모양이면 그대로
  const m = b[i + 1];
  if(m === 0xDA){ out.push(b.subarray(i)); break; } // 그림 데이터 시작 → 나머지 그대로
  const len = (b[i + 2] << 8) | b[i + 3], end = i + 2 + len;
  if(len < 2 || end > b.length) return b;
  if(!(m === 0xE1 || m === 0xED)) out.push(b.subarray(i, end)); // APP1(EXIF·XMP)·APP13(IPTC) 빼기
  i = end;
 }
 const n = out.reduce((a, x) => a + x.length, 0), r = new Uint8Array(n); let o = 0; for(const x of out){ r.set(x, o); o += x.length; }
 return r;
}
const tag = (b, i) => String.fromCharCode(b[i], b[i + 1], b[i + 2], b[i + 3]);
function stripWebp(b){
 if(b.length < 12 || tag(b, 0) !== 'RIFF' || tag(b, 8) !== 'WEBP') return b;
 const out = []; let i = 12;
 while(i + 8 <= b.length){
  const t = tag(b, i), len = b[i + 4] | (b[i + 5] << 8) | (b[i + 6] << 16) | (b[i + 7] << 24), end = i + 8 + len + (len & 1);
  if(end > b.length) return b;
  if(t !== 'EXIF' && t !== 'XMP '){ const c = b.slice(i, end); if(t === 'VP8X') c[8] &= ~0x0C; out.push(c); } // VP8X의 EXIF·XMP 표시도 끔
  i = end;
 }
 const n = 12 + out.reduce((a, x) => a + x.length, 0), r = new Uint8Array(n);
 r.set(b.subarray(0, 12)); const size = n - 8; r[4] = size & 255; r[5] = (size >> 8) & 255; r[6] = (size >> 16) & 255; r[7] = (size >>> 24) & 255;
 let o = 12; for(const x of out){ r.set(x, o); o += x.length; }
 return r;
}
