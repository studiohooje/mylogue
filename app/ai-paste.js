// 3.16.0 AI 입력(붙여넣기): ChatGPT·Gemini·Claude 등 어떤 AI든 아래 지시문을 한 번 주면, 말로 한 기록을 '마이로그 코드'로 답한다.
// 사용자는 그 답을 복사(또는 Android 공유)해 마이로그 'AI 입력'에 붙여넣고, 초안은 AI 검토함으로 간다(확정은 사람이).
// 해석은 너그럽게: 코드 블록·앞뒤 설명·둥근 따옴표·끝 쉼표·한글 키 이름을 받아 준다. 값을 지어내지 않고 모르는 값은 비운다.
import {cleanMeal, cleanWorkout, cleanBody} from './domain.js';
import {findExercise} from './catalog.js';
import {GENERIC_MACHINES, BUILTIN_BRANDS} from './machines-catalog.js';

export const AI_PROMPT = `너는 내 건강 기록 앱 '마이로그'의 기록 도우미야. 이 대화에서 내가 먹은 것, 운동한 것, 체중·인바디를 말하면 아래 형식의 '마이로그 코드'를 코드 블록 하나로 답해 줘. 코드 블록 밖에는 한두 줄 요약만 써.

규칙
- 날짜를 말하지 않으면 오늘, 시각을 말하지 않으면 지금 시각으로 해. 날짜는 YYYY-MM-DD, 시각은 HH:MM.
- 음식은 하나씩 나눠 적어(밥과 반찬을 한 줄로 뭉치지 마). 양(qty)과 단위(unit)를 꼭 넣어.
- 칼로리(kcal)·탄수화물(carbs)·단백질(protein)·지방(fat)은 g 기준 숫자. 내가 말한 숫자나 제품 표기가 있으면 그걸 쓰고, 없으면 일반적인 1인분 기준으로 추정하고 "estimate"에 범위와 근거를 적어.
- 모르는 값은 지어내지 말고 null.
- 이 대화에서 전에 적은 음식이 다시 나오면 전에 쓴 이름·단위·값을 그대로 다시 써(같은 음식이 여러 이름으로 늘어나지 않게). 내가 값을 고쳐 달라고 하면 고친 값을 써.
- 운동은 세트마다 무게(weight)·단위(unit: kg 또는 lb)·횟수(reps). "3세트 10회 60kg"처럼 말하면 같은 세트 3개로 풀어 적어. 맨몸이면 weight는 0.
- 머신을 말하면 "machine"에 내가 말한 이름 그대로 적어(예: "45도 레그프레스", "해머 로우").
- 유산소는 "minutes"(분)·"km".
- 하나의 답에 여러 기록(식사+운동+체중)을 함께 넣어도 돼.

형식
\`\`\`json
{"mylogue":1,"said":"내가 한 말 원문","records":[
 {"type":"meal","date":"2026-11-21","time":"12:30","slot":"점심","items":[
  {"name":"제육덮밥","qty":1,"unit":"그릇","kcal":850,"carbs":105,"protein":35,"fat":28,"estimate":{"kcal":[700,1000],"basis":"식당 1인분 기준 추정"}}
 ]},
 {"type":"workout","date":"2026-11-21","time":"19:00","title":"하체","exercises":[
  {"name":"레그 프레스","machine":"45도 레그프레스","sets":[{"weight":100,"unit":"kg","reps":12}]},
  {"name":"러닝머신","minutes":20,"km":3}
 ]},
 {"type":"body","date":"2026-11-21","weight":72.4,"bodyFat":18.5,"muscle":33.2}
]}
\`\`\``;

const today = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; };
const nowHM = () => { const d = new Date(); return `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`; };
const num = v => { if(v==null || v==='') return null; const n = Number(String(v).replace(/,/g,'').replace(/[^\d.\-]/g,'')); return Number.isFinite(n) ? n : null; };
const pick = (o, ...keys) => { for(const k of keys) if(o && o[k]!=null && o[k]!=='') return o[k]; return undefined; };
const norm = t => String(t||'').normalize('NFKC').toLocaleLowerCase('ko').replace(/[\s·()\-_/.,°도]/g,'');
const dateOk = v => /^\d{4}-\d{2}-\d{2}$/.test(String(v||''));
const timeOk = v => /^\d{1,2}:\d{2}$/.test(String(v||''));
const hm = v => timeOk(v) ? String(v).padStart(5,'0') : null;

// 붙여넣은 글에서 마이로그 코드(JSON)를 찾아낸다.
export function extractCode(text){
 const raw = String(text||'').normalize('NFKC').replace(/[“”„]/g,'"').replace(/[‘’]/g,"'");
 const blocks = [...raw.matchAll(/```[a-zA-Z]*\s*([\s\S]*?)```/g)].map(m => m[1]);
 const candidates = blocks.length ? blocks : [raw];
 for(const c of candidates){
  const s = c.indexOf('{'), a = c.indexOf('['), start = s<0 ? a : a<0 ? s : Math.min(s, a);
  if(start<0) continue;
  const end = Math.max(c.lastIndexOf('}'), c.lastIndexOf(']'));
  if(end<=start) continue;
  const body = c.slice(start, end+1).replace(/,\s*([}\]])/g, '$1');
  try{ return JSON.parse(body); }catch{ /* 다음 후보 */ }
 }
 throw Error('AI 답에서 마이로그 코드를 찾지 못했어요. AI 답의 코드 블록을 통째로 복사해 붙여넣어 주세요.');
}

const TYPE = {meal:'meal', 식사:'meal', 식단:'meal', food:'meal', workout:'workout', 운동:'workout', exercise:'workout', body:'body', 몸:'body', 체중:'body', 인바디:'body', inbody:'body'};
const MACHINES = [...GENERIC_MACHINES, ...BUILTIN_BRANDS];
// 사용자가 말한 머신 이름을 앱의 머신 종류·제조사 모델에 맞춘다(모르면 비워 두고 검토함에서 고른다).
export function matchMachine(name, exercise){
 const q = norm(name); if(!q) return null;
 const names = m => [m.name, ...(m.aliases||[]), m.model||''].map(norm).filter(Boolean);
 const exact = MACHINES.find(m => names(m).includes(q));
 if(exact) return exact;
 const hits = MACHINES.filter(m => names(m).some(n => n.includes(q) || q.includes(n)));
 const same = exercise ? hits.filter(m => findExercise(m.exercise)?.id===exercise.id) : hits;
 return (same.length===1 ? same[0] : hits.length===1 ? hits[0] : null);
}

function mealDraft(r, said){
 const date = dateOk(r.date) ? r.date : today(), time = hm(r.time) || nowHM();
 const items = (pick(r, 'items', 'foods', '음식') || []).map(it => {
  const est = it.estimate || it.aiEstimate || null;
  const range = k => Array.isArray(est?.[k]) ? est[k].map(num) : [num(est?.[`${k}Min`]), num(est?.[`${k}Max`])];
  const [kMin, kMax] = est ? range('kcal').some(v => v!=null) ? range('kcal') : range('calories') : [null, null];
  const aiEstimate = est ? {estimated:true, caloriesMin:kMin, caloriesMax:kMax, carbsMin:range('carbs')[0], carbsMax:range('carbs')[1], proteinMin:range('protein')[0], proteinMax:range('protein')[1], fatMin:range('fat')[0], fatMax:range('fat')[1], basis:String(est.basis||'AI 추정').slice(0,160)} : null;
  const item = {date, slot:String(r.slot||'식사'), loggedAt:new Date(`${date}T${time}:00`).toISOString(), name:String(pick(it, 'name', '이름')||'').trim(), servingQty:num(pick(it, 'qty', 'servingQty', 'amount', '양'))??1, servingUnit:String(pick(it, 'unit', 'servingUnit', '단위')||'회'), calories:num(pick(it, 'kcal', 'calories', '칼로리')), carbs:num(pick(it, 'carbs', 'carb', '탄수화물')), protein:num(pick(it, 'protein', '단백질')), fat:num(pick(it, 'fat', '지방'))};
  if(aiEstimate) item.aiEstimate = aiEstimate;
  cleanMeal(item);
  return item;
 });
 if(!items.length) throw Error('식사 기록에 음식이 없어요.');
 return {type:'meal', parsedData:{items}, summary:`${date} ${time} ${items.map(i => i.name).join(', ')}`};
}

function workoutDraft(r){
 const date = dateOk(r.date) ? r.date : today(), time = hm(r.time);
 const exercises = (pick(r, 'exercises', '운동') || []).map(e => {
  const name = String(pick(e, 'name', '이름')||'').trim(), known = findExercise(name);
  const minutes = num(pick(e, 'minutes', 'durationMin', '분')), km = num(pick(e, 'km', 'distanceKm'));
  if(known?.kind==='cardio' || (minutes!=null || km!=null) && !e.sets) return {name:known?.name||name, exerciseId:known?.id||null, part:known?.part||'유산소', kind:'cardio', durationMin:minutes, distanceKm:km, sets:[]};
  let sets = e.sets;
  if(!Array.isArray(sets)){ const n = Math.max(1, Math.min(20, num(sets)||1)); sets = Array.from({length:n}, () => ({weight:e.weight, unit:e.unit, reps:e.reps})); }
  const machine = matchMachine(pick(e, 'machine', '머신'), known);
  const clean = sets.map(s => { const lb = num(s.lb), kg = num(s.kg); const unit = lb!=null ? 'lb' : kg!=null ? 'kg' : (String(s.unit||e.unit||machine?.unit||'kg').toLowerCase().includes('lb') ? 'lb' : 'kg'); const weight = lb ?? kg ?? num(s.weight) ?? 0; return {weight, originalWeight:weight, unit, originalUnit:unit, reps:Math.round(num(s.reps)??0), type:'본세트', completed:true, completedAt:time ? new Date(`${date}T${time}:00`).toISOString() : ''}; });
  const ex = {name:known?.name||name, exerciseId:known?.id||null, part:known?.part||String(e.part||'기타'), machineId:machine?.id||null, sets:clean};
  if(known?.weightBasis==='per-hand'){ ex.weightBasis = 'per-hand'; ex.handCount = known.handCount||2; }
  if(machine?.sided==='iso'){ ex.weightBasis = 'per-hand'; ex.handCount = 2; }
  if(machine?.primaryMuscleIds?.length && (!known || machine.primaryMuscleIds.some(m => known.primaryMuscleIds.includes(m)))){ ex.primaryMuscleIds = [...machine.primaryMuscleIds]; ex.secondaryMuscleIds = [...machine.secondaryMuscleIds]; }
  if(!machine && e.machine) ex.note = `AI가 적은 머신: ${String(e.machine).slice(0,60)}`;
  return ex;
 });
 const parsedData = {date, title:String(r.title||'오늘의 운동'), gymName:String(r.gym||r.gymName||''), exercises};
 if(time) parsedData.loggedAtTime = time;
 cleanWorkout(parsedData);
 return {type:'workout', parsedData, summary:`${date} ${parsedData.title} · ${exercises.map(x => x.name).join(', ')}`};
}

function bodyDraft(r){
 const date = dateOk(r.date) ? r.date : today();
 const parsedData = {date, weight:num(pick(r, 'weight', '체중')), bodyFatPct:num(pick(r, 'bodyFat', 'bodyFatPct', '체지방률')), skeletalMuscle:num(pick(r, 'muscle', 'skeletalMuscle', '골격근량')), waistCm:num(pick(r, 'waist', 'waistCm', '허리')), bodyFatMass:num(pick(r, 'bodyFatMass', '체지방량')), bmi:num(r.bmi), score:num(pick(r, 'score', '점수')), visceralFatLevel:num(pick(r, 'visceralFat', 'visceralFatLevel', '내장지방')), bmr:num(pick(r, 'bmr', '기초대사량'))};
 if(!['weight','bodyFatPct','skeletalMuscle','waistCm'].some(k => parsedData[k]!=null)) throw Error('몸 기록에 체중·체지방률·골격근량·허리둘레 중 하나는 있어야 해요.');
 cleanBody(parsedData);
 return {type:'body', parsedData, summary:`${date} 체중 ${parsedData.weight??'-'}kg`};
}

// 붙여넣은 글 → 검토함 초안 목록. 하나라도 틀리면 어느 기록이 왜 틀렸는지 알려 준다.
export function parsePaste(text){
 const code = extractCode(text);
 const records = Array.isArray(code) ? code : Array.isArray(code.records) ? code.records : code.type ? [code] : [];
 if(!records.length) throw Error('마이로그 코드에 기록(records)이 없어요.');
 if(records.length>20) throw Error('한 번에 20개까지 넣을 수 있어요.');
 const said = String(code.said || code.originalUtterance || '').trim().slice(0, 1000);
 return records.map((r, i) => {
  const type = TYPE[String(r?.type||'').toLocaleLowerCase('ko')];
  if(!type) throw Error(`${i+1}번째 기록의 종류(type)를 모르겠어요. meal·workout·body 중 하나여야 해요.`);
  try{
   const d = type==='meal' ? mealDraft(r, said) : type==='workout' ? workoutDraft(r) : bodyDraft(r);
   return {type, sourceModel:String(code.model||'붙여넣기').slice(0, 80), originalUtterance:(said || d.summary).slice(0, 4000), parsedData:d.parsedData, uncertainty:{}, evidence:{source:'AI 답 붙여넣기'}, summary:d.summary};
  }catch(error){ throw Error(`${i+1}번째 기록(${type==='meal'?'식사':type==='workout'?'운동':'몸'}): ${error.message}`); }
 });
}

// ── AI 입력 창 ──
const h = v => String(v??'').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const KIND = {meal:'식사', workout:'운동', body:'몸'};
export function aiPreviewHTML(text){
 if(!String(text||'').trim()) return '';
 try{ const d = parsePaste(text); return `<p class="ai-in-ok">✓ ${d.length}개 기록을 찾았어요</p><ul class="ai-in-list">${d.map(x => `<li><span class="ai-tag">${KIND[x.type]}</span>${h(x.summary)}</li>`).join('')}</ul>`; }
 catch(error){ return `<p class="ai-in-err">${h(error.message)}</p>`; }
}
export function aiInputHTML(state={}, {pending=0, ready=true}={}){
 return `<div class="ai-in">
 <div class="ai-in-how"><p><b>이렇게 쓰세요</b></p><ol>
  <li><b>지시문 복사</b>를 눌러, 평소 쓰는 AI(ChatGPT·Gemini·Claude 등, 무료 버전·휴대폰 앱 모두 괜찮아요) 대화창에 한 번 붙여넣어요.</li>
  <li>그 대화에서 평소 말투로 말하세요. 예: “점심에 제육덮밥 먹고 콜라 한 캔”, “하체 했어. 레그프레스 100키로 12개 3세트”, “아침 체중 72.4”</li>
  <li>AI가 <b>마이로그 코드</b>를 줘요. 코드 블록의 복사 버튼으로 복사해 아래 칸에 붙여넣으면 끝이에요.</li>
 </ol><p class="hint">다음부터는 같은 대화에서 말만 하면 돼요. 붙여넣은 기록은 AI 검토함에서 확인한 뒤 확정돼요.</p><p class="hint">AI는 마이로그에 뭐가 등록돼 있는지 볼 수 없어요. <b>내 음식·운동 목록 복사</b>로 내 목록을 대화에 한 번 붙여 주면, AI가 같은 이름과 값을 다시 써서 중복이 줄어요. 같은 이름·단위의 음식은 마이로그가 늘 하나로 묶어요.</p></div>
 <div class="ai-in-prompt"><button type="button" class="button secondary" id="ai-copy-prompt">지시문 복사</button><button type="button" class="button secondary" id="ai-copy-mine">내 음식·운동 목록 복사</button><details><summary>지시문 내용 보기</summary><pre>${h(AI_PROMPT)}</pre></details></div>
 <label class="field ai-in-field">AI가 준 코드 붙여넣기<textarea id="ai-code" rows="6" placeholder="여기에 AI 답을 붙여넣어요 (설명 글이 같이 붙어도 괜찮아요)" spellcheck="false" autocomplete="off">${h(state.text||'')}</textarea></label>
 <div class="ai-in-tools"><button type="button" class="button secondary small" id="ai-paste-clip">클립보드에서 붙여넣기</button>${state.text?'<button type="button" class="text-button" id="ai-code-clear">지우기</button>':''}</div>
 <div id="ai-in-preview" aria-live="polite">${aiPreviewHTML(state.text)}</div>
 ${state.msg?`<p class="ai-in-msg">${h(state.msg)}</p>`:''}
 ${ready?'':'<p class="ai-in-err">AI 입력은 로그인하고 이용 승인된 계정에서 쓸 수 있어요.</p>'}
 <div class="actions ai-in-actions"><button type="button" class="button" id="ai-send" ${ready&&!state.busy?'':'disabled'}>${state.busy?'넣는 중…':'검토함에 넣기'}</button><button type="button" class="button secondary" id="ai-go-inbox" data-page="ai-inbox">AI 검토함 열기${pending?` <span class="ai-in-count">${pending}</span>`:''}</button></div>
</div>`;
}

// 3.16.0 AI에게 내 목록 알려 주기: AI는 마이로그 저장소를 볼 수 없으니, 내 음식(값 포함)·자주 하는 운동·머신 이름을 글로 복사해 대화에 한 번 붙여넣는다.
export function aiContextText(db={}, candidates=[]){
 const foods = candidates.filter(f => f.personal || (!f.catalog && f.source!=='대표값')).slice(0, 60);
 const per = f => [f.calories!=null?`${Math.round(f.calories)}kcal`:'', f.carbs!=null?`탄${Math.round(f.carbs)}`:'', f.protein!=null?`단${Math.round(f.protein)}`:'', f.fat!=null?`지${Math.round(f.fat)}`:''].filter(Boolean).join(' ');
 const ex = new Map();
 for(const w of [...(db.workouts||[])].sort((a, b) => String(b.date).localeCompare(String(a.date))).slice(0, 40)) for(const e of w.exercises||[]){ const k = e.name; if(k && !ex.has(k)) ex.set(k, e.machineId||''); }
 const machineName = id => GENERIC_MACHINES.find(m => m.id===id)?.name || BUILTIN_BRANDS.find(m => m.id===id)?.name || (db.machines||[]).find(m => m.id===id)?.name || '';
 return `마이로그에 이미 있는 내 목록이야. 같은 음식·운동이면 아래 이름과 값을 그대로 써 줘.
[내 음식] (이름 · 기준량 · 값)
${foods.length ? foods.map(f => `- ${f.name} · ${f.servingQty||1}${f.servingUnit||'회'} · ${per(f)}`).join('\n') : '- (아직 없음)'}
[자주 하는 운동] (이름 · 머신)
${ex.size ? [...ex].slice(0, 40).map(([n, m]) => `- ${n}${m && machineName(m) ? ` · ${machineName(m)}` : ''}`).join('\n') : '- (아직 없음)'}`;
}
