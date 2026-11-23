// 4.17.0 보안 점검 후속: 이 PC의 AI 연결 도구(agent-bridge)와 앱이 '연결 코드'로 서로를 확인한다.
// - 도구가 먼저 증명: 앱이 보낸 임의값(nonce)과 포트로 만든 증명을 돌려줘야 앱이 토큰을 보낸다(포트를 가로챈 다른 프로그램은 코드를 몰라 실패).
// - 앱도 증명: 연결·정보 보기·해제 요청마다 코드로 만든 증명을 붙인다(같은 PC의 다른 사용자가 도구를 조작하지 못함).
// - 코드는 10자(약 49비트), 증명 키는 PBKDF2 15만 번으로 만들어 증명 하나를 보고 코드를 거꾸로 맞히기 어렵게 한다.
// 앱(브라우저)과 도구(Node 22+) 모두 표준 WebCrypto만 쓴다. agent-bridge는 이 파일을 그대로 복사해 쓴다(시험으로 같은지 확인).
export const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
export const CODE_LENGTH = 10;
export const normCode = c => String(c ?? '').toUpperCase().replace(/[^A-Z0-9]/g, '');
export const validCode = c => normCode(c).length === CODE_LENGTH && [...normCode(c)].every(ch => CODE_ALPHABET.includes(ch));
export const showCode = c => { const n = normCode(c); return `${n.slice(0, 5)}-${n.slice(5)}`; };
const hex = buf => [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');
const unhex = s => new Uint8Array(String(s).match(/../g)?.map(x => parseInt(x, 16)) || []);
const subtle = () => globalThis.crypto.subtle;
export const ITERATIONS = 150000;
export async function deriveKey(code) {
  if (!validCode(code)) throw Error('연결 코드는 10자예요. AI 도구가 알려 준 코드를 그대로 넣어 주세요.');
  const enc = new TextEncoder();
  const base = await subtle().importKey('raw', enc.encode(normCode(code)), 'PBKDF2', false, ['deriveBits']);
  const bits = await subtle().deriveBits({name: 'PBKDF2', salt: enc.encode('mylogue-bridge-v4'), iterations: ITERATIONS, hash: 'SHA-256'}, base, 256);
  return hex(bits);
}
const hmacKey = keyHex => subtle().importKey('raw', unhex(keyHex), {name: 'HMAC', hash: 'SHA-256'}, false, ['sign']);
export async function proof(keyHex, label, nonce, extra = '') {
  const sig = await subtle().sign('HMAC', await hmacKey(keyHex), new TextEncoder().encode(`${label}|${nonce}|${extra}`));
  return hex(sig);
}
export const newNonce = () => hex(globalThis.crypto.getRandomValues(new Uint8Array(16)));
export const validNonce = n => typeof n === 'string' && /^[0-9a-f]{32}$/.test(n);
// 시간 차이로 맞히지 못하게 끝까지 비교
export function sameHex(a, b) { a = String(a ?? ''); b = String(b ?? ''); let d = a.length ^ b.length; for (let i = 0; i < Math.max(a.length, b.length); i++) d |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0); return d === 0; }
export function newCode() { const out = []; const r = globalThis.crypto.getRandomValues(new Uint32Array(CODE_LENGTH * 2)); for (const x of r) { if (x < Math.floor(2 ** 32 / CODE_ALPHABET.length) * CODE_ALPHABET.length) out.push(CODE_ALPHABET[x % CODE_ALPHABET.length]); if (out.length === CODE_LENGTH) break; } return out.length === CODE_LENGTH ? out.join('') : newCode(); }
