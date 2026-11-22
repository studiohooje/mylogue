import test from 'node:test';
import assert from 'node:assert/strict';
const mem=new Map();globalThis.localStorage={getItem:k=>mem.has(k)?mem.get(k):null,setItem:(k,v)=>mem.set(k,String(v)),removeItem:k=>mem.delete(k)};
const {addPastedDrafts,listAIDrafts,resolveAIDraft,onLocalConfirm,localDraftMode}=await import('../ai-drafts.js');

test('4.11.0 승인 전에는 붙여넣은 초안이 이 기기 검토함에 들어가고, 확정하면 이 기기 기록에 저장',async()=>{
 assert.equal(localDraftMode(),true);
 const meal={type:'meal',parsedData:{items:[{date:'2026-11-20',slot:'점심',name:'비빔밥',servingQty:1,servingUnit:'그릇',calories:600,loggedAt:'2026-11-20T12:30:00'}]}};
 const r=await addPastedDrafts([meal]);assert.equal(r.added,1);assert.equal(r.local,true);
 const again=await addPastedDrafts([meal]);assert.equal(again.duplicate,1);
 const list=await listAIDrafts();assert.equal(list.length,1);assert.ok(list[0].id.startsWith('l-'));assert.equal(typeof list[0].createdAt.toDate,'function');
 let saved=[];onLocalConfirm(recs=>{saved=recs});
 const ids=await resolveAIDraft(list[0],{action:'confirm',reviewedData:list[0].parsedData,existing:[]});
 assert.equal(ids.length,1);assert.equal(saved[0].kind,'meals');assert.equal(saved[0].record.name,'비빔밥');assert.ok(!saved[0].record.planned);
 const after=await listAIDrafts();assert.equal(after[0].status,'confirmed');
 await assert.rejects(()=>resolveAIDraft(after[0],{action:'confirm',existing:[]}),/이미 처리/);
 // 같은 걸 다시 붙여넣으면 새 대기 초안으로
 const third=await addPastedDrafts([meal]);assert.equal(third.added,1);
 const p=(await listAIDrafts()).find(d=>d.status==='pending');
 await assert.rejects(()=>resolveAIDraft(p,{action:'confirm',existing:saved}),e=>e.code==='duplicate');
 await resolveAIDraft(p,{action:'reject'});assert.equal((await listAIDrafts()).filter(d=>d.status==='pending').length,0);
});

test('4.11.0 계정 삭제: 이 기기에서는 그 계정 키만 지우고 게스트 기록은 남긴다',async()=>{
 const {clearAccountLocal}=await import('../cloud-sync.js');
 const m=new Map([['mylogue.v1','guest'],['mylogue.v1.user.abc','mine'],['mylogue.localDrafts.user.abc','[]'],['mylogue.v1.user.other','theirs']]);
 const store={get length(){return m.size},key:i=>[...m.keys()][i],removeItem:k=>m.delete(k)};
 let dropped='';const n=clearAccountLocal('abc',store,{deleteDatabase:x=>{dropped=x}});
 assert.equal(n,2);assert.deepEqual([...m.keys()],['mylogue.v1','mylogue.v1.user.other']);assert.equal(dropped,'mylogue.photos.user.abc');
});
