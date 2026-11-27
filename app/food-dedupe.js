// 2026-11-27 음식 DB 중복 정리: 같은 제품이 '제조사명 + 이름'과 '이름'(제조사 칸 따로)로 두 줄 들어가
// 화면에선 똑같이 '기대식 저당 닭가슴살…'로 두 번 보였다(152묶음, 그중 저당 48). 같은 제조사·같은 이름·같은 단위·열량 차이 2% 이내면 한 줄만 남긴다.
// 남기는 줄: 출처가 더 믿을 만한 것(제품 라벨 p > 식약처 m …), 같으면 이름에 제조사가 안 붙은 줄. 빌드(build.mjs)가 앱에 넣기 전에 쓴다.
const RANK = {k: 0, e: 1, p: 2, d: 3, h: 3.5, r: 4, m: 5, f: 6, s: 7, x: 8};
const norm = t => String(t || '').toLocaleLowerCase('ko').replace(/[\s·()\-_/.,[\]]/g, '');
export function dedupeBrandRows(rows = []){
 const keyOf = r => { const b = norm(r[1]); let n = norm(r[0]); if(b && n.startsWith(b)) n = n.slice(b.length); return `${b}|${n}|${r[2] || ''}`; };
 const best = new Map();
 rows.forEach((r, i) => {
  const k = keyOf(r), j = best.get(k);
  if(j == null){ best.set(k, i); return; }
  const a = rows[j], ka = Number(a[4]) || 0, kb = Number(r[4]) || 0;
  if(Math.abs(ka - kb) > Math.max(ka, kb) * 0.02) return; // 열량이 다르면 다른 제품으로 보고 둘 다 둔다
  const score = x => (RANK[x[8]] ?? 9) * 10 + (norm(x[1]) && norm(x[0]).startsWith(norm(x[1])) ? 1 : 0);
  if(score(r) < score(a)) best.set(k, i);
 });
 const keep = new Set(best.values());
 // 열량이 달라 best에 못 든 줄도 남긴다
 rows.forEach((r, i) => { const k = keyOf(r); if(!keep.has(i)){ const a = rows[best.get(k)], ka = Number(a[4]) || 0, kb = Number(r[4]) || 0; if(Math.abs(ka - kb) > Math.max(ka, kb) * 0.02) keep.add(i); } });
 return rows.filter((_, i) => keep.has(i));
}
