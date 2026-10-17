#!/usr/bin/env bash
# Read-only diagnostics: no deploy, config edits, SQL, migrations, R2 operations or Git writes.
set -euo pipefail
umask 077
for cmd in node npx; do command -v "$cmd" >/dev/null || { echo "Missing command: $cmd"; exit 1; }; done
node -e 'const [v,m]=process.versions.node.split(".").map(Number);if(v<22||(v===22&&m<13)){console.error("Use Node 22.13+ for the pinned Wrangler CLI. If you use nvm: nvm use 22");process.exit(1)}'
TMP="$(mktemp -d "${TMPDIR:-/tmp}/montewo-readonly-check.XXXXXX")"
trap 'rm -rf "$TMP"' EXIT
cd "$TMP"
echo 'READ-ONLY MONTE WO CONNECTION CHECK'
echo 'No passwords, tokens or downloaded configuration files are requested.'
echo 'Checking public endpoints on the main site and the earlier successful deployment…'
node --input-type=module <<'NODE'
const sites={production:'https://vitaflex-monte-wo.pages.dev',earlierDeployment:'https://76edff20.vitaflex-monte-wo.pages.dev'};
for(const [name,base] of Object.entries(sites)){
 const report={site:name,url:base};
 for(const [label,path] of Object.entries({mobile:'/api/mobile/config',strength:'/api/strength/config',waitlist:'/api/waitlist/config',app:'/app/',exercises:'/exercises/',downloads:'/downloads/'})){
  try{
   const response=await fetch(base+path+'?readonly_check='+Date.now(),{cache:'no-store',redirect:'error',signal:AbortSignal.timeout(12000)});
   const text=await response.text();const entry={httpStatus:response.status};
   if(path.startsWith('/api/')){
    let data;try{data=JSON.parse(text)}catch{}
    entry.jsonResponse=!!data;
    if(typeof data?.available==='boolean')entry.available=data.available;
    if(typeof data?.workoutSync==='boolean')entry.workoutSync=data.workoutSync;
    if(typeof data?.apiVersion==='number')entry.apiVersion=data.apiVersion;
    entry.mobileRouteMissing=label==='mobile'&&(response.status===404||data?.error==='Not implemented in this build');
   }else{
    if(label==='app')entry.interactivePhonePresent=text.includes('data-phone-cockpit');
    if(label==='exercises')entry.sessionLoggerPresent=text.includes('id="training-tools"');
    if(label==='downloads')entry.releasePagePresent=response.ok&&text.includes('NO INSTALLABLE APP PUBLISHED');
   }
   report[label]=entry;
  }catch{report[label]={checkFailed:true,note:'Network, timeout, redirect or access policy prevented the check. No connection assumed.'}}
 }
 console.log(JSON.stringify(report,null,2));
}
NODE
echo ''
echo 'Now listing existing Pages deployments. This command does not publish or roll back anything.'
echo 'Use the Cloudflare account that owns vitaflex-monte-wo.'
if ! npx --yes wrangler@4.86.0 pages deployment list --project-name vitaflex-monte-wo; then
  echo 'Could not list deployments. If login is required, run: npx --yes wrangler@4.86.0 login'
  echo 'Then rerun this checker. Do not create a replacement project.'
  exit 1
fi
echo ''
echo 'Finished. Share the public-check summary and deployment table (you may redact IDs).'
echo 'Do not share OAuth links, tokens, passwords, configuration files or database contents.'
echo 'No deployment, rollback, SQL, migration, resource creation, R2 change or Git push was performed.'
