// 이 PC에 한 번 맺은 AI 연결을 저장한다(3.8.0). 파일은 사용자 홈 폴더 안에만 두고 저장소에는 절대 넣지 않는다.
// 담는 것: 계정 UID와 Firebase 갱신 토큰(브라우저가 같은 PC에 이미 보관하는 것과 같은 수준의 자격). '연결 해제'로 지운다.
import {mkdirSync,readFileSync,writeFileSync,rmSync,chmodSync} from 'node:fs';
import {homedir} from 'node:os';
import {join,dirname} from 'node:path';
export const storePath=()=>join(process.env.MYLOGUE_BRIDGE_HOME||join(homedir(),'.mylogue'),'ai-bridge.json');
export function loadPairing(){try{const v=JSON.parse(readFileSync(storePath(),'utf8'));return v&&typeof v.uid==='string'&&typeof v.refreshToken==='string'?v:null}catch{return null}}
export function savePairing({uid,refreshToken,email=''}){const p=storePath();mkdirSync(dirname(p),{recursive:true});writeFileSync(p,JSON.stringify({uid,refreshToken,email,pairedAt:new Date().toISOString()}),{encoding:'utf8',mode:0o600});try{chmodSync(p,0o600)}catch{}}
export function clearPairing(){try{rmSync(storePath(),{force:true})}catch{}}
