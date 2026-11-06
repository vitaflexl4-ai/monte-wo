import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';

const read=path=>readFileSync(path,'utf8');
const profile=JSON.parse(read('content/group/founder.json'));
const founder=read('public/sony/index.html');
const routes=JSON.parse(read('public/group-routes.json'));
const escape=text=>text.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#x27;');
const docFor=route=>read('public'+(route==='/'?'/index.html':route+'index.html'));

test('Founder: source uses owner-authorized identity and personal essay, not a resume or venture launch',()=>{
 assert.equal(profile.name,'Sony Alexis');
 assert.equal(profile.title,'The Person Behind the Vision');
 assert.equal(profile.role,undefined);
 assert.equal(profile.subtitle,undefined);
 assert.doesNotMatch(founder.replace(/(?:class|id|aria-labelledby)="[^"]*"/g,''),/founder/i);
 assert.doesNotMatch(founder,/A non-alien|A journey of purpose, gratitude, and service/);
 assert.equal(profile.chapters.length,4);
 const paragraphs=profile.chapters.flatMap(chapter=>chapter.paragraphs);
 assert.equal(paragraphs.length,10);
 assert.ok(paragraphs.some(p=>p.includes("bachelor's degree in Business Administration")&&p.includes('Master of Business Administration (MBA)')));
 assert.ok(paragraphs.some(p=>p.includes('approximately eight years')));
 assert.ok(paragraphs.some(p=>p.includes('My faith in God')&&p.includes('Haiti')));
 assert.equal(profile.postscript,'The journey continues.');
 assert.doesNotMatch(founder,/<form\b|download=|mailto:|<iframe\b/);
 assert.equal((founder.match(/<img\b/g)||[]).length,1,'Only the existing group mark; no fabricated portrait');
});

test('Founder: every supplied paragraph is rendered verbatim and in order',()=>{
 let previous=founder.indexOf('<article');
 for(const text of [...profile.chapters.flatMap(c=>c.paragraphs),profile.closing,profile.postscript]){
  const position=founder.indexOf(escape(text),previous+1);
  assert.ok(position>previous,`Missing or reordered passage: ${text.slice(0,55)}`);
  previous=position;
 }
 assert.match(founder,/<h1 id="founder-name">Sony Alexis<\/h1>/);
 assert.match(founder,/<article[^>]+aria-labelledby="founder-name"/);
 assert.equal((founder.match(/<h1\b/g)||[]).length,1);
 assert.equal((founder.match(/<main\b/g)||[]).length,1);
 assert.equal((founder.match(/<h2\b/g)||[]).length,profile.chapters.length);
});

test('Founder: chapter anchors, metadata, canonical and current-page link are correct',()=>{
 for(const chapter of profile.chapters){
  assert.match(chapter.id,/^[a-z-]+$/);
  assert.ok(founder.includes(`href="#${chapter.id}"`));
  assert.ok(founder.includes(`id="${chapter.id}"`));
  assert.ok(founder.includes(`aria-labelledby="${chapter.id}-title"`));
 }
 assert.ok(founder.includes('<title>Sony Alexis | Professional Profile &amp; Biography</title>'));
 assert.ok(founder.includes('rel="canonical" href="https://vitaflexbusinessgroup.com/sony/"'));
 assert.ok(founder.includes('property="og:title" content="Sony Alexis | Professional Profile &amp; Biography"'));
 assert.ok(founder.includes(`name="description" content="${escape(profile.description)}"`));
 assert.ok(founder.includes('<a href="/sony/" aria-current="page">Meet Sony Alexis</a>'));
 assert.match(founder,/<main id="main" tabindex="-1">/);
});

test('Founder: added through the group footer, not the homepage portfolio or product navigation',()=>{
 const home=docFor('/');const main=home.match(/<main\b[^>]*>([\s\S]*?)<\/main>/)[1];
 assert.doesNotMatch(main,/Sony|SONY|founder/);
 assert.equal((main.match(/class="venture-row /g)||[]).length,4);
 assert.ok(main.includes('01 — 04'));
 for(const route of routes.filter(p=>p!=='/monte-wo/')){
  const doc=docFor(route);
  const footer=doc.match(/<footer\b[\s\S]*?<\/footer>/)[0];
  assert.ok(footer.includes('href="/sony/"'),route);
  assert.ok(footer.includes('href="/privacy/"'),route);
  assert.ok(doc.includes('href="/#ventures"'),route);
 }
 const productManifest=JSON.parse(read('public/website-routes.json'));
 assert.ok(!productManifest.includes('/sony/'),'The group essay must not enter the product build/navigation loop');
 assert.doesNotMatch(docFor('/monte-wo/'),/href="\/founder\/"/);
});

test('Founder: every group link, asset and fragment resolves without fabricated destinations',()=>{
 let checked=0;
 for(const route of routes){
  const doc=docFor(route);
  for(const match of doc.matchAll(/(?:href|src)="([^"<>]+)"/g)){
   const value=match[1];if(/^(https?:|mailto:|tel:|data:)/.test(value))continue;
   const url=new URL(value,'https://test.invalid'+route);
   if(url.pathname.startsWith('/api/'))continue;
   const path='public'+url.pathname+(url.pathname.endsWith('/')?'index.html':'');
   assert.ok(existsSync(path),`${route} → ${value}`);
   if(url.hash&&path.endsWith('.html'))assert.ok(read(path).includes(`id="${decodeURIComponent(url.hash.slice(1))}"`),`${route} → ${value}`);
   checked++;
  }
 }
 assert.ok(checked>=routes.length*6);console.log('Group links/assets/fragments checked:',checked);
});

test('Founder: offline upgrade is deduplicated and source content is not downloaded at runtime',()=>{
 const sw=read('public/sw.js');
 assert.match(sw,/montewo-core-v29-sony-alexis-seo/);
 assert.equal(sw.split("'/sony/'").length-1,1);
 assert.equal(routes.filter(route=>route==='/sony/').length,1);
 assert.doesNotMatch(founder,/fetch\(|founder\.json/);
 const css=read('public/group.css');assert.match(css,/prefers-reduced-motion/);
 assert.ok(read('scripts/build_website.py').includes("{'monte-wo','ventures','founder','sony'}"));
});

test('Biography update: only the definitive version is presented, with no duplicate profile',()=>{
 const text=profile.chapters.flatMap(chapter=>chapter.paragraphs).join('\n');
 assert.ok(text.includes('Fitness, in particular, holds a special place in my life.'));
 assert.ok(text.includes('listening can be as valuable as speaking'));
 assert.ok(text.includes('discretion over unnecessary attention'));
 assert.equal(profile.closing,'I hope to live with enough wisdom to keep learning, enough humility to keep listening, and enough conviction to keep serving.');
 for(const outdated of ['a lasting appreciation for the opportunities','Perhaps one of my most important personal lessons','remain a student of life','Ultimately, I hope to live a life','A journey of purpose, gratitude, and service.','A non-alien']){
  assert.ok(!founder.includes(escape(outdated)),outdated);
 }
 assert.equal(routes.filter(route=>route==='/sony/').length,1);
 assert.ok(!existsSync('public/founder/index.html'));
 assert.ok(read('public/_redirects').includes('/founder/ /sony/ 301'));
 assert.ok(founder.includes('<p class="founder-subtitle">The Person Behind the Vision</p>'));
});
