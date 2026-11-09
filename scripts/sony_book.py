"""One passive personal experience: an automatically opening editorial book.
No inputs, personal data, storage, task tracking, publication feed or CMS connection.
"""
from pathlib import Path
import html
import re
ROOT = Path(__file__).resolve().parent.parent
BOOK_PATH = '/sony/three-daily-wins/'
E = lambda s: html.escape(str(s), quote=True)
CHAPTERS = [
    ('I', 'SPIRITUAL.', 'Return to what matters.', 'Faith. Presence. Purpose.', 'A quieter heart. A more intentional life.'),
    ('II', 'PHYSICAL.', 'Be present in your own life.', 'Movement. Care. Vitality.', 'Strength for the life in front of you.'),
    ('III', 'INTELLECTUAL.', 'Keep a place for possibility.', 'Curiosity. Learning. Perspective.', 'A wider mind. A world still unfolding.'),
]

def resource_hub():
    return '<section id="personal-resources" class="exp-hub frame" aria-labelledby="resources-title"><p class="exp-eyebrow">A PERSONAL EXPERIENCE</p><h2 id="resources-title">THE THREE DAILY WINS</h2><a class="book-door" href="/sony/three-daily-wins/"><span class="door-monogram" aria-hidden="true">III</span><span><span class="exp-eyebrow">SPIRIT. BODY. MIND.</span><h3>A way of living.<br>A book brought to life.</h3><p>A quiet, cinematic edition in three chapters.</p></span><span class="door-arrow" aria-hidden="true">↗</span></a></section><!-- end-personal-resources -->'

def cover():
    return '<div class="cover-frame"><span class="cover-imprint">A WAY OF LIVING</span><span class="cover-seal">III</span><div class="cover-title">THE THREE<br>DAILY<br><em>WINS.</em></div><span class="cover-rule"></span><span class="cover-subtitle">SPIRIT · BODY · MIND</span></div>'

def chapter(index):
    numeral, title, line, words, closing = CHAPTERS[index]
    return f'<div class="printed-page"><div class="page-running">THE THREE DAILY WINS <span>CHAPTER {numeral}</span></div><div class="chapter-mark">{numeral}</div><div class="chapter-copy"><span class="page-kicker">CHAPTER {numeral}</span><div class="chapter-title">{title}</div><span class="chapter-rule"></span><p class="chapter-line">{line}</p><p class="chapter-words">{words}</p></div><div class="page-bottom"><span>{closing}</span><span>0{index+1}</span></div></div>'

def final_page():
    return '<div class="printed-page final-page"><div class="page-running">THE THREE DAILY WINS <span>THE EVERYDAY EDITION</span></div><span class="final-mark">III</span><div class="final-copy">THREE WINS.<br>ONE DAY.<br><em>A BETTER<br>YOU.</em></div><div class="final-rule"></div><div class="page-bottom"><span>SPIRIT. BODY. MIND.</span><span>04</span></div></div>'

def verso(index):
    return f'<div class="printed-page verso-page"><span class="verso-arch"></span><span class="verso-numeral">{["I", "II", "III"][index]}</span><span class="verso-word">THE THREE DAILY WINS</span></div>'

def segmented_sheet(index):
    front, back = chapter(index), verso(index)
    # Four articulated paper panels. Clipped copies keep ink aligned over the folds.
    def panel(i):
        faces = f'<div class="sheet-face front"><div class="page-surface" style="--slice:{i}">{front}</div></div><div class="sheet-face back"><div class="page-surface" style="--slice:{3-i}">{back}</div></div>'
        return f'<div class="segment segment-{i}">{faces}{panel(i+1) if i<3 else ""}</div>'
    return f'<div class="turning-sheet sheet-{index+1}" style="--turn:0;--curl:0;--z:{6-index*2}px"><div class="flat-face flat-front">{front}</div><div class="flat-face flat-back">{back}</div>{panel(0)}</div>'

def book_body():
    accessible = '<div class="still-cover" aria-hidden="true">'+cover()+'</div>'
    for numeral, title, line, words, closing in CHAPTERS:
        accessible += f'<section class="still-page"><span class="page-kicker">CHAPTER {numeral}</span><h2>{title}</h2><span class="chapter-rule"></span><p class="chapter-line">{line}</p><p>{words}</p><p class="still-closing">{closing}</p></section>'
    accessible += '<section class="still-page still-final"><h2>THREE WINS.<br>ONE DAY.<br><em>A BETTER YOU.</em></h2><p>SPIRIT. BODY. MIND.</p></section>'
    return f'''<div class="book-edition"><header class="edition-heading"><span>SONY ALEXIS / PERSONAL</span><span>THE ART OF AN INTENTIONAL DAY</span></header><h1 class="sr-only">THE THREE DAILY WINS.</h1><div class="book-stage" aria-hidden="true"><div class="ambient-light"></div><div class="table-shadow"></div><div class="book"><div class="back-board"></div><div class="paper-block"></div><div class="fixed-page">{final_page()}</div>{''.join(segmented_sheet(i) for i in reversed(range(3)))}<div class="hardcover"><div class="cover-face cover-front">{cover()}</div><div class="cover-face cover-inside"><span class="endpaper-line"></span><span class="endpaper-mark">III</span></div><div class="cover-thickness"></div></div></div></div><div class="edition-colophon" aria-hidden="true"><span>SPIRIT. BODY. MIND.</span><span>THREE WINS. ONE DAY.</span></div><section class="text-edition" aria-label="The complete book in reading order">{accessible}</section><noscript><style>.book-stage,.edition-colophon{{display:none}}.text-edition{{position:static!important;width:auto!important;height:auto!important;clip-path:none!important;display:grid!important;overflow:visible!important;white-space:normal!important;max-width:650px;padding:24px;gap:24px;margin:40px auto!important}}</style></noscript></div>'''

def build_book(page):
    doc = page('The Three Daily Wins', 'A cinematic digital book in three chapters: Spiritual, Physical and Intellectual. A charcoal hardcover, warm ivory pages and an intentional way of living.', book_body(), BOOK_PATH)
    doc = re.sub(r'<a class="skip"[^>]*>.*?</a>', '', doc)
    doc = re.sub(r'<header class="frame header">.*?</header>', '', doc)
    doc = re.sub(r'<footer class="frame footer">.*?</footer>', '', doc)
    doc = doc.replace('<link rel="stylesheet" href="/group.css">', '<link rel="stylesheet" href="/sony/book.css"><script type="module" src="/sony/book.js"></script>')
    dest = ROOT/'public'/BOOK_PATH.strip('/')/'index.html'
    dest.parent.mkdir(parents=True, exist_ok=True)
    dest.write_text(doc)
    return [BOOK_PATH]
