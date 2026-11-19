from pathlib import Path
from PIL import Image

root = Path(__file__).resolve().parent.parent / 'artifacts' / 'business-deck-suit-powerpoint'
for start in range(1, 18, 4):
    canvas = Image.new('RGB', (1280, 720), 'white')
    for offset, index in enumerate(range(start, min(start + 4, 18))):
        image = Image.open(root / f'slide-{index:02d}.png').convert('RGB').resize((640, 360))
        canvas.paste(image, ((offset % 2) * 640, (offset // 2) * 360))
    canvas.save(root / f'contact-{start:02d}.png')

