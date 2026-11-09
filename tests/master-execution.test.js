import {normalizePersonalAdditions,stripResourceHub,assertSonyBiography} from './helpers/personal-preservation.mjs';
import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';import {createHash} from 'node:crypto';
const baseline=JSON.parse(readFileSync(new URL('./fixtures/master-protected-snapshot.json',import.meta.url)));const sha=s=>createHash('sha256').update(s).digest('hex');
const profile=stripResourceHub(readFileSync('public/sony/index.html','utf8'));const source=JSON.parse(readFileSync('content/group/founder.json','utf8'));const schemaPattern=/<script type="application\/ld\+json">([\s\S]*?)<\/script>/;
test('Master execution: 226 original public files are byte-identical; two manifests add only authorized personal routes',()=>{for(const [path,hash]of Object.entries(baseline.publicFiles)){assert.equal(sha(normalizePersonalAdditions(path,readFileSync(path))),hash,path);}console.log('Protected public files:',Object.keys(baseline.publicFiles).length);});
test('Master execution: Sony presentation is explicitly redesigned; biography and safe graph remain exact',()=>{
 assertSonyBiography(profile);
 const expected=JSON.parse(baseline.profileBeforeSchema);delete expected['@graph'].find(n=>n['@type']==='Person').hasCredential;expected['@graph'].find(n=>n['@type']==='ProfilePage').name=baseline.approvedTitle;
 assert.deepEqual(JSON.parse(profile.match(schemaPattern)[1]),expected);
});
test('Master execution: zero-ambiguity graph retains owner-confirmed identity but no external matches or credential claims',()=>{
 const data=JSON.parse(profile.match(schemaPattern)[1]);const people=data['@graph'].filter(n=>n['@type']==='Person');assert.equal(people.length,1);assert.equal(people[0].name,'Sony Alexis');assert.equal(people[0].alternateName,'Sony Holmes');
 for(const key of ['hasCredential','sameAs','alumniOf','award','jobTitle','worksFor','parent','relatedTo','image'])assert.ok(!(key in people[0]),key+' must not be inferred');
 assert.equal(source.seoTitle,baseline.approvedTitle);assert.ok(!profile.match(/<body\b[\s\S]*?<\/body>/)[0].includes('Sony Holmes'),'Prior SEO-only alias preference must remain intact');
 assert.ok(!JSON.stringify(data).match(/Austin Holmes|Greenbox|Liberty|bizprofile|facebook|instagram/i));
});
