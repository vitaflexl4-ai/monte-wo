"""Existing venture detail announcement. Symbolic anticipation, never a launch countdown."""
STATEMENT = 'The most consequential changes often begin with something others failed to notice.'
DESCRIPTION = 'VitaFlex Intelligence explores the intersection of intelligence, strategic thinking, and deeper understanding—uncovering what others overlook, challenging accepted narratives, and revealing possibilities that can change the course of events.'
EQUATION = ['KNOWLEDGE', '+', 'PATTERN', '+', 'PERSPECTIVE', '=', 'POSSIBILITY']

def render_announcement(page):
    terms=''.join(f'<span class="equation-term term-{i}" style="--order:{i}">{term}</span>' for i,term in enumerate(EQUATION))
    body=f'''<div class="intelligence-announcement">
<header class="announcement-header"><a class="announcement-identity" href="/#ventures" aria-label="VitaFlex Business Group home">VITAFLEX <span>INTELLIGENCE CORP</span></a><nav aria-label="Return navigation"><a href="/sony/">← Meet Sony</a><a href="/#ventures">Ventures ↗</a></nav></header>
<section class="revelation" aria-labelledby="revelation-title"><div class="revelation-rail"><p>INTELLIGENCE / STRATEGIC THINKING</p><p>IN DEVELOPMENT</p></div>
<p class="announcement-eyebrow">THE ANNOUNCEMENT</p><h1 id="revelation-title">{STATEMENT}</h1>
<div class="equation-stage"><p class="equation-permanent" aria-label="Knowledge plus pattern plus perspective equals possibility">{terms}</p>
<div class="symbolic-reveal" aria-hidden="true"><div class="equation-echo">{terms}</div><div class="convergence-lines"><i></i><i></i><i></i></div><span class="infinity-symbol">∞</span><span class="symbol-orbit"></span></div>
<p class="closer">CLOSER THAN YOU THINK.</p><p class="revelation-distance">THE MOMENT OF REVELATION IS NEVER<br class="desktop-break"> AS DISTANT AS IT APPEARS.</p></div>
<div class="announcement-context"><span class="context-line" aria-hidden="true"></span><p>{DESCRIPTION}</p><p class="countdown-note">A symbolic countdown. No launch date is being calculated.</p></div></section>
<footer class="announcement-footer"><span>VITAFLEX INTELLIGENCE CORP / IN DEVELOPMENT</span><div class="announcement-footer-links"><a href="/sony/">Meet Sony Alexis</a><a href="/sony/three-daily-wins/">The Three Daily Wins ↗</a></div></footer></div>'''
    doc=page('VitaFlex Intelligence Corp', DESCRIPTION, body, '/ventures/vitaflex-intelligence-corp/')
    # Isolate this existing route from corporate template styling; homepage remains exact.
    import re
    doc=re.sub(r'<header class="frame header">.*?</header>','',doc)
    doc=re.sub(r'<footer class="frame footer">.*?</footer>','',doc)
    return doc.replace('<link rel="stylesheet" href="/group.css">','<link rel="stylesheet" href="/sony/intelligence-announcement.css">')
