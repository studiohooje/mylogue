import {cloudState} from './cloud-sync.js';
import {scopedKey,storageAccount} from './storage-scope.js';
import {nativeAuthAvailable} from './native-auth.js';
import {isAdminUser} from './admin.js';
import {statusBadge} from './admin-panel.js';
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const preview=v=>v===null?'삭제된 기록':v.length>900?v.slice(0,900)+'… (전체 원본은 아래에서 저장)':v;
export function cloudSettingsHTML() {
  const s=cloudState, last=localStorage.getItem(scopedKey('mylogue.cloud.last-sync'));
  const heading=`<section class="section card"><h3>내 계정과 기록 동기화</h3>`;
  if(s.native&&!nativeAuthAvailable())return heading+'<p>Android 로그인 모듈이 포함된 최신 앱으로 업데이트해 주세요. 현재 버전에서는 로컬 기록과 백업을 사용할 수 있습니다.</p></section>';
  if(!s.configured)return heading+'<p>서버 연결 준비 중입니다. 현재 기록은 이 기기에 안전하게 보관됩니다.</p></section>';
  if(s.error)return heading+`<p>${esc(s.error)}</p><button class="button secondary" id="cloud-retry">연결 다시 시도</button></section>`;
  if(!s.user)return heading+`<p>Google 로그인 후 기록 이용을 신청할 수 있습니다. 승인 전에는 서버에 건강 기록이 저장되지 않습니다. 게스트 기록은 이 기기에 남습니다.</p><button class="button" id="cloud-login">Google로 로그인</button><p class="hint">${s.native?'Android 앱에서는 로그아웃할 때까지 계정이 유지됩니다.':'로그인은 현재 탭 동안 유지됩니다.'}</p></section>`;
  if(s.approval!=='approved'){
    const message={not_applied:'기록 이용 신청 전',pending:'관리자 승인 대기 중',rejected:'기록 이용 신청이 반려됨',unknown:'승인 상태 확인 실패'}[s.approval]||'승인 상태 확인 중';
    const consent=s.approval==='not_applied'?`<div class="alert"><p><strong>기록 이용 신청 안내</strong></p><p>목적: 계정별 체중·체성분·식단·운동 기록 저장과 기기 간 동기화.</p><p>항목: Google 계정 UID·이메일, 입력한 건강 기록과 설정. 사진과 운동 초안은 서버로 보내지 않습니다.</p><p>추천 순서: 기록한 음식·운동·머신의 이름별 선택 횟수를 누가 기록했는지 없이 합산해 검색어 추천 순서에 씁니다.</p><p>보유: 이용 중 보관하며 삭제 요청은 관리자에게 접수합니다. 신청 전에는 건강 기록을 서버로 전송하지 않습니다.</p><label class="field"><input type="checkbox" id="approval-consent"> 위 서버 저장 안내를 확인하고 건강 기록 처리에 동의합니다.</label><button class="button" id="cloud-apply">기록 이용 신청</button></div>`:'';
    return heading+`<p><strong>${esc(s.user.email||'현재 계정')}</strong> · ${message}</p>${consent}<p class="hint">승인 전에도 기기 안의 기록과 백업은 사용할 수 있습니다. ${s.approvalError?`상태 확인 오류: ${esc(s.approvalError)}`:''}</p><div class="actions"><button class="button secondary" id="cloud-approval-refresh">상태 새로 확인</button><button class="button secondary" id="cloud-logout">로그아웃</button></div></section>`;
  }
  return heading+`<p><strong>${esc(s.user.email||s.user.displayName||'내 계정')}</strong></p><p class="hint">UID: ${esc(storageAccount())}</p><p>이 계정의 기록 공간입니다. ‘지금 동기화’를 누르면 수치·식단·운동·설정의 숫자와 텍스트를 계정 서버에 보내고 다른 기기의 변경을 가져옵니다.</p><p class="hint">사진과 작성 중 운동 초안은 전송하지 않습니다. 기록 변경과 삭제는 자동 동기화를 시도합니다. 마지막 완료: ${last?esc(new Date(last).toLocaleString('ko-KR')):'없음'}</p><div class="actions"><button class="button" id="cloud-sync">지금 동기화</button><button class="button secondary" id="cloud-import-guest">게스트 기록 복사</button><button class="button secondary" id="cloud-logout">로그아웃 · 게스트로</button></div><p class="hint">서버 접근 오류가 이어지면 관리자에게 UID와 오류 내용을 알려 주세요.</p>${s.conflicts.length?`<div class="alert"><h4>같은 기록을 두 기기에서 수정했습니다</h4><p>아직 어떤 변경도 전송하지 않았습니다. 각 기록에서 유지할 내용을 선택해 주세요. 전체 양쪽 원본을 먼저 저장할 수 있습니다.</p><button id="cloud-conflicts-export" class="button secondary">충돌 원본 저장</button>${s.conflicts.map((c,i)=>`<details><summary>${esc(c.key)}</summary><p>이 기기</p><pre style="white-space:pre-wrap;overflow-wrap:anywhere">${esc(preview(c.local))}</pre><p>서버</p><pre style="white-space:pre-wrap;overflow-wrap:anywhere">${esc(preview(c.remote))}</pre><label class="field">유지할 내용<select data-cloud-conflict="${i}"><option value="">선택해 주세요</option><option value="local">이 기기 내용 유지</option><option value="remote">서버 내용 유지</option></select></label></details>`).join('')}<button class="button" id="cloud-resolve">선택한 내용으로 동기화</button></div>`:''}<button class="text-button" id="cloud-archive-export">마지막 동기화 직전 원본 저장</button></section>`;
}
// 4.11.0 계정 삭제(로그인한 사람만, 관리자 제외)
export function deleteAccountHTML(){
  const s=cloudState;if(!s.user||isAdminUser(s.user))return '';
  return `<section class="section card danger-zone"><details><summary>계정 삭제</summary><p class="hint">이 계정과 서버에 저장된 수치·식단·운동·설정 기록, AI 검토함 초안을 모두 지워요. 이 기기에 있는 이 계정의 기록과 사진도 지워요. <b>되돌릴 수 없어요.</b> 로그인 없이 쓰던 게스트 기록은 남아요. 앱 없이 요청하려면 <a href="delete-account.html" target="_blank" rel="noopener">삭제 요청 안내</a>를 봐 주세요.</p><p class="hint">지우기 전에 ‘백업 파일 받기’로 기록을 받아 둘 수 있어요. 머신 사진 요청처럼 관리자에게 보낸 요청은 관리자 확인 뒤 따로 지워져요.</p><button type="button" class="button danger" id="cloud-delete-account">계정과 기록 삭제…</button></details></section>`;
}
export function accountAdminHTML(just={}){
  if(!isAdminUser(cloudState.user))return '';
  const order={pending:0,rejected:1,approved:2};
  const list=[...cloudState.applicants].sort((a,b)=>(order[a.status]??3)-(order[b.status]??3));
  const waiting=list.filter(a=>a.status==='pending').length;
  const btn=(a,st,label,primary=false)=>`<button type="button" class="button ${primary?'':'secondary'}" id="cloud-review-${st}-${esc(a.uid)}">${label}</button>`;
  const rows=list.map(a=>{const isJust=just.uid===a.uid;const actions=a.status==='pending'?btn(a,'approved','승인',true)+btn(a,'rejected','반려'):a.status==='approved'?btn(a,'pending','승인 취소')+btn(a,'rejected','반려')+`<button type="button" class="button ${a.plan==='plus'?'secondary':''}" id="cloud-plan-${a.plan==='plus'?'free':'plus'}-${esc(a.uid)}">${a.plan==='plus'?'플러스 끄기':'플러스 켜기'}</button>`:btn(a,'approved','승인',true)+btn(a,'pending','대기로 되돌리기');
   const msg=isJust?`<small class="just-msg">${a.status==='approved'?'방금 승인했어요. 이제 이 계정은 기록 동기화와 공용 도감을 쓸 수 있어요.':a.status==='rejected'?'방금 반려했어요. 이 계정은 서버 기록을 쓸 수 없어요.':'승인 대기로 되돌렸어요.'}</small>`:'';
   return `<div class="record applicant-row st-${esc(a.status||'none')}${isJust?' just-done':''}" data-applicant="${esc(String(a.email||'').toLowerCase())} ${esc(a.uid)}"><div><strong>${esc(a.email||a.uid)}</strong> ${statusBadge(a.status)}${a.plan==='plus'?' <span class="status-badge info">플러스</span>':''}${msg}<small>UID ${esc(a.uid)} · 신청 ${a.createdAt?.toDate?esc(a.createdAt.toDate().toLocaleString('ko-KR')):'시간 확인 중'}</small></div><div class="actions">${actions}</div></div>`}).join('');
  return `<section class="section card" id="account-admin"><h3>기록 이용 신청 관리 ${waiting?`<span class="status-badge wait">대기 ${waiting}건</span>`:''}</h3><p class="hint">승인된 계정만 서버 기록과 공용 도감에 접근합니다. 승인 대기 계정이 맨 위에 보여요.</p><div class="applicant-tools"><button class="button secondary" id="cloud-applicants-refresh">신청 목록 새로고침</button>${waiting>1?`<button class="button" id="cloud-review-all-approved">대기 ${waiting}건 모두 승인</button>`:''}${list.length>5?'<input type="search" id="applicant-search" placeholder="이메일·UID로 찾기" aria-label="신청 계정 찾기">':''}</div>${rows||'<p class="hint">신청 목록이 없습니다.</p>'}</section>`;
}

