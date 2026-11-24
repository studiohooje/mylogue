// 3.14.0 검색어 추천: 한 글자만 쳐도 캡슐 칩으로 추천한다.
// - 자모 단위 비교: '다'·'달'처럼 조합 중인 글자도 '닭'으로 찾는다.
// - 초성: 'ㄷㄱㅅ' → 닭가슴살.
// - 한/영 전환을 잊고 친 영문 자판: 'ekfr' → '닭', 'ekfrrktmatkf' → '닭가슴살'.
// 정렬: 내가 많이 쓴 것 → 전체 사용자가 많이 쓴 것(익명 집계) → 이름이 잘 맞는 것.
const CHO = ['ㄱ','ㄲ','ㄴ','ㄷ','ㄸ','ㄹ','ㅁ','ㅂ','ㅃ','ㅅ','ㅆ','ㅇ','ㅈ','ㅉ','ㅊ','ㅋ','ㅌ','ㅍ','ㅎ'];
const JUNG = ['ㅏ','ㅐ','ㅑ','ㅒ','ㅓ','ㅔ','ㅕ','ㅖ','ㅗ','ㅘ','ㅙ','ㅚ','ㅛ','ㅜ','ㅝ','ㅞ','ㅟ','ㅠ','ㅡ','ㅢ','ㅣ'];
const JONG = ['','ㄱ','ㄲ','ㄳ','ㄴ','ㄵ','ㄶ','ㄷ','ㄹ','ㄺ','ㄻ','ㄼ','ㄽ','ㄾ','ㄿ','ㅀ','ㅁ','ㅂ','ㅄ','ㅅ','ㅆ','ㅇ','ㅈ','ㅊ','ㅋ','ㅌ','ㅍ','ㅎ'];
// 겹받침·겹모음은 실제로 누르는 자판 순서로 나눈다
const SPLIT = {ㄳ:'ㄱㅅ',ㄵ:'ㄴㅈ',ㄶ:'ㄴㅎ',ㄺ:'ㄹㄱ',ㄻ:'ㄹㅁ',ㄼ:'ㄹㅂ',ㄽ:'ㄹㅅ',ㄾ:'ㄹㅌ',ㄿ:'ㄹㅍ',ㅀ:'ㄹㅎ',ㅄ:'ㅂㅅ',ㅘ:'ㅗㅏ',ㅙ:'ㅗㅐ',ㅚ:'ㅗㅣ',ㅝ:'ㅜㅓ',ㅞ:'ㅜㅔ',ㅟ:'ㅜㅣ',ㅢ:'ㅡㅣ'};
// 두벌식 자판
const KEY = {q:'ㅂ',w:'ㅈ',e:'ㄷ',r:'ㄱ',t:'ㅅ',y:'ㅛ',u:'ㅕ',i:'ㅑ',o:'ㅐ',p:'ㅔ',a:'ㅁ',s:'ㄴ',d:'ㅇ',f:'ㄹ',g:'ㅎ',h:'ㅗ',j:'ㅓ',k:'ㅏ',l:'ㅣ',z:'ㅋ',x:'ㅌ',c:'ㅊ',v:'ㅍ',b:'ㅠ',n:'ㅜ',m:'ㅡ'};
const SHIFT = {Q:'ㅃ',W:'ㅉ',E:'ㄸ',R:'ㄲ',T:'ㅆ',O:'ㅒ',P:'ㅖ'};
const CONSONANTS = new Set(CHO);
const isSyllable = c => { const n = c.charCodeAt(0); return n >= 0xAC00 && n <= 0xD7A3; };

// 글자 → 자판 순서 문자열(라틴은 소문자 그대로, 공백·기호는 버림)
export function keystrokes(text, {latinAsHangul=false}={}){
 let out = '';
 for(const ch of String(text||'')){
  if(isSyllable(ch)){ const n = ch.charCodeAt(0)-0xAC00; const j = JONG[n%28]; out += CHO[Math.floor(n/588)] + (SPLIT[JUNG[Math.floor(n%588/28)]]||JUNG[Math.floor(n%588/28)]) + (SPLIT[j]||j); }
  else if(/[ㄱ-ㅣ]/.test(ch)) out += SPLIT[ch]||ch;
  else if(/[a-z]/i.test(ch)) out += latinAsHangul ? (SHIFT[ch]||KEY[ch.toLowerCase()]||'') : ch.toLowerCase();
  else if(/[0-9]/.test(ch)) out += ch;
 }
 return out;
}
export function choseong(text){ let out = ''; for(const ch of String(text||'')){ if(isSyllable(ch)) out += CHO[Math.floor((ch.charCodeAt(0)-0xAC00)/588)]; else if(/[a-z0-9]/i.test(ch)) out += ch.toLowerCase(); } return out; }
const plain = t => String(t||'').toLocaleLowerCase('ko').replace(/[\s·()\-_/.,]/g,'');

// 검색어가 다른 낱말의 일부일 뿐인 경우(검색어 → 그 낱말들)
const FALSE_HIT = {콜라:/콜라겐|쇼콜라|콜라비|비콜라/g};

// 이름(별칭 포함)이 검색어와 얼마나 맞는지 0~100
export function matchScore(query, names){
 const q = String(query||'').trim(); if(!q) return 0;
 const qPlain = plain(q), qKs = keystrokes(q), qKsHan = /[a-z]/i.test(q) ? keystrokes(q, {latinAsHangul:true}) : '';
 const onlyCons = [...q.replace(/\s/g,'')].every(c => CONSONANTS.has(c));
 let best = 0;
 for(const name of names){
  if(!name) continue;
  const nPlain = plain(name), nKs = keystrokes(name), words = String(name).split(/[\s·()\-_/]+/).filter(Boolean);
  const at = (hay, needle) => needle ? hay.indexOf(needle) : -1;
  let s = 0;
  if(qPlain && nPlain === qPlain) s = 100;
  else if(qPlain && nPlain.startsWith(qPlain)) s = 92;
  else if(qKs && nKs.startsWith(qKs)) s = 88;
  else if(qKsHan && nKs.startsWith(qKsHan)) s = 85;
  else if(words.some(w => plain(w).startsWith(qPlain) || keystrokes(w).startsWith(qKs) || (qKsHan && keystrokes(w).startsWith(qKsHan)))) s = 75;
  else if(onlyCons && choseong(name).replace(/\s/g,'').startsWith(q.replace(/\s/g,''))) s = 70;
  else if(qPlain && nPlain.includes(qPlain)) s = 60;
  else if(at(nKs, qKs) > 0 && qKs.length >= 2) s = 55;
  else if(qKsHan && qKsHan.length >= 2 && at(nKs, qKsHan) > 0) s = 50;
  else if(onlyCons && q.replace(/\s/g,'').length >= 2 && choseong(name).includes(q.replace(/\s/g,''))) s = 45;
  // 4.17.2 글자만 겹치는 다른 음식('콜라'→콜라겐·쇼콜라·콜라비)은 맨 뒤로: 그 단어를 지운 뒤에도 검색어가 남을 때만 제 점수
  const fake = s && FALSE_HIT[qPlain];
  if(fake && !plain(name).replace(fake, '').includes(qPlain)) s = Math.min(s, 20);
  if(s > best) best = s;
 }
 return best;
}

// 항목 목록에서 추천 정렬: 내 횟수 → 전체 횟수 → 맞는 정도
export function rankItems(query, items, {mine=()=>0, global=()=>0, names=x=>[x.name], limit=50}={}){
 return items.map(x => ({x, score:matchScore(query, names(x)), m:mine(x), g:global(x)}))
  .filter(r => r.score > 0)
  .sort((a, b) => (b.m>0) - (a.m>0) || b.m - a.m || (b.g>0) - (a.g>0) || b.g - a.g || b.score - a.score)
  .slice(0, limit);
}

export const normKey = t => plain(t);
