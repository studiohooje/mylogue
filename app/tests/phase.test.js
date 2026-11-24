import test from 'node:test';
import assert from 'node:assert/strict';
import {PHASE_TYPES, newPhaseWizard, planCheck, readPhaseAnswers, buildPhase, kcalDelta, phaseStatus, phaseAdvice, phaseRecap, endPhase, phaseBadgeHTML, phaseWizardHTML, progressLine} from '../phase.js';
import {voiceCandidates, homeVoice, voiceHTML} from '../home-voice.js';

// 4.17.0 목표 페이즈: 유형별 질문·안전 안내·진행·제안·회고 / 홈 한마디
const body = (date, weight, extra = {}) => ({date, weight, ...extra});
const series = (start, n, from, perDay, extra = () => ({})) => [...Array(n)].map((_, i) => { const d = new Date(new Date(start + 'T12:00:00').getTime() + i * 86400000); const ds = d.toISOString().slice(0, 10); return body(ds, Math.round((from + perDay * i) * 10) / 10, extra(i)); });

test('유형마다 다른 질문, 너무 빠른 목표는 안내', () => {
  assert.deepEqual(PHASE_TYPES.map(t => t.id), ['diet', 'leanbulk', 'recomp', 'bulk', 'maintain', 'peak', 'gainweight', 'reverse', 'dietbreak']);
  const db = {body: [body('2026-11-01', 80, {bodyFatPct: 25, skeletalMuscle: 33})]};
  const st = {...newPhaseWizard(db, 'diet'), answers: {loseKg: 12}, weeks: 8};
  assert.equal(st.now.weight, 80);
  const c = planCheck(st); assert.match(c.notes[0], /주당 약 1.5kg/); assert.ok(c.warn.some(w => /1%/.test(w)));
  assert.equal(planCheck({...st, answers: {loseKg: 6}, weeks: 12}).warn.length, 0);
  assert.match(planCheck({...newPhaseWizard(db, 'leanbulk'), answers: {gainKg: 6}, weeks: 12}).warn[0], /0.25kg/);
  assert.throws(() => readPhaseAnswers({type: 'diet'}, {}), /목표치/);
  assert.deepEqual(readPhaseAnswers({type: 'recomp'}, {fatPct: '20', muscleKg: ''}), {fatPct: 20});
  assert.throws(() => readPhaseAnswers({type: 'bulk'}, {gainKg: '99'}), /1~25/);
  assert.match(phaseWizardHTML({...newPhaseWizard(db, 'recomp')}, db, '2026-11-02'), /목표 체지방률/);
});
test('저장·식단 칼로리 차이·진행 상황', () => {
  const db0 = {body: [body('2026-10-01', 80)]};
  const ph = buildPhase({...newPhaseWizard(db0, 'diet'), answers: {loseKg: 6}, weeks: 12, start: '2026-10-01'}, '2026-10-01');
  assert.equal(ph.target.weight, 74); assert.equal(ph.end, '2026-12-24'); assert.equal(kcalDelta(ph), -550);
  assert.equal(kcalDelta({type: 'leanbulk'}), 250); assert.equal(kcalDelta({type: 'recomp'}), -150);
  assert.throws(() => buildPhase({...newPhaseWizard(db0, 'diet'), answers: {loseKg: 6}, weeks: 1}, '2026-10-01'), /2~52주/);
  const db = {settings: {phase: ph}, body: series('2026-10-01', 36, 80, -0.07)};
  const s = phaseStatus(db, '2026-11-05');
  assert.equal(s.week, 6); assert.ok(s.weightChange < -2 && s.weightChange > -2.6, String(s.weightChange)); assert.ok(s.goalPct > 0.3);
  assert.match(progressLine(s), /-2\.\dkg \/ 목표 -6kg/);
  assert.match(phaseBadgeHTML(s), /다이어트 페이즈.*6\/12주차/);
  assert.match(phaseBadgeHTML(null), /페이즈 정하기/);
});
test('제안: 너무 빠르면 더 먹기, 느리면 조금 줄이기, 린매스업 체지방 상한, 인바디 오래됨', () => {
  const mk = (type, perDay, target, extra = () => ({})) => { const ph = {type, start: '2026-10-01', weeks: 12, end: '2026-12-24', startWeight: 80, startFatPct: 20, perWeek: type === 'diet' ? -0.5 : 0.25, target}; return {settings: {phase: ph}, body: series('2026-10-01', 30, 80, perDay, extra)}; };
  assert.equal(phaseAdvice(mk('diet', -0.2, {loseKg: 6}), '2026-10-30')[0].kind, 'fast');
  assert.equal(phaseAdvice(mk('diet', 0, {loseKg: 6}), '2026-10-30')[0].kind, 'slow');
  assert.equal(phaseAdvice(mk('diet', -0.07, {loseKg: 6}), '2026-10-30')[0].kind, 'on');
  const lb = phaseAdvice(mk('leanbulk', 0.03, {gainKg: 3, fatCap: 21}, i => i === 29 ? {bodyFatPct: 22} : {}), '2026-10-30');
  assert.ok(lb.some(a => a.kind === 'cap'), JSON.stringify(lb));
  const rc = phaseAdvice(mk('recomp', 0, {fatPct: 16}), '2026-11-20');
  assert.equal(rc[0].kind, 'inbody');
  assert.deepEqual(phaseAdvice(mk('diet', -0.07, {loseKg: 6}), '2026-10-10'), []); // 2주 전엔 판단 안 함
});
test('페이즈 마치기 → 회고와 기록 보관', () => {
  const ph = {id: 'p1', type: 'bulk', start: '2026-09-01', weeks: 8, end: '2026-10-27', startWeight: 70, perWeek: 0.4, target: {gainKg: 3}};
  const db = {settings: {phase: ph}, body: series('2026-09-01', 56, 70, 0.05), workouts: [{date: '2026-09-02', exercises: []}, {date: '2026-09-04', exercises: []}], meals: []};
  const r = phaseRecap(db, ph, '2026-10-27');
  assert.equal(r.workoutDays, 2); assert.equal(r.weeks, 8); assert.ok(r.weightChange > 2.4);
  const st = endPhase(db.settings, r, '2026-10-27');
  assert.equal(st.phase, undefined); assert.equal(st.phaseHistory.length, 1); assert.equal(st.phaseHistory[0].recap.workoutDays, 2);
});
test('홈 한마디: 페이즈 제안·연속 운동·물 무게 설명이 일반 문장보다 먼저, 하루 동안 같은 말', () => {
  globalThis.localStorage ??= {getItem: () => null, setItem() {}, removeItem() {}};
  const today = '2026-11-23', now = new Date('2026-11-23T08:00:00');
  const db = {workouts: [{date: '2026-11-21'}, {date: '2026-11-22'}, {date: '2026-11-23'}], meals: [{date: '2026-11-22', name: '라면', sodium: 3200, loggedAt: '2026-11-22T12:00:00'}], body: [body('2026-11-22', 70), body('2026-11-23', 70.6)]};
  const c = voiceCandidates(db, today, now), kinds = c.map(x => x.kind);
  assert.ok(kinds.includes('streak') && kinds.includes('water') && kinds.includes('general'));
  assert.match(c.find(x => x.kind === 'water').sub, /3,200mg/);
  const v = homeVoice(db, today, now); assert.ok(['water', 'streak'].includes(v.kind));
  assert.deepEqual(homeVoice(db, today, now), v);
  const h = voiceHTML({kind: 'x', title: '<b>', sub: 's', action: {modal: 'body', label: '체중'}}, '');
  assert.match(h, /&lt;b&gt;/); assert.match(h, /data-modal="body"/);
  assert.equal(homeVoice({}, today, now).kind, 'morning');
});
