// 4.28.0 밤샘 A-6: 음식 검색 정답지. DB에서 시드 고정으로 이름을 뽑아 ① 그대로 ② 한 글자 오타(받침 바꿈·된소리) ③ 초성 ④ 사람이 손으로 고른 흔한 검색어
// 로 찾았을 때 그 음식이 위쪽에 나오는지 본다. 통과율을 기준선으로 남기고 시험이 기준선 아래로 떨어지면 실패.
// 실행: node tools/search-golden.mjs → research_notes/night/A6/report.md, app/tests/fixtures/food-search-golden.json
import {setFoodRows, searchFoodDB, foodDBReady} from '../food-db.js';
import {choseong} from '../suggest.js';
import {rng} from './sim-users.mjs';
// 손으로 고른 검색어 → 위 5개 안에 이 정규식에 맞는 이름이 있어야 함(전수검사 F-07과 자주 찾는 음식)
export const CURATED = [
 ['chicken breast', /닭가슴살/], ['coke zero', /콜라.*제로|제로.*콜라/], ['big mac', /빅맥/], ['bmt', /비엠티/], ['닭가슴쌀', /닭가슴살/], ['김치찌게', /김치찌개/], ['떡볶기', /떡볶이/], ['떡뽁이', /떡볶이/], ['된장찌게', /된장찌개/],
 ['아아', /아메리카노/], ['ㄷㄱㅅㅅ', /닭가슴살/], ['라면', /^라면/], ['김밥', /김밥/], ['비빔밥', /비빔밥/], ['제육볶음', /제육볶음/], ['삼겹살', /삼겹살/], ['짜장면', /짜장면/], ['짬뽕', /짬뽕/], ['냉면', /냉면/],
 ['소주', /소주/], ['맥주', /맥주/], ['막걸리', /막걸리/], ['바나나', /바나나/], ['사과', /사과/], ['우유', /우유/], ['그릭요거트', /그릭/], ['오트밀', /오트밀/], ['현미밥', /현미밥/], ['쌀밥', /쌀밥|흰밥/],
 ['프로틴', /프로틴|단백질/], ['protein', /프로틴|단백질/], ['고구마', /고구마/], ['감자', /감자/], ['두부', /두부/], ['계란', /달걀|계란/], ['삶은 달걀', /삶은.?달걀|달걀.*삶/], ['연어', /연어/], ['참치', /참치/], ['샐러드', /샐러드/],
 ['피자', /피자/], ['치킨', /치킨|닭튀김/], ['햄버거', /버거/], ['떡볶이', /떡볶이/], ['순대', /순대/], ['만두', /만두/], ['아메리카노', /아메리카노/], ['카페라떼', /라떼/], ['콜라', /콜라/], ['사이다', /사이다/],
 ['뿌링클', /뿌링클/], ['허니콤보', /허니콤보/], ['스타벅스 아메리카노', /아메리카노/], ['편의점 도시락', /도시락/], ['닭가슴살 소시지', /닭가슴살.*소시지|소시지/], ['곤약밥', /곤약/], ['쌀국수', /쌀국수/], ['마라탕', /마라탕/], ['탕후루', /탕후루/],
];
const jamoTypo = (s, r) => { // 한 음절의 받침을 바꾸거나(살→쌀이 아니라 받침 ㄹ→ㅁ), 첫소리를 된소리로
 const chars = [...s], idx = chars.map((c, i) => /[가-힣]/.test(c) ? i : -1).filter(i => i >= 1);
 if (!idx.length) return null;
 const i = idx[Math.floor(r() * idx.length)], code = chars[i].charCodeAt(0) - 0xAC00, cho = Math.floor(code / 588), jung = Math.floor(code % 588 / 28), jong = code % 28;
 const tense = {0: 1, 3: 4, 7: 8, 9: 10, 12: 13};
 const nc = r() < 0.5 && tense[cho] != null ? [tense[cho], jung, jong] : [cho, jung, jong === 0 ? 4 : 0];
 chars[i] = String.fromCharCode(0xAC00 + nc[0] * 588 + nc[1] * 28 + nc[2]);
 return chars.join('');
};
export function makeQueries(rows, {n = 3000, seed = 21} = {}) {
 const r = rng(seed), pick = () => rows[Math.floor(r() * rows.length)], out = [];
 for (const [q, re] of CURATED) out.push({q, kind: 'curated', want: re.source, top: 5});
 const short = rows.filter(x => /^[가-힣\s]{2,10}$/.test(x[0]));
 while (out.length < n) {
  const k = r();
  if (k < 0.55) { const x = pick(); out.push({q: x[0], kind: 'exact', want: `^${x[0].replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}( · |$)`, top: 10}); }
  else if (k < 0.85) { const x = short[Math.floor(r() * short.length)], t = jamoTypo(x[0].replace(/\s/g, ''), r); if (t && t !== x[0].replace(/\s/g, '')) out.push({q: t, kind: 'typo', want: `^${x[0].replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, top: 10}); }
  else { const x = short[Math.floor(r() * short.length)], c = choseong(x[0]).replace(/\s/g, ''); if (c.length >= 2 && c.length <= 5) out.push({q: c, kind: 'choseong', want: `^${x[0].replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}( · |$)`, top: 30}); }
 }
 return out.slice(0, n);
}
const bare = f => f.brand && f.name.startsWith(f.brand + ' ') ? f.name.slice(f.brand.length + 1) : f.name;
export function evaluate(queries) {
 const by = {}, fails = [];
 for (const t of queries) {
  const res = searchFoodDB(t.q, {limit: t.top}), re = new RegExp(t.want), ok = res.some(f => re.test(f.name) || re.test(bare(f))); // 2026-11-27 이름 앞에 제조사가 붙어도 음식 이름으로 맞춘다
  by[t.kind] ??= {n: 0, ok: 0}; by[t.kind].n++; if (ok) by[t.kind].ok++; else if (fails.length < 200) fails.push({...t, got: res.slice(0, 3).map(f => f.name)});
 }
 for (const k of Object.keys(by)) by[k].rate = Math.round(by[k].ok / by[k].n * 1000) / 10;
 return {by, fails};
}
import path from 'node:path';
import {fileURLToPath} from 'node:url';
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
 const fs = await import('node:fs');
 const APP = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
 const rows = JSON.parse(fs.readFileSync(path.join(APP, 'food-db.json'), 'utf8')).rows; setFoodRows(rows);
 const qs = makeQueries(rows), res = evaluate(qs);
 fs.mkdirSync(path.join(APP, 'tests', 'fixtures'), {recursive: true});
 fs.writeFileSync(path.join(APP, 'tests', 'fixtures', 'food-search-golden.json'), JSON.stringify({baseline: res.by, queries: qs}));
 const out = path.resolve(APP, '..', 'research_notes', 'night', 'A6'); fs.mkdirSync(out, {recursive: true});
 fs.writeFileSync(path.join(out, 'report.md'), `# 음식 검색 정답지 (밤샘 A-6)\n\n${Object.entries(res.by).map(([k, v]) => `- ${k}: ${v.ok}/${v.n} (${v.rate}%)`).join('\n')}\n\n## 못 찾은 것(앞 80)\n${res.fails.slice(0, 80).map(f => `- [${f.kind}] ${f.q} → 기대 /${f.want}/ · 나온 것 ${f.got.join(' | ')}`).join('\n')}\n`);
 console.log(res.by);
}
