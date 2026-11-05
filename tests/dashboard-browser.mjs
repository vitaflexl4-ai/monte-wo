// Application foundation (Step 1): behaviour checks for the /dashboard/ shell against the local server on :8080.
import {chromium} from '@playwright/test';import assert from 'node:assert/strict';
const browser=await chromium.launch(),context=await browser.newContext({viewport:{width:1440,height:1000}});const page=await context.newPage(),errors=[],writes=[],apiCalls=[];
page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push('console: '+m.text())});page.on('request',r=>{if(r.method()!=='GET')writes.push(r.url());if(r.url().includes('/api/'))apiCalls.push(r.url())});
// The page must never ask for a camera: count any getUserMedia call before scripts run.
await context.addInitScript(()=>{window.__cameraRequests=0;const stub=()=>{window.__cameraRequests++;return Promise.reject(new Error('blocked by test'))};if(navigator.mediaDevices)navigator.mediaDevices.getUserMedia=stub;else Object.defineProperty(navigator,'mediaDevices',{value:{getUserMedia:stub}})});
const URL_='http://localhost:8080/dashboard/';const VIEWS=['dashboard','profile','performance','standards','rankings','library','nutrition','verification','settings'];
const activeView=()=>page.evaluate(()=>[...document.querySelectorAll('.app-view')].filter(v=>getComputedStyle(v).display!=='none').map(v=>v.id));const shown=async id=>{await page.locator(`#${id}.is-active`).waitFor({timeout:3000});return activeView()};
const region=(id)=>page.locator(`.muscle-region[data-region="${id}"] path`).first();

// 1. Shell renders with the nine navigation items, one visible heading, honest labels.
const res=await page.goto(URL_);assert.equal(res.status(),200);await page.evaluate(()=>document.fonts.ready);
assert.deepEqual(await page.locator('#app-nav a span').allTextContents(),['Dashboard','My Profile','Performance','Standards','Rankings','Exercise Library','Nutrition','Verification','Settings']);
assert.deepEqual(await activeView(),['dashboard']);assert.equal(await page.locator('h1:visible').count(),1);assert.equal(await page.title(),'Dashboard | MONTE WO');
assert.equal(await page.locator('.app-tabbar').isVisible(),false,'desktop shows the sidebar, not the tab bar');assert.equal(await page.locator('#app-sidebar').isVisible(),true);
assert.deepEqual(await page.locator('.status-strip .badge').allTextContents(),['NOT CONNECTED','DRAFT — NOT OFFICIAL','NOT CONNECTED','NOT CONNECTED']);assert.doesNotMatch(await page.locator('.view-head-app').textContent(),/\d/);
assert.equal(await page.locator('.discipline-tile').count(),4);assert.equal(await page.locator('.discipline-tile:has-text("No official rank")').count(),4);
assert.equal(await page.locator('.app-chip:visible:has-text("Athlete · Not signed in")').count(),2,'topbar + sidebar account chips');

// 2. Navigation: every item switches the view, updates hash, aria-current, title, crumb and moves focus to the heading.
for(const id of VIEWS){await page.locator(`#app-nav a[data-view-link="${id}"]`).click();assert.deepEqual(await shown(id),[id]);assert.equal(await page.evaluate(()=>location.hash),'#'+id);
 assert.deepEqual(await page.locator('#app-nav a[aria-current="page"]').evaluateAll(a=>a.map(x=>x.dataset.viewLink)),[id]);assert.equal(await page.locator('h1:visible').count(),1);
 assert.equal(await page.locator('#app-crumb-view').textContent(),await page.locator(`#${id}`).getAttribute('data-title'),'top-bar crumb follows the view');
 assert.equal(await page.evaluate(()=>document.activeElement.classList.contains('view-title')),true,'focus moves to the view heading ('+id+')');
 if(id!=='dashboard'){assert.match(await page.title(),/ \| MONTE WO$/);assert.equal(await page.locator(`#${id} .view-head .badge-placeholder:has-text("NOT IMPLEMENTED IN STEP 1")`).count()>0,true,id+' is an honest placeholder')}}
// Browser back/forward and unknown hashes are handled.
await page.goBack();assert.deepEqual(await shown('verification'),['verification']);await page.goto(URL_+'#does-not-exist');assert.deepEqual(await activeView(),['dashboard']);await page.goto(URL_+'#rankings');assert.deepEqual(await activeView(),['rankings']);
assert.equal(await page.locator('#rankings .app-rank-tile').count(),9);assert.deepEqual(await page.locator('#rankings .app-rank-tile b').allTextContents(),['Debitan','Bati','Solid','Fò','Avanse','Mèt','Chanpyon','Titan','Lejand']);
assert.equal(await page.evaluate(async()=>{const imgs=[...document.querySelectorAll('#rankings img')];await Promise.all(imgs.map(i=>i.decode()));return imgs.filter(i=>!i.naturalWidth).length}),0,'all rank emblems decode');

// 3. Muscle character view: hover preview, click selection, keyboard activation, chips and status badges.
await page.goto(URL_);await page.evaluate(()=>document.fonts.ready);
assert.match(await page.locator('#muscle-preview').textContent(),/Hover or select a region/i);
await region('legs').hover();assert.equal((await page.locator('#muscle-preview').textContent()).trim(),'Legs · NOT CONNECTED');assert.equal(await page.locator('.muscle-region.is-hover[data-region="legs"]').count(),1);
await page.mouse.move(5,5);assert.equal(await page.locator('.muscle-region.is-hover').count(),0);
await region('chest').click();assert.equal(await page.locator('.muscle-region[aria-pressed="true"]').getAttribute('data-region'),'chest');assert.equal(await page.locator('#muscle-detail-title').textContent(),'Chest');assert.equal(await page.locator('#muscle-detail-badge').textContent(),'NOT CONNECTED');assert.equal(await page.locator('#muscle-detail-disciplines').textContent(),'Bench Press');assert.equal(await page.locator('#muscle-detail-guide').getAttribute('href'),'/exercises/muscle/chest/');
await page.locator('.muscle-chip[data-region="legs"]').click();assert.equal(await page.locator('.muscle-region[aria-pressed="true"]').getAttribute('data-region'),'legs');assert.equal(await page.locator('#muscle-detail-disciplines').textContent(),'Squat · Deadlift');assert.equal(await page.locator('.muscle-chip[aria-pressed="true"]').count(),1);
await page.locator('.muscle-region[data-region="core"]').focus();await page.keyboard.press('Enter');assert.equal(await page.locator('#muscle-detail-title').textContent(),'Core');assert.match(await page.locator('#muscle-detail-disciplines').textContent(),/None — supports all four disciplines/);
await page.locator('.muscle-region[data-region="arms"]').focus();await page.keyboard.press(' ');assert.equal(await page.locator('#muscle-detail-title').textContent(),'Arms');assert.equal(await page.locator('#muscle-detail-disciplines').textContent(),'Biceps Curl');
await region('arms').click();assert.equal(await page.locator('.muscle-region[aria-pressed="true"]').count(),0,'clicking the selected region deselects it');assert.match(await page.locator('#muscle-detail-title').textContent(),/Select a region/);
assert.equal(await page.locator('.muscle-panel').textContent().then(t=>/\b(Debitan|Bati|Solid|Fò|Avanse|Mèt|Chanpyon|Titan|Lejand)\b/.test(t)),false,'no rank names appear in the muscle panel');

// 4. Food scan & macro logger: search, pills, demo log and macro totals that stay disconnected.
const results=()=>page.locator('#food-results .food-item strong').allTextContents();
assert.deepEqual(await results(),[]);assert.match(await page.locator('#food-results').textContent(),/Type a food name/);
await page.locator('#food-search').fill('chick');assert.deepEqual(await results(),['Chicken Breast']);
await page.locator('#food-search').fill('zzz');assert.match(await page.locator('#food-results').textContent(),/No demo match/);
await page.locator('.pill[data-food="griot"]').click();assert.equal(await page.locator('#food-search').inputValue(),'Griot');assert.deepEqual(await results(),['Griot']);assert.equal(await page.locator('.pill[aria-pressed="true"]').count(),1);
await page.locator('.pill[data-food="griot"]').click();assert.equal(await page.locator('.pill[aria-pressed="true"]').count(),0);assert.equal(await page.locator('#food-search').inputValue(),'');
await page.locator('.pill[data-food="diri-djon-djon"]').click();await page.locator('[data-add="diri-djon-djon"]').click();await page.locator('.pill[data-food="oatmeal"]').click();await page.locator('[data-add="oatmeal"]').click();
assert.deepEqual(await page.locator('#food-log li strong').allTextContents(),['Diri ak Djon Djon','Oatmeal']);assert.equal(await page.locator('#food-log-count').textContent(),'2 items');
assert.deepEqual(await page.locator('[data-macro-value]').allTextContents(),['—','—','—'],'macro totals never invent numbers');assert.equal(await page.locator('.macro .badge:has-text("NOT CONNECTED")').count(),3);
await page.locator('#food-log [data-remove]').first().click();assert.deepEqual(await page.locator('#food-log li strong').allTextContents(),['Oatmeal']);assert.equal(await page.locator('#food-log-count').textContent(),'1 item');
assert.equal(await page.locator('.food-panel .badge:has-text("DEMO")').count()>0,true);assert.doesNotMatch(await page.locator('.food-panel').textContent(),/\d+\s*(g|kcal)\b/);
await page.locator('#food-search').fill('djon');await page.keyboard.press('Enter');assert.deepEqual(await results(),['Diri ak Djon Djon'],'Enter does not submit anywhere');

// 5. Camera viewfinder mockup: opens as a modal, closes with button/Escape, restores focus, never touches the camera.
assert.equal(await page.locator('#camera-mockup[open]').count(),0);await page.locator('#scan-food').click();assert.equal(await page.locator('#camera-mockup[open]').count(),1);assert.match(await page.locator('#camera-mockup').textContent(),/NO LIVE FEED/);assert.match(await page.locator('#camera-mockup').textContent(),/does not request camera permission/);
assert.equal(await page.locator('#camera-mockup video, #camera-mockup canvas').count(),0);
await page.locator('#camera-mockup .dialog-close').click();assert.equal(await page.locator('#camera-mockup[open]').count(),0);assert.equal(await page.evaluate(()=>document.activeElement.id),'scan-food');
await page.locator('#scan-food').click();await page.keyboard.press('Escape');assert.equal(await page.locator('#camera-mockup[open]').count(),0);assert.equal(await page.evaluate(()=>document.activeElement.id),'scan-food');
assert.equal(await page.evaluate(()=>window.__cameraRequests),0,'getUserMedia was never called');

// 6. Responsive shell: no horizontal overflow from 1440 to 320, drawer behaviour below 1024.
for(const width of [1440,1280,1024,1023,900,768,640,480,390,320]){await page.setViewportSize({width,height:900});await page.waitForTimeout(300);/* let the drawer slide-out transition settle */for(const id of ['dashboard','rankings','standards','library']){await page.goto(URL_+'#'+id);await shown(id);await page.evaluate(()=>document.fonts.ready);
 const overflow=await page.evaluate(()=>({doc:document.documentElement.scrollWidth-document.documentElement.clientWidth,main:document.querySelector('.app-main').scrollWidth-document.querySelector('.app-main').clientWidth}));assert.deepEqual(overflow,{doc:0,main:0},`${width}px #${id} overflows ${JSON.stringify(overflow)}`);
 assert.equal(await page.locator('h1:visible').count(),1);}
 const drawer=width<1024;assert.equal(await page.locator('.app-tabbar').isVisible(),drawer,`${width}px tab bar`);assert.equal(await page.locator('#app-sidebar').isVisible(),!drawer,`${width}px sidebar`);if(drawer){assert.equal(await page.locator('.app-tab').count(),5);const main=await page.locator('.app-main').evaluate(el=>parseFloat(getComputedStyle(el).paddingBottom));assert.ok(main>=80,`${width}px content clears the tab bar (${main}px)`)}}
await page.setViewportSize({width:390,height:844});await page.goto(URL_);await page.evaluate(()=>document.fonts.ready);
// Bottom tabs switch views and mirror the active state; "More" opens the full navigation drawer.
await page.locator('.app-tab[data-view-link="rankings"]').click();assert.deepEqual(await shown('rankings'),['rankings']);assert.deepEqual(await page.locator('.app-tab[aria-current="page"]').evaluateAll(a=>a.map(x=>x.dataset.viewLink)),['rankings']);assert.deepEqual(await page.locator('#app-nav a[aria-current="page"]').evaluateAll(a=>a.map(x=>x.dataset.viewLink)),['rankings']);
await page.locator('.app-tab[data-view-link="dashboard"]').click();await shown('dashboard');
const more=page.locator('.app-tab-more');
await more.click();assert.equal(await more.getAttribute('aria-expanded'),'true');assert.equal(await page.locator('#app-sidebar').isVisible(),true);assert.equal(await page.evaluate(()=>document.activeElement.dataset.viewLink),'dashboard','focus moves into the navigation');
await page.keyboard.press('Escape');assert.equal(await more.getAttribute('aria-expanded'),'false');assert.equal(await page.evaluate(()=>document.activeElement.classList.contains('app-tab-more')),true,'focus returns to More');
await more.click();await page.locator('#app-nav a[data-view-link="performance"]').click();assert.deepEqual(await shown('performance'),['performance']);assert.equal(await more.getAttribute('aria-expanded'),'false','drawer closes after choosing a view');
await more.click();await page.locator('.app-backdrop').click({position:{x:380,y:400}});assert.equal(await more.getAttribute('aria-expanded'),'false','backdrop click closes the drawer');
await more.click();await page.setViewportSize({width:1280,height:900});await page.waitForTimeout(50);assert.equal(await page.evaluate(()=>document.body.classList.contains('nav-open')),false,'drawer state resets on resize to desktop');
// Manifest is reachable and describes a standalone app starting in the shell.
const manifest=await page.evaluate(async()=>{const r=await fetch(document.querySelector('link[rel=manifest]').href);return {ok:r.ok,type:r.headers.get('content-type'),body:await r.json()}});assert.equal(manifest.ok,true);assert.equal(manifest.body.start_url,'/dashboard/');assert.equal(manifest.body.display,'standalone');

// 7. No-JS fallback keeps every view reachable through :target.
const nojs=await browser.newContext({javaScriptEnabled:false,viewport:{width:1440,height:1000}});const plain=await nojs.newPage();await plain.goto(URL_+'#standards');assert.equal(await plain.locator('#standards').isVisible(),true);assert.equal(await plain.locator('#dashboard').isVisible(),false);await plain.goto(URL_);assert.equal(await plain.locator('#dashboard').isVisible(),true);await nojs.close();

// 8. Nothing leaves the device and nothing is stored; offline shell served by the service worker.
assert.deepEqual(await page.evaluate(()=>Object.keys(localStorage)),[]);assert.deepEqual(await page.evaluate(()=>Object.keys(sessionStorage)),[]);assert.equal(await page.evaluate(()=>document.cookie),'');assert.deepEqual(writes,[]);assert.deepEqual(apiCalls,[]);
await page.goto(URL_);await page.evaluate(()=>navigator.serviceWorker.ready);await page.waitForFunction(()=>navigator.serviceWorker.controller!==null);await context.setOffline(true);const off=await page.reload();assert.equal(off.status(),200,'offline shell served by the service worker');await page.goto(URL_+'#nutrition');assert.deepEqual(await shown('nutrition'),['nutrition']);await page.goto(URL_+'#dashboard');await shown('dashboard');await page.locator('.pill[data-food="oatmeal"]').click();assert.deepEqual(await page.locator('#food-results .food-item strong').allTextContents(),['Oatmeal']);await context.setOffline(false);
assert.deepEqual(errors,[]);
console.log('PASS: Dashboard app shell — 9 views (hash routing, aria-current, titles, focus, back/forward, unknown hash, no-JS :target fallback); status strip without numbers; muscle view hover/select/keyboard/chips/deselect; food search, 4 quick filters, demo log add/remove, macro totals stay "—"; camera mockup open/close/Escape with 0 getUserMedia calls; 10 widths × 4 views without overflow; bottom tab bar + More drawer (open/Escape/backdrop/auto-close/resize); standalone manifest; offline shell; zero uploads, API calls, stored data or JS errors.');await browser.close();
