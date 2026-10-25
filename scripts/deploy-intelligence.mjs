#!/usr/bin/env node
// MONTE WO Intelligence — one-command production deployment (Cloudflare, $0 tier).
//
// What this script does (idempotent — safe to re-run; each step resumes where it left off):
//   1. Verifies wrangler authentication (run `npx wrangler login` first — the OAuth flow
//      opens your browser; this script never sees or stores credentials).
//   2. Ensures the dedicated D1 database `monte-wo-intelligence` exists (creates it if not).
//   3. Applies migrations/0003 → 0004 → 0005 to the REMOTE database, gated on table presence
//      (never the waitlist/app databases; never touches athlete or customer data).
//   4. Writes the real database_id + Access vars into wrangler.toml (marked, idempotent block).
//   5. Optionally grants an operator row (authorization for the Cloudflare Access identity).
//   6. Builds the site (npm run build) and deploys Cloudflare Pages (direct upload).
//   7. Optionally deploys the scheduled intelligence Worker (cron monitoring runtime).
//   8. Verifies the deployed API fails closed (401/503 until Access is configured).
//
// Safety: automation rules stay DISABLED (they live in D1, default 0). The worker's master
// switch INTELLIGENCE_ENABLED only becomes "true" with --enable-worker. Secrets are never
// handled here — the script prints the exact `wrangler secret put` commands for the owner.
//
// Usage:
//   node scripts/deploy-intelligence.mjs --check                       # preflight, no auth needed
//   npx wrangler login
//   node scripts/deploy-intelligence.mjs \
//     --access-issuer https://YOURTEAM.cloudflareaccess.com \
//     --access-aud YOUR_ACCESS_APPLICATION_AUDIENCE_ID \
//     --operator you@example.com \
//     --enable-worker
//   node scripts/deploy-intelligence.mjs --grant-operator "<subject-from-the-403-hint>"
//
// Flags:
//   --check             preflight only (files, migrations, build) — exits 0 or 1
//   --access-issuer URL Cloudflare Access team domain (https://<team>.cloudflareaccess.com)
//   --access-aud ID     Cloudflare Access application audience ID (from the app's JWT section)
//   --operator SUB      grant admin operator access to this Access subject (email for OTP login)
//   --grant-operator S  ONLY run the operator grant (e.g. after reading the 403 hint), then exit
//   --enable-worker     also deploy intelligence-worker/ with INTELLIGENCE_ENABLED=true
//   --site-url URL      monitored origin (default: the deployed *.pages.dev URL)
//   --project-name N    Pages project (default: vitaflex-monte-wo)
//   --with-waitlist     also bind the monte-wo-waitlist D1 (found via d1 list) for signup continuity
//   --skip-pages        skip the Pages deploy (worker/D1 config only)
//   --skip-build        skip npm run build (use the current public/ as-is)

import { spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const DB_NAME = 'monte-wo-intelligence';
const MIGRATIONS = [
  { file: '0003_intelligence.sql', table: 'intel_runs' },
  { file: '0004_intelligence_ops.sql', table: 'intel_operators' },
  { file: '0005_intelligence_titan.sql', table: 'intel_improvement_items' }
];
const MARK_BEGIN = '# >>> intelligence-production (auto-written by scripts/deploy-intelligence.mjs — do not edit by hand)';
const MARK_END = '# <<< intelligence-production';

export { writeRootToml, writeWorkerToml, intelBlockToml, MARK_BEGIN, MARK_END, MIGRATIONS, DB_NAME }; // test surface (no side effects on import)

const argv = process.argv.slice(2);
// Optional defaults file (committed, no secrets): lets `npm run deploy:intelligence` run
// with zero flags, and lets CI (GitHub Actions) deploy from repo configuration.
function loadConfigDefaults() {
  try {
    const raw = readFileSync(resolve(ROOT, 'deploy.config.json'), 'utf8');
    const cfg = JSON.parse(raw);
    const ok = v => typeof v === 'string' && v.length > 0;
    return {
      accountId: ok(cfg.account_id) ? cfg.account_id : null,
      projectName: ok(cfg.project_name) ? cfg.project_name : null,
      accessIssuer: ok(cfg.access_issuer) ? cfg.access_issuer : null,
      accessAud: ok(cfg.access_aud) ? cfg.access_aud : null,
      operator: ok(cfg.operator) ? cfg.operator : null,
      siteUrl: ok(cfg.site_url) ? cfg.site_url : null,
      enableWorker: cfg.enable_worker === true,
      withWaitlist: cfg.with_waitlist === true
    };
  } catch { return null; }
}
const configDefaults = loadConfigDefaults() || {};
const flag = name => {
  const i = argv.indexOf('--' + name);
  return i === -1 ? null : (argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : true);
};
const has = name => argv.includes('--' + name);
const log = (step, msg) => console.log(`\n${step} ${msg}`);
const die = (msg, code = 1) => { console.error('\n✖ ' + msg); process.exit(code); };

function run(cmd, args, opts = {}) {
  const r = spawnSync(cmd, args, { cwd: opts.cwd || ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], env: process.env });
  return { code: r.status, out: (r.stdout || '') + (r.stderr || '') };
}
// MW_WRANGLER lets tests run the full flow against a simulated wrangler. Unset in real use.
const wrangler = (args, opts) => {
  const override = process.env.MW_WRANGLER;
  if (override) { const parts = override.split(' '); return run(parts[0], [...parts.slice(1), ...args], opts); }
  return run('npx', ['wrangler', ...args], opts);
};

// ---------- toml editing (idempotent, marker-based) ----------
function intelBlockToml(dbId, accessIssuer, accessAud, waitlistId) {
  const lines = [MARK_BEGIN];
  if (waitlistId) lines.push(
    '# Waitlist continuity: bound so signups keep working on this deployment.',
    '[[d1_databases]]',
    'binding = "DB"',
    'database_name = "monte-wo-waitlist"',
    `database_id = "${waitlistId}"`,
    ''
  );
  lines.push(
    '# Private Intelligence Command Center — dedicated D1, never the waitlist or app DB.',
    '[[d1_databases]]',
    'binding = "INTEL_DB"',
    `database_name = "${DB_NAME}"`,
    `database_id = "${dbId}"`,
    '',
    '[vars]',
    ...(accessIssuer ? [`INTELLIGENCE_ACCESS_ISSUER = "${accessIssuer}"`] : []),
    ...(accessAud ? [`INTELLIGENCE_ACCESS_AUD = "${accessAud}"`] : []),
    ...(accessIssuer || accessAud ? [] : ['# INTELLIGENCE_ACCESS_ISSUER / INTELLIGENCE_ACCESS_AUD — set with --access-issuer/--access-aud (Cloudflare Access app).']),
    MARK_END
  );
  return lines.join('\n') + '\n';
}

function writeRootToml(dbId, accessIssuer, accessAud, waitlistId) {
  const p = resolve(ROOT, 'wrangler.toml');
  let s = readFileSync(p, 'utf8');
  const b = s.indexOf(MARK_BEGIN), e = s.indexOf(MARK_END);
  const block = intelBlockToml(dbId, accessIssuer, accessAud, waitlistId);
  if (b !== -1 && e !== -1) s = s.slice(0, b) + block + s.slice(e + MARK_END.length + 1);
  else s = s.trimEnd() + '\n\n' + block;
  writeFileSync(p, s);
}

function writeWorkerToml(dbId, siteUrl, enable) {
  const p = resolve(ROOT, 'intelligence-worker/wrangler.toml');
  let s = readFileSync(p, 'utf8');
  const b = s.indexOf(MARK_BEGIN), e = s.indexOf(MARK_END);
  const block = [
    MARK_BEGIN,
    '[[d1_databases]]',
    'binding = "INTEL_DB"',
    `database_name = "${DB_NAME}"`,
    `database_id = "${dbId}"`,
    'migrations_dir = "../../migrations"',
    MARK_END
  ].join('\n') + '\n';
  if (b !== -1 && e !== -1) s = s.slice(0, b) + block + s.slice(e + MARK_END.length + 1);
  else {
    // insert right after the header comment block, before [vars]
    const vi = s.indexOf('[vars]');
    s = s.slice(0, vi) + block + '\n' + s.slice(vi);
  }
  s = s.replace(/^INTELLIGENCE_ENABLED = ".*"$/m, `INTELLIGENCE_ENABLED = "${enable ? 'true' : 'false'}"`);
  if (siteUrl) {
    if (/^# SITE_URL = /m.test(s)) s = s.replace(/^# SITE_URL = .*$/m, `SITE_URL = "${siteUrl}"`);
    else if (!/^SITE_URL = /m.test(s)) s = s.replace(/^(\[vars\]\n)/, `$1SITE_URL = "${siteUrl}"\n`);
    else s = s.replace(/^SITE_URL = .*$/m, `SITE_URL = "${siteUrl}"`);
  }
  writeFileSync(p, s);
}

// ---------- preflight (--check works without any Cloudflare authentication) ----------
function preflight() {
  log('[0/8]', 'Preflight — repo state, migrations, build');
  for (const m of MIGRATIONS) if (!existsSync(resolve(ROOT, 'migrations', m.file))) die('missing migrations/' + m.file);
  for (const f of ['public/intelligence/index.html', 'public/intelligence/room.js', 'functions/api/[[route]].js', 'server/intelligence/api.js', 'intelligence-worker/src/index.js'])
    if (!existsSync(resolve(ROOT, f))) die('missing ' + f);
  const t = readFileSync(resolve(ROOT, 'wrangler.toml'), 'utf8');
  if (!/pages_build_output_dir = "public"/.test(t)) die('wrangler.toml lost pages_build_output_dir');
  const w = readFileSync(resolve(ROOT, 'intelligence-worker/wrangler.toml'), 'utf8');
  if (!/INTELLIGENCE_ENABLED = "false"/.test(w) && w.indexOf(MARK_BEGIN) === -1) die('worker toml master switch not in fail-closed state');
  if (!has('skip-build') && !process.env.MW_DEPLOY_SKIP_BUILD) {
    log('[0/8]', 'Running npm run build (regenerates public/ pages)…');
    const b = run('npm', ['run', 'build']);
    if (b.code !== 0) die('npm run build failed:\n' + b.out.slice(-2000));
    console.log('    build OK');
  }
  console.log('\n✔ Preflight passed. This repo is deployable: static site + Pages Functions + worker + migrations.');
  if (!has('grant-operator')) console.log('Next: `npx wrangler login`, then re-run with --access-issuer/--access-aud (see docs/DEPLOYMENT-RUNBOOK.md).');
}

// ---------- authenticated steps ----------
function requireAuth() {
  const r = wrangler(['whoami']);
  if (r.code !== 0 || /not authenticated/i.test(r.out)) {
    die('wrangler is not authenticated. Run:  npx wrangler login   (opens your browser; this script never sees credentials), then re-run this script.', 3);
  }
  const m = r.out.match(/associated with the account "([^"]+)"|account\s+(\S+@\S+)/);
  console.log('    authenticated' + (m ? ' as ' + (m[1] || m[2]) : ''));
}

function d1List() {
  const r = wrangler(['d1', 'list', '--json']);
  if (r.code !== 0) {
    if (/memberships|code: 10000/i.test(r.out)) die('wrangler needs the account lookup (/memberships), which this API token does not have.\n' +
      'Fix: add "account_id" to deploy.config.json (it is the id shown in your Cloudflare dashboard URL) — the deploy pins it as CLOUDFLARE_ACCOUNT_ID and never calls /memberships.');
    die('wrangler d1 list failed:\n' + r.out.slice(-1500));
  }
  try { return JSON.parse(r.out); } catch { die('could not parse `wrangler d1 list --json` output:\n' + r.out.slice(500)); }
}

function ensureDatabase() {
  const list = d1List();
  const found = (Array.isArray(list) ? list : list.result || []).find(d => d.name === DB_NAME);
  if (found) { console.log('    D1 database ' + DB_NAME + ' exists (id ' + found.uuid + ')'); return found.uuid; }
  log('[2/8]', 'Creating D1 database ' + DB_NAME + ' (free tier)…');
  const c = wrangler(['d1', 'create', DB_NAME]);
  if (c.code !== 0) die('wrangler d1 create failed:\n' + c.out.slice(-1500));
  const idm = c.out.match(/database_id\s*=\s*"([0-9a-f-]+)"/) || c.out.match(/([0-9a-f]{32}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12})/i) || d1List().find(d => d.name === DB_NAME)?.uuid;
  if (!idm) die('created the database but could not read its id — run `npx wrangler d1 info ' + DB_NAME + '` and re-run this script.');
  return idm[1] || idm;
}

function d1Tables(dbName) {
  const r = wrangler(['d1', 'execute', dbName, '--remote', '--json', '--command', 'SELECT name FROM sqlite_master WHERE type=\'table\'']);
  if (r.code !== 0) die('could not read remote schema:\n' + r.out.slice(-1500));
  try {
    const parsed = JSON.parse(r.out);
    const rows = (Array.isArray(parsed) ? parsed[0]?.results : parsed.result?.[0]?.results) || [];
    return new Set(rows.map(x => x.name));
  } catch { die('could not parse d1 execute output:\n' + r.out.slice(500)); }
}

function applyMigrations() {
  const tables = d1Tables(DB_NAME);
  let applied = 0;
  for (const m of MIGRATIONS) {
    if (tables.has(m.table)) { console.log('    ' + m.file + ' already applied (' + m.table + ' present)'); continue; }
    log('[3/8]', 'Applying migrations/' + m.file + ' to the REMOTE ' + DB_NAME + '…');
    const r = wrangler(['d1', 'execute', DB_NAME, '--remote', '--file', 'migrations/' + m.file]);
    if (r.code !== 0) die('migration ' + m.file + ' failed:\n' + r.out.slice(-1500));
    applied++;
  }
  if (!applied) console.log('    all intelligence migrations already applied');
}

function grantOperator(subject) {
  if (!/^[A-Za-z0-9@._:+\-|]{3,200}$/.test(subject)) die('operator subject looks invalid: ' + JSON.stringify(subject));
  log('[5/8]', 'Granting admin operator access to subject: ' + subject);
  const sql = `INSERT OR REPLACE INTO intel_operators(subject,role,active) VALUES ('${subject.replace(/'/g, "''")}','admin',1);`;
  const r = wrangler(['d1', 'execute', DB_NAME, '--remote', '--json', '--command', sql]);
  if (r.code !== 0) die('operator grant failed:\n' + r.out.slice(-1500));
  console.log('    granted (admin, active). Revoke with: UPDATE intel_operators SET active=0 WHERE subject=\'' + subject + '\'');
}

function syncPagesProjectName(projectName) {
  // Pages projects read their name from wrangler.toml — keep it in sync when --project-name differs.
  const p = resolve(ROOT, 'wrangler.toml');
  let s = readFileSync(p, 'utf8');
  if (!new RegExp('^name = "' + projectName + '"$', 'm').test(s)) s = s.replace(/^name = ".*"$/m, 'name = "' + projectName + '"');
  writeFileSync(p, s);
}

function deployPages(projectName, dbId, accessIssuer, accessAud, waitlistId) {
  log('[6/8]', 'Deploying Cloudflare Pages project ' + projectName + ' (direct upload)…');
  syncPagesProjectName(projectName);
  // Config (output dir, bindings, name) comes from wrangler.toml — pass only the branch.
  const deployCmd = () => wrangler(['pages', 'deploy', '--branch', 'main', '--commit-dirty=true']);
  let r = deployCmd();
  if (r.code !== 0 && /not found|doesn't exist|could not find|run `wrangler pages project create`/i.test(r.out)) {
    console.log('    project does not exist — creating it (production branch: main)…');
    const c = wrangler(['pages', 'project', 'create', projectName, '--production-branch', 'main']);
    if (c.code !== 0) die('project creation failed:\n' + c.out.slice(-1500));
    r = deployCmd();
  }
  if (r.code !== 0) {
    if (/git|direct upload/i.test(r.out)) {
      die('Cloudflare rejects direct upload because "' + projectName + '" is connected to git (its builds are the ones failing).\n' +
        'Pick one:\n' +
        '  A) Deploy to a NEW direct-upload project (old site keeps serving): re-run with  --project-name ' + projectName + '-live\n' +
        '  B) Fix the git build instead: Cloudflare dashboard → Pages → ' + projectName + ' → Settings → Builds. The build log shows the cause.\n' +
        '     (The repo builds cleanly: npm ci + npm run build both pass.)', 4);
    }
    die('pages deploy failed:\n' + r.out.slice(-2000));
  }
  const urlm = r.out.match(/peek over at (https?:\/\/\S+)/i) || r.out.match(/(https?:\/\/[a-z0-9.-]+\.pages\.dev\S*)/i);
  return urlm ? urlm[1].replace(/[.,)]+$/, '') : 'https://' + projectName + '.pages.dev';
}

function deployWorker(dbId, siteUrl, enable) {
  log('[7/8]', 'Deploying the scheduled intelligence Worker (monte-wo-intelligence)…');
  const r = wrangler(['deploy'], { cwd: resolve(ROOT, 'intelligence-worker') });
  if (r.code !== 0) die('worker deploy failed:\n' + r.out.slice(-1500));
  console.log('    worker deployed. INTELLIGENCE_ENABLED=' + (enable ? 'true (monitoring ACTIVE on the cron schedule)' : 'false (fail-closed — re-run with --enable-worker to activate)'));
  console.log('    crons: ULTRON */5min · ARGON+AU hourly · AU daily 11:17 · AU weekly Mon 11:23 (UTC)');
  if (enable && siteUrl) console.log('    SITE_URL=' + siteUrl + ' — ULTRON will monitor this origin every 5 minutes.');
}

async function verifyDeployed(url) {
  log('[8/8]', 'Verifying the deployed API fails closed (expected: 401/503, never open data)…');
  const results = [];
  for (const path of ['/api/intelligence/overview', '/']) {
    try {
      const res = await fetch(url + path, { redirect: 'manual', signal: AbortSignal.timeout(15000) });
      // 3xx here is a redirect to the Cloudflare Access login: the edge is guarding the
      // route — that is fail-closed, exactly like 401/503. Only a 2xx means open data.
      results.push(path + ' -> ' + res.status + (res.status >= 300 && res.status < 400 ? ' (redirect ' + String(res.headers.get('location') || '').slice(0, 60) + '…)' : ''));
      if (path === '/api/intelligence/overview' && res.status >= 200 && res.status < 300) die('SECURITY: the intelligence API answered ' + res.status + ' WITHOUT authentication. Investigate immediately.');
    } catch (e) { results.push(path + ' -> unreachable (' + e.message + ')'); }
  }
  console.log('    ' + results.join(' · '));
}

// ---------- main (guarded so tests can import the editors without side effects) ----------
const isMain = process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href;
if (isMain) {
// Pin the account (public id, from deploy.config.json) so wrangler never needs the
// /memberships lookup — API tokens commonly lack User->Memberships->Read.
if (configDefaults.accountId && !process.env.CLOUDFLARE_ACCOUNT_ID) process.env.CLOUDFLARE_ACCOUNT_ID = configDefaults.accountId;
// CLI flags override deploy.config.json, which overrides built-in defaults.
const projectName = (typeof flag('project-name') === 'string' ? flag('project-name') : null) || configDefaults.projectName || 'vitaflex-monte-wo';
const accessIssuer = (typeof flag('access-issuer') === 'string' ? flag('access-issuer') : null) || configDefaults.accessIssuer || null;
const accessAud = (typeof flag('access-aud') === 'string' ? flag('access-aud') : null) || configDefaults.accessAud || null;
const operator = (typeof flag('operator') === 'string' ? flag('operator') : null) || configDefaults.operator || null;
const grantOnly = typeof flag('grant-operator') === 'string' ? flag('grant-operator') : null;

if (has('check')) { preflight(); process.exit(0); }

console.log('MONTE WO Intelligence — production deployment (free tier, fail-closed)');
const gitInfo = (() => { const c = run('git', ['rev-parse', '--short', 'HEAD']); if (c.code !== 0) return 'no-git'; return c.out.trim() + ' · ' + run('git', ['rev-parse', '--abbrev-ref', 'HEAD']).out.trim(); })();
console.log('Repo: ' + ROOT + ' · ' + gitInfo + (process.env.CLOUDFLARE_ACCOUNT_ID ? ' · account ' + process.env.CLOUDFLARE_ACCOUNT_ID : ''));

if (grantOnly) {
  requireAuth();
  const t = d1Tables(DB_NAME);
  if (!t.has('intel_operators')) die('intel_operators table missing — run the full deploy first (it creates + migrates the D1).');
  grantOperator(grantOnly);
  process.exit(0);
}

preflight();
if (!(accessIssuer && accessAud)) {
  const msg = '\n⚠ Deploying WITHOUT Cloudflare Access values: the site, D1 and worker deploy,\n' +
    '  but /api/intelligence/* stays 503 intelligence-not-configured (fail-closed, verified\n' +
    '  post-deploy) and the dashboard cannot authorize you until Access is configured.\n' +
    '  Re-run with --access-issuer/--access-aud (or add them to deploy.config.json) to activate.';
  if (has('require-access')) die(msg.trim(), 2);
  console.log(msg);
}

log('[1/8]', 'Verifying wrangler authentication…');
requireAuth();

log('[2/8]', 'Ensuring the dedicated intelligence D1 database…');
const dbId = ensureDatabase();
if (!/^[0-9a-f-]{30,}$/i.test(String(dbId))) die('unexpected database id: ' + dbId);

applyMigrations();

let waitlistId = null;
if (has('with-waitlist') || configDefaults.withWaitlist === true) {
  const wl = d1List().find(d => d.name === 'monte-wo-waitlist');
  if (wl) { waitlistId = wl.uuid; console.log('    waitlist DB found: ' + wl.uuid + ' (binding DB for signup continuity)'); }
  else console.log('    no monte-wo-waitlist database found on this account — skipping the DB binding (waitlist stays fail-closed)');
}

log('[4/8]', 'Writing production bindings into wrangler.toml (marked, idempotent)…');
writeRootToml(dbId, accessIssuer, accessAud, waitlistId);
writeWorkerToml(dbId, null, false);
console.log('    INTEL_DB=' + dbId + (accessIssuer ? ' · Access issuer/aud written' : ''));

if (operator) grantOperator(operator);

let deployedUrl = 'https://' + projectName + '.pages.dev';
if (!has('skip-pages')) {
  deployedUrl = deployPages(projectName, dbId, accessIssuer, accessAud, waitlistId);
  console.log('    deployed: ' + deployedUrl);
  await verifyDeployed(deployedUrl);
}

const workerEnabled = has('enable-worker') || configDefaults.enableWorker === true;
if (workerEnabled) {
  const siteUrl = (typeof flag('site-url') === 'string' ? flag('site-url') : null) || configDefaults.siteUrl || deployedUrl;
  writeWorkerToml(dbId, siteUrl, true);
  deployWorker(dbId, siteUrl, true);
} else {
  console.log('\n☐ Scheduled monitoring runtime NOT activated (fail-closed default).');
  console.log('  To make the agents run on schedule, re-run with --enable-worker.');
}

console.log(`
────────────────────────────────────────────────────────────────
DEPLOYMENT SEQUENCE ${has('skip-pages') ? '(partial)' : 'COMPLETE'}
────────────────────────────────────────────────────────────────
Production URL : ${deployedUrl}
Intelligence   : ${deployedUrl}/intelligence/   (AU ROOM: /intelligence/#/room)

Still owner-only (this script cannot and should not do these):
  1. Cloudflare Access app protecting /intelligence/ and /api/intelligence/* — required
     before the dashboard authorizes you (the API verifies the Access JWT server-side).
  2. Optional secrets (never through chat):
       npx wrangler pages secret put INTELLIGENCE_INGEST_KEY --project-name ${projectName}   # mobile telemetry (optional)
       cd intelligence-worker && npx wrangler secret put INTEL_WEBHOOK_URL                    # urgent alerts (optional)
       cd intelligence-worker && npx wrangler secret put INTEL_WORKER_KEY                     # manual /run trigger (optional)
     Generate strong values locally, e.g.:  openssl rand -hex 32
  3. Custom domain (optional): Pages → ${projectName} → Custom domains → Set up.
     If you use one, update the worker SITE_URL to it and redeploy the worker.
  4. The old git-connected Pages builds keep failing on every push — either disable
     git builds for the project (direct upload replaces them) or fix the build command
     from the dashboard build log. The repo itself builds cleanly (npm ci && npm run build).

Automation rules remain DISABLED (fail-closed defaults in D1). Enable each one only
from the Automation view with explicit approval, as designed.
$`);
}
