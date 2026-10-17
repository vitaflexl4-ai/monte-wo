"""Reproducible copies of canonical content; never creates standards or exercise media."""
from pathlib import Path
import json,shutil
R=Path(__file__).resolve().parent.parent
A=R/'apps/mobile';(A/'src/generated').mkdir(parents=True,exist_ok=True)
for source,target in [('content/exercises.json','exercises.json'),('public/strength-catalog.json','standards.json'),('public/ranks.json','ranks.json')]:
 shutil.copyfile(R/source,A/'src/generated'/target)
shutil.copyfile(R/'public/assets/icon-512.png',A/'assets/brand-icon.png')
shutil.copyfile(R/'public/assets/monte-wo-emblem.webp',A/'assets/brand-emblem.webp')
for p in (R/'public/assets/ranks').glob('*.webp'):shutil.copyfile(p,A/'assets/ranks'/p.name)
print('Copied canonical catalog, draft standards, nine badges and existing brand icon.')
