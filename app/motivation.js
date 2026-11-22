// 4.6.0 기록 동기부여 문구(대표님 선택: 시안 2·3·4·5). 근거: docs/plans/2026-11-22_기록_동기부여_문구.md
// 원칙: 효과는 연구가, 쉬움은 마이로그가. 재촉·연속 기록 끊김 말 금지. 유명인 이름 금지. 연구 문장은 가끔만, ⓘ로 출처.
// 들어올 때마다(앱을 새로 열 때마다) 다음 문장으로 넘어간다. 시간대(아침·낮·저녁·밤)에 맞는 문장을 먼저 쓴다.
const esc = v => String(v??'').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const SOURCES = {
 kaiser:'미국 Kaiser Permanente 등 다기관 연구(2008, 약 1,700명): 식사 기록을 매일 한 사람이 기록하지 않은 사람보다 약 2배 감량했어요. 관찰 연구예요.',
 burke:'Burke 외 체계적 고찰(2011): 식단·운동·체중 자기기록과 감량 사이의 연관이 여러 연구에서 일관되게 나타났어요.',
 harvey:'Harvey 외 "Log Often, Lose More"(2019): 감량에 성공한 사람은 하루에 기록을 더 자주 열었고, 기록에 드는 시간은 갈수록 줄었어요.',
 weigh:'Steinberg 외 매일 체중 재기 연구(2013): 매일 재고 흐름을 본 그룹이 더 많이 감량했고, 마음 부담은 늘지 않았어요.',
 quit:'Cordeiro 외(CHI 2015): 기록을 그만둔 사람들이 가장 많이 꼽은 이유는 "너무 손이 많이 가서"였어요.',
 short:'축약 식사일기 연구: 자세한 기록 대신 간단한 기록으로 바꿔도 단기 감량에 손해가 없었어요.'
};
export const SOURCE_NOTE = '연구는 기록 자체의 효과예요. 마이로그를 쓰면 똑같이 된다는 뜻은 아니에요.';
// [문장, 출처 키]
const BY_SLOT = {
 아침:[['일어나서 체중 한 번이면 오늘 기록은 시작이에요.','weigh'],['아침을 걸렀어도 괜찮아요. 먹은 것만 남기면 돼요.']],
 낮:[['사진 없이 이름만 적어도 충분해요.','short'],['운동 끝나고 한 번에 남겨도 돼요.']],
 저녁:[['오늘 먹은 것 중 기억나는 것만 남겨 볼까요?'],['자주 짧게 남기는 사람이 더 잘 관리한대요.','harvey']],
 밤:[['오늘 못 남겼어도 괜찮아요. 내일 아침에 이어서 해요.'],['하루를 다 채우지 않아도 흐름은 이어져요.']]
};
const GENERAL = [
 ['처음 3일은 평소대로만 적어 보세요. 내가 뭘 먹는지 보이기 시작해요.'],
 ['운동선수와 트레이너들도 관리의 첫 단계로 기록을 꼽아요.'],
 ['체중은 매일 오르내려요. 하루보다 주 평균을 봐 주세요.','weigh'],
 ['기록을 그만두는 가장 큰 이유는 귀찮음이래요. 그건 마이로그가 줄일게요.','quit'],
 ['완벽하지 않아도 돼요. 대충 남겨도 기록이에요.'],
 ['기록하는 사람이 더 잘 관리한다는 연구가 많아요.','burke']
];
const EMPTY = [
 ['방금 먹은 것 하나만 남겨 볼까요?','','meal','식사 하나 남기기'],
 ['체중부터 시작해도 돼요. 5초면 끝나요.','','body','체중 남기기'],
 ['사진 없이 이름만 적어도 충분해요.','short','meal','이름만 적기'],
 ['기억나는 것만 남겨도 기록이에요.','','meal','기억나는 것 남기기']
];
export const timeSlot = (d = new Date()) => { const h = d.getHours(); return h>=5&&h<11 ? '아침' : h>=11&&h<17 ? '낮' : h>=17&&h<22 ? '저녁' : '밤'; };

const KEY = 'mylogue.motiv';
const read = () => { try{ return JSON.parse(globalThis.localStorage?.getItem(KEY)||'{}')||{}; }catch{ return {}; } };
const write = v => { try{ globalThis.localStorage?.setItem(KEY, JSON.stringify(v)); }catch{} };
// 앱을 열 때 한 번 부른다 → 다음 문장으로
export function visitTick(){ const s = read(); write({...s, visit:(Number(s.visit)||0) + 1}); }
const visit = () => Number(read().visit)||0;

// 시안 2+5: 오늘의 한 줄(시간대 문장과 일반 문장을 번갈아)
export function todayLine(now = new Date()){
 const slot = timeSlot(now), v = visit(), pool = v%2===0 ? BY_SLOT[slot] : GENERAL;
 const [text, src=''] = pool[Math.floor(v/2) % pool.length];
 return {slot:v%2===0 ? slot : '', text, src};
}
export function todayLineHTML(now = new Date(), {open = false} = {}){
 const s = read(), day = now.toISOString().slice(0,10);
 if(s.hidden===day) return '';
 const l = todayLine(now);
 return `<p class="motiv" aria-live="polite">${l.slot?`<span class="motiv-slot">${esc(l.slot)}</span>`:''}<span class="motiv-text">${esc(l.text)}</span>${l.src?`<button type="button" class="motiv-src" data-motiv="src" aria-expanded="${open}" aria-label="이 문장의 근거 보기">ⓘ</button>`:''}<button type="button" class="motiv-x" data-motiv="hide" aria-label="오늘은 그만 보기">×</button></p>${open&&l.src?`<p class="motiv-why">${esc(SOURCES[l.src])} ${esc(SOURCE_NOTE)}</p>`:''}`;
}
export function hideToday(now = new Date()){ write({...read(), hidden:now.toISOString().slice(0,10)}); }

// 시안 3: 기록 직후 한마디. 평소엔 행동 칭찬, 저장 다섯 번에 한 번쯤 근거 문장.
const ymd = d => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
export function savedLine(db, {now = new Date(), base = '남겼어요.'} = {}){
 const s = read(), n = (Number(s.saves)||0) + 1; write({...s, saves:n});
 const all = [...(db.meals||[]), ...(db.workouts||[]), ...(db.body||[])].filter(x => !x.planned);
 if(all.length<=1) return '첫 기록이에요. 시작이 제일 어려워요.';
 if(n%5===0) return `${base} 자주 짧게 남기는 사람이 더 잘 관리한다는 연구가 있어요.`;
 const mon = new Date(now); mon.setDate(mon.getDate() - ((mon.getDay()+6)%7)); const from = ymd(mon), to = ymd(now);
 const days = new Set(all.map(x => x.date).filter(d => d>=from && d<=to)).size;
 return days>=2 ? `${base} 이번 주 ${days}일째 기록이에요.` : base;
}

// 시안 4: 빈 자리 안내(탓하지 않는 한 줄 + 가장 작은 행동 하나)
const pickEmpty = kind => { const pool = EMPTY.filter(x => kind==='any' || x[2]===kind); return pool[visit() % pool.length]; };
export const emptyLine = (kind = 'meal') => esc(pickEmpty(kind)[0]);
export function emptyAction(kind = 'meal'){ const [, , act, label] = pickEmpty(kind); return `<button type="button" class="button small motiv-act" data-modal="${act==='body'?'body':'batch'}">${esc(label)}</button>`; }
