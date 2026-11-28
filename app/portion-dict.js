// 4.17.0 분량 사전: 사람이 말하는 양('반 공기', '두 조각', '한 줌')을 음식 종류별 g(ml)으로 바꾼다.
// 기준: 식약처 1회 섭취참고량·한국인 영양소 섭취기준(2020) 식품군별 1회 분량·대한영양사협회 식품교환표의 흔한 값,
// 프랜차이즈 공개 중량의 흔한 범위. 모두 '대표값(추정)'이며 기록 화면에서 사람이 바꿀 수 있다.
// 쓰는 곳: 말로 적기(백 온 트랙·AI 입력 해석), 빠른 입력 단위 바꾸기, 나눠 먹은 양.

// 음식 종류 → 단위별 g(ml). 위에서부터 처음 맞는 종류를 쓴다.
export const PORTION_RULES = [
  /* 2026-11-28 대표님: 닭가슴살·닭다리살·닭안심은 비닐 포장 100g이 한 '팩' — '장'보다 분명 */{kind: '닭팩', re: /^(?!.*(소시지|핫도그|샐러드|볶음|밥|만두|너겟|까스|커틀릿|도시락|죽|샌드위치|버거|피자|랩|김밥|볼|칩|육포|소스|탕|찜|조림|무침|덮밥|카레|파스타|면)).*(닭가슴살|닭다리살|닭\s*안심)/, units: {팩: 100, 덩이: 100, 조각: 30, 인분: 150, 손바닥: 100}, first: '팩'},
  /* 2026-11-28 뼈 있는 닭다리는 '개'(먹는 부분 약 70g) */{kind: '닭다리', re: /닭다리(?!살)/, units: {개: 70, 조각: 30, 인분: 150}, count: true},
  {kind: '밥', re: /(^|\s)(쌀밥|흰밥|잡곡밥|현미밥|보리밥|흑미밥|오곡밥|콩밥|밥)$|공깃밥|햇반/, units: {공기: 210, 그릇: 210, 고봉: 300, 주걱: 100, 숟가락: 15, 인분: 210}},
  {kind: '죽', re: /죽$/, units: {그릇: 300, 인분: 300, 공기: 250}},
  {kind: '국', re: /국$|탕$|곰탕|설렁탕|미역국|무국/, units: {그릇: 250, 인분: 250, 국자: 80, 공기: 200}},
  {kind: '찌개', re: /찌개$|전골$|짜글이/, units: {그릇: 200, 인분: 200, 국자: 80, 냄비: 600}},
  {kind: '라면', re: /라면|컵라면|짜파게티|불닭/, units: {봉지: 1, 개: 1, 인분: 1}, note: '라면은 제품 1봉(개) 단위로 기록'},
  {kind: '면', re: /국수|냉면|우동|칼국수|소바|쌀국수|파스타|스파게티|짜장면|짬뽕|비빔면/, units: {그릇: 1, 인분: 1, 접시: 1}, note: '면 요리는 1인분(그릇) 단위'},
  {kind: '김밥', re: /김밥/, units: {줄: 230, 개: 230, 조각: 23, 알: 23}},
  {kind: '떡볶이', re: /떡볶이|라볶이/, units: {인분: 300, 그릇: 300, 접시: 300, 개: 15, 조각: 15}},
  {kind: '치킨', re: /치킨|닭강정|후라이드|프라이드|양념반|순살/, units: {마리: 1, 조각: 70, 개: 70, 인분: 1}, share: true, note: '치킨 1조각은 뼈 포함 약 70g(부위마다 다름)'},
  {kind: '피자', re: /피자/, units: {판: 1, 조각: 0.125, 인분: 0.25}, share: true, note: '피자 1조각 = 한 판의 1/8(L 기준)'},
  {kind: '족발보쌈', re: /족발|보쌈/, units: {인분: 250, 접시: 500, 점: 25, 조각: 25}, share: true},
  {kind: '고기구이', re: /삼겹살|목살|갈비|등심|안심|차돌|항정|구이$|불고기/, units: {인분: 200, 점: 15, 조각: 15, 장: 30, 접시: 400}, share: true},
  {kind: '회', re: /회$|사시미|초밥/, units: {인분: 200, 접시: 400, 점: 15, 개: 25, 피스: 25}, share: true},
  {kind: '전', re: /전$|부침개|파전|빈대떡|동그랑땡|육전/, units: {장: 150, 조각: 40, 개: 40, 인분: 150}},
  {kind: '만두', re: /만두|교자|딤섬/, units: {개: 30, 알: 30, 인분: 200, 접시: 300}, count: true},
  {kind: '빵', re: /빵$|식빵|베이글|크루아상|모닝빵|토스트|샌드위치|머핀|도넛/, units: {개: 1, 조각: 1, 장: 1}, note: '빵은 제품 1개 단위가 정확'},
  {kind: '떡', re: /떡$|인절미|송편|가래떡|백설기|시루떡/, units: {개: 30, 조각: 30, 팩: 200, 인분: 150}},
  /* 5.1.0 음식 단위 검수: 개수로 먹는데 사전에 없던 음식 */
  {kind: '핫도그소시지', re: /핫도그|소시지|소세지|후랑크|프랑크/, units: {개: 60, 줄: 60}, count: true},
  {kind: '작은귤', re: /^귤|감귤|키위|자두|살구|금귤/, units: {개: 80, 알: 80}, count: true},
  {kind: '고구마감자', re: /고구마|감자(?!탕|볶음|조림|채)|단호박/, units: {개: 150, 조각: 50, 토막: 50}, count: true},
  {kind: '옥수수', re: /옥수수(?!.*(분말|가루|기름|통조림|콘))/, units: {개: 150, 자루: 150}, count: true},
  {kind: '어묵', re: /어묵|오뎅/, units: {장: 30, 개: 15, 꼬치: 30}, count: true},
  {kind: '주먹밥', re: /주먹밥|삼각김밥|유부초밥/, units: {개: 110}, count: true},
  {kind: '치즈', re: /슬라이스\s*치즈|체다\s*치즈|치즈\s*슬라이스/, units: {장: 18}, count: true},
  {kind: '달걀', re: /달걀|계란|에그|메추리알/, units: {개: 50, 알: 50, 판: 1500}, count: true},
  {kind: '두부', re: /두부/, units: {모: 300, '반 모': 150, 조각: 40, 팩: 300}},
  {kind: '과일', re: /사과|배$|바나나|귤|오렌지|키위|복숭아|참외|감$|자두/, units: {개: 150, 알: 150, 조각: 30, 쪽: 30}, count: true, note: '중간 크기 가식부 기준(사과·배는 더 큼)'},
  {kind: '작은과일', re: /포도|블루베리|딸기|방울토마토|체리|샤인머스캣/, units: {알: 8, 개: 15, 송이: 300, 컵: 150, 줌: 80}},
  {kind: '수박멜론', re: /수박|멜론/, units: {조각: 200, 쪽: 200, 컵: 150}},
  {kind: '견과', re: /견과|아몬드|호두|땅콩|캐슈|피스타치오|마카다미아|잣/, units: {줌: 25, 알: 1.2, 봉: 25, 개: 1.2}},
  {kind: '채소', re: /샐러드|나물|무침|김치$|깍두기|겉절이|채소/, units: {접시: 100, 인분: 70, 그릇: 100, 젓가락: 15, 줌: 50}},
  /* 2026-11-28 대표님: 생고기는 '1장'이 어색 — 손바닥만 한 '덩이'(100g)로 센다 */{kind: '고기', re: /닭가슴살|닭다리|소고기|돼지고기|닭고기|오리고기|스테이크/, units: {덩이: 100, 조각: 30, 인분: 150, 손바닥: 100}, first: '덩이'},
  {kind: '생선', re: /고등어|연어|갈치|조기|삼치|꽁치|생선|참치/, units: {토막: 70, 마리: 150, 조각: 70, 인분: 70}},
  {kind: '우유음료', re: /우유|두유|요거트|요구르트|라떼/, units: {잔: 200, 컵: 200, 팩: 200, 병: 200}},
  {kind: '커피', re: /커피|아메리카노|에스프레소|콜드브루/, units: {잔: 355, 컵: 355, 샷: 30}},
  {kind: '소주', re: /소주/, units: {잔: 50, 병: 360}},
  {kind: '맥주', re: /맥주|생맥|라거|에일/, units: {잔: 500, 캔: 355, 병: 500, 'cc': 1, 피처: 1600}},
  {kind: '와인', re: /와인|샴페인/, units: {잔: 150, 병: 750}},
  {kind: '막걸리', re: /막걸리/, units: {잔: 200, 사발: 300, 병: 750}},
  {kind: '음료', re: /주스|콜라|사이다|에이드|탄산|음료|스무디/, units: {잔: 250, 컵: 250, 캔: 355, 병: 500}},
  {kind: '양념', re: /소스|드레싱|마요|케첩|간장|고추장|된장|쌈장|참기름|올리브유|버터|잼|꿀|설탕/, units: {큰술: 15, 작은술: 5, 숟가락: 15, 티스푼: 5}},
];
// 어떤 음식에도 쓰는 일반 단위(사전에 종류가 없을 때)
export const GENERIC_UNITS = {큰술: 15, 작은술: 5, 숟가락: 15, 컵: 200, 국자: 80, 줌: 30, 손바닥: 100, 주먹: 150, 엄지: 15};

// 한국어 수량 읽기: '반', '한', '두', '1/2', '1.5', '세 개 반'
const KNUM = {한: 1, 하나: 1, 일: 1, 두: 2, 둘: 2, 이: 2, 세: 3, 셋: 3, 삼: 3, 네: 4, 넷: 4, 사: 4, 다섯: 5, 오: 5, 여섯: 6, 육: 6, 일곱: 7, 칠: 7, 여덟: 8, 팔: 8, 아홉: 9, 구: 9, 열: 10};
export function readQty(text) {
  const s = String(text ?? '').trim();
  if (!s) return null;
  if (/^반$/.test(s)) return 0.5;
  let m = s.match(/^(\d+)\s*\/\s*(\d+)$/); if (m && Number(m[2])) return Number(m[1]) / Number(m[2]);
  m = s.match(/^(\d+(?:\.\d+)?)\s*(반)?$/); if (m) return Number(m[1]) + (m[2] ? 0.5 : 0);
  m = s.match(/^([가-힣]+?)\s*(반)?$/); if (m && KNUM[m[1]] != null) return KNUM[m[1]] + (m[2] ? 0.5 : 0);
  return null;
}
// 5.1.0 g·ml 음식을 '개수'로도 넣기: 이름에 맞는 개수 단위와 1개 무게(g). 비율 단위(1=제품 1개)는 g 음식에 못 쓰므로 뺀다.
const COUNT_ORDER = ['개', '장', '알', '조각', '토막', '줄', '모', '꼬치', '자루', '쪽'];
/* 통째로 먹는 재료(달걀·과일·고구마·옥수수)는 요리·가공품이면 개수로 보지 않는다(달걀찜 '1개 50g'처럼 틀리지 않게) */const WHOLE = new Set(['달걀', '과일', '작은귤', '고구마감자', '옥수수', '작은과일', '핫도그소시지', '어묵', '고기', '닭다리' /* 2026-11-28 닭가슴살 볶음밥 1장 같은 일 막기 */]);
const DISH = /찜|말이|탕|국|볶음|조림|무침|전$|죽|밥|국수|덮밥|샐러드|샌드위치|파이|빵|케이크|주스|즙|잼|청$|칩|분말|가루|말린|건조|통조림|소스|드레싱|우유|라떼|음료|스무디|튀김|프라이|후라이|스크램블|오믈렛|토스트|쿠키|맛탕|스틱/;
export function countUnitFor(name){const r = ruleFor(name);if(!r)return null;if(WHOLE.has(r.kind) && DISH.test(String(name).replace(/\(.*?\)/g, ' ')))return null;for(const u of r.first ? [r.first, ...COUNT_ORDER] : COUNT_ORDER){const g = r.units?.[u];if(g > 1)return {unit: u, grams: g, count: !!r.count, kind: r.kind}}return null}
export function ruleFor(name) { const n = String(name ?? '').trim(); return PORTION_RULES.find(r => r.re.test(n)) || null; }
// 음식 이름 + 단위 → {grams, perWhole}: g이 아닌 비율 단위(피자 조각=0.125판, 라면 1봉)는 perWhole로 돌려준다
export function portionOf(name, unit) {
  const u = String(unit ?? '').trim(); const r = ruleFor(name);
  const v = r?.units?.[u] ?? GENERIC_UNITS[u];
  if (v == null) return null;
  if (r && v <= 1 && !['cc'].includes(u)) return {kind: r.kind, perWhole: v, note: r.note || ''};
  return {kind: r?.kind || '일반', grams: v, note: r?.note || '', estimate: true};
}
// '반 공기', '두 조각', '피자 3조각', '치킨 반 마리' 같은 표현에서 수량·단위 읽기
const UNIT_WORDS = [...new Set([...PORTION_RULES.flatMap(r => Object.keys(r.units)), ...Object.keys(GENERIC_UNITS), 'g', 'ml', 'kg', '개', '인분'])].sort((a, b) => b.length - a.length);
const KWORDS = Object.keys(KNUM).sort((a, b) => b.length - a.length).join('|');
const esc = u => u.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
export function readAmount(text) {
  const s = ' ' + String(text ?? '').replace(/\s+/g, ' ').trim();
  for (const u of UNIT_WORDS) {
    // 숫자(붙여 써도 됨) 또는 띄어 쓴 한국어 수사, 그다음 '반'(앞뒤), 단위
    const re = new RegExp(`(?:(\\d+\\s*/\\s*\\d+|\\d+(?:\\.\\d+)?)|\\s(${KWORDS}))?\\s*(반\\s*)?${esc(u)}(\\s*반)?(?![가-힣])`);
    const m = s.match(re); if (!m) continue;
    const word = m[1] ?? m[2];
    let q = word ? readQty(word) : 1; if (q == null) q = 1;
    if (m[3] && !word) q = 0.5; else if (m[3] || m[4]) q += 0.5;
    return {qty: q, unit: u, rest: s.replace(m[0], ' ').replace(/\s+/g, ' ').trim()};
  }
  return null;
}
// 나눠 먹은 양: 같이 먹은 사람 수(내 몫 = 1/n) 또는 직접 조각 수
export const shareFactor = people => { const n = Math.round(Number(people)); return Number.isFinite(n) && n >= 1 && n <= 20 ? 1 / n : 1; };
export const isShareFood = name => !!ruleFor(name)?.share;
