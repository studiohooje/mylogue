// 4.28.0 밤샘 A-1: 지금의 app/food-db.json에 한식 대표값 교체 표(kr-dish-fixes.json)만 적용한다(전체 재생성 없이).
// 실행: node tools/apply-kr-fixes.mjs
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {applyKrFix} from './food-bundle.mjs';
const APP = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'), file = path.join(APP, 'food-db.json');
const db = JSON.parse(fs.readFileSync(file, 'utf8')), cnt = {};
for (const r of db.rows) { const v = applyKrFix(r); if (v) cnt[v] = (cnt[v] || 0) + 1; }
db.builtAt = new Date().toISOString().slice(0, 10);
fs.writeFileSync(file, JSON.stringify(db));
console.log('적용', cnt);
