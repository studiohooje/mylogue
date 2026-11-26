// 5.1.0 설정 › 다른 곳 기록 가져오기: 버튼·파일 처리
import {$s,$f} from './app-state.js';
import {backfillPrompt,rawRecordsFromText,rawRecordsFromCSV,buildImport,applyImport,undoImport,TEMPLATES} from './data-import.js';
const st=()=>$s.impSt||($s.impSt={});
const readChoices=()=>Object.fromEntries([...document.querySelectorAll('[data-imp-choice]')].map(x=>[x.dataset.impChoice,x.value]));
export function importClick(t){
 const d=t.dataset||{};
 if(t.id==='imp-copy-prompt'){const text=backfillPrompt();(navigator.clipboard?.writeText?navigator.clipboard.writeText(text):Promise.reject()).then(()=>$f.toast('지시문을 복사했어요. 내 AI 대화에 예전 기록과 함께 붙여 넣어 주세요.')).catch(()=>{st().text=text;$f.render();$f.toast('복사가 막혀 있어요. 아래 칸의 글을 길게 눌러 복사해 주세요.')});return true}
 if(t.id==='imp-read-text'){const text=document.getElementById('imp-text')?.value||'';const raw=rawRecordsFromText(text);if(!raw.length)throw Error('AI 답에서 기록을 찾지 못했어요. 코드 블록(```json … ```)을 그대로 붙여 넣어 주세요.');Object.assign(st(),{text,plan:buildImport(raw,{label:'AI 정리'}),choice:{}});$f.render();setTimeout(()=>document.querySelector('.imp-prev')?.scrollIntoView?.({behavior:'smooth',block:'start'}),50);return true}
 if(d.impTemplate){$f.download(`mylogue-${d.impTemplate}-서식.csv`,'﻿'+TEMPLATES[d.impTemplate],'text/csv');return true}
 if(t.id==='imp-apply'){const s=st();if(!s.plan)return true;const r=applyImport($s.db,s.plan,readChoices());$s.db=$f.save(r.db);const batch=r.batch,removed=r.removed;$s.impSt={};$f.render();$f.toastUndo(`${r.added}개 기록을 가져왔어요.`,()=>{$s.db=$f.save(undoImport($s.db,batch,removed));$f.render()},9000);$s.impRemoved={...($s.impRemoved||{}),[batch]:removed};return true}
 if(d.impUndo){const removed=($s.impRemoved||{})[d.impUndo]||[];if(!confirm('이 묶음으로 넣은 기록을 모두 지울까요?'))return true;$s.db=$f.save(undoImport($s.db,d.impUndo,removed));$f.render();$f.toast('가져온 묶음을 되돌렸어요.');return true}
 return false;
}
export async function importChange(t){
 if(t.id!=='imp-file')return false;
 const file=t.files?.[0];if(!file)return true;
 try{const text=await file.text();const raw=/\.csv$/i.test(file.name)||/^[^{[]*[,]/.test(text.split(/\r?\n/)[0]||'')&&!/^\s*[{[]/.test(text)?rawRecordsFromCSV(text):rawRecordsFromText(text);if(!raw.length)throw Error('파일에서 기록을 찾지 못했어요. 서식의 머리글(첫 줄)을 그대로 써 주세요.');Object.assign(st(),{plan:buildImport(raw,{label:file.name.slice(0,40)}),choice:{}});$f.render()}catch(e){$f.toast(e.message||'파일을 읽지 못했어요.')}
 return true;
}
