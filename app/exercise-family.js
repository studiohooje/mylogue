// 5.4.9 대표님: 한 종목 안의 소분류(방식). 예: 덤벨 데드리프트 = 일반 · 스티프 레그 · 루마니안.
// 각 방식은 따로 있는 기본 종목이라 기록·성장은 방식별로 쌓이고, 운동 창에서는 한 묶음으로 보여 바로 바꿀 수 있다.
// 2026-11-27 밤샘(대표님 선택 '종목 소분류 늘리기'): 이미 있는 기본 종목을 같은 동작끼리 묶음(새 종목 추가 없음). 한 종목은 한 묶음에만.
// 이 파일은 app.js를 import하지 않는다.
export const EXERCISE_FAMILIES = Object.freeze([
 {name: '바벨 벤치프레스', items: [['플랫', 'exercise:벤치프레스'], ['인클라인', 'exercise:인클라인 벤치프레스'], ['디클라인', 'exercise:디클라인 벤치프레스'], ['클로즈그립', 'exercise:클로즈그립 벤치프레스'], ['와이드 그립', 'exercise:와이드 그립 벤치프레스'], ['리버스 그립', 'exercise:리버스 그립 벤치프레스'], ['플로어', 'exercise:플로어 프레스']]},
 {name: '덤벨 프레스', items: [['플랫', 'exercise:덤벨 벤치프레스'], ['인클라인', 'exercise:인클라인 덤벨 프레스'], ['디클라인', 'exercise:디클라인 덤벨 프레스'], ['플로어', 'exercise:덤벨 플로어 프레스'], ['스퀴즈', 'exercise:덤벨 스퀴즈 프레스'], ['원암', 'exercise:원암 덤벨 체스트프레스']]},
 {name: '스미스 프레스', items: [['플랫', 'exercise:스미스 벤치프레스'], ['인클라인', 'exercise:스미스 인클라인 프레스'], ['디클라인', 'exercise:스미스 디클라인 프레스']]},
 {name: '체스트 프레스 머신', items: [['플랫', 'exercise:체스트 프레스'], ['인클라인', 'exercise:인클라인 체스트 프레스 머신'], ['디클라인', 'exercise:디클라인 체스트 프레스 머신']]},
 {name: '아이소래터럴 체스트 프레스', items: [['플랫', 'exercise:아이소래터럴 체스트 프레스'], ['인클라인', 'exercise:아이소래터럴 인클라인 체스트 프레스'], ['디클라인', 'exercise:아이소래터럴 디클라인 체스트 프레스']]},
 {name: '덤벨 플라이', items: [['플랫', 'exercise:덤벨 플라이'], ['인클라인', 'exercise:인클라인 덤벨 플라이'], ['디클라인', 'exercise:디클라인 덤벨 플라이']]},
 {name: '케이블 플라이', items: [['기본', 'exercise:케이블 플라이'], ['크로스오버', 'exercise:케이블 크로스오버'], ['로우 투 하이', 'exercise:로우 투 하이 케이블 플라이'], ['인클라인', 'exercise:인클라인 케이블 플라이'], ['싱글 암', 'exercise:싱글 암 케이블 플라이']]},
 {name: '푸시업', items: [['기본', 'exercise:푸시업'], ['인클라인', 'exercise:인클라인 푸시업'], ['디클라인', 'exercise:디클라인 푸시업'], ['무릎', 'exercise:니 푸시업'], ['다이아몬드', 'exercise:다이아몬드 푸시업'], ['아처', 'exercise:아처 푸시업'], ['클랩', 'exercise:클랩 푸시업']]},
 {name: '바벨 데드리프트', items: [['컨벤셔널', 'exercise:데드리프트'], ['스모', 'exercise:스모 데드리프트'], ['루마니안', 'exercise:루마니안 데드리프트'], ['스티프 레그', 'exercise:스티프 레그 데드리프트'], ['디피싯', 'exercise:디피싯 데드리프트'], ['랙 풀', 'exercise:랙 풀'], ['트랩바', 'exercise:트랩바 데드리프트']]},
 {name: '덤벨 데드리프트', items: [['일반', 'exercise:덤벨 데드리프트'], ['스티프 레그', 'exercise:덤벨 스티프 레그 데드리프트'], ['루마니안', 'exercise:덤벨 루마니안 데드리프트'], ['스모', 'exercise:덤벨 스모 데드리프트']]},
 {name: '랫풀다운', items: [['와이드', 'exercise:랫풀다운'], ['클로즈그립', 'exercise:클로즈그립 랫풀다운'], ['언더그립', 'exercise:언더그립 랫풀다운'], ['비하인드 넥', 'exercise:비하인드 넥 풀다운'], ['머신', 'exercise:머신 랫풀다운'], ['원암 케이블', 'exercise:원암 케이블 랫풀다운']]},
 {name: '풀업', items: [['기본', 'exercise:풀업'], ['친업', 'exercise:친업'], ['뉴트럴 그립', 'exercise:뉴트럴 그립 풀업'], ['어시스트', 'exercise:어시스트 풀업']]},
 {name: '바벨 로우', items: [['기본', 'exercise:바벨 로우'], ['펜들레이', 'exercise:펜들레이 로우'], ['예이츠', 'exercise:예이츠 로우']]},
 {name: '케이블 로우', items: [['기본', 'exercise:시티드 케이블 로우'], ['와이드 그립', 'exercise:와이드 그립 시티드 로우'], ['원암', 'exercise:원암 케이블 로우']]},
 {name: '덤벨 로우', items: [['원암', 'exercise:원암 덤벨 로우'], ['양손', 'exercise:덤벨 로우'], ['체스트 서포티드', 'exercise:체스트 서포티드 덤벨 로우']]},
 {name: '머신 로우', items: [['기본', 'exercise:아이소래터럴 로우'], ['와이드 그립', 'exercise:와이드 그립 머신 로우'], ['내로우 그립', 'exercise:내로우 그립 머신 로우']]},
 {name: 'T바 로우', items: [['기본', 'exercise:T바 로우'], ['체스트 서포티드', 'exercise:체스트 서포티드 T바 로우']]},
 {name: '바벨 스쿼트', items: [['백', 'exercise:스쿼트'], ['프론트', 'exercise:프론트 스쿼트'], ['박스', 'exercise:박스 스쿼트'], ['세이프티 바', 'exercise:세이프티 바 스쿼트'], ['오버헤드', 'exercise:오버헤드 스쿼트'], ['저처', 'exercise:저처 스쿼트']]},
 {name: '머신 스쿼트', items: [['핵', 'exercise:핵 스쿼트'], ['리버스 핵', 'exercise:리버스 핵 스쿼트'], ['펜듈럼', 'exercise:펜듈럼 스쿼트'], ['브이', 'exercise:브이 스쿼트'], ['벨트', 'exercise:벨트 스쿼트'], ['스미스', 'exercise:스미스 스쿼트']]},
 {name: '덤벨·케틀벨 스쿼트', items: [['고블릿', 'exercise:고블릿 스쿼트'], ['케틀벨 고블릿', 'exercise:케틀벨 고블릿 스쿼트'], ['덤벨', 'exercise:덤벨 스쿼트'], ['덤벨 프론트', 'exercise:덤벨 프론트 스쿼트']]},
 {name: '스플릿 스쿼트', items: [['불가리안', 'exercise:불가리안 스플릿 스쿼트'], ['스플릿', 'exercise:스플릿 스쿼트'], ['스미스 불가리안', 'exercise:스미스 불가리안 스플릿 스쿼트']]},
 {name: '런지', items: [['기본', 'exercise:런지'], ['워킹', 'exercise:워킹 런지'], ['리버스', 'exercise:리버스 런지'], ['사이드', 'exercise:사이드 런지'], ['커시', 'exercise:커시 런지'], ['바벨', 'exercise:바벨 런지'], ['스미스', 'exercise:스미스 런지']]},
 {name: '레그 프레스', items: [['45도', 'exercise:레그 프레스'], ['수평', 'exercise:수평 레그 프레스'], ['버티컬', 'exercise:버티컬 레그 프레스'], ['싱글 레그', 'exercise:싱글 레그 프레스']]},
 {name: '레그 컬', items: [['기본', 'exercise:레그 컬'], ['시티드', 'exercise:시티드 레그 컬'], ['라잉', 'exercise:라잉 레그 컬'], ['스탠딩', 'exercise:스탠딩 레그 컬']]},
 {name: '카프 레이즈', items: [['기본', 'exercise:카프 레이즈'], ['시티드', 'exercise:시티드 카프 레이즈'], ['스탠딩 머신', 'exercise:스탠딩 카프 레이즈 머신'], ['레그 프레스', 'exercise:레그 프레스 카프 레이즈'], ['동키', 'exercise:동키 카프 레이즈'], ['싱글 레그', 'exercise:싱글 레그 카프 레이즈'], ['스미스', 'exercise:스미스 카프 레이즈']]},
 {name: '힙 쓰러스트', items: [['바벨', 'exercise:힙 쓰러스트'], ['머신', 'exercise:힙 쓰러스트 머신'], ['덤벨', 'exercise:덤벨 힙 쓰러스트'], ['스미스', 'exercise:스미스 힙 쓰러스트'], ['싱글 레그', 'exercise:싱글 레그 힙 쓰러스트']]},
 {name: '글루트 브릿지', items: [['기본', 'exercise:글루트 브릿지'], ['바벨', 'exercise:바벨 글루트 브릿지'], ['싱글 레그', 'exercise:싱글 레그 글루트 브릿지']]},
 {name: '덤벨 숄더 프레스', items: [['스탠딩', 'exercise:덤벨 숄더 프레스'], ['시티드', 'exercise:시티드 덤벨 숄더 프레스'], ['아놀드', 'exercise:아놀드 프레스']]},
 {name: '바벨 오버헤드 프레스', items: [['기본', 'exercise:오버헤드 프레스'], ['비하인드 넥', 'exercise:비하인드 넥 프레스'], ['푸시 프레스', 'exercise:푸시 프레스'], ['Z 프레스', 'exercise:Z 프레스']]},
 {name: '레터럴 레이즈', items: [['덤벨', 'exercise:사이드 레터럴 레이즈'], ['케이블', 'exercise:케이블 레터럴 레이즈'], ['머신', 'exercise:머신 레터럴 레이즈']]},
 {name: '리어 델트', items: [['덤벨 플라이', 'exercise:리어 델트 플라이'], ['펙덱', 'exercise:리버스 펙덱'], ['벤트오버', 'exercise:벤트오버 레터럴 레이즈'], ['케이블', 'exercise:케이블 리어 델트 플라이']]},
 {name: '프론트 레이즈', items: [['덤벨', 'exercise:프론트 레이즈'], ['케이블', 'exercise:케이블 프론트 레이즈'], ['바벨', 'exercise:바벨 프론트 레이즈'], ['원판', 'exercise:원판 프론트 레이즈']]},
 {name: '업라이트 로우', items: [['바벨', 'exercise:업라이트 로우'], ['케이블', 'exercise:케이블 업라이트 로우'], ['덤벨', 'exercise:덤벨 업라이트 로우']]},
 {name: '슈러그', items: [['바벨', 'exercise:바벨 슈러그'], ['덤벨', 'exercise:덤벨 슈러그'], ['머신', 'exercise:머신 슈러그'], ['케이블', 'exercise:케이블 슈러그']]},
 {name: '바벨 컬', items: [['스트레이트 바', 'exercise:바벨 컬'], ['EZ바', 'exercise:EZ바 컬'], ['리버스', 'exercise:리버스 컬'], ['드래그', 'exercise:드래그 컬']]},
 {name: '덤벨 컬', items: [['기본', 'exercise:덤벨 컬'], ['인클라인', 'exercise:인클라인 덤벨 컬'], ['컨센트레이션', 'exercise:컨센트레이션 컬'], ['조트맨', 'exercise:조트맨 컬']]},
 {name: '해머 컬', items: [['기본', 'exercise:해머 컬'], ['크로스바디', 'exercise:크로스바디 해머 컬'], ['로프', 'exercise:로프 해머 컬']]},
 {name: '케이블 컬', items: [['기본', 'exercise:케이블 컬'], ['하이 케이블', 'exercise:하이 케이블 컬'], ['베이지안', 'exercise:베이지안 컬']]},
 {name: '프리처 컬', items: [['바벨', 'exercise:프리처 컬'], ['덤벨', 'exercise:덤벨 프리처 컬'], ['머신', 'exercise:머신 프리처 컬']]},
 {name: '케이블 푸시다운', items: [['바', 'exercise:케이블 푸시다운'], ['로프', 'exercise:로프 푸시다운'], ['원암', 'exercise:원암 케이블 푸시다운'], ['리버스 그립', 'exercise:리버스 그립 푸시다운']]},
 {name: '스컬 크러셔', items: [['바벨', 'exercise:스컬 크러셔'], ['EZ바', 'exercise:EZ바 스컬 크러셔']]},
 {name: '오버헤드 익스텐션', items: [['덤벨', 'exercise:오버헤드 트라이셉스 익스텐션'], ['원암 덤벨', 'exercise:원암 덤벨 오버헤드 익스텐션'], ['케이블', 'exercise:케이블 오버헤드 익스텐션']]},
 {name: '킥백', items: [['덤벨', 'exercise:덤벨 킥백'], ['케이블', 'exercise:케이블 트라이셉스 킥백']]},
 {name: '딥스', items: [['기본', 'exercise:딥스'], ['어시스트', 'exercise:어시스트 딥스'], ['벤치', 'exercise:벤치 딥스'], ['머신', 'exercise:트라이셉스 딥 머신']]},
 {name: '크런치', items: [['기본', 'exercise:크런치'], ['케이블', 'exercise:케이블 크런치'], ['머신', 'exercise:앱도미널 크런치 머신'], ['디클라인', 'exercise:디클라인 크런치'], ['리버스', 'exercise:리버스 크런치'], ['바이시클', 'exercise:바이시클 크런치']]},
 {name: '레그 레이즈', items: [['누워서', 'exercise:레그 레이즈'], ['행잉', 'exercise:행잉 레그 레이즈'], ['행잉 니', 'exercise:행잉 니 레이즈'], ['캡틴스 체어', 'exercise:캡틴스 체어 니 레이즈']]},
 {name: '플랭크', items: [['기본', 'exercise:플랭크'], ['사이드', 'exercise:사이드 플랭크'], ['코펜하겐', 'exercise:코펜하겐 플랭크']]},
 {name: '클린', items: [['파워 클린', 'exercise:파워 클린'], ['행 클린', 'exercise:행 클린'], ['클린 앤 저크', 'exercise:클린 앤 저크'], ['클린 앤 프레스', 'exercise:클린 앤 프레스']]},
]);
export function familyOfExercise(id){ return EXERCISE_FAMILIES.find(f => f.items.some(([, x]) => x === id)) || null; }
// 운동 창의 '선택한 종목' 아래: 같은 묶음의 방식 칩(누르면 그 종목으로 바뀜, data-q-ex는 기존 종목 고르기와 같다)
export function familyChipsHTML(id, esc = v => String(v ?? '')){
 const f = familyOfExercise(id); if(!f) return '';
 return `<div class="q-family" role="group" aria-label="${esc(f.name)} 방식"><span class="q-family-label">${esc(f.name)} · 방식</span><div class="q-family-row">${f.items.map(([label, x]) => `<button type="button" class="chip ${x === id ? 'active' : ''}" data-q-ex="${esc(x)}" aria-pressed="${x === id}">${esc(label)}</button>`).join('')}</div></div>`;
}
