"""Extract supplied rank artwork without reconstructing missing edges.
public/ranks.json is the single source for rank identity, score ranges, and asset paths.
Original supplied files remain unchanged in brand-assets/ranks/.
Run with --assets to re-extract crops (requires Pillow); ordinary page builds only generate JS.
"""
from pathlib import Path
import json,sys
ROOT=Path(__file__).resolve().parent.parent
ranks=json.loads((ROOT/'public/ranks.json').read_text())
def build_metadata():
    data=[{k:v for k,v in r.items() if k!='artwork'} for r in ranks]
    helper=(ROOT/'scripts/rank-helpers.js').read_text()
    (ROOT/'public/ranks.js').write_text('// GENERATED from public/ranks.json by scripts/build_ranks.py. Do not edit independently.\nexport const ranks = '+json.dumps(data,ensure_ascii=False,indent=2)+';\n'+helper)
def build_assets():
    from PIL import Image,ImageChops
    for rank in ranks:
        spec=rank['artwork']
        image=Image.open(ROOT/'brand-assets/ranks'/spec['source']).convert('RGBA').crop(spec['crop'])
        r,g,b,a=image.split()
        brightness=ImageChops.lighter(ImageChops.lighter(r,g),b)
        # Remove only the near-black backdrop; preserve original colored facets and highlights.
        mask=brightness.point(lambda value: max(0,min(255,round((value-8)*255/27))))
        image.putalpha(ImageChops.darker(mask,a))
        # Leave genuinely missing top pixels transparent, never redraw or borrow another tier.
        top=spec['missingTopPadding']
        padded=Image.new('RGBA',(image.width,image.height+top),(0,0,0,0))
        padded.alpha_composite(image,(0,top))
        padded.thumbnail((268,252),Image.Resampling.LANCZOS)
        canvas=Image.new('RGBA',(288,288),(0,0,0,0))
        canvas.alpha_composite(padded,((288-padded.width)//2,(288-padded.height)//2))
        output=ROOT/'public'/rank['icon'].lstrip('/')
        output.parent.mkdir(parents=True,exist_ok=True)
        canvas.save(output,'WEBP',lossless=True,method=6)
if __name__=='__main__':
    if '--assets' in sys.argv:build_assets()
    build_metadata()
    print('Built nine supplied rank identities'+(' and extracted emblem assets.' if '--assets' in sys.argv else '.'))
