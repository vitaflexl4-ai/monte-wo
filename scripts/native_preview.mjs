#!/usr/bin/env node
// Preview the packaged app bundle (build/native) the way the Capacitor shells serve it.
//
// Emulates the routing rules of Capacitor's local asset servers (Android WebViewLocalServer
// in html5mode, iOS Router): the root and EVERY extension-less path return the root
// index.html (the MONTE WO app shell); files are served by exact path. No service worker,
// no API: `/api/*` answers 404 exactly as it would inside the native app without a configured
// API origin. Zero dependencies.
//
//   npm run build && npm run build:native && node scripts/native_preview.mjs   # PORT=3000 default
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..','build','native');
const port=Number(process.env.PORT||3000);
const host=process.env.HOST||'0.0.0.0';
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.mjs':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8','.webmanifest':'application/manifest+json','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.gif':'image/gif','.webp':'image/webp','.ico':'image/x-icon','.woff2':'font/woff2','.woff':'font/woff','.txt':'text/plain; charset=utf-8','.mp4':'video/mp4','.xml':'application/xml'};

if(!fs.existsSync(path.join(root,'index.html'))){console.error('build/native/index.html missing — run `npm run build && npm run build:native` first');process.exit(1)}

function resolve(urlPath){
 let p;try{p=decodeURIComponent(urlPath.split('?')[0].split('#')[0])}catch{return null}
 if(p.startsWith('/api/'))return null;
 const file=path.normalize(path.join(root,p));
 if(!file.startsWith(root))return null;
 const last=p.split('/').pop();
 // Capacitor rule: "/" or a last segment without a "." -> root index.html (app shell).
 if(p==='/'||!last.includes('.'))return path.join(root,'index.html');
 return fs.existsSync(file)&&fs.statSync(file).isFile()?file:null;
}

http.createServer((req,res)=>{
 const file=resolve(req.url||'/');
 if(!file){res.writeHead(404,{'Content-Type':'text/plain; charset=utf-8','Cache-Control':'no-store'});res.end('Not found (native bundle has no such file; /api/* is not available inside the packaged app)');return}
 const type=types[path.extname(file).toLowerCase()]||'application/octet-stream';
 res.writeHead(200,{'Content-Type':type,'Cache-Control':'no-store','X-Monte-Wo-Preview':'native-bundle'});
 fs.createReadStream(file).pipe(res);
}).listen(port,host,()=>console.log(`MONTE WO native bundle preview: http://${host}:${port}/  (root = app shell, Capacitor routing emulated)`));
