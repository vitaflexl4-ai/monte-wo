"""Shared MONTE WO actual-app phone showcase + concept quick-tester. No remote fetch or ranking logic."""
from pathlib import Path
import html,json,re
ROOT=Path(__file__).resolve().parents[1]
P=ROOT/'public'
def esc(value): return html.escape(str(value),quote=True)

def actual_app_screens():
 tabbar='''<div class="real-app-tabs" aria-hidden="true">
  <span class="is-on"><b>⌂</b>Home</span>
  <span><b>⚡</b>Workout</span>
  <span><b>◈</b>Rank</span>
  <span><b>◌</b>Nutrition</span>
  <span><b>⊞</b>Explore</span>
 </div>'''
 home_shot=f'''<div class="real-app-shot">
  <div class="real-app-top">
   <div class="real-app-logo"><img src="/assets/monte-wo-emblem.webp" alt="" width="34" height="18"><div><strong>MONTE <em>WO</em></strong><small>LEVE · KLASE · MONTE WO</small></div></div>
   <span class="real-app-pill">v2 OBSIDIAN</span>
  </div>
  <div class="real-app-hero-card">
   <span class="real-kicker">COMMAND CENTER · HAITIAN PRIDE</span>
   <h3>Every lift.<br><em>Built to climb.</em></h3>
   <div class="real-power-grid">
    <span>⚡ AI Workout</span>
    <span>◈ Muscle Cam</span>
    <span>▤ Barcode Scan</span>
    <span>✦ Meal Plan AI</span>
   </div>
  </div>
  <div class="real-section-row"><span>4 RANKED DISCIPLINES</span><small>INDEPENDENT</small></div>
  <div class="real-disc-grid">
   <div class="real-disc"><img src="/assets/workout-preview/back-squat.jpg" alt="Barbell Back Squat" width="160" height="100" loading="lazy"><div><b>Squat</b><small>Proposed v0.1</small></div></div>
   <div class="real-disc"><img src="/assets/workout-preview/bench-press.jpg" alt="Barbell Bench Press" width="160" height="100" loading="lazy"><div><b>Bench Press</b><small>Proposed v0.1</small></div></div>
   <div class="real-disc"><img src="/assets/workout-preview/deadlift.jpg" alt="Barbell Deadlift" width="160" height="100" loading="lazy"><div><b>Deadlift</b><small>Proposed v0.1</small></div></div>
   <div class="real-disc"><img src="/assets/workout-preview/barbell-curl.jpg" alt="Strict Barbell Curl" width="160" height="100" loading="lazy"><div><b>Strict Curl</b><small>Proposed v0.1</small></div></div>
  </div>
  <div class="real-crest-strip">
   <img src="/assets/ranks/solid.webp" alt="Solid crest" width="28" height="28">
   <img src="/assets/ranks/chanpyon.webp" alt="Chanpyon crest" width="32" height="32">
   <img src="/assets/ranks/lejand.webp" alt="Lejand crest" width="28" height="28">
   <span>9 Haitian Ranks · Debitan → Lejand</span>
  </div>
  {tabbar}
 </div>'''
 rank_shot=f'''<div class="real-app-shot">
  <div class="real-app-top">
   <div class="real-app-logo"><img src="/assets/monte-wo-emblem.webp" alt="" width="34" height="18"><div><strong>RANK &amp; <em>AI LENS</em></strong><small>HALL OF PRIDE · 9:16 STUDIO</small></div></div>
   <span class="real-app-pill real-gold">CHANPYON</span>
  </div>
  <div class="real-dual-stage">
   <div class="real-stage-card"><small>YOU NOW</small><img src="/assets/ranks/solid.webp" alt="Solid rank" width="36" height="36"><b>SOLID</b><span>Self-reported log</span></div>
   <div class="real-stage-card is-next"><small>POSSIBLE NEXT RANK</small><img src="/assets/ranks/chanpyon.webp" alt="Chanpyon rank" width="36" height="36"><b>CHANPYON</b><span>⚡ EVOLVE PREVIEW</span></div>
  </div>
  <div class="real-cam-card">
   <div class="real-cam-hud"><b>MONTE WO AI GAINS DETECTOR — SHADOW RECONSTRUCTION ACTIVE</b><span>CONTRAST · SHADOW · EDGE SHADER</span></div>
   <div class="real-cam-reticle"><i></i></div>
   <div class="real-cam-shutter"><span></span></div>
  </div>
  <div class="real-story-bento">
   <div><small>CAMERA ROLL</small><b>Save to Gallery</b></div>
   <div class="is-story"><small>9:16 IG &amp; TIKTOK</small><b>Share to Story · LEVEL UP</b></div>
  </div>
  {tabbar.replace('class="is-on"><b>⌂</b>Home','><b>⌂</b>Home').replace('><b>◈</b>Rank',' class="is-on"><b>◈</b>Rank')}
 </div>'''
 nutrition_shot=f'''<div class="real-app-shot">
  <div class="real-app-top">
   <div class="real-app-logo"><img src="/assets/monte-wo-emblem.webp" alt="" width="34" height="18"><div><strong>WORLD <em>FUEL</em></strong><small>HAITIAN &amp; GLOBAL MACROS</small></div></div>
   <span class="real-app-pill">3,000 KCAL</span>
  </div>
  <div class="real-rings-grid">
   <div><b>3,000</b><small>KCAL TARGET</small></div>
   <div><b>225g</b><small>PROTEIN</small></div>
   <div><b>340g</b><small>CARBS</small></div>
   <div><b>82g</b><small>FATS</small></div>
  </div>
  <div class="real-food-list">
   <div><b>Griot (Fried Pork)</b><span>430 kcal · 31g P</span></div>
   <div><b>Diri ak Djon Djon</b><span>290 kcal · 52g C</span></div>
   <div><b>Soup Joumou</b><span>420 kcal · 28g P</span></div>
   <div><b>Poul ak Nwa</b><span>495 kcal · 39g P</span></div>
  </div>
  <div class="real-scan-banner">
   <b>MONTE WO GLOBAL MULTIMODAL SCANNER</b>
   <span>Live Food Camera · EAN/UPC Barcode · Meal Plan AI</span>
  </div>
  {tabbar.replace('class="is-on"><b>⌂</b>Home','><b>⌂</b>Home').replace('><b>◌</b>Nutrition',' class="is-on"><b>◌</b>Nutrition')}
 </div>'''
 return f'''<div class="phone-shot-bar" role="group" aria-label="Actual MONTE WO app views">
  <button type="button" data-app-shot-btn="live" aria-pressed="true">● Live App</button>
  <button type="button" data-app-shot-btn="home" aria-pressed="false">Home</button>
  <button type="button" data-app-shot-btn="rank" aria-pressed="false">Rank &amp; AI Cam</button>
  <button type="button" data-app-shot-btn="nutrition" aria-pressed="false">Nutrition</button>
 </div>
 <div class="phone-oled-viewport">
  <div class="phone-shot-pane phone-live-pane" data-app-shot-pane="live">
   <div class="phone-live-backdrop" aria-hidden="true">{home_shot}</div>
   <iframe src="/mobile/" class="phone-live-iframe" title="Live MONTE WO 5-Tab Mobile App" allow="camera" loading="eager"></iframe>
  </div>
  <div class="phone-shot-pane" data-app-shot-pane="home" hidden>{home_shot}</div>
  <div class="phone-shot-pane" data-app-shot-pane="rank" hidden>{rank_shot}</div>
  <div class="phone-shot-pane" data-app-shot-pane="nutrition" hidden>{nutrition_shot}</div>
 </div>
 <div class="phone-launch-bar">
  <a href="/mobile/" class="phone-open-full">Open Full-Screen 5-Tab App ↗</a>
 </div>'''

def phone_markup():
 model=json.loads((P/'cockpit-map.json').read_text())
 def shape(node):
  attrs=dict(node['attrs'])
  if 'id' in attrs:attrs['id']='phone-'+attrs['id']
  for key,value in list(attrs.items()):
   attrs[key]=str(value).replace('url(#','url(#phone-')
  if attrs.get('data-v'):attrs['data-phone-view']=attrs.pop('data-v')
  return '<'+node['tag']+' '+ ' '.join(f'{esc(k)}="{esc(v)}"' for k,v in attrs.items())+'>'+''.join(shape(c) for c in node['children'])+'</'+node['tag']+'>'
 svg='<svg class="phone-avatar" viewBox="0 0 420 640" role="group" aria-label="Haitian muscle map; illustrative tiers">'+''.join(shape(n) for n in model['background'])
 buttons=''
 for r in model['regions']:
  tier=model['ranks'][r['tierId']]['label']
  for view,paths in r['paths'].items():
   svg+=f'<g data-phone-region="{r["id"]}" data-phone-view="{view}" role="button" tabindex="0" aria-pressed="false" aria-label="{r["name"]}: {tier}, example only" style="--region-color:{r["color"]}"><path d="'+'\"/><path d=\"'.join(esc(d) for d in paths)+'"/></g>'
  buttons+=f'<button type="button" data-phone-region-button="{r["id"]}" aria-pressed="false" style="--region-color:{r["color"]}"><span data-phone-text="{r["id"]}">{r["name"]}</span><b>{tier}</b></button>'
 svg+='</svg>'
 fields=''
 for key,name in [('squat','Squat'),('bench','Bench Press'),('deadlift','Deadlift')]:
  fields+=f'''<div class="phone-lift"><label for="phone-{key}"><span data-phone-text="{key}">{name}</span><small>LB</small></label><input id="phone-{key}" data-phone-load="{key}" type="number" inputmode="decimal" min="0" max="3000" step="0.01" placeholder="0" autocomplete="off" aria-describedby="phone-rank-policy"><div class="phone-rank" data-phone-rank="{key}" hidden><img src="/assets/ranks/chanpyon.webp" width="42" height="48" alt=""><div><small data-phone-text="example">EXAMPLE ONLY · NOT AWARDED</small><strong><span data-phone-text="rank">Rank:</span> CHANPYON</strong></div></div></div>'''
 rows=''
 for i,(key,name,weight,reps) in enumerate([('squat','Squat',185,5),('bench','Bench Press',135,8),('deadlift','Deadlift',225,3),('squat','Squat',175,6),('bench','Bench Press',125,10),('deadlift','Deadlift',205,5),('squat','Squat',165,8),('bench','Bench Press',115,12),('deadlift','Deadlift',185,6)]):
  rows+=f'<tr><th scope="row"><small>DEMO {i//3+1:02d}</small><span data-phone-text="{key}">{name}</span></th><td>{weight}<small>lb</small></td><td>{reps}</td><td>{weight*reps}</td></tr>'
 return f'''<div class="phone-widget-stage" id="app-preview" data-phone-cockpit>
 <div class="phone-widget-halo" aria-hidden="true"></div>
 <section class="phone-widget" aria-label="Actual MONTE WO app preview" lang="en">
 <div class="phone-hardware" aria-hidden="true"><span>9:41</span><i></i><span>5G ▰</span></div>
 {actual_app_screens()}
 <details class="phone-concept-drawer">
  <summary>Quick lift &amp; muscle-map concept sandbox</summary>
  <header class="phone-brand"><span>MONTE <b>WO.</b></span><small data-phone-text="simulation">LIVE SIMULATION</small></header>
  <div class="phone-tabs" role="tablist" aria-label="App preview screens">
  <button type="button" role="tab" id="phone-tab-strength" aria-controls="phone-panel-strength" aria-selected="true" tabindex="0" data-phone-tab="strength" data-phone-text="strength">Strength Index</button>
  <button type="button" role="tab" id="phone-tab-history" aria-controls="phone-panel-history" aria-selected="false" tabindex="-1" data-phone-tab="history" data-phone-text="history">Training History</button>
  <button type="button" role="tab" id="phone-tab-map" aria-controls="phone-panel-map" aria-selected="false" tabindex="-1" data-phone-tab="map" data-phone-text="map">Haitian Muscle Map</button></div>
  <div class="phone-screen-stack">
  <section class="phone-screen" id="phone-panel-strength" role="tabpanel" aria-labelledby="phone-tab-strength" tabindex="0">
  <span class="phone-kicker" data-phone-text="strengthKicker">01 / EXPLORE YOUR STRENGTH</span><h2 data-phone-text="strengthTitle">Put the work in.</h2><p data-phone-text="strengthIntro">Change a load. Preview the badge response.</p>
  <p class="phone-policy" id="phone-rank-policy" data-phone-text="rankPolicy">Fixed example badge—not calculated from your load. No qualification thresholds or official rank awards.</p>{fields}
  <a class="phone-destination" href="/strength/" data-phone-text="openStrength">Open the real Strength Index ↗</a>
  <button type="button" class="phone-reset" data-phone-reset data-phone-text="reset">Reset preview</button>
  </section>
  <section class="phone-screen" id="phone-panel-history" role="tabpanel" aria-labelledby="phone-tab-history" tabindex="0" hidden>
  <span class="phone-kicker" data-phone-text="historyKicker">02 / DEMO RECORDS ONLY</span><h2 data-phone-text="historyTitle">Every set. In view.</h2><p data-phone-text="historyIntro">Illustrative sessions—not your workout history.</p>
  <a class="phone-destination" href="/exercises/#training-tools" data-phone-text="openLogger">Open session logger · not synced ↗</a>
  <div class="phone-history-summary"><div><b>03</b><span data-phone-text="demoSessions">Mock sessions</span></div><div><b>09</b><span data-phone-text="demoSets">Example sets</span></div></div>
  <table class="phone-history"><caption data-phone-text="historyCaption">Mock historical sets · nothing saved or synced</caption><thead><tr><th scope="col" data-phone-text="movement">Movement</th><th scope="col" data-phone-text="load">Load</th><th scope="col" data-phone-text="reps">Reps</th><th scope="col">lb·reps</th></tr></thead><tbody>{rows}</tbody></table></section>
  <section class="phone-screen phone-map-screen" id="phone-panel-map" role="tabpanel" aria-labelledby="phone-tab-map" tabindex="0" hidden>
  <span class="phone-kicker" data-phone-text="mapKicker">03 / HAITIAN MUSCLE MAP</span><h2 data-phone-text="mapTitle">Your body. Your climb.</h2><p data-phone-text="mapIntro">Tap a region. Explore the example tier markings.</p>
  <a class="phone-destination" data-phone-map-link href="/exercises/#library" data-phone-text="openMuscles">Explore these exercises ↗</a>
  <div class="phone-map-views" role="group" aria-label="Avatar view"><button type="button" data-phone-facing="f" aria-pressed="true" data-phone-text="front">Front</button><button type="button" data-phone-facing="b" aria-pressed="false" data-phone-text="backView">Back</button></div>
  <p class="phone-region-detail" data-phone-region-detail data-phone-text="mapHint">Choose a muscle region.</p><div class="phone-avatar-stage">{svg}<span class="phone-avatar-note" data-phone-text="mapExample">EXAMPLE TIERS · NOT ACHIEVEMENTS</span></div><div class="phone-region-buttons">{buttons}</div></section>
  </div><div class="phone-live-status" role="status" aria-live="polite" data-phone-status></div>
 </details>
 <footer class="phone-widget-footer"><span data-phone-text="disclosure">APP CONCEPT · NO ATHLETE DATA</span><i aria-hidden="true"></i></footer>
 </section><noscript><p class="phone-noscript">Enable JavaScript for interactive live app mode, or view the MONTE WO screen above.</p></noscript>
 </div>'''

def attach_assets(doc):
 if '/phone-cockpit.css' not in doc:doc=doc.replace('</head>','<link rel="stylesheet" href="/phone-cockpit.css"><script type="module" src="/cockpit.js"></script></head>')
 if '/site-connections.js' not in doc:doc=doc.replace('</head>','<script type="module" src="/site-connections.js"></script></head>')
 return doc

def navigation_links(home=False):
 status='/app/#app-connections' if home else '#app-connections'
 return '<nav class="app-connection-jump" id="app-preview-shortcut" aria-label="Website and app navigation"><a href="/mobile/" data-app-nav="mobile">Launch Live 5-Tab App ↗</a><a href="#app-preview" data-app-nav="preview">Actual app preview ↓</a><a href="/exercises/#training-tools" data-app-nav="train">Open training tools ↗</a><a href="'+status+'" data-app-nav="status">Connection status ↓</a></nav>'

def connections_markup():
 cards=''.join('<article class="app-service" data-service="'+key+'"><h3>'+label+'</h3><strong data-service-label>Not checked yet</strong><p data-service-detail>No signed-in account or synchronization is assumed.</p></article>' for key,label in [('mobile','App accounts & workout sync'),('strength','Strength Index pilot'),('waitlist','Launch-update waitlist')])
 return '<!-- APP-CONNECTIONS-START --><section class="wrap app-connections" id="app-connections" data-app-connections aria-labelledby="app-connections-title"><span class="eyebrow">ONE WEBSITE / CLEAR CONNECTIONS</span><h2 id="app-connections-title">Know what is connected.</h2><p>The phone above embeds the MONTE WO 5-tab web app alongside screen captures. The exercise logger starts as a session-only draft; optional account saving requires enrolled-pilot sign-in and explicit confirmation. Native device history is stored on that device, not automatically uploaded to an account. Account-backed records use the shared application API only after verified sign-in.</p><p class="app-api-origin">Checking services on: <code data-api-origin>this website</code>. These results apply only to the origin above. Native default API: https://vitaflex-monte-wo.pages.dev. A development override may point elsewhere.</p><div class="app-connection-grid">'+cards+'</div><button type="button" class="button" data-check-connections>Check services again</button><p class="app-connection-summary" role="status" aria-live="polite" data-connection-summary>JavaScript is needed to check service readiness. Nothing has been sent.</p><div class="app-connection-jump"><a href="/mobile/">Open 5-tab mobile web app ↗</a><a href="/exercises/#training-tools">Use the session logger ↗</a><a href="/exercises/#account-workouts">Account sign-in &amp; history ↗</a><a href="/exercises/#library">Browse exercises ↗</a><a href="/downloads/">Native release status ↗</a><a href="/waitlist/">Waitlist / contact options ↗</a><a href="/delete-account/">Account & data support ↗</a></div><p>Service readiness is not proof of an authenticated account or a completed cross-device sync. Waitlist signup does not create an athlete account. No database changes are made by this check.</p></section><!-- APP-CONNECTIONS-END -->'

def replace_div(doc,pattern,new):
 match=re.search(pattern,doc)
 if not match:raise ValueError('Missing phone placeholder')
 depth=1
 for token in re.finditer(r'</?div\b[^>]*>',doc[match.end():]):
  depth+=-1 if token[0].startswith('</') else 1
  if depth==0:return doc[:match.start()]+new+doc[match.end()+token.end():]
 raise ValueError('Unclosed phone container')

def publish():
 for path in [P/'index.html',P/'app/index.html']:
  doc=path.read_text()
  pattern=r'<div class="phone-widget-stage"[^>]*>' if 'data-phone-cockpit' in doc else r'<div class="hero-art foundation-concept"[^>]*>'
  doc=attach_assets(replace_div(doc,pattern,phone_markup()))
  doc=doc.replace('PRODUCT CONCEPT — NOT A FUNCTIONAL APP','ACTUAL MONTE WO v2 APP PREVIEW — NO OFFICIAL RANK AWARDS').replace('These static illustrations contain no athlete data, earned ranks or live results. Earlier placeholder scoring is not used.','Explore the real MONTE WO 5-tab app experience directly in the frame or full-screen at /mobile/. Official verified rank awards remain separate.')
  doc=re.sub(r'<nav class="app-connection-jump" id="app-preview-shortcut".*?</nav>','',doc,flags=re.S)
  if path==P/'app/index.html':
   doc=doc.replace('<div class="foundation-tag">COMING SOON</div>',navigation_links()+'<div class="foundation-tag">COMING SOON</div>',1)
   doc=re.sub(r'<!-- APP-CONNECTIONS-START -->.*?<!-- APP-CONNECTIONS-END -->','',doc,flags=re.S)
   doc=doc.replace('</main>',connections_markup()+'</main>')
  else:doc=doc.replace('<p class="launch-link">',navigation_links(True)+'<p class="launch-link">',1)
  path.write_text(doc)
 (P/'service-readiness.js').write_bytes((ROOT/'shared/service-readiness.js').read_bytes())
 sw=P/'sw.js';text=sw.read_text();text=re.sub(r"const CORE='[^']+';","const CORE='montewo-core-v18-account-workouts-v2';",text)
 if '"/phone-cockpit.css"' not in text:text=text.replace('const COCKPIT_ASSETS=[','const COCKPIT_ASSETS=["/phone-cockpit.css", ')
 if '"/site-connections.js"' not in text:text=text.replace('const COCKPIT_ASSETS=[','const COCKPIT_ASSETS=["/site-connections.js", "/service-readiness.js", ')
 sw.write_text(text)
if __name__=='__main__':publish()
