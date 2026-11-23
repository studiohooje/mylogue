import test from 'node:test';
import assert from 'node:assert/strict';
import {weekMoves,praiseLine,weekHeroHTML,recovery,prCards,growthLines,milestoneLines,totals,newRecords,resultCardHTML,overreachNote} from '../workout-story.js';
import {artFile,exArtHTML} from '../exercise-art-ui.js';

const lift=(id,date,name,kg,reps=5,part='하체',extra={})=>({id,date,exercises:[{name,part,kind:'strength',sets:[{weight:kg,reps,completed:true}]}],...extra});
const db={workouts:[
 lift('a','2026-10-22','바벨 백 스쿼트',60),
 lift('b','2026-11-17','바벨 백 스쿼트',70),
 {id:'c',date:'2026-11-18',exercises:[{name:'걷기',kind:'cardio',durationMin:30,sets:[]}]},
 {id:'r',date:'2026-11-19',rest:true,exercises:[]},
 lift('p','2026-11-21','바벨 백 스쿼트',80,5,'하체',{planned:true}),
]};

test('운동한 날은 산책을 포함하고 휴식·계획은 세지 않는다',()=>{
 const w=weekMoves(db,'2026-11-23');// 11/23은 월요일 → 새 주
 assert.equal(w.count,0);
 const last=weekMoves(db,'2026-11-22');
 assert.equal(last.count,2);
 assert.ok(last.days.has('2026-11-18'));
});
test('칭찬 문구에는 점수·무게가 없다',()=>{
 for(const s of [praiseLine({count:0,today:false},3),praiseLine({count:2,today:true},3),praiseLine({count:5,today:false},3)]){
  assert.doesNotMatch(s,/점|kg|초과/);
 }
 const h=weekHeroHTML(db,'2026-11-22',2);
 assert.match(h,/week-hero full/);
 assert.match(h,/data-week-goal/);
});
test('회복 상태와 최고 기록 카드',()=>{
 const r=recovery(db,'2026-11-18');
 assert.equal(r.find(x=>x.part==='하체').state,'fresh');
 const c=prCards(db,'2026-11-22');
 assert.equal(c[0].best,70);// 계획 기록 80kg은 제외
 assert.ok(growthLines(db,'2026-11-22').some(x=>x.diff===10));
});
test('누적 이야기와 새 기록, 결과 카드',()=>{
 assert.ok(milestoneLines(totals(db)).length>=0);
 const w=lift('n','2026-11-23','바벨 백 스쿼트',75);
 assert.equal(newRecords(db,w).length,1);
 const html=resultCardHTML(db,w,{burn:{kcal:120}});
 assert.match(html,/오늘도 했어요/);
 assert.match(html,/새/);
 assert.equal(typeof overreachNote(db,'2026-11-22'),'string');
});
test('그림은 별칭으로도 찾고, 없으면 부위 글자로 채운다',()=>{
 assert.equal(artFile('벤프'),artFile('벤치프레스'));
 assert.ok(artFile('벤프'));
 assert.equal(exArtHTML({name:'아무도 모르는 운동 xyz',part:'등'}),'');
 assert.match(exArtHTML({name:'아무도 모르는 운동 xyz',part:'등'},'ex-art-sm',{fallback:true}),/ex-art-ph[^>]*>등</);
});

import {repairQuickPlanned,isFuture} from '../domain.js';
test('빠른 기록이 예정으로 잘못 저장된 것을 바로잡는다',()=>{
 assert.equal(['2020-01-01T10:00'].every(t=>isFuture(t)),false);
 const bad={id:'q',date:'2026-11-20',planned:true,updatedAt:'2026-11-20T10:31:00.000Z',exercises:[{name:'벤치프레스',sets:[{weight:50,reps:5,completedAt:'2026-11-20T19:30'}]}]};
 // 저장 시각(UTC 10:31 = 한국 19:31)보다 앞선 세트 → 실제로 한 운동
 const future={id:'f',date:'2026-11-30',planned:true,updatedAt:'2026-11-20T10:31:00.000Z',exercises:[{name:'스쿼트',sets:[{weight:60,reps:5,completedAt:'2026-11-30T19:00'}]}]};
 const plan={id:'p',date:'2026-11-21',planned:true,title:'계획',exercises:[]};
 const out=repairQuickPlanned({workouts:[bad,future,plan]},'2026-11-23T00:00:00.000Z');
 assert.equal(out.workouts[0].planned,undefined);
 assert.equal(out.workouts[1].planned,true);
 assert.equal(out.workouts[2].planned,true);
 const same={workouts:[future,plan]};assert.equal(repairQuickPlanned(same),same);
});
