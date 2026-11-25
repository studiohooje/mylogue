import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
// 5.0.6 속도 개선이 되돌아가지 않게
test('같은 기록이면 actualDB는 같은 사본(뒤 계산 재사용), 기록이 바뀌면 새 사본', async () => {
  const {actualDB} = await import('../domain.js');
  const db = {meals: [{id: 1}, {id: 2, planned: true}], workouts: []};
  const a = actualDB(db), b = actualDB(db);
  assert.equal(a, b); assert.equal(a.meals.length, 1);
  const db2 = {...db, meals: [...db.meals, {id: 3}]};
  assert.notEqual(actualDB(db2), a); assert.equal(actualDB(db2).meals.length, 2);
});
test('숫자 형식기 재사용: 결과는 그대로', async () => {
  const before = [(1234.567).toLocaleString('ko-KR', {maximumFractionDigits: 1}), (0.25).toLocaleString('ko-KR', {maximumFractionDigits: 2}), (5).toLocaleString('ko-KR')];
  await import('../intl-cache.js');
  assert.ok(Number.prototype.toLocaleString.__mylogueCached);
  assert.deepEqual([(1234.567).toLocaleString('ko-KR', {maximumFractionDigits: 1}), (0.25).toLocaleString('ko-KR', {maximumFractionDigits: 2}), (5).toLocaleString('ko-KR')], before);
  assert.equal((12).toLocaleString('en-US', {minimumFractionDigits: 2}), '12.00');
});
test('시작할 때 서버 읽기를 기다리지 않는다(기억한 계정 상태로 먼저 그림), 처음 기기만 둘을 동시에', () => {
  const src = fs.readFileSync(new URL('../cloud-sync.js', import.meta.url), 'utf8');
  assert.match(src, /readAccountCache\(auth\.currentUser\?\.uid\)/);
  assert.match(src, /await Promise\.all\(\[refreshApproval\(\), loadAccountConsent\(\)\]\)/);
  assert.doesNotMatch(src, /await refreshApproval\(\);\s*await loadAccountConsent\(\);/);
  assert.match(src, /fsImport = import\('\.\/vendor\/firebase\/firebase-firestore\.js'\)/);
});
test('창이 열려 있는 동안 뒤 페이지는 다시 만들지 않는다 · 식사 창을 열면 음식 DB를 미리 받는다 · 브랜드 색인은 나눠 만든다', () => {
  const app = fs.readFileSync(new URL('../app.js', import.meta.url), 'utf8');
  assert.match(app, /function paintParts\(base,top,freeze=false\)/);
  assert.match(app, /paintParts\(\(\)=>`/);
  assert.match(app, /\$s\.modal==='quick-meal'\|\|\$s\.modal==='batch'\)&&!foodDBReady\(\)\)loadFoodDB/);
  const fdb = fs.readFileSync(new URL('../food-db.js', import.meta.url), 'utf8');
  assert.match(fdb, /addFoodRowsChunked\(more\.rows\)/);
});
test('빌드: 첫 화면 모듈을 index.html에 미리 받기로 적는다', () => {
  assert.match(fs.readFileSync(new URL('../build.mjs', import.meta.url), 'utf8'), /rel="modulepreload"/);
});
