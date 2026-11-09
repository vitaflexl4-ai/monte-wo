import assert from 'node:assert/strict';
import{readFileSync}from'node:fs';
export const personalRoutes=['/sony/daily-devotion/','/sony/three-daily-wins/','/sony/blog/'];
const decode=s=>s.replaceAll('&#x27;',"'").replaceAll('&quot;','"').replaceAll('&lt;','<').replaceAll('&gt;','>').replaceAll('&amp;','&');
export function assertSonyBiography(html){
 const source=JSON.parse(readFileSync('content/group/founder.json','utf8'));
 const baseline=JSON.parse(readFileSync('tests/fixtures/seo-visible-baseline.json','utf8')).visibleProfileSource;
 for(const key of['chapters','closing','postscript'])assert.deepEqual(source[key],baseline[key],'Original biography source: '+key);
 const chapters=[...html.matchAll(/<section class="founder-chapter" id="([^"]+)"[^>]*>([\s\S]*?)<\/section>/g)];
 assert.deepEqual(chapters.map(m=>m[1]),source.chapters.map(c=>c.id),'All four story anchors, in original order');
 chapters.forEach((match,i)=>{const paragraphs=[...match[2].matchAll(/<p>([\s\S]*?)<\/p>/g)].map(m=>decode(m[1]));assert.deepEqual(paragraphs,source.chapters[i].paragraphs,'Every original paragraph, unchanged: '+match[1]);});
 assert.ok(html.includes(source.closing.replaceAll('&','&amp;').replaceAll("'",'&#x27;')),'Original closing');
 assert.ok(html.includes(source.postscript),'Original postscript');
 return true;
}
export function stripResourceHub(html){const hub=html.match(/<section\b[^>]*\bid="personal-resources"[\s\S]*?<!-- end-personal-resources -->/g)||[];assert.equal(hub.length,1,'One personal resource hub');for(const route of personalRoutes)assert.ok(hub[0].includes('href="'+route+'"'));return html.replace(hub[0],'').replace('<link rel="stylesheet" href="/sony/experiences.css">','');}
export function normalizePersonalAdditions(path,bytes){if(path==='public/group-routes.json'){const a=JSON.parse(String(bytes));assert.deepEqual(a.slice(-3),personalRoutes);assert.equal(a.length,10);return JSON.stringify(a.slice(0,-3),null,2)+'\n'}if(path==='public/sitemap.xml'){let s=String(bytes);for(const route of personalRoutes){const tag='<url><loc>https://vitaflexbusinessgroup.com'+route+'</loc></url>';assert.equal(s.split(tag).length-1,1);s=s.replace(tag,'')}return s}return bytes}
