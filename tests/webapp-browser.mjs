// MONTE WO web app (public/app/web/ — the Expo/React Native app exported for the browser): does it actually
// run? Serves public/ from a throwaway static server, loads /app/web/ in Playwright Chromium on a phone-sized
// and a desktop viewport, walks Welcome → Get Started → the five tabs, checks the manifest, waits for the
// service worker and reloads OFFLINE. No backend is running: the app must stay honest (no fake account state).
// Needs a Playwright Chromium (`npx playwright install chromium`); CI runs it, the sandbox may not have it.
// Failures are also emitted as GitHub `::error` annotations because job logs are not always reachable.
import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {createReadStream, existsSync, statSync, mkdirSync} from 'node:fs';
import {join, extname, normalize} from 'node:path';

const ROOT=new URL('../public/',import.meta.url).pathname;
const TYPES={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.mjs':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json','.webmanifest':'application/manifest+json','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.webp':'image/webp','.woff2':'font/woff2','.ico':'image/x-icon','.txt':'text/plain'};
const server=createServer((req,res)=>{
 let path=decodeURIComponent(new URL(req.url,'http://x').pathname);
 if(path.endsWith('/'))path+='index.html';
 const file=normalize(join(ROOT,path));
 if(!file.startsWith(ROOT)||!existsSync(file)||!statSync(file).isFile()){res.writeHead(404,{'Content-Type':'text/plain'});res.end('not found');return;}
 res.writeHead(200,{'Content-Type':TYPES[extname(file)]||'application/octet-stream','Cache-Control':'no-store'});createReadStream(file).pipe(res);
});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const base=`http://127.0.0.1:${server.address().port}`;
const APP=base+'/app/web/';
mkdirSync(new URL('../test-results/',import.meta.url),{recursive:true});
const shot=name=>new URL('../test-results/webapp-'+name+'.png',import.meta.url).pathname;
const browser=await chromium.launch();
const problems=[];let step='start';
const watch=page=>{page.on('pageerror',e=>problems.push('pageerror: '+e.message));page.on('console',m=>{if(m.type()==='error')problems.push('console: '+m.text())});
 page.on('response',r=>{const u=new URL(r.url());if(u.origin===base&&r.status()>=400&&!u.pathname.startsWith('/api/'))problems.push(`${r.status()} ${u.pathname}`)});};
const settle=()=>new Promise(r=>setTimeout(r,400));
const withTimeout=(promise,ms,what)=>Promise.race([promise,new Promise((_,reject)=>setTimeout(()=>reject(new Error(what+' timed out after '+ms+'ms')),ms))]);
const annotate=(title,text)=>console.log(`::error title=${title}::${String(text).replace(/\r?\n/g,' ').slice(0,900)}`);
try{
 // 1. Phone-sized: Welcome screen renders from the real bundle, splash disappears, no errors.
 step='mobile: load';
 const mobile=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,deviceScaleFactor:2});
 const page=await mobile.newPage();watch(page);
 const res=await page.goto(APP,{waitUntil:'load'});assert.equal(res.status(),200);
 step='mobile: app mounts';
 await page.waitForFunction(()=>document.getElementById('root')?.childElementCount>0,null,{timeout:45000});
 await page.waitForFunction(()=>!document.getElementById('mw-splash'),null,{timeout:10000});
 // React Navigation updates document.title with the focused screen; the HTML title itself is "MONTE WO".
 assert.match(await page.title(),/MONTE WO|Monte Wo|Welcome/i);
 step='mobile: welcome screen';
 await page.getByText('Your Strength.',{exact:false}).first().waitFor({timeout:20000});
 await page.getByText('Explore the app without an account.').waitFor();
 await page.screenshot({path:shot('welcome')});
 // 2. Get Started → the five tabs of the same app the Android build ships (bottom tabs render role="tab").
 step='mobile: get started';
 await page.getByRole('button',{name:'Get Started',exact:true}).click();
 const tabs=['Home','Train','Library','History','Account'];
 const tabOf=name=>page.getByRole('tab',{name:new RegExp('^'+name)});
 for(const tab of tabs)await tabOf(tab).waitFor({timeout:20000});
 await page.screenshot({path:shot('home')});
 for(const tab of tabs.slice(1)){step='mobile: tab '+tab;await tabOf(tab).click();await settle();
  assert.equal(await tabOf(tab).getAttribute('aria-selected'),'true',tab+' tab becomes selected');}
 await page.screenshot({path:shot('account')});
 // No backend here: nothing may look signed in or synced.
 const text=await page.evaluate(()=>document.body.innerText);
 assert.doesNotMatch(text,/Signed in as|Verified rank|Official rank awarded/i,'no fabricated account or rank state');
 // 3. Installability inputs: manifest and icons resolve from the app document.
 step='mobile: manifest';
 const manifest=await page.request.get(APP+'manifest.webmanifest');assert.equal(manifest.status(),200);
 const m=await manifest.json();assert.equal(m.display,'standalone');assert.equal(m.start_url,'./');
 for(const icon of m.icons)assert.equal((await page.request.get(base+icon.src)).status(),200,icon.src);
 const linked=await page.evaluate(()=>document.querySelector('link[rel="manifest"]')?.href);assert.equal(linked,APP+'manifest.webmanifest');
 // 4. Service worker scoped to the app directory becomes active, then the app opens OFFLINE.
 step='mobile: service worker';
 const scope=await withTimeout(page.evaluate(async()=>{const reg=await navigator.serviceWorker.ready;return reg.scope}),30000,'navigator.serviceWorker.ready');
 assert.equal(scope,APP,'worker scope = the app directory only');
 await page.waitForFunction(()=>navigator.serviceWorker.controller!==null,null,{timeout:15000}).catch(()=>{});
 step='mobile: offline reload';
 await mobile.setOffline(true);
 const offline=await page.goto(APP,{waitUntil:'load'});assert.ok(offline&&offline.status()===200,'offline navigation served by the app worker');
 await page.waitForFunction(()=>document.getElementById('root')?.childElementCount>0,null,{timeout:45000});
 await page.getByText('Your Strength.',{exact:false}).first().waitFor({timeout:20000});
 await page.screenshot({path:shot('offline')});
 await mobile.setOffline(false);
 await mobile.close();
 // 5. Desktop viewport: same bundle, still renders.
 step='desktop: load';
 const desktop=await browser.newContext({viewport:{width:1366,height:800}});
 const wide=await desktop.newPage();watch(wide);
 assert.equal((await wide.goto(APP,{waitUntil:'load'})).status(),200);
 await wide.waitForFunction(()=>document.getElementById('root')?.childElementCount>0,null,{timeout:45000});
 await wide.getByRole('button',{name:'Get Started',exact:true}).waitFor({timeout:20000});
 await wide.screenshot({path:shot('desktop')});
 await desktop.close();
 // Offline reloads legitimately log failed fetches for /api/* and out-of-scope icons; anything else is a defect.
 step='defects';
 const defects=problems.filter(p=>!/\/api\/|net::ERR_INTERNET_DISCONNECTED|Failed to load resource/.test(p));
 assert.deepEqual(defects,[],'no page errors, console errors or broken same-origin files');
 console.log('Web app browser smoke test passed: welcome → tabs, manifest + icons, worker scope '+scope+', offline reload, desktop. Screenshots in test-results/webapp-*.png');
}catch(error){
 annotate('web app browser test failed at step: '+step,error && error.message || error);
 if(problems.length)annotate('web app browser test — page problems',problems.slice(0,12).join(' | '));
 throw error;
}finally{await browser.close();server.close();}
