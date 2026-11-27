// 5.1.0 실시간 운동 세션(대표님 헬스장 실사용 점검)
// - 세션은 '오늘 운동 마무리하기(예전 운동 끝내기) → 정리 → 기록 완료'로만 끝난다. ×는 '잠시 나가기'(경고 없음).
// - 진행 중 세션은 이 기기에 저장해 다른 앱·새로고침·창 닫기에도 그대로 이어진다(입력하던 숫자까지).
// - 머리글에 '운동 중 · 시작 시각 · N세트'와 '오늘 운동 마무리하기'(5.4.9부터 머리글 아래 넓은 버튼), 오래 쉬면 한 번만 묻기.
import {scopedKey} from './storage-scope.js';
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const KEY='mylogue.live';
export const IDLE_MIN=25;
const DROP=new Set(['editing','sgEx','sgBrand','gymAdding','gymDraft','memoEdit','dateEdit','metaOpen','listOpen','againOpen','ask']);
export function saveLive(s){try{if(!s||!(s.sets||[]).length&&!s.keepLive){localStorage.removeItem(scopedKey(KEY));return}const o={};for(const [k,v] of Object.entries(s))if(!DROP.has(k))o[k]=v;o.savedAt=Date.now();localStorage.setItem(scopedKey(KEY),JSON.stringify(o))}catch{}}
export function readLive(){try{const r=JSON.parse(localStorage.getItem(scopedKey(KEY))||'null');return r&&typeof r==='object'&&Array.isArray(r.sets)?r:null}catch{return null}}
export function clearLive(){try{localStorage.removeItem(scopedKey(KEY))}catch{}}
// 진행 중 세션: 세트가 하나라도 있고, 그 운동 기록이 아직 있고, 끝내지 않음
export const liveActive=(s,db)=>!!(s&&(s.sets||[]).length&&!s.finished&&(!s.workoutId||(db?.workouts||[]).some(w=>w.id===s.workoutId)));
const hm=t=>String(t||'').slice(11,16);
export const liveStart=s=>(s.sets||[]).map(x=>x.completedAt).filter(Boolean).sort()[0]||'';
export const liveLast=s=>(s.sets||[]).map(x=>x.completedAt).filter(Boolean).sort().at(-1)||'';
const minsSince=(t,now=Date.now())=>{const d=new Date(t);return Number.isFinite(d.getTime())?Math.floor((now-d.getTime())/60000):0};
// 머리글: 세션이 시작되면(세트 1개 이상) '운동 중'. 5.4.9 대표님(목업 C안): 머리글 아래 넓은 '오늘 운동 마무리하기'(이번 세트가 아니라 오늘 운동 전체를 끝냄)
export function liveHeadHTML(s){const n=(s.sets||[]).length,st=liveStart(s);return `<div class="sheet-head live-head"><div class="live-status"><i aria-hidden="true"></i><h2>운동 중<small>${st?`${esc(hm(st))}부터 · `:''}${n}세트 · 자동 저장 중</small></h2></div><button class="close live-close" id="close" aria-label="잠시 나가기(이어서 할 수 있어요)">×<small>잠시 나가기</small></button></div><button type="button" class="live-end-bar" id="q-end"><span aria-hidden="true">🏁</span><b>오늘 운동 마무리하기</b></button>`}
// 마지막 세트 뒤 25분이 지나면 한 번만
export function idleHTML(s,now=Date.now()){if(s.idleDismissed||s.rest)return '';const last=liveLast(s);if(!last||minsSince(last,now)<IDLE_MIN)return '';return `<div class="live-idle" role="status"><span><b>마지막 세트 뒤 ${minsSince(last,now)}분이 지났어요.</b><br>운동 끝나셨어요?</span><button type="button" id="q-end">정리하기</button><button type="button" class="live-idle-x" id="q-idle-x" aria-label="계속할게요">계속</button></div>`}
// 홈·운동 페이지: '운동 중 · 이어서 입력하기'
export function liveCardHTML(s,db,now=Date.now()){if(!liveActive(s,db))return '';const n=s.sets.length,st=liveStart(s),names=[...new Set(s.sets.map(x=>x.exercise?.name).filter(Boolean))],m=st?minsSince(st,now):0;return `<section class="live-card" role="status"><span class="live-dot" aria-hidden="true"></span><span class="live-tx"><b>운동 중${m>0?` · ${m<120?`${m}분째`:`${hm(st)}부터`}`:''}</b><small>${esc(names.slice(0,2).join(' · '))}${names.length>2?` 외 ${names.length-2}개`:''} · ${n}세트</small></span><button type="button" class="button live-resume" data-modal="workout">이어서 입력하기</button></section>`}
// 저장 안 한 세트를 두고 떠나려 할 때
export function askHTML(s){const a=s.ask;if(!a)return '';const label=a.n?`${a.n}세트(${a.weight}${a.unit==='level'?'단계':a.unit} × ${a.reps}회)`:'입력하던 세트';return `<div class="live-ask-dim"><div class="live-ask" role="alertdialog" aria-label="저장 확인"><h3>${esc(label)}를 저장할까요?</h3><p>숫자만 바꾸고 아직 '완료 세트 저장'을 누르지 않았어요.</p><div class="live-ask-btns"><button type="button" class="button quick-primary" id="q-ask-save">저장하고 ${a.kind==='end'?'끝내기로':'넘어가기'}</button><button type="button" class="button secondary" id="q-ask-skip">저장 안 함</button><button type="button" class="text-button" id="q-ask-cancel">돌아가기</button></div></div></div>`}
