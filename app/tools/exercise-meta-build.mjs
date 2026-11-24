// 4.28.0 밤샘 B-1: 기본 종목 229개의 움직임 유형·묶음·주의 부위를 이름 글자 규칙에서 '칸'(exercise-meta.js)으로 굳힌다.
// 앱은 종목 ID가 이 표에 있으면 표를 먼저 쓰고, 없을 때(내 종목·공용 종목)만 이름 규칙을 쓴다 → 규칙을 고쳐도 기본 종목 분류가 몰래 바뀌지 않는다.
// 실행: node tools/exercise-meta-build.mjs → app/exercise-meta.js (바꾼 뒤에는 시험 tests/exercise-meta.test.js의 스냅숏도 함께 바뀐다)
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {EXERCISE_CATALOG} from '../catalog.js';
import {patternOfByName, cautionsOf, familyOf} from '../exercise-knowledge.js';
const APP = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const meta = {};
for (const e of EXERCISE_CATALOG) meta[e.id] = {p: patternOfByName(e), f: familyOf(e), c: cautionsOf(e)};
fs.writeFileSync(path.join(APP, 'exercise-meta.js'), `// 자동 생성(tools/exercise-meta-build.mjs) — 기본 종목의 움직임 유형(p)·묶음(f)·주의 부위(c). 손으로 고칠 때는 이 파일을 고치고 시험 스냅숏을 함께 갱신.\nexport const EXERCISE_META = ${JSON.stringify(meta)};\n`);
console.log(Object.keys(meta).length, '종목');
