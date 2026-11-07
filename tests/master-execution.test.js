import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';import {createHash} from 'node:crypto';
const baseline=JSON.parse(readFileSync(new URL('./fixtures/master-protected-snapshot.json',import.meta.url)));const sha=s=>createHash('sha256').update(s).digest('hex');
const profile=readFileSync('public/sony/index.html','utf8');const source=JSON.parse(readFileSync('content/group/founder.json','utf8'));const schemaPattern=/<script type="application\/ld\+json">([\s\S]*?)<\/script>/;
test('Master execution: all 228 original public files including the approved homepage and route manifests are byte-identical',()=>{for(const [path,hash]of Object.entries(baseline.publicFiles)){assert.equal(sha(readFileSync(path)),hash,path);}console.log('Protected public files:',Object.keys(baseline.publicFiles).length);});
test('Master execution: exact Sony delta is head titles and credential omission, never biography or assets',()=>{
 assert.equal(sha(profile.match(/<body\b[\s\S]*?<\/body>/)[0]),baseline.profileBodySha256);
 const expected=JSON.parse(baseline.profileBeforeSchema);delete expected['@graph'].find(n=>n['@type']==='Person').hasCredential;expected['@graph'].find(n=>n['@type']==='ProfilePage').name=baseline.approvedTitle;
 assert.deepEqual(JSON.parse(profile.match(schemaPattern)[1]),expected);
 let normalized=profile.replace(schemaPattern,'<script type="application/ld+json">'+baseline.profileBeforeSchema+'</script>');
 const oldHTML=baseline.beforeTitle.replace('&','&amp;');
 normalized=normalized.replace('<title>'+baseline.approvedTitle+'</title>','<title>'+oldHTML+'</title>');
 for(const attribute of ['property="og:title"','name="twitter:title"'])normalized=normalized.replace(attribute+' content="'+baseline.approvedTitle+'"',attribute+' content="'+oldHTML+'"');
 assert.equal(sha(normalized),baseline.profileBeforeSha256);
});
test('Master execution: zero-ambiguity graph retains owner-confirmed identity but no external matches or credential claims',()=>{
 const data=JSON.parse(profile.match(schemaPattern)[1]);const people=data['@graph'].filter(n=>n['@type']==='Person');assert.equal(people.length,1);assert.equal(people[0].name,'Sony Alexis');assert.equal(people[0].alternateName,'Sony Holmes');
 for(const key of ['hasCredential','sameAs','alumniOf','award','jobTitle','worksFor','parent','relatedTo','image'])assert.ok(!(key in people[0]),key+' must not be inferred');
 assert.equal(source.seoTitle,baseline.approvedTitle);assert.ok(!profile.match(/<body\b[\s\S]*?<\/body>/)[0].includes('Sony Holmes'),'Prior SEO-only alias preference must remain intact');
 assert.ok(!JSON.stringify(data).match(/Austin Holmes|Greenbox|Liberty|bizprofile|facebook|instagram/i));
});
