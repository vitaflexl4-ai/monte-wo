"""Lightweight portfolio gallery and one shared venture template. No app claims."""
import html
E=lambda s:html.escape(str(s),quote=True)
RANKS=[('debitan','Debitan'),('bati','Bati'),('solid','Solid'),('fo','Fô'),('avanse','Avanse'),('met','Mèt'),('chanpyon','Chanpyon'),('titan','Titan'),('lejand','Lejand')]

def lifecycle(v):
    return '<ol class="chapter-lifecycle" aria-label="Venture lifecycle">'+''.join(f'<li class="{"current" if i==v["stage"] else ""}"'+(' aria-current="step"' if i==v['stage'] else '')+f'><span aria-hidden="true"></span>{step}</li>' for i,step in enumerate(['Idea','Building','Launching','Live']))+'</ol>'

def visual(v):
    slug=v['slug']
    if slug=='monte-wo':
        content='<div class="chapter-logo"><img src="/assets/monte-wo-logo.webp" width="1000" height="722" loading="lazy" alt="Monte Wo — blue and red logo"></div><ol class="rank-gems" lang="ht" aria-label="Nèf ran Monte Wo">'+''.join(f'<li style="--rank:{i}"><img src="/assets/ranks/{key}.webp" width="64" height="64" loading="lazy" alt=""><span>{name}</span></li>' for i,(key,name) in enumerate(RANKS))+'</ol><p class="visual-note">THE CLIMB, ONE RANK AT A TIME.</p>'
    elif slug=='bible-verse-memory-app':
        content='<div class="memory-verse"><span class="visual-note">READ. RECALL. REMEMBER.</span><p><span>Hide the Word</span><span>in your heart.</span></p><div class="memory-traces" aria-hidden="true"><i></i><i></i><i></i></div><span class="visual-note">A PRACTICE OF REMEMBRANCE</span></div>'
    else:
        content='<svg class="chapter-network" viewBox="0 0 480 300" aria-hidden="true"><path d="M30 180L110 60 230 130 350 40 450 170 300 250 230 130 110 240 30 180M110 60L110 240M350 40L300 250M30 180L230 130 450 170"/><g>'+''.join(f'<circle cx="{x}" cy="{y}" r="3"/>' for x,y in [(30,180),(110,60),(230,130),(350,40),(450,170),(300,250),(110,240)])+'</g></svg><div class="intelligence-veil"><img src="/assets/intelligence/monogram-orbit.png" width="160" height="120" loading="lazy" alt=""><p>To be introduced<br>when it is ready.</p></div>'
    return f'<div class="chapter-visual {slug}" aria-label="{E(v["name"])} visual"><div class="visual-drift">{content}</div></div>'

def panel(v,i):
    return f'''<article class="venture-row chapter-panel {v['slug']}" aria-labelledby="chapter-{i}"><div class="chapter-copy"><span class="venture-index">{i:02d}</span><p class="venture-category">{E(v['category'])}</p><h3 id="chapter-{i}">{E(v['name'])}</h3><p class="chapter-description">{E(v['description'])}</p><span class="chapter-status">{E(v['status'])}</span>{lifecycle(v)}<a class="chapter-link" href="/ventures/{v['slug']}/">Visit {E(v['name'])}<span aria-hidden="true">↗</span></a></div>{visual(v)}</article>'''

def gallery(ventures):
    return '<section class="portfolio frame chapter-gallery" id="ventures" aria-labelledby="portfolio-title"><div class="portfolio-heading"><div><span class="index-label">INDEPENDENT VENTURES, ONE VISION</span><h2 id="portfolio-title">The portfolio.</h2></div><span class="portfolio-count">01 — 03</span></div>'+''.join(panel(v,i+1) for i,v in enumerate(ventures))+'<div class="portfolio-end"><span class="horizon-mark" aria-hidden="true"></span><span>THE HORIZON REMAINS OPEN.</span></div></section>'

def resources(doc):
    return doc.replace('</head>','<link rel="stylesheet" href="/portfolio.css"><script src="/portfolio.js" defer></script></head>')

def venture_page(v,i,page):
    body=f'''<section class="frame venture-chapter" aria-labelledby="venture-title"><a class="chapter-link back-link" href="/#ventures">← The portfolio</a><div class="venture-page-heading"><span class="venture-index">{i:02d}</span><p class="venture-category">{E(v['category'])}</p><h1 id="venture-title">{E(v['name'])}</h1><p class="venture-intro">{E(v['description'])}</p><span class="chapter-status">{E(v['status'])}</span>{lifecycle(v)}</div>{visual(v)}<div class="venture-story"><h2>{'The climb ahead' if i==1 else 'In the making'}</h2><p>{E(v['detail'])}</p>'''
    if i==3:
        from intelligence_announcement import STATEMENT,DESCRIPTION
        body+=f'<p>{E(STATEMENT)}</p><p>{E(DESCRIPTION)}</p><p class="closer">CLOSER THAN YOU THINK.</p><p>THE MOMENT OF REVELATION IS NEVER AS DISTANT AS IT APPEARS.</p>'
    if v['destination']:
        body+=f'<a class="chapter-link" href="{v["destination"]}">Explore {E(v["name"])} training tools <span aria-hidden="true">↗</span></a>'
    body+='</div><nav class="venture-return" aria-label="Return navigation"><a class="chapter-link" href="/sony/">← Meet Sony Alexis</a><a class="chapter-link" href="/#ventures">Ventures ↗</a></nav></section>'
    doc=resources(page(v['name'],v['description'],body,f'/ventures/{v["slug"]}/'))
    old='https://vitaflexbusinessgroup.com/assets/group/vitaflex-business-group.png'
    doc=doc.replace(old,f'https://vitaflexbusinessgroup.com/assets/ventures/{v["slug"]}-share.png').replace('content="1024"','content="1200"',1).replace('og:image:height" content="1024"','og:image:height" content="630"').replace('VitaFlex Business Group — gold VF emblem',E(v['name'])+' — a VitaFlex venture').replace('twitter:card" content="summary"','twitter:card" content="summary_large_image"')
    if i==3:doc=doc.replace('/assets/group/favicon.png','/assets/intelligence/favicon.png')
    return doc

def share_image(v,i):
    color=['#749ff5','#E7CF98','#bbc4cf'][i-1]
    return f'''<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630"><rect width="1200" height="630" fill="#0b0c0b"/><circle cx="1060" cy="200" r="280" fill="{color}" opacity=".08"/><path d="M70 90H1130M70 540H1130" stroke="#C9A96A" stroke-opacity=".4"/><text x="70" y="180" fill="#C9A96A" font-family="Georgia,serif" font-size="70">{i:02d}</text><text x="70" y="315" fill="#eeeae2" font-family="Georgia,serif" font-size="62">{E(v['name'])}</text><text x="74" y="380" fill="{color}" font-family="sans-serif" font-size="24">{E(v['category'])}</text><text x="74" y="475" fill="#E7CF98" font-family="sans-serif" font-size="22">{E(v['status'])}</text><text x="74" y="580" fill="#aaa99e" font-family="sans-serif" font-size="18">VITAFLEX BUSINESS GROUP</text></svg>'''
