// 4.3.0 수치 리마인드(대표님 요청): 체중·인바디만. 식단·운동은 압박이 될 수 있어 알리지 않는다.
// 기본: 체중 3일 넘게 없으면, 인바디 2주 넘게 없으면(한 번도 없으면 '첫 기록을 기다려요').
// 설정: 끄기 / 다음 날(하루라도 밀리면) / n일.
import {isInbody} from './body-series.js';

const esc = v => String(v??'').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const REMIND_DEFAULT = {weight:3, inbody:14};
export const WEIGHT_OPTIONS = [['off','끄기'], [1,'다음 날(하루라도 밀리면)'], [3,'3일'], [7,'7일'], [14,'14일'], [30,'30일']];
export const INBODY_OPTIONS = [['off','끄기'], [7,'1주'], [14,'2주'], [30,'30일'], [60,'60일'], [90,'90일']];
export function reminderPrefs(db){ const r = db.settings?.reminders || {}; return {weight:r.weight ?? REMIND_DEFAULT.weight, inbody:r.inbody ?? REMIND_DEFAULT.inbody, firstInbody:r.firstInbody ?? true}; }
const dayGap = (a, b) => Math.round((new Date(`${b}T12:00:00`) - new Date(`${a}T12:00:00`))/86400000);

// '다음 날' = 어제 기록이 없으면(마지막 기록이 그저께 이전). n일 = 마지막 기록에서 n일 이상 지남.
export function reminderItems(db, today){
 const p = reminderPrefs(db), out = [], body = (db.body||[]).filter(b => b.date && b.date<=today);
 const weights = body.filter(b => Number(b.weight)>0).map(b => b.date).sort(), lastW = weights.at(-1);
 if(p.weight!=='off' && lastW){
  const gap = dayGap(lastW, today), need = Number(p.weight)===1 ? 2 : Number(p.weight);
  if(gap>=need) out.push({key:`remind:weight:${today}`, kind:'remind', what:'weight', title:`체중을 기록한 지 ${gap}일 지났어요`, sub:'오늘 한 번 재서 남겨 주시면 흐름이 이어져요'});
 }
 const ib = body.filter(isInbody).map(b => b.date).sort(), lastI = ib.at(-1);
 if(p.inbody!=='off'){
  if(lastI){ const gap = dayGap(lastI, today); if(gap>=Number(p.inbody)) out.push({key:`remind:inbody:${today}`, kind:'remind', what:'inbody', title:`인바디를 잰 지 ${gap>=60?`${Math.floor(gap/30)}달`:gap>=14?`${Math.floor(gap/7)}주`:`${gap}일`} 지났어요`, sub:'체성분이 어떻게 바뀌었는지 볼 때가 됐어요'}); }
  // 4.4.1 점검 C-2: 체중을 기록하는 사람에게만, 한 번만(날짜 없는 키) 묻는다.
  else if(p.firstInbody && weights.length) out.push({key:'remind:inbody-first', kind:'remind', what:'inbody', title:'첫 인바디 기록을 기다려요', sub:'결과지를 사진으로 넣거나 숫자만 적어도 돼요'});
 }
 return out;
}

export function reminderSettingsHTML(db){
 const p = reminderPrefs(db);
 const sel = (name, opts, v) => `<select data-remind="${name}" aria-label="${name==='weight'?'체중':'인바디'} 리마인드">${opts.map(([k, l]) => `<option value="${k}" ${String(k)===String(v)?'selected':''}>${l}</option>`).join('')}</select>`;
 return `<section class="section card remind-settings" id="reminder-settings"><h3>기록 리마인드</h3><p class="hint">체중과 인바디만 알려 드려요. 식단·운동은 부담이 될 수 있어 알리지 않아요.</p>
 <label class="field">체중을 이만큼 안 적으면 알려 주기${sel('weight', WEIGHT_OPTIONS, p.weight)}</label>
 <label class="field">인바디를 이만큼 안 재면 알려 주기${sel('inbody', INBODY_OPTIONS, p.inbody)}</label>
 <label class="check-row"><input type="checkbox" data-remind="firstInbody" ${p.firstInbody?'checked':''}> 인바디 기록이 하나도 없을 때 ‘첫 기록을 기다려요’ 알림</label></section>`;
}
export function setReminder(db, name, value){
 const r = {...(db.settings?.reminders||{})};
 r[name] = name==='firstInbody' ? !!value : value==='off' ? 'off' : Number(value);
 return {...db, settings:{...db.settings, reminders:r}};
}
export {esc as _esc};
