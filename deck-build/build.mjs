import fs from 'node:fs/promises';
import path from 'node:path';
import {Presentation,PresentationFile} from 'file:///C:/Program Files/WindowsApps/OpenAI.CodexPrimaryRuntime.v26-1117-1425-0_26.1117.1425.0_x64__3k8sg7r9htsxt/dependencies/node/node_modules/@oai/artifact-tool/dist/artifact_tool.mjs';

const root=path.resolve('..'),out=path.join(root,'artifacts','business-deck');
await fs.mkdir(out,{recursive:true});
const p=Presentation.create({slideSize:{width:1280,height:720}});
const C={bg:'#06111e',blue:'#277ff0',light:'#e8f1fa',muted:'#a9bfd4',gold:'#f2b970'};
function box(slide,text,x,y,w,h,size=20,color=C.light,bold=false){const shape=slide.shapes.add({geometry:'textbox',position:{left:x,top:y,width:w,height:h},fill:'none',line:{style:'solid',fill:'none',width:0}});shape.text=text;shape.text.style={fontFamily:'Arial',fontSize:`${size}pt`,color,bold,verticalAlignment:'middle'};return shape}
function base(k,title,sub=''){const s=p.slides.add();s.background.fill=C.bg;box(s,`MYWEIGHTLOG  /  ${String(k).padStart(2,'0')}`,68,40,1050,40,14,C.blue,true);box(s,title,68,100,1110,100,34,C.light,true);if(sub)box(s,sub,68,195,1080,58,17,C.muted);return s}
async function img(s,file,x,y,w,h,alt,fit='contain'){const b=await fs.readFile(path.join(root,file));s.images.add({blob:b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength),contentType:'image/png',alt,fit,position:{left:x,top:y,width:w,height:h}})}
let s=base(1,'마웨로그','기록이 쉬워지면, 변화가 보인다');box(s,'체성분 · 식단 · 운동을 한곳에서 기록하고\n사진과 말로 AI에게 초안을 맡기는 건강 일지',68,300,680,190,28,C.light);box(s,'제품 제안서  |  Beta 2.0.1  |  2026.11',68,620,900,40,15,C.muted);
s=base(2,'기록을 멈추게 하는 반복','식사와 운동을 매번 검색하고 입력하는 수고가 가장 큰 마찰이다.');box(s,'체성분은 검사표에 남고\n식단은 사진에 남고\n운동은 기억에 남는다.',70,310,1000,250,30,C.light,true);
s=base(3,'한 번의 기록, 세 가지 변화','몸의 변화와 하루의 선택을 같은 타임라인에서 확인한다.');box(s,'체중 · 체지방률 · 골격근량',70,300,1000,60,27,C.light,true);box(s,'음식별 칼로리와 탄단지, 목표 대비 진행률',70,395,1050,60,27,C.light,true);box(s,'운동 종목, 세트, 중량, 내 헬스장 머신',70,490,1050,60,27,C.light,true);
s=base(4,'현재 제품 화면','Android 에뮬레이터에서 실행한 Beta 2.0.1 화면');await img(s,'artifacts/android-v201-home.png',100,270,300,390,'실제 Android 홈 화면','contain');await img(s,'artifacts/android-v201-inbox.png',490,270,300,390,'실제 Android AI 검토함','contain');box(s,'실제 실행 화면\n홈 / AI 검토함',865,360,315,110,21,C.muted);
s=base(5,'AI 초안과 사용자 확정','사진·자연어를 읽은 AI가 본인 계정의 검토함에 초안을 만든다.');await img(s,'artifacts/ai-inbox-preview-1200.png',80,270,500,330,'예시 데이터로 만든 AI 검토함 목업');box(s,'1  기존 항목 검색',630,290,570,52,23,C.light,true);box(s,'2  확인값과 추정 범위 구분',630,380,570,52,23,C.light,true);box(s,'3  사용자 수정 후 최종 기록',630,470,570,52,23,C.light,true);box(s,'왼쪽 화면: 예시 데이터 목업',630,610,570,35,14,C.muted);
s=base(6,'초기 시험에서 상용 서비스까지','두세 명의 실제 사용으로 입력 마찰과 정확도를 확인한다.');box(s,'지금',70,285,250,45,22,C.blue,true);box(s,'각자 Google 계정 + 각자 AI\n로컬 연결 도구 + 검토함 확정',70,340,1050,110,25,C.light);box(s,'다음',70,485,250,45,22,C.gold,true);box(s,'앱 안에서 같은 초안 계약으로 AI 호출\n사용량을 측정한 뒤 유료 기능 설계',70,535,1050,105,25,C.light);
s=base(7,'SWOT','제품의 초기 강점과 검증할 과제를 함께 본다.');box(s,'강점  직접 입력과 AI 위임을 함께 제공',70,280,1130,65,22,C.light);box(s,'약점  로컬 연결은 데스크톱이 필요',70,360,1130,65,22,C.light);box(s,'기회  사용자별 머신 별칭이 재입력을 줄임',70,440,1130,65,22,C.light);box(s,'위협  사진 추정 오차가 신뢰를 해칠 수 있음',70,520,1130,65,22,C.light);
s=base(8,'검증 지표와 수익 가설','가격과 시장 수치는 사용량을 측정한 뒤 결정한다.');box(s,'기록 완료율 · 첫 기록 소요 시간\nAI 초안 수정률 · 중복 등록률\n사진 추정치 수정 폭',70,285,1030,210,27,C.light,true);box(s,'무료 직접 입력 + 유료 AI 위임은 검증할 사업 가설이다.',70,570,1100,65,21,C.muted);
s=base(9,'초기 고객 확보 경로','제품의 반복 사용을 확인한 뒤 초대 범위를 단계적으로 넓힌다.');box(s,'내부 사용자 2~3명',70,285,1050,60,27,C.blue,true);box(s,'실제 식사·운동·인바디 기록에서 막히는 순간을 관찰',70,345,1080,55,21,C.light);box(s,'초대 테스트 사용자',70,450,1050,60,27,C.blue,true);box(s,'AI 기록 요청과 직접 입력의 재방문 차이를 비교',70,510,1080,55,21,C.light);
s=base(10,'유료 기능의 경제성','구독료를 정하기 전에 실제 사용량으로 비용 구조를 측정한다.');box(s,'가입자당 월 매출',70,280,1050,55,25,C.light,true);box(s,'AI 이미지·텍스트 처리비 + 데이터 저장비 + 결제비',70,385,1120,55,23,C.light);box(s,'사용자당 기여이익 = 매출 − 변동비',70,505,1120,65,27,C.gold,true);box(s,'현재 수치: 내부 시험에서 수집 예정',70,615,1030,40,15,C.muted);
for(let i=0;i<p.slides.items.length;i++){const blob=await p.export({slide:p.slides.items[i],format:'png',scale:1});await fs.writeFile(path.join(out,`slide-${String(i+1).padStart(2,'0')}.png`),new Uint8Array(await blob.arrayBuffer()))}
const deck=await PresentationFile.exportPptx(p);await deck.save(path.join(root,'MWL_Beta_2_0_Business_Plan.pptx'));
console.log(`slides=${p.slides.items.length}`);
