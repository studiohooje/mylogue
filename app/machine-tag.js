// 2026-11-27 대표님: 좁은 칸에서는 제조사 한글명만(예: 해머 스트렝스), '…'를 누르거나 마우스를 올리면
// 제조사(영문) / 모델(영문) / 방식 전체 이름. 제조사 글자는 그 회사 대표색(어두운 바탕에서 읽히게 밝기 보정).
// 이 파일은 app.js를 import하지 않는다.
import {MAKER_NAMES} from './machine-names-ko.js';

// 각 회사 로고·홈페이지에서 쓰는 대표색(어림값). 없으면 마이로그 기본 글자색.
const CI = {
 'Hammer Strength': '#C8102E', 'Life Fitness': '#E4002B', 'Cybex': '#E35205', 'Technogym': '#A7B1BC', 'Matrix': '#E31837',
 'Panatta': '#E30613', 'gym80': '#E2001A', 'DRAX(드랙스)': '#00A0E9', 'Precor': '#D22630', 'Nautilus': '#0055B8',
 'Hoist': '#D71920', 'Atlantis': '#00539B', 'Prime Fitness': '#F2A900', 'Watson': '#E10600', 'BH Fitness': '#E2001A',
 '뉴텍(Newtech Wellness)': '#0072BC', 'Impulse': '#D7000F', 'DHZ': '#E60012',
};
const BG = [27, 42, 68]; // 카드 바탕(#1b2a44) 근처
const lum = ([r, g, b]) => { const f = c => { c /= 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
const ratio = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
const hex = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
const toHex = c => '#' + c.map(v => Math.round(v).toString(16).padStart(2, '0')).join('');
// 대표색이 바탕과 너무 비슷하면 흰색 쪽으로 조금씩 섞어 대비 4.5 이상으로
export function readable(h, bg = BG){
 let c = hex(h);
 for(let i = 0; i < 20 && ratio(c, bg) < 4.5; i++) c = c.map(v => v + (255 - v) * 0.12);
 return toHex(c);
}
const cache = new Map();
export function makerColor(maker){
 if(!CI[maker]) return '';
 if(!cache.has(maker)) cache.set(maker, readable(CI[maker]));
 return cache.get(maker);
}
export const makerKo = maker => MAKER_NAMES[maker]?.[0] || String(maker || '');

const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));
// m: 머신(브랜드면 manufacturer·makerLabel·modelLabel·lineLabel, 일반 종류면 name), spec: '원판식 · kg' 같은 한 줄
export function machineTagHTML(m, spec = ''){
 if(!m) return '';
 const maker = m.manufacturer || '', short = maker ? makerKo(maker) : (m.name || m.model || '');
 if(!maker) return `<span class="m-tag"><b class="m-mk">${esc(short)}</b></span>`;
 const col = makerColor(maker), full = [m.makerLabel || maker, m.modelLabel || m.model || '', [...new Set([m.lineLabel, ...String(spec).split(' · ')].filter(Boolean))].join(' · ')].filter(Boolean);
 return `<span class="m-tag"><b class="m-mk"${col ? ` style="color:${col}"` : ''}>${esc(short)}</b><span class="m-more" role="button" tabindex="0" aria-label="${esc(full.join(', '))}" title="${esc(full.join('\n'))}">…<span class="m-tip" role="tooltip"><b${col ? ` style="color:${col}"` : ''}>${esc(full[0])}</b>${full.slice(1).map(x => `<span>${esc(x)}</span>`).join('')}</span></span></span>`;
}
