// 4.17.0 코칭 지식 베이스 — 앱의 규칙 추천과 AI 프롬프트가 함께 쓰는 '근거 있는 기준'.
// 각 항목: id, 내용, 수치, 근거(출처·근거 수준 A 강함/B 보통/C 의견), 쓰는 곳. 의료 판단은 하지 않는다.
// 근거 수준은 일반적인 합의 정도를 뜻하며, 개인에게 맞는지는 전문가와 상의하도록 안내한다.
export const KNOWLEDGE = [
  {id: 'loss-rate', title: '감량 속도', rule: '주당 체중의 0.5~1% 감량이 근손실·요요 위험이 적다. 1%를 넘는 속도가 2주 넘게 이어지면 속도를 늦추도록 안내.', value: {maxWeeklyPct: 1, idealWeeklyPct: [0.5, 1]}, evidence: 'B', source: '널리 쓰이는 임상 권고(주 0.5~1%) — ACSM 입장문(Donnelly 등, Med Sci Sports Exerc 2009;41(2):459-471)은 활동량(주 150~250분 이상) 권고이고 감량 속도 수치는 원문 확인 필요', use: ['safety.loss-too-fast', 'simulator']},
  {id: 'protein-cut', title: '감량 중 단백질', rule: '감량 중에는 체중 kg당 1.2~1.6g(운동하는 사람은 2.2g까지)이 근육 유지에 도움.', value: {perKg: [1.2, 1.6], athleteMax: 2.2}, evidence: 'A', source: 'ISSN 입장문(Jäger 등 2017, 운동하는 사람 1.4~2.0g/kg)·Morton 등 메타분석(Br J Sports Med 2018, 1.6g/kg 넘으면 추가 이득 작음·95% 상한 2.2) — 감량 중 1.2~1.6은 보수적 하한', use: ['info.protein-low'], exclude: ['kidney']},
  {id: 'protein-glp1', title: 'GLP-1 사용 중 단백질·근력', rule: 'GLP-1 계열 약 사용 중에는 식사량이 줄어 근육이 함께 빠지기 쉬워 단백질을 먼저 먹고 근력 운동을 권함(약 조절은 의료진).', value: {perKg: [1.2, 1.6]}, evidence: 'B', source: 'GLP-1 치료 영양 공동 권고(ACLM·ASN·OMA·TOS, Am J Clin Nutr 2025;122(1):344-367 — 단백질·근력 운동으로 근육 보존; 1.2~1.6g/kg 수치는 2차 보도 기준, 원문 확인 필요)', use: ['info.glp1-protein']},
  {id: 'low-intake', title: '너무 적은 섭취', rule: '하루 섭취가 여성 1,200·남성 1,500kcal보다 크게 낮은 날이 이어지면 영양 결핍·폭식 반동 위험. 칭찬하지 않고, 부드럽게 알리고 필요하면 전문가 연결.', value: {female: 1200, male: 1500, ratio: 0.8, days: 3}, evidence: 'B', source: '대한비만학회 지침의 초저열량식 의료 감독 권고·한국인 영양소 섭취기준(2020)', use: ['safety.low-intake']},
  {id: 'ed-signals', title: '섭식장애 위험 신호', rule: '극단적 저섭취 + 폭식·보상 운동 반복, 체중 급감은 위험 신호. 숫자 목표를 멈추고 숫자 숨기기와 상담 안내(국가 정신건강 위기상담 109).', value: {}, evidence: 'B', source: 'NICE 섭식장애 지침(2017)·국내 섭식장애 진료 안내 · 109는 2024-01-01부터 자살예방·정신건강 상담전화 통합번호(24시간, 보건복지부)', use: ['safety.ed-pattern']},
  {id: 'water-swing', title: '하루 체중 출렁임', rule: '짠 음식·탄수화물 많은 날, 생리 전, 강한 운동 다음 날에는 수분으로 0.5~2kg 오를 수 있다. 7일 평균 추세를 본다.', value: {swingKg: [0.5, 2]}, evidence: 'B', source: '체중 일간 변동 연구(Turicchi 등 2020)', use: ['info.water-swing']},
  {id: 'plateau', title: '정체기', rule: '3주 넘게 7일 평균이 거의 그대로면 기록 정확도(빠진 간식·음료)와 활동량을 먼저 살피고, 더 굶기보다 휴식 주간·단백질·수면을 점검.', value: {weeks: 3, flatPctPerWeek: 0.2}, evidence: 'C', source: '감량 정체 관리 임상 권고(전문가 의견)', use: ['info.plateau']},
  {id: 'volume', title: '근력 운동 양', rule: '부위별 주 10세트 안팎이 근성장에 충분한 범위, 같은 부위는 48시간 쉬기.', value: {setsPerWeek: [10, 20], restHours: 48}, evidence: 'A', source: 'ACSM 입장문 개정(2026, Med Sci Sports Exerc — 근비대 부위별 주 약 10세트, 부위별 주 2회 이상)·Schoenfeld 등 메타분석', use: ['info.overreach']},
  {id: 'activity-min', title: '활동 최소 기준', rule: '주 150분 중강도 유산소 + 주 2회 근력 운동이 성인 건강 기준. 못 채워도 조금이라도 움직이면 이득.', value: {aerobicMin: 150, strengthDays: 2}, evidence: 'A', source: 'WHO 신체활동 지침(2020)·한국인 신체활동 지침(2023)', use: ['praise.moved']},
  {id: 'sleep', title: '수면과 식욕', rule: '잠이 6시간 아래인 날 다음 날 식욕·간식이 늘기 쉽다(개인차 큼). 수면은 감량의 일부.', value: {shortH: 6}, evidence: 'B', source: 'Al Khatib 등, 부분 수면 박탈과 에너지 균형 메타분석(Eur J Clin Nutr 2017;71:614-624 — 섭취 +385kcal/일, 소모 변화 없음)', use: ['info.sleep-appetite']},
  {id: 'sodium', title: '나트륨', rule: '하루 나트륨 2,300mg(만성질환 위험 감소 섭취량) 이하가 권고. 참고용으로만 보여 주고 꾸짖지 않는다.', value: {mg: 2300}, evidence: 'A', source: '한국인 영양소 섭취기준(2020) 나트륨 만성질환위험감소섭취량', use: ['info.sodium']},
  {id: 'teen', title: '청소년', rule: '만 18세 이하는 체중 감량 목표·열량 제한을 제안하지 않고, 균형 잡힌 식사와 활동만 안내.', value: {maxAge: 18}, evidence: 'B', source: '소아청소년 비만 진료지침(대한비만학회 2022)', use: ['safety.teen']},
  {id: 'pregnancy', title: '임신·수유', rule: '임신·수유 중에는 감량 목표·열량 제한을 제안하지 않는다. 체중 변화는 의료진과 상의.', value: {}, evidence: 'A', source: '임신 중 체중 증가 권고(IOM 2009)·수유부 영양 섭취기준', use: ['safety.pregnancy']},
  {id: 'kidney', title: '콩팥(신장) 질환', rule: '콩팥 질환이 있으면 단백질을 늘리라는 제안을 하지 않는다. 단백질 목표는 의료진과 정한다.', value: {}, evidence: 'A', source: 'KDIGO 만성콩팥병 지침(2024)', use: ['suppress.protein']},
  {id: 'diabetes-med', title: '혈당약 사용', rule: '인슐린·설폰요소제 등 혈당약을 쓰면 갑자기 많이 굶거나 강하게 운동할 때 저혈당 위험. 큰 변화 전 의료진 상의.', value: {}, evidence: 'A', source: '대한당뇨병학회 진료지침(2025)', use: ['safety.diabetes-med']},
];
export const knowledge = id => KNOWLEDGE.find(k => k.id === id) || null;
// 어떤 사용자에게도 쓰지 않는 말(꾸짖음·체형 비하·의료 단정·재촉). AI 답과 앱 문구 모두 이 목록으로 검사한다.
export const BANNED_PHRASES = ['살쪘', '뚱뚱', '돼지', '실패', '망쳤', '게으르', '의지가 약', '또 안', '꼭 해야', '반드시 빼', '진단', '처방', '치료하', '완치', '굶으', '굶어', '벌칙', '반성'];
export const hasBanned = text => BANNED_PHRASES.filter(p => String(text || '').includes(p));
