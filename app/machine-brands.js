// 3.15.0 제조사 머신 도감(앱 기본 제공). 각 모델은 일반 머신 종류(base)에 연결되고, 부하 방식·좌우·근육 부하를 그 종류에서 물려받는다.
// 모델 이름은 각 제조사 공식 카탈로그(2026-11-21 확인)를 따랐다. 지역·연식에 따라 이름이나 구성이 다를 수 있다.
// 근거: research_notes/gym_machines/brands.md
//  - Hammer Strength Plate-Loaded·Select: lifefitness.com/brands/hammer-strength, /catalog/strength-training/plate-loaded
//  - Life Fitness Insignia: lifefitness.com/insignia-series, support 문서 360043013553
//  - Cybex Prestige Strength VRS·Eagle NX: lifefitness.com/catalog/cybex, support 문서 360036928394
//  - Technogym Selection 900·Pure Strength: technogym.com/category/selection-900
//  - Matrix Ultra·Magnum: matrixfitness.com Strength Brochure 2025
//  - Panatta Fit Evo: panattasport.com 카탈로그(MedicalExpo 제품 목록)
//  - gym80 Pure Kraft: gym80.de, 공식 대리점 목록
const L = (maker, line, unit, models) => ({maker, line, unit, models});
export const BRAND_LINES = Object.freeze([
 L('Hammer Strength', 'Plate-Loaded', 'lb', [
  ['Iso-Lateral Bench Press','chest-press-iso'], ['Iso-Lateral Horizontal Bench Press','chest-press-iso'], ['Iso-Lateral Wide Chest','chest-press-wide'],
  ['Iso-Lateral Incline Press','incline-press-iso'], ['Iso-Lateral Super Incline Press','incline-press-iso'], ['Iso-Lateral Decline Press','decline-press'],
  ['Iso-Lateral Shoulder Press','shoulder-press-iso'], ['Iso-Lateral Row','row-iso'], ['Iso-Lateral D.Y. Row','row-iso'], ['Iso-Lateral Low Row','low-row'],
  ['Iso-Lateral High Row','high-row'], ['Iso-Lateral Front Lat Pulldown','lat-pulldown-iso'], ['Iso-Lateral Wide Pulldown','lat-pulldown-iso'], ['Iso-Lateral T-Bar Row','t-bar-row'],
  ['Linear Leg Press','leg-press-45'], ['Iso-Lateral Leg Press','leg-press-iso'], ['V-Squat','v-squat'], ['Hack Squat','hack-squat'], ['Pendulum-X Squat','v-squat'],
  ['Iso-Lateral Leg Extension','leg-extension-iso'], ['Iso-Lateral Leg Curl','leg-curl-lying'], ['Iso-Lateral Kneeling Leg Curl','leg-curl-kneeling'], ['Seated Calf Raise','calf-seated'],
 ]),
 L('Hammer Strength', 'Select', 'lb', [
  ['Chest Press','chest-press'], ['Shoulder Press','shoulder-press'], ['Pulldown','lat-pulldown'], ['Seated Row','row-machine'], ['Leg Press','leg-press-seated'],
  ['Leg Extension','leg-extension'], ['Seated Leg Curl','leg-curl-seated'], ['Biceps Curl','preacher-curl'], ['Triceps Extension','tricep-ext'],
 ]),
 L('Life Fitness', 'Insignia', 'lb', [
  ['Chest Press','chest-press'], ['Dual Axis Chest Press','chest-press'], ['Shoulder Press','shoulder-press'], ['Pulldown','lat-pulldown'], ['Dual Axis Pulldown','lat-pulldown'],
  ['Seated Row','row-machine'], ['Pectoral Fly / Rear Deltoid','pec-deck'], ['Biceps Curl','preacher-curl'], ['Triceps Extension','tricep-ext'], ['Abdominal','ab-crunch'],
  ['Leg Press','leg-press-seated'], ['Leg Extension','leg-extension'], ['Seated Leg Curl','leg-curl-seated'], ['Hip Abductor','hip-abduction'], ['Hip Adductor','hip-adduction'],
  ['Glute','glute-kickback'], ['Glute Bridge','hip-thrust'],
 ]),
 L('Cybex', 'Prestige Strength VRS', 'lb', [
  ['Chest Press','chest-press'], ['Overhead Press','shoulder-press'], ['Row','row-machine'], ['Leg Press','leg-press-seated'], ['Torso Rotation','torso-rotation'],
 ]),
 L('Cybex', 'Eagle NX', 'lb', [
  ['Chest Press','chest-press'], ['Fly / Rear Delt','pec-deck'], ['Overhead Press','shoulder-press'], ['Pulldown','lat-pulldown'], ['Row','row-machine'],
  ['Arm Curl','preacher-curl'], ['Arm Extension','tricep-ext'], ['Leg Press','leg-press-seated'], ['Leg Extension','leg-extension'], ['Seated Leg Curl','leg-curl-seated'],
 ]),
 L('Technogym', 'Selection 900', 'kg', [
  ['Chest Press','chest-press'], ['Pectoral','pec-deck'], ['Shoulder Press','shoulder-press'], ['Vertical Traction','lat-pulldown'], ['Pulldown','lat-pulldown'],
  ['Low Row','row-machine'], ['Pulley','seated-row'], ['Upper Back','rear-delt'], ['Lower Back','lower-back'], ['Arm Curl','preacher-curl'], ['Arm Extension','tricep-ext'],
  ['Abdominal Crunch','ab-crunch'], ['Leg Press','leg-press-seated'], ['Leg Extension','leg-extension'], ['Leg Curl','leg-curl-seated'], ['Abductor','hip-abduction'], ['Adductor','hip-adduction'],
 ]),
 L('Technogym', 'Pure Strength', 'kg', [
  ['Chest Press','chest-press-iso'], ['Incline Chest Press','incline-press-iso'], ['Shoulder Press','shoulder-press-iso'], ['Low Row','low-row'], ['Leg Press','leg-press-45'], ['Hack Squat','hack-squat'],
 ]),
 L('Matrix', 'Ultra', 'lb', [
  ['Converging Chest Press','chest-press'], ['Converging Shoulder Press','shoulder-press'], ['Lat Pulldown','lat-pulldown'], ['Seated Row','row-machine'], ['Biceps Curl','preacher-curl'],
  ['Triceps Extension','tricep-ext'], ['Rotary Torso','torso-rotation'], ['Abdominal Crunch','ab-crunch'], ['Leg Press','leg-press-seated'], ['Leg Extension','leg-extension'],
  ['Prone Leg Curl','leg-curl-lying'], ['Seated Leg Curl','leg-curl-seated'], ['Hip Abductor','hip-abduction'], ['Hip Adductor','hip-adduction'],
 ]),
 L('Matrix', 'Magnum', 'lb', [
  ['Leg Press','leg-press-45'], ['Hack Squat','hack-squat'], ['Seated Calf','calf-seated'], ['Incline Press','incline-press-iso'], ['Chest Press','chest-press-iso'],
 ]),
 L('Panatta', 'Fit Evo', 'kg', [
  ['Chest Press','chest-press'], ['Inclined Chest Press','incline-press'], ['Shoulder Press','shoulder-press'], ['Pec Deck','pec-deck'], ['Lat Pulldown','lat-pulldown'],
  ['Horizontal Pull','seated-row'], ['Arm Curl','preacher-curl'], ['Triceps Extension','tricep-ext'], ['Back Extension','lower-back'], ['Abdominal Crunch','ab-crunch'],
  ['Rotary Torso','torso-rotation'], ['Leg Press','leg-press-seated'], ['Leg Extension','leg-extension'], ['Leg Curl','leg-curl-seated'], ['Abductor','hip-abduction'],
  ['Adductor','hip-adduction'], ['Calf Raise','calf-standing'], ['Crossover Pulley','cable-crossover'],
 ]),
 L('gym80', 'Pure Kraft', 'kg', [
  ['Strong Leg Press','leg-press-45'], ['45° Linear Leg Press','leg-press-45'], ['45° Pivot Leg Press','leg-press-45'], ['Vertical Leg Press','leg-press-vertical'],
  ['Hack Squat','hack-squat'], ['Pendulum Squat','v-squat'], ['Belt Squat','belt-squat'], ['Squat Machine','power-squat'], ['Leg Extension','leg-extension'],
  ['Lying Leg Curl','leg-curl-lying'], ['Standing Leg Curl','leg-curl-standing'], ['Gluteus Kick','glute-kickback'], ['Incline Chest Press','incline-press-iso'],
  ['Pullover','pullover'], ['Triceps Machine','tricep-ext'],
 ]),
]);
const slug = t => String(t).toLocaleLowerCase('en').replace(/[^a-z0-9°]+/g, '-').replace(/^-|-$/g, '');
// 평평한 목록: {id, builtin, manufacturer, line, model, baseId, unit}
export const BRAND_MODELS = Object.freeze(BRAND_LINES.flatMap(l => l.models.map(([model, base]) => ({id:`bm:${slug(l.maker)}:${slug(l.line)}:${slug(model)}`, builtin:true, manufacturer:l.maker, line:l.line, model, baseId:`gm:${base}`, unit:l.unit}))));
export const BRAND_MAKERS = Object.freeze([...new Set(BRAND_LINES.map(l => l.maker))]);
