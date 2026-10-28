/** Authorized custom-domain cutover. Preflight all permissions before writes; restore on failure.
 * No challenge, SSL, Access or WAF configuration is read or changed.
 */
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import assert from 'node:assert/strict';
process.on('uncaughtException',error=>{console.log('::error title=Domain cutover blocked::'+error.message.replaceAll('\n',' '));process.exit(1);});
const config=JSON.parse(await readFile('deploy.config.json','utf8'));
const account=config.account_id,target=config.project_name,previous='vitaflex';
const hosts=['vitaflexbusinessgroup.com','www.vitaflexbusinessgroup.com'];
const token=process.env.CLOUDFLARE_API_TOKEN;
assert.ok(token,'Configured Cloudflare token required');
const api=async(path,method='GET',body)=>{
 const r=await fetch('https://api.cloudflare.com/client/v4/'+path,{method,headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},body:body?JSON.stringify(body):undefined,signal:AbortSignal.timeout(30000)});
 const d=await r.json();if(!r.ok||!d.success)throw new Error(`${method} ${path}: ${r.status} ${JSON.stringify(d.errors)}`);return d.result;
};
const root=`accounts/${account}/pages/projects`;
const old=await api(`${root}/${previous}`),next=await api(`${root}/${target}`);
console.log('::notice title=Domain preflight::'+JSON.stringify({oldProject:old.name,source:old.source?{type:old.source.type,repo:old.source.config?.repo_name,owner:old.source.config?.owner}:null,domains:old.domains,target:next.name,targetDomains:next.domains}));
const preview=await fetch(`https://${target}.pages.dev/`,{signal:AbortSignal.timeout(30000)});
assert.equal(preview.status,200);assert.ok((await preview.text()).includes('data-design="noir"'),'Verify new design before touching domain');
if(hosts.every(h=>next.domains.includes(h))){console.log('::notice title=Domain routing::Both custom domains already belong to the new website project.');process.exit(0);}
// Domain API alone cannot update DNS. Refuse to detach any domain without DNS visibility.
const zones=await api(`zones?name=${hosts[0]}&account.id=${account}`);
assert.equal(zones.length,1,'Exactly one owned DNS zone required');const zone=zones[0].id;
const plan=[];
for(const host of hosts){
 const records=await api(`zones/${zone}/dns_records?name=${host}`);
 assert.equal(records.length,1,`One DNS record required for ${host}`);
 const record=records[0];assert.equal(record.type,'CNAME',`Preserve non-CNAME DNS for ${host}; manual review required`);
 assert.ok([`${previous}.pages.dev`,`${target}.pages.dev`,hosts[0]].includes(record.content),`Unexpected target for ${host}: ${record.content}`);
 assert.ok(old.domains.includes(host)||next.domains.includes(host),`Unknown Pages owner for ${host}`);
 const owner=old.domains.includes(host)?previous:target;
 const domain=await api(`${root}/${owner}/domains/${host}`);
 plan.push({host,record,owner,domain});
}
// DNS edit permission: idempotent patch of the current value, no routing/security change.
// If not allowed, fail before detaching anything.
for(const item of plan)await api(`zones/${zone}/dns_records/${item.record.id}`,'PATCH',{content:item.record.content});
await mkdir('evidence',{recursive:true});
await writeFile('evidence/domain-before.json',JSON.stringify({zone,plan},null,2));
const changed=[];
try{
 for(const item of plan){
  changed.push(item);
  if(item.owner!==target){
   await api(`${root}/${previous}/domains/${item.host}`,'DELETE');
   await api(`${root}/${target}/domains`,'POST',{name:item.host});
  }
  await api(`zones/${zone}/dns_records/${item.record.id}`,'PATCH',{content:`${target}.pages.dev`});
  const domain=await api(`${root}/${target}/domains/${item.host}`);
  console.log('::notice title=Custom domain connected::'+JSON.stringify({host:item.host,project:target,status:domain.status,dns:`${target}.pages.dev`}));
 }
}catch(error){
 const failures=[];
 for(const item of changed.reverse()){
  try{
   if(item.owner!==target){
    const domains=await api(`${root}/${target}/domains`);
    if(domains.some(d=>d.name===item.host))await api(`${root}/${target}/domains/${item.host}`,'DELETE');
    const beforeDomains=await api(`${root}/${previous}/domains`);
    if(!beforeDomains.some(d=>d.name===item.host))await api(`${root}/${previous}/domains`,'POST',{name:item.host});
   }
   await api(`zones/${zone}/dns_records/${item.record.id}`,'PATCH',{content:item.record.content});
  }catch(e){failures.push(`${item.host}: ${e.message}`);}
 }
 throw new Error(`${error.message}; rollback ${failures.length?failures.join('; '):'completed'}`);
}
