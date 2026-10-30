"""Build a static, searchable library from reviewed catalog metadata; no invented media."""
from pathlib import Path
import json,html,re
from build_pages import header,footer
from poster_assets import publish_posters
from exercise_video_template import loop_block
posters={p["exerciseId"]:p for p in publish_posters().values() if p["exerciseId"]}
ROOT=Path(__file__).resolve().parent.parent
PUB=ROOT/'public'
esc=lambda s:html.escape(str(s),quote=True)
data=json.loads((ROOT/'content/exercises.json').read_text())
groups=data['groups']; items=data['exercises']; groupmap={g['id']:g for g in groups}
ids=set()
for x in items:
 assert re.fullmatch(r'[a-z0-9]+(?:-[a-z0-9]+)*',x['id']) and x['id'] not in ids,'Invalid or duplicate exercise id'
 ids.add(x['id']); assert x['group'] in groupmap and len(x['steps'])>=2
 for field in ['name','equipment','movement','cue','safety','easier','sourcePackage']:assert isinstance(x[field],str) and x[field].strip(),field
 if x['media']:
  m=x['media'];assert m['type'] in ['image','video'] and m.get('reviewed') is True and m.get('source'), 'Media requires source and review'
  assert re.fullmatch(r'/assets/exercises/[a-zA-Z0-9/_-]+\.(gif|webp|png|mp4)',m['src']) and '..' not in m['src']
  assert (m['type']=='video')==m['src'].endswith('.mp4'), 'Media type and file extension must match'
  assert (PUB/m['src'].lstrip('/')).is_file(), 'Missing supplied media'

def icon(equipment):
 paths={
 'Barbell':'M16 40h88M24 22v36M34 16v48M86 16v48M96 22v36',
 'Dumbbell':'M38 40h44M24 27v26M36 22v36M84 22v36M96 27v26',
 'Bodyweight':'M60 27v22M39 35l21 5 21-5M60 49 44 66M60 49l16 17',
 'Cable':'M29 65V15h62v50M29 22h49v13M65 39l13-4 13 4M43 40h14v25H43z',
 'Machine':'M34 55a12 12 0 1 0 0 .1M86 55a12 12 0 1 0 0 .1M34 55l21-23 17 23H34M55 32h16M72 55l9-32h12',
 'No equipment':'M60 27 48 41 64 47 53 66M59 29l17 14M62 47l18 17'}
 circle='<circle cx="60" cy="15" r="7"/>' if equipment in ['Bodyweight','No equipment'] else ''
 return f'<svg viewBox="0 0 120 80" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">{circle}<path d="{paths.get(equipment,paths["Barbell"])}"/></svg>'

def card(x):
 m=x['media']; ready=bool(m); poster=posters.get(x['id']) if not ready else None
 search=' '.join([x['name'],x['equipment'],x['movement'],groupmap[x['group']]['name'],*x['muscles'],*x['secondary'],*x['aliases']])
 picture=(f'<img class="workout-poster-img" src="{poster["src"]}" alt="{esc(x["name"])} — MONTE WO workout poster" width="400" height="500" loading="lazy" decoding="async">' if poster else f'<img src="{esc(m["src"])}" alt="{esc(x["name"])} demonstration" loading="lazy">' if ready and m['type']=='image' else icon(x['equipment']))
 return f'''<a class="exercise-entry" href="/exercises/{x['id']}/" data-exercise data-name="{esc(x['name'])}" data-search="{esc(search)}" data-group="{x['group']}" data-equipment="{esc(x['equipment'])}" data-media="{'ready' if ready else 'pending'}"><div class="entry-art{' has-workout-poster' if poster else ''}">{picture}<span class="equipment-chip">{esc(x['equipment'])}</span><span class="entry-art-label">{'WORKOUT POSTER' if poster else 'SUPPLIED DEMONSTRATION' if ready and m['type']=='image' else 'EQUIPMENT SYMBOL · NOT A FORM DEMO'}</span></div><div class="entry-copy"><span class="entry-group">{groupmap[x['group']]['name']} <span>↗</span></span><h3>{esc(x['name'])}</h3><p>{esc(' · '.join(x['muscles']))}</p><div class="entry-status"><i class="{'media-ready' if ready else ''}"></i>{'Demonstration available' if ready else 'Written guide · workout poster' if poster else 'Written guide · animation coming'}</div></div></a>'''

def cta():return '''<section class="library-app"><div><span class="eyebrow">THIS IS JUST THE WARM-UP.</span><h2>More movements.<br>More ways to <em>Monte Wo.</em></h2><p>More exercises, workout routines and offline training guides are planned for the Monte Wo app. Start with the website library while we build what’s next.</p><span class="app-honesty">APP COMING SOON · NO RELEASE DATE ANNOUNCED</span></div><div><a class="button" href="/waitlist/">Get launch updates ↗</a><a class="text-link" href="/app/">See what’s coming ↗</a></div></section>'''

routes=[]
def save(route,title,body,filterable=False):
 path=PUB/route;path.mkdir(parents=True,exist_ok=True);routes.append('/'+route+'/')
 doc=f'''<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="theme-color" content="#090c13"><title>{esc(title)} | Monte Wo</title><meta name="description" content="{esc(title)}. Browse muscle groups, equipment and written movement guides from Monte Wo. More workouts coming in the app."><link rel="icon" href="/assets/icon-32.png"><link rel="manifest" href="/manifest.json"><link rel="stylesheet" href="/fonts.css"><link rel="stylesheet" href="/style.css"><link rel="stylesheet" href="/launch.css"><link rel="stylesheet" href="/library.css"><script src="/site.js" type="module"></script><script src="/library.js" type="module"></script><script src="/exercise-video.js" type="module"></script></head><body class="library-page" {'data-library' if filterable else ''}>{header}<main id="main" class="wrap">{body}</main>{footer}</body></html>'''
 (path/'index.html').write_text(doc)

def browse(group=None):
 subset=[x for x in items if not group or x['group']==group['id']]
 title=group['name']+' exercises' if group else 'Exercise library'
 desc=group['description'] if group else 'Find your movement. Understand the muscles. Build your next session on stronger foundations.'
 crumb='<a href="/exercises/">← Exercise library</a>' if group else '<a href="/">MONTE WO</a><span>/</span>THE MOVEMENT LIBRARY'
 hero=f'''<section class="library-hero"><div class="library-breadcrumb">{crumb}</div><div class="library-hero-row"><div><span class="eyebrow">LEARN THE MOVEMENT. OWN THE REP.</span><h1>{title}<span>.</span></h1><p>{esc(desc)}</p></div><div class="library-count"><strong>{len(subset):02}</strong><div>EXERCISE GUIDES<span>Available on the website</span></div></div></div><div class="library-trust"><span>✓ Free to explore</span><span>✓ No account needed</span><span>◷ Animations being added</span></div></section>'''
 cats=''
 if not group:
  cats='<section class="muscle-section"><div class="library-heading"><h2>Browse by muscle group</h2><span>07 GROUPS / ONE STRONGER YOU</span></div><div class="muscle-grid">'
  for g in groups:
   count=sum(x['group']==g['id'] for x in items)
   cats+=f'''<a class="muscle-card" href="/exercises/muscle/{g['id']}/"><span class="muscle-number">{g['number']}</span><h3>{g['name']}</h3><p>{g['description']}</p><span class="muscle-count">{count} guides on the website <b>↗</b></span></a>'''
  cats+='</div></section>'
 options=''.join(f'<option value="{g["id"]}" {"selected" if group and group["id"]==g["id"] else ""}>{g["name"]}</option>' for g in groups)
 equipments=sorted(set(x['equipment'] for x in subset))
 groupfield=f'<label>Muscle group<select id="filter-group"><option value="">All groups</option>{options}</select></label>' if not group else f'<input type="hidden" id="filter-group" value="{group["id"]}">'
 controls=f'''<section class="library-browser" aria-labelledby="browse-title"><div class="library-heading"><div><span class="eyebrow">YOUR NEXT MOVEMENT</span><h2 id="browse-title">{'Explore '+group['name'].lower() if group else 'Explore the library'}</h2></div><span id="library-results" role="status" aria-live="polite">{len(subset)} exercises</span></div><div class="library-filters" hidden><label class="library-search">Search exercises<input id="exercise-search" type="search" placeholder="Name, muscle or movement…" autocomplete="off"></label>{groupfield}<label>Equipment<select id="filter-equipment"><option value="">All equipment</option>{''.join(f'<option>{esc(e)}</option>' for e in equipments)}</select></label><label>Guide type<select id="filter-media"><option value="">All guides</option><option value="ready">With demonstration</option><option value="pending">Written guide only</option></select></label><label>Sort<select id="library-sort"><option value="az">Name: A–Z</option><option value="za">Name: Z–A</option></select></label><button type="button" id="library-reset">Reset filters ↺</button></div><noscript><p>All guides are shown below. Enable JavaScript to search and filter.</p></noscript><div id="exercise-results" class="library-grid">{''.join(card(x) for x in sorted(subset,key=lambda x:x['name']))}</div><div id="library-empty" class="library-empty" hidden><span>⌕</span><h3>No matching exercises yet.</h3><p>Try another name or clear your filters. This library will grow as new exercise packages are added.</p><button class="button button-quiet" type="button" data-reset-filters>Clear filters</button></div><p class="library-disclaimer">Written guides are general educational starting points, not individualized coaching. Choose manageable effort and stop for pain. Equipment symbols are not demonstrations of exercise form.</p></section>'''
 save('exercises'+('/muscle/'+group['id'] if group else ''),title,hero+cats+controls+cta(),True)

browse()
for g in groups:browse(g)
for x in items:
 g=groupmap[x['group']];m=x['media']
 if m:
  media=f'<img src="{esc(m["src"])}" alt="{esc(x["name"])} demonstration">' if m['type']=='image' else f'<video src="{esc(m["src"])}" controls playsinline preload="metadata" aria-label="{esc(x["name"])} demonstration"></video>'
  media='<div class="guide-media">'+media+'</div>'
 else:media=loop_block(x['id'])
 related=[i for i in items if i['group']==x['group'] and i['id']!=x['id']][:3]
 body=f'''<section class="guide-hero"><div class="library-breadcrumb"><a href="/exercises/">Library</a><span>/</span><a href="/exercises/muscle/{g['id']}/">{g['name']}</a></div><span class="eyebrow">{esc(x['equipment'])} / {esc(x['movement'])}</span><h1>{esc(x['name'])}<span>.</span></h1><p>{esc(' · '.join(x['muscles']))} <span class="guide-type">WRITTEN STARTER GUIDE</span></p></section><div class="guide-layout"><div>{media}<section class="guide-steps"><span class="eyebrow">MOVE WITH INTENTION</span><h2>How to approach it</h2><ol>{''.join('<li>'+esc(s)+'</li>' for s in x['steps'])}</ol><div class="guide-cue"><span>KEEP IN MIND</span><p>{esc(x['cue'])}</p></div></section></div><aside class="guide-aside"><section><h2>At a glance</h2><dl><dt>Primary muscles</dt><dd>{esc(', '.join(x['muscles']))}</dd><dt>Also involved</dt><dd>{esc(', '.join(x['secondary']) or 'Varies with technique and effort')}</dd><dt>Equipment</dt><dd>{esc(x['equipment'])}</dd><dt>Movement</dt><dd>{esc(x['movement'])}</dd></dl></section><section><span class="eyebrow">START WHERE YOU ARE</span><h2>Make it more manageable</h2><p>{esc(x['easier'])}</p></section><section class="guide-safety"><h2>Train with care</h2><p>{esc(x['safety'])}</p><small>General education, not a personalized workout or a substitute for a qualified coach. Stop if a movement causes pain.</small></section></aside></div><section class="related-guides"><div class="library-heading"><h2>Keep exploring</h2><a class="text-link" href="/exercises/muscle/{g['id']}/">All {g['name'].lower()} guides ↗</a></div><div class="library-grid">{''.join(card(i) for i in related)}</div></section>{cta()}'''
 save('exercises/'+x['id'],x['name'],body)
(PUB/'library-routes.json').write_text(json.dumps(routes,indent=2)+'\n')
print(f'Built library: {len(groups)} muscle groups, {len(items)} exercise guides, {sum(bool(x["media"]) for x in items)} supplied demonstrations.')

sw=PUB/'sw.js'
sw.write_text(re.sub(r'const LIBRARY_ASSETS=.*?;', 'const LIBRARY_ASSETS='+json.dumps(['/library.css','/library.js','/library-routes.json',*routes])+';', sw.read_text()))
