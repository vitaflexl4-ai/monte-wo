// Fake wrangler for hermetic deploy-script tests. Scenario via FAKE_SCENARIO env:
//   happy    — DB exists, migrations applied, pages deploy OK (URL from FAKE_URL)
//   nodb     — DB missing → create path
//   fresh    — DB exists but empty → all migrations run
//   partial  — 0003 applied only → 0004 + 0005 run
//   agentdone — like happy, plus the Agent API tables (0008) already present
//   git      — pages deploy rejected (git-connected project)
//   missing  — pages project not found → create → retry OK
//   openapi  — deploy OK but the API answers 200 unauthenticated (SECURITY abort)
//   noauth   — wrangler not authenticated
// FAKE_URL — the deployment URL printed by pages deploy (http://127.0.0.1:PORT for local verify).
import { writeFileSync, appendFileSync, existsSync, readFileSync } from 'node:fs';

const STATE = (process.env.FAKE_LOG || '/tmp/fake-wrangler.log') + '.state';
const state = { created: existsSync(STATE) && readFileSync(STATE, 'utf8').includes('created') };

const scenario = process.env.FAKE_SCENARIO || 'happy';
const fakeUrl = process.env.FAKE_URL || 'https://vitaflex-monte-wo.pages.dev';
const DB_ID = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';
const args = process.argv.slice(2);
const log = line => appendFileSync(process.env.FAKE_LOG || '/tmp/fake-wrangler.log', JSON.stringify({ args, line, account: process.env.CLOUDFLARE_ACCOUNT_ID || null }) + '\n');
const out = line => { console.log(line); log(line); };

const joined = args.join(' ');

if (joined === 'whoami') {
  if (scenario === 'noauth') { console.error('You are not authenticated. Please run `wrangler login`.'); process.exit(1); }
  out('Getting User settings...\n👋 You are logged in with an OAuth Token, associated with the email owner@example.com!');
  process.exit(0);
}
if (args[0] === 'd1' && args[1] === 'list') {
  out(scenario === 'nodb' ? '[]' : JSON.stringify([
    { uuid: 'waitlist-1111-2222-3333-444444444444', name: 'monte-wo-waitlist' },
    { uuid: DB_ID, name: 'monte-wo-intelligence', created_at: '2026-10-25', version: 'production', num_tables: 8 }
  ]));
  process.exit(0);
}
if (args[0] === 'd1' && args[1] === 'create') {
  out(`✅ Successfully created DB '${args[2]}'\n\n[[d1_databases]]\nbinding = "DB"\ndatabase_name = "${args[2]}"\ndatabase_id = "${DB_ID}"\n`);
  process.exit(0);
}
if (args[0] === 'd1' && args[1] === 'execute' && args.includes('--command')) {
  if (joined.includes('sqlite_master')) {
    const ALL = ['intel_runs', 'intel_operators', 'intel_improvement_items'];
    const tables = { happy: ALL, missing: ALL, git: ALL, openapi: ALL, noauth: ALL, nodb: [], fresh: [], partial: ['intel_runs'], agentdone: [...ALL, 'mw_agent_keys', 'mw_agent_rate', 'mw_agent_audit', 'mw_agent_kv'] }[scenario] || ALL;
    out(JSON.stringify([{ results: tables.map(name => ({ name })) }]));
    process.exit(0);
  }
  // Migration-marker probe (settings-gated migrations like 0006).
  if (joined.includes('intel_settings') && joined.includes('migration_0006')) {
    const applied = ['happy', 'missing', 'git', 'openapi', 'noauth', 'agentdone'].includes(scenario);
    out(JSON.stringify([{ results: applied ? [{ value: 'applied' }] : [] }]));
    process.exit(0);
  }
  // operator grant / arbitrary SQL
  out('[{"results":[],"success":true,"meta":{"changes":1}}]');
  process.exit(0);
}
if (args[0] === 'd1' && args[1] === 'execute' && args.includes('--file')) {
  out(`✅ Execution complete (${args.find(a => a.endsWith('.sql'))})`);
  process.exit(0);
}
if (args[0] === 'pages' && args[1] === 'project' && args[2] === 'create') {
  writeFileSync(STATE, 'created');
  out(`✅ Successfully created the '${args[3]}' project.`);
  process.exit(0);
}
if (args[0] === 'pages' && args[1] === 'deploy') {
  if (scenario === 'git') { console.error('✘ [ERROR] Direct upload is not supported for projects with git-connected builds (vitaflex-monte-wo). Use `wrangler pages project create` for a direct-upload project.'); process.exit(1); }
  if (scenario === 'missing' && !state.created) { console.error('✘ [ERROR] Project not found. Run `wrangler pages project create`.'); process.exit(1); }
  out(`🌌 Uploading...\n✨ Deployment complete! Take a peek over at ${fakeUrl}`);
  process.exit(0);
}
if (args[0] === 'deploy') {
  out('Uploaded monte-wo-intelligence (1.24 sec)\nDeployed monte-wo-intelligence triggers (0.42 sec)\n  Schedule: */5 * * * *, 3 * * * *, 17 11 * * *, 23 11 * * 1');
  process.exit(0);
}
console.error('fake wrangler: unknown command: ' + joined);
process.exit(1);
