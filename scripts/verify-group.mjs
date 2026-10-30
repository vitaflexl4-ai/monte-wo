import assert from 'node:assert/strict';
const origin=process.env.VERIFY_ORIGIN||'https://vitaflexbusinessgroup.com';
for(const [route,marker] of [['/','/assets/group/vitaflex-business-group.png'],['/ventures/monte-wo/','In Development'],['/ventures/vitaflex-training/','AVAILABILITY NOT ANNOUNCED'],['/ventures/vitaflex-intelligence-corp/','VitaFlex Intelligence Corp'],['/monte-wo/','MONTE'],['/tools/','strength-tools']]){
 const response=await fetch(origin+route,{signal:AbortSignal.timeout(30000)});
 assert.equal(response.status,200,route);assert.ok((await response.text()).includes(marker),route+' missing deployed content');
 console.log('::notice title=Verified deployed route::',origin+route,response.status,marker);
}
const response=await fetch(origin+'/api/intelligence/overview',{redirect:'manual',signal:AbortSignal.timeout(30000)});
assert.ok([301,302,303,307,308,401,403,503].includes(response.status),'Private API must remain protected');
console.log('::notice title=Verified API protection::',origin,response.status);
