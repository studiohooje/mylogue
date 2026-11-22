// 마이로그 기본 음식 DB 빌드 스크립트
// 입력: 식약처 식품영양성분DB 표준데이터 파일(공공데이터포털 15100070 음식, 15100065 원재료성, 15100066 가공식품) CSV 원본
// 출력: research_notes/마이로그 음식 데이터베이스/mfds/out/ 아래 JSON·JSONL·통계·검수 샘플
// 원칙: 빈 값은 null(0으로 채우지 않음), 단위 g은 출처 있는 값만, 원본 파일은 건드리지 않음.
// 사용: node tools/food-build.mjs [--raw <원본폴더>] [--out <출력폴더>]
// 외부 패키지 없음(Node 내장 모듈만 사용).

import fs from 'node:fs';
import path from 'node:path';
import readline from 'node:readline';
import zlib from 'node:zlib';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_BASE = path.resolve(HERE, '..', '..', 'research_notes', '마이로그 음식 데이터베이스', 'mfds');

// ───────────────────────── 출처 문구 ─────────────────────────
export const SRC = {
  T3: '식약처 「식품등의 표시기준」 [표 3] 1회 섭취참고량(민원인 안내서 2024.12 [참고 4])',
  KNS: '한국영양학회 1인 1회 분량(밥 1공기 210g)',
  DB_REF: '식약처 식품영양성분DB "1회 섭취참고량" 칸([표 3] 기준값)',
  DB_DISH_SIZE: '식약처 식품영양성분DB(음식) 식품중량(1인분·1회 제공 중량)',
  DB_PACK_SIZE: '식약처 식품영양성분DB(가공식품) 식품중량(제품 내용량)',
  BASE: '기본',
};

// ───────────────────────── CSV ─────────────────────────
export function parseCsvLine(line) {
  const out = [];
  let cur = '';
  let q = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (q) {
      if (ch === '"') {
        if (line[i + 1] === '"') { cur += '"'; i++; } else q = false;
      } else cur += ch;
    } else if (ch === '"') q = true;
    else if (ch === ',') { out.push(cur); cur = ''; }
    else cur += ch;
  }
  out.push(cur);
  return out;
}

export async function* readCsv(file) {
  const rl = readline.createInterface({ input: fs.createReadStream(file, 'utf8'), crlfDelay: Infinity });
  let header = null;
  let pending = '';
  for await (const rawLine of rl) {
    const line = pending ? pending + '\n' + rawLine : rawLine;
    // 따옴표 안 줄바꿈 대비: 따옴표 개수가 홀수면 다음 줄과 합친다
    if ((line.match(/"/g) || []).length % 2 === 1) { pending = line; continue; }
    pending = '';
    if (!header) { header = parseCsvLine(line.replace(/^﻿/, '')).map((h) => h.trim()); continue; }
    if (!line.trim()) continue;
    const cells = parseCsvLine(line);
    if (cells.length !== header.length) { yield { __bad: true, line }; continue; }
    const row = {};
    header.forEach((h, i) => { row[h] = cells[i]; });
    yield row;
  }
}

// ───────────────────────── 이름 정규화·검색 ─────────────────────────
const BRACKET_MAP = { '（': '(', '）': ')', '［': '[', '］': ']', '【': '[', '】': ']', '〔': '[', '〕': ']', '「': '[', '」': ']', '『': '[', '』': ']', '｛': '(', '｝': ')', '{': '(', '}': ')', '〈': '<', '〉': '>', '《': '<', '》': '>' };

export function normalizeText(s) {
  if (s == null) return '';
  let t = String(s).normalize('NFC');
  t = t.replace(/[﻿​-‍⁠]/g, '');
  t = t.replace(/[（）［］【】〔〕「」『』｛｝{}〈〉《》]/g, (c) => BRACKET_MAP[c] || c);
  // 전각 ASCII → 반각(한글 호환 자모는 건드리지 않도록 FF01–FF5E만)
  t = t.replace(/[！-～]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xFEE0));
  t = t.replace(/　/g, ' ');
  t = t.replace(/\s+/g, ' ').trim();
  t = t.replace(/\(\s+/g, '(').replace(/\s+\)/g, ')').replace(/\[\s+/g, '[').replace(/\s+\]/g, ']');
  // 인코딩이 깨져 생긴 앞머리 '?' 등 기호 제거
  t = t.replace(/^[?*★☆♥·•\-_,.]+\s*/, '');
  return t;
}

// 식약처 이름 "대표명_세부1_세부2" → 화면용 이름
export function displayName(raw) {
  const t = normalizeText(raw);
  const parts = t.split('_').map((p) => p.trim()).filter(Boolean);
  if (parts.length <= 1) return t;
  const [head, ...rest] = parts;
  const headNs = head.replace(/\s/g, '');
  if (rest[0] && rest[0].replace(/\s/g, '').includes(headNs)) {
    return rest.length === 1 ? rest[0] : `${rest[0]}(${rest.slice(1).join(', ')})`;
  }
  return `${head}(${rest.join(', ')})`;
}

const CHO = ['ㄱ', 'ㄲ', 'ㄴ', 'ㄷ', 'ㄸ', 'ㄹ', 'ㅁ', 'ㅂ', 'ㅃ', 'ㅅ', 'ㅆ', 'ㅇ', 'ㅈ', 'ㅉ', 'ㅊ', 'ㅋ', 'ㅌ', 'ㅍ', 'ㅎ'];
export function chosung(s) {
  let out = '';
  for (const ch of String(s || '')) {
    const code = ch.charCodeAt(0);
    if (code >= 0xAC00 && code <= 0xD7A3) out += CHO[Math.floor((code - 0xAC00) / 588)];
    else if (/[0-9a-zA-Zㄱ-ㅎ]/.test(ch)) out += ch.toLowerCase();
  }
  return out;
}

export function noSpace(s) {
  return String(s || '').replace(/[\s_()[\]<>,.·\-/]/g, '').toLowerCase();
}

// 같은 뜻으로 검색되는 말 묶음(동의어·흔한 오타). 이름에 한 말이 들어 있으면 나머지를 별칭으로 붙인다.
// 포함 관계로 뜻이 바뀌는 말(예: 냉면 ⊂ 물냉면)은 넣지 않는다.
export const SYNONYM_GROUPS = [
  ['제육볶음', '제육', '돼지불고기', '돼지고기볶음'],
  ['떡볶이', '떡뽁이', '떡복이', '떡볶기'],
  ['김치찌개', '김치찌게', '김찌'],
  ['된장찌개', '된장찌게', '된찌'],
  ['부대찌개', '부대찌게'],
  ['순두부찌개', '순두부찌게', '순찌'],
  ['짜장면', '자장면'],
  ['짜장', '자장'],
  ['짬뽕', '짬봉'],
  ['계란', '달걀'],
  ['계란후라이', '계란프라이', '달걀프라이', '달걀후라이', '에그프라이'],
  ['감자튀김', '프렌치프라이', '후렌치후라이', '프렌치후라이'],
  ['아메리카노', 'americano'],
  ['카페라떼', '카페라테', '카페 라떼'],
  ['돈까스', '돈가스', '돈카츠', '돈카쓰'],
  ['후라이드치킨', '프라이드치킨'],
  ['닭튀김', '치킨'],
  ['닭볶음탕', '닭도리탕'],
  ['쌀밥', '흰쌀밥', '흰밥', '공기밥', '공깃밥', '백미밥'],
  ['닭가슴살', '닭가슴'],
  ['소고기', '쇠고기'],
  ['돼지고기', '돈육'],
  ['닭고기', '계육'],
  ['오므라이스', '오무라이스'],
  ['카레', '커리'],
  ['스파게티', '파스타'],
  ['햄버거', '버거'],
  ['요거트', '요구르트', '요쿠르트'],
  ['칼국수', '칼국시'],
  ['육개장', '육계장'],
  ['설렁탕', '설농탕'],
  ['깍두기', '깎두기'],
  ['찌개', '찌게'],
  ['프로틴', 'protein', '단백질쉐이크', '프로틴쉐이크'],
  ['삼겹살', '삼겹'],
  ['샌드위치', '샌드위찌', '샌위치'],
  ['케이크', '케익', '케잌'],
  ['도넛', '도너츠', '도너스', '도넛츠'],
  ['크루아상', '크로와상', '크로아상'],
  ['비스킷', '비스켓'],
  ['초콜릿', '초콜렛', '쵸콜릿'],
  ['소시지', '소세지'],
  ['두유', '콩우유'],
  ['주스', '쥬스'],
  ['떡국', '떡꾹'],
  ['김밥', '김빱'],
];

export function aliasesFor(name) {
  const ns = noSpace(name);
  const out = new Set();
  for (const group of SYNONYM_GROUPS) {
    const members = [...new Set(group)];
    if (members.length < 2) continue;
    if (members.some((m) => ns.includes(noSpace(m)))) {
      for (const m of members) if (!ns.includes(noSpace(m))) out.add(m);
    }
  }
  return [...out];
}

export function buildSearch(name, extra = []) {
  const aliases = aliasesFor([name, ...extra].join(' '));
  return { nospace: noSpace(name), chosung: chosung(name), aliases };
}

// ───────────────────────── 숫자·영양소 ─────────────────────────
export function num(v) {
  if (v == null) return null;
  const t = String(v).trim().replace(/,/g, '');
  if (t === '' || t === '-' || /^해당\s*없음$/.test(t)) return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

const NUTRIENT_COLS = {
  kcal: '에너지(kcal)',
  carbs: '탄수화물(g)',
  sugar: '당류(g)',
  fiber: '식이섬유(g)',
  protein: '단백질(g)',
  fat: '지방(g)',
  satFat: '포화지방산(g)',
  transFat: '트랜스지방산(g)',
  cholesterol: '콜레스테롤(mg)',
  sodium: '나트륨(mg)',
};
export const NUTRIENT_KEYS = Object.keys(NUTRIENT_COLS);

export function readNutrients(row) {
  const o = {};
  for (const [k, col] of Object.entries(NUTRIENT_COLS)) o[k] = num(row[col]);
  return o;
}

export function parseBasis(s) {
  const t = String(s || '').trim().toLowerCase();
  if (/^100\s*ml$/.test(t)) return 'ml';
  if (/^100\s*g$/.test(t)) return 'g';
  return null;
}

// "291.90ml" → {qty:291.9, unit:'ml'}
export function parseAmount(s) {
  const t = String(s || '').trim().toLowerCase().replace(/,/g, '');
  const m = t.match(/^(\d+(?:\.\d+)?)\s*(g|ml|kg|l)$/);
  if (!m) return null;
  let qty = Number(m[1]);
  let unit = m[2];
  if (unit === 'kg') { qty *= 1000; unit = 'g'; }
  if (unit === 'l') { qty *= 1000; unit = 'ml'; }
  return { qty, unit };
}

const round1 = (n) => Math.round(n * 10) / 10;

// kcal 일관성: |kcal − (탄×4+단×4+지×9)| / kcal > 20%
export function kcalCheck(n) {
  const { kcal, carbs, protein, fat } = n;
  if (kcal == null || carbs == null || protein == null || fat == null) return { checked: false };
  const calc = carbs * 4 + protein * 4 + fat * 9;
  if (kcal === 0) {
    return { checked: true, calc: round1(calc), ratio: calc > 0 ? Infinity : 0, flag: calc >= 5, absDiff: round1(calc) };
  }
  const absDiff = Math.abs(kcal - calc);
  const ratio = absDiff / kcal;
  return { checked: true, calc: round1(calc), ratio: Math.round(ratio * 1000) / 1000, flag: ratio > 0.2, absDiff: round1(absDiff) };
}

// 명백한 단위·입력 오류
export function unitErrorFlags(n, basis) {
  const f = [];
  const vals = NUTRIENT_KEYS.map((k) => n[k]).filter((v) => v != null);
  if (vals.some((v) => v < 0)) f.push('음수값');
  if (n.kcal != null && n.kcal > 902) f.push('kcal_100당_900초과');
  if (basis === 'g') {
    const s = (n.carbs || 0) + (n.protein || 0) + (n.fat || 0);
    if (s > 105) f.push('탄단지합_100g초과');
  }
  if (n.sugar != null && n.carbs != null && n.sugar > n.carbs + 0.5) f.push('당류>탄수화물');
  if (n.fiber != null && n.carbs != null && n.fiber > n.carbs + 0.5) f.push('식이섬유>탄수화물');
  if (n.satFat != null && n.fat != null && n.satFat > n.fat + 0.5) f.push('포화지방>지방');
  if (n.transFat != null && n.fat != null && n.transFat > n.fat + 0.5) f.push('트랜스지방>지방');
  if (n.sodium != null && n.sodium > 40000) f.push('나트륨_100당_40g초과');
  if (n.cholesterol != null && n.cholesterol > 3000) f.push('콜레스테롤_100당_3g초과');
  return f;
}

// ───────────────────────── 범주 ─────────────────────────
export const CATEGORIES = ['밥', '면', '국탕', '찌개', '죽', '만두', '김치반찬', '두부', '기름', '장류', '우유음료', '커피', '계란', '빵떡', '과자시리얼', '피자', '보충제', '육류', '과일', '기타'];

const PLAIN_RICE = /^(쌀|흰쌀|백미|잡곡|혼합잡곡|현미|흑미|보리|기장|차조|조|수수|팥|율무|완두콩|옥수수|오곡|강낭콩|검정콩|콩|찰|찹쌀|귀리)\s?밥$/;
const COFFEE_RE = /(커피|아메리카노|에스프레소|카페\s?라떼|카페\s?라테|카푸치노|마끼아또|마키아토|마키아또|카페\s?모카|콜드\s?브루|돌체|플랫\s?화이트|라떼\s?마끼아또|아인슈페너|바닐라\s?라떼|카라멜\s?라떼)/;
const BREAD_LV4 = new Set(['식빵', '베이글', '크로와상', '크림빵', '치즈빵', '소보로빵', '팥빵', '번', '기타빵', '페이스트리', '바게트', '머핀', '스콘', '케이크', '도넛', '와플', '크로플', '허니브레드', '프레즐', '모닝빵', '단팥빵', '곡물빵', '소금빵', '카스텔라', '롤케이크']);

// 음식(조리식품)
export function categorizeDish(c, name) {
  const lv3 = c.lv3 || '';
  const lv4 = c.lv4 || '';
  const lv5 = c.lv5 || '';
  const ns = noSpace(name);
  if (lv3 === '밥류') {
    if (PLAIN_RICE.test(lv4)) return { category: '밥', rule: 'rice_plain' };
    if (/김밥|주먹밥|초밥/.test(lv4)) return { category: '밥', rule: null };
    return { category: '밥', rule: 'rice_dish' };
  }
  if (lv3 === '국 및 탕류') return { category: '국탕', rule: 'soup' };
  if (lv3 === '찌개 및 전골류') return { category: '찌개', rule: 'stew' };
  if (lv3 === '죽 및 스프류') return /스프|수프/.test(lv4 + ns) ? { category: '죽', rule: 'soup_western' } : { category: '죽', rule: 'porridge' };
  if (lv3 === '면 및 만두류') {
    if (/만두/.test(lv4) && /(국|탕)$/.test(lv4)) return { category: '국탕', rule: 'soup' };
    if (/만두/.test(lv4)) return { category: '만두', rule: 'dumpling' };
    return { category: '면', rule: null };
  }
  if (lv3 === '김치류') return { category: '김치반찬', rule: /물김치|동치미|나박/.test(lv4 + ns) ? 'kimchi_water' : 'kimchi' };
  if (lv3 === '장아찌·절임류') return { category: '김치반찬', rule: /장아찌/.test(lv4 + ns) ? 'jangajji' : 'pickle_other' };
  if (['생채·무침류', '나물·숙채류', '조림류', '젓갈류'].includes(lv3)) return { category: '김치반찬', rule: null };
  if (lv3 === '장류, 양념류') return { category: '장류', rule: sauceRule(lv4 + ' ' + name) };
  if (lv3 === '빵 및 과자류') {
    if (/피자/.test(lv4)) return { category: '피자', rule: 'pizza' };
    if (/버거|샌드위치/.test(lv4)) return { category: '빵떡', rule: 'burger_sandwich' };
    if (/떡/.test(lv4) && !/떡볶이/.test(lv4)) return { category: '빵떡', rule: 'tteok' };
    if (/비스킷|쿠키|크래커|과자/.test(lv4)) return { category: '과자시리얼', rule: 'snack' };
    if (BREAD_LV4.has(lv4)) return { category: '빵떡', rule: 'bread' };
    return { category: '빵떡', rule: null };
  }
  if (lv3 === '음료 및 차류') {
    if (lv4 === '커피' || COFFEE_RE.test(lv5) || COFFEE_RE.test(ns)) return { category: '커피', rule: 'coffee' };
    if (/주스/.test(lv4)) return { category: '우유음료', rule: 'juice' };
    return { category: '우유음료', rule: null };
  }
  if (lv3 === '유제품류 및 빙과류') {
    if (/아이스크림|빙과/.test(lv4)) return { category: '기타', rule: 'icecream' };
    if (/^우유$/.test(lv4)) return { category: '우유음료', rule: 'milk' };
    return { category: '기타', rule: null };
  }
  if (lv3 === '수·조·어·육류') return { category: '육류', rule: null };
  if (lv3 === '과일류') return { category: '과일', rule: null };
  if (lv3 === '두류, 견과 및 종실류' && /두부/.test(ns)) return { category: '두부', rule: 'tofu' };
  return { category: '기타', rule: null };
}

function sauceRule(text) {
  const t = noSpace(text);
  if (/간장/.test(t)) return 'soy_sauce';
  if (/고추장|된장|쌈장/.test(t)) return 'paste';
  if (/춘장|청국장/.test(t)) return 'paste_heavy';
  if (/식초/.test(t)) return 'vinegar';
  if (/드레싱/.test(t)) return 'dressing';
  if (/마요네즈|케첩|케찹/.test(t)) return 'mayo_ketchup';
  return null;
}

// 원재료성
export function categorizeRaw(c, name) {
  const lv3 = c.lv3 || '';
  const ns = noSpace(name);
  if (lv3 === '육류') return { category: '육류', rule: null };
  if (lv3 === '과일류') return { category: '과일', rule: null };
  if (lv3 === '난류') {
    const whole = /(달걀|계란)/.test(ns) && !/(노른자|흰자|난황|난백|분말|가루)/.test(ns);
    return { category: '계란', rule: whole ? 'egg' : null };
  }
  if (lv3 === '유지류') return { category: '기름', rule: 'oil' };
  if (lv3 === '조미료류') return { category: '장류', rule: sauceRule(name) };
  if (lv3 === '우유류') return { category: '우유음료', rule: /우유/.test(ns) ? 'milk' : null };
  if (lv3 === '두류' && /두부/.test(ns)) return { category: '두부', rule: 'tofu' };
  if (lv3 === '당류') {
    if (/벌꿀|^꿀/.test(ns)) return { category: '기타', rule: 'honey' };
    if (/설탕/.test(ns)) return { category: '기타', rule: 'sugar' };
    if (/물엿|올리고당|시럽|조청/.test(ns)) return { category: '기타', rule: 'syrup' };
  }
  return { category: '기타', rule: null };
}

// 가공식품
const NOODLE_LV4 = new Set(['즉석 면요리', '라면', '국수', '파스타', '쌀국수', '우동면', '칼국수', '메밀국수/냉면국수', '당면', '쫄면', '기타면', '볶음/비빔라면', '자장라면', '기타 라면']);
const KIMCHI_SIDE_LV4 = new Set(['배추김치', '기타김치', '물김치', '김칫속', '반찬', '절임식품', '기타 조림', '장아찌', '단무지/피클', '젓갈/액젓', '조림/찜', '김', '김자반', '전']);
const TOFU_LV4 = new Set(['두부', '기타 두부 가공품', '묵', '기타 묵 가공품', '유부']);
const COFFEE_LV4 = new Set(['액상커피', '원두/원두분말', '인스턴트커피']);
const MILK_LV4 = new Set(['우유', '가공우유', '우유(멸균)', '가공우유(멸균)', '유당분해우유', '강화우유', '발효유', '농후발효유', '크림발효유', '두유', '유산균음료']);
const FRUIT_LV4 = new Set(['과일가공품', '냉동과일', '건조과일(건과류)']);
const SNACK_LV4 = new Set(['시리얼', '기타 시리얼', '시리얼바/에너지바/영양바', '강냉이/팝콘']);

export function categorizeProcessed(c, name) {
  const { lv3 = '', lv4 = '', lv5 = '', lv6 = '' } = c;
  const ns = noSpace(name);
  if (/체중조절용/.test(lv4) || (['특수영양식품', '음료류', '기타식품류', '농산가공식품류'].includes(lv3) && /(프로틴|protein|단백질쉐이크|단백질음료|단백질파우더|웨이|whey)/i.test(ns))) return '보충제';
  if (lv4 === '피자' || lv4 === '즉석 피자') return '피자';
  if (lv4 === '밥류') return '밥';
  if (lv3 === '면류' || NOODLE_LV4.has(lv4)) return '면';
  if (lv4 === '국/탕류') return '국탕';
  if (lv4 === '찌개/전골류') return '찌개';
  if (lv4 === '죽' || lv4 === '스프' || lv4 === '분말스프') return '죽';
  if (lv4 === '만두') return '만두';
  if (KIMCHI_SIDE_LV4.has(lv4) || lv5 === '김치류') return '김치반찬';
  if (TOFU_LV4.has(lv4) || lv3 === '두부류 또는 묵류') return '두부';
  if (lv3 === '식용유지류') return '기름';
  if (lv3 === '장류' || lv3 === '조미식품') return '장류';
  if (COFFEE_LV4.has(lv4) || lv5 === '커피') return '커피';
  if (lv3 === '음료류' || MILK_LV4.has(lv4)) return '우유음료';
  if (lv3 === '알가공품류' || lv4 === '달걀/메추리알') return '계란';
  if (lv6 === '빵류' || lv6 === '떡류') return '빵떡';
  if (['과자', '캔디류', '추잉껌'].includes(lv6) || lv3 === '코코아가공품류 또는 초콜릿류' || SNACK_LV4.has(lv4)) return '과자시리얼';
  if (lv3 === '식육가공품 및 포장육') return '육류';
  if (FRUIT_LV4.has(lv4)) return '과일';
  return '기타';
}

// ───────────────────────── 단위 규칙(음식·원재료성) ─────────────────────────
// qty: 식약처 [표 3] 값. dims: 그 값이 적용되는 기준(g/ml). "(g)"·"(ml)" 병기된 항목은 둘 다.
export const UNIT_RULES = {
  rice_plain: { units: [{ label: '1공기', qty: 210, default: true }, { label: '반 공기', qty: 105, note: '1공기 210g × 0.5' }, { label: '1.5공기', qty: 315, note: '1공기 210g × 1.5' }], dims: ['g'], source: `${SRC.T3}(즉석조리식품 밥 210g)·${SRC.KNS}` },
  rice_dish: { units: [{ label: '1회 섭취참고량', qty: 210 }], dims: ['g'], source: `${SRC.T3}(즉석조리식품 밥 210g)` },
  soup: { units: [{ label: '1그릇', qty: 250 }, { label: '반 그릇', qty: 125, note: '1그릇 250 × 0.5' }], dims: ['g', 'ml'], source: `${SRC.T3}(즉석조리식품 국·탕 250ml(g))` },
  stew: { units: [{ label: '1인분(참고량)', qty: 200 }], dims: ['g', 'ml'], source: `${SRC.T3}(즉석조리식품 찌개 200ml(g))` },
  porridge: { units: [{ label: '1그릇', qty: 250 }], dims: ['g', 'ml'], source: `${SRC.T3}(즉석조리식품 죽 250ml(g))` },
  soup_western: { units: [{ label: '1그릇', qty: 150 }], dims: ['g', 'ml'], source: `${SRC.T3}(즉석조리식품 스프 150ml(g))` },
  dumpling: { units: [{ label: '1인분(참고량)', qty: 150 }], dims: ['g'], source: `${SRC.T3}(만두 150g)` },
  kimchi: { units: [{ label: '1회 섭취참고량', qty: 40 }], dims: ['g'], source: `${SRC.T3}(배추김치·기타김치 40g)` },
  kimchi_water: { units: [{ label: '1회 섭취참고량', qty: 80 }], dims: ['g'], source: `${SRC.T3}(물김치 80g)` },
  jangajji: { units: [{ label: '1회 섭취참고량', qty: 15 }], dims: ['g'], source: `${SRC.T3}(장아찌 15g)` },
  pickle_other: { units: [{ label: '1회 섭취참고량', qty: 25 }], dims: ['g'], source: `${SRC.T3}(기타 절임 25g)` },
  tofu: { units: [{ label: '1회 섭취참고량', qty: 80 }], dims: ['g'], source: `${SRC.T3}(두부·묵 80g)` },
  oil: { units: [{ label: '1회 섭취참고량', qty: 5 }], dims: ['g', 'ml'], source: `${SRC.T3}(식용유지 5g(ml))` },
  soy_sauce: { units: [{ label: '1회 섭취참고량', qty: 5 }], dims: ['ml'], source: `${SRC.T3}(간장 5ml)` },
  paste: { units: [{ label: '1회 섭취참고량', qty: 10 }], dims: ['g'], source: `${SRC.T3}(된장·고추장 10g)` },
  paste_heavy: { units: [{ label: '1회 섭취참고량', qty: 25 }], dims: ['g'], source: `${SRC.T3}(춘장·청국장 25g)` },
  vinegar: { units: [{ label: '1회 섭취참고량', qty: 5 }], dims: ['ml'], source: `${SRC.T3}(식초 5ml)` },
  dressing: { units: [{ label: '1회 섭취참고량', qty: 15 }], dims: ['g'], source: `${SRC.T3}(드레싱 15g)` },
  mayo_ketchup: { units: [{ label: '1회 섭취참고량', qty: 10 }], dims: ['g'], source: `${SRC.T3}(마요네즈·케첩 10g)` },
  milk: { units: [{ label: '1회 섭취참고량', qty: 200 }], dims: ['ml'], source: `${SRC.T3}(우유 200ml)` },
  juice: { units: [{ label: '1회 섭취참고량', qty: 200 }], dims: ['ml'], source: `${SRC.T3}(과·채주스 200ml)` },
  coffee: { units: [{ label: '1회 섭취참고량', qty: 240 }], dims: ['ml'], source: `${SRC.T3}(커피 240ml)` },
  egg: { units: [{ label: '1회 섭취참고량', qty: 50, note: '식용란 1회 섭취참고량이며 1개 무게가 아님' }], dims: ['g'], source: `${SRC.T3}(식용란 50g)` },
  bread: { units: [{ label: '1회 섭취참고량', qty: 70 }], dims: ['g'], source: `${SRC.T3}(빵류 그 밖 70g)` },
  tteok: { units: [{ label: '1회 섭취참고량', qty: 100 }], dims: ['g'], source: `${SRC.T3}(떡류 100g)` },
  pizza: { units: [{ label: '1회 섭취참고량', qty: 150 }], dims: ['g'], source: `${SRC.T3}(피자 150g)` },
  burger_sandwich: { units: [{ label: '1회 섭취참고량', qty: 150 }], dims: ['g'], source: `${SRC.T3}(햄버거·샌드위치 150g)` },
  snack: { units: [{ label: '1회 섭취참고량', qty: 30 }], dims: ['g'], source: `${SRC.T3}(과자 기타 30g)` },
  icecream: { units: [{ label: '1회 섭취참고량', qty: 100 }], dims: ['g', 'ml'], source: `${SRC.T3}(아이스크림 100ml(g))` },
  sugar: { units: [{ label: '1회 섭취참고량', qty: 5 }], dims: ['g'], source: `${SRC.T3}(설탕 5g)` },
  syrup: { units: [{ label: '1회 섭취참고량', qty: 10 }], dims: ['g'], source: `${SRC.T3}(당시럽·올리고당·물엿 10g)` },
  honey: { units: [{ label: '1회 섭취참고량', qty: 20 }], dims: ['g'], source: `${SRC.T3}(벌꿀 20g)` },
};

function mkUnit(basis, label, qty, source, confidence, extra = {}) {
  const u = { label, [basis]: round1(qty), source, confidence };
  if (extra.note) u.note = extra.note;
  if (extra.default) u.default = true;
  return u;
}

export function baseUnit(basis) {
  return { label: basis, [basis]: 1, source: SRC.BASE, confidence: '기본' };
}

export function ruleUnits(rule, basis) {
  const r = UNIT_RULES[rule];
  if (!r || !r.dims.includes(basis)) return [];
  return r.units.map((u) => mkUnit(basis, u.label, u.qty, r.source, '공식', { note: u.note, default: u.default }));
}

const isFranchise = (origin) => /프랜차이즈/.test(origin || '');

export function dishServingUnit(rec, sizeStr) {
  const a = parseAmount(sizeStr);
  if (!a) return { unit: null, reason: sizeStr ? '식품중량_해석불가' : '식품중량_없음' };
  if (a.unit !== rec.basis) return { unit: null, reason: '식품중량_단위불일치' };
  if (a.qty <= 0) return { unit: null, reason: '식품중량_0이하' };
  if (a.qty === 100) return { unit: null, reason: '식품중량_기준량과같음' };
  const drink = rec.category === '커피' || rec.category === '우유음료';
  const fr = isFranchise(rec.origin);
  const label = fr ? (drink ? '1잔' : '1회 제공량(업체)') : '1인분';
  // 업체가 낸 값은 제품 표시와 같은 성격이라 '라벨', 식약처 분석·산출 1인분은 '공식'
  return { unit: mkUnit(rec.basis, label, a.qty, fr ? `${SRC.DB_DISH_SIZE}·업체 제공` : SRC.DB_DISH_SIZE, fr ? '라벨' : '공식'), reason: null };
}

// 기본 단위 고르기: 먼저 들어온 default 하나만 남기고, 없으면 첫 단위
function finalizeUnits(units, basis) {
  const seen = new Set();
  const out = [];
  for (const u of units) {
    const key = `${u.label}|${u[basis]}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(u);
  }
  let found = false;
  for (const u of out) {
    if (u.default && !found) { found = true; continue; }
    delete u.default;
  }
  if (!found && out.length) out[0].default = true;
  out.push(baseUnit(basis));
  return out;
}

export function unitsForDish(rec, sizeStr) {
  const list = [];
  const s = dishServingUnit(rec, sizeStr);
  if (s.unit) list.push({ ...s.unit, default: true });
  const rules = ruleUnits(rec.rule, rec.basis);
  // 식약처 DB 1인분이 있으면 그게 기본. 없으면 규칙 단위(밥 1공기 등)가 기본.
  if (s.unit) rules.forEach((u) => delete u.default);
  list.push(...rules);
  return { units: finalizeUnits(list, rec.basis), servingReason: s.reason };
}

export function unitsForRaw(rec) {
  return { units: finalizeUnits(ruleUnits(rec.rule, rec.basis), rec.basis) };
}

// 가공식품 "1회 섭취참고량" 칸 해석 → [{label, qty}] (기준 단위와 맞는 것만)
export function parseProcessedRef(refStr, basis, ctx = {}) {
  const t = String(refStr || '').trim();
  if (!t || t === '1식') return { refs: [], reason: t ? '참고량_1식' : '참고량_없음' };
  const name = noSpace(ctx.name || '');
  const lv4 = ctx.lv4 || '';
  const lv6 = ctx.lv6 || '';
  const simple = t.match(/^(\d+(?:\.\d+)?)\s*(g|ml)(?:\((g|ml)\))?$/i);
  if (simple) {
    const dims = [simple[2].toLowerCase(), simple[3] && simple[3].toLowerCase()].filter(Boolean);
    if (!dims.includes(basis)) return { refs: [], reason: '참고량_단위불일치' };
    return { refs: [{ label: '1회 섭취참고량', qty: Number(simple[1]) }], reason: null };
  }
  if (t.startsWith('드레싱')) {
    if (/드레싱/.test(name + lv4)) return basis === 'g' ? { refs: [{ label: '1회 섭취참고량(드레싱)', qty: 15 }], reason: null } : { refs: [], reason: '참고량_단위불일치' };
    if (/덮밥/.test(name + lv4)) return basis === 'g' ? { refs: [{ label: '1회 섭취참고량(덮밥소스)', qty: 165 }], reason: null } : { refs: [], reason: '참고량_단위불일치' };
    return { refs: [], reason: '참고량_복합값_선택불가' };
  }
  if (t.startsWith('생·숙면')) {
    if (basis !== 'g') return { refs: [], reason: '참고량_단위불일치' };
    if (lv6 === '생면' || lv6 === '숙면') return { refs: [{ label: '1회 섭취참고량', qty: 200 }], reason: null };
    if (lv6 === '건면') return /당면/.test(name + lv4) ? { refs: [{ label: '1회 섭취참고량(당면)', qty: 30 }], reason: null } : { refs: [{ label: '1회 섭취참고량', qty: 100 }], reason: null };
    if (lv6 === '유탕면') return { refs: [{ label: '참고량(봉지면)', qty: 120 }, { label: '참고량(용기면)', qty: 80 }], reason: null, noDefault: true };
    return { refs: [], reason: '참고량_복합값_선택불가' };
  }
  if (t.startsWith('액상 150ml')) {
    return basis === 'ml' ? { refs: [{ label: '1회 섭취참고량(액상)', qty: 150 }], reason: null } : { refs: [{ label: '1회 섭취참고량(호상)', qty: 100 }], reason: null };
  }
  if (t.startsWith('분말 20g')) {
    return basis === 'g' ? { refs: [{ label: '1회 섭취참고량(분말)', qty: 20 }], reason: null } : { refs: [{ label: '1회 섭취참고량(액상)', qty: 200 }], reason: null };
  }
  if (t.startsWith('레토르트')) {
    if (basis !== 'g') return { refs: [], reason: '참고량_단위불일치' };
    if (/레토르트/.test(name)) return { refs: [{ label: '1회 섭취참고량(레토르트)', qty: 200 }], reason: null };
    return { refs: [], reason: '참고량_복합값_선택불가' };
  }
  return { refs: [], reason: '참고량_해석불가' };
}

export function unitsForProcessed(rec, refStr, sizeStr, ctx) {
  const notes = [];
  const pr = parseProcessedRef(refStr, rec.basis, ctx);
  if (pr.reason) notes.push(pr.reason);
  const refUnits = pr.refs.map((r) => mkUnit(rec.basis, r.label, r.qty, SRC.DB_REF, '공식'));
  let pack = null;
  const a = parseAmount(sizeStr);
  if (!sizeStr) notes.push('식품중량_없음');
  else if (!a) notes.push('식품중량_해석불가');
  else if (a.unit !== rec.basis) notes.push('식품중량_단위불일치');
  else if (a.qty <= 0) notes.push('식품중량_0이하');
  else pack = mkUnit(rec.basis, '1포장', a.qty, SRC.DB_PACK_SIZE, '라벨');
  // 기본 단위: 포장이 참고량의 2배 이하(1회용으로 보임)면 1포장, 아니면 참고량, 참고량이 없으면 1포장
  const firstRef = pr.noDefault ? null : refUnits[0];
  if (pack && (!firstRef || pack[rec.basis] <= firstRef[rec.basis] * 2)) pack.default = true;
  else if (firstRef) firstRef.default = true;
  const list = pack ? [pack, ...refUnits] : refUnits;
  if (pack && refUnits.length && pack[rec.basis] < refUnits[0][rec.basis] * 0.5) notes.push('정보_포장이_참고량의_절반미만');
  return { units: finalizeUnits(list, rec.basis), notes };
}

// ───────────────────────── 레코드 변환 ─────────────────────────
function cls(row) {
  const v = (k) => { const x = normalizeText(row[k]); return x && x !== '해당없음' ? x : null; };
  return { lv3: v('식품대분류명'), lv4: v('대표식품명'), lv5: v('식품중분류명'), lv6: v('식품소분류명'), lv7: v('식품세분류명') };
}
const orNull = (s) => { const t = normalizeText(s); return t && t !== '해당없음' ? t : null; };

export function baseRecord(row, type, datasetId) {
  const basis = parseBasis(row['영양성분함량기준량']);
  const nameRaw = normalizeText(row['식품명']);
  return {
    id: `mfds:${String(row['식품코드']).trim()}`,
    name: displayName(row['식품명']),
    nameRaw,
    type,
    category: null,
    cls: cls(row),
    origin: orNull(row['식품기원명']),
    basis,
    per100: readNutrients(row),
    source: {
      db: '식약처 식품영양성분DB(통합)',
      dataset: datasetId,
      provider: orNull(row['출처명']),
      method: orNull(row['데이터생성방법명']),
      created: orNull(row['데이터생성일자']),
      updated: orNull(row['데이터기준일자']),
    },
    flags: [],
  };
}

export function applyChecks(rec) {
  const kc = kcalCheck(rec.per100);
  if (kc.checked) {
    rec.kcalCheck = { calc: kc.calc, ratio: kc.ratio === Infinity ? null : kc.ratio };
    if (kc.flag) rec.flags.push('kcal불일치20%');
  }
  if (!rec.basis) rec.flags.push('기준량_해석불가');
  rec.flags.push(...unitErrorFlags(rec.per100, rec.basis));
  return rec;
}

export function dishFromRow(row, datasetId = '15100070') {
  const rec = baseRecord(row, 'dish', datasetId);
  const c = categorizeDish(rec.cls, rec.name);
  rec.category = c.category;
  rec.rule = c.rule;
  rec.maker = orNull(row['업체명']);
  rec.servingRef = orNull(row['1인(회)분량 참고량']);
  rec.foodSize = orNull(row['식품중량']);
  const u = unitsForDish(rec, rec.foodSize);
  rec.units = u.units;
  if (u.servingReason) rec.unitNote = u.servingReason;
  rec.search = buildSearch(rec.name, [rec.cls.lv4 || '']);
  delete rec.rule;
  return applyChecks(rec);
}

export function rawFromRow(row, datasetId = '15100065') {
  const rec = baseRecord(row, 'raw', datasetId);
  const c = categorizeRaw(rec.cls, rec.name);
  rec.category = c.category;
  rec.rule = c.rule;
  rec.refuse = num(row['폐기율(%)']);
  rec.region = orNull(row['원산지역명']);
  rec.units = unitsForRaw(rec).units;
  rec.search = buildSearch(rec.name, [rec.cls.lv4 || '']);
  delete rec.rule;
  return applyChecks(rec);
}

export function processedFromRow(row, datasetId = '15100066') {
  const rec = baseRecord(row, 'processed', datasetId);
  rec.category = categorizeProcessed(rec.cls, rec.name);
  rec.maker = orNull(row['제조사명']);
  rec.importer = orNull(row['수입업체명']);
  rec.distributor = orNull(row['유통업체명']);
  rec.imported = row['수입여부'] === 'Y' ? true : row['수입여부'] === 'N' ? false : null;
  rec.country = orNull(row['원산지국명']);
  rec.reportNo = orNull(row['품목제조보고번호']);
  rec.servingRef = orNull(row['1회 섭취참고량']);
  rec.foodSize = orNull(row['식품중량']);
  const u = unitsForProcessed(rec, rec.servingRef, rec.foodSize, { name: rec.name, lv4: rec.cls.lv4, lv6: rec.cls.lv6 });
  rec.units = u.units;
  if (u.notes.length) rec.unitNote = u.notes.join(',');
  rec.search = buildSearch(rec.name, []);
  return applyChecks(rec);
}

// ───────────────────────── 중복 ─────────────────────────
const nutrKey = (r) => NUTRIENT_KEYS.map((k) => (r.per100[k] == null ? '' : r.per100[k])).join('|');

// 이름+제조사+기준+영양값+중량까지 같으면 완전 중복 → 하나만 남기고 dupIds에 기록
// 이름+영양값은 같은데 제조사만 다르면 OEM 가능성 → 둘 다 남기고 note
export function dedupe(records) {
  const exact = new Map();
  const kept = [];
  let removed = 0;
  for (const r of records) {
    const key = [noSpace(r.name), noSpace(r.maker || ''), r.basis, r.foodSize || '', nutrKey(r)].join('#');
    const first = exact.get(key);
    if (first) {
      (first.dupIds ||= []).push(r.id);
      if (r.origin && r.origin !== first.origin) {
        first.origins ||= [first.origin];
        if (!first.origins.includes(r.origin)) first.origins.push(r.origin);
      }
      removed++;
      continue;
    }
    exact.set(key, r);
    kept.push(r);
  }
  const oem = new Map();
  for (const r of kept) {
    const key = [noSpace(r.name), r.basis, nutrKey(r)].join('#');
    if (!oem.has(key)) oem.set(key, []);
    oem.get(key).push(r);
  }
  let oemGroups = 0;
  let oemRecords = 0;
  for (const group of oem.values()) {
    const makers = new Set(group.map((r) => noSpace(r.maker || '')));
    if (group.length > 1 && makers.size > 1) {
      oemGroups++;
      oemRecords += group.length;
      for (const r of group) {
        r.note = `같은 이름·영양값의 다른 제조사 ${makers.size - 1}곳 더 있음(OEM 가능성)`;
        r.oemOf = group.filter((x) => x !== r).map((x) => x.id).slice(0, 10);
      }
    }
  }
  return { kept, removed, oemGroups, oemRecords };
}

// ───────────────────────── 통계·샘플 ─────────────────────────
function inc(map, k, n = 1) { map[k] = (map[k] || 0) + n; }

export function computeStats(records) {
  const s = { total: records.length, byCategory: {}, flags: {}, kcal: { checked: 0, flagged: 0, flaggedAbs5: 0 }, units: { withNonBase: 0, withOfficial: 0, withLabel: 0, onlyBase: 0 }, unitNotes: {}, nutrientNull: {}, basis: {} };
  for (const r of records) {
    inc(s.byCategory, r.category);
    inc(s.basis, r.basis || 'null');
    for (const f of r.flags) inc(s.flags, f);
    if (r.kcalCheck) {
      s.kcal.checked++;
      if (r.flags.includes('kcal불일치20%')) {
        s.kcal.flagged++;
        if (Math.abs((r.per100.kcal || 0) - r.kcalCheck.calc) >= 5) s.kcal.flaggedAbs5++;
      }
    }
    const nonBase = r.units.filter((u) => u.confidence !== '기본');
    if (nonBase.length) s.units.withNonBase++; else s.units.onlyBase++;
    if (nonBase.some((u) => u.confidence === '공식')) s.units.withOfficial++;
    if (nonBase.some((u) => u.confidence === '라벨')) s.units.withLabel++;
    if (r.unitNote) for (const n of r.unitNote.split(',')) inc(s.unitNotes, n);
    for (const k of NUTRIENT_KEYS) if (r.per100[k] == null) inc(s.nutrientNull, k);
  }
  const pct = (n) => (s.total ? Math.round((n / s.total) * 1000) / 10 : 0);
  s.kcal.flaggedPctOfTotal = pct(s.kcal.flagged);
  s.kcal.flaggedPctOfChecked = s.kcal.checked ? Math.round((s.kcal.flagged / s.kcal.checked) * 1000) / 10 : 0;
  s.units.withNonBasePct = pct(s.units.withNonBase);
  s.units.withOfficialPct = pct(s.units.withOfficial);
  s.units.withLabelPct = pct(s.units.withLabel);
  return s;
}

export function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function pick(arr, n, rnd) {
  const idx = new Set();
  while (idx.size < Math.min(n, arr.length)) idx.add(Math.floor(rnd() * arr.length));
  return [...idx].map((i) => arr[i]);
}

function fmt(v) { return v == null ? '—' : String(v); }

function sampleMd(groups) {
  const lines = ['# 식약처 음식 DB 검수용 무작위 샘플 30건', '', '> food-build.mjs가 자동 생성. 무작위 시드 고정(20261122)이라 다시 돌려도 같은 행이 나옵니다.', '> 확인할 것: 이름이 자연스러운지, 범주가 맞는지, 기본 단위의 g(ml)이 그럴듯한지, 경고(flags)가 맞는지.', ''];
  let i = 1;
  for (const [title, rows] of groups) {
    lines.push(`## ${title}`, '');
    for (const r of rows) {
      const n = r.per100;
      const def = r.units.find((u) => u.default) || r.units[0];
      const defQty = def[r.basis];
      const kcalServ = n.kcal != null && defQty && def.confidence !== '기본' ? Math.round((n.kcal * defQty) / 100) : null;
      lines.push(`### ${i++}. ${r.name}  \`${r.id}\``);
      lines.push(`- 원래 이름: ${r.nameRaw} / 범주: **${r.category}** / 분류: ${[r.cls.lv3, r.cls.lv4, r.cls.lv5, r.cls.lv6].filter(Boolean).join(' > ') || '—'}`);
      lines.push(`- 기원·제조사: ${fmt(r.origin)} / ${fmt(r.maker)}`);
      lines.push(`- 100${r.basis}당: ${fmt(n.kcal)}kcal · 탄 ${fmt(n.carbs)} · 당 ${fmt(n.sugar)} · 섬유 ${fmt(n.fiber)} · 단 ${fmt(n.protein)} · 지 ${fmt(n.fat)} · 포화 ${fmt(n.satFat)} · 트랜스 ${fmt(n.transFat)} · 콜 ${fmt(n.cholesterol)}mg · 나트륨 ${fmt(n.sodium)}mg`);
      lines.push(`- 단위: ${r.units.map((u) => `${u.default ? '★' : ''}${u.label}=${u[r.basis]}${r.basis}(${u.confidence})`).join(', ')}`);
      lines.push(`- 기본 단위 1개당 약 ${fmt(kcalServ)}kcal / 식품중량 원문: ${fmt(r.foodSize)} / 참고량 원문: ${fmt(r.servingRef)}`);
      lines.push(`- 검사: 계산 kcal ${r.kcalCheck ? r.kcalCheck.calc : '—'} / 경고: ${r.flags.length ? r.flags.join(', ') : '없음'}${r.unitNote ? ` / 단위 메모: ${r.unitNote}` : ''}${r.note ? ` / ${r.note}` : ''}`);
      lines.push(`- 검색: 띄어쓰기 제거 \`${r.search.nospace}\` · 초성 \`${r.search.chosung}\`${r.search.aliases.length ? ` · 별칭 ${r.search.aliases.join(', ')}` : ''}`);
      lines.push('');
    }
  }
  return lines.join('\n');
}

// 앱 번들 크기 추정용 압축 형태(키 최소화, 필요한 필드만)
export function compact(r) {
  const n = r.per100;
  return [r.id.replace('mfds:', ''), r.name, r.maker || '', r.category, r.basis === 'ml' ? 1 : 0, NUTRIENT_KEYS.map((k) => n[k]), r.units.filter((u) => u.confidence !== '기본').map((u) => [u.label, u[r.basis], u.confidence === '공식' ? 1 : 2, u.default ? 1 : 0]), r.search.chosung, r.search.aliases];
}

// ───────────────────────── 메인 ─────────────────────────
async function loadFile(file, conv, datasetId, bad) {
  const out = [];
  for await (const row of readCsv(file)) {
    if (row.__bad) { bad.push(path.basename(file)); continue; }
    out.push(conv(row, datasetId));
  }
  return out;
}

function findRaw(dir, prefix) {
  return fs.readdirSync(dir).filter((f) => f.startsWith(prefix) && f.endsWith('.csv')).map((f) => path.join(dir, f));
}

export async function main(argv = process.argv.slice(2)) {
  const arg = (k, d) => { const i = argv.indexOf(k); return i >= 0 ? argv[i + 1] : d; };
  const rawDir = arg('--raw', path.join(DEFAULT_BASE, 'raw'));
  const outDir = arg('--out', path.join(DEFAULT_BASE, 'out'));
  fs.mkdirSync(outDir, { recursive: true });
  const t0 = Date.now();
  const bad = [];

  const dishFiles = findRaw(rawDir, '15100070');
  const rawFiles = findRaw(rawDir, '15100065');
  const procFiles = findRaw(rawDir, '15100066');
  if (!dishFiles.length || !rawFiles.length || !procFiles.length) throw new Error(`원본 CSV가 없습니다: ${rawDir}`);

  const dish = [];
  for (const f of dishFiles) for (const r of await loadFile(f, dishFromRow, "15100070", bad)) dish.push(r);
  const raw = [];
  for (const f of rawFiles) for (const r of await loadFile(f, rawFromRow, "15100065", bad)) raw.push(r);
  const proc = [];
  for (const f of procFiles) for (const r of await loadFile(f, processedFromRow, "15100066", bad)) proc.push(r);

  const dd = dedupe(dish);
  const rd = dedupe(raw);
  const pd = dedupe(proc);

  fs.writeFileSync(path.join(outDir, 'foods-dish.json'), JSON.stringify(dd.kept));
  fs.writeFileSync(path.join(outDir, 'foods-raw.json'), JSON.stringify(rd.kept));
  {
    const fd = fs.openSync(path.join(outDir, 'foods-processed.jsonl'), 'w');
    let buf = [];
    for (const r of pd.kept) {
      buf.push(JSON.stringify(r));
      if (buf.length >= 5000) { fs.writeSync(fd, buf.join('\n') + '\n'); buf = []; }
    }
    if (buf.length) fs.writeSync(fd, buf.join('\n') + '\n');
    fs.closeSync(fd);
  }

  // 번들 크기 추정: 음식+원재료 전부 + 가공식품 상위 N건(가장 최근 데이터생성일자 순, OEM 묶음은 대표 1건)
  const sizeOf = (arr) => { const s = JSON.stringify(arr.map(compact)); return { rows: arr.length, rawBytes: Buffer.byteLength(s), gzipBytes: zlib.gzipSync(s, { level: 9 }).length }; };
  const seenOem = new Set();
  const procRanked = pd.kept
    .filter((r) => !r.flags.length)
    .filter((r) => { if (!r.oemOf) return true; const k = [r.id, ...r.oemOf].sort()[0]; if (seenOem.has(k)) return false; seenOem.add(k); return true; })
    .sort((a, b) => String(b.source.created || '').localeCompare(String(a.source.created || '')));
  const bundle = {
    dish: sizeOf(dd.kept),
    raw: sizeOf(rd.kept),
    processedTop10k: sizeOf(procRanked.slice(0, 10000)),
    processedTop30k: sizeOf(procRanked.slice(0, 30000)),
    processedAllClean: sizeOf(procRanked),
    note: '압축 배열 형태(id·이름·제조사·범주·영양 10종·단위·초성·별칭). 가공식품 상위 N은 경고 없는 것 중 데이터생성일자 최신순(인기도 자료가 없어 임시 기준).',
  };
  bundle.dishRawPlus30k = { gzipBytes: bundle.dish.gzipBytes + bundle.raw.gzipBytes + bundle.processedTop30k.gzipBytes, rows: bundle.dish.rows + bundle.raw.rows + bundle.processedTop30k.rows };
  for (const f of ['foods-dish.json', 'foods-raw.json', 'foods-processed.jsonl']) {
    const b = fs.readFileSync(path.join(outDir, f));
    bundle[`file:${f}`] = { bytes: b.length, gzipBytes: zlib.gzipSync(b, { level: 6 }).length };
  }

  const stats = {
    generatedAt: new Date().toISOString(),
    inputs: { dish: dishFiles.map((f) => path.basename(f)), raw: rawFiles.map((f) => path.basename(f)), processed: procFiles.map((f) => path.basename(f)) },
    badLines: bad.length,
    rowsIn: { dish: dish.length, raw: raw.length, processed: proc.length },
    dedupe: {
      dish: { kept: dd.kept.length, exactRemoved: dd.removed, oemGroups: dd.oemGroups, oemRecords: dd.oemRecords },
      raw: { kept: rd.kept.length, exactRemoved: rd.removed, oemGroups: rd.oemGroups, oemRecords: rd.oemRecords },
      processed: { kept: pd.kept.length, exactRemoved: pd.removed, oemGroups: pd.oemGroups, oemRecords: pd.oemRecords },
    },
    dish: computeStats(dd.kept),
    raw: computeStats(rd.kept),
    processed: computeStats(pd.kept),
    bundle,
    seconds: Math.round((Date.now() - t0) / 100) / 10,
  };
  fs.writeFileSync(path.join(outDir, 'stats.json'), JSON.stringify(stats, null, 2));

  const rnd = mulberry32(20261122);
  fs.writeFileSync(path.join(outDir, 'samples.md'), sampleMd([
    ['음식(조리식품) 12건', pick(dd.kept, 12, rnd)],
    ['원재료성 6건', pick(rd.kept, 6, rnd)],
    ['가공식품 12건', pick(pd.kept, 12, rnd)],
  ]));
  console.log(`완료: 음식 ${dd.kept.length} · 원재료 ${rd.kept.length} · 가공 ${pd.kept.length} (${stats.seconds}s) → ${outDir}`);
  return stats;
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  main().catch((e) => { console.error(e); process.exit(1); });
}
