import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const browser=await chromium.launch({headless:true});
const page=await browser.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
const base=process.env.TEST_ORIGIN||'http://localhost:8080';
for(const route of JSON.parse(readFileSync('public/group-routes.json'))){
 assert.equal((await page.goto(base+route)).status(),200);
 assert.equal(await page.locator('h1').count(),1);
 const broken=await page.locator('img').evaluateAll(async images=>{await Promise.all(images.map(async image=>{image.loading='eager';try{await image.decode()}catch{}}));return images.filter(image=>!image.naturalWidth).map(image=>image.src)});
 assert.deepEqual(broken,[],route+' decoded image assets');
 if(route==='/'){assert.equal(await page.locator('.hero-art img').getAttribute('src'),'/assets/group/vitaflex-business-group.webp');assert.equal(await page.locator('.brand-logo').count(),1);}
 for(const width of [320,390,768,1024,1440]){await page.setViewportSize({width,height:900});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),route+' '+width)}
 for(const href of await page.locator('a').evaluateAll(as=>as.map(a=>a.getAttribute('href')))){
  if(!href||href.startsWith('mailto:')||href.startsWith('http'))continue;
  const url=new URL(href,base+route);const res=await page.request.get(url.href);assert.equal(res.status(),200,href);
 }
}
await page.goto(base+'/');await page.keyboard.press('Tab');assert.equal(await page.locator(':focus').textContent(),'Skip to content');await page.keyboard.press('Enter');assert.equal(await page.locator(':focus').getAttribute('id'),'main');
await page.setViewportSize({width:1440,height:1000});await page.screenshot({path:'/tmp/vitaflex-desktop.png',fullPage:true});
await page.setViewportSize({width:390,height:844});await page.screenshot({path:'/tmp/vitaflex-mobile.png',fullPage:true});
assert.deepEqual(errors,[]);await browser.close();console.log('PASS: four group/product routes, 20 responsive layouts, all corporate links, keyboard skip, zero JS errors.');
