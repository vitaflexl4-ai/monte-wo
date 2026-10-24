# MONTE WO Intelligence Command Center

Status: implementation foundation only — NOT deployed, not live, and not connected to production telemetry.

## Agents
- **ARGON**: mobile-app telemetry intake, release/error trend analysis, incident grouping.
- **ULTRON**: scheduled website availability and latency checks plus privacy-safe aggregate analytics.
- **AU**: correlates incidents and produces evidence-linked daily and weekly summaries.

## Proposed architecture
- Private dashboard under `/intelligence/`, protected by a Cloudflare Access application and an explicit allowlist policy. Protect `/api/intelligence/*` with the same Access policy; never rely on a hidden URL.
- A separate Cloudflare Worker with Cron Triggers runs website checks every five minutes and daily/weekly briefing jobs. Pages Functions do not themselves provide a general Cron Trigger runtime.
- Cloudflare D1 stores incidents, check history, briefings, agent activity, approved automation rules and audit events.
- Mobile app sends minimal event telemetry to the authenticated intake endpoint after consent/notice is implemented. Do not collect message contents, precise location, credentials, health records, or unnecessary identifiers.
- All findings must identify their evidence and confidence. The dashboard must label missing integrations as NOT CONFIGURED and must never show invented live numbers.

## Initial safety posture
- Monitoring and analysis can run automatically.
- Automated remediation is disabled by default. It can only run after an administrator explicitly enables a named allowlisted rule, and only for reversible low-risk actions with a dry-run, idempotency key, audit record and rollback path.
- No automatic production deploys, account suspensions, destructive database changes, user-level profiling, or security-blocking decisions.
- Visitor insights are aggregate and privacy-conscious; no covert identity resolution or individual-level sensitive inference.
- Alerts/briefings are only delivered after a notification channel is configured and tested.

## Required configuration before production
1. Create a dedicated D1 database and apply `migrations/0003_intelligence.sql`.
2. Configure D1 bindings in both Pages and the scheduled Worker (separate deployments).
3. Set `INTELLIGENCE_ENABLED=true`, confirmed `SITE_URL`, Cloudflare Access app and audience/policy for both dashboard and API.
4. Configure app telemetry endpoint and data-retention policy; display the relevant privacy notice/consent where required.
5. Configure and test a notification destination (email/webhook) as a secret, never a public variable.
6. Set and test Cron Triggers on the Worker.
7. Review data protection, retention, alert delivery and access controls before enabling real visitor analytics.
8. Run tests and validate the live endpoint, scheduled run, persistence and alert delivery. Until then, this is not operational.

## Briefing cadence
- Urgent: critical outage/error threshold or sustained failed health checks.
- Daily: previous 24-hour incident and health summary.
- Weekly: seven-day trends, repeat incidents, resolved/unresolved work and prioritized recommendations.

## Evidence model
Every incident records source agent, first/last observed timestamps, severity, evidence JSON, confidence, status and resolution notes. A monitor that cannot access its target records an explicit configuration/monitoring error rather than reporting a healthy status.
