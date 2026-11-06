import assert from 'node:assert/strict';
const origin=process.env.VERIFY_ORIGIN||'https://vitaflexbusinessgroup.com';
// Avoid mistaking an older edge/tool cache response for the newly published build.
const revision=process.env.VERIFY_REVISION||process.env.GITHUB_SHA||Date.now().toString();
const current=(path,options={})=>fetch(origin+path+'?verify='+encodeURIComponent(revision),{signal:AbortSignal.timeout(30000),...options});
let profile='';
for(const [route,marker] of [['/','/assets/group/vitaflex-business-group.png'],['/ventures/monte-wo/','In Development'],['/ventures/vitaflex-training/','AVAILABILITY NOT ANNOUNCED'],['/ventures/vitaflex-intelligence-corp/','VitaFlex Intelligence Corp'],['/ventures/lifeline/','Lifeline'],['/sony/','Sony Alexis | Professional Profile &amp; Biography'],['/monte-wo/','MONTE'],['/tools/','strength-tools']]){
 const response=await current(route);
 assert.equal(response.status,200,route);const body=await response.text();assert.ok(body.includes(marker),route+' missing deployed content');if(route==='/sony/')profile=body;
 console.log('Verified deployed route:',origin+route,response.status,marker);
}
const response=await current('/api/intelligence/overview',{redirect:'manual'});
assert.ok([301,302,303,307,308,401,403,503].includes(response.status),'Private API must remain protected');
console.log('Verified API protection:',origin,response.status);

assert.ok(profile.includes('rel="canonical" href="https://vitaflexbusinessgroup.com/sony/"'));
assert.ok(profile.includes('application/ld+json'));
assert.ok(profile.includes('<h1 id="founder-name">Sony Alexis</h1>'));
for(const [path,marker] of [['/robots.txt','Sitemap: https://vitaflexbusinessgroup.com/sitemap.xml'],['/sitemap.xml','https://vitaflexbusinessgroup.com/sony/']]){
 const r=await current(path);assert.equal(r.status,200,path);assert.ok((await r.text()).includes(marker),path+' missing current SEO marker');
 console.log('Verified deployed SEO:',origin+path);
}
console.log('::notice title=Verified deployed SEO and routes::'+JSON.stringify({origin,profile:'Sony Alexis',canonical:'https://vitaflexbusinessgroup.com/sony/',routes:8,robots:true,sitemap:true}));
