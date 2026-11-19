from pathlib import Path

root = Path(__file__).resolve().parent
base = '#101625'
ideas = [
 ('01-open', '선 없이', '상단 장식을 덜어 형태만 남김', 'none', 'round', '#1c2842', '#8ce4e0', '#edf4f8', '#a9a5ee'),
 ('02-diamond', '작은 마름모', '기록의 한 점을 상단에 둠', 'diamond', 'round', '#1c2842', '#8ce4e0', '#edf4f8', '#a9a5ee'),
 ('03-three-dots', '세 개의 점', '몸·식단·운동의 세 기록을 암시', 'dots', 'round', '#172b44', '#82caff', '#edf4f8', '#82caff'),
 ('04-halo', '짧은 후광', '위쪽에 작은 호만 추가', 'halo', 'circle', '#1a2945', '#a9a5ee', '#edf4f8', '#a9a5ee'),
 ('05-split', '둘로 나눈 선', '원래 가로선에 숨 쉴 틈을 줌', 'split', 'round', '#202d4c', '#8ce4e0', '#dcecf6', '#8ce4e0'),
 ('06-ring', '중앙 고리', '기록이 모이는 중심을 표시', 'ring', 'circle', '#17283f', '#86b9f2', '#edf4f8', '#a9a5ee'),
 ('07-spark', '작은 별점', '기록 완료의 작은 반응', 'spark', 'round', '#263258', '#c1b7ff', '#f1f4fb', '#c1b7ff'),
 ('08-paired', '두 개의 점', '좌우 균형을 가장 단순하게 표현', 'paired', 'none', '#101625', '#8ce4e0', '#edf4f8', '#8ce4e0'),
 ('09-inset', '프레임 안쪽 점', '장식을 프레임 안으로 묶음', 'inset', 'round', '#1b3351', '#86d8ec', '#f5f6f8', '#86d8ec'),
 ('10-crown', '세 갈래 꼭짓점', '가로선 대신 위쪽을 세 줄기로 열어 둠', 'crown', 'round', '#1b2945', '#93bafa', '#f1f5fc', '#93bafa'),
]

def decoration(kind, color):
    if kind == 'none': return ''
    if kind == 'diamond': return f'<path d="M256 124 274 142 256 160 238 142Z" fill="{color}"/>'
    if kind == 'dots': return ''.join(f'<circle cx="{x}" cy="143" r="11" fill="{color}"/>' for x in (206,256,306))
    if kind == 'halo': return f'<path d="M192 151Q256 107 320 151" fill="none" stroke="{color}" stroke-width="17" stroke-linecap="round"/>'
    if kind == 'split': return f'<path d="M186 149h39m62 0h39" stroke="{color}" stroke-width="17" stroke-linecap="round"/>'
    if kind == 'ring': return f'<circle cx="256" cy="142" r="19" fill="none" stroke="{color}" stroke-width="11"/>'
    if kind == 'spark': return f'<path d="M256 119v38m-19-19h38" stroke="{color}" stroke-width="12" stroke-linecap="round"/>'
    if kind == 'paired': return f'<circle cx="216" cy="142" r="13" fill="{color}"/><circle cx="296" cy="142" r="13" fill="{color}"/>'
    if kind == 'inset': return f'<circle cx="256" cy="145" r="12" fill="{color}"/>'
    if kind == 'crown': return f'<path d="M202 154v-16m54 16v-28m54 28v-16" stroke="{color}" stroke-width="15" stroke-linecap="round"/>'
    return ''

for key, title, desc, top, frame, panel, accent, center, detail in ideas:
    shape = ''
    if frame == 'round':
        shape = f'<rect x="94" y="92" width="324" height="328" rx="79" fill="{panel}" stroke="#617294" stroke-width="6"/>'
    elif frame == 'circle':
        shape = f'<circle cx="256" cy="256" r="169" fill="{panel}" stroke="#617294" stroke-width="6"/>'
    svg = f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" role="img" aria-label="{title}"><rect width="512" height="512" rx="108" fill="{base}"/>{shape}{decoration(top, detail)}<path d="M154 340v-111q0-37 39-37h125q39 0 39 37v111" fill="none" stroke="{accent}" stroke-width="25" stroke-linecap="round"/><path d="M256 192v160" stroke="{center}" stroke-width="25" stroke-linecap="round"/><circle cx="154" cy="352" r="24" fill="{accent}"/><circle cx="256" cy="352" r="24" fill="{center}"/><circle cx="358" cy="352" r="24" fill="{accent}"/></svg>'''
    (root/f'{key}.svg').write_text(svg, encoding='utf-8')

css = '''@font-face{font-family:SUIT;src:url('../../app/fonts/SUIT-Regular.ttf')}@font-face{font-family:SUIT;src:url('../../app/fonts/SUIT-Bold.ttf');font-weight:700}*{box-sizing:border-box}body{margin:0;background:#101625;color:#edf4f8;font-family:SUIT,'Malgun Gothic',sans-serif}main{max-width:1250px;margin:auto;padding:32px 28px 55px}small{color:#8ce4e0;letter-spacing:.13em;font-size:11px;font-weight:700}h1{font-size:30px;margin:9px 0;letter-spacing:-.04em}header p{color:#b4c6d8;font-size:14px;margin:0;line-height:1.5}.grid{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:13px;margin-top:26px}.card{background:#1c2842;border:1px solid #465776;border-radius:18px;padding:14px;min-width:0}.card img.hero{width:100%;max-width:145px;display:block;margin:0 auto 10px}.tag{font-size:11px;color:#8ce4e0;font-weight:700}.card h2{font-size:17px;margin:5px 0;line-height:1.25}.card p{font-size:11px;color:#a9bbce;line-height:1.5;min-height:35px;margin:0}.sizes{display:flex;align-items:center;gap:9px;border-top:1px solid #465776;padding-top:11px;margin-top:10px}.sizes img{width:38px}.sizes img.tiny{width:22px}.sizes span{font-size:9px;color:#94a9bd}@media(max-width:900px){.grid{grid-template-columns:repeat(2,minmax(0,1fr))}}@media(max-width:550px){main{padding:22px 15px}.card{padding:10px}.card img.hero{max-width:118px}.card h2{font-size:15px}}'''
html = f'<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>마웨로그 아이콘 10가지</title><style>{css}</style></head><body><main><header><small>MYWEIGHTLOG · ORIGINAL 02 FLIPPED</small><h1>가로선 없이, 또는 다른 의미로</h1><p>상단 가로선은 원안의 장식이 뒤집혀 올라온 것입니다. 01은 제거, 나머지는 작은 점·고리·호 등으로 바꿨습니다.</p></header><div class="grid">'
for n,(key,title,desc,*_) in enumerate(ideas,1):
    html += f'<article class="card"><img class="hero" src="{key}.svg" alt="{title}"><div class="tag">{n:02d}</div><h2>{title}</h2><p>{desc}</p><div class="sizes"><img src="{key}.svg" alt=""><img class="tiny" src="{key}.svg" alt=""><span>38 / 22px</span></div></article>'
html += '</div></main></body></html>'
(root/'index.html').write_text(html, encoding='utf-8')
(root/'README.md').write_text('# 마웨로그 아이콘 상단 장식·색상 10종\n\n원래 02번을 상하 반전한 세 줄기 구조를 유지했다. 기존 위 가로선은 원본의 아래 장식이 반전된 것으로, 기능적 의미는 없었다. 01은 제거하고 02~10은 점·호·고리·분리선 등으로 바꿨다. 색도 청록·밝은 파랑·푸른 보라·아이보리 범위에서 달리했다. 아직 앱에 적용하지 않은 시안이다.\n', encoding='utf-8')
