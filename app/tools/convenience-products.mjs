// 4.17.2 편의점 간편식(도시락·김밥·삼각김밥·주먹밥·샌드위치·버거·덮밥·볶음밥)을 식약처 가공식품 원본에서 골라 낸다.
// 검색 점검에서 '편의점도시락'·'혜자도시락'이 비던 문제를 메운다. 값은 식약처 원문 그대로.
// 고르는 규칙: 편의점 간편식 납품 공장(데리카·후레쉬·델리캡 계열 등)이 만든 즉석섭취·즉석조리식품 중 이름에 간편식 종류가 있는 것.
//  - 같은 제품을 여러 공장이 같은 이름으로 등록한다 → 이름(띄어쓰기·괄호 무시)으로 묶고 열량이 가운데인 것 하나.
//  - 1개 무게(내용량)가 80~800g인 것만(묶음·업소용 제외). 단위는 '1개'.
//  - 어느 편의점 상품인지 원본에 없으므로 브랜드는 '편의점'. 'GS25 혜자로운'처럼 널리 알려진 이름만 별칭으로.
// 실행: node tools/convenience-products.mjs → research_notes/.../products_popular/convenience.json
import fs from 'node:fs';
import path from 'node:path';
import readline from 'node:readline';
import {fileURLToPath} from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const BASE = path.resolve(HERE, '..', '..', 'research_notes', '마이로그 음식 데이터베이스');
const SRC = path.join(BASE, 'mfds', 'out', 'foods-processed.jsonl');

export const MAKER = /데리카|델리카|후레쉬|프레시|델리캡|지에프에스|롯데푸드|롯데부산CK|씨케이케이|그린키친|\(주\)대정|가온에프에스|현대푸드시스템/;
export const KIND = [
  [/삼각김밥/, '삼각김밥', '편의점 삼각김밥 삼김'],
  [/주먹밥/, '주먹밥', '편의점 주먹밥'],
  [/김밥/, '김밥', '편의점 편의점김밥'],
  [/도시락/, '도시락', '편의점 편의점도시락 편도 도시락'],
  [/샌드위치/, '샌드위치', '편의점 편의점샌드위치'],
  [/햄버거|버거/, '버거', '편의점 편의점버거 햄버거'],
  [/덮밥|컵밥/, '덮밥', '편의점 덮밥 컵밥'],
  [/볶음밥/, '볶음밥', '편의점 볶음밥'],
];
const norm = s => String(s || '').toLocaleLowerCase('ko').replace(/[\s·()\-_/.,[\]]/g, '');
// '혜자)햄구이도시락' → '혜자 햄구이도시락'
export const cleanName = s => String(s || '').replace(/^([가-힣A-Za-z0-9]+)\)\s*/, '$1 ').replace(/\s+/g, ' ').trim();
export function sizeOf(o){ const m = String(o.foodSize || '').match(/^([\d.]+)\s*(g|kg)$/i); return m ? Number(m[1]) * (/kg/i.test(m[2]) ? 1000 : 1) : 0; }
export function kindOf(name){ return KIND.find(k => k[0].test(name)) || null; }
export function aliasesOf(name){
  const k = kindOf(name); const out = k ? k[2].split(' ') : ['편의점'];
  if (/혜자/.test(name)) out.push('GS25', '지에스', '혜자도시락', '김혜자도시락');
  return [...new Set(out)];
}
export function accept(o){
  if (!MAKER.test(o.maker || '') || !kindOf(o.name) || /키트|토핑|업소|대용량|\d+입|절단/.test(o.name)) return false;
  if (!/즉석섭취|즉석조리/.test(o.cls?.lv6 || '')) return false;
  if (o.basis !== 'g' || !o.per100 || o.per100.kcal == null) return false;
  const g = sizeOf(o); return g >= 80 && g <= 800;
}

export async function pick(){
  const groups = new Map();
  const rl = readline.createInterface({input: fs.createReadStream(SRC, 'utf8'), crlfDelay: Infinity});
  for await (const line of rl) {
    if (!line || !MAKER.test(line)) continue;
    const o = JSON.parse(line);
    if (!accept(o)) continue;
    const key = norm(cleanName(o.name)) + '|' + sizeOf(o);
    (groups.get(key) || groups.set(key, []).get(key)).push(o);
  }
  return [...groups.values()].map(list => {
    const s = list.sort((a, b) => a.per100.kcal - b.per100.kcal);
    const o = s[Math.floor(s.length / 2)];
    return {target: cleanName(o.name), brand: '편의점', aliases: aliasesOf(o.name).join(' '), generic: true, whole: true, makers: list.length, ...o, name: cleanName(o.name)};
  });
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const rows = await pick();
  const by = {}; for (const r of rows) { const k = kindOf(r.name)[1]; by[k] = (by[k] || 0) + 1; }
  console.log('편의점 간편식', rows.length, by);
  const out = path.join(BASE, 'products_popular'); fs.mkdirSync(out, {recursive: true});
  fs.writeFileSync(path.join(out, 'convenience.json'), JSON.stringify({builtAt: new Date().toISOString().slice(0, 10), source: '식약처 식품영양성분DB(통합) 가공식품 15100066', rows}, null, 1));
}
