// 관리자 판단을 한곳에 모은다. Firestore·Storage 보안 규칙의 admin()과 반드시 같은 목록을 쓴다.
// 2026-11-20 대표님 지시: mooncurvv@gmail.com을 관리자(모든 권한)로 추가. 아직 UID를 몰라 이메일(Google 인증된 이메일)로 지정한다.
export const ADMIN_UIDS = ['bulbnZbmC4PgH8tUAOjfPPLE7pA3'];
export const ADMIN_EMAILS = ['mooncurvv@gmail.com'];

export function isAdminUser(user){
 if(!user) return false;
 if(ADMIN_UIDS.includes(user.uid)) return true;
 const email = String(user.email||'').trim().toLowerCase();
 return !!email && ADMIN_EMAILS.includes(email) && user.emailVerified !== false;
}
