// 2026-11-27 일정 1단계: 일정 넣기·고치기·지우기, 요일별 운동 계획 고치기
import {$s, $f} from './app-state.js';
import {cleanEvent, schedOf, withSched, kindOf, addDays, suggestWeekPlan, weekTitle} from './schedule-plan.js';

function readForm(){ const f = document.getElementById('sched-form'), st = $s.schedAdd; if(!f || !st) return; for(const k of ['title', 'time', 'note']){ const el = f.querySelector(`[name="${k}"]`); if(el) st[k] = el.value; } }
export function schedClick(t){
  const d = t.dataset || {};
  if(d.schedToday !== undefined){ $s.selectedDate = $f.today(); $f.render(); return true; }
  if(d.schedAdd !== undefined){ $s.schedAdd = {date: d.schedAdd || $s.selectedDate}; $s.modal = 'sched-add'; $f.render(); return true; }
  if(d.schedGlp !== undefined){ $s.schedAdd = {date: $f.today(), kind: 'med', title: 'GLP-1 주사', repeat: 'week', color: kindOf('med').color}; $s.modal = 'sched-add'; $f.render(); return true; }
  if(d.schedEv){ const e = schedOf($s.db).events.find(x => x.id === d.schedEv); if(!e) return true; $s.schedAdd = {...e}; $s.modal = 'sched-add'; $f.render(); return true; }
  if(d.schedKind && $s.schedAdd){ const k = kindOf(d.schedKind); $s.schedAdd = {...$s.schedAdd, kind: k.k, color: k.color}; $f.render(); return true; }
  if(d.schedSet && $s.schedAdd){ readForm(); const [k, ...v] = d.schedSet.split(':'), val = v.join(':'); $s.schedAdd[k] = k === 'alcohol' ? val === 'yes' : k === 'repeat' ? (val === '매주' ? 'week' : 'none') : val; $f.render(); return true; }
  if(d.schedPart && $s.schedAdd){ readForm(); const ps = new Set($s.schedAdd.parts || []); ps.has(d.schedPart) ? ps.delete(d.schedPart) : ps.add(d.schedPart); $s.schedAdd.parts = [...ps]; $f.render(); return true; }
  if(d.schedDay && $s.schedAdd){ readForm(); $s.schedAdd.date = addDays($s.schedAdd.date, Number(d.schedDay)); $f.render(); return true; }
  if(d.schedDel){ const before = schedOf($s.db).events; $s.db = $f.save(withSched($s.db, {events: before.filter(e => e.id !== d.schedDel)})); $s.modal = null; $s.schedAdd = null; $f.render(); $f.toastUndo('일정을 지웠어요.', () => { $s.db = $f.save(withSched($s.db, {events: before})); $f.render(); }); return true; }
  if(d.schedWeek !== undefined){ const wp = schedOf($s.db).weekPlan; $s.schedWeek = Object.keys(wp).length ? JSON.parse(JSON.stringify(wp)) : suggestWeekPlan($s.db, $f.today()); $s.modal = 'sched-week'; $f.render(); return true; }
  if(d.weekPart && $s.schedWeek){ const [wd, part] = d.weekPart.split(':'), p = $s.schedWeek[wd] || {parts: []}, ps = new Set(p.rest ? [] : p.parts || []); ps.has(part) ? ps.delete(part) : ps.add(part); $s.schedWeek[wd] = ps.size ? {parts: [...ps], title: [...ps].join('·')} : {}; $f.render(); return true; }
  if(d.weekRest && $s.schedWeek){ const wd = d.weekRest; $s.schedWeek[wd] = $s.schedWeek[wd]?.rest ? {} : {rest: true, title: '휴식'}; $f.render(); return true; }
  if(d.weekClear !== undefined && $s.schedWeek){ $s.schedWeek = {}; $f.render(); return true; }
  if(d.weekSave !== undefined && $s.schedWeek){ const wp = {}; for(const [k, v] of Object.entries($s.schedWeek)) if(v && (v.rest || (v.parts || []).length)) wp[k] = {...v, title: weekTitle(v)}; $s.db = $f.save(withSched($s.db, {weekPlan: wp})); $s.modal = null; $s.schedWeek = null; $f.render(); $f.toast('요일별 운동 계획을 저장했어요.'); return true; }
  return false;
}
export function schedSubmit(form){
  if(form.id !== 'sched-form') return false;
  readForm(); const st = $s.schedAdd || {};
  const ev = cleanEvent({...st, date: form.querySelector('[name="date"]')?.value || st.date, kind: st.kind});
  const list = schedOf($s.db).events;
  $s.db = $f.save(withSched($s.db, {events: list.some(e => e.id === ev.id) ? list.map(e => e.id === ev.id ? ev : e) : [...list, ev]}));
  $s.modal = null; $s.schedAdd = null; $s.selectedDate = ev.date; $f.render(); $f.toast(`${ev.title} 일정을 넣었어요.`);
  return true;
}
