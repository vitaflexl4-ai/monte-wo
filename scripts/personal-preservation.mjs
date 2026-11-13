import {normalizePortfolioChanges} from './portfolio-preservation.mjs';
import assert from 'node:assert/strict';
import{readFileSync}from'node:fs';
export const personalRoutes=['/sony/three-daily-wins/'];
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
// Historical comparison only: invert exactly the owner-authorized Lifeline row/count removal.
// This does not write restored content into the website.
export function normalizeLifelineRemoval(html){
 assert.ok(!html.includes('/ventures/lifeline/'),'Lifeline must be removed');
 assert.equal((html.match(/class="venture-row /g)||[]).length,3);
 assert.ok(html.includes('01 — 03'));
 html=html.replace(/<a class="venture-row bible-verse-memory-app"[\s\S]*?<\/a>/,"<a class=\"venture-row vitaflex-training\" href=\"/ventures/vitaflex-training/\"><span class=\"venture-index\">02</span><h2>VitaFlex <em>Training</em></h2><span class=\"venture-category\">FITNESS / MINDSET</span><span class=\"venture-arrow\" aria-hidden=\"true\">\u2197</span></a>").replace('VitaFlex <em>Intelligence</em>','VitaFlex <em>Intelligence Corp</em>');
 return html.replace('01 — 03','01 — 04').replace('<div class="portfolio-end">',LIFELINE_REFERENCE_ROW+'<div class="portfolio-end">');
}
const LIFELINE_REFERENCE_ROW="<a class=\"venture-row lifeline\" href=\"/ventures/lifeline/\"><span class=\"venture-index\">04</span><h2>Lifeline</h2><span class=\"venture-category\">GAME SIMULATION</span><span class=\"venture-arrow\" aria-hidden=\"true\">\u2197</span></a>";
export function normalizePersonalAdditions(path,bytes){bytes=normalizePortfolioChanges(path,bytes);if(path==='public/sw.js'){assert.ok(!String(bytes).includes('/ventures/lifeline/'));return String(bytes).replace("'/ventures/vitaflex-intelligence-corp/',","'/ventures/vitaflex-intelligence-corp/','/ventures/lifeline/',");}if(path==='public/index.html')return normalizeLifelineRemoval(String(bytes));if(path==='public/group-routes.json'){const a=JSON.parse(String(bytes));assert.deepEqual(a.slice(-1),personalRoutes);assert.equal(a.length,7);const prior=a.slice(0,-1);prior.splice(5,0,'/ventures/lifeline/');return JSON.stringify(prior,null,2)+'\n'}if(path==='public/sitemap.xml'){let s=String(bytes);for(const route of personalRoutes){const tag='<url><loc>https://vitaflexbusinessgroup.com'+route+'</loc></url>';assert.equal(s.split(tag).length-1,1);s=s.replace(tag,'')}s=s.replace('<url><loc>https://vitaflexbusinessgroup.com/sony/</loc></url>','<url><loc>https://vitaflexbusinessgroup.com/ventures/lifeline/</loc></url><url><loc>https://vitaflexbusinessgroup.com/sony/</loc></url>');return s}return bytes}
