# 자료 HTML에 SUIT 글꼴을 쓰인 글자만 잘라 woff2로 넣는다.
import base64, io, sys, re
from fontTools import subset
from fontTools.ttLib import TTFont

src, out, fontdir = sys.argv[1], sys.argv[2], sys.argv[3]
html = open(src, encoding='utf-8').read()
text = re.sub(r'<style>.*?</style>', '', html, flags=re.S)
chars = set(text) | set('0123456789+-×·.,:()%~/ ')
faces = []
for w, name in [(400, 'Regular'), (600, 'SemiBold'), (700, 'Bold')]:
    f = TTFont(f'{fontdir}/SUIT-{name}.ttf')
    opts = subset.Options(); opts.flavor = 'woff2'; opts.layout_features = ['*']
    s = subset.Subsetter(opts); s.populate(text=''.join(chars)); s.subset(f)
    buf = io.BytesIO(); f.flavor = 'woff2'; f.save(buf)
    b64 = base64.b64encode(buf.getvalue()).decode()
    faces.append(f"@font-face{{font-family:MylogueSUIT;src:url(data:font/woff2;base64,{b64}) format('woff2');font-weight:{w};font-display:swap}}")
html = html.replace('/*FONTS*/', '\n'.join(faces))
open(out, 'w', encoding='utf-8').write(html)
print(len(html))
