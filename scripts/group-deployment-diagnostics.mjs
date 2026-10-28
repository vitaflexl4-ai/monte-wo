// Public deployment metadata only; never print tokens, bindings or environment variables.
const {account_id,project_name}=JSON.parse(await (await import('node:fs/promises')).readFile('deploy.config.json','utf8'));
const api=async path=>{const r=await fetch(`https://api.cloudflare.com/client/v4/accounts/${account_id}/pages/${path}`,{headers:{Authorization:`Bearer ${process.env.CLOUDFLARE_API_TOKEN}`}});const d=await r.json();if(!d.success)throw new Error(JSON.stringify(d.errors));return d.result;};
const projects=await api('projects');
for(const p of projects){console.log('::notice title=Pages public configuration::'+JSON.stringify({name:p.name,domains:p.domains,production:p.canonical_deployment?.url,revision:p.canonical_deployment?.deployment_trigger?.metadata?.commit_hash}));}
for(const origin of ['https://vitaflexbusinessgroup.com',`https://${project_name}.pages.dev`]){
 try{const response=await fetch(origin,{signal:AbortSignal.timeout(30000)});const text=await response.text();console.log('::notice title=Origin diagnostic::'+JSON.stringify({origin,status:response.status,url:response.url,title:text.match(/<title>(.*?)<\/title>/s)?.[1],group:text.includes('data-design="noir"')}));}catch(e){console.log('::notice title=Origin diagnostic::'+JSON.stringify({origin,error:e.message}));}
}
