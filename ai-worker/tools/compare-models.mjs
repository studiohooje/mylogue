// 4.29.x 두 AI 모델 비교(대표님 2026-11-25: "haiku보다 gpt nano가 싼 거 아니야? 성능이 얼마나 차이 나?")
// 같은 문제를 두 모델에 똑같이 보내고, 정확도·실제 청구 토큰·비용·속도를 나란히 보여 준다.
//  - 글: 마이로그 AI 기록 시험 문제집(research_notes/마이로그 데이터 정리/ai_golden_set.jsonl, 500문장)에서 종류별 고르게 N개.
//        채점은 기존 채점기(app/tools/ai-eval.mjs)를 그대로 쓴다(항목·단위·양·시간·세트, 환각·안전).
//  - 사진: 포장지 사진(research_notes/마이로그 음식 데이터베이스/pilot_images, 정답 pilot_chicken.json)에서 M장.
//        제품 이름을 맞혔는지(0.6) + 열량이 정답 ±15% 안인지(0.4). 1.5MB가 넘는 사진은 서버 상한과 같게 건너뛴다.
//  - 지시문·메시지 모양은 실제 서버(src/handler.js SYSTEM·buildMessages)와 같다. 회사 연결도 실제 서버 코드(src/providers.js).
//  - 비용은 응답의 실제 사용량(usage, 추론형 모델의 보이지 않는 생각 토큰 포함)으로 계산한다.
//  - 안전: 순서대로 한 번에 하나, 자동 재시도 없음, --max-won(기본 2,000원)을 넘으면 즉시 멈춤. 키는 환경 변수로만 받고 어디에도 저장·출력하지 않는다.
//
// 사용(PowerShell 예):
//   $env:ANTHROPIC_API_KEY = "…"; $env:OPENAI_API_KEY = "…"
//   node tools/compare-models.mjs --a anthropic:claude-haiku-5-5 --b openai:gpt-5-nano --n 100 --photos 20
//   먼저 키 없이 흐름만: node tools/compare-models.mjs --dry --n 30 --photos 5
// 모델 적는 법: anthropic:<모델> | openai:<모델> | gemini:<모델> | deepseek:<모델> | compat:<모델>@<https 주소>(키는 AI_API_KEY)
// 추론형(OpenAI gpt-5 계열 등)은 --reasoning minimal(기본)·--token-field max_completion_tokens(openai 기본)로 보낸다.
// 결과: <out>/결과.md(요약표), <out>/<모델>.jsonl(답·토큰), <out>/나란히.csv(문제별 점수 차이)
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {SYSTEM, buildMessages} from '../src/handler.js';
import {callAnthropic, callOpenAICompatible} from '../src/providers.js';
import {usageWon} from '../src/guards.js';
import {scoreOne, readAnswer} from '../../app/tools/ai-eval.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url)), ROOT = path.resolve(HERE, '..', '..');
const GOLD = path.join(ROOT, 'research_notes', '마이로그 데이터 정리', 'ai_golden_set.jsonl');
const PHOTO_DIR = path.join(ROOT, 'research_notes', '마이로그 음식 데이터베이스', 'pilot_images');
const PHOTO_TRUTH = path.join(ROOT, 'research_notes', '마이로그 음식 데이터베이스', 'pilot_chicken.json');
const BASES = {openai: 'https://api.openai.com/v1/', gemini: 'https://generativelanguage.googleapis.com/v1beta/openai/', deepseek: 'https://api.deepseek.com/'};
const KEYS = {openai: 'OPENAI_API_KEY', gemini: 'GEMINI_API_KEY', deepseek: 'DEEPSEEK_API_KEY', compat: 'AI_API_KEY'};

export function parseArgs(argv) {
  const o = {a: 'anthropic:claude-haiku-5-5', b: 'openai:gpt-5-nano', n: 100, photos: 20, maxWon: 2000, out: '', dry: false, reasoning: 'minimal', tokenField: '', usdKrw: 1450, seed: 7};
  for (let i = 0; i < argv.length; i++) {
    const k = argv[i], v = argv[i + 1];
    if (k === '--dry') o.dry = true;
    else if (k === '--a') { o.a = v; i++; } else if (k === '--b') { o.b = v; i++; }
    else if (k === '--n') { o.n = Number(v); i++; } else if (k === '--photos') { o.photos = Number(v); i++; }
    else if (k === '--max-won') { o.maxWon = Number(v); i++; } else if (k === '--out') { o.out = v; i++; }
    else if (k === '--reasoning') { o.reasoning = v; i++; } else if (k === '--token-field') { o.tokenField = v; i++; }
    else if (k === '--usd-krw') { o.usdKrw = Number(v); i++; } else if (k === '--seed') { o.seed = Number(v); i++; }
  }
  return o;
}
export function parseModel(spec) {
  const s = String(spec || ''), i = s.indexOf(':'); if (i < 0) throw Error(`모델 적는 법이 틀렸어요: ${s}`);
  const provider = s.slice(0, i).toLowerCase(); let model = s.slice(i + 1), base = BASES[provider] || '';
  if (provider === 'compat') { const at = model.lastIndexOf('@'); if (at < 0) throw Error('compat은 모델@https주소로 적어 주세요.'); base = model.slice(at + 1); model = model.slice(0, at); }
  if (provider !== 'anthropic' && !base) throw Error(`모르는 회사: ${provider}`);
  return {provider, model, base, label: `${provider}:${model}`};
}

// 종류별로 고르게, 매번 같은 문제(seed 고정)
export function pickQuestions(all, n, seed = 7) {
  let x = seed >>> 0; const rnd = () => { x = (x * 1664525 + 1013904223) >>> 0; return x / 2 ** 32; };
  const by = {}; for (const q of all) (by[q.category] ??= []).push(q);
  for (const list of Object.values(by)) for (let i = list.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [list[i], list[j]] = [list[j], list[i]]; }
  const cats = Object.keys(by).sort(), out = [];
  for (let round = 0; out.length < n && cats.some(c => by[c].length > round); round++) for (const c of cats) if (by[c][round] && out.length < n) out.push(by[c][round]);
  return out;
}
const norm = t => String(t ?? '').toLocaleLowerCase('ko').replace(/[\s·()\-_/.,]/g, '');
// 사진 채점: 정답 제품 중 하나라도 이름이 맞으면 0.6, 그 제품 열량이 ±15% 안이면 +0.4
export function scorePhoto(products, answer) {
  const recs = readAnswer(answer).records || [], items = recs.flatMap(r => r.items || []);
  let best = 0;
  for (const it of items) {
    const name = norm(it.name);
    for (const p of products) {
      const words = [p.name, p.variant].filter(Boolean).map(norm);
      const hit = name.includes(norm(p.name)) || (words.length && words.every(w => name.includes(w))) || (norm(p.brand) && name.includes(norm(p.brand)) && name.includes(norm(p.name).slice(0, 3)));
      if (!hit) continue;
      const kcal = Number(it.kcal ?? it.calories), qty = Number(it.qty) || 1, per = Number.isFinite(kcal) ? kcal / (String(it.unit || '').match(/g|ml/) ? 1 : qty) : NaN;
      const kOk = Number.isFinite(per) && p.kcal && (Math.abs(kcal - p.kcal) <= p.kcal * 0.15 || Math.abs(per - p.kcal) <= p.kcal * 0.15);
      best = Math.max(best, 0.6 + (kOk ? 0.4 : 0));
    }
  }
  return best;
}

function caller(m, opts) {
  if (opts.dry) return null;
  if (m.provider === 'anthropic') { if (!process.env.ANTHROPIC_API_KEY) throw Error('ANTHROPIC_API_KEY가 없어요.'); return (msgs, o) => callAnthropic({ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY}, msgs, o); }
  const key = process.env[KEYS[m.provider] || 'AI_API_KEY'] || process.env.AI_API_KEY;
  if (!key) throw Error(`${KEYS[m.provider] || 'AI_API_KEY'}가 없어요.`);
  const env = {AI_BASE_URL: m.base, AI_API_KEY: key, AI_TOKEN_FIELD: opts.tokenField || (m.provider === 'openai' ? 'max_completion_tokens' : ''), AI_REASONING_EFFORT: m.provider === 'openai' && /gpt-5|o\d/.test(m.model) ? opts.reasoning : ''};
  return (msgs, o) => callOpenAICompatible(env, msgs, o);
}
// 키 없이 흐름 시험: A는 정답을 마이로그 코드로, B는 절반만 맞힌 답
function dryAnswer(which, task) {
  const FENCE = '`'.repeat(3);
  if (task.kind === 'text') {
    const recs = task.q.expected?.records || [];
    const use = which === 'A' ? recs : recs.slice(0, Math.ceil(recs.length / 2)).map(r => ({...r, items: (r.items || []).slice(0, 1)}));
    const text = use.length ? `${FENCE}json\n${JSON.stringify({mylogue: 1, records: use})}\n${FENCE}` : (task.q.expected_kind === 'ask' ? '얼마나 드셨어요?' : '기록할 내용이 없어요.');
    return {text, stopReason: 'end_turn', model: 'dry', usage: {input_tokens: 7000, output_tokens: which === 'A' ? 300 : 900}};
  }
  const p = task.products[0];
  const item = which === 'A' ? {name: `${p.brand} ${p.name}`, qty: 1, unit: '팩', kcal: p.kcal} : {name: '닭가슴살', qty: 1, unit: '팩', kcal: Math.round(p.kcal * 1.5)};
  return {text: `${FENCE}json\n${JSON.stringify({mylogue: 1, records: [{type: 'meal', date: '2026-11-25', items: [item]}]})}\n${FENCE}`, stopReason: 'end_turn', model: 'dry', usage: {input_tokens: 9000, output_tokens: 300}};
}

export async function run(opts, {log = console.log} = {}) {
  const A = parseModel(opts.a), B = parseModel(opts.b);
  const gold = fs.readFileSync(GOLD, 'utf8').split('\n').filter(l => l.trim()).map(l => JSON.parse(l));
  const tasks = pickQuestions(gold, opts.n, opts.seed).map(q => ({kind: 'text', id: q.id, q}));
  const truth = JSON.parse(fs.readFileSync(PHOTO_TRUTH, 'utf8')), byImg = {}; for (const p of truth) if (p.imageFile) (byImg[p.imageFile] ??= []).push(p);
  let skipped = 0;
  for (const file of Object.keys(byImg).sort().slice(0, Math.max(0, opts.photos * 2))) {
    if (tasks.filter(t => t.kind === 'photo').length >= opts.photos) break;
    const f = path.join(PHOTO_DIR, file); if (!fs.existsSync(f)) continue;
    const buf = fs.readFileSync(f); if (buf.length > 1_500_000) { skipped++; continue; }
    tasks.push({kind: 'photo', id: `P:${file}`, file, products: byImg[file], image: {media_type: /\.png$/i.test(file) ? 'image/png' : 'image/jpeg', data: buf.toString('base64')}});
  }
  const out = opts.out || path.join(ROOT, 'reports', `모델 비교 ${new Date().toISOString().slice(0, 10)}${opts.dry ? ' (시험 실행)' : ''}`);
  fs.mkdirSync(out, {recursive: true});
  const models = [{tag: 'A', m: A, call: caller(A, opts)}, {tag: 'B', m: B, call: caller(B, opts)}];
  const res = {A: [], B: []}; let spent = 0, stopped = '';
  log(`문제 ${tasks.filter(t => t.kind === 'text').length}개 · 사진 ${tasks.filter(t => t.kind === 'photo').length}장(1.5MB 넘어 건너뜀 ${skipped}) · 비용 상한 ${opts.maxWon}원${opts.dry ? ' · 시험 실행(호출 없음)' : ''}`);
  outer: for (const t of tasks) {
    for (const {tag, m, call} of models) {
      const today = t.kind === 'text' ? String(t.q.context?.now || '').slice(0, 10) : '2026-11-25', now = t.kind === 'text' ? String(t.q.context?.now || '').slice(11, 16) : '12:00';
      const msgs = buildMessages({text: t.kind === 'text' ? t.q.utterance : '포장지 사진이에요. 먹은 제품으로 기록해 주세요.', context: '', images: t.kind === 'photo' ? [t.image] : [], today: today || null, now: now || null});
      const t0 = Date.now(); let r, error = '';
      try { r = opts.dry ? dryAnswer(tag, t) : await call(msgs, {model: m.model, system: SYSTEM, effort: 'low', maxTokens: 1500}); }
      catch (e) { error = String(e?.message || e).slice(0, 120); r = {text: '', usage: null}; }
      const ms = Date.now() - t0, won = usageWon({USD_KRW: String(opts.usdKrw)}, m.model === 'dry' ? '' : m.model, r.usage) ?? 0;
      spent += opts.dry ? 0 : won;
      const score = error ? 0 : t.kind === 'text' ? scoreOne(t.q, r.text).score : scorePhoto(t.products, r.text);
      const parsed = !!readAnswer(r.text).records.length || /[?？]/.test(r.text);
      res[tag].push({id: t.id, kind: t.kind, category: t.kind === 'text' ? t.q.category : 'photo', score, won, ms, inTok: Number(r.usage?.input_tokens ?? r.usage?.prompt_tokens ?? 0), outTok: Number(r.usage?.output_tokens ?? r.usage?.completion_tokens ?? 0), thinkTok: Number(r.usage?.completion_tokens_details?.reasoning_tokens ?? 0), parsed, error, answer: r.text});
      if (!opts.dry && spent > opts.maxWon) { stopped = `비용 상한 ${opts.maxWon}원에 닿아 멈췄어요(쓴 돈 약 ${Math.round(spent)}원).`; break outer; }
    }
  }
  for (const {tag, m} of models) fs.writeFileSync(path.join(out, `${tag}_${m.label.replace(/[^\w.-]+/g, '_')}.jsonl`), res[tag].map(x => JSON.stringify(x)).join('\n') + '\n');
  const sum = list => list.reduce((s, x) => s + x, 0), avg = list => list.length ? sum(list) / list.length : 0;
  const stat = rows => {
    const text = rows.filter(r => r.kind === 'text'), photo = rows.filter(r => r.kind === 'photo');
    const perCall = avg(rows.map(r => r.won)), monthly5x3 = perCall * 38 * 30 * 5; // 5명 × 하루 38번(3배 시험: 말 31·사진 6·리뷰 1) × 30일
    return {n: rows.length, text: avg(text.map(r => r.score)), photo: photo.length ? avg(photo.map(r => r.score)) : null, errors: rows.filter(r => r.error).length, unparsed: rows.filter(r => !r.parsed && !r.error).length,
      won: sum(rows.map(r => r.won)), perCall, monthly5x3, ms: avg(rows.map(r => r.ms)), inTok: avg(rows.map(r => r.inTok)), outTok: avg(rows.map(r => r.outTok)), thinkTok: avg(rows.map(r => r.thinkTok))};
  };
  const sA = stat(res.A), sB = stat(res.B), pct = v => v == null ? '—' : `${Math.round(v * 1000) / 10}점`, won = v => `${(Math.round(v * 100) / 100).toLocaleString('ko-KR')}원`;
  const cats = [...new Set(res.A.map(r => r.category))];
  const catRow = c => { const a = res.A.filter(r => r.category === c), b = res.B.filter(r => r.category === c); return `| ${c} | ${a.length} | ${pct(avg(a.map(r => r.score)))} | ${pct(avg(b.map(r => r.score)))} |`; };
  const md = `# 모델 비교 결과${opts.dry ? ' (시험 실행 — 실제 모델 아님)' : ''}

${new Date().toISOString().slice(0, 16).replace('T', ' ')} UTC · A = ${A.label} · B = ${B.label}${stopped ? `\n\n**${stopped}**` : ''}

| | A ${A.label} | B ${B.label} |
|---|---|---|
| 글 기록 점수(100점) | ${pct(sA.text)} | ${pct(sB.text)} |
| 사진(포장지) 점수 | ${pct(sA.photo)} | ${pct(sB.photo)} |
| 형식 못 읽음 · 오류 | ${sA.unparsed} · ${sA.errors} | ${sB.unparsed} · ${sB.errors} |
| 1회 평균 비용(실제 사용량) | ${won(sA.perCall)} | ${won(sB.perCall)} |
| 이번 비교에 쓴 돈 | ${won(sA.won)} | ${won(sB.won)} |
| 5명·3배 시험 한 달 예상 | ${Math.round(sA.monthly5x3).toLocaleString('ko-KR')}원 | ${Math.round(sB.monthly5x3).toLocaleString('ko-KR')}원 |
| 평균 응답 시간 | ${(sA.ms / 1000).toFixed(1)}초 | ${(sB.ms / 1000).toFixed(1)}초 |
| 평균 토큰(보냄 / 받음 / 그중 생각) | ${Math.round(sA.inTok)} / ${Math.round(sA.outTok)} / ${Math.round(sA.thinkTok)} | ${Math.round(sB.inTok)} / ${Math.round(sB.outTok)} / ${Math.round(sB.thinkTok)} |

## 종류별 점수

| 종류 | 문제 수 | A | B |
|---|---|---|---|
${cats.map(catRow).join('\n')}

## 읽는 법
- 점수는 기존 채점기 기준(항목 30·단위 15·양 20·시간 15·세트/몸 20, 물어봐야 할 때 묻기, 거절해야 할 때 거절). 사진은 제품 이름 60 + 열량 ±15% 40.
- 비용은 각 회사가 돌려준 실제 사용량으로 계산(환율 ${opts.usdKrw}원, 가격은 ai-worker/src/guards.js DEFAULT_PRICES·MODEL_PRICES).
- 문제별 답과 점수: 같은 폴더의 jsonl, 점수 차이가 큰 문제: 나란히.csv.
`;
  fs.writeFileSync(path.join(out, '결과.md'), md);
  const diff = res.A.map((a, i) => ({a, b: res.B[i]})).filter(x => x.b).sort((x, y) => Math.abs(y.a.score - y.b.score) - Math.abs(x.a.score - x.b.score));
  fs.writeFileSync(path.join(out, '나란히.csv'), '﻿id,종류,A점수,B점수,A답,B답\n' + diff.map(({a, b}) => [a.id, a.category, a.score, b.score, a.answer, b.answer].map(v => `"${String(v ?? '').replace(/"/g, '""').slice(0, 600)}"`).join(',')).join('\n'));
  log(md);
  return {out, A: sA, B: sB, stopped};
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  run(parseArgs(process.argv.slice(2))).catch(e => { console.error(e.message || e); process.exit(1); });
}
