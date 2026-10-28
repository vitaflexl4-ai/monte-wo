/** Publish to the existing domain-owning Pages project. No DNS/WAF/SSL changes. */
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
import assert from 'node:assert/strict';
process.on('uncaughtException',error=>{console.log('::error title=Production publication::'+error.message.replaceAll('\n',' '));process.exit(1);});
const config=JSON.parse(await readFile('deploy.config.json','utf8'));
const project='vitaflex';
const inspect=async()=>{
 const r=await fetch(`https://api.cloudflare.com/client/v4/accounts/${config.account_id}/pages/projects/${project}`,{headers:{Authorization:`Bearer ${process.env.CLOUDFLARE_API_TOKEN}`},signal:AbortSignal.timeout(30000)});
 const d=await r.json();assert.ok(r.ok&&d.success,'Could not inspect the domain-owning project');return d.result;
};
const before=await inspect();
assert.ok(before.source == null,'Refuse direct publication to a git-connected project');
for(const host of ['vitaflexbusinessgroup.com','www.vitaflexbusinessgroup.com'])assert.ok(before.domains.includes(host),`Unexpected domain owner: ${host}`);
const preview=await fetch(`https://${config.project_name}.pages.dev/`,{signal:AbortSignal.timeout(30000)});
assert.equal(preview.status,200);assert.ok((await preview.text()).includes('data-design="noir"'),'Preview must serve the approved design');
await mkdir('evidence',{recursive:true});
const snapshot={project,domains:before.domains,deployment:before.canonical_deployment?.id,revision:before.canonical_deployment?.deployment_trigger?.metadata?.commit_hash,url:before.canonical_deployment?.url};
await writeFile('evidence/domain-project-before.json',JSON.stringify(snapshot,null,2));
console.log('::notice title=Publishing to existing domain owner::'+JSON.stringify(snapshot));
// Use exactly the existing audited provisioning/deployment path, with the domain owner selected.
const result=spawnSync(process.execPath,['scripts/deploy-intelligence.mjs','--project-name',project,'--skip-build'],{stdio:'inherit',env:process.env});
assert.equal(result.status,0,'Production Pages deployment failed');
const after=await inspect();const expected=spawnSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).stdout.trim();
assert.equal(after.canonical_deployment?.deployment_trigger?.metadata?.commit_hash,expected,'Production revision must match this build');
console.log('::notice title=Main-domain project deployed::'+JSON.stringify({project,domains:after.domains,revision:expected,url:after.canonical_deployment.url}));
