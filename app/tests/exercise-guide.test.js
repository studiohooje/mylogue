// 4.22.0 기본 사용법·안전·유튜브: 머신 종류마다 사용법, 기구에 맞는 안전 문구, 검색어
import test from 'node:test';
import assert from 'node:assert/strict';
import {MACHINE_GUIDE, guideFor, youtubeQuery, youtubeURL} from '../exercise-guide.js';
import {GENERIC_MACHINES, BUILTIN_BRANDS, genericMachinesFor} from '../machines-catalog.js';
import {EXERCISE_CATALOG} from '../catalog.js';
import {EXERCISE_ENRICH} from '../exercise-enrich.js';
import {knowHTML} from '../exercise-knowledge.js';

const ex = n => EXERCISE_CATALOG.find(x => x.name === n);
test('머신 종류 59개 모두 사용법(맞추기·동작·돌아오기) 3단계', () => {
  for (const g of GENERIC_MACHINES) assert.equal(MACHINE_GUIDE[g.id]?.length, 3, g.id);
  assert.equal(Object.keys(MACHINE_GUIDE).length, GENERIC_MACHINES.length);
});
test('모든 종목에 기본 동작과 안전, 머신을 고르면 그 머신 사용법', () => {
  for (const e of EXERCISE_CATALOG) {
    const g = guideFor(e, null, EXERCISE_ENRICH[e.id]?.c || []);
    assert.ok(g.steps.length >= 1 && g.safety.length >= 1, e.name);
    for (const gm of genericMachinesFor(e.id)) assert.equal(guideFor(e, {...gm, generic: true}).kind, 'machine', `${e.name}×${gm.id}`);
  }
});
test('기구에 맞는 안전: 무게 운동 · 유산소 · 필라테스가 다르다, 전용 머신엔 종목 요령을 겹치지 않는다', () => {
  assert.match(guideFor(ex('체스트 프레스'), {id: 'gm:chest-press', generic: true}).safety.join(' '), /핀을 끝까지/);
  assert.equal(guideFor(ex('체스트 프레스'), {id: 'gm:chest-press', generic: true}, ['팔꿈치를 잠그지 않는다']).exCues.length, 0);
  assert.ok(guideFor(ex('스미스 스쿼트'), {id: 'gm:smith', generic: true}, EXERCISE_ENRICH[ex('스미스 스쿼트').id].c).exCues.length > 0);
  assert.doesNotMatch(guideFor(ex('러닝머신'), null).safety.join(' '), /무게/);
  assert.match(guideFor(ex('러닝머신'), null).safety.join(' '), /안전 키/);
  assert.match(guideFor(ex('필라테스 리포머'), null).safety.join(' '), /편한 범위/);
  assert.match(guideFor(ex('레그 프레스 카프 레이즈'), null, EXERCISE_ENRICH[ex('레그 프레스 카프 레이즈').id].c).steps[0], /위치를 먼저 확인/);
  assert.ok(guideFor(ex('데드리프트'), null, EXERCISE_ENRICH[ex('데드리프트').id].c).steps.every(x => /요.$/.test(x)), '해요 말투');
});
test('유튜브 검색어: 제조사 머신 · 일반 머신 · 프리웨이트', () => {
  const nt = BUILTIN_BRANDS.find(b => /뉴텍/.test(b.manufacturer));
  assert.match(youtubeQuery({name: nt.exercise}, nt), /^뉴텍 .+ 사용법$/);
  assert.equal(youtubeQuery(ex('리버스 펙덱'), {id: 'gm:rear-delt', generic: true}), '리어 델트 머신 사용법');
  assert.equal(youtubeQuery(ex('벤트오버 레터럴 레이즈'), null), '벤트오버 레터럴 레이즈 자세');
  assert.equal(youtubeQuery(ex('러닝머신'), null), '러닝머신 사용법');
  assert.match(youtubeURL('뉴텍 리어 델트 머신 사용법'), /^https:\/\/www\.youtube\.com\/results\?search_query=/);
  for (const b of BUILTIN_BRANDS) assert.doesNotMatch(youtubeQuery({name: b.exercise}, b), /undefined|\(|\)/);
});
test('요령 칸: 접혀 있고 안에 사용법·안전·유튜브·안내 문구', () => {
  const h = knowHTML(ex('레그 프레스'), x => x, {machine: {id: 'gm:leg-press-45', generic: true}});
  assert.match(h, /<details class="ex-know">/); assert.doesNotMatch(h, /<details class="ex-know" open/);
  assert.match(h, /기본 사용법 · 45° 레그 프레스/); assert.match(h, /안전 걸쇠/); assert.match(h, /yt-link/); assert.match(h, /트레이너/);
});

test('바꿔 할 운동은 같은 움직임 안에서(옆·뒤 어깨, 레그 컬·카프가 섞이지 않게)', async () => {
  const {alternativesFor, familyOf} = await import('../exercise-knowledge.js');
  const alt = n => alternativesFor(n).map(x => x.name);
  assert.ok(alt('사이드 레터럴 레이즈').every(n => /레터럴|업라이트/.test(n) && !/벤트오버/.test(n)));
  assert.ok(alt('리버스 펙덱').every(n => familyOf(n) === '뒤 어깨'));
  assert.ok(!alt('레그 컬').some(n => /카프/.test(n)));
  assert.ok(!alt('레그 프레스 카프 레이즈').some(n => /스쿼트/.test(n)));
  assert.ok(!alt('인클라인 벤치프레스').some(n => /디클라인 (벤치|덤벨|체스트)/.test(n)));
  assert.equal(familyOf('버티컬 레그 프레스'), '레그 프레스');
  assert.equal(familyOf('할로우 바디 홀드'), '몸통 버티기');
  assert.equal(alt('레그 컬').at(-1), '노르딕 햄스트링 컬'); // 어려운 동작은 뒤로
});
