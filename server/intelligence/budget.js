// $0-budget framework — measure what we spend against free allowances.
//
// MONTE WO operates on $0 recurring budget. Cloudflare's free allowances are generous but
// FINITE and (since 2026-09-01) HARD-ENFORCED: D1 queries fail past 5M rows read or 100k rows
// written per day until 00:00 UTC. This module measures what is measurable from inside the
// Worker and labels estimates honestly:
//
//   measured  — read directly from the database (row counts, page counts, per-table inserts today)
//   estimated — derived from documented query patterns, never presented as a meter reading
//
// It never claims anything is permanently free: limits are recorded with their source and the
// date they were verified, and the budget view states what would trigger cost (upgrading off
// the Workers Free plan).
import { nowIso } from './core.js';

// Free-plan allowances in effect, verified 2026-10-24 against Cloudflare's public docs.
// Re-verify quarterly (see docs/ZERO-BUDGET-OPERATIONS.md).
export const FREE_LIMITS = Object.freeze({
  workersRequestsPerDay: 100000,
  d1RowsReadPerDay: 5000000,
  d1RowsWrittenPerDay: 100000,
  d1StorageBytes: 5 * 1024 * 1024 * 1024,
  d1MaxDatabaseBytes: 500 * 1024 * 1024,
  cronTriggersPerAccount: 5,
  cpuMsPerInvocation: 10,
  verifiedAt: '2026-10-24',
  sources: [
    'https://developers.cloudflare.com/workers/platform/pricing/',
    'https://developers.cloudflare.com/workers/platform/limits/',
    'https://developers.cloudflare.com/d1/platform/limits/',
    'https://developers.cloudflare.com/changelog/post/2026-09-01-d1-free-tier-limit-enforcement/'
  ]
});

// Warn at 80% of a daily allowance so there is time to react BEFORE the hard stop.
export const WARN_THRESHOLD = 0.8;

const pctOf = (used, limit) => limit > 0 ? Math.min(used / limit, 1) : 0;
const midnightUtc = () => new Date(new Date().toISOString().slice(0, 10) + 'T00:00:00.000Z').toISOString();

// Tables the intelligence system writes to, with the column holding the write timestamp.
const WRITE_TABLES = [
  ['intel_telemetry_events', 'received_at'],
  ['intel_checks', 'checked_at'],
  ['intel_incidents', 'last_seen'],
  ['intel_agent_runs', 'started_at'],
  ['intel_briefings', 'created_at'],
  ['intel_audit', 'created_at'],
  ['intel_improvement_items', 'updated_at'],
  ['intel_metric_rollups', 'day']
];

async function scalar(db, sql, ...bind) {
  try {
    const row = await db.prepare(sql).bind(...bind).first();
    return row ? Object.values(row)[0] : 0;
  } catch {
    return null; // unavailable ≠ zero
  }
}

export async function budgetStatus(db) {
  const since = midnightUtc();

  // --- measured: storage via SQLite page statistics (falls back to null when unsupported)
  const pageSize = await scalar(db, 'PRAGMA page_size');
  const pageCount = await scalar(db, 'PRAGMA page_count');
  const storageBytes = pageSize && pageCount ? pageSize * pageCount : null;

  // --- measured: rows written today, per table, from our own timestamped writes
  const writesToday = {};
  let writesTotal = 0;
  for (const [table, column] of WRITE_TABLES) {
    const n = await scalar(db, `SELECT COUNT(*) AS n FROM ${table} WHERE ${column} >= ?`, since);
    if (n !== null) { writesToday[table] = n; writesTotal += n; }
  }

  // --- measured: total rows per table (retention picture)
  const tableRows = {};
  for (const [table] of WRITE_TABLES) {
    const n = await scalar(db, `SELECT COUNT(*) AS n FROM ${table}`);
    if (n !== null) tableRows[table] = n;
  }

  // --- estimated: daily row reads. Derived from documented query shapes, NOT a meter reading:
  // ULTRON checks (5-min cron): ~4 targets x (1 check insert + incident lookups) ≈ small;
  // overview: ~15 bounded queries; ARGON hourly analysis scans up to 500 recent events;
  // telemetry ingest: ~1-2 rows read per event for idempotency + rate limits.
  // This estimate is recalculated from actual activity counts so it scales with reality.
  const checksToday = writesToday['intel_checks'] || 0;
  const telemetryToday = writesToday['intel_telemetry_events'] || 0;
  const agentRunsToday = writesToday['intel_agent_runs'] || 0;
  const estRowsRead = Math.round(
    checksToday * 12 +          // check pipeline: insert + incident upserts + lookups
    telemetryToday * 3 +        // ingest: rate limit + idempotency + insert
    agentRunsToday * 500 +      // ARGON analysis scans recent events (LIMIT 500)
    2000                        // operator/dashboard queries across a day (bounded, cached client-side)
  );

  const writePct = pctOf(writesTotal, FREE_LIMITS.d1RowsWrittenPerDay);
  const readPct = pctOf(estRowsRead, FREE_LIMITS.d1RowsReadPerDay);
  const storagePct = storageBytes !== null ? pctOf(storageBytes, FREE_LIMITS.d1StorageBytes) : null;

  // Status: OK / WARN / CRITICAL against the warn threshold. Fail open on unmeasurable values
  // (they are reported as null, never as zero).
  const states = [];
  if (writePct >= 1) states.push('CRITICAL'); else if (writePct >= WARN_THRESHOLD) states.push('WARN');
  if (readPct >= 1) states.push('CRITICAL'); else if (readPct >= WARN_THRESHOLD) states.push('WARN');
  if (storagePct !== null) { if (storagePct >= 1) states.push('CRITICAL'); else if (storagePct >= WARN_THRESHOLD) states.push('WARN'); }
  const status = states.includes('CRITICAL') ? 'CRITICAL' : states.includes('WARN') ? 'WARN' : 'OK';

  return {
    status,
    checkedAt: nowIso(),
    usage: {
      storageBytes: { value: storageBytes, measured: storageBytes !== null, limitBytes: FREE_LIMITS.d1StorageBytes, usedPct: storagePct },
      rowsWrittenToday: { value: writesTotal, measured: true, limit: FREE_LIMITS.d1RowsWrittenPerDay, usedPct: writePct, byTable: writesToday },
      rowsReadToday: { value: estRowsRead, measured: false, limit: FREE_LIMITS.d1RowsReadPerDay, usedPct: readPct, note: 'Estimate derived from measured activity x documented query shapes — not a meter reading.' }
    },
    tableRows,
    limits: FREE_LIMITS,
    costTriggers: [
      'Upgrading from the Workers Free plan ($5/month minimum) — the only way cost starts.',
      'D1 usage beyond free allowances is impossible to incur accidentally on Workers Free: queries fail closed at the daily cap (hard enforcement since 2026-09-01) rather than billing.',
      'Domain registration/renewal and non-Cloudflare services are outside this budget and require explicit approval.'
    ],
    nextAction: status === 'OK'
      ? 'Within free allowances. Re-verify limits quarterly (docs/ZERO-BUDGET-OPERATIONS.md).'
      : status === 'WARN'
        ? 'Above 80% of a daily allowance: reduce check frequency or batch telemetry ingest before the hard cap.'
        : 'A daily allowance is exhausted — D1 queries will fail until 00:00 UTC. Reduce write frequency; never upgrade to a paid plan without explicit approval.'
  };
}
