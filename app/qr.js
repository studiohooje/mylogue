// 4.0.0 초대 링크용 작은 QR 생성기(바이트 모드, 오류 정정 M, 버전 1~10). 외부 서비스·라이브러리 없이 앱 안에서 그린다.
// 표준(ISO/IEC 18004) 절차: 데이터 비트 → 리드-솔로몬 → 블록 섞기 → 고정 패턴 → 지그재그 배치 → 마스크 → 형식 정보.
const ECC_M = [0,10,16,26,18,24,16,18,22,22,26];   // 블록당 오류 정정 코드워드
const BLOCKS_M = [0,1,1,1,2,2,4,4,4,5,5];          // 블록 수
const bit = (x, i) => ((x >>> i) & 1) !== 0;
const rawModules = v => { let r = (16*v + 128)*v + 64; if(v>=2){ const n = Math.floor(v/7) + 2; r -= (25*n - 10)*n - 55; if(v>=7) r -= 36; } return r; };
const dataCodewords = v => Math.floor(rawModules(v)/8) - ECC_M[v]*BLOCKS_M[v];
function gmul(x, y){ let z = 0; for(let i=7; i>=0; i--){ z = (z<<1) ^ ((z>>>7)*0x11D); z ^= ((y>>>i)&1)*x; } return z & 0xFF; }
function rsDivisor(deg){ const r = new Array(deg).fill(0); r[deg-1] = 1; let root = 1; for(let i=0; i<deg; i++){ for(let j=0; j<r.length; j++){ r[j] = gmul(r[j], root); if(j+1<r.length) r[j] ^= r[j+1]; } root = gmul(root, 2); } return r; }
function rsRemainder(data, div){ const r = div.map(() => 0); for(const b of data){ const f = b ^ r.shift(); r.push(0); div.forEach((c, i) => { r[i] ^= gmul(c, f); }); } return r; }
function alignPos(v, size){ if(v===1) return []; const n = Math.floor(v/7) + 2, step = Math.ceil((v*4 + 4)/(n*2 - 2))*2, out = [6]; for(let p = size-7; out.length<n; p -= step) out.splice(1, 0, p); return out; }

export function qrMatrix(text){
 const bytes = [...new TextEncoder().encode(String(text))];
 let v = 1; for(; v<=10; v++){ const cap = dataCodewords(v)*8, need = 4 + (v<10?8:16) + bytes.length*8; if(need<=cap) break; }
 if(v>10) throw Error('QR에 넣기엔 너무 길어요.');
 // 데이터 비트
 const bits = []; const push = (val, len) => { for(let i=len-1; i>=0; i--) bits.push((val>>>i)&1); };
 push(4, 4); push(bytes.length, v<10?8:16); bytes.forEach(b => push(b, 8));
 const cap = dataCodewords(v)*8; push(0, Math.min(4, cap-bits.length)); push(0, (8 - bits.length%8)%8);
 for(let pad = 0xEC; bits.length<cap; pad ^= 0xEC ^ 0x11) push(pad, 8);
 const data = []; for(let i=0; i<bits.length; i+=8) data.push(bits.slice(i, i+8).reduce((a, b) => (a<<1)|b, 0));
 // 오류 정정 + 블록 섞기
 const nb = BLOCKS_M[v], ecl = ECC_M[v], raw = Math.floor(rawModules(v)/8), nShort = nb - raw%nb, shortLen = Math.floor(raw/nb), div = rsDivisor(ecl), blocks = [];
 for(let i=0, k=0; i<nb; i++){ const d = data.slice(k, k + shortLen - ecl + (i<nShort?0:1)); k += d.length; const e = rsRemainder(d, div); if(i<nShort) d.push(0); blocks.push(d.concat(e)); }
 const cw = []; for(let i=0; i<blocks[0].length; i++) blocks.forEach((b, j) => { if(i!==shortLen-ecl || j>=nShort) cw.push(b[i]); });
 // 고정 패턴
 const size = v*4 + 17, m = [...Array(size)].map(() => new Array(size).fill(false)), fn = [...Array(size)].map(() => new Array(size).fill(false));
 const set = (x, y, d) => { m[y][x] = d; fn[y][x] = true; };
 for(let i=0; i<size; i++){ set(6, i, i%2===0); set(i, 6, i%2===0); }
 for(const [cx, cy] of [[3,3], [size-4,3], [3,size-4]]) for(let dy=-4; dy<=4; dy++) for(let dx=-4; dx<=4; dx++){ const x = cx+dx, y = cy+dy; if(x>=0 && x<size && y>=0 && y<size){ const dist = Math.max(Math.abs(dx), Math.abs(dy)); set(x, y, dist!==2 && dist!==4); } }
 const ap = alignPos(v, size), last = ap.length-1;
 ap.forEach((ax, i) => ap.forEach((ay, j) => { if((i===0&&j===0) || (i===0&&j===last) || (i===last&&j===0)) return; for(let dy=-2; dy<=2; dy++) for(let dx=-2; dx<=2; dx++) set(ax+dx, ay+dy, Math.max(Math.abs(dx), Math.abs(dy))!==1); }));
 const drawFormat = mask => { const d = (0<<3)|mask; let r = d; for(let i=0; i<10; i++) r = (r<<1) ^ ((r>>>9)*0x537); const b = ((d<<10)|r) ^ 0x5412;
  for(let i=0; i<=5; i++) set(8, i, bit(b, i)); set(8, 7, bit(b, 6)); set(8, 8, bit(b, 7)); set(7, 8, bit(b, 8)); for(let i=9; i<15; i++) set(14-i, 8, bit(b, i));
  for(let i=0; i<8; i++) set(size-1-i, 8, bit(b, i)); for(let i=8; i<15; i++) set(8, size-15+i, bit(b, i)); set(8, size-8, true); };
 drawFormat(0);
 if(v>=7){ let r = v; for(let i=0; i<12; i++) r = (r<<1) ^ ((r>>>11)*0x1F25); const b = (v<<12)|r; for(let i=0; i<18; i++){ const c = bit(b, i), a = size-11+i%3, bb = Math.floor(i/3); set(a, bb, c); set(bb, a, c); } }
 // 지그재그 배치
 let k = 0;
 for(let right=size-1; right>=1; right-=2){ if(right===6) right = 5; for(let vert=0; vert<size; vert++) for(let j=0; j<2; j++){ const x = right-j, up = ((right+1)&2)===0, y = up ? size-1-vert : vert; if(!fn[y][x] && k<cw.length*8){ m[y][x] = bit(cw[k>>>3], 7-(k&7)); k++; } } }
 // 마스크: 간단한 벌점(연속·2×2·명암 비율)이 가장 낮은 것
 const masks = [(x,y)=>(x+y)%2===0, (x,y)=>y%2===0, (x,y)=>x%3===0, (x,y)=>(x+y)%3===0, (x,y)=>(Math.floor(x/3)+Math.floor(y/2))%2===0, (x,y)=>x*y%2+x*y%3===0, (x,y)=>(x*y%2+x*y%3)%2===0, (x,y)=>((x+y)%2+x*y%3)%2===0];
 const apply = i => { for(let y=0; y<size; y++) for(let x=0; x<size; x++) if(!fn[y][x] && masks[i](x, y)) m[y][x] = !m[y][x]; };
 const penalty = () => { let p = 0, dark = 0; for(let y=0; y<size; y++){ let run = 1, runC = 1; for(let x=0; x<size; x++){ if(m[y][x]) dark++; if(x>0){ if(m[y][x]===m[y][x-1]){ run++; if(run===5) p += 3; else if(run>5) p++; } else run = 1; if(m[x][y]===m[x-1][y]){ runC++; if(runC===5) p += 3; else if(runC>5) p++; } else runC = 1; } if(x<size-1 && y<size-1 && m[y][x]===m[y][x+1] && m[y][x]===m[y+1][x] && m[y][x]===m[y+1][x+1]) p += 3; } } return p + Math.floor(Math.abs(dark*20 - size*size*10)/(size*size))*10; };
 let best = 0, bestP = Infinity;
 for(let i=0; i<8; i++){ apply(i); drawFormat(i); const p = penalty(); if(p<bestP){ bestP = p; best = i; } apply(i); }
 apply(best); drawFormat(best);
 return m;
}
