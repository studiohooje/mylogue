import test from 'node:test';import assert from 'node:assert/strict';
import {daySummary} from '../timeline-view.js';
import {shiftDate,relLabel,eulReul,dateBarHTML,dateBarClick} from '../date-bar.js';
import {relDate,relTime,timeSlots} from '../when-chips.js';
const ex=(part,n,name='x')=>({name,part,kind:'strength',sets:Array.from({length:n},()=>({weight:10,reps:10}))});
test('부위: 많이 한 순서, 40% 미만 빼기, 최대 3개',()=>{assert.equal(daySummary([{exercises:[ex('어깨',3),ex('가슴',12),ex('팔',8),ex('하체',1)]}]),'웨이트(가슴·팔)');assert.equal(daySummary([{exercises:[ex('등',5),ex('가슴',5),ex('어깨',4),ex('팔',4)]}]),'웨이트(등·가슴·어깨)')});
test('날짜 바: 하루 이동·달력·오늘로',()=>{assert.equal(shiftDate('2026-11-01',-1),'2026-10-31');assert.equal(eulReul(relLabel('2026-11-21','2026-11-22')),'어제를');const h=dateBarHTML('2026-11-20','2026-11-22',{open:true,marked:new Set(['2026-11-20'])});assert.match(h,/그저께를 보고 있어요/);assert.match(h,/db-day sel rec/);assert.deepEqual(dateBarClick({dataset:{dbStep:'1'}},{date:'2026-11-20',today:'2026-11-22'}),{date:'2026-11-21',open:false});assert.equal(dateBarClick({dataset:{dbToday:''}},{date:'2026-11-20',today:'2026-11-22'}).date,'2026-11-22')});
test('언제 칸 표시',()=>{assert.match(relDate('2026-11-22',new Date('2026-11-22T10:00:00')),/^오늘 · 11\/22 일/);assert.equal(relTime('17:05'),'오후 5:05');assert.equal(timeSlots('18:20').length,12);assert.equal(timeSlots('18:20')[0],'17:00')});
