import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'/var/tmp/montewo-phone-qa/node_modules/playwright/index.mjs');
const base=process.env.PHONE_PREVIEW_URL||'http://127.0.0.1:8086';
const browser=await chromium.launch({headless:true}),results=[],errors=[];
try{
 for(const route of ['/app/','/index.html'])for(const width of [320,390,768,1024,1440]){
  const context=await browser.newContext({viewport:{width,height:960},serviceWorkers:'block'}),page=await context.newPage();page.on('pageerror',e=>errors.push({route,width,error:e.message}));
  await page.goto(base+route);await page.waitForSelector('[data-phone-cockpit][data-bound="true"]');
  const root=page.locator('[data-phone-cockpit]');
  assert.equal(await root.getByRole('tabpanel').count(),1);
  await page.locator('#phone-squat').fill('185');await page.locator('[data-phone-rank="squat"]').waitFor({state:'visible'});
  await page.locator('#phone-bench').fill('135');await page.locator('#phone-deadlift').fill('225');
  assert.equal(await root.locator('.phone-rank:visible').count(),3);
  await root.getByRole('tab',{name:'Training History',exact:true}).click();assert.equal(await root.locator('tbody tr').count(),9);
  assert.ok(await root.locator('#phone-panel-history').evaluate(el=>el.scrollHeight>el.clientHeight));
  await root.getByRole('tab',{name:'Haitian Muscle Map',exact:true}).click();
  await root.locator('[data-phone-region-button="back"]').click();assert.equal(await root.locator('[data-phone-facing="b"]').getAttribute('aria-pressed'),'true');
  assert.equal(await root.locator('[data-phone-region="back"]').getAttribute('aria-pressed'),'true');
  await root.locator('[data-phone-region-button="arms"]').click();assert.match(await root.locator('[data-phone-region-detail]').textContent(),/CHANPYON/);
  await root.getByRole('tab',{name:'Strength Index',exact:true}).click();assert.equal(await page.locator('#phone-squat').inputValue(),'185');
  await page.locator('#phone-squat').fill('-1');assert.equal(await page.locator('#phone-squat').getAttribute('aria-invalid'),'true');assert.equal(await root.locator('[data-phone-rank="squat"]').isVisible(),false);
  await root.getByRole('button',{name:'Reset preview',exact:true}).click();assert.equal(await root.locator('.phone-rank:visible').count(),0);
  await root.getByRole('tab',{name:'Strength Index',exact:true}).focus();await page.keyboard.press('ArrowRight');assert.equal(await root.getByRole('tab',{name:'Training History',exact:true}).getAttribute('aria-selected'),'true');await page.keyboard.press('End');assert.equal(await root.getByRole('tab',{name:'Haitian Muscle Map',exact:true}).getAttribute('aria-selected'),'true');
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),route+' '+width+' page overflow');
  assert.ok(await root.locator('.phone-widget').evaluate(el=>{const r=el.getBoundingClientRect();return r.left>=0&&r.right<=innerWidth}),route+' '+width+' frame bounds');
  if(route==='/app/'&&[390,1440].includes(width)){await root.getByRole('tab',{name:'Strength Index',exact:true}).click();await page.locator('#phone-squat').fill('185');await page.screenshot({path:`/tmp/phone-${width}.png`,fullPage:false})}
  results.push({route,width,tabsInputsMapHistoryKeyboardBounds:true});await context.close();
 }
 const ctx=await browser.newContext({reducedMotion:'reduce',serviceWorkers:'block'}),page=await ctx.newPage();page.on('pageerror',e=>errors.push({error:e.message}));await page.goto(base+'/index.html');await page.waitForSelector('[data-phone-cockpit][data-bound="true"]');await page.locator('#phone-squat').fill('185');assert.equal(await page.locator('[data-phone-rank="squat"]').evaluate(el=>el.getAnimations().length),0);
 await page.evaluate(()=>document.documentElement.lang='fr');await page.getByRole('tab',{name:'Indice de force'}).waitFor();await page.evaluate(()=>document.documentElement.lang='ht');await page.getByRole('tab',{name:'Endis Fòs'}).waitFor();
 await ctx.setOffline(true);await page.getByRole('tab',{name:'Istwa Antrènman'}).click();assert.equal(await page.locator('#phone-panel-history').isVisible(),true);await ctx.setOffline(false);await ctx.close();
 const exercise=await browser.newPage();exercise.on('pageerror',e=>errors.push({route:'/exercises/',error:e.message}));await exercise.goto(base+'/exercises/');await exercise.waitForFunction(()=>document.documentElement.dataset.ready==='true');assert.equal(await exercise.locator('#set-exercise option').count(),63);await exercise.close();
 assert.deepEqual(errors,[]);const report={results,reducedMotion:true,localeSwitching:true,offlineTabSwitching:true,exerciseCockpitBoot:true,consoleErrors:errors};
 await writeFile('docs/website/phone-cockpit/checks.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));
}finally{await browser.close()}
