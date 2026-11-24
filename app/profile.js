// 3.10.0 내 프로필 꾸미기: 오른쪽 위 계정 칩을 누르면 이름(닉네임)과 아이콘을 바꾼다.
// 저장 위치: db.settings.profile (계정별 기록과 함께 동기화). 사진은 작게 줄여(160px JPEG) 저장한다.
const h = v => String(v??'').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const AVATAR_COLORS = ['#8ce4e0','#b8aaf2','#f2b49b','#f3c27a','#9cc8ed','#77d7b0'];

export function profileOf(db, user){
 const p = db?.settings?.profile || {};
 const name = String(p.nickname||'').trim() || user?.displayName || (user?.email||'').split('@')[0] || '내 계정';
 const type = ['google','letter','photo'].includes(p.avatar?.type) ? p.avatar.type : (user?.photoURL ? 'google' : 'letter');
 return {name, type, color:AVATAR_COLORS.includes(p.avatar?.color) ? p.avatar.color : AVATAR_COLORS[0], photo:typeof p.avatar?.photo==='string' && p.avatar.photo.startsWith('data:image/') ? p.avatar.photo : '', googlePhoto:user?.photoURL||''};
}

export function avatarHTML(pr, cls='account-avatar'){
 if(pr.type==='photo' && pr.photo) return `<img class="${cls}" src="${h(pr.photo)}" alt="">`;
 if(pr.type==='google' && pr.googlePhoto) return `<img class="${cls}" src="${h(pr.googlePhoto)}" alt="" referrerpolicy="no-referrer">`;
 return `<span class="${cls} avatar-letter" style="background:${h(pr.color)}" aria-hidden="true">${h([...pr.name.trim()][0]?.toUpperCase()||'나')}</span>`;
}

export function newProfileEdit(db, user){ const pr = profileOf(db, user); return {nickname:String(db?.settings?.profile?.nickname||''), type:pr.type, color:pr.color, photo:pr.photo, googlePhoto:pr.googlePhoto, fallback:user?.displayName||(user?.email||'').split('@')[0]||''}; }

export function profileEditHTML(st, {email='', statusText='', prefsHTML='', admin=false}={}){
 const preview = {name:st.nickname.trim()||st.fallback||'내 계정', type:st.type, color:st.color, photo:st.photo, googlePhoto:st.googlePhoto};
 const opt = (type, label, inner, disabled=false) => `<button type="button" class="pf-opt ${st.type===type?'on':''}" data-pf-type="${type}" aria-pressed="${st.type===type}" ${disabled?'disabled':''}>${inner}<small>${label}</small></button>`;
 return `<div class="pf"><div class="pf-preview">${avatarHTML(preview, 'pf-avatar')}<div><b>${h(preview.name)}</b><small>${h(email)}${statusText?` · ${h(statusText)}`:''}</small></div>${admin?'<button type="button" class="chip pf-admin" data-page="adminlog" aria-label="관리 화면 열기">관리</button>':''}</div>
<label class="field">표시 이름<input id="pf-name" maxlength="20" value="${h(st.nickname)}" placeholder="${h(st.fallback||'예: 문')}" autocomplete="nickname"></label>
<p class="pf-label">아이콘</p>
<div class="pf-opts">${opt('google','Google 사진', st.googlePhoto?`<img class="pf-mini" src="${h(st.googlePhoto)}" alt="" referrerpolicy="no-referrer">`:'<span class="pf-mini">—</span>', !st.googlePhoto)}${opt('letter','글자', `<span class="pf-mini avatar-letter" style="background:${h(st.color)}">${h([...preview.name][0]?.toUpperCase()||'나')}</span>`)}${opt('photo','내 사진', st.photo?`<img class="pf-mini" src="${h(st.photo)}" alt="">`:'<span class="pf-mini pf-plus">＋</span>')}</div>
${st.type==='letter'?`<div class="pf-colors" role="radiogroup" aria-label="글자 아이콘 색">${AVATAR_COLORS.map(c=>`<button type="button" class="pf-color ${st.color===c?'on':''}" data-pf-color="${c}" style="background:${c}" aria-label="색 ${c}" aria-pressed="${st.color===c}"></button>`).join('')}</div>`:''}
${st.type==='photo'?`<label class="button secondary pf-upload">사진 고르기<input id="pf-photo" type="file" accept="image/*" hidden></label><p class="hint">사진은 작게 줄여 내 계정에만 저장해요.</p>`:''}
<div class="actions"><button type="button" class="button" id="pf-save">이름·아이콘 저장</button></div>
${prefsHTML?`<div class="pf-prefs">${prefsHTML}<button type="button" class="button secondary pf-wide" id="gw-open">식단 목표 다시 정하기</button></div>`:''}
<button type="button" class="button secondary pf-wide pf-more" data-page="settings">그 외 설정으로 이동 ›<small>계정·동기화, 운동 장소, AI 연결, 백업 등</small></button></div>`;
}

export function applyProfile(db, st){
 const nickname = String(st.nickname||'').trim().slice(0, 20);
 if(st.type==='photo' && !st.photo) throw Error('사진을 먼저 골라 주세요.');
 return {...db, settings:{...db.settings, profile:{nickname, avatar:{type:st.type, color:st.color, photo:st.type==='photo'?st.photo:''}}}};
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
