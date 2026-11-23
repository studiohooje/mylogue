import test from 'node:test';
import assert from 'node:assert/strict';
import {PERSONAS, personaRecords, PERSONA_DAYS} from '../personas.js';
import {emptyDB, cleanBody, cleanMeal, cleanWorkout, cleanCheckin} from '../domain.js';
import {journey, discoveries} from '../discovery.js';
import {phaseStatus, phaseAdvice} from '../phase.js';
import {analyze} from '../coach-engine.js';
import {hasBanned} from '../coach-knowledge.js';
import {weekSummaryText} from '../ai-coach-ui.js';
import {lastWeek, nextGoals} from '../workout-story.js';
import {returnMode} from '../back-on-track.js';

// 4.17.0 가상 인물 시뮬레이션: 8명 × 120일 기록이 앱 계약을 통과하고, 분석·페이즈·코치가 인물에 맞게 나온다.
const TODAY = '2026-11-23', NOW = new Date('2026-11-23T21:00:00');
const dbOf = id => { const r = personaRecords(id, TODAY, NOW), e = emptyDB(); return {...e, settings: {...e.settings, ...r.settings}, body: r.body.map(cleanBody), meals: r.meals.map(cleanMeal), workouts: r.workouts.map(cleanWorkout), checkins: Object.fromEntries(Object.entries(r.checkins).map(([k, v]) => [k, cleanCheckin(v)]))}; };

for (const p of PERSONAS) test(`${p.name}(${p.line}): 기록 계약·분석·페이즈·코치`, () => {
  const db = dbOf(p.id);
  assert.ok(db.meals.length > 300 && db.body.length > 60);
  assert.ok(db.meals.every(m => m.date <= TODAY && m.calories >= 0));
  const j = journey(db, TODAY);
  assert.deepEqual(j.open, [7, 30, 90]);
  assert.ok(Math.abs(j.avg.kcal - p.kcal) / p.kcal < 0.15, `${p.name} 평균 ${j.avg.kcal} vs 목표 ${p.kcal}`);
  const dir = Math.sign(p.w[1] - p.w[0]);
  if (Math.abs(p.w[1] - p.w[0]) > 2 && !p.plateau) assert.equal(Math.sign(j.trend.perWeek), dir, `${p.name} 추세 방향`);
  const s = phaseStatus(db, TODAY); assert.ok(s && s.type.id === p.phase && s.week >= 12);
  for (const a of phaseAdvice(db, TODAY)) assert.equal(hasBanned(a.text).length, 0, a.text);
  const coach = analyze(db, TODAY);
  for (const c of coach) assert.equal(hasBanned(c.text).length, 0, c.text);
  if (p.phase === 'bulk') assert.ok(!coach.some(c => c.id === 'info.after-feast'), '벌크업 계획 식사에 푸짐 안내 금지');
  if (p.plateau) assert.ok(coach.some(c => c.id === 'info.plateau') || phaseAdvice(db, TODAY).some(a => a.kind === 'slow'), '정체기 인물은 정체 안내');
  assert.ok(discoveries(db, TODAY).length >= 1, `${p.name} 발견 하나 이상`);
  assert.ok(weekSummaryText(db, TODAY).length > 40);
  assert.ok(Array.isArray(nextGoals(db, TODAY)));
  lastWeek(db, TODAY);
});
test('기록 공백 인물(도윤): 공백 동안 기록 없음, 복귀 뒤 이어짐', () => {
  const db = dbOf('doyoon'), dates = new Set(db.meals.map(m => m.date));
  const day = i => { const d = new Date(new Date(`${TODAY}T12:00:00`).getTime() - (PERSONA_DAYS - 1 - i) * 86400000); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
  assert.equal(dates.has(day(65)), false); assert.equal(dates.has(day(75)), true);
  assert.equal(returnMode(db, day(74)) ?.since, day(72));
});
test('같은 날짜·같은 인물이면 같은 기록', () => { assert.deepEqual(personaRecords('sua', TODAY, NOW), personaRecords('sua', TODAY, NOW)); });
