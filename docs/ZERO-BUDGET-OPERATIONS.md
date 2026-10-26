# MONTE WO — Zero-Budget Operations Framework

**Stance: $0 recurring budget unless the owner explicitly approves spending.** This document records the free allowances the intelligence system runs on, what we measure, what would trigger cost, and what to do before hitting a wall. **Nothing here is claimed to be permanently free** — allowances are vendor terms that can change; they are re-verified quarterly and after any Cloudflare pricing announcement.

## Allowances in use (verified 2026-10-24)

| Resource | Free allowance | Source (accessed 2026-10-24) |
| --- | --- | --- |
| Workers requests | 100,000 / day | developers.cloudflare.com/workers/platform/limits/ |
| Workers CPU time | 10 ms / invocation | same |
| Cron Triggers | 5 / account | same |
| Worker bundle size | 64 MiB uncompressed | same |
| D1 rows read | 5,000,000 / day | developers.cloudflare.com/workers/platform/pricing/ |
| D1 rows written | 100,000 / day | same |
| D1 storage | 5 GB total (500 MB max per database, 10 databases) | developers.cloudflare.com/d1/platform/limits/ |
| Pages static assets | unlimited requests/bandwidth for static content | cloudflare.com/developer-platform/products/d1/ + Pages docs |

**Critical operational fact:** since **2026-09-01** Cloudflare *hard-enforces* the D1 daily caps — queries fail until 00:00 UTC once exceeded. This means overruns cannot silently create cost on the free plan; they create **downtime** instead. The changelog: developers.cloudflare.com/changelog/post/2026-09-01-d1-free-tier-limit-enforcement/. That is why usage is measured and warned at 80%, before the cap.

## What we measure (and what we honestly cannot)

The `GET /api/intelligence/budget` endpoint and the overview **Free-allowance budget** panel report:

- **D1 rows written today — measured.** Counted per table from our own timestamped writes since 00:00 UTC.
- **D1 storage — measured** via SQLite page statistics when the platform exposes them; reported as *unavailable* (never zero) when not.
- **D1 rows read today — estimate, labelled as such.** Derived from measured activity (checks, ingested events, agent runs) multiplied by documented query shapes. It is **not** a meter reading and is never presented as one.
- **Per-table row counts** for the retention picture.

Estimates are marked `measured: false` in the API and `~` in the dashboard. Unavailable values are `null`, never substituted.

## Alert thresholds

| State | Condition | Action |
| --- | --- | --- |
| OK | every measured usage < 80% of its allowance | continue |
| WARN | any measured usage ≥ 80% of a daily allowance | reduce check frequency, batch telemetry, review retention before the cap |
| CRITICAL | a daily allowance exhausted | D1 queries fail until 00:00 UTC; reduce write frequency; recovery is automatic at reset |

## Cost triggers (what would start spending)

1. **Upgrading from the Workers Free plan** ($5/month minimum) — the only in-platform path to cost. Requires explicit owner approval.
2. **Domain registration/renewal** and any non-Cloudflare service — outside this framework; explicit approval required.
3. There is **no path to accidental D1 overage billing** on the free plan (hard caps), and no paid AI APIs, analytics, subscriptions, or always-on infrastructure are used anywhere in this system.

## Design rules that keep usage inside the allowances

- Static pages for all athlete-facing content; the Worker only serves `/api/intelligence/*` and cron jobs.
- Checks are lightweight GETs; telemetry intake is batched (up to 100 events per request) and rate-limited per minute/day.
- Expensive analysis (ARGON scans, TITAN audits) runs on a schedule or on operator action — not per request.
- Alerts are deduplicated by fingerprint; briefings are generated a few times per day, not per view.
- Client caches aggressively (`cache: no-store` only on the small dashboard API calls) and auto-refresh pauses when the tab is hidden.
- Retention sweep drops old telemetry and rate-limit rows (see `retentionSweep` in `server/intelligence/core.js`).
- Competitor research is batched quarterly from public pages — no continuous crawling.

## Operating schedule (what runs when)

| Job | Cadence | Cost shape |
| --- | --- | --- |
| ULTRON website checks | 5-minute cron | ~4 targets × 1 row written each + bounded reads |
| ARGON telemetry analysis + AU correlation | hourly | ≤ 500 rows scanned per run |
| Daily briefing | 11:17 UTC | a few rows |
| Weekly briefing | Mondays 11:23 UTC | a few rows |
| TITAN improvement audit | after each app release or monthly | source fetches + bounded scans |
| Competitor research | quarterly, manual | none (public pages, batched) |

At this schedule, projected steady-state usage stays far below 1% of every daily allowance for a pilot-sized deployment; the budget panel exists to *prove* that from measurements as usage grows, not to assume it.

## If $0 ever stops being viable

Before proposing any paid option, the framework requires: (1) the measured usage numbers from the budget endpoint, (2) the free alternative that was tried or rejected and why, (3) the cheapest possible paid change (e.g., $5/month Workers Paid) with its exact benefit, and (4) owner approval. Shrinking demand (longer intervals, shorter retention, fewer targets) is always evaluated first.

## Re-verification log

| Date | Verified by | Notes |
| --- | --- | --- |
| 2026-10-24 | Arena agent (session) | All limits re-checked against official docs; D1 hard-enforcement changelog confirmed; alert threshold set at 80% |
