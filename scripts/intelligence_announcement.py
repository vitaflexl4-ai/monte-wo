"""Existing venture detail announcement. Symbolic anticipation, never a launch countdown."""
STATEMENT = 'The most consequential changes often begin with something others failed to notice.'
DESCRIPTION = 'VitaFlex Intelligence explores the intersection of intelligence, strategic thinking, and deeper understanding—uncovering what others overlook, challenging accepted narratives, and revealing possibilities that can change the course of events.'
LOGO = '<span class="intelligence-logo" aria-hidden="true"><img src="/assets/group/vitaflex-monogram.png" width="242" height="161" alt=""><svg viewBox="0 0 320 240" focusable="false"><ellipse cx="160" cy="120" rx="153" ry="79" transform="rotate(-25 160 120)"/><circle cx="290" cy="63" r="3"/></svg></span>'

def render_announcement(page):
    body=f'''<div class="intelligence-announcement">
<header class="announcement-header"><a class="announcement-identity" href="/#ventures" aria-label="VitaFlex Business Group home">{LOGO}<span class="intelligence-wordmark">VITAFLEX <span>INTELLIGENCE</span></span></a><nav aria-label="Return navigation"><a href="/sony/">← Meet Sony</a><a href="/#ventures">Ventures ↗</a></nav></header>
<section class="revelation" aria-labelledby="revelation-title"><div class="revelation-rail"><p>INTELLIGENCE / STRATEGIC THINKING</p><p>IN DEVELOPMENT</p></div>
<p class="announcement-eyebrow">THE ANNOUNCEMENT</p><h1 id="revelation-title">{STATEMENT}</h1>
<div class="anticipation"><p class="closer">CLOSER THAN YOU THINK.</p><p class="revelation-distance">THE MOMENT OF REVELATION IS NEVER<br class="desktop-break"> AS DISTANT AS IT APPEARS.</p></div>
<div class="announcement-context"><span class="context-line" aria-hidden="true"></span><p>{DESCRIPTION}</p><p class="countdown-note">A symbolic countdown. No launch date is being calculated.</p></div></section>
<footer class="announcement-footer"><span>VITAFLEX INTELLIGENCE / IN DEVELOPMENT</span><div class="announcement-footer-links"><a href="/sony/">Meet Sony Alexis</a><a href="/sony/three-daily-wins/">The Three Daily Wins ↗</a></div></footer></div>'''
    doc=page('VitaFlex Intelligence', DESCRIPTION, body, '/ventures/vitaflex-intelligence-corp/')
    # Isolate this existing route from corporate template styling; homepage remains exact.
    import re
    doc=re.sub(r'<header class="frame header">.*?</header>','',doc)
    doc=re.sub(r'<footer class="frame footer">.*?</footer>','',doc)
    doc=doc.replace('/assets/group/favicon.png','/assets/intelligence/favicon.png').replace('/assets/group/vitaflex-business-group.png','/assets/intelligence/social.png').replace('property="og:image:width" content="1024"','property="og:image:width" content="1200"').replace('property="og:image:height" content="1024"','property="og:image:height" content="630"').replace('VitaFlex Business Group — gold VF emblem','VitaFlex Intelligence — original VF monogram with a champagne-gold orbit').replace('property="og:site_name" content="VitaFlex Business Group"','property="og:site_name" content="VitaFlex Intelligence"')
    return doc.replace('<link rel="stylesheet" href="/group.css">','<link rel="stylesheet" href="/sony/intelligence-announcement.css">')
