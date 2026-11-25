// 4.17.0 필라테스 동작 그림: 동작 479개를 하나하나 그리지 않고 '몸 자세' 14가지로 묶어 자세 그림을 보여 준다.
// 자세를 못 정하면 기구 그림(리포머·캐딜락…)으로 대신한다. 그림 원본: docs/art/pilates-pose-*.png (지시서: docs/art/필라테스_자세그림_GPT_지시서_2026-11-23.md)
import {PILATES_DICT} from './pilates-moves-data.js';
import {exArtHTML, artFile} from './exercise-art-ui.js';

// 순서가 중요: 위에서부터 처음 맞는 자세 하나. 영문 이름(사전) + 한글 이름에 대해 검사한다.
const RULES = [
 ['hang', /pull ups?\b(?!.*push)|hanging|squirrel|reverse pull up|walkover|handstand|knee raises \(hanging|매달|행잉/i],
 ['invert', /roll ?over|jack ?knife|corkscrew|cork-screw|control balance|short spine|long spine|boomerang|leg circles onto head|tower|monkey|tick tock|control front|semi circle|pike|롤오버|잭나이프|코르크스크루/i],
 ['bridge', /bridge|pelvic (curl|lift)|hip rolls|imprint|hamstring press hips up|hips up|브릿지|브리지|펠빅 컬/i],
 ['footwork', /footwork|jumpboard|leg press(es)? \(push|tendon stretch(?! \+)|bend & stretch|lift & lower|single leg \(stott|second position|running|prancing|pumping|ankle exercise|foot press|풋워크|점프보드|펌프/i],
 ['side', /side kick|side leg|sidelying|side lying|side splits?|clam|사이드 킥|사이드 리프트/i],
 ['sidebend', /side bend|mermaid|side sit ?up|side stretch|side body twist|star\b|side to side|머메이드|사이드 벤드|사이드 스트레치/i],
 ['prone', /swan|swimming|breast ?stroke|grasshopper|heel squeeze|single leg kick|one leg kick|double (leg )?kick|rocking|prone|on stomach|pull straps|\bt\b \(|backstroke|horseback|airplane|snake|rotation prone|jumping off|스완|스위밍/i],
 ['plank', /plank|leg pull|push ?up|knee stretch|elephant|long stretch|down stretch|up stretch|arabesque|cat\b|cat prep|cat stretch|mountain climb|knees off|fire hydrant|donkey|tabletop|table top|scapula isolation|long back stretch|frog — facing|crab|플랭크|푸시업|엘리펀트|니 스트레치|캣/i],
 ['teaser', /teaser|rolling|rocker|seal|rolling back|the rocking|티저|롤링/i],
 ['seated', /spine stretch|saw|spine twist|twist|short box|tree|round back|flat back|stomach massage|neck pull|roll ?up|roll ?down|roll back|reach|lean|sitting|seated|around the world|zip|side arm preps sitting|롤업|롤다운|쇼트 박스|숏박스|스파인 스트레치/i],
 ['kneel', /kneeling|chest expansion|thigh stretch|arm circles \(kneel|rowing|hug|shaving|side arm|midback|back rowing|front rowing|arms backward|lat pull|pull down|press down|triceps|biceps|arm series|arm springs|boxing|butterfly|fencing|flying eagle|snow angels|trap strength|arms sideways|push down|backward arms|arm frog|washer|암 스프링|푸시다운|체스트 익스팬션|로잉/i],
 ['stand', /standing|squat|splits?|step (up|down)|ballet|leg stretches|lunge|russian|cleopatra|leg press down|crossover|forward step|backbend|스쿼트|스플릿|스텝업/i],
 ['supinelegs', /leg circles|circles|frogs?|bicycle|scissors|walking|beats|feet in straps|leg springs|leg series|hip circles|hip twist|marching|figure eights|leg and ankle|adductor|hamstring press|magician|spread eagle|leg work|knee raises|single leg extension|hip release|coordination|overhead|leg lift|레그 서클|레그 스프링|시저스|코디네이션/i],
 ['supinecurl', /hundred|leg stretch|criss ?cross|obliques|ab prep|head nods|chin press|forehead|crunch|breathing|teaser prep|chest press|neck roll|shell|spinal rotation|shoulder blade|flossing|reach up|arm circles|pulses|curl|헌드레드|크리스크로스|브리딩/i],
];
// 규칙만으로 틀리게 묶이는 동작 손보기(영문 이름 기준)
const FIX = {
 'Arm Circles': 'supinecurl',      // 매트 암 서클: 누워서 팔 동작
 'Pull Up': 'plank',               // 체어 풀업: 손으로 짚고 엉덩이를 들어 올림(매달리지 않음)
 'Pull Up — One Arm': 'plank',
 'Neck Roll': 'prone',             // 엎드린 스완 뒤에 하는 목 돌리기
 // 5.0.5 자세를 못 정하던 11개
 'Long Box Series': 'prone', 'Feet Pulling Straps (STOTT Advanced)': 'supinelegs',
 'Push Thru Bar': 'seated', 'Rollback Bar': 'seated', 'Push Thru Bar — Reverse Push Thru': 'seated', 'Forward Push-Thru': 'seated',
 'Tuck Into Flexion & Extension (Trapeze)': 'supinelegs', 'Tendon Stretch + Front, Side, Back & Combo': 'plank',
 'Front Balance Control (Going Up — Front)': 'stand', 'Side Balance Control (Going Up — Side)': 'stand', 'One arm prep hand on floor': 'plank',
};
// 자세 → 그림 이름(exercise-art.js 키). 누워 상체 말기는 기존 헌드레드 그림을 쓴다.
const POSE_ART = {supinecurl: '필라테스 매트'};
for (const k of RULES.map(r => r[0])) if (!POSE_ART[k]) POSE_ART[k] = `필라테스 자세:${k}`;
export const POSE_LABEL = {hang:'매달리기', invert:'거꾸로 넘기기', bridge:'브리지', footwork:'누워 발로 밀기', side:'옆으로 누워 다리', sidebend:'옆으로 굽히기', prone:'엎드려 등 펴기', plank:'플랭크·네발', teaser:'앉아 V자 균형', seated:'앉아서 척추', kneel:'무릎 꿇고 팔', stand:'서서 다리', supinelegs:'누워 다리 동작', supinecurl:'누워 상체 말기'};
const APP_ART = {'매트':'필라테스 매트', '리포머':'필라테스 리포머', '리포머 타워':'필라테스 캐딜락', '캐딜락':'필라테스 캐딜락', '체어':'필라테스 체어', '래더 배럴':'필라테스 바렐', '스파인 코렉터':'필라테스 스파인 코렉터', '아크 배럴':'필라테스 아크 배럴'};

const norm = s => String(s || '').replace(/\s/g, '');
const BY = new Map();
for (const r of PILATES_DICT) for (const n of [r[0], r[2], ...(r[3] || [])]) if (n) { const k = norm(n); if (!BY.has(`${k}|${r[1]}`)) BY.set(`${k}|${r[1]}`, r); if (!BY.has(k)) BY.set(k, r); }

// 동작 이름(+기구) → 자세 키. 모르면 null.
export function poseOf(name, apparatus = '') {
 const n = norm(name); if (!n) return null;
 const r = BY.get(`${n}|${apparatus}`) || BY.get(n);
 const en = r ? r[2] : '';
 if (en && FIX[en] && !(en.startsWith('Pull Up') && (r[1] !== '체어'))) return FIX[en];
 const text = `${en} ${r ? r[0] : ''} ${name}`;
 const hit = RULES.find(([, re]) => re.test(text));
 return hit ? hit[0] : null;
}
// 그림 파일 이름(없으면 '')
// 5.0.5 대표님: 자세 그림을 기구별로 더 나눔(리포머 위 풋워크, 체어 위 플랭크…). 기구별 그림이 있으면 그것을, 없으면 지금처럼 자세 그림.
export const appPoseKey = (apparatus, pose) => `필라테스 ${apparatus}:${pose}`;
const appPose = (move, p) => p && move.apparatus && move.apparatus !== '매트' && artFile(appPoseKey(move.apparatus, p)) ? appPoseKey(move.apparatus, p) : '';
export function pilatesArtFile(move = {}) {
 const p = poseOf(move.name, move.apparatus), ap = appPose(move, p);
 return (ap && artFile(ap)) || (p && artFile(POSE_ART[p])) || artFile(APP_ART[move.apparatus] || '') || artFile('필라테스 매트');
}
export function pilatesArtHTML(move = {}, cls = 'ex-art-sm') {
 const p = poseOf(move.name, move.apparatus);
 const ap = appPose(move, p);
 const key = ap ? ap : (p && artFile(POSE_ART[p])) ? POSE_ART[p] : (APP_ART[move.apparatus] && artFile(APP_ART[move.apparatus]) ? APP_ART[move.apparatus] : '필라테스 매트');
 return exArtHTML(key, cls);
}
