// Temporary, explicit Android internal-preview exception. Never claims a clean audit.
const fs = require('node:fs');
const path = require('node:path');
const {spawnSync} = require('node:child_process');
const reviewed = {
  braces: {version: '3.0.3', url: 'https://github.com/advisories/GHSA-vfj7-8cjw-p6xm', range: '<=3.0.3'},
  'node-forge': {version: '1.4.0', url: 'https://github.com/advisories/GHSA-86w9-cpqp-85rv', range: '<=1.4.0'},
};
function decision(audit, lock, env) {
  const counts = audit?.metadata?.vulnerabilities;
  const graph = audit?.vulnerabilities;
  if (audit?.error || !counts || !graph || !Number.isInteger(counts.total) || counts.total < 0) throw Error('Audit unavailable or malformed; fail closed.');
  const severities=['info','low','moderate','high','critical'];
  if (!severities.every(k=>Number.isInteger(counts[k])&&counts[k]>=0)||severities.reduce((n,k)=>n+counts[k],0)!==counts.total) throw Error('Incomplete or inconsistent severity counts.');
  if (Object.keys(graph).length !== counts.total) throw Error('Inconsistent audit counts; review required.');
  if (counts.total === 0) return {allowed: true, remaining: counts, exception: false, publicReleaseAuthorized: false};
  if (env.EAS_BUILD_PROFILE !== 'preview' || env.EAS_BUILD_PLATFORM !== 'android' || env.MONTEWO_INTERNAL_APK_RISK_ACCEPTED !== 'true') throw Error('Unresolved advisories: only the explicitly accepted Android preview may build.');
  if (counts.critical || counts.moderate || counts.low || counts.high !== counts.total || counts.total > 15) throw Error('Audit differs from the reviewed 15 high / 0 moderate findings.');
  const roots = [];
  for (const item of Object.values(graph)) {
    if (item.severity !== 'high' || !Array.isArray(item.via) || !item.via.length) throw Error('Unreviewed severity or dependency chain.');
    for (const via of item.via) {
      if (typeof via === 'string') { if (!graph[via]) throw Error('Incomplete dependency chain.'); continue; }
      const approved = reviewed[via.name];
      if (!approved || via.url !== approved.url || via.range.replace(/\s/g,'') !== approved.range || via.severity !== 'high') throw Error('New or changed advisory; review required.');
      roots.push(via.name);
    }
  }
  if (!roots.length) throw Error('No reviewed advisory roots found.');
  for (const name of new Set(roots)) {
    const installations = Object.entries(lock.packages || {}).filter(([key])=>key.endsWith('node_modules/'+name));
    if (!installations.length || installations.some(([,p])=>p.version !== reviewed[name].version)) throw Error('Reviewed package version changed: '+name);
  }
  return {allowed: true, exception: 'Owner-approved internal Android APK testing only; 2026-10-15', remaining: counts, advisoryRoots: [...new Set(roots)], publicReleaseAuthorized: false};
}
module.exports = {decision};
if (require.main === module) {
  try {
    const root = path.resolve(__dirname,'..');
    const cmd = process.platform === 'win32' ? 'npm.cmd' : 'npm';
    const result = spawnSync(cmd,['audit','--package-lock-only','--json'],{cwd: root,encoding:'utf8',maxBuffer:8*1024*1024,timeout:120000});
    if (result.error || ![0,1].includes(result.status)) throw Error('npm audit failed; build blocked.');
    const audit = JSON.parse(result.stdout);
    const report = decision(audit,JSON.parse(fs.readFileSync(path.join(root,'package-lock.json'),'utf8')),process.env);
    console.log(JSON.stringify(report,null,2));
    if (report.exception) console.warn('WARNING: high-severity findings remain. This is NOT public-release approval or a clean audit.');
  } catch (e) { console.error('BUILD SECURITY GATE:',e.message); process.exitCode=1; }
}
