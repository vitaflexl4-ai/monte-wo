// MONTE WO — store asset DRAFTS, generated from the real app (public/app/web/, the same Expo code as the Android
// and iOS builds) in Playwright Chromium:
//   * phone screenshots at Google Play and App Store pixel sizes (Welcome, Home, Train, Explore, History, Profile),
//   * the Google Play feature graphic (1024x500) from docs/release/store-assets/feature-graphic.html,
//   * a 1024x1024 app-icon PNG (upscaled from the approved 512 px emblem — replace with a 1024 px master if one exists).
// Output: test-results/store-assets/** (CI artifact "store-assets"). These are drafts captured from the web build in
// phone-sized viewports (no device status bar); final store screenshots should be re-captured on devices.
// Usage: node tests/store-assets.mjs   (needs `npx playwright install chromium`; CI runs it after the smoke test)
import {chromium} from '@playwright/test';
import {createServer} from 'node:http';
import {createReadStream, existsSync, statSync, mkdirSync, writeFileSync, readFileSync} from 'node:fs';
import {join, extname, normalize} from 'node:path';

const REPO=new URL('../',import.meta.url).pathname;
const ROOT=join(REPO,'public/');
const OUT=join(REPO,'test-results/store-assets/');
const TYPES={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json','.webmanifest':'application/manifest+json','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.webp':'image/webp','.ttf':'font/ttf','.woff2':'font/woff2'};
// Serve public/ plus the feature-graphic template under /store-assets/ (it references /assets/* of the site).
const server=createServer((req,res)=>{
 let path=decodeURIComponent(new URL(req.url,'http://x').pathname);
 if(path.endsWith('/'))path+='index.html';
 const file=path.startsWith('/store-assets/')?normalize(join(REPO,'docs/release',path)):normalize(join(ROOT,path));
 const allowed=file.startsWith(ROOT)||file.startsWith(join(REPO,'docs/release/store-assets/'));
 if(!allowed||!existsSync(file)||!statSync(file).isFile()){res.writeHead(404,{'Content-Type':'text/plain'});res.end('not found');return;}
 res.writeHead(200,{'Content-Type':TYPES[extname(file)]||'application/octet-stream','Cache-Control':'no-store'});createReadStream(file).pipe(res);
});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const base=`http://127.0.0.1:${server.address().port}`;
const APP=base+'/app/web/';
mkdirSync(OUT,{recursive:true});

// Store sizes (physical pixels) → CSS viewport × deviceScaleFactor. Play accepts 320–3840 px, 16:9 / 9:16;
// App Store 6.9" = 1320×2868 (iPhone 16 Pro Max), 6.5" = 1284×2778 (iPhone 11 Pro Max / XS Max class).
const SIZES=[
 {dir:'google-play-phone-1080x1920',width:360,height:640,scale:3},
 {dir:'app-store-6.9in-1320x2868',width:440,height:956,scale:3},
 {dir:'app-store-6.5in-1284x2778',width:428,height:926,scale:3},
];
const SCREENS=['welcome','home','train','explore','history','profile'];
const TAB_NAMES={home:'Home',train:'Train',explore:'Explore',history:'History',profile:'Profile'};
const settle=()=>new Promise(r=>setTimeout(r,500));
const annotate=(title,text)=>console.log(`::error title=${title}::${String(text).replace(/\r?\n/g,' ').slice(0,900)}`);
const manifest={generatedAt:new Date().toISOString(),source:'public/app/web/ (apps/mobile web export) + docs/release/store-assets/feature-graphic.html',draft:true,files:[]};
const browser=await chromium.launch();
let step='start';
try{
 for(const size of SIZES){
  step=`screenshots ${size.dir}`;
  const dir=join(OUT,size.dir);mkdirSync(dir,{recursive:true});
  const ctx=await browser.newContext({viewport:{width:size.width,height:size.height},isMobile:true,hasTouch:true,deviceScaleFactor:size.scale});
  const page=await ctx.newPage();
  await page.goto(APP,{waitUntil:'load'});
  await page.waitForFunction(()=>document.getElementById('root')?.childElementCount>0,null,{timeout:45000});
  await page.waitForFunction(()=>!document.getElementById('mw-splash'),null,{timeout:10000});
  await page.getByText('Your Strength.',{exact:false}).first().waitFor({timeout:20000});
  await settle();
  const save=async name=>{const file=join(dir,`${String(SCREENS.indexOf(name)+1).padStart(2,'0')}-${name}.png`);await page.screenshot({path:file});
   manifest.files.push({file:file.slice(REPO.length),pixels:`${size.width*size.scale}x${size.height*size.scale}`,screen:name});};
  await save('welcome');
  await page.getByRole('button',{name:'Get Started',exact:true}).click();
  const tabOf=name=>page.getByRole('tab',{name:new RegExp('^'+name)});
  for(const t of Object.values(TAB_NAMES))await tabOf(t).waitFor({timeout:20000});
  await settle();await save('home');
  for(const screen of ['train','explore','history','profile']){await tabOf(TAB_NAMES[screen]).click();await settle();await save(screen);}
  await ctx.close();
 }
 // Feature graphic 1024×500 @1x (Play requires exactly 1024×500, PNG or JPEG, no alpha needed).
 step='feature graphic';
 {
  const ctx=await browser.newContext({viewport:{width:1024,height:500},deviceScaleFactor:1});
  const page=await ctx.newPage();
  const res=await page.goto(base+'/store-assets/feature-graphic.html',{waitUntil:'load'});
  if(!res||res.status()!==200)throw new Error('feature-graphic.html not served');
  await page.evaluate(()=>document.fonts.ready);await settle();
  const file=join(OUT,'google-play-feature-graphic-1024x500.png');
  await page.screenshot({path:file,clip:{x:0,y:0,width:1024,height:500},omitBackground:false});
  manifest.files.push({file:file.slice(REPO.length),pixels:'1024x500',screen:'feature graphic'});
  await ctx.close();
 }
 // App icon 1024×1024 (App Store / Play listing). Upscaled from the approved 512 px emblem (brand-icon.png).
 step='icon 1024';
 {
  const ctx=await browser.newContext({viewport:{width:1024,height:1024},deviceScaleFactor:1});
  const page=await ctx.newPage();
  await page.setContent(`<html><body style="margin:0;background:#090c13"><img src="${base}/assets/icon-512.png" style="display:block;width:1024px;height:1024px;image-rendering:auto"></body></html>`,{waitUntil:'load'});
  await settle();
  const file=join(OUT,'app-icon-1024x1024-upscaled-from-512.png');
  await page.screenshot({path:file,clip:{x:0,y:0,width:1024,height:1024}});
  manifest.files.push({file:file.slice(REPO.length),pixels:'1024x1024',screen:'app icon (upscaled from the 512 px approved emblem)'});
  await ctx.close();
 }
 writeFileSync(join(OUT,'README.txt'),[
  'MONTE WO — store asset DRAFTS (generated by tests/store-assets.mjs)',
  '',
  'Screenshots: captured from the web build of the SAME app (public/app/web/) in phone-sized viewports at store pixel sizes.',
  'No device status bar is shown. Re-capture on real devices / the iOS Simulator before submission if the stores or the owner require it.',
  'Feature graphic: docs/release/store-assets/feature-graphic.html rendered at 1024x500 (approved emblem + Inter font, no invented UI).',
  'App icon: 1024x1024 upscaled from the approved 512 px emblem (public/assets/icon-512.png); replace with a 1024 px master if available.',
  'Nothing here is uploaded anywhere automatically. Store copy drafts: docs/release/PRIVACY_AND_STORE_CHECKLIST.md section 4.',
  '',
  ...manifest.files.map(f=>`${f.pixels.padEnd(10)} ${f.file}`),
 ].join('\n')+'\n');
 writeFileSync(join(OUT,'manifest.json'),JSON.stringify(manifest,null,2)+'\n');
 console.log(`store assets: ${manifest.files.length} files → test-results/store-assets/`);
 for(const f of manifest.files)console.log(`  ${f.pixels.padEnd(10)} ${f.file} (${statSync(join(REPO,f.file)).size} bytes)`);
}catch(e){
 annotate('store-assets failed at step: '+step,e.message);
 process.exitCode=1;
}finally{
 await browser.close();server.close();
}
