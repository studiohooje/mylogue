// 4.10.0 가입 동의와 법적 고지(개인정보처리방침·이용약관 링크, 저작권 표기).
// 근거: 개인정보보호법 제15조(수집·이용 동의), 제22조의2(만 14세 미만), 제23조(민감정보 별도 동의), 제28조의8(국외 이전), 제30조(처리방침 공개).
// 법률 검토 전 초안이다. 운영자 정보(OPERATOR)는 대표님 확정 후 채운다.
const esc = v => String(v??'').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const OPERATOR = {name:'스튜디오 후제(Studio Hooje)', email:'studiohooje@gmail.com'};
export const CONSENT_VERSION = '2026-11-23b'; // 4.15.0 베타 운영자 열람 동의 추가(바뀌면 로그인 이용자에게 동의 화면이 다시 뜬다)
export const COPYRIGHT = '© 2026 Studio Hooje. All rights reserved.';
export const CONSENT_ITEMS = [
 ['age', '만 14세 이상이에요', '', ''],
 ['terms', '이용약관에 동의해요', 'terms.html', '서비스 이용 규칙'],
 ['privacy', '개인정보 수집·이용에 동의해요', 'privacy.html#collect', 'Google 계정 정보(이름·이메일·프로필 사진·계정 번호)와 내가 남긴 기록을 기록 보관·여러 기기 동기화에 써요. 계정을 지우면 함께 지워요.'],
 ['health', '건강정보(민감정보) 수집·이용에 따로 동의해요', 'privacy.html#health', '체중·체성분·허리둘레·식단·운동 기록과 GLP-1 사용 여부 같은 맞춤 시작 응답은 건강에 관한 정보라 따로 동의를 받아요. 내 기록 보관과 내가 보는 분석에만 써요.'],
 ['operator', '베타 기간 운영자의 기록 열람·수정에 동의해요', 'privacy.html#operator', '동의하지 않아도 모든 기능을 쓸 수 있어요. 동의하면 베타 기간에는 문의 해결과 오류 확인을 위해 운영자가 서버에 동기화된 내 기록을 열람·수정할 수 있어요. 모든 수정은 접근 기록에 남고, 고치기 전 내용도 저장돼요. 정식 서비스로 바뀌면 내가 허락한 기간에만 열람하도록 바꿔요.'],
 ['overseas', '개인정보 국외 이전에 동의해요', 'privacy.html#overseas', '로그인과 기록 저장에 Google Firebase를 써요. 기록은 서울 리전에 저장되지만, 로그인 처리 과정에서 Google LLC(미국)로 정보가 이전될 수 있어요.']
];
// 4.27.0 전수검사 B-08: 서비스에 꼭 필요하지 않은 운영자 열람은 선택(거부해도 로그인·동기화 가능, 설정에서 바꿀 수 있음).
export const OPTIONAL_CONSENT = ['operator'];
export const REQUIRED_CONSENT = CONSENT_ITEMS.map(([k]) => k).filter(k => !OPTIONAL_CONSENT.includes(k));
export const requiredChecked = checked => REQUIRED_CONSENT.every(k => checked?.[k]===true);
export const consentOK = settings => settings?.consent?.version===CONSENT_VERSION && requiredChecked(settings.consent.items);
export const operatorAllowed = settings => settings?.consent?.items?.operator===true;

export function consentHTML({name='', checked={}, error=''}={}){
 const all = CONSENT_ITEMS.every(([k]) => checked[k]), ready = requiredChecked(checked);
 return `<div class="consent-page"><div class="consent-card">
 <img src="icon.svg" alt="" class="consent-icon">
 <h1>${name ? `${esc(name)}님, 반가워요` : '반가워요'}</h1>
 <p class="consent-lead">기록을 안전하게 보관하려면 아래 내용에 동의가 필요해요. 기록의 주인은 언제나 나예요.</p>
 <label class="consent-all"><input type="checkbox" id="consent-all" ${all?'checked':''}> <b>모두 동의해요</b></label>
 <div class="consent-list">${CONSENT_ITEMS.map(([k, t, href, d]) => `<div class="consent-item"><label><input type="checkbox" data-consent="${k}" ${checked[k]?'checked':''}> <span><em${OPTIONAL_CONSENT.includes(k)?' class="opt"':''}>${OPTIONAL_CONSENT.includes(k)?'선택':'필수'}</em> ${esc(t)}</span></label>${d?`<p>${esc(d)}</p>`:''}${href?`<a href="${href}" target="_blank" rel="noopener">자세히 보기</a>`:''}</div>`).join('')}</div>
 ${error?`<p class="consent-error" role="alert">${esc(error)}</p>`:''}
 <button type="button" class="consent-go" id="consent-agree" ${ready?'':'aria-disabled="true"'}>동의하고 시작하기</button>
 <button type="button" class="consent-no" id="consent-decline">동의하지 않고 로그아웃</button>
 <p class="consent-fine">동의하지 않아도 로그인 없이 이 기기에서만 쓸 수 있어요. 동의는 설정에서 언제든 확인할 수 있고, 계정을 지우면 서버의 기록도 함께 지워요.</p>
 </div></div>`;
}
export const consentRecord = checked => ({version:CONSENT_VERSION, at:new Date().toISOString(), items:Object.fromEntries(CONSENT_ITEMS.map(([k]) => [k, checked[k]===true]))});
export const operatorToggleHTML = consent => consent?.version ? `<p class="hint operator-consent">베타 운영자 기록 열람: <b>${consent.items?.operator===true?'동의함':'동의 안 함'}</b> <button type="button" class="chip" id="consent-operator-toggle">${consent.items?.operator===true?'동의 철회':'동의하기'}</button></p>` : '';
export const legalFooterHTML = consent => `${operatorToggleHTML(consent)}<p class="legal-foot">${consent?.at ? `가입 동의 ${esc(String(consent.at).slice(0,10))} · ` : ''}<a href="privacy.html">개인정보처리방침</a> · <a href="terms.html">이용약관</a> · <a href="story.html">마이로그 이야기</a> · <a href="mailto:studiohooje@gmail.com">문의</a><br>${COPYRIGHT}</p>`;
