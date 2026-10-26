// /api/intelligence/* — every route is authenticated and authorized server-side.
// Identity: Cloudflare Access JWT (verified in auth.js). Authorization: intel_operators.
// The only unauthenticated route is POST /events (telemetry intake), which is gated by a
// rotating ingest key, strict validation, rate limits and a daily volume cap.
import { IntelError, requireThat } from './errors.js';
import { authenticateOperator, requireAdmin, intelligenceConfigured, localOperatorAllowed } from './auth.js';
import { validateTelemetryBatch } from './telemetry.js';
import {
  runUltronChecks, rateLimit, logAudit, computeHealth, parseTargets, recordAgentRun, ingestTelemetry,
  siteUrlAllowed, analyzeArgonTelemetry, correlateAu, buildDailyBriefing, buildWeeklyBriefing
} from './core.js';
import { runTitanAudit, titanOverview } from './titan.js';
import { budgetStatus } from './budget.js';

const MAX_BODY = 65536;
const json = (data, status = 200) => new Response(JSON.stringify(data), {
  status, headers: {
    'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'private, no-store',
    'X-Content-Type-Options': 'nosniff', 'Vary': 'Cf-Access-Jwt-Assertion, Authorization'
  }
});
const uid = () => crypto.randomUUID();
const safeEqual = (a, b) => {
  const ea = new TextEncoder().encode(String(a)), eb = new TextEncoder().encode(String(b));
  if (ea.length !== eb.length) return false;
  let diff = 0; for (let i = 0; i < ea.length; i++) diff |= ea[i] ^ eb[i];
  return diff === 0;
};
async function readJson(request, limit = MAX_BODY) {
  requireThat((request.headers.get('Content-Type') || '').split(';')[0] === 'application/json', 'json-required', 415);
  requireThat(Number(request.headers.get('Content-Length') || 0) <= limit, 'body-too-large', 413);
  const reader = request.body?.getReader();
  requireThat(reader, 'empty-body', 400);
  const chunks = []; let total = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.length;
    if (total > limit) { await reader.cancel(); throw new IntelError('body-too-large', 413); }
    chunks.push(value);
  }
  const bytes = new Uint8Array(total); let offset = 0;
  for (const c of chunks) { bytes.set(c, offset); offset += c.length; }
  try { return JSON.parse(new TextDecoder().decode(bytes)); } catch { throw new IntelError('invalid-json', 400); }
}
function limitOf(url, fallback, max) {
  const n = Number(url.searchParams.get('limit'));
  return Number.isInteger(n) && n > 0 ? Math.min(n, max) : fallback;
}
function sameOrigin(request, url) {
  const origin = request.headers.get('Origin');
  return !origin || origin === url.origin; // native/CLI clients send no Origin
}
const parseEvidence = row => row ? { ...row, evidence: JSON.parse(row.evidence_json) } : null;

// ---------- route handlers ----------
// Public, read-only component status. No authentication: it exposes configuration state,
// liveness evidence and aggregate counts ONLY — never intelligence content, operator
// identities or secrets. This is what the locked dashboard screen renders so a visitor
// can see WHICH piece is missing instead of guessing the backend is absent.
async function publicStatus(env, fetcher = fetch) {
  const out = {
    service: 'monte-wo-intelligence',
    generated_at: new Date().toISOString(),
    fail_closed: true,
    note: 'Every /api/intelligence route except this one (and the key-gated POST /events) requires an authenticated Cloudflare Access operator.',
    components: {
      d1_database: null,
      cloudflare_access: null,
      scheduled_worker: { expected: true, detail: 'evidence: monitoring.ultron_last_check — written by the ULTRON cron every 5 minutes' }
    },
    monitoring: null,
    data_counts: null
  };
  const configured = intelligenceConfigured(env);
  out.components.cloudflare_access = configured
    ? { configured: true, detail: 'login active; dashboards authorize via cryptographically verified Access JWT' }
    : { configured: false, action_required: 'owner', detail: 'INTELLIGENCE_ACCESS_ISSUER / INTELLIGENCE_ACCESS_AUD are not set. Every intelligence route fails closed (503): data exists but is not served until the owner creates the Cloudflare Access application and redeploys with its issuer + AUD.' };
  if (configured) {
    // Can this deployment reach the Access identity provider to fetch signing keys?
    // (This is the exact fetch verifyAccessJwt performs; surfacing it here makes the
    // auth chain observable from outside. No secrets — status and error class only.)
    try {
      const t0 = Date.now();
      const res = await fetcher(env.INTELLIGENCE_ACCESS_ISSUER + '/cdn-cgi/access/certs', { signal: AbortSignal.timeout(5000), redirect: 'error' });
      out.components.cloudflare_access.idp_reachability = { ok: res.ok, status: res.status, ms: Date.now() - t0 };
    } catch (e) {
      out.components.cloudflare_access.idp_reachability = { ok: false, error: e && e.name ? e.name : 'fetch-failed' };
    }
  }
  const db = env.INTEL_DB;
  if (!db) {
    out.components.d1_database = { bound: false, detail: 'INTEL_DB binding missing — no other component can be verified' };
    return json(out, 200);
  }
  out.components.d1_database = { bound: true };
  try {
    const tables = ((await db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name LIKE 'intel_%'").all()).results || []).map(r => r.name).sort();
    const need = ['intel_checks', 'intel_incidents', 'intel_briefings', 'intel_agent_runs', 'intel_operators', 'intel_telemetry_events', 'intel_improvement_items'];
    out.components.d1_database.tables = tables;
    out.components.d1_database.migrations = need.every(t => tables.includes(t)) ? '0003 + 0004 + 0005 applied' : 'partial — missing: ' + need.filter(t => !tables.includes(t)).join(', ');
  } catch {
    out.components.d1_database.detail = 'database unreachable';
  }
  try {
    const last = await db.prepare("SELECT status, target, latency_ms, http_status, checked_at FROM intel_checks WHERE agent='ULTRON' ORDER BY checked_at DESC LIMIT 1").first();
    const total = (await db.prepare("SELECT COUNT(*) AS n FROM intel_checks WHERE agent='ULTRON'").first())?.n ?? null;
    const runs = (await db.prepare('SELECT agent, run_type, status, started_at FROM intel_agent_runs ORDER BY started_at DESC LIMIT 6').all()).results || [];
    out.monitoring = {
      ultron_last_check: last || null,
      ultron_total_checks: total,
      recent_agent_runs: runs,
      interpretation: last ? 'The scheduled worker is live and writing to the production D1 database.' : 'No ULTRON checks recorded yet — the cron may not have fired since deployment.'
    };
  } catch {
    out.monitoring = { error: 'intel_checks unavailable' };
  }
  try {
    const count = async t => (await db.prepare('SELECT COUNT(*) AS n FROM ' + t).first())?.n ?? null;
    out.data_counts = {
      intel_checks: await count('intel_checks'),
      intel_incidents: await count('intel_incidents'),
      intel_briefings: await count('intel_briefings'),
      intel_agent_runs: await count('intel_agent_runs'),
      intel_telemetry_events: await count('intel_telemetry_events')
    };
  } catch {
    out.data_counts = { error: 'unavailable' };
  }
  return new Response(JSON.stringify(out), { status: 200, headers: {
    'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'public, max-age=30',
    'X-Content-Type-Options': 'nosniff'
  } });
}

async function overview(db, env) {
  const now = Date.now(), dayAgo = new Date(now - 86400000).toISOString(), twoDaysAgo = new Date(now - 2 * 86400000).toISOString();
  const checks24 = (await db.prepare(`SELECT target,status,latency_ms,checked_at FROM intel_checks WHERE checked_at>=? AND status<>'not_configured' ORDER BY checked_at DESC`).bind(dayAgo).all()).results || [];
  const openIncidents = (await db.prepare(`SELECT id,fingerprint,agent,severity,title,summary,confidence,status,first_seen,last_seen,occurrence_count,correlation_group FROM intel_incidents WHERE status='open' ORDER BY CASE severity WHEN 'critical' THEN 5 WHEN 'high' THEN 4 WHEN 'medium' THEN 3 WHEN 'low' THEN 2 ELSE 1 END DESC, last_seen DESC LIMIT 100`).all()).results || [];
  const lastRuns = {};
  for (const agent of ['ARGON', 'ULTRON', 'AU', 'TITAN']) {
    lastRuns[agent] = (await db.prepare('SELECT agent,run_type,status,summary,started_at,finished_at FROM intel_agent_runs WHERE agent=? ORDER BY started_at DESC LIMIT 1').bind(agent).first());
    lastRuns[agent + ':ok'] = (await db.prepare("SELECT started_at FROM intel_agent_runs WHERE agent=? AND status='ok' ORDER BY started_at DESC LIMIT 1").bind(agent).first());
  }
  const lastCheck = (await db.prepare(`SELECT checked_at FROM intel_checks WHERE agent='ULTRON' AND status<>'not_configured' ORDER BY checked_at DESC LIMIT 1`).first())?.checked_at || null;
  const telemetry24 = (await db.prepare(`SELECT event_type, COUNT(*) AS n FROM intel_telemetry_events WHERE occurred_at>=? GROUP BY event_type`).bind(dayAgo).all()).results || [];
  const topErrors = (await db.prepare(`SELECT fingerprint, event_type, COUNT(*) AS n FROM intel_telemetry_events WHERE occurred_at>=? AND fingerprint<>'' GROUP BY fingerprint, event_type ORDER BY n DESC LIMIT 5`).bind(dayAgo).all()).results || [];
  const latestDaily = (await db.prepare(`SELECT id,title,created_at,delivery_status FROM intel_briefings WHERE kind='daily' ORDER BY created_at DESC LIMIT 1`).first());
  const latestWeekly = (await db.prepare(`SELECT id,title,created_at,delivery_status FROM intel_briefings WHERE kind='weekly' ORDER BY created_at DESC LIMIT 1`).first());
  const openUrgent = (await db.prepare(`SELECT COUNT(*) AS n FROM intel_briefings WHERE kind='urgent' AND created_at>=?`).bind(twoDaysAgo).first()).n;
  const latestUrgent = (await db.prepare(`SELECT id,title,body,created_at,delivery_status FROM intel_briefings WHERE kind='urgent' ORDER BY created_at DESC LIMIT 1`).first());
  // per-target stats
  const byTarget = new Map();
  for (const c of checks24) {
    if (!byTarget.has(c.target)) byTarget.set(c.target, { target: c.target, total: 0, ok: 0, latencies: [], lastStatus: null, lastCheckedAt: null });
    const t = byTarget.get(c.target);
    t.total++; if (c.status === 'ok') t.ok++;
    if (typeof c.latency_ms === 'number') t.latencies.push(c.latency_ms);
    if (!t.lastCheckedAt) { t.lastStatus = c.status; t.lastCheckedAt = c.checked_at; }
  }
  const targets = [...byTarget.values()].map(t => ({
    target: t.target, lastStatus: t.lastStatus, lastCheckedAt: t.lastCheckedAt,
    uptime24h: t.total ? t.ok / t.total : null, avgLatencyMs: t.latencies.length ? Math.round(t.latencies.reduce((a, b) => a + b, 0) / t.latencies.length) : null
  }));
  const health = computeHealth(checks24, openIncidents);
  const siteUrlConfigured = siteUrlAllowed(env);
  const minutesSince = iso => iso ? Math.round((now - Date.parse(iso)) / 60000) : null;
  const ultronAge = minutesSince(lastCheck);
  const argonRunAge = minutesSince(lastRuns.ARGON?.started_at);
  const telemetrySessions = telemetry24.find(t => t.event_type === 'session_start')?.n || 0;
  const telemetryErrors = telemetry24.filter(t => ['app_crash', 'js_error', 'http_error'].includes(t.event_type)).reduce((n, t) => n + t.n, 0);
  // FAILED surfaces when the most recent scheduled/manual run threw; nextAction states exactly
  // what an operator (or the deployment) must do next. Never guess health when a run failed.
  const runFailed = agent => lastRuns[agent] && lastRuns[agent].status === 'failed';
  const agents = {
    ultron: {
      status: runFailed('ULTRON') ? 'FAILED' : !siteUrlConfigured ? 'NOT CONFIGURED' : ultronAge === null ? 'AWAITING FIRST CHECK' : ultronAge <= 15 ? 'OPERATIONAL' : ultronAge <= 60 ? 'STALE' : 'OFFLINE',
      detail: runFailed('ULTRON') ? 'The last ULTRON run failed: ' + (lastRuns.ULTRON.summary || 'unknown error') : !siteUrlConfigured ? 'SITE_URL is not configured, so no website checks can run.' : ultronAge === null ? 'No check has been recorded yet; the scheduled Worker has not run.' : 'Last check ' + ultronAge + ' minutes ago.',
      lastRun: lastRuns.ULTRON || null, lastSuccess: lastRuns['ULTRON:ok'] || null,
      nextAction: runFailed('ULTRON') ? 'Inspect the Worker logs and D1 access, then run a manual verification.' : !siteUrlConfigured ? 'Configure SITE_URL on the scheduled Worker.' : ultronAge === null ? 'Deploy the scheduled Worker with INTELLIGENCE_ENABLED=true.' : null,
      targets
    },
    argon: {
      status: runFailed('ARGON') ? 'FAILED' : !env.INTELLIGENCE_INGEST_KEY ? 'NOT CONFIGURED' : (telemetry24.length === 0 ? 'AWAITING DATA' : (argonRunAge !== null && argonRunAge <= 1560 ? 'OPERATIONAL' : 'INTAKE ONLY')),
      detail: runFailed('ARGON') ? 'The last ARGON analysis failed: ' + (lastRuns.ARGON.summary || 'unknown error') : !env.INTELLIGENCE_INGEST_KEY ? 'INTELLIGENCE_INGEST_KEY is not set; the mobile app cannot submit telemetry.' : telemetry24.length === 0 ? 'Ingest is configured but no telemetry has been received in 24h.' : 'Telemetry received; analysis runs hourly in the scheduled Worker.',
      lastRun: lastRuns.ARGON || null, lastSuccess: lastRuns['ARGON:ok'] || null,
      nextAction: runFailed('ARGON') ? 'Inspect the Worker logs, then rerun analysis.' : !env.INTELLIGENCE_INGEST_KEY ? 'Set INTELLIGENCE_INGEST_KEY to enable app telemetry intake.' : telemetry24.length === 0 ? 'Integrate the consent-gated telemetry client in the app.' : null,
      telemetry24h: { sessions: telemetrySessions, errors: telemetryErrors }, topErrors
    },
    au: {
      status: runFailed('AU') ? 'FAILED' : lastRuns.AU ? (minutesSince(lastRuns.AU.started_at) <= 1560 ? 'OPERATIONAL' : 'STALE') : 'NOT SCHEDULED',
      detail: runFailed('AU') ? 'The last AU job failed: ' + (lastRuns.AU.summary || 'unknown error') : lastRuns.AU ? 'Correlation and briefing jobs are running on schedule.' : 'The scheduled Worker has not run any AU job yet.',
      lastRun: lastRuns.AU || null, lastSuccess: lastRuns['AU:ok'] || null,
      nextAction: runFailed('AU') ? 'Inspect the Worker logs and D1 access.' : !lastRuns.AU ? 'Deploy the scheduled Worker so correlation and briefings run.' : null,
      latestDaily: latestDaily || null, latestWeekly: latestWeekly || null, openUrgent
    }
  };
  agents.titan = await titanOverview(db, lastRuns.TITAN, lastRuns['TITAN:ok']);
  const budget = await budgetStatus(db);
  const countsBySeverity = { critical: 0, high: 0, medium: 0, low: 0, info: 0 };
  for (const i of openIncidents) countsBySeverity[i.severity] = (countsBySeverity[i.severity] || 0) + 1;
  const live = !!(checks24.length || telemetry24.length || lastRuns.ARGON || lastRuns.ULTRON || lastRuns.AU || lastRuns.TITAN);
  return json({
    live, budget, generatedAt: new Date(now).toISOString(),
    config: {
      dbConfigured: !!env.INTEL_DB, accessConfigured: intelligenceConfigured(env),
      localDevelopment: localOperatorAllowed(env, new URL('http://localhost')) ? true : undefined,
      ingestConfigured: !!env.INTELLIGENCE_INGEST_KEY, webhookConfigured: !!env.INTEL_WEBHOOK_URL,
      siteUrlConfigured, targets: siteUrlConfigured ? parseTargets(env).map(t => t.name) : []
    },
    agents, health,
    incidents: { countsBySeverity, open: openIncidents.slice(0, 8) },
    checks: { series: checks24.slice(0, 48).reverse(), total24h: checks24.length },
    latestUrgent: latestUrgent || null
  });
}

async function listIncidents(db, url) {
  const status = url.searchParams.get('status') || 'open', agent = url.searchParams.get('agent') || null, severity = url.searchParams.get('severity') || null;
  const limit = limitOf(url, 50, 200);
  requireThat(['open', 'investigating', 'resolved', 'dismissed', 'all'].includes(status), 'invalid-status', 400);
  requireThat(!agent || ['ARGON', 'ULTRON', 'AU'].includes(agent), 'invalid-agent', 400);
  requireThat(!severity || ['info', 'low', 'medium', 'high', 'critical'].includes(severity), 'invalid-severity', 400);
  const clauses = [], binds = [];
  if (status !== 'all') { clauses.push('status=?'); binds.push(status); }
  if (agent) { clauses.push('agent=?'); binds.push(agent); }
  if (severity) { clauses.push('severity=?'); binds.push(severity); }
  const where = clauses.length ? 'WHERE ' + clauses.join(' AND ') : '';
  const rows = (await db.prepare(`SELECT id,fingerprint,agent,severity,title,summary,confidence,status,first_seen,last_seen,resolved_at,occurrence_count,correlation_group,streak_fail,streak_ok,auto_resolve,escalated_at,updated_by
    FROM intel_incidents ${where} ORDER BY CASE severity WHEN 'critical' THEN 5 WHEN 'high' THEN 4 WHEN 'medium' THEN 3 WHEN 'low' THEN 2 ELSE 1 END DESC, last_seen DESC LIMIT ?`).bind(...binds, limit).all()).results || [];
  return json({ incidents: rows.map(parseEvidenceRows) });
}
// evidence_json is not selected in the list query; detail view parses it separately.
function parseEvidenceRows(row) { return row; }

async function incidentDetail(db, id) {
  requireThat(/^[a-f0-9-]{36}$/i.test(id), 'invalid-id', 400);
  const row = await db.prepare(`SELECT * FROM intel_incidents WHERE id=?`).bind(id).first();
  requireThat(row, 'not-found', 404);
  let evidence = {};
  try { evidence = JSON.parse(row.evidence_json); } catch { evidence = { note: 'evidence could not be parsed' }; }
  const members = Array.isArray(evidence.members) ? evidence.members : [];
  let correlated = [];
  if (members.length) {
    correlated = (await db.prepare(`SELECT id,fingerprint,agent,severity,title,status FROM intel_incidents WHERE fingerprint IN (${members.map(() => '?').join(',')})`).bind(...members.map(m => m.fingerprint)).all()).results || [];
  } else if (row.correlation_group) {
    correlated = (await db.prepare(`SELECT id,fingerprint,agent,severity,title,status FROM intel_incidents WHERE correlation_group=? AND fingerprint<>?`).bind(row.correlation_group, row.fingerprint).all()).results || [];
  }
  const activity = (await db.prepare(`SELECT actor,action,target,outcome,detail_json,created_at FROM intel_audit WHERE target IN (?,?) ORDER BY created_at DESC LIMIT 50`).bind(row.id, row.fingerprint).all()).results || [];
  const relatedChecks = (await db.prepare(`SELECT target,status,latency_ms,http_status,detail,checked_at FROM intel_checks WHERE checked_at>=? ORDER BY checked_at DESC LIMIT 10`).bind(new Date(Date.parse(row.first_seen) - 3600000).toISOString()).all()).results || [];
  return json({ incident: { ...row, evidence }, correlated, activity, relatedChecks });
}

async function updateIncidentStatus(db, request, url, operator, id) {
  requireThat(/^[a-f0-9-]{36}$/i.test(id), 'invalid-id', 400);
  const body = await readJson(request, 2048);
  requireThat(body && typeof body === 'object', 'invalid-body', 400);
  requireThat(['investigating', 'resolved', 'dismissed'].includes(body.status), 'invalid-status', 400);
  const note = typeof body.note === 'string' ? body.note.slice(0, 500) : '';
  requireThat(body.status !== 'dismissed' || note.length >= 10, 'dismissal-requires-reason', 400);
  const row = await db.prepare('SELECT id,status,fingerprint,title FROM intel_incidents WHERE id=?').bind(id).first();
  requireThat(row, 'not-found', 404);
  requireThat(row.status !== body.status, 'no-op-transition', 409);
  requireThat(row.status !== 'resolved' || body.status === 'investigating', 'invalid-transition', 409);
  await db.prepare('UPDATE intel_incidents SET status=?, resolved_at=?, updated_by=? WHERE id=?')
    .bind(body.status, body.status === 'resolved' ? new Date().toISOString() : null, operator.id, id).run();
  await logAudit(db, operator.id, 'incident-status-changed', id, body.status, { from: row.status, note, fingerprint: row.fingerprint, title: row.title });
  return json({ ok: true, id, status: body.status });
}

async function timeline(db, url) {
  const limit = limitOf(url, 40, 100);
  const items = [];
  for (const r of (await db.prepare(`SELECT id,agent,severity,title,status,first_seen,resolved_at FROM intel_incidents ORDER BY first_seen DESC LIMIT 30`).all()).results || []) {
    items.push({ kind: 'incident-opened', at: r.first_seen, agent: r.agent, title: r.title, ref: r.id, severity: r.severity });
    if (r.resolved_at) items.push({ kind: 'incident-resolved', at: r.resolved_at, agent: r.agent, title: r.title, ref: r.id, severity: r.severity });
  }
  for (const r of (await db.prepare(`SELECT agent,run_type,status,summary,started_at FROM intel_agent_runs ORDER BY started_at DESC LIMIT 30`).all()).results || []) {
    items.push({ kind: 'agent-run', at: r.started_at, agent: r.agent, title: r.run_type + ' — ' + r.status, detail: r.summary });
  }
  for (const r of (await db.prepare(`SELECT id,kind,title,created_at,delivery_status FROM intel_briefings ORDER BY created_at DESC LIMIT 20`).all()).results || []) {
    items.push({ kind: 'briefing', at: r.created_at, agent: 'AU', title: r.title, ref: r.id, detail: 'delivery: ' + r.delivery_status });
  }
  for (const r of (await db.prepare(`SELECT actor,action,target,outcome,created_at FROM intel_audit ORDER BY created_at DESC LIMIT 30`).all()).results || []) {
    items.push({ kind: 'audit', at: r.created_at, agent: 'AU', title: r.action + ' — ' + r.outcome, detail: 'actor: ' + r.actor + ' · target: ' + r.target });
  }
  items.sort((a, b) => Date.parse(b.at) - Date.parse(a.at));
  return json({ items: items.slice(0, limit) });
}

async function listBriefings(db, url) {
  const kind = url.searchParams.get('kind') || null;
  requireThat(!kind || ['urgent', 'daily', 'weekly'].includes(kind), 'invalid-kind', 400);
  const limit = limitOf(url, 30, 100);
  const where = kind ? "WHERE kind='" + kind + "'" : '';
  const rows = (await db.prepare(`SELECT id,kind,title,created_at,delivery_status FROM intel_briefings ${where} ORDER BY created_at DESC LIMIT ?`).bind(limit).all()).results || [];
  return json({ briefings: rows });
}

async function briefingDetail(db, id) {
  requireThat(/^[a-z0-9\-]{1,80}$/i.test(id), 'invalid-id', 400);
  const row = await db.prepare('SELECT * FROM intel_briefings WHERE id=?').bind(id).first();
  requireThat(row, 'not-found', 404);
  let evidence = {};
  try { evidence = JSON.parse(row.evidence_json); } catch { evidence = {}; }
  const notifications = (await db.prepare('SELECT channel,status,detail,created_at FROM intel_notifications WHERE briefing_id=? ORDER BY created_at DESC').bind(id).all()).results || [];
  return json({ briefing: { ...row, evidence }, notifications });
}

async function listAutomation(db) {
  const rules = (await db.prepare('SELECT id,name,description,action_type,enabled,explicitly_approved_by,approved_at,rollback_plan,last_run_at,created_at FROM intel_automation_rules ORDER BY id').all()).results || [];
  const recentAudit = (await db.prepare(`SELECT actor,action,target,outcome,created_at FROM intel_audit WHERE action LIKE 'automation-%' ORDER BY created_at DESC LIMIT 20`).all()).results || [];
  return json({ rules, recentAudit, policy: 'Monitoring and analysis run automatically. Reversible low-risk actions require an explicitly approved rule. Production deployments, destructive operations and account actions are never automated.' });
}

async function approveAutomation(db, request, operator, id) {
  requireThat(/^[a-z0-9\-]{1,60}$/.test(id), 'invalid-id', 400);
  const body = await readJson(request, 1024);
  requireThat(body?.confirm === id, 'confirmation-mismatch', 400);
  const row = await db.prepare('SELECT id,action_type FROM intel_automation_rules WHERE id=?').bind(id).first();
  requireThat(row, 'not-found', 404);
  const now = new Date().toISOString();
  await db.prepare('UPDATE intel_automation_rules SET enabled=1, explicitly_approved_by=?, approved_at=? WHERE id=?').bind(operator.id, now, id).run();
  await logAudit(db, operator.id, 'automation-approved', id, 'enabled', { actionType: row.action_type, typedConfirmation: true, approvedAt: now });
  return json({ ok: true, id, enabled: true });
}

async function revokeAutomation(db, request, operator, id) {
  requireThat(/^[a-z0-9\-]{1,60}$/.test(id), 'invalid-id', 400);
  await readJson(request, 1024);
  const row = await db.prepare('SELECT id FROM intel_automation_rules WHERE id=?').bind(id).first();
  requireThat(row, 'not-found', 404);
  await db.prepare('UPDATE intel_automation_rules SET enabled=0 WHERE id=?').bind(id).run();
  await logAudit(db, operator.id, 'automation-revoked', id, 'disabled', {});
  return json({ ok: true, id, enabled: false });
}

async function verifyNow(db, env, request, url, operator, fetcher = fetch) {
  requireThat(siteUrlAllowed(env), 'site-url-not-configured', 503);
  requireThat(sameOrigin(request, url), 'origin-rejected', 403);
  const limit = await rateLimit(db, 'verify:' + operator.id, 3600000, 6);
  requireThat(limit.allowed, 'rate-limit', 429);
  const result = await recordAgentRun(db, 'ULTRON', 'manual-verify', async () => {
    const checks = await runUltronChecks(env, fetcher);
    return { summary: 'Manual verification: ' + checks.results.length + ' targets checked', evidence: { triggeredBy: operator.id, results: checks.results } };
  });
  await logAudit(db, operator.id, 'manual-verification', 'ultron-checks', 'ok', { targets: result?.evidence?.results?.length ?? 0 });
  return json({ ok: true, results: result?.evidence?.results || [], note: 'Checks were recorded and incident logic ran. See the Incidents view for effects.' });
}

// ---------- TITAN improvement backlog ----------
const IMPROVEMENT_STATUSES = ['proposed', 'approved', 'rejected', 'parked', 'in-progress', 'implemented', 'rechecked', 'failed'];

async function improveNow(db, env, request, url, operator, fetcher = fetch) {
  requireThat(sameOrigin(request, url), 'origin-rejected', 403);
  const limit = await rateLimit(db, 'improve:' + operator.id, 3600000, 6);
  requireThat(limit.allowed, 'rate-limit', 429);
  const result = await recordAgentRun(db, 'TITAN', 'manual-audit', async () => {
    const audit = await runTitanAudit(env, db, { fetcher, correlationId: operator.id });
    return { summary: `TITAN audit: ${audit.summary.findings} finding(s), ${audit.summary.telemetryEventsReviewed} telemetry events reviewed`, evidence: { ...audit.summary, items: audit.items } };
  });
  return json({ ok: true, summary: result?.summary, items: result?.evidence?.items || [], note: 'Findings upserted by evidence key; human decisions are preserved. See the TITAN view.' });
}

async function listImprovements(db, url) {
  const limit = limitOf(url, 50, 200);
  const status = url.searchParams.get('status');
  const where = status && IMPROVEMENT_STATUSES.includes(status) ? 'WHERE status=?' : '';
  const stmt = `SELECT id,title,area,risk,status,priority,confidence,evidence_type,approval_flags_json,decision_note,decided_by,decided_at,implemented_at,rechecked_at,updated_at FROM intel_improvement_items ${where} ORDER BY priority DESC, updated_at DESC LIMIT ?`;
  const rows = (await (where ? db.prepare(stmt).bind(status, limit) : db.prepare(stmt).bind(limit)).all()).results || [];
  return json({ items: rows.map(r => ({ ...r, approvalFlags: JSON.parse(r.approval_flags_json || '[]') })) });
}

async function getImprovement(db, id) {
  const row = await db.prepare('SELECT * FROM intel_improvement_items WHERE id=?').bind(id).first();
  requireThat(row, 'not-found', 404);
  let evidence = {}, flags = [], recheck = null;
  try { evidence = JSON.parse(row.evidence_json); } catch { }
  try { flags = JSON.parse(row.approval_flags_json || '[]'); } catch { }
  try { recheck = row.recheck_result_json ? JSON.parse(row.recheck_result_json) : null; } catch { }
  return json({ item: { ...row, evidence, approvalFlags: flags, recheckResult: recheck } });
}

// Operator decision on a backlog item. Ranking-affecting (and other hard-flagged) items
// require an explicit acknowledgment so standards changes can never slip through silently.
async function decideImprovement(db, request, url, operator, id) {
  requireThat(sameOrigin(request, url), 'origin-rejected', 403);
  const limit = await rateLimit(db, 'improve-decide:' + operator.id, 3600000, 60);
  requireThat(limit.allowed, 'rate-limit', 429);
  const row = await db.prepare('SELECT id,status,approval_flags_json FROM intel_improvement_items WHERE id=?').bind(id).first();
  requireThat(row, 'not-found', 404);
  const body = await readJson(request);
  const decision = body.decision;
  requireThat(['approved', 'rejected', 'parked', 'in-progress'].includes(decision), 'invalid-decision', 400);
  requireThat(typeof (body.note || '') === 'string' && (body.note || '').length <= 500, 'invalid-note', 400);
  const flags = JSON.parse(row.approval_flags_json || '[]');
  if (flags.length && decision === 'approved') {
    const acked = Array.isArray(body.acknowledged) ? body.acknowledged : [];
    requireThat(flags.every(f => acked.includes(f)), 'approval-acknowledgment-required', 409);
  }
  await db.prepare('UPDATE intel_improvement_items SET status=?, decision_note=?, decided_by=?, decided_at=?, updated_at=? WHERE id=?')
    .bind(decision, body.note || '', operator.id, new Date().toISOString(), new Date().toISOString(), id).run();
  await logAudit(db, operator.id, 'improvement-decision', id, decision, { note: body.note || '', flags });
  return json({ ok: true, id, status: decision, approvalFlags: flags });
}

// Recording that an approved item was actually implemented (with evidence of testing).
async function implementImprovement(db, request, url, operator, id) {
  requireThat(sameOrigin(request, url), 'origin-rejected', 403);
  const limit = await rateLimit(db, 'improve-implement:' + operator.id, 3600000, 60);
  requireThat(limit.allowed, 'rate-limit', 429);
  const row = await db.prepare('SELECT id,status FROM intel_improvement_items WHERE id=?').bind(id).first();
  requireThat(row, 'not-found', 404);
  requireThat(row.status === 'approved', 'not-approved', 409);
  const body = await readJson(request);
  requireThat(typeof (body.note || '') === 'string' && (body.note || '').length >= 3, 'invalid-note', 400);
  const now = new Date().toISOString();
  await db.prepare('UPDATE intel_improvement_items SET status=?, implemented_at=?, implement_note=?, updated_at=? WHERE id=?')
    .bind('implemented', now, body.note, now, id).run();
  await logAudit(db, operator.id, 'improvement-implemented', id, 'implemented', { note: body.note });
  return json({ ok: true, id, status: 'implemented', implementedAt: now });
}

// Regression recheck for a completed improvement: re-run the audit and see whether the
// original detector still fires. detected=false means the problem is verified gone.
async function recheckImprovement(db, env, request, url, operator, id, fetcher = fetch) {
  requireThat(sameOrigin(request, url), 'origin-rejected', 403);
  const limit = await rateLimit(db, 'improve-recheck:' + operator.id, 3600000, 30);
  requireThat(limit.allowed, 'rate-limit', 429);
  const row = await db.prepare('SELECT id,evidence_key,status FROM intel_improvement_items WHERE id=?').bind(id).first();
  requireThat(row, 'not-found', 404);
  requireThat(['implemented', 'rechecked', 'approved'].includes(row.status), 'not-implemented', 409);
  const fresh = await runTitanAudit(env, db, { fetcher, correlationId: operator.id });
  const stillDetected = fresh.items.some(i => i.evidenceKey === row.evidence_key);
  const freshItem = stillDetected ? fresh.items.find(i => i.evidenceKey === row.evidence_key) : null;
  const result = {
    checkedAt: new Date().toISOString(),
    detected: stillDetected,
    passed: !stillDetected,
    summary: stillDetected
      ? 'Detector still fires — the problem is still present in current evidence. Treat as a regression or an incomplete fix.'
      : 'Detector no longer fires — the improvement is verified effective against current evidence.',
    freshPriority: freshItem ? freshItem.priority : null,
    freshStatus: freshItem ? freshItem.status : 'resolved'
  };
  await db.prepare('UPDATE intel_improvement_items SET status=?, rechecked_at=?, recheck_result_json=?, updated_at=? WHERE id=?')
    .bind(stillDetected ? 'failed' : 'rechecked', result.checkedAt, JSON.stringify(result), new Date().toISOString(), id).run();
  await logAudit(db, operator.id, 'improvement-rechecked', id, stillDetected ? 'regression-detected' : 'verified', result);
  return json({ ok: true, id, recheck: result });
}

async function budgetRoute(db, operator) {
  const budget = await budgetStatus(db);
  return json({ budget });
}

async function listAudit(db, url) {
  const limit = limitOf(url, 50, 200);
  const rows = (await db.prepare('SELECT actor,action,target,outcome,detail_json,created_at FROM intel_audit ORDER BY created_at DESC LIMIT ?').bind(limit).all()).results || [];
  return json({ events: rows.map(r => { let d = {}; try { d = JSON.parse(r.detail_json); } catch { } return { ...r, detail: d }; }) });
}

// Telemetry intake: the only route without operator authentication.
async function ingestEvents(db, env, request, url) {
  requireThat(!!env.INTELLIGENCE_INGEST_KEY, 'ingest-not-configured', 503);
  const key = request.headers.get('X-MW-Key') || '';
  requireThat(safeEqual(key, env.INTELLIGENCE_INGEST_KEY), 'invalid-key', 401);
  requireThat(sameOrigin(request, url), 'origin-rejected', 403);
  const minute = await rateLimit(db, 'ingest:key', 60000, 60);
  requireThat(minute.allowed, 'rate-limit', 429);
  // Volume anomaly guard: a hard daily ceiling, configurable via INTEL_DAILY_EVENT_CAP.
  const day = await rateLimit(db, 'ingest:day', 86400000, Math.max(1000, Number(env.INTEL_DAILY_EVENT_CAP) || 20000));
  requireThat(day.allowed, 'volume-cap', 429);
  const payload = await readJson(request, MAX_BODY);
  const rows = validateTelemetryBatch(payload);
  const { accepted, inserted, duplicates } = await ingestTelemetry(db, rows);
  return json({ accepted, inserted, duplicates }, 201);
}

// On-demand ARGON analysis + AU correlation (the hourly cron does the same thing).
async function analyzeNow(db, env, request, url, operator) {
  requireThat(sameOrigin(request, url), 'origin-rejected', 403);
  const limit = await rateLimit(db, 'analyze:' + operator.id, 3600000, 4);
  requireThat(limit.allowed, 'rate-limit', 429);
  const argon = await recordAgentRun(db, 'ARGON', 'on-demand-analysis', async () => {
    const result = await analyzeArgonTelemetry(db, env);
    return { summary: result.analyzed + ' events analyzed across ' + result.versions + ' versions; ' + result.raised.length + ' finding(s).', evidence: result };
  });
  const au = await recordAgentRun(db, 'AU', 'on-demand-correlation', async () => {
    const result = await correlateAu(db, env);
    return { summary: result.correlated + ' cross-agent correlation(s).', evidence: result };
  });
  await logAudit(db, operator.id, 'on-demand-analysis', 'argon+au', 'ok', { argon: argon?.summary, au: au?.summary });
  return json({ ok: true, argon: argon?.summary || 'completed', au: au?.summary || 'completed' });
}

// On-demand briefing regeneration (idempotent per day; the cron does the same thing).
async function briefingNow(db, request, url, operator) {
  requireThat(sameOrigin(request, url), 'origin-rejected', 403);
  const body = await readJson(request, 256);
  requireThat(body?.kind === 'daily' || body?.kind === 'weekly', 'invalid-kind', 400);
  const limit = await rateLimit(db, 'briefing:' + operator.id, 3600000, 6);
  requireThat(limit.allowed, 'rate-limit', 429);
  const result = body.kind === 'daily' ? await buildDailyBriefing(db) : await buildWeeklyBriefing(db);
  await logAudit(db, operator.id, 'briefing-regenerated', result.id, 'ok', { kind: body.kind });
  return json({ ok: true, id: result.id, kind: body.kind });
}

// ---------- router ----------
export async function handleIntelligence({ request, env }, deps = {}) {
  const url = new URL(request.url);
  const route = url.pathname.slice('/api/intelligence'.length) || '/';
  const db = env.INTEL_DB;
  try {
    // Public read-only status: works even with nothing configured (that is the point).
    if (route === '/status') {
      if (request.method !== 'GET') return new Response(null, { status: 405, headers: { Allow: 'GET' } });
      return await publicStatus(env, deps.fetcher || fetch);
    }
    if (!db) return json({ error: 'intelligence-not-configured', detail: 'INTEL_DB binding is missing. Fail closed: no data is served or accepted. Component status: GET /api/intelligence/status' }, 503);
    // Telemetry intake is key-gated, not operator-gated.
    if (route === '/events' && request.method === 'POST') return await ingestEvents(db, env, request, url);
    if (route === '/events') return new Response(null, { status: 405, headers: { Allow: 'POST' } });
    const operator = await authenticateOperator(request, env, url, deps);
    requireThat(['GET', 'POST'].includes(request.method), 'method-not-allowed', 405);
    if (request.method === 'POST') {
      requireAdmin(operator);
      requireThat(sameOrigin(request, url), 'origin-rejected', 403);
      const limit = await rateLimit(db, 'op:' + operator.id, 3600000, 600);
      requireThat(limit.allowed, 'rate-limit', 429);
    }
    if (route === '/overview' && request.method === 'GET') return await overview(db, env);
    if (route === '/incidents' && request.method === 'GET') return await listIncidents(db, url);
    const incidentMatch = route.match(/^\/incidents\/([a-f0-9-]{36})$/i);
    if (incidentMatch && request.method === 'GET') return await incidentDetail(db, incidentMatch[1]);
    if (incidentMatch && request.method === 'POST') return await updateIncidentStatus(db, request, url, operator, incidentMatch[1]);
    if (route === '/timeline' && request.method === 'GET') return await timeline(db, url);
    if (route === '/briefings' && request.method === 'GET') return await listBriefings(db, url);
    const briefingMatch = route.match(/^\/briefings\/([a-z0-9\-]{1,80})$/i);
    if (briefingMatch && request.method === 'GET') return await briefingDetail(db, briefingMatch[1]);
    if (route === '/automation' && request.method === 'GET') return await listAutomation(db);
    const autoMatch = route.match(/^\/automation\/([a-z0-9\-]{1,60})\/(approve|revoke)$/i);
    if (autoMatch && request.method === 'POST') return autoMatch[2] === 'approve'
      ? await approveAutomation(db, request, operator, autoMatch[1])
      : await revokeAutomation(db, request, operator, autoMatch[1]);
    if (route === '/verify' && request.method === 'POST') return await verifyNow(db, env, request, url, operator, deps.fetcher || fetch);
    if (route === '/analyze' && request.method === 'POST') return await analyzeNow(db, env, request, url, operator);
    if (route === '/briefing' && request.method === 'POST') return await briefingNow(db, request, url, operator);
    if (route === '/improve' && request.method === 'POST') return await improveNow(db, env, request, url, operator, deps.fetcher || fetch);
    if (route === '/improvements' && request.method === 'GET') return await listImprovements(db, url);
    const improveMatch = route.match(/^\/improvements\/([a-z0-9\-]{1,120})$/i);
    if (improveMatch && request.method === 'GET') return await getImprovement(db, improveMatch[1]);
    if (improveMatch && request.method === 'POST') {
      const sub = url.searchParams.get('action');
      if (sub === 'decide') return await decideImprovement(db, request, url, operator, improveMatch[1]);
      if (sub === 'implement') return await implementImprovement(db, request, url, operator, improveMatch[1]);
      if (sub === 'recheck') return await recheckImprovement(db, env, request, url, operator, improveMatch[1], deps.fetcher || fetch);
      return json({ error: 'invalid-action' }, 400);
    }
    if (route === '/budget' && request.method === 'GET') return await budgetRoute(db, operator);
    if (route === '/audit' && request.method === 'GET') return await listAudit(db, url);
    return json({ error: 'not-found' }, 404);
  } catch (e) {
    if (e instanceof IntelError) return json(e.hint ? { error: e.code, hint: e.hint } : { error: e.code }, e.status);
    return json({ error: 'intelligence-unavailable' }, 503);
  }
}
