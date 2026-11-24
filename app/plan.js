// 4.17.0 프리미엄(마이로그 플러스) 구조 — 무료/플러스 판단을 이 한 곳에서 한다.
// - 실제 사용자: 서버 계정 문서의 plan('plus') 또는 베타 전체 플러스(BETA_ALL_PLUS). 비용 드는 AI 기능은 서버(AI 서버)가 다시 확인한다.
// - 슈퍼관리자: '보기 기준' 토글로 일반/플러스 화면·기능을 오가며 확인(이 기기에만 저장, 서버 권한은 바뀌지 않음).
// - 가짜 AI 모드(관리자): AI 서버 없이 정해진 답으로 흐름을 시험.
// 원칙: 손 기록·전체 그래프·DB 검색·백 온 트랙·안전 안내는 언제나 무료.
// 4.27.0 재검사 B-27: '무료 약속'은 위 목록에만 한다. 플러스 기능은 베타 동안만 모두에게 열려 있다고 앱·랜딩에 적는다.
import {cloudState} from './cloud-sync.js';
import {isAdminUser} from './admin.js';
import {scopedKey,storageAccount} from './storage-scope.js';

export const BETA_ALL_PLUS = true; // 베타 동안 승인된 모든 계정을 플러스로(AI 서버의 PLUS_ALL과 함께 바꾼다)
export const PRICE = {monthly: 4900};
// 플러스 기능 목록: free = 무료에서 쓸 수 있는 정도(0이면 잠금, 숫자면 개수·횟수), ai = AI 서버가 필요한지
export const FEATURES = [
  {id: 'better-choice', name: '더 나은 선택 제안', free: 1, plus: Infinity, ai: false, note: '무료는 한 끼에 대안 1개'},
  {id: 'what-to-eat', name: '오늘 남은 걸로 뭐 먹지', free: 0, plus: Infinity, ai: false},
  {id: 'discovery', name: '나에 대한 발견', free: 2, plus: Infinity, ai: false, note: '무료는 발견 2개'},
  {id: 'experiment', name: '나만의 실험', free: 1, plus: 3, ai: false, note: '동시에 진행할 수 있는 실험 수'},
  {id: 'situation', name: '상황 대비 플랜', free: 0, plus: Infinity, ai: false, note: '무료도 다음 날 안심 안내는 봄'},
  {id: 'simulator', name: '목표 시뮬레이터', free: 0, plus: Infinity, ai: false},
  {id: 'micro-report', name: '영양 심화 리포트', free: 0, plus: Infinity, ai: false, note: '무료도 하루 나트륨·당류 한 줄은 봄'},
  {id: 'program-auto', name: '운동 프로그램 자동 설계', free: 0, plus: Infinity, ai: false},
  {id: 'ai-photo', name: '음식 사진 기록', free: 1, plus: 20, ai: true, note: '하루 횟수, 인식 실패는 빼지 않음'},
  {id: 'ai-review', name: 'AI 주간 리뷰', free: 0, plus: 1, ai: true, note: '하루 횟수'},
  {id: 'ai-chat', name: 'AI에게 묻기', free: 0, plus: 10, ai: true, note: '하루 횟수'},
  {id: 'ai-recipe', name: '레시피 글 자동 분해', free: 0, plus: 10, ai: true, note: '하루 횟수'},
];
const store = k => { try { return globalThis.localStorage?.getItem(scopedKey(k)) || ''; } catch { return ''; } };
const put = (k, v) => { try { v ? globalThis.localStorage?.setItem(scopedKey(k), v) : globalThis.localStorage?.removeItem(scopedKey(k)); } catch {} };
export const isSuperAdmin = () => isAdminUser(cloudState.user);
export const adminView = () => { if (!isSuperAdmin()) return null; const v = store('mylogue.viewPlan'); return v === 'free' || v === 'plus' ? v : null; };
export const setAdminView = v => { if (isSuperAdmin()) put('mylogue.viewPlan', v === 'free' || v === 'plus' ? v : ''); };
export const isDemo = () => storageAccount() === 'demo-tour'; // 둘러보기(예시 기록): 대표님 지시로 분석·플러스를 모두 보여 준다
export function planOf() {
  const v = adminView(); if (v) return v;
  if (isDemo()) return 'plus';
  if (isSuperAdmin()) return 'plus';
  if (cloudState.approval !== 'approved') return 'free';
  return BETA_ALL_PLUS || cloudState.plan === 'plus' ? 'plus' : 'free';
}
export const isPlus = () => planOf() === 'plus';
export const feature = id => FEATURES.find(f => f.id === id) || null;
export const allowance = id => { const f = feature(id); return f ? (isPlus() ? f.plus : f.free) : Infinity; };
export const can = id => allowance(id) > 0;
export const fakeAI = () => isSuperAdmin() && store('mylogue.fakeAI') === '1';
export const setFakeAI = on => { if (isSuperAdmin()) put('mylogue.fakeAI', on ? '1' : ''); };
// 잠금 안내(재촉 없이 한 줄)
export const topic = w => { const c = String(w).trim().slice(-1).charCodeAt(0); return w + (c >= 0xAC00 && c <= 0xD7A3 && (c - 0xAC00) % 28 ? '은' : '는'); };
export const lockHTML = (id, esc = s => s) => { const f = feature(id); return `<p class="plus-lock"><b>플러스</b> ${esc(topic(f?.name || '이 기능'))} 마이로그 플러스에서 쓸 수 있어요.${f?.note && f.free > 0 ? ` <small>${esc(f.note)}</small>` : ''}</p>`; };
// 관리자 설정 카드
export function adminPlanCardHTML(esc, {serverInfo = null, aiConnected = false} = {}) {
  if (!isSuperAdmin()) return '';
  const v = adminView() || 'plus', fake = fakeAI();
  return `<section class="section card plus-admin" id="plus-admin"><h3>플러스 미리보기 <span class="status-badge info">슈퍼관리자</span></h3>
  <p class="hint">화면과 기능을 일반 사용자 또는 플러스 사용자 기준으로 바꿔 봐요. 이 기기에만 적용되고, 실제 계정 권한은 바뀌지 않아요.</p>
  <div class="seg" role="group" aria-label="보기 기준">${[['free', '일반 사용자'], ['plus', '플러스 사용자']].map(([k, l]) => `<button type="button" class="${v === k ? 'active' : ''}" data-plan-view="${k}" aria-pressed="${v === k}">${l}</button>`).join('')}</div>
  <div class="actions"><button type="button" class="button ${fake ? '' : 'secondary'}" id="plan-fake-ai" aria-pressed="${fake}">가짜 AI 모드 ${fake ? '켜짐' : '꺼짐'}</button>${aiConnected ? '<button type="button" class="button secondary" id="plan-ai-check">AI 서버 상태 확인</button>' : ''}</div>
  <p class="hint">가짜 AI 모드: AI 서버 없이 정해진 답으로 흐름만 시험해요(비용 없음).</p>
  <p class="hint">AI 서버:${aiConnected ? (serverInfo ? `연결됨 · ${serverInfo.fake ? '서버도 가짜 AI' : '실제 AI'} · 플러스 ${serverInfo.plus ? '켜짐' : '꺼짐'}` : '연결됨(상태 확인 전)') : '아직 연결 전(키 연결 후 주소를 넣으면 바로 동작)'}</p>
  <details><summary>플러스 기능 ${FEATURES.length}가지</summary><ul class="plus-list">${FEATURES.map(f => `<li><b>${esc(f.name)}</b> <small>무료 ${f.free === 0 ? '잠금' : f.free === Infinity ? '전부' : f.free} · 플러스 ${f.plus === Infinity ? '전부' : f.plus}${f.ai ? ' · AI' : ''}</small></li>`).join('')}</ul></details></section>`;
}
