// 4.29.x AI 비용 알림 — 슈퍼관리자용(대표님 2026-11-25: 정해 둔 금액을 넘으면 알림).
// AI 서버의 '서비스 전체 사용 금액' 장부(실제 사용량으로 보정)를 'me'로 받아, 이번 달 알림 기준의 70%·90%·100%와
// 오늘 상한 도달을 오른쪽 위 종 알림에 띄운다. 실제 청구서와 조금 다를 수 있다(정확한 금액은 각 회사 콘솔의 이메일 알림이 기준).
// 서버를 부르는 건 한 시간에 한 번까지(기기에 저장), 화면을 그리는 중에는 절대 부르지 않는다(반복 호출 방지).
// 이 파일은 app.js를 import하지 않는다.
import {scopedKey} from './storage-scope.js';

const INFO = 'mylogue.costInfo', SEEN = 'mylogue.costSeen', TTL = 60 * 60_000;
const get = k => { try { return JSON.parse(globalThis.localStorage?.getItem(scopedKey(k)) || 'null'); } catch { return null; } };
const put = (k, v) => { try { globalThis.localStorage?.setItem(scopedKey(k), JSON.stringify(v)); } catch {} };
const won = v => `${Math.round(Number(v) || 0).toLocaleString('ko-KR')}원`;

export const costInfo = () => get(INFO)?.global || null;
// fetchMe: () => Promise<me 응답>. 한 시간 안에 받은 게 있으면 부르지 않는다(force면 다시).
export async function refreshCostInfo(fetchMe, {now = Date.now(), force = false} = {}) {
  const c = get(INFO);
  if (!force && c && now - Number(c.at || 0) < TTL) return c.global || null;
  const me = await fetchMe();
  if (!me?.global) return null;
  put(INFO, {at: now, global: me.global});
  return me.global;
}
// 장부 → 알림 항목(종 알림 모양). 확인한 단계는 다시 띄우지 않는다.
export function costItems(g = costInfo(), {seen = new Set(get(SEEN) || [])} = {}) {
  if (!g) return [];
  const out = [], month = String(g.month || ''), day = String(g.day || '');
  const alert = Number(g.alertWon) || Number(g.monthlyCap) || 0, used = Number(g.monthWon) || 0;
  if (alert > 0) {
    const pct = used / alert, level = pct >= 1 ? 100 : pct >= 0.9 ? 90 : pct >= 0.7 ? 70 : 0;
    if (level) out.push({key: `cost:${month}:${level}`, kind: 'cost', id: `${month}:${level}`, title: level === 100 ? `이번 달 AI 비용이 알림 기준(${won(alert)})을 넘었어요` : `이번 달 AI 비용이 알림 기준의 ${level}%예요`, sub: `마이로그 장부 ${won(used)} / ${won(alert)} · 실제 청구는 각 회사 콘솔에서 확인`, at: Date.now()});
  }
  const dCap = Number(g.dailyCap) || 0, dUsed = Number(g.dayWon) || 0;
  if (dCap > 0 && dUsed >= dCap * 0.999) out.push({key: `cost:${day}:day`, kind: 'cost', id: `${day}:day`, title: '오늘 AI 사용 상한에 닿아 AI가 멈췄어요', sub: `오늘 ${won(dUsed)} / 상한 ${won(dCap)} · 내일 다시 열려요`, at: Date.now()});
  return out.filter(x => !seen.has(x.key));
}
export function markCostSeen(key) { const s = get(SEEN) || []; if (!s.includes(key)) put(SEEN, [...s, key].slice(-24)); }
// 설정 화면 한 줄
export function costLineHTML(g = costInfo(), esc = s => s) {
  if (!g) return '<p class="hint">AI 사용 금액: 아직 받은 정보가 없어요(AI 서버 연결 뒤 한 시간마다 확인).</p>';
  const alert = Number(g.alertWon) || Number(g.monthlyCap) || 0;
  return `<p class="hint cost-line">이번 달 AI 사용(마이로그 장부) <b>${esc(won(g.monthWon))}</b>${alert ? ` / 알림 기준 ${esc(won(alert))}(${Math.round((Number(g.monthWon) || 0) / alert * 100)}%)` : ''} · 오늘 ${esc(won(g.dayWon))}${g.dailyCap ? ` / 상한 ${esc(won(g.dailyCap))}` : ''}. 실제 청구는 각 회사 콘솔 기준이에요.</p>`;
}
