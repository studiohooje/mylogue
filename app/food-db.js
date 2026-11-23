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
export function rowToFood(r){
 const [name, brand, unit, grams, kcal, carbs, protein, fat, tag, aliases, doubt, mic] = r;
 const micro = Array.isArray(mic) ? Object.fromEntries(['sugar','fiber','satFat','sodium'].map((k, i) => [k, mic[i]]).filter(([, v]) => v != null)) : {};
 const mass = !unit || MASS.has(unit);
 return {id:`fooddb:${tag}:${brand}|${name}|${unit}`, name:brand&&!String(name).startsWith(brand)?`${name} · ${brand}`:name, brand:brand||'', servingQty:mass?100:1, servingUnit:mass?(unit||'g'):unit, ...(grams&&!mass?{unitGrams:grams}:{}), calories:kcal, carbs, protein, fat, ...micro, aliases:String(aliases||'').split(' ').filter(Boolean), source:'food-db', dbTag:tag, dbLabel:TAG[tag]?.label||'', ...(doubt?{dbDoubt:true}:{}), aiEvidence:{source:TAG[tag]?.source||'', note:(mass?`100${unit||'g'}당`:`1${unit}${grams?` ${grams}${unit==='잔'||unit==='병'||unit==='캔'?'ml':'g'}`:''}당`)+(doubt?' · 수집 값 확인 필요(포장 라벨과 비교)':'')}, db:true};
}

const indexRow = r => { const text = [r[0], r[1], ...(String(r[9]||'').split(' '))].filter(Boolean); return {p:plain(text.join(' ')), k:text.map(t => keystrokes(t)).join('|'), c:text.map(t => choseong(t).replace(/\s/g,'')).join('|'), names:text}; };
export function setFoodRows(list){
 rows = Array.isArray(list) ? list : [];
 index = rows.map(indexRow);
 return rows.length;
}
// 4.17.0 첫 검색을 빠르게: 기본 음식(한식·식약처 음식·원재료, 약 6천 행)을 먼저 받고, 브랜드 메뉴는 뒤이어 덧붙인다.
export function addFoodRows(list){
 if(!Array.isArray(list) || !list.length) return rows?.length || 0;
 if(!rows) return setFoodRows(list);
 rows = rows.concat(list); index = index.concat(list.map(indexRow));
 return rows.length;
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
     get('food-db-more.json').then(more => { addFoodRows(more.rows); fullLoaded = true; try{ onMore?.(); }catch{} try{ globalThis.dispatchEvent?.(new Event('mylogue-fooddb-more')); }catch{} }).catch(() => {});
     return rows.length;
    }, () => get(url).then(j => { fullLoaded = true; return setFoodRows(j.rows); }))
  : get(url).then(j => { fullLoaded = true; return setFoodRows(j.rows); })
 ).catch(e => { loading = null; throw e; });
 return loading;
}

// 검색: 먼저 가볍게 걸러서(포함·자판·초성) 300개까지 점수를 매기고, 맞는 정도 → 출처 순위 → 짧은 이름 순
export function searchFoodDB(query, {limit=30}={}){
 const q = String(query||'').trim(); if(!rows || !q) return [];
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
export function findFoodDB(id){ if(!rows) return null; const r = rows.find(r => `fooddb:${r[8]}:${r[1]}|${r[0]}|${r[2]}` === id); return r ? rowToFood(r) : null; }

// 4.17.0 보안 점검 후속: 인기 집계에는 공개 DB에 있는 음식 이름만 올린다(자유 입력 이름은 개인 내용일 수 있음).
let nameSet = null, nameRows = null;
export function isPublicFoodName(name){
 if(!rows) return false;
 if(nameRows !== rows){ nameSet = new Set(); for(const r of rows){ nameSet.add(r[0]); if(r[1]) nameSet.add(`${r[0]} · ${r[1]}`); } nameRows = rows; }
 return nameSet.has(String(name||'').trim());
}
