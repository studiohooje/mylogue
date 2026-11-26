// 3.10.0 내 프로필 꾸미기: 오른쪽 위 계정 칩을 누르면 이름(닉네임)과 아이콘을 바꾼다.
// 저장 위치: db.settings.profile (계정별 기록과 함께 동기화). 사진은 작게 줄여(160px JPEG) 저장한다.
const h = v => String(v??'').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const AVATAR_COLORS = ['#8ce4e0','#b8aaf2','#f2b49b','#f3c27a','#9cc8ed','#77d7b0'];
// 5.0.4 대표님: 프로필 아이콘은 마이로그 기본 아이콘 10개(남 5 · 여 5) 중에서만. 내 사진·Google/카카오 사진·글자 아이콘은 없앰.
// 테두리는 두 가지뿐이고 자동: 일반 / 플러스(마이로그 그라데이션 플러스 테두리) — 구독 서비스처럼 구독하면 저절로 바뀜.
export const AVATARS = ['m1','m2','m3','m4','m5','f1','f2','f3','f4','f5'];
export const avatarSrc = id => `art/avatar/${AVATARS.includes(id) ? id : 'm1'}.webp`;
export const defaultAvatar = db => db?.settings?.nutritionProfile?.sex === 'female' ? 'f1' : 'm1';

export function profileOf(db, user){
 const p = db?.settings?.profile || {};
 const name = String(p.nickname||'').trim() || user?.displayName || (user?.email||'').split('@')[0] || '내 계정';
 const id = AVATARS.includes(p.avatar?.id) ? p.avatar.id : defaultAvatar(db);
 return {name, id};
}

export function avatarHTML(pr, cls='account-avatar', {plus=false}={}){
 return `<span class="${cls} mlg-avatar ${plus?'av-plus':'av-basic'}" aria-hidden="true"><img src="${avatarSrc(pr.id)}" alt="" loading="lazy" decoding="async"></span>`;
}

/* 5.4.2 대표님: 코치태그 = 이름 + 칭호(고르기 · 직접 · 없음). 회원들에게만 보이는 이름 */
export const COACH_TITLES = ['코치', '트레이너', '강사', '선생님', '쌤', '프로', '원장'];
export const coachTagText = (db) => { const c = db?.settings?.profile?.coachTag || {}; return [String(c.name||'').trim(), String(c.title||'').trim()].filter(Boolean).join(' '); };
export function newProfileEdit(db, user, tag = ''){ const pr = profileOf(db, user), ct = db?.settings?.profile?.coachTag || {}; const title = String(ct.title||''); return {tag, tagMsg:'', tagOptions:[], nickname:String(db?.settings?.profile?.nickname||''), id:pr.id, fallback:user?.displayName||(user?.email||'').split('@')[0]||'', coachName:String(ct.name||''), coachTitle:title && !COACH_TITLES.includes(title) ? '@custom' : title, coachCustom:title && !COACH_TITLES.includes(title) ? title : ''}; }

export function profileEditHTML(st, {email='', statusText='', prefsHTML='', admin=false, tagReady=false, plus=false, coach=false}={}){
 const preview = {name:(tagReady&&st.tag?st.tag:st.nickname.trim())||st.fallback||'내 계정', id:st.id};
 const opt = (type, label, inner, disabled=false) => `<button type="button" class="pf-opt ${st.type===type?'on':''}" data-pf-type="${type}" aria-pressed="${st.type===type}" ${disabled?'disabled':''}>${inner}<small>${label}</small></button>`;
 return `<div class="pf"><div class="pf-preview">${avatarHTML(preview, 'pf-avatar', {plus})}<div><b>${h(preview.name)}</b><small>${h(email)}${statusText?` · ${h(statusText)}`:''}</small></div>${admin?'<button type="button" class="chip pf-admin" data-page="adminlog" aria-label="관리 화면 열기">관리</button>':''}</div>
${tagReady?`<div class="field pf-tag"><label for="pf-tag">마이태그</label><div class="pf-tagrow"><span class="pf-at">@</span><input id="pf-tag" maxlength="16" value="${h(st.tag||'')}" placeholder="예: Moon" autocomplete="off" autocapitalize="off" spellcheck="false"><button type="button" class="button secondary" id="pf-tagcheck">확인</button></div>${st.tagMsg?`<p class="hint ${st.tagOk?'':'warn'}" role="status">${h(st.tagMsg)}</p>`:'<p class="hint">나만 쓰는 이름이에요. 한글 2자·영어 3자부터. 영어는 전부 소문자·전부 대문자·첫 글자만 대문자로만 써요(예: Moon · moon · MOON). 바꾸면 이전 태그는 다른 사람이 쓸 수 있게 풀려요.</p>'}${(st.tagOptions||[]).length?`<div class="pf-tagopts">${st.tagOptions.map(x=>`<button type="button" class="chip" data-pf-tagpick="${h(x)}">@${h(x)}</button>`).join('')}</div>`:''}</div>`:`<label class="field">표시 이름<input id="pf-name" maxlength="20" value="${h(st.nickname)}" placeholder="${h(st.fallback||'예: 문')}" autocomplete="nickname"></label><p class="hint">로그인하고 이용 승인을 받으면 나만 쓰는 이름 '마이태그'를 정할 수 있어요.</p>`}
${coach?coachTagHTML(st):''}<p class="pf-label">아이콘</p>
<div class="pf-avatars" role="radiogroup" aria-label="프로필 아이콘">${AVATARS.map(id=>`<button type="button" class="pf-av ${st.id===id?'on':''}" data-pf-avatar="${id}" role="radio" aria-checked="${st.id===id}" aria-label="아이콘 ${id}"><img src="${avatarSrc(id)}" alt="" loading="lazy"></button>`).join('')}</div>
<p class="hint">${plus?'플러스 계정이라 마이로그 테두리가 둘러져요.':'테두리는 자동이에요. 마이로그 플러스를 쓰면 플러스 테두리로 바뀌어요.'}</p>
<div class="actions"><button type="button" class="button" id="pf-save">${tagReady?'마이태그·아이콘 저장':'이름·아이콘 저장'}</button></div>
${prefsHTML?`<div class="pf-prefs">${prefsHTML}<button type="button" class="button secondary pf-wide" id="gw-open">식단 목표 다시 정하기</button></div>`:''}
<button type="button" class="button secondary pf-wide pf-more" data-page="settings">그 외 설정으로 이동 ›<small>계정·동기화, 운동 장소, AI 연결, 백업 등</small></button></div>`;
}

export function applyProfile(db, st){
 const nickname = String(st.nickname||'').trim().slice(0, 20);
 const id = AVATARS.includes(st.id) ? st.id : defaultAvatar(db);
 const was = db?.settings?.profile?.coachTag;
 const coachTag = st.coachName !== undefined ? {name:String(st.coachName||'').trim().slice(0, 20), title:(st.coachTitle==='@custom' ? String(st.coachCustom||'').trim() : String(st.coachTitle||'')).slice(0, 10)} : was;
 return {...db, settings:{...db.settings, profile:{nickname, avatar:{id}, ...(coachTag?{coachTag}:{})}}};
}

// 사진을 160px 정사각형 JPEG로 줄인다(브라우저 전용).
export async function shrinkPhoto(file, size=160){
 if(!file || !/^image\//.test(file.type)) throw Error('이미지 파일을 골라 주세요.');
 const url = URL.createObjectURL(file);
 try{
  const img = await new Promise((ok, no) => { const i = new Image(); i.onload = () => ok(i); i.onerror = () => no(Error('사진을 열 수 없어요.')); i.src = url; });
  const s = Math.min(img.naturalWidth, img.naturalHeight), cv = document.createElement('canvas'); cv.width = cv.height = size;
  cv.getContext('2d').drawImage(img, (img.naturalWidth-s)/2, (img.naturalHeight-s)/2, s, s, 0, 0, size, size);
  return cv.toDataURL('image/jpeg', 0.82);
 }finally{ URL.revokeObjectURL(url); }
}

function coachTagHTML(st){
 const title = st.coachTitle==='@custom' ? (st.coachCustom||'') : (st.coachTitle||'');
 const show = [String(st.coachName||'').trim(), title.trim()].filter(Boolean).join(' ') || '이름을 적어 주세요';
 const chip = (v, l) => `<button type="button" class="chip ${st.coachTitle===v?'active':''}" data-pf-ctitle="${h(v)}" aria-pressed="${st.coachTitle===v}">${h(l)}</button>`;
 return `<div class="field pf-ctag"><label for="pf-cname">코치태그 <small class="pf-ctag-badge">코치 권한</small></label>
 <div class="pf-ctag-row"><input id="pf-cname" maxlength="20" value="${h(st.coachName||'')}" placeholder="이름 · 예: 이준호" autocomplete="off"></div>
 <div class="chip-row pf-ctitles" role="group" aria-label="칭호">${COACH_TITLES.map(t => chip(t, t)).join('')}${chip('@custom','직접 입력')}${chip('','칭호 없음')}</div>
 ${st.coachTitle==='@custom'?`<input id="pf-ctitle" maxlength="10" value="${h(st.coachCustom||'')}" placeholder="칭호 직접 · 예: 디렉터" autocomplete="off">`:''}
 <div class="pf-ctag-prev"><small>회원에게는 이렇게 보여요</small><b>${h(show)}</b></div>
 <p class="hint">회원들에게만 보이는 이름이에요. 코치방·수업 기록·식단 제안·회원의 '내 코치' 카드에 이 이름으로 나와요. 마이태그(@)는 그대로예요.</p></div>`;
}
