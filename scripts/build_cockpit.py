"""Build only the Exercises cockpit. No source JS evaluation, network, SQL or uploads."""
from pathlib import Path
import json,html,hashlib,re,shutil
ROOT=Path(__file__).resolve().parents[1];P=ROOT/'public'
def esc(v):return html.escape(str(v),quote=True)
def build():
 for name in ['workouts.js','workout-transfer.js']:(P/name).write_bytes((ROOT/'shared'/name).read_bytes())
 canon_ex=json.loads((ROOT/'content/exercises.json').read_text())
 (ROOT/'shared/exercises-catalog.js').write_text('// GENERATED from content/exercises.json — do not edit by hand.\nexport default '+json.dumps(canon_ex,separators=(',',':'))+';\n')
 data=json.loads((P/'cockpit-catalog.json').read_text())
 assert hashlib.sha256((P/'cockpit-library.js').read_bytes()).hexdigest()==data['libraryModuleSha256'], 'Regenerate the shared filter module; do not hand-edit it.'
 for name,sha in data['inputs'].items():
  assert hashlib.sha256((ROOT/name).read_bytes()).hexdigest()==sha, 'Shared source changed; run node scripts/export_cockpit_data.cjs after mobile npm ci: '+name
 for e in data['catalog']['exercises']:
  if e.get('preview'):
   assert re.fullmatch(r'[a-z0-9-]+',e['id'])
   dest=P/'assets/workout-preview'/(e['id']+'.jpg');dest.parent.mkdir(parents=True,exist_ok=True)
   shutil.copyfile(ROOT/'apps/mobile/assets/workout-posters'/(e['id']+'.jpg'),dest)
 catalog=data['catalog'];model=json.loads((ROOT/'apps/mobile/src/generated/premium-muscle-map.json').read_text());base_foods=json.loads((ROOT/'content/nutrition/foods.json').read_text())
 assert base_foods['targets'] is None and len(base_foods['foods'])==3
 foods=json.loads((ROOT/'content/nutrition/cockpit-world-foods.json').read_text())
 names={r['id']:r['name'] for r in json.loads((P/'ranks.json').read_text())}
 def shape(node):
  assert node['tag'] in ['defs','clipPath','ellipse','linearGradient','stop','g','path','rect','circle']
  if node['attrs'].get('data-v')=='b':node['attrs']['class']=(node['attrs'].get('class','')+' is-hidden').strip()
  attrs=' '.join(esc(k)+'="'+esc(v)+'"' for k,v in node['attrs'].items())
  return '<'+node['tag']+' '+attrs+'>'+''.join(shape(x) for x in node['children'])+'</'+node['tag']+'>'
 avatar='<svg class="avatar" id="avatar" viewBox="0 0 420 640" aria-label="Interactive front and back muscle map">'+''.join(shape(n) for n in model['background'])
 for r in model['regions']:
  for view,paths in r['paths'].items():
   visibility='hidden' if view=='b' else ''
   avatar+=f'<g class="muscle" data-muscle="{r["id"]}" data-v="{view}" {visibility} role="button" tabindex="-1" aria-disabled="true" aria-pressed="false" aria-label="Filter {r["name"]}, example tier {names[r["tierId"]]}" style="--tier:{r["color"]}">'+''.join('<path d="'+esc(d)+'"/>' for d in paths)+'</g>'
 avatar+='</svg>'
 def card(r):
  visibility='hidden' if 'f' not in r['paths'] else ''
  return f'<button class="region-card" data-region="{r["id"]}" {visibility} style="--tier:{r["color"]}" aria-pressed="false" data-requires-js disabled><span class="name"><svg viewBox="0 0 28 28" aria-hidden="true">'+''.join('<path d="'+esc(d)+'"/>' for d in r['iconPaths'])+f'</svg>{r["name"]}</span><span class="tier"><img src="/assets/ranks/{r["tierId"]}.webp" alt="" width="21" height="21">{names[r["tierId"]]}</span><small>EXAMPLE TIER · NOT AWARDED</small></button>'
 cards=''
 for e in sorted(catalog['exercises'],key=lambda e:e['name'].lower()):
  art=f'<img src="{e["preview"]["poster"]}" alt="" width="240" height="192" loading="lazy" decoding="async">' if e.get('preview') else '<span class="guide-symbol" aria-hidden="true">↗</span>'
  status='Source preview' if e.get('pack') else 'Written guide'
  cards+=f'<button class="exercise-card" data-exercise="{esc(e["id"])}" data-requires-js disabled aria-label="Open {esc(e["name"])}"><div class="exercise-art">{art}<span>{status.upper()}</span></div><div class="exercise-copy"><small>{esc(e["group"])}</small><h3>{esc(e["name"])}</h3><p>{esc(e["equipment"])}</p><div class="card-bottom"><span>{"Preview + guide" if e.get("pack") and e["steps"] else status}</span><b aria-hidden="true">↗</b></div></div></button>'
 macros=''
 for key,label,unit,color in [('calories','Calories','kcal','#f3b05c'),('protein','Protein','g','#43c9ef'),('carbs','Carbs','g','#9c81ed'),('fats','Fats','g','#42c8ad')]:
  macros+=f'<article class="macro-card" data-macro="{key}" style="--macro:{color}"><div class="macro-copy"><h3>{label}</h3><strong class="macro-value"><span>—</span> <small>{unit}</small></strong><p>Verified values only</p></div><div class="ring" data-state="unavailable" role="img" aria-label="{label}: unavailable"><svg viewBox="0 0 44 44" aria-hidden="true"><circle cx="22" cy="22" r="18" pathLength="100"/><circle cx="22" cy="22" r="18" pathLength="100"/></svg><span>—</span></div></article>'
 replacements={'LEFT_CARDS':''.join(card(r) for r in model['regions'] if r['side']=='l'),'RIGHT_CARDS':''.join(card(r) for r in model['regions'] if r['side']=='r'),'AVATAR':avatar,'RANKS':''.join(f'<div class="milestone"><img src="/assets/ranks/{id}.webp" alt="" width="30" height="30">{name}</div>' for id,name in names.items()),'FOOD_PILLS':''.join(f'<button data-food="{esc(f["id"])}" aria-pressed="false" data-requires-js disabled>{esc(f["name"])}</button>' for f in foods['foods']),'MACROS':macros,'GROUPS':''.join(f'<button data-group="{esc(g["id"])}" aria-pressed="false" data-requires-js disabled>{esc(g["name"])}</button>' for g in catalog['groups']),'EXERCISES':cards}
 doc=(ROOT/'content/website/cockpit.html').read_text()
 for key,value in replacements.items():doc=doc.replace('<!--'+key+'-->',value)
 (P/'exercises/index.html').write_text(doc)
 (P/'cockpit-map.json').write_text(json.dumps(model,ensure_ascii=False,separators=(',',':'))+'\n')
 (P/'cockpit-nutrition.json').write_text(json.dumps(foods,ensure_ascii=False,indent=2)+'\n')
 sw=P/'sw.js';text=sw.read_text();assets=['/account-client.js','/account-workouts.js','/workouts.js','/workout-transfer.js','/site-connections.js','/service-readiness.js','/phone-cockpit.css','/cockpit-tools.js','/cockpit-session.js','/exercise-video.js','/cockpit.js','/cockpit.css','/cockpit-library.js','/cockpit-nutrition.js','/cockpit-catalog.json','/cockpit-map.json','/cockpit-nutrition.json']+[e['preview']['poster'] for e in catalog['exercises'] if e.get('preview')]
 text=re.sub(r"const CORE='[^']+';","const CORE='montewo-core-v18-account-workouts';",text)
 declaration='const COCKPIT_ASSETS='+json.dumps(assets)+';'
 if 'const COCKPIT_ASSETS=' in text:text=re.sub(r'const COCKPIT_ASSETS=.*?;',lambda _:declaration,text)
 else:text=text.replace('const ASSETS=[',declaration+'\nconst ASSETS=[...COCKPIT_ASSETS,')
 sw.write_text(text)
 print('Exercises cockpit built: 62 entries; source SVG; no fabricated nutrition values.')
if __name__=='__main__':build()
