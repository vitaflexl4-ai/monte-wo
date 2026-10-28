import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
const read=p=>readFileSync(p,'utf8');
const ventures=JSON.parse(read('content/group/ventures.json'));
test('Group: parent identity is explicit and separate from product runtime',()=>{
 const doc=read('public/index.html');
 for(const text of ['Beyond','the obvious.','VITAFLEX BUSINESS GROUP','id="ventures"','data-design="noir"'])assert.ok(doc.includes(text),text);
 assert.doesNotMatch(doc,/mailto:|id="contact"|id="about"|hero-intro/);
 assert.doesNotMatch(doc,/src="\/(app|phone-cockpit|cockpit)\.js/);
 assert.match(doc,/canonical" href="https:\/\/vitaflexbusinessgroup.com\/"/);
});
test('Group: venture registry provides honest, resolvable destinations',()=>{
 assert.equal(ventures.length,2);
 for(const v of ventures){assert.ok(v.name&&v.category&&v.description&&v.slug);assert.ok(v.status===null||['Operating','In Development','Coming Soon'].includes(v.status));assert.ok(existsSync(`public/ventures/${v.slug}/index.html`));if(v.logo)assert.ok(existsSync('public'+v.logo));if(v.destination)assert.ok(existsSync('public'+v.destination+'index.html'));}
 assert.equal(ventures[1].destination,null);assert.equal(ventures[1].status,null);
});
test('Group: preserved product and offline upgrade remain available',()=>{
 assert.match(read('public/monte-wo/index.html'),/APP CONCEPT/);
 assert.match(read('public/monte-wo/index.html'),/NO ATHLETE DATA/);
 const sw=read('public/sw.js');assert.match(sw,/montewo-core-v21-official-logo/);assert.ok(sw.includes("'/group.css'"));
 assert.equal(sw.split("'/group.css'").length-1,1,'Repeated builds must not duplicate cache assets');
});

test('Group: supplied official logo replaces placeholders without changing originals',()=>{
 const home=read('public/index.html');
 assert.match(home,/src="\/assets\/group\/vitaflex-business-group.webp"/);
 assert.match(home,/src="\/assets\/group\/vitaflex-monogram.webp"/);
 assert.doesNotMatch(home,/group-sculpture.svg|brand-symbol/);
 for(const file of ['brand-assets/group/vitaflex-business-group-original.png','brand-assets/group/vitaflex-business-group-tagline-original.png','public/assets/group/favicon.png'])assert.ok(existsSync(file));
});
