import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, mkdtempSync, rmSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { handleIntelligence } from '../server/intelligence/api.js';
import { validateTelemetryEvent, validateTelemetryBatch } from '../server/intelligence/telemetry.js';
import {
  runUltronChecks, analyzeArgonTelemetry, correlateAu, buildDailyBriefing, buildWeeklyBriefing,
  retentionSweep, ingestTelemetry, computeHealth, upsertIncidentFailure, noteRecovery, recordCheck, recordAgentRun
} from '../server/intelligence/core.js';
import worker from '../intelligence-worker/src/index.js';

let dir, db, env, keys, jwk;
function sqlite(data) {
  const out = JSON.parse(execFileSync('python3', ['tests/fixtures/d1_sqlite.py'], { input: JSON.stringify({ path: join(dir, 'intel.sqlite'), ...data }), encoding: 'utf8' }));
  if (out.error) throw Error(out.error);
  return out.data;
}
class Statement {
  constructor(sql, values = []) { this.sql = sql; this.values = values; }
  bind(...values) { return new Statement(this.sql, values); }
  async first() { return sqlite({ statements: [this] })[0].results[0] || null; }
  async all() { return sqlite({ statements: [this] })[0]; }
  async run() { return sqlite({ statements: [this] })[0]; }
}
const b64 = bytes => Buffer.from(bytes).toString('base64url');
async function token(sub = 'chief@monte.test', changes = {}) {
  const head = b64(JSON.stringify({ alg: 'RS256', kid: 'test-key' }));
  const body = b64(JSON.stringify({ iss: env.INTELLIGENCE_ACCESS_ISSUER, aud: [env.INTELLIGENCE_ACCESS_AUD], sub, iat: Math.floor(Date.now() / 1000), exp: Math.floor(Date.now() / 1000) + 600, ...changes }));
  return head + '.' + body + '.' + b64(await crypto.subtle.sign('RSASSA-PKCS1-v1_5', keys.privateKey, new TextEncoder().encode(head + '.' + body)));
}
const fetcher = async () => new Response(JSON.stringify({ keys: [jwk] }), { headers: { 'Content-Type': 'application/json' } });
async function call(route, method = 'GET', data = null, extra = {}) {
  const init = { method, headers: { ...extra } };
  if (data !== null) { init.body = JSON.stringify(data); init.headers['Content-Type'] = 'application/json'; }
  if (extra.__token) { init.headers['Cf-Access-Jwt-Assertion'] = extra.__token; delete init.headers.__token; }
  return handleIntelligence({ request: new Request('https://monte.test/api/intelligence' + route, init), env }, { fetcher });
}
async function local(route, method = 'GET', data = null, extra = {}) {
  const init = { method, headers: { ...extra } };
  if (data !== null) { init.body = JSON.stringify(data); init.headers['Content-Type'] = 'application/json'; }
  return handleIntelligence({ request: new Request('http://localhost/api/intelligence' + route, init), env }, { fetcher });
}
const event = (over = {}) => ({
  type: 'session_start', appVersion: '1.0.0', platform: 'android', ...over
});
const failFetch = async () => { throw new Error('network down'); };
const statusFetch = code => async () => new Response('x', { status: code });
const okFetch = async (url) => new Response('ok', { status: 200, headers: { 'Content-Type': 'text/plain' } });

before(async () => {
  dir = mkdtempSync(join(tmpdir(), 'monte-intel-test-'));
  sqlite({ script: readFileSync('migrations/0003_intelligence.sql', 'utf8') + readFileSync('migrations/0004_intelligence_ops.sql', 'utf8') + readFileSync('migrations/0005_intelligence_titan.sql', 'utf8') });
  db = { prepare: s => new Statement(s), batch: async statements => sqlite({ statements }) };
  keys = await crypto.subtle.generateKey({ name: 'RSASSA-PKCS1-v1_5', modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256' }, true, ['sign', 'verify']);
  jwk = { ...await crypto.subtle.exportKey('jwk', keys.publicKey), kid: 'test-key', alg: 'RS256' };
  env = {
    INTEL_DB: db,
    INTELLIGENCE_ACCESS_ISSUER: 'https://monte-team.cloudflareaccess.com',
    INTELLIGENCE_ACCESS_AUD: 'intel-audience',
    INTELLIGENCE_INGEST_KEY: 'ingest-test-key',
    SITE_URL: 'https://monte.test',
    LOCAL_DEVELOPMENT: 'true' // local() helper hits http://localhost; call() uses the public hostname + Access JWT
  };
});
after(() => rmSync(dir, { recursive: true, force: true }));

// ---------- migrations & seeds ----------
test('migrations apply additively; automation rules seeded disabled; no operators by default; app tables are absent', async () => {
  const rules = (await db.prepare('SELECT id, enabled FROM intel_automation_rules').all()).results;
  assert.equal(rules.length, 3);
  assert.ok(rules.every(r => r.enabled === 0));
  assert.equal((await db.prepare('SELECT COUNT(*) AS n FROM intel_operators').first()).n, 0);
  // The intelligence database must stay isolated from waitlist/strength/mobile schemas.
  const tables = (await db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all()).results.map(r => r.name);
  assert.ok(!tables.includes('waitlist'));
  assert.ok(!tables.some(t => t.startsWith('mw_')));
});

// ---------- authentication & authorization ----------
test('unconfigured access fails closed', async () => {
  const res = await handleIntelligence({ request: new Request('https://monte.test/api/intelligence/overview'), env: {} }, { fetcher });
  assert.equal(res.status, 503);
  const missingDb = await handleIntelligence({ request: new Request('https://monte.test/api/intelligence/overview'), env: { INTELLIGENCE_ACCESS_ISSUER: env.INTELLIGENCE_ACCESS_ISSUER } }, { fetcher });
  assert.equal(missingDb.status, 503);
});
test('public status endpoint reports honest component state without authentication', async () => {
  // Nothing configured at all: still answers 200 with bound:false — never pretends, never leaks.
  const bare = await handleIntelligence({ request: new Request('https://monte.test/api/intelligence/status'), env: {} }, { fetcher });
  assert.equal(bare.status, 200);
  const bareBody = await bare.json();
  assert.equal(bareBody.fail_closed, true);
  assert.equal(bareBody.components.d1_database.bound, false);
  assert.equal(bareBody.components.cloudflare_access.configured, false);
  assert.ok(bareBody.components.cloudflare_access.detail.length > 20);
  assert.equal(bareBody.data_counts, null); // no db -> nothing claimed

  // Database present, Access missing: reports the real split — backend live, login missing.
  await db.prepare("INSERT INTO intel_checks (id,agent,target,status,latency_ms,http_status,detail,evidence_json,checked_at) VALUES ('status-c1','ULTRON','public-site','ok',120,200,'','{}','2026-10-25T21:40:00.000Z')").run();
  await db.prepare("INSERT INTO intel_agent_runs (id,agent,run_type,status,summary,evidence_json,started_at,finished_at) VALUES ('status-r1','ULTRON','site-monitor','ok','3 target(s) checked','{}','2026-10-25T21:40:00.000Z','2026-10-25T21:40:01.000Z')").run();
  const live = await handleIntelligence({ request: new Request('https://monte.test/api/intelligence/status'), env: { INTEL_DB: db } }, { fetcher });
  assert.equal(live.status, 200);
  const lb = await live.json();
  assert.equal(lb.components.d1_database.bound, true);
  assert.ok(lb.components.d1_database.tables.includes('intel_checks'));
  assert.equal(lb.components.d1_database.migrations, '0003 + 0004 + 0005 applied');
  assert.equal(lb.components.cloudflare_access.configured, false);
  assert.equal(lb.monitoring.ultron_last_check.status, 'ok');
  assert.ok(lb.monitoring.ultron_total_checks >= 1);
  assert.ok(lb.data_counts.intel_checks >= 1);
  assert.ok(lb.data_counts.intel_agent_runs >= 1);
  assert.ok((lb.monitoring.interpretation || '').includes('live'));
  // Aggregates only: the public payload must not carry intelligence content or subjects.
  const raw = JSON.stringify(lb);
  assert.ok(!raw.includes('"subject"'), 'status payload must not expose operator subjects');
  assert.ok(!raw.includes('"body"') && !raw.includes('"evidence_json"'), 'status payload must not expose content');
  // Restore the pristine database for the tests that follow (they expect zero checks).
  await db.prepare("DELETE FROM intel_checks WHERE id='status-c1'").run();
  await db.prepare("DELETE FROM intel_agent_runs WHERE id='status-r1'").run();
});
test('fail-closed 503 carries an actionable hint pointing at the public status endpoint', async () => {
  const res = await handleIntelligence({ request: new Request('https://monte.test/api/intelligence/overview'), env: { INTEL_DB: db } }, { fetcher });
  assert.equal(res.status, 503);
  const body = await res.json();
  assert.equal(body.error, 'intelligence-not-configured');
  assert.ok((body.hint || '').includes('/api/intelligence/status'));
});
test('forged, expired, wrong-issuer and wrong-audience tokens are rejected', async () => {
  await db.prepare("INSERT INTO intel_operators(subject,role) VALUES('chief@monte.test','admin')").run();
  for (const changes of [{ exp: 1 }, { iss: 'https://evil.test' }, { aud: ['wrong'] }, { iat: 9999999999 }]) {
    const res = await call('/overview', 'GET', null, { __token: await token('chief@monte.test', changes) });
    assert.equal(res.status, 401, JSON.stringify(changes));
  }
  assert.equal((await call('/overview', 'GET', null, { __token: 'forged.token.value' })).status, 401);
  assert.equal((await call('/overview')).status, 401);
  const signed = await token();
  assert.equal((await call('/overview', 'GET', null, { __token: signed.slice(0, -8) + 'AAAAAAAA' })).status, 401);
});
test('authenticated identity without operator provisioning is refused; provisioned admin works; viewer cannot mutate', async () => {
  assert.equal((await call('/overview', 'GET', null, { __token: await token('stranger@monte.test') })).status, 403);
  const ok = await call('/overview', 'GET', null, { __token: await token('chief@monte.test') });
  assert.equal(ok.status, 200);
  assert.equal((await ok.json()).live, false);
  await db.prepare("INSERT INTO intel_operators(subject,role) VALUES('viewer@monte.test','viewer')").run();
  assert.equal((await call('/incidents', 'GET', null, { __token: await token('viewer@monte.test') })).status, 200);
  const post = await call('/automation/retention-purge/approve', 'POST', { confirm: 'retention-purge' }, { __token: await token('viewer@monte.test'), Origin: 'https://monte.test' });
  assert.equal(post.status, 403);
});
test('local development bypass only works on localhost hostnames', async () => {
  const localEnv = { ...env, LOCAL_DEVELOPMENT: 'true' };
  const res = await handleIntelligence({ request: new Request('http://localhost/api/intelligence/overview'), env: localEnv }, { fetcher });
  assert.equal(res.status, 200);
  const publicRes = await handleIntelligence({ request: new Request('https://demo.e2b.app/api/intelligence/overview'), env: localEnv }, { fetcher });
  assert.equal(publicRes.status, 401);
});
test('preview token gate: only valid bearer tokens on preview hosts, never without LOCAL_DEVELOPMENT', async () => {
  // Public hostname without a token: refused (this is the preview-URL default posture).
  assert.equal((await call('/overview')).status, 401);
  // Wrong token: refused.
  const wrong = await handleIntelligence({ request: new Request('https://preview.e2b.app/api/intelligence/overview', { headers: { Authorization: 'Bearer wrong-token-wrong-token' } }), env }, { fetcher });
  assert.equal(wrong.status, 401);
  // Correct token but LOCAL_DEVELOPMENT off (production posture): refused — the gate is preview-only.
  const prod = await handleIntelligence({ request: new Request('https://preview.e2b.app/api/intelligence/overview', { headers: { Authorization: 'Bearer ' + 'x'.repeat(32) } }), env: { ...env, LOCAL_DEVELOPMENT: undefined, PREVIEW_TOKEN: 'x'.repeat(32) } }, { fetcher });
  assert.equal(prod.status, 401);
  // Correct token with LOCAL_DEVELOPMENT on: authenticated as preview operator.
  const previewEnv = { ...env, PREVIEW_TOKEN: 'preview-token-1234567890abcdef' };
  const ok = await handleIntelligence({ request: new Request('https://preview.e2b.app/api/intelligence/overview', { headers: { Authorization: 'Bearer preview-token-1234567890abcdef' } }), env: previewEnv }, { fetcher });
  assert.equal(ok.status, 200);
  const data = await ok.json();
  assert.equal(data.config.localDevelopment, true);
  // Short tokens are never honored.
  const short = await handleIntelligence({ request: new Request('https://preview.e2b.app/api/intelligence/overview', { headers: { Authorization: 'Bearer short' } }), env: { ...env, PREVIEW_TOKEN: 'short' } }, { fetcher });
  assert.equal(short.status, 401);
  // Setting PREVIEW_TOKEN hardens localhost too: the token is mandatory everywhere.
  const localNoToken = await handleIntelligence({ request: new Request('http://localhost/api/intelligence/overview'), env: previewEnv }, { fetcher });
  assert.equal(localNoToken.status, 401);
  const localWithToken = await handleIntelligence({ request: new Request('http://localhost/api/intelligence/overview', { headers: { Authorization: 'Bearer preview-token-1234567890abcdef' } }), env: previewEnv }, { fetcher });
  assert.equal(localWithToken.status, 200);
  // Without PREVIEW_TOKEN, the localhost bypass still works for plain local development.
  assert.equal((await local('/overview')).status, 200);
});
test('cross-origin mutations are rejected', async () => {
  const res = await call('/automation/retention-purge/approve', 'POST', { confirm: 'retention-purge' }, { __token: await token('chief@monte.test'), Origin: 'https://evil.test' });
  assert.equal(res.status, 403);
});

// ---------- telemetry contract ----------
test('telemetry validation rejects identifiers, free-form text and unknown fields', () => {
  assert.ok(validateTelemetryEvent(event()).id);
  for (const bad of [
    event({ type: 'app_crash', fingerprint: 'x'.repeat(200) }),
    event({ userId: 'alice' }),
    event({ type: 'js_error', fingerprint: 'ok', message: 'free text with PII' }),
    event({ type: 'http_error', fingerprint: 'ok', route: '../../etc/passwd' }),
    event({ type: 'session_start', appVersion: 'version with spaces!' }),
    event({ type: 'location' }),
    event({ platform: 'windows' }),
    event({ type: 'http_error', fingerprint: 'ok', statusCode: 999 })
  ]) {
    assert.throws(() => validateTelemetryEvent(bad), /invalid|unexpected/, JSON.stringify(bad));
  }
  assert.throws(() => validateTelemetryBatch({ events: new Array(51).fill(event()) }), /batch/);
});
test('ingest requires the key, is idempotent and rate-limited', async () => {
  assert.equal((await local('/events', 'POST', { events: [event()] }, { 'X-MW-Key': 'wrong' })).status, 401);
  const batch = [
    event({ eventId: '11111111-1111-4111-8111-111111111111' }),
    event({ type: 'http_error', appVersion: '1.0.0', fingerprint: 'GET-/api/status-500', eventId: '22222222-2222-4222-8222-222222222222', route: '/api/status', statusCode: 500, method: 'GET' }),
    event({ type: 'app_crash', appVersion: '1.0.0', fingerprint: 'TypeError:render', eventId: '33333333-3333-4333-8333-333333333333', errorClass: 'TypeError', isFatal: true })
  ];
  const res = await local('/events', 'POST', { events: batch }, { 'X-MW-Key': env.INTELLIGENCE_INGEST_KEY });
  assert.equal(res.status, 201);
  assert.deepEqual(await res.json(), { accepted: 3, inserted: 3, duplicates: 0 });
  const retry = await local('/events', 'POST', { events: batch }, { 'X-MW-Key': env.INTELLIGENCE_INGEST_KEY });
  assert.deepEqual(await retry.json(), { accepted: 3, inserted: 0, duplicates: 3 });
  await db.prepare("UPDATE intel_rate_limits SET attempts=1000 WHERE key='ingest:key'").run();
  assert.equal((await local('/events', 'POST', { events: [event()] }, { 'X-MW-Key': env.INTELLIGENCE_INGEST_KEY })).status, 429);
});

// ---------- ULTRON ----------
test('website failure creates one deduplicated incident that escalates by streak, then verifies recovery', async () => {
  for (let i = 0; i < 6; i++) await runUltronChecks({ ...env, SITE_URL: 'https://monte.test' }, failFetch);
  const incident = await db.prepare("SELECT * FROM intel_incidents WHERE fingerprint='ultron-unavailable-website-home'").first();
  assert.ok(incident);
  assert.equal(incident.status, 'open');
  assert.equal(incident.occurrence_count, 6);
  assert.equal(incident.severity, 'critical');
  assert.equal(incident.streak_fail, 6);
  // Escalation to critical created an urgent briefing; the delivery log records the rule block.
  const urgent = (await db.prepare("SELECT * FROM intel_briefings WHERE kind='urgent' ORDER BY created_at DESC LIMIT 1").first());
  assert.ok(urgent);
  assert.equal(urgent.delivery_status, 'not_configured');
  assert.ok(urgent.body.includes('ULTRON'));
  const note = (await db.prepare("SELECT * FROM intel_notifications WHERE briefing_id=? ORDER BY created_at DESC LIMIT 1").bind(urgent.id).first());
  assert.equal(note.status, 'blocked-rule-disabled');
  // Two passes mark a recovery candidate but do NOT auto-resolve while the rule is disabled.
  await runUltronChecks(env, okFetch);
  await runUltronChecks(env, okFetch);
  let after = await db.prepare("SELECT * FROM intel_incidents WHERE fingerprint='ultron-unavailable-website-home'").first();
  assert.equal(after.status, 'open');
  assert.equal(after.streak_ok, 2);
  assert.ok(JSON.parse(after.evidence_json).recoveryCandidate);
  // Approving the bounded rule enables verified auto-resolution with an audit record.
  await db.prepare("UPDATE intel_automation_rules SET enabled=1, explicitly_approved_by='chief@monte.test', approved_at='2026-10-24T00:00:00Z' WHERE id='auto-resolve-recovered-targets'").run();
  await runUltronChecks(env, okFetch);
  after = await db.prepare("SELECT * FROM intel_incidents WHERE fingerprint='ultron-unavailable-website-home'").first();
  assert.equal(after.status, 'resolved');
  assert.equal(after.updated_by, 'automation:auto-resolve-recovered-targets');
  assert.ok(after.resolved_at);
  assert.ok(JSON.parse(after.evidence_json).recoveryVerified);
  const audit = (await db.prepare("SELECT * FROM intel_audit WHERE action='incident-auto-resolved' AND target='ultron-unavailable-website-home'").first());
  assert.ok(audit);
});
test('a resolved incident that fails again reopens with preserved history', async () => {
  await runUltronChecks(env, failFetch);
  const reopened = await db.prepare("SELECT * FROM intel_incidents WHERE fingerprint='ultron-unavailable-website-home'").first();
  assert.equal(reopened.status, 'open');
  assert.equal(reopened.occurrence_count, 7);
  assert.ok(Date.parse(reopened.first_seen) < Date.parse(reopened.last_seen));
});
test('5xx is an outage; 4xx is a broken route needing human confirmation; slow streaks are performance incidents', async () => {
  await runUltronChecks(env, statusFetch(500));
  assert.ok(await db.prepare("SELECT id FROM intel_incidents WHERE fingerprint='ultron-unavailable-website-home'").first());
  const cleanEnv = { ...env, SITE_URL: 'https://monte.test' };
  await runUltronChecks(cleanEnv, statusFetch(404));
  const route = await db.prepare("SELECT * FROM intel_incidents WHERE fingerprint='ultron-route-error-website-home'").first();
  assert.ok(route);
  assert.equal(route.severity, 'medium');
  assert.equal(route.auto_resolve, 0);
  const slowFetch = async () => { await new Promise(r => setTimeout(r, 5)); return new Response('ok', { status: 200 }); };
  const slowEnv = { ...env, INTEL_SLOW_MS: '1' };
  for (let i = 0; i < 3; i++) await runUltronChecks(slowEnv, slowFetch);
  const slow = await db.prepare("SELECT * FROM intel_incidents WHERE fingerprint='ultron-slow-website-home'").first();
  assert.ok(slow);
  assert.equal(slow.severity, 'low');
});
test('missing SITE_URL records an explicit not-configured check instead of reporting healthy', async () => {
  await runUltronChecks({ ...env, SITE_URL: undefined });
  const check = await db.prepare("SELECT * FROM intel_checks WHERE status='not_configured' ORDER BY checked_at DESC LIMIT 1").first();
  assert.ok(check);
  assert.equal(check.agent, 'ULTRON');
});

// ---------- ARGON ----------
test('release regression detection: hypothesis-labelled, confidence-capped, with baseline evidence', async () => {
  const old = new Date(Date.now() - 4 * 86400000).toISOString();
  const rows = [];
  for (let i = 0; i < 50; i++) rows.push(event({ appVersion: '1.0.0', occurredAt: old, eventId: crypto.randomUUID() }));
  for (let i = 0; i < 4; i++) rows.push(event({ type: 'js_error', appVersion: '1.0.0', fingerprint: 'old-error', occurredAt: old, eventId: crypto.randomUUID() }));
  await ingestTelemetry(db, rows.map(r => validateTelemetryEvent(r)));
  const now = new Date();
  const fresh = [];
  for (let i = 0; i < 10; i++) fresh.push(event({ appVersion: '2.0.0', occurredAt: now.toISOString(), eventId: crypto.randomUUID() }));
  for (let i = 0; i < 9; i++) fresh.push(event({ type: 'js_error', appVersion: '2.0.0', fingerprint: 'render-crash', occurredAt: now.toISOString(), eventId: crypto.randomUUID() }));
  await ingestTelemetry(db, fresh.map(r => validateTelemetryEvent(r)));
  await analyzeArgonTelemetry(db, null, now);
  const regression = await db.prepare("SELECT * FROM intel_incidents WHERE fingerprint='argon-regression-2.0.0'").first();
  assert.ok(regression);
  assert.equal(regression.agent, 'ARGON');
  const evidence = JSON.parse(regression.evidence_json);
  assert.equal(evidence.classification, 'hypothesis');
  assert.equal(evidence.sessions, 10);
  assert.ok(evidence.rate >= 0.8);
  assert.ok(regression.confidence <= 0.75);
  const signature = await db.prepare("SELECT * FROM intel_incidents WHERE fingerprint='argon-new-signature-render-crash'").first();
  assert.ok(signature);
});
test('errors without a usage denominator are reported as missing data, not a regression', async () => {
  const now = new Date();
  const fresh = [];
  for (let i = 0; i < 11; i++) fresh.push(event({ type: 'http_error', appVersion: '3.0.0', fingerprint: 'GET-/api/x-503', occurredAt: now.toISOString(), eventId: crypto.randomUUID() }));
  await ingestTelemetry(db, fresh.map(r => validateTelemetryEvent(r)));
  await analyzeArgonTelemetry(db, null, now);
  const incident = await db.prepare("SELECT * FROM intel_incidents WHERE fingerprint='argon-errors-no-sessions-3.0.0'").first();
  assert.ok(incident);
  assert.equal(JSON.parse(incident.evidence_json).classification, 'missing-data');
  assert.ok(incident.confidence <= 0.5);
});
test('login failure spike detection', async () => {
  const now = new Date();
  const fresh = [];
  for (let i = 0; i < 20; i++) fresh.push(event({ appVersion: '2.1.0', occurredAt: now.toISOString(), eventId: crypto.randomUUID() }));
  for (let i = 0; i < 6; i++) fresh.push(event({ type: 'login_failed', appVersion: '2.1.0', fingerprint: 'login-token', occurredAt: now.toISOString(), eventId: crypto.randomUUID(), stage: 'token' }));
  await ingestTelemetry(db, fresh.map(r => validateTelemetryEvent(r)));
  await analyzeArgonTelemetry(db, null, now);
  const incident = await db.prepare("SELECT * FROM intel_incidents WHERE fingerprint='argon-login-failures-2.1.0'").first();
  assert.ok(incident);
  assert.equal(incident.severity, 'medium');
});

// ---------- AU correlation ----------
test('AU correlates temporally co-occurring website and app failures and follows member resolution', async () => {
  await correlateAu(db, null);
  const au = await db.prepare("SELECT * FROM intel_incidents WHERE agent='AU' AND fingerprint LIKE 'au-ultron-unavailable-api%'").first();
  assert.ok(au, 'expected a correlation of the api-status outage with an ARGON http_error finding');
  const evidence = JSON.parse(au.evidence_json);
  assert.equal(evidence.members.length, 2);
  assert.equal(evidence.classification, 'hypothesis');
  assert.ok(au.correlation_group);
  const members = (await db.prepare("SELECT fingerprint, correlation_group FROM intel_incidents WHERE correlation_group=? AND agent<>'AU'").bind(au.correlation_group).all()).results;
  assert.equal(members.length, 2);
  // Resolve both members; the correlation must follow.
  await db.prepare("UPDATE intel_incidents SET status='resolved', resolved_at=? WHERE correlation_group=? AND agent<>'AU'").bind(new Date().toISOString(), au.correlation_group).run();
  await correlateAu(db, null);
  const after = await db.prepare('SELECT status FROM intel_incidents WHERE fingerprint=?').bind(au.fingerprint).first();
  assert.equal(after.status, 'resolved');
});

// ---------- briefings & health ----------
test('daily briefing: deterministic, evidence-linked, challenges weak conclusions, flags decisions', async () => {
  const out = await buildDailyBriefing(db);
  assert.ok(out.id.startsWith('daily-'));
  const row = await db.prepare('SELECT * FROM intel_briefings WHERE id=?').bind(out.id).first();
  assert.ok(row.body.includes('AU DAILY EXECUTIVE SUMMARY'));
  assert.ok(row.body.includes('Availability:'));
  const evidence = JSON.parse(row.evidence_json);
  assert.ok(Array.isArray(evidence.recommendations));
  assert.ok(evidence.recommendations.some(r => r.decisionRequired && r.evidence.length > 0));
  assert.ok(evidence.challenges.length > 0); // low-confidence missing-data incident must be challenged
  assert.equal(evidence.visitorAnalytics.status, 'not_configured');
  assert.ok(row.body.includes('NOT CONFIGURED'));
  // Regenerating the same day is idempotent.
  await buildDailyBriefing(db);
  assert.equal((await db.prepare('SELECT COUNT(*) AS n FROM intel_briefings WHERE id=?').bind(out.id).first()).n, 1);
});
test('weekly briefing: recurring fingerprints, MTTR and week-over-week comparison', async () => {
  const out = await buildWeeklyBriefing(db);
  const row = await db.prepare('SELECT * FROM intel_briefings WHERE id=?').bind(out.id).first();
  assert.ok(row.body.includes('AU WEEKLY STRATEGIC REPORT'));
  assert.ok(row.body.includes('Week-over-week'));
  const evidence = JSON.parse(row.evidence_json);
  assert.ok(Array.isArray(evidence.recurring));
  assert.ok(evidence.recurring.some(r => r.fingerprint.includes('ultron-unavailable-website-home')));
});
test('health computation is honest about missing data', () => {
  const empty = computeHealth([], []);
  assert.equal(empty.score, null);
  assert.equal(empty.label, 'NO DATA');
  const healthy = computeHealth([{ status: 'ok', latency_ms: 120 }, { status: 'ok', latency_ms: 180 }], []);
  assert.equal(healthy.label, 'HEALTHY');
  assert.ok(healthy.p95LatencyMs >= 120);
  const degraded = computeHealth([{ status: 'ok' }, { status: 'down' }], [{ severity: 'critical' }]);
  assert.equal(degraded.label, 'AT RISK');
  assert.ok(degraded.score < 90);
});

// ---------- retention ----------
test('retention respects the approval rule and never deletes incidents or audit history', async () => {
  const blocked = await retentionSweep(db);
  assert.equal(blocked.skipped, 'rule-disabled');
  const ancient = new Date(Date.now() - 40 * 86400000).toISOString();
  await db.prepare('DELETE FROM intel_checks').run();
  await recordCheck(db, { agent: 'ULTRON', target: 'website-home', status: 'ok', checkedAt: ancient });
  await db.prepare("UPDATE intel_automation_rules SET enabled=1 WHERE id='retention-purge'").run();
  const run = await retentionSweep(db);
  assert.equal(run.checks >= 1, true);
  assert.equal((await db.prepare("SELECT COUNT(*) AS n FROM intel_checks WHERE checked_at<?").bind(ancient).first()).n, 0);
  assert.ok((await db.prepare('SELECT COUNT(*) AS n FROM intel_incidents').first()).n > 0);
  assert.ok((await db.prepare('SELECT COUNT(*) AS n FROM intel_audit').first()).n > 0);
});

// ---------- API surface ----------
test('overview reports agent states and configuration honestly', async () => {
  // Simulate the production flow: ULTRON's 5-minute cron recorded checks and the hourly
  // Worker recorded an ARGON analysis run.
  await runUltronChecks(env, async () => new Response('ok', { status: 200 }));
  await recordAgentRun(db, 'ARGON', 'telemetry-analysis', async () => ({ summary: 'seeded run for overview state' }));
  const res = await local('/overview');
  assert.equal(res.status, 200);
  const data = await res.json();
  assert.equal(data.live, true);
  assert.equal(data.config.dbConfigured, true);
  assert.equal(data.config.accessConfigured, true);
  assert.equal(data.config.ingestConfigured, true);
  assert.equal(data.config.webhookConfigured, false);
  assert.equal(data.config.siteUrlConfigured, true);
  assert.ok(['OPERATIONAL', 'STALE', 'OFFLINE', 'AWAITING FIRST CHECK'].includes(data.agents.ultron.status));
  assert.equal(data.agents.argon.status, 'OPERATIONAL');
  assert.ok(data.agents.au.status);
  assert.ok(data.health.total > 0);
  assert.equal(typeof data.incidents.countsBySeverity.critical, 'number');
  assert.ok(Array.isArray(data.checks.series));
});
test('incident list filters, detail view and status transitions with audit', async () => {
  const list = await local('/incidents?status=open&agent=ULTRON');
  assert.equal(list.status, 200);
  const open = (await list.json()).incidents;
  assert.ok(open.length > 0);
  assert.ok(open.every(i => i.agent === 'ULTRON'));
  const id = open[0].id;
  const detail = await local('/incidents/' + id);
  assert.equal(detail.status, 200);
  const d = await detail.json();
  assert.ok(d.incident.evidence);
  assert.ok(Array.isArray(d.activity));
  assert.equal((await local('/incidents/not-a-uuid')).status, 404);
  assert.equal((await local('/incidents/' + crypto.randomUUID())).status, 404);
  // invalid transition and dismissal without reason are rejected
  const target = (await (await local('/incidents?status=open&limit=1')).json()).incidents[0];
  assert.equal((await local('/incidents/' + target.id, 'POST', { status: 'resolved', note: '' }, { Origin: 'http://localhost' })).status, 200);
  assert.equal((await local('/incidents/' + target.id, 'POST', { status: 'resolved' }, { Origin: 'http://localhost' })).status, 409);
  const dismissable = (await (await local('/incidents?status=open&limit=5')).json()).incidents[0];
  assert.equal((await local('/incidents/' + dismissable.id, 'POST', { status: 'dismissed' }, { Origin: 'http://localhost' })).status, 400);
  const dismissed = await local('/incidents/' + dismissable.id, 'POST', { status: 'dismissed', note: 'Intentionally removed route; verified with release notes.' }, { Origin: 'http://localhost' });
  assert.equal(dismissed.status, 200);
  const audit = await db.prepare("SELECT * FROM intel_audit WHERE action='incident-status-changed' AND target=?").bind(dismissable.id).first();
  assert.equal(audit.actor, 'local-operator');
  assert.equal(audit.outcome, 'dismissed');
});
test('automation governance: typed confirmation, audit trail, revoke', async () => {
  const rules = await (await local('/automation')).json();
  assert.equal(rules.rules.length, 3);
  assert.ok(rules.policy.includes('never automated'));
  assert.equal((await local('/automation/retention-purge/approve', 'POST', { confirm: 'wrong' }, { Origin: 'http://localhost' })).status, 400);
  const approve = await local('/automation/retention-purge/approve', 'POST', { confirm: 'retention-purge' }, { Origin: 'http://localhost' });
  assert.equal(approve.status, 200);
  const rule = await db.prepare("SELECT * FROM intel_automation_rules WHERE id='retention-purge'").first();
  assert.equal(rule.enabled, 1);
  assert.equal(rule.explicitly_approved_by, 'local-operator');
  assert.ok((await db.prepare("SELECT id FROM intel_audit WHERE action='automation-approved' AND target='retention-purge'").first()));
  const revoke = await local('/automation/retention-purge/revoke', 'POST', {}, { Origin: 'http://localhost' });
  assert.equal(revoke.status, 200);
  assert.equal((await db.prepare("SELECT enabled FROM intel_automation_rules WHERE id='retention-purge'").first()).enabled, 0);
});
test('manual verification endpoint runs real checks and records them', async () => {
  const res = await local('/verify', 'POST', {}, { Origin: 'http://localhost' });
  assert.equal(res.status, 200);
  const data = await res.json();
  assert.ok(data.results.length >= 2);
  assert.ok(data.results.every(r => ['ok', 'degraded', 'down'].includes(r.status)));
  const run = await db.prepare("SELECT * FROM intel_agent_runs WHERE run_type='manual-verify' ORDER BY started_at DESC LIMIT 1").first();
  assert.equal(run.agent, 'ULTRON');
  assert.equal((await local('/verify', 'POST', {}, { Origin: 'http://localhost' })).status, 200);
});
test('on-demand analysis and briefing endpoints work with rate limits and audit', async () => {
  const res = await local('/analyze', 'POST', {}, { Origin: 'http://localhost' });
  assert.equal(res.status, 200);
  assert.ok((await res.json()).argon.includes('analyzed'));
  const bad = await local('/briefing', 'POST', { kind: 'urgent' }, { Origin: 'http://localhost' });
  assert.equal(bad.status, 400);
  const daily = await local('/briefing', 'POST', { kind: 'daily' }, { Origin: 'http://localhost' });
  assert.equal(daily.status, 200);
  assert.ok((await daily.json()).id.startsWith('daily-'));
  await db.prepare("UPDATE intel_rate_limits SET attempts=100 WHERE key LIKE 'briefing:%'").run();
  assert.equal((await local('/briefing', 'POST', { kind: 'weekly' }, { Origin: 'http://localhost' })).status, 429);
  assert.ok(await db.prepare("SELECT id FROM intel_audit WHERE action='briefing-regenerated'").first());
});
test('timeline merges incidents, runs, briefings and audit; audit endpoint lists events; unknown routes 404', async () => {
  const tl = await (await local('/timeline?limit=40')).json();
  assert.ok(tl.items.length > 0);
  const kinds = new Set(tl.items.map(i => i.kind));
  assert.ok(kinds.has('incident-opened') && kinds.has('agent-run') && kinds.has('briefing') && kinds.has('audit'));
  assert.ok(tl.items.every(i => Date.parse(i.at)));
  const audit = await (await local('/audit?limit=10')).json();
  assert.ok(audit.events.length > 0);
  assert.equal((await local('/nope')).status, 404);
  assert.equal((await local('/events', 'GET')).status, 405);
});
test('operator rate limits apply', async () => {
  await db.prepare("UPDATE intel_rate_limits SET attempts=1000 WHERE key LIKE 'op:%'").run();
  assert.equal((await local('/incidents', 'POST', { status: 'resolved' }, { Origin: 'http://localhost' })).status, 429);
  // GET reads are not rate limited by the mutation budget
  assert.equal((await local('/overview')).status, 200);
});

// ---------- worker ----------
test('worker fails closed when not enabled and runs jobs when enabled', async () => {
  const disabledEnv = { INTEL_DB: db, INTELLIGENCE_ENABLED: 'false' };
  await worker.scheduled({ cron: '*/5 * * * *' }, disabledEnv, { waitUntil: () => { } });
  const smoke = await worker.fetch(new Request('https://worker.test/health'), disabledEnv);
  assert.equal(smoke.status, 200);
  assert.equal((await smoke.json()).enabled, false);
  assert.equal((await worker.fetch(new Request('https://worker.test/run', { method: 'POST' }), disabledEnv)).status, 503);
  let done;
  const ctx = { waitUntil: p => { done = p; } };
  const enabledEnv = { ...env, INTELLIGENCE_ENABLED: 'true', SITE_URL: 'https://monte.test' };
  await worker.scheduled({ cron: '*/5 * * * *' }, enabledEnv, ctx);
  await done;
  const run = await db.prepare("SELECT * FROM intel_agent_runs WHERE run_type='website-checks' ORDER BY started_at DESC LIMIT 1").first();
  assert.equal(run.agent, 'ULTRON');
  await worker.scheduled({ cron: '3 * * * *' }, enabledEnv, ctx);
  await done;
  const argonRun = await db.prepare("SELECT * FROM intel_agent_runs WHERE run_type='telemetry-analysis' ORDER BY started_at DESC LIMIT 1").first();
  assert.equal(argonRun.agent, 'ARGON');
  const auRun = await db.prepare("SELECT * FROM intel_agent_runs WHERE run_type='correlation' ORDER BY started_at DESC LIMIT 1").first();
  assert.equal(auRun.agent, 'AU');
  const keyed = await worker.fetch(new Request('https://worker.test/run?job=checks', { method: 'POST', headers: { 'X-MW-Worker-Key': 'nope' } }), enabledEnv);
  assert.equal(keyed.status, 401);
});


// ---------- TITAN improvement agent ----------
const TITAN_SOURCES = 'https://sources.test';
const fixtureApp = `<Stack.Screen name="Exercise" />
<Stack.Screen name="Performance" />
${'<TouchableOpacity onPress={() => {}} />\n'.repeat(12)}
`;
const fixtureAppFixed = fixtureApp.split('<TouchableOpacity onPress={() => {}} />').join('<TouchableOpacity accessibilityLabel="Action" onPress={() => {}} />');
const fixtureApi = 'const a = await fetch(x); const b = fetch(y); const c = fetch(z); const d = fetch(w);\n';
const fixturePkg = JSON.stringify({ dependencies: { react: '18.2.0', 'left-pad': '1.3.0' } });
let titanSourcesFixed = false;
// TITAN tests run as the Access-JWT operator: the local-operator rate bucket is intentionally
// exhausted by an earlier test, and reusing it would 429 at the auth layer.
async function titanCall(route, method = 'GET', data = null, extra = {}) {
  const init = { method, headers: { ...extra, 'Cf-Access-Jwt-Assertion': await token() } };
  if (data !== null) { init.body = JSON.stringify(data); init.headers['Content-Type'] = 'application/json'; }
  return handleIntelligence({ request: new Request('https://monte.test/api/intelligence' + route, init), env: { ...env, TITAN_SOURCES_URL: TITAN_SOURCES } }, { fetcher: titanFetcher });
}
const titanFetcher = async (url) => {
  if (String(url).startsWith(TITAN_SOURCES)) {
    const path = String(url).slice(TITAN_SOURCES.length);
    const body = path.endsWith('App.tsx') ? (titanSourcesFixed ? fixtureAppFixed : fixtureApp)
      : path.endsWith('api.ts') ? fixtureApi
      : path.endsWith('package.json') ? fixturePkg
      : 'export {};';
    return new Response(body, { status: 200, headers: { 'Content-Type': 'text/plain' } });
  }
  return fetcher(url);
};

test('TITAN audit turns source + telemetry evidence into a prioritized backlog', async () => {
  await ingestTelemetry(db, [1, 2, 3, 4, 5, 6].map(i => validateTelemetryEvent(event({ type: 'js_error', appVersion: '1.5.0', fingerprint: 'js-TypeError-/library', errorClass: 'TypeError', screen: '/library', eventId: crypto.randomUUID() }))));
  const res = await titanCall('/improve', 'POST', {});
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.ok(body.ok);
  assert.ok(body.items.length >= 3, 'expected a11y + api-cache + deps + nav + telemetry findings');
  const keys = body.items.map(i => i.evidenceKey);
  assert.ok(keys.includes('a11y-unlabelled-touchables'));
  assert.ok(keys.includes('api-no-cache-headers'));
  assert.ok(keys.includes('deps-unused-runtime'));
  assert.ok(keys.includes('nav-recording-depth'));
  assert.ok(keys.some(k => k.startsWith('telemetry-')), 'clustered error fingerprint becomes a finding');
});

test('TITAN findings require the source-fetch env; missing sources are reported, not fabricated', async () => {
  // TITAN_SOURCES_URL is intentionally unset here: the audit must not invent source findings.
  const before = (await db.prepare('SELECT COUNT(*) AS n FROM intel_improvement_items').first()).n;
  const res = await call('/improve', 'POST', {}, { __token: await token() });
  assert.equal(res.status, 200);
  const body = await res.json();
  const sourceKeys = body.items.filter(i => i.evidenceKey !== undefined && !i.evidenceKey.startsWith('telemetry-'));
  assert.equal(sourceKeys.length, 0, 'no source findings without TITAN_SOURCES_URL');
  // The telemetry finding is re-detected and upserted (no new row, decision preserved):
  assert.equal((await db.prepare('SELECT COUNT(*) AS n FROM intel_improvement_items').first()).n, before);
});

test('improvement backlog lists items and a detail includes full evidence + plans', async () => {
  const list = await titanCall('/improvements');
  assert.equal(list.status, 200);
  const { items } = await list.json();
  assert.ok(items.length >= 5);
  const a11y = items.find(i => i.id === 'titan-a11y-unlabelled-touchables');
  assert.ok(a11y, 'a11y finding present');
  assert.equal(a11y.status, 'proposed');
  assert.equal(a11y.risk, 'low');
  const detail = await titanCall('/improvements/titan-a11y-unlabelled-touchables');
  assert.equal(detail.status, 200);
  const { item } = await detail.json();
  assert.ok(item.evidence.unlabelled >= 10, 'machine evidence attached');
  assert.ok(item.test_plan.length > 20 && item.rollback_plan.length > 10);
  assert.equal(item.evidence_type, 'static-analysis');
});

test('ranking-affecting improvements cannot be approved without explicit acknowledgment', async () => {
  await db.prepare(`INSERT INTO intel_improvement_items (id, evidence_key, title, area, problem, evidence_json, evidence_type, confidence, proposed_change, benefit, cost, risk, approval_flags_json, test_plan, rollback_plan, status, priority, created_at, updated_at)
    VALUES ('titan-manual-ranking','manual-ranking','Manual ranking change','ranking','x','{}','manual-review',0.9,'y','z','Low','high','["ranking-affecting"]','t','r','proposed',5,?,?)`).bind(new Date().toISOString(), new Date().toISOString()).run();
  const refuse = await titanCall('/improvements/titan-manual-ranking?action=decide', 'POST', { decision: 'approved', note: 'ship it' });
  assert.equal(refuse.status, 409);
  assert.equal((await refuse.json()).error, 'approval-acknowledgment-required');
  const accept = await titanCall('/improvements/titan-manual-ranking?action=decide', 'POST', { decision: 'approved', note: 'owner-approved standards change', acknowledged: ['ranking-affecting'] });
  assert.equal(accept.status, 200);
  assert.equal((await accept.json()).status, 'approved');
  // The decision is audited.
  const audit = (await db.prepare("SELECT action,outcome FROM intel_audit WHERE target='titan-manual-ranking'").all()).results;
  assert.ok(audit.some(a => a.action === 'improvement-decision' && a.outcome === 'approved'));
});

test('implementation + recheck loop: fix verified when the detector no longer fires', async () => {
  // Approve the low-risk a11y item and record a real implementation.
  const approve = await titanCall('/improvements/titan-a11y-unlabelled-touchables?action=decide', 'POST', { decision: 'approved', note: 'labels are additive and safe' });
  assert.equal(approve.status, 200);
  const tooEarly = await titanCall('/improvements/titan-nav-recording-depth?action=implement', 'POST', { note: 'not approved yet' });
  assert.equal(tooEarly.status, 409);
  const done = await titanCall('/improvements/titan-a11y-unlabelled-touchables?action=implement', 'POST', { note: 'accessibilityLabel added to all controls; mobile suite green' });
  assert.equal(done.status, 200);
  assert.ok((await done.json()).implementedAt);
  // Sources now contain labels: the recheck must verify the problem is gone.
  titanSourcesFixed = true;
  const recheck = await titanCall('/improvements/titan-a11y-unlabelled-touchables?action=recheck', 'POST', {});
  assert.equal(recheck.status, 200);
  const { recheck: result } = await recheck.json();
  assert.equal(result.passed, true);
  assert.equal(result.detected, false);
  // The nav item is approved but NOT fixed in sources: recheck reports a regression.
  await titanCall('/improvements/titan-nav-recording-depth?action=decide', 'POST', { decision: 'approved', note: 'direct log action approved' });
  const navRecheck = await titanCall('/improvements/titan-nav-recording-depth?action=recheck', 'POST', {});
  assert.equal(navRecheck.status, 200);
  const navResult = (await navRecheck.json()).recheck;
  assert.equal(navResult.passed, false);
  assert.equal(navResult.detected, true);
});

test('re-running the audit preserves human decisions (status and notes survive)', async () => {
  const before = await db.prepare('SELECT id,status,decision_note,decided_by FROM intel_improvement_items WHERE id=?').bind('titan-a11y-unlabelled-touchables').first();
  assert.equal(before.status, 'rechecked');
  await titanCall('/improve', 'POST', {});
  const after = await db.prepare('SELECT id,status,decision_note,decided_by FROM intel_improvement_items WHERE id=?').bind('titan-a11y-unlabelled-touchables').first();
  assert.equal(after.status, 'rechecked');
  assert.equal(after.decision_note, before.decision_note);
  assert.equal(after.decided_by, before.decided_by);
});

test('overview reports the TITAN agent with honest state and next action', async () => {
  const res = await titanCall('/overview');
  assert.equal(res.status, 200);
  const { agents } = await res.json();
  assert.ok(agents.titan, 'titan agent present in overview');
  assert.ok(['OPERATIONAL', 'STALE', 'FAILED', 'NOT CONFIGURED'].includes(agents.titan.status));
  assert.ok(agents.titan.nextAction && agents.titan.nextAction.length > 10);
  assert.ok(agents.titan.counts && typeof agents.titan.counts.proposed === 'number');
});

// ---------- $0-budget framework ----------
test('budget reports measured usage against documented free limits', async () => {
  const res = await titanCall('/budget');
  assert.equal(res.status, 200);
  const { budget } = await res.json();
  assert.ok(budget.limits.d1RowsWrittenPerDay === 100000);
  assert.ok(budget.limits.sources.length >= 3, 'limits cite their sources');
  assert.ok(budget.limits.verifiedAt, 'limits record their verification date');
  assert.equal(budget.usage.rowsWrittenToday.measured, true);
  assert.ok(budget.usage.rowsWrittenToday.value >= 0);
  assert.equal(budget.usage.rowsReadToday.measured, false, 'reads are labelled as estimates, never meter readings');
  assert.ok(['OK', 'WARN', 'CRITICAL'].includes(budget.status));
  assert.ok(budget.nextAction.length > 10);
  // Overview carries the budget summary too.
  const ov = await titanCall('/overview');
  const ovBody = await ov.json();
  assert.ok(ovBody.budget && ovBody.budget.status);
  assert.ok(ovBody.budget.costTriggers.length >= 1, 'cost triggers documented');
});

// ---------- production deployment tooling ----------
test('deploy script is fail-closed, credential-free, and idempotent; runbook documents the owner steps', () => {
  const deploy = readFileSync('scripts/deploy-intelligence.mjs', 'utf8');
  // never handles credentials — the owner authenticates via wrangler login (browser OAuth)
  assert.ok(!/CLOUDFLARE_API_TOKEN|cf_api|api[_-]?key\s*=/i.test(deploy), 'no credentials are read, stored, or prompted');
  assert.match(deploy, /never sees or stores credentials/, 'credentials policy stated in the header');
  // worker activation is an explicit, fail-closed decision
  assert.match(deploy, /--enable-worker/, 'worker activation requires an explicit flag');
  assert.match(deploy, /INTELLIGENCE_ENABLED = "\$\{enable \? 'true' : 'false'\}"/, 'master switch written explicitly per run');
  // migrations are gated on table presence (never blind re-application, never the waitlist DB)
  assert.match(deploy, /table: 'intel_operators'/, 'migrations gated on schema presence');
  assert.match(deploy, /never the waitlist\/app databases/, 'dedicated intelligence DB only');
  // post-deploy verification must abort on an open API
  assert.match(deploy, /SECURITY: the intelligence API answered/, 'a 200 without authentication is a hard failure');
  // unauthorized Access users get an actionable 403 with only their own subject
  const auth = readFileSync('server/intelligence/auth.js', 'utf8');
  assert.match(auth, /--grant-operator/, 'refusal tells the caller the exact grant command');
  assert.match(auth, /reveal only the caller's own authenticated subject/, 'hint documented as own-subject only');
  const api = readFileSync('server/intelligence/api.js', 'utf8');
  assert.match(api, /e\.hint/, 'hint serialized in error bodies when present');
  // runbook: owner steps, rollback, $0 budget, no secrets through chat
  const runbook = readFileSync('docs/DEPLOYMENT-RUNBOOK.md', 'utf8');
  assert.match(runbook, /wrangler login/, 'login step documented');
  assert.match(runbook, /Cloudflare Access/, 'Access setup documented');
  assert.match(runbook, /--grant-operator/, 'operator grant documented');
  assert.match(runbook, /through chat/, 'secrets policy documented');
  assert.match(runbook, /## 6\. Rollback/, 'rollback documented');
  const pkg = JSON.parse(readFileSync('package.json', 'utf8'));
  assert.match(pkg.scripts['deploy:intelligence'], /deploy-intelligence\.mjs/, 'npm script wired');
  // the deploy flow is hermetically testable against a simulated wrangler
  assert.match(deploy, /MW_WRANGLER/, 'wrangler override exists for hermetic tests');
  const harness = readFileSync('tests/deploy-script.harness.mjs', 'utf8');
  assert.match(harness, /SECURITY: an unauthenticated 200/, 'the security-abort scenario is covered');
  assert.match(harness, /connected to git/, 'the git-rejection scenario is covered');
  assert.match(harness, /NOT spawnSync/, 'harness documents why it must not block its origin server');
  assert.ok(existsSync('tests/deploy-fake-wrangler.mjs'), 'simulated wrangler exists');
  assert.match(pkg.scripts['test:deploy'], /deploy-script\.harness\.mjs/, 'deploy test script wired');
  // zero-local-machine path: GitHub Actions deploys from repo config, token only via secrets
  const wf = readFileSync('.github/workflows/deploy-intelligence.yml', 'utf8');
  assert.match(wf, /CLOUDFLARE_API_TOKEN: \$\{\{ secrets\.CLOUDFLARE_API_TOKEN \}\}/, 'token sourced only from GitHub secrets');
  assert.match(wf, /contains\(github\.event\.head_commit\.message, '\[deploy\]'\)/, 'push deploys need an explicit [deploy] commit marker — never a surprise deploy');
  assert.match(wf, /workflow_dispatch/, 'manual dispatch trigger supported');
  assert.ok(!/token['"]?\s*[:=]\s*['"][A-Za-z0-9_-]{10,}/i.test(wf), 'no token VALUES in the workflow file');
  const cfg = JSON.parse(readFileSync('deploy.config.json', 'utf8'));
  assert.equal(typeof cfg.project_name, 'string', 'config names the direct-upload project');
  assert.equal(cfg.access_issuer, null, 'no secrets in deploy.config.json (issuer)');
  assert.match(deploy, /deploy\.config\.json/, 'script reads config defaults');
});

// ---------- AU ROOM (3D operations floor) ----------
test('AU ROOM module exists, is CSP-safe, wired into the app, and visualizes only real data', () => {
  const room = readFileSync('public/intelligence/room.js', 'utf8');
  // CSP-safe: no innerHTML/insertAdjacentHTML/document.write anywhere
  assert.ok(!/innerHTML|insertAdjacentHTML|document\.write|outerHTML/.test(room), 'room.js builds DOM via el()/CSSOM only');
  // mounts through the app integration point and can be unmounted (no leaked loops)
  assert.match(room, /window\.MWRoom\s*=\s*\{/, 'exposes MWRoom');
  assert.match(room, /unmount\(\)\s*\{/, 'exposes unmount');
  assert.match(room, /cancelAnimationFrame|destroy\(\)/, 'cancels its render loop');
  // every screen value is derived from the real API — the module must not fabricate data
  assert.match(room, /\/api\/intelligence\/overview/, 'reads the real overview');
  assert.match(room, /\/api\/intelligence\/timeline/, 'reads the real timeline');
  assert.match(room, /\/api\/intelligence\/incidents/, 'reads real incidents');
  assert.match(room, /\/api\/intelligence\/improvements/, 'reads real TITAN findings');
  assert.match(room, /nothing is simulated|nothing is being simulated/i, 'labels the visualization honestly');
  assert.match(room, /AWAITING/, 'idle agents render as awaiting, never fake-busy');
  // product brief: owner labelled as human, reality-mode taxonomy, honest not-connected markers
  assert.match(room, /VITAFLEX \(SONY\)/, 'operator station labelled Vitaflex (Sony)');
  assert.match(room, /never portrayed as an AI agent/, 'owner never portrayed as an AI agent');
  assert.match(room, /modeLabel/, 'derives the LIVE/IDLE/NOT CONNECTED/FAILED mode from real state');
  assert.match(room, /traffic analytics: NOT CONNECTED/, 'ULTRON does not imply connected traffic analytics');
  assert.match(room, /proposals only until owner approval/, 'TITAN marked proposals-only');
  assert.match(room, /\/api\/intelligence\/briefings/, 'owner console reads the real briefings endpoint');
  const css = readFileSync('public/intelligence/room.css', 'utf8');
  // living portal: typed lifecycle phases drive avatar movement (concept image = visual spec)
  assert.match(room, /PHASE_VERB/, 'lifecycle phase vocabulary defined');
  for (const phase of ['task-assigned', 'investigating', 'evidence-found', 'reporting', 'task-completed', 'presenting-briefing', 'task-failed'])
    assert.ok(room.includes("'" + phase + "'"), 'lifecycle phase ' + phase + ' exists');
  assert.match(room, /function startTask\(/, 'lifecycle machine: startTask');
  assert.match(room, /function enterStep\(/, 'lifecycle machine: enterStep');
  assert.match(room, /function endTask\(/, 'lifecycle machine: endTask');
  assert.match(room, /patrolIdx/, 'AU idle patrol is a deterministic station rotation, not random activity');
  const rndLines = room.split('\n').filter(l => /Math\.random/.test(l));
  assert.ok(rndLines.length > 0 && rndLines.every(l => /phase:|patrolAt|particles\.push|stars\.push|tw:|v:|p:/.test(l)), 'Math.random confined to cosmetic seeds (particles, stars, walk-cycle offsets)');
  // interactive surfaces open the REAL application views
  assert.match(room, /VIEW_ROUTES/, 'screens wired to real application views');
  assert.match(room, /makeInteractive/, 'screens are clickable');
  assert.ok(room.includes('#/analysis') && room.includes('#/agents') && room.includes('#/briefings') && room.includes('#/titan') && room.includes('#/overview') && room.includes('#/incidents'), 'screen routes cover analysis/agents/briefings/titan/overview/incidents');
  // simulation mode: watermarked, labeled, and isolated from production records
  assert.match(room, /SIMULATION \/ DEMO/, 'demo pill reads SIMULATION / DEMO');
  assert.match(room, /never call the API \(zero mutations\)/, 'demo documented as zero-mutation');
  assert.match(room, /SYNTHETIC EVENTS · NOT PRODUCTION DATA/, 'watermark text unmistakable');
  assert.ok(room.includes('DEMO · '), 'demo artifacts are DEMO-prefixed');
  assert.match(room, /isDemo: true/, 'demo tasks flagged isDemo');
  assert.match(room, /state\(\) \{ return instance \? instance\.state\(\) : null; \}/, 'MWRoom.state() inspection hook');
  assert.match(css, /room-watermark/, 'watermark styled');
  assert.match(css, /room-demo-badge/, 'demo badge styled');
  assert.match(css, /\.clickable/, 'clickable surfaces styled');
  // honesty caption is permanent in the UI
  assert.ok(css.length > 1000, 'room styles exist');
  const html = readFileSync('public/intelligence/index.html', 'utf8');
  assert.match(html, /intelligence\/room\.js/, 'index.html loads room.js');
  assert.match(html, /data-nav="room"/, 'navigation entry exists');
  const app = readFileSync('public/intelligence/intelligence.js', 'utf8');
  assert.match(app, /room:\s*renderRoom/, 'router wires the room view');
  assert.match(app, /MWRoom\.unmount\(\)/, 'router unmounts the room on navigation');
});
