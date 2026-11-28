// 2026-11-27 대표님(운동 페이지 2안, 식단 페이지와 같은 틀): 고른 날짜의 운동만 —
// ① 오늘 운동 요약 카드(세트·부위·이번 주 운동한 날·쉬어 가기 안내) ② 운동 흐름(주마다 부위별 세트) ③ 한 운동(식단 '먹은 것'처럼 한 줄, 누르면 세트가 그 자리에서 펼쳐짐).
// 이 파일은 app.js를 import하지 않는다.
import {workoutTotals} from './domain.js';
import {workoutTitle} from './timeline-view.js';
import {workoutMenuHTML} from './workout-menu.js';
import {setsByPart} from './workout-name.js';
import {weekMoves, overreachNote} from './workout-story.js';
import {weeks} from './workout-flow.js';
import {partOf} from './body-part.js';
import {machineTagHTML} from './machine-tag.js';

const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));
export const PART_COLORS = {'가슴': '#ff7b93', '등': '#8ce4e0', '하체': '#f0d466', '어깨': '#b8aaf2', '이두': '#6fd6a3', '삼두': '#58a6ff', '복근': '#f2b49b', '전신': '#9cc8ed', '기타': '#5b6b85'};
const n0 = v => Number.isFinite(+v) ? String(Math.round(+v * 10) / 10) : '';
const md = d => `${+d.slice(5, 7)}/${+d.slice(8, 10)}`;
const hm = s => String(s?.completedAt || '').slice(11, 16);
const doneSets = e => (e.sets || []).filter(s => s.completed !== false);
const real = w => !w.planned && !w.rest && !w.recalled;
const perHand = e => e.weightBasis === 'per-hand' && e.handCount === 2;
// 세트 무게 표시용 단위(무게 옆에 붙임): kg·lb·단계
const unitOf = s => s?.unit === 'level' ? '단계' : s?.unit === 'lb' ? 'lb' : 'kg';
const topSet = (e, one = null) => doneSets(e).filter(s => one == null || (s.side === 'single') === one).reduce((b, s) => (+s.weight || 0) > (+b?.weight || 0) ? s : b, null);

// 같은 종목의 지난 기록과 비교한 칭찬 한 줄(점수 없이 — 늘었다·처음 해 봤다·지난번처럼)
export function exerciseNote(db, date, e){
 const key = e.exerciseId || e.name, top = topSet(e);
 const prev = (db.workouts || []).filter(w => real(w) && w.date < date).sort((a, b) => b.date.localeCompare(a.date));
 const same = x => (x.exerciseId || x.name) === key;
 const last = prev.find(w => (w.exercises || []).some(same));
 if(!last) return {k: 'new', t: '처음 해 본 운동'};
 if(e.machineId && !prev.some(w => (w.exercises || []).some(x => same(x) && x.machineId === e.machineId))) return {k: 'new', t: '처음 해 본 머신'};
 /* 2026-11-27 양쪽 함께·한쪽씩은 따로 비교: 같은 방식으로 한 가장 최근 기록과 */const one = top?.side === 'single', lastM = prev.find(w => (w.exercises || []).some(x => same(x) && topSet(x, one)));
 if(top && !lastM) return {k: 'new', t: one ? '한쪽씩 첫 기록' : '양쪽 함께 첫 기록'};
 const pe = lastM ? lastM.exercises.find(x => same(x) && topSet(x, one)) : null, pt = pe ? topSet(pe, one) : null;
 if(!top || !pt || unitOf(top) !== unitOf(pt) || (pe.machineId || '') !== (e.machineId || '')) return null;
 const a = +pt.weight || 0, b = +top.weight || 0, u = unitOf(top);
 if(b > a) return {k: 'up', t: `최고 무게 ${n0(a)} → ${n0(b)}${u}`};
 if(b === a && b > 0){
  const reps = x => Math.max(0, ...doneSets(x).filter(s => +s.weight === b && (s.side === 'single') === one).map(s => +s.reps || 0));
  if(reps(e) > reps(pe)) return {k: 'up', t: `같은 무게로 ${reps(pe)} → ${reps(e)}회`};
  return {k: 'same', t: `지난번(${md(lastM.date)})처럼 ${n0(b)}${u}까지`};
 }
 return null;
}

function weekBlock(db, date, goal){
 const w = weekMoves(db, date), g = Math.max(1, goal | 0);
 const dots = Array.from({length: 7}, (_, i) => { const d = new Date(`${w.mon}T12:00:00`); d.setDate(d.getDate() + i); const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; return `<i class="${w.days.has(k) ? 'on' : ''}${k === date ? ' today' : ''}" title="${k}">${'월화수목금토일'[i]}</i>`; }).join('');
 return `<div class="wd-week"><span>이번 주 ${w.count}일 · 목표 ${g}일</span><span class="wd-dots" role="img" aria-label="이번 주 운동한 날 ${w.count}일, 목표 ${g}일">${dots}</span><button type="button" class="text-button wd-goal" data-week-goal>목표 바꾸기</button></div>`;
}

// 2026-11-27 대표님(내 기록 기준 세트 색): 같은 종목·기구·방식(한쪽씩 여부)의 그날 이전 최고 추정무게(무게×(1+횟수/30)) 대비
// <75% · <90% · <100% · 이상 4단계, 넘으면 '새 최고'(pr). 지난 기록이 없으면 그날 세트끼리. 지난 날은 그날 기준으로 고정(그날 이전 기록만 봄)
const e1 = s => (+s.weight || 0) * (1 + (+s.reps || 0) / 30);
export function setLevels(db, date, e){
 const ss = doneSets(e), one = ss[0]?.side === 'single', key = x => `${x.exerciseId || x.name}|${x.machineId || ''}`;
 let base = 0;
 for(const w of db.workouts || []) if(real(w) && w.date < date) for(const x of w.exercises || []) if(key(x) === key(e)) for(const s of doneSets(x)) if((s.side === 'single') === one) base = Math.max(base, e1(s));
 const ref = base || Math.max(1, ...ss.map(e1));
 return ss.map(s => { const v = e1(s), r = v / ref; return base && v > base ? 'pr' : r < .75 ? 'lv1' : r < .9 ? 'lv2' : r < 1 ? 'lv3' : 'lv4'; });
}
// 세트 기둥(B-1): 위에 무게(단위 붙여), 막대 높이 = 무게, 아래 ×횟수. 앞 세트보다 오르면 민트
function setCols(e, lv = []){
 const ss = doneSets(e), mx = Math.max(1, ...ss.map(s => +s.weight || 0));
 return `<div class="wd-cols">${ss.map((s, i) => { const w = +s.weight || 0, up = i > 0 && w > (+ss[i - 1].weight || 0), u = unitOf(s); return `<div class="wd-sc${up ? ' up' : ''}${w === 0 ? ' z' : ''}"><b>${n0(w)}<small>${u}</small></b><i class="${lv[i] || ''}" style="height:${Math.max(6, Math.round(w / mx * 30))}px"></i><span>×${s.reps ?? '-'}${s.side === 'single' ? '<em>한쪽</em>' : ''}</span></div>`; }).join('')}</div>`;
}

export function exerciseRowHTML(db, date, w, e, i, {open = false, machine = null} = {}){
 const id = `${w.id}#${i}`, ss = doneSets(e), part = partOf(e) || '기타', col = PART_COLORS[part] || PART_COLORS['기타'];
 const top = topSet(e), u = top ? unitOf(top) : 'kg', one = ss.some(s => s.side === 'single'), lv = e.kind === 'cardio' ? [] : setLevels(db, date, e);
 const topText = e.kind === 'cardio' ? `${n0(e.durationMin || 0)}<small>분</small>` : top && +top.weight ? `${n0(top.weight)}<small>${u}${perHand(e) ? '씩' : ''}</small>` : `${ss.length}<small>세트</small>`;
 const note = open ? exerciseNote(db, date, e) : null;
 return `<article class="wd-ex${open ? ' open' : ''}"><button type="button" class="wd-line" data-wp-open="${esc(id)}" aria-expanded="${open}"><span class="wd-tm"><b>${esc(hm(ss[0]) || '')}</b><small>${esc(part)}</small></span><span class="wd-nm"><b>${esc(e.name)}${one ? '<span class="side">한쪽씩</span>' : ''}</b><span class="wd-sb" aria-hidden="true">${ss.map((s, j) => `<i class="${lv[j] || 'lv3'}" style="background:${col}"></i>`).join('')}</span></span><span class="wd-top">${topText}</span><span class="wd-chev" aria-hidden="true">${open ? '⌃' : '›'}</span></button>${open ? `<div class="wd-body"><div class="wd-bh"><span class="wd-tag">${machine ? machineTagHTML(machine) : ''}${perHand(e) ? '<small>한쪽 무게 · 양쪽 합은 ×2</small>' : ''}</span><button type="button" class="button secondary small" data-qw="${esc(w.id)}">종목 수정</button></div>${e.kind === 'cardio' ? '' : setCols(e, lv)}${note ? `<span class="wd-nt ${note.k}">${note.k === 'up' ? '▲' : note.k === 'new' ? '✦' : '✓'} ${esc(note.t)}</span>` : ''}</div>` : ''}</article>`;
}

// 고른 날짜의 운동(요약 + 한 운동). 예정·휴식·기억만 적은 날도 같은 자리에.
export function workoutDayHTML(db, date, {today = date, goal = 3, open = '', weight = null, burn = () => null, findMachine = () => null} = {}){
 const all = (db.workouts || []).filter(w => w.date === date), ws = all.filter(real);
 const head = date === today ? '오늘 운동' : `${md(date)} 운동`;
 const extra = all.filter(w => !real(w)).map(w => w.rest ? `<article class="wd-misc rest"><b>🌙 의도적 휴식</b><button type="button" class="text-button" data-delete="workouts:${esc(w.id)}">지우기</button></article>` : `<article class="wd-misc${w.planned ? ' planned' : ''}"><div><b>${w.planned ? '<span class="plan-badge">예정</span> ' : ''}${esc(workoutTitle(w))}</b>${w.recalled ? '<small>기억나는 만큼 적은 운동</small>' : ''}</div>${workoutMenuHTML(w, db)}</article>`).join('');
 if(!ws.length) return `<div class="wd-title"><h3>${head}</h3></div>${extra || `<section class="wd-card wd-empty"><p class="hint">이 날은 운동 기록이 없어요. ‘＋ 운동’이나 일정에서 예정을 넣을 수 있어요.</p>${weekBlock(db, date, goal)}</section>`}`;
 const exs = ws.flatMap(w => (w.exercises || []).map((e, i) => ({w, e, i}))).filter(x => doneSets(x.e).length || x.e.kind === 'cardio');
 exs.sort((a, b) => (hm(doneSets(a.e)[0]) || '99').localeCompare(hm(doneSets(b.e)[0]) || '99'));
 const tot = ws.map(workoutTotals).reduce((a, t) => ({sets: a.sets + t.sets, volume: a.volume + t.volume}), {sets: 0, volume: 0});
 const times = exs.flatMap(x => doneSets(x.e).map(hm)).filter(Boolean).sort();
 const mins = times.length > 1 ? (+times.at(-1).slice(0, 2) * 60 + +times.at(-1).slice(3)) - (+times[0].slice(0, 2) * 60 + +times[0].slice(3)) : 0;
 const kcal = ws.map(w => burn(w, weight)?.kcal).filter(v => v != null).reduce((a, b) => a + b, null);
 const parts = setsByPart(ws.flatMap(w => w.exercises || []));
 const line = [`${exs.length}종목`, tot.volume ? `볼륨 ${n0(tot.volume / 1000)}t` : '', times.length ? `${times[0]}–${times.at(-1)}${mins ? `(${mins}분)` : ''}` : '', kcal != null ? `약 ${Math.round(kcal)}kcal` : ''].filter(Boolean).join(' · ');
 const tip = date === today ? overreachNote(db, date) : '', [tipB, ...tipR] = tip.split('. ');
 const title = [...new Set(ws.map(workoutTitle))].join(' + '), gym = [...new Set(ws.map(w => w.gymName).filter(Boolean))].join(' · ');
 return `<div class="wd-title"><h3>${head}<span class="wd-parts">${esc(title)}</span></h3><span class="wd-tr">${gym ? `<small>${esc(gym)}</small>` : ''}${ws.map(w => workoutMenuHTML(w, db)).join('')}</span></div>
<section class="wd-card wd-sum"><div class="wd-sum-top"><div><div class="wd-big">${tot.sets}<span>세트</span></div><small>${esc(line)}</small></div>${weekBlock(db, date, goal)}</div>
${parts.length ? `<div class="wd-rows">${parts.map(([p, n]) => `<span class="lb"><i style="background:${PART_COLORS[p] || PART_COLORS['기타']}"></i>${esc(p)}</span><span class="bar"><b style="width:${Math.round(n / Math.max(1, tot.sets) * 100)}%;background:${PART_COLORS[p] || PART_COLORS['기타']}"></b></span><span class="val">${n}<small>세트</small></span>`).join('')}</div>` : ''}
${tip ? `<p class="wd-tip" role="note"><b>${esc(tipB)}</b>${tipR.length ? `<small>${esc(tipR.join('. '))}</small>` : ''}</p>` : ''}</section>
${extra}
${workoutFlowRowsHTML(db, date)}
<div class="wd-title"><h3>종목<i class="i-tip" tabindex="0" title="막대·기둥이 진할수록 같은 종목·기구·방식의 내 지난 최고에 가까운 세트예요. 보라색이면 새 최고. 오른쪽 숫자는 그날 가장 무거운 무게.">ⓘ</i></h3></div>
<div class="wd-list">${exs.map(({w, e, i}) => exerciseRowHTML(db, date, w, e, i, {open: open === `${w.id}#${i}`, machine: open === `${w.id}#${i}` && e.machineId ? findMachine(e.machineId) : null})).join('')}</div>`;
}

// 운동 흐름: 기록이 있는 주만(최근 4주까지), 주마다 한 줄 — 부위별 세트 가로 막대, 칸 안엔 숫자
export function workoutFlowRowsHTML(db, date){
 const ws = weeks(db, date, 8).filter(w => w.sets > 0).slice(-4).reverse();
 if(!ws.length) return '';
 const mx = Math.max(...ws.map(w => w.sets)), thisK = weeks(db, date, 1)[0].k, label = w => { const n = Math.round((new Date(`${thisK}T12:00:00`) - new Date(`${w.k}T12:00:00`)) / 604800000); return n <= 0 ? '이번 주' : `${n}주 전`; }; /* 2026-11-27 대표님: '11/16 주' 대신 지난주·2주 전 */
 const used = new Set(ws.flatMap(w => Object.keys(w.parts)));
 const end = k => { const d = new Date(`${k}T12:00:00`); d.setDate(d.getDate() + 6); return `${d.getMonth() + 1}/${d.getDate()}`; };
 return `<div class="wd-title"><h3>운동 흐름</h3><small>주마다 부위별 세트</small></div>
<section class="wd-card"><div class="wd-wk">${ws.map(w => `<div class="wd-wl"><b>${label(w)} ${w.sets}세트</b><small>${md(w.k)}–${end(w.k)} · ${w.days}일${w.volume ? ` · ${n0(w.volume / 1000)}t` : ''}</small></div><div class="wd-bar" style="width:${Math.max(12, Math.round(w.sets / mx * 100))}%">${Object.entries(w.parts).sort((a, b) => b[1] - a[1]).map(([p, v]) => `<span style="flex:${v};background:${PART_COLORS[p] || PART_COLORS['기타']}" title="${esc(p)} ${v}세트">${v}</span>`).join('')}</div>`).join('')}</div>
<div class="wd-legend">${Object.keys(PART_COLORS).filter(p => used.has(p)).map(p => `<span><i style="background:${PART_COLORS[p]}"></i>${p}</span>`).join('')}</div></section>`;
}
