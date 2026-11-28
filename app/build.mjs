import fs from 'node:fs/promises';import path from 'node:path';import {fileURLToPath} from 'node:url';import {packageApk} from './package-apk.mjs';import {dedupeBrandRows} from './food-dedupe.js';
const root=path.dirname(fileURLToPath(import.meta.url)),out=path.join(root,'dist');await fs.rm(out,{recursive:true,force:true});await fs.mkdir(path.join(out,'vendor','core'),{recursive:true});await fs.mkdir(path.join(out,'vendor','lang'),{recursive:true});
for(const f of ['exercise-guide.js','rest-screen.js','scan-fx.js','kv-store.js','meal-rank.js','food-register.js','meal-when.js','workout-plan.js','maintenance.js','templates-data.js','pilates-moves-data.js','machine-models-data.js','machine-names-ko.js','machine-tag.js','body-part.js','workout-day.js','gym-browse.js','record-tools.js','exercise-enrich.js','exercise-burn.js','food-db.js','back-on-track.js','admin-log.js','native-auth.js','pilates.js','pilates-art.js','portion-dict.js','exercise-knowledge.js','coach-knowledge.js','coach-engine.js','plan.js','ai-client.js','ai-coach-ui.js','discovery.js','phase.js','home-voice.js','pilates-pick.js','what-to-eat.js','personas.js','micro-report.js','plus-tools.js','experiment.js','program-builder.js','weight-why.js','help.js','share-cards.js','landing.js','legal.js','privacy.html','delete-account.html','error-log.js','notice.json','catalog-promote.js','exercise-meta.js','ai-chat.js','ai-chat-fake.js','app-chat.js','ai-mode.js','ai-guard.js','cost-alert.js','terms.html','storage-scope.js','firebase-config.js','cloud-model.js','cloud-sync.js','cloud-ui.js','catalog-cloud.js','food-provider.js','food-catalog.js','index.html','story.html','app.css','quick-entry.css','aurora-theme.css','aurora-motion.css','brand-icons.js','app.js','app-state.js','app-pages.js','app-modals.js','app-actions.js','widget-sync.js','health-import.js','timeline-view.js','food-view.js','quick-entry.js','exercise-family.js','my-book.js','domain.js','store.js','inbody.js','inbody-photo.js','inbody-ai.js','schedule-plan.js','schedule-actions.js','insights.js','training.js','ai-adapter.js','ai-drafts.js','bridge-proof.js','ai-inbox.js','backup.js','session.js','meal-batch.js','model-features.js','exercise-ui.js','atlas-art.js','profile-forms.js','install.js','halo.js','prefs.js','guide.js','places.js','admin.js','admin-panel.js','nutrition-plan.js','quick-edit.js','profile.js','intl-cache.js','simple-input.js','live-session.js','session-summary.js','summary-actions.js','workout-name.js','workout-check.js','set-prefill.js','workout-menu.js','snap-camera.js','data-import.js','import-actions.js','page-more.js','premium-analysis.js','exercise-data.js','machines-catalog.js','analysis-report.js','suggest.js','suggest-ui.js','machine-brands.js','ai-paste.js','ai-prompt.js','ai-config.js','body-series.js','coach-ui.js','macro-plan.js','when-chips.js','date-bar.js','diet-trends.js','band-chart.js','exercise-art.js','exercise-art-ui.js','exercise-base.js','mate-share.js','mate-cloud.js','mate-camera.js','mate-ui.js','auth-ui.js','mytag.js','workout-story.js','motivation.js','trash.js','gym-machines.js','food-check.js','reminders.js','body-flow.js','workout-flow.js','workout-page.js','schedule-view.js','coach.js','coach-live.js','input-sources.js','coach-pass.js','coach-plan.js','coach-diet.js','recap-stars.js','monthly-recap.js','coach-cloud.js','coach-controller.js','coach2.js','coach2-data.js','coach2-ui.js','coach2-sheets.js','coach2-demo.js','keyboard.js','kr-holidays.js','qr.js','manifest.webmanifest','icon.svg','sw.js'])await fs.copyFile(path.join(root,f),path.join(out,f));
for(const f of ['icon-192.png','icon-512.png','apple-touch-icon.png','og-image.png'])await fs.copyFile(path.join(root,f),path.join(out,f));
await fs.mkdir(path.join(out,'art','ex'),{recursive:true});for(const f of await fs.readdir(path.join(root,'art','ex')).catch(()=>[]))if(/\.webp$/.test(f))await fs.copyFile(path.join(root,'art','ex',f),path.join(out,'art','ex',f));for(const f of await fs.readdir(path.join(root,'art')))if(/\.webp$/.test(f))await fs.copyFile(path.join(root,'art',f),path.join(out,'art',f));/* 5.0.4 프로필 기본 아이콘 */await fs.mkdir(path.join(out,'art','avatar'),{recursive:true});for(const f of await fs.readdir(path.join(root,'art','avatar')).catch(()=>[]))if(/\.webp$/.test(f))await fs.copyFile(path.join(root,'art','avatar',f),path.join(out,'art','avatar',f));
for(const f of ['catalog.js','nutrition.js','nutrition-goals.js','workout-times.js','reports.js','ui-helpers.js'])if(await fs.stat(path.join(root,f)).catch(()=>null))await fs.copyFile(path.join(root,f),path.join(out,f));
for(const f of ['tesseract.min.js','worker.min.js'])await fs.copyFile(path.join(root,'node_modules','tesseract.js','dist',f),path.join(out,'vendor',f));
const core=path.join(root,'node_modules','tesseract.js-core');for(const f of await fs.readdir(core))if(/^tesseract-core.*\.(wasm|js)$/.test(f))await fs.copyFile(path.join(core,f),path.join(out,'vendor','core',f));
for(const lang of ['kor','eng'])await fs.copyFile(path.join(root,'node_modules','@tesseract.js-data',lang,'4.0.0',`${lang}.traineddata.gz`),path.join(out,'vendor','lang',`${lang}.traineddata.gz`));





await fs.mkdir(path.join(out,'vendor','firebase'),{recursive:true});
for(const f of ['firebase-app.js','firebase-auth.js','firebase-firestore.js','firebase-storage.js','NOTICE.txt','LICENSE.txt'])await fs.copyFile(path.join(root,'vendor','firebase',f),path.join(out,'vendor','firebase',f));

console.log(`배포용 웹 앱 생성: ${out}`);
await fs.cp(path.join(root,'vendor','capacitor'),path.join(out,'vendor','capacitor'),{recursive:true});
const version=JSON.parse(await fs.readFile(path.join(root,'package.json'),'utf8')).version;
const apkName=`Mylogue-Beta-${version}-debug.apk`;
const apk=path.join(root,'..',apkName);
if(await fs.stat(apk).catch(()=>null)){
 await fs.mkdir(path.join(out,'downloads'),{recursive:true});
 await fs.copyFile(apk,path.join(out,'downloads',apkName));
 const zipName=`Mylogue-Beta-${version}-debug.zip`;
 const zip=path.join(root,'..',zipName);
 await packageApk(apk,zip);
 await fs.copyFile(zip,path.join(out,'downloads',zipName));
}

await fs.cp(path.join(root,'fonts'),path.join(out,'fonts'),{recursive:true});

// 4.17.0 음식 DB를 둘로 나눠 첫 검색을 빠르게: 기본(k·d·r·e·s·x) / 브랜드(p·m·f)
{const db=JSON.parse(await fs.readFile(path.join(root,'food-db.json'),'utf8'));db.rows=dedupeBrandRows(db.rows);/* 2026-11-27 같은 제품 두 줄 정리 */const CORE=new Set(['k','d','r','e','s','x','h']);
const core=db.rows.filter(r=>CORE.has(r[8])),more=db.rows.filter(r=>!CORE.has(r[8]));
await fs.writeFile(path.join(out,'food-db-core.json'),JSON.stringify({...db,part:'core',rows:core}));
await fs.writeFile(path.join(out,'food-db-more.json'),JSON.stringify({...db,part:'more',rows:more}));
await fs.copyFile(path.join(root,'food-db.json'),path.join(out,'food-db.json'));}

// 5.0.6 속도(대표님: '획기적으로'): 첫 화면에 필요한 JS 모듈 147개를 브라우저가 import를 따라 한 단계씩 받느라(깊이 × 왕복 시간)
// 폰 네트워크에서 4~6초가 걸렸다. 빌드 때 app.js에서 시작하는 정적 import 그래프 전체를 계산해 index.html에 modulepreload로 적으면
// 첫 요청과 함께 모두 동시에 받기 시작한다. (동적 import()로 나중에 부르는 모듈은 넣지 않는다)
{
 const seen=new Set(),order=[];
 const visit=async f=>{if(seen.has(f))return;seen.add(f);let src='';try{src=await fs.readFile(path.join(out,f),'utf8')}catch{return}
  for(const m of src.matchAll(/(?:^|[;\n}])\s*(?:import|export)\s*(?:[\w*{}\s,$]+?\s*from\s*)?['"](\.\/[^'"]+?\.js)(?:\?[^'"]*)?['"]/g)){const dep=path.posix.normalize(path.posix.join(path.posix.dirname(f),m[1]));await visit(dep)}
  order.push(f)};
 await visit('app.js');
 const idx=path.join(out,'index.html');let html=await fs.readFile(idx,'utf8');
 const links=order.filter(f=>f!=='app.js').map(f=>`<link rel="modulepreload" href="${f}">`).join('');
 html=html.replace('<script type="module" src="app.js',`${links}<script type="module" src="app.js`);
 await fs.writeFile(idx,html);
 console.log(`첫 화면 모듈 미리 받기: ${order.length-1}개`);
}
