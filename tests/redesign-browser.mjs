import {chromium,webkit,devices} from '@playwright/test';
import fs from 'node:fs/promises';
const base=process.env.PREVIEW_URL||'http://127.0.0.1:8082';
const output=process.env.QA_OUTPUT||'docs/mobile/redesign-qa';await fs.mkdir(output,{recursive:true});
const results=[];
for(const [label,engine,options] of [['phone',chromium,{viewport:{width:390,height:844}}],['ipad',webkit,{...devices['iPad (gen 7)']}],['desktop',chromium,{viewport:{width:1440,height:1000}}]]){
 let browser;try{browser=await engine.launch({headless:true});const page=await browser.newPage(options);const errors=[];page.on('pageerror',e=>errors.push(e.message));const failed=[];page.on('response',r=>{if(r.status()>=400)failed.push({url:r.url(),status:r.status()})});
 await page.goto(base+'/mobile/');await page.getByRole('button',{name:'Get Started',exact:true}).waitFor();await page.screenshot({path:`${output}/${label}-welcome.png`});
 await page.getByRole('button',{name:'Get Started',exact:true}).click();await page.getByText('Your Discipline Ranks',{exact:true}).waitFor();await page.screenshot({path:`${output}/${label}-home.png`});
 if(await page.getByText('NOT RANKED',{exact:true}).count()!==4)throw Error('Expected 4 unranked disciplines');
 await page.getByRole('button',{name:/Muscle map Find/}).click();await page.getByText('EXPLORE YOUR MOVEMENT',{exact:true}).waitFor();await page.screenshot({path:`${output}/${label}-map.png`});
 await page.locator('#muscle-f-legs path').first().click();if(await page.getByText('Legs',{exact:true}).count()<2)throw Error('Muscle selection failed');await page.getByRole('button',{name:'Back view',exact:true}).click();await page.getByTestId('premium-region-back').click();await page.getByRole('button',{name:'Explore →',exact:true}).click();await page.getByText('Find your next lift.',{exact:true}).waitFor();
 await page.getByRole('button',{name:'All',exact:true}).click();await page.getByRole('textbox',{name:'Search exercises or muscles'}).fill('bench');await page.getByRole('button',{name:/Bench press Pectorals/}).click();await page.getByText('HOW TO APPROACH IT',{exact:true}).waitFor();await page.screenshot({path:`${output}/${label}-exercise.png`});
 const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1);if(overflow)throw Error('Horizontal overflow');if(errors.length)throw Error(errors.join('\n'));if(failed.length)throw Error(JSON.stringify(failed));
 results.push({label,passed:true,errors,failed});
 }catch(e){results.push({label,passed:false,error:e.stack})}finally{await browser?.close()}
}
await fs.writeFile(output+'/results.json',JSON.stringify(results,null,2));console.log(JSON.stringify(results,null,2));if(results.some(r=>!r.passed))process.exitCode=1;
