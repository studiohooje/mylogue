// 2026-11-28 대표님: "업체 미제공이어도 대략값은 모든 음식에 들어가야 한다. 이빨 빠진 채로 확정처럼 들어가는 게 최악, 오차가 커도 추정치가 낫다."
// food-db.json에서 탄·단·지 중 빈 칸을 채운다. 열량은 모든 행에 있다.
// 방법: 영양이 다 있는 음식에서 '같은 가게 + 같은 종류' → '같은 종류' → '같은 가게' → 전체 순으로 열량 중 탄·단·지 비율(중앙값)을 구하고,
//       아는 값은 그대로 두고 남은 열량을 그 비율로 나눈다(탄 4·단 4·지 9 kcal/g). 채운 칸은 r[12]에 'c'·'p'·'f'로 표시(화면에 '추정'으로 보임).
// 실행: node tools/fill-macro-est.mjs  (다시 돌려도 이미 채운 칸은 원래 빈 칸으로 보고 다시 계산)
import fs from 'node:fs';
const file = new URL('../food-db.json', import.meta.url);
const db = JSON.parse(fs.readFileSync(file, 'utf8'));
// 2026-11-28 단백질 쉐이크(보충제)는 카페 스무디와 따로 — 같이 두면 공차 스무디가 단백질 40g으로 추정됐다
const KINDS = [['샐러드'],['샌드위치','서브','토스트','랩'],['버거'],['피자'],['치킨','닭','윙','텐더','너겟'],['감자','포테이토','프라이','웨지'],['아메리카노','에스프레소','콜드브루'],['라떼','카푸치노','모카','마끼아또','플랫화이트'],['프로틴','단백질','쉐이크','쉐이커'],['스무디','프라페','블렌디드','프라푸치노'],['에이드','주스','소다','콜라','사이다','탄산'],['밀크티','버블티','티','차'],['케이크','케익','티라미수','치즈케','롤'],['쿠키','머핀','스콘','도넛','베이글','빵','크로와상','크루아상','와플','브레드','파이'],['아이스크림','젤라또','빙수','요거트','파르페'],['떡볶이','떡'],['라면','국수','면','파스타','우동','짬뽕','짜장'],['덮밥','김밥','밥','볶음밥','리조또','도시락','오므라이스'],['탕','찌개','국','스프','수프'],['돈까스','까스','튀김','가스'],['족발','보쌈','삼겹','고기','갈비','스테이크','불고기'],['초콜릿','초코','캔디','젤리','과자','칩']];
const kindOfText = t => { const n = String(t || ''); for(let i = 0; i < KINDS.length; i++) if(KINDS[i].some(w => n.includes(w))) return i; return -1; };
// 이름에 종류가 없거나 '불고기'처럼 토핑 이름이면 가게 이름(미스터피자·교촌치킨) → 그 가게에 가장 많은 종류(bhc 뿌링클 → 치킨) 순으로 본다
const MEAT = KINDS.findIndex(k => k.includes('불고기'));
const brandMain = new Map();
{ const cnt = new Map(); for(const r of db.rows){ const k = kindOfText(r[0]); if(!r[1] || k < 0) continue; const m = cnt.get(r[1]) || new Map(); m.set(k, (m.get(k) || 0) + 1); cnt.set(r[1], m); } for(const [b, m] of cnt) brandMain.set(b, [...m].sort((x, y) => y[1] - x[1])[0][0]); }
const kindOf = (name, brand) => { const k = kindOfText(name); if(k >= 0 && k !== MEAT) return k; const bk = kindOfText(brand); if(bk >= 0) return bk; if(k >= 0) return k; return brand && brandMain.has(brand) ? brandMain.get(brand) : -1; };
const EST = 12;
const orig = (r, i) => (r[EST] && r[EST].includes('cpf'[i - 5])) ? null : r[i]; // 이전에 채운 값은 빈 칸으로 다시 본다
const complete = r => r[4] > 0 && [5, 6, 7].every(i => orig(r, i) != null);
const groups = new Map(), add = (k, s) => { if(!groups.has(k)) groups.set(k, []); groups.get(k).push(s); };
for(const r of db.rows){
 if(!complete(r)) continue;
 const e = r[5] * 4 + r[6] * 4 + r[7] * 9; if(e <= 0) continue;
 const s = [r[5] * 4 / e, r[6] * 4 / e, r[7] * 9 / e], k = kindOf(r[0], r[1]);
 add(`b:${r[1]}|${k}`, s); add(`k:${k}`, s); if(r[1]) add(`b:${r[1]}`, s); add('all', s);
}
const med = a => { const b = [...a].sort((x, y) => x - y); return b[b.length >> 1]; };
const share = (r) => { const k = kindOf(r[0], r[1]); for(const [key, min] of [[`b:${r[1]}|${k}`, 8], [k >= 0 ? `k:${k}` : null, 5], [r[1] ? `b:${r[1]}` : null, 8], ['all', 1]]){ const g = key && groups.get(key); if(g && g.length >= min) return [0, 1, 2].map(i => med(g.map(s => s[i]))); } };
const r1 = v => Math.max(0, Math.round(v * 10) / 10);
let filled = 0;
for(const r of db.rows){
 if(r[4] == null) continue;
 const v = [orig(r, 5), orig(r, 6), orig(r, 7)]; // 탄·단·지
 if(v.every(x => x != null)){ if(r[EST]) { r.length = EST; } continue; }
 const s = share(r), per = [4, 4, 9];
 const known = v.reduce((t, x, i) => t + (x != null ? x * per[i] : 0), 0), left = Math.max(0, r[4] - known);
 const miss = [0, 1, 2].filter(i => v[i] == null), w = miss.reduce((t, i) => t + s[i], 0) || 1;
 for(const i of miss) v[i] = r1(left * s[i] / w / per[i]);
 while(r.length < EST) r.push(r.length === 10 ? 0 : null);
 r[5] = v[0]; r[6] = v[1]; r[7] = v[2]; r[EST] = miss.map(i => 'cpf'[i]).join(''); filled++;
}
fs.writeFileSync(file, JSON.stringify(db));
console.log(`채운 음식 ${filled}개 / 전체 ${db.rows.length}개`);
