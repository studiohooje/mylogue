// 4.20.0 사진 스캔 이펙트(대표님: AI가 사진을 검증할 때 '진짜 스캔하고 있구나' 느낌, 마이로그 오로라 스타일)
// 헤일로 세 색(몸 #f2b49b · 식사 #8ce4e0 · 운동 #b8aaf2)으로 된 오로라 빛줄기가 사진을 위아래로 훑고,
// 지나간 자리에 격자·빛 점(찾은 지점)·모서리 표시가 켜진다. 아래 알약에 지금 하는 일이 차례로 바뀐다.
// 화면 움직임 줄이기 설정이면 빛줄기 대신 은은한 숨쉬기만. 순수 CSS 애니메이션(자바스크립트 타이머 없음).
const h = v => String(v ?? '').replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));
export const FOOD_STEPS = ['사진 속 음식을 찾는 중', '양을 가늠하는 중', '영양 성분을 맞추는 중', '기록으로 정리하는 중'];
export const INBODY_STEPS = ['결과지를 펼쳐 보는 중', '숫자 칸을 찾는 중', '숫자를 읽는 중', '값을 맞춰 보는 중'];
// 빛 점(찾은 지점): 고정된 자리에서 차례로 켜진다(사진마다 같은 자리 — 무작위처럼 보이게 흩어 둠)
const DOTS = [[22, 30], [64, 22], [41, 55], [76, 63], [30, 78], [58, 40], [84, 34], [15, 58]];

export function scanLayerHTML(steps = FOOD_STEPS){
  const n = steps.length;
  return `<span class="scan-grid" aria-hidden="true"></span><span class="scan-beam" aria-hidden="true"></span><span class="scan-corners" aria-hidden="true"><i></i><i></i><i></i><i></i></span>${DOTS.map(([x, y], i) => `<span class="scan-dot" aria-hidden="true" style="left:${x}%;top:${y}%;animation-delay:${(i * 0.45).toFixed(2)}s"></span>`).join('')}<span class="scan-label" role="status" aria-live="polite"><i class="scan-pulse" aria-hidden="true"></i><span class="scan-steps" style="--n:${n};animation-duration:${n * 1.8}s">${steps.map(s => `<b>${h(s)}</b>`).join('')}</span><span class="sr-only">${h(steps[0])}</span></span>`;
}
// 사진(들)을 스캔 중으로 그린다. srcs: data URL 또는 주소
export function scanHTML(srcs = [], {steps = FOOD_STEPS, alt = '분석 중인 사진'} = {}){
  const list = srcs.slice(0, 2);
  return `<div class="scan-fx${list.length > 1 ? ' two' : ''}">${list.map((src, i) => `<figure class="scan-frame"><img src="${h(src)}" alt="${h(alt)} ${i + 1}">${i === 0 ? scanLayerHTML(steps) : scanLayerHTML([])}</figure>`).join('')}</div>`;
}
// 이미 있는 <img>(인바디 미리보기 등)에 스캔을 씌우고, 끝나면 걷어 낸다
export function attachScan(img, steps = INBODY_STEPS){
  if (!img || !img.parentNode) return () => {};
  const frame = document.createElement('figure');
  frame.className = 'scan-frame attached';
  img.parentNode.insertBefore(frame, img);
  frame.appendChild(img);
  frame.insertAdjacentHTML('beforeend', scanLayerHTML(steps));
  return (done = true) => {
    if (!frame.parentNode) return;
    if (done) { frame.classList.add('scan-done'); setTimeout(() => unwrap(), 700); } else unwrap();
    function unwrap(){ if (!frame.parentNode) return; frame.parentNode.insertBefore(img, frame); frame.remove(); }
  };
}
