import fs from 'node:fs/promises';
import path from 'node:path';
import {Presentation,PresentationFile} from 'file:///C:/Program Files/WindowsApps/OpenAI.CodexPrimaryRuntime.v26-1117-1425-0_26.1117.1425.0_x64__3k8sg7r9htsxt/dependencies/node/node_modules/@oai/artifact-tool/dist/artifact_tool.mjs';

const root=path.resolve('..'),preview=path.join(root,'artifacts','business-deck-professional');
await fs.mkdir(preview,{recursive:true});
const p=Presentation.create({slideSize:{width:1280,height:720}});
const C={navy:'#071522',navy2:'#0d2235',blue:'#2582f2',cyan:'#68c5ff',ink:'#152538',white:'#f5f9fc',muted:'#b5c8d9',line:'#31516a',pale:'#e8f3fb',green:'#64d4bd',amber:'#ffc57c'};
const FONT='SUIT';
function rect(s,x,y,w,h,fill,stroke='none',r='rect'){return s.shapes.add({geometry:r,position:{left:x,top:y,width:w,height:h},fill,line:{style:'solid',fill:stroke,width:stroke==='none'?0:1}})}
function text(s,v,x,y,w,h,size=22,color=C.white,bold=false,align='left'){
 const o=rect(s,x,y,w,h,'none');o.text=v;o.text.style={typeface:FONT,fontSize:`${size}pt`,color,bold,verticalAlignment:'middle',alignment:align,wrap:'square',lineSpacing:size>=30?1.18:size>=18?1.36:1.28,insets:0};return o;
}
function base(n,title,sub='',light=false){
 const s=p.slides.add();s.background.fill=light?C.white:C.navy;
 rect(s,0,0,14,720,C.blue);text(s,'MYWEIGHTLOG',66,34,380,28,13,light?C.blue:C.cyan,true);
 text(s,title,66,84,1150,74,38,light?C.ink:C.white,true);
 if(sub)text(s,sub,68,162,1120,46,17,light?'#5d7386':C.muted);
 rect(s,66,680,1148,1,light?'#ccdbe8':C.line);
 text(s,`MWL Beta 2.0.1  ·  2026.11`,68,687,540,22,10,light?'#697f91':C.muted);
 text(s,String(n).padStart(2,'0'),1160,687,55,22,10,light?'#697f91':C.muted,false,'right');
 return s;
}
function pill(s,label,x,y,w,fill=C.blue){rect(s,x,y,w,38,fill,'none','roundRect');text(s,label,x+8,y+2,w-16,34,14,C.white,true,'center')}
function label(s,v,x,y,w,color=C.cyan){text(s,v,x,y,w,28,14,color,true)}
function rule(s,x,y,w,color=C.line){rect(s,x,y,w,1,color)}
function img(s,file,x,y,w,h,alt='제품 화면'){return fs.readFile(path.join(root,file)).then(b=>s.images.add({blob:b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength),contentType:'image/png',alt,fit:'contain',position:{left:x,top:y,width:w,height:h}}))}
function source(s,v){text(s,v,68,645,1120,28,10,C.muted)}

let s=p.slides.add();s.background.fill=C.navy;rect(s,0,0,18,720,C.blue);rect(s,810,0,470,720,C.navy2);rect(s,810,0,7,720,C.blue);
label(s,'MYWEIGHTLOG  /  제품·사업 전략',70,60,650);text(s,'기록이 쉬워지면,\n변화가 보입니다.',70,155,680,190,50,C.white,true);
text(s,'체성분 · 식단 · 운동을 하나의 일지로 묶고\n사진과 말로 만든 초안을 검토해 저장합니다.',74,390,700,135,22,C.muted);
pill(s,'내부 검증 단계',74,590,190);text(s,'Beta 2.0.1  ·  2026년 11월',74,645,590,28,14,C.muted);
await img(s,'artifacts/android-v201-home.png',850,60,340,600,'Beta 2.0.1 Android 홈');

s=base(2,'한 문장으로 설명하는 마웨로그','입력의 부담을 줄이고 기록의 신뢰도를 남기는 개인 건강 일지');
text(s,'사람은 사진이나 말로 남기고, AI는 초안을 만들고,\n사용자는 수치와 근거를 확인한 뒤 저장합니다.',80,252,1115,140,33,C.white,true);
rule(s,80,440,1100);label(s,'현재 제품',80,468,220);text(s,'웹 PWA · Android · 승인 계정별 기록 · AI 검토함',80,505,1070,45,21);
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
text(s,'현재 AI 연결: 각 사용자 PC의 로컬 MCP 도구  /  앱 내부 AI 호출: 다음 단계',69,570,1120,45,18,C.amber);

s=base(6,'하루의 흐름을 한 화면에서 시작합니다','실제 Android 에뮬레이터 화면. 승인 전 계정으로 촬영했습니다.');
await img(s,'artifacts/android-v201-home.png',80,230,350,420,'실제 홈 화면');
label(s,'현재 구현된 진입점',515,250,560);text(s,'오늘의 타임라인',515,292,590,55,27,C.white,true);text(s,'식사 · 운동 · 몸 기록으로 빠르게 이동',515,351,630,68,22,C.muted);
rule(s,515,440,625);text(s,'AI 검토함',515,470,590,50,27,C.white,true);text(s,'AI가 쓴 초안을 확인하고 수정한 뒤 확정',515,528,640,75,22,C.muted);

s=base(7,'식단은 음식별로 수정하고 추정을 드러냅니다','아래 수치는 화면 흐름 설명을 위한 예시이며 검증된 음식 영양값이 아닙니다.');
pill(s,'식사①  10:00',75,250,180);text(s,'현미밥 200g',80,318,380,48,25,C.white,true);text(s,'약 300 kcal  ·  추정 범위 240~360',80,372,560,44,20,C.amber);text(s,'닭가슴살 120g',80,445,380,48,25,C.white,true);text(s,'약 198 kcal  ·  추정 범위 150~250',80,498,560,44,20,C.amber);
rect(s,670,245,1,345,C.line);label(s,'검토할 항목',720,260,440);text(s,'날짜·시각·음식명·분량',720,315,455,45,23);text(s,'칼로리·탄수·단백질·지방',720,380,455,45,23);text(s,'추정 범위와 출처',720,445,455,45,23);text(s,'확정 후 기록과 그래프에 반영',720,532,470,64,19,C.cyan,true);

s=base(8,'운동은 세트를 쌓고 머신을 재사용합니다','실제 완료한 세트만 입력하며 지점별 머신과 개인 별칭을 연결합니다.');
pill(s,'하체  /  헬스플러스 안산점',76,248,310);text(s,'레그 프레스',80,320,405,55,29,C.white,true);
const sets=[['1','40 kg','15회','10:12'],['2','60 kg','12회','10:15'],['3','60 kg','10회','10:18']];
sets.forEach((a,i)=>{const y=390+i*63;rect(s,75,y,535,52,C.navy2,C.line,'roundRect');text(s,a[0],93,y+6,50,36,19,C.cyan,true);text(s,a[1],162,y+6,165,36,19);text(s,a[2],333,y+6,120,36,19);text(s,a[3],465,y+6,105,36,17,C.muted)});
rect(s,655,252,1,345,C.line);label(s,'기록된 정보를 다시 사용',705,272,470);text(s,'이전 세트의 중량·횟수',705,325,470,45,23,C.white,true);text(s,'kg / lb와 덤벨 한쪽 기준',705,395,480,55,22);text(s,'제조사·모델·헬스장 지점',705,463,480,55,22);text(s,'세트 입력 시각으로 휴식 간격 추정',705,531,480,68,20,C.cyan);

s=base(9,'체성분은 측정 날짜에 따라 변화로 읽습니다','사진에서 읽힌 값만 기록하고 확인이 필요한 값은 사용자에게 돌려줍니다.');
const body=[['체중','84.7 kg'],['체지방률','19.8 %'],['골격근량','38.4 kg']];
body.forEach((a,i)=>{const x=78+i*385;rect(s,x,255,350,160,C.navy2,C.line,'roundRect');label(s,a[0],x+22,276,270);text(s,a[1],x+22,318,285,75,35,C.white,true)});
text(s,'인바디 결과표 → 검사일시·수치 추출 → 검토 → 체중·체지방률·골격근량 추이',85,480,1100,105,23,C.white,true);
text(s,'예시 수치는 화면 설명용입니다. 실제 사용자 측정값이나 제품 성능 지표가 아닙니다.',85,603,1090,35,14,C.muted);

s=base(10,'기존 제품은 각기 다른 기록에 강점이 있습니다','마웨로그는 기록 입력의 통합과 사용자 검토 흐름을 제품 가설로 삼습니다.',true);
const cols=[80,320,590,865],heads=['제품','공식 안내의 강점','입력 방식','MWL 설계 초점'];
heads.forEach((v,i)=>text(s,v,cols[i],245,[210,245,250,320][i],43,17,C.blue,true));
const rows=[['Hevy','운동 세트·루틴·분석','직접 입력 중심','머신 별칭·AI 초안'],['FatSecret','식단 일지·목표·보고서','음식별 검색·기록','식사 번호·추정 범위'],['MacroFactor','사진 AI 식단·편집','앱 내 사진 입력','외부 AI 검토형 시험'],['마웨로그','체성분·식단·운동 통합','직접 입력 + AI 초안','하나의 기록 타임라인']];
rows.forEach((r,i)=>{const y=300+i*72;if(i%2===0)rect(s,73,y,1137,66,C.pale);r.forEach((v,j)=>text(s,v,cols[j],y+6,[220,247,250,330][j],55,j===0?17:16,C.ink,j===0))});
text(s,'출처: Hevy 기능 안내, FatSecret 앱 도움말, MacroFactor AI Food Logging (공식 사이트)',79,614,1100,34,11,'#617789');

s=base(11,'차별점은 사진 자체보다 “확정 가능한 기록”입니다','기존 대안도 사진 AI와 세트 기록을 제공합니다. 차이는 검증할 사용자 흐름에 있습니다.');
const d=[['확인값과 추정값 분리','중앙값·범위·근거를 함께 보여줌'],['본인 계정의 검토함','AI가 쓴 초안을 사용자가 수정·확정'],['기존 항목 재사용','음식·운동·머신 별칭을 먼저 검색']];
d.forEach((a,i)=>{const y=250+i*125;rect(s,72,y,9,94,C.blue);text(s,a[0],110,y,395,50,23,C.white,true);text(s,a[1],510,y,660,75,21,C.muted);if(i<2)rule(s,110,y+106,1070)});

s=base(12,'현재 구조와 다음 구조는 같은 초안 형식을 씁니다','기술 구조를 공개 가능한 수준에서 단순화했습니다.');
label(s,'현재 내부 시험',76,250,370);text(s,'각자 AI 도구',76,295,350,60,26,C.white,true);text(s,'로컬 MCP 연결',76,360,350,60,21,C.cyan);text(s,'AI 검토함',76,425,350,60,21,C.white);text(s,'본인 Firebase 기록',76,490,410,60,21,C.white);
rect(s,620,245,1,330,C.line);label(s,'향후 서비스',675,250,430);text(s,'웹·앱에서 사진/말 입력',675,295,500,60,26,C.white,true);text(s,'운영 API와 사용량 통제',675,360,500,60,21,C.cyan);text(s,'같은 AI 검토함',675,425,500,60,21,C.white);text(s,'본인 Firebase 기록',675,490,500,60,21,C.white);
text(s,'앱 내부 AI API 연결과 워치 연동은 아직 구현되지 않았습니다.',76,605,1060,35,15,C.amber);

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

s=base(16,'다음 판단은 실사용 증거가 결정합니다','현재 공개 Beta 2.0.1과 투자 검토용 제품 전략의 경계');
text(s,'이미 구현',76,250,225,46,24,C.cyan,true);text(s,'웹·Android · 개인 기록 · AI 검토함 · 승인제 동기화',330,250,825,56,21,C.white);
rule(s,76,323,1090);text(s,'반드시 검증',76,357,225,46,24,C.amber,true);text(s,'두 실제 계정의 전체 입력·확정, 4주 사용, 사진 추정 오차',330,357,825,70,21,C.white);
rule(s,76,447,1090);text(s,'그다음 개발',76,480,225,46,24,C.cyan,true);text(s,'앱 내부 AI, 사용량 계측, 가격·비용 실험',330,480,825,70,21,C.white);
text(s,'현재 자료에는 가입자 수·매출·시장 규모·건강 개선 효과를 실적으로 제시하지 않습니다.',80,604,1110,45,15,C.muted);

s=base(17,'조사 근거와 제품 자료','슬라이드의 외부 주장은 아래 원문과 공식 기능 안내를 기준으로 작성했습니다.',true);
const refs=[
 'Sequoia Capital · Writing a Business Plan · articles.sequoiacap.com/writing-a-business-plan',
 'Y Combinator · How to Design a Better Pitch Deck · ycombinator.com/library/4T-how-to-design-a-better-pitch-deck',
 'Turner-McGrievy et al. (2019) · PMID 31155473 · pubmed.ncbi.nlm.nih.gov/31155473/',
 'Hevy 공식 기능 · hevyapp.com/features/  /  help.hevyapp.com',
 'FatSecret 공식 도움말 · fatsecret.com/fatsecret-app-help',
 'MacroFactor 공식 AI Food Logging · help.macrofactorapp.com/en/articles/258-ai-food-logging',
 '제품 화면과 기능: MyWeightLog Beta 2.0.1 코드·Android 에뮬레이터 (2026-11-19)'
];
refs.forEach((r,i)=>text(s,`${String(i+1).padStart(2,'0')}  ${r}`,80,245+i*55,1110,48,15,C.ink));

for(let i=0;i<p.slides.items.length;i++){
 const blob=await p.export({slide:p.slides.items[i],format:'png',scale:1});
 await fs.writeFile(path.join(preview,`slide-${String(i+1).padStart(2,'0')}.png`),new Uint8Array(await blob.arrayBuffer()));
}
const deck=await PresentationFile.exportPptx(p);
await deck.save(path.join(root,'deck-build','MWL_Beta_2_0_Professional_Draft.pptx'));
console.log(`slides=${p.slides.items.length}`);
