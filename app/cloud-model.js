import {emptyDB, normalizeDB} from './domain.js';
export const LISTS = ['body','meals','foods','workouts','routines','machines','customExercises','recipes'];
const MAPS = ['dayStates','checkins','settings'];
export function validRecordKey(key) {
  return typeof key==='string' && /^(body|meals|foods|workouts|routines|machines|customExercises|recipes|favorites|dayStates|checkins|settings)~.+$/.test(key);
}
export function stableJSON(value) {
  if (Array.isArray(value)) return `[${value.map(stableJSON).join(',')}]`;
  if (value && typeof value === 'object') return `{${Object.keys(value).sort().map(k=>`${JSON.stringify(k)}:${stableJSON(value[k])}`).join(',')}}`;
  return JSON.stringify(value);
}
const clone = x => JSON.parse(JSON.stringify(x));
export function cloudRecords(db) {
  const records = {};
  const add = (kind,id,value) => {
    const key = `${kind}~${encodeURIComponent(id)}`;
    if (!id || new TextEncoder().encode(key).length > 1400 || Object.hasOwn(records,key)) throw Error('동기화할 기록 ID가 중복되거나 너무 깁니다.');
    const payload = stableJSON(value);
    if (new TextEncoder().encode(payload).length > 800000) throw Error('동기화할 기록 하나가 너무 큽니다. 사진은 로컬에 보관해 주세요.');
    records[key] = payload;
  };
  for (const kind of LISTS) for (const item of db[kind] || []) {
    const value = clone(item); if (kind === 'machines') delete value.photoDataUrl;
    add(kind,item.id,value);
  }
  for (const id of db.favorites || []) add('favorites',id,true);
  for (const kind of MAPS) for (const [id,value] of Object.entries(db[kind] || {})) add(kind,id,value);
  return records;
}
// 4.27.0 재검사 N-1: 따로 보관한 기록의 키. 이 기기엔 없지만 지운 게 아니므로 동기화가 서버에 '삭제'로 올리지 않는다.
export function quarantineKeys(db = {}) {
  const keys = new Set();
  for (const q of db.quarantine || []) { const id = q?.id ?? (q?.raw && typeof q.raw === 'object' ? q.raw.id : undefined); if (id == null || id === '') continue; const key = `${q.kind}~${encodeURIComponent(String(id))}`; if (validRecordKey(key)) keys.add(key); }
  return keys;
}
export function recordsToDB(records, local = emptyDB()) {
  const out = emptyDB(), bad = [];
  for (const [key,payload] of Object.entries(records)) {
    if(!validRecordKey(key))throw Error('서버에 알 수 없는 기록이 있습니다.');
    if (payload == null) continue;
    const pos = key.indexOf('~'), kind = key.slice(0,pos), id = decodeURIComponent(key.slice(pos+1));
    // 서버의 기록 한 건이 틀려도 동기화 전체가 멈추지 않게, 그 기록만 따로 보관한다(서버 원본은 그대로).
    let value; try { value = JSON.parse(payload); } catch { bad.push({kind,id,raw:payload,reason:'서버 기록을 읽지 못함'}); continue; }
    if (LISTS.includes(kind)) {
      if (!value || typeof value !== 'object' || value.id !== id) { bad.push({kind,id,raw:value,reason:'서버 기록 ID가 일치하지 않음'}); continue; }
      if (kind === 'machines') value.photoDataUrl = local.machines?.find(x=>x.id===id)?.photoDataUrl || '';
      out[kind].push(value);
    } else if (kind === 'favorites') out.favorites.push(id);
    else if (MAPS.includes(kind) && !['__proto__','prototype','constructor'].includes(id)) out[kind][id] = value;
    else throw Error('서버에 알 수 없는 기록이 있습니다.');
  }
  out.quarantine = [...(local.quarantine || []), ...bad];
  return normalizeDB(out, {lenient: true});
}
// Missing entries represent deletion. Remote tombstones retain their revision permanently.
// 4.1.2 새 기기 첫 동기화: 이 계정으로 한 번도 동기화한 적 없고(baseline 없음) 이 기기에 직접 남긴 기록이 없으면,
// 기본 설정값끼리 부딪히는 '충돌'로 멈추지 않고 서버 값을 쓴다(서버에 없는 키는 이 기기 값 유지). 대표님: 앱에 로그인하니 첫 사용자처럼 비어 있음.
export function isFreshDevice(db = {}, baseline = {}) {
  return Object.keys(baseline).length === 0 && LISTS.every(k => !(db[k]||[]).length) && !(db.favorites||[]).length;
}
// 세 갈래 합치기: 기준(b)에서 이 기기(l)가 바꾼 칸은 l, 아니면 서버(r). 객체가 아니면 이 기기 값.
export function mergeSetting(l, r, b){
  try {
    const L = JSON.parse(l), R = JSON.parse(r), B = b ? JSON.parse(b) : {};
    // 4.27.0 재검사 N-5: 목록(헬스장·세션 이름 등)은 양쪽에서 더한 것을 모두 남기고, 어느 한쪽이 뺀 것만 뺀다.
    if (Array.isArray(L) && Array.isArray(R)) {
      const key = x => JSON.stringify(x), base = new Set((Array.isArray(B) ? B : []).map(key)), inL = new Set(L.map(key)), inR = new Set(R.map(key)), seen = new Set(), out = [];
      for (const x of [...L, ...R]) { const k = key(x); if (seen.has(k) || (base.has(k) && (!inL.has(k) || !inR.has(k)))) continue; seen.add(k); out.push(x); }
      return JSON.stringify(out);
    }
    if (!L || !R || typeof L !== 'object' || typeof R !== 'object' || Array.isArray(L) || Array.isArray(R)) return l;
    const out = {...R};
    for (const k of new Set([...Object.keys(L), ...Object.keys(B || {})])) { if (JSON.stringify(L[k]) !== JSON.stringify(B?.[k])) { if (k in L) out[k] = L[k]; else delete out[k]; } }
    return JSON.stringify(out);
  } catch { return l; }
}
export function planSync(local, remote, baseline = {}, choices = {}, {fresh = false, hold = new Set()} = {}) {
  const merged = {}, writes = [], conflicts = [];
  // 4.4.1 점검 B-1: 이 계정으로 처음 맞추는 기기(baseline 없음)는 기록이 이미 있어도 설정·하루 상태·체크인은 서버 값을 쓴다.
  const firstSync = Object.keys(baseline).length === 0, isSetting = key => /^(settings|dayStates|checkins|favorites)~/.test(key);
  for (const key of new Set([...Object.keys(local),...Object.keys(remote),...Object.keys(baseline)])) {
    const l = local[key] ?? null, r = remote[key]?.payload ?? null, b = baseline[key]?.payload ?? null;
    if (l === null && hold.has(key)) { if (r !== null) merged[key] = r; continue; } // 따로 보관 중: 서버 값 그대로
    let value;
    if (l === r) value = l;
    else if (l === b) value = r;
    else if (r === b && !(r===null && remote[key]?.revision>0 && !baseline[key])) value = l;
    else if (choices[key]?.side === 'local' && choices[key].local === l && choices[key].remote === r) value = l;
    else if (choices[key]?.side === 'remote' && choices[key].local === l && choices[key].remote === r) value = r;
    else if (fresh && !baseline[key]) value = r ?? l;
    else if (firstSync && isSetting(key)) value = r ?? l;
    // 4.27.0 전수검사 DAT-05: 설정·하루 상태·체크인은 양쪽이 바꿔도 동기화 전체를 멈추지 않는다.
    // 설정은 칸마다 합치고(바뀐 쪽 우선, 둘 다 바꿨으면 이 기기), 나머지는 이 기기 값으로. 기록(식사·운동 등)은 예전처럼 물어본다.
    else if (isSetting(key) && l !== null && r !== null) value = mergeSetting(l, r, b);
    else { conflicts.push({key,local:l,remote:r}); continue; }
    if (value !== null) merged[key] = value;
    if (value !== r) writes.push({key,payload:value,expectedRevision:remote[key]?.revision || 0});
  }
  return {merged,writes,conflicts};
}
