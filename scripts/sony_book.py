"""One passive personal experience: an automatically opening editorial book.
No inputs, personal data, storage, task tracking, publication feed or CMS connection.
"""
from pathlib import Path
import html
import re
ROOT = Path(__file__).resolve().parent.parent
BOOK_PATH = '/sony/three-daily-wins/'
E = lambda s: html.escape(str(s), quote=True)
PROJECTS = [('I', 'SPIRITUAL — BIBLICAL', 'Scripture<br>& reflection', 'Strengthening faith through Scripture.', 'Strengthening faith through Scripture, biblical understanding, memorization, and spiritual consistency.', 'Faith. Scripture. Consistency.'), ('II', 'PHYSICAL', 'Physical<br>discipline', 'Strength built through discipline.', 'Physical discipline, strength development, measurable progress, and personal growth.', 'Discipline. Progress. Strength.'), ('III', 'INTELLECTUAL', 'Learning<br>& understanding', 'A deeper understanding of the world.', 'Knowledge, critical thinking, research, strategic understanding, and intellectual development.', 'Knowledge. Thought. Understanding.')]
ENCOURAGEMENT = "Every day gives us another opportunity to become better. Strengthen your spirit through Scripture, discipline your body through physical training, and sharpen your mind through learning and understanding. When we pursue these three daily wins with intention, we begin the day with a better attitude, a clearer purpose, and a stronger foundation to live out the greatest commandment: to love God with all our heart, soul, mind, and strength, and to love our neighbor as ourselves."
CHAPTERS = [(n, dimension, name.replace("<br>", " "), description, closing)
            for n, dimension, name, line, description, closing in PROJECTS]


def resource_hub():
    return '<section id="personal-resources" class="exp-hub frame" aria-labelledby="resources-title"><p class="exp-eyebrow">A PERSONAL EXPERIENCE</p><h2 id="resources-title">THE THREE DAILY WINS</h2><a class="book-door" href="/sony/three-daily-wins/"><span class="door-monogram" aria-hidden="true">III</span><span><span class="exp-eyebrow">SPIRIT. BODY. MIND.</span><h3>A way of living.<br>A book brought to life.</h3><p>A quiet, cinematic edition in three chapters.</p></span><span class="door-arrow" aria-hidden="true">↗</span></a></section><!-- end-personal-resources -->'

def cover():
    return '<div class="cover-frame"><span class="cover-imprint">THREE DAILY COMMITMENTS</span><span class="cover-seal">III</span><div class="cover-title">THE THREE<br>DAILY<br><em>WINS.</em></div><span class="cover-rule"></span><span class="cover-subtitle">SPIRIT · BODY · MIND</span></div>'

def chapter(i):
 n,dim,name,line,desc,foot=PROJECTS[i]
 status = ''
 return f'<div class="printed-page project-{i}"><div class="page-running">THE THREE DAILY WINS <span>CHAPTER {n}</span></div><div class="chapter-mark">{n}</div><div class="chapter-copy"><span class="page-kicker">{dim} / CHAPTER {n}</span><div class="project-emblem mystery-visual emblem-{i}" aria-hidden="true">{["✧","Ⅱ","◎"][i]}</div><div class="project-name">{name.replace("&", "&amp;")}</div><span class="chapter-rule"></span>{status}<p class="project-description">{desc}</p></div><div class="page-bottom"><span>{foot}</span><span>0{i+1}</span></div></div>'

def final_page():
    return '<div class="printed-page final-page"><div class="page-running">THE THREE DAILY WINS <span>THREE DAILY COMMITMENTS</span></div><span class="final-mark">III</span><div class="final-copy">THREE WINS.<br>ONE DAY.<br><em>A BETTER YOU.</em></div><div class="final-rule"></div><div class="page-bottom"><span>SPIRITUAL. PHYSICAL. INTELLECTUAL.</span><span>04</span></div></div>'

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
        status = ''
        accessible += f'<section class="still-page"><span class="page-kicker">CHAPTER {numeral}</span><h2>{numeral}. {title}</h2>{status}<span class="chapter-rule"></span><p class="chapter-line">{E(line)}</p><p>{words}</p><p class="still-closing">{closing}</p></section>'
    accessible += '<section class="still-page still-final"><h2>THREE WINS.<br>ONE DAY.<br><em>A BETTER YOU.</em></h2><p>SPIRIT. BODY. MIND.</p></section>'
    return f'''<div class="book-edition"><header class="edition-heading"><nav class="book-return-nav" aria-label="Return navigation"><a href="/sony/">MEET SONY</a><a href="/#ventures">VENTURES</a></nav><span>SPIRIT · BODY · MIND</span></header><h1 class="sr-only">THE THREE DAILY WINS.</h1><div class="book-stage" aria-hidden="true"><div class="ambient-light"></div><div class="table-shadow"></div><div class="book"><div class="back-board"></div><div class="paper-block"></div><div class="fixed-page">{final_page()}</div>{''.join(segmented_sheet(i) for i in reversed(range(3)))}<div class="hardcover"><div class="cover-face cover-front">{cover()}</div><div class="cover-face cover-inside"><span class="endpaper-line"></span><span class="endpaper-mark">III</span></div><div class="cover-thickness"></div></div></div></div><div class="edition-colophon" aria-hidden="true"><span>SPIRIT. BODY. MIND.</span><span>FAITH. STRENGTH. UNDERSTANDING.</span></div><section class="text-edition" aria-label="The complete book in reading order">{accessible}</section><section class="win-encouragement" aria-labelledby="encouragement-title"><span class="page-kicker">ENCOURAGEMENT</span><h2 id="encouragement-title">WIN THE DAY</h2><p>{E(ENCOURAGEMENT)}</p><p class="biblical-reference">Mark 12:30–31</p></section><noscript><style>.book-stage,.edition-colophon{{display:none}}.text-edition{{position:static!important;width:auto!important;height:auto!important;clip-path:none!important;display:grid!important;overflow:visible!important;white-space:normal!important;max-width:650px;padding:24px;gap:24px;margin:40px auto!important}}</style></noscript></div>'''

def build_book(page):
    doc = page('The Three Daily Wins', 'Three daily commitments to Scripture, physical discipline, and learning. A personal reflection on spiritual, physical, and intellectual development.', book_body(), BOOK_PATH)
    doc = re.sub(r'<a class="skip"[^>]*>.*?</a>', '', doc)
    doc = re.sub(r'<header class="frame header">.*?</header>', '', doc)
    doc = re.sub(r'<footer class="frame footer">.*?</footer>', '', doc)
    doc = doc.replace('<link rel="stylesheet" href="/group.css">', '<link rel="stylesheet" href="/sony/book.css"><script type="module" src="/sony/book.js"></script>')
    dest = ROOT/'public'/BOOK_PATH.strip('/')/'index.html'
    dest.parent.mkdir(parents=True, exist_ok=True)
    dest.write_text(doc)
    return [BOOK_PATH]
