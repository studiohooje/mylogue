// 2026-11-28 키보드 닫기: 확인 키·검색 결과 고르기·빈 곳 누르기에만
import test from 'node:test';
import assert from 'node:assert/strict';
import {onKeyDown, onPointerDown, onClick, isSearchField} from '../keyboard.js';

const el = (tag, props = {}, parent = null) => {
 const e = {tagName: tag.toUpperCase(), id: props.id || '', type: props.type || (tag === 'input' ? 'text' : ''), className: props.className || '', blurred: 0, parent, attrs: props.attrs || {},
  blur(){ this.blurred++; if(globalThis.document.activeElement === this) globalThis.document.activeElement = null; },
  getAttribute(k){ return this.attrs[k] ?? null; },
  matches(sel){ if(sel.includes('input:not') || sel === 'input,textarea') return tag === 'input' || tag === 'textarea'; return false; },
  closest(sel){ let n = this; while(n){ if(sel.includes('[data-keep-kb]') && n.attrs?.['data-keep-kb'] !== undefined) return n; if(/button/.test(sel) && n.tagName === 'BUTTON') return n; if(/input/.test(sel) && (n.tagName === 'INPUT' || n.tagName === 'TEXTAREA')) return n; n = n.parent; } return null; }};
 return e;
};
const tick = () => new Promise(r => setTimeout(r, 5));
test('확인 키(Enter)를 누르면 입력칸에서 키보드가 닫힌다, textarea·대화창은 그대로', async () => {
 const i = el('input', {id: 'q-set-weight', type: 'number'}); globalThis.document = {activeElement: i};
 assert.equal(onKeyDown({key: 'Enter', target: i}), true); await tick(); assert.equal(i.blurred, 1);
 const ta = el('textarea'); globalThis.document = {activeElement: ta};
 assert.equal(onKeyDown({key: 'Enter', target: ta}), false);
 const chat = el('input', {id: 'chat-text'}); assert.equal(onKeyDown({key: 'Enter', target: chat}), false);
});
test('검색칸을 쓰다가 결과를 누르면 닫히고, 무게 칸 옆 버튼은 그대로', async () => {
 const s = el('input', {id: 'q-food-search', type: 'search'}); assert.ok(isSearchField(s));
 globalThis.document = {activeElement: s}; onPointerDown({});
 const b = el('button', {className: 'quick-choice db-choice'});
 assert.equal(onClick({target: b}), true); await tick(); assert.equal(s.blurred, 1);
 const w = el('input', {id: 'q-set-weight', type: 'number'}); globalThis.document = {activeElement: w}; onPointerDown({});
 assert.equal(onClick({target: el('button')}), false); await tick(); assert.equal(w.blurred, 0);
});
test('빈 곳을 누르면 닫힌다', async () => {
 const w = el('input', {id: 'q-set-weight', type: 'number'}); globalThis.document = {activeElement: w}; onPointerDown({});
 assert.equal(onClick({target: el('div')}), true); await tick(); assert.equal(w.blurred, 1);
});
