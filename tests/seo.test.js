import {assertIntelligenceAnnouncement,announcementPath} from '../scripts/intelligence-preservation.mjs';
import {normalizePersonalAdditions,stripResourceHub,assertSonyBiography} from './helpers/personal-preservation.mjs';
import test from 'node:test';
import {normalizeDownloadedPagesConfig} from '../scripts/pages-config.mjs';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
const read=p=>readFileSync(p,'utf8');
const origin='https://vitaflexbusinessgroup.com';
const profile=read('public/sony/index.html');
const source=JSON.parse(read('content/group/founder.json'));
const unescape=s=>s.replaceAll('&amp;','&').replaceAll('&quot;','"').replaceAll('&#x27;',"'").replaceAll('&lt;','<').replaceAll('&gt;','>');
const head=doc=>doc.match(/<head>([\s\S]*?)<\/head>/)[1];
const meta=(doc,key)=>[...head(doc).matchAll(/<meta (?:name|property)="([^"]+)" content="([^"]*)"/g)].filter(m=>m[1]===key).map(m=>unescape(m[2]));

test('SEO: exact owner-approved identity, metadata, H1 and canonical',()=>{
 assert.equal(unescape(profile.match(/<title>(.*?)<\/title>/)[1]),'Sony Alexis | VitaFlex Business Group');
 assert.deepEqual(meta(profile,'description'),[source.description]);
 assert.equal(source.description,'Discover Sony Alexis, also known as Sony Holmes — his background in business administration, fitness, technology, and connection to Haiti.');
 assert.match(profile,/<h1 id="founder-name"><span>Sony<\/span> <span>Alexis<\/span><\/h1>/);
 assert.equal((profile.match(/<h1\b/g)||[]).length,1);
 assert.match(profile,/rel="canonical" href="https:\/\/vitaflexbusinessgroup.com\/sony\/"/);
 assert.deepEqual(meta(profile,'robots'),['index, follow, max-image-preview:large']);
 for(const [key,value] of Object.entries({'og:title':source.seoTitle,'og:description':source.description,'og:url':origin+'/sony/','og:type':'profile','twitter:card':'summary_large_image','twitter:title':source.seoTitle,'twitter:description':source.description}))assert.deepEqual(meta(profile,key),[value],key);
 for(const key of ['og:image','twitter:image']){const [image]=meta(profile,key);assert.ok(image.startsWith(origin+'/'));assert.ok(existsSync('public'+new URL(image).pathname));}
 for(const key of ['og:image:alt','twitter:image:alt'])assert.equal(meta(profile,key).length,1);
});

test('SEO: valid JSON-LD ProfilePage references the supported Person',()=>{
 const scripts=[...profile.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)];assert.equal(scripts.length,1);
 const data=JSON.parse(scripts[0][1]);assert.equal(data['@context'],'https://schema.org');assert.equal(data['@graph'].length,3);
 const person=data['@graph'].find(n=>n['@type']==='Person');const page=data['@graph'].find(n=>n['@type']==='ProfilePage');
 assert.equal(person.name,'Sony Alexis');assert.equal(person.url,origin+'/sony/');assert.equal(page.url,person.url);assert.equal(page.mainEntity['@id'],person['@id']);
 assert.deepEqual(person.affiliation,{'@id':origin+'/#organization'});
 const organization=data['@graph'].find(n=>n['@type']==='Organization');
 assert.deepEqual(organization,{'@type':'Organization','@id':origin+'/#organization',name:'VitaFlex Business Group',url:origin+'/'});
 assert.equal(person.mainEntityOfPage['@id'],page['@id']);
 assert.equal(data['@graph'].filter(n=>n['@type']==='Person').length,1);
 assert.equal(new Set(data['@graph'].map(n=>n['@id'])).size,3);
 assert.ok(!Object.keys(person).some(key=>['jobTitle','award','address','sameAs','image','worksFor','birthDate'].includes(key)));
 assert.deepEqual(person.knowsAbout,['Business administration','Leadership','Entrepreneurship','Fitness','Technology','Artificial intelligence','Continuous learning']);
 assert.equal(person.hasCredential,undefined,'Credentials without independent verification must not enter structured data');
 const prose=source.chapters.flatMap(c=>c.paragraphs).join(' ');
 assert.ok(prose.includes("bachelor's degree in Business Administration"));assert.ok(prose.includes('Master of Business Administration (MBA)'));
 assert.doesNotMatch(scripts[0][1],/Liberty|CleanCap|CJVitaFlex|alumniOf|sameAs|nationality|jobTitle|birthDate|recognizedBy|credentialId/);
 assert.equal(page.name,source.seoTitle);assert.equal(page.inLanguage,'en');
});

test('SEO: group documents have unique titles/descriptions, complete social metadata, valid heading structure and alt attributes',()=>{
 const titles=new Set(),descriptions=new Set();
 for(const route of JSON.parse(read('public/group-routes.json')).filter(p=>p!=='/monte-wo/')){
  const doc=read('public'+(route==='/'?'/index.html':route+'index.html'));
  const title=doc.match(/<title>(.*?)<\/title>/)[1],description=meta(doc,'description');
  assert.equal((doc.match(/<title>/g)||[]).length,1);assert.equal(description.length,1);
  assert.ok(!titles.has(title));assert.ok(!descriptions.has(description[0]));titles.add(title);descriptions.add(description[0]);
  assert.equal((doc.match(/rel="canonical"/g)||[]).length,1);
  assert.ok(doc.includes(`rel="canonical" href="${origin}${route}"`));
  const keys=[...head(doc).matchAll(/<meta (?:name|property)="([^"]+)"/g)].map(m=>m[1]);assert.equal(new Set(keys).size,keys.length);
  for(const key of ['og:title','og:description','og:url','og:image','twitter:card','twitter:title','twitter:description','twitter:image'])assert.equal(meta(doc,key).length,1,route+' '+key);
  for(const image of doc.matchAll(/<img\b[^>]*>/g))assert.match(image[0],/\balt="[^"]*"/);
  const levels=[...doc.matchAll(/<h([1-6])\b/g)].map(m=>Number(m[1]));assert.equal(levels.filter(l=>l===1).length,1);for(let i=1;i<levels.length;i++)assert.ok(levels[i]<=levels[i-1]+1);
 }
 assert.match(read('public/index.html'),/<a href="\/sony\/">Meet Sony Alexis<\/a>/);
});

test('SEO: crawlable preferred-domain sitemap is deduplicated and excludes private surfaces',()=>{
 const robots=read('public/robots.txt');assert.match(robots,/User-agent: \*\nAllow: \/\n/);assert.ok(robots.includes('Sitemap: '+origin+'/sitemap.xml'));assert.doesNotMatch(robots,/Disallow: \/(?:\s|$)|Disallow: \/sony/);
 const urls=[...read('public/sitemap.xml').matchAll(/<loc>([^<]+)<\/loc>/g)].map(m=>m[1]);assert.ok(urls.includes(origin+'/sony/'));assert.equal(urls.length,new Set(urls).size);
 for(const url of urls){assert.ok(url.startsWith(origin+'/'));const path=new URL(url).pathname;assert.ok(!/^\/(?:api|intelligence|account\/callback|strength\/admin|founder)(?:\/|$)/.test(path));const file='public'+path+'index.html';assert.ok(existsSync(file));const doc=read(file);assert.doesNotMatch(head(doc),/name="robots" content="noindex/);assert.ok(doc.includes(`rel="canonical" href="${url}"`),url);}
 for(const path of ['/account/callback/','/strength/admin/'])assert.match(read('public'+path+'index.html'),/name="robots" content="noindex, nofollow"/);
});

test('SEO: all sitemap pages have unique titles and descriptions',()=>{
 const titles=new Set(),descriptions=new Set();
 for(const match of read('public/sitemap.xml').matchAll(/<loc>([^<]+)<\/loc>/g)){
  const path=new URL(match[1]).pathname;const doc=read('public'+path+'index.html');
  const title=unescape(doc.match(/<title>(.*?)<\/title>/s)[1]);
  const description=unescape(doc.match(/<meta\s+name="description"\s+content="([^"]*)"/)[1]);
  assert.ok(!titles.has(title),path+' duplicate title');assert.ok(!descriptions.has(description),path+' duplicate description');titles.add(title);descriptions.add(description);
 }
});

test('SEO: publication is restricted to the existing project and preserves configuration',()=>{
 const publish=read('scripts/publish-group-domain.mjs');const workflow=read('.github/workflows/deploy-group.yml');
 assert.match(publish,/const project='vitaflex'/);assert.match(publish,/before.production_branch,'main'/);assert.match(publish,/pages','download','config',project,'--force'/);
 assert.doesNotMatch(publish,/deploy-intelligence|pages','project','create|d1','|wrangler\(\['deploy'/);
 assert.doesNotMatch(workflow,/node scripts\/deploy-intelligence.mjs/);
 assert.match(publish,/Existing production \$\{key\} must remain unchanged/);
 assert.match(workflow,/node --test tests\/seo.test.js/);
 const sw=read('public/sw.js');for(const weight of [400,600])assert.equal(sw.split(`'/assets/inter-${weight}.woff2'`).length-1,1);
});


test('SEO deployment: empty downloaded placement tables are omitted, explicit modes and bindings preserved',()=>{
 const source='name = "vitaflex"\n[placement]\n\n[env.production]\ncompatibility_date = "2025-01-01"\n[env.production.placement]\n# downloaded empty table\n\n[[env.production.d1_databases]]\nbinding = "DB"\ndatabase_id = "existing-db"\n[env.preview.placement]\nmode = "smart"\n';
 const normalized=normalizeDownloadedPagesConfig(source);
 assert.ok(!normalized.includes('[placement]'));
 assert.ok(!normalized.includes('[env.production.placement]'));
 assert.ok(normalized.includes('[env.preview.placement]\nmode = "smart"'));
 assert.ok(normalized.includes('database_id = "existing-db"'));
 assert.equal(normalizeDownloadedPagesConfig(normalized),normalized);
 for(const mode of ['off','smart'])assert.equal(normalizeDownloadedPagesConfig(`[placement]\nmode = "${mode}"\n`),`[placement]\nmode = "${mode}"\n`);
 assert.equal(normalizeDownloadedPagesConfig('[placement]\n'),'');
});

test('Preservation: other pages remain exact; authorized Sony redesign preserves original biography',async()=>{
 const {createHash}=await import('node:crypto');
 const baseline=JSON.parse(read('tests/fixtures/seo-visible-baseline.json'));
 const sha=value=>createHash('sha256').update(value).digest('hex');
 for(const [file,expected] of Object.entries(baseline.htmlBodies)){if(file===announcementPath){assertIntelligenceAnnouncement(read(file));continue;}
  if(file==='public/ventures/lifeline/index.html'){assert.equal(existsSync(file),false);continue;}if(file==='public/sony/index.html'){assertSonyBiography(read(file));continue;}
  const html=file==='public/index.html'?normalizePersonalAdditions(file,read(file)):read(file);let body=html.match(/<body\b[^>]*>[\s\S]*?<\/body>/)?.[0]||html;
  // Explicitly normalize ONLY the newly authorized changes against the unchanged baseline.
  const corporate=['public/index.html','public/sony/index.html',...JSON.parse(read('public/group-routes.json')).filter(p=>p.startsWith('/ventures/')).map(p=>'public'+p+'index.html')];
  if(corporate.includes(file)){
   assert.ok(!body.includes('<a href="/privacy/">Privacy</a>'));
   body=body.replace(/(<a href="\/sony\/"(?: aria-current="page")?>Meet Sony Alexis<\/a>)/,'$1<a href="/privacy/">Privacy</a>');
  }
  assert.equal(sha(body),expected,file+' visible body changed');
 }
 for(const [file,expected] of Object.entries(baseline.staticFiles))assert.equal(sha(normalizePersonalAdditions(file,readFileSync(file))),expected,file+' asset changed');
 const {description,alternateName,...visibleSource}=structuredClone(source);
 assert.equal(alternateName,'Sony Holmes');
 // Only the explicitly authorized head title changes; the original fixture stays untouched.
 assert.equal(visibleSource.seoTitle,'Sony Alexis | VitaFlex Business Group');
 visibleSource.seoTitle=baseline.visibleProfileSource.seoTitle;
 assert.deepEqual(visibleSource,baseline.visibleProfileSource);
 console.log(`Technical-only preservation: ${Object.keys(baseline.htmlBodies).length} HTML bodies match baseline after only authorized footer normalization; ${Object.keys(baseline.staticFiles).length} static files unchanged.`);
});

test('Technical-only SEO: AI/search crawlers share public access and private exclusions',()=>{
 const robots=read('public/robots.txt');
 assert.deepEqual([...robots.matchAll(/^User-agent: (.+)$/gm)].map(m=>m[1]),['*']);
 assert.deepEqual([...robots.matchAll(/^Allow: (.+)$/gm)].map(m=>m[1]),['/']);
 assert.deepEqual([...robots.matchAll(/^Disallow: (.+)$/gm)].map(m=>m[1]),['/api/','/strength/admin/','/intelligence/','/account/callback/']);
 assert.ok(!existsSync('public/llms.txt'),'No unnecessary new public discovery document');
 const headers=read('public/_headers');
 assert.match(headers,/\/intelligence\/\*[\s\S]*?X-Robots-Tag: noindex, nofollow/);
 assert.match(headers,/\/account\/callback\/\*[\s\S]*?X-Robots-Tag: noindex, nofollow/);
 assert.doesNotMatch(headers,/\/sony\/\*[\s\S]*?noindex/);
});

test('Entity recognition: homepage Organization/WebSite agree with existing Sony entity IDs',()=>{
 const home=read('public/index.html');const blocks=[...home.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)];
 assert.equal(blocks.length,1);const graph=JSON.parse(blocks[0][1]);assert.equal(graph['@context'],'https://schema.org');assert.equal(graph['@graph'].length,2);
 const org=graph['@graph'].find(n=>n['@type']==='Organization');const site=graph['@graph'].find(n=>n['@type']==='WebSite');
 assert.equal(org.name,'VitaFlex Business Group');assert.equal(org.url,origin+'/');assert.equal(org['@id'],origin+'/#organization');
 assert.equal(site['@id'],origin+'/#website');assert.equal(site.url,org.url);assert.equal(site.name,org.name);assert.equal(site.publisher['@id'],org['@id']);
 assert.ok(existsSync('public'+new URL(org.logo).pathname));
 const profileGraph=JSON.parse(profile.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1])['@graph'];
 const profileOrg=profileGraph.find(n=>n['@type']==='Organization');for(const [key,value] of Object.entries(profileOrg))assert.equal(org[key],value);
 assert.equal(profileGraph.find(n=>n['@type']==='Person').affiliation['@id'],org['@id']);
 assert.doesNotMatch(blocks[0][1],/sameAs|founder|employee|foundingDate|legalName|taxID|award|address/);
});

test('Entity recognition: HTTP audit detects noindex, broken canonical and metadata duplication',async()=>{
 const {inspectPublicHTML}=await import('../scripts/audit-public-seo.mjs');
 const home=read('public/index.html');assert.deepEqual(inspectPublicHTML(home,origin+'/').problems,[]);
 assert.ok(inspectPublicHTML(home.replace('index, follow','noindex, follow'),origin+'/').problems.some(p=>p.includes('blocks indexing')));
 assert.ok(inspectPublicHTML(home,origin+'/wrong/').problems.some(p=>p.includes('Canonical')));
 assert.ok(inspectPublicHTML(home.replace('</head>','<title>Duplicate</title></head>'),origin+'/').problems.includes('Title missing/duplicated'));
});


test('Footer and alias release: corporate-only deletion, one identity, app policy untouched',async()=>{
 const {createHash}=await import('node:crypto');
 const graph=JSON.parse(profile.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1])['@graph'];
 const people=graph.filter(n=>n['@type']==='Person');assert.equal(people.length,1);
 assert.equal(people[0].name,'Sony Alexis');assert.equal(people[0].alternateName,'Sony Holmes');
 assert.doesNotMatch(profile.match(/<body\b[\s\S]*?<\/body>/)[0],/Sony Holmes/i);
 assert.match(profile.match(/<head>[\s\S]*?<\/head>/)[0],/Sony Holmes/);
 assert.doesNotMatch(profile,/Austin Holmes|foster son|senate\.gov/);
 assert.equal((profile.match(/<main\b/g)||[]).length,1);
 const corporate=JSON.parse(read('public/group-routes.json')).filter(p=>p!=='/monte-wo/'&&p!=='/sony/'&&p!=='/sony/three-daily-wins/');
 for(const route of corporate){
  const doc=read('public'+(route==='/'?'/index.html':route+'index.html'));const footer=doc.match(/<footer\b[\s\S]*?<\/footer>/)[0];
  assert.ok(!footer.includes('href="/privacy/"'));assert.match(footer,/>Meet Sony Alexis<\/a>/);
  assert.equal((footer.match(/<a\b/g)||[]).length,route==='/ventures/vitaflex-intelligence-corp/'?2:1);
 }
 const sha=path=>createHash('sha256').update(readFileSync(path)).digest('hex');
 assert.equal(sha('public/monte-wo/index.html'),'65a339c207b7edf9784f8f98b9dfd81911f28433772816cd13cd8c361fc02ee3','Protected app/policy/style file changed');
 assert.equal(sha('public/privacy/index.html'),'5ad88f6a2e5100afb503ecd176960cb1d7106b5d29f44176f9e1146709369afa','Protected app/policy/style file changed');
 assert.equal(sha('public/group.css'),'0dc8d6ef0cbf3b3495a76594fed317a39d85f5c507374ecdbce4433b7a35159e','Protected app/policy/style file changed');
 assert.match(read('public/monte-wo/index.html'),/href="\/privacy\/"/);
 assert.ok(!existsSync('public/sony-holmes/index.html'));
});
