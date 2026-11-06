import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
import {readFileSync,mkdirSync} from 'node:fs';
import {browserOptions} from './browser-config.mjs';

const origin=process.env.TEST_ORIGIN||'http://localhost:8080';
const profile=JSON.parse(readFileSync('content/group/founder.json','utf8'));
const paragraphs=profile.chapters.flatMap(chapter=>chapter.paragraphs);
const browser=await chromium.launch(browserOptions);
const context=await browser.newContext({viewport:{width:1440,height:1000},reducedMotion:'reduce'});
const page=await context.newPage();
const errors=[],failures=[];
page.on('pageerror',error=>errors.push(error.message));
page.on('response',response=>{if(response.status()>=400)failures.push(`${response.status()} ${response.url()}`)});
const screenshots=process.env.FOUNDER_SCREENSHOT_DIR||'/tmp/vitaflex-founder-review';
mkdirSync(screenshots,{recursive:true});
try {
 // Reach the personal essay through the actual group footer, without changing the hero.
 await page.goto(origin+'/');
 await page.locator('.footer-links a[href="/sony/"]').focus();
 await page.keyboard.press('Enter');await page.waitForURL('**/sony/');
 assert.equal(await page.locator('h1').textContent(),'Sony Alexis');
 assert.equal(await page.locator('.founder-subtitle').textContent(),'The Person Behind the Vision');
 assert.doesNotMatch(await page.locator('article').innerText(),/A non-alien|A journey of purpose|Ultimately, I hope/);
 assert.deepEqual(await page.locator('.founder-chapter p').allTextContents(),paragraphs);
 assert.equal(await page.locator('.footer-links [aria-current="page"]').textContent(),'Meet Sony Alexis');
 assert.equal(await page.locator('script:not([type="application/ld+json"]),form,iframe').count(),0);
 const viewports=[{width:320,height:740},{width:390,height:844},{width:600,height:900},{width:768,height:1024},{width:844,height:390},{width:1024,height:900},{width:1440,height:1000},{width:1920,height:1080}];
 for(const viewport of viewports){
  await page.setViewportSize(viewport);await page.evaluate(()=>document.fonts.ready);
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`Page overflow at ${viewport.width}`);
  const clipped=await page.locator('.founder h1,.founder-subtitle,.founder-chapter p,.founder-conviction,.founder-chapters a,.footer-links').evaluateAll(nodes=>nodes.filter(node=>node.scrollWidth>node.clientWidth+1).map(node=>node.textContent));
  assert.deepEqual(clipped,[],`Clipped founder content at ${viewport.width}`);
  assert.ok(await page.locator('.founder-chapter p').first().evaluate(el=>parseFloat(getComputedStyle(el).fontSize)>=16));
  assert.ok(await page.locator('.founder-prose').evaluate(el=>el.getBoundingClientRect().width<=681));
  if(viewport.width<=820){
   const chapterNav=await page.locator('.founder-chapters').boundingBox();
   const prose=await page.locator('.founder-prose').boundingBox();
   assert.ok(chapterNav.y+chapterNav.height<=prose.y,'Mobile contents must flow above the essay');
  }
  if([390,768,1440].includes(viewport.width)){
   await page.screenshot({path:`${screenshots}/founder-${viewport.width}.png`,fullPage:true});
   if(viewport.width===1440)await page.screenshot({path:`${screenshots}/founder-desktop-first-screen.png`});
  }
 }
 // Keyboard skip, visible focus, native chapter links and return navigation.
 await page.setViewportSize({width:1440,height:1000});
 await page.goto(origin+'/sony/');await page.keyboard.press('Tab');
 assert.equal(await page.locator(':focus').textContent(),'Skip to content');
 await page.keyboard.press('Enter');assert.equal(await page.locator(':focus').getAttribute('id'),'main');
 for(const chapter of profile.chapters){
  const link=page.locator(`.founder-chapters a[href="#${chapter.id}"]`);
  await link.focus();assert.equal(await link.evaluate(el=>getComputedStyle(el).outlineStyle),'solid');
  await page.keyboard.press('Enter');assert.equal(new URL(page.url()).hash,'#'+chapter.id);
  const bounds=await page.locator('#'+chapter.id).boundingBox();assert.ok(bounds.y>=0&&bounds.y<200,chapter.id+' is scrolled into view');
 }
 assert.equal(await page.locator('.founder-chapters a').first().evaluate(el=>getComputedStyle(el).transitionDuration),'0s');
 await page.locator('.founder-return').click();await page.waitForURL('**/#ventures');
 assert.equal(await page.locator('.venture-row').count(),4);
 // Entire profile and navigation remain usable with scripting disabled.
 const noJS=await browser.newContext({javaScriptEnabled:false,viewport:{width:390,height:844}});
 const plain=await noJS.newPage();await plain.goto(origin+'/sony/');
 assert.deepEqual(await plain.locator('.founder-chapter p').allTextContents(),paragraphs);
 await plain.locator('.founder-chapters a[href="#service"]').click();assert.equal(new URL(plain.url()).hash,'#service');
 await noJS.close();
 assert.deepEqual(errors,[]);assert.deepEqual(failures,[]);
 console.log('PASS: Founder via footer; eight desktop/tablet/mobile/landscape layouts; complete verbatim essay; no overflow/clipping; <=680px reading column; chapter anchors; keyboard skip/focus; reduced motion; no-JS reading/navigation; no JS errors or failed HTTP assets.');
 console.log('Review screenshots:',screenshots);
} finally {
 await browser.close();
}
