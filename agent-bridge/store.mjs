// 이 PC에 한 번 맺은 AI 연결을 저장한다(3.8.0). 파일은 사용자 홈 폴더 안에만 두고 저장소에는 절대 넣지 않는다.
// 담는 것: 계정 UID와 Firebase 갱신 토큰(브라우저가 같은 PC에 이미 보관하는 것과 같은 수준의 자격). '연결 해제'로 지운다.
import {mkdirSync,readFileSync,writeFileSync,rmSync,chmodSync} from 'node:fs';
import {homedir} from 'node:os';
import {join,dirname} from 'node:path';
export const storePath=()=>join(process.env.MYLOGUE_BRIDGE_HOME||join(homedir(),'.mylogue'),'ai-bridge.json');
export function loadPairing(){try{const v=JSON.parse(readFileSync(storePath(),'utf8'));return v&&typeof v.uid==='string'&&typeof v.refreshToken==='string'?v:null}catch{return null}}
export function savePairing({uid,refreshToken,email=''}){const p=storePath();mkdirSync(dirname(p),{recursive:true});writeFileSync(p,JSON.stringify({uid,refreshToken,email,pairedAt:new Date().toISOString()}),{encoding:'utf8',mode:0o600});try{chmodSync(p,0o600)}catch{}}
export function clearPairing(){try{rmSync(storePath(),{force:true})}catch{}}

// 4.0.0: 연결 코드(10자)를 이 PC 사용자 폴더에 보관한다. 도구를 다시 켜도 같은 코드라 앱에 한 번만 넣으면 된다.
export const codePath=()=>join(process.env.MYLOGUE_BRIDGE_HOME||join(homedir(),'.mylogue'),'ai-bridge-code.txt');
export function loadOrCreateCode(make){try{const c=readFileSync(codePath(),'utf8').trim();if(c)return c}catch{}const c=make();const p=codePath();mkdirSync(dirname(p),{recursive:true});writeFileSync(p,c,{encoding:'utf8',mode:0o600});try{chmodSync(p,0o600)}catch{}return c}
export function rotateCode(make){try{rmSync(codePath(),{force:true})}catch{}return loadOrCreateCode(make)}
