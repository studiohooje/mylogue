// 4.12 운동 소모 칼로리(대략): 2024 Adult Compendium of Physical Activities(Herrmann et al., J Sport Health Sci 2024;13(1):6-12)의 MET.
// 총소모 kcal = MET × 체중(kg) × 시간(h). 순소모(운동으로 더 쓴 몫) = (MET − 1) × 체중 × 시간 — 섭취−소모 비교에는 순소모를 쓴다(기초대사·유지 칼로리와 이중 계산 방지).
// 60세 이상은 Older Adult Compendium(MET60+, 0.81 보정)이 더 맞지만 종목 대응이 적어 성인 값 × 0.9로 대략 보정(추정 표시).
// 근력 운동은 종목별이 아니라 세션 시간 × 3.5(02054, 여러 종목 8~15회). 시간은 입력한 운동 시간 → 세트 시각 범위(+세트당 휴식) → 세트 수 × 3분(세트+휴식) 순.
export const MET_TABLE = [
 ['걷기',4.0,'산책'],['빠르게 걷기',4.8,'빠르게걷기 파워워킹 속보'],['달리기',8.0,'러닝 조깅 야외러닝'],['러닝머신',8.0,'트레드밀'],['인터벌 러닝',8.0,'인터벌 스프린트',1],
 ['실내 자전거',6.8,'실내사이클 사이클 고정식자전거'],['야외 자전거',7.0,'자전거 로드바이크 라이딩'],['스피닝',9.0,'스핀 RPM'],['에어바이크',6.8,'어썰트바이크 팬바이크',1],
 ['로잉 머신',7.3,'로잉 로윙 조정머신'],['일립티컬',5.0,'엘립티컬 크로스트레이너'],['스텝밀',9.3,'천국의계단 스테어마스터 계단머신'],['계단 오르기',6.8,'계단'],
 ['스키에르그',10.5,'스키에르그 skierg'],['줄넘기',11.0,'점핑로프'],['수영',5.8,'자유형 평영 배영 접영'],['등산',6.0,'하이킹 산행 트레킹'],
 ['필라테스 매트',1.8,'매트필라테스'],['필라테스 리포머',2.8,'리포머',1],['필라테스 캐딜락',2.8,'캐딜락 트라페즈',1],['필라테스 체어',2.8,'체어 분다체어',1],['필라테스 바렐',2.8,'바렐 래더바렐',1],['필라테스 스파인 코렉터',2.8,'스파인코렉터 스파인 코렉터',1],['필라테스 아크 배럴',2.8,'아크배럴 아크 바렐',1],['필라테스 리포머 타워',2.8,'타워 리포머타워',1],['필라테스 소도구',1.8,'소도구 링 볼 밴드 매직서클',1],
 ['요가',2.3,'요가수업 하타'],['빈야사 요가',2.7,'빈야사 플로우요가'],['핫 요가',3.0,'비크람 핫요가'],['스트레칭',2.3,'유연성'],['클라이밍',5.8,'실내클라이밍 볼더링'],['크로스핏',7.5,'wod 하이록스 펑셔널트레이닝',1],
 // 4.28.0 밤샘 B-2: 2024 Compendium 코드로 확인해 더함 — HIIT 02210, 타바타·버피 02214, 에어로빅 02000, 줌바 02310, 파워 요가 02160, 노르딕 워킹 17302, 아쿠아로빅 02120, 맨몸 서킷 02032
 ['HIIT',7.0,'고강도인터벌 hiit'],['타바타',11.0,'버피 tabata'],['에어로빅',7.3,'에어로빅댄스'],['줌바',6.5,'zumba 댄스피트니스'],['파워 요가',4.0,'파워요가'],['노르딕 워킹',4.3,'노르딕워킹'],['아쿠아로빅',5.3,'수중에어로빅 아쿠아'],['맨몸 서킷',6.0,'홈트 서킷트레이닝 홈트레이닝'],
];
export const STRENGTH_MET = 3.5;
export const BURN_NOTE = '체중·운동 시간·종목 평균값(2024 Compendium)으로 계산한 추정치예요. 실제와 20% 넘게 차이 날 수 있어요.';
const key = t => String(t||'').toLocaleLowerCase('ko').replace(/\s/g,'');
const INDEX = new Map(); for(const [name, met, al, approx] of MET_TABLE){ for(const k of [name, ...String(al).split(' ')]) if(k && !INDEX.has(key(k))) INDEX.set(key(k), {name, met, approx:!!approx}); }
export function metFor(name){
 const k = key(name); if(!k) return null;
 if(INDEX.has(k)) return INDEX.get(k);
 for(const [kk, v] of INDEX) if(k.includes(kk) && kk.length >= 2) return {...v, approx:true};
 if(/필라테스/.test(name)) return {name:'필라테스', met:2.8, approx:true};
 return null;
}
const minutesBetween = (a, b) => { const x = new Date(a).getTime(), y = new Date(b).getTime(); return Number.isFinite(x) && Number.isFinite(y) ? Math.abs(y-x)/60000 : null; };
export function strengthMinutes(workout){
 const sets = (workout.exercises||[]).filter(e => e.kind !== 'cardio').flatMap(e => (e.sets||[]).filter(s => s.completed !== false));
 if(!sets.length) return 0;
 const times = sets.map(s => s.completedAt).filter(Boolean).sort();
 const span = times.length >= 2 ? minutesBetween(times[0], times[times.length-1]) : null;
 if(span != null && span > 0 && span < 240) return Math.round(span + 2);
 return sets.length * 3;
}
// 한 운동 기록의 대략 소모 칼로리. weightKg가 없으면 null. planned·휴식은 0.
export function workoutBurn(workout, weightKg, {age=null}={}){
 if(!(weightKg > 0) || !workout || workout.rest || workout.planned) return null;
 const older = age != null && age >= 60 ? 0.9 : 1;
 let gross = 0, net = 0, approx = older !== 1, unknown = 0, minutes = 0;
 const cardio = (workout.exercises||[]).filter(e => e.kind === 'cardio');
 for(const e of cardio){
  const min = Number(e.durationMin)||0; if(!min) continue;
  const m = metFor(e.name); if(!m){ unknown++; continue; }
  if(m.approx) approx = true;
  gross += m.met*older * weightKg * min/60; net += Math.max(0, m.met*older - 1) * weightKg * min/60; minutes += min;
 }
 const cardioMin = cardio.reduce((s, e) => s + (Number(e.durationMin)||0), 0);
 const auto = strengthMinutes(workout), dur = Number(workout.duration) > 0 ? Number(workout.duration) : 0;
 // 입력한 운동 시간이 있으면 그중 유산소 시간을 뺀 나머지를 근력 시간으로(근력 세트가 있을 때만)
 const smin = auto > 0 ? (dur ? Math.max(0, dur - cardioMin) : auto) : 0;
 if(smin > 0){ gross += STRENGTH_MET*older * weightKg * smin/60; net += (STRENGTH_MET*older - 1) * weightKg * smin/60; minutes += smin; approx = approx || !dur; }
 if(!minutes) return unknown ? {kcal:null, net:null, minutes:0, approx:true, unknown} : null;
 return {kcal:Math.round(gross), net:Math.round(net), minutes:Math.round(minutes), approx, unknown};
}
export function dayBurn(workouts, weightKg, opts){
 let kcal = 0, net = 0, any = false, approx = false;
 for(const w of workouts||[]){ const b = workoutBurn(w, weightKg, opts); if(b?.kcal != null){ kcal += b.kcal; net += b.net; any = true; approx = approx || b.approx; } }
 return any ? {kcal, net, approx} : null;
}
