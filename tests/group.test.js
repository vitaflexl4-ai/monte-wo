import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
const read=p=>readFileSync(p,'utf8');
const ventures=JSON.parse(read('content/group/ventures.json'));
test('Group: parent identity is explicit and separate from product runtime',()=>{
 const doc=read('public/index.html');
 for(const text of ['We Build Ventures.','We Create','Possibilities.','THE PARENT COMPANY','One group. Multiple ventures.','id="ventures"','id="approach"','id="about"','id="contact"'])assert.ok(doc.includes(text),text);
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
 const sw=read('public/sw.js');assert.match(sw,/montewo-core-v19-venture-group/);assert.ok(sw.includes("'/group.css'"));
 assert.equal(sw.split("'/group.css'").length-1,1,'Repeated builds must not duplicate cache assets');
});
