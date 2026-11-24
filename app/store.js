import {scopedKey,onStorageScopeChange} from './storage-scope.js';
import {emptyDB,normalizeDB} from './domain.js';
export let STORAGE_KEY=scopedKey('mylogue.v1');
export let RESTORE_PENDING_KEY=scopedKey('mylogue.restore.pending');
onStorageScopeChange(()=>{STORAGE_KEY=scopedKey('mylogue.v1');RESTORE_PENDING_KEY=scopedKey('mylogue.restore.pending');status={blocked:false,reason:''};loadedRaw=undefined;});
let status={blocked:false,reason:''};
let loadedRaw;
export function getLoadedRaw(){return loadedRaw}
export function getStorageStatus(){return {...status}}
export function getRecoveryRaw(){return localStorage.getItem(STORAGE_KEY)}
export function load(){
 try{
  if(localStorage.getItem(RESTORE_PENDING_KEY))throw Error('중단된 복원을 먼저 복구해 주세요.');
  const raw=localStorage.getItem(STORAGE_KEY),parsed=raw?JSON.parse(raw):null,db=parsed?normalizeDB(parsed,{lenient:true}):emptyDB();/* 4.27.0 DAT-01: 틀린 기록만 따로 보관하고 연다 */
  loadedRaw=raw;
  // 4.27.0 추가 점검 A-4: 이번에 새로 가려낸 보관분은 바로 적어 둔다(백업·내려받기에 곧바로 담기게). 못 적어도 여는 데는 지장 없음
  if(parsed&&(db.quarantine?.length||0)>(Array.isArray(parsed.quarantine)?parsed.quarantine.length:0)){try{const enc=JSON.stringify(db);localStorage.setItem(STORAGE_KEY,enc);loadedRaw=enc}catch{}}
  status={blocked:false,reason:''};return db;
 }catch(error){status={blocked:true,reason:error.message||'저장소를 읽을 수 없습니다.'};return emptyDB()}
}
export function save(db){ /* db를 바꿔 쓰므로 let처럼 다룸 */
 if(status.blocked||localStorage.getItem(RESTORE_PENDING_KEY))throw Error('기존 기록 보호를 위해 저장을 잠갔습니다. 원본을 내려받고 백업을 복원해 주세요.');
 const raw=localStorage.getItem(STORAGE_KEY);
 let old=null;if(raw){try{old=normalizeDB(JSON.parse(raw),{lenient:true})}catch(error){status={blocked:true,reason:error.message};throw Error('기존 기록을 읽을 수 없어 저장하지 않았습니다. 원본 복구가 필요합니다.')}}
 // 따로 보관한 기록은 다른 화면이 db를 새로 만들어도 잃지 않게 이어 붙인다
 if(old?.quarantine?.length&&!db.quarantine?.length)db={...db,quarantine:old.quarantine};
 const encoded=JSON.stringify(db);try{localStorage.setItem(STORAGE_KEY,encoded)}catch(error){/* 4.27.0 전수검사 DAT-03: 용량 초과가 영어 오류로만 보였다 */if(/quota|exceed/i.test(String(error?.name||'')+String(error?.message||'')))throw Error('이 기기의 저장 공간이 가득 찼어요. 지금 기록은 그대로 있어요. 설정에서 백업 파일을 저장한 뒤 다시 시도해 주세요.');throw error}loadedRaw=encoded;return db;
}
export function recoverValidatedDB(db){
 const valid=normalizeDB(db),encoded=JSON.stringify(valid);localStorage.setItem(STORAGE_KEY,encoded);loadedRaw=encoded;
 status={blocked:false,reason:''};return valid;
}
export function add(db,kind,item){const next={...db,[kind]:[...(db[kind]||[]),item]};return save(next)}
export function remove(db,kind,id){const next={...db,[kind]:db[kind].filter(x=>x.id!==id)};return save(next)}
export function replace(db,kind,item){const next={...db,[kind]:db[kind].map(x=>x.id===item.id?item:x)};return save(next)}
