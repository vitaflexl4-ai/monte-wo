"""Add a restrained orbit around the unchanged original VF. Optional Pillow authoring tool."""
from pathlib import Path
from PIL import Image,ImageDraw
ROOT=Path(__file__).resolve().parent.parent
source=Image.open(ROOT/'public/assets/group/vitaflex-monogram.png').convert('RGBA')
canvas=Image.new('RGBA',(320,240));orbit=Image.new('RGBA',(320,240));draw=ImageDraw.Draw(orbit)
draw.ellipse((8,41,312,199),outline='#c6a66a',width=2)
orbit=orbit.rotate(25,resample=Image.Resampling.BICUBIC)
canvas.alpha_composite(orbit);canvas.alpha_composite(source,((320-source.width)//2,(240-source.height)//2))
output=ROOT/'public/assets/intelligence';output.mkdir(parents=True,exist_ok=True)
canvas.save(output/'monogram-orbit.png')
square=Image.new('RGBA',(320,320));square.alpha_composite(canvas,(0,40))
square.resize((64,64),Image.Resampling.LANCZOS).save(output/'favicon.png')
share=Image.new('RGBA',(1200,630),'#0b0c0b');large=canvas.resize((600,450),Image.Resampling.LANCZOS);share.alpha_composite(large,(300,90));share.convert('RGB').save(output/'social.png')
review=ROOT/'docs/intelligence-branding';review.mkdir(parents=True,exist_ok=True)
for mode,color in [('dark','#0b0c0b'),('light','#f5f3ec')]:
 plate=Image.new('RGBA',(400,300),color);plate.alpha_composite(canvas,(40,30));plate.convert('RGB').save(review/f'monogram-{mode}.png')
