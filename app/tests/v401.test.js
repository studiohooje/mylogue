import test from 'node:test';import assert from 'node:assert/strict';
import {duplicateMessage} from '../ai-drafts.js';
test('4.0.1 중복으로 확정 거절 시 어떤 기록과 겹치는지 알려 준다',()=>{const m=duplicateMessage('meals',{date:'2026-11-21',loggedAt:'2026-11-21T12:50:00',name:'콩 현미밥',servingQty:200,servingUnit:'g'});assert.match(m,/11\/21 12:50 ‘콩 현미밥 200g’/);assert.match(m,/초안은 버리고/);assert.match(duplicateMessage('workouts',{date:'2026-11-20',title:'하체'}),/‘하체’/)});
