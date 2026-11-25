// 5.0.4 대표님: 설정처럼 각 페이지도 '요약 → 그래프 → 목록 → 맨 아래 더 보기 타일'. 타일을 누르면 그 카드가 그대로 팝업으로 뜬다.
// 타일 모양은 설정 타일(.set-grid/.set-tile)과 똑같이. 한 줄 카드(oneLine)도 같은 아이콘을 쓴다.
// 이 파일은 app.js를 import하지 않는다.
const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));
const P = (d, w = 2) => `<path d="${d}" fill="none" stroke="currentColor" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"/>`;
export const PG_ICON = {
  why: '<circle cx="12" cy="12" r="8.5" fill="none" stroke="currentColor" stroke-width="2"/>' + P('M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.7.3-1 .8-1 1.5v.4') + '<circle cx="12" cy="17" r="1.2" fill="currentColor"/>',
  method: P('M5 5.5h14M5 12h14M5 18.5h9', 2.2) + '<circle cx="18.5" cy="18.5" r="2" fill="currentColor"/>',
  status: '<rect x="4.5" y="4.5" width="15" height="15" rx="3" fill="none" stroke="currentColor" stroke-width="2"/>' + P('M8.5 12l2.5 2.5 4.5-5'),
  bowl: P('M4.5 11h15a7.5 7.5 0 0 1-15 0zM9 4.5c0 1.8-1 1.8-1 3.6M13 4.5c0 1.8-1 1.8-1 3.6'),
  swap: P('M6 8h11l-3-3M18 16H7l3 3'),
  flag: P('M6 21V4M6 5h11l-2 4 2 4H6'),
  bars: P('M5 20V13M10 20V8M15 20v-5M20 20V5', 2.2),
  spark: '<path d="M12 3.5l1.9 5.1 5.1 1.9-5.1 1.9L12 17.5l-1.9-5.1L5 10.5l5.1-1.9z" fill="currentColor"/>',
  cal: '<rect x="4" y="5" width="16" height="15" rx="3" fill="none" stroke="currentColor" stroke-width="2"/>' + P('M4 10h16M9 3v4M15 3v4'),
  heart: P('M12 20s-7.5-4.6-7.5-10A4.3 4.3 0 0 1 12 7.5 4.3 4.3 0 0 1 19.5 10c0 5.4-7.5 10-7.5 10z'),
  trophy: P('M8 4h8v5a4 4 0 0 1-8 0zM8 6H5a3 3 0 0 0 3 4M16 6h3a3 3 0 0 1-3 4M12 13v4M8.5 20h7'),
  list: P('M9 6h11M9 12h11M9 18h11') + '<circle cx="5" cy="6" r="1.3" fill="currentColor"/><circle cx="5" cy="12" r="1.3" fill="currentColor"/><circle cx="5" cy="18" r="1.3" fill="currentColor"/>',
  gym: P('M3.5 10v4M6.5 8v8M17.5 8v8M20.5 10v4M6.5 12h11', 2.2),
  table: '<rect x="4" y="5" width="16" height="14" rx="2.5" fill="none" stroke="currentColor" stroke-width="2"/>' + P('M4 10h16M10 10v9'),
  compass: '<circle cx="12" cy="12" r="8.5" fill="none" stroke="currentColor" stroke-width="2"/><path d="M15.5 8.5l-2 5-5 2 2-5z" fill="currentColor"/>',
  flask: P('M9.5 4h5M10.5 4v5L5.5 18a1.5 1.5 0 0 0 1.3 2.2h10.4a1.5 1.5 0 0 0 1.3-2.2L13.5 9V4M7.8 14.5h8.4'),
  sliders: P('M5 7h9M18 7h1M5 17h3M12 17h7') + '<circle cx="16" cy="7" r="2" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="10" cy="17" r="2" fill="none" stroke="currentColor" stroke-width="2"/>',
  chat: P('M5 6.5A2.5 2.5 0 0 1 7.5 4h9A2.5 2.5 0 0 1 19 6.5v7a2.5 2.5 0 0 1-2.5 2.5H11l-4 3.5V16h0a2 2 0 0 1-2-2z'),
  photo: '<rect x="3.5" y="6" width="17" height="13" rx="3" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="12" cy="12.5" r="3.2" fill="none" stroke="currentColor" stroke-width="2"/>' + P('M8.5 6l1.5-2h4l1.5 2'),
  file: P('M7 3.5h7l4 4v13H7zM14 3.5v4h4M10 13h5M10 16.5h5'),
};

// list: [[key, icon, title, desc]] — key는 'page:이름'
export function moreTilesHTML(list){
  if(!list.length) return '';
  return `<div class="more-label"><span>더 보기</span><span>${list.length}개</span></div><div class="set-grid pg-tiles">${list.map(([key, ic, title, desc], i) => `<button type="button" class="set-tile" data-pg-sec="${esc(key)}" style="--i:${i % 6}"><b class="set-ic"><svg viewBox="0 0 24 24" aria-hidden="true">${PG_ICON[ic] || PG_ICON.list}</svg></b><span class="set-txt"><strong>${esc(title)}</strong><small>${esc(desc)}</small></span></button>`).join('')}</div>`;
}

// 꽉 찬 한 줄 카드(아이콘 + 제목 + 한 줄 + ›). 누르면 같은 팝업.
export function oneLineHTML({key, icon = 'why', title, sub = '', i = 0}){
  return `<button type="button" class="pg-line" data-pg-sec="${esc(key)}"><b class="set-ic" style="--i:${i}"><svg viewBox="0 0 24 24" aria-hidden="true">${PG_ICON[icon] || PG_ICON.why}</svg></b><span class="set-txt"><strong>${esc(title)}</strong>${sub ? `<small>${esc(sub)}</small>` : ''}</span><span class="pg-chev" aria-hidden="true">›</span></button>`;
}
