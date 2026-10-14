// Packaged-app (Capacitor bundle) workflows, run in a real browser against the native bundle
// served with Capacitor's routing rules (`node scripts/native_preview.mjs`, default :3000).
// This is an EMULATION of the WebView container: it proves the bundle, its routing rewrites
// and the essential app workflows behave inside a Capacitor-style local server. It is not a
// run on an Android/iOS device (see docs/release/RELEASE_STATUS.md for what that still needs).
import {chromium} from '@playwright/test';import assert from 'node:assert/strict';
const BASE=(process.env.NATIVE_PREVIEW_URL||'http://localhost:3000').replace(/\/$/,'');
const browser=await chromium.launch();
const errors=[],apiCalls=[],writes=[],swAttempts=[];
async function phone(){const context=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:3,isMobile:true,hasTouch:true});
 await context.addInitScript(()=>{window.__cameraRequests=0;const stub=()=>{window.__cameraRequests++;return Promise.reject(new Error('blocked by test'))};if(navigator.mediaDevices)navigator.mediaDevices.getUserMedia=stub;});
 const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push('console: '+m.text())});
 page.on('request',r=>{const u=r.url();if(u.includes('/api/'))apiCalls.push(u);if(r.method()!=='GET')writes.push(u);if(u.endsWith('/sw.js'))swAttempts.push(u)});return page}
const shown=async(page,id)=>{await page.locator(`#${id}.is-active`).waitFor({timeout:4000});return page.evaluate(()=>[...document.querySelectorAll('.app-view')].filter(v=>getComputedStyle(v).display!=='none').map(v=>v.id))};

// 1. Launch: the packaged root is the app shell, phone layout, no service worker, no API traffic.
let page=await phone();let res=await page.goto(BASE+'/',{waitUntil:'load'});assert.equal(res.status(),200);
assert.equal(await page.title(),'Dashboard | MONTE WO');assert.equal(await page.locator('.app-tabbar').isVisible(),true,'phone shows the tab bar');assert.equal(await page.locator('#app-sidebar').isVisible(),false);
assert.equal(await page.locator('.discipline-tile').count(),4);assert.equal(await page.locator('.discipline-tile:has-text("No official rank")').count(),4);
assert.deepEqual(await page.locator('.status-strip .badge').allTextContents(),['NOT CONNECTED','DRAFT — NOT OFFICIAL','NOT CONNECTED','NOT CONNECTED']);
await page.waitForTimeout(500);assert.equal(await page.evaluate(async()=>'serviceWorker' in navigator?(await navigator.serviceWorker.getRegistrations()).length:0),0,'no service worker inside the packaged app');

// 2. Tab bar + More drawer navigation (the native primary navigation).
for(const id of ['performance','rankings','nutrition','dashboard']){await page.locator(`.app-tabbar a[data-view-link="${id}"]`).click();assert.deepEqual(await shown(page,id),[id]);assert.equal(await page.evaluate(()=>location.hash),'#'+id);assert.equal(await page.locator('h1:visible').count(),1)}
await page.locator('[data-drawer-toggle]').click();await page.locator('#app-sidebar').waitFor({state:'visible'});assert.equal(await page.evaluate(()=>document.body.classList.contains('nav-open')),true,'More opens the drawer');
await page.locator('#app-sidebar a[data-view-link="settings"]').click();assert.deepEqual(await shown(page,'settings'),['settings']);await page.waitForTimeout(350);assert.equal(await page.evaluate(()=>document.body.classList.contains('nav-open')),false,'drawer closes after choosing a view');

// 3. Food Scan & Macro Logger demo (a Dashboard panel) works offline inside the bundle: in-memory log, "—" macros, no camera, no writes.
await page.locator('.app-tabbar a[data-view-link="dashboard"]').click();await shown(page,'dashboard');await page.locator('#food-search').scrollIntoViewIfNeeded();
await page.locator('#food-search').fill('griot');await page.locator('#food-results .food-add').first().click();
assert.equal(await page.locator('#food-log li').count(),1);assert.equal(await page.locator('#food-log-count').textContent(),'1 item');
assert.ok((await page.locator('[data-macro-value]').allTextContents()).every(v=>v==='—'),'macro totals stay "—" (no nutrition source)');
assert.equal(await page.evaluate(()=>window.__cameraRequests),0,'no camera access requested');

// 4. Legal / website pages are reachable from the shell via explicit files, and the brand link returns to the app shell.
await page.locator('[data-drawer-toggle]').click();await page.locator('#app-sidebar a[data-view-link="settings"]').click();await shown(page,'settings');
const privacyHref=await page.locator('#settings a[href$="/privacy/index.html"]').first().getAttribute('href');assert.equal(privacyHref,'/privacy/index.html','bundle links use explicit index.html paths');
await page.locator('#settings a[href="/privacy/index.html"]').first().click();await page.waitForLoadState('load');assert.match(await page.title(),/^Privacy Policy/);assert.equal(new URL(page.url()).pathname,'/privacy/index.html');
await page.locator('a.brand').first().click();await page.waitForLoadState('load');assert.equal(new URL(page.url()).pathname,'/index.html');assert.equal(await page.title(),'Dashboard | MONTE WO','home link lands in the app, not a website homepage');

// 5. Capacitor rule: extension-less paths resolve to the app shell instead of a 404.
res=await page.goto(BASE+'/about/',{waitUntil:'load'});assert.equal(res.status(),200);assert.equal(await page.title(),'Dashboard | MONTE WO');
res=await page.goto(BASE+'/about/index.html',{waitUntil:'load'});assert.equal(res.status(),200);assert.match(await page.title(),/^About Monte Wo/);

// 6. Backend-dependent pages degrade honestly without an API origin (no crash, no fake success).
await page.goto(BASE+'/waitlist/index.html',{waitUntil:'load'});await page.locator('#waitlist-status').filter({hasText:/not available inside the app yet/}).waitFor({timeout:8000});
assert.equal(await page.locator('#waitlist-submit').isDisabled(),true,'waitlist submit stays disabled without the API');
await page.goto(BASE+'/strength/index.html',{waitUntil:'load'});await page.waitForTimeout(800);assert.equal(await page.locator('#admin-link').isHidden(),true,'reviewer link stays hidden (excluded from the bundle)');
await page.locator('details.foundation-pilot summary').click();await page.locator('#connect-ranking').click();await page.locator('#strength-status').filter({hasText:/not configured for this app build/}).waitFor({timeout:4000});assert.equal(await page.locator('#account-workspace').isHidden(),true,'no private workspace without an API origin');

assert.deepEqual(writes,[],'no network writes during the whole run');assert.ok(apiCalls.every(u=>/\/api\/(waitlist\/config|strength\/(config|catalog|me))$/.test(u)),'only read-only readiness probes reached /api/: '+apiCalls.join(', '));
assert.deepEqual(swAttempts,[],'the bundle never even requests /sw.js');
const unexpected=errors.filter(e=>!/Failed to load resource.*404|net::ERR_|the server responded with a status of 404/.test(e));assert.deepEqual(unexpected,[],'no page errors');
await browser.close();console.log('native-browser: PASS (packaged bundle, Capacitor routing emulation, phone viewport)');
