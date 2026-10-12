import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
execFileSync('npx',['wrangler','d1','execute','montewo-local-tests','--local','--config','wrangler.local.toml','--command',"DELETE FROM waitlist_rate_limits; DELETE FROM waitlist WHERE email='browser-phase1@example.com';"],{stdio:'pipe'});
const browser=await chromium.launch();const context=await browser.newContext({viewport:{width:1440,height:1000}});const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
const paths=['about','contact','faq','privacy','terms','delete-account','strength-ranks','waitlist'];
for(const path of paths){
 const res=await page.goto('http://localhost:8080/'+path+'/');assert.equal(res.status(),200,path);
 assert.ok(await page.locator('h1').textContent());
 for(const width of [1440,768,390,320]){await page.setViewportSize({width,height:900});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`overflow ${path} ${width}`)}
}
await page.goto('http://localhost:8080/waitlist/');await page.waitForFunction(()=>document.querySelector('#waitlist-status').textContent.includes('not active'));assert.ok(await page.locator('#waitlist-submit').isDisabled());
await page.goto('http://localhost:8080/terms/');assert.ok((await page.locator('.document-content').textContent()).includes('individual or sole proprietor'));assert.ok((await page.locator('.document-content').textContent()).includes('jurisdiction has not yet been confirmed'));
await page.goto('http://localhost:8080/strength-ranks/');assert.equal(await page.locator('.rank-gallery>div').count(),9);assert.equal(await page.locator('.rank-gallery b').first().textContent(),'Debitan');assert.equal(await page.locator('.rank-gallery b').last().textContent(),'Lejand');
await page.evaluate(()=>navigator.serviceWorker.ready);await page.waitForFunction(()=>navigator.serviceWorker.controller!==null);await context.setOffline(true);await page.goto('http://localhost:8080/privacy/');assert.ok((await page.locator('.document-content').textContent()).includes('Cloudflare D1'));await context.setOffline(false);
await page.goto('http://localhost:8080/delete-account/');await page.evaluate(()=>localStorage.setItem('mw-calculator','test'));await page.locator('#clear-device').click();assert.ok(await page.locator('#confirm-clear').isVisible());await page.locator('#confirm-clear-no').click();assert.equal(await page.evaluate(()=>localStorage.getItem('mw-calculator')),'test');await page.locator('#clear-device').click();await page.locator('#confirm-clear-yes').click();await page.waitForFunction(()=>document.querySelector('#device-status').textContent.includes('cleared'));assert.equal(await page.evaluate(()=>localStorage.getItem('mw-calculator')),null);
// Real local D1 storage; local test bypass is restricted to localhost.
await page.goto('http://localhost:8081/waitlist/');await page.waitForFunction(()=>!document.querySelector('#waitlist-submit').disabled);
await page.locator('#waitlist-email').fill('browser-phase1@example.com');await page.locator('#waitlist-consent').check();await page.locator('#waitlist-submit').click();await page.waitForFunction(()=>document.querySelector('#waitlist-status').textContent.includes('Saved to the local test database'));
await page.locator('#waitlist-email').fill('BROWSER-PHASE1@example.com');await page.locator('#waitlist-consent').check();await page.locator('#waitlist-submit').click();await page.waitForFunction(()=>document.querySelector('#waitlist-status').textContent.includes('Saved to the local test database'));
await context.setOffline(true);assert.ok(await page.locator('#waitlist-submit').isDisabled());await context.setOffline(false);
assert.deepEqual(errors,[]);console.log('PASS: 8 pages, 32 responsive layouts, unavailable signup state, legal content, nine names, offline legal page, confirmed local deletion, real local-D1 signup + duplicate handling, offline submission block.');await browser.close();
