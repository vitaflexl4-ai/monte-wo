"""Import only SVG geometry and declarative tier data from a pinned root index.
No source JavaScript, shell script, SQL, upload or browser-message handler executes.
"""
from pathlib import Path
import argparse, hashlib, json, re, subprocess, xml.etree.ElementTree as ET
ROOT=Path(__file__).resolve().parents[1]
DEFAULT='3f60741742db3db0c92d6d316e81b3e4e430d7da'
def git(*args):return subprocess.check_output(['git',*args],cwd=ROOT)
def mirror(d):
    assert re.fullmatch(r'[MLQZ0-9\s.,-]+',d), 'Unsupported mirrored path command'
    def part(m):
        values=re.split(r'[\s,]+',m[2].strip());return m[1]+' '.join(str(int(420-float(v))) if i%2==0 else v for i,v in enumerate(values))
    return re.sub(r'([MLQ])([\d\s.,-]+)',part,d)
def main(ref):
    commit=git('rev-parse',ref).decode().strip();raw=git('show',commit+':index.html');html=raw.decode()
    script=re.search(r'<script>(.*?)</script>',html,re.S)[1]
    data=json.loads(subprocess.check_output(['node',str(ROOT/'scripts/read_muscle_map_data.cjs')],input=script.encode()))
    figure=ET.fromstring(re.search(r'(<svg id="fig".*?</svg>)',html,re.S)[1]);assert figure.attrib['viewBox']=='0 0 420 640'
    tags={'defs','clipPath','ellipse','linearGradient','stop','g','path','rect','circle'}
    allowed={'id','class','data-v','data-a','cx','cy','rx','ry','r','x','y','width','height','d','fill','stroke','stroke-width','stroke-opacity','fill-opacity','x1','x2','y1','y2','offset','stop-color','clip-path'}
    def shape(el):
        assert el.tag in tags and set(el.attrib)<=allowed
        assert not any('http' in v or 'javascript:' in v for v in el.attrib.values())
        return {'tag':el.tag,'attrs':el.attrib,'children':[shape(c) for c in el]}
    background=[shape(el) for el in figure if el.attrib.get('id')!='mg' and el.attrib.get('class')!='an']
    anchors={v:{} for v in ['f','b']}
    for el in figure.findall("circle[@class='an']"):
        anchors[el.attrib['data-v']][el.attrib['data-a']]={'x':float(el.attrib['cx']),'y':float(el.attrib['cy'])}
    assert set(data['R'])=={'arms','back','core','legs','chest'}
    ranks={id:{'label':label,'color':color} for id,label,color in data['RK']}
    assert set(ranks)=={'debitan','bati','solid','fo','avanse','met','chanpyon','titan','lejand'}
    regions=[]
    for m in data['M']:
        id=m['id'];rank=data['R'][id];assert rank in ranks
        icon=ET.fromstring('<g>'+m['i']+'</g>');assert all(c.tag=='path' and set(c.attrib)=={'d'} for c in icon)
        paths={}
        for view,p in [('f',data['P']),('b',data['PB'])]:
            if id in p:paths[view]=[d for source in p[id] for d in (source,mirror(source))]
        regions.append({'id':id,'name':m['n'],'side':m['s'],'view':m.get('v'),'tierId':rank,'color':ranks[rank]['color'],'iconPaths':[c.attrib['d'] for c in icon],'paths':paths,'anchors':{v:a[id] for v,a in anchors.items() if id in a}})
    output={'source':{'branch':'main','commit':commit,'path':'index.html','sha256':hashlib.sha256(raw).hexdigest()},'viewBox':[0,0,420,640],'ranks':ranks,'regions':regions,'background':background,'tierSemantics':'Source preview examples only; not earned ranks or qualification thresholds.'}
    (ROOT/'apps/mobile/src/generated/premium-muscle-map.json').write_text(json.dumps(output,indent=2)+'\n')
    doc=ROOT/'docs/mobile/premium-muscle-map';doc.mkdir(exist_ok=True);(doc/'source-index.html').write_bytes(raw)
    report={'source':output['source'],'regionTierMapping':{r['id']:r['tierId'] for r in regions},'targetSelectors':[f".m[data-m='{r['id']}'][data-v='{v}']" for r in regions for v in r['paths']],'pathCounts':{v:sum(len(r['paths'].get(v,[])) for r in regions) for v in ['f','b']},'sourceScriptExecuted':False,'rankRulesChanged':False,'sourceFooterCorrection':'5 muscle regions, 4 independent ranked disciplines. Preserve approved Fò spelling.'}
    (doc/'source-audit.json').write_text(json.dumps(report,indent=2)+'\n');print(json.dumps(report,indent=2))
if __name__=='__main__':
    p=argparse.ArgumentParser();p.add_argument('--ref',default=DEFAULT);main(p.parse_args().ref)
