// 2026-11-27 대표님: '팔'을 이두·삼두로 나눠 기록·통계한다. 종목 사전은 주 근육으로 나누고,
// 예전 기록에 저장된 '팔'은 그대로 둔 채 보여 줄 때만 같은 규칙으로 나눈다(원본을 고치지 않음).
// 이 파일은 다른 앱 모듈을 import하지 않는다(어디서든 써도 순환 없음).
const TRI = /푸시다운|트라이셉|킥백|딥스|딥 머신|스컬|프렌치|JM|다이아몬드|클로즈 ?그립|오버헤드 익스텐션|익스텐션 머신/;
export function armPart(name = '', primary = []){
 const p = new Set(primary || []);
 if(p.has('triceps') && !p.has('biceps')) return '삼두';
 if((p.has('biceps') || p.has('forearms')) && !p.has('triceps')) return '이두';
 return TRI.test(String(name)) ? '삼두' : '이두';
}
// 기록·도감 항목의 부위(예전 '팔'이면 이두/삼두로)
export const partOf = x => x?.part === '팔' ? armPart(x.name || x.exerciseId || '', x.primaryMuscleIds || []) : (x?.part || '');
