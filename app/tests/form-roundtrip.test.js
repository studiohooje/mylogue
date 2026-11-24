import test from 'node:test';
import assert from 'node:assert/strict';
import {mealFormHTML} from '../ui-helpers.js';
import {exerciseFormHTML, machineFormHTML} from '../profile-forms.js';
import {rng} from '../tools/sim-users.mjs';
// 4.28.0 밤샘 E-3: 열고 그대로 저장하면 원본과 같다 — 수정 양식의 모든 선택칸이 '지금 값'을 선택한 채로 그려지는지 무작위 값 수백 개로 본다.
const selects = html => [...html.matchAll(/<select[^>]*name="([^"]+)"[^>]*>([\s\S]*?)<\/select>/g)].map(([, name, body]) => ({name, selected: (() => { const o = [...body.matchAll(/<option([^>]*)>([^<]*)<\/option>/g)].find(m => /selected/.test(m[1])); if (!o) return null; const v = o[1].match(/value="([^"]*)"/); return v ? v[1] : o[2]; })(), values: [...body.matchAll(/value="([^"]*)"/g)].map(m => m[1])}));
const unesc = s => String(s).replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
const r = rng(13), pick = a => a[Math.floor(r() * a.length)];
const ODD = ['필라테스', '케틀벨', '밴드', '내가 만든 값', 'a&b', '"따옴표"', '기구 · 2'];
test('내 종목 양식: 부위·장비·종류가 목록 안팎 어떤 값이든 그대로 선택(400건)', () => {
 for (let i = 0; i < 400; i++) {
  const ex = {name: '종목' + i, part: pick([...['가슴', '등', '하체', '어깨', '팔', '복근', '전신', '유산소', '기타'], ...ODD]), equipment: pick([...['머신', '바벨', '덤벨', '케이블', '맨몸', '기타'], ...ODD]), kind: pick(['strength', 'cardio'])};
  const s = selects(exerciseFormHTML(ex)), by = n => s.find(x => x.name === n);
  for (const k of ['part', 'equipment', 'kind']) assert.equal(unesc(by(k)?.selected), ex[k], `${k}=${ex[k]}`);
 }
});
test('식사 양식: 영양값 출처가 목록 밖이어도 그대로 선택(200건)', () => {
 for (let i = 0; i < 200; i++) {
  const source = pick(['manual', 'label', 'estimate', 'ai-reviewed', 'catalog', '대표값', ...ODD]);
  const s = selects(mealFormHTML({meal: {date: '2026-11-24', name: '밥', servingQty: 1, servingUnit: '공기', calories: 300, source}, date: '2026-11-24'}));
  assert.equal(unesc(s.find(x => x.name === 'source')?.selected), source, source);
 }
});
test('머신 양식: 단위가 그대로 선택', () => {
 for (const unit of ['kg', 'lb', 'level']) {
  const s = selects(machineFormHTML({name: 'x', unit}));
  const u = s.find(x => x.name === 'unit');
  assert.equal(u?.selected, unit, unit);
 }
});
