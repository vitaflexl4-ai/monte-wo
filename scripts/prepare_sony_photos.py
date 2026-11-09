"""Optimize supplied real photos; no retouching or invented imagery.
Optional authoring tool: Pillow required, not needed by npm build or the browser.
Usage: python scripts/prepare_sony_photos.py --hero portrait.jpeg --secondary candid.jpeg
Outputs strip EXIF (including any GPS), preserve aspect ratio and never upscale portraits.
"""
from pathlib import Path
from PIL import Image, ImageOps, ImageDraw, ImageFont
import argparse, json
ROOT = Path(__file__).resolve().parent.parent
if __name__ == '__main__':
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--hero',required=True)
    parser.add_argument('--secondary',required=True)
    args=parser.parse_args()
    output=ROOT/'public/assets/sony';output.mkdir(parents=True,exist_ok=True)
    hero=ImageOps.exif_transpose(Image.open(args.hero)).convert('RGB')
    secondary=ImageOps.exif_transpose(Image.open(args.secondary)).convert('RGB')
    variants=[]
    for width in sorted({min(hero.width,w) for w in [480,768,1200]}):
        image=hero.resize((width,round(hero.height*width/hero.width)),Image.Resampling.LANCZOS)
        filename=f'sony-alexis-portrait-{width}.webp';image.save(output/filename,'WEBP',quality=84,method=6)
        variants.append({'src':'/assets/sony/'+filename,'width':image.width,'height':image.height})
    secondary.thumbnail((900,900),Image.Resampling.LANCZOS)
    secondary.save(output/'sony-alexis-perspective.webp','WEBP',quality=84,method=6)
    social=Image.new('RGB',(1200,630),'#0b0c0b')
    photo=ImageOps.fit(hero,(690,630),Image.Resampling.LANCZOS,centering=(.58,.18));social.paste(photo,(510,0))
    for x in range(230):
        opacity=round(255*(1-x/230))
        shade=Image.new('RGBA',(1,630),(11,12,11,opacity));social.paste(shade,(510+x,0),shade)
    draw=ImageDraw.Draw(social)
    fonts=Path('/usr/share/fonts/truetype/dejavu')
    serif=ImageFont.truetype(str(fonts/'DejaVuSerif.ttf'),76) if (fonts/'DejaVuSerif.ttf').exists() else ImageFont.load_default(size=76)
    small=ImageFont.truetype(str(fonts/'DejaVuSans.ttf'),16) if (fonts/'DejaVuSans.ttf').exists() else ImageFont.load_default(size=16)
    draw.text((65,110),'FAITH. GROWTH. PURPOSE.',font=small,fill='#C6A66A')
    draw.text((60,190),'SONY',font=serif,fill='#F2EFE8');draw.text((60,275),'ALEXIS',font=serif,fill='#F2EFE8')
    draw.line((65,390,135,390),fill='#C6A66A',width=1)
    draw.text((65,420),'The Person Behind the Vision',font=small,fill='#F2EFE8')
    social.save(output/'sony-alexis-social.jpg',quality=88,optimize=True)
    config={'hero':{'src':variants[-1]['src'],'width':variants[-1]['width'],'height':variants[-1]['height'],'variants':variants,'position':'58% 25%','alt':'Sony Alexis, photographed outdoors in a burgundy jacket'},'secondary':{'src':'/assets/sony/sony-alexis-perspective.webp','width':secondary.width,'height':secondary.height,'alt':'Sony Alexis smiling in a colorful patterned shirt'},'social':{'src':'/assets/sony/sony-alexis-social.jpg','width':1200,'height':630,'alt':'Sony Alexis — The Person Behind the Vision'}}
    dest=ROOT/'content/sony/profile-media.json';dest.write_text(json.dumps(config,indent=2)+'\n')
    print('Prepared owner-supplied photographs and updated',dest.relative_to(ROOT))
