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
 for(const width of [320,390,600,768,820,1024,1440]){
  await page.setViewportSize({width,height:900});await page.evaluate(()=>document.fonts.ready);
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),route+' '+width);
  if(route==='/'){
   assert.equal(await page.locator('.venture-row').count(),3);
   const layout=await page.evaluate(()=>{
    const headline=document.querySelector('.hero-heading').getBoundingClientRect(),art=document.querySelector('.hero-art').getBoundingClientRect();
    const separated=headline.right<=art.left+1||art.right<=headline.left+1||headline.bottom<=art.top+1||art.bottom<=headline.top+1;
    const clipped=[...document.querySelectorAll('.hero h1 em,.venture-row h2,.venture-category')].filter(el=>el.scrollWidth>el.clientWidth+1).map(el=>el.textContent);
    return {separated,clipped};
   });
   assert.ok(layout.separated,'Hero logo/headline overlap at '+width);assert.deepEqual(layout.clipped,[],'Clipped text at '+width);
  }
 }
 for(const href of await page.locator('a').evaluateAll(as=>as.map(a=>a.getAttribute('href')))){
  if(!href||href.startsWith('mailto:')||href.startsWith('http'))continue;
  const url=new URL(href,base+route);const res=await page.request.get(url.href);assert.equal(res.status(),200,href);
 }
}
await page.goto(base+'/');await page.keyboard.press('Tab');assert.equal(await page.locator(':focus').textContent(),'Skip to content');await page.keyboard.press('Enter');assert.equal(await page.locator(':focus').getAttribute('id'),'main');
await page.setViewportSize({width:1440,height:1000});
const row=page.locator('.venture-row').first();await row.scrollIntoViewIfNeeded();const before=await row.boundingBox();await row.hover();const after=await row.boundingBox();assert.deepEqual(after,before,'Hover must not shift portfolio layout');
await row.focus();assert.equal(await row.evaluate(el=>getComputedStyle(el).outlineStyle),'solid');
await page.emulateMedia({reducedMotion:'reduce'});assert.equal(await page.locator('.hero-art img').evaluate(el=>getComputedStyle(el).animationName),'none');await page.emulateMedia({reducedMotion:'no-preference'});
await page.locator('body').click({position:{x:1,y:1}});
await page.screenshot({path:'/tmp/vitaflex-desktop.png',fullPage:true});
await page.setViewportSize({width:390,height:844});await page.screenshot({path:'/tmp/vitaflex-mobile.png',fullPage:true});
assert.deepEqual(errors,[]);await browser.close();console.log('PASS: all group/product routes, responsive layouts, all corporate links, keyboard skip, zero JS errors.');
