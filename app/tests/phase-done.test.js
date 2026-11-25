// 4.29.0 페이즈를 정한 뒤 정리 화면: 기간·목표·하루 목표·앞으로 볼 것·응원, 누르면 닫힘(data-ph-done)
import test from 'node:test';
import assert from 'node:assert/strict';
import {buildPhase, newPhaseWizard, phaseWizardHTML} from '../phase.js';

test('페이즈를 정하면 정리 화면이 나오고 누르면 닫힌다', () => {
 const today = '2026-11-25';
 const db = {body: [{id: 'b1', date: today, weight: 80, bodyFatPct: 25}], meals: [], workouts: [], settings: {}};
 const wiz = {...newPhaseWizard(db, 'diet'), weeks: 12, answers: {loseKg: 4}};
 const phase = buildPhase(wiz, today, {heightCm: 175});
 const html = phaseWizardHTML({step: 'done', kcal: 1900}, {...db, settings: {phase}}, today);
 assert.match(html, /data-ph-done/);
 assert.match(html, /시작했어요/);
 assert.match(html, /4kg 감량/);
 assert.match(html, /1,900kcal/);
 assert.match(html, /화이팅/);
 assert.ok(!/저장되지|사라져요/.test(html));
});
