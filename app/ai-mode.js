// 4.29.0 'AI로 입력' 방식 고르기(대표님 2026-11-25). 프리미엄이 아니어도 누르면 세 가지 중에서 고른다.
// ① 대화하듯 입력(앱 안 AI, 프리미엄 · 무료도 하루 몇 번) ② 지시문으로 내가 쓰는 AI에게 요청(답 붙여넣기) ③ 내가 쓰는 AI와 연결(PC)
// 고른 뒤 '항상 이 방식으로 열까요?'에 예를 누르면 다음부터 바로 그 방식으로 열리고, 각 화면의 '입력 방식 바꾸기'로 다시 고른다.
// 이 파일은 app.js를 import하지 않는다.
import {scopedKey} from './storage-scope.js';

export const AI_MODES = ['chat', 'prompt', 'connect'];
const KEY = 'mylogue.aiMode';
export function aiModeDefault() { try { const v = globalThis.localStorage?.getItem(scopedKey(KEY)); return AI_MODES.includes(v) ? v : ''; } catch { return ''; } }
export function setAiModeDefault(v) { try { AI_MODES.includes(v) ? globalThis.localStorage?.setItem(scopedKey(KEY), v) : globalThis.localStorage?.removeItem(scopedKey(KEY)); } catch {} }

const OPTS = [
 ['chat', '💬', '대화하듯 입력하기', plus => plus ? '앱 안의 AI에게 말하거나 사진을 보내면 기록 카드로 정리해요.' : '앱 안의 AI에게 말하듯 남겨요. 프리미엄 기능이지만 무료로도 하루 몇 번 쓸 수 있어요.', plus => plus ? '프리미엄' : '프리미엄 · 무료도 하루 몇 번'],
 ['prompt', '📋', '내가 쓰는 AI에게 지시문으로 요청하기', () => 'ChatGPT·Gemini·Claude 등 평소 쓰는 AI에 지시문을 한 번 붙이고, 받은 답을 붙여넣어요.', () => '무료'],
 ['connect', '🔗', '내가 쓰는 AI와 연결하기', () => 'PC의 AI 도구(Codex·Claude Code 등)와 한 번 연결하면, 말만 해도 검토함에 들어와요.', () => '무료 · PC'],
];
export const modeName = m => (OPTS.find(o => o[0] === m) || [])[2] || '';

// st: {chosen: 'chat'|… 고른 뒤 '항상?'을 묻는 중이면}
export function aiPickHTML(st = {}, {plus = false, current = ''} = {}) {
 if (st.chosen) {
  return `<div class="aim"><p class="aim-q"><b>앞으로 ‘AI로 입력’을 누르면<br>‘${modeName(st.chosen)}’로 바로 열까요?</b></p><p class="hint">나중에 각 화면의 ‘입력 방식 바꾸기’로 언제든 바꿀 수 있어요.</p><div class="actions aim-actions"><button type="button" class="button" data-ai-always="${st.chosen}">항상 이 방식으로</button><button type="button" class="button secondary" data-ai-once="${st.chosen}">이번만</button></div></div>`;
 }
 return `<div class="aim"><p class="hint">AI에게 기록을 맡기는 방법을 골라 주세요. 어떤 방법이든 확정은 내가 해요.</p><div class="aim-list">${OPTS.map(([k, icon, title, desc, tag]) => `<button type="button" class="aim-opt${current === k ? ' on' : ''}" data-ai-mode="${k}"><span class="aim-icon" aria-hidden="true">${icon}</span><span class="aim-text"><b>${title}</b><small>${desc(plus)}</small></span><span class="aim-tag">${tag(plus)}</span></button>`).join('')}</div>${current ? `<p class="hint">지금 기본: ${modeName(current)} · <button type="button" class="text-button" data-ai-always="">기본 없이 매번 고르기</button></p>` : ''}</div>`;
}
export const changeModeButton = (warn = false) => `<button type="button" class="ai-back" data-ai-pick aria-label="뒤로 가서 다른 방법으로 입력">‹ 다른 방법으로 입력</button>${warn ? '<div class="ai-switch-warn" role="alertdialog"><b>다른 방법으로 입력할까요?</b><span>지금 적은 글이 지워져요. 이미 저장한 기록은 그대로예요.</span><div class="actions"><button type="button" class="button" data-ai-pick-ok>지우고 바꾸기</button><button type="button" class="button secondary" data-ai-pick-no>계속 입력</button></div></div>' : ''}`;
