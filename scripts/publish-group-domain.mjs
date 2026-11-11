/** Publish only to the existing vitaflex Pages project. No provisioning, migrations, Worker or DNS changes. */
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
import assert from 'node:assert/strict';
import {normalizeDownloadedPagesConfig} from './pages-config.mjs';
process.on('uncaughtException',error=>{console.log('::error title=Production publication::'+error.message.replaceAll('\n',' '));process.exit(1);});
const config=JSON.parse(await readFile('deploy.config.json','utf8'));
const project='vitaflex';
const env={...process.env,CLOUDFLARE_ACCOUNT_ID:config.account_id,WRANGLER_SEND_METRICS:'false'};
const api=async(path)=>{
 const r=await fetch(`https://api.cloudflare.com/client/v4/accounts/${config.account_id}/pages/projects/${project}${path}`,{headers:{Authorization:`Bearer ${process.env.CLOUDFLARE_API_TOKEN}`},signal:AbortSignal.timeout(30000)});
 const d=await r.json();assert.ok(r.ok&&d.success,'Could not inspect the existing domain-owning project');return d.result;
};
const inspect=()=>api('');
const before=await inspect();
assert.ok(before.source == null,'Refuse direct publication to a git-connected project');
assert.equal(before.production_branch,'main');
// Fail closed rather than overwriting a production version not used as this release's baseline.
assert.ok(process.env.EXPECTED_PRODUCTION_REVISION,'An explicit production source precondition is required');
assert.equal(before.canonical_deployment?.deployment_trigger?.metadata?.commit_hash,process.env.EXPECTED_PRODUCTION_REVISION,'Production source differs from the approved baseline; stop before deploying');
for(const host of ['vitaflexbusinessgroup.com','www.vitaflexbusinessgroup.com'])assert.ok(before.domains.includes(host),`Unexpected domain owner: ${host}`);
await mkdir('evidence',{recursive:true});
const snapshot={project,domains:before.domains,deployment:before.canonical_deployment?.id,revision:before.canonical_deployment?.deployment_trigger?.metadata?.commit_hash,url:before.canonical_deployment?.url};
await writeFile('evidence/domain-project-before.json',JSON.stringify(snapshot,null,2));
console.log('::notice title=Existing domain owner::'+JSON.stringify(snapshot));
const run=args=>{
 const result=spawnSync('npx',['wrangler',...args],{encoding:'utf8',env});
 const sanitize=text=>String(text||'').replaceAll(process.env.CLOUDFLARE_API_TOKEN||'__NO_TOKEN__','[redacted]');
 process.stdout.write(sanitize(result.stdout));process.stderr.write(sanitize(result.stderr));
 const detail=sanitize(result.stderr||result.stdout||result.error?.message).replace(/\x1b\[[0-9;]*m/g,'').slice(-1200);
 assert.equal(result.status,0,`Wrangler ${args.slice(0,3).join(' ')} failed: ${detail}. No project creation or fallback is permitted`);
};
const expected=spawnSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).stdout.trim();
const branch=process.env.GITHUB_REF_NAME||spawnSync('git',['branch','--show-current'],{encoding:'utf8'}).stdout.trim();
assert.equal(branch,'arena/beb13e2a-monte-wo');
const original=await readFile('wrangler.toml','utf8');
try {
 // Import the EXISTING project's environment bindings, variables and compatibility settings.
 // Encrypted secrets stay on Cloudflare. Never log or upload this downloaded configuration.
 run(['pages','download','config',project,'--force']);
 const downloaded=await readFile('wrangler.toml','utf8');
 assert.match(downloaded,/name\s*=\s*"vitaflex"/);
 assert.match(downloaded,/pages_build_output_dir\s*=\s*"public"/);
 await writeFile('wrangler.toml',normalizeDownloadedPagesConfig(downloaded));
 // Preview is a deployment within the same project, not a new Pages project.
 run(['pages','deploy','public','--project-name',project,'--branch',branch,'--commit-hash',expected,'--commit-dirty=true']);
 const deployments=await api('/deployments');
 const preview=deployments.find(d=>d.environment==='preview'&&d.deployment_trigger?.metadata?.commit_hash===expected);
 assert.ok(preview?.url,'Could not identify the new preview deployment');
 const verify=spawnSync(process.execPath,['scripts/verify-group.mjs'],{stdio:'inherit',env:{...env,VERIFY_ORIGIN:preview.url}});
 assert.equal(verify.status,0,'Preview verification failed; production is not published');
 const crawl=spawnSync(process.execPath,['scripts/audit-public-seo.mjs'],{stdio:'inherit',env:{...env,VERIFY_ORIGIN:preview.url,SEO_AUDIT_OUTPUT:'evidence/preview-sitemap-audit.json'}});
 assert.equal(crawl.status,0,'Preview sitemap HTTP audit failed; production is not published');
 const sony=spawnSync(process.execPath,['tests/sony-experiences-browser.mjs'],{stdio:'inherit',env:{...env,TEST_ORIGIN:preview.url,SONY_SCREENSHOTS:'evidence/preview-sony-screenshots'}});
 assert.equal(sony.status,0,'Sony preview interaction checks failed; production is not published');
 console.log('::notice title=Sony hosted preview verification::PASS passive cinematic book at seven widths, automatic sequence, no controls or storage, static reduced-motion/no-JS editions and corporate preservation before production publication');
 const profileBrowser=spawnSync(process.execPath,['tests/sony-profile-browser.mjs'],{stdio:'inherit',env:{...env,TEST_ORIGIN:preview.url,PROFILE_SCREENSHOT_DIR:'evidence/preview-profile-screenshots'}});
 assert.equal(profileBrowser.status,0,'Sony editorial profile hosted-preview verification failed; production is not published');
 const intelligence=spawnSync(process.execPath,['tests/intelligence-announcement-browser.mjs'],{stdio:'inherit',env:{...env,TEST_ORIGIN:preview.url,REVEAL_SCREENSHOTS:'evidence/preview-intelligence-screenshots'}});
 assert.equal(intelligence.status,0,'Intelligence announcement hosted-preview verification failed; production is not published');
 assert.equal((await inspect()).canonical_deployment?.id,before.canonical_deployment?.id,'Production changed during preview; stop before publishing');
 run(['pages','deploy','public','--project-name',project,'--branch','main','--commit-hash',expected,'--commit-dirty=true']);
 const after=await inspect();
 assert.equal(after.canonical_deployment?.deployment_trigger?.metadata?.commit_hash,expected,'Production revision must match this build');
 assert.deepEqual([...after.domains].sort(),[...before.domains].sort(),'Domains must remain unchanged');
 for(const key of ['d1_databases','kv_namespaces','r2_buckets','services','env_vars']){
  assert.deepEqual(after.deployment_configs.production[key]||{},before.deployment_configs.production[key]||{},`Existing production ${key} must remain unchanged`);
 }
 const result={project,revision:expected,preview:preview.url,production:after.canonical_deployment.url,domain:'https://vitaflexbusinessgroup.com'};
 await writeFile('evidence/publication.json',JSON.stringify(result,null,2));
 console.log('::notice title=Main-domain project deployed::'+JSON.stringify(result));
} finally {
 await writeFile('wrangler.toml',original);
}
