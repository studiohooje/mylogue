// 4.17.0 헬스 커넥트(삼성 헬스 등)에서 걸음 수·체중을 '가져오기 후보'로 만든다.
// 대표님 방침(2026-11-22): 걸음은 유산소(걷기) 기록, 체중은 체중 기록으로 들어오되 확정을 눌러야 추가된다.
// 자동 저장 설정도 있지만 기본은 꺼짐이고, 연결할 때 그런 설정이 있다고 알려 준다.
const STRIDE_KM = 0.00075, STEPS_PER_MIN = 100, MIN_STEPS = 1000;
const fmt = n => Math.round(n).toLocaleString('ko-KR');
const hhmm = t => { const d = new Date(t); return isNaN(d) ? '' : `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`; };
const md = d => `${Number(d.slice(5, 7))}/${Number(d.slice(8, 10))}`;

export function healthCandidates(data = {}, db = {}, today = '') {
  const healthWalk = new Map((db.workouts || []).filter(w => w.source === 'health').map(w => [w.date, w]));
  const steps = (data.steps || []).filter(s => s.date && Number(s.steps) >= MIN_STEPS && (!today || s.date <= today)).map(s => {
    const old = healthWalk.get(s.date), oldSteps = Number(old?.healthSteps) || Number(String(old?.exercises?.[0]?.note || '').match(/걸음 ([\d,]+)보/)?.[1]?.replace(/,/g, '')) || 0, n = Math.round(Number(s.steps));
    return {kind: 'steps', key: `steps:${s.date}`, date: s.date, steps: n, km: Math.round(n * STRIDE_KM * 10) / 10, min: Math.round(n / STEPS_PER_MIN),
      state: !old ? 'new' : n > oldSteps ? 'more' : 'same', oldSteps};
  });
  const byDate = new Map();
  for (const b of db.body || []) if (b.weight != null) { if (!byDate.has(b.date)) byDate.set(b.date, []); byDate.get(b.date).push(Number(b.weight)); }
  const weights = (data.weights || []).filter(w => w.date && Number(w.weight) > 20 && Number(w.weight) < 400).map(w => {
    const same = (byDate.get(w.date) || []).some(x => Math.abs(x - Number(w.weight)) < 0.05);
    return {kind: 'weight', key: `weight:${w.date}:${w.time || ''}`, date: w.date, time: w.time || '', weight: Math.round(Number(w.weight) * 10) / 10, state: same ? 'same' : 'new'};
  });
  // 같은 날 체중이 여러 번이면 가장 이른 것(아침 측정)을 앞에
  weights.sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time));
  return {steps, weights, fresh: [...steps, ...weights].filter(c => c.state !== 'same')};
}

// 확정한 후보 → 기록(걷기 유산소·체중). 값은 추정이 섞여 있다고 메모에 적는다.
export function healthRecords(cands = [], db = {}) {
  const workouts = [], body = [], replace = [];
  for (const c of cands) {
    if (c.kind === 'steps') {
      const old = (db.workouts || []).find(w => w.source === 'health' && w.date === c.date);
      if (old) replace.push(old.id);
      workouts.push({date: c.date, title: '걷기(헬스 연동)', source: 'health', healthSteps: c.steps,
        exercises: [{name: '걷기', kind: 'cardio', part: '유산소', durationMin: c.min, distanceKm: c.km, note: `걸음 ${fmt(c.steps)}보 · 시간·거리는 걸음 수로 어림한 값`}]});
    } else if (c.kind === 'weight') body.push({date: c.date, weight: c.weight, measure: 'scale', source: 'health', note: '헬스 커넥트에서 가져옴'});
  }
  return {workouts, body, replace};
}

export function healthPreviewHTML(cands, esc = s => String(s), {auto = false} = {}) {
  const row = c => c.kind === 'steps'
    ? `<label class="hc-row"><input type="checkbox" name="hc" value="${esc(c.key)}" ${c.state === 'same' ? 'disabled' : 'checked'}><span><b>${md(c.date)} 걷기</b><small>${fmt(c.steps)}보 · 약 ${c.km}km · 약 ${c.min}분${c.state === 'more' ? ` · 전에 가져온 ${fmt(c.oldSteps)}보에서 늘었어요` : c.state === 'same' ? ' · 이미 가져왔어요' : ''}</small></span></label>`
    : `<label class="hc-row"><input type="checkbox" name="hc" value="${esc(c.key)}" ${c.state === 'same' ? 'disabled' : 'checked'}><span><b>${md(c.date)} 체중 ${c.weight.toFixed(1)}kg</b><small>${c.time ? `${esc(hhmm(c.time))} 측정` : '측정 시각 없음'}${c.state === 'same' ? ' · 같은 값이 이미 있어요' : ''}</small></span></label>`;
  const all = [...cands.steps, ...cands.weights];
  if (!all.length) return `<p class="hint">최근 7일에 가져올 걸음 수(하루 ${fmt(MIN_STEPS)}보 이상)나 체중이 없어요.</p>`;
  return `<form id="hc-form" class="hc-form"><p class="hint">체크한 것만 기록에 더해요. 걸음 수는 '걷기' 유산소로, 체중은 평소 체중계 기록으로 들어가요.</p><div class="hc-list">${all.map(row).join('')}</div>`
    + `<label class="hc-auto"><input type="checkbox" name="hc-auto" ${auto ? 'checked' : ''}><span>다음부터 확인 없이 자동으로 더하기<small>꺼 두면 설정의 '최근 7일 가져오기'에서 골라 더해요(기본).</small></span></label>`
    + `<button class="button wide" ${cands.fresh.length ? '' : 'disabled'}>고른 것 기록에 더하기</button></form>`;
}

// 설정 카드: 웹에서는 안내만, 안드로이드 앱에서는 연결 버튼
export function healthSettingsHTML({native = false, status = '', granted = null, auto = false} = {}) {
  const head = '<h3>삼성 헬스 · 헬스 커넥트</h3>';
  if (!native) return `<section class="section card hc-card">${head}<p class="hint">안드로이드 앱에서 걸음 수와 체중을 가져올 수 있어요. 가져온 값은 확인을 누른 것만 기록돼요.</p></section>`;
  if (status === 'unsupported') return `<section class="section card hc-card">${head}<p class="hint">이 기기(안드로이드 8 미만)에서는 쓸 수 없어요.</p></section>`;
  if (status === 'update' || status === 'unavailable') return `<section class="section card hc-card">${head}<p class="hint">헬스 커넥트 앱을 ${status === 'update' ? '업데이트' : '설치'}하면 쓸 수 있어요. 삼성 헬스 설정에서 헬스 커넥트와 연결해 두세요.</p></section>`;
  const on = granted && (granted.steps || granted.weight);
  return `<section class="section card hc-card">${head}<p class="hint">걸음 수와 체중을 <b>읽기만</b> 해요. 가져온 값은 미리보기에서 고른 것만 기록되고, 원하면 '자동으로 더하기'를 켤 수 있어요${auto ? '(지금 켜져 있어요)' : '(기본은 꺼짐)'}.</p>`
    + `<div class="actions">${on ? '<button type="button" class="button" id="hc-read">최근 7일 가져오기</button>' : '<button type="button" class="button" id="hc-connect">헬스 커넥트 연결</button>'}</div>`
    + (on ? `<p class="hint">연결됨: ${[granted.steps && '걸음 수', granted.weight && '체중'].filter(Boolean).join('·')}</p>` : '')
    + `</section>`;
}

export const healthPlugin = () => { const C = globalThis.Capacitor; return C?.getPlatform?.() === 'android' && C.isPluginAvailable?.('MylogueHealth') ? C.Plugins.MylogueHealth : null; };
