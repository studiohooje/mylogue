import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {emptyDB, normalizeDB, cleanMeal} from '../domain.js';
import {recordsToDB} from '../cloud-model.js';
import {consentHTML, consentRecord, CONSENT_ITEMS, needsOperatorNotice, operatorNoticeHTML} from '../legal.js';
import {logError, readErrors, errorReportText, cleanNotice, loadNotice, dismissNotice, noticeHTML} from '../error-log.js';
import {foodMacroText} from '../quick-entry.js';

// 4.28.0: Fable 4.27.0 추가 점검(A-1~A-5)·M-03·M-04·AA-07(최소)·B-08 안내
const src = f => readFileSync(new URL(`../${f}`, import.meta.url), 'utf8');
const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));
const mem = () => { const d = new Map(); globalThis.localStorage = {get length() { return d.size; }, key: i => [...d.keys()][i] ?? null, getItem: k => d.get(k) ?? null, setItem: (k, v) => d.set(k, String(v)), removeItem: k => d.delete(k)}; return d; };

test('A-1: 따로 보관 안내를 안 봤으면 알림 창을 저절로 열지 않는다', () => {
 assert.match(src('app.js'), /function adminAutoOpen\(\)\{[^}]*\/\* 4\.27\.0 추가 점검 A-1 \*\/\{const q=\$s\.db\.quarantine\|\|\[\];if\(q\.length&&\(\$s\.db\.settings\?\.quarantineSeen\|\|0\)<q\.length\)return\}/);
});
test('A-2: 모두 동의는 필수 항목만, 선택 항목은 맨 아래', () => {
 assert.equal(CONSENT_ITEMS.at(-1)[0], 'operator');
 assert.match(src('app.js'), /for\(const \[k\] of CONSENT_ITEMS\)if\(!OPTIONAL_CONSENT\.includes\(k\)\)\$s\.consentChecked\[k\]=t\.checked/);
 const req = Object.fromEntries(CONSENT_ITEMS.filter(([k]) => k !== 'operator').map(([k]) => [k, true]));
 assert.match(consentHTML({checked: req}), /id="consent-all" checked/);
 assert.match(consentHTML({checked: req}), /필수 항목에 모두 동의해요/);
});
test('A-4: 같은 기록은 내용이 조금 달라도 한 번만 보관, 열 때 가려낸 보관분은 바로 저장', async () => {
 const bad = {id: 'b7', date: '2026-11-02', weight: 7};
 const local = normalizeDB({...emptyDB(), body: [bad]}, {lenient: true});
 const db = recordsToDB({'body~b7': JSON.stringify({...bad, updatedAt: '2026-11-03T00:00:00Z'})}, local);
 assert.equal(db.quarantine.filter(q => q.id === 'b7').length, 1);
 const d = mem();
 const {load, STORAGE_KEY} = await import('../store.js');
 d.set(STORAGE_KEY, JSON.stringify({...emptyDB(), body: [bad]}));
 const loaded = load();
 assert.equal(loaded.quarantine.length, 1);
 assert.equal(JSON.parse(d.get(STORAGE_KEY)).quarantine.length, 1);
});
test('A-5: 운영자 열람 토글은 찾기 쉽게(id·계정 영역 링크)', () => {
 assert.match(src('legal.js'), /id="operator-consent"/);
 assert.match(src('cloud-ui.js'), /href="#operator-consent"/);
});
test('B-08: 예전 필수 동의자(optAware 없음)에게만 한 번 안내', () => {
 const old = {version: 'v', at: '2026-11-20T00:00:00Z', items: {age: true, terms: true, privacy: true, health: true, overseas: true, operator: true}};
 assert.equal(needsOperatorNotice(old), true);
 assert.match(operatorNoticeHTML(old), /'선택'으로 바뀌었어요/);
 const fresh = consentRecord({age: true, terms: true, privacy: true, health: true, overseas: true, operator: true});
 assert.equal(fresh.items.optAware, true);
 assert.equal(needsOperatorNotice(fresh), false);
 assert.equal(needsOperatorNotice({...old, items: {...old.items, operator: false}}), false);
 assert.match(src('app.js'), /operator:c\.items\?\.operator!==true,optAware:true/);
});
test('M-03: 수량을 직접 치면 열량 줄이 그 양으로 바뀐다', () => {
 const row = {name: '닭가슴살', servingQty: 1, servingUnit: 'g', calories: 165, carbs: 0, protein: 31, fat: 3.6};
 assert.match(foodMacroText(row, 150), /^247\.5|^248/);
 assert.match(foodMacroText(row, 150, 2), /^내 몫/);
 assert.match(src('app-actions.js'), /if\(t\.id==='q-qty'\)/);
});
test('M-04: 식사 기록 창의 오늘 누적은 예정을 빼고 센다(홈과 같게)', () => {
 assert.match(src('quick-entry.js'), /filter\(x=>x\.date===s\.date&&!x\.planned\)/);
});
test('AA-07: 오류 기록은 이 기기에 최근 30건, 이메일·긴 숫자는 가리고, 같은 오류는 횟수로', () => {
 mem();
 const e = Object.assign(Error('기록 저장 실패 hong@x.com 01012345678'), {stack: 'Error: x\n    at save (https://studiohooje.github.io/mylogue/app.js?v=4.28.0:1:2)'});
 logError(e, {page: 'home', version: '4.28.0'});
 logError(e, {page: 'home', version: '4.28.0'});
 const list = readErrors();
 assert.equal(list.length, 1); assert.equal(list[0].n, 2);
 assert.doesNotMatch(list[0].msg, /hong@x\.com|01012345678/);
 assert.doesNotMatch(list[0].stack, /studiohooje\.github\.io|\?v=/);
 for (let i = 0; i < 40; i++) logError(Error('e' + i), {page: 'p'});
 assert.equal(readErrors().length, 30);
 assert.match(errorReportText({version: '4.28.0'}), /내 기록 내용은 들어 있지 않아요/);
 assert.match(src('app.js'), /installErrorLog\(\{version:APP_VERSION/);
 assert.match(src('app-modals.js'), /errorHelpHTML\(\$s\.esc/);
});
test('AA-07: 원격 공지는 형식·기간·링크를 검사하고, 확인하면 다시 안 뜬다', async () => {
 mem();
 assert.equal(cleanNotice({id: '', text: 'x'}), null);
 assert.equal(cleanNotice({id: 'a', text: 'x', until: '2026-01-01'}, '2026-11-25'), null);
 assert.equal(cleanNotice({id: 'a', text: 'x', link: 'javascript:alert(1)'}).link, '');
 const f = async () => ({ok: true, json: async () => ({id: 'n1', text: '점검 안내 <b>', level: 'warn'})});
 const n = await loadNotice(f, '2026-11-25');
 assert.equal(n.id, 'n1');
 assert.doesNotMatch(noticeHTML(n, esc), /<b>/);
 dismissNotice('n1');
 assert.equal(await loadNotice(f, '2026-11-25'), null);
 assert.equal(await loadNotice(async () => { throw Error('offline'); }), null);
 const empty = JSON.parse(src('notice.json'));
 assert.equal(cleanNotice(empty), null); // 기본 파일은 아무것도 띄우지 않는다
 assert.match(src('build.mjs'), /'error-log\.js','notice\.json'/);
});
test('식단 점수 완화(대표님 2026-11-24): 칼로리 +11%·탄수 +18% 날이 98점, 크게 넘친 날은 여전히 낮게', async () => {
 const {dietScore, dietSeries} = await import('../diet-trends.js');
 const s = {calorieGoal: 2300, carbsGoal: 262.5, proteinGoal: 168.8, fatGoal: 63.9};
 assert.equal(dietScore({calories: 2564, carbs: 308.8, protein: 196.3, fat: 61.1}, s).total, 98);
 assert.ok(dietScore({calories: 3500, carbs: 450, protein: 120, fat: 120}, s).total < 40);
 // 저장값이 아니라 계산값이라 지난 날짜에도 그대로 적용된다
 const ser = dietSeries({settings: s, meals: [{date: '2026-11-01', calories: 2564, carbs: 308.8, protein: 196.3, fat: 61.1}]}, {days: 3, end: '2026-11-02'});
 assert.equal(ser.find(x => x.date === '2026-11-01').score, 98);
});
test('밤샘 A-1: 한식 대표값 교체는 성인 1인분 근거 2행 이상·검산 통과한 것만, 앱 DB에 적용됨', async () => {
 const fx = JSON.parse(readFileSync(new URL('../tools/kr-dish-fixes.json', import.meta.url), 'utf8')).fixes;
 const db = JSON.parse(readFileSync(new URL('../food-db.json', import.meta.url), 'utf8'));
 let n = 0;
 for (const [name, f] of Object.entries(fx)) {
  if (f.verdict !== 'replace') continue; n++;
  assert.ok(f.evidence.length >= 2, name);
  const p = f.proposal, calc = p.carbs * 4 + p.protein * 4 + p.fat * 9;
  assert.ok(Math.abs(calc - p.kcal) / p.kcal <= 0.2, name);
  const row = db.rows.find(r => r[0] === name && ['k', 'e'].includes(r[8]));
  assert.equal(row[4], p.kcal, name); assert.equal(row.length, 10, name);
 }
 assert.ok(n >= 30);
});
