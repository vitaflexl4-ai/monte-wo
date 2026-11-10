"""Extract supplied portrait panels without retouching. Optional Pillow authoring tool.
Usage: python scripts/prepare_sony_portrait_designs.py /path/to/uploads
Writes optimized selected assets/config and a review-only extracted portrait library.
"""
from pathlib import Path
from PIL import Image, ImageOps
import argparse,json,hashlib
ROOT=Path(__file__).resolve().parent.parent

def prepare(source):
    review=ROOT/'docs/sony-portrait-update';library=review/'portraits';library.mkdir(parents=True,exist_ok=True)
    assets=ROOT/'public/assets/sony';manifest=[]
    # Pixel boundaries stay inside the white collage dividers. No face manipulation.
    panels={
      'Cinematic Gold-Toned Portrait Portfolio.png':[(310,0,766,505),(773,0,1325,505),(0,514,508,1024),(516,514,1021,1024),(1028,514,1536,1024)],
      'Luxury Black-and-Gold Portrait Portfolio-1 2.png':[(5,5,690,1018),(697,5,1125,528),(1133,5,1530,528),(697,537,1125,1018),(1133,537,1530,1018)],
      'Cinematic Luxury Portrait Collection.png':[(0,0,765,505),(774,0,1536,505),(0,516,507,1024),(517,516,1021,1024),(1031,516,1536,1024)]}
    selected=None
    for group,(filename,boxes) in enumerate(panels.items(),1):
        original=ImageOps.exif_transpose(Image.open(source/filename)).convert('RGB')
        for i,box in enumerate(boxes,1):
            image=original.crop(box);name=f'collection-{group}-{i}.webp'
            image.save(library/name,'WEBP',quality=90,method=6)
            manifest.append({'file':name,'source':filename,'sourceSHA256':hashlib.sha256((source/filename).read_bytes()).hexdigest(),'crop':box,'width':image.width,'height':image.height})
            if group==3 and i==1:selected=image.copy()
    hero=ImageOps.exif_transpose(Image.open(source/'Black and Gold Executive Portrait.png')).convert('RGB')
    variants=[]
    for width in [480,768,hero.width]:
        image=hero.resize((width,round(hero.height*width/hero.width)),Image.Resampling.LANCZOS)
        name=f'sony-executive-2026-{width}.webp';image.save(assets/name,'WEBP',quality=84,method=6)
        variants.append({'src':'/assets/sony/'+name,'width':image.width,'height':image.height})
    selected.save(assets/'sony-executive-perspective-2026.webp','WEBP',quality=87,method=6)
    # Photo-only social image: no added typography, branding, compositing or watermarks.
    social=ImageOps.fit(hero,(1200,630),Image.Resampling.LANCZOS,centering=(.5,.22))
    social.save(assets/'sony-executive-social-2026.jpg',quality=88,optimize=True)
    config={'hero':{'src':variants[-1]['src'],'width':hero.width,'height':hero.height,'variants':variants,'sizes':'(max-width: 760px) 90svh, 62vw','position':'50% 28%','alt':'Sony Alexis in a black suit with a champagne-gold pocket square against a black-and-gold background'},'secondary':{'src':'/assets/sony/sony-executive-perspective-2026.webp','width':selected.width,'height':selected.height,'alt':'Sony Alexis smiling in a black suit in a warmly lit interior'},'social':{'src':'/assets/sony/sony-executive-social-2026.jpg','width':1200,'height':630,'alt':'Sony Alexis in a black suit against a black-and-gold background'}}
    (ROOT/'content/sony/profile-media.json').write_text(json.dumps(config,indent=2)+'\n')
    (review/'extraction-manifest.json').write_text(json.dumps({'panels':manifest,'heroSource':'Black and Gold Executive Portrait.png','heroSourceSHA256':hashlib.sha256((source/'Black and Gold Executive Portrait.png').read_bytes()).hexdigest(),'selectedSecondary':'collection-3-1.webp','processing':'Panel extraction, proportional resizing, encoding and photo-only social crop. No retouching, facial edits, generated pixels or new overlays.'},indent=2)+'\n')

if __name__=='__main__':
    parser=argparse.ArgumentParser(description=__doc__);parser.add_argument('source',type=Path);prepare(parser.parse_args().source)
