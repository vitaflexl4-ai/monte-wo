// Hermetic end-to-end test for scripts/deploy-intelligence.mjs — runs the FULL script
// (spawned as a subprocess) against a simulated wrangler (MW_WRANGLER=/tmp/... via
// tests/deploy-fake-wrangler.mjs) on a temp copy of the repo layout. No network, no
// Cloudflare account, no credentials — this is exactly why the script exposes the
// MW_WRANGLER override.
//
// Run: node tests/deploy-script.harness.mjs
import { spawn } from 'node:child_process';
import { readFileSync, writeFileSync, mkdirSync, cpSync, rmSync, mkdtempSync, existsSync } from 'node:fs';
import { createServer } from 'node:http';
import http from 'node:http';
import assert from 'node:assert/strict';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..');
const FAKE = join(HERE, 'deploy-fake-wrangler.mjs');

function makeRepoCopy() {
  const dir = mkdtempSync(join(tmpdir(), 'mw-deploy-e2e-'));
  mkdirSync(join(dir, 'migrations'), { recursive: true });
  mkdirSync(join(dir, 'intelligence-worker'), { recursive: true });
  mkdirSync(join(dir, 'public'), { recursive: true });
  mkdirSync(join(dir, 'scripts'), { recursive: true });
  cpSync(join(ROOT, 'wrangler.toml'), join(dir, 'wrangler.toml'));
  cpSync(join(ROOT, 'intelligence-worker/wrangler.toml'), join(dir, 'intelligence-worker/wrangler.toml'));
  for (const f of ['0003_intelligence.sql', '0004_intelligence_ops.sql', '0005_intelligence_titan.sql', '0006_operator_case_normalization.sql']) cpSync(join(ROOT, 'migrations', f), join(dir, 'migrations', f));
  cpSync(join(ROOT, 'scripts/deploy-intelligence.mjs'), join(dir, 'scripts/deploy-intelligence.mjs'));
  if (existsSync(join(ROOT, 'deploy.config.json'))) cpSync(join(ROOT, 'deploy.config.json'), join(dir, 'deploy.config.json'));
  // minimal but REAL files the preflight validates (paths + parseability)
  mkdirSync(join(dir, 'public/intelligence'), { recursive: true });
  mkdirSync(join(dir, 'functions/api'), { recursive: true });
  mkdirSync(join(dir, 'server/intelligence'), { recursive: true });
  mkdirSync(join(dir, 'intelligence-worker/src'), { recursive: true });
  writeFileSync(join(dir, 'public/index.html'), '<html></html>');
  writeFileSync(join(dir, 'public/intelligence/index.html'), '<html></html>');
  writeFileSync(join(dir, 'public/intelligence/room.js'), '// room');
  writeFileSync(join(dir, 'functions/api/[[route]].js'), 'export const onRequest = () => new Response();');
  writeFileSync(join(dir, 'server/intelligence/api.js'), 'export const handleIntelligence = () => new Response();');
  writeFileSync(join(dir, 'intelligence-worker/src/index.js'), 'export default {}');
  writeFileSync(join(dir, 'package.json'), JSON.stringify({ name: 'test', scripts: { build: 'node -e "console.log(\'build ok\')"' } }, null, 2));
  return dir;
}

async function withLocalOrigin(handler, fn) {
  const server = createServer((req, res) => { res.setHeader('Connection', 'close'); handler(req, res); });
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  const url = 'http://127.0.0.1:' + server.address().port;
  try { return await fn(url); } finally {
    server.closeAllConnections?.();
    server.close();
  }
}

// Async spawn (NOT spawnSync): the harness's local origin server must keep serving the
// child's post-deploy verification fetches, which requires the parent event loop to stay alive.
// most scenarios exercise explicit flags; wipe the config file so defaults never leak in
function withoutConfig(dir) { try { rmSync(join(dir, 'deploy.config.json'), { force: true }); } catch { } }

function runDeploy(dir, args, scenario, fakeUrl) {
  const env = { ...process.env, MW_WRANGLER: 'node ' + FAKE, FAKE_SCENARIO: scenario, MW_DEPLOY_SKIP_BUILD: '1', FAKE_LOG: join(dir, 'fake.log') };
  if (fakeUrl) env.FAKE_URL = fakeUrl;
  const useConfig = args.includes('--use-config');
  if (!useConfig) withoutConfig(dir); else args = args.filter(a => a !== '--use-config');
  return new Promise(resolve => {
    const child = spawn('node', [join(dir, 'scripts/deploy-intelligence.mjs'), ...args], { cwd: dir, env });
    let stdout = '', stderr = '';
    child.stdout.on('data', d => { stdout += d; });
    child.stderr.on('data', d => { stderr += d; });
    const timer = setTimeout(() => child.kill('SIGKILL'), 60000);
    child.on('error', e => { clearTimeout(timer); resolve({ status: 1, stdout, stderr: stderr + String(e) }); });
    child.on('close', (code, signal) => { clearTimeout(timer); resolve({ status: code, signal, stdout, stderr }); });
  });
}

let passed = 0;
async function scenarioTest(name, fn) {
  const t0 = Date.now();
  const dir = makeRepoCopy();
  try { await fn(dir); console.log('ok   ' + name + ' (' + ((Date.now() - t0) / 1000).toFixed(1) + 's)'); passed++; }
  catch (e) { console.error('FAIL ' + name + ' (' + ((Date.now() - t0) / 1000).toFixed(1) + 's)\n  ' + (e && e.message)); process.exitCode = 1; }
  finally { rmSync(dir, { recursive: true, force: true }); }
}

const ACCESS = ['--access-issuer', 'https://vitaflex.cloudflareaccess.com', '--access-aud', 'aud-1234'];

await scenarioTest('happy path: existing DB, everything deployed, fail-closed verify', async dir => {
  await withLocalOrigin((req, res) => {
    if (req.url.startsWith('/api/intelligence/')) { res.writeHead(401, { 'content-type': 'application/json' }); res.end('{"error":"authentication-required"}'); }
    else { res.writeHead(200, { 'content-type': 'text/html' }); res.end('<html>MONTE WO</html>'); }
  }, async origin => {
    const r = await runDeploy(dir, [...ACCESS, '--operator', 'owner@example.com', '--enable-worker', '--site-url', origin], 'happy', origin);
    assert.equal(r.status, 0, 'exit 0. Output:\n' + r.stdout + r.stderr);
    assert.match(r.stdout, /DEPLOYMENT SEQUENCE COMPLETE/);
    assert.match(r.stdout, /worker deployed\. INTELLIGENCE_ENABLED=true/);
    assert.match(r.stdout, /-> 401 .* -> 200|-> 200 .* -> 401/, 'verification ran');
    const toml = readFileSync(join(dir, 'wrangler.toml'), 'utf8');
    assert.match(toml, /database_id = "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee"/);
    assert.match(toml, /INTELLIGENCE_ACCESS_ISSUER = "https:\/\/vitaflex.cloudflareaccess.com"/);
    const wtoml = readFileSync(join(dir, 'intelligence-worker/wrangler.toml'), 'utf8');
    assert.match(wtoml, /INTELLIGENCE_ENABLED = "true"/);
    assert.match(wtoml, new RegExp('SITE_URL = "' + origin.replace(/\//g, '\\/') + '"'));
    const log = readFileSync(join(dir, 'fake.log'), 'utf8');
    assert.match(log, /INSERT OR REPLACE INTO intel_operators/, 'operator grant executed');
    assert.match(r.stdout, /0006_operator_case_normalization\.sql already applied/, 'settings marker gates 0006');
    assert.ok(!/--file.{0,12}migrations\/0006/.test(log), '0006 never re-applied once its marker exists');
  });
});

await scenarioTest('nodb: creates the database, then applies ALL migrations in order', async dir => {
  await withLocalOrigin((req, res) => { res.writeHead(req.url.includes('/api/') ? 401 : 200); res.end(''); }, async origin => {
    const r = await runDeploy(dir, [...ACCESS], 'nodb', origin);
    assert.equal(r.status, 0, 'exit 0:\n' + r.stdout + r.stderr);
    const log = readFileSync(join(dir, 'fake.log'), 'utf8');
    const files = [...log.matchAll(/"--file","migrations\/(000\d_[a-z_]+\.sql)"/g)].map(m => m[1]);
    assert.deepEqual(files, ['0003_intelligence.sql', '0004_intelligence_ops.sql', '0005_intelligence_titan.sql', '0006_operator_case_normalization.sql'], 'migrations applied in order');
    assert.match(log, /"d1","create","monte-wo-intelligence"/, 'database created');
  });
});

await scenarioTest('partial: applies only missing migrations', async dir => {
  await withLocalOrigin((req, res) => { res.writeHead(req.url.includes('/api/') ? 401 : 200); res.end(''); }, async origin => {
    const r = await runDeploy(dir, [...ACCESS], 'partial', origin);
    assert.equal(r.status, 0, 'exit 0:\n' + r.stdout + r.stderr);
    const log = readFileSync(join(dir, 'fake.log'), 'utf8');
    const files = [...log.matchAll(/"--file","migrations\/(000\d_[a-z_]+\.sql)"/g)].map(m => m[1]);
    assert.deepEqual(files, ['0004_intelligence_ops.sql', '0005_intelligence_titan.sql', '0006_operator_case_normalization.sql'], '0003 skipped, 0004+0005+0006 applied');
  });
});

await scenarioTest('git-connected project: exits 4 with the two remediation options', async dir => {
  const r = await runDeploy(dir, [...ACCESS], 'git');
  assert.equal(r.status, 4, 'exit code 4. Output:\n' + r.stdout + r.stderr);
  assert.match(r.stdout + r.stderr, /--project-name vitaflex-monte-wo-live/);
  assert.match(r.stdout + r.stderr, /connected to git/);
  const toml = readFileSync(join(dir, 'wrangler.toml'), 'utf8');
  assert.match(toml, /database_id = "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee"/, 'D1 config still written (resumable)');
});

await scenarioTest('missing project: creates it and retries', async dir => {
  await withLocalOrigin((req, res) => { res.writeHead(req.url.includes('/api/') ? 401 : 200); res.end(''); }, async origin => {
    const r = await runDeploy(dir, [...ACCESS], 'missing', origin);
    assert.equal(r.status, 0, 'exit 0:\n' + r.stdout + r.stderr);
    const log = readFileSync(join(dir, 'fake.log'), 'utf8');
    assert.match(log, /"pages","project","create","vitaflex-monte-wo"/);
    assert.match(log, /"pages","deploy"/);
  });
});

await scenarioTest('SECURITY: an unauthenticated 200 from the API aborts the deploy', async dir => {
  await withLocalOrigin((req, res) => { res.writeHead(200); res.end('{"live":true}'); }, async origin => {
    const r = await runDeploy(dir, [...ACCESS], 'openapi', origin);
    assert.equal(r.status, 1, 'must abort. Output:\n' + r.stdout + r.stderr);
    assert.match(r.stdout + r.stderr, /SECURITY: the intelligence API answered 200 WITHOUT authentication/);
  });
});

await scenarioTest('edge-guarded API: a 302 to the Access login counts as fail-closed', async dir => {
  await withLocalOrigin((req, res) => {
    if (req.url.startsWith('/api/intelligence/')) { res.writeHead(302, { location: 'https://team.cloudflareaccess.com/cdn-cgi/access/login/app?kid=abc' }); res.end(); }
    else { res.writeHead(200, { 'content-type': 'text/html' }); res.end('<html>MONTE WO</html>'); }
  }, async origin => {
    const r = await runDeploy(dir, [...ACCESS], 'happy', origin);
    assert.equal(r.status, 0, 'a redirect to the Access login must NOT abort the deploy:\n' + r.stdout + r.stderr);
    assert.match(r.stdout, /-> 302 \(redirect/, 'redirect status and target reported');
  });
});

await scenarioTest('no wrangler auth: exits 3 telling the owner to wrangler login', async dir => {
  const r = await runDeploy(dir, [...ACCESS], 'noauth');
  assert.equal(r.status, 3, 'exit 3:\n' + r.stdout + r.stderr);
  assert.match(r.stdout + r.stderr, /npx wrangler login/);
});

await scenarioTest('missing Access flags: deploys anyway, API stays fail-closed, warning printed', async dir => {
  await withLocalOrigin((req, res) => { res.writeHead(req.url.includes('/api/') ? 401 : 200); res.end(''); }, async origin => {
    const r = await runDeploy(dir, [], 'happy', origin);
    assert.equal(r.status, 0, 'exit 0 (deploy proceeds, fail-closed):\n' + r.stdout + r.stderr);
    assert.match(r.stdout, /Deploying WITHOUT Cloudflare Access values/, 'warning printed');
    assert.match(r.stdout, /DEPLOYMENT SEQUENCE COMPLETE/);
  });
});

await scenarioTest('--require-access: strict mode still blocks without Access values', async dir => {
  const r = await runDeploy(dir, ['--require-access'], 'happy');
  assert.equal(r.status, 2, 'exit 2:\n' + r.stdout + r.stderr);
  assert.match(r.stdout + r.stderr, /Cloudflare Access/);
});

await scenarioTest('config defaults: zero flags deploys the configured project + worker', async dir => {
  writeFileSync(join(dir, 'deploy.config.json'), JSON.stringify({
    project_name: 'vitaflex-monte-wo-live', enable_worker: true, with_waitlist: true,
    account_id: 'cafebabe-0000-1111-2222-333333333333',
    access_issuer: 'https://cfg.cloudflareaccess.com', access_aud: 'cfg-aud', operator: 'cfg@example.com'
  }));
  await withLocalOrigin((req, res) => { res.writeHead(req.url.includes('/api/') ? 401 : 200); res.end(''); }, async origin => {
    const r = await runDeploy(dir, ['--use-config'], 'missing', origin);
    assert.equal(r.status, 0, 'exit 0:\n' + r.stdout + r.stderr);
    assert.match(r.stdout, /Deploying Cloudflare Pages project vitaflex-monte-wo-live/, 'project from config');
    assert.match(r.stdout, /worker deployed\. INTELLIGENCE_ENABLED=true/, 'worker enabled by config');
    const toml = readFileSync(join(dir, 'wrangler.toml'), 'utf8');
    assert.match(toml, /^name = "vitaflex-monte-wo-live"$/m, 'config project name synced to toml');
    assert.match(toml, /INTELLIGENCE_ACCESS_AUD = "cfg-aud"/, 'Access values from config');
    const wtoml = readFileSync(join(dir, 'intelligence-worker/wrangler.toml'), 'utf8');
    assert.ok(wtoml.includes('SITE_URL = "' + origin + '"'), 'worker SITE_URL defaults to deployed URL');
    const log = readFileSync(join(dir, 'fake.log'), 'utf8');
    assert.match(log, /cfg@example.com/, 'operator from config');
    assert.match(log, /cafebabe-0000-1111-2222-333333333333/, 'CLOUDFLARE_ACCOUNT_ID pinned from config');
    assert.match(log, /monte-wo-waitlist/, 'waitlist binding applied');
  });
});

await scenarioTest('grant-operator only: single SQL grant, no deploy', async dir => {
  const r = await runDeploy(dir, ['--grant-operator', 'owner@example.com'], 'happy');
  assert.equal(r.status, 0, 'exit 0:\n' + r.stdout + r.stderr);
  const log = readFileSync(join(dir, 'fake.log'), 'utf8');
  assert.match(log, /--grant-operator|intel_operators/, 'grant ran');
  assert.ok(!/"pages","deploy"/.test(log), 'no pages deploy in grant-only mode');
  assert.ok(!/"deploy"/.test(log.replace(/d1[^\\n]*/g, '')), 'no worker deploy in grant-only mode');
});

await scenarioTest('grant-operator normalizes the subject to lowercase (Access issues lowercase subs)', async dir => {
  const r = await runDeploy(dir, ['--grant-operator', 'Owner@Example.COM'], 'happy');
  assert.equal(r.status, 0, 'exit 0:\n' + r.stdout + r.stderr);
  const log = readFileSync(join(dir, 'fake.log'), 'utf8');
  assert.match(log, /owner@example\.com/, 'grant stored the normalized subject');
  assert.ok(!log.includes('Owner@Example.COM'), 'typed case never reaches the database');
});

await scenarioTest('alt project name: wrangler.toml name is synced before deploy', async dir => {
  await withLocalOrigin((req, res) => { res.writeHead(req.url.includes('/api/') ? 401 : 200); res.end(''); }, async origin => {
    const r = await runDeploy(dir, [...ACCESS, '--project-name', 'vitaflex-monte-wo-live'], 'missing', origin);
    assert.equal(r.status, 0, 'exit 0:\n' + r.stdout + r.stderr);
    const toml = readFileSync(join(dir, 'wrangler.toml'), 'utf8');
    assert.match(toml, /^name = "vitaflex-monte-wo-live"$/m, 'project name synced into wrangler.toml');
    const log = readFileSync(join(dir, 'fake.log'), 'utf8');
    assert.match(log, /"pages","project","create","vitaflex-monte-wo-live"/);
  });
});

await scenarioTest('check mode: preflight passes without any Cloudflare auth', async dir => {
  const r = await runDeploy(dir, ['--check'], 'noauth');
  assert.equal(r.status, 0, 'exit 0:\n' + r.stdout + r.stderr);
  assert.match(r.stdout, /Preflight passed/);
});

console.log('\n' + passed + ' deploy-script scenarios passed' + (process.exitCode ? ' — WITH FAILURES' : ''));
process.exit(process.exitCode || 0);
