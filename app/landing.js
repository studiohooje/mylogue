// 4.9.0 로그인 전 첫 화면(랜딩)과 '둘러보기' 체험.
// - 랜딩: 로그인하지 않았고, 이 기기에 기록이 없고, '로그인 없이 시작'을 고르지 않았을 때만 보인다(기존 게스트 기록은 그대로).
// - 둘러보기: 예시 기록을 'demo-tour' 저장 칸에 따로 만들어 실제 앱 화면을 써 보게 한다. 진짜 기록과 섞이지 않고, 끝내면 지운다.
// 문구 원칙: 기록만으로도 이미 절반을 해낸 거라고 말해 준다. 프리미엄은 '필요하면' 정도로만.
export const DEMO_ACCOUNT = 'demo-tour';
const SKIP_KEY = 'mylogue.landing.skip', DEMO_FLAG = 'mylogue.demo';
const ls = {get:k => { try{ return localStorage.getItem(k); }catch{ return null; } }, set:(k, v) => { try{ localStorage.setItem(k, v); }catch{} }, del:k => { try{ localStorage.removeItem(k); }catch{} }};
const ss = {get:k => { try{ return sessionStorage.getItem(k); }catch{ return null; } }, set:(k, v) => { try{ sessionStorage.setItem(k, v); }catch{} }, del:k => { try{ sessionStorage.removeItem(k); }catch{} }};

export const demoRequested = () => ss.get(DEMO_FLAG)==='1';
export const startDemo = () => ss.set(DEMO_FLAG, '1');
export function endDemo(){
 ss.del(DEMO_FLAG);
 try{ for(const k of Object.keys(localStorage)) if(k.includes(`.user.${DEMO_ACCOUNT}`)) localStorage.removeItem(k); }catch{}
}
export const landingSkipped = () => ls.get(SKIP_KEY)==='1';
export const skipLanding = () => ls.set(SKIP_KEY, '1');
export const hasRecords = db => !!((db.body||[]).length || (db.meals||[]).length || (db.workouts||[]).length);
export const showLanding = ({user, db, demo}) => !user && !demo && !landingSkipped() && !hasRecords(db);

// ---- 둘러보기 예시 기록(최근 14일). 숫자는 화면을 보여 주기 위한 예시다. g 단위는 100g당 값(도메인 계약), 개·공기·그릇·인분은 1단위당 값. ----
const pad = n => String(n).padStart(2, '0');
const ymd = d => `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
const at = (date, hh, mm=0) => new Date(`${date}T${pad(hh)}:${pad(mm)}:00`).toISOString();
export function demoRecords(todayStr){
 const base = new Date(`${todayStr}T12:00:00`), days = [];
 for(let i=13; i>=0; i--){ const d = new Date(base); d.setDate(base.getDate()-i); days.push(ymd(d)); }
 const body = [], meals = [], workouts = [];
 const meal = (date, h, name, qty, unit, kcal, c, p, f, slot) => meals.push({date, loggedAt:at(date, h, 10), name, servingQty:qty, servingUnit:unit, calories:kcal, carbs:c, protein:p, fat:f, slot, source:'demo'});
 days.forEach((date, i) => {
  const w = Math.round((76.8 - i*0.11 + (i%3===0 ? 0.25 : 0)) * 10) / 10;
  body.push({date, weight:w, measure:'scale', source:'demo', createdAt:at(date, 7, 40), updatedAt:at(date, 7, 40)});
  if(i===0 || i===13) body.push({date, weight:i ? w : 76.8, bodyFatPct:i ? 24.1 : 25.6, skeletalMuscle:i ? 31.2 : 30.6, bodyFatMass:i ? 18.3 : 19.7, bmi:i ? 24.7 : 25.1, measure:'inbody', source:'demo', createdAt:at(date, 8, 5), updatedAt:at(date, 8, 5)});
  meal(date, 8, '그릭요거트 (플레인)', 150, 'g', 97, 4, 10, 4, '아침');
  meal(date, 8, '바나나', 1, '개', 105, 27, 1, 0, '아침');
  if(i%2){ meal(date, 12, '닭가슴살 (익힌 것)', 130, 'g', 165, 0, 31, 4, '점심'); meal(date, 12, '현미밥', 1, '공기', 315, 68, 7, 2, '점심'); }
  else { meal(date, 12, '비빔밥', 1, '그릇', 600, 90, 20, 16, '점심'); }
  if(i===13){ meal(date, 19, '샐러드 채소', 120, 'g', 20, 4, 1, 0, '저녁'); meal(date, 19, '두부', 150, 'g', 84, 2, 9, 5, '저녁'); }
  else if(i%3===0){ meal(date, 19, '김치찌개', 1, '인분', 250, 10, 18, 15, '저녁'); meal(date, 19, '쌀밥 (백미)', 1, '공기', 300, 66, 5, 1, '저녁'); }
  else if(i<13){ meal(date, 19, '연어 구이', 150, 'g', 206, 0, 22, 12, '저녁'); meal(date, 19, '고구마 (찐 것)', 150, 'g', 130, 31, 1, 0, '저녁'); }
  if(i%2===0 && i<13){
   const lower = i%4===0;
   workouts.push({date, title:lower ? '하체 데이' : '등·가슴', gymName:'우리 동네 헬스장', loggedAtTime:'19:30', exercises:lower ? [
    {name:'스쿼트', part:'하체', kind:'strength', sets:[0,1,2].map(k => ({weight:60+k*5+Math.floor(i/4)*2.5, unit:'kg', reps:8, completed:true}))},
    {name:'레그프레스', part:'하체', kind:'strength', sets:[0,1,2].map(() => ({weight:140, unit:'kg', reps:12, completed:true}))}
   ] : [
    {name:'랫풀다운', part:'등', kind:'strength', sets:[0,1,2].map(() => ({weight:50+Math.floor(i/4)*2.5, unit:'kg', reps:10, completed:true}))},
    {name:'벤치프레스', part:'가슴', kind:'strength', sets:[0,1,2].map(k => ({weight:45+k*2.5, unit:'kg', reps:8, completed:true}))}
   ]});
  }
  if(i===7 || i===13) workouts.push({date, title:'필라테스 리포머', gymName:'필라테스 스튜디오', loggedAtTime:'10:00', exercises:[{name:'필라테스 리포머', part:'필라테스', kind:'cardio', durationMin:50, sessionType:'개인', sets:[], moves:[
   {name:'풋워크', apparatus:'리포머', springs:[{c:'빨강', n:i===13 ? 2 : 3}], reps:10, level:2, setup:'풋바 2'},
   {name:'헌드레드', apparatus:'리포머', springs:[{c:'파랑', n:1}], reps:100, level:2},
   {name:'엘리펀트', apparatus:'리포머', springs:[{c:'빨강', n:1}], reps:8, level:i===13 ? 3 : 2}
  ]}]});
 });
 return {body, meals, workouts};
}

// ---- 화면 ----
const halo = `<svg class="ld-halo" viewBox="0 0 320 210" aria-hidden="true"><defs><linearGradient id="ldhg" x1="0" x2="1"><stop offset="0" stop-color="#f2b49b"/><stop offset=".5" stop-color="#8ce4e0"/><stop offset="1" stop-color="#b48cff"/></linearGradient></defs><path d="M40 150 A120 120 0 0 1 280 150" fill="none" stroke="rgba(255,255,255,.08)" stroke-width="10" stroke-linecap="round"/><path class="ld-arc" d="M40 150 A120 120 0 0 1 280 150" fill="none" stroke="url(#ldhg)" stroke-width="10" stroke-linecap="round"/><circle class="ld-dot" cx="110" cy="188" r="12" fill="#f2b49b"/><circle class="ld-dot d2" cx="160" cy="188" r="12" fill="#8ce4e0"/><circle class="ld-dot d3" cx="210" cy="188" r="12" fill="#b8aaf2"/></svg>`;
const feature = (k, t, d) => `<article class="ld-feat"><span class="ld-feat-k">${k}</span><h3>${t}</h3><p>${d}</p></article>`;

export function landingHTML({installHTML=''}={}){
 return `<div class="landing">
 <header class="ld-top"><span class="ld-brand"><img src="icon.svg" alt="">마이로그</span><button type="button" class="ld-login" id="landing-login">로그인</button></header>

 <section class="ld-hero">
  <div class="ld-sky" aria-hidden="true"></div>
  ${halo}
  <p class="ld-word" aria-label="Mylogue">My<b>log</b>ue</p>
  <h1>기록만으로,<br>이미 절반은 해냈어요.</h1>
  <p class="ld-lead">칼같은 식단, 땀 흘리는 운동이 필요한 날도 오겠지만 — 그 전에 오늘 남긴 한 줄이 먼저예요. 기록하는 사람은 이미 남들보다 한 걸음 앞에 있어요.</p>
  <div class="ld-cta">
   <button type="button" class="ld-btn primary" id="landing-signup">Google로 시작하기</button>
   <button type="button" class="ld-btn" id="landing-demo">로그인 전에 둘러보기</button>
  </div>
  <button type="button" class="ld-link" id="landing-guest">가입 없이 이 기기에서만 써 볼게요</button>
 </section>

 <section class="ld-sec">
  <p class="ld-eb">왜 기록인가요</p>
  <h2>숫자 하나가,<br>당신을 증명해요</h2>
  <div class="ld-quotes">
   <p><b>“오늘 뭐 먹었더라?”</b>를 아는 사람은 이미 조절을 시작한 사람이에요.</p>
   <p><b>지난주보다 1kg 더</b> 든 걸 아는 사람은, 다음 주도 들어요.</p>
   <p><b>빠진 날이 보이는 것</b>만으로, 다시 시작할 이유가 생겨요.</p>
  </div>
  <p class="ld-note">마이로그는 재촉하지 않아요. 먹으라고, 운동하라고 조르는 알림은 없어요. 쓰고 싶을 때 쓰면, 쌓인 기록이 대신 말해 줘요.</p>
 </section>

 <section class="ld-sec">
  <p class="ld-eb">로그인하면 이런 것들이</p>
  <h2>몸 · 식사 · 운동,<br>하루가 한 줄로 이어져요</h2>
  <div class="ld-feats">
   ${feature('헤일로', '오늘의 기록이 원호로', '기록할 때마다 하루의 원호가 이어지고, 몸·식사·운동 세 점이 켜지면 오늘이 완성돼요.')}
   ${feature('식단', '목표선까지 한눈에', '칼로리와 탄단지를 목표선 막대로. 모자라면 “단백질 30g 부족”처럼 알려 줘요. GLP-1을 쓰는 분은 단백질부터.')}
   ${feature('운동', '내 헬스장 머신 그대로', '그 헬스장에 있는 머신이 맨 위에. 지난번 무게가 자동으로 채워지고, ‘같은 값으로 한 세트 더’ 한 번이면 끝.')}
   ${feature('인바디', '결과지 사진 한 장', '인바디 결과지를 찍으면 체중·골격근·체지방이 한 번에. 체중계 기록과 나란히 흐름으로 봐요.')}
   ${feature('AI', '말하듯 남기면, 초안으로', '“점심 비빔밥, 저녁 닭가슴살” 하고 남기면 AI가 받아 적어요. 확정은 언제나 내가 해요.')}
   ${feature('코치', '내 강사님과 연결', 'PT·필라테스 강사님이 보낸 수업을 확인하고 확정하면 내 기록이 돼요. 기록의 주인은 나예요. <small>(시험 중)</small>')}
  </div>
  <div class="ld-try">
   <p><b>말보다 직접 보는 게 빠르죠.</b><br>예시 기록이 담긴 실제 화면을 마음껏 눌러 보세요. 둘러본 기록은 저장되지 않아요.</p>
   <button type="button" class="ld-btn primary" id="landing-demo2">예시 기록으로 둘러보기 →</button>
  </div>
 </section>

 <section class="ld-sec ld-story">
  <p class="ld-eb">마이로그 이야기</p>
  <h2>log가 아니라, logue</h2>
  <p class="ld-split"><span>My</span><span class="m">log</span><span class="v">ue</span></p>
  <p>숫자 하나는 기록(log)이지만, 그 기록이 하루, 한 주, 한 해로 이어지면 이야기(logue)가 돼요. 그리고 logue 안에는 log가 그대로 숨어 있어요.</p>
  <div class="ld-duo">
   <div><b class="m">마이</b><span>새벽의 작은 빛. 오늘을 다짐하고, 기록에 “맞아” 하고 도장을 찍어요.</span></div>
   <div><b class="v">로그</b><span>밤을 적는 부엉이. 하루를 받아 적지만, 혼자 확정하지는 않아요.</span></div>
  </div>
  <a class="ld-btn" href="story.html">이야기 전체 보기 →</a>
 </section>

 <section class="ld-sec ld-end">
  <h2>오늘의 한 줄부터.</h2>
  <p>기록은 지금처럼 무료예요. 더 깊은 분석이 필요해지면, 그때 골라도 충분해요.</p>
  <div class="ld-cta">
   <button type="button" class="ld-btn primary" id="landing-signup2">Google로 시작하기</button>
   <button type="button" class="ld-btn" id="landing-demo3">먼저 둘러보기</button>
  </div>
  ${installHTML}
  <p class="ld-fine">가입하면 기록이 여러 기기에 이어져요. 가입 없이 쓰면 이 기기에만 저장돼요.</p>
 </section>
 </div>`;
}

export function demoBannerHTML(){
 return `<div class="demo-banner" role="status"><span><b>둘러보는 중</b> · 예시 기록이에요. 마음껏 눌러 보세요. 내 기록에는 남지 않아요.</span><span class="demo-actions"><button type="button" class="demo-signup" id="demo-signup">Google로 시작하기</button><button type="button" class="demo-exit" id="demo-exit">둘러보기 끝내기</button></span></div>`;
}
