// 2026-11-28 대표님: 폰 키보드가 입력이 끝나도 계속 떠 있어 불편. 단, 앱이 짐작해서 닫지는 않는다 — 끝냈다는 신호 세 가지에만 닫는다.
// ① 키보드의 확인 키(Enter·검색·완료) ② 검색칸을 쓰다가 결과(버튼)를 고름 ③ 입력칸 밖 빈 곳을 누름.
// 대화창(채팅 입력)처럼 이어서 써야 하는 칸은 data-keep-kb 또는 textarea라 닫지 않는다. 이 파일은 app.js를 import하지 않는다.
const TYPING = 'input:not([type=checkbox]):not([type=radio]):not([type=range]):not([type=button]):not([type=submit]):not([type=file]):not([type=color]),textarea';
const INTERACTIVE = 'button,a,input,textarea,select,label,summary,[role=button],[role=tab],[role=option],[contenteditable],[tabindex]:not([tabindex="-1"])';
export const isTyping = el => !!el?.matches?.(TYPING);
export const isSearchField = el => isTyping(el) && (el.type === 'search' || /search/i.test(el.id || '') || el.getAttribute?.('role') === 'combobox');
const keep = el => !!el?.closest?.('[data-keep-kb]') || el?.id === 'chat-text';
const close = el => { if(el && document.activeElement === el && !keep(el)) el.blur(); };

// ① Enter: 원래 동작(폼 보내기 등)은 그대로 두고 그다음에 닫는다. textarea는 줄바꿈이라 제외
export function onKeyDown(e){
 const t = e.target;
 if((e.key !== 'Enter' && e.keyCode !== 13) || !isTyping(t) || t.tagName === 'TEXTAREA' || keep(t)) return false;
 setTimeout(() => close(t), 0);
 return true;
}
// ②③ 누르기: 누르기 전에 포커스가 어디 있었는지 기억(누른 뒤 화면을 다시 그리며 검색칸이 되살아나도 닫는다)
let before = null;
export function onPointerDown(e){ before = isTyping(document.activeElement) ? document.activeElement : null; }
export function onClick(e){
 const was = before; before = null;
 if(!was || keep(was)) return false;
 const t = e.target, hit = t?.closest?.(INTERACTIVE);
 // ③ 빈 곳(누를 수 있는 것이 아닌 곳)
 if(!hit){ setTimeout(() => { const a = document.activeElement; if(isTyping(a)) close(a); }, 0); return true; }
 // ② 검색칸을 쓰다가 결과·버튼을 고름(검색칸 안의 지우기 버튼은 다시 쓰려는 것이라 제외)
 if(isSearchField(was) && hit !== was && !hit.matches(TYPING) && !hit.closest('[data-kb-stay]') && !/clear|지우기/i.test(`${hit.className || ''} ${hit.getAttribute?.('aria-label') || ''}`)){
  setTimeout(() => { const a = document.activeElement; if(isSearchField(a)) close(a); }, 0);
  return true;
 }
 return false;
}
export function installKeyboardClose(root = globalThis.document){
 if(!root?.addEventListener) return;
 root.addEventListener('keydown', onKeyDown);
 root.addEventListener('pointerdown', onPointerDown, true);
 root.addEventListener('click', onClick);
}
