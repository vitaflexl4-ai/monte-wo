"""Final corporate layer. Product engines, APIs and original routes stay intact."""
from pathlib import Path
import json, html, re
ROOT=Path(__file__).resolve().parent.parent
P=ROOT/'public'
E=lambda s:html.escape(str(s),quote=True)
ventures=json.loads((ROOT/'content/group/ventures.json').read_text())
origin='https://vitaflexbusinessgroup.com'

def page(title,description,body,path='/'):
 return f'''<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>{E(title)} | VitaFlex Business Group</title><meta name="description" content="{E(description)}"><link rel="canonical" href="{origin}{path}"><meta property="og:type" content="website"><meta property="og:site_name" content="VitaFlex Business Group"><meta property="og:title" content="{E(title)}"><meta property="og:description" content="{E(description)}"><meta property="og:url" content="{origin}{path}"><meta name="theme-color" content="#0b0c0b"><link rel="icon" href="/assets/group/favicon.png" type="image/png"><link rel="stylesheet" href="/group.css"></head><body data-design="noir"><a class="skip" href="#main">Skip to content</a><header class="frame header"><a class="brand" href="/" aria-label="VitaFlex Business Group home"><img class="brand-logo" src="/assets/group/vitaflex-monogram.webp" width="61" height="40" alt=""><span>VITAFLEX<small>BUSINESS GROUP</small></span></a><a class="nav-link" href="/#ventures">The portfolio <span aria-hidden="true">↗</span></a></header><main id="main" tabindex="-1">{body}</main><footer class="frame footer"><span>© 2026 VITAFLEX BUSINESS GROUP</span><span class="footer-motto">ONE GROUP. A BIGGER VISION.</span><a href="/privacy/">Privacy</a></footer></body></html>'''

def wordmark(v):
 if v['slug']=='vitaflex-training':return 'VitaFlex <em>Training</em>'
 if v['slug']=='vitaflex-intelligence-corp':return 'VitaFlex <em>Intelligence Corp</em>'
 return E(v['name'])

def identity(v):
 return f'<img src="{E(v["logo"])}" width="260" height="100" alt="{E(v["name"])}" loading="lazy">' if v['logo'] else f'<span class="venture-wordmark">{wordmark(v)}</span>'

def portfolio_row(v,i):
 return f'''<a class="venture-row {E(v['slug'])}" href="/ventures/{E(v['slug'])}/"><span class="venture-index">{i:02d}</span><h2>{wordmark(v)}</h2><span class="venture-category">{E(v['category'].replace(' · ', ' / ').upper())}</span><span class="venture-arrow" aria-hidden="true">↗</span></a>'''

# Preserve the generated, functional product homepage before replacing the root.
product=P/'monte-wo/index.html';product.parent.mkdir(exist_ok=True,parents=True)
doc=(P/'index.html').read_text()
doc=doc.replace('href="/" aria-label="Monte Wo home"','href="/monte-wo/" aria-label="Monte Wo home"')
doc=re.sub(r'<link rel="canonical"[^>]*>','',doc)
doc=doc.replace('</head>',f'<link rel="canonical" href="{origin}/monte-wo/"></head>')
product.write_text(doc)
body='''<section class="hero frame"><div class="hero-heading"><span class="index-label">INDEPENDENT BY DESIGN</span><h1>Beyond<br><em>the obvious.</em></h1><span class="hero-signature">VITAFLEX BUSINESS GROUP</span></div><div class="hero-art"><img src="/assets/group/vitaflex-business-group.webp" width="1024" height="1024" alt="VitaFlex Business Group — gold VF emblem inside a circular gold border" fetchpriority="high"></div><div class="hero-baseline"><span>WE BUILD VENTURES.<br>WE CREATE POSSIBILITIES.</span><a href="#ventures" class="scroll-link" aria-label="Discover our ventures"><span>DISCOVER</span><b aria-hidden="true">↓</b></a><span class="coordinate">A VISION WITHOUT LIMITS.</span></div></section><section class="portfolio frame" id="ventures"><div class="portfolio-heading"><span class="index-label">THE PORTFOLIO</span><span class="portfolio-count">01 — '''+f'{len(ventures):02d}'+'''</span></div>'''+''.join(portfolio_row(v,i+1) for i,v in enumerate(ventures))+'''<div class="portfolio-end"><span class="horizon-mark" aria-hidden="true"></span><span>THE HORIZON REMAINS OPEN.</span></div></section>'''
(P/'index.html').write_text(page('Beyond the obvious.','VitaFlex Business Group. Independent ventures. A bigger vision.',body))
routes=['/','/monte-wo/']
for v in ventures:
 path=f'/ventures/{v["slug"]}/';routes.append(path)
 destination=f'<a class="explore" href="{E(v["destination"])}">Enter {E(v["name"])} <span aria-hidden="true">↗</span></a>' if v['destination'] else '<span class="availability">AVAILABILITY NOT ANNOUNCED</span>'
 detail=f'''<section class="frame venture-detail"><a class="back-link" href="/#ventures">← THE PORTFOLIO</a><div class="detail-label"><span class="index-label">A VITAFLEX BUSINESS GROUP VENTURE</span><span>{E(v['category'])}</span></div><h1>{E(v['name'])}</h1><div class="detail-art">{identity(v)}</div><div class="detail-bottom"><span class="availability">{E(v['status']) if v['status'] else v['category'].upper()}</span>{destination}</div></section>'''
 f=P/path.strip('/')/'index.html';f.parent.mkdir(parents=True,exist_ok=True);f.write_text(page(v['name'],v['description'],detail,path))
# Keep product home links and fragments connected to the product, not the parent.
for file in P.rglob('index.html'):
 if file==P/'index.html' or 'ventures' in file.relative_to(P).parts: continue
 doc=file.read_text().replace('href="/#', 'href="/monte-wo/#')
 doc=doc.replace('href="/" aria-label="Monte Wo home"','href="/monte-wo/" aria-label="Monte Wo home"')
 file.write_text(doc)
(P/'group-routes.json').write_text(json.dumps(routes,indent=2)+'\n')
# Existing MONTE WO service worker must not strand returning visitors on the old root.
sw=P/'sw.js';text=sw.read_text();text=re.sub(r"const CORE='[^']+';","const CORE='montewo-core-v22-intelligence-venture';",text)
text=text.replace("'/group.css','/group-sculpture.svg','/group-mark.svg','/monte-wo/','/ventures/monte-wo/','/ventures/vitaflex-training/',", "")
text=re.sub(r"'(?:/assets/group/[^']+|/group.css|/group-mark.svg|/group-sculpture.svg|/monte-wo/|/ventures/[^']+/)',", '', text)
venture_assets=''.join(repr('/ventures/'+v['slug']+'/')+',' for v in ventures)
text=text.replace("const ASSETS=[", "const ASSETS=['/assets/group/vitaflex-business-group.webp','/assets/group/vitaflex-monogram.webp','/assets/group/favicon.png','/group.css','/group-sculpture.svg','/group-mark.svg','/monte-wo/',"+venture_assets,1);sw.write_text(text)
# Group metadata stays independent from product metadata.
sitemap=P/'sitemap.xml'
if sitemap.exists():
 text=sitemap.read_text();text=text.replace('</urlset>',''.join(f'<url><loc>{origin}{p}</loc></url>' for p in routes if p!='/')+'</urlset>');sitemap.write_text(text)
print('Corporate group built:', ', '.join(routes))
