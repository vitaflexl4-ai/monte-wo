"""Publish approved poster derivatives. Originals and exercise metadata stay untouched."""
from pathlib import Path
import json,re,xml.etree.ElementTree as ET
ROOT=Path(__file__).resolve().parent.parent
POSTERS=json.loads((ROOT/'content/workout-posters.json').read_text())

def publish_posters():
    result={}
    for p in POSTERS:
        assert re.fullmatch(r'[a-z0-9]+(?:-[a-z0-9]+)*',p['id'])
        source=ROOT/'assets/posters'/(p['id']+'.svg')
        text=source.read_text()
        assert '<!DOCTYPE' not in text.upper() and '<!ENTITY' not in text.upper()
        # Supplied assets use this nonstandard namespace. Fix served copies only.
        served=text.replace('xmlns="http://w3.org"','xmlns="http://www.w3.org/2000/svg"',1)
        tree=ET.fromstring(served)
        assert tree.tag=='{http://www.w3.org/2000/svg}svg'
        for node in tree.iter():
            assert node.tag.split('}')[-1] in {'svg','rect','circle','text'}
            assert all(not key.lower().startswith('on') and 'href' not in key.lower() and 'url(' not in value.lower() for key,value in node.attrib.items())
        src='/assets/posters/'+p['id']+'.svg'
        destination=ROOT/'public'/src.lstrip('/')
        destination.parent.mkdir(parents=True,exist_ok=True)
        destination.write_text(served)
        result[p['homeId']]={**p,'src':src}
    (ROOT/'public/workout-posters.js').write_text('// Generated from approved repo posters; not technique demonstrations.\nexport const workoutPosters = '+json.dumps(result,ensure_ascii=False)+';\n')
    return result
