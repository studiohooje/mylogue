// 4.17.0 가상 인물 화면 점검(브라우저, 둘러보기 상태에서): 일곱 페이지를 돌며 화면 오류·이상 글자·간격·접근성 위반을 센다.
import {a11yAudit} from './a11y-audit.js';
import {spacingAudit} from './spacing-audit.js';
export async function personaCheck() {
  const w = ms => new Promise(r => setTimeout(r, ms)), errs = [];
  const onerr = e => errs.push(String(e.message || e.reason || e));
  window.addEventListener('error', onerr); window.addEventListener('unhandledrejection', onerr);
  const res = {who: document.querySelector('.phase-badge b')?.innerText || ''};
  for (const p of ['home', 'food', 'workout', 'body', 'analysis', 'calendar', 'settings']) {
    document.querySelector(`[data-page="${p}"]`)?.click(); await w(1500);
    const issues = [...a11yAudit(), ...spacingAudit()].filter(x => !/cloud-login|ai-magic/.test(x.el) && !/터치 높이/.test(x.kind));
    const t = document.querySelector('main')?.innerText || '';
    const bad = [...new Set(t.match(/undefined|NaN|\[object|Infinity|null(kcal|g|kg)/g) || [])];
    res[p] = issues.length || bad.length ? {issues: issues.slice(0, 3).map(x => `${x.kind} ${x.el}`), bad} : 'ok';
  }
  window.removeEventListener('error', onerr); window.removeEventListener('unhandledrejection', onerr);
  res.errors = errs; return res;
}
