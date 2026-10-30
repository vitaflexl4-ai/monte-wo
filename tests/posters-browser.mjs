import assert from 'node:assert/strict';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'@playwright/test');
const browser=await chromium.launch({headless:true});
const base=process.env.PREVIEW_URL||'http://127.0.0.1:8080';
let layouts=0;
try {
 for(const width of [360,768,1440]){
  const context=await browser.newContext({viewport:{width,height:1000}});
  const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(base+'/');
  await page.locator('#exercise-grid').scrollIntoViewIfNeeded();
  await page.waitForFunction(()=>[...document.querySelectorAll('#exercise-grid img')].length===3&&[...document.querySelectorAll('#exercise-grid img')].every(i=>i.complete&&i.naturalWidth>0));
  assert.deepEqual(await page.locator('#exercise-grid img').evaluateAll(imgs=>imgs.map(i=>i.getAttribute('src'))),['/assets/posters/bench-press.svg','/assets/posters/back-squat.svg','/assets/posters/deadlift.svg']);
  assert.equal(await page.locator('#exercise-grid .exercise-badge').first().textContent(),'WORKOUT POSTER');
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
  for(const language of ['ht','fr','en']){
   await page.selectOption('#language',language);
   assert.equal(await page.locator('#exercise-grid .workout-poster-img').count(),3);
  }
  await page.locator('[data-guide="bench"]').click();
  assert.ok(await page.locator('#info-dialog').isVisible());
  await page.waitForFunction(()=>{const i=document.querySelector('#info-dialog .workout-poster-img');return i?.complete&&i.naturalWidth>0});
  assert.ok((await page.locator('#info-dialog').textContent()).includes('not an animated demonstration'));
  await page.keyboard.press('Escape');
  if(width===1440&&process.env.SCREENSHOT_PATH)await page.locator('#exercises').screenshot({path:process.env.SCREENSHOT_PATH});
  layouts++;
  for(const route of ['/exercises/','/exercises/bench-press/','/exercises/back-squat/','/exercises/muscle/chest/','/exercises/muscle/legs/','/exercises/romanian-deadlift/']){
   await page.goto(base+route);
   const images=page.locator('.workout-poster-img');
   for(let i=0;i<await images.count();i++){await images.nth(i).scrollIntoViewIfNeeded();await images.nth(i).evaluate(img=>img.decode());}
   assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),width+' '+route);
   assert.equal(await page.locator('img[src="/assets/posters/deadlift.svg"]').count(),0);
   layouts++;
  }
  assert.deepEqual(errors,[]);await context.close();
 }
 const nojs=await browser.newContext({javaScriptEnabled:false,viewport:{width:390,height:844}});
 const page=await nojs.newPage();await page.goto(base+'/');await page.locator('#exercise-grid').scrollIntoViewIfNeeded();
 for(const img of await page.locator('#exercise-grid img').all())assert.ok(await img.evaluate(i=>i.complete&&i.naturalWidth>0));
 assert.equal(await page.locator('#exercise-grid a[href="/exercises/standards/#deadlift"]').count(),1);
 await nojs.close();
 const offline=await browser.newContext();const p=await offline.newPage();await p.goto(base+'/');
 await p.evaluate(()=>navigator.serviceWorker.ready);await p.reload();await offline.setOffline(true);await p.reload();
 await p.locator('#exercise-grid').scrollIntoViewIfNeeded();
 await p.waitForFunction(()=>[...document.querySelectorAll('#exercise-grid img')].length===3&&[...document.querySelectorAll('#exercise-grid img')].every(i=>i.complete&&i.naturalWidth>0));
 await offline.close();
 console.log(`PASS: ${layouts} responsive layouts; three locales; guide dialog; no-JS posters; offline posters; zero page errors.`);
}finally{await browser.close()}
