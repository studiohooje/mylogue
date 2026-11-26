// 5.4.0 코치로그 3차(대표님 승인 목업 D7·A6·D9·D10): 수강권 카드 · 회차 장부(코치·회원이 같은 장부) · 홀딩 · 회차 리포트 카드.
// 수강권은 기존 c.pt를 넓혀 쓴다(total·used·expiresAt 호환). 장부는 pt.log에 쌓여 연동 문서(links.pt)로 회원에게도 간다.
// 이 파일은 app.js를 import하지 않는다.
const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));
const md = d => d ? `${Number(String(d).slice(5, 7))}/${Number(String(d).slice(8, 10))}` : '';
const hm = iso => { const d = new Date(iso); return Number.isFinite(d.getTime()) ? `${d.getMonth() + 1}/${d.getDate()} ${d.toTimeString().slice(0, 5)}` : ''; };
export const LOG_MAX = 60;
export const FORMATS = ['1:1', '듀엣', '그룹'];
export const DEFAULT_RULE = {noshow: true, late: true, cutoffH: 24};

export function passOf(c){
  const pt = c?.pt || {};
  if(!pt.total && pt.kind!=='period') return null;
  const log = [...(pt.log || []), ...(c.ptLog || []).filter(x => !(pt.log || []).some(y => y.at === x.at))].sort((a, b) => String(a.at).localeCompare(String(b.at))).slice(-LOG_MAX);
  return {kind: pt.kind || 'count', name: pt.name || (pt.kind==='period' ? '기간권' : `PT ${pt.total}회권`), format: pt.format || '1:1', start: pt.start || '', total: Number(pt.total) || 0, used: Number(pt.used) || 0, expiresAt: pt.expiresAt || '', rule: {...DEFAULT_RULE, ...(pt.rule || {})}, holds: pt.holds || [], log, agreedAt: pt.agreedAt || ''};
}
export const passLeft = p => p && p.kind!=='period' ? Math.max(0, p.total - p.used) : null;
export function withLog(pt, entry){ return {...pt, log: [...(pt.log || []), {at: new Date().toISOString(), ...entry}].slice(-LOG_MAX)}; }
// 회차를 쓰고(+used) 장부에 남긴다
export function deduct(pt, entry){ return withLog({...pt, used: (Number(pt.used) || 0) + 1}, {delta: -1, ...entry}); }
export function addDays(ymd, n){ const d = new Date(`${ymd}T12:00:00`); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10); }
export function hold(pt, days, today){
  const n = Math.max(1, Math.min(90, Math.round(Number(days) || 0)));
  const was = pt.expiresAt || '', now = was ? addDays(was, n) : '';
  return withLog({...pt, expiresAt: now || was, holds: [...(pt.holds || []), {from: today, days: n}]}, {kind: 'hold', date: today, delta: 0, note: `홀딩 ${n}일${was ? ` · 만료 ${md(was)} → ${md(now)}` : ''}`});
}
// 예약 취소가 규칙상 차감인지(시작 cutoffH시간 안)
export function lateCancel(rule, startAt, now = new Date()){ const t = new Date(String(startAt)); if(!Number.isFinite(t.getTime())) return false; return rule.late !== false && (t - now) < (Number(rule.cutoffH) || 24) * 3600e3; }

const KIND = {session: '수업', noshow: '노쇼', late: '당일 취소', manual: '직접 고침', hold: '홀딩', restore: '복구'};
export function ledgerHTML(p, {limit = 20} = {}){
  if(!p?.log?.length) return '<p class="hint">아직 장부에 쌓인 회차가 없어요. 수업을 보내 회원이 확정하면 여기에 남아요.</p>';
  let n = 0; const rows = p.log.map(l => { if(l.delta < 0) n += -l.delta; return {...l, n: l.delta < 0 ? n : null}; }).reverse().slice(0, limit);
  return `<div class="cl-led">${rows.map(l => `<div class="cl-li"><span>${l.n ? `<b>${l.n}회차</b> · ` : ''}${esc(md(l.date))} ${esc(KIND[l.kind] || '')}${l.note ? ` · ${esc(l.note)}` : ''}<br><em>${[l.coachAt && `코치 기록 ${hm(l.coachAt)}`, l.memberAt && `회원 ${l.edited ? '고쳐서 ' : ''}확정 ${hm(l.memberAt)}`, !l.coachAt && !l.memberAt && `기록 ${hm(l.at)}`].filter(Boolean).join(' · ')}</em></span><span>${l.delta ? (l.delta > 0 ? `+${l.delta}` : l.delta) : '0'}</span></div>`).join('')}</div>`;
}
export function passCardHTML(p, {who = 'coach', clientId = '', linkId = ''} = {}){
  if(!p) return who === 'coach' ? `<p class="hint">수강권을 만들면 남은 회차·만료·규칙이 회원에게도 같이 보여요.</p>` : '';
  const left = passLeft(p), pct = p.kind==='period' ? periodPct(p) : p.total ? Math.round(p.used / p.total * 100) : 0;
  const rule = `${p.rule.noshow ? '노쇼 1회 차감' : '노쇼 차감 안 함'} · ${p.rule.late ? `${p.rule.cutoffH}시간 안 취소 1회 차감` : '취소 차감 안 함'}`;
  return `<div class="cl-pass"><div class="t"><b>${esc(p.name)} · ${esc(p.format)}</b><span class="cl-pill ${left !== null && left <= 3 ? 'warn' : 'mint'}">${left !== null && left <= 0 ? '다 썼어요' : '사용 중'}</span></div><div class="n">${p.kind==='period' ? `~${esc(md(p.expiresAt)||'')}<small> 까지 · ${p.used}회 참여</small>` : `${left}<small> / ${p.total}회 남음</small>`}</div><div class="cl-bar" aria-hidden="true"><i style="width:${pct}%"></i></div>
  <div class="cl-li" style="border:0;padding:0"><span>${p.start ? `${esc(p.start)} 시작` : ''}</span><span>${p.expiresAt ? `${esc(p.expiresAt)} 만료` : '만료일 없음'}${p.holds.length ? ` · 홀딩 ${p.holds.reduce((a, h) => a + (h.days || 0), 0)}일` : ''}</span></div>
  <p class="hint" style="margin:0">규칙: ${esc(rule)}${p.agreedAt ? ` · 회원 확인 ${esc(md(String(p.agreedAt).slice(0, 10)))}` : who === 'coach' ? ' · 회원 확인 전' : ''}</p>
  ${who === 'coach' ? `<div class="cl-btns cl-btns2"><button type="button" class="cl-ghost" data-coach-hold="${esc(clientId)}">일시정지(홀딩)</button><button type="button" class="cl-ghost" data-coach-pass-edit="${esc(clientId)}">수강권 고치기</button></div>` : (!p.agreedAt && linkId ? `<button type="button" class="cl-go" data-mc-pass-agree="${esc(linkId)}">규칙 확인했어요</button>` : '')}</div>`;
}
const periodPct = p => { const a = Date.parse(p.start), b = Date.parse(p.expiresAt); if(!a || !b || b <= a) return 0; return Math.max(0, Math.min(100, Math.round((Date.now() - a) / (b - a) * 100))); };
export const addMonths = (ymd, n) => { const d = new Date(`${ymd}T12:00:00`); d.setMonth(d.getMonth() + n); return d.toISOString().slice(0, 10); };
// 5.4.2 대표님: 수강권 만들기를 운동·식단 입력처럼 컴팩트한 창으로(칩 위주, 저장 전 카드 미리보기). 결제 금액은 선택·코치만.
export function passFormHTML(c, {today = new Date().toISOString().slice(0, 10), showPrice = true} = {}){
  const p = passOf(c), was = c.pt || {}, kind = p?.kind || 'count', total = p?.total || 20, fmt = p?.format || '1:1', rule = p?.rule || DEFAULT_RULE;
  const r = (name, v, l, on) => `<label class="ck-chip"><input type="radio" name="${name}" value="${esc(v)}" ${on ? 'checked' : ''}><span>${l}</span></label>`;
  const seg = (name, opts, cur) => `<div class="ck-seg">${opts.map(([v, l]) => `<label><input type="radio" name="${name}" value="${esc(v)}" ${String(cur) === String(v) ? 'checked' : ''}><span>${l}</span></label>`).join('')}</div>`;
  const preset = [10, 20, 30, 50].includes(total) ? String(total) : 'x';
  return `<form id="coach-pt-form" class="cs-form" data-client="${esc(c.id)}" data-today="${esc(today)}">
  <div class="cs-step"><b>종류</b>${seg('pkind', [['count', '횟수권'], ['period', '기간권']], kind)}</div>
  <div class="cs-step cs-count"><b>회차</b><div class="ck-chips">${[10, 20, 30, 50].map(n => r('ptotal', n, n, preset === String(n))).join('')}${r('ptotal', 'x', '직접', preset === 'x')}</div><input name="totalX" type="number" inputmode="numeric" min="1" max="500" value="${preset === 'x' ? esc(total) : ''}" placeholder="회차 직접" class="cs-x"></div>
  <div class="cs-step"><b>형태</b>${seg('format', FORMATS.map(f => [f, f]), fmt)}</div>
  <div class="cs-step"><b>기간 <small>${p?.start ? `${esc(p.start)} 시작` : '오늘 시작'}</small></b><div class="ck-chips">${[[1, '1개월'], [3, '3개월'], [6, '6개월']].map(([m, l]) => r('months', m, l, !p && m === 3)).join('')}${r('months', 'x', '직접', !!p)}</div><input name="expiresAt" type="date" data-no-when value="${esc(p?.expiresAt || '')}" class="cs-x"></div>
  ${p ? `<label class="cs-step"><b>사용한 회차 <small>바꾸면 장부에 '직접 고침'으로 남아요</small></b><input name="used" type="number" inputmode="numeric" min="0" max="500" value="${esc(p.used)}"></label>` : ''}
  ${showPrice ? `<label class="cs-step"><b>결제 금액 <small>선택 · 코치님만 봐요</small></b><div class="cs-price"><input name="price" type="number" inputmode="numeric" min="0" step="1000" value="${esc(c.passPrice || '')}" placeholder="예: 1650000"><span class="cs-per" data-cs-per></span></div></label>` : ''}
  <div class="cs-step"><b>규칙 <small>회원도 보고 '확인했어요'를 눌러요</small></b>
   <label class="ck-sw"><input type="checkbox" name="noshow" ${rule.noshow ? 'checked' : ''}><span><b>노쇼면 1회 차감</b></span><i aria-hidden="true"></i></label>
   <label class="ck-sw"><input type="checkbox" name="late" ${rule.late ? 'checked' : ''}><span><b>시작 몇 시간 안 취소면 1회 차감</b></span><i aria-hidden="true"></i></label>
   <div class="ck-chips">${[12, 24, 48].map(h => r('cutoffH', h, `${h}시간`, Number(rule.cutoffH) === h)).join('')}</div></div>
  <div class="cs-step"><b>미리보기</b><div data-cs-preview>${passPreviewHTML({kind, total, format: fmt, start: p?.start || today, expiresAt: p?.expiresAt || addMonths(today, 3), rule, used: p?.used || 0, name: was.name})}</div></div>
  <button class="cs-go" type="submit">${p ? '수강권 저장' : '수강권 만들기'}</button></form>`;
}
export function passPreviewHTML(v){
  const name = v.name || (v.kind === 'period' ? '기간권' : `PT ${v.total}회권`), left = v.kind === 'period' ? null : Math.max(0, v.total - (v.used || 0));
  return `<div class="cl-pass"><div class="t"><b>${esc(name)} · ${esc(v.format)}</b><span class="cl-pill mint">미리보기</span></div><div class="n">${left === null ? `~${esc(md(v.expiresAt))}<small> 까지</small>` : `${left}<small> / ${v.total}회</small>`}</div><div class="cl-bar" aria-hidden="true"><i style="width:${left === null ? 2 : Math.round((v.used || 0) / Math.max(1, v.total) * 100)}%"></i></div><small class="hint" style="margin:0">${esc(v.start)} 시작 · ${esc(v.expiresAt || '만료 없음')} 만료 · ${v.rule.noshow ? '노쇼 1회 차감' : '노쇼 차감 없음'} · ${v.rule.late ? `${v.rule.cutoffH}시간 안 취소 1회 차감` : '취소 차감 없음'}</small></div>`;
}
// 시트의 값 → 수강권(미리보기·저장 공용)
export function readPassForm(form){
  const e = form.elements, today = form.dataset.today || new Date().toISOString().slice(0, 10), v = n => e[n]?.value ?? '';
  const kind = v('pkind') || 'count', tp = v('ptotal'), total = kind === 'period' ? 0 : Math.max(1, Math.min(500, Number(tp === 'x' ? v('totalX') : tp) || 0));
  const mo = v('months'), start = today, expiresAt = mo && mo !== 'x' ? addMonths(start, Number(mo)) : v('expiresAt');
  return {kind, total, format: v('format') || '1:1', start, expiresAt, rule: {noshow: !!e.noshow?.checked, late: !!e.late?.checked, cutoffH: Number(v('cutoffH')) || 24}, used: e.used ? Math.max(0, Number(v('used')) || 0) : undefined, price: Number(v('price')) || null};
}
export function holdFormHTML(c){ return `<form id="coach-hold-form" class="cd-pt" data-client="${esc(c.id)}"><small>일시정지(홀딩)</small><div class="cd-pt-row"><label>며칠<input name="days" type="number" min="1" max="90" value="7"></label><button class="button small" type="submit">홀딩</button><button type="button" class="text-button" data-coach-hold="">닫기</button></div><p class="hint">만료일이 그만큼 뒤로 가고 장부에 남아요.</p></form>`; }

// ---------- D9 회차 리포트 ----------
export function reportOf(data, c, link, today){
  const p = passOf(c), mine = (data.sessions || []).filter(s => (s.targets || []).some(t => t.clientId === c.id && ['confirmed', 'edited', 'sent', 'queued'].includes(t.status))).sort((a, b) => String(a.date).localeCompare(String(b.date)));
  const counts = new Map(); for(const s of mine) for(const e of s.exercises || []) if(e.kind !== 'cardio') counts.set(e.name, (counts.get(e.name) || 0) + 1);
  const top = [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] || '';
  const best = s => Math.max(0, ...((s.exercises || []).filter(e => e.name === top).flatMap(e => (e.sets || []).filter(x => x.type !== '웜업').map(x => Number(x.weight) || 0))));
  const withTop = mine.filter(s => best(s) > 0), first = withTop[0] ? best(withTop[0]) : null, last = withTop.length ? best(withTop.at(-1)) : null;
  const w = link?.scope?.body ? link?.shared?.weights || [] : [];
  return {name: c.name, passName: p?.name || '', used: p?.used ?? mine.length, total: p?.total || null, sessions: mine.length, attended: mine.filter(s => (s.targets || []).some(t => t.clientId === c.id && (t.status === 'confirmed' || t.status === 'edited'))).length, top, first, last, weight: w.length > 1 ? Math.round((w.at(-1) - w[0]) * 10) / 10 : null, date: today};
}
export function reportHTML(r, note = ''){
  const lift = r.top && r.first != null ? `${r.first} → ${r.last}kg` : '—';
  return `<div class="cl-rep" id="cl-report"><span class="cl-tag">MYLOGUE · COACH REPORT</span><b style="font-size:20px">${esc(r.name)} 님의 ${r.used}회${r.total ? ` / ${r.total}회` : ''}</b>
  <div class="big"><div><small>수업 확정</small><b>${r.attended}/${r.sessions}</b></div><div><small>${esc(r.top || '대표 종목')}</small><b>${esc(lift)}</b></div>${r.weight != null ? `<div><small>체중 변화</small><b>${r.weight > 0 ? '+' : ''}${r.weight}kg</b></div>` : ''}</div>
  <label class="field">코치 한마디<textarea id="cl-rep-note" rows="3" maxlength="200" placeholder="예: 무릎이 불편했던 시작에서 스쿼트 55kg까지 왔어요. 남은 회차는 힙힌지로 균형을 잡아요.">${esc(note)}</textarea></label>
  <small class="hint" style="margin:0">체중은 회원이 수치 공유를 켠 기간만 들어가요.</small></div>`;
}
export function reportText(r, note = ''){ return `[${r.name} 님 회차 리포트] ${r.used}회${r.total ? `/${r.total}회` : ''}\n수업 확정 ${r.attended}/${r.sessions}${r.top && r.first != null ? `\n${r.top} ${r.first} → ${r.last}kg` : ''}${r.weight != null ? `\n체중 ${r.weight > 0 ? '+' : ''}${r.weight}kg` : ''}${note ? `\n코치 한마디: ${note}` : ''}`; }
export function drawReport(r, note = ''){
  const c = document.createElement('canvas'); c.width = 1080; c.height = 1350; const x = c.getContext('2d');
  const g = x.createLinearGradient(0, 0, 1080, 1350); g.addColorStop(0, '#1d2a44'); g.addColorStop(1, '#101625'); x.fillStyle = g; x.fillRect(0, 0, 1080, 1350);
  x.fillStyle = 'rgba(140,228,224,.16)'; x.beginPath(); x.arc(900, 200, 320, 0, Math.PI * 2); x.fill();
  const font = (s, w = 700) => `${w} ${s}px MylogueSUIT, 'Malgun Gothic', sans-serif`;
  x.textAlign = 'left'; x.fillStyle = '#b8aaf2'; x.font = font(34); x.fillText('MYLOGUE · COACH REPORT', 90, 150);
  x.fillStyle = '#edf4f8'; x.font = font(64); x.fillText(`${r.name} 님의 ${r.used}회`, 90, 250);
  const box = (i, label, val) => { const bx = 90 + (i % 2) * 460, by = 330 + Math.floor(i / 2) * 230; x.fillStyle = 'rgba(255,255,255,.06)'; x.fillRect(bx, by, 430, 200); x.fillStyle = '#a9bbce'; x.font = font(34, 600); x.fillText(label, bx + 30, by + 60); x.fillStyle = '#8ce4e0'; x.font = font(62); x.fillText(val, bx + 30, by + 150); };
  box(0, '수업 확정', `${r.attended}/${r.sessions}`); box(1, r.top || '대표 종목', r.top && r.first != null ? `${r.first}→${r.last}kg` : '—'); if(r.weight != null) box(2, '체중 변화', `${r.weight > 0 ? '+' : ''}${r.weight}kg`);
  if(note){ x.fillStyle = '#edf4f8'; x.font = font(40, 500); let line = '', y = 900; for(const ch of note){ if(x.measureText(line + ch).width > 880){ x.fillText(line, 90, y); line = ''; y += 60; } line += ch; } x.fillText(line, 90, y); }
  x.fillStyle = '#7f93ab'; x.font = font(32, 400); x.fillText('기록은 회원의 것 — 마이로그 코치로그', 90, 1260);
  return c;
}
