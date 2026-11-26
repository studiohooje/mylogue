import test from 'node:test';
import assert from 'node:assert/strict';
import {coachHTML, COACH_ENABLED} from '../coach-ui.js';
import {renderHomeTimeline} from '../timeline-view.js';
import {cleanWorkout} from '../domain.js';

test('AI 코치: 지금은 잠긴 미리보기만(누를 버튼 없음), 켜면 프리미엄에게만 버튼', () => {
 assert.equal(COACH_ENABLED, false);
 const locked = coachHTML();
 assert.match(locked, /마이로그 프리미엄/);
 assert.match(locked, /예시 화면/);
 assert.match(coachHTML({db:{settings:{proteinGoal:150}, meals:[{date:"2026-11-21", name:"닭", protein:60, calories:300}]}, today:"2026-11-21", name:"홍"}), /단백질이 오늘 목표의 <b>40%<\/b>/);
 assert.match(coachHTML({db:{}, today:'2026-11-21', name:'내 계정'}), /내 몸에 맞춘 리포트/);
 assert.match(coachHTML({db:{}, today:'2026-11-21', name:'홍'}), /홍님 몸에 맞춘 리포트/);
 assert.match(locked, /coach-paper" aria-hidden="true"/);
 assert.doesNotMatch(locked, /data-coach=/);
 assert.doesNotMatch(coachHTML({enabled:true, premium:false}), /data-coach=/);
 assert.match(coachHTML({enabled:true, premium:true}), /data-coach="meal"/);
});

test('홈: 기록 버튼은 수치·식사·운동 순, 운동 칸 오른쪽에 최근 7일 요일 흐름', () => {
 const D = '2026-11-21', y = '2026-11-20';
 const html = renderHomeTimeline({meals:[], body:[], settings:{}, workouts:[cleanWorkout({date:y, exercises:[{name:'스쿼트', sets:[{weight:60, reps:8}]}]}), cleanWorkout({date:'2026-11-19', rest:true, exercises:[]})]}, D);
 const a = html.indexOf('수치 기록'), b = html.indexOf('식사 기록'), c = html.indexOf('운동 기록');
 assert.ok(a < b && b < c);
 assert.equal((html.match(/class="wl-row/g)||[]).length, 7);
 assert.match(html, /wl-row today"><b>토<\/b><em><\/em>/, '오늘 기록 없음 → 빈칸');
 assert.match(html, /data-wl-more="2026-11-20" title="금 · 하체"><b>금<\/b><em><span class="wl-txt">하체<\/span><span class="wl-cat">웨이트<\/span>/); // 5.4.6 넓은 칸은 부위, 좁은 칸은 종류만(누르면 부위)
 assert.match(html, /wl-row rest"[^>]*><b>목<\/b><em><svg class="rest-ico"/);
});
