const fs=require('node:fs');
const vm=require('node:vm');
const assert=require('node:assert/strict');
const path=require('node:path');
const nodes=new Map();
function node(selector){if(!nodes.has(selector))nodes.set(selector,{innerHTML:'',textContent:'',className:'',classList:{add(){},remove(){},toggle(){}}});return nodes.get(selector)}
const context={document:{querySelector:node,querySelectorAll(){return[]},addEventListener(){}},setTimeout(){},clearTimeout(){},console,Date};
vm.createContext(context);
vm.runInContext(fs.readFileSync(path.join(__dirname,'script.js'),'utf8'),context);
const run=code=>vm.runInContext(code,context);
for(let pattern=0;pattern<5;pattern++)for(const domain of ['meal','workout']){
 run(`state.pattern=${pattern};state.domain='${domain}';reset();render()`);
 assert.ok(node('#screen').innerHTML.includes(domain==='meal'?'식단 기록':'운동 기록'));
 run("action({dataset:{action:'open'}})");
 assert.equal(run('state.open'),true);
 run(`action({dataset:{action:'add',id:'${domain==='meal'?'rice':'leg'}'}})`);
 assert.equal(run('state.selected.length'),1);
 if(pattern===0)run("action({dataset:{action:'next'}})");
 if(domain==='meal'){
  run("action({dataset:{action:'grams',index:'0',value:'250'}})");
  assert.equal(run('state.selected[0].grams'),250);
  assert.ok(node('#screen').innerHTML.includes('412.5'));
 }else{
  run("action({dataset:{action:'add-set',index:'0'}})");
  assert.equal(run('state.selected[0].sets.length'),2);
  assert.ok(node('#screen').innerHTML.includes('2세트'));
 }
 if(pattern===0){run("action({dataset:{action:'next'}})");assert.equal(run('state.step'),2)}
 run("action({dataset:{action:'save'}})");
 assert.equal(run('state.selected.length'),0);
 assert.equal(run('state.open'),false);
 assert.ok(node('#screen').innerHTML.includes('1개 저장'));
}
const css=fs.readFileSync(path.join(__dirname,'style.css'),'utf8');
assert.match(css,/@media\(max-width:550px\)/);
assert.match(css,/word-break:keep-all/);
console.log('PASS: 5 patterns × 2 domains, selection, grams, sets, save, mobile rules');
