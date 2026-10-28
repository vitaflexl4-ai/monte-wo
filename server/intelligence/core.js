// MONTE WO Intelligence core — shared by the scheduled Worker (ULTRON/ARGON/AU jobs) and the
// Pages Functions API. Deterministic, evidence-first logic only: no fabricated data, no LLM
// claims. Facts, hypotheses, challenges and missing data are explicitly structured in evidence JSON.
//
// Agent map:
//   ARGON  — mobile & /mobile/ web app telemetry analysis (untrusted client input, confidence-capped)
//   ULTRON — scheduled website availability/latency/route checks, aggregate funnel & traffic signals
//   AU     — cross-agent correlation, epistemic challenges, investigation ledger, briefings, governance
import { IntelError, requireThat } from './errors.js';

export const SEVERITY_RANK = Object.freeze({ info: 1, low: 2, medium: 3, high: 4, critical: 5 });
export const AGENTS = Object.freeze(['ARGON', 'ULTRON', 'AU', 'TITAN']);
export const uid = () => crypto.randomUUID();
export const nowIso = () => new Date().toISOString();
export const maxSeverity = (a, b) => (SEVERITY_RANK[a] || 1) >= (SEVERITY_RANK[b] || 1) ? a : b;
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
export async function setSetting(db, key, value) {
  await db.prepare(`INSERT INTO intel_settings(key,value) VALUES (?,?)
    ON CONFLICT(key) DO UPDATE SET value=excluded.value`).bind(String(key), String(value)).run();
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

// ---------- aggregate rollups (privacy-first, zero per-visitor rows) ----------
export async function incrementRollup(db, metric, dimension = 'all', source = 'ultron-pulse', delta = 1, metricDate = nowIso().slice(0, 10)) {
  try {
    await db.prepare(`INSERT INTO intel_metric_rollups (metric_date, metric, dimension, source, value)
      VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(metric_date, metric, dimension, source) DO UPDATE SET value = intel_metric_rollups.value + excluded.value`)
      .bind(metricDate, String(metric), String(dimension || 'all'), String(source), Number(delta)).run();
  } catch { /* non-fatal if optional table missing in partial test harness */ }
}

export async function ingestPulse(db, pulse) {
  await incrementRollup(db, pulse.metric, pulse.dimension, pulse.source, 1, pulse.metric_date);
  if (pulse.metric === 'pageviews' && pulse.dimension !== 'all') {
    await incrementRollup(db, 'pageviews', 'all', pulse.source, 1, pulse.metric_date);
  }
  return { recorded: true, metric: pulse.metric, dimension: pulse.dimension, date: pulse.metric_date };
}

// ---------- rate limiting (hashed keys only; window_start stored in milliseconds) ----------
export async function rateLimit(db, key, windowMs, max) {
  const now = Date.now(), windowStart = Math.floor(now / windowMs) * windowMs;
  const row = await db.prepare(`INSERT INTO intel_rate_limits (key,window_start,attempts) VALUES (?,?,1)
    ON CONFLICT(key) DO UPDATE SET window_start=excluded.window_start,
      attempts=CASE WHEN intel_rate_limits.window_start=excluded.window_start THEN intel_rate_limits.attempts+1 ELSE 1 END
    RETURNING attempts`).bind(key, windowStart).first();
  return { allowed: row.attempts <= max, attempts: row.attempts };
}
export async function purgeExpiredRateLimits(db) {
  // window_start is stored in ms (Date.now()); purge entries older than 24 hours (86,400,000 ms).
  await db.prepare('DELETE FROM intel_rate_limits WHERE window_start < ?').bind(Date.now() - 86400000).run();
}

// ---------- persistent investigation ledger ----------
export async function addIncidentNote(db, { incidentId, author, entryType = 'note', body, confidence = null }) {
  const id = uid(), createdAt = nowIso();
  await db.prepare(`INSERT INTO intel_incident_notes (id, incident_id, author, entry_type, body, confidence, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)`).bind(id, incidentId, String(author), String(entryType), String(body), confidence, createdAt).run();
  return { id, incident_id: incidentId, author, entry_type: entryType, body, confidence, created_at: createdAt };
}

export async function listIncidentNotes(db, incidentId) {
  try {
    return (await db.prepare(`SELECT id, incident_id, author, entry_type, body, confidence, created_at
      FROM intel_incident_notes WHERE incident_id=? ORDER BY created_at ASC LIMIT 100`).bind(incidentId).all()).results || [];
  } catch {
    return [];
  }
}

// ---------- AU Epistemic Challenge Engine ----------
// Separates what is strictly observed (confirmed facts) from inferred causes (hypotheses),
// challenges weak statistical or single-vantage assumptions, and prescribes a falsification check.
export function evaluateEpistemics(incident) {
  let ev = {};
  try { ev = typeof incident.evidence === 'object' && incident.evidence ? incident.evidence : JSON.parse(incident.evidence_json || '{}'); }
  catch { ev = {}; }
  const classification = ev.classification || (incident.agent === 'ULTRON' ? 'fact' : 'hypothesis');
  const conf = Number(incident.confidence ?? 0.5);
  const confirmedFacts = [];
  const hypotheses = [];
  const challengedAssumptions = [];
  const missingData = [];

  if (incident.agent === 'ULTRON') {
    if (ev.url) confirmedFacts.push(`Probe to ${ev.url} returned ${ev.httpStatus ? 'HTTP ' + ev.httpStatus : (ev.error || 'network failure')} (${ev.latencyMs ?? '—'} ms).`);
    if (Array.isArray(ev.latencies)) confirmedFacts.push(`Last 3 probe latencies: ${ev.latencies.join(' ms, ')} ms (threshold ${ev.slowMs} ms).`);
    if (ev.metricWindow) confirmedFacts.push(`Aggregate rollup observed over ${ev.metricWindow}: ${ev.summaryFact || incident.title}.`);
    if (incident.fingerprint?.startsWith('ultron-unavailable-')) {
      hypotheses.push('Origin unavailability or DNS/TLS routing failure affecting visitors.');
      challengedAssumptions.push('Single-colo Worker probe cannot rule out transient edge-specific routing issues until consecutive failures persist.');
    }
    if (!ev.visitorImpactConfirmed) {
      missingData.push('Multi-region synthetic check or independent edge vantage confirmation.');
    }
  } else if (incident.agent === 'ARGON') {
    if (typeof ev.errors === 'number' || typeof ev.count === 'number') {
      confirmedFacts.push(`Ingested ${ev.errors ?? ev.count} validated telemetry event(s)${ev.appVersion ? ' on version ' + ev.appVersion : ''}.`);
    }
    if (typeof ev.p95Ms === 'number') {
      confirmedFacts.push(`Client-reported interaction duration p95 = ${ev.p95Ms} ms across ${ev.samples} samples on ${ev.screen || 'app'}.`);
    }
    hypotheses.push(incident.summary || incident.title);
    challengedAssumptions.push('Mobile telemetry originates from untrusted client devices; spoofed batches or offline retry bursts can inflate raw event counts.');
    if ((ev.sessions ?? 0) < 20) {
      challengedAssumptions.push(`Low session denominator (${ev.sessions ?? 0} sessions < 20): statistical power is insufficient to justify an automatic release rollback.`);
    }
    if (classification === 'missing-data' || ev.sessions === 0) {
      missingData.push('Active session_start denominator for this app version (required to compute true crash/error rate).');
    }
  } else if (incident.agent === 'AU') {
    const members = Array.isArray(ev.members) ? ev.members : [];
    if (members.length) {
      confirmedFacts.push(`Temporal co-occurrence within ${ev.correlationWindowMinutes || 30}m across: ${members.map(m => m.agent + ' (' + m.fingerprint + ')').join(' + ')}.`);
    }
    hypotheses.push(ev.hypothesis || 'Shared upstream cause linking simultaneous website/API and mobile symptoms.');
    challengedAssumptions.push('Temporal correlation within 30 minutes does not by itself prove causal dependency; verify shared route or auth dependency.');
  }

  if (conf < 0.6 && !challengedAssumptions.some(c => c.includes('0.6'))) {
    challengedAssumptions.push(`Confidence (${Math.round(conf * 100)}%) is below AU's 60% action threshold — gather corroborating evidence before production changes.`);
  }

  const falsificationStep = incident.agent === 'ULTRON'
    ? 'Trigger an on-demand ULTRON verification probe and inspect Cloudflare Pages function logs for matching 5xx/4xx status codes.'
    : incident.agent === 'ARGON'
      ? 'Compare error fingerprints against the exact git commit / APK release timestamp and verify whether ULTRON saw simultaneous API errors.'
      : 'Inspect both correlated member incidents in the Analysis Room; resolve or falsify each primary member directly.';

  return { classification, confidence: conf, confirmedFacts, hypotheses, challenges: challengedAssumptions, challengedAssumptions, missingData, falsificationStep };
}

// ---------- checks ----------
export async function recordCheck(db, check) {
  await db.prepare(`INSERT INTO intel_checks (id,agent,target,status,latency_ms,http_status,detail,evidence_json,checked_at)
    VALUES (?,?,?,?,?,?,?,?,?)`)
    .bind(uid(), check.agent, check.target, check.status, check.latencyMs ?? null, check.httpStatus ?? null,
      String(check.detail || ''), JSON.stringify(check.evidence || {}), check.checkedAt || nowIso()).run();
}

// ---------- incidents: dedup, monotonic escalation, recovery ----------
export async function upsertIncidentFailure(db, envOrIncident, maybeIncident) {
  const env = maybeIncident ? envOrIncident : null;
  const incident = maybeIncident || envOrIncident;
  const now = nowIso();
  const prior = await db.prepare('SELECT id, status, severity, streak_fail FROM intel_incidents WHERE fingerprint=?').bind(incident.fingerprint).first();
  const wasActive = prior && !['resolved', 'dismissed'].includes(prior.status);
  const incomingSev = incident.severity || 'medium';
  const effectiveBaseSev = wasActive ? maxSeverity(prior.severity, incomingSev) : incomingSev;

  const row = await db.prepare(`INSERT INTO intel_incidents
    (id,fingerprint,agent,severity,title,summary,evidence_json,confidence,status,first_seen,last_seen,auto_resolve,occurrence_count,streak_fail,streak_ok)
    VALUES (?,?,?,?,?,?,?,?,'open',?,?,?,?,?,0)
    ON CONFLICT(fingerprint) DO UPDATE SET
      last_seen=excluded.last_seen,
      occurrence_count=intel_incidents.occurrence_count+1,
      streak_fail=CASE WHEN intel_incidents.status IN ('resolved','dismissed') THEN 1 ELSE intel_incidents.streak_fail+1 END,
      streak_ok=0,
      severity=?,
      title=excluded.title,
      summary=excluded.summary,
      evidence_json=excluded.evidence_json,
      confidence=excluded.confidence,
      status=CASE WHEN intel_incidents.status IN ('resolved','dismissed') THEN 'open' ELSE intel_incidents.status END
    RETURNING id,status,severity,streak_fail,streak_ok`).bind(
      uid(), incident.fingerprint, incident.agent, incomingSev, incident.title,
      incident.summary, JSON.stringify(incident.evidence || {}), Number(incident.confidence ?? 0.5), now, now,
      incident.auto_resolve ? 1 : 0, 1, 1, effectiveBaseSev
    ).first();

  // Deterministic streak escalation: 3 consecutive failures -> high, 6 -> critical + urgent alert.
  // Only emits audit & urgent alert when crossing into a strictly higher severity than before.
  let escalated = null;
  if (row.streak_fail >= 6 && SEVERITY_RANK[row.severity] < SEVERITY_RANK.critical) {
    escalated = 'critical';
  } else if (row.streak_fail >= 3 && SEVERITY_RANK[row.severity] < SEVERITY_RANK.high) {
    escalated = 'high';
  }
  if (escalated) {
    await db.prepare('UPDATE intel_incidents SET severity=?, escalated_at=? WHERE fingerprint=?').bind(escalated, now, incident.fingerprint).run();
    await logAudit(db, 'automation:escalation-policy', 'incident-escalated', incident.fingerprint, escalated,
      { streakFail: row.streak_fail, previousSeverity: row.severity, note: 'Deterministic streak policy; monotonic severity prevents alert storms.' });
    if (escalated === 'critical' && env) {
      await raiseUrgent(db, env, { ...incident, id: row.id, severity: escalated, last_seen: now });
    }
  }
  return { ...row, severity: escalated || row.severity, escalated };
}

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

// ---------- ULTRON: website availability, route integrity, funnel friction & traffic signals ----------
export function siteUrlAllowed(env) {
  const url = env.SITE_URL || '';
  if (/^https:\/\//i.test(url)) return true;
  return env.LOCAL_DEVELOPMENT === 'true' && /^http:\/\/localhost(:[0-9]+)?\/?$/i.test(url);
}

export const EXTENDED_MONTE_TARGETS = Object.freeze([
  { name: 'app-showcase', path: '/app/' },
  { name: 'mobile-web-spa', path: '/mobile/' },
  { name: 'downloads-hub', path: '/downloads/' },
  { name: 'waitlist-page', path: '/waitlist/' },
  { name: 'api-mobile-config', path: '/api/mobile/config' }
]);

export function parseTargets(env) {
  const defaults = [{ name: 'website-home', path: '/' }, { name: 'api-status', path: '/api/status' }];
  const extended = env.INTEL_EXTENDED_TARGETS === 'true' ? EXTENDED_MONTE_TARGETS : [];
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
  return [...defaults, ...extended, ...extra].filter(t => !seen.has(t.name) && seen.add(t.name));
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
    summary: 'ULTRON could not reach this target (network failure or server error). Confirm it is not a monitor-side network issue before declaring an outage.'
  }),
  degraded: t => ({
    fingerprint: 'ultron-route-error-' + t, severity: 'medium', auto_resolve: false,
    title: 'Route problem: ' + t,
    summary: 'The health check returned a client error or slow response. Verify whether this route is intentionally removed or needs repair.'
  })
};

// Analyzes aggregate ULTRON rollups for conversion friction & suspicious traffic bursts.
export async function analyzeUltronSignals(db, env = null, now = new Date()) {
  const today = now.toISOString().slice(0, 10);
  const weekAgo = new Date(now.getTime() - 7 * 86400000).toISOString().slice(0, 10);
  const raised = [];
  let rows = [];
  try {
    rows = (await db.prepare(`SELECT metric_date, metric, dimension, value FROM intel_metric_rollups WHERE metric_date>=?`).bind(weekAgo).all()).results || [];
  } catch { return { raised }; }
  if (!rows.length) return { raised };

  const sumMetric = (m, sinceDate = weekAgo) => rows.filter(r => r.metric === m && r.metric_date >= sinceDate).reduce((s, r) => s + Number(r.value || 0), 0);
  const focus7d = sumMetric('waitlist_focus');
  const submitOk7d = sumMetric('waitlist_submit_ok');
  const submitErr7d = sumMetric('waitlist_submit_err');

  if ((focus7d >= 10 && submitOk7d / Math.max(focus7d, 1) < 0.15) || submitErr7d >= 5) {
    const convRate = focus7d > 0 ? submitOk7d / focus7d : 0;
    await upsertIncidentFailure(db, env, {
      fingerprint: 'ultron-conversion-friction-waitlist',
      agent: 'ULTRON',
      severity: submitErr7d >= 5 ? 'medium' : 'low',
      auto_resolve: false,
      title: 'Waitlist conversion friction detected',
      summary: `${submitOk7d}/${focus7d} waitlist starts completed (${(convRate * 100).toFixed(1)}%) with ${submitErr7d} submission errors over 7d. Inspect Turnstile configuration or form UX.`,
      confidence: submitErr7d >= 5 ? 0.82 : 0.65,
      evidence: {
        metricWindow: '7d', waitlistFocus: focus7d, waitlistSubmitOk: submitOk7d, waitlistSubmitErr: submitErr7d,
        conversionRate: convRate, classification: 'hypothesis',
        summaryFact: `${focus7d} form starts, ${submitOk7d} completions, ${submitErr7d} errors`
      }
    });
    raised.push('ultron-conversion-friction-waitlist');
  }

  const blockedToday = rows.filter(r => r.metric === 'security_blocked' && r.metric_date === today).reduce((s, r) => s + Number(r.value || 0), 0);
  if (blockedToday >= 25) {
    await upsertIncidentFailure(db, env, {
      fingerprint: 'ultron-suspicious-traffic-spike',
      agent: 'ULTRON',
      severity: blockedToday >= 100 ? 'high' : 'medium',
      auto_resolve: false,
      title: 'Suspicious traffic / blocked request spike',
      summary: `ULTRON recorded ${blockedToday} blocked requests today (rate-limit, bad origin, or invalid intake key). Aggregate counters only — no visitor IPs stored.`,
      confidence: 0.88,
      evidence: {
        metricWindow: today, blockedRequests: blockedToday,
        byReason: rows.filter(r => r.metric === 'security_blocked' && r.metric_date === today).map(r => ({ reason: r.dimension, count: r.value })),
        classification: 'fact', summaryFact: `${blockedToday} blocked edge/API requests on ${today}`
      }
    });
    raised.push('ultron-suspicious-traffic-spike');
  }
  return { raised };
}

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
  const targets = parseTargets(env);
  const results = [];
  for (const target of targets) {
    const url = new URL(target.path, env.SITE_URL).href;
    const start = Date.now();
    let check;
    try {
      const response = await fetcher(url, { method: 'GET', redirect: 'manual', cache: 'no-store', headers: { 'user-agent': 'MONTE-WO-ULTRON/2.0 (website intelligence)' }, signal: AbortSignal.timeout(Number(env.INTEL_TIMEOUT_MS || 12000)) });
      const latencyMs = Date.now() - start;
      const verdict = classifyHttpResponse(response.status, latencyMs, slowMs);
      const nosniff = response.headers?.get?.('x-content-type-options') === 'nosniff';
      check = {
        agent: 'ULTRON', target: target.name, latencyMs, httpStatus: response.status, ...verdict,
        evidence: {
          url, redirect: response.headers?.get?.('location') || null,
          contentType: response.headers?.get?.('content-type') || null,
          nosniffHeader: nosniff,
          classification: 'fact'
        }
      };
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
  for (const target of targets) {
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
  const signalResult = await analyzeUltronSignals(db, env, new Date());
  return { configured: true, results, signalFindings: signalResult.raised };
}

// ---------- ARGON: mobile & web app telemetry intelligence ----------
export async function analyzeArgonTelemetry(db, env = null, now = new Date()) {
  const since = new Date(now.getTime() - 86400000).toISOString();
  const settings = await getSettings(db);
  const slowThresholdMs = Math.max(300, Number(settings.slow_interaction_threshold_ms) || 1200);
  const byVersion = (await db.prepare(`SELECT app_version,
      SUM(CASE WHEN event_type='session_start' THEN 1 ELSE 0 END) AS sessions,
      SUM(CASE WHEN event_type IN ('app_crash','js_error','http_error') THEN 1 ELSE 0 END) AS errors,
      SUM(CASE WHEN event_type='app_crash' THEN 1 ELSE 0 END) AS crashes,
      SUM(CASE WHEN event_type='login_failed' THEN 1 ELSE 0 END) AS login_failures,
      SUM(CASE WHEN event_type='slow_interaction' THEN 1 ELSE 0 END) AS slow_events
    FROM intel_telemetry_events WHERE occurred_at>=? GROUP BY app_version`).bind(since).all()).results || [];
  const raised = [];
  if (byVersion.length === 0) {
    return { analyzed: 0, versions: 0, raised: [], note: 'No telemetry in the last 24h. This is absence of data, not evidence of health.' };
  }

  // 1. New error signatures (>= 3 occurrences in 24h with zero prior history).
  const fresh = (await db.prepare(`SELECT fingerprint, event_type, COUNT(*) AS n, MIN(occurred_at) AS first_seen
    FROM intel_telemetry_events WHERE fingerprint<>'' AND event_type IN ('app_crash','js_error','http_error','login_failed') AND occurred_at>=?
    GROUP BY fingerprint, event_type HAVING n>=3`).bind(since).all()).results || [];
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

  // 2. Per-version release regressions, missing denominators & login failure spikes.
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

  // 3. Performance degradation detector (p95 slow_interaction latency >= slowThresholdMs).
  const slowRows = (await db.prepare(`SELECT app_version, json_extract(detail_json,'$.screen') AS screen, duration_ms
    FROM intel_telemetry_events WHERE event_type='slow_interaction' AND duration_ms IS NOT NULL AND occurred_at>=?`).bind(since).all()).results || [];
  const slowGroups = new Map();
  for (const r of slowRows) {
    const screen = r.screen || '/unknown';
    const k = `${r.app_version}::${screen}`;
    if (!slowGroups.has(k)) slowGroups.set(k, { appVersion: r.app_version, screen, durations: [] });
    slowGroups.get(k).durations.push(Number(r.duration_ms));
  }
  for (const g of slowGroups.values()) {
    if (g.durations.length >= 3) {
      g.durations.sort((a, b) => a - b);
      const p95 = g.durations[Math.min(g.durations.length - 1, Math.floor(0.95 * g.durations.length))];
      if (p95 >= slowThresholdMs) {
        const cleanScreen = g.screen.replace(/[^a-z0-9\-]/gi, '-').replace(/^-+|-+$/g, '') || 'root';
        const fp = `argon-perf-degradation-${g.appVersion}-${cleanScreen}`.slice(0, 96);
        await upsertIncidentFailure(db, env, {
          fingerprint: fp, agent: 'ARGON', severity: p95 >= slowThresholdMs * 2 ? 'medium' : 'low', auto_resolve: false,
          title: `App performance degradation on ${g.screen} (${g.appVersion})`,
          summary: `Interaction p95 reached ${p95} ms across ${g.durations.length} slow-interaction samples (threshold ${slowThresholdMs} ms). Hypothesis from client timing.`,
          confidence: 0.58,
          evidence: { appVersion: g.appVersion, screen: g.screen, samples: g.durations.length, p95Ms: p95, thresholdMs: slowThresholdMs, classification: 'hypothesis', reason: 'client-reported interaction timing' }
        });
        raised.push(fp);
      }
    }
  }

  // 4. Unusual usage / runaway loop detector (single sessionRef emitting >= 25 events in 24h).
  const bursts = (await db.prepare(`SELECT app_version, session_ref, COUNT(*) AS n
    FROM intel_telemetry_events WHERE session_ref IS NOT NULL AND session_ref<>'' AND occurred_at>=?
    GROUP BY app_version, session_ref HAVING n>=25 ORDER BY n DESC LIMIT 5`).bind(since).all()).results || [];
  for (const b of bursts) {
    const fp = `argon-unusual-pattern-${b.app_version}`.slice(0, 96);
    await upsertIncidentFailure(db, env, {
      fingerprint: fp, agent: 'ARGON', severity: b.n >= 60 ? 'medium' : 'low', auto_resolve: false,
      title: `Unusual usage / runaway loop suspected (${b.app_version})`,
      summary: `A single session reference emitted ${b.n} telemetry events in 24h on app ${b.app_version}. Indicates either an infinite client retry loop or synthetic flood.`,
      confidence: 0.62,
      evidence: { appVersion: b.app_version, maxEventsPerSessionRef: b.n, anomalousSessionCount: bursts.length, classification: 'hypothesis', reason: 'abnormal per-session event density' }
    });
    raised.push(fp);
    // Bounded, rule-gated reversible response: if 'quarantine-anomalous-ingest-burst' is explicitly enabled,
    // activate a 15-minute per-client rate-limit tightening window (auditable & auto-expiring).
    const qRule = await isRuleEnabled(db, 'quarantine-anomalous-ingest-burst');
    if (qRule.enabled) {
      const untilIso = new Date(now.getTime() + 15 * 60000).toISOString();
      await setSetting(db, 'ingest_quarantine_until', untilIso);
      await db.prepare('UPDATE intel_automation_rules SET last_run_at=? WHERE id=?').bind(nowIso(), 'quarantine-anomalous-ingest-burst').run();
      await logAudit(db, 'automation:quarantine-anomalous-ingest-burst', 'ingest-burst-quarantine-activated', fp, 'throttled-15m',
        { expiresAt: untilIso, maxEventsInSession: b.n, rollback: 'Revoke rule or clear ingest_quarantine_until in settings.' });
    }
  }

  const totalAnalyzed = (await db.prepare('SELECT COUNT(*) AS n FROM intel_telemetry_events WHERE occurred_at>=?').bind(since).first())?.n || 0;
  return { analyzed: totalAnalyzed, versions: byVersion.length, raised, note: 'Untrusted client telemetry; all findings labelled hypotheses with calibrated confidence.' };
}

// ---------- AU: multi-vector cross-agent correlation ----------
export async function correlateAu(db, env = null, now = new Date()) {
  const windowStart = new Date(now.getTime() - 30 * 60000).toISOString();
  const ultronOpen = (await db.prepare(`SELECT id,fingerprint,severity,confidence,last_seen,title FROM intel_incidents
    WHERE agent='ULTRON' AND status='open' AND last_seen>=?`).bind(windowStart).all()).results || [];
  const argonOpen = (await db.prepare(`SELECT id,fingerprint,severity,confidence,last_seen,title FROM intel_incidents
    WHERE agent='ARGON' AND status='open' AND last_seen>=?`).bind(windowStart).all()).results || [];

  const created = [];
  const rank = { critical: 5, high: 4, medium: 3, low: 2, info: 1 };
  const sortedArgon = [...argonOpen].sort((a, b) => (rank[b.severity] - rank[a.severity]) || (Date.parse(b.last_seen) - Date.parse(a.last_seen)));
  const usedArgon = new Set();

  // Vector 1: ULTRON API/route failure <-> ARGON app-side errors/regressions
  const ultronApi = ultronOpen.filter(u => u.fingerprint.startsWith('ultron-unavailable-api') || u.fingerprint.startsWith('ultron-route-error-api'));
  for (const u of ultronApi) {
    const a = sortedArgon.find(c => !usedArgon.has(c.fingerprint) && (
      c.fingerprint.startsWith('argon-regression-') ||
      c.fingerprint.startsWith('argon-new-signature-') ||
      c.fingerprint.startsWith('argon-login-failures-') ||
      c.fingerprint.startsWith('argon-errors-no-sessions-')
    ));
    if (!a) break;
    usedArgon.add(a.fingerprint);
    const group = 'au-' + u.fingerprint + '+' + a.fingerprint;
    const severity = maxSeverity(u.severity, a.severity) === 'critical' ? 'critical' : 'high';
    const confidence = Math.min(0.85, Math.min(u.confidence, a.confidence) + 0.1);
    await upsertIncidentFailure(db, env, {
      fingerprint: group, agent: 'AU', severity, auto_resolve: false,
      title: 'Correlated website API and mobile app failures',
      summary: 'ULTRON reports an API-route problem (' + u.fingerprint + ') while ARGON reports app-side errors (' + a.fingerprint + ') within 30 minutes. A shared backend cause is plausible; both members remain the primary evidence.',
      confidence, evidence: {
        vector: 'shared-backend-outage',
        members: [{ agent: 'ULTRON', fingerprint: u.fingerprint, id: u.id }, { agent: 'ARGON', fingerprint: a.fingerprint, id: a.id }],
        correlationWindowMinutes: 30, classification: 'hypothesis',
        hypothesis: 'Backend API degradation is causing mobile client request/auth failures.',
        reason: 'temporal co-occurrence; shared cause unverified'
      }
    });
    await db.prepare('UPDATE intel_incidents SET correlation_group=? WHERE fingerprint IN (?,?) AND (correlation_group IS NULL OR correlation_group=?)').bind(group, u.fingerprint, a.fingerprint, group).run();
    await db.prepare('UPDATE intel_incidents SET correlation_group=? WHERE fingerprint=?').bind(group, group).run();
    created.push(group);
  }

  // Vector 2: ULTRON suspicious traffic spike <-> ARGON denominatorless errors / runaway loop (bot flood correlation)
  const ultronTraffic = ultronOpen.find(u => u.fingerprint === 'ultron-suspicious-traffic-spike');
  const argonBotCandidate = sortedArgon.find(c => !usedArgon.has(c.fingerprint) && (
    c.fingerprint.startsWith('argon-errors-no-sessions-') || c.fingerprint.startsWith('argon-unusual-pattern-')
  ));
  if (ultronTraffic && argonBotCandidate) {
    usedArgon.add(argonBotCandidate.fingerprint);
    const group = `au-${ultronTraffic.fingerprint}+${argonBotCandidate.fingerprint}`.slice(0, 120);
    await upsertIncidentFailure(db, env, {
      fingerprint: group, agent: 'AU', severity: 'medium', auto_resolve: false,
      title: 'Correlated traffic abuse and anomalous app telemetry',
      summary: `ULTRON blocked suspicious edge traffic (${ultronTraffic.fingerprint}) within 30m of ARGON flagging anomalous telemetry (${argonBotCandidate.fingerprint}). AU challenges treating the mobile errors as real athlete crashes until bot probing is ruled out.`,
      confidence: 0.76,
      evidence: {
        vector: 'synthetic-traffic-contamination',
        members: [{ agent: 'ULTRON', fingerprint: ultronTraffic.fingerprint, id: ultronTraffic.id }, { agent: 'ARGON', fingerprint: argonBotCandidate.fingerprint, id: argonBotCandidate.id }],
        correlationWindowMinutes: 30, classification: 'hypothesis',
        hypothesis: 'Automated probing or replay traffic is contaminating mobile telemetry counts rather than a genuine app regression.',
        reason: 'simultaneous edge blocks and denominatorless/burst telemetry'
      }
    });
    await db.prepare('UPDATE intel_incidents SET correlation_group=? WHERE fingerprint IN (?,?) AND (correlation_group IS NULL OR correlation_group=?)').bind(group, ultronTraffic.fingerprint, argonBotCandidate.fingerprint, group).run();
    await db.prepare('UPDATE intel_incidents SET correlation_group=? WHERE fingerprint=?').bind(group, group).run();
    created.push(group);
  }

  // Follow member resolution: resolve AU correlation incidents whose members are all resolved or dismissed.
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
  return { correlated: created.length, groups: created };
}

// ---------- AU: health & 3-tier executive briefings ----------
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

function recommendation(id, title, rationale, evidence, confidence, impact, decisionRequired, executiveAction = null) {
  return {
    id, title, rationale, evidence, confidence, impact, decisionRequired,
    executiveAction: executiveAction || (decisionRequired ? 'Owner review & explicit authorization required before execution.' : 'Operational follow-up; no high-impact authorization needed.')
  };
}

export async function summarizeVisitorFunnel(db, sinceDate) {
  const since = sinceDate || new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10);
  const today = new Date().toISOString().slice(0, 10);
  let rows = [];
  try {
    rows = (await db.prepare(`SELECT metric_date, metric, dimension, value FROM intel_metric_rollups WHERE metric_date>=? ORDER BY metric_date ASC`).bind(since).all()).results || [];
  } catch { return { status: 'not_configured', note: 'Aggregate visitor analytics are not configured. No visitor numbers are shown.' }; }
  const blocked = rows.filter(r => r.metric === 'security_blocked').reduce((s, r) => s + Number(r.value || 0), 0);
  const visitorRows = rows.filter(r => r.metric !== 'security_blocked');
  if (!visitorRows.length) {
    return { status: 'not_configured', securityBlocked: blocked, securityBlocked7d: blocked, note: 'No aggregate visitor rollups recorded yet. Pulse analytics are cookie-free and aggregate-only.' };
  }
  const sum = (m, dim = null) => visitorRows.filter(r => r.metric === m && (dim === null || r.dimension === dim)).reduce((s, r) => s + Number(r.value || 0), 0);
  const pageviews = sum('pageviews', 'all') || visitorRows.filter(r => r.metric === 'pageviews').reduce((s, r) => s + Number(r.value || 0), 0);
  const todayPageviews = visitorRows.filter(r => r.metric === 'pageviews' && r.dimension === 'all' && r.metric_date === today).reduce((s, r) => s + Number(r.value || 0), 0)
    || visitorRows.filter(r => r.metric === 'pageviews' && r.metric_date === today).reduce((s, r) => s + Number(r.value || 0), 0);
  const byRoute = {};
  for (const r of visitorRows.filter(x => x.metric === 'pageviews' && x.dimension !== 'all')) {
    byRoute[r.dimension] = (byRoute[r.dimension] || 0) + Number(r.value || 0);
  }
  const waitlistFocus = sum('waitlist_focus');
  const waitlistOk = sum('waitlist_submit_ok');
  const waitlistErr = sum('waitlist_submit_err');
  const apkDownloads = sum('apk_download');
  const conversionRate = waitlistFocus > 0 ? +(waitlistOk / waitlistFocus).toFixed(4) : null;
  return {
    status: 'ok',
    today: { pageviews: todayPageviews },
    pageviews7d: pageviews,
    apkDownloads,
    apkDownloads7d: apkDownloads,
    waitlistSubmits7d: waitlistFocus,
    waitlistCompletions7d: waitlistOk,
    waitlistCompletionRate: conversionRate,
    waitlist: { starts: waitlistFocus, completed: waitlistOk, errors: waitlistErr, conversionRate },
    securityBlocked: blocked,
    securityBlocked7d: blocked,
    topRoutes: Object.entries(byRoute).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([route, views]) => ({ route, views }))
  };
}

export async function buildDailyBriefing(db, now = new Date()) {
  const until = now.toISOString(), since = new Date(now.getTime() - 86400000).toISOString();
  const checks = (await db.prepare(`SELECT target,status,latency_ms FROM intel_checks WHERE checked_at>=? AND status<>'not_configured'`).bind(since).all()).results || [];
  const open = (await db.prepare(`SELECT id,fingerprint,agent,severity,title,summary,confidence,evidence_json FROM intel_incidents WHERE status='open' ORDER BY CASE severity WHEN 'critical' THEN 5 WHEN 'high' THEN 4 WHEN 'medium' THEN 3 WHEN 'low' THEN 2 ELSE 1 END DESC LIMIT 50`).all()).results || [];
  const opened = (await db.prepare('SELECT COUNT(*) AS n FROM intel_incidents WHERE first_seen>=?').bind(since).first()).n;
  const resolved = (await db.prepare('SELECT COUNT(*) AS n FROM intel_incidents WHERE resolved_at>=?').bind(since).first()).n;
  const health = computeHealth(checks, open);
  const telemetry = (await db.prepare(`SELECT event_type, COUNT(*) AS n FROM intel_telemetry_events WHERE occurred_at>=? GROUP BY event_type`).bind(since).all()).results || [];
  const sessions = telemetry.find(t => t.event_type === 'session_start')?.n || 0;
  const errors = telemetry.filter(t => ['app_crash', 'js_error', 'http_error'].includes(t.event_type)).reduce((n, t) => n + t.n, 0);
  const crashes = telemetry.find(t => t.event_type === 'app_crash')?.n || 0;
  const crashFreeRate = sessions > 0 ? Math.max(0, (sessions - crashes) / sessions) : null;
  const visitorAnalytics = await summarizeVisitorFunnel(db, since.slice(0, 10));

  const recommendations = [];
  for (const i of open.filter(i => ['critical', 'high'].includes(i.severity)).slice(0, 5)) {
    recommendations.push(recommendation('ack-' + i.id, 'Decide: acknowledge, escalate or dismiss — ' + i.title,
      'An open ' + i.severity + ' incident requires an executive decision or explicit risk acceptance.',
      [{ type: 'incident', ref: i.id, summary: i.title + ' (source ' + i.agent + ')' }], i.confidence, 'high', true,
      `Open Incident ${i.id.slice(0, 8)} in Investigation Workspace and choose Investigate, Resolve, or Dismiss with rationale.`));
  }
  if (health.uptime !== null && health.uptime < 0.99) {
    recommendations.push(recommendation('uptime', 'Investigate availability below 99%',
      '24h uptime is ' + (health.uptime * 100).toFixed(2) + '%. Identify the failing target in ULTRON and confirm whether a route or edge fix is needed.',
      [{ type: 'checks', ref: since, summary: health.total + ' checks in 24h' }], 0.9, 'medium', false,
      'Run ULTRON verification on failing routes and inspect Cloudflare Pages deployment status.'));
  }
  for (const i of open.filter(i => i.fingerprint.startsWith('argon-regression-')).slice(0, 2)) {
    recommendations.push(recommendation('rollback-' + i.id, 'Decide: hotfix or hold the affected mobile release',
      'ARGON suspects a release regression. Confirm against sample size and ULTRON API health before acting; release rollback requires explicit owner approval.',
      [{ type: 'incident', ref: i.id, summary: i.title }], i.confidence, 'high', true,
      'Approve hotfix build or hold APK promotion on /downloads/ after reviewing session denominator.'));
  }
  if (visitorAnalytics.status === 'ok' && visitorAnalytics.waitlist?.starts >= 10 && (visitorAnalytics.waitlist.conversionRate ?? 1) < 0.15) {
    recommendations.push(recommendation('funnel-waitlist', 'Reduce waitlist conversion drop-off',
      `Only ${visitorAnalytics.waitlist.completed}/${visitorAnalytics.waitlist.starts} waitlist form starts completed in 24h (${((visitorAnalytics.waitlist.conversionRate || 0) * 100).toFixed(1)}%).`,
      [{ type: 'rollup', ref: 'waitlist_focus', summary: `${visitorAnalytics.waitlist.errors} form submission errors` }], 0.78, 'medium', true,
      'Verify Turnstile site key / D1 waitlist binding in production Cloudflare Pages settings.'));
  } else if (visitorAnalytics.status === 'not_configured') {
    recommendations.push(recommendation('analytics', 'Verify aggregate visitor analytics flow',
      'No aggregate visitor rollups recorded in the window yet. Privacy-preserving ULTRON pulse counters activate automatically once public traffic hits the deployed site (GPC/DNT respected).',
      [{ type: 'config', ref: 'docs/INTELLIGENCE-COMMAND-CENTER.md', summary: 'Aggregate-only pulse & Cloudflare Web Analytics' }], 1, 'low', false));
  }

  const challenges = open.filter(i => i.confidence < 0.65).map(i => {
    const ep = evaluateEpistemics(i);
    return {
      incidentId: i.id, title: i.title, confidence: i.confidence,
      challenge: ep.challengedAssumptions[0] || 'Confidence below threshold. AU does not endorse high-impact action without independent verification.',
      falsificationStep: ep.falsificationStep
    };
  });

  const body = [
    'AU DAILY EXECUTIVE SUMMARY — deterministic, evidence-backed; no generative model fabrication.',
    'Window: ' + since + ' to ' + until,
    'System health: ' + health.label + (health.score === null ? '' : ' (score ' + health.score + '/100)') + '. ' + health.basis,
    'Availability: ' + (health.uptime === null ? 'no data' : (health.uptime * 100).toFixed(2) + '% of ' + health.total + ' checks'),
    'Latency: avg ' + (health.avgLatencyMs ?? 'n/a') + 'ms / p95 ' + (health.p95LatencyMs ?? 'n/a') + 'ms',
    'Incidents: ' + opened + ' opened, ' + resolved + ' resolved, ' + open.length + ' currently open.',
    'App telemetry (untrusted): ' + sessions + ' sessions, ' + errors + ' error events' + (crashFreeRate !== null ? ` (${(crashFreeRate * 100).toFixed(1)}% crash-free sessions)` : ' (no session denominator)') + '.',
    'Visitor analytics (aggregate, zero PII): ' + (visitorAnalytics.status === 'ok'
      ? `${visitorAnalytics.pageviews7d} pageviews, ${visitorAnalytics.apkDownloads} APK downloads, ${visitorAnalytics.waitlist.completed}/${visitorAnalytics.waitlist.starts} waitlist completions`
      : 'NOT CONFIGURED — no visitor numbers are fabricated.'),
    challenges.length ? 'AU epistemic challenges: ' + challenges.length + ' finding(s) challenged due to untrusted client source or small sample size.' : 'AU epistemic challenges: none.',
    'Executive decisions required: ' + recommendations.filter(r => r.decisionRequired).length + ' (total recommendations: ' + recommendations.length + ').'
  ].join('\n');

  const id = 'daily-' + until.slice(0, 10);
  await db.prepare(`INSERT INTO intel_briefings (id,kind,title,body,evidence_json,delivery_status,created_at)
    VALUES (?,'daily',?,?,?,?,?)
    ON CONFLICT(id) DO UPDATE SET body=excluded.body, evidence_json=excluded.evidence_json, title=excluded.title`)
    .bind(id, 'AU daily executive summary — ' + until.slice(0, 10), body, JSON.stringify({
      since, until, health, incidents: { opened, resolved, open: open.length, openList: open.slice(0, 20).map(({ evidence_json, ...rest }) => rest) },
      telemetry: { sessions, errors, crashes, crashFreeRate }, visitorAnalytics, recommendations, challenges, classification: 'fact-unless-labelled'
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
  const visitorAnalytics = await summarizeVisitorFunnel(db, since.slice(0, 10));

  const recommendations = [];
  for (const r of recurring.slice(0, 3)) {
    recommendations.push(recommendation('recurring-' + r.fingerprint, 'Prioritize permanent architectural fix: ' + r.title,
      'This fingerprint has recurred ' + r.occurrence_count + ' times. Eliminating root cause beats repeated manual triage.',
      [{ type: 'incident', ref: r.fingerprint, summary: r.agent + ' · ' + r.severity + ' · ' + r.occurrence_count + 'x' }], 0.82, 'medium', true,
      `Authorize engineering fix for ${r.fingerprint} and verify via TITAN/ULTRON regression recheck.`));
  }
  if (mttrMinutes !== null && mttrMinutes > 240) {
    recommendations.push(recommendation('mttr', 'Reduce incident mean-time-to-resolve (' + mttrMinutes + 'm)',
      'Mean time to resolve over 7 days exceeded 4 hours. Consider approving auto-resolve-recovered-targets for verified transient outages.',
      [{ type: 'briefings', ref: since.slice(0, 10), summary: resolvedRows.length + ' incidents resolved' }], 0.72, 'medium', true,
      'Decide whether to approve the reversible auto-resolve-recovered-targets rule in Automation Governance.'));
  }
  if (features.length > 0) {
    recommendations.push(recommendation('product-opportunity-' + features[0].feature, 'Product opportunity: double down on ' + features[0].feature,
      `Aggregate opt-in usage shows "${features[0].feature}" leading mobile engagement (${features[0].n} interactions in 7d).`,
      [{ type: 'telemetry', ref: String(features[0].feature), summary: `${features[0].n} aggregate uses in 7d` }], 0.65, 'medium', false,
      'Prioritize UX polish and latency monitoring around top athlete workflows.'));
  }

  const body = [
    'AU WEEKLY STRATEGIC REPORT — deterministic, evidence-backed; no generative model fabrication.',
    'Window: ' + since.slice(0, 10) + ' to ' + until.slice(0, 10),
    'Health: ' + health.label + ' (score ' + (health.score ?? 'n/a') + '), availability ' + (health.uptime === null ? 'no data' : (health.uptime * 100).toFixed(2) + '%'),
    'Week-over-week: incidents opened ' + openedThis + ' vs ' + openedPrior + ' prior week; availability ' + (priorUptime === null ? 'no prior data' : ((priorUptime * 100).toFixed(2) + '% -> ' + (health.uptime === null ? 'n/a' : (health.uptime * 100).toFixed(2) + '%'))),
    'Mean time to resolve: ' + (mttrMinutes === null ? 'no resolutions recorded' : mttrMinutes + ' minutes (measured from first_seen to resolved_at)'),
    'Recurring fingerprints: ' + (recurring.length || 'none'),
    'Visitor & conversion summary (7d aggregate): ' + (visitorAnalytics.status === 'ok'
      ? `${visitorAnalytics.pageviews7d} pageviews, ${visitorAnalytics.apkDownloads} APK downloads, ${visitorAnalytics.waitlist.completed}/${visitorAnalytics.waitlist.starts} waitlist signups`
      : 'no aggregate rollups recorded'),
    'Most-used app features (aggregate, consent-gated): ' + (features.length ? features.map(f => f.feature + ' (' + f.n + ')').join(', ') : 'no feature telemetry recorded'),
    'Progress signals: ' + (openedThis < openedPrior ? 'fewer new incidents than last week' : 'new incidents flat or higher than last week') + '; ' + resolvedRows.length + ' incidents resolved.'
  ].join('\n');

  const id = 'weekly-' + until.slice(0, 10);
  await db.prepare(`INSERT INTO intel_briefings (id,kind,title,body,evidence_json,delivery_status,created_at)
    VALUES (?,'weekly',?,?,?,?,?)
    ON CONFLICT(id) DO UPDATE SET body=excluded.body, evidence_json=excluded.evidence_json, title=excluded.title`)
    .bind(id, 'AU weekly strategic report — week of ' + since.slice(0, 10), body, JSON.stringify({
      since, until, health, recurring, mttrMinutes, openedThis, openedPrior, priorUptime,
      features, visitorAnalytics, recommendations, classification: 'fact-unless-labelled'
    }), 'not_configured', until).run();
  return { id, recurring: recurring.length, recommendations: recommendations.length };
}

// ---------- urgent alerts & delivery ----------
async function hmacHex(secret, text) {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return [...new Uint8Array(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(text)))].map(b => b.toString(16).padStart(2, '0')).join('');
}

export async function raiseUrgent(db, env, incident, fetcher = fetch) {
  const bucket = Math.floor(Date.now() / (6 * 3600000));
  const id = 'urgent-' + bucket + '-' + incident.fingerprint.replace(/[^a-z0-9\-]/gi, '').slice(0, 60);
  const existing = await db.prepare('SELECT id FROM intel_briefings WHERE id=?').bind(id).first();
  if (existing) return { id, deduped: true };
  const title = 'URGENT — ' + incident.title;
  const body = 'AU URGENT ALERT\nSeverity: ' + incident.severity + '\nSource: ' + incident.agent + ' (fingerprint ' + incident.fingerprint + ')\nObserved: ' + (incident.last_seen || nowIso()) + '\n\n' + incident.summary + '\n\nDecision required: Open the Intelligence Command Center to inspect primary evidence and authorize response.';
  await db.prepare(`INSERT INTO intel_briefings (id,kind,title,body,evidence_json,delivery_status,created_at) VALUES (?,'urgent',?,?,?,'not_configured',?)`)
    .bind(id, title, body, JSON.stringify({ fingerprint: incident.fingerprint, agent: incident.agent, severity: incident.severity, classification: 'fact', sourceIncident: incident.id || null, decisionRequired: true }), nowIso()).run();
  const rule = await isRuleEnabled(db, 'urgent-notification');
  let delivery = 'not_configured', note = 'webhook destination not configured';
  if (!rule.enabled) { delivery = 'not_configured'; note = 'automation rule disabled at time of alert'; }
  if (rule.enabled && env?.INTEL_WEBHOOK_URL) {
    try {
      const payload = JSON.stringify({ source: 'MONTE WO Intelligence', kind: 'urgent', title, body, briefingId: id });
      const headers = { 'Content-Type': 'application/json' };
      if (env.INTEL_WEBHOOK_SECRET) headers['X-MW-Signature'] = 'v1=' + await hmacHex(env.INTEL_WEBHOOK_SECRET, payload);
      const res = await fetcher(env.INTEL_WEBHOOK_URL, { method: 'POST', headers, body: payload, signal: AbortSignal.timeout(10000) });
      delivery = res.ok ? 'sent' : 'failed';
      note = 'delivery attempt logged (HTTP ' + res.status + ')';
    } catch (error) { delivery = 'failed'; note = 'delivery attempt failed: ' + (error?.name || 'network-error'); }
  }
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
