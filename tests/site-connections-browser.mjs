import assert from 'node:assert/strict';
import {writeFile,readFile} from 'node:fs/promises';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'/var/tmp/montewo-connections-qa/node_modules/playwright/index.mjs');
const base=process.env.PREVIEW_URL||'http://127.0.0.1:8086';
const b=await chromium.launch({headless:true}),errors=[],checks=[];
async function menuLink(p,path){
 const menu=p.locator('.menu-button');
 if(await menu.count()&&await menu.isVisible())await menu.click();
 const compact=p.locator('.mobile-menu summary');
 if(await compact.count()&&await compact.isVisible()){
  await compact.click();await p.locator('.mobile-menu a[href="'+path+'"]').click();
 }else await p.locator('#main-nav a[href="'+path+'"]').click();
}
try{
 for(const width of [390,820,1440]){
  const context=await b.newContext({viewport:{width,height:960},serviceWorkers:'block'}),p=await context.newPage();p.on('pageerror',e=>errors.push(e.message));
  await p.goto(base+'/');assert.equal(new URL(p.url()).pathname,'/');
  await p.getByRole('link',{name:'Try the phone preview ↓',exact:true}).click();assert.equal(new URL(p.url()).hash,'#app-preview');
  await menuLink(p,'/app/');await p.waitForSelector('[data-phone-cockpit][data-bound="true"]');
  await p.getByRole('link',{name:'Connection status ↓',exact:true}).click();assert.equal(new URL(p.url()).hash,'#app-connections');
  await p.waitForFunction(()=>document.querySelector('[data-service="mobile"]').dataset.state==='disabled');
  assert.match(await p.locator('[data-service="mobile"]').textContent(),/Account sync not enabled/);
  assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  await p.getByRole('link',{name:'Try the phone preview ↓',exact:true}).click();
  await p.getByRole('tab',{name:'Haitian Muscle Map',exact:true}).click();await p.locator('[data-phone-region-button="arms"]').click();
  assert.equal(await p.locator('[data-phone-map-link]').getAttribute('href'),'/exercises/?group=arms#library');
  await p.locator('[data-phone-map-link]').click();await p.waitForFunction(()=>document.documentElement.dataset.ready==='true');
  assert.equal(await p.locator('#match-count').textContent(),'7 matching exercises');assert.equal(new URL(p.url()).searchParams.get('group'),'arms');
  await p.locator('#reset').click();assert.equal(await p.locator('#match-count').textContent(),'62 matching exercises');assert.equal(new URL(p.url()).searchParams.get('group'),null);
  await menuLink(p,'/app/');await p.getByRole('tab',{name:'Training History',exact:true}).click();await p.locator('#phone-panel-history .phone-destination').click();
  await p.waitForFunction(()=>document.documentElement.dataset.ready==='true');assert.equal(new URL(p.url()).hash,'#training-tools');
  await p.locator('#set-exercise').selectOption('bench-press');await p.locator('#set-weight').fill('185');await p.locator('#set-reps').fill('5');await p.locator('#set-form button[type="submit"]').click();assert.equal(await p.locator('#total-volume').textContent(),'925');
  await menuLink(p,'/app/');await p.getByRole('tab',{name:'Strength Index',exact:true}).click();await p.locator('#phone-panel-strength .phone-destination').click();assert.equal(new URL(p.url()).pathname,'/strength/');
  await menuLink(p,'/app/');await p.getByRole('link',{name:'Native release status ↗',exact:true}).click();assert.equal(new URL(p.url()).pathname,'/downloads/');assert.equal(await p.locator('button[disabled]').count(),3);
  await p.locator('a.brand').first().click();assert.equal(new URL(p.url()).pathname,'/');
  checks.push({width,homeAppMapFilterLoggerStrengthDownloadsHome:true,connectionPanelFailClosed:true,noOverflow:true});await context.close();
 }
 // Verify readiness labels under controlled responses; never claim these are production checks.
 const ctx=await b.newContext({serviceWorkers:'block'}),p=await ctx.newPage();p.on('pageerror',e=>errors.push(e.message));
 let data={error:'Not implemented in this build'},status=404;
 await p.route('**/api/mobile/config?*',route=>route.fulfill({status,contentType:'application/json',body:JSON.stringify(data)}));
 await p.goto(base+'/app/#app-connections');await p.waitForFunction(()=>document.querySelector('[data-service="mobile"]').dataset.state==='missing');
 data={available:true,workoutSync:true,apiVersion:1,authentication:'test pilot',registration:'enrolled pilot only'};status=200;
 await p.getByRole('button',{name:'Check services again'}).click();await p.waitForFunction(()=>document.querySelector('[data-service="mobile"]').dataset.state==='ready');
 assert.match(await p.locator('[data-service="mobile"] [data-service-label]').textContent(),/sign-in required/);
 data={available:true,workoutSync:true,apiVersion:99};await p.getByRole('button',{name:'Check services again'}).click();await p.waitForFunction(()=>document.querySelector('[data-service="mobile"]').dataset.state==='incompatible');
 await p.unroute('**/api/mobile/config?*');await p.route('**/api/mobile/config?*',route=>route.abort());await p.getByRole('button',{name:'Check services again'}).click();await p.waitForFunction(()=>document.querySelector('[data-service="mobile"]').dataset.state==='unknown');
 await p.goto(base+'/exercises/?group=%3Cscript%3E#library');await p.waitForFunction(()=>document.documentElement.dataset.ready==='true');assert.equal(await p.locator('#match-count').textContent(),'62 matching exercises');
 await p.goto(base+'/exercises/?group=back#library');await p.waitForFunction(()=>document.documentElement.dataset.ready==='true');assert.equal(await p.locator('[data-view-button="b"]').getAttribute('aria-pressed'),'true');await ctx.close();
 const routes=JSON.parse(await readFile('public/website-routes.json','utf8'));for(const path of routes){const r=await fetch(base+path);assert.equal(r.status,200,path)}
 assert.deepEqual(errors,[]);const result={checks,localRouteHttpChecks:routes.length,missingReadyIncompatibleNetworkStates:true,invalidGroupFailsClosed:true,backGroupSetsBackView:true,consoleErrors:errors};await writeFile('docs/website/connections/browser-checks.json',JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result,null,2));
}finally{await b.close()}
