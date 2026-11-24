// 4.28.0 밤샘 C-3: 화면 문구 전수 검사기. 앱 소스의 한국어 문장을 뽑아 말투 규칙을 본다.
// 규칙(대표님 원칙·전수검사 DOC-05): 비난·죄책감 말 금지, 의료 진단·예측·처방·단정 금지, 운동은 점수 말고 칭찬, '대분류' 금지.
// 문장 단위로 보고, 허용 문맥(예: "의료진과 상의", "진단하지 않아요")은 예외 목록으로 둔다.
// 실행: node tools/copy-audit.mjs → research_notes/night/C3/copy-audit.md·strings.json  (시험: tests/copy-audit.test.js)
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {BANNED_PHRASES} from '../coach-knowledge.js';
const APP = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const RULES = [
 {id: 'blame', level: 'high', re: new RegExp(BANNED_PHRASES.map(x => x.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')), why: '비난·죄책감(코칭 금지 표현)'},
 {id: 'diagnose', level: 'high', re: /(진단|처방|치료(하|해|가|를|법)|완치|질환이에요|병이에요|증상이에요)/, why: '의료 진단·처방처럼 읽힘'},
 {id: 'predict', level: 'mid', re: /(될 거예요|빠질 거예요|찔 거예요|일 거예요|확실히 (빠|줄|늘)|보장)/, why: '결과 예측·보장'},
 {id: 'must', level: 'mid', re: /(반드시|꼭 (해야|드셔야|하셔야|빼야)|해야만|절대 (먹|하)지)/, why: '단정·지시 말투'},
 {id: 'fear', level: 'mid', re: /(위험합니다|위험해요|큰일|심각(해요|합니다))/, why: '겁주는 말'},
 {id: 'score-workout', level: 'mid', re: /운동 ?점수|운동[^.。]{0,8}점이에요/, why: '운동은 점수 말고 칭찬'},
 {id: 'daebunryu', level: 'high', re: /대분류/, why: "'대분류' 금지"},
];
// 허용 문맥: 안전 안내·면책 문장은 '진단'·'치료' 같은 낱말을 쓸 수밖에 없다
export const ALLOW = [/의료진|전문가|상담|상의|진단하지 않|진단이 아니|진단이나 처방이 아니|진단·처방을 하지 않|진단·치료|치료 중|치료를 받|복용 중|처방받은|위험 신호|109|1393|정신건강/, /^\/\//];
// 사용자를 향한 말이 아닌 것: 시스템 오류('저장 실패'), 음식 이름('돼지고기'), 금지 표현 목록 자체(한 낱말)
const NOT_ABOUT_USER = [/(처리|연결|저장|등록|검색|확인|요청|정리|복원|집계|인식|불러오기|내보내기|동기화|업로드|전송)[^.]{0,6}실패|실패(했|하면|한|:|\s*\(|\s*$)/, /돼지\s?(고기|국밥|안심|등뼈|갈비|목살|껍데기|불고기|김치|감자)/];
const SKIP = /^(tests|tools|dist|android|node_modules|vendor)$|\.min\.js$/;
export function extractStrings(src) {
 const out = [];
 const re = /(['"`])((?:\\.|(?!\1)[\s\S])*?)\1/g;
 let m;
 while ((m = re.exec(src))) {
  const raw = m[2];
  if (!/[가-힣]/.test(raw)) continue;
  // 템플릿 안 HTML 태그·${...}를 걷어낸 사람이 읽는 글
  const text = raw.replace(/\$\{[^}]*\}/g, ' ').replace(/<[^>]+>/g, ' ').replace(/\\n/g, ' ').replace(/\s+/g, ' ').trim();
  if (text.length < 2) continue;
  const line = src.slice(0, m.index).split('\n').length;
  for (const s of text.split(/(?<=[.?!。])\s+/)) if (/[가-힣]/.test(s)) out.push({line, text: s.slice(0, 300)});
 }
 return out;
}
export function auditText(text) {
 if (ALLOW.some(a => a.test(text))) return [];
 if ((text.match(/[{};=]/g) || []).length > 3) return []; // 템플릿 안 코드 조각
 if (BANNED_PHRASES.includes(text.trim())) return []; // 금지 표현 목록 자체
 const aboutUser = !NOT_ABOUT_USER.some(a => a.test(text));
 return RULES.filter(r => (r.id !== 'blame' || aboutUser) && r.re.test(text)).map(r => ({rule: r.id, level: r.level, why: r.why}));
}
export function auditApp(dir = APP) {
 const files = fs.readdirSync(dir).filter(f => /\.(js|html)$/.test(f) && !SKIP.test(f) && !/^(sw|build|verify-build|qa-cdp)\./.test(f));
 const hits = [], all = [];
 for (const f of files) {
  const src = fs.readFileSync(path.join(dir, f), 'utf8');
  // 주석 줄은 화면 문구가 아니다
  const code = src.split('\n').map(l => /^\s*\/\//.test(l) ? '' : l.replace(/\/\*[\s\S]*?\*\//g, '')).join('\n');
  for (const s of extractStrings(code)) { all.push({file: f, ...s}); for (const h of auditText(s.text)) hits.push({file: f, line: s.line, text: s.text, ...h}); }
 }
 return {files: files.length, strings: all.length, hits, all};
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
 const r = auditApp(), out = path.resolve(APP, '..', 'research_notes', 'night', 'C3');
 fs.mkdirSync(out, {recursive: true});
 fs.writeFileSync(path.join(out, 'strings.json'), JSON.stringify(r.all, null, 0));
 const by = r.hits.reduce((m, h) => (m[h.rule] = (m[h.rule] || 0) + 1, m), {});
 fs.writeFileSync(path.join(out, 'copy-audit.md'), `# 화면 문구 검사 (밤샘 C-3)\n\n- 파일 ${r.files} · 한국어 문장 ${r.strings} · 걸린 문장 ${r.hits.length} ${JSON.stringify(by)}\n\n| 파일:줄 | 규칙 | 문장 |\n|---|---|---|\n${r.hits.map(h => `| ${h.file}:${h.line} | ${h.rule}(${h.level}) | ${h.text.replace(/\|/g, '/')} |`).join('\n')}\n`);
 console.log(`문장 ${r.strings} · 걸림 ${r.hits.length}`, by);
}
