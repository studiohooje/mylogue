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
};
export const FOOD_DB_TAGS = TAG;
const plain = t => String(t||'').toLocaleLowerCase('ko').replace(/[\s·()\-_/.,[\]]/g,'');
let rows = null, index = null, loading = null;

// 행 → 음식 프리셋(앱의 db.foods 항목과 같은 모양, catalog·db 표시)
export function rowToFood(r){
 const [name, brand, unit, grams, kcal, carbs, protein, fat, tag, aliases] = r;
 const mass = !unit || MASS.has(unit);
 return {id:`fooddb:${tag}:${brand}|${name}|${unit}`, name:brand&&!String(name).startsWith(brand)?`${name} · ${brand}`:name, brand:brand||'', servingQty:mass?100:1, servingUnit:mass?(unit||'g'):unit, ...(grams&&!mass?{unitGrams:grams}:{}), calories:kcal, carbs, protein, fat, aliases:String(aliases||'').split(' ').filter(Boolean), source:'food-db', dbTag:tag, dbLabel:TAG[tag]?.label||'', aiEvidence:{source:TAG[tag]?.source||'', note:mass?`100${unit||'g'}당`:`1${unit}${grams?` ${grams}${unit==='잔'||unit==='병'||unit==='캔'?'ml':'g'}`:''}당`}, db:true};
}

export function setFoodRows(list){
 rows = Array.isArray(list) ? list : [];
 index = rows.map(r => { const text = [r[0], r[1], ...(String(r[9]||'').split(' '))].filter(Boolean); return {p:plain(text.join(' ')), k:text.map(t => keystrokes(t)).join('|'), c:text.map(t => choseong(t).replace(/\s/g,'')).join('|'), names:text}; });
 return rows.length;
}
export const foodDBReady = () => !!rows;
export const foodDBSize = () => rows?.length || 0;

export function loadFoodDB({url='food-db.json', fetcher=globalThis.fetch}={}){
 if(rows) return Promise.resolve(rows.length);
 if(!loading) loading = fetcher(url).then(r => { if(!r.ok) throw Error(`음식 DB를 받지 못했어요(${r.status}).`); return r.json(); }).then(j => setFoodRows(j.rows)).catch(e => { loading = null; throw e; });
 return loading;
}

// 검색: 먼저 가볍게 걸러서(포함·자판·초성) 300개까지 점수를 매기고, 맞는 정도 → 출처 순위 → 짧은 이름 순
export function searchFoodDB(query, {limit=30}={}){
 const q = String(query||'').trim(); if(!rows || !q) return [];
 const qp = plain(q), qk = keystrokes(q), qh = /[a-z]/i.test(q) ? keystrokes(q, {latinAsHangul:true}) : '', qc = q.replace(/\s/g,'');
 const onlyCons = /^[ㄱ-ㅎ]+$/.test(qc);
 const hits = [];
 for(let i = 0; i < rows.length && hits.length < 300; i++){
  const x = index[i];
  if((qp && x.p.includes(qp)) || (qk.length >= 2 && x.k.includes(qk)) || (qh.length >= 2 && x.k.includes(qh)) || (onlyCons && x.c.includes(qc))) hits.push(i);
 }
 return hits.map(i => ({i, s:matchScore(q, index[i].names)})).filter(h => h.s > 0)
  .sort((a, b) => b.s - a.s || (TAG[rows[a.i][8]]?.rank ?? 9) - (TAG[rows[b.i][8]]?.rank ?? 9) || rows[a.i][0].length - rows[b.i][0].length)
  .slice(0, limit).map(h => rowToFood(rows[h.i]));
}
export function findFoodDB(id){ if(!rows) return null; const r = rows.find(r => `fooddb:${r[8]}:${r[1]}|${r[0]}|${r[2]}` === id); return r ? rowToFood(r) : null; }
