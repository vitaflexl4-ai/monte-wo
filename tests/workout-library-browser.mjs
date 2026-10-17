import {chromium,webkit,devices} from '@playwright/test';
import assert from 'node:assert/strict';import fs from 'node:fs/promises';
const base=process.env.PREVIEW_URL||'http://127.0.0.1:8082',output='docs/mobile/workout-library/qa';await fs.mkdir(output,{recursive:true});const results=[];
const library=JSON.parse(await fs.readFile('apps/mobile/src/generated/workout-library.json','utf8'));
// Every deduplicated media object is reachable with its expected content type/size.
for(const p of library.records)for(const [kind,file]of Object.entries(p.files)){
 const url=base+'/workout-media/'+p.manifest.id+'/'+(kind==='poster'?'poster.jpg':kind+'.mp4');const r=await fetch(url,{method:'HEAD'});assert.equal(r.status,200,url);assert.equal(Number(r.headers.get('content-length')),file.bytes);assert.equal(r.headers.get('content-type'),kind==='poster'?'image/jpeg':'video/mp4');
}
const ranged=await fetch(base+'/workout-media/back-squat/demo.mp4',{headers:{Range:'bytes=0-31'}});assert.equal(ranged.status,206);assert.equal((await ranged.arrayBuffer()).byteLength,32);assert.match(ranged.headers.get('content-range'),/^bytes 0-31\//);
assert.equal((await fetch(base+'/workout-media/unknown/demo.mp4')).status,404);
assert.equal((await fetch(base+'/workout-media/back-squat/demo.mp4',{headers:{Range:'bytes=99999999-'}})).status,416);
for(const [label,engine,options]of [['phone',chromium,{viewport:{width:390,height:844}}],['ipad',webkit,{...devices['iPad (gen 7)']}],['desktop',chromium,{viewport:{width:1440,height:1000}}]]){
 let browser;try{
 browser=await engine.launch();const page=await browser.newPage(options);page.setDefaultTimeout(15000);const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(base+'/mobile/');await page.getByRole('button',{name:'Get Started',exact:true}).click();await page.getByRole('button',{name:'Open workout pack library'}).waitFor();await page.screenshot({path:output+'/'+label+'-dashboard.png'});
 await page.getByRole('button',{name:'Open workout pack library'}).click();await page.getByText('57 matching exercises',{exact:true}).waitFor();await page.getByText('62 exercises · 8 groups',{exact:true}).waitFor();await page.screenshot({path:output+'/'+label+'-library.png'});
 await page.getByRole('button',{name:'Mobility',exact:true}).click();await page.getByText('2 matching exercises',{exact:true}).waitFor();await page.getByRole('button',{name:'All',exact:true}).click();
 await page.getByRole('textbox',{name:'Search exercises or muscles'}).fill('Dumbbell bench press');await page.getByText('1 matching exercises',{exact:true}).waitFor();await page.getByText('Dumbbell bench press',{exact:true}).click();
 await page.getByText('SOURCE PACK ANIMATION',{exact:true}).waitFor();assert.equal(await page.locator('video').count(),0,'No video downloaded before choice');
 await page.getByRole('button',{name:'Demo · 21.5s',exact:true}).click();const video=page.locator('video');await video.waitFor();await video.evaluate(async v=>{v.muted=true;await v.play()});await page.waitForFunction(()=>document.querySelector('video')?.currentTime>0.25);assert.ok(Math.abs(await video.evaluate(v=>v.duration)-21.5)<.1);await video.evaluate(v=>v.pause());await page.screenshot({path:output+'/'+label+'-demo.png'});
 await page.getByRole('button',{name:'Loop · 4.3s',exact:true}).click();await page.locator('video').evaluate(async v=>{v.muted=true;await v.play()});await page.waitForFunction(()=>document.querySelector('video')?.currentTime>0.25);assert.equal(await page.locator('video').evaluate(v=>v.loop),true);assert.ok(Math.abs(await page.locator('video').evaluate(v=>v.duration)-4.3)<.1);
 assert.ok(await page.getByText('Browse-only exercise:',{exact:false}).count());assert.equal(await page.getByText('HOW TO APPROACH IT',{exact:true}).count(),0);
 await page.getByLabel('MONTE WO, back').click();await page.getByRole('textbox',{name:'Search exercises or muscles'}).fill('bench');await page.getByText('Bench press',{exact:true}).click();await page.getByText('HOW TO APPROACH IT',{exact:true}).waitFor();assert.equal(await page.getByText('Browse-only exercise:',{exact:false}).count(),0);
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);assert.deepEqual(errors,[]);
 results.push({label,passed:true,demoPlayback:true,loopPlayback:true,errors});
 }catch(e){results.push({label,passed:false,error:e.stack})}finally{await browser?.close()}
}
const result={mediaHeadChecks:171,range206:true,unknown404:true,invalidRange416:true,browser:results};await fs.writeFile(output+'/results.json',JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result,null,2));if(results.some(r=>!r.passed))process.exitCode=1;
