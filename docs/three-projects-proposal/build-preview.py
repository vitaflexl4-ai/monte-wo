"""Isolated approval mockup. Never writes to public/ or production builders."""
from pathlib import Path
import importlib.util,html,hashlib,json
ROOT=Path(__file__).resolve().parents[2]; OUT=Path(__file__).resolve().parent
spec=importlib.util.spec_from_file_location('proposal_book',ROOT/'scripts/sony_book.py');m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
projects=[('I','SPIRITUAL','Bible Verse<br>Memory App','Strengthening faith through Scripture.','Memorizing Scripture, understanding biblical passages, and developing spiritual consistency.','Faith. Scripture. Consistency.'),('II','PHYSICAL','MONTE WO','Strength built through discipline.','Physical discipline, measurable progress, strength development, and the commitment to becoming stronger.','Discipline. Progress. Strength.'),('III','INTELLECTUAL','The Intelligence<br>Project','A deeper understanding of the world.','Expanding knowledge, improving critical thinking, and developing a deeper understanding of the world.','Knowledge. Thought. Understanding.')]
def chapter(i):
 n,dim,name,line,desc,foot=projects[i]
 return f'<div class="printed-page project-{i}"><div class="page-running">THE THREE DAILY WINS <span>CHAPTER {n}</span></div><div class="chapter-mark">{n}</div><div class="chapter-copy"><span class="page-kicker">{dim} / CHAPTER {n}</span><div class="project-emblem emblem-{i}" aria-hidden="true">{["✧","Ⅱ","◎"][i]}</div><div class="project-name">{name}</div><span class="chapter-rule"></span><p class="project-line">{line}</p><p class="project-description">{desc}</p></div><div class="page-bottom"><span>{foot}</span><span>0{i+1}</span></div></div>'
m.chapter=chapter
m.CHAPTERS=[(n,dim,name.replace('<br>',' '),desc,foot) for n,dim,name,line,desc,foot in projects]
m.final_page=lambda:'<div class="printed-page final-page"><div class="page-running">THE THREE DAILY WINS <span>THREE PROJECTS</span></div><span class="final-mark">III</span><div class="final-copy">FAITH.<br>STRENGTH.<br><em>UNDERSTANDING.</em></div><div class="final-rule"></div><div class="page-bottom"><span>SPIRITUAL. PHYSICAL. INTELLECTUAL.</span><span>04</span></div></div>'
body=m.book_body().replace('THE ART OF AN INTENTIONAL DAY','THREE DIMENSIONS / THREE PROJECTS').replace('A WAY OF LIVING','THREE MEANINGFUL PROJECTS').replace('THREE WINS. ONE DAY.','FAITH. STRENGTH. UNDERSTANDING.')
# The still reading edition carries the same proposal; no old lifestyle chapter copy.
body=body.replace('THREE WINS.<br>ONE DAY.<br><em>A BETTER YOU.</em>','FAITH.<br>STRENGTH.<br><em>UNDERSTANDING.</em>')
(OUT/'book.html').write_text('<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>The Three Daily Wins — design proposal only</title><link rel="stylesheet" href="book.css"><link rel="stylesheet" href="proposal.css"><script type="module" src="book.js"></script><main>'+body+'</main></html>')
(OUT/'book.css').write_text((ROOT/'public/sony/book.css').read_text())
s=(ROOT/'public/sony/book.js').read_text().replace('turns:[11200,19200,27200]','turns:[15200,27200,39200]').replace('end:30000','end:42000')
(OUT/'book.js').write_text(s)
hashes={str(p.relative_to(ROOT)):hashlib.sha256(p.read_bytes()).hexdigest() for p in [ROOT/'public/index.html',ROOT/'public/group.css',ROOT/'public/sony/three-daily-wins/index.html',ROOT/'scripts/sony_book.py']}
(OUT/'preservation.json').write_text(json.dumps({'note':'Hashes before isolated design proposal; no production assets changed.','files':hashes},indent=2))
