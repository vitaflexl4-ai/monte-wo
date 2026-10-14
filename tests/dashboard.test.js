// Application foundation (Step 1): static checks on the generated /dashboard/ shell and its sources.
import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync,existsSync} from 'node:fs';import {execFileSync} from 'node:child_process';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');const doc=read('public/dashboard/index.html');const copy=JSON.parse(read('content/dashboard/en.json'));
const NAV=['Dashboard','My Profile','Performance','Standards','Rankings','Exercise Library','Nutrition','Verification','Settings'];

test('Dashboard: application shell has the nine navigation items, nine views and one heading per view',()=>{
 const nav=doc.match(/<nav id="app-nav"[^>]*>(.*?)<\/nav>/s)[1];
 assert.deepEqual([...nav.matchAll(/<a href="#([a-z]+)" data-view-link="\1"[^>]*>.*?<span>([^<]+)<\/span>/g)].map(m=>m[2]),NAV);
 assert.deepEqual(copy.navigation.map(x=>x.label),NAV);
 const views=[...doc.matchAll(/<section class="app-view(?: is-active)?" id="([a-z]+)"/g)].map(m=>m[1]);
 assert.deepEqual(views,copy.navigation.map(x=>x.id));
 assert.equal([...doc.matchAll(/<h1\b/g)].length,views.length);
 assert.equal([...doc.matchAll(/<main\b/g)].length,1);assert.match(doc,/<main id="main" class="app-main" tabindex="-1">/);
 assert.match(doc,/<html lang="en">/);assert.match(doc,/name="viewport"/);assert.match(doc,/<a class="skip" href="#main">/);
 assert.equal([...doc.split('</head>')[0].matchAll(/<title>/g)].length,1);assert.equal([...doc.matchAll(/property="og:title"/g)].length,1);assert.match(doc,/name="robots" content="noindex, nofollow"/);
 // App conventions: bottom tab bar with four primary destinations + "More", no marketing hero, no website footer or hamburger.
 const tabbar=doc.match(/<nav class="app-tabbar" aria-label="Primary">(.*?)<\/nav>/s)[1];
 assert.deepEqual([...tabbar.matchAll(/<a class="app-tab" href="#([a-z]+)" data-view-link="\1"/g)].map(m=>m[1]),copy.tabs.primary);
 assert.deepEqual(copy.tabs.primary,['dashboard','performance','rankings','nutrition']);
 assert.match(tabbar,/<button type="button" class="app-tab app-tab-more" data-drawer-toggle aria-expanded="false" aria-controls="app-sidebar"/);
 assert.ok(!doc.includes('<footer'),'no website footer in the app shell');assert.ok(!doc.includes('app-menu-button')&&!doc.includes('app-site-link'));
 assert.match(doc,/<header class="view-head view-head-app"><div><span class="eyebrow">OVERVIEW<\/span><h1 id="dashboard-title" class="view-title" tabindex="-1">Dashboard<\/h1>/);
 assert.equal([...doc.matchAll(/<ul class="status-strip"[^>]*>(.*?)<\/ul>/gs)][0][1].match(/<li>/g).length,4);
 assert.ok(doc.match(/<ul class="status-strip".*?<\/ul>/s)[0].split('badge').length-1>=4);
 const settings=doc.match(/<section class="app-view" id="settings".*?<\/section>\s*<\/div><\/section>/s)[0];
 for(const href of ['/privacy/','/terms/','/methodology/','/delete-account/','/about/'])assert.ok(settings.includes(`href="${href}"`),'settings links '+href);
});

test('Dashboard: installable as a standalone app with its own manifest and home-screen metadata',()=>{
 const manifest=JSON.parse(read('public/dashboard/manifest.webmanifest'));
 assert.equal(manifest.start_url,'/dashboard/');assert.equal(manifest.scope,'/dashboard/');assert.equal(manifest.display,'standalone');assert.equal(manifest.name,'MONTE WO');
 assert.equal(manifest.theme_color,'#090c13');assert.equal(manifest.background_color,'#090c13');
 for(const i of manifest.icons)assert.ok(existsSync(new URL('../public'+i.src,import.meta.url)),i.src);
 assert.match(doc,/<link rel="manifest" href="\/dashboard\/manifest.webmanifest">/);assert.match(doc,/<meta name="apple-mobile-web-app-capable" content="yes">/);
 assert.match(doc,/<link rel="apple-touch-icon" href="\/assets\/icon-180.png">/);assert.match(doc,/viewport-fit=cover/);
 // The public site keeps its own manifest untouched.
 assert.equal(JSON.parse(read('public/manifest.json')).start_url,'/');
});

test('Dashboard: four independent discipline cards from the real sources, with no rank awarded',()=>{
 const disciplines=JSON.parse(read('content/strength/disciplines.json'));
 const cards=[...doc.matchAll(/<article class="discipline-tile" data-discipline="([a-z]+)">(.*?)<\/article>/gs)];
 assert.deepEqual(cards.map(c=>c[1]),disciplines.map(d=>d.id));
 for(const [,id,body] of cards){
  const rule=JSON.parse(read(`content/strength/${id}-standard-draft-1.json`));
  assert.equal(rule.status,'draft');assert.match(body,/No official rank/);assert.match(body,/DRAFT — NOT OFFICIAL/);assert.match(body,/NOT CONNECTED/);
  assert.ok(body.includes(rule.id));assert.doesNotMatch(body,/data-rank-id|rank-emblem|<progress|\d+%/);
 }
 assert.doesNotMatch(doc,/overall rank:|combined score|total strength|strength score/i);
 assert.match(doc,/No rank transfers between disciplines and no overall rank is calculated/);
});

test('Dashboard: muscle character view exposes four accessible regions with not-connected status',()=>{
 const regions=[...doc.matchAll(/<g class="muscle-region" data-region="([a-z]+)" role="button" tabindex="0" aria-pressed="false" aria-label="([^"]+)">/g)];
 assert.deepEqual(regions.map(r=>r[1]),['chest','core','arms','legs']);
 for(const [,,label] of regions)assert.match(label,/: not connected$/);
 assert.deepEqual([...doc.matchAll(/<button type="button" class="muscle-chip" data-region="([a-z]+)"/g)].map(m=>m[1]),['chest','core','arms','legs']);
 assert.match(doc,/<svg class="muscle-figure" viewBox="0 0 240 480" role="group" aria-label="Anatomical silhouette/);
 for(const r of copy.muscle.regions){assert.equal(r.status,'notConnected');assert.ok(existsSync(new URL('../public'+r.guide+'index.html',import.meta.url)),r.guide)}
 const data=JSON.parse(doc.match(/<script type="application\/json" id="dashboard-data">(.*?)<\/script>/s)[1]);
 assert.equal(data.regions.length,4);assert.ok(data.regions.every(r=>!('rank' in r)&&!('score' in r)));
});

test('Dashboard: food scan & macro logger is a labelled demo without fabricated nutrition values',()=>{
 assert.match(doc,/<input id="food-search" name="q" type="search"/);
 assert.deepEqual([...doc.matchAll(/<button type="button" class="pill" data-food="[a-z-]+" aria-pressed="false">([^<]+)<\/button>/g)].map(m=>m[1]),['Griot','Diri ak Djon Djon','Chicken Breast','Oatmeal']);
 assert.match(doc,/<button type="button" class="button button-scan" id="scan-food">.*?Scan Food via Camera<\/button>/s);
 assert.match(doc,/<dialog id="camera-mockup"/);assert.match(doc,/does not request camera permission, capture images or recognize food/);
 assert.deepEqual([...doc.matchAll(/<div class="macro" data-macro="([a-z]+)">/g)].map(m=>m[1]),['protein','carbs','fats']);
 assert.equal([...doc.matchAll(/<span data-macro-value>—<\/span>/g)].length,3);
 for(const item of copy.food.items){assert.deepEqual(Object.keys(item).sort(),['id','name','origin']);assert.ok(!/\d/.test(JSON.stringify(item)),'demo items carry no numbers')}
 assert.doesNotMatch(doc,/\d+\s*(?:g|kcal|calories)\b/i);
 assert.match(doc,/Food Scan &amp; Macro Logger|FOOD SCAN &amp; MACRO LOGGER/);assert.match(doc,/DEMO/);
 assert.match(read('public/_headers'),/Permissions-Policy: camera=\(\)/);
});

test('Dashboard: client module keeps everything local (no fetch, storage, cookies or camera)',()=>{
 const js=read('public/dashboard.js');
 for(const banned of ['fetch(','XMLHttpRequest','localStorage','sessionStorage','indexedDB','document.cookie','getUserMedia','mediaDevices','navigator.sendBeacon','WebSocket'])assert.ok(!js.includes(banned),banned);
 assert.ok(!js.includes('import '),'self-contained module');
});

test('Dashboard: internal links, fragments and assets resolve; offline shell registered',()=>{
 let checked=0;
 for(const match of doc.matchAll(/(?:href|src)="([^"<>]+)"/g)){
  const value=match[1];if(/^(mailto:|tel:|https?:|data:|#)/.test(value))continue;
  const u=new URL(value,'https://test.invalid/dashboard/');const file='public'+u.pathname+(u.pathname.endsWith('/')?'index.html':'');
  assert.ok(existsSync(new URL('../'+file,import.meta.url)),`/dashboard/ → ${value}`);
  if(u.hash&&file.endsWith('.html'))assert.ok(read(file).includes('id="'+u.hash.slice(1)+'"'),`missing fragment ${value}`);checked++;
 }
 assert.ok(checked>40);assert.ok(!doc.includes('href="/"'),'the shell does not send users back to the marketing homepage');
 for(const hash of doc.matchAll(/href="#([a-z]+)"/g))assert.ok(doc.includes(`id="${hash[1]}"`),hash[1]);
 const sw=read('public/sw.js');const assets=JSON.parse(sw.match(/const DASHBOARD_ASSETS=(\[.*?\]);/)[1]);
 assert.deepEqual(assets,['/dashboard/','/dashboard.css','/dashboard.js']);assert.match(sw,/const ASSETS=\[\.\.\.DASHBOARD_ASSETS,/);assert.match(sw,/montewo-core-v12/);
 for(const a of assets)assert.ok(existsSync(new URL('../public'+a+(a.endsWith('/')?'index.html':''),import.meta.url)),a);
});

test('Dashboard: public website routes, navigation and route count stay unchanged; /app/ links to the preview',()=>{
 const routes=JSON.parse(read('public/website-routes.json'));
 assert.equal(routes.length,49);assert.ok(!routes.includes('/dashboard/'));
 assert.ok(!doc.includes('id="main-nav"'),'the app shell has its own navigation, not the marketing header');
 assert.match(read('public/app/index.html'),/<a href="\/dashboard\/">Preview the dashboard foundation \(demo\) ↗<\/a>/);
 assert.doesNotMatch(read('public/robots.txt'),/dashboard/);
});

test('Dashboard: generator is deterministic (re-running changes nothing)',()=>{
 const before={html:doc,sw:read('public/sw.js')};
 execFileSync('python3',[new URL('../scripts/build_dashboard.py',import.meta.url).pathname]);
 assert.equal(read('public/dashboard/index.html'),before.html);assert.equal(read('public/sw.js'),before.sw);
});
