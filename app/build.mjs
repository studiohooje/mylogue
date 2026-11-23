import fs from 'node:fs/promises';import path from 'node:path';import {fileURLToPath} from 'node:url';import {packageApk} from './package-apk.mjs';
const root=path.dirname(fileURLToPath(import.meta.url)),out=path.join(root,'dist');await fs.rm(out,{recursive:true,force:true});await fs.mkdir(path.join(out,'vendor','core'),{recursive:true});await fs.mkdir(path.join(out,'vendor','lang'),{recursive:true});
for(const f of ['templates-data.js','pilates-moves-data.js','machine-models-data.js','exercise-enrich.js','exercise-burn.js','food-db.js','back-on-track.js','admin-log.js','native-auth.js','pilates.js','pilates-art.js','portion-dict.js','exercise-knowledge.js','coach-knowledge.js','coach-engine.js','plan.js','ai-client.js','ai-coach-ui.js','discovery.js','phase.js','home-voice.js','pilates-pick.js','what-to-eat.js','personas.js','micro-report.js','plus-tools.js','experiment.js','program-builder.js','weight-why.js','help.js','landing.js','legal.js','privacy.html','terms.html','storage-scope.js','firebase-config.js','cloud-model.js','cloud-sync.js','cloud-ui.js','catalog-cloud.js','food-provider.js','food-catalog.js','index.html','story.html','app.css','quick-entry.css','aurora-theme.css','aurora-motion.css','brand-icons.js','app.js','timeline-view.js','food-view.js','quick-entry.js','domain.js','store.js','inbody.js','inbody-photo.js','insights.js','training.js','ai-adapter.js','ai-drafts.js','bridge-proof.js','ai-inbox.js','backup.js','session.js','meal-batch.js','model-features.js','exercise-ui.js','atlas-art.js','profile-forms.js','install.js','halo.js','prefs.js','guide.js','places.js','admin.js','admin-panel.js','nutrition-plan.js','quick-edit.js','profile.js','exercise-data.js','machines-catalog.js','analysis-report.js','suggest.js','suggest-ui.js','machine-brands.js','ai-paste.js','ai-prompt.js','ai-config.js','body-series.js','coach-ui.js','macro-plan.js','when-chips.js','date-bar.js','diet-trends.js','band-chart.js','exercise-art.js','exercise-art-ui.js','workout-story.js','motivation.js','trash.js','gym-machines.js','food-check.js','reminders.js','body-flow.js','workout-flow.js','workout-page.js','schedule-view.js','coach.js','coach-cloud.js','coach-controller.js','qr.js','manifest.webmanifest','icon.svg','sw.js'])await fs.copyFile(path.join(root,f),path.join(out,f));
for(const f of ['icon-192.png','icon-512.png','apple-touch-icon.png'])await fs.copyFile(path.join(root,f),path.join(out,f));
await fs.mkdir(path.join(out,'art','ex'),{recursive:true});for(const f of await fs.readdir(path.join(root,'art','ex')).catch(()=>[]))if(/\.webp$/.test(f))await fs.copyFile(path.join(root,'art','ex',f),path.join(out,'art','ex',f));for(const f of await fs.readdir(path.join(root,'art')))if(/\.webp$/.test(f))await fs.copyFile(path.join(root,'art',f),path.join(out,'art',f));
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
{const db=JSON.parse(await fs.readFile(path.join(root,'food-db.json'),'utf8'));const CORE=new Set(['k','d','r','e','s','x','h']);
const core=db.rows.filter(r=>CORE.has(r[8])),more=db.rows.filter(r=>!CORE.has(r[8]));
await fs.writeFile(path.join(out,'food-db-core.json'),JSON.stringify({...db,part:'core',rows:core}));
await fs.writeFile(path.join(out,'food-db-more.json'),JSON.stringify({...db,part:'more',rows:more}));
await fs.copyFile(path.join(root,'food-db.json'),path.join(out,'food-db.json'));}
