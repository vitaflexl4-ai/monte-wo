"""Prepare transparent PNGs from the supplied black-background logo.
Run with Pillow installed. Originals are never modified.
"""
from pathlib import Path
from PIL import Image
ROOT = Path(__file__).resolve().parent.parent
source = ROOT / 'brand-assets/group/vitaflex-business-group-original.png'
image = Image.open(source).convert('RGBA')
pixels = []
for r, g, b, _ in image.getdata():
    # Remove the near-black field, including enclosed spaces. Preserve bright
    # gold pixels exactly; soften only the dark edge transition to avoid halos.
    peak = max(r, g, b)
    alpha = round(255 * max(0, min(1, (peak - 24) / 40)))
    pixels.append((r, g, b, alpha) if alpha else (0, 0, 0, 0))
image.putdata(pixels)
image.save(ROOT / 'brand-assets/group/vitaflex-business-group-transparent.png', optimize=True)
output = ROOT / 'public/assets/group'
image.resize((1024, 1024), Image.Resampling.LANCZOS).save(output / 'vitaflex-business-group.png', optimize=True)
mark = image.crop((320, 235, 930, 630))
mark.resize((244, 158), Image.Resampling.LANCZOS).save(output / 'vitaflex-monogram.png', optimize=True)
icon = Image.new('RGBA', (660, 660), (0, 0, 0, 0))
icon.paste(mark, ((660-mark.width)//2, (660-mark.height)//2))
icon.resize((64, 64), Image.Resampling.LANCZOS).save(output / 'favicon.png', optimize=True)
for file in ['vitaflex-business-group.png', 'vitaflex-monogram.png', 'favicon.png']:
    img = Image.open(output / file)
    assert img.mode == 'RGBA' and img.getchannel('A').getextrema() == (0, 255)
    print(file, img.size, (output/file).stat().st_size, 'bytes; transparent RGBA')
