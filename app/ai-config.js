// 3.17.0 앱 안 '말로 입력'용 AI 서버 주소(Cloudflare Workers). 배포 전에는 비워 둬서 화면에 나오지 않는다.
// 배포 후 `https://mylogue-ai.<계정>.workers.dev`를 넣는다. 개발 중에는 localhost에서만 localStorage 'mylogue.aiWorkerUrl'로 바꿀 수 있다.
export const AI_WORKER_URL = '';
export function aiWorkerUrl(){
 try{ const host = globalThis.location?.hostname||''; const dev = globalThis.localStorage?.getItem('mylogue.aiWorkerUrl'); if(dev && (host==='localhost' || host==='127.0.0.1')) return dev.replace(/\/$/, ''); }catch{}
 return AI_WORKER_URL.replace(/\/$/, '');
}
