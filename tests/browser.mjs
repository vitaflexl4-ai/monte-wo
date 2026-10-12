import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
import {translations} from '../public/translations.js';
const browser=await chromium.launch({headless:true});
const context=await browser.newContext({viewport:{width:1440,height:1000}});
const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
await page.goto('http://localhost:8080');await page.evaluate(()=>document.fonts.ready);
assert.equal(await page.locator('.rank-tile').count(),9);
assert.equal(await page.locator('.result-rank').textContent(),'No official rank');assert.ok((await page.locator('.result-stats').textContent()).includes('93.3'));
await page.locator('[data-rank="8"]').click();assert.equal(await page.locator('#rank-detail strong').textContent(),'Lejand');
await page.locator('#weight').fill('100');await page.locator('.calc-submit').click();assert.equal(await page.locator('.result-rank').textContent(),'No official rank');
await page.locator('[data-unit="lb"]').click();assert.equal(await page.locator('.result-rank').textContent(),'No official rank');
await page.reload();assert.equal(await page.locator('.result-rank').textContent(),'No official rank');assert.equal(await page.locator('[data-unit="lb"]').getAttribute('aria-pressed'),'true');
await page.locator('[data-methodology]').first().click();assert.ok(await page.locator('#info-dialog').isVisible());assert.ok((await page.locator('#dialog-content').textContent()).includes('not a validated'));await page.keyboard.press('Escape');assert.ok(!(await page.locator('#info-dialog').isVisible()));
await page.locator('[data-guide="squat"]').click();await page.locator('#use-exercise').click();assert.equal(await page.locator('#exercise').inputValue(),'squat');
for(const lang of ['en','ht','fr']){
 await page.locator('#language').selectOption(lang);assert.equal(await page.locator('html').getAttribute('lang'),lang);
 if(lang!=='en'){
  const keys=await page.locator('[data-i18n]').evaluateAll(els=>els.map(el=>el.dataset.i18n));
  assert.deepEqual(keys.filter(key=>!translations[lang][key]),[],`missing translations: ${lang}`);
 }
 for(const width of [1440,1024,768,640,390,320]){await page.setViewportSize({width,height:900});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`overflow ${lang} ${width}`);}
}
await page.setViewportSize({width:390,height:844});await page.locator('.menu-button').click();assert.equal(await page.locator('.menu-button').getAttribute('aria-expanded'),'true');await page.locator('#main-nav a').first().click();assert.equal(await page.locator('.menu-button').getAttribute('aria-expanded'),'false');
await page.goto('http://localhost:8080');await page.locator('#language').selectOption('ht');await page.reload();assert.equal(await page.locator('html').getAttribute('lang'),'ht');
await page.evaluate(()=>navigator.serviceWorker.ready);await page.waitForFunction(()=>navigator.serviceWorker.controller!==null);
console.log('Service worker installed; switching browser offline.');
await context.setOffline(true);await page.reload({waitUntil:'load'});assert.equal(await page.locator('html').getAttribute('lang'),'ht');
await page.locator('#weight').fill('220');await page.locator('.calc-submit').click();assert.ok(await page.locator('.result-rank').textContent());assert.equal(await page.locator('#connection-text').textContent(),'SAN ENTÈNÈT');
await page.locator('#language').selectOption('en');assert.equal(await page.locator('#connection-text').textContent(),'OFFLINE');
await context.setOffline(false);await page.reload();
const status=await page.request.get('http://localhost:8080/api/status');assert.equal((await status.json()).syncAvailable,false);
assert.equal((await page.request.get('http://localhost:8080/api/gifs/bench-press.gif')).status(),503);
assert.equal((await page.request.post('http://localhost:8080/api/sync',{data:{sets:[]}})).status(),404);
assert.deepEqual(errors,[]);
console.log('PASS: rank selection, calculation, units, persistence, dialogs, exercises, all 3 languages, 18 responsive layouts, mobile navigation, offline reload + calculation, API status/errors, no JS errors.');
await browser.close();
