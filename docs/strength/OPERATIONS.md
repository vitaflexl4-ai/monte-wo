# Strength Index operations, security and version governance

## Safe default

All writes require `RANKING_ENABLED=true`, a D1 binding, valid Cloudflare Access issuer/audience configuration, a cryptographically verified Access JWT and an active server-provisioned principal. There is **no local auth bypass**, client token secret, public role selector, self-enrollment or trust in `X-Role`/email headers. Existing `LOCAL_DEVELOPMENT` only belongs to the waitlist; it never bypasses ranking authentication.

Protect `/api/strength/*` with a Cloudflare Access self-hosted application; choose an appropriate access policy and configure a sign-in landing path for users. Enroll pilot identities only after privacy/retention review. The UI offers “Load my ranking workspace,” not a fake login. Access integration was not deployed or verified against a real account in this environment. A dedicated public athlete authentication/onboarding product remains future work; Access is the supported restricted-pilot adapter.

Bindings/variables:
- `DB`: existing D1, apply `migrations/0002_strength_index.sql` after 0001.
- `RANKING_ENABLED`: leave unset/false until infrastructure and operational review are ready.
- `RANKING_ACCESS_ISSUER`: exact `https://YOUR-TEAM.cloudflareaccess.com` (no trailing slash).
- `RANKING_ACCESS_AUD`: Access application audience.
- `RANKING_EVIDENCE`: separate **private** R2 bucket, public access disabled. Never bind the public exercise-library bucket as private evidence storage.
- `RANKING_PUBLISH_ENABLED`: default false.
- `RANKING_APPROVED_DIGESTS`: comma-separated SHA-256 digests of versions that have separately passed the required independent release review. No digests are preconfigured.

Use Cloudflare configuration, not checked-in secrets. Do not paste API tokens into browser code. Protect database/account operator credentials with least privilege. D1 is SQLite and does not have PostgreSQL-style RLS; row ownership is enforced in server queries and critical database triggers, and the binding is never exposed to clients. Operators with direct database/schema privileges can bypass application policy; protect and audit that trust boundary. No system can make an unrestricted database owner unable to alter the database.

## Migration and enrollment

Local: `npm run db:local`. Production: explicitly use the actual database name and `wrangler d1 migrations apply ... --remote` after a backup and review. No remote migration or production provisioning was performed here.

`node scripts/strength-admin.mjs --id <unique-id> --subject <Access-subject> --role athlete --reason "consented pilot enrollment"` provisions the local test DB. Production additionally requires explicit `--database <actual-name> --remote`. Provision a separate reviewer and at least two administrators for independent author/publisher duties. Subject must be the stable authenticated JWT subject, not a freely entered email. The operation is logged. Role changes/deactivation require an operator-run audited database procedure; there is deliberately no web role-escalation endpoint.

## API

Public endpoints: `GET /api/strength/config` (readiness, not login) and `GET /api/strength/catalog` (published/draft methodology versions, no athlete data). Configure public exceptions for these two paths if applying an Access policy to the entire API namespace. The live UI can display current published version documents; portable exports contain the bundled draft versions only.
Authenticated:
- `GET /me`: own profile revisions, performances/results, review history, independently calculated current discipline cards.
- `POST /profiles`: new immutable profile revision and hypothetical scenarios. Never rewrites old profiles/results.
- `POST /performances`: strict schema/validity checks, server-selected methodology, immutable submission/calculation; optional `correctionOf` references own same-discipline record. Unknown client rank/verified fields are rejected.
- `POST /recalculate`: own performance explicitly reassessed under current model; append a result and reason.
- `POST /performances/:id/evidence`: own MP4, max 20 MiB, private key generated server-side, SHA-256, pending review event. Basic signature/type checks, **not** antivirus or complete media decoding.
- `GET /evidence/:id`: owner or active reviewer/admin only, private/no-store response and access audit. No public URLs or arbitrary externally supplied URLs are accepted.
Reviewer/admin: `GET /admin/queue`, `POST /reviews` with exact evidence and review revision; approve/reject/flag, reason, rulebook and mandatory checklist for approval. No self-approval, no stale overwrite. Append-only decisions. A rejection/flag is not erased by re-uploading.
Admin: `GET /admin/standards`, `GET /admin/audit`; `POST /admin/models` / `/admin/rulebooks` create immutable draft versions. `POST /admin/{models|rulebooks}/:id/publish` requires different publisher, exact digest, separately configured allowlist, enabled publishing, and approved referenced rulebook / complete nonempty threshold configuration. No automatic scientific approval based on the existence of report strings: the release operator must verify those reports before allowlisting.
Any `/rank`, `/award` or `/override` action is rejected and audited; no endpoint accepts an arbitrary rank award.

The mutable operational tables are rate-limit counters and operator-managed principals; achievement records are append-only. Achievement/profile/model/rulebook/review/audit rows reject UPDATE and DELETE. D1 batch provides atomic writes; review revisions plus a result guard prevent stale-review resurrection. Critical foreign-key, ownership, approval and self-review guards also exist in SQL.

## Historical policy

Current cards use the active published model and current profile revision. Old results remain in history; no global remapping when a model publishes. An athlete explicitly reassesses old performance under the new methodology to create an additional result. If its old variation/rulebook no longer matches, a fresh qualifying submission/evidence is required. Profile changes produce **hypothetical** eligibility only; they cannot transfer verification or fabricate a new performance at another bodyweight. A new current-profile qualifying submission is needed. Corrections supersede the old submission in current projections but never erase its event history.

Separate best provisional and best verified achievements per discipline. A pending high-tier report can show eligibility awaiting review without an awarded rank. Calculations record engine version, model/rulebook, profile revision, review revision, actor, time and reason. No overall rank or training-volume route exists. Application logs cannot promote athletes.

## Abuse, privacy and reliability

Same-origin POST checks, JSON schema/unknown-field validation, body-size limits, private evidence ownership, active principal/role checks, RS256 signature/issuer/audience/expiry validation, 500 authenticated requests/hour, 200-performance pilot cap, immutable records, private/no-store responses. Requests cannot choose an athlete owner, role, verified flag, approved methodology, or stored result. Rejections by an authenticated principal are logged without evidence blobs or whole request payloads. An audit-storage failure blocks the action rather than falsely claiming success.

The static service worker never handles private `/api/strength` requests. Public rulebooks/canonical draft catalog and offline tools may be cached; private records/evidence are not copied into application localStorage. Cloudflare Access necessarily has its own authentication cookies/data processing.

Before public enrollment: establish retention period, deletion/export runbook, appeal policy, reviewer training, backup/recovery and monitoring; verify restricted R2 access; review data-processing/legal requirements; test real authentication/domain integration; harden MP4 ingestion with scanning/transcoding and large-video/range-delivery support if needed; define emergency version withdrawal (currently disable ranking and publish a corrected version; no dedicated withdrawal endpoint). Append-only protections require an authorized maintenance process for lawful deletion; no automatic compliance or server deletion is claimed. A professional security review has not been performed. The existing npm toolchain still reports 6 development-dependency advisories (1 low, 5 high).

Profile-change scenarios evaluate the most recent submission in each discipline (at most four), explicitly labeled hypothetical. All earlier results remain immutable. This bounded operation avoids an unbounded history rewrite inside one Worker request. Current-rank projection uses a database query over latest eligible results per performance, not the truncated display-history list. The UI/API displays the latest 2,000 calculations, latest 1,000 decisions and at most 200 pilot submissions; older append-only records remain in storage.
