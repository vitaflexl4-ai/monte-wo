import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(p,'utf8');
const source=read('public/cockpit.js');
const pure=source.slice(source.indexOf('export function phonePreviewValue'),source.indexOf('function bindPhoneCockpits'));
const {phonePreviewValue}=await import('data:text/javascript;base64,'+Buffer.from(pure).toString('base64'));
test('phone: load input only toggles a fixed illustrative badge, never computes a rank',()=>{
 for(const value of ['',' ','0'])assert.deepEqual(phonePreviewValue(value),{show:false,invalid:false});
 for(const value of ['1','185','3000'])assert.deepEqual(phonePreviewValue(value),{show:true,invalid:false});
 for(const value of ['-1','3001','Infinity','abc'])assert.deepEqual(phonePreviewValue(value),{show:false,invalid:true});
 assert.doesNotMatch(pure,/chanpyon|threshold|score|rankId/);
});
test('phone: both published index pages contain one accessible three-tab phone with explicit mock data',()=>{
 for(const path of ['public/monte-wo/index.html','public/app/index.html']){
  const s=read(path);assert.equal([...s.matchAll(/data-phone-cockpit/g)].length,1);
  assert.equal([...s.matchAll(/role="tab"/g)].length,3);assert.equal([...s.matchAll(/role="tabpanel"/g)].length,3);
  assert.equal([...s.matchAll(/data-phone-load=/g)].length,3);assert.equal([...s.matchAll(/data-phone-rank=/g)].length,3);
  assert.match(s,/Mock historical sets · nothing saved or synced/);assert.match(s,/Fixed example badge—not calculated from your load/);
  assert.match(s,/APP CONCEPT · NO ATHLETE DATA/);assert.doesNotMatch(s,/Static MONTE WO app concept|phone-left|phone-right/);
  assert.match(s,/<script type="module" src="\/cockpit.js"><\/script>/);
  const ids=[...s.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);assert.equal(ids.length,new Set(ids).size,'No duplicate SVG/ARIA IDs');
 }
});
test('phone: original avatar geometry and tier assignments are reused',()=>{
 const map=JSON.parse(read('public/cockpit-map.json')),page=read('public/app/index.html');
 for(const region of map.regions){for(const paths of Object.values(region.paths))for(const path of paths)assert.ok(page.includes(path));assert.ok(page.includes(map.ranks[region.tierId].label))}
 assert.match(page,/id="phone-hd"/);assert.match(page,/url\(#phone-tl\)/);
});
test('phone: instant handlers, page guards, keyboard navigation and reduced-motion support',()=>{
 const controller=source.slice(source.indexOf('function bindPhoneCockpits'),source.indexOf('bindPhoneCockpits();'));
 assert.doesNotMatch(controller,/fetch\(|localStorage|sessionStorage|post\(|setTimeout\(/);
 for(const key of ['ArrowLeft','ArrowRight','Home','End'])assert.ok(controller.includes(key));
 assert.match(controller,/prefers-reduced-motion: reduce/);
 assert.match(source,/if \(document.querySelector\("#boot-message"\)\)/);
 assert.match(source,/await import\("\.\/cockpit-tools.js"\)/);
 assert.match(read('public/phone-cockpit.css'),/position:absolute;inset:0/);
 assert.match(read('public/sw.js'),/montewo-core-v20-noir/);
});
test('phone: lightweight publisher and normal site builder both preserve the shared component',()=>{
 assert.match(read('scripts/build_website.py'),/from phone_cockpit import phone_markup, attach_assets/);
 assert.match(read('scripts/build_website.py'),/publish_phone\(\)/);
 assert.match(read('scripts/build_cockpit.py'),/phone-cockpit.css/);
});
