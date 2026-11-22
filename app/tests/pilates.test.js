import test from 'node:test';
import assert from 'node:assert/strict';
import {cleanMove, cleanMoves, movesForMember, bumpSpring, springText, moveText, flowStats, lastMove, taughtMoves, moveProgress, cleanAssessment, assessmentDiff, pilatesRowHTML, movesListHTML, briefingHTML} from '../pilates.js';
import {cleanWorkout} from '../domain.js';
import {rowsToExercises, exercisesToRows, sessionDraft, sessionSummary, coachSendHTML, coachData, emptySend} from '../coach.js';

test('필라테스 동작: 이상한 값은 버리고 빈 값은 null', () => {
 const m = cleanMove({name:' 풋워크 ', apparatus:'리포머', springs:[{c:'빨강', n:2}, {c:'무지개', n:1}, {c:'파랑', n:0}], reps:'10', sec:'', level:'9', props:['매직서클','망치'], obs:'불편감 있음', area:['허리','배꼽']});
 assert.equal(m.name, '풋워크');
 assert.deepEqual(m.springs, [{c:'빨강', n:2}]);
 assert.equal(m.reps, 10); assert.equal(m.sec, null); assert.equal(m.level, null);
 assert.deepEqual(m.props, ['매직서클']); assert.deepEqual(m.area, ['허리']);
 assert.equal(cleanMove({name:''}), null);
 assert.equal(cleanMoves([{name:'a'}, {}, {name:'b'}]).length, 2);
});

test('스프링 칩: 누를 때마다 +1, 4 다음은 빠짐', () => {
 let m = {springs:[]};
 for(let i=0; i<4; i++) m = bumpSpring(m, '빨강');
 assert.equal(springText(m), '빨강4');
 m = bumpSpring(m, '빨강'); assert.equal(springText(m), '');
 m = bumpSpring(bumpSpring(m, '빨강'), '파랑'); assert.equal(springText(m), '빨강1+파랑1');
});

test('강사 전용 큐잉은 회원에게 가지 않는다', () => {
 const out = movesForMember([{name:'헌드레드', apparatus:'매트', cue:'비밀 메모', cueShow:false}, {name:'롤업', apparatus:'매트', cue:'내쉬며 시작'}]);
 assert.equal(out[0].cue, ''); assert.equal(out[1].cue, '내쉬며 시작');
});

test('코치 수업: 필라테스 줄 → 운동 기록 → 다시 줄', () => {
 const rows = [{kind:'pilates', name:'필라테스 리포머', min:'50', type:'듀엣', moves:[{name:'풋워크', apparatus:'리포머', springs:[{c:'빨강', n:3}], reps:'10', setup:'풋바 2', cue:'갈비뼈 닫기', cueShow:false}]}];
 const ex = rowsToExercises(rows);
 assert.equal(ex[0].kind, 'cardio'); assert.equal(ex[0].sessionType, '듀엣'); assert.equal(ex[0].moves[0].reps, 10);
 const back = exercisesToRows(ex);
 assert.equal(back[0].kind, 'pilates'); assert.equal(back[0].moves[0].setup, '풋바 2');
 const d = sessionDraft({id:'s1', date:'2026-11-22', exercises:ex, ptOff:[]}, {id:'c1'}, {trainerUid:'u', trainerName:'코치'});
 assert.equal(d.parsedData.exercises[0].moves[0].cue, '', '강사 전용 큐는 초안에서 빠짐');
 assert.match(sessionSummary({title:'리포머', exercises:ex}), /동작 1개/);
 // 회원이 확정하면 저장 계약을 통과한다(시간 없이 동작만 있어도)
 const w = cleanWorkout({date:'2026-11-22', exercises:[{...d.parsedData.exercises[0], durationMin:null}]});
 assert.equal(w.exercises[0].moves.length, 1); assert.equal(w.exercises[0].sessionType, '듀엣');
 const w2 = cleanWorkout({date:'2026-11-22', exercises:[{name:'필라테스 매트', kind:'cardio', durationMin:30, sessionType:'트리오'}]});
 assert.equal(w2.exercises[0].sessionType, '트리오'); assert.equal(w2.exercises[0].moves, undefined);
});

test('흐름·지난 값·가르친 동작·진척', () => {
 const moves = cleanMoves([{name:'풋워크', apparatus:'리포머', springs:[{c:'빨강', n:3}]}, {name:'헌드레드', apparatus:'리포머', springs:[{c:'빨강', n:1}]}, {name:'롤업', apparatus:'매트'}]);
 assert.deepEqual([flowStats(moves).swaps, flowStats(moves).changes], [1, 1]);
 const sessions = [{date:'2026-10-01', targets:[{clientId:'c1', status:'confirmed'}], exercises:[{moves:[{name:'풋워크', apparatus:'리포머', springs:[{c:'빨강', n:3}], setup:'풋바 2'}]}]}, {date:'2026-11-20', targets:[{clientId:'c1', status:'confirmed'}], exercises:[{moves:[{name:'풋워크', apparatus:'리포머', springs:[{c:'빨강', n:2}]}, {name:'스완', apparatus:'체어'}]}]}];
 assert.equal(springText(lastMove(sessions, 'c1', '풋워크')), '빨강2');
 const tm = taughtMoves(sessions, 'c1', '2026-11-22');
 assert.equal(tm.all.length, 2); assert.equal(tm.stale.length, 0);
 const ws = sessions.map(s => ({date:s.date, exercises:s.exercises}));
 const p = moveProgress(ws); assert.equal(p[0].first.spring, '빨강3'); assert.equal(p[0].last.spring, '빨강2');
 assert.match(moveText(moves[0]), /리포머 · 풋워크 · 빨강3/);
});

test('자세 관찰: 정해진 단계만, 바뀐 항목 비교', () => {
 const a = cleanAssessment({date:'2026-10-01', posture:{shoulder:'약간', head:'이상함'}, move:{squat:'편안함'}});
 assert.deepEqual(a.posture, {shoulder:'약간'});
 const b = cleanAssessment({date:'2026-11-01', posture:{shoulder:'차이 없음'}, move:{squat:'편안함'}});
 assert.deepEqual(assessmentDiff(a, b), [['좌우 어깨 높이', '약간', '차이 없음']]);
});

test('화면: 필라테스 줄·읽기 목록·브리핑·수업 입력', () => {
 const html = pilatesRowHTML({kind:'pilates', name:'필라테스 리포머', min:'50', type:'개인', moves:[{name:'풋워크', apparatus:'리포머', springs:[{c:'빨강', n:2}]}]}, 0, {lastOf:() => ({springs:[{c:'파랑', n:1}], setup:'풋바 3', apparatus:'리포머'})});
 assert.match(html, /data-pm-spring="0:0:빨강"/); assert.match(html, /＋ 동작/);
 assert.doesNotMatch(movesListHTML([{name:'헌드레드', apparatus:'매트', cue:'강사', springs:[]}], {cue:false}), /강사/);
 const data = coachData({settings:{coachClients:[{id:'c1', name:'김회원', cautions:'허리 불편'}], coachSessions:[{id:'s1', date:'2026-11-20', title:'리포머', targets:[{clientId:'c1', status:'confirmed'}], exercises:[{name:'필라테스 리포머', kind:'cardio', moves:[{name:'풋워크', apparatus:'리포머', springs:[{c:'빨강', n:2}], obs:'불편감 있음', area:['허리']}]}]}]}});
 const b = briefingHTML(data, data.clients[0], {today:'2026-11-22'});
 assert.match(b, /수업 전 브리핑/); assert.match(b, /지난번 불편감: 풋워크\(허리\)/);
 const send = coachSendHTML(data, {...emptySend('2026-11-22', ['c1']), rows:[{kind:'pilates', name:'필라테스 매트', min:'45', type:'개인', moves:[]}]});
 assert.match(send, /＋ 필라테스 수업/); assert.match(send, /pm-move-names/); assert.match(send, /지난 수업으로 시작/);
});
