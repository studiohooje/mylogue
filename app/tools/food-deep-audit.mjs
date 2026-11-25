// 5.0.5 밤샘: 음식 DB 4.6만 행 깊은 검산. food-bundle이 빌드할 때 함께 돌고(deepFix), 단독 실행하면 보고서를 낸다.
// 원칙(대표님): 근거 없이 값을 바꾸지 않는다. 다만 '불가능한 값'은 모르는 값(null)으로 내리고, 의심 행은 '값 확인 필요'(10번 칸=1)로 검색 뒤로.
// 고치는 것
//  ① 이름 공백 정리(앞뒤·겹친 공백·눈에 안 보이는 공백)
//  ② 미량영양소 불가능: 당류 > 탄수화물, 식이섬유 > 탄수화물, 포화지방 > 지방, 100g당 나트륨 40,000mg 초과 → 그 칸만 null
//  ③ 1단위 행인데 단위 무게로 환산하면 100g당 900kcal 초과·탄단지 합 100g 초과 → 확인 필요
//  ④ 100g(ml) 기준 행의 100g당 900kcal 초과 → 확인 필요(기름·버터 같은 순지방은 900 근처라 902까지 허용)
//  ⑤ 1단위 열량이 같은 이름의 다른 행 중앙값의 10배 넘게 차이 → 확인 필요(단위 혼동 의심)
// 실행: node tools/food-deep-audit.mjs → research_notes/마이로그 음식 데이터베이스/quality/deep-audit.md
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const MASS = new Set(['g', 'ml', '']);
const WS = /[  -​　﻿]/g;
const doubt = r => { while (r.length < 10) r.push(''); if (r.length === 10) r.push(1); else if (!r[10]) r[10] = 1; };

export function deepFix(rows, {report = null} = {}){
  const log = (code, r, msg) => { if (report) (report[code] ||= []).push(`${r[0]}${r[1] ? ` · ${r[1]}` : ''} (${r[2] || 'g'}) — ${msg}`); };
  const n = {name: 0, micro: 0, unitDense: 0, massDense: 0, outlier: 0};
  for (const r of rows) {
    const name = String(r[0] ?? ''), clean = name.replace(WS, ' ').replace(/\s{2,}/g, ' ').trim();
    if (clean !== name) { r[0] = clean; n.name++; log('name', r, `이름 공백 정리`); }
    const [, , unit, grams, kcal, carbs, protein, fat] = r;
    const mass = MASS.has(unit || '');
    // ② 미량영양소
    if (Array.isArray(r[11])) {
      const m = r[11];
      // 당류가 탄수의 1.5배+2g를 넘거나 포화지방이 지방보다 1g 넘게 많으면, 미량값보다 탄수·지방 칸이 틀렸을 수 있어 행 전체를 확인 필요로
      if (r[10] !== 2 && ((m[0] != null && carbs != null && m[0] > carbs * 1.5 + 2) || (m[2] != null && fat != null && m[2] > fat + 1))) { doubt(r); log('macroSuspect', r, `탄수 ${carbs}g·당류 ${m[0]}g·지방 ${fat}g·포화 ${m[2]}g → 확인 필요`); n.macro = (n.macro || 0) + 1; }
      if (m[0] != null && carbs != null && m[0] > carbs * 1.05 + 0.5) { log('micro', r, `당류 ${m[0]}g > 탄수 ${carbs}g → 당류 모름`); m[0] = null; n.micro++; }
      if (m[1] != null && carbs != null && m[1] > carbs * 1.05 + 0.5) { log('micro', r, `식이섬유 ${m[1]}g > 탄수 ${carbs}g → 식이섬유 모름`); m[1] = null; n.micro++; }
      if (m[2] != null && fat != null && m[2] > fat * 1.05 + 0.3) { log('micro', r, `포화지방 ${m[2]}g > 지방 ${fat}g → 포화지방 모름`); m[2] = null; n.micro++; }
      const per100 = v => mass ? v : grams > 0 ? v / grams * 100 : null;
      if (m[3] != null && per100(m[3]) != null && per100(m[3]) > 40000) { log('micro', r, `나트륨 100g당 ${Math.round(per100(m[3]))}mg → 나트륨 모름`); m[3] = null; n.micro++; }
    }
    if (r[10] === 1 || r[10] === 2) continue;
    // ③ 1단위 행 밀도
    if (!mass && grams > 0 && kcal != null) {
      const k100 = kcal / grams * 100, s100 = ((carbs || 0) + (protein || 0) + (fat || 0)) / grams * 100;
      if (k100 > 902 || s100 > 101) { doubt(r); n.unitDense++; log('unitDense', r, `1${unit} ${grams}g에 ${kcal}kcal → 100g당 ${Math.round(k100)}kcal·탄단지 ${Math.round(s100)}g`); continue; }
    }
    // ④ 100g 기준 밀도
    if (mass && kcal != null && kcal > 902) { doubt(r); n.massDense++; log('massDense', r, `100${unit || 'g'}당 ${kcal}kcal`); continue; }
  }
  // ⑤ 같은 이름·같은 단위끼리 열량 극단값
  const byKey = new Map();
  for (const r of rows) { if (r[4] == null || MASS.has(r[2] || '')) continue; const k = `${r[0]}|${r[2]}`; (byKey.get(k) || byKey.set(k, []).get(k)).push(r); }
  for (const list of byKey.values()) {
    if (list.length < 3) continue;
    const v = list.map(r => r[4]).sort((a, b) => a - b), med = v[Math.floor(v.length / 2)];
    for (const r of list) if (med > 0 && r[10] !== 1 && (r[4] > med * 10 || r[4] < med / 10)) { doubt(r); n.outlier++; log('outlier', r, `${r[4]}kcal, 같은 이름 중앙값 ${med}kcal`); }
  }
  return n;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const HERE = path.dirname(fileURLToPath(import.meta.url)), APP = path.resolve(HERE, '..');
  const raw = JSON.parse(fs.readFileSync(path.join(APP, 'food-db.json'), 'utf8')), rows = raw.rows.map(r => JSON.parse(JSON.stringify(r)));
  const report = {}, n = deepFix(rows, {report});
  const lines = [`# 음식 DB 깊은 검산 (${new Date().toISOString().slice(0, 10)})`, '', `행 ${rows.length} · ${JSON.stringify(n)}`, ''];
  const TITLE = {name: '이름 공백 정리', micro: '불가능한 미량영양소 → 모름', unitDense: '1단위 행 밀도 불가능 → 확인 필요', massDense: '100g당 900kcal 초과 → 확인 필요', outlier: '같은 이름 열량 10배 차이 → 확인 필요', macroSuspect: '미량값과 어긋난 탄수·지방 → 확인 필요'};
  for (const [k, list] of Object.entries(report)) lines.push(`## ${TITLE[k] || k} (${list.length})`, '', ...list.slice(0, 300).map(x => `- ${x}`), list.length > 300 ? `- … 외 ${list.length - 300}` : '', '');
  const out = path.resolve(APP, '..', 'research_notes', '마이로그 음식 데이터베이스', 'quality');
  fs.mkdirSync(out, {recursive: true}); fs.writeFileSync(path.join(out, 'deep-audit.md'), lines.join('\n'));
  console.log(JSON.stringify(n));
}
