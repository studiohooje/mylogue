// 4.9.0 로그인 전 첫 화면(랜딩)과 '둘러보기' 체험.
// - 랜딩: 로그인하지 않았고, 이 기기에 기록이 없고, '로그인 없이 시작'을 고르지 않았을 때만 보인다(기존 게스트 기록은 그대로).
// - 둘러보기: 예시 기록을 'demo-tour' 저장 칸에 따로 만들어 실제 앱 화면을 써 보게 한다. 진짜 기록과 섞이지 않고, 끝내면 지운다.
// 문구 원칙: 기록만으로도 이미 절반을 해낸 거라고 말해 준다. 프리미엄은 '필요하면' 정도로만.
import {personaCardsHTML} from './personas.js';
export const DEMO_ACCOUNT = 'demo-tour';
const SKIP_KEY = 'mylogue.landing.skip', DEMO_FLAG = 'mylogue.demo', VIEW_FLAG = 'mylogue.landing.view';
const ls = {get:k => { try{ return localStorage.getItem(k); }catch{ return null; } }, set:(k, v) => { try{ localStorage.setItem(k, v); }catch{} }, del:k => { try{ localStorage.removeItem(k); }catch{} }};
const ss = {get:k => { try{ return sessionStorage.getItem(k); }catch{ return null; } }, set:(k, v) => { try{ sessionStorage.setItem(k, v); }catch{} }, del:k => { try{ sessionStorage.removeItem(k); }catch{} }};

export const demoRequested = () => ss.get(DEMO_FLAG)==='1';
export const startDemo = (persona = '') => { ss.set(DEMO_FLAG, '1'); if (persona) ss.set('mylogue.demo.persona', persona); };
export const demoPersona = () => ss.get('mylogue.demo.persona') || '';
// 둘러보기 중 인물 바꾸기: 예시 기록만 지우고 새 인물로(둘러보기는 유지)
export function switchDemoPersona(persona){ ss.set('mylogue.demo.persona', persona); try{ for(const k of Object.keys(localStorage)) if(k.includes(`.user.${DEMO_ACCOUNT}`)) localStorage.removeItem(k); }catch{} }
export function endDemo(){
 ss.del(DEMO_FLAG); ss.del('mylogue.demo.persona');
 try{ for(const k of Object.keys(localStorage)) if(k.includes(`.user.${DEMO_ACCOUNT}`)) localStorage.removeItem(k); }catch{}
}
export const landingSkipped = () => ls.get(SKIP_KEY)==='1';
export const skipLanding = () => ls.set(SKIP_KEY, '1');
export const hasRecords = db => !!((db.body||[]).length || (db.meals||[]).length || (db.workouts||[]).length);
// 설정의 '첫 화면 다시 보기'로 연 경우(viewing)는 기록이 있어도 보여 준다.
export const landingViewing = () => ss.get(VIEW_FLAG)==='1';
export const viewLanding = () => ss.set(VIEW_FLAG, '1');
export const closeLanding = () => ss.del(VIEW_FLAG);
export const showLanding = ({user, db, demo}) => !user && !demo && (landingViewing() || (!landingSkipped() && !hasRecords(db)));

// ---- 둘러보기 예시 기록: 8주 동안 꾸준히 기록한 가상의 사람 '마이'. 숫자는 화면을 보여 주기 위한 예시다. ----
// g 단위는 100g당 값(도메인 계약), 개·공기·그릇·인분·스쿱은 1단위당 값.
const pad = n => String(n).padStart(2, '0');
const ymd = d => `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
const r1 = v => Math.round(v*10)/10;
export const DEMO_DAYS = 56;
export const DEMO_SETTINGS = {calorieGoal:1900, carbsGoal:200, proteinGoal:140, fatGoal:55, goalWeight:73};
// 같은 날짜면 늘 같은 값(새로고침해도 그래프가 흔들리지 않게)
const noise = (i, k=1) => { const x = Math.sin(i*12.9898 + k*78.233) * 43758.5453; return (x - Math.floor(x)) - 0.5; };
const BREAKFAST = [
 [['그릭요거트 (플레인)',150,'g',97,4,10,4],['바나나',1,'개',105,27,1,0],['아메리카노',1,'잔',10,2,0,0]],
 [['오트밀 (마른 것)',40,'g',379,68,13,7],['우유',200,'ml',60,5,3,3],['블루베리',80,'g',57,14,1,0]],
 [['삶은 달걀',2,'개',78,1,6,5],['식빵',1,'장',80,14,3,1],['사과',1,'개',95,25,0,0]]
];
const LUNCH = [
 [['닭가슴살 (익힌 것)',130,'g',165,0,31,4],['현미밥',1,'공기',315,68,7,2],['샐러드 채소',100,'g',20,4,1,0]],
 [['비빔밥',1,'그릇',600,90,20,16]],
 [['연어 포케',1,'그릇',560,62,32,18]],
 [['제육볶음 정식',1,'인분',720,85,34,24]],
 [['닭가슴살 샐러드',1,'그릇',380,22,38,14],['고구마 (찐 것)',150,'g',130,31,1,0]]
];
const SNACK = [['프로틴 쉐이크',1,'스쿱',120,3,24,1],['아몬드',1,'줌',165,6,6,14]];
const DINNER = [
 [['닭가슴살 (익힌 것)',150,'g',165,0,31,4],['고구마 (찐 것)',150,'g',130,31,1,0],['브로콜리 (데친 것)',100,'g',35,7,3,0]],
 [['두부',200,'g',84,2,9,5],['현미밥',1,'공기',315,68,7,2],['배추김치',50,'g',18,4,1,0]],
 [['소고기 우둔 구이',150,'g',180,0,30,6],['쌀밥 (백미)',1,'공기',300,66,5,1],['양배추',100,'g',25,6,1,0]],
 [['연어 구이',150,'g',206,0,22,12],['잡곡밥',1,'공기',320,68,8,2]]
];
const ROUTINE = {
 1:{title:'하체 데이', ex:[['스쿼트','하체',60,2.5,8],['레그프레스','하체',140,5,12],['루마니안 데드리프트','하체',50,2.5,10]]},
 2:{title:'등 데이', ex:[['랫풀다운','등',45,2.5,10],['시티드 로우 머신','등',40,2.5,12],['덤벨 로우','등',16,1,10]]},
 4:{title:'가슴·어깨', ex:[['벤치프레스','가슴',40,2.5,8],['인클라인 덤벨 프레스','가슴',14,1,10],['덤벨 숄더 프레스','어깨',10,1,10]]}
};
export function demoRecords(todayStr, now=new Date()){
 const base = new Date(`${todayStr}T12:00:00`), body = [], meals = [], workouts = [];
 const nowMin = now.getHours()*60 + now.getMinutes();
 // 오늘 기록은 지금 시각보다 앞에 오도록 당긴다(홈 헤일로가 오늘도 완성돼 보이게)
 const when = (date, h, m=0) => { let min = h*60 + m; if(date===todayStr){ const end = Math.max(nowMin - 10, 60); const start = Math.min(6*60+30, end - 120); min = start + Math.round((min - 6*60) / (16*60) * Math.max(end - start, 30)); min = Math.max(0, Math.min(min, end)); } return {iso:new Date(`${date}T${pad(Math.floor(min/60))}:${pad(min%60)}:00`).toISOString(), hm:`${pad(Math.floor(min/60))}:${pad(min%60)}`}; };
 const addMeal = (date, h, m, slot, items) => { const t = when(date, h, m); for(const [name, qty, unit, kcal, c, p, f] of items) meals.push({date, loggedAt:t.iso, name, servingQty:qty, servingUnit:unit, calories:kcal, carbs:c, protein:p, fat:f, slot, source:'demo'}); };
 for(let k=DEMO_DAYS-1; k>=0; k--){
  const d = new Date(base); d.setDate(base.getDate()-k); const date = ymd(d), i = DEMO_DAYS-1-k, dow = d.getDay(), prog = i/(DEMO_DAYS-1);
  // 체중: 78.6 → 74.9kg, 주말에 살짝 오르고 다시 내려가는 자연스러운 흔들림
  const w = r1(78.6 - 3.7*prog + noise(i)*0.5 + ((dow===0||dow===1) ? 0.25 : 0));
  const tb = when(date, 7, 20 + Math.round(noise(i, 2)*10));
  body.push({date, weight:w, measure:'scale', source:'demo', createdAt:tb.iso, updatedAt:tb.iso});
  if(i%14===0 || k===0){ const t = when(date, 8, 30); body.push({date, weight:w, bodyFatPct:r1(26.8 - 3.6*prog), skeletalMuscle:r1(30.4 + 1.2*prog), bodyFatMass:r1(w*(26.8 - 3.6*prog)/100), bmi:r1(w/(1.76*1.76)), visceralFatLevel:Math.round(9 - 2*prog), bmr:Math.round(1640 + 30*prog), measure:'inbody', source:'demo', createdAt:t.iso, updatedAt:t.iso}); }
  if(i%14===3) body.push({date, waistCm:r1(88 - 4*prog), source:'demo', createdAt:tb.iso, updatedAt:tb.iso});
  if(k===0){   // 오늘은 목표선에 고르게 닿는 하루(둘러보기 첫 화면)
   addMeal(date, 7, 50, '아침', BREAKFAST[0]);
   addMeal(date, 12, 20, '점심', LUNCH[4]);
   addMeal(date, 16, 0, '간식', SNACK);
   addMeal(date, 19, 0, '저녁', [['소고기 우둔 구이',150,'g',180,0,30,6],['현미밥',1,'공기',315,68,7,2],['브로콜리 (데친 것)',100,'g',35,7,3,0]]);
  } else {
   addMeal(date, 7, 50, '아침', BREAKFAST[i%BREAKFAST.length]);
   addMeal(date, 12, 20, '점심', LUNCH[(i*3)%LUNCH.length]);
   if(dow!==0) addMeal(date, 16, 0, '간식', [SNACK[i%2]]);
   addMeal(date, 19, 0, '저녁', DINNER[(i*5)%DINNER.length]);
  }
  const r = ROUTINE[dow] || (k===0 && dow!==6 ? ROUTINE[1] : null);   // 오늘은 늘 운동이 있게(헤일로 완성)
  if(r){ const t = when(date, 20, 0); const week = Math.floor(i/7);
   workouts.push({date, title:r.title, gymName:'우리 동네 헬스장', loggedAtTime:t.hm, exercises:r.ex.map(([name, part, w0, step, reps]) => ({name, part, kind:'strength', sets:[0,1,2,3].map(s => ({weight:r1(w0 + step*week + (s===3 ? -step : 0)), unit:'kg', reps:s===3 ? reps+2 : reps, completed:true}))}))}); }
  if(dow===6){ const t = when(date, 10, 0), lv = Math.min(5, 2 + Math.floor(i/21));
   workouts.push({date, title:'필라테스 리포머', gymName:'필라테스 스튜디오', loggedAtTime:t.hm, exercises:[{name:'필라테스 리포머', part:'필라테스', kind:'cardio', durationMin:50, sessionType:'개인', sets:[], moves:[
    {name:'풋워크', apparatus:'리포머', springs:i<28 ? [{c:'빨강', n:3}] : [{c:'빨강', n:2},{c:'파랑', n:1}], reps:10, level:lv, setup:'풋바 2'},
    {name:'헌드레드', apparatus:'리포머', springs:[{c:'파랑', n:1}], reps:100, level:lv},
    {name:'엘리펀트', apparatus:'리포머', springs:[{c:'빨강', n:1}], reps:8, level:lv},
    {name:'머메이드', apparatus:'리포머', springs:[{c:'파랑', n:1}], reps:6, side:'양쪽', level:lv}
   ]}]}); }
  if(dow===0 && k>0) workouts.push({date, rest:true, title:'의도적 휴식', loggedAtTime:'09:00', exercises:[]}); // 4.17.0 쉰 날도 '의도적 휴식'으로(빈칸이 아니게)
  if(dow===3 && k>0){ const t = when(date, 7, 0); workouts.push({date, title:'아침 러닝', loggedAtTime:t.hm, exercises:[{name:'러닝', part:'유산소', kind:'cardio', durationMin:30, distanceKm:r1(4.6 + 0.6*prog), sets:[]}]}); }
 }
 return {body, meals, workouts, settings:DEMO_SETTINGS};
}

// ---- 화면 ----
const halo = `<svg class="ld-halo" viewBox="0 0 320 210" aria-hidden="true"><defs><linearGradient id="ldhg" x1="0" x2="1"><stop offset="0" stop-color="#f2b49b"/><stop offset=".5" stop-color="#8ce4e0"/><stop offset="1" stop-color="#b48cff"/></linearGradient></defs><path d="M40 150 A120 120 0 0 1 280 150" fill="none" stroke="rgba(255,255,255,.08)" stroke-width="10" stroke-linecap="round"/><path class="ld-arc" d="M40 150 A120 120 0 0 1 280 150" fill="none" stroke="url(#ldhg)" stroke-width="10" stroke-linecap="round"/><circle class="ld-dot" cx="110" cy="188" r="12" fill="#f2b49b"/><circle class="ld-dot d2" cx="160" cy="188" r="12" fill="#8ce4e0"/><circle class="ld-dot d3" cx="210" cy="188" r="12" fill="#b8aaf2"/></svg>`;
// 4.29.0 줄바꿈(대표님 2026-11-25): 문장은 줄(ln) 단위로, 줄 안에서는 낱말 묶음(nb) 사이에서만 끊는다.
// '|'는 묶음 경계, 배열 한 칸이 한 줄. 좁은 폰에서는 묶음 사이에서, 넓은 화면에서는 줄 끝에서만 바뀐다.
const lines = (...ls) => ls.map(l => `<span class="ln">${l.split('|').map(p => `<span class="nb">${p.trim()}</span>`).join(' ')}</span>`).join('');
const feature = (k, t, d) => `<article class="ld-feat"><span class="ld-feat-k">${k}</span><h3>${t}</h3><p>${d}</p></article>`;

export function landingHTML({installHTML='', returning=false}={}){
 return `<div class="landing">
 <header class="ld-top"><span class="ld-brand"><img src="icon.svg" alt="">마이로그</span><button type="button" class="ld-login" id="landing-login">로그인</button></header>

 <section class="ld-hero">
  <div class="ld-sky" aria-hidden="true"></div>
  ${halo}
  <p class="ld-word" aria-label="Mylogue">My<b>log</b>ue</p>
  <p class="ld-what">${lines('체중·식단·운동을|한 줄로 남기는|건강 기록 앱')}</p>
  <h1>기록만으로,<br>이미 절반은 해냈어요.</h1>
  <p class="ld-lead">${lines('칼같은 식단,|땀 흘리는 운동이|필요한 날도 오겠지만,', '그 전에|오늘 남긴 한 줄이 먼저예요.', '기록하는 사람은|이미 남들보다|한 걸음 앞에 있어요.')}</p>
  <div class="ld-cta">
   <button type="button" class="ld-btn primary" id="landing-signup">Google로 시작하기</button>
   <button type="button" class="ld-btn" id="landing-demo">로그인 전에 둘러보기</button>
  </div>
  <p class="ld-beta">${lines('지금은 소수 베타예요.', 'Google로 시작하면 이용 신청을 하고,|운영자가 승인하면|여러 기기에서 기록이 이어져요.', '기다리는 동안엔|둘러보기나 가입 없이 쓰기를|이용할 수 있어요.')}</p>
  ${returning ? '<button type="button" class="ld-link" id="landing-back">내 기록으로 돌아가기</button>' : '<button type="button" class="ld-link" id="landing-more">예시 화면과 이야기 먼저 보기 ↓</button>'}
 </section>

 <section class="ld-sec">
  <p class="ld-eb">왜 기록인가요</p>
  <h2>숫자 하나가,<br>당신을 증명해요</h2>
  <div class="ld-quotes">
   <p><span class="nb"><b>“오늘 뭐 먹었더라?”</b>를</span> <span class="nb">아는 사람은</span> <span class="nb">이미 조절을 시작한 사람이에요.</span></p>
   <p><span class="nb"><b>지난주보다 1kg 더</b> 든 걸</span> <span class="nb">아는 사람은,</span> <span class="nb">다음 주도 들어요.</span></p>
   <p><span class="nb"><b>빠진 날이 보이는 것</b>만으로,</span> <span class="nb">다시 시작할 이유가 생겨요.</span></p>
  </div>
  <p class="ld-note">${lines('마이로그는 재촉하지 않아요.', '먹으라고, 운동하라고|조르는 알림은 없어요.', '쓰고 싶을 때 쓰면,|쌓인 기록이 대신 말해 줘요.')}</p>
 </section>

 <section class="ld-sec">
  <p class="ld-eb">로그인하면 이런 것들이</p>
  <h2>몸 · 식사 · 운동,<br>하루가 한 줄로 이어져요</h2>
  <div class="ld-feats">
   ${feature('헤일로', '오늘의 기록이 원호로', lines('기록할 때마다|하루의 원호가 이어지고,', '몸·식사·운동 세 점이 켜지면|오늘이 완성돼요.'))}
   ${feature('식단', '목표선까지 한눈에', lines('칼로리와 탄단지를|목표선 막대로.', '모자라면|“단백질 30g 부족”처럼|알려 줘요.', 'GLP-1을 쓰는 분은|단백질부터.'))}
   ${feature('운동', '내 헬스장 머신 그대로', lines('그 헬스장에 있는 머신이|맨 위에.', '지난번 무게가|자동으로 채워지고,', '‘같은 값으로 한 세트 더’|한 번이면 끝.'))}
   ${feature('인바디', '결과지 사진 한 장', lines('인바디 결과지를 찍으면|체중·골격근·체지방이 한 번에.', '체중계 기록과 나란히|흐름으로 봐요.'))}
   ${feature('AI', '말하듯 남기면, 초안으로', lines('“점심 비빔밥, 저녁 닭가슴살”|하고 남기면|AI가 받아 적어요.', '확정은 언제나 내가 해요.'))}
   ${feature('코치', '내 강사님과 연결', lines('PT·필라테스 강사님이|보낸 수업을 확인하고|확정하면 내 기록이 돼요.', '기록의 주인은 나예요. <small>(시험 중)</small>'))}
  </div>
  <div class="ld-try">
   <p><b>말보다 직접 보는 게 빠르죠.</b><br>${lines('예시 기록이 담긴|실제 화면을 마음껏 눌러 보세요.', '둘러본 기록은 저장되지 않아요.')}</p>
   <button type="button" class="ld-btn primary" id="landing-demo2">예시 기록으로 둘러보기 →</button>
  </div>
  <div class="ld-personas">
   <p><b>나와 비슷한 사람의 기록으로 보기</b><br>${lines('성별·나이·체중·목표가 다른|여덟 명의 120일 예시예요.', '누르면 그 사람의 기록으로|앱 전체를 둘러봐요.', '분석과 프리미엄 기능도|모두 열려 있어요.')}</p>
   ${personaCardsHTML()}
  </div>
 </section>

 <section class="ld-sec ld-story">
  <p class="ld-eb">마이로그 이야기</p>
  <h2>log가 아니라, logue</h2>
  <p class="ld-split"><span>My</span><span class="m">log</span><span class="v">ue</span></p>
  <p>${lines('숫자 하나는 기록(log)이지만,', '그 기록이 하루, 한 주, 한 해로 이어지면|이야기(logue)가 돼요.', '그리고 logue 안에는|log가 그대로 숨어 있어요.')}</p>
  <div class="ld-duo">
   <div><b class="m">마이</b><span>${lines('새벽의 작은 빛.', '오늘을 다짐하고,|기록에 “맞아” 하고|도장을 찍어요.')}</span></div>
   <div><b class="v">로그</b><span>${lines('밤을 적는 부엉이.', '하루를 받아 적지만,|혼자 확정하지는 않아요.')}</span></div>
  </div>
  <a class="ld-btn" href="story.html">이야기 전체 보기 →</a>
 </section>

 <section class="ld-sec ld-end" id="ld-end">
  <h2>오늘의 한 줄부터.</h2>
  <p>${lines('손 기록·그래프·검색은|계속 무료예요.', '더 깊은 분석(프리미엄)은|베타 동안 모두에게 열려 있고,', '정식 출시 뒤에는|필요할 때 골라도 충분해요.')}</p>
  <div class="ld-cta">
   <button type="button" class="ld-btn primary" id="landing-signup2">Google로 시작하기</button>
   <button type="button" class="ld-btn" id="landing-demo3">먼저 둘러보기</button>
  </div>
  ${installHTML}
  <p class="ld-fine">${lines('가입은 베타 기간 동안|운영자 승인 뒤에 열려요.', '승인되면 기록이 여러 기기에 이어지고,|가입 없이 쓰면 이 기기에만 저장돼요.')}</p>
  <button type="button" class="ld-link" id="landing-guest">${returning ? '내 기록으로 돌아가기' : '가입 없이 이 기기에서만 써 볼게요'}</button>
  <p class="legal-foot"><a href="privacy.html">개인정보처리방침</a> · <a href="terms.html">이용약관</a> · <a href="story.html">마이로그 이야기</a> · <a href="mailto:studiohooje@gmail.com">문의</a><br>© 2026 Studio Hooje. All rights reserved.</p>
 </section>
 </div>`;
}

export function demoBannerHTML(){
 return `<div class="demo-banner" role="status"><span><b class="nb">둘러보는 중</b> <span class="nb">· 예시 기록이에요.</span> <span class="demo-more">마음껏 눌러 보세요. 내 기록에는 남지 않아요.</span></span><span class="demo-actions"><button type="button" class="demo-persona" data-modal="persona">인물 바꾸기</button><button type="button" class="demo-signup" id="demo-signup">시작하기</button><button type="button" class="demo-exit" id="demo-exit">끝내기</button></span></div>`;
}
