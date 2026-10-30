import assert from 'node:assert/strict';
import {mkdtemp,rm,writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE || '/tmp/montewo-workout-qa/node_modules/playwright/index.mjs');
const base=process.env.CHECKPOINT_URL || 'http://127.0.0.1:8085';
const browser=await chromium.launch({headless:true}), results=[], errors=[];
const ready=async p=>{await p.goto(base);await p.getByRole('status').filter({hasText:'Device storage ready'}).waitFor()};
const add=async(p,load='185',reps='5')=>{await p.getByLabel('Weight',{exact:true}).fill(load);await p.getByLabel('Reps',{exact:true}).fill(reps);await p.getByRole('button',{name:'Log set'}).click()};
const save=async p=>{await p.getByRole('button',{name:'Finish & save on this browser'}).click();await p.getByRole('status').filter({hasText:'Saved on this browser.'}).waitFor()};
try{
 for(const width of [390,820,1440]){
  const ctx=await browser.newContext({viewport:{width,height:1000}}),p=await ctx.newPage();p.on('pageerror',e=>errors.push(e.message));
  await ready(p);assert.equal(await p.locator('#finish').isDisabled(),true);
  await add(p);await add(p,'100','10');assert.equal(await p.locator('#volume').textContent(),'0 kg·reps / 1925 lb·reps');
  await save(p);assert.equal(await p.locator('#count').textContent(),'1');
  await p.reload();await p.locator('.history-card').waitFor();assert.match(await p.locator('.history-card').textContent(),/1925 lb·reps/);
  assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  p.once('dialog',d=>d.dismiss());await p.getByRole('button',{name:'Delete saved workout'}).click();assert.equal(await p.locator('.history-card').count(),1);
  p.once('dialog',d=>d.accept());await p.getByRole('button',{name:'Delete saved workout'}).click();await p.getByRole('status').filter({hasText:'Deleted from this browser'}).waitFor();
  await p.reload();await p.getByText('No saved workouts yet. Your next session starts the record.').waitFor();
  results.push({width,saveReloadVolumeDelete:true,noOverflow:true});await ctx.close();
 }
 const ctx=await browser.newContext(),p=await ctx.newPage();await ready(p);
 await add(p,'-1');assert.equal(await p.locator('#sets .set').count(),0);
 await add(p);await p.evaluate(()=>{Storage.prototype.setItem=function(){throw new DOMException('Quota exceeded','QuotaExceededError')}});
 await p.locator('#finish').click();await p.getByRole('status').filter({hasText:'Quota exceeded'}).waitFor();assert.equal(await p.locator('#sets .set').count(),1);assert.equal(await p.locator('#count').textContent(),'0');
 results.push({quotaErrorPreservesDraft:true});await ctx.close();
 const tabs=await browser.newContext(),a=await tabs.newPage(),b=await tabs.newPage();await Promise.all([ready(a),ready(b)]);
 await a.getByLabel('Session name').fill('Tab A');await b.getByLabel('Session name').fill('Tab B');await Promise.all([add(a),add(b)]);await Promise.all([save(a),save(b)]);
 await a.getByRole('button',{name:'Refresh history'}).click();await a.waitForFunction(()=>document.querySelector('#count').textContent==='2');assert.equal(await a.locator('.history-card').count(),2);results.push({twoTabWritesNoLostWorkouts:true});await tabs.close();
 const bad=await browser.newContext(),c=await bad.newPage();await ready(c);await c.evaluate(()=>{localStorage.setItem('montewo.checkpoint.workouts.v1.0','broken');localStorage.setItem('montewo.checkpoint.workouts.v1.1','also broken')});await c.reload();await c.getByRole('status').filter({hasText:'has not been overwritten'}).waitFor();assert.equal(await c.locator('#finish').isDisabled(),true);assert.equal(await c.locator('#count').textContent(),'—');results.push({corruptStorageFailsClosed:true});await bad.close();
 assert.deepEqual(errors,[]);
}finally{await browser.close()}
const profile=await mkdtemp(join(tmpdir(),'montewo-workout-profile-'));let context;
try{
 context=await chromium.launchPersistentContext(profile,{headless:true});let p=await context.newPage();await ready(p);await add(p);await save(p);await context.close();context=null;
 context=await chromium.launchPersistentContext(profile,{headless:true});p=await context.newPage();await ready(p);assert.equal(await p.locator('#count').textContent(),'1');assert.match(await p.locator('.history-card').textContent(),/925 lb·reps/);results.push({browserProcessRestartPreservesHistory:true});
}finally{if(context)await context.close();await rm(profile,{recursive:true,force:true})}
const report={scope:'Shared-engine browser harness, NOT a native install test',results,consoleErrors:errors};
await writeFile('docs/mobile/workout-checkpoint/browser-results.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));
