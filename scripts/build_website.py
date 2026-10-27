"""Public website foundation post-build. Standard library only. Never changes engines or tables."""
from pathlib import Path
import json,re,html,os
from urllib.parse import urlsplit
from poster_assets import publish_posters
posters=publish_posters()
ROOT=Path(__file__).resolve().parent.parent;P=ROOT/'public';C=ROOT/'content/website'
site=json.loads((C/'site.json').read_text());copy=json.loads((C/'en.json').read_text());lab=json.loads((ROOT/'content/lab/en.json').read_text());esc=lambda x:html.escape(str(x),quote=True)
origin=os.environ.get('SITE_ORIGIN',site['publicOrigin']).rstrip('/')
if origin:
 u=urlsplit(origin)
 if u.scheme!='https' or not u.hostname or u.username or u.password or u.path or u.query or u.fragment or u.port:raise ValueError('SITE_ORIGIN must be a confirmed HTTPS origin, with no credentials, port, path, query or fragment.')
messages=json.loads((C/'home-messages.json').read_text())
(P/'website-copy.js').write_text('// Generated public copy. No calculation or ranking business logic.\nexport const websiteUI='+json.dumps(site['ui'],ensure_ascii=False)+';\nexport const homeMessages='+json.dumps(messages,ensure_ascii=False)+';\n')
def block(doc,pattern,new,tag='div'):
 m=re.search(pattern,doc)
 if not m:raise ValueError('Missing expected source block: '+pattern)
 depth=1
 for token in re.finditer(r'</?'+tag+r'\b[^>]*>',doc[m.end():]):
  depth+=-1 if token.group().startswith('</') else 1
  if depth==0:return doc[:m.start()]+new+doc[m.end()+token.end():]
 raise ValueError('Unclosed source block')
def main(doc,body):return re.sub(r'(<main\b[^>]*>).*?</main>',lambda m:m.group(1)+body+'</main>',doc,flags=re.S)
def set_copy(doc,values):
 for key,text in values.items():doc=re.sub(r'<(\w+)([^>]*\bdata-i18n="'+re.escape(key)+r'"[^>]*)>.*?</\1>',lambda m:'<'+m[1]+m[2]+'>'+esc(text)+'</'+m[1]+'>',doc,flags=re.S)
 return doc
# Shared interactive simulation; sample data never enters ranking/account logic.
from phone_cockpit import phone_markup, attach_assets
def concept(home=False):return phone_markup()
# Readable unified Tools directory; old child routes are not replaced.
t=copy['tools']
def toolcard(title,text,url,symbol,status='AVAILABLE NOW'):
 return f'<a class="foundation-tool-card" href="{url}"><div><span class="foundation-icon">{symbol}</span><small>{status}</small></div><h3>{esc(title)}</h3><p>{esc(text)}</p><span class="foundation-card-link">Open tool <b aria-hidden="true">↗</b></span></a>'
strengthcards=''.join(toolcard(x['title'],x['description'],'/strength-lab/'+x['id']+'/',x['symbol']) for x in lab['tools'])
nutritioncards=''.join(toolcard(x['title'],x['text'],'/tools/'+x['id']+'/',x['symbol']) for x in t['nutrition'])
tools=f'''<section class="wrap foundation-page-hero"><span class="eyebrow">{t['eyebrow']}</span><h1>{t['headline']}<br><em>{t['accent']}</em></h1><p>{t['intro']}</p><div class="foundation-trust"><span>✓ No account</span><span>✓ Local calculations</span><span>✓ Clear limitations</span></div></section><section class="wrap foundation-section" id="strength-tools"><div class="foundation-heading"><div><span class="eyebrow">01 / STRENGTH</span><h2>{t['strengthTitle']}</h2><p>{t['strengthIntro']}</p></div><a href="/strength-lab/">About the Strength Lab ↗</a></div><div class="foundation-tool-grid">{strengthcards}<article class="foundation-tool-card foundation-planned"><span class="eyebrow">NOT A RANKING TOOL</span><h3>Estimates, not achievements.</h3><p>Calculators do not award ranks, verify lifts or approve standards. Your input is a starting point for planning.</p><a href="/strength/" class="foundation-card-link">Understand the Strength Index ↗</a></article></div></section><section class="wrap foundation-section" id="nutrition-tools"><div class="foundation-heading"><div><span class="eyebrow">02 / EXISTING EDUCATIONAL TOOLS</span><h2>{t['existingTitle']}</h2><p>{t['existingIntro']}</p></div></div><div class="foundation-tool-grid foundation-four">{nutritioncards}</div><div class="foundation-notice"><b>PLANNED / NOT FUNCTIONAL</b><h3>{t['futureTitle']}</h3><p>{t['futureText']}</p></div><p class="foundation-small">{t['legacy']} <a href="/tools/one-rep-max/">Original 1RM ↗</a> · <a href="/tools/plates/">Original plates ↗</a></p><div class="foundation-privacy">⌁ <p>{t['privacy']}</p></div></section>'''
f=P/'tools/index.html';f.write_text(main(f.read_text(),tools))
# App remains an explanatory public page, not an application.
a=copy['app'];app=f'''<section class="wrap foundation-app-hero"><div><span class="eyebrow">{a['eyebrow']}</span><h1>{a['headline']}<br><em>{a['accent']}</em></h1><p>{a['intro']}</p><div class="foundation-tag">COMING SOON</div><p class="foundation-small">{a['availability']}</p><div class="foundation-actions"><a class="button" href="/waitlist/">Join the Waitlist ↗</a><a href="/tools/">Use the Free Tools ↗</a></div></div>{concept()}</section><section class="wrap foundation-section"><div class="foundation-disclosure"><b>{a['notice']}</b><p>{a['reference']}</p></div><div class="foundation-heading"><div><span class="eyebrow">THE EXPERIENCE WE’RE EXPLORING</span><h2>Built around the work.</h2></div><span class="foundation-small">Nothing here is a live athlete dashboard.</span></div><div class="foundation-feature-grid">'''+''.join(f'<article class="foundation-feature"><span class="foundation-icon">{x["symbol"]}</span><span class="roadmap-status">COMING SOON</span><h2>{x["title"]}</h2><p>{x["text"]}</p></article>' for x in a['features'])+'''<article class="foundation-feature foundation-standards-card"><span class="eyebrow">DRAFT — NOT OFFICIAL</span><h2>Standards before status.</h2><p>Official rank awards are unavailable. Research, testing and approval of each discipline’s standards must come first.</p><a href="/methodology/">Read the methodology status ↗</a></article></div><div class="roadmap-disclosure"><strong>An honest preview.</strong><p>This interactive simulation is not a personal athlete dashboard. Sample sets and fixed badges are illustrative, not saved workouts or verified results. No public account or native app download is available.</p></div><div class="foundation-bottom-cta"><div><h2>Start with what works today.</h2><p>Free calculators and written exercise guides. No account required.</p></div><a class="button" href="/tools/">Explore Free Tools ↗</a></div></section>'''
f=P/'app/index.html';f.write_text(main(f.read_text(),app))
# New public discipline overview reads existing rulebook checks; no new judging methodology.
s=copy['standards'];standard=f'<section class="foundation-page-hero"><span class="eyebrow">EXERCISES / LAUNCH DISCIPLINES</span><h1>{s["headline"]}<br><em>{s["accent"]}</em></h1><p>{s["intro"]}</p><div class="foundation-notice"><b>{s["notice"]}</b></div><nav class="foundation-anchor-nav" aria-label="Launch disciplines">'+''.join(f'<a href="#{x["id"]}">{x["label"]} ↓</a>' for x in s['cards'])+'</nav></section>'
for i,x in enumerate(s['cards']):
 rule=json.loads((ROOT/f'content/strength/{x["id"]}-standard-draft-1.json').read_text())
 standard+=f'<article class="foundation-standard" id="{x["id"]}"><div class="foundation-standard-heading"><span>0{i+1}</span><div><span class="eyebrow">DRAFT VARIATION · NOT APPROVED</span><h2>{x["label"]}</h2><p>{x["variation"]}</p></div></div><div class="foundation-standard-grid"><div><h3>{s["equipment"]}</h3><p>{x["equipment"]}</p><div class="foundation-notice"><p>{x["difference"]}</p></div>'+ (f'<a href="{x["guide"]}">Read the general exercise guide ↗</a>' if x['guide'] else '<p class="foundation-small">Dedicated general technique guide and demonstration: planned.</p>')+f'</div><div><h3>{s["checks"]}</h3><ol>'+''.join('<li>'+esc(c['text'])+'</li>' for c in rule['checks'])+f'</ol><a href="/methodology/#{x["id"]}">Full draft MONTE Standard ↗</a></div></div></article>'
standard+=f'<div class="foundation-notice"><b>Preparation, not a maximum attempt.</b><p>{s["safety"]}</p></div><p class="foundation-small">Four draft variations do not make a complete judging protocol or a full exercise library. Independent review and qualified demonstrations remain pending.</p><p class="foundation-return"><a href="/exercises/">← Back to all written exercise guides</a></p>'
f=P/'exercises/standards/index.html';f.parent.mkdir(parents=True,exist_ok=True);f.write_text(main((P/'exercises/index.html').read_text().replace(' data-library',''),standard))
f=P/'exercises/index.html';doc=f.read_text();insert='''<section class="foundation-library-entry"><div><span class="eyebrow">FOUR LAUNCH DISCIPLINES / DRAFT RULES</span><h2>Same name. Specific variation.</h2><p>Squat, Bench Press, Deadlift and Strict Biceps Curl have distinct proposed ranking variations. General exercise guides do not replace the draft performance standards.</p></div><a class="button" href="/exercises/standards/">Read the discipline guide ↗</a></section>''';doc=doc.replace('<section class="muscle-section">',insert+'<section class="muscle-section">',1);f.write_text(doc)
# Public Strength Index: explain before technical pilot. Preserve existing pilot code and controls.
f=P/'strength/index.html';doc=f.read_text();r=copy['ranking'];intro=f'<section class="foundation-rank-explainer"><span class="eyebrow">NO XP. NO STREAK PROMOTIONS. NO FREE RANKS.</span><h2>{r["headline"]}</h2><p>{r["body"]}</p><p><strong>{r["status"]}</strong></p><a href="/exercises/standards/">Explore the four draft variations ↗</a></section>'
doc=doc.replace('<section class="discipline-grid"',intro+'<section class="discipline-grid"',1)
start=doc.index('<section class="account-panel">');end=doc.index('<section class="strength-section"><h2>Nine ranks.')
pilot=doc[start:end];doc=doc[:start]+doc[end:];doc=doc.replace('</main>',f'<details class="foundation-pilot"><summary>{r["pilot"]}</summary><p>This pre-existing technical pilot is not public enrollment and has not been expanded in this website phase. It remains unavailable unless the operator configures and authorizes it.</p>{pilot}</details></main>');f.write_text(doc)
# Keep the homepage's working estimate, nine identity selectors, library and dialogs.
home=(C/'home.html').read_text();home=block(home,r'<div class="hero-art"[^>]*>',concept(True))
home=block(home,r'<div class="feature-visual score-visual"[^>]*>','<div class="feature-visual foundation-feature-empty"><span data-i18n="currentRank">DRAFT — NOT OFFICIAL</span><strong>—</strong><small data-i18n="noAwards">No official rank awards.</small></div>')
home=block(home,r'<div class="feature-visual community-visual"[^>]*>','<div class="feature-visual foundation-feature-empty"><strong aria-hidden="true">◎</strong><span data-i18n="noLeaderboard">Friends &amp; leaderboards are future possibilities.</span></div>')
home=home.replace('href="#calculator"><span data-i18n="discoverRank"','href="/strength/"><span data-i18n="discoverRank"')
homeTools='<section class="wrap tools-home" id="free-tools"><div class="foundation-heading"><div><span class="eyebrow" data-i18n="toolsEyebrow">FREE TOOLS. REAL UTILITY.</span><h2 data-i18n="toolsTitle">Make your next session simpler.</h2></div><a class="text-link" href="/tools/" data-i18n="allTools">Explore all Free Tools ↗</a></div><div class="foundation-home-tool-grid">'
for i,x in enumerate(lab['tools']):homeTools+=f'<a href="/strength-lab/{x["id"]}/"><span class="foundation-icon">{x["symbol"]}</span><h3 data-i18n="homeTool{i}">{esc(x["title"])}</h3><span aria-hidden="true">↗</span></a>'
homeTools+='</div></section>';home=block(home,r'<section class="wrap tools-home"[^>]*>',homeTools,'section')
status='<section class="wrap foundation-status" aria-label="Website and product availability">'
for i,x in enumerate(copy['home']['statuses']):status+=f'<article><span class="eyebrow" data-i18n="status{i}Label">{x["label"]}</span><h2 data-i18n="status{i}Title">{x["title"]}</h2><p data-i18n="status{i}Text">{x["text"]}</p><a href="{x["link"]}" data-i18n="status{i}Cta">{x["cta"]}</a></article>'
status+='</section>';home=home.replace('<section class="wrap tools-home"',status+'<section class="wrap tools-home"',1)
cards=''
for i,p in enumerate(posters.values(),1):
 cards+=f'<article class="exercise-card"><div class="exercise-image has-workout-poster" data-exercise-image="{p["homeId"]}"><img class="workout-poster-img" src="{p["src"]}" alt="{esc(p["title"])} — MONTE WO workout poster" width="400" height="500" loading="lazy" decoding="async"><span class="exercise-num">0{i} / MONTE WO</span><span class="exercise-badge" data-i18n="workoutPoster">WORKOUT POSTER</span></div><div class="exercise-content"><div><h3 data-i18n="{p["homeId"]}">{esc(p["title"])}</h3><p data-i18n="{p["muscleKey"]}">{esc(p["muscle"])}</p></div><a class="exercise-open" href="{p["guide"]}" data-guide="{p["homeId"]}" aria-label="Open {esc(p["title"])} guide">↗</a></div></article>'
home=home.replace('<div class="exercise-grid" id="exercise-grid"></div>','<div class="exercise-grid" id="exercise-grid">'+cards+'</div>')
home=set_copy(home,messages['en']);(P/'index.html').write_text(home)
# A real 404 prevents Pages' implicit SPA fallback from making missing routes look valid.
notfound='''<section class="foundation-page-hero"><span class="eyebrow">404 / PAGE NOT FOUND</span><h1>This path stops here.<br><em>Your climb doesn’t.</em></h1><p>That page is not available. Nothing has been submitted or saved.</p><div class="foundation-actions"><a class="button" href="/">Back to MONTE WO ↗</a><a href="/tools/">Explore Free Tools ↗</a></div></section>'''
doc=main((P/'about/index.html').read_text(),notfound);doc=re.sub(r'<main[^>]*>','<main id="main" class="wrap">',doc,count=1);(P/'404.html').write_text(doc)
# Shared navigation, accessibility, public metadata. Private administration is not indexed.
exec(compile((ROOT/'scripts/build_downloads.py').read_text(),str(ROOT/'scripts/build_downloads.py'),'exec'),{'__file__':str(ROOT/'scripts/build_downloads.py')})
# Private operator surfaces (the intelligence command center) are NOT public website routes:
# never rewritten with public metadata, never listed in website-routes.json, never in the sitemap.
PRIVATE_DIRS=frozenset({'intelligence'})
paths=sorted(f for f in P.rglob('index.html') if not (set(f.parent.relative_to(P).parts)&(PRIVATE_DIRS|{'monte-wo','ventures'})))+[P/'404.html'];metadata={'/':copy['home'],'/app/':copy['app'],'/strength/':copy['ranking'],'/exercises/standards/':copy['standards'],'/tools/':{'title':'Free Strength & Fitness Calculators | MONTE WO','description':'Five strength calculators plus existing educational nutrition tools. Estimate 1RM, training percentages, balanced plates, kg/lb and warm-up loads locally, without an account.'}}
canonical_routes=[]
for file in paths:
 path='/' if file==P/'index.html' else '/404.html' if file==P/'404.html' else '/'+file.parent.relative_to(P).as_posix()+'/'
 doc=file.read_text();
 if path in ['/', '/app/']:doc=attach_assets(doc)
 if path=='/waitlist/' and '<noscript>' not in doc:doc=doc.replace('<form id="waitlist-form"','<noscript><p class="foundation-notice">Online signup needs JavaScript and an available service. Nothing is being collected here. Email <a href="mailto:Montewo@vitaflexbusinessgroup.com">Montewo@vitaflexbusinessgroup.com</a> for help; an email does not automatically enroll you.</p></noscript><form id="waitlist-form"')
 group='/tools/' if path.startswith(('/tools/','/strength-lab/')) else '/strength/' if path.startswith(('/strength/','/strength-ranks/','/methodology/')) else '/exercises/' if path.startswith('/exercises/') else path
 nav='<nav aria-label="Main navigation" id="main-nav">'+''.join(f'<a href="{x["path"]}" data-i18n="{x["key"]}"'+(' aria-current="page"' if group==x['path'] else '')+'>'+x['label']+'</a>' for x in site['navigation'])+f'<a class="foundation-mobile-waitlist" href="{site["cta"]["path"]}" data-i18n="joinWaitlist">{site["cta"]["label"]}</a></nav>'
 doc=re.sub(r'<nav\b[^>]*id="main-nav"[^>]*>.*?</nav>',lambda m:nav,doc,count=1,flags=re.S)
 doc=doc.replace('href="/strength-lab/" data-i18n="freeTools"','href="/tools/" data-i18n="freeTools"');doc=re.sub(r'<main\b([^>]*)>',lambda m:'<main'+re.sub(r'\s+tabindex="[^"]*"','',m[1])+' tabindex="-1">',doc,count=1)
 if '/website.css' not in doc:doc=doc.replace('</head>','<link rel="stylesheet" href="/website.css"><script src="/website.js" type="module"></script></head>')
 doc=re.sub(r'<meta (?:property="og:[^"]*"|name="twitter:[^"]*"|name="robots")[^>]*>','',doc);doc=re.sub(r'<link rel="canonical"[^>]*>','',doc)
 if path in metadata:
  m=metadata[path];doc=re.sub(r'<title>.*?</title>','<title>'+esc(m['title'])+'</title>',doc,flags=re.S);doc=re.sub(r'<meta name="description"[^>]*>','<meta name="description" content="'+esc(m['description'])+'">',doc)
 if path=='/404.html':doc=re.sub(r'<title>.*?</title>','<title>Page not found | MONTE WO</title>',doc);doc=re.sub(r'<meta name="description"[^>]*>','<meta name="description" content="This MONTE WO page could not be found. Return home or explore the free tools.">',doc)
 title=html.unescape(re.search(r'<title>(.*?)</title>',doc,re.S)[1]);desc_match=re.search(r'<meta name="description" content="([^"]*)"',doc); description=html.unescape(desc_match[1]) if desc_match else "Monte Wo Premium Performance Library";private=path in ['/strength/admin/','/404.html']
 meta=f'<meta property="og:type" content="website"><meta property="og:site_name" content="MONTE WO"><meta property="og:title" content="{esc(title)}"><meta property="og:description" content="{esc(description)}"><meta property="og:image" content="{origin}/assets/monte-wo-social.jpg"><meta property="og:image:width" content="1200"><meta property="og:image:height" content="630"><meta property="og:image:alt" content="MONTE WO. Lift. Rank. Climb high. Free tools available; ranking standards draft, not official."><meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="{esc(title)}"><meta name="twitter:description" content="{esc(description)}"><meta name="twitter:image" content="{origin}/assets/monte-wo-social.jpg">'
 if private:meta+='<meta name="robots" content="noindex, nofollow">'
 elif origin:meta+=f'<link rel="canonical" href="{origin}{path}"><meta property="og:url" content="{origin}{path}">';canonical_routes.append(path)
 doc=doc.replace('</head>',meta+'</head>');doc=doc.replace('<img class="rank-emblem"','<img loading="lazy" decoding="async" class="rank-emblem"');file.write_text(doc)
robots='User-agent: *\nAllow: /\nDisallow: /api/\nDisallow: /strength/admin/\n'
if origin:
 robots+='Sitemap: '+origin+'/sitemap.xml\n';(P/'sitemap.xml').write_text('<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'+''.join('<url><loc>'+esc(origin+p)+'</loc></url>' for p in canonical_routes)+'</urlset>\n')
else:(P/'sitemap.xml').unlink(missing_ok=True)
(P/'robots.txt').write_text(robots)
(P/'website-routes.json').write_text(json.dumps(['/' if f==P/'index.html' else '/'+f.parent.relative_to(P).as_posix()+'/' for f in paths if f!=P/'404.html'],indent=2)+'\n')
sw=P/'sw.js';text=sw.read_text();assets=['/website.js','/website.css','/website-copy.js','/exercises/standards/','/404.html','/workout-posters.js','/downloads/']+[p['src'] for p in posters.values()]
text=re.sub(r"const CORE='[^']+';","const CORE='montewo-core-v13-mobile-foundation';",text)
if 'const WEBSITE_ASSETS=' in text:text=re.sub(r'const WEBSITE_ASSETS=.*?;', 'const WEBSITE_ASSETS='+json.dumps(assets)+';',text)
else:text=text.replace('const ASSETS=[','const WEBSITE_ASSETS='+json.dumps(assets)+';\nconst ASSETS=[...WEBSITE_ASSETS,')
sw.write_text(text)
print('Website foundation built:',len(paths)-1,'routes + honest 404; canonical origin:',origin or 'UNCONFIGURED (no fabricated canonical/sitemap).')

# Final, scoped enhancement: keep the canonical Exercises URL and all guide routes.
from build_cockpit import build as build_cockpit
build_cockpit()

from phone_cockpit import publish as publish_phone
publish_phone()

# Parent-company identity is the final layer; preserve the product homepage separately.
from build_group import ventures
