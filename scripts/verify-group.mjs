import {assertSonyBiography} from './personal-preservation.mjs';
import assert from 'node:assert/strict';
import {readFileSync,mkdirSync,writeFileSync} from 'node:fs';
const origin=process.env.VERIFY_ORIGIN||'https://vitaflexbusinessgroup.com';
// Avoid mistaking an older edge/tool cache response for the newly published build.
const revision=process.env.VERIFY_REVISION||process.env.GITHUB_SHA||Date.now().toString();
const current=(path,options={})=>fetch(origin+path+'?verify='+encodeURIComponent(revision),{signal:AbortSignal.timeout(30000),...(process.env.VERIFY_USER_AGENT?{headers:{'User-Agent':process.env.VERIFY_USER_AGENT}}:{}),...options});
let profile='',homepage='';
for(const [route,marker] of [['/','/assets/group/vitaflex-business-group.png'],['/ventures/monte-wo/','In Development'],['/ventures/vitaflex-training/','AVAILABILITY NOT ANNOUNCED'],['/ventures/vitaflex-intelligence-corp/','VitaFlex Intelligence'],['/sony/','Sony Alexis | VitaFlex Business Group'],['/sony/three-daily-wins/','SPIRIT. BODY. MIND.'],['/monte-wo/','MONTE'],['/tools/','strength-tools']]){
 const response=await current(route);
 assert.equal(response.status,200,route);const body=await response.text();assert.ok(body.includes(marker),route+' missing deployed content');if(route==='/sony/')profile=body;if(route==='/')homepage=body;
 if(route==='/'){assert.ok(body.includes('Beyond<br><em>the obvious.</em>'));assert.equal((body.match(/class="venture-row /g)||[]).length,3);assert.equal((body.match(/>Meet Sony Alexis<\/a>/g)||[]).length,1);assert.ok(!body.includes('id="presence-score"'));}
 if(route==='/'||route.startsWith('/ventures/')){
  const footer=body.match(/<footer\b[\s\S]*?<\/footer>/)?.[0];assert.ok(footer,'Corporate footer must exist');
  assert.ok(!footer.includes('href="/privacy/"'),'Corporate Privacy link must be absent');assert.ok(footer.includes('>Meet Sony Alexis</a>'),'Existing profile link must remain');
 }
 console.log('Verified deployed route:',origin+route,response.status,marker);
}
const response=await current('/api/intelligence/overview',{redirect:'manual'});
assert.ok([301,302,303,307,308,401,403,503].includes(response.status),'Private API must remain protected');
console.log('Verified API protection:',origin,response.status);
const policy=await current('/privacy/');assert.equal(policy.status,200,'MONTE WO privacy policy remains available');
assert.ok(Buffer.from(await policy.arrayBuffer()).equals(readFileSync('public/privacy/index.html')),'Served MONTE WO privacy policy must match unchanged build bytes');

assert.ok(profile.includes('rel="canonical" href="https://vitaflexbusinessgroup.com/sony/"'));
assert.ok(profile.includes('application/ld+json'));
assertSonyBiography(profile);
const homeBlocks=[...homepage.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)];
assert.equal(homeBlocks.length,1,'One homepage graph, not duplicate schemas');
const homeGraph=JSON.parse(homeBlocks[0][1]);assert.equal(homeGraph['@context'],'https://schema.org');assert.equal(homeGraph['@graph'].length,2);
const org=homeGraph['@graph'].find(n=>n['@type']==='Organization');const website=homeGraph['@graph'].find(n=>n['@type']==='WebSite');
assert.equal(org['@id'],'https://vitaflexbusinessgroup.com/#organization');assert.equal(org.name,'VitaFlex Business Group');assert.equal(org.url,'https://vitaflexbusinessgroup.com/');
assert.equal(website['@id'],'https://vitaflexbusinessgroup.com/#website');assert.equal(website.publisher['@id'],org['@id']);assert.equal(website.url,org.url);
const source=JSON.parse(readFileSync('content/group/founder.json','utf8'));
const escape=text=>text.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#x27;');
assert.ok(profile.includes(`name="description" content="${escape(source.description)}"`),'Current metadata description must be deployed');
const scripts=[...profile.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)];
assert.equal(scripts.length,1);
const schema=JSON.parse(scripts[0][1]);
assert.equal(schema['@context'],'https://schema.org');
assert.equal(schema['@graph'].length,3);
for(const type of ['Person','ProfilePage','Organization'])assert.equal(schema['@graph'].filter(n=>n['@type']===type).length,1);
const person=schema['@graph'].find(n=>n['@type']==='Person');
const organization=schema['@graph'].find(n=>n['@type']==='Organization');
assert.equal(person.name,'Sony Alexis');assert.equal(person.alternateName,'Sony Holmes');assert.ok(!/Sony Holmes/i.test(profile.match(/<body\b[\s\S]*?<\/body>/)[0]));assert.equal(person.affiliation['@id'],organization['@id']);
assert.equal(person.hasCredential,undefined,'Unverified credentials must be excluded');
assert.ok(!person.alumniOf&&!person.sameAs&&!person.jobTitle&&!person.nationality);
mkdirSync('evidence',{recursive:true});
writeFileSync(`evidence/verified-seo-${new URL(origin).hostname}.json`,JSON.stringify({origin,title:source.seoTitle,description:source.description,canonical:'https://vitaflexbusinessgroup.com/sony/',schema,homeGraph},null,2));
for(const [path,marker] of [['/robots.txt','Sitemap: https://vitaflexbusinessgroup.com/sitemap.xml'],['/sitemap.xml','https://vitaflexbusinessgroup.com/sony/']]){
 const r=await current(path);assert.equal(r.status,200,path);const text=await r.text();assert.ok(text.includes(marker),path+' missing current SEO marker');
 if(path==='/robots.txt')for(const privatePath of ['/api/','/strength/admin/','/intelligence/','/account/callback/'])assert.ok(text.includes('Disallow: '+privatePath));
 console.log('Verified deployed SEO:',origin+path);
}
console.log('::notice title=Verified deployed SEO and routes::'+JSON.stringify({origin,profile:'Sony Alexis',canonical:'https://vitaflexbusinessgroup.com/sony/',routes:11,robots:true,sitemap:true,personEntities:1,publishedDegrees:0,homepageOrganization:true,websiteSchema:true,corporatePrivacyLink:false,alternateName:'Sony Holmes',requestUserAgent:process.env.VERIFY_USER_AGENT||'Node default',notVerifiedCrawlerTraffic:true,appPrivacyUnchanged:true,apiStatus:response.status}));
