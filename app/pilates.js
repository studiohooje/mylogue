// 4.8.0 필라테스 수업 기록(코치로그 1단계). 설계: reports/코치로그 보완 방향.md 3절.
// 필라테스 수업 = 시간 종목(kind:'cardio') 하나 + moves(동작 목록). 무게 대신 스프링, 세팅·큐잉이 기록의 절반.
// 빈 값은 null/빈 문자열(0이 아님). '치료·교정' 같은 의료 표현은 앱이 쓰지 않는다.
const esc = v => String(v??'').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const APPARATUS = ['매트','리포머','리포머 타워','캐딜락','체어','래더 배럴','스파인 코렉터','아크 배럴','기타'];
export const SPRINGS = [['빨강','#e5484d'],['파랑','#3e7bfa'],['노랑','#f2c94c'],['초록','#30a46c'],['검정','#2b2b2b'],['회색','#9aa0a6'],['흰색','#f4f4f4'],['보라','#8e4ec6']];
export const LOADS = ['가볍게','중간','무겁게'];
export const SIDES = ['양쪽','왼쪽만','오른쪽만','좌우 다르게'];
export const PROPS = ['매직서클','소프트볼','토닝볼','폼롤러','밴드','블록','쿠션·패드','강사 보조'];
export const OBS = ['잘 됨','어려워함','불편감 있음'];
export const AREAS = ['목','어깨','등','허리','골반','고관절','무릎','발목','손목'];
export const CLASS_TYPES = ['개인','듀엣','트리오','그룹'];
export const PILATES_CLASSES = ['필라테스 리포머','필라테스 매트','필라테스 캐딜락','필라테스 체어','필라테스 바렐','필라테스 기구 혼합'];
export const MOVES = {
 '매트':['헌드레드','롤업','롤오버','싱글 레그 서클','롤링 라이크 어 볼','싱글 레그 스트레치','더블 레그 스트레치','스파인 스트레치','쏘우','스완','사이드 킥','티저','씰','브릿지','캣카우','플랭크'],
 '리포머':['풋워크','헌드레드','코디네이션','스트랩 풋워크','레그 서클','쇼트 스파인','엘리펀트','니 스트레치','롱 스트레치','다운 스트레치','업 스트레치','스터머신','머메이드','풀링 스트랩','백 스트로크','티저','쇼트 박스','사이드 스플릿','러닝','점프보드'],
 '리포머 타워':['롤다운','푸시스루','레그 스프링','암 스프링'],
 '캐딜락':['롤다운','푸시스루','타워','브리딩','레그 스프링','암 스프링','캣','행잉'],
 '체어':['풋워크','펌프','스완','머메이드','티저','스텝업','풀업','푸시다운'],
 '래더 배럴':['스트레칭','스완','사이드 스트레치','쇼트 박스'],
 '스파인 코렉터':['스완','브릿지','사이드 리프트','시저스'],
 '아크 배럴':['헌드레드','브릿지','스트레칭']
};
export const ALL_MOVES = [...new Set(Object.values(MOVES).flat())];
const apparatusOf = cls => ({'필라테스 매트':'매트','필라테스 캐딜락':'캐딜락','필라테스 체어':'체어','필라테스 바렐':'래더 배럴'})[cls] || '리포머';
export const isPilates = e => /필라테스/.test(String(e?.name||'')) || e?.part==='필라테스' || Array.isArray(e?.moves);
const num = (v, lo, hi, int=true) => { if(v===''||v==null) return null; const n = Number(v); if(!Number.isFinite(n)) return null; const x = int ? Math.round(n) : n; return x<lo||x>hi ? null : x; };
const str = (v, n) => String(v??'').trim().slice(0, n);
const pick = (v, list) => list.includes(v) ? v : '';

// 저장 계약: 이상한 값은 버리고(0으로 채우지 않음) 길이를 자른다
export function cleanMove(raw={}){
 const name = str(raw.name, 60); if(!name) return null;
 const springs = (Array.isArray(raw.springs) ? raw.springs : []).map(s => ({c:pick(s?.c, SPRINGS.map(x => x[0])), n:num(s?.n, 1, 6)})).filter(s => s.c && s.n);
 return {name, apparatus:pick(raw.apparatus, APPARATUS)||'기타', springs, load:pick(raw.load, LOADS), setup:str(raw.setup, 120), reps:num(raw.reps, 1, 500), sec:num(raw.sec, 1, 3600), side:pick(raw.side, SIDES), level:num(raw.level, 1, 5), props:(Array.isArray(raw.props)?raw.props:[]).filter(p => PROPS.includes(p)), cue:str(raw.cue, 200), cueShow:raw.cueShow!==false, obs:pick(raw.obs, OBS), area:(Array.isArray(raw.area)?raw.area:[]).filter(a => AREAS.includes(a))};
}
export const cleanMoves = list => (Array.isArray(list) ? list : []).slice(0, 60).map(cleanMove).filter(Boolean);
// 회원에게 보낼 때: 강사 전용 큐는 뺀다
export const movesForMember = moves => cleanMoves(moves).map(m => m.cueShow ? m : {...m, cue:''});

export const springText = m => m.springs?.length ? m.springs.map(s => `${s.c}${s.n}`).join('+') : (m.load || '');
export function moveText(m){
 const amt = [m.reps ? `${m.reps}회` : '', m.sec ? `${m.sec}초` : '', m.side && m.side!=='양쪽' ? m.side : ''].filter(Boolean).join(' ');
 return [m.apparatus!=='매트' && m.apparatus!=='기타' ? m.apparatus : '', m.name, springText(m), amt, m.level ? `${m.level}단계` : ''].filter(Boolean).join(' · ');
}
export function movesSummary(moves=[]){
 const ap = [...new Set(moves.map(m => m.apparatus).filter(a => a && a!=='기타'))];
 return moves.length ? `동작 ${moves.length}개${ap.length ? ` · ${ap.join('·')}` : ''}` : '';
}
// 기구 전환·스프링 교체 횟수(수업 흐름이 끊기는 정도)
export function flowStats(moves=[]){
 let swaps = 0, changes = 0;
 for(let i=1; i<moves.length; i++){ if(moves[i].apparatus!==moves[i-1].apparatus) swaps++; else if(springText(moves[i])!==springText(moves[i-1])) changes++; }
 const sec = moves.reduce((a, m) => a + (m.sec || (m.reps ? m.reps*4 : 0)), 0);
 return {swaps, changes, estMin:sec ? Math.round(sec/60) : null};
}
// 이 회원과 같은 동작을 마지막으로 했을 때 값(자동 채움)
export function lastMove(sessions=[], clientId, name){
 const list = [...sessions].filter(s => !clientId || (s.targets||[]).some(t => t.clientId===clientId)).sort((a, b) => String(b.date).localeCompare(String(a.date)));
 for(const s of list) for(const e of s.exercises||[]) for(const m of e.moves||[]) if(m.name===name) return m;
 return null;
}
// 이 회원에게 가르친 동작(최근 순)과 4주 안 한 동작
export function taughtMoves(sessions=[], clientId, today){
 const d0 = /^\d{4}-\d{2}-\d{2}$/.test(today||'') ? new Date(`${today}T12:00:00`) : new Date(); d0.setDate(d0.getDate()-28); const f0 = d0.toISOString().slice(0,10);
 const map = new Map();
 for(const s of sessions) if((s.targets||[]).some(t => t.clientId===clientId && t.status!=='rejected')) for(const e of s.exercises||[]) for(const m of e.moves||[]){ const k = m.name, x = map.get(k) || {name:k, apparatus:m.apparatus, n:0, last:''}; x.n++; if(String(s.date)>x.last) x.last = String(s.date); map.set(k, x); }
 const all = [...map.values()].sort((a, b) => b.last.localeCompare(a.last));
 return {all, stale:all.filter(x => x.last < f0)};
}
// 동작별 스프링·단계 변화(회원 진척): '풋워크: 빨강3 → 빨강2+파랑1'
export function moveProgress(workouts=[], limit=6){
 const map = new Map();
 for(const w of [...workouts].filter(w => !w.planned).sort((a, b) => String(a.date).localeCompare(String(b.date)))) for(const e of w.exercises||[]) for(const m of e.moves||[]){ const k = `${m.apparatus}|${m.name}`, x = map.get(k) || {name:m.name, apparatus:m.apparatus, first:null, last:null, n:0}; const v = {date:w.date, spring:springText(m), level:m.level}; if(!x.first) x.first = v; x.last = v; x.n++; map.set(k, x); }
 return [...map.values()].filter(x => x.n>1 && (x.first.spring!==x.last.spring || x.first.level!==x.last.level)).sort((a, b) => b.n-a.n).slice(0, limit);
}

// ---- 화면 ----
const springDot = c => `<i class="pm-dot" style="background:${(SPRINGS.find(s => s[0]===c)||[,'#999'])[1]}"></i>`;
export const springChipsHTML = m => m.springs?.length ? `<span class="pm-springs">${m.springs.map(s => `${springDot(s.c)}${esc(s.c)}${s.n}`).join(' ')}</span>` : (m.load ? `<span class="pm-springs">${esc(m.load)}</span>` : '');
// 읽기 카드(회원 확인함·기록 보기)
export function movesListHTML(moves=[], {cue=true}={}){
 if(!moves.length) return '';
 return `<ol class="pm-list">${moves.map(m => `<li><b>${esc(m.name)}</b> <small>${esc([m.apparatus!=='기타'?m.apparatus:'', [m.reps?`${m.reps}회`:'', m.sec?`${m.sec}초`:'', m.side&&m.side!=='양쪽'?m.side:''].filter(Boolean).join(' '), m.level?`${m.level}단계`:''].filter(Boolean).join(' · '))}</small> ${springChipsHTML(m)}${m.setup?`<small class="pm-setup">세팅 ${esc(m.setup)}</small>`:''}${m.props?.length?`<small class="pm-setup">${esc(m.props.join('·'))}</small>`:''}${cue&&m.cue?`<p class="pm-cue">“${esc(m.cue)}”</p>`:''}${m.obs?`<small class="pm-obs${m.obs==='불편감 있음'?' warn':''}">${esc(m.obs)}${m.area?.length?` · ${esc(m.area.join(', '))}`:''}</small>`:''}</li>`).join('')}</ol>`;
}

// 코치 수업 입력의 필라테스 줄(rows[i].kind==='pilates')
export function pilatesRowHTML(r, i, {lastOf}={}){
 const moves = r.moves?.length ? r.moves : [];
 const fs = flowStats(cleanMoves(moves));
 const mv = (m, j) => {
  const more = !!(m.setup || m.props?.length || m.cue || m.obs || m.side || m.level);
  const last = lastOf?.(m.name);
  return `<div class="pm-move" data-pm="${i}:${j}"><div class="pm-line"><span class="pm-no">${j+1}</span><input data-m="name" list="pm-move-names" value="${esc(m.name)}" placeholder="동작(예: 풋워크)" aria-label="동작 이름" data-pm-name="${i}:${j}"><select data-m="apparatus" aria-label="기구">${APPARATUS.map(a => `<option ${m.apparatus===a?'selected':''}>${a}</option>`).join('')}</select><button type="button" class="text-button" data-pm-del="${i}:${j}" aria-label="동작 지우기">×</button></div>
 ${m.apparatus==='매트'?'':`<div class="pm-springrow" role="group" aria-label="스프링(누를 때마다 개수 +1, 4개 다음은 0)">${SPRINGS.map(([c]) => { const n = (m.springs||[]).find(s => s.c===c)?.n||0; return `<button type="button" class="pm-spring${n?' on':''}" data-pm-spring="${i}:${j}:${c}" aria-label="${c} 스프링 ${n}개">${springDot(c)}${n?`<b>${n}</b>`:''}</button>`; }).join('')}<select data-m="load" aria-label="저항 정도"><option value="">저항</option>${LOADS.map(l => `<option ${m.load===l?'selected':''}>${l}</option>`).join('')}</select></div>`}
 <div class="pm-line pm-amt"><label>회<input data-m="reps" type="number" inputmode="numeric" min="1" max="500" value="${esc(m.reps??'')}"></label><label>초<input data-m="sec" type="number" inputmode="numeric" min="1" max="3600" value="${esc(m.sec??'')}"></label><label>단계<select data-m="level"><option value="">—</option>${[1,2,3,4,5].map(n => `<option ${Number(m.level)===n?'selected':''}>${n}</option>`).join('')}</select></label></div>
 ${last && !m.springs?.length && !m.setup ? `<button type="button" class="text-button pm-last" data-pm-fill="${i}:${j}">지난번 값 넣기 · ${esc(springText(last)||'')}${last.setup?` · ${esc(last.setup)}`:''}</button>` : ''}
 <details class="pm-more"${more?' open':''}><summary>세팅·소도구·큐잉·관찰</summary>
 <label class="field">기구 세팅<input data-m="setup" value="${esc(m.setup)}" maxlength="120" placeholder="예: 풋바 2, 헤드레스트 올림, 기어 3"></label>
 <div class="pm-line"><label>좌우<select data-m="side"><option value="">—</option>${SIDES.map(s => `<option ${m.side===s?'selected':''}>${s}</option>`).join('')}</select></label></div>
 <div class="chips pm-props">${PROPS.map(p => `<label class="chip-check"><input type="checkbox" data-m-prop="${p}" ${(m.props||[]).includes(p)?'checked':''}> ${p}</label>`).join('')}</div>
 <label class="field">큐잉 메모<input data-m="cue" value="${esc(m.cue)}" maxlength="200" placeholder="예: 갈비뼈 닫고 내쉬며 시작"></label>
 <label class="check-row"><input type="checkbox" data-m="cueShow" ${m.cueShow!==false?'checked':''}> 큐잉을 회원에게 보이기</label>
 <div class="pm-line"><label>관찰<select data-m="obs"><option value="">—</option>${OBS.map(o => `<option ${m.obs===o?'selected':''}>${o}</option>`).join('')}</select></label></div>
 ${m.obs==='불편감 있음'?`<div class="chips pm-props">${AREAS.map(a => `<label class="chip-check"><input type="checkbox" data-m-area="${a}" ${(m.area||[]).includes(a)?'checked':''}> ${a}</label>`).join('')}</div><p class="hint">불편감은 기록일 뿐이에요. 통증이 이어지면 전문의 상담을 권해 주세요.</p>`:''}
 </details></div>`;
 };
 return `<div class="cs-row pilates" data-row="${i}"><div class="pm-head"><span class="pm-tag">필라테스</span><select data-r="name" aria-label="수업 종류">${[...new Set([...PILATES_CLASSES, ...(r.name&&!PILATES_CLASSES.includes(r.name)?[r.name]:[])])].map(c => `<option value="${esc(c)}" ${r.name===c?'selected':''}>${esc(c.replace(/^필라테스 /,''))}</option>`).join('')}</select><input data-r="min" type="number" inputmode="numeric" min="0" value="${esc(r.min)}" placeholder="분" aria-label="수업 시간(분)"><select data-r="type" aria-label="수업 형태">${['', ...CLASS_TYPES].map(t => `<option ${r.type===t?'selected':''} value="${t}">${t||'형태'}</option>`).join('')}</select><button type="button" class="text-button" data-cs-del="${i}" aria-label="수업 지우기">×</button></div>
 <div class="pm-moves">${moves.map(mv).join('')||'<p class="hint">동작을 추가하면 기구·스프링·세팅을 기록할 수 있어요. 동작 없이 시간만 보내도 돼요.</p>'}</div>
 <div class="actions"><button type="button" class="button secondary small" data-pm-add="${i}">＋ 동작</button>${moves.length>1?`<small class="pm-flow">기구 바꿈 ${fs.swaps}번 · 스프링 바꿈 ${fs.changes}번${fs.estMin?` · 동작 약 ${fs.estMin}분`:''}</small>`:''}</div>
 <input type="hidden" data-r="note" value="${esc(r.note||'')}"></div>`;
}
export const moveNamesDatalist = () => `<datalist id="pm-move-names">${ALL_MOVES.map(m => `<option value="${esc(m)}">`).join('')}</datalist>`;
// 줄 요소 → 동작 목록(화면에서 읽기)
export function readMoves(rowEl, prev=[]){
 return [...rowEl.querySelectorAll('.pm-move')].map((el, j) => {
  const g = k => el.querySelector(`[data-m="${k}"]`); const v = k => g(k)?.value ?? '';
  const old = prev[j] || {};
  return {name:v('name').trim(), apparatus:v('apparatus')||old.apparatus||'리포머', springs:old.springs||[], load:v('load'), reps:v('reps'), sec:v('sec'), level:v('level'), setup:v('setup'), side:v('side'), props:[...el.querySelectorAll('[data-m-prop]:checked')].map(x => x.dataset.mProp), cue:v('cue'), cueShow:g('cueShow') ? g('cueShow').checked : old.cueShow!==false, obs:v('obs'), area:[...el.querySelectorAll('[data-m-area]:checked')].map(x => x.dataset.mArea)};
 });
}
export const newMove = (cls, prev) => ({name:'', apparatus:prev?.apparatus || apparatusOf(cls), springs:[], load:'', reps:'', sec:'', level:'', setup:'', side:'', props:[], cue:'', cueShow:true, obs:'', area:[]});
// 스프링 칩 한 번 누르기: 0→1→2→3→4→0
export function bumpSpring(move, color){
 const springs = [...(move.springs||[])]; const k = springs.findIndex(s => s.c===color);
 if(k<0) springs.push({c:color, n:1}); else if(springs[k].n>=4) springs.splice(k, 1); else springs[k] = {...springs[k], n:springs[k].n+1};
 return {...move, springs};
}

// ---- 자세 관찰(평가) — '관찰'과 '참고'만 ----
export const POSTURE_ITEMS = [['head','머리 위치(앞으로 나옴)'],['shoulder','좌우 어깨 높이'],['pelvis','좌우 골반 높이'],['knee','무릎 방향'],['arch','발 아치'],['trunk','몸통 기울기']];
export const MOVE_ITEMS = [['rolldown','롤다운'],['squat','스쿼트'],['onefoot','한 발 서기'],['armraise','팔 들기']];
export const POSTURE_LV = ['차이 없음','약간','뚜렷'];
export const MOVE_LV = ['편안함','제한 있음','불편감 있음'];
export function cleanAssessment(raw={}){
 const pick2 = (o, keys, lv) => Object.fromEntries(keys.map(([k]) => [k, lv.includes(o?.[k]) ? o[k] : '']).filter(([, v]) => v));
 return {id:str(raw.id, 40) || `pa${Date.now().toString(36)}`, date:/^\d{4}-\d{2}-\d{2}$/.test(raw.date||'') ? raw.date : new Date().toISOString().slice(0,10), posture:pick2(raw.posture, POSTURE_ITEMS, POSTURE_LV), move:pick2(raw.move, MOVE_ITEMS, MOVE_LV), note:str(raw.note, 300), next:/^\d{4}-\d{2}-\d{2}$/.test(raw.next||'') ? raw.next : ''};
}
// 두 평가에서 바뀐 항목
export function assessmentDiff(a, b){
 if(!a || !b) return [];
 return [...POSTURE_ITEMS.map(([k, l]) => [l, a.posture?.[k]||'', b.posture?.[k]||'']), ...MOVE_ITEMS.map(([k, l]) => [l, a.move?.[k]||'', b.move?.[k]||''])].filter(([, x, y]) => x!==y && (x||y));
}
export function assessmentHTML(c, {open=false}={}){
 const list = [...(c.assessments||[])].sort((a, b) => String(b.date).localeCompare(String(a.date)));
 const [cur, prev] = list, diff = assessmentDiff(prev, cur);
 const sel = (name, lv, v) => `<select name="${name}"><option value="">—</option>${lv.map(x => `<option ${v===x?'selected':''}>${x}</option>`).join('')}</select>`;
 return `<div class="cd-assess"><small>자세 관찰 <em>운동을 위한 관찰 기록이에요. 진단이 아니에요.</em></small>
 ${cur?`<p class="hint">최근 ${esc(cur.date.slice(5).replace('-','/'))}${prev?` · 지난 ${esc(prev.date.slice(5).replace('-','/'))}와 비교`:''}${cur.next?` · 다음 관찰 ${esc(cur.next.slice(5).replace('-','/'))}`:''}</p>${diff.length?`<ul class="pa-diff">${diff.map(([l, x, y]) => `<li>${esc(l)}: ${esc(x||'—')} → <b>${esc(y||'—')}</b></li>`).join('')}</ul>`:prev?'<p class="hint">지난 관찰과 달라진 항목이 없어요.</p>':''}${cur.note?`<p>${esc(cur.note)}</p>`:''}`:''}
 ${open?`<form id="coach-assess-form" class="pa-form" data-client="${esc(c.id)}"><label class="field">날짜<input name="date" type="date" data-no-when value="${new Date().toISOString().slice(0,10)}"></label><fieldset><legend>서 있는 자세</legend>${POSTURE_ITEMS.map(([k, l]) => `<label class="pa-row">${l}${sel(`p-${k}`, POSTURE_LV, cur?.posture?.[k])}</label>`).join('')}</fieldset><fieldset><legend>움직임</legend>${MOVE_ITEMS.map(([k, l]) => `<label class="pa-row">${l}${sel(`m-${k}`, MOVE_LV, cur?.move?.[k])}</label>`).join('')}</fieldset><label class="field">관찰 메모<input name="note" maxlength="300" placeholder="예: 오른쪽 어깨가 약간 높아 보임, 롤다운 편안함"></label><label class="field">다음 관찰(선택)<input name="next" type="date" data-no-when></label><p class="hint">‘교정·치료’ 대신 ‘관찰·정렬 연습’으로 적어 주세요. 통증이 이어지면 전문의 상담을 권해요.</p><div class="actions"><button class="button small" type="submit">관찰 저장</button><button type="button" class="button secondary small" data-coach-assess="">닫기</button></div></form>`:`<button type="button" class="button secondary small" data-coach-assess="${esc(c.id)}">${cur?'새 관찰 기록':'자세 관찰 기록하기'}</button>`}</div>`;
}
export function readAssessment(f){
 return cleanAssessment({date:f.date, note:f.note, next:f.next, posture:Object.fromEntries(POSTURE_ITEMS.map(([k]) => [k, f[`p-${k}`]])), move:Object.fromEntries(MOVE_ITEMS.map(([k]) => [k, f[`m-${k}`]]))});
}

// ---- 수업 전 브리핑(개인) ----
export function briefingHTML(data, c, {today}={}){
 const last = data.sessions.filter(s => (s.targets||[]).some(t => t.clientId===c.id && t.status!=='rejected')).sort((a, b) => String(b.date).localeCompare(String(a.date)))[0];
 const lastMoves = last ? (last.exercises||[]).flatMap(e => e.moves||[]) : [];
 const fb = last ? (last.targets||[]).find(t => t.clientId===c.id)?.feedback : null;
 const pains = lastMoves.filter(m => m.obs==='불편감 있음');
 const tm = taughtMoves(data.sessions, c.id, today);
 const left = c.pt?.total ? Math.max(0, (Number(c.pt.total)||0) - (Number(c.pt.used)||0)) : null;
 if(!last && !c.cautions) return '';
 return `<div class="cd-brief"><small>수업 전 브리핑</small>
 ${c.cautions?`<p class="warn small">주의: ${esc(c.cautions)}</p>`:''}
 ${last?`<p><b>지난 수업 ${esc(String(last.date).slice(5).replace('-','/'))}</b> · ${esc(last.title||'수업')}</p>${lastMoves.length?movesListHTML(lastMoves.slice(0, 8), {cue:false}):''}${last.privateNote?`<p class="hint">내 메모: ${esc(last.privateNote)}</p>`:''}`:''}
 ${pains.length?`<p class="warn small">지난번 불편감: ${esc(pains.map(m => `${m.name}${m.area?.length?`(${m.area.join(', ')})`:''}`).join(', '))}</p>`:''}
 ${fb?.pain?.length?`<p class="warn small">회원이 남긴 불편: ${esc(fb.pain.join(', '))}</p>`:''}
 ${tm.all.length?`<p class="hint">가르친 동작 ${tm.all.length}개${tm.stale.length?` · 4주 넘게 안 한 동작: ${esc(tm.stale.slice(0, 6).map(x => x.name).join(', '))}`:''}</p>`:''}
 ${left!==null?`<p class="hint">남은 ${left}회${c.pt?.expiresAt?` · ${esc(c.pt.expiresAt.slice(5).replace('-','/'))} 만료`:''}</p>`:''}
 ${last?`<button type="button" class="button secondary small" data-cs-from-last="${esc(c.id)}">지난 수업으로 시작</button>`:''}</div>`;
}
