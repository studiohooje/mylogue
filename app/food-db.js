// 음식 DB 검색(앱 안, 서버 없음): food-db.json(식약처 음식·원재료, 한식 대표 1회분, 제품 라벨·프랜차이즈)을 처음 검색할 때 한 번 받아 둔다.
// 결과는 앱의 음식 프리셋 계약과 같다: 단위가 g·ml이면 100당, 그 밖은 1단위당. 빈 값은 null.
import {keystrokes, choseong, matchScore} from './suggest.js';
import {MASS} from './domain.js';

const TAG = {
 k:{label:'한식 대표', rank:0, source:'한식 대표 1회분(식약처·농진청 근거)'},
 e:{label:'한식 추정', rank:1, source:'한식 대표(밀도 1.0 g/ml 환산 추정)'},
 p:{label:'제품 라벨', rank:2, source:'제조사 라벨'},
 d:{label:'식약처', rank:3, source:'식약처 식품영양성분DB(음식)'},
 r:{label:'원재료', rank:4, source:'국가표준식품성분표(원재료)'},
 m:{label:'제품', rank:5, source:'식약처 식품영양성분DB(가공식품)'},
 f:{label:'외식', rank:6, source:'프랜차이즈 공개 영양정보'},
 s:{label:'공개 자료', rank:7, source:'프랜차이즈 매장 게시물·공식 발표 보도·한국소비자원 시험'},
 h:{label:'집밥 표준', rank:3.5, source:'집밥 표준 레시피 — 재료 g로 계산(재료값: 국가표준식품성분표·식약처 가공식품 중앙값), 1인분 분량은 추정'},
 x:{label:'추정', rank:8, source:'공식 값 없음 — 비슷한 음식·브랜드 평균으로 계산한 추정'},
};
export const FOOD_DB_TAGS = TAG;
const plain = t => String(t||'').toLocaleLowerCase('ko').replace(/[\s·()\-_/.,[\]]/g,'');
let rows = null, index = null, loading = null;

// 행 → 음식 프리셋(앱의 db.foods 항목과 같은 모양, catalog·db 표시)
const UNIT_FIX = {'G':'잔','1인용':'인분','인용':'인분','인':'인분','중간접시':'접시','-count':'인분','총':'봉','약':'개','g당':'회','일':'회','세트':'판','파티':'판','패밀리':'판','베이스':'인분','테이블스푼':'큰술','cm':'개','oz':'잔','매':'장','½스쿱':'스쿱','갑':'개','회분':'회','영양정보':'봉','닭가슴살':'개'};
// 2026-11-27 대표님: 식사 줄에서 음식끼리 '·'로 나누는데 '쏙 빠진 무뼈족발 · 엉파'처럼 제조사도 '·'라 헷갈림 → 제조사를 앞에('엉파 쏙 빠진 무뼈족발'), 이름 안의 '·'(피자 도우·크기 등)도 띄어쓰기로
export const brandedName = (name, brand) => { const n = String(name || '').replace(/ · /g, ' ').trim(); return brand && !n.startsWith(brand) ? `${brand} ${n}` : n; };
// 2026-11-28 대표님: 검색 결과를 눌러도 '음식을 찾지 못했습니다' — 찾을 때 단위 고치기(UNIT_FIX)를 빼먹어 id가 달랐다. 만들 때와 찾을 때 같은 id를 쓴다.
export const rowId = r => `fooddb:${r[8]}:${r[1]}|${r[0]}|${UNIT_FIX[r[2]] || r[2]}`;
// 2026-11-28 대표님: 서브웨이 샌드위치는 15cm·30cm 기준으로(원본은 15cm 값, 단위 'cm') → 두 줄로 나눠 30cm는 두 배
const dbl = v => v == null ? v : Math.round(v * 20) / 10;
const splitCm = list => list.flatMap(r => r[2] !== 'cm' ? [r] : [[`${r[0]} 15cm`, r[1], '개', ...r.slice(3)], [`${r[0]} 30cm`, r[1], '개', dbl(r[3]), dbl(r[4]), dbl(r[5]), dbl(r[6]), dbl(r[7]), ...r.slice(8, 11), Array.isArray(r[11]) ? r[11].map(dbl) : r[11], ...r.slice(12)]]);
// 2026-11-28 대표님: 크기만 다른 메뉴(서브웨이 15·30cm, 피자 R·L, 카페 톨·그란데·벤티)는 목록에 한 줄, 양 고를 때 크기를 고른다
const SIZES = [['15cm','15cm'],['30cm','30cm'],['숏','숏|Short|SHORT'],['톨','톨|Tall|TALL'],['그란데','그란데|Grande|GRANDE'],['벤티','벤티|Venti|VENTI'],['S','스몰(?:\\s*\\(S\\))?|Small|\\(S\\)|S'],['R','레귤러(?:\\s*\\(R\\))?|Regular|\\(R\\)|R'],['M','미디엄(?:\\s*\\(M\\))?|Medium|\\(M\\)|M'],['L','라지(?:\\s*\\(L\\))?|Large|\\(L\\)|L'],['F','패밀리(?:\\s*\\(F\\))?|Family|\\(F\\)|F']];
const SIZE_RE = SIZES.map(([k, a]) => [k, new RegExp(`(?:^|\\s)(?:${a})(?=\\s|$)|\\((?:${a})\\)`)]);
const MAIN = ['15cm','톨','R','M','L','그란데','벤티','F','S','숏','30cm']; // 검색 목록에 대표로 보일 크기
export const sizeOf = name => { const n = String(name || ''), hit = SIZE_RE.filter(([, re]) => re.test(n)); if(hit.length !== 1) return null; const [k, re] = hit[0]; return {label: k, base: n.replace(re, ' ').replace(/\s+/g, ' ').trim()}; };
const groups = new Map(); // 가게|크기 뺀 이름|단위 → {크기: id}
const groupKey = (r, base) => `${r[1]}|${base}|${UNIT_FIX[r[2]] || r[2]}`;
const expandRows = list => { const out = splitCm(list); for(const r of out){ const z = r[1] && sizeOf(r[0]); if(z){ const k = groupKey(r, z.base), g = groups.get(k) || {}; g[z.label] ??= rowId(r); groups.set(k, g); } } return out; };
// 2026-11-28 대표님: 목록엔 한 줄, 양 고를 때 '15cm 1개 · 30cm 1개'처럼 크기를 고른다 → 크기별 id를 음식에 붙임
const sizeInfo = r => { const z = r[1] && sizeOf(r[0]); const g = z && groups.get(groupKey(r, z.base)); if(!g || Object.keys(g).length < 2) return {}; const ids = Object.fromEntries(SIZES.map(([k]) => k).filter(k => g[k]).map(k => [k, g[k]])); return {size: z.label, sizeIds: ids, sizeMain: MAIN.find(k => ids[k])}; };
export function rowToFood(r){
 const [name, brand, unit0, grams, kcal, carbs, protein, fat, tag, aliases, doubt, mic, est0] = r;
 /* 2026-11-28 업체가 안 준 탄·단·지는 비슷한 음식 비율로 채워 둠(tools/fill-macro-est.mjs) — '탄·지 추정'처럼 어느 값인지 */const est = est0 ? [...est0].map(k => ({c:'탄', p:'단', f:'지'})[k]).join('·') : '';
 /* 5.1.0 음식 단위 검수: 원본에 섞인 이상한 단위 표기를 사람이 읽는 단위로('1인용'·'총'·'G'·'-count' 등 110개) */const unit = UNIT_FIX[unit0] || unit0;
 const micro = Array.isArray(mic) ? Object.fromEntries(['sugar','fiber','satFat','sodium'].map((k, i) => [k, mic[i]]).filter(([, v]) => v != null)) : {};
 const mass = !unit || MASS.has(unit);
 return {id:rowId(r), name:brandedName(name, brand), brand:brand||'', servingQty:mass?100:1, servingUnit:mass?(unit||'g'):unit, ...(grams&&!mass?{unitGrams:grams}:{}), calories:kcal, carbs, protein, fat, ...micro, aliases:String(aliases||'').split(' ').filter(Boolean), source:'food-db', dbTag:tag, dbLabel:TAG[tag]?.label||'', ...(doubt===2?{dbMaybeGone:true}:doubt?{dbDoubt:true}:{}), aiEvidence:{source:TAG[tag]?.source||'', note:(mass?`100${unit||'g'}당`:`1${unit}${grams?` ${grams}${unit==='잔'||unit==='병'||unit==='캔'?'ml':'g'}`:''}당`)+(doubt?' · 수집 값 확인 필요(포장 라벨과 비교)':'')+(est?` · ${est}은 업체 미제공이라 비슷한 음식으로 추정`:'')}, ...(est?{macroEst:est}:{}), ...sizeInfo(r), db:true};
}

// 5.0.5 '(집밥)' 같은 꼬리표가 붙은 이름도 꼬리표 없는 이름으로 똑같이 찾히게(돼지불고기 → 돼지불고기(집밥))
const indexRow = r => { const base = String(r[0]||'').replace(/\(집밥\)$/, '').trim(); const text = [r[0], base !== r[0] ? base : '', r[1], ...(String(r[9]||'').split(' '))].filter(Boolean); return {p:plain(text.join(' ')), k:text.map(t => keystrokes(t)).join('|'), c:text.map(t => choseong(t).replace(/\s/g,'')).join('|'), names:text}; };
export function setFoodRows(list){
 rows = Array.isArray(list) ? expandRows(list) : [];
 index = rows.map(indexRow);
 return rows.length;
}
// 4.17.0 첫 검색을 빠르게: 기본 음식(한식·식약처 음식·원재료, 약 6천 행)을 먼저 받고, 브랜드 메뉴는 뒤이어 덧붙인다.
export function addFoodRows(list){
 if(!Array.isArray(list) || !list.length) return rows?.length || 0;
 if(!rows) return setFoodRows(list);
 list = expandRows(list); rows = rows.concat(list); index = index.concat(list.map(indexRow));
 return rows.length;
}
// 5.0.6 속도: 브랜드 메뉴 3.9만 행 색인을 한 번에 만들면 폰에서 0.5초쯤 화면이 멈췄다(하필 검색어를 치는 중에).
// 2,000행씩 나눠 만들고 사이사이 화면에 양보한다. 다 붙기 전 검색은 지금까지 붙은 행에서만.
export function addFoodRowsChunked(list, size = 2000){
 if(!Array.isArray(list) || !list.length) return Promise.resolve(rows?.length || 0);
 if(!rows) setFoodRows([]);
 list = expandRows(list);
 return new Promise(resolve => {
  let i = 0;
  const step = () => {
   const part = list.slice(i, i + size); i += size;
   rows = rows.concat(part); index = index.concat(part.map(indexRow));
   if(i < list.length) (globalThis.requestIdleCallback ? requestIdleCallback(step, {timeout: 200}) : setTimeout(step, 16)); else resolve(rows.length);
  };
  step();
 });
}
let fullLoaded = false;
export const foodDBFull = () => fullLoaded;
export const foodDBReady = () => !!rows;
export const foodDBSize = () => rows?.length || 0;
export const foodRows = () => rows || []; // 4.17.0 '오늘 뭐 먹지' 후보 탐색용(읽기 전용)

// 빌드본(dist)에는 food-db-core.json·food-db-more.json이 있고, 원본 폴더에서는 food-db.json 하나로 받는다.
// onMore: 브랜드 메뉴까지 다 붙었을 때 한 번 부른다(검색 결과 다시 그리기용).
export function loadFoodDB({url='food-db.json', fetcher=globalThis.fetch, onMore=null}={}){
 if(rows) return Promise.resolve(rows.length);
 const get = u => fetcher(u).then(r => { if(!r.ok) throw Object.assign(Error(`음식 DB를 받지 못했어요(${r.status}).`), {status:r.status}); return r.json(); });
 if(!loading) loading = (url === 'food-db.json'
  ? get('food-db-core.json').then(core => {
     setFoodRows(core.rows);
     get('food-db-more.json').then(more => addFoodRowsChunked(more.rows)).then(() => { fullLoaded = true; try{ onMore?.(); }catch{} try{ globalThis.dispatchEvent?.(new Event('mylogue-fooddb-more')); }catch{} }).catch(() => {});
     return rows.length;
    }, () => get(url).then(j => { fullLoaded = true; return setFoodRows(j.rows); }))
  : get(url).then(j => { fullLoaded = true; return setFoodRows(j.rows); })
 ).catch(e => { loading = null; throw e; });
 return loading;
}

// 검색: 먼저 가볍게 걸러서(포함·자판·초성) 300개까지 점수를 매기고, 맞는 정도 → 출처 순위 → 짧은 이름 순
// 4.17.2 영어로 친 흔한 음식 이름(한/영 자판 실수가 아닌 진짜 영어)은 한국어 이름으로도 찾는다
const EN = {salad:'샐러드', chicken:'치킨', pizza:'피자', coffee:'커피', americano:'아메리카노', latte:'라떼', bread:'빵', rice:'밥', egg:'계란', milk:'우유', beer:'맥주', soju:'소주', wine:'와인', banana:'바나나', apple:'사과', ramen:'라면', ramyeon:'라면', kimchi:'김치', kimbap:'김밥', gimbap:'김밥', burger:'버거', hamburger:'햄버거', sandwich:'샌드위치', steak:'스테이크', pasta:'파스타', tteokbokki:'떡볶이', bibimbap:'비빔밥', yogurt:'요거트', tofu:'두부', cola:'콜라', coke:'콜라',
 // 4.28.0 밤샘 A-6(전수검사 F-07): 두 낱말 영어·제품명, 흔한 줄임말
 'chicken breast':'닭가슴살', 'chicken breasts':'닭가슴살', 'coke zero':'코카콜라 제로', 'pepsi zero':'펩시 제로', 'big mac':'빅맥', 'sweet potato':'고구마', 'greek yogurt':'그릭요거트', 'protein bar':'프로틴바', 'protein shake':'프로틴 쉐이크', protein:'프로틴', oatmeal:'오트밀', oats:'오트밀', avocado:'아보카도', salmon:'연어', tuna:'참치', beef:'소고기', pork:'돼지고기', noodle:'국수', noodles:'국수', dumpling:'만두', dumplings:'만두', 'fried chicken':'후라이드치킨', 'ice cream':'아이스크림', donut:'도넛', bagel:'베이글', croissant:'크루아상', cereal:'시리얼', almond:'아몬드', nuts:'견과', cheese:'치즈', ham:'햄', bacon:'베이컨', sausage:'소시지', 'egg white':'달걀흰자', bmt:'이탈리안 비엠티'};
// 한국어 동의어: 이 말로 찾으면 그 말로도 찾는다
const SYN = {계란:'달걀', 달걀:'계란', 참치캔:'참치', 닭가슴:'닭가슴살', 고구마말랭이:'고구마', 아아:'아이스 아메리카노', 뜨아:'아메리카노', 프로틴:'단백질', 단백질쉐이크:'프로틴', 콜라제로:'제로 콜라', 제로콜라:'콜라 제로'};
export function searchFoodDB(query, {limit=30}={}){
 const q = String(query||'').trim(), low = q.toLowerCase().replace(/\s+/g, ' '), en = EN[low], syn = SYN[q.replace(/\s/g, '')];
 const seen = new Set(), uniq = list => list.filter(f => !seen.has(f.id) && seen.add(f.id));
 let out = uniq([...(en ? searchOne(en, limit) : []), ...searchOne(q, limit), ...(syn ? searchOne(syn, limit) : [])]);
 // 4.28.0 밤샘 A-6: 결과가 거의 없고 한글 세 글자 이상이면 한 글자 오타(닭가슴쌀·김치찌게)를 너그럽게 — 한 글자를 빼고 찾은 뒤 비슷한 순으로
 if(out.length < 3 && /^[가-힣\s]{3,12}$/.test(q)) out = [...out, ...uniq(typoSearch(q.replace(/\s/g, ''), limit))];
 // 크기는 양 고르기에서: 검색어에 크기를 쓰지 않았으면 대표 크기 한 줄만
 const asked = sizeOf(q)?.label || (/30/.test(q) ? '30cm' : '');
 out = uniq2(out.map(f => !f.sizeIds || f.size === f.sizeMain || f.size === asked ? f : (findFoodDB(f.sizeIds[f.sizeMain]) || f)));
 return out.slice(0, limit);
}
const uniq2 = list => { const seen = new Set(); return list.filter(f => !seen.has(f.id) && seen.add(f.id)); };
function typoSearch(q, limit){
 const cand = new Map();
 for(let k = 0; k < q.length; k++){
  // 틀린 글자를 빼고 앞·뒤 조각을 각각 포함하는 이름(낱말 여러 개 검색과 같은 방식)
  const part = [q.slice(0, k), q.slice(k + 1)].filter(Boolean).join(' ');
  if(part.replace(/\s/g, '').length < 2) continue;
  for(const f of searchOne(part, 20)){ const n = String(f.brand && f.name.startsWith(f.brand + ' ') ? f.name.slice(f.brand.length + 1) : f.name).replace(/\s/g, ''); /* 2026-11-27 앞에 붙은 제조사는 빼고 오타 비교 */ if(Math.abs(n.length - q.length) > 6) continue; const d = editDistance(q, n.slice(0, q.length)); if(d <= 1) cand.set(f.id, {f, d}); }
 }
 return [...cand.values()].sort((a, b) => a.d - b.d).map(x => x.f).slice(0, limit);
}
function editDistance(a, b){ const m = a.length, n = b.length, d = Array.from({length: m + 1}, (_, i) => [i, ...Array(n).fill(0)]); for(let j = 1; j <= n; j++) d[0][j] = j; for(let i = 1; i <= m; i++) for(let j = 1; j <= n; j++) d[i][j] = Math.min(d[i-1][j] + 1, d[i][j-1] + 1, d[i-1][j-1] + (a[i-1] === b[j-1] ? 0 : 1)); return d[m][n]; }
function searchOne(q, limit){
 if(!rows || !q) return [];
 const qp = plain(q), qk = keystrokes(q), qh = /[a-z]/i.test(q) ? keystrokes(q, {latinAsHangul:true}) : '', qc = q.replace(/\s/g,'');
 const onlyCons = /^[ㄱ-ㅎ]+$/.test(qc), words = q.split(/\s+/).map(plain).filter(Boolean);
 const hits = [];
 for(let i = 0; i < rows.length && hits.length < 300; i++){
  const x = index[i];
  if((qp && x.p.includes(qp)) || (qk.length >= 2 && x.k.includes(qk)) || (qh.length >= 2 && x.k.includes(qh)) || (onlyCons && x.c.includes(qc)) || (words.length > 1 && words.every(w => x.p.includes(w)))) hits.push(i);
 }
 // 여러 낱말('bhc 뿌링클', '기영이 저당 양념')은 순서와 상관없이 낱말마다 맞으면 찾는다(가장 약한 낱말 점수 × 0.9)
 const score = i => { const s = matchScore(q, index[i].names); if(s > 0 || words.length < 2) return s; const each = words.map(w => matchScore(w, index[i].names)); return Math.min(...each) > 0 ? Math.round(Math.min(...each) * 0.9) : 0; };
 return hits.map(i => ({i, s:score(i)})).filter(h => h.s > 0)
  .sort((a, b) => b.s - a.s || (rows[a.i][10] ? 1 : 0) - (rows[b.i][10] ? 1 : 0) || (TAG[rows[a.i][8]]?.rank ?? 9) - (TAG[rows[b.i][8]]?.rank ?? 9) || rows[a.i][0].length - rows[b.i][0].length)
  .slice(0, limit).map(h => rowToFood(rows[h.i]));
}
export function findFoodDB(id){ if(!rows) return null; const r = rows.find(r => rowId(r) === id); return r ? rowToFood(r) : null; }

// 4.17.0 보안 점검 후속: 인기 집계에는 공개 DB에 있는 음식 이름만 올린다(자유 입력 이름은 개인 내용일 수 있음).
let nameSet = null, nameRows = null;
export function isPublicFoodName(name){
 if(!rows) return false;
 if(nameRows !== rows){ nameSet = new Set(); for(const r of rows){ nameSet.add(r[0]); if(r[1]) nameSet.add(`${r[0]} · ${r[1]}`); } nameRows = rows; }
 return nameSet.has(String(name||'').trim());
}
