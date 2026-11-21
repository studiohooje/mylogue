import test from 'node:test';import assert from 'node:assert/strict';
import {duplicateMessage} from '../ai-drafts.js';
test('4.0.1 중복으로 확정 거절 시 어떤 기록과 겹치는지 알려 준다',()=>{const m=duplicateMessage('meals',{date:'2026-11-21',loggedAt:'2026-11-21T12:50:00',name:'콩 현미밥',servingQty:200,servingUnit:'g'});assert.match(m,/11\/21 12:50 ‘콩 현미밥 200g’/);assert.match(m,/초안은 버려 주세요/);assert.match(duplicateMessage('workouts',{date:'2026-11-20',title:'하체'}),/‘하체’/)});
import {findDuplicate,recordIdentity} from '../ai-drafts.js';
test('4.1.0 같은 음식을 하루에 여러 번: 시각이 다르면 새 기록, 한 끼 전체가 같은 시각에 똑같을 때만 중복',()=>{
 const m=(name,at,qty=200)=>({kind:'meals',record:{date:'2026-11-21',loggedAt:at,slot:'점심',name,servingQty:qty,servingUnit:'g'}});
 const existing=[m('콩 현미밥','2026-11-21T12:50:00'),m('돼지고기 목살 구이','2026-11-21T12:50:00',340)];
 assert.equal(findDuplicate([m('콩 현미밥','2026-11-21T18:30:00')],existing),null,'다른 시각 같은 음식');
 assert.equal(findDuplicate([m('콩 현미밥','2026-11-21T12:50:00'),m('닭가슴살','2026-11-21T12:50:00',100)],existing),null,'같은 시각이어도 한 가지가 다르면');
 assert.ok(findDuplicate([m('콩 현미밥','2026-11-21T12:50:00')],existing),'한 끼 전체가 똑같으면 중복');
 assert.ok(findDuplicate([{kind:'workouts',record:{date:'2026-11-21',title:'하체',gymName:'',exercises:[]}}],[{kind:'workouts',record:{date:'2026-11-21',title:'하체',gymName:'',exercises:[]}}]));
});
