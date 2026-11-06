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
 assert.equal(unescape(profile.match(/<title>(.*?)<\/title>/)[1]),'Sony Alexis | Professional Profile & Biography');
 assert.deepEqual(meta(profile,'description'),[source.description]);
 assert.equal(source.description,'Discover the professional journey of Sony Alexis — his business interests, leadership, entrepreneurship, fitness, continuous learning, and work with VitaFlex Business Group.');
 assert.match(profile,/<h1 id="founder-name">Sony Alexis<\/h1>/);
 assert.equal((profile.match(/<h1\b/g)||[]).length,1);
 assert.match(profile,/rel="canonical" href="https:\/\/vitaflexbusinessgroup.com\/sony\/"/);
 assert.deepEqual(meta(profile,'robots'),['index, follow, max-image-preview:large']);
 for(const [key,value] of Object.entries({'og:title':source.seoTitle,'og:description':source.description,'og:url':origin+'/sony/','og:type':'profile','twitter:card':'summary','twitter:title':source.seoTitle,'twitter:description':source.description}))assert.deepEqual(meta(profile,key),[value],key);
 for(const key of ['og:image','twitter:image']){const [image]=meta(profile,key);assert.ok(image.startsWith(origin+'/'));assert.ok(existsSync('public'+new URL(image).pathname));}
 for(const key of ['og:image:alt','twitter:image:alt'])assert.equal(meta(profile,key).length,1);
});

test('SEO: valid JSON-LD ProfilePage references the supported Person',()=>{
 const scripts=[...profile.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)];assert.equal(scripts.length,1);
 const data=JSON.parse(scripts[0][1]);assert.equal(data['@context'],'https://schema.org');assert.equal(data['@graph'].length,2);
 const person=data['@graph'].find(n=>n['@type']==='Person');const page=data['@graph'].find(n=>n['@type']==='ProfilePage');
 assert.equal(person.name,'Sony Alexis');assert.equal(person.url,origin+'/sony/');assert.equal(page.url,person.url);assert.equal(page.mainEntity['@id'],person['@id']);
 assert.deepEqual(person.affiliation,{'@type':'Organization',name:'VitaFlex Business Group',url:origin+'/'});
 assert.ok(!Object.keys(person).some(key=>['jobTitle','award','address','sameAs','image','worksFor','birthDate'].includes(key)));
 assert.deepEqual(person.knowsAbout,['Business','Entrepreneurship','Fitness','Technology']);
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
