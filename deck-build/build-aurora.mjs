import fs from 'node:fs/promises';
import path from 'node:path';
import {Presentation,PresentationFile} from 'file:///C:/Program Files/WindowsApps/OpenAI.CodexPrimaryRuntime.v26-1117-1425-0_26.1117.1425.0_x64__3k8sg7r9htsxt/dependencies/node/node_modules/@oai/artifact-tool/dist/artifact_tool.mjs';

const root=path.resolve('..'),preview=path.join(root,'artifacts','business-deck-aurora');
await fs.mkdir(preview,{recursive:true});
const p=Presentation.create({slideSize:{width:1280,height:720}});
const C={navy:'#101625',navy2:'#1c2842',blue:'#8ce4e0',cyan:'#a9a5ee',ink:'#18263c',white:'#edf4f8',muted:'#b4c6d8',line:'#465776',pale:'#e5edf5',green:'#8ce4e0',amber:'#f7c270'};
const FONT='SUIT';
function rect(s,x,y,w,h,fill,stroke='none',r='rect'){return s.shapes.add({geometry:r,position:{left:x,top:y,width:w,height:h},fill,line:{style:'solid',fill:stroke,width:stroke==='none'?0:1}})}
function text(s,v,x,y,w,h,size=22,color=C.white,bold=false,align='left'){
 const o=rect(s,x,y,w,h,'none');o.text=v;o.text.style={typeface:FONT,fontSize:`${size}pt`,color,bold,verticalAlignment:'middle',alignment:align,wrap:'square',lineSpacing:size>=30?1.18:size>=18?1.36:1.28,insets:0};return o;
}
function base(n,title,sub='',light=false){
 const s=p.slides.add();s.background.fill=light?C.white:C.navy;
 rect(s,66,30,1148,2,light?'#9db5c8':C.line);text(s,'마웨로그  /  MYWEIGHTLOG',66,48,520,28,13,light?'#237b86':C.blue,true);
 text(s,title,66,96,1150,74,38,light?C.ink:C.white,true);
 if(sub)text(s,sub,68,176,1120,46,17,light?'#5d7386':C.muted);
 rect(s,66,673,1148,1,light?'#ccdbe8':C.line);
 text(s,`MYWEIGHTLOG  ·  2026.11`,68,687,540,22,10,light?'#697f91':C.muted);
 text(s,String(n).padStart(2,'0'),1160,687,55,22,10,light?'#697f91':C.muted,false,'right');
 return s;
}
function pill(s,label,x,y,w,fill=C.blue){rect(s,x,y,w,38,fill,'none','roundRect');text(s,label,x+8,y+2,w-16,34,14,C.white,true,'center')}
function label(s,v,x,y,w,color=C.cyan){text(s,v,x,y,w,28,14,color,true)}
function rule(s,x,y,w,color=C.line){rect(s,x,y,w,1,color)}
function img(s,file,x,y,w,h,alt='제품 화면'){return fs.readFile(path.join(root,file)).then(b=>s.images.add({blob:b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength),contentType:'image/png',alt,fit:'contain',position:{left:x,top:y,width:w,height:h}}))}
function source(s,v){text(s,v,68,645,1120,28,10,C.muted)}

let s=p.slides.add();s.background.fill=C.navy;rect(s,800,0,480,720,C.navy2);
label(s,'마웨로그  /  MYWEIGHTLOG',70,60,650);text(s,'기록이 쉬워지면,\n변화가 보입니다.',70,155,680,190,50,C.white,true);
text(s,'체성분 · 식단 · 운동을 하나의 일지로 묶고\n사진과 말로 만든 초안을 검토해 저장합니다.',74,390,700,135,22,C.muted);
pill(s,'초기 사용자 검증 중',74,584,225);text(s,'2026년 11월  ·  서비스 소개',74,638,590,28,14,C.muted);
await img(s,'artifacts/aurora-final-android.png',850,60,330,600,'Beta 2.1.0 Android 홈');

s=base(2,'한 문장으로 설명하는 마웨로그','입력의 부담을 줄이고 기록의 신뢰도를 남기는 개인 건강 일지');
text(s,'사람은 사진이나 말로 남기고, AI는 초안을 만들고,\n사용자는 수치와 근거를 확인한 뒤 저장합니다.',80,252,1115,140,33,C.white,true);
rule(s,80,440,1100);label(s,'현재 제품',80,468,220);text(s,'웹 PWA · Android · 승인 계정별 기록 · 초안 검토',80,505,1070,45,21);
label(s,'다음 제품',80,575,220);text(s,'앱 안에서 직접 사진·자연어 입력, 유료 AI 기능 검증',80,610,1070,42,21);

s=base(3,'기록은 중요하지만, 오래 이어가기 어렵습니다','연구는 지속 기록의 어려움을 보여줍니다. 우리 제품의 성과를 뜻하지는 않습니다.',true);
text(s,'< 50%',75,265,340,100,60,C.blue,true);text(s,'10주 뒤 기록 유지율',77,375,470,72,22,C.ink);
rect(s,610,255,1,295,'#ccdbe8');text(s,'모바일 식단 기록 연구 2건의\n완료자 91명을 분석했습니다.\n10주 뒤 모든 기록 기준에서\n유지한 사람은 절반 미만이었습니다.',650,255,525,185,19,C.ink);
text(s,'마웨로그가 검증할 질문',650,475,500,32,17,C.blue,true);text(s,'사진·말 입력이 기록 시간을 줄이고\n기록 일수를 늘리는가?',650,515,525,95,20,C.ink,true);
text(s,'출처: Turner-McGrievy et al., J Acad Nutr Diet (2019), PMID 31155473',68,645,1110,27,10,'#60788d');

s=base(4,'현재의 불편은 세 종류의 기록에서 반복됩니다','사용자 요구에서 확인한 입력 장벽과 제품이 겨냥하는 해법');
const lanes=[['체성분','검사표의 숫자를 다시 옮겨 적음','결과표 → 확인 가능한 수치 초안'],['식단','음식을 검색하고 양을 매번 조정함','음식별 추정치 → 분량 검토'],['운동','머신·세트·중량을 되풀이해 선택함','지점별 머신·지난 기록 재사용']];
lanes.forEach((a,i)=>{const y=255+i*125;label(s,a[0],75,y,180);text(s,a[1],270,y-5,440,53,20,C.white);rect(s,725,y+7,60,3,C.blue);text(s,a[2],815,y-5,365,62,20,C.cyan,true);if(i<2)rule(s,75,y+90,1100)});

s=base(5,'사용자 입력과 AI 위임을 같은 기록으로 묶습니다','AI 초안은 검토 후에만 본인 계정의 최종 기록이 됩니다.');
const steps=[['01','사진·자연어','식사, 운동, 인바디'],['02','기존 기록 검색','음식·머신 중복 확인'],['03','AI 초안','값과 추정 근거 분리'],['04','사용자 검토','날짜·양·세트 수정'],['05','최종 기록','추이와 목표에 반영']];
steps.forEach((a,i)=>{const x=66+i*243;rect(s,x,280,221,255,i%2?C.navy2:'#102a42',C.line,'roundRect');text(s,a[0],x+18,297,180,40,18,C.cyan,true);text(s,a[1],x+18,355,190,55,23,C.white,true);text(s,a[2],x+18,427,190,70,17,C.muted)});
text(s,'현재는 사용자가 쓰는 AI와 연결해 시험  /  다음 단계는 앱 안에서 바로 입력',69,570,1120,45,18,C.amber);

s=base(6,'실제 제품은 기록으로 돌아오는 화면에서 시작합니다','현재 앱 화면. 시연 계정에 개인 기록이 없는 상태입니다.');
await img(s,'artifacts/aurora-final-android.png',78,226,340,420,'Beta 2.1.0 실제 홈');
label(s,'현재 앱 화면  /  홈',490,238,620);text(s,'빠른 기록이 먼저 보입니다.',490,290,650,70,30,C.white,true);
text(s,'식사·운동·몸 기록으로 바로 진입하고\n오늘의 기록을 같은 화면에서 읽습니다.',490,380,660,125,22,C.muted);
rect(s,490,545,650,72,C.navy2,C.line,'roundRect');text(s,'한 번의 터치로 기록을 시작하는 짧은 동선',515,557,600,46,18,C.blue,true);

s=base(7,'식단은 목표와 개별 음식을 함께 봅니다','현재 앱 화면. 시연 계정에 기록이 없는 상태입니다.');
await img(s,'artifacts/aurora-food-android.png',75,225,335,420,'Beta 2.1.0 식단 실제 화면');
label(s,'직접 입력',475,245,300);text(s,'음식 하나씩, 양은 각각.',475,290,680,60,29,C.white,true);
text(s,'식사 ①과 시각을 기록하고 음식별 중량을\n조정합니다. 하루 열량·탄단지와 목표 대비\n남은 양을 바로 확인합니다.',475,380,690,135,20,C.muted);
rect(s,475,548,690,62,C.navy2,C.line,'roundRect');text(s,'사진만 있을 때는 추정 중앙값·범위·근거를 함께 검토',495,557,650,44,17,C.amber,true);

s=base(8,'운동은 완료한 세트와 머신을 다시 씁니다','현재 앱 화면. 표시된 운동 수치는 시연 계정의 기록입니다.');
await img(s,'artifacts/aurora-workout-android.png',75,225,335,420,'Beta 2.1.0 운동 실제 화면');
label(s,'완료 중심 입력',475,245,400);text(s,'한 종목에서 다음 세트까지.',475,290,690,65,29,C.white,true);
text(s,'이전 중량·반복을 재사용하고 kg/lb와\n세트 시각을 저장합니다. 헬스장 지점의\n머신과 개인 별칭을 다시 선택할 수 있습니다.',475,380,690,140,20,C.muted);
rect(s,475,548,690,62,C.navy2,C.line,'roundRect');text(s,'신규 머신은 전체 모습 + 명판 사진으로 식별 요청',495,557,650,44,17,C.blue,true);

s=base(9,'몸의 변화는 검사값을 날짜로 연결합니다','현재 앱 화면. 시연 계정에 기록이 없는 상태입니다.');
await img(s,'artifacts/aurora-body-android.png',75,225,335,420,'Beta 2.1.0 몸 기록 실제 화면');
label(s,'몸 · 인바디',475,245,380);text(s,'측정값을 추이로 읽습니다.',475,290,680,66,29,C.white,true);
text(s,'체중·체지방률·골격근량·허리둘레를\n각각 추적합니다. 인바디 결과표의 판독값은\n원본과 대조해 검토한 뒤 저장합니다.',475,380,690,140,20,C.muted);
rect(s,475,548,690,62,C.navy2,C.line,'roundRect');text(s,'읽히지 않은 수치는 임의로 채우지 않습니다.',495,557,650,44,17,C.amber,true);

s=base(10,'기존 제품은 각기 다른 기록에 강점이 있습니다','마웨로그는 기록 입력의 통합과 사용자 검토 흐름을 제품 가설로 삼습니다.',true);
const cols=[80,320,590,865],heads=['제품','공식 안내의 강점','입력 방식','MWL 설계 초점'];
heads.forEach((v,i)=>text(s,v,cols[i],245,[210,245,250,320][i],43,17,C.blue,true));
const rows=[['Hevy','운동 세트·루틴·분석','직접 입력 중심','머신 별칭·AI 초안'],['FatSecret','식단 일지·목표·보고서','음식별 검색·기록','식사 번호·추정 범위'],['MacroFactor','사진 AI 식단·편집','앱 내 사진 입력','외부 AI 검토형 시험'],['마웨로그','체성분·식단·운동 통합','직접 입력 + AI 초안','하나의 기록 타임라인']];
rows.forEach((r,i)=>{const y=300+i*72;if(i%2===0)rect(s,73,y,1137,66,C.pale);r.forEach((v,j)=>text(s,v,cols[j],y+6,[220,247,250,330][j],55,j===0?17:16,C.ink,j===0))});
text(s,'출처: Hevy 기능 안내, FatSecret 앱 도움말, MacroFactor AI Food Logging (공식 사이트)',79,614,1100,34,11,'#617789');

s=base(11,'차별점은 사진 자체보다 “확정 가능한 기록”입니다','기존 대안도 사진 AI와 세트 기록을 제공합니다. 차이는 검증할 사용자 흐름에 있습니다.');
const d=[['확인값과 추정값 분리','중앙값·범위·근거를 함께 보여줌'],['본인 계정의 검토함','AI가 쓴 초안을 사용자가 수정·확정'],['기존 항목 재사용','음식·운동·머신 별칭을 먼저 검색']];
d.forEach((a,i)=>{const y=250+i*125;rect(s,72,y,9,94,C.blue);text(s,a[0],110,y,395,50,23,C.white,true);text(s,a[1],510,y,660,75,21,C.muted);if(i<2)rule(s,110,y+106,1070)});

s=base(12,'현재 경험을 앱 안의 AI 입력으로 확장합니다','기록을 검토하고 확정하는 사용자의 흐름은 유지합니다.');
label(s,'현재 소규모 시험',76,250,370);text(s,'각자 쓰는 AI',76,295,350,60,26,C.white,true);text(s,'사진·말로 요청',76,360,350,60,21,C.cyan);text(s,'초안 검토',76,425,350,60,21,C.white);text(s,'본인 계정에 저장',76,490,410,60,21,C.white);
rect(s,620,245,1,330,C.line);label(s,'향후 서비스',675,250,430);text(s,'웹·앱에서 사진/말 입력',675,295,500,60,26,C.white,true);text(s,'앱에서 바로 초안 작성',675,360,500,60,21,C.cyan);text(s,'같은 검토 화면',675,425,500,60,21,C.white);text(s,'본인 계정에 저장',675,490,500,60,21,C.white);
text(s,'앱 안에서 바로 AI에 요청하는 기능은 다음 개발 단계입니다.',76,605,1060,35,15,C.amber);

s=base(13,'두세 명의 실사용으로 먼저 검증할 질문','시장 수치보다 입력 경험과 반복 사용 증거를 우선 수집합니다.',true);
const exp=[['기록 시간','식사·운동 한 건을 남기는 데 걸린 시간'],['정정 부담','AI 초안당 사용자가 고친 필드와 추정 범위'],['지속 기록','주간 기록 일수와 4주 뒤 재방문'],['중복·정확도','같은 음식·머신의 재등록과 오류 사례']];
exp.forEach((a,i)=>{const y=248+i*86;rect(s,76,y,1125,72,i%2?C.white:C.pale);text(s,a[0],98,y+8,255,52,21,C.blue,true);text(s,a[1],357,y+8,810,52,19,C.ink)});
text(s,'방법: 직접 입력과 AI 초안을 같은 사용자·같은 기록 유형에서 비교. 기준선은 내부 시험에서 수집.',80,605,1090,45,14,'#5b7185');

s=base(14,'수익 모델은 사용량을 측정한 뒤 결정합니다','현재 매출·유료 전환·AI 호출 원가는 없습니다.');
text(s,'무료',80,250,215,55,26,C.cyan,true);text(s,'직접 입력과 기록·추이 확인',310,250,840,55,23,C.white);
rule(s,80,326,1090);text(s,'유료안',80,355,215,55,26,C.cyan,true);text(s,'앱 내부 AI 입력과 고급 분석',310,355,840,55,23,C.white);
rule(s,80,435,1090);text(s,'원가',80,462,215,55,26,C.amber,true);text(s,'이미지·텍스트 처리, 데이터 저장, 결제 수수료',310,462,840,70,22,C.white);
text(s,'사용자당 기여이익 = 구독 매출 − 실제 변동비',82,573,1080,50,24,C.white,true);

s=base(15,'초기 고객은 기록을 이미 시도하는 사람입니다','확산보다 실제 사용에서 입력 마찰을 줄이는 순서');
const g=[['1','내부 사용자 2~3명','AI 초안과 수동 기록의 완주율·정정량 확인'],['2','초대형 소규모 테스트','반복 사용과 도감 품질 확인'],['3','앱 내부 AI 파일럿','실측 호출 비용과 과금 의향 확인']];
g.forEach((a,i)=>{const y=250+i*112;rect(s,76,y,63,63,C.blue,'none','roundRect');text(s,a[0],84,y+6,45,51,24,C.white,true,'center');text(s,a[1],175,y-1,435,50,24,C.white,true);text(s,a[2],175,y+50,975,45,18,C.muted)});

s=base(16,'다음 판단은 실사용 증거가 결정합니다','현재 제공하는 기능과 다음 단계의 검증 계획');
text(s,'이미 구현',76,250,225,46,24,C.cyan,true);text(s,'웹·Android · 개인 기록 · 초안 검토 · 승인제 동기화',330,250,825,56,21,C.white);
rule(s,76,323,1090);text(s,'반드시 검증',76,357,225,46,24,C.amber,true);text(s,'두 실제 계정의 전체 입력·확정, 4주 사용, 사진 추정 오차',330,357,825,70,21,C.white);
rule(s,76,447,1090);text(s,'그다음 개발',76,480,225,46,24,C.cyan,true);text(s,'앱 내부 AI, 사용량 계측, 가격·비용 실험',330,480,825,70,21,C.white);
text(s,'현재 자료에는 가입자 수·매출·시장 규모·건강 개선 효과를 실적으로 제시하지 않습니다.',80,604,1110,45,15,C.muted);

s=base(17,'SWOT · 강점은 입력 흐름, 위험은 신뢰와 습관입니다','초기 내부 시험에서 무엇을 먼저 확인할지 판단하는 제품 전략 지도');
const swot=[
 ['S  강점','몸·식단·운동을 한 일지로 연결\n직접 입력과 AI 검토 초안을 함께 제공'],
 ['W  약점','외부 AI 연결은 PC·로컬 도구가 필요\n사진 분량 추정과 도감 품질 관리 부담'],
 ['O  기회','사용자별 머신·음식 재사용으로 재입력 감소\n앱 내부 AI로 같은 검토 흐름 확장'],
 ['T  위협','기존 앱의 풍부한 데이터베이스와 AI 기능\n부정확한 추정과 낮은 반복 사용 가능성']
];
swot.forEach((a,i)=>{const x=70+(i%2)*570,y=245+Math.floor(i/2)*190;rect(s,x,y,540,166,C.navy2,C.line,'roundRect');text(s,a[0],x+24,y+20,490,38,21,i<2?C.blue:C.cyan,true);text(s,a[1],x+24,y+65,490,85,17,C.white)});

s=base(18,'조사 근거와 제품 자료','슬라이드의 외부 주장은 아래 원문과 공식 기능 안내를 기준으로 작성했습니다.',true);
const refs=[
 'Sequoia Capital · Writing a Business Plan · articles.sequoiacap.com/writing-a-business-plan',
 'Y Combinator · How to Design a Better Pitch Deck · ycombinator.com/library/4T-how-to-design-a-better-pitch-deck',
 'Turner-McGrievy et al. (2019) · PMID 31155473 · pubmed.ncbi.nlm.nih.gov/31155473/',
 'Hevy 공식 기능 · hevyapp.com/features/  /  help.hevyapp.com',
 'FatSecret 공식 도움말 · fatsecret.com/fatsecret-app-help',
 'MacroFactor 공식 AI Food Logging · help.macrofactorapp.com/en/articles/258-ai-food-logging',
 '제품 화면과 기능: 마웨로그 시연 빌드·화면 (2026-11-19)'
];
refs.forEach((r,i)=>text(s,`${String(i+1).padStart(2,'0')}  ${r}`,80,245+i*55,1110,48,15,C.ink));

for(let i=0;i<p.slides.items.length;i++){
 const blob=await p.export({slide:p.slides.items[i],format:'png',scale:1});
 await fs.writeFile(path.join(preview,`slide-${String(i+1).padStart(2,'0')}.png`),new Uint8Array(await blob.arrayBuffer()));
}
const deck=await PresentationFile.exportPptx(p);
await deck.save(path.join(root,'deck-build','MWL_Beta_2_1_Aurora_Business_Plan.pptx'));
console.log(`slides=${p.slides.items.length}`);
