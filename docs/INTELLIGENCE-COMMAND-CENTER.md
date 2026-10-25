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
| **TITAN** | Continuous app improvement | Audits the app's own sources + telemetry for simpler/faster/more reliable/cheaper alternatives (preferring REMOVAL of complexity), maintains the evidence-backed improvement backlog, verifies implemented improvements for regressions |

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

- `migrations/0003_intelligence.sql` → `0005_intelligence_titan.sql` — schema (apply in order; 0005 adds the TITAN improvement backlog and registers TITAN in the agent-run log)
- `server/intelligence/` — `auth.js` (Access JWT + operator RBAC + preview-token hardening), `api.js` (routes), `core.js` (shared engine), `titan.js` (improvement audit engine), `budget.js` ($0-allowance measurement), `telemetry.js` (intake contract), `errors.js`
- `intelligence-worker/` — scheduled runtime (`src/index.js`, `wrangler.toml`)
- `public/intelligence/` — private dashboard SPA (no framework, no dependencies, CSP-strict) + `competitors.json` (living competitor matrix data)
- `apps/mobile/src/telemetry.ts` — consent-gated ARGON client for the Expo app
- `content/intelligence/competitors.json` + `docs/COMPETITOR-MATRIX.md` — batched, sourced, labelled competitor research
- `docs/ZERO-BUDGET-OPERATIONS.md` — the $0 framework: allowances, measurements, cost triggers
- `scripts/preview-intelligence.mjs` + `scripts/preview-proxy.mjs` — one-command private local preview
- `tests/intelligence.test.js` — 37 tests: real SQLite, real RS256 keys, full pipelines

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

## TITAN — continuous app improvement (Phase 2)

TITAN's mandate is to make the app **simpler, faster, more reliable, easier to understand and
cheaper to operate — preferring removal of complexity over addition of features.**

- **Audit** (`POST /api/intelligence/improve`, or the ⬢ button): runs deterministic checks over
  the app sources (fetched read-only from `TITAN_SOURCES_URL` — local/CI only) and the telemetry
  ARGON actually collected. Every finding carries machine evidence (file refs, counts, telemetry
  fingerprints), an evidence type (`static-analysis` / `telemetry` / `manual-review`), a confidence
  value, a proposed change, benefit/cost/risk, a test plan and a rollback plan.
- **Findings that no longer fire are parked automatically** (with an honest note); if sources are
  unavailable, source-based findings are *not* judged — silence is not evidence of a fix.
- **Human decisions are authoritative and preserved across re-runs.** Approve / reject / park /
  implement / recheck are operator actions, each audited. TITAN itself never edits code.
- **Approval guardrails:** items touching ranking standards, major redesigns, migrations,
  destructive operations, sensitive data or production are hard-flagged (`approval_flags_json`)
  and can NEVER be approved without an explicit per-flag acknowledgment (`acknowledged` array).
  MONTE WO's rank thresholds can never be weakened by an improvement item.
- **Recheck** (`?action=recheck`): re-runs the audit and reports whether the original detector
  still fires. `passed: true` = verified effective; `passed: false` = regression/incomplete fix.
- **Dashboard:** dedicated *TITAN improvements* view (backlog table, full-item drawer with
  evidence/plans/decision trail, action buttons with acknowledgment checkbox for flagged items).

### First real improvement loop (completed 2026-10-24)

1. Audit detected `a11y-unlabelled-touchables` from real source analysis (10 of 19 touchable
   controls had no `accessibilityLabel`) — approved as low-risk via the API.
2. Implemented for real: 11 labels added in `apps/mobile/App.tsx` (19/19 controls labelled).
   Verified: `tsc --noEmit` clean, mobile suite 37/37 (see below).
3. Recorded with test evidence, then **recheck passed** — the detector no longer fires against
   the fixed source. The loop is closed and repeatable.
4. A false-positive finding (`nav-recording-depth` — the app already has a direct "Log a
   performance" action) was caught by re-verification and **auto-parked with an honest note**.
5. Related fix outside TITAN: `apps/mobile/eas.json` was missing the `preview` build profile its
   own security test expects (internal-APK risk acceptance gate) — the test had failed since the
   profile's introduction; restored, suite now green.

## AU ROOM — 3D operations floor (Phase 5)

`#/room` renders the agents on a 3D operations floor (custom dependency-free canvas renderer —
no external libraries, CSP-clean). Layout follows the product brief: **ARGON's blue mobile/app
station left, ULTRON's red website-health station right, AU central coordinator at the holo
table, TITAN at a distinct side station (research/proposals only), and the human owner —
Vitaflex (Sony) — seated at the central command console**, labelled Owner/Operator and never
portrayed as an AI agent. Visual target: `docs/INTELLIGENCE-ROOM-README.md` +
`docs/assets/intelligence-command-center-concept.png` (concept art only — its sample metrics
are never copied into the product as real data).

Every agent carries a reality-mode chip from a fixed taxonomy derived only from real API state:
**LIVE** (runs recorded), **IDLE / WAITING** (e.g. ARGON before telemetry exists), **NOT
CONNECTED** (backend unreachable / integration absent — ULTRON's screen states "traffic
analytics: NOT CONNECTED" until an aggregate-only provider integration exists), **FAILED**.
**The room is a live visualization of real activity, not a simulation of fictitious work:**

- **Every screen value comes from the authenticated API** (overview, timeline, incidents,
  improvements — polled every 12 s): ULTRON's targets/uptime/latency, ARGON's telemetry state,
  AU's correlations and open incidents, TITAN's finding backlog.
- **Avatar states are computed from real run data:** an agent whose last run just finished
  works at its console with a flourish; an agent with no telemetry (ARGON before the app
  integrates the consent-gated client) stands idle with an explicit "awaiting data" screen;
  a failed agent goes dark. Idle agents look idle — nothing is scripted busy-work.
- **Motions are representational and labelled as such** (fixed caption in the HUD): AU patrols
  because its real job is cross-agent correlation; when a **new real timeline event** arrives,
  the agent that produced it walks to the central table and the event card (real title, real
  timestamp) appears above it.
- **"What's real right now"** lists, per agent, the exact real fact behind the current
  animation; clicking a name tag opens the full run history. The owner console shows the latest
  real AU briefing and states that automation + TITAN proposals require explicit owner approval.
  The action buttons trigger real runs (`POST /verify`, `POST /improve`) and report their real
  results. TITAN's screen is marked "proposals only until owner approval".
- Camera: drag to orbit, scroll/pinch to zoom, double-click to reset; `prefers-reduced-motion`
  disables auto-orbit, walking and flicker.

## Zero-budget framework (Phase 4)

- `GET /api/intelligence/budget` + the overview **Free-allowance budget** panel measure usage
  against Cloudflare's free allowances (limits verified 2026-10-24, sources cited in the API).
- **Measured:** D1 rows written today (per table, from our own timestamped writes) and storage
  (when the platform exposes page statistics). **Estimated and labelled as such:** rows read.
  Unavailable values are reported as `null`, never as zero.
- D1 daily caps are **hard-enforced since 2026-09-01** (queries fail until 00:00 UTC), so the
  dashboard warns at **80%** of any allowance before the stop. Full framework, cost triggers and
  the if-$0-fails procedure: `docs/ZERO-BUDGET-OPERATIONS.md`.

## Competitor research (Phase 3)

- Living matrix: `content/intelligence/competitors.json` (rendered in the TITAN view) +
  `docs/COMPETITOR-MATRIX.md`. Researched 2026-10-24 from official pages, store listings and help
  centres; reviewer opinions and marketing claims are labelled as such; every entry carries source
  links and the research date.
- Cadence: **batched quarterly or on major releases** — never continuous crawling ($0 rule).
- Only lessons that fit MONTE WO's identity are adopted (minimal-tap recording, next-action
  clarity, never locking history behind payment, keeping provisional/estimated/verified distinct,
  offline-first). Social feeds, unverified leaderboards and paid AI programming are explicitly
  NOT emulated.

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

- `npm run test:intelligence` — **37/37 passing** (auth incl. forged/expired/wrong-issuer tokens,
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
- **Real-browser e2e (this branch, 2026-10-24):** `tests/intelligence-browser.mjs` against the
  token-gated private preview with a real Chromium — overview KPIs, all 8 views (incl. TITAN
  backlog + competitor matrix + budget panel), incident drawer with evidence, briefings,
  automation governance, 5 responsive layouts (390–1500px) with no horizontal overflow, security
  headers, and **zero console/page errors**. Fixing this surfaced and removed CSP `style-src`
  violations (inline styles now applied via CSP-safe CSSOM in the SPA's `el()` helper — the
  strict CSP itself was not weakened).
- **AU ROOM verified in a real browser (2026-10-25):** all 4 avatars/tags/holo screens render
  with live API values; name tags are clickable at their projected positions (HUD boxes verified
  not to intercept scene clicks); drag-orbit and zoom work; the in-room action button performed a
  real `POST /verify` through the preview and reported its real result; leaving/remounting the
  view leaks nothing (zero console/page errors). A static unit test additionally pins the
  module's CSP-safety (no raw HTML injection), its data sources (the four real endpoints) and
  its honesty markers (awaiting-data rendering, "nothing is simulated" labels).
- **TITAN improvement loop verified end-to-end** (audit → approve → implement → test → record →
  recheck-pass) against the real app source; see "First real improvement loop" above.
- **Mobile app:** `tsc --noEmit` clean and the build-security/catalog suite **37/37** after this
  branch's changes (accessibility labels; eas.json preview profile restored — one test had failed
  since the profile was introduced on `main`).
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

## Local preview (private)

```sh
node scripts/preview-intelligence.mjs
# one command: wrangler pages dev on :8081 (INTEL_DB, LOCAL_DEVELOPMENT, generated PREVIEW_TOKEN,
# TITAN_SOURCES_URL if set) + the host-rewriting proxy on :8080. Prints the dashboard URL + token.
# apply migrations to the local INTEL_DB (wrangler.intel-local.toml targets the same sqlite), then open
# http://localhost:8080/intelligence/ and unlock with the printed token.
#
# gate-free mode for a throwaway sandbox you alone can reach:
PREVIEW_TOKEN=none node scripts/preview-intelligence.mjs
# (run scripts/preview-sources.mjs too and pass TITAN_SOURCES_URL=http://127.0.0.1:8082 —
#  it serves the repo root privately on 127.0.0.1 so the TITAN source audit works.)
```

Preview-hardening behaviours, both tested:

- **Preview token:** when `PREVIEW_TOKEN` (≥16 chars) is set together with `LOCAL_DEVELOPMENT=true`,
  the token is required from **every** host — including localhost. Setting it *hardens* the preview;
  it never widens access. Comparison is constant-time.
- **Host-rewriting proxy:** `wrangler pages dev` only attaches CLI bindings (e.g. `--d1 INTEL_DB`)
  to localhost/127.0.0.1 Host headers. Remote preview tunnels therefore hit a binding-less
  environment where the API correctly fails closed. `scripts/preview-proxy.mjs` rewrites the Host
  header to localhost so the preview URL works, while the API still enforces authentication. It
  also rewrites the `Origin` header of browser POSTs to match (the API's same-origin CSRF check
  would otherwise reject actions made through the proxy); production never runs behind this proxy.
- Without `PREVIEW_TOKEN`, the classic localhost local-admin bypass applies in local development
  only; it can never run on a public hostname. `PREVIEW_TOKEN=none` runs the preview **gate-free**
  (dashboard opens with no password through the proxy) — only for private throwaway sandboxes,
  never a shared or long-lived host.
