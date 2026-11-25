// 5.0.5 밤샘: 대표 음식(한식 대표 k·집밥 h·원재료 상위) 이름으로 스스로 찾아지는지 — 이름 그대로 / 띄어쓰기 빼고 / 초성 / 괄호 앞 이름만.
// node tools/food-name-selftest.mjs → 실패 목록
import fs from 'node:fs';
const M = await import('../food-db.js');
const rows = JSON.parse(fs.readFileSync(new URL('../food-db.json', import.meta.url), 'utf8')).rows;
M.setFoodRows(rows);
const CHO = 'ㄱㄲㄴㄷㄸㄹㅁㅂㅃㅅㅆㅇㅈㅉㅊㅋㅌㅍㅎ';
const cho = s => [...s].map(c => { const k = c.charCodeAt(0) - 0xAC00; return k >= 0 && k < 11172 ? CHO[Math.floor(k / 588)] : c; }).join('');
const targets = rows.filter(r => (r[8] === 'k' || r[8] === 'h') && !r[10]).map(r => r[0]);
const fails = {exact: [], nospace: [], cho: [], base: []};
for (const name of targets) {
  const hit = (q, n) => M.searchFoodDB(q, {limit: n}).some(x => x.name === name || x.name.replace(/\(집밥\)$/, '') === name.replace(/\(집밥\)$/, ''));
  if (!hit(name, 3)) fails.exact.push(name);
  const ns = name.replace(/\s/g, ''); if (ns !== name && !hit(ns, 5)) fails.nospace.push(name);
  const base = name.replace(/\(.*?\)/g, '').trim(); if (base && base !== name && base.length >= 2 && !M.searchFoodDB(base, {limit: 8}).some(x => x.name.includes(base))) fails.base.push(name);
  const c = cho(base || name); if ((base || name).length >= 2 && (base || name).length <= 6 && /^[ㄱ-ㅎ]+$/.test(c) && !M.searchFoodDB(c, {limit: 10}).some(x => x.name.replace(/\(.*?\)/g, '').trim() === (base || name))) fails.cho.push(name);
}
console.log('대상', targets.length, Object.fromEntries(Object.entries(fails).map(([k, v]) => [k, v.length])));
for (const [k, v] of Object.entries(fails)) if (v.length) console.log(`## ${k}\n` + v.slice(0, 60).join(' · '));
