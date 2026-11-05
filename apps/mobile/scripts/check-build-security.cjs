// Build security gate for apps/mobile. Explicit, reviewed exception for INTERNAL builds only — never a clean audit
// and never public-release approval.
//
// The live `npm audit` is compared with security/reviewed-advisories.json: every advisory (by URL, name, range and
// severity) must be in the reviewed set, every reviewed package must be installed at exactly the reviewed
// version(s), no advisory may be critical, and the build must run in one of the reviewed internal channels:
//   eas-preview-android  EAS_BUILD_PROFILE=preview EAS_BUILD_PLATFORM=android MONTEWO_INTERNAL_APK_RISK_ACCEPTED=true
//   internal-ci          MONTEWO_BUILD_CHANNEL=internal-ci        MONTEWO_INTERNAL_APK_RISK_ACCEPTED=true
// Anything else (EAS production, store builds, unknown advisories, drifted versions) fails closed.
//
//   node scripts/check-build-security.cjs          # runs npm audit and decides (exit 1 = blocked)
const fs = require('node:fs');
const path = require('node:path');
const {spawnSync} = require('node:child_process');

const ROOT = path.resolve(__dirname, '..');
const SEVERITIES = ['info', 'low', 'moderate', 'high', 'critical'];

function loadReviewed(file = path.join(ROOT, 'security', 'reviewed-advisories.json')) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function channelOf(env) {
  if (env.MONTEWO_INTERNAL_APK_RISK_ACCEPTED !== 'true') return null;
  if (env.EAS_BUILD_PROFILE === 'preview' && env.EAS_BUILD_PLATFORM === 'android') return 'eas-preview-android';
  if (!env.EAS_BUILD_PROFILE && env.MONTEWO_BUILD_CHANNEL === 'internal-ci') return 'internal-ci';
  return null;
}

function decision(audit, lock, env, reviewed = loadReviewed()) {
  const counts = audit?.metadata?.vulnerabilities;
  const graph = audit?.vulnerabilities;
  if (audit?.error || !counts || !graph || !Number.isInteger(counts.total) || counts.total < 0) throw Error('Audit unavailable or malformed; fail closed.');
  if (!SEVERITIES.every(k => Number.isInteger(counts[k]) && counts[k] >= 0) || SEVERITIES.reduce((n, k) => n + counts[k], 0) !== counts.total) throw Error('Incomplete or inconsistent severity counts; fail closed.');
  if (Object.keys(graph).length !== counts.total) throw Error('Inconsistent audit counts; review required.');
  if (counts.total === 0) return {allowed: true, remaining: counts, exception: false, channel: null, publicReleaseAuthorized: false};

  const channel = channelOf(env);
  if (!channel) throw Error('Unresolved advisories: only the reviewed internal channels may build (EAS preview/Android with MONTEWO_INTERNAL_APK_RISK_ACCEPTED=true, or MONTEWO_BUILD_CHANNEL=internal-ci). Production and store builds are denied.');
  if (!Array.isArray(reviewed.allowedChannels) || !reviewed.allowedChannels.includes(channel)) throw Error(`Channel ${channel} is not in the reviewed exception.`);
  if (counts.critical) throw Error('Critical advisories are never covered by the exception.');

  const byUrl = new Map((reviewed.advisories || []).map(a => [a.url, a]));
  const seen = new Set();
  for (const item of Object.values(graph)) {
    if (!SEVERITIES.includes(item.severity) || !Array.isArray(item.via) || !item.via.length) throw Error('Unreviewed severity or dependency chain.');
    for (const via of item.via) {
      if (typeof via === 'string') { if (!graph[via]) throw Error('Incomplete dependency chain.'); continue; }
      const approved = byUrl.get(via.url);
      if (!approved || approved.name !== via.name || approved.range.replace(/\s/g, '') !== String(via.range).replace(/\s/g, '') || approved.severity !== via.severity) {
        throw Error(`New or changed advisory; review required: ${via.name} ${via.range || ''} ${via.url || ''}`.trim());
      }
      seen.add(via.url);
    }
  }
  if (!seen.size) throw Error('No reviewed advisory roots found.');
  for (const [name, versions] of Object.entries(reviewed.installedVersions || {})) {
    const installed = [...new Set(Object.entries(lock.packages || {}).filter(([key]) => key.endsWith('node_modules/' + name)).map(([, p]) => p.version))].sort();
    if (installed.join(',') !== [...versions].sort().join(',')) throw Error(`Reviewed package version changed: ${name} (installed ${installed.join(', ') || 'none'}, reviewed ${versions.join(', ')}); review required.`);
  }
  return {
    allowed: true,
    exception: `Reviewed internal-testing exception (${reviewed.reviewedAt}); build tooling only; not public-release approval`,
    channel,
    remaining: counts,
    advisoryRoots: [...new Set([...seen].map(u => byUrl.get(u).name))].sort(),
    publicReleaseAuthorized: false,
  };
}

module.exports = {decision, channelOf, loadReviewed};

if (require.main === module) {
  try {
    const cmd = process.platform === 'win32' ? 'npm.cmd' : 'npm';
    const result = spawnSync(cmd, ['audit', '--package-lock-only', '--json'], {cwd: ROOT, encoding: 'utf8', maxBuffer: 16 * 1024 * 1024, timeout: 180000});
    if (result.error || ![0, 1].includes(result.status)) throw Error('npm audit failed; build blocked.');
    const audit = JSON.parse(result.stdout);
    const report = decision(audit, JSON.parse(fs.readFileSync(path.join(ROOT, 'package-lock.json'), 'utf8')), process.env);
    console.log(JSON.stringify(report, null, 2));
    const c = report.remaining;
    const line = `build security gate: ${report.allowed ? 'allowed' : 'blocked'} (${report.channel || 'no exception needed'}) — advisories total ${c.total}: critical ${c.critical}, high ${c.high}, moderate ${c.moderate}, low ${c.low}` + (report.advisoryRoots ? `; roots ${report.advisoryRoots.join(', ')}` : '');
    if (process.env.GITHUB_STEP_SUMMARY) fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, `- ${line}\n`);
    if (report.exception) {
      console.warn('WARNING: advisories remain in the build tooling. This is NOT public-release approval or a clean audit.');
      if (process.env.GITHUB_ACTIONS) console.log(`::warning title=Build security gate — reviewed exception in use::${line}. Internal/test builds only (apps/mobile/security/reviewed-advisories.json).`);
    }
  } catch (e) {
    console.error('BUILD SECURITY GATE:', e.message);
    if (process.env.GITHUB_ACTIONS) console.log(`::error title=Build security gate blocked the build::${e.message}`);
    process.exitCode = 1;
  }
}
