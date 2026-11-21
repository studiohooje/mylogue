import test from 'node:test';import assert from 'node:assert/strict';
import {planSync,isFreshDevice,cloudRecords,recordsToDB} from '../cloud-model.js';
import {emptyDB} from '../domain.js';
test('4.1.2 새 기기 첫 로그인: 기본 설정이 서버와 달라도 충돌 없이 서버 기록을 받는다',()=>{
 const web={...emptyDB(),meals:[{id:'m1',date:'2026-11-21',name:'콩 현미밥'}],settings:{...emptyDB().settings,calorieGoal:2300}};
 const remote=Object.fromEntries(Object.entries(cloudRecords(web)).map(([k,v])=>[k,{revision:1,payload:v}]));
 const phone={...emptyDB(),settings:{...emptyDB().settings,preferences:{onboarded:true}}};
 assert.equal(isFreshDevice(phone,{}),true);
 const old=planSync(cloudRecords(phone),remote,{});assert.ok(old.conflicts.length>0,'예전 규칙은 충돌로 멈춤');
 const p=planSync(cloudRecords(phone),remote,{},{}, {fresh:true});assert.equal(p.conflicts.length,0);
 const db=recordsToDB(p.merged,phone);assert.equal(db.meals.length,1);assert.equal(db.settings.calorieGoal,2300);assert.deepEqual(db.settings.preferences,{onboarded:true},'서버에 없는 이 기기 값은 유지');
});
test('이 기기에 직접 남긴 기록이 있으면 첫 동기화라도 예전처럼 충돌을 보여 준다',()=>{assert.equal(isFreshDevice({...emptyDB(),meals:[{id:'x'}]},{}),false);assert.equal(isFreshDevice(emptyDB(),{a:{revision:1,payload:'1'}}),false)});
