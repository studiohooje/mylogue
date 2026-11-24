// 4.28.0 밤샘 A-2: 단위 칸에 크기·도우 이름(Tall·Large·L·EX·크림치즈·치즈캡…)이 들어간 프랜차이즈 행을 정리한다.
// 값(열량·탄단지·무게)은 바꾸지 않는다. 단위만 일반 단위(잔·조각·판·개)로 바꾸고, 크기 이름이 이름에 없으면 '(크기)'로 붙인다.
// 뜻이 분명하지 않은 단위(cm·oz·회분·영양정보·g당·-count 등)는 바꾸지 않고 후보 표에만 남긴다.
// 실행: node tools/unit-normalize.mjs → 현재 food-db.json에 적용 + research_notes/night/A2/unit-fix.csv·unit-left.csv
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
export const OK_UNITS = new Set(['개', '회', 'g', 'ml', '잔', '인분', '팩', '통', '판', '그릇', '병', '봉', '봉지', '캔', '조각', '스푼', '포', '스쿱', '줄', '접시', '공기', '토막', '컵', '장', '매', '세트', '갑', '테이블스푼', '티스푼', '마리', '알', '쪽', '숟가락', '덩이', '송이', '꼬치']);
const DRINK_SIZE = new Set(['L', 'EX', 'Tall', 'Large', 'Standard', 'Regular', 'ICE', 'HOT', 'Grande', 'Venti', 'Short', 'Solo', 'Single', 'Double', 'Small', 'Grand', 'Jumbo', 'R', 'M', '레귤러', '라지', '싱글레귤러']);
const PIZZA_EDGE = new Set(['크림치즈', '치즈캡', '시그니처', '오리진', '골드', '에그타르트', '노엣지', '시그니처L', '시그니처M', '씬크러스트L', '씬크러스트M', '오리진L', '오리진M', '치즈캡L', '치즈캡M', '골드L', '골드M', '라지', '패밀리', '파티', 'R', 'L', 'Large']);
const PIZZA_BRAND = /피자|파파존스|피자헛|도미노|알볼로|미스터피자|7번가/;
const NOT_DRINK = /프라이|fries|치킨|버거|샌드|너겟|윙|텐더|핫도그|바이트|케이크|쿠키|베이글/i;
export function normalizeUnit(r) {
 const [name, brand, unit, grams] = r;
 if (OK_UNITS.has(unit) || r[8] !== 'f') return null;
 const label = unit, has = name.includes(label) || name.includes(`(${label})`);
 let to = null;
 const pizza = PIZZA_BRAND.test(`${brand} ${name}`) && !NOT_DRINK.test(name) && !/음료|콜라|사이다|에이드/.test(name);
 if (pizza && (PIZZA_EDGE.has(label) || DRINK_SIZE.has(label))) to = grams > 0 && grams < 300 ? '조각' : grams >= 300 ? '판' : null;
 else if (DRINK_SIZE.has(label) && /배스킨|아이스크림/.test(`${brand} ${name}`) && !/쉐이크|커피|라떼|음료/.test(name)) to = '컵';
 else if (DRINK_SIZE.has(label) && !NOT_DRINK.test(name)) to = '잔';
 else if (DRINK_SIZE.has(label) && NOT_DRINK.test(name)) to = '개';
 else if (label === '토핑' || label === '추가') to = '회';
 if (!to) return null;
 return {from: label, to, name: has ? name : `${name} (${label})`};
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
 const APP = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'), file = path.join(APP, 'food-db.json'), OUT = path.resolve(APP, '..', 'research_notes', 'night', 'A2');
 const db = JSON.parse(fs.readFileSync(file, 'utf8')), done = [], left = {};
 for (const r of db.rows) {
  const f = normalizeUnit(r);
  if (f) { done.push([r[1], r[0], f.from, f.to, f.name, r[3], r[4]]); r[0] = f.name; r[2] = f.to; continue; }
  if (!OK_UNITS.has(r[2])) (left[r[2]] ||= []).push(`${r[1]} ${r[0]}`);
 }
 fs.writeFileSync(file, JSON.stringify(db));
 fs.mkdirSync(OUT, {recursive: true});
 const csv = rows => rows.map(x => x.map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');
 fs.writeFileSync(path.join(OUT, 'unit-fix.csv'), '﻿' + csv([['브랜드', '옛 이름', '옛 단위', '새 단위', '새 이름', '무게g', 'kcal'], ...done]));
 fs.writeFileSync(path.join(OUT, 'unit-left.csv'), '﻿' + csv([['남은 단위', '행 수', '예시(최대 5)'], ...Object.entries(left).sort((a, b) => b[1].length - a[1].length).map(([u, l]) => [u, l.length, l.slice(0, 5).join(' / ')])]));
 console.log('바꾼 행', done.length, '· 남은 단위', Object.keys(left).length, '종', Object.values(left).reduce((a, l) => a + l.length, 0), '행');
}
