// 2026-11-27 헬스장 머신 도감 합치기: research_notes/gym_machines/*.jsonl(조사 결과) + names_ko.json(한글 이름 표)
//  → app/machine-models-data.js(MACHINE_SPECS, 행 id는 그대로 — 기록·헬스장 등록이 id를 가리킨다)
//  → app/machine-names-ko.js(보이는 이름: 제조사·라인·모델의 한글·영문)
// 실행: node tools/machine-merge.mjs [조사 jsonl ...]   (app/에서)
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath, pathToFileURL} from 'node:url';

const APP = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const NOTES = path.resolve(APP, '..', 'research_notes', 'gym_machines');
const dataFile = path.join(APP, 'machine-models-data.js');
const {MACHINE_SPECS} = await import(pathToFileURL(dataFile).href + '?t=' + Date.now());
const {GENERIC_MACHINES} = await import(pathToFileURL(path.join(APP, 'machines-catalog.js')).href);
const BASES = new Set(GENERIC_MACHINES.map(g => g.id)), LOADS = new Set(MACHINE_SPECS.map(r => r[5])), SIDES = new Set(['both', 'iso', 'single', 'pair']);
const names = JSON.parse(fs.readFileSync(path.join(NOTES, 'names_ko.json'), 'utf8'));
const files = process.argv.slice(2).length ? process.argv.slice(2) : fs.readdirSync(NOTES).filter(f => /^night1127b_.*\.jsonl$/.test(f)).map(f => path.join(NOTES, f));

const rows = new Map(MACHINE_SPECS.map(r => [r[0], [...r]]));
// 같은 회사는 원래 쓰던 제조사 글자(maker 열)를 그대로 — 묶음·시험이 이 글자를 쓴다
const makerRaw = new Map();
for (const r of MACHINE_SPECS) { const en = (names.makers[r[1]]?.en || r[1]).toLowerCase(); if (!makerRaw.has(en)) makerRaw.set(en, r[1]); }
const MAKER = {...Object.fromEntries(Object.entries(names.makers).map(([k, v]) => [k, [v.ko, v.en]]))};
const LINE = {...Object.fromEntries(Object.entries(names.lines).map(([k, v]) => [k, [v.ko, v.en]]))};
const MODEL = {...Object.fromEntries(Object.entries(names.models).map(([k, v]) => [k, [v.ko, v.en]]))};
const bad = [], stat = {added: 0, replaced: 0};
for (const f of files) for (const [i, line] of fs.readFileSync(f, 'utf8').split('\n').entries()) {
  if (!line.trim()) continue;
  let x; try { x = JSON.parse(line); } catch { bad.push(`${path.basename(f)}:${i + 1} JSON`); continue; }
  if (!/^bm:[a-z0-9-]+:[a-z0-9-]+:[a-z0-9-]+$/.test(x.id || '') || !BASES.has(x.base) || !LOADS.has(x.load) || !SIDES.has(x.sided)) { bad.push(`${path.basename(f)}:${i + 1} ${x.id} 값 확인(base ${x.base} load ${x.load} sided ${x.sided})`); continue; }
  const old = rows.get(x.id), en = String(x.maker_en || x.maker_ko).trim();
  const maker = old ? old[1] : makerRaw.get(en.toLowerCase()) || en;
  const line_ = old ? old[2] : (x.line_en || x.line_ko || '').trim(), model = old ? old[3] : (x.model_en || x.model_ko || '').trim();
  const keep = (k, v) => v ?? (old ? old[k] : null);
  const r = [x.id, maker, line_, model, x.base, x.load, x.sided, x.unit === 'lb' ? 'lb' : 'kg', keep(8, x.stepKg), keep(9, x.totalKg), keep(10, x.firstKg), x.url || (old ? old[11] : null), x.code || (old ? old[12] : null), x.conf || (old ? old[13] : 'medium')];
  rows.set(x.id, r); old ? stat.replaced++ : stat.added++;
  if (!MAKER[maker]) MAKER[maker] = [x.maker_ko || maker, x.maker_en || ''];
  if (line_ && !LINE[line_]) LINE[line_] = [x.line_ko || line_, x.line_en || ''];
  MODEL[x.id] = [x.model_ko || model, x.model_en || (old ? old[3] : '')];
}
const all = [...rows.values()];
const missing = all.filter(r => !MODEL[r[0]] || !MAKER[r[1]] || (r[2] && !LINE[r[2]])).map(r => r[0]);
// 한글과 영문이 같으면(코드·한국 회사) 괄호 없이
const tidy = o => Object.fromEntries(Object.entries(o).map(([k, [ko, en]]) => [k, en && en.trim() && en.trim() !== String(ko).trim() ? [ko, en.trim()] : [ko]]));
const makers = new Set(all.map(r => r[1]));
const head = fs.readFileSync(dataFile, 'utf8').split('\n').slice(0, 2);
head[0] = `// 4.12 헬스장 머신 제조사 모델 대장: ${makers.size}개 제조사 ${all.length}모델(4.12 야간 조사 570 + 2026-11-27 밤 966 + 2026-11-27 국산·파나타·DRAX 보강). 근거는 제조사 공식 카탈로그·사양서·제품 페이지(행마다 출처 URL). 조사 기록 research_notes/gym_machines/. 보이는 한글 이름은 machine-names-ko.js`;
fs.writeFileSync(dataFile, `${head.join('\n')}\nexport const MACHINE_SPECS=${JSON.stringify(all)};\n`);
fs.writeFileSync(path.join(APP, 'machine-names-ko.js'), `// 2026-11-27 대표님: 머신 이름은 '한글명(영문명)'으로 통일, 방식(원판식·핀 스택식 등)은 한글로. 표: research_notes/gym_machines/names_ko.json + 조사 jsonl의 *_ko. tools/machine-merge.mjs가 만든다(직접 고치지 말 것)
// 값: [한글] 또는 [한글, 영문]
export const MAKER_NAMES=${JSON.stringify(tidy(MAKER))};
export const LINE_NAMES=${JSON.stringify(tidy(LINE))};
export const MODEL_NAMES=${JSON.stringify(tidy(MODEL))};
`);
console.log(JSON.stringify({files: files.map(f => path.basename(f)), ...stat, total: all.length, makers: makers.size, bad, missingNames: missing.length, missingSample: missing.slice(0, 5)}, null, 1));
