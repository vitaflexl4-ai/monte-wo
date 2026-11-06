// Optional local/CI audit: run with @axe-core/playwright available, no app dependencies.
import {chromium} from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import assert from 'node:assert/strict';
import {writeFileSync} from 'node:fs';
import {browserOptions} from './browser-config.mjs';
const origin=process.env.TEST_ORIGIN||'http://localhost:8080';
const browser=await chromium.launch(browserOptions);
const report={browser:browser.version(),accessibility:[],performance:[]};
try {
 const context=await browser.newContext();const page=await context.newPage();
 for(const route of ['/','/sony/'])for(const width of [320,390,768,1440]){
  await page.setViewportSize({width,height:900});assert.equal((await page.goto(origin+route)).status(),200);
  await page.evaluate(()=>document.fonts.ready);
  const result=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21a','wcag21aa']).analyze();
  report.accessibility.push({route,width,violations:result.violations.length,incomplete:result.incomplete.length,passes:result.passes.length});
  assert.deepEqual(result.violations.map(v=>v.id),[],route+' '+width);
  assert.equal(await page.locator('h1').count(),1);assert.equal(await page.locator('link[rel="canonical"]').count(),1);
  if(route==='/sony/'){
   const data=await page.locator('script[type="application/ld+json"]').textContent();assert.equal(JSON.parse(data)['@graph'][0].name,'Sony Alexis');
   assert.equal(await page.locator('h1').textContent(),'Sony Alexis');
  }
 }
 await context.close();
 for(const route of ['/','/sony/']){
  const mobile=await browser.newContext({viewport:{width:390,height:844},isMobile:true});const p=await mobile.newPage();
  const session=await mobile.newCDPSession(p);await session.send('Network.enable');
  await session.send('Network.emulateNetworkConditions',{offline:false,downloadThroughput:200000,uploadThroughput:75000,latency:150});
  await session.send('Emulation.setCPUThrottlingRate',{rate:4});
  await p.addInitScript(()=>{
   window.seoMetrics={lcp:0,cls:0};
   new PerformanceObserver(list=>{for(const e of list.getEntries())window.seoMetrics.lcp=e.startTime;}).observe({type:'largest-contentful-paint',buffered:true});
   new PerformanceObserver(list=>{for(const e of list.getEntries())if(!e.hadRecentInput)window.seoMetrics.cls+=e.value;}).observe({type:'layout-shift',buffered:true});
  });
  await p.goto(origin+route,{waitUntil:'networkidle'});await p.evaluate(()=>document.fonts.ready);await p.waitForTimeout(500);
  report.performance.push(await p.evaluate(route=>({route,...window.seoMetrics,domContentLoadedMs:performance.getEntriesByType('navigation')[0].domContentLoadedEventEnd,encodedResourceBytes:performance.getEntriesByType('resource').reduce((sum,e)=>sum+e.encodedBodySize,0),requests:performance.getEntriesByType('resource').length}),route));
  await mobile.close();
 }
 writeFileSync(process.env.SEO_REPORT||'/tmp/vitaflex-seo-browser.json',JSON.stringify(report,null,2)+'\n');
 console.log(JSON.stringify(report,null,2));
} finally {await browser.close();}
