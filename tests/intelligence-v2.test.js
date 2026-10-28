import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { handleIntelligence } from '../server/intelligence/api.js';
import { hashClientBucket } from '../server/intelligence/auth.js';
import { validatePulseEvent } from '../server/intelligence/telemetry.js';
import {
  analyzeArgonTelemetry, analyzeUltronSignals, correlateAu,
  purgeExpiredRateLimits, upsertIncidentFailure, incrementRollup
} from '../server/intelligence/core.js';

let dir, db, env, keys, jwk;
function sqlite(data) {
  const out = JSON.parse(execFileSync('python3', ['tests/fixtures/d1_sqlite.py'], { input: JSON.stringify({ path: join(dir, 'intel-v2.sqlite'), ...data }), encoding: 'utf8' }));
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
async function token(sub = 'chief@monte.test') {
  const head = b64(JSON.stringify({ alg: 'RS256', kid: 'test-key' }));
  const body = b64(JSON.stringify({ iss: env.INTELLIGENCE_ACCESS_ISSUER, aud: [env.INTELLIGENCE_ACCESS_AUD], sub, iat: Math.floor(Date.now() / 1000), exp: Math.floor(Date.now() / 1000) + 600 }));
  return head + '.' + body + '.' + b64(await crypto.subtle.sign('RSASSA-PKCS1-v1_5', keys.privateKey, new TextEncoder().encode(head + '.' + body)));
}
const fetcher = async () => new Response(JSON.stringify({ keys: [jwk] }), { headers: { 'Content-Type': 'application/json' } });
async function call(route, method = 'GET', data = null, extra = {}) {
  const init = { method, headers: { ...extra } };
  if (data !== null) { init.body = JSON.stringify(data); init.headers['Content-Type'] = 'application/json'; }
  if (extra.__token) { init.headers['Cf-Access-Jwt-Assertion'] = extra.__token; delete init.headers.__token; }
  return handleIntelligence({ request: new Request('https://monte.test/api/intelligence' + route, init), env }, { fetcher });
}

before(async () => {
  dir = mkdtempSync(join(tmpdir(), 'monte-intel-v2-'));
  sqlite({
    script: readFileSync('migrations/0003_intelligence.sql', 'utf8')
      + readFileSync('migrations/0004_intelligence_ops.sql', 'utf8')
      + readFileSync('migrations/0005_intelligence_titan.sql', 'utf8')
      + readFileSync('migrations/0006_intelligence_v2.sql', 'utf8')
  });
  db = { prepare: s => new Statement(s), batch: async statements => sqlite({ statements }) };
  keys = await crypto.subtle.generateKey({ name: 'RSASSA-PKCS1-v1_5', modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256' }, true, ['sign', 'verify']);
  jwk = { ...await crypto.subtle.exportKey('jwk', keys.publicKey), kid: 'test-key', alg: 'RS256' };
  env = {
    INTEL_DB: db,
    INTELLIGENCE_ACCESS_ISSUER: 'https://monte-team.cloudflareaccess.com',
    INTELLIGENCE_ACCESS_AUD: 'intel-audience',
    INTELLIGENCE_INGEST_KEY: 'ingest-v2-key',
    SITE_URL: 'https://monte.test'
  };
  await db.prepare('INSERT INTO intel_operators (subject, role, active) VALUES (?, ?, 1), (?, ?, 1)')
    .bind('chief@monte.test', 'admin', 'auditor@monte.test', 'viewer').run();
});
after(() => rmSync(dir, { recursive: true, force: true }));

test('v2 migration 0006 registers intel_incident_notes, 4th disabled rule, and web telemetry platform', async () => {
  const stRes = await call('/status');
  assert.equal(stRes.status, 200);
  const st = await stRes.json();
  assert.equal(st.components.d1_database.migrations, '0003 + 0004 + 0005 + 0006 applied');
  const rules = (await db.prepare('SELECT id, enabled FROM intel_automation_rules ORDER BY id').all()).results;
  assert.equal(rules.length, 4);
  assert.ok(rules.some(r => r.id === 'quarantine-anomalous-ingest-burst' && r.enabled === 0));
});

test('purgeExpiredRateLimits deletes expired millisecond buckets without touching active ones', async () => {
  const staleMs = Date.now() - 2 * 86400000;
  const freshMs = Math.floor(Date.now() / 60000) * 60000;
  await db.prepare('INSERT INTO intel_rate_limits (key, window_start, attempts) VALUES (?, ?, 5), (?, ?, 2)')
    .bind('stale-bucket', staleMs, 'fresh-bucket', freshMs).run();
  await purgeExpiredRateLimits(db);
  assert.equal(await db.prepare('SELECT attempts FROM intel_rate_limits WHERE key=?').bind('stale-bucket').first(), null);
  assert.equal((await db.prepare('SELECT attempts FROM intel_rate_limits WHERE key=?').bind('fresh-bucket').first()).attempts, 2);
});

test('monotonic incident escalation prevents severity downgrade and duplicate urgent alert storms', async () => {
  const fp = 'ultron-unavailable-test-monotonic';
  for (let i = 0; i < 6; i++) {
    await upsertIncidentFailure(db, env, {
      fingerprint: fp, agent: 'ULTRON', severity: 'high', auto_resolve: true,
      title: 'Test API outage', summary: 'Simulated 502 streak', confidence: 0.95,
      evidence: { target: 'test', classification: 'fact' }
    });
  }
  const inc = await db.prepare('SELECT severity, streak_fail FROM intel_incidents WHERE fingerprint=?').bind(fp).first();
  assert.equal(inc.severity, 'critical', 'escalated critical severity must never be overwritten back to high');
  assert.equal(inc.streak_fail, 6);
  const urgents = (await db.prepare(`SELECT id FROM intel_briefings WHERE kind='urgent' AND title LIKE '%Test API outage%'`).all()).results;
  assert.equal(urgents.length, 1, 'urgent briefing must fire once on critical transition, never storm on every subsequent check');
});

test('hashClientBucket hashes client IP with daily salt and never exposes raw IP', async () => {
  const reqA = new Request('https://monte.test/api/intelligence/events', { headers: { 'CF-Connecting-IP': '203.0.113.42' } });
  const reqB = new Request('https://monte.test/api/intelligence/events', { headers: { 'CF-Connecting-IP': '198.51.100.7' } });
  const bucketA1 = await hashClientBucket(reqA, env, 'ingest');
  const bucketA2 = await hashClientBucket(reqA, env, 'ingest');
  const bucketB = await hashClientBucket(reqB, env, 'ingest');
  assert.equal(bucketA1, bucketA2);
  assert.notEqual(bucketA1, bucketB);
  assert.ok(!bucketA1.includes('203.0.113.42'), 'raw IP never appears in bucket key');
});

test('cookie-free ULTRON pulse honors Sec-GPC/DNT, blocks cross-origin & PII, and aggregates funnel metrics', async () => {
  assert.throws(() => validatePulseEvent({ metric: 'pageviews', dimension: '/', email: 'leak@test.com' }), /unexpected-field:email/);
  const cross = await call('/pulse', 'POST', { metric: 'pageviews', dimension: '/' }, { Origin: 'https://evil.example' });
  assert.equal(cross.status, 403);

  const gpc = await call('/pulse', 'POST', { metric: 'pageviews', dimension: '/' }, { Origin: 'https://monte.test', 'Sec-GPC': '1' });
  assert.equal(gpc.status, 202);
  assert.equal((await gpc.json()).skipped, 'privacy-signal-honored');

  const dnt = await call('/pulse', 'POST', { metric: 'pageviews', dimension: '/' }, { Origin: 'https://monte.test', DNT: '1' });
  assert.equal((await dnt.json()).accepted, false);

  for (const p of [
    { metric: 'pageviews', dimension: '/' },
    { metric: 'pageviews', dimension: '/waitlist/' },
    { metric: 'apk_download', dimension: 'android-apk' },
    { metric: 'waitlist_focus', dimension: '/waitlist/' },
    { metric: 'waitlist_submit_ok', dimension: '/waitlist/' }
  ]) {
    const ok = await call('/pulse', 'POST', p, { Origin: 'https://monte.test' });
    assert.equal(ok.status, 202);
    assert.equal((await ok.json()).recorded, true);
  }

  const unauthAnalytics = await call('/analytics');
  assert.equal(unauthAnalytics.status, 401, 'analytics endpoint is protected server-side');

  const adm = await token('chief@monte.test');
  const analyticsRes = await call('/analytics?days=7', 'GET', null, { __token: adm });
  assert.equal(analyticsRes.status, 200);
  const analytics = await analyticsRes.json();
  assert.equal(analytics.summary.status, 'ok');
  assert.equal(analytics.summary.pageviews7d, 2);
  assert.equal(analytics.summary.apkDownloads7d, 1);
  assert.equal(analytics.summary.waitlistCompletionRate, 1);
});

test('ULTRON funnel friction & security spike detectors + ARGON web/perf/burst + rule-gated quarantine + AU contamination correlation', async () => {
  await incrementRollup(db, 'waitlist_focus', 'all', 'ultron-pulse', 15);
  await incrementRollup(db, 'waitlist_submit_err', 'all', 'ultron-pulse', 5);
  await incrementRollup(db, 'security_blocked', 'ingest-bad-key', 'argon-intake', 30);

  const uSig = await analyzeUltronSignals(db, env);
  assert.ok(uSig.raised.includes('ultron-conversion-friction-waitlist'));
  assert.ok(uSig.raised.includes('ultron-suspicious-traffic-spike'));

  const batch = [
    { type: 'session_start', appVersion: '2.0.0', platform: 'web', sessionRef: 'sess-normal-1' },
    { type: 'session_start', appVersion: '2.0.0', platform: 'android', sessionRef: 'sess-normal-2' }
  ];
  for (let i = 0; i < 6; i++) {
    batch.push({ type: 'slow_interaction', appVersion: '2.0.0', platform: 'web', screen: '/WorkoutCockpit', durationMs: 2600 + i * 50, sessionRef: 'sess-normal-1' });
  }
  for (let i = 0; i < 25; i++) {
    batch.push({ type: 'http_error', appVersion: '2.0.0', platform: 'android', fingerprint: 'GET-/api/mobile/v1/workouts-500', route: '/api/mobile/v1/workouts', statusCode: 500, sessionRef: 'sess-loop-99' });
  }
  const ing = await call('/events', 'POST', { events: batch }, { 'X-MW-Key': env.INTELLIGENCE_INGEST_KEY, 'CF-Connecting-IP': '192.0.2.55', Origin: 'https://monte.test' });
  assert.equal(ing.status, 201);
  assert.equal((await ing.json()).accepted, batch.length);

  // While quarantine rule is disabled, ARGON raises findings without activating quarantine
  const a1 = await analyzeArgonTelemetry(db, env);
  assert.ok(a1.raised.some(fp => fp.startsWith('argon-perf-degradation-2.0.0')));
  assert.ok(a1.raised.includes('argon-unusual-pattern-2.0.0'));
  assert.equal((await db.prepare(`SELECT value FROM intel_settings WHERE key='ingest_quarantine_until'`).first())?.value || '', '');

  // Approve reversible rule quarantine-anomalous-ingest-burst -> re-run -> verify 15m quarantine & revoke rollback
  const adm = await token('chief@monte.test');
  const appRes = await call('/automation/quarantine-anomalous-ingest-burst/approve', 'POST',
    { confirm: 'quarantine-anomalous-ingest-burst' }, { __token: adm, Origin: 'https://monte.test' });
  assert.equal(appRes.status, 200);

  await analyzeArgonTelemetry(db, env);
  const ovRes = await call('/overview', 'GET', null, { __token: adm });
  const ov = await ovRes.json();
  assert.ok(ov.config.quarantineActiveUntil, 'quarantine window active after explicit rule approval');
  assert.ok(ov.agents.argon.p95InteractionMs >= 2600);
  assert.ok(ov.agents.argon.byPlatform.web >= 7);
  assert.ok(Array.isArray(ov.decisionQueue) && ov.decisionQueue.length > 0);

  // AU correlates suspicious traffic spike + unusual pattern into synthetic-traffic-contamination
  const corr = await correlateAu(db, env);
  assert.ok(corr.groups.includes('au-ultron-suspicious-traffic-spike+argon-unusual-pattern-2.0.0'));

  // Revoke rule immediately rolls back active quarantine
  const revRes = await call('/automation/quarantine-anomalous-ingest-burst/revoke', 'POST', {}, { __token: adm, Origin: 'https://monte.test' });
  assert.equal(revRes.status, 200);
  const qAfter = await db.prepare(`SELECT value FROM intel_settings WHERE key='ingest_quarantine_until'`).first();
  assert.equal(qAfter.value, '');
});

test('incident workspace exposes AU epistemic breakdown and enforces RBAC on persistent investigation ledger', async () => {
  const adm = await token('chief@monte.test');
  const viewer = await token('auditor@monte.test');
  const list = await (await call('/incidents?status=open&limit=5', 'GET', null, { __token: adm })).json();
  assert.ok(list.incidents.length > 0);
  const targetId = list.incidents[0].id;

  const denied = await call(`/incidents/${targetId}/notes`, 'POST', { entryType: 'hypothesis', body: 'Viewer cannot write notes' }, { __token: viewer, Origin: 'https://monte.test' });
  assert.equal(denied.status, 403);

  const created = await call(`/incidents/${targetId}/notes`, 'POST',
    { entryType: 'hypothesis', body: 'Correlated burst originates from replay script; checking Cloudflare WAF logs.', confidence: 0.72 },
    { __token: adm, Origin: 'https://monte.test' });
  assert.equal(created.status, 201);

  const detail = await (await call(`/incidents/${targetId}`, 'GET', null, { __token: adm })).json();
  assert.ok(detail.epistemics);
  assert.ok(Array.isArray(detail.epistemics.confirmedFacts));
  assert.ok(Array.isArray(detail.epistemics.hypotheses));
  assert.ok(Array.isArray(detail.epistemics.challenges));
  assert.equal(detail.notes.length, 1);
  assert.equal(detail.notes[0].entry_type, 'hypothesis');
  assert.equal(detail.notes[0].author, 'chief@monte.test');
});
