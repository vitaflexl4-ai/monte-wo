#!/usr/bin/env python3
"""Lightweight shared-engine browser harness. No Expo compilation or production writes.
Full source ZIP is generated in memory to avoid duplicating large archives in workspace.
"""
import hashlib,io,json,mimetypes,os,subprocess,zipfile
from pathlib import Path
from http.server import ThreadingHTTPServer,BaseHTTPRequestHandler
from urllib.parse import urlsplit
ROOT=Path(__file__).resolve().parents[1]
NAMES=subprocess.check_output(['git','ls-files','-z'],cwd=ROOT).decode().split('\0')
PREFIX='MONTE-WO-Workout-Checkpoint-SOURCE/'
try: COMMIT=subprocess.check_output(['git','rev-parse','HEAD'],cwd=ROOT,stderr=subprocess.DEVNULL).decode().strip()
except subprocess.CalledProcessError: COMMIT='uncommitted-snapshot'
buffer=io.BytesIO()
manifest=[]
def archive_file(z,name,data):
 info=zipfile.ZipInfo(name,date_time=(2026,10,16,0,0,0))
 info.compress_type=zipfile.ZIP_DEFLATED
 info.external_attr=0o100644 << 16
 z.writestr(info,data,compresslevel=9)
with zipfile.ZipFile(buffer,'w',zipfile.ZIP_DEFLATED,9) as z:
 for name in sorted(n for n in NAMES if n and n!='SOURCE-FILES.sha256'):
  p=ROOT/name
  if not p.is_file():continue
  if p.is_symlink():raise RuntimeError('Refusing source symlink: '+name)
  if p.suffix in {'.db','.sqlite','.sqlite3','.jks','.keystore','.p12','.pem','.key'}:raise RuntimeError('Refusing private data path: '+name)
  if (p.name.startswith('.env') and p.name!='.env.example') or p.name in {'credentials.json','.dev.vars'}:raise RuntimeError('Refusing secret file: '+name)
  data=p.read_bytes();archive_file(z,PREFIX+name,data);manifest.append(hashlib.sha256(data).hexdigest()+'  '+name)
 archive_file(z,PREFIX+'SOURCE-FILES.sha256','\n'.join(manifest)+'\n')
ZIP=buffer.getvalue();SHA=hashlib.sha256(ZIP).hexdigest()
with zipfile.ZipFile(io.BytesIO(ZIP)) as z:
 assert z.testzip() is None
 for needed in ['apps/mobile/App.tsx','apps/mobile/src/workout-storage.ts','shared/workout-archive.js','shared/workouts.js','server/mobile/api.js','public/exercises/index.html']:
  assert PREFIX+needed in z.namelist(),needed
class Handler(BaseHTTPRequestHandler):
 def do_GET(self):
  path=urlsplit(self.path).path
  if path=='/source.zip':
   self.send_response(200);self.send_header('Content-Type','application/zip');self.send_header('Content-Disposition','attachment; filename="MONTE-WO-Workout-Checkpoint-SOURCE.zip"');self.send_header('Content-Length',str(len(ZIP)));self.end_headers();self.wfile.write(ZIP);return
  if path=='/source-info.json':data=json.dumps({'bytes':len(ZIP),'sha256':SHA,'files':len(manifest),'commit':COMMIT}).encode();kind='application/json'
  else:
   routes={'/':'docs/mobile/workout-checkpoint/preview.html','/catalog.json':'content/exercises.json','/shared/workout-archive.js':'shared/workout-archive.js','/shared/workouts.js':'shared/workouts.js'}
   if path not in routes:self.send_error(404);return
   p=ROOT/routes[path];data=p.read_bytes();kind=mimetypes.guess_type(str(p))[0] or 'application/octet-stream'
  self.send_response(200);self.send_header('Content-Type',kind+'; charset=utf-8');self.send_header('Cache-Control','no-store');self.send_header('X-Content-Type-Options','nosniff');self.send_header('Content-Length',str(len(data)));self.end_headers();self.wfile.write(data)
 def log_message(self,*args):pass
print(json.dumps({'source_zip_bytes':len(ZIP),'sha256':SHA,'source_files':len(manifest),'note':'In-memory archive; no new ZIP stored on disk.'}),flush=True)
ThreadingHTTPServer(('0.0.0.0',int(os.environ.get('PORT','8085'))),Handler).serve_forever()
