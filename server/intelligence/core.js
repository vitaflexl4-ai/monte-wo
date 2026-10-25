// MONTE WO Intelligence core — shared by the scheduled Worker (ULTRON/ARGON/AU jobs) and the
// Pages Functions API. Deterministic, evidence-first logic only: no fabricated data, no LLM
// claims. Facts, hypotheses and missing data are explicitly labelled in evidence JSON.
//
// Agent map:
//   ARGON  — mobile app telemetry analysis (untrusted client input, confidence-capped)
//   ULTRON — scheduled website availability/latency/route checks
//   AU     — cross-agent correlation, briefings, challenges, bounded automation
import { IntelError, requireThat } from './errors.js';

export const SEVERITY_RANK = Object.freeze({ info: 1, low: 2, medium: 3, high: 4, critical: 5 });
export const AGENTS = Object.freeze(['ARGON', 'ULTRON', 'AU', 'TITAN']);
export const uid = () => crypto.randomUUID();
export const nowIso = () => new Date().toISOString();
export const maxSeverity = (a, b) => SEVERITY_RANK[a] >= SEVERITY_RANK[b] ? a : b;
const json = (data, status = 200) => new Response(JSON.stringify(data), {
  status, headers: {
    'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'private, no-store',
    'X-Content-Type-Options': 'nosniff', 'Vary': 'Cf-Access-Jwt-Assertion, Authorization'
  }
});
export { json as jsonResponse };
export const escapeLike = s => String(s).replace(/[%_\\]/g, c => '\\' + c);

// ---------- settings & automation rules ----------
export async function getSettings(db) {
  try {
    const rows = (await db.prepare('SELECT key, value FROM intel_settings').all()).results || [];
    return Object.fromEntries(rows.map(r => [r.key, r.value]));
  } catch { return {}; }
}
export async function isRuleEnabled(db, ruleId) {
  const row = await db.prepare('SELECT id, enabled FROM intel_automation_rules WHERE id=?').bind(ruleId).first();
  return { exists: !!row, enabled: row?.enabled === 1 };
}

// ---------- audit ----------
export async function logAudit(db, actor, action, target, outcome, detail = {}) {
  await db.prepare('INSERT INTO intel_audit (id, actor, action, target, outcome, detail_json) VALUES (?,?,?,?,?,?)')
    .bind(uid(), String(actor), String(action), String(target), String(outcome), JSON.stringify(detail)).run();
}

// ---------- rate limiting (hashed keys only) ----------
export async function rateLimit(db, key, windowMs, max) {
  const now = Date.now(), windowStart = Math.floor(now / windowMs) * windowMs;
  const row = await db.prepare(`INSERT INTO intel_rate_limits (key,window_start,attempts) VALUES (?,?,1)
    ON CONFLICT(key) DO UPDATE SET window_start=excluded.window_start,
      attempts=CASE WHEN intel_rate_limits.window_start=excluded.window_start THEN intel_rate_limits.attempts+1 ELSE 1 END
    RETURNING attempts`).bind(key, windowStart).first();
  return { allowed: row.attempts <= max, attempts: row.attempts };
}
export async function purgeExpiredRateLimits(db) {
  await db.prepare('DELETE FROM intel_rate_limits WHERE window_start < ?').bind(Math.floor(Date.now() / 1000) - 86400).run();
}

// ---------- checks ----------
export async function recordCheck(db, check) {
  await db.prepare(`INSERT INTO intel_checks (id,agent,target,status,latency_ms,http_status,detail,evidence_json,checked_at)
    VALUES (?,?,?,?,?,?,?,?,?)`)
    .bind(uid(), check.agent, check.target, check.status, check.latencyMs ?? null, check.httpStatus ?? null,
      String(check.detail || ''), JSON.stringify(check.evidence || {}), check.checkedAt || nowIso()).run();
}

// ---------- incidents: dedup, escalation, recovery ----------
// Upsert-by-fingerprint deduplication. Repeated failures increment occurrence_count and the
// failure streak; a resolved/dismissed incident that fails again reopens (history preserved).
export async function upsertIncidentFailure(db, envOrIncident, maybeIncident) {
  // Accepts (db, incident) or (db, env, incident); the worker passes env for urgent alerting.
  const env = maybeIncident ? envOrIncident : null;
  const incident = maybeIncident || envOrIncident;
  const now = nowIso();
  const row = await db.prepare(`INSERT INTO intel_incidents
    (id,fingerprint,agent,severity,title,summary,evidence_json,confidence,status,first_seen,last_seen,auto_resolve,occurrence_count,streak_fail,streak_ok)
    VALUES (?,?,?,?,?,?,?,?,'open',?,?,?,?,?,0)
    ON CONFLICT(fingerprint) DO UPDATE SET
      last_seen=excluded.last_seen,
      occurrence_count=intel_incidents.occurrence_count+1,
      streak_fail=intel_incidents.streak_fail+1,
      streak_ok=0,
      severity=excluded.severity,
      title=excluded.title,
      summary=excluded.summary,
      evidence_json=excluded.evidence_json,
      confidence=excluded.confidence,
      status=CASE WHEN intel_incidents.status IN ('resolved','dismissed') THEN 'open' ELSE intel_incidents.status END
    RETURNING id,status,severity,streak_fail,streak_ok`).bind(uid(), incident.fingerprint, incident.agent, incident.severity, incident.title,
      incident.summary, JSON.stringify(incident.evidence || {}), Number(incident.confidence ?? 0.5), now, now,
      incident.auto_resolve ? 1 : 0, 1, 1).first();
  // Escalation policy: deterministic streak thresholds. 3 failures -> high, 6 -> critical + urgent alert.
  let escalated = null;
  if (row.streak_fail >= 6 && SEVERITY_RANK[row.severity] < SEVERITY_RANK.critical) {
    escalated = 'critical';
  } else if (row.streak_fail >= 3 && SEVERITY_RANK[row.severity] < SEVERITY_RANK.high) {
    escalated = 'high';
  }
  if (escalated) {
    await db.prepare('UPDATE intel_incidents SET severity=?, escalated_at=? WHERE fingerprint=?').bind(escalated, now, incident.fingerprint).run();
    await logAudit(db, 'automation:escalation-policy', 'incident-escalated', incident.fingerprint, escalated,
      { streakFail: row.streak_fail, note: 'Deterministic streak policy; no human approval required for severity labelling.' });
    if (escalated === 'critical' && env) {
      // Urgent alert record is always created (evidence); webhook delivery is rule-gated.
      await raiseUrgent(db, env, { ...incident, id: row.id, severity: escalated, last_seen: now });
    }
  }
  return { ...row, severity: escalated || row.severity, escalated };
}

// Recovery verification: a passing check increments the recovery streak. Auto-resolution only
// happens when the administrator approved the 'auto-resolve-recovered-targets' rule; otherwise
// the incident stays open with an explicit recovery candidate annotation for human confirmation.
export async function noteRecovery(db, fingerprint, evidence = {}) {
  const now = nowIso();
  const row = await db.prepare(`UPDATE intel_incidents SET streak_ok=streak_ok+1, streak_fail=0,
    evidence_json=json_set(evidence_json,'$.recoveryCandidate',json(?)) WHERE fingerprint=? AND status='open' RETURNING id,streak_ok,auto_resolve`)
    .bind(JSON.stringify({ since: now, ...evidence }), fingerprint).first();
  if (!row) return { affected: false };
  if (row.auto_resolve === 1 && row.streak_ok >= 2) {
    const rule = await isRuleEnabled(db, 'auto-resolve-recovered-targets');
    if (rule.enabled) {
      await db.prepare(`UPDATE intel_incidents SET status='resolved', resolved_at=?, updated_by=?, evidence_json=json_set(evidence_json,'$.recoveryVerified',json(?))
        WHERE fingerprint=? AND status='open'`).bind(now, 'automation:auto-resolve-recovered-targets',
        JSON.stringify({ resolvedBy: 'two consecutive verified checks', verifiedAt: now }), fingerprint).run();
      await logAudit(db, 'automation:auto-resolve-recovered-targets', 'incident-auto-resolved', fingerprint, 'resolved',
        { consecutiveOk: row.streak_ok, rule: 'auto-resolve-recovered-targets', rollback: 'Reopen from the Incidents view; history retained.' });
      return { affected: true, autoResolved: true };
    }
  }
  return { affected: true, autoResolved: false, recoveryCandidate: true, streakOk: row.streak_ok };
}

// ---------- ULTRON: website checks ----------
// Confirmed production origin must be HTTPS. The localhost exception exists ONLY for the
// LOCAL_DEVELOPMENT preview (same convention as the waitlist) and can never run on a public hostname.
export function siteUrlAllowed(env) {
  const url = env.SITE_URL || '';
  if (/^https:\/\//i.test(url)) return true;
  return env.LOCAL_DEVELOPMENT === 'true' && /^http:\/\/localhost(:[0-9]+)?\/?$/i.test(url);
}

export function parseTargets(env) {
  const base = env.SITE_URL;
  const defaults = [{ name: 'website-home', path: '/' }, { name: 'api-status', path: '/api/status' }];
  let extra = [];
  if (env.INTEL_TARGETS) {
    try {
      const parsed = JSON.parse(env.INTEL_TARGETS);
      requireThat(Array.isArray(parsed) && parsed.length <= 12, 'invalid-targets', 500);
      extra = parsed.map(t => {
        requireThat(t && typeof t.name === 'string' && typeof t.path === 'string' && /^[a-z0-9\-_]{1,40}$/i.test(t.name) && t.path.startsWith('/') && !t.path.includes('..'), 'invalid-target', 500);
        return { name: t.name, path: t.path };
      });
    } catch (e) { if (e instanceof IntelError) throw e; throw new IntelError('invalid-targets', 500); }
  }
  const seen = new Set();
  return [...defaults, ...extra].filter(t => !seen.has(t.name) && seen.add(t.name));
}

export function classifyHttpResponse(httpStatus, latencyMs, slowMs) {
  if (httpStatus >= 500) return { status: 'down', detail: 'Server error (' + httpStatus + ')' };
  if (httpStatus >= 400) return { status: 'degraded', detail: 'Client error (' + httpStatus + '); possible broken route' };
  if (latencyMs > slowMs) return { status: 'degraded', detail: 'Slow response (' + latencyMs + 'ms > ' + slowMs + 'ms threshold)' };
  return { status: 'ok', detail: 'Available' };
}

const TARGET_INCIDENTS = {
  down: t => ({
    fingerprint: 'ultron-unavailable-' + t, severity: 'high', auto_resolve: true,
    title: 'Website unavailable: ' + t,
    summary: 'ULTRON could not reach this target (network failure or server error). Confirm it is not a monitor-side issue before declaring an outage.'
  }),
  degraded: t => ({
    fingerprint: 'ultron-route-error-' + t, severity: 'medium', auto_resolve: false,
    title: 'Route problem: ' + t,
    summary: 'The health check returned a client error or slow response. Verify whether this route is intentionally removed or needs repair.'
  })
};

// One full ULTRON cycle across all configured targets. Records checks, dedups incidents,
// escalates on failure streaks and verifies recovery on passes. Never reports healthy when
// it could not check: unconfigured targets are recorded as not_configured (throttled to 1/hour).
export async function runUltronChecks(env, fetcher = fetch) {
  const db = env.INTEL_DB, now = nowIso(), slowMs = Number(env.INTEL_SLOW_MS || 2500);
  if (!db) return { configured: false, results: [] };
  if (!siteUrlAllowed(env)) {
    const last = await db.prepare(`SELECT checked_at FROM intel_checks WHERE agent='ULTRON' AND status='not_configured' ORDER BY checked_at DESC LIMIT 1`).first();
    if (!last || Date.parse(last.checked_at) < Date.now() - 3600000) {
      await recordCheck(db, { agent: 'ULTRON', target: 'website', status: 'not_configured', detail: 'SITE_URL is not configured; no check was attempted.', evidence: { classification: 'missing-data' } });
    }
    return { configured: false, results: [] };
  }
  const results = [];
  for (const target of parseTargets(env)) {
    const url = new URL(target.path, env.SITE_URL).href;
    const start = Date.now();
    let check;
    try {
      const response = await fetcher(url, { method: 'GET', redirect: 'manual', cache: 'no-store', headers: { 'user-agent': 'MONTE-WO-ULTRON/1.0 (website intelligence)' }, signal: AbortSignal.timeout(Number(env.INTEL_TIMEOUT_MS || 12000)) });
      const latencyMs = Date.now() - start;
      const verdict = classifyHttpResponse(response.status, latencyMs, slowMs);
      check = { agent: 'ULTRON', target: target.name, latencyMs, httpStatus: response.status, ...verdict, evidence: { url, redirect: response.headers.get('location') || null, classification: verdict.status === 'ok' ? 'fact' : 'fact' } };
    } catch (error) {
      const latencyMs = Date.now() - start;
      check = { agent: 'ULTRON', target: target.name, latencyMs, status: 'down', detail: (error?.name === 'TimeoutError' ? 'Request timed out' : 'Request failed (network error)') + '; confirm this is not a monitor-side issue.', evidence: { url, error: error?.name || 'unknown', classification: 'fact' } };
    }
    await recordCheck(db, check);
    if (check.status === 'ok') {
      await noteRecovery(db, 'ultron-unavailable-' + target.name, { at: now, httpStatus: check.httpStatus });
      await noteRecovery(db, 'ultron-route-error-' + target.name, { at: now, httpStatus: check.httpStatus });
    } else {
      const template = TARGET_INCIDENTS[check.status](target.name);
      await upsertIncidentFailure(db, env, {
        fingerprint: template.fingerprint, agent: 'ULTRON', severity: template.severity, auto_resolve: template.auto_resolve,
        title: template.title, summary: template.summary + ' Latest observation: ' + check.detail + '.',
        confidence: check.status === 'down' ? 0.9 : 0.95,
        evidence: { ...check.evidence, httpStatus: check.httpStatus ?? null, latencyMs: check.latencyMs ?? null, classification: 'fact', source: 'scheduled-check' }
      });
    }
    results.push(check);
  }
  // Slow-response streak: three consecutive slow-but-successful checks become a low incident.
  for (const target of parseTargets(env)) {
    const recent = (await db.prepare(`SELECT status,latency_ms FROM intel_checks WHERE agent='ULTRON' AND target=? AND status IN ('ok','degraded') ORDER BY checked_at DESC LIMIT 3`).bind(target.name).all()).results || [];
    if (recent.length === 3 && recent.every(c => c.status === 'degraded')) {
      await upsertIncidentFailure(db, env, {
        fingerprint: 'ultron-slow-' + target.name, agent: 'ULTRON', severity: 'low', auto_resolve: true,
        title: 'Sustained slow responses: ' + target.name,
        summary: 'The last three checks for this target exceeded the ' + slowMs + 'ms latency threshold. Performance degradation, not an outage.',
        confidence: 0.85, evidence: { target: target.name, slowMs, latencies: recent.map(c => c.latency_ms), classification: 'fact', source: 'scheduled-check' }
      });
    } else {
      await noteRecovery(db, 'ultron-slow-' + target.name, { at: now });
    }
  }
  return { configured: true, results };
}

// ---------- ARGON: mobile telemetry analysis ----------
// Telemetry is untrusted client input: every derived incident is labelled a hypothesis,
// confidence is capped, and missing denominators are reported as missing data.
export async function analyzeArgonTelemetry(db, env = null, now = new Date()) {
  const since = new Date(now.getTime() - 86400000).toISOString();
  const byVersion = (await db.prepare(`SELECT app_version,
      SUM(CASE WHEN event_type='session_start' THEN 1 ELSE 0 END) AS sessions,
      SUM(CASE WHEN event_type IN ('app_crash','js_error','http_error') THEN 1 ELSE 0 END) AS errors,
      SUM(CASE WHEN event_type='app_crash' THEN 1 ELSE 0 END) AS crashes,
      SUM(CASE WHEN event_type='login_failed' THEN 1 ELSE 0 END) AS login_failures
    FROM intel_telemetry_events WHERE occurred_at>=? GROUP BY app_version`).bind(since).all()).results || [];
  const raised = [];
  if (byVersion.length === 0) {
    return { analyzed: 0, versions: 0, raised: [], note: 'No telemetry in the last 24h. This is absence of data, not evidence of health.' };
  }
  // New error signatures: fingerprints first observed inside the window with >= 3 occurrences.
  const fresh = (await db.prepare(`SELECT fingerprint, event_type, COUNT(*) AS n, MIN(occurred_at) AS first_seen
    FROM intel_telemetry_events WHERE fingerprint<>'' AND occurred_at>=? GROUP BY fingerprint, event_type HAVING n>=3`).bind(since).all()).results || [];
  for (const f of fresh) {
    const prior = await db.prepare('SELECT COUNT(*) AS n FROM intel_telemetry_events WHERE fingerprint=? AND occurred_at<?').bind(f.fingerprint, since).first();
    if (prior.n === 0) {
      await upsertIncidentFailure(db, env, {
        fingerprint: 'argon-new-signature-' + f.fingerprint, agent: 'ARGON', severity: f.event_type === 'app_crash' ? 'medium' : 'low', auto_resolve: false,
        title: 'New error signature in app: ' + f.fingerprint,
        summary: f.n + ' events of type ' + f.event_type + ' with fingerprint ' + f.fingerprint + ' appeared in the last 24h with no prior history. Untrusted client telemetry — verify against release timing.',
        confidence: 0.55, evidence: { fingerprint: f.fingerprint, eventType: f.event_type, count: f.n, firstSeen: f.first_seen, classification: 'hypothesis', reason: 'untrusted client telemetry; no prior baseline' }
      });
      raised.push('argon-new-signature-' + f.fingerprint);
    }
  }
  for (const v of byVersion) {
    const sessions = v.sessions || 0, errors = v.errors || 0;
    if (sessions >= 5 && errors >= 5) {
      const rate = errors / sessions;
      const prior = (await db.prepare(`SELECT SUM(CASE WHEN event_type='session_start' THEN 1 ELSE 0 END) AS s, SUM(CASE WHEN event_type IN ('app_crash','js_error','http_error') THEN 1 ELSE 0 END) AS e
        FROM intel_telemetry_events WHERE app_version=? AND occurred_at>=? AND occurred_at<?`).bind(v.app_version, new Date(now.getTime() - 8 * 86400000).toISOString(), since).first()) || { s: 0, e: 0 };
      const baseline = Math.max((prior.e || 0) / Math.max(prior.s || 0, 1), 0.01);
      if (rate >= 2 * baseline) {
        const confidence = Math.min(0.7, 0.5 + 0.05 * Math.min(4, rate / baseline - 2) + (v.crashes > 0 ? 0.05 : 0));
        await upsertIncidentFailure(db, env, {
          fingerprint: 'argon-regression-' + v.app_version, agent: 'ARGON', severity: rate > 0.25 ? 'high' : 'medium', auto_resolve: false,
          title: 'Release regression suspected: app ' + v.app_version,
          summary: 'Error rate ' + (rate * 100).toFixed(1) + '% over ' + sessions + ' sessions in 24h vs ' + (baseline * 100).toFixed(1) + '% baseline (prior 7 days). Hypothesis from untrusted telemetry — confirm before rollback.',
          confidence, evidence: { appVersion: v.app_version, sessions, errors, crashes: v.crashes || 0, rate, baseline, classification: 'hypothesis', reason: 'client-reported; denominator is session_start events' }
        });
        raised.push('argon-regression-' + v.app_version);
      }
    } else if (sessions === 0 && errors >= 10) {
      await upsertIncidentFailure(db, env, {
        fingerprint: 'argon-errors-no-sessions-' + v.app_version, agent: 'ARGON', severity: 'medium', auto_resolve: false,
        title: 'App errors without usage denominator: ' + v.app_version,
        summary: errors + ' error events were reported for version ' + v.app_version + ' but no session_start events, so no error rate can be computed. Missing data — do not treat as a confirmed regression.',
        confidence: 0.4, evidence: { appVersion: v.app_version, errors, sessions, classification: 'missing-data', reason: 'no session denominator in window' }
      });
      raised.push('argon-errors-no-sessions-' + v.app_version);
    }
    if (sessions >= 10 && (v.login_failures || 0) / sessions > 0.2) {
      await upsertIncidentFailure(db, env, {
        fingerprint: 'argon-login-failures-' + v.app_version, agent: 'ARGON', severity: 'medium', auto_resolve: false,
        title: 'Elevated login failures: app ' + v.app_version,
        summary: v.login_failures + ' login failures across ' + sessions + ' sessions (' + ((v.login_failures / sessions) * 100).toFixed(0) + '%). Could be credential attempts, an auth outage, or a client bug — verify against ULTRON API checks.',
        confidence: 0.6, evidence: { appVersion: v.app_version, loginFailures: v.login_failures, sessions, classification: 'hypothesis', reason: 'untrusted client telemetry' }
      });
      raised.push('argon-login-failures-' + v.app_version);
    }
  }
  return { analyzed: byVersion.reduce((n, v) => n + (v.sessions || 0) + (v.errors || 0) + (v.login_failures || 0), 0), versions: byVersion.length, raised, note: 'Untrusted client telemetry; all findings labelled hypotheses.' };
}

// ---------- AU: cross-agent correlation ----------
// Correlates ULTRON API-route failures with ARGON app-side errors inside a 30-minute window.
// AU incidents cite both members and are resolved only when every member is resolved.
export async function correlateAu(db, env = null, now = new Date()) {
  const windowStart = new Date(now.getTime() - 30 * 60000).toISOString();
  const ultronApi = (await db.prepare(`SELECT id,fingerprint,severity,confidence,last_seen FROM intel_incidents
    WHERE agent='ULTRON' AND status='open' AND (fingerprint LIKE 'ultron-unavailable-api%' OR fingerprint LIKE 'ultron-route-error-api%') AND last_seen>=?`).bind(windowStart).all()).results || [];
  const argon = (await db.prepare(`SELECT id,fingerprint,severity,confidence,last_seen FROM intel_incidents
    WHERE agent='ARGON' AND status='open' AND (fingerprint LIKE 'argon-regression-%' OR fingerprint LIKE 'argon-new-signature-%' OR fingerprint LIKE 'argon-login-failures-%' OR fingerprint LIKE 'argon-errors-no-sessions-%') AND last_seen>=?`).bind(windowStart).all()).results || [];
  const created = [];
  // One correlation per co-occurrence: each ULTRON incident pairs with the strongest unused
  // ARGON finding. This prevents duplicate AU incidents for a single shared outage.
  const used = new Set();
  const rank = { critical: 5, high: 4, medium: 3, low: 2, info: 1 };
  const candidates = [...argon].sort((a, b) => (rank[b.severity] - rank[a.severity]) || (Date.parse(b.last_seen) - Date.parse(a.last_seen)));
  for (const u of ultronApi) {
    const a = candidates.find(c => !used.has(c.fingerprint));
    if (!a) break;
    used.add(a.fingerprint);
    const group = 'au-' + u.fingerprint + '+' + a.fingerprint;
    const severity = maxSeverity(u.severity, a.severity) === 'critical' ? 'critical' : 'high';
    const confidence = Math.min(0.85, Math.min(u.confidence, a.confidence) + 0.1);
    await upsertIncidentFailure(db, env, {
      fingerprint: group, agent: 'AU', severity, auto_resolve: false,
      title: 'Correlated website and app failures',
      summary: 'ULTRON reports an API-route problem (' + u.fingerprint + ') while ARGON reports app-side errors (' + a.fingerprint + ') within 30 minutes. A shared backend cause is plausible; both members remain the primary evidence.',
      confidence, evidence: { members: [{ agent: 'ULTRON', fingerprint: u.fingerprint, id: u.id }, { agent: 'ARGON', fingerprint: a.fingerprint, id: a.id }], correlationWindowMinutes: 30, classification: 'hypothesis', reason: 'temporal co-occurrence; shared cause unverified' }
    });
    await db.prepare('UPDATE intel_incidents SET correlation_group=? WHERE fingerprint IN (?,?) AND (correlation_group IS NULL OR correlation_group=?)').bind(group, u.fingerprint, a.fingerprint, group).run();
    await db.prepare('UPDATE intel_incidents SET correlation_group=? WHERE fingerprint=?').bind(group, group).run();
    created.push(group);
  }
  // Resolve correlation incidents whose members are all resolved or dismissed.
  const openAu = (await db.prepare(`SELECT fingerprint, evidence_json FROM intel_incidents WHERE agent='AU' AND status='open' AND evidence_json LIKE '%members%'`).all()).results || [];
  for (const au of openAu) {
    let members = [];
    try { members = (JSON.parse(au.evidence_json).members) || []; } catch { /* malformed evidence: leave for human review */ }
    if (members.length) {
      const states = (await db.prepare(`SELECT fingerprint, status FROM intel_incidents WHERE fingerprint IN (${members.map(() => '?').join(',')})`).bind(...members.map(m => m.fingerprint)).all()).results || [];
      if (states.length === members.length && states.every(s => s.status === 'resolved' || s.status === 'dismissed')) {
        await db.prepare(`UPDATE intel_incidents SET status='resolved', resolved_at=?, updated_by='automation:correlation-follows-members' WHERE fingerprint=? AND status='open'`)
          .bind(nowIso(), au.fingerprint).run();
        await logAudit(db, 'automation:correlation-follows-members', 'correlation-resolved', au.fingerprint, 'resolved', { members: members.map(m => m.fingerprint) });
      }
    }
  }
  return { correlated: created.length };
}

// ---------- AU: briefings ----------
export function computeHealth(checks, openIncidents = []) {
  const real = checks.filter(c => c.status !== 'not_configured');
  if (real.length === 0) return { score: null, label: 'NO DATA', basis: 'No health checks recorded in the window. Absence of data is not health.', uptime: null, avgLatencyMs: null, p95LatencyMs: null, total: 0 };
  const ok = real.filter(c => c.status === 'ok').length;
  const uptime = ok / real.length;
  const latencies = real.map(c => c.latency_ms).filter(n => typeof n === 'number').sort((a, b) => a - b);
  const p = q => latencies.length ? latencies[Math.min(latencies.length - 1, Math.floor(q * latencies.length))] : null;
  let score = Math.round(uptime * 100);
  const deductions = { critical: 15, high: 8, medium: 4, low: 1, info: 0 };
  for (const i of openIncidents) score -= deductions[i.severity] || 0;
  score = Math.max(0, Math.min(100, score));
  return {
    score, label: score >= 97 ? 'HEALTHY' : score >= 90 ? 'DEGRADED' : 'AT RISK',
    basis: 'Computed from ' + real.length + ' checks (24h) and ' + openIncidents.length + ' open incidents. Deterministic formula; not a subjective judgement.',
    uptime, avgLatencyMs: latencies.length ? Math.round(latencies.reduce((a, b) => a + b, 0) / latencies.length) : null,
    p95LatencyMs: p(0.95), total: real.length
  };
}

function recommendation(id, title, rationale, evidence, confidence, impact, decisionRequired) {
  return { id, title, rationale, evidence, confidence, impact, decisionRequired };
}

export async function buildDailyBriefing(db, now = new Date()) {
  const until = now.toISOString(), since = new Date(now.getTime() - 86400000).toISOString();
  const checks = (await db.prepare(`SELECT target,status,latency_ms FROM intel_checks WHERE checked_at>=? AND status<>'not_configured'`).bind(since).all()).results || [];
  const open = (await db.prepare(`SELECT id,fingerprint,agent,severity,title,confidence FROM intel_incidents WHERE status='open' ORDER BY CASE severity WHEN 'critical' THEN 5 WHEN 'high' THEN 4 WHEN 'medium' THEN 3 WHEN 'low' THEN 2 ELSE 1 END DESC LIMIT 50`).all()).results || [];
  const opened = (await db.prepare('SELECT COUNT(*) AS n FROM intel_incidents WHERE first_seen>=?').bind(since).first()).n;
  const resolved = (await db.prepare('SELECT COUNT(*) AS n FROM intel_incidents WHERE resolved_at>=?').bind(since).first()).n;
  const health = computeHealth(checks, open);
  const telemetry = (await db.prepare(`SELECT event_type, COUNT(*) AS n FROM intel_telemetry_events WHERE occurred_at>=? GROUP BY event_type`).bind(since).all()).results || [];
  const sessions = telemetry.find(t => t.event_type === 'session_start')?.n || 0;
  const errors = telemetry.filter(t => ['app_crash', 'js_error', 'http_error'].includes(t.event_type)).reduce((n, t) => n + t.n, 0);
  const visitorRows = (await db.prepare(`SELECT metric_date, value FROM intel_metric_rollups WHERE metric='pageviews' AND metric_date>=? ORDER BY metric_date`).bind(since.slice(0, 10)).all()).results || [];
  const visitorAnalytics = visitorRows.length ? { status: 'ok', pageviews7d: visitorRows.reduce((n, r) => n + r.value, 0) } : { status: 'not_configured', note: 'Aggregate visitor analytics are not configured. No visitor numbers are shown.' };
  const recommendations = [];
  for (const i of open.filter(i => ['critical', 'high'].includes(i.severity)).slice(0, 5)) {
    recommendations.push(recommendation('ack-' + i.id, 'Decide: acknowledge, escalate or dismiss — ' + i.title,
      'An open ' + i.severity + ' incident requires an executive decision or explicit acceptance.',
      [{ type: 'incident', ref: i.id, summary: i.title + ' (source ' + i.agent + ')' }], i.confidence, 'high', true));
  }
  if (health.uptime !== null && health.uptime < 0.99) {
    recommendations.push(recommendation('uptime', 'Investigate availability below 99%',
      '24h uptime is ' + (health.uptime * 100).toFixed(2) + '%. Identify the failing target in ULTRON and confirm whether a fix is needed.',
      [{ type: 'checks', ref: since, summary: health.total + ' checks in 24h' }], 0.9, 'medium', false));
  }
  for (const i of open.filter(i => i.fingerprint.startsWith('argon-regression-')).slice(0, 2)) {
    recommendations.push(recommendation('rollback-' + i.id, 'Decide: hotfix or roll back the affected app release',
      'ARGON suspects a release regression. Confirm with release timing before acting; rollback is a production change requiring your approval.',
      [{ type: 'incident', ref: i.id, summary: i.title }], i.confidence, 'high', true));
  }
  if (visitorAnalytics.status === 'not_configured') {
    recommendations.push(recommendation('analytics', 'Configure aggregate visitor analytics (optional)',
      'ULTRON can import daily aggregate page-view counts from Cloudflare Web Analytics once a read-only API token and site tag are configured. Aggregate only; no per-visitor data.',
      [{ type: 'config', ref: 'docs/INTELLIGENCE-COMMAND-CENTER.md', summary: 'Deployment checklist item 7' }], 1, 'low', false));
  }
  const challenges = open.filter(i => i.confidence < 0.6).map(i => ({
    incidentId: i.id, title: i.title, confidence: i.confidence,
    challenge: 'Confidence below 0.6. AU does not endorse acting on this without verification; evidence may be thin or telemetry-based.'
  }));
  const body = [
    'AU DAILY EXECUTIVE SUMMARY — deterministic, evidence-backed; no generative model output.',
    'Window: ' + since + ' to ' + until,
    'System health: ' + health.label + (health.score === null ? '' : ' (score ' + health.score + '/100)') + '. ' + health.basis,
    'Availability: ' + (health.uptime === null ? 'no data' : (health.uptime * 100).toFixed(2) + '% of ' + health.total + ' checks'),
    'Latency: avg ' + (health.avgLatencyMs ?? 'n/a') + 'ms / p95 ' + (health.p95LatencyMs ?? 'n/a') + 'ms',
    'Incidents: ' + opened + ' opened, ' + resolved + ' resolved, ' + open.length + ' currently open.',
    'App telemetry (untrusted): ' + sessions + ' sessions, ' + errors + ' error events in 24h.',
    'Visitor analytics: ' + (visitorAnalytics.status === 'ok' ? visitorRows.length + ' daily rollups available' : 'NOT CONFIGURED — no visitor numbers are shown.'),
    challenges.length ? 'AU challenges: ' + challenges.length + ' open finding(s) below the confidence threshold; verify before acting.' : 'AU challenges: none.',
    'Recommendations: ' + (recommendations.length || 'none requiring action.')
  ].join('\n');
  const id = 'daily-' + until.slice(0, 10);
  await db.prepare(`INSERT INTO intel_briefings (id,kind,title,body,evidence_json,delivery_status,created_at)
    VALUES (?,'daily',?,?,?,?,?)
    ON CONFLICT(id) DO UPDATE SET body=excluded.body, evidence_json=excluded.evidence_json, title=excluded.title`)
    .bind(id, 'AU daily executive summary — ' + until.slice(0, 10), body, JSON.stringify({
      since, until, health, incidents: { opened, resolved, open: open.length, openList: open.slice(0, 20) },
      telemetry: { sessions, errors }, visitorAnalytics, recommendations, challenges, classification: 'fact-unless-labelled'
    }), 'not_configured', until).run();
  return { id, health, recommendations: recommendations.length, challenges: challenges.length };
}

export async function buildWeeklyBriefing(db, now = new Date()) {
  const until = now.toISOString(), since = new Date(now.getTime() - 7 * 86400000).toISOString(), priorSince = new Date(now.getTime() - 14 * 86400000).toISOString();
  const checks = (await db.prepare(`SELECT status,latency_ms FROM intel_checks WHERE checked_at>=? AND status<>'not_configured'`).bind(since).all()).results || [];
  const priorChecks = (await db.prepare(`SELECT status FROM intel_checks WHERE checked_at>=? AND checked_at<? AND status<>'not_configured'`).bind(priorSince, since).all()).results || [];
  const open = (await db.prepare(`SELECT id,fingerprint,severity,title,confidence,occurrence_count FROM intel_incidents WHERE status='open' ORDER BY occurrence_count DESC LIMIT 50`).all()).results || [];
  const recurring = (await db.prepare(`SELECT fingerprint,agent,severity,title,occurrence_count FROM intel_incidents WHERE occurrence_count>=3 AND last_seen>=? ORDER BY occurrence_count DESC LIMIT 10`).bind(since).all()).results || [];
  const resolvedRows = (await db.prepare(`SELECT fingerprint,first_seen,resolved_at FROM intel_incidents WHERE resolved_at>=?`).bind(since).all()).results || [];
  const mttrMinutes = resolvedRows.length ? Math.round(resolvedRows.reduce((n, r) => n + (Date.parse(r.resolved_at) - Date.parse(r.first_seen)), 0) / resolvedRows.length / 60000) : null;
  const openedThis = (await db.prepare('SELECT COUNT(*) AS n FROM intel_incidents WHERE first_seen>=?').bind(since).first()).n;
  const openedPrior = (await db.prepare('SELECT COUNT(*) AS n FROM intel_incidents WHERE first_seen>=? AND first_seen<?').bind(priorSince, since).first()).n;
  const health = computeHealth(checks, open);
  const priorUptime = priorChecks.length ? priorChecks.filter(c => c.status === 'ok').length / priorChecks.length : null;
  const features = (await db.prepare(`SELECT json_extract(detail_json,'$.feature') AS feature, COUNT(*) AS n FROM intel_telemetry_events
    WHERE event_type='feature_used' AND occurred_at>=? GROUP BY feature ORDER BY n DESC LIMIT 5`).bind(since).all()).results || [];
  const recommendations = [];
  for (const r of recurring.slice(0, 3)) {
    recommendations.push(recommendation('recurring-' + r.fingerprint, 'Prioritize a permanent fix: ' + r.title,
      'This fingerprint has been observed ' + r.occurrence_count + ' times. Repeated manual recovery costs more than a fix.',
      [{ type: 'incident', ref: r.fingerprint, summary: r.agent + ' · ' + r.severity }], 0.8, 'medium', true));
  }
  if (mttrMinutes !== null && mttrMinutes > 240) {
    recommendations.push(recommendation('mttr', 'Review incident response time',
      'Mean time to resolve over 7 days is ' + mttrMinutes + ' minutes. Consider pre-approved recovery rules or clearer escalation paths.',
      [{ type: 'briefings', ref: since.slice(0, 10), summary: resolvedRows.length + ' incidents resolved' }], 0.7, 'medium', false));
  }
  const body = [
    'AU WEEKLY STRATEGIC REPORT — deterministic, evidence-backed; no generative model output.',
    'Window: ' + since.slice(0, 10) + ' to ' + until.slice(0, 10),
    'Health: ' + health.label + ' (score ' + (health.score ?? 'n/a') + '), availability ' + (health.uptime === null ? 'no data' : (health.uptime * 100).toFixed(2) + '%'),
    'Week-over-week: incidents opened ' + openedThis + ' vs ' + openedPrior + ' prior week; availability ' + (priorUptime === null ? 'no prior data' : ((priorUptime * 100).toFixed(2) + '% -> ' + (health.uptime === null ? 'n/a' : (health.uptime * 100).toFixed(2) + '%'))),
    'Mean time to resolve: ' + (mttrMinutes === null ? 'no resolutions recorded' : mttrMinutes + ' minutes (proxy from incident timestamps)'),
    'Recurring fingerprints: ' + (recurring.length || 'none'),
    'Most-used app features (aggregate, untrusted telemetry): ' + (features.length ? features.map(f => f.feature + ' (' + f.n + ')').join(', ') : 'no feature telemetry recorded'),
    'Progress signals: ' + (openedThis < openedPrior ? 'fewer new incidents than last week' : 'new incidents flat or higher than last week') + '; ' + resolvedRows.length + ' incidents resolved.'
  ].join('\n');
  const id = 'weekly-' + until.slice(0, 10);
  await db.prepare(`INSERT INTO intel_briefings (id,kind,title,body,evidence_json,delivery_status,created_at)
    VALUES (?,'weekly',?,?,?,?,?)
    ON CONFLICT(id) DO UPDATE SET body=excluded.body, evidence_json=excluded.evidence_json, title=excluded.title`)
    .bind(id, 'AU weekly strategic report — week of ' + since.slice(0, 10), body, JSON.stringify({
      since, until, health, recurring, mttrMinutes, openedThis, openedPrior, priorUptime,
      features, recommendations, classification: 'fact-unless-labelled'
    }), 'not_configured', until).run();
  return { id, recurring: recurring.length, recommendations: recommendations.length };
}

// ---------- urgent alerts & delivery ----------
async function hmacHex(secret, text) {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return [...new Uint8Array(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(text)))].map(b => b.toString(16).padStart(2, '0')).join('');
}

// One urgent briefing per fingerprint per 6 hours (deterministic id bucket).
export async function raiseUrgent(db, env, incident, fetcher = fetch) {
  const bucket = Math.floor(Date.now() / (6 * 3600000));
  const id = 'urgent-' + bucket + '-' + incident.fingerprint.replace(/[^a-z0-9\-]/gi, '').slice(0, 60);
  const existing = await db.prepare('SELECT id FROM intel_briefings WHERE id=?').bind(id).first();
  if (existing) return { id, deduped: true };
  const title = 'URGENT — ' + incident.title;
  const body = 'AU URGENT ALERT\nSeverity: ' + incident.severity + '\nSource: ' + incident.agent + ' (fingerprint ' + incident.fingerprint + ')\nObserved: ' + (incident.last_seen || nowIso()) + '\n\n' + incident.summary + '\n\nOpen the Intelligence Command Center to review evidence and decide on action.';
  await db.prepare(`INSERT INTO intel_briefings (id,kind,title,body,evidence_json,delivery_status,created_at) VALUES (?,'urgent',?,?,?,'not_configured',?)`)
    .bind(id, title, body, JSON.stringify({ fingerprint: incident.fingerprint, agent: incident.agent, severity: incident.severity, classification: 'fact', sourceIncident: incident.id || null }), nowIso()).run();
  const rule = await isRuleEnabled(db, 'urgent-notification');
  let delivery = 'not_configured', note = 'webhook destination not configured';
  if (!rule.enabled) { delivery = 'not_configured'; note = 'automation rule disabled at time of alert'; }
  if (rule.enabled && env.INTEL_WEBHOOK_URL) {
    try {
      const payload = JSON.stringify({ source: 'MONTE WO Intelligence', kind: 'urgent', title, body, briefingId: id });
      const headers = { 'Content-Type': 'application/json' };
      if (env.INTEL_WEBHOOK_SECRET) headers['X-MW-Signature'] = 'v1=' + await hmacHex(env.INTEL_WEBHOOK_SECRET, payload);
      const res = await fetcher(env.INTEL_WEBHOOK_URL, { method: 'POST', headers, body: payload, signal: AbortSignal.timeout(10000) });
      delivery = res.ok ? 'sent' : 'failed';
      note = 'delivery attempt logged (HTTP ' + res.status + ')';
    } catch (error) { delivery = 'failed'; note = 'delivery attempt failed: ' + (error?.name || 'network-error'); }
  }
  // intel_briefings.delivery_status is constrained to sent/failed/not_configured;
  // the precise reason (rule disabled vs missing webhook) lives in intel_notifications.
  await db.prepare('UPDATE intel_briefings SET delivery_status=? WHERE id=?').bind(delivery === 'sent' ? 'sent' : delivery === 'failed' ? 'failed' : 'not_configured', id).run();
  await db.prepare('INSERT INTO intel_notifications (id,briefing_id,channel,status,detail) VALUES (?,?,?,?,?)')
    .bind(uid(), id, 'webhook', rule.enabled ? delivery : 'blocked-rule-disabled', note).run();
  return { id, deliveryStatus: delivery, notificationStatus: rule.enabled ? delivery : 'blocked-rule-disabled' };
}

// ---------- retention ----------
export async function retentionSweep(db) {
  const rule = await isRuleEnabled(db, 'retention-purge');
  await purgeExpiredRateLimits(db);
  if (!rule.enabled) return { skipped: 'rule-disabled', note: 'Retention rule not approved; raw data retained. Expired rate-limit windows were still purged.' };
  const settings = await getSettings(db);
  const days = (key, fallback) => { const n = Number(settings[key]); return Number.isFinite(n) && n >= 1 ? n : fallback; };
  const cutoff = d => new Date(Date.now() - d * 86400000).toISOString();
  const out = {};
  out.checks = (await db.prepare('DELETE FROM intel_checks WHERE checked_at<?').bind(cutoff(days('retention_checks_days', 30))).run())?.meta?.changes ?? 0;
  out.telemetry = (await db.prepare('DELETE FROM intel_telemetry_events WHERE occurred_at<?').bind(cutoff(days('retention_telemetry_days', 60))).run())?.meta?.changes ?? 0;
  out.notifications = (await db.prepare('DELETE FROM intel_notifications WHERE created_at<?').bind(cutoff(days('retention_notifications_days', 90))).run())?.meta?.changes ?? 0;
  await logAudit(db, 'automation:retention-purge', 'retention-sweep', 'intel_checks, intel_telemetry_events, intel_notifications', 'purged', out);
  return out;
}

// ---------- telemetry ingestion ----------
export async function ingestTelemetry(db, rows) {
  let inserted = 0;
  for (const r of rows) {
    // Idempotent on client eventId: retries never duplicate events.
    const res = await db.prepare(`INSERT OR IGNORE INTO intel_telemetry_events
      (id,event_type,app_version,platform,fingerprint,session_ref,duration_ms,detail_json,occurred_at) VALUES (?,?,?,?,?,?,?,?,?)`)
      .bind(r.id, r.event_type, r.app_version, r.platform, r.fingerprint, r.session_ref, r.duration_ms, r.detail_json, r.occurred_at).run();
    if (res?.meta?.changes) inserted++;
  }
  return { accepted: rows.length, inserted, duplicates: rows.length - inserted };
}

// ---------- agent run guard ----------
export async function recordAgentRun(db, agent, runType, fn) {
  const startedAt = nowIso(), id = uid();
  try {
    const result = await fn();
    await db.prepare('INSERT INTO intel_agent_runs (id,agent,run_type,status,summary,evidence_json,started_at,finished_at) VALUES (?,?,?,?,?,?,?,?)')
      .bind(id, agent, runType, 'ok', result?.summary || 'completed', JSON.stringify(result?.evidence || {}), startedAt, nowIso()).run();
    return result;
  } catch (error) {
    await db.prepare('INSERT INTO intel_agent_runs (id,agent,run_type,status,summary,evidence_json,started_at,finished_at) VALUES (?,?,?,?,?,?,?,?)')
      .bind(id, agent, runType, 'failed', 'run failed: ' + (error?.message || error), JSON.stringify({ error: String(error?.message || error) }), startedAt, nowIso()).run();
    throw error;
  }
}
