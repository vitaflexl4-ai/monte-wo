"""Final corporate layer. Product engines, APIs and original routes stay intact."""
from pathlib import Path
import json, html, re
ROOT=Path(__file__).resolve().parent.parent
P=ROOT/'public'
E=lambda s:html.escape(str(s),quote=True)
ventures=json.loads((ROOT/'content/group/ventures.json').read_text())
origin='https://vitaflexbusinessgroup.com'

def page(title,description,body,path='/'):
 return f'''<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>{E(title)} | VitaFlex Business Group</title><meta name="description" content="{E(description)}"><link rel="canonical" href="{origin}{path}"><meta property="og:type" content="website"><meta property="og:site_name" content="VitaFlex Business Group"><meta property="og:title" content="{E(title)}"><meta property="og:description" content="{E(description)}"><meta property="og:url" content="{origin}{path}"><meta name="theme-color" content="#111311"><link rel="icon" href="/group-mark.svg" type="image/svg+xml"><link rel="stylesheet" href="/group.css"></head><body><a class="skip" href="#main">Skip to content</a><header class="shell header"><a class="brand" href="/" aria-label="VitaFlex Business Group home"><span class="monogram" aria-hidden="true">V<span>F</span></span><span>VITAFLEX<small>BUSINESS GROUP</small></span></a><nav aria-label="Group navigation"><a href="/#ventures">Our ventures</a><a href="/#approach">How we build</a><a href="/#about">The group</a></nav><a class="header-contact" href="/#contact">Let’s connect <span aria-hidden="true">↗</span></a></header><main id="main" tabindex="-1">{body}</main><footer class="shell"><div class="footer-top"><a class="brand" href="/">VITAFLEX<small>BUSINESS GROUP</small></a><p>One group. Multiple ventures.<br>A bigger vision.</p><a href="/#ventures">Explore the portfolio ↗</a></div><div class="footer-bottom"><span>© 2026 VitaFlex Business Group</span><span>Built with purpose. Developed for the long term.</span><a href="/privacy/">Privacy</a></div></footer></body></html>'''

def identity(v):
 return f'<img src="{E(v["logo"])}" width="260" height="100" alt="{E(v["name"])}" loading="lazy">' if v['logo'] else '<span class="training-wordmark">VitaFlex <i>Training</i></span>'

def card(v,i):
 return f'''<article class="venture {v['slug']}"><div class="venture-art"><span class="venture-number">VENTURE / 0{i}</span>{identity(v)}<span class="venture-relation">A VITAFLEX BUSINESS GROUP VENTURE</span></div><div class="venture-body"><div class="venture-meta"><span>{E(v['category'])}</span>{'<span class="status">'+E(v['status'])+'</span>' if v['status'] else ''}</div><h3>{E(v['name'])}</h3><p>{E(v['description'])}</p><a class="text-link" href="/ventures/{v['slug']}/">Discover the venture <span aria-hidden="true">↗</span></a></div></article>'''

# Preserve the generated, functional product homepage before replacing the root.
product=P/'monte-wo/index.html';product.parent.mkdir(exist_ok=True,parents=True)
doc=(P/'index.html').read_text()
doc=doc.replace('href="/" aria-label="Monte Wo home"','href="/monte-wo/" aria-label="Monte Wo home"')
doc=re.sub(r'<link rel="canonical"[^>]*>','',doc)
doc=doc.replace('</head>',f'<link rel="canonical" href="{origin}/monte-wo/"></head>')
product.write_text(doc)
body='''<section class="hero shell"><div class="hero-copy"><p class="eyebrow">VITAFLEX BUSINESS GROUP / THE PARENT COMPANY</p><h1>We Build Ventures.<br>We Create<br><em>Possibilities.</em></h1><p class="hero-intro">We are building a portfolio of businesses, brands, and digital products designed to solve problems, create value, and grow beyond a single idea.</p><div class="actions"><a class="button" href="#ventures">Explore our ventures <span aria-hidden="true">↗</span></a><a class="quiet" href="#about">Meet the group <span aria-hidden="true">→</span></a></div></div><div class="architecture" role="img" aria-label="Abstract architectural pillars rising toward an open horizon"><span class="orbit"></span><span class="pillar p1"></span><span class="pillar p2"></span><span class="pillar p3"></span><span class="art-label">A FOUNDATION FOR WHAT’S NEXT.</span></div><div class="hero-foot"><span>INDEPENDENT VENTURES. SHARED AMBITION.</span><a href="#ventures">Discover the portfolio ↓</a></div></section>
<section class="intro shell"><p class="eyebrow">ONE GROUP. A BROADER HORIZON.</p><div><h2>Not a single idea.<br><span>A platform for many.</span></h2><p>VitaFlex Business Group is the parent organization building and developing multiple ventures. Each has its own purpose, audience, and identity. Together, they express a bigger vision: turning meaningful ideas into lasting value.</p></div></section>
<section class="section shell" id="ventures"><div class="section-head"><div><p class="eyebrow">01 / OUR VENTURES</p><h2>Distinct identities.<br>Shared conviction.</h2></div><p>Our first two projects bring our ambition into focus. Different experiences, connected by the group behind them.</p></div><div class="venture-grid">'''+''.join(card(v,i+1) for i,v in enumerate(ventures))+'''</div></section>
<section class="build-section" id="approach"><div class="shell section"><div class="section-head"><div><p class="eyebrow">02 / HOW WE BUILD</p><h2>Purpose first.<br>Possibility next.</h2></div><p>A deliberate approach to developing ideas—not growth for its own sake.</p></div><div class="steps"><article><span>01 / DISCOVER</span><h3>Start with a real need.</h3><p>Look for meaningful problems and understand the people behind them.</p></article><article><span>02 / DEVELOP</span><h3>Give the idea its shape.</h3><p>Build a focused identity and a useful experience around a clear purpose.</p></article><article><span>03 / EVOLVE</span><h3>Build for the long term.</h3><p>Learn, refine, and develop thoughtfully. Let progress—not promises—guide the next step.</p></article></div></div></section>
<section class="philosophy shell section"><p class="eyebrow">OUR MISSION & PHILOSOPHY</p><h2>One group.<br>Multiple ventures.<br><em>A bigger vision.</em></h2><div><p>Our mission is to build businesses, brands, and products that solve problems and create meaningful value.</p><p>We believe strong ventures need their own voice, a clear reason to exist, and the space to develop. Our role is to provide the shared direction without making every venture the same.</p></div></section>
<section class="future shell"><div><p class="eyebrow">03 / FUTURE VENTURES</p><h2>The next idea<br>has room to grow.</h2></div><div><p>Our portfolio begins with MONTE WO and VitaFlex Training. It is not limited to them—or to one industry.</p><p>We remain open to new problems worth solving. Additional ventures will be introduced here when there is something concrete to share.</p><span class="future-note">A LONG-TERM VISION. AN OPEN HORIZON.</span></div></section>
<section class="section shell about" id="about"><p class="eyebrow">04 / ABOUT THE GROUP</p><div><h2>A shared foundation.<br>Independent ambition.</h2><p>VitaFlex Business Group brings together the ventures we are building under one parent-company identity. The group is broader than any one product, brand, or market.</p><p>MONTE WO is our strength-training platform project. VitaFlex Training is our fitness and mindset brand. They are separate ventures—not interchangeable names for the same experience.</p><a class="text-link" href="#ventures">Get to know our ventures ↗</a></div></section>
<section class="contact shell" id="contact"><p class="eyebrow">CONTACT & PARTNERSHIPS</p><h2>Let’s explore<br><em>what’s possible.</em></h2><div><p>Have a thoughtful idea, a partnership inquiry, or a question about the group? Tell us what you have in mind.</p><a class="button" href="mailto:Montewo@vitaflexbusinessgroup.com?subject=VitaFlex%20Business%20Group%20%E2%80%94%20Partnership%20inquiry">Start a conversation ↗</a><p class="contact-note">Group inquiries currently use our existing contact mailbox:<br><a href="mailto:Montewo@vitaflexbusinessgroup.com">Montewo@vitaflexbusinessgroup.com</a><br>Opens your email app. Nothing is sent automatically.</p></div></section>'''
(P/'index.html').write_text(page('We Build Ventures. We Create Possibilities.','One group. Multiple ventures. A bigger vision. VitaFlex Business Group is the parent organization behind MONTE WO and VitaFlex Training.',body))
routes=['/','/monte-wo/']
for v in ventures:
 path=f'/ventures/{v["slug"]}/';routes.append(path)
 detail=f'''<section class="shell detail section"><p class="eyebrow">OUR VENTURES / {E(v['category'])}</p><h1>{E(v['name'])}</h1><p class="detail-intro">{E(v['description'])}</p><p class="eyebrow">A VENTURE OF VITAFLEX BUSINESS GROUP</p><div class="detail-panel">{identity(v)}<div>{'<span class="status">'+E(v['status'])+'</span>' if v['status'] else '<span class="eyebrow">AVAILABILITY NOT ANNOUNCED</span>'}<p>{E(v['detail'])}</p>{'<a class="button" href="'+E(v['destination'])+'">'+E(v['destinationLabel'])+' ↗</a>' if v['destination'] else '<a class="button" href="/#contact">Contact the group ↗</a>'}</div></div><a class="text-link" href="/#ventures">← Back to the portfolio</a></section>'''
 f=P/path.strip('/')/'index.html';f.parent.mkdir(parents=True,exist_ok=True);f.write_text(page(v['name'],v['description'],detail,path))
# Keep product home links and fragments connected to the product, not the parent.
for file in P.rglob('index.html'):
 if file==P/'index.html' or 'ventures' in file.relative_to(P).parts: continue
 doc=file.read_text().replace('href="/#', 'href="/monte-wo/#')
 doc=doc.replace('href="/" aria-label="Monte Wo home"','href="/monte-wo/" aria-label="Monte Wo home"')
 file.write_text(doc)
(P/'group-routes.json').write_text(json.dumps(routes,indent=2)+'\n')
# Existing MONTE WO service worker must not strand returning visitors on the old root.
sw=P/'sw.js';text=sw.read_text();text=re.sub(r"const CORE='[^']+';","const CORE='montewo-core-v19-venture-group';",text)
text=text.replace("'/group.css','/group-mark.svg','/monte-wo/','/ventures/monte-wo/','/ventures/vitaflex-training/',", "")
text=text.replace("const ASSETS=[", "const ASSETS=['/group.css','/group-mark.svg','/monte-wo/','/ventures/monte-wo/','/ventures/vitaflex-training/',",1);sw.write_text(text)
# Group metadata stays independent from product metadata.
sitemap=P/'sitemap.xml'
if sitemap.exists():
 text=sitemap.read_text();text=text.replace('</urlset>',''.join(f'<url><loc>{origin}{p}</loc></url>' for p in routes if p!='/')+'</urlset>');sitemap.write_text(text)
print('Corporate group built:', ', '.join(routes))
