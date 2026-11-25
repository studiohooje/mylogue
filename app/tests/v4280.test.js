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
test('밤샘 A-2: 크기·도우 이름이 단위 칸에 있던 프랜차이즈 행은 잔·조각·판·컵으로(값은 그대로)', async () => {
 const {normalizeUnit, OK_UNITS} = await import('../tools/unit-normalize.mjs');
 assert.deepEqual(normalizeUnit(['아메리카노', '스타벅스', 'Tall', 355, 10, 2, 1, 0, 'f', '']), {from: 'Tall', to: '잔', name: '아메리카노 (Tall)'});
 assert.equal(normalizeUnit(['불고기 · 크림치즈 L', '미스터피자', '크림치즈', 114, 311, 30, 12, 15, 'f', '']).to, '조각');
 assert.equal(normalizeUnit(['꿈을피자 R', '피자알볼로', 'R', 564, 1420, 150, 60, 60, 'f', '']).to, '판');
 assert.equal(normalizeUnit(['프라이 Regular', '쉐이크쉑', 'Regular', 0, 470, 60, 6, 22, 'f', '']).to, '개');
 assert.equal(normalizeUnit(['그린티 아이스크림', '배스킨라빈스', '싱글레귤러', 115, 250, 30, 4, 12, 'f', '']).to, '컵');
 assert.equal(normalizeUnit(['샌드위치', '서브웨이', 'cm', 241, 406, 50, 20, 12, 'f', '']), null); // 뜻이 분명하지 않으면 그대로
 const db = JSON.parse(readFileSync(new URL('../food-db.json', import.meta.url), 'utf8'));
 const odd = db.rows.filter(r => r[8] === 'f' && !OK_UNITS.has(r[2])).length;
 assert.ok(odd < 200, String(odd));
});
test('F-06: 업체가 탄·지를 안 준 음식은 열량 검산 경고를 내지 않고, 하루 합계에 빠진 개수를 알린다', async () => {
 const {foodIssue} = await import('../food-check.js');
 const {mealTotals} = await import('../domain.js');
 const {macroGoalsHTML} = await import('../nutrition-goals.js');
 assert.equal(foodIssue({name: '피자 R', servingQty: 1, servingUnit: '판', calories: 1420, carbs: null, protein: 60, fat: null}), null);
 assert.equal(foodIssue({name: 'x', servingQty: 1, servingUnit: '개', calories: 1420, carbs: 30, protein: 20, fat: 10}).code, 'macro');
 const t = mealTotals([{calories: 774, carbs: null, protein: 50, fat: null}, {calories: 300, carbs: 60, protein: 6, fat: 1}]);
 assert.equal(t.missingMacros, 1); assert.equal(t.calories, 1074);
 assert.match(macroGoalsHTML(t, {calorieGoal: 2000, carbsGoal: 250, proteinGoal: 150, fatGoal: 55}, {meals: 2}), /업체가 주지 않은 음식 1개/);
});
test('내 값 → 공용 도감: 같은 이름은 빼고, 빈 값·검산 어긋남은 기본 체크 해제, 단위는 g·개·회로', async () => {
 const {promoteCandidates, promoteHTML} = await import('../catalog-promote.js');
 const db = {foods: [
  {id: 'f1', name: '킹닭 허브맛 닭다리살', servingQty: 100, servingUnit: 'g', calories: 165, carbs: 2, protein: 25, fat: 6.5},
  {id: 'f2', name: '엄마 김밥', servingQty: 1, servingUnit: '줄', calories: 420, carbs: 70, protein: 12, fat: 10},
  {id: 'f3', name: '모르는 메뉴', servingQty: 1, servingUnit: '개', calories: 500, carbs: null, protein: 20, fat: null},
  {id: 'f4', name: '이미있는거', servingQty: 1, servingUnit: '개', calories: 100, carbs: 10, protein: 5, fat: 4},
 ], customExercises: [{id: 'e1', name: '리포머 풋워크', part: '하체', equipment: '기타', baseExerciseId: 'exercise:레그 프레스'}, {id: 'e2', name: '스쿼트', part: '하체'}]};
 const c = promoteCandidates(db, {sharedFoods: [{name: '이미있는거'}], baseExercises: [{name: '스쿼트'}]});
 const by = n => c.foods.find(x => x.item.name.startsWith(n));
 assert.equal(by('킹닭').ok, true); assert.equal(by('킹닭').item.servingUnit, 'g');
 assert.equal(by('엄마 김밥').item.servingUnit, '회'); assert.match(by('엄마 김밥').item.name, /\(1줄\)/);
 assert.equal(by('모르는').ok, false);
 assert.equal(by('이미있는거').ok, false);
 assert.equal(c.exercises.find(x => x.item.name === '리포머 풋워크').ok, true);
 assert.equal(c.exercises.find(x => x.item.name === '스쿼트').ok, false);
 const esc2 = v => String(v ?? '').replace(/[&<>"']/g, ch => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[ch]));
 assert.match(promoteHTML(c, esc2), /고른 3개 공용 도감에 올리기/);
 const {validateCatalogItem} = await import('../catalog-cloud.js');
 for (const x of [...c.foods, ...c.exercises].filter(x => x.ok)) validateCatalogItem(x.kind, x.item); // 공용 도감 검사를 통과하는 모양
});
