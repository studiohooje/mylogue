// 4.17.0 회고 공유 카드(페이즈 회고·올해 돌아보기). 몸 숫자(체중·체지방·근육)는 '숫자 숨기고'를 고르면 빼고 그린다.
// lines: [{label, value, body:true(몸 숫자)}]
export function storyLines(kind, r) {
  const sign = n => `${n > 0 ? '+' : ''}${n}`;
  if (kind === 'phase') return [
    {label: '기간', value: `${r.weeks}주`},
    {label: '기록한 날', value: `${r.recordDays}일`},
    {label: '운동한 날', value: `${r.workoutDays}일`},
    ...(r.weightChange != null ? [{label: '체중', value: `${sign(r.weightChange)}kg`, body: true}] : []),
    ...(r.fatChange != null ? [{label: '체지방률', value: `${sign(r.fatChange)}%p`, body: true}] : []),
    ...(r.muscleChange != null ? [{label: '골격근량', value: `${sign(r.muscleChange)}kg`, body: true}] : []),
  ];
  return [
    {label: '움직인 날', value: `${r.days}일`},
    ...(r.bestMonth ? [{label: '가장 꾸준했던 달', value: `${r.bestMonth.m}월`}] : []),
    ...(r.fav?.[0] ? [{label: '가장 많이 한 운동', value: r.fav[0][0]}] : []),
    ...(r.prs ? [{label: '새 기록 세운 날', value: `${r.prs}일`}] : []),
    ...(r.km >= 1 ? [{label: '달리고 걸은 거리', value: `${r.km}km`}] : []),
  ];
}
export function drawStoryCard({title, sub, lines, hideBody = false, foot = '마이로그 · 기록이 쌓이면 이야기가 돼요'}) {
  const c = document.createElement('canvas'); c.width = 1080; c.height = 1350; const x = c.getContext('2d');
  const g = x.createLinearGradient(0, 0, 1080, 1350); g.addColorStop(0, '#1d2a44'); g.addColorStop(1, '#101625'); x.fillStyle = g; x.fillRect(0, 0, 1080, 1350);
  x.fillStyle = 'rgba(140,228,224,.14)'; x.beginPath(); x.arc(900, 200, 300, 0, Math.PI * 2); x.fill();
  const font = (s, w = 700) => `${w} ${s}px MylogueSUIT, 'Malgun Gothic', sans-serif`;
  x.fillStyle = '#8ce4e0'; x.font = font(36, 600); x.fillText(sub, 90, 170);
  x.fillStyle = '#ffffff'; x.font = font(76, 800); wrap(x, title, 90, 270, 900, 92);
  const rows = lines.filter(l => !(hideBody && l.body)).slice(0, 6);
  let y = 520;
  for (const l of rows) {
    x.fillStyle = 'rgba(255,255,255,.06)'; round(x, 90, y - 70, 900, 110, 24); x.fill();
    x.fillStyle = '#a9bbce'; x.font = font(36, 500); x.fillText(l.label, 130, y);
    x.fillStyle = '#ffffff'; x.font = font(48, 800); x.textAlign = 'right'; x.fillText(l.value, 950, y + 4); x.textAlign = 'left';
    y += 135;
  }
  x.fillStyle = '#a9bbce'; x.font = font(30, 500); x.fillText(foot, 90, 1270);
  return c;
}
function wrap(x, text, left, top, width, lh) { let line = '', y = top; for (const ch of String(text)) { if (x.measureText(line + ch).width > width && line) { x.fillText(line, left, y); line = ch; y += lh; } else line += ch; } if (line) x.fillText(line, left, y); }
function round(x, l, t, w, h, r) { x.beginPath(); x.moveTo(l + r, t); x.arcTo(l + w, t, l + w, t + h, r); x.arcTo(l + w, t + h, l, t + h, r); x.arcTo(l, t + h, l, t, r); x.arcTo(l, t, l + w, t, r); x.closePath(); }
export const shareButtonsHTML = kind => `<div class="share-row-btns"><button type="button" class="button small" data-share-card="${kind}">카드로 저장·공유</button><button type="button" class="button small secondary" data-share-card="${kind}" data-share-hide="1">몸 숫자 빼고</button></div>`;
