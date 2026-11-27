// 3.6.0 헬스장 장소 찾기 — 이름 검색, 지도에서 고르기, 직접 입력.
// 저장 형식은 지도 회사와 무관하게 {name,address,lat,lng,provider,providerId,category}로 둔다.
// 기존 settings.gyms(이름 목록)는 그대로 쓰고, settings.gymPlaces[이름]에 위치 정보를 더한다.

// JavaScript 키는 공개용 키다. 카카오 콘솔에 등록한 도메인(공개 웹, localhost:4173, Android https://localhost)에서만 동작한다.
export const KAKAO_JS_KEY = '396ad721e8133dfca78b69df7818af03';
export const DEFAULT_CENTER = {lat:37.5666, lng:126.9784}; // 서울시청

const h = v => String(v??'').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const cut = (v, n) => String(v??'').trim().slice(0, n);
const num = (v, lo, hi) => { if(v===null||v===undefined||v==='') return null; const n = Number(v); return Number.isFinite(n) && n>=lo && n<=hi ? Math.round(n*1e6)/1e6 : null; };

export function cleanPlace(p){
 if(!p || typeof p!=='object') return null;
 const name = cut(p.name, 60); if(!name) return null;
 let lat = num(p.lat, -90, 90), lng = num(p.lng, -180, 180);
 if(lat===null || lng===null){ lat = null; lng = null; }
 return {name, address:cut(p.address, 120), lat, lng,
  provider:['kakao','manual'].includes(p.provider) ? p.provider : 'manual',
  providerId:cut(p.providerId, 40), category:cut(p.category, 40)};
}

export function placeFromKakao(d){
 return cleanPlace({name:d?.place_name, address:d?.road_address_name||d?.address_name, lat:d?.y, lng:d?.x,
  provider:'kakao', providerId:d?.id, category:String(d?.category_name||'').split('>').pop()});
}

// 가져오기·복원 때 정리: gyms에 있는 이름의 항목만 남긴다.
export function cleanGymPlaces(settings){
 const gyms = Array.isArray(settings?.gyms) ? settings.gyms : [];
 const raw = settings?.gymPlaces && typeof settings.gymPlaces==='object' && !Array.isArray(settings.gymPlaces) ? settings.gymPlaces : {};
 const out = {};
 for(const name of gyms){ const p = cleanPlace({...raw[name], name}); if(p && (p.address || p.lat!==null)) out[name] = p; }
 return out;
}

export function addGymPlace(db, place){
 const p = cleanPlace(place); if(!p) throw Error('장소 이름을 입력해 주세요.');
 const gyms = [...new Set([...(db.settings.gyms||[]), p.name])];
 const gymPlaces = {...(db.settings.gymPlaces||{})};
 if(p.address || p.lat!==null) gymPlaces[p.name] = p; else delete gymPlaces[p.name];
 return {...db, settings:{...db.settings, gyms, gymPlaces}};
}

export function removeGym(db, name){
 const gymPlaces = {...(db.settings.gymPlaces||{})}; delete gymPlaces[name];
 return {...db, settings:{...db.settings, gyms:(db.settings.gyms||[]).filter(x=>x!==name), gymPlaces}};
}

export function centerFor(db){
 const p = Object.values(db.settings.gymPlaces||{}).find(x=>x && x.lat!==null && x.lat!==undefined);
 return p ? {lat:p.lat, lng:p.lng, level:4} : {...DEFAULT_CENTER, level:7};
}

// ── 카카오 지도 SDK ──
let sdk = null;
export function loadKakao({timeout=10000}={}){
 if(typeof window==='undefined') return Promise.reject(Error('지도를 쓸 수 없는 환경이에요.'));
 if(window.kakao?.maps?.services) return Promise.resolve(window.kakao);
 if(sdk) return sdk;
 sdk = new Promise((ok, no) => {
  const fail = msg => { sdk = null; no(Error(msg)); };
  const timer = setTimeout(() => fail('지도를 불러오지 못했어요. 인터넷 연결을 확인해 주세요.'), timeout);
  const s = document.createElement('script');
  s.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${KAKAO_JS_KEY}&libraries=services&autoload=false`;
  s.async = true;
  s.onerror = () => { clearTimeout(timer); s.remove(); fail('지도를 불러오지 못했어요. 인터넷 연결을 확인해 주세요.'); };
  s.onload = () => { try{ window.kakao.maps.load(() => { clearTimeout(timer); ok(window.kakao); }); }catch(e){ clearTimeout(timer); fail('지도를 불러오지 못했어요.'); } };
  document.head.appendChild(s);
 });
 return sdk;
}

export const isFitness = d => /스포츠시설|헬스|피트니스|요가|필라테스|크로스핏|체육관|운동|클라이밍|복싱|수영|발레|댄스|격투|주짓수|스피닝|무술/.test(String(d?.category_name||''));

// 평소 하는 운동 → 지도 근처 검색어(최대 4개, 무료 사용량을 아끼려고 제한)
const SPORT_WORDS = {pilates:'필라테스', yoga:'요가', crossfit:'크로스핏', hyrox:'크로스핏', climb:'클라이밍', combat:'복싱', swim:'수영장', ballet:'발레', cycle:'스피닝'};
export function nearbyWords(sports=[]){
 const words = [];
 if(!sports.length || sports.some(s=>['weight','home','cardio','run','hike','ball'].includes(s))) words.push('헬스');
 for(const s of sports){ const w = SPORT_WORDS[s]; if(w && !words.includes(w)) words.push(w); }
 if(!words.length) words.push('헬스');
 return words.slice(0, 4);
}

function keyword(kakao, q, opt={}, keep=()=>true){
 return new Promise((ok, no) => {
  new kakao.maps.services.Places().keywordSearch(q, (data, status) => {
   const S = kakao.maps.services.Status;
   if(status===S.OK) ok(data.filter(keep).map(placeFromKakao).filter(Boolean));
   else if(status===S.ZERO_RESULT) ok([]);
   else no(Error('장소 검색에 실패했어요. 잠시 뒤 다시 해 주세요.'));
  }, opt);
 });
}

export async function searchPlaces(q){
 const query = cut(q, 60); if(!query) throw Error('장소 이름이나 동네를 입력해 주세요.');
 const kakao = await loadKakao();
 return keyword(kakao, query, {size:15});
}

export async function nearbyGyms(lat, lng, sports=[]){
 const kakao = await loadKakao(), S = kakao.maps.services.Status;
 const one = q => new Promise((ok, no) => new kakao.maps.services.Places().keywordSearch(q, (data, status) => status===S.OK ? ok(data) : status===S.ZERO_RESULT ? ok([]) : no(Error('장소 검색에 실패했어요. 잠시 뒤 다시 해 주세요.')), {location:new kakao.maps.LatLng(lat, lng), radius:800, sort:kakao.maps.services.SortBy.DISTANCE, size:15}));
 return mergeNearby(await Promise.all(nearbyWords(sports).map(one)));
}

// 여러 검색어 결과를 합쳐 중복을 빼고 가까운 순으로 20곳
export function mergeNearby(lists){
 const seen = new Map();
 for(const d of lists.flat()){ if(!isFitness(d) || seen.has(d.id)) continue; seen.set(d.id, d); }
 return [...seen.values()].sort((a, b) => Number(a.distance||1e9) - Number(b.distance||1e9)).slice(0, 20).map(placeFromKakao).filter(Boolean);
}

export async function addressAt(lat, lng){
 const kakao = await loadKakao();
 return new Promise(ok => new kakao.maps.services.Geocoder().coord2Address(lng, lat, (r, status) => {
  ok(status===kakao.maps.services.Status.OK && r[0] ? (r[0].road_address?.address_name || r[0].address?.address_name || '') : '');
 }));
}

// ── 화면 ──
export function placeListHTML(list, attr){
 if(!list?.length) return '';
 return `<ul class="place-list">${list.map((p, i) => `<li><button type="button" class="place-item" data-${attr}="${i}"><span class="place-text"><b>${h(p.name)}</b><small>${h(p.address)}${p.category?` · ${h(p.category)}`:''}</small></span><span class="place-add">추가</span></button></li>`).join('')}</ul>`;
}

export function gymSettingsHTML(db, search={}){
 const gyms = db.settings.gyms||[], places = db.settings.gymPlaces||{};
 const status = search.status==='loading' ? '<p class="hint" role="status">찾는 중…</p>'
  : search.status==='error' ? `<p class="hint warn" role="status">${h(search.message)} 아래 ‘이름만 직접 입력’으로도 추가할 수 있어요.</p>`
  : search.status==='done' && !search.results?.length ? '<p class="hint" role="status">찾은 곳이 없어요. 지점 이름이나 동네를 함께 넣어 보세요.</p>' : '';
 return `<section class="section card gym-settings" id="my-gyms"><h3>내 운동 장소</h3><p class="hint">헬스장·필라테스 스튜디오처럼 운동하는 곳을 등록해요. 헬스장을 고르면 그곳에서 등록한 머신을 운동 입력 때 먼저 보여 줘요.</p>
<form id="gym-search-form" class="gym-search" role="search"><input name="q" type="search" value="${h(search.q)}" placeholder="예: 스포애니 역삼역점" aria-label="운동 장소 이름으로 찾기" autocomplete="off" enterkeyhint="search"><button class="button">찾기</button></form>
${status}${placeListHTML(search.results, 'gym-pick')}${search.results?.length?'<p class="place-credit">장소 정보: 카카오</p>':''}
<div class="gym-tools"><button type="button" class="button secondary" id="gym-map-open">지도에서 고르기</button></div>
<details class="gym-manual"><summary>이름만 직접 입력</summary><form id="gym-form" class="actions"><input name="name" required maxlength="60" placeholder="예: 우리 아파트 헬스장" aria-label="운동 장소 이름"><button class="button">추가</button></form></details>
${gyms.length?`<div class="gym-list">${gyms.map((name, i) => { const p = places[name]; return `<div class="record gym-row"><span class="gym-name"><strong>${h(name)}</strong>${p?.address?`<small>${h(p.address)}</small>`:'<small>위치 정보 없음</small>'}</span><button class="text-button" data-gym-machines="${i}" aria-label="${h(name)} 머신 등록">머신 등록</button><button class="text-button" data-gym-delete="${i}" aria-label="${h(name)} 목록에서 삭제">삭제</button></div>`; }).join('')}</div>`:'<p class="hint">아직 등록한 운동 장소가 없어요.</p>'}
</section>`;
}

export function gymMapHTML(state={}){
 return `<div class="gym-map-flow"><p class="hint">지도를 움직여 운동하는 곳을 가운데에 두세요. 근처 운동 장소가 아래에 나와요.</p>
<div class="gym-map-wrap"><div id="gym-map" class="gym-map" aria-label="운동 장소 고르기 지도"></div><span class="gym-map-pin" aria-hidden="true"><svg viewBox="0 0 24 32" width="28" height="38"><path d="M12 1C6 1 1.5 5.5 1.5 11.3 1.5 19 12 31 12 31s10.5-12 10.5-19.7C22.5 5.5 18 1 12 1z" fill="var(--accent,#0f8f86)" stroke="#fff" stroke-width="2"/><circle cx="12" cy="11.5" r="4" fill="#fff"/></svg></span>${state.status==='error'?`<div class="gym-map-error">${h(state.message)}</div>`:''}</div>
<div class="gym-map-actions"><button type="button" class="button secondary" id="gym-map-locate">내 위치로</button><span class="hint">위치는 지도를 옮길 때 한 번만 쓰고 저장하지 않아요.</span></div>
<div id="gym-map-results" aria-live="polite">${mapResultsHTML(state)}</div>
<details class="gym-manual"><summary>목록에 없으면 가운데 지점에 이름 붙이기</summary><form id="gym-map-form" class="actions"><input name="name" required maxlength="60" placeholder="예: 회사 헬스장" aria-label="운동 장소 이름"><button class="button">이 위치로 추가</button></form></details></div>`;
}

export function mapResultsHTML(state={}){
 if(state.status==='loading') return '<p class="hint">근처 운동 장소를 찾는 중…</p>';
 if(state.status==='error') return '';
 if(state.status==='zoom') return '<p class="hint">지도를 조금 더 확대하면 근처 운동 장소가 나와요.</p>';
 if(state.status==='search-error') return `<p class="hint warn">${h(state.message)}</p>`;
 if(!state.results?.length) return state.status==='done' ? '<p class="hint">이 근처에서 찾은 운동 장소가 없어요. 지도를 옮기거나 아래에서 이름을 붙여 주세요.</p>' : '';
 return placeListHTML(state.results, 'gym-mappick') + '<p class="place-credit">장소 정보: 카카오</p>';
}

// 2026-11-27 대표님: 운동을 시작할 때 고른 헬스장과 지금 위치가 3km 넘게 떨어지면 '이 헬스장이 맞나요?'(배달 앱 주소 확인처럼). 위치는 그때 한 번만 보고 저장하지 않는다.
export const FAR_KM = 3;
export function kmBetween(a, b){
 const R = 6371, rad = d => d * Math.PI / 180, dLat = rad(b.lat - a.lat), dLng = rad(b.lng - a.lng);
 const x = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
 return 2 * R * Math.asin(Math.min(1, Math.sqrt(x)));
}
export function locWarnHTML(w){
 if(!w) return '';
 const km = w.km >= 10 ? Math.round(w.km) : Math.round(w.km * 10) / 10;
 return `<div class="ss loc-warn"><div class="ss-dim"><div class="ss-pop" role="alertdialog" aria-label="헬스장 확인"><h3>이 헬스장이 맞나요?</h3><p>지금 위치가 <b>${h(w.gym)}</b>에서 약 <b>${km}km</b> 떨어져 있어요.${w.where ? ` (${h(w.where)} 근처)` : ''}</p><div class="btns"><button type="button" class="keep" data-loc-ok>맞아요, 그대로 시작</button><button type="button" class="ss-back" data-loc-change>헬스장 바꾸기</button></div><p class="hint">운동을 시작할 때 한 번만 위치를 확인해요. 위치는 저장하지 않아요.</p></div></div></div>`;
}
