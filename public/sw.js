// Monte Wo v0.3 — caches the website and all free tools; NOT a workout sync engine.
const CORE='montewo-core-v12-dashboard-foundation';
const MEDIA='montewo-media-v1';
const LIBRARY_ASSETS=["/library.css", "/library.js", "/library-routes.json", "/exercises/", "/exercises/muscle/chest/", "/exercises/muscle/back/", "/exercises/muscle/shoulders/", "/exercises/muscle/arms/", "/exercises/muscle/legs/", "/exercises/muscle/core/", "/exercises/muscle/cardio/", "/exercises/bench-press/", "/exercises/push-up/", "/exercises/one-arm-dumbbell-row/", "/exercises/lat-pulldown/", "/exercises/overhead-press/", "/exercises/lateral-raise/", "/exercises/dumbbell-curl/", "/exercises/triceps-pushdown/", "/exercises/back-squat/", "/exercises/romanian-deadlift/", "/exercises/dead-bug/", "/exercises/forearm-plank/", "/exercises/brisk-walk/", "/exercises/stationary-bike/"];
const LAB_ASSETS=["/strength-lab/", "/lab.css", "/lab.js", "/lab-math.js", "/lab-copy.js", "/strength-lab/one-rep-max/", "/strength-lab/percentages/", "/strength-lab/plates/", "/strength-lab/converter/", "/strength-lab/warm-up/"];
const WEBSITE_ASSETS=["/website.js", "/website.css", "/website-copy.js", "/exercises/standards/", "/404.html"];
const DASHBOARD_ASSETS=["/dashboard/", "/dashboard.css", "/dashboard.js"];
const ASSETS=[...DASHBOARD_ASSETS,...WEBSITE_ASSETS,...LAB_ASSETS,'/strength/','/strength/admin/','/methodology/','/strength.js','/strength.css','/strength-catalog.json',...LIBRARY_ASSETS,'/','/index.html','/style.css','/fonts.css','/app.js','/scoring.js','/ranks.js','/ranks.json',...['debitan','bati','solid','fo','avanse','met','chanpyon','titan','lejand'].map(id=>`/assets/ranks/${id}.webp`),'/translations.js','/site.js','/launch.css','/tool-math.js','/tools.js','/tools.css','/tools/','/tools/one-rep-max/','/tools/plates/','/tools/protein/','/tools/tdee/','/tools/macros/','/tools/body-fat/','/app/','/about/','/contact/','/faq/','/privacy/','/terms/','/delete-account/','/strength-ranks/','/waitlist/','/media.json','/manifest.json','/assets/icon.svg','/assets/icon-32.png','/assets/icon-180.png','/assets/monte-wo-emblem.webp','/assets/monte-wo-logo.webp','/assets/icon-192.png','/assets/icon-512.png',...['400','600','800','900'].map(w=>`/assets/inter-${w}.ttf`)];
self.addEventListener('install',event=>{event.waitUntil(caches.open(CORE).then(cache=>cache.addAll(ASSETS)).then(()=>self.skipWaiting()))});
self.addEventListener('activate',event=>{event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>(k.startsWith('montewo-')||k.startsWith('vitaflex-'))&&k!==CORE&&k!==MEDIA).map(k=>caches.delete(k)))).then(()=>self.clients.claim()))});
self.addEventListener('fetch',event=>{
 const {request}=event;const url=new URL(request.url);
 if(request.method!=='GET'||url.origin!==self.location.origin)return;
 const isMedia=url.pathname.startsWith('/api/gifs/')||url.pathname.startsWith('/assets/exercises/');
 if(url.pathname.startsWith('/api/')&&!isMedia)return;
 if(!isMedia&&!ASSETS.includes(url.pathname)&&request.mode!=='navigate')return;
 event.respondWith((async()=>{
  const cache=await caches.open(isMedia?MEDIA:CORE);
  const cached=await cache.match(request);
  if(isMedia&&cached)return cached;
  try{
   const response=await fetch(request);
   if(response.ok){await cache.put(request,response.clone());if(isMedia){const keys=await cache.keys();if(keys.length>30)await cache.delete(keys[0]);}}
   return response;
  }catch{
   if(cached)return cached;
   if(request.mode==='navigate'){const shell=await cache.match('/');if(shell)return shell;}
   return new Response('Not available offline. Visit this resource while online first.',{status:503,headers:{'Content-Type':'text/plain'}});
  }
 })());
});
