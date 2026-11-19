const fs=require('node:fs');
const vm=require('node:vm');
const assert=require('node:assert/strict');
const path=require('node:path');
const nodes=new Map();
function node(id){if(!nodes.has(id))nodes.set(id,{innerHTML:'',textContent:'',value:'',classList:{add(){},remove(){},toggle(){}},scrollTop:0});return nodes.get(id)}
const ctx={
 document:{getElementById:node,querySelectorAll(){return[]},querySelector(){return null},addEventListener(){}},
 setTimeout(){return 1},clearTimeout(){},console
};
vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(__dirname,'script.js'),'utf8'),ctx);
const run=code=>vm.runInContext(code,ctx);
for(const key of ['f1','f2','f3','f4','f5','w1','w2','w3','w4','w5']){
 run(`mode='${key}';render()`);
 assert.ok(node('screen').innerHTML.length>350,`${key} 화면 비어 있음`);
 assert.ok(node('page-title').textContent,`${key} 제목 없음`);
}
run("mode='f1';action('select-food','rice');action('confirm-food','');action('edit-food','0');st().grams=250;action('confirm-food','')");
assert.equal(run('st().meal.length'),1,'음식 중량 수정 시 중복 추가');
assert.equal(run('st().meal[0].g'),250,'음식 중량 수정 실패');
run("mode='f3';action('manage-food','rice');st().grams=270;action('add-preset','')");
assert.equal(run("f('rice').grams.includes(270)"),true,'g 선택지 추가 실패');
run("mode='f4';st().note='김밥';action('save-draft','')");
assert.equal(run('st().drafts.length'),1,'식사 임시 저장 실패');
assert.equal(run('total(st().meal).kcal'),0,'미확정 식사 합계 오염');
run("action('confirm-draft','0');st().meal.push({id:'rice',g:100});action('finalize-draft','')");
assert.equal(run('st().drafts.length'),0,'식사 확정 실패');
run("mode='f5';action('save-result','')");
assert.equal(run('st().result'),true,'식사 결과 열기 실패');
run("mode='w1';action('select-ex','leg');action('save-set','');action('edit-set','0');st().kg=130;action('save-set','')");
assert.equal(run('st().sets.length'),1,'세트 수정 시 중복 추가');
assert.equal(run('st().sets[0].kg'),130,'세트 수정 실패');
run("action('repeat-set','')");
assert.equal(run('st().sets.length'),2,'동일 값 다음 세트 기록 실패');
assert.equal(run('st().sets[1].kg'),130,'동일 값 세트가 직전 중량을 복사하지 못함');
run("action('copy-set','')");
assert.equal(run('st().sets.length'),2,'중량 변경 진입이 세트를 조기 저장함');
assert.equal(run('st().machine'),run('st().sets[1].machine'),'다음 세트에 머신이 유지되지 않음');
run("mode='w4';st().note='레그프레스 60kg 12회';action('parse-note','')");
assert.equal(run('st().kg'),60,'세트 메모 중량 파싱 실패');
assert.equal(run('st().reps'),12,'세트 메모 횟수 파싱 실패');
run("action('save-work-draft','')");
assert.equal(run('st().sets.length'),0,'임시 세트가 완료 세트에 포함됨');
run("mode='w5';action('save-set','leg');action('copy-set','')");
assert.equal(run('st().sets.length'),1,'이전 값 복사가 세트를 조기 저장함');
assert.equal(run('st().open'),'set','이전 값 복사 후 확인 화면 없음');
const css=fs.readFileSync(path.join(__dirname,'style.css'),'utf8');
assert.match(css,/@media\(max-width:800px\)/,'모바일 레이아웃 없음');
assert.match(css,/@media\(max-width:450px\)/,'좁은 화면 대응 없음');
console.log('PASS: 10 screens render, core food/workout flows, responsive rules');
