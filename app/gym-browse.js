// 2026-11-27 대표님(목업 ②③④ 확정): 설정 › 헬스장 둘러보기 — 기구가 하나라도 등록된 헬스장을 이름·내 주변으로 찾고,
// 헬스장을 누르면 기준운동별로 비치 기구를 본다. 일반 회원은 '기구 추가·수정 요청', 관리자는 바로 추가·수정·삭제(기존 헬스장 머신 등록 화면을 그대로 연다).
// 이 파일은 app.js를 import하지 않는다.
import {allModels} from './gym-machines.js';
import {GENERIC_MACHINES} from './machines-catalog.js';
const LOAD_LABEL = {plate: '원판식', stack: '핀 스택식', cable: '케이블', smith: '스미스', body: '맨몸'};
import {machineTagHTML} from './machine-tag.js';

const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));
const SIDE = {both: '양쪽 함께', iso: '양쪽 따로', single: '한쪽 전용'};

// 기구가 등록된 헬스장: 열쇠(kakao:장소번호 또는 name:이름)별로 묶는다
export function gymsWithMachines(shared = {}){
 const m = new Map();
 for(const g of shared.gymMachines || []){
  if(g.removed) continue;
  const key = g.gymKey || `name:${g.gymName}`;
  if(!m.has(key)) m.set(key, {key, name: g.gymName || key.replace(/^name:/, ''), ids: new Set(), specs: {}, at: ''});
  const x = m.get(key); x.ids.add(g.modelId); if(g.spec) x.specs[g.modelId] = g.spec; if(String(g.updatedAt || '') > x.at) x.at = String(g.updatedAt || '');
 }
 return [...m.values()].map(x => ({...x, count: x.ids.size}));
}
const plain = s => String(s || '').toLocaleLowerCase('ko').replace(/\s+/g, '');
export function filterGyms(list, q = ''){
 const k = plain(q);
 return (k ? list.filter(g => plain(g.name).includes(k)) : list).sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, 'ko'));
}
// 내 주변: 카카오 주변 검색 결과(장소 번호·거리) 중 기구가 등록된 곳만, 가까운 순
export function nearWithMachines(list, places = []){
 const by = new Map(list.map(g => [g.key, g]));
 return places.map(p => { const g = by.get(`kakao:${p.providerId || p.id}`); return g ? {...g, address: p.address, km: Number(p.distance) > 0 ? Number(p.distance) / 1000 : null} : null; }).filter(Boolean);
}
const kmText = km => km == null ? '' : km < 1 ? `${Math.round(km * 1000)}m` : `${km.toFixed(1)}km`;

export function gymBrowseHTML(st = {}, shared = {}, settings = {}, {signedIn = true} = {}){
 if(!signedIn) return `<section class="section card gym-browse"><h3>기구가 등록된 헬스장</h3><p class="hint">로그인하면 헬스장마다 비치된 기구를 볼 수 있어요.</p><button type="button" class="button secondary" disabled>헬스장 둘러보기</button><p class="hint">설정 › 계정에서 로그인해 주세요.</p></section>`;
 const all = gymsWithMachines(shared), mine = new Set(settings.gyms || []);
 const rows = st.mode === 'near' ? (st.near || []) : filterGyms(all, st.q);
 const row = g => `<button type="button" class="gb-row" data-gb-open="${esc(g.key)}"><b>${esc(g.name)}${mine.has(g.name) ? '<span class="gb-mine">내 헬스장</span>' : ''}</b><small>${esc([g.address || settings.gymPlaces?.[g.name]?.address || '', `기구 ${g.count}대`].filter(Boolean).join(' · '))}</small><em>${esc(kmText(g.km))}<i aria-hidden="true">›</i></em></button>`;
 const body = st.mode === 'near' && st.loading ? '<p class="hint">내 주변 헬스장을 찾는 중…</p>'
  : st.mode === 'near' && st.err ? `<p class="hint warn">${esc(st.err)}</p>`
  : rows.length ? `<div class="gb-list">${rows.map(row).join('')}</div>`
  : `<p class="hint">${st.mode === 'near' ? '주변 5km 안에 기구가 등록된 헬스장이 없어요. 이름으로 찾아보세요.' : all.length ? '이 이름의 헬스장이 없어요.' : '아직 기구가 등록된 헬스장이 없어요.'}</p>`;
 return `<section class="section card gym-browse"><h3>기구가 등록된 헬스장</h3><p class="hint">이름으로 찾거나 내 주변을 봐요. 헬스장을 누르면 비치된 기구를 볼 수 있어요.</p>
 <form id="gb-search" class="gym-search" role="search"><input name="q" type="search" value="${esc(st.q || '')}" placeholder="헬스장 이름으로 찾기" aria-label="헬스장 이름으로 찾기" autocomplete="off" enterkeyhint="search"><button class="button">찾기</button></form>
 <div class="chip-row gb-modes"><button type="button" class="chip ${st.mode === 'near' ? 'active' : ''}" data-gb-near>📍 내 주변</button><button type="button" class="chip ${st.mode !== 'near' ? 'active' : ''}" data-gb-all>전체 ${all.length}곳</button><button type="button" class="chip" id="gym-map-open">지도에서 보기</button></div>
 <p class="gb-sub">${st.mode === 'near' ? '내 주변 · 가까운 순' : st.q ? `‘${esc(st.q)}’ 찾은 결과` : '기구가 많은 순'}</p>${body}</section>`;
}

// 헬스장 기구: 기준운동별로 묶기(머신 종류의 대표 운동 이름)
const baseOf = m => GENERIC_MACHINES.find(g => g.id === (m.generic ? m.id : m.baseId)) || null;
export function gymDetailHTML(key, shared = {}, {admin = false} = {}){
 const g = gymsWithMachines(shared).find(x => x.key === key);
 if(!g) return '<section class="section card"><p class="hint">이 헬스장의 기구 정보를 찾지 못했어요.</p></section>';
 const models = allModels(shared), groups = new Map();
 for(const id of g.ids){
  const m = models.get(id); if(!m) continue;
  const base = baseOf(m), ex = base?.exercise || m.exercise || '기타';
  if(!groups.has(ex)) groups.set(ex, []);
  groups.get(ex).push({id, m, base});
 }
 const specLine = ({id, m, base}) => { const sp = g.specs[id] || {}, load = sp.load || base?.load, sided = sp.sided || base?.sided; return [LOAD_LABEL[load] || '', sp.unit === 'level' ? '단계' : sp.unit || '', SIDE[sided] || ''].filter(Boolean).join(' · '); };
 const row = x => `<div class="gb-m">${x.m.kind === 'brand' ? machineTagHTML(x.m, specLine(x)) : `<span class="m-tag"><b class="m-mk">${esc(x.m.name)}</b></span>`}<small>${esc(specLine(x))}</small>${admin ? `<span class="gb-acts"><button type="button" data-gb-edit="${esc(key)}">수정</button><button type="button" data-gb-del="${esc(key)}|${esc(x.id)}">삭제</button></span>` : ''}</div>`;
 const sorted = [...groups].sort((a, b) => b[1].length - a[1].length || a[0].localeCompare(b[0], 'ko'));
 return `<section class="section card gym-detail"><h3>${esc(g.name)}</h3><p class="hint">기구 ${g.count}대${g.at ? ` · 마지막 수정 ${esc(g.at.slice(5, 10).replace('-', '/'))}` : ''}</p>
 ${sorted.map(([ex, list]) => `<section class="gb-grp"><h4>${esc(ex)}<small>${list.length}대</small></h4>${list.map(row).join('')}</section>`).join('')}
 ${admin ? `<button type="button" class="button" data-gb-edit="${esc(key)}">＋ 기구 추가</button><p class="hint">관리자라 저장하면 바로 모든 사람에게 보여요.</p>` : `<button type="button" class="button secondary" data-gb-edit="${esc(key)}">기구 추가·수정 요청</button><p class="hint">보내면 관리자가 확인한 뒤 모두에게 보여요.</p>`}
 <button type="button" class="text-button" data-gb-back>‹ 헬스장 목록으로</button></section>`;
}
