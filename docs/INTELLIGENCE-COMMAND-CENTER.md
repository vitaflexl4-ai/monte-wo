# MONTE WO Intelligence Command Center

**Status: implementation complete and locally tested — NOT deployed, NOT live.**
No production telemetry exists yet. Every "live" indicator is derived from recorded evidence; the
system fails closed and labels absent data as absent. Nothing on the dashboard is simulated.

Agents:

| Agent | Domain | Duties |
|---|---|---|
| **ARGON** | Mobile app | Crash/error/login-failure telemetry intake (privacy-bounded, untrusted), release-regression detection, new error signatures |
| **ULTRON** | Website | Scheduled availability/latency/route checks, escalation, recovery verification |
| **AU** | Coordination | Cross-agent correlation, challenging weak conclusions, daily/weekly/urgent briefings, bounded automation governance |

## Architecture

```
 Mobile app (consent-gated telemetry) ──► POST /api/intelligence/events (key-gated, validated, rate-limited)
                                              │
 Operator browser ◄── /intelligence/ (SPA) ──► /api/intelligence/*  (Cloudflare Access JWT verified
      │                                          server-side + intel_operators RBAC)
      │                                          │
      ▼                                          ▼
 Cloudflare Pages Functions ──────────────► D1 "monte-wo-intelligence" (dedicated database)
      (functions/api/[[route]].js                 ▲
       → server/intelligence/api.js)              │ shared logic
                                                 │
 Scheduled Worker (intelligence-worker/) ────────┘
      */5 * * * *   ULTRON checks (all targets) + dedup + escalation + recovery
      3 * * * *     ARGON 24h telemetry analysis + AU correlation
      17 11 * * *   AU daily executive briefing + retention sweep (rule-gated)
      23 11 * * 1   AU weekly strategic report
```

Both the Pages Functions and the Worker import the same logic from `server/intelligence/core.js`,
so the manual "Verify now" button and the scheduled cron behave identically.

### Files

- `migrations/0003_intelligence.sql`, `migrations/0004_intelligence_ops.sql` — schema (apply both, in order)
- `server/intelligence/` — `auth.js` (Access JWT + operator RBAC), `api.js` (routes), `core.js` (shared engine), `telemetry.js` (intake contract), `errors.js`
- `intelligence-worker/` — scheduled runtime (`src/index.js`, `wrangler.toml`)
- `public/intelligence/` — private dashboard SPA (no framework, no dependencies, CSP-strict)
- `apps/mobile/src/telemetry.ts` — consent-gated ARGON client for the Expo app
- `tests/intelligence.test.js` — 27 tests: real SQLite, real RS256 keys, full pipelines

## Monitoring model

### ULTRON — website checks (every 5 minutes)

Targets default to `/` (website-home) and `/api/status` (api-status); add more via `INTEL_TARGETS`.
Each check is classified `ok` / `degraded` (4xx or slow) / `down` (5xx or network failure) and recorded.
Incidents are deduplicated by fingerprint (`ultron-unavailable-<target>`, `ultron-route-error-<target>`,
`ultron-slow-<target>`):

- **Escalation (deterministic):** 3 consecutive failures → severity high; 6 → critical + urgent alert record.
- **Recovery verification:** every pass increments a recovery streak. With the
  `auto-resolve-recovered-targets` rule **approved**, two consecutive verified passes auto-resolve the
  incident (audited, rollback = reopen). Without approval, the incident stays open with an explicit
  recovery candidate for human confirmation.
- **Honesty:** if `SITE_URL` is unset, ULTRON records a `not_configured` check (max 1/hour) — it never
  reports healthy when it could not check. A network failure is flagged as possibly monitor-side.

### ARGON — mobile telemetry (hourly analysis over a 24h window)

The app sends bounded events (`session_start`, `app_crash`, `js_error`, `http_error`, `login_failed`,
`slow_interaction`, `feature_used`). The server rejects unknown fields, identifiers, free-form text and
oversized values — see `server/intelligence/telemetry.js`. Because mobile clients cannot hold secrets,
**all ARGON telemetry is untrusted**: findings are labelled `hypothesis`, confidence is capped at 0.75,
and missing denominators (errors without `session_start` events) are labelled `missing-data` instead of
being computed into a fake rate.

Detectors: release regression (error rate ≥ 2× the same version's prior-7-day baseline, ≥ 5 errors,
≥ 5 sessions), new error signature (first-ever fingerprint with ≥ 3 events), login-failure spike
(> 20% of sessions, ≥ 10 sessions), errors without denominator.

### AU — coordination (hourly correlation, daily/weekly briefings)

- **Correlation:** a ULTRON API-route failure plus an ARGON app-side error within 30 minutes creates one
  AU incident citing both members (one pairing per co-occurrence — no duplicate spam). The correlation
  resolves only when every member resolves. Labelled `hypothesis`: temporal co-occurrence, shared cause unverified.
- **Challenges:** every open finding with confidence < 0.6 is listed in briefings as an AU challenge —
  AU explicitly refuses to endorse action on it without verification.
- **Health score:** deterministic — 24h check success rate minus incident penalties
  (critical −15, high −8, medium −4, low −1). `NO DATA` when no checks exist.

### Briefings (three levels)

1. **Urgent** — created when an incident escalates to critical (deduplicated to one per fingerprint per 6h).
   Delivery requires the `urgent-notification` rule **and** `INTEL_WEBHOOK_URL`; attempts are logged in
   `intel_notifications` with an HMAC-SHA256 `X-MW-Signature` header.
2. **Daily (11:17 UTC)** — health, availability, p95/avg latency, incidents opened/resolved/open,
   app telemetry counts, visitor rollups if configured, recommendations and challenges.
   Regenerating the same day updates the same row (idempotent).
3. **Weekly (Mon 11:23 UTC)** — recurring fingerprints, MTTR proxy, week-over-week deltas,
   most-used features (aggregate), progress signals.

Every recommendation carries: evidence references (clickable into the incident workspace), confidence,
impact, and whether a **decision is required from you**. Nothing is phrased as generative AI output;
all briefings are deterministic assemblies of recorded evidence.

## Security model

- **Authentication:** Cloudflare Access JWT (RS256, verified against the Access CDN keys, issuer/audience
  pinned via `INTELLIGENCE_ACCESS_ISSUER`/`INTELLIGENCE_ACCESS_AUD`). Protect BOTH `/intelligence/` and
  `/api/intelligence/*` with the same Access application; the API verifies every request independently —
  a hidden URL is never the control.
- **Authorization:** `intel_operators` table (subject, role `admin`/`viewer`, active). Viewer = read-only;
  mutations (status changes, automation approvals, manual verification) require admin. An authenticated
  identity without a row is refused.
- **Least privilege:** dedicated D1 database — the intelligence schema cannot read or write waitlist,
  strength-index or mobile app data (enforced by separate bindings, asserted in tests).
- **Secrets:** `INTELLIGENCE_INGEST_KEY`, `INTEL_WEBHOOK_URL`, `INTEL_WEBHOOK_SECRET`, `INTEL_WORKER_KEY`
  are Worker/Pages secrets (`wrangler secret put`), never repo files.
- **Rate limits:** operator 600 req/h (mutations), ingest key 60 req/min + 400 events/day volume cap,
  manual verification 6/h. Keys are opaque; no raw IPs stored.
- **CSRF:** browser mutations require same-origin `Origin`; native clients authenticate with the ingest key.
- **Audit:** every operator action, automation decision, escalation and auto-resolution is written to
  `intel_audit` with actor, target, outcome and timestamp.
- **Dashboard hardening:** `/intelligence/*` ships `X-Robots-Tag: noindex`, `Cache-Control: no-store`,
  and a strict CSP (`default-src 'self'`, no inline scripts). All dynamic DOM is built with
  `textContent` — no `innerHTML` on server data.

## Privacy

- Telemetry is **consent-gated in the app** (`apps/mobile/src/telemetry.ts` refuses to send without
  `setConsent(true)`) and **contract-limited on the server** (unknown fields rejected, whole batch fails).
- No user identifiers, credentials, message contents, workout data or precise location. Session references
  are random and rotate daily.
- Visitor analytics are aggregate-only daily rollups (`intel_metric_rollups`) — no per-visitor records,
  no covert identity resolution, no individual profiling.
- Retention (with the `retention-purge` rule approved): raw checks 30 days, telemetry 60 days,
  notification logs 90 days. Incidents, briefings, audit history and rollups are never auto-deleted.

## Bounded autonomy

Monitoring and analysis run automatically once configured. Automated *actions* map to exactly three
named rules in `intel_automation_rules`, all **disabled by default**:

| Rule | Effect when approved | Rollback |
|---|---|---|
| `auto-resolve-recovered-targets` | Auto-resolve availability incidents after 2 verified passes | Reopen from the UI; history retained |
| `retention-purge` | Daily retention deletion per the table above | Disable rule; purged raw rows are not restorable |
| `urgent-notification` | Webhook delivery of urgent alerts | Disable rule; ignore delivered messages |

Approving a rule requires an admin, a typed confirmation matching the rule id, and produces an audit
record. **Never automated:** production deployments, destructive database operations, account
restrictions, security-blocking decisions. Every automated effect is auditable and reversible.

## Deployment checklist (exact order)

1. `npx wrangler d1 create monte-wo-intelligence` (dedicated database — do not reuse the waitlist/app DB).
2. Apply migrations to it: `npx wrangler d1 migrations apply monte-wo-intelligence --local` (verify), then remotely.
3. Pages project: add the `INTEL_DB` D1 binding (see `wrangler.toml`), set vars
   `INTELLIGENCE_ACCESS_ISSUER` (your team's `https://<team>.cloudflareaccess.com`) and
   `INTELLIGENCE_ACCESS_AUD` (the Access application's AUD tag).
4. Create a Cloudflare Access application covering both `/intelligence` and `/api/intelligence/*`
   with an explicit allowlist policy. Do not rely on URL secrecy.
5. Provision operators: `INSERT INTO intel_operators(subject, role) VALUES('<access-subject>','admin');`
   — the subject is the email/identity Access authenticates.
6. Worker: `cd intelligence-worker`, uncomment the D1 binding in `wrangler.toml` with the real id,
   set `SITE_URL` to the confirmed production origin, `INTELLIGENCE_ENABLED="true"`, then
   `npx wrangler deploy`. Verify `GET <worker-url>/health` shows `dbBound: true`.
7. Secrets: `wrangler secret put INTEL_WEBHOOK_SECRET` / `INTEL_WORKER_KEY` on the worker;
   `INTEL_WEBHOOK_URL` if alerting; on Pages set `INTELLIGENCE_INGEST_KEY` if enabling app telemetry.
   Extra monitored routes optionally via `INTEL_TARGETS`.
8. Smoke test: open `/intelligence/` (should show agent states, no fabricated data), click
   **Refresh**, run a manual verification from the Overview → agent card action, and check
   `intel_agent_runs` recorded it. Trigger `POST <worker-url>/run?job=checks` with the worker key.
9. Approve automation rules only after reviewing this document. Until then everything is manual.

Until steps 1–8 are done and verified, the command center is not operational — and it says so.

## Verification performed (this branch)

- `npm run test:intelligence` — **28/28 passing** (auth incl. forged/expired/wrong-issuer tokens,
  RBAC, local-bypass scope, telemetry contract, ingest idempotency + rate limits, ULTRON
  dedup/escalation/recovery/auto-resolve gating, ARGON detectors incl. missing-denominator honesty,
  AU correlation + follow-the-members resolution, daily/weekly briefings, health computation,
  retention gating, all API routes incl. on-demand analysis/briefing, worker cron dispatch and
  fail-closed states). Tests use real SQLite (the `tests/fixtures/d1_sqlite.py` harness) and real
  RS256 keys — no mocked crypto.
- **End-to-end local preview verified**: `wrangler pages dev` with a local `INTEL_DB`, both
  migrations applied, then the real pipeline driven through the real API — 74 telemetry events
  ingested (idempotent retry verified), live ULTRON checks against the running site (a deliberately
  broken demo route was correctly detected as a 404 incident), ARGON analysis detecting the seeded
  release regression, and a daily briefing with decision-required recommendations. A DOM smoke test
  of the dashboard (all 7 views, incident drawer with evidence, briefings, automation governance,
  audit, no JS errors) passed against those live API responses.
- `npx wrangler deploy --dry-run --config intelligence-worker/wrangler.toml` — the worker bundles
  correctly (44 KiB / 12 KiB gzip) including the shared core imported from `server/intelligence/`.
- Full suite `npm test` after `npm run build`: 190/194 — the 4 failures are pre-existing on `main`
  (website route-count pin and pinned-source checks; verified identical on a clean `main` checkout)
  and unrelated to intelligence. Without a fresh build, 3 further stale-artifact failures also
  pre-exist because committed generated files are older than the test expectations.
- `scripts/build_website.py` was hardened to exclude `/intelligence/` from public route walking:
  the private dashboard must not receive public site CSS/JS, social metadata, or appear in
  `website-routes.json`/the sitemap. Its `noindex` meta stays intact and the strict CSP comes from
  `_headers`.
- No production deployment, database change or Cloudflare configuration was performed.

## Local preview

```sh
npx wrangler pages dev public --d1 DB --d1 INTEL_DB --binding LOCAL_DEVELOPMENT=true --ip 0.0.0.0 --port 8080
# apply migrations to the local INTEL_DB, then open /intelligence/
```

With `LOCAL_DEVELOPMENT=true` on a localhost hostname the API accepts a local admin (same preview
convention as the waitlist). This bypass can never run on a public hostname.
