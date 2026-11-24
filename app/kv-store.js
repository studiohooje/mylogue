// 4.27.0 전수검사 DAT-02: localStorage(약 5MB)에 동기화 직전 사본(기기 전체 + 서버 전체)까지 두어 4~6개월이면 한도를 넘었다.
// 크고 자주 읽지 않는 자료는 IndexedDB(용량이 훨씬 큼)에 둔다. IndexedDB를 못 쓰면 null을 돌려주고, 부르는 쪽이 예전 방식으로 둔다.
// 이 파일은 app.js를 import하지 않는다.
const DB = 'mylogue.kv', STORE = 'kv';
let opening = null;
function open(){
 if (!globalThis.indexedDB) return Promise.resolve(null);
 if (!opening) opening = new Promise(resolve => {
  try {
   const req = indexedDB.open(DB, 1);
   req.onupgradeneeded = () => { try { req.result.createObjectStore(STORE); } catch {} };
   req.onsuccess = () => resolve(req.result);
   req.onerror = () => resolve(null);
   req.onblocked = () => resolve(null);
  } catch { resolve(null); }
 });
 return opening;
}
const tx = async (mode, fn) => { const db = await open(); if (!db) return null; return new Promise(resolve => { try { const t = db.transaction(STORE, mode), s = t.objectStore(STORE), r = fn(s); t.oncomplete = () => resolve(r?.result ?? true); t.onerror = () => resolve(null); t.onabort = () => resolve(null); } catch { resolve(null); } }); };
export const kvSet = (key, value) => tx('readwrite', s => s.put(value, key));
export const kvGet = key => tx('readonly', s => s.get(key));
export const kvDel = key => tx('readwrite', s => s.delete(key));
