"""Lightweight targeted HTML update. Never invokes the full website/mobile build."""
from pathlib import Path
import json,re
from exercise_video_template import ROOT,PACKS,loop_block
catalog=json.loads((ROOT/'content/exercises.json').read_text());fixed=[];unmatched=[]
for item in catalog['exercises']:
 path=ROOT/'public/exercises'/item['id']/'index.html'
 text=path.read_text()
 text,n=re.subn(r'<div class="guide-media\b.*?(?=<section class="guide-steps")',lambda _:loop_block(item['id']),text,count=1,flags=re.S)
 assert n==1, str(path)
 if '/exercise-video.js' not in text:text=text.replace('</head>','<script src="/exercise-video.js" type="module"></script></head>')
 path.write_text(text)
 (fixed if item['id'] in PACKS else unmatched).append(item['id'])
print(json.dumps({'loopPages':fixed,'noExactVideo':unmatched},indent=2))
