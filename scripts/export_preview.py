"""Export a network-free multi-page review file and the deployable source archive."""
from pathlib import Path
import re,base64,zipfile,mimetypes,json,sys
lab_mode="--lab" in sys.argv
website_mode="--website" in sys.argv
basename="Monte-Wo-Website-Step-2" if website_mode else "Monte-Wo-Strength-Lab" if lab_mode else "Monte-Wo-Strength-Index"
root=Path(__file__).resolve().parent.parent
pub=root/'public'
fonts=(pub/'fonts.css').read_text()
for f in (pub/'assets').glob('*.ttf'):
 fonts=fonts.replace('/assets/'+f.name,'data:font/ttf;base64,'+base64.b64encode(f.read_bytes()).decode())
css=fonts+'\n'+(pub/'style.css').read_text()+'\n'+(pub/'launch.css').read_text()+'\n'+(pub/'tools.css').read_text()+'\n'+(pub/'library.css').read_text()+'\n'+(pub/'strength.css').read_text()+'\n'+(pub/'lab.css').read_text()+'\n'+(pub/'website.css').read_text()+'\n'+(pub/'dashboard.css').read_text()
asset_tokens={}; embedded_assets={}
def embed(match):
 attr,path=match.groups();f=pub/path.lstrip('/')
 if path not in asset_tokens:
  token='__MW_ASSET_'+str(len(asset_tokens))+'__';asset_tokens[path]=token
  embedded_assets[token]='data:'+(mimetypes.guess_type(f.name)[0] or 'application/octet-stream')+';base64,'+base64.b64encode(f.read_bytes()).decode()
 return attr+'="'+asset_tokens[path]+'"'
rootjs='\n'.join((pub/name).read_text() for name in ['ranks.js','scoring.js','website-copy.js','translations.js','app.js'])
rootjs=re.sub(r'^export \{[^}]*\}[^\n]*;\n','',rootjs,flags=re.M)
rootjs=re.sub(r'^import .*?;\n','',rootjs,flags=re.M).replace('export const ','const ').replace('export function ','function ')
rootjs=re.sub(r"fetch\('/media.json'\).*?\.catch\(\(\)=>\{\}\);",'',rootjs,flags=re.S)
rootjs=re.sub(r"^if\('serviceWorker' in navigator\).*",'',rootjs,flags=re.M)
sitejs=(pub/'ranks.js').read_text()+'\n'+(pub/'site.js').read_text()
sitejs=re.sub(r'^import .*?;\n','',sitejs,flags=re.M).replace('export const ','const ').replace('export function ','function ')
sitejs=re.sub(r"^if\('serviceWorker' in navigator\).*",'',sitejs,flags=re.M)
sitejs=sitejs.replace("async function loadConfig(){","async function loadConfig(){ unavailable('This is a portable review preview. Signup is disabled; use the deployed Cloudflare website to join.'); return;")
sitejs=sitejs.replace("()=>location.href='/delete-account/#clear-device'","()=>window.parent.postMessage({type:'mw-nav',path:'/delete-account/',hash:'#clear-device'},'*')")
rootjs=rootjs.replace('${rank.icon}', '${window.__MW_RANK_ASSETS?.[rank.id]||rank.icon}')
sitejs=sitejs.replace('${rank.icon}', '${window.__MW_RANK_ASSETS?.[rank.id]||rank.icon}')
rank_assets={r['id']:'data:image/webp;base64,'+base64.b64encode((pub/r['icon'].lstrip('/')).read_bytes()).decode() for r in json.loads((pub/'ranks.json').read_text())}
toolsjs=(pub/'tool-math.js').read_text()+'\n'+(pub/'tools.js').read_text()
toolsjs=re.sub(r'^import .*?;\n','',toolsjs,flags=re.M).replace('export const ','const ').replace('export function ','function ').replace('export class ','class ')
nav="""document.addEventListener('click',event=>{const button=event.target.closest('button[type="submit"],input[type="submit"]');if(!button?.form||button.disabled)return;event.preventDefault();if(button.form.reportValidity())button.form.dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}));},true);document.addEventListener('click',event=>{const link=event.target.closest('a[href]');if(!link)return;const href=link.getAttribute('href');if(!href.startsWith('/'))return;event.preventDefault();const [path,hash]=href.split('#');window.parent.postMessage({type:'mw-nav',path:path||'/',hash:hash?'#'+hash:''},'*')});window.addEventListener('load',()=>{if(window.__MW_HASH){requestAnimationFrame(()=>document.getElementById(window.__MW_HASH.slice(1))?.scrollIntoView())}});"""
routes={'/':pub/'index.html'}
for file in sorted(pub.rglob('index.html')):
 if file!=pub/'index.html':routes['/'+file.parent.relative_to(pub).as_posix()+'/']=file
strengthjs=(pub/'ranks.js').read_text()+'\n'+(pub/'strength.js').read_text()
strengthjs=re.sub(r'^import .*?;\n','',strengthjs,flags=re.M).replace('export const ','const ').replace('export function ','function ')
strengthjs=strengthjs.replace('${rank.icon}', '${window.__MW_RANK_ASSETS?.[rank.id]||rank.icon}')
# Bundle isolated pure modules to avoid identifier collisions in a network-free file.
def strip_exports(text):
 text=re.sub(r'^import .*?;\n','',text,flags=re.M)
 text=re.sub(r'^export \{[^}]*\}[^\n]*;\n','',text,flags=re.M)
 return text.replace('export const ','const ').replace('export function ','function ').replace('export class ','class ')
labjs='const ToolMath=(()=>{'+strip_exports((pub/'tool-math.js').read_text())+';return {oneRepMax,KG_PER_LB,PLATES};})();\n'
labjs+='const LabMath=(()=>{const {oneRepMax,KG_PER_LB,PLATES}=ToolMath;'+strip_exports((pub/'lab-math.js').read_text())+';return {estimateMax,trainingLoads,smartPlates,convertWeight,defaultInventory,warmupPlan,WARM_PRESET};})();\n'
labjs+='const {estimateMax,trainingLoads,smartPlates,convertWeight,defaultInventory,warmupPlan,WARM_PRESET}=LabMath;\n'
labjs+=strip_exports((pub/'lab-copy.js').read_text())+'\n'+strip_exports((pub/'lab.js').read_text())
websitejs=strip_exports((pub/'website-copy.js').read_text().split('export const homeMessages=')[0])+'\n'+strip_exports((pub/'website.js').read_text())
pages={}
for path,file in routes.items():
 doc=file.read_text()
 doc=re.sub(r'<link rel="stylesheet"[^>]*>','',doc)
 doc=re.sub(r'<link rel="manifest"[^>]*>','',doc)
 doc=re.sub(r'<script src="[^"]+" type="module"></script>','',doc)
 doc=re.sub(r'(src|href)="(/assets/[^\"]+)"',embed,doc)
 js=rootjs if path=='/' else sitejs
 extra=('<script type="module">'+toolsjs.replace('</script','<\\/script')+'</script>') if 'data-tool="' in doc else ''
 if path.startswith('/exercises/'):
  extra+='<script type="module">'+(pub/'library.js').read_text().replace('</script','<\\/script')+'</script>'
 if 'class="strength-page"' in doc:
  extra+='<script type="module">'+strengthjs.replace('</script','<\\/script')+'</script>'
 if 'class="dashboard-page"' in doc:
  extra+='<script type="module">'+(pub/'dashboard.js').read_text().replace('</script','<\\/script')+'</script>'
 if 'data-lab-tool="' in doc and 'id="lab-form"' in doc:
  extra+='<script type="module">'+labjs.replace('</script','<\\/script')+'</script>'
 extra+='<script type="module">'+websitejs.replace('</script','<\\/script')+'</script>'
 doc=doc.replace('</head>','<!--MW_SHARED_STYLE--></head>')
 doc=doc.replace('</body>','<script type="module">'+js.replace('</script','<\\/script')+'</script>'+extra+'<script>'+nav+'</script></body>')
 pages[path]=doc
safe=lambda value:json.dumps(value,ensure_ascii=False).replace('<','\\u003c')
wrapper='''<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>MONTE WO Strength Index</title><style>html,body{margin:0;width:100%;height:100%;overflow:hidden;background:#090c13}iframe{display:block;width:100%;height:100%;border:0}</style></head><body><iframe id="website" title="Monte Wo exercise library" sandbox="allow-scripts allow-popups"></iframe><script>'''
wrapper+='const pages='+safe(pages)+';const sharedCSS='+safe(css)+';const rankAssets='+safe(rank_assets)+';const embeddedAssets='+safe(embedded_assets)+';'
wrapper+='''const frame=document.getElementById('website');function render(path,hash=''){if(!pages[path])return;const setup='<style>'+sharedCSS+'</style><script>window.__MW_PORTABLE=true;window.__MW_HASH='+JSON.stringify(hash).replaceAll('<','\\\\u003c')+';window.__MW_RANK_ASSETS='+JSON.stringify(rankAssets)+';<\\/script>';let content=pages[path].replace('<!--MW_SHARED_STYLE-->',setup);for(const [token,data] of Object.entries(embeddedAssets))content=content.replaceAll(token,data);frame.srcdoc=content;}window.addEventListener('message',event=>{if(event.source!==frame.contentWindow||event.data?.type!=='mw-nav')return;render(event.data.path,event.data.hash||'')});render('/strength/');</script></body></html>'''
if lab_mode:wrapper=wrapper.replace('MONTE WO Strength Index','MONTE WO Strength Lab').replace('title="Monte Wo exercise library"','title="MONTE WO Strength Lab"').replace("render('/strength/');","render('/strength-lab/');")
if website_mode:wrapper=wrapper.replace('MONTE WO Strength Index','MONTE WO Website').replace('title="Monte Wo exercise library"','title="MONTE WO public website"').replace("render('/strength/');","render('/');")
(root.parent/(basename+'.html')).write_text(wrapper)
with zipfile.ZipFile(root.parent/(basename+'-Cloudflare.zip'),'w',zipfile.ZIP_DEFLATED) as z:
 for p in root.rglob('*'):
  if p.is_file() and not any(x in ['node_modules','.wrangler','.git','test-results','__pycache__'] for x in p.relative_to(root).parts) and not p.name.startswith(('.dev.vars','.env')):
   z.write(p,'monte-wo/'+str(p.relative_to(root)))
print('Exported '+basename+'.html and '+basename+'-Cloudflare.zip')
