# MONTE WO — Agent API (automation access for AI agents and operators)

_Status (2026-10-30): implemented, hardened and unit-tested on `arena/7a19420f-monte-wo` (now merged with `main` as of `d9a94ec`); **inert until the owner enables it** (`AGENT_API_ENABLED=true`, `AGENT_DB` binding, migration 0008, keys issued). Not exercised against a deployed environment. Production-readiness review: §8 — current verdict **NO-GO until the listed owner decisions are made**; nothing in production was changed by this review._

The Agent API gives operator-issued keys programmatic access to the MONTE WO backend — monitoring, waitlist operations, a shared memory for coordinating several agents, and the governed Strength Index API acting as a linked principal. Scopes are **default deny**, and two server-side policy flags stay off unless the owner approves them explicitly (waitlist e-mail access; reviewer/admin automation).

| What a key can do | What stays outside the API (and how it is done) |
|---|---|
| Exactly the operations covered by its scopes (§3). A key never gets more than the operator listed; `*` must be confirmed deliberately (`--confirm-wildcard`) and is not recommended for any agent. | **Rank integrity is not negotiable for anyone.** `/strength/rank`, `/award`, `/override` are refused (`403 manual-rank-awards-forbidden`) and audited; Provisional vs Verified, reviewer ≠ athlete, publisher ≠ author, approved-digest allow-list and `RANKING_PUBLISH_ENABLED` are enforced by the same handler that serves humans. |
| Keys are scoped per agent, can be pinned to IPs, expire, and are revocable in one command. | **Principal provisioning** (who is athlete/reviewer/admin) stays an operator command (`scripts/strength-admin.mjs`, `scripts/agent-key.mjs --role`), never an API call. |
| Discovery for tool use: `GET /api/agent/openapi.json` (OpenAPI 3.1) and `GET /api/agent/tools` (function-calling manifest). | **Code changes to the app/website** go through Git + CI + Pages previews (`AGENTS.md`), not a runtime API. **Cloudflare settings, DNS, bindings and deployments** are owner actions. |

## 1. Enable it (owner, reversible) — read §8 first

The API needs three things, all reversible: a database binding named **`AGENT_DB`**, migration `0008_agent_api.sql` applied **to that database**, and the Pages variable `AGENT_API_ENABLED=true`. Missing flag ⇒ every `/api/agent/*` request is `404 agent-api-disabled`; flag set but binding missing (or pointing at the waitlist binding) ⇒ `503 agent-db-not-bound`; in both cases nothing is written.

| Binding | Used for | Production (verified, §8.1) |
|---|---|---|
| `AGENT_DB` | `mw_agent_keys`, `mw_agent_rate`, `mw_agent_audit`, `mw_agent_kv` (0008) | **not bound yet** — owner decision: the intelligence database `monte-wo-intelligence` (id `e4cd840a-a2a0-4fbc-bb35-7bb21f0e2403`, recommended: it already hosts ARGON/ULTRON/AU/TITAN) or a new dedicated database. **Never `monte-wo-waitlist`.** |
| `APP_DB` | Strength Index data (0002) + native sign-in codes (0007); the key→principal link is resolved here at request time | **does not exist in production yet** (Strength Index pilot not deployed) ⇒ `strength:*` scopes are unusable until it does; `/status` reports `strengthDatabase: "not-bound"`. |
| `DB` | Waitlist (0001) — only the `waitlist:*` operations read it | **not bound on `vitaflex-monte-wo-live`** (the deploy output says no `monte-wo-waitlist` database exists on this account) ⇒ waitlist operations answer `503 waitlist-unavailable`. |

Steps (owner, in this order; each one alone is harmless):

1. **Pick the `AGENT_DB` database** and back it up: `npx wrangler d1 export monte-wo-intelligence --remote --output backup-intel-$(date +%F).sql` (plus `npx wrangler d1 time-travel info monte-wo-intelligence` to note the restore bookmark).
2. **Apply the migration** the same way the Intelligence deploy script applies its own (gated, `d1 execute --file`, no `d1 migrations apply` — that command would try to apply 0001/0002/0007 to the wrong database):
   ```sh
   npx wrangler d1 execute monte-wo-intelligence --remote --command "SELECT name FROM sqlite_master WHERE name='mw_agent_keys'"   # must be empty
   npx wrangler d1 execute monte-wo-intelligence --remote --file migrations/0008_agent_api.sql
   npx wrangler d1 execute monte-wo-intelligence --remote --command "SELECT name FROM sqlite_master WHERE name LIKE 'mw_agent%' ORDER BY name"   # 4 tables + 1 index
   ```
   Verified locally: 0008 applies cleanly on top of 0003–0006 (no table/index name overlaps; the 13 `intel_*` tables are untouched) and is additive only (no `ALTER`/`DROP`; unit test "migration 0008 is additive and operational only").
3. **Bind + flag.** `vitaflex-monte-wo-live` is configured by `scripts/deploy-intelligence.mjs`, which writes the bindings block into `wrangler.toml` at deploy time — bindings added only in the dashboard would be dropped by the next scripted deploy. The script therefore needs an **opt-in** `--with-agent-api` option that adds `[[d1_databases]] binding = "AGENT_DB" database_name = "monte-wo-intelligence" database_id = <same id as INTEL_DB>` and `AGENT_API_ENABLED = "true"` to its marked block (default: nothing changes). This is a small change to a shared script with its own harness (`npm run test:deploy`, 15 scenarios) — proposed, **not applied here** because it alters the production deploy path. Until then the API stays inert in production even after merge.
4. **Issue keys** per agent (§7), from a machine with `npx wrangler login`; the plaintext is printed once:
   ```sh
   node scripts/agent-key.mjs create --name "ULTRON" --scopes status:read,catalog:read,kv:read,kv:write --ips <worker egress IP(s)> --expires 2027-01-31T00:00:00Z --remote --database monte-wo-intelligence
   node scripts/agent-key.mjs list   --remote --database monte-wo-intelligence
   node scripts/agent-key.mjs revoke --id <keyid> --remote --database monte-wo-intelligence
   ```
   `--sql-only` prints the statements (hash only, one block per target database) for the Cloudflare dashboard instead.
5. **Cloudflare Access**: `/api/agent/*` must stay **outside** the Access application that protects `/intelligence/` and `/api/intelligence/*` (the API authenticates itself). Recommended, not required: a WAF rate-limiting rule on `/api/agent/*` (e.g. 300 requests / 10 s per IP) because unauthenticated requests cost one D1 read + one SHA-256 each.
6. **Smoke test**: `curl -H "Authorization: Bearer mwa_…" https://<origin>/api/agent/whoami` → 200 with the key's name; `curl https://<origin>/api/agent/whoami` → 401.

**Rollback** (any time, in this order): remove `AGENT_API_ENABLED` (instant 404, keys kept) → revoke keys if desired → `docs/release/sql/0008_agent_api.rollback.sql` against `AGENT_DB` (drops the four tables; verified idempotent) → restore from the export or Time Travel if anything else looks wrong. Rows written by `--role` into the Strength database are append-only audit history: deactivate those principals (`UPDATE mw_principals SET active=0 WHERE subject LIKE 'agent:%'`) instead of deleting.

## 2. Authentication and limits

* Header: `Authorization: Bearer mwa_<16 hex id>_<43 char secret>`. The database stores only `sha256(secret)` (constant-time compare); unknown id and wrong secret return the same `401 authentication-failed`; revoked → `401 key-revoked`, expired → `401 key-expired`, IP not on the key's allow-list → `403 ip-not-allowed` (the allow-list fails closed when `CF-Connecting-IP` is absent).
* Rate limit per key: `AGENT_RATE_LIMIT` (default 1200) per 10-minute window; `X-RateLimit-Limit/Remaining/Reset` on every response, `429 rate-limit` + `Retry-After` when exceeded. The Strength Index adds its own 500/hour per principal.
* Audit: **exactly one row per authenticated call** (and per denial of a known key) in `mw_agent_audit` — `key_id, method, route, status, outcome, detail` where `detail` is the error code for 4xx/5xx or a short handler note (waitlist deletions log a truncated hash of the address). Never the key, never the request body, never personal data. Anonymous garbage (no/invalid key) is not written (no fill-up vector). The table is append-only (triggers). Strength operations are additionally audited by the Strength Index itself under the linked principal.
* Error responses are `{"error":"<code>"}` only — no echo of input, no stack traces; the module has no `console.*` call (asserted by a test), so keys and personal data cannot reach Workers logs.
* Agents are server-side clients: no CORS is offered on `/api/agent/*`; never call it from a browser or embed a key in the app.

## 3. Scopes and policy flags

| Scope | Grants |
|---|---|
| `status:read` | Readiness, configuration state and operational metrics (no personal data) |
| `catalog:read` | Disciplines, the nine ranks per discipline, methodology versions |
| `audit:read` | Append-only audit tails (Agent API; Strength Index when `APP_DB` is bound) |
| `waitlist:stats` | Waitlist counts by locale and day — no personal data |
| `waitlist:read` | Waitlist signups **including e-mail addresses** — also needs the server flag `AGENT_PII_ENABLED=true`; implies `waitlist:stats` |
| `waitlist:write` | Delete waitlist signups (deletion requests) |
| `kv:read` / `kv:write` | Shared agent memory (locks, checkpoints, incident notes) |
| `strength:read` | Strength Index `GET` operations as the linked principal |
| `strength:write` | Strength Index `POST` operations as the linked principal (same governance as humans) |
| `strength` | Alias for `strength:read` + `strength:write` |
| `*` | All scopes — never issued by default (`--confirm-wildcard`) |

Server policy flags (Pages variables, default off — scopes alone are not enough):

| Flag | Off (default) | On |
|---|---|---|
| `AGENT_PII_ENABLED` | `GET /waitlist` → `403 pii-access-disabled` for every key; stats stay available | keys holding `waitlist:read` receive e-mail addresses |
| `AGENT_STRENGTH_PRIVILEGED_ENABLED` | only keys linked to **athlete** principals may use `/strength/*`; reviewer/admin principals → `403 privileged-principal-disabled` | reviewer/admin automation allowed (evidence reviews, draft standards, publication attempts — all still governed) |

A key with `strength:*` scopes must be **linked to an active principal** in the Strength database (`--role` creates `agent-<keyid>`; `--principal` links an existing one); the principal's role decides what the Strength Index allows, exactly as for a human. The link is validated at request time (no cross-database foreign key).

## 4. Operations

Generated from the single operation table in `server/agent.js` (also served as OpenAPI and as a tool manifest).

| Operation | Scope | Purpose |
|---|---|---|
| `GET /api/agent/` | none | Index: links, authentication hint, scopes |
| `GET /api/agent/openapi.json` | none | OpenAPI 3.1 document |
| `GET /api/agent/tools` | none | Function-calling manifest (`name`, `description`, JSON-schema `parameters`, `http`) |
| `GET /api/agent/whoami` | `any key` | Identify the calling key: name, scopes (+ `effectiveScopes`), linked principal (id/role), server policy flags and rate-limit state. |
| `GET /api/agent/status` | `status:read` | Service readiness for 24/7 monitoring: feature flags, reachability of each database binding (`storage.agentDatabase` / `waitlistDatabase` / `strengthDatabase`: `ok` · `error` · `not-bound`), policy flags, product rules. No personal data. |
| `GET /api/agent/metrics` | `status:read` | Operational counts: waitlist (total / 24 h / 7 d), active principals by role, performances, results, reviews by state, publications, audit volume, agent keys and memory keys. |
| `GET /api/agent/catalog` | `catalog:read` | The four independent disciplines, the nine ranks per discipline (no combined rank) and the current methodology versions with their draft/approved state. |
| `GET /api/agent/audit?source=agent\|strength&limit=&before=` | `audit:read` | Tail of an append-only audit log, newest first. Use `before` (seq cursor) to page backwards. |
| `GET /api/agent/waitlist?limit=&after=&locale=` | `waitlist:read` + flag `AGENT_PII_ENABLED` | Waitlist signups, oldest first, cursor-paginated (`nextAfter`). Contains personal data (email) — handle under the privacy policy. |
| `GET /api/agent/waitlist/stats` | `waitlist:stats` | Waitlist counts by locale and per day for the last 30 days. No personal data. |
| `POST /api/agent/waitlist/forget` `{email,reason}` | `waitlist:write` | Delete a waitlist signup by email address (deletion request). The audit trail stores a hash of the address, never the address. |
| `DELETE /api/agent/waitlist/{id}` | `waitlist:write` | Delete a waitlist signup by id. |
| `GET /api/agent/kv?prefix=` | `kv:read` | List shared agent-memory keys (key, version, size, updated_by, updated_at). |
| `GET /api/agent/kv/{key}` | `kv:read` | Read a shared agent-memory value (any JSON). Response carries `ETag` = version. |
| `PUT /api/agent/kv/{key}` (JSON body, optional `If-Match: <version>`) | `kv:write` | Write a value (≤ 64 KB, ≤ 1000 keys). `If-Match: 0` = create only if absent; mismatch → `409 version-conflict` with `currentVersion`. |
| `DELETE /api/agent/kv/{key}` | `kv:write` | Delete a shared agent-memory key. |
| `GET /api/agent/strength/config` | `strength:read` | Strength Index readiness and policy statement. |
| `GET /api/agent/strength/catalog` | `strength:read` | Active model + rulebook per discipline with approval flags (DRAFT standards cannot award official ranks). |
| `GET /api/agent/strength/me` | `strength:read` · any role | The linked principal’s own workspace: profile revisions, performances, results, reviews, per-discipline cards (Provisional vs Verified). |
| `POST /api/agent/strength/profiles` `{profile,reason}` | `strength:write` · any role | Append a profile revision for the linked principal (historical achievements unchanged). |
| `POST /api/agent/strength/performances` (performance object) | `strength:write` · any role | Submit a performance for the linked principal. Self-reported ⇒ Provisional at most; Verified only after an authorized evidence review. |
| `POST /api/agent/strength/recalculate` `{performanceId,reason}` | `strength:write` · any role | Re-evaluate one of the linked principal’s performances under the current methodology (appends a result; history kept). |
| `POST /api/agent/strength/performances/{id}/evidence` (`video/mp4` ≤ 20 MB) | `strength:write` · any role | Upload private evidence for one of the linked principal’s performances (needs the private evidence bucket). |
| `GET /api/agent/strength/evidence/{id}` | `strength:read` · any role | Stream an evidence object (owner, or reviewer/admin for review). Private. |
| `GET /api/agent/strength/admin/queue` | `strength:read` · reviewer/admin · flag `AGENT_STRENGTH_PRIVILEGED_ENABLED` | Pending evidence reviews. |
| `POST /api/agent/strength/reviews` `{performanceId,evidenceId,expectedRevision,state,checks,reason}` | `strength:write` · reviewer/admin · flag `AGENT_STRENGTH_PRIVILEGED_ENABLED` | Record an evidence review decision (approved / rejected / flagged). Reviewer must differ from the athlete; `expectedRevision` guards against stale decisions. |
| `GET /api/agent/strength/admin/standards` | `strength:read` · admin · flag `AGENT_STRENGTH_PRIVILEGED_ENABLED` | All methodology versions (models, rulebooks, publications). |
| `GET /api/agent/strength/admin/audit` | `strength:read` · admin · flag `AGENT_STRENGTH_PRIVILEGED_ENABLED` | Strength Index audit log. |
| `POST /api/agent/strength/admin/models` `{document,reason}` | `strength:write` · admin · flag `AGENT_STRENGTH_PRIVILEGED_ENABLED` | Store a DRAFT model version (cannot award official ranks until published). |
| `POST /api/agent/strength/admin/rulebooks` `{document,reason}` | `strength:write` · admin · flag `AGENT_STRENGTH_PRIVILEGED_ENABLED` | Store a DRAFT rulebook version. |
| `POST /api/agent/strength/admin/{models\|rulebooks}/{id}/publish` `{reason,digest}` | `strength:write` · admin · flag `AGENT_STRENGTH_PRIVILEGED_ENABLED` | Publish a version (publisher ≠ author, digest must match and be on the approved allow-list, `RANKING_PUBLISH_ENABLED` must be true). |

Body schemas: `GET /api/agent/openapi.json`. Field semantics of the Strength Index: `docs/strength/OPERATIONS.md`. Error responses are `{"error":"<code>"}` with the codes of the underlying handler plus: `agent-api-disabled` (404), `authentication-required`/`authentication-failed`/`key-revoked`/`key-expired` (401), `ip-not-allowed`/`insufficient-scope`/`no-linked-principal` (403), `not-found` (404), `rate-limit` (429), `version-conflict` (409), `memory-full` (507), `body-too-large` (413), `json-required` (415).

## 5. Wiring agents to it

* **Any HTTP-capable agent framework**: load `GET /api/agent/tools` and expose each entry as a tool; execute by calling `http.method http.path` on the origin with the bearer header, path parameters substituted, `body` as JSON. Tool descriptions carry the scope and role requirements.
* **24/7 loop (operations/monitoring agent)**: `GET /status` every 1–5 minutes → alert when any `storage.*Database` is `error`, or a feature flag flips; `GET /metrics` hourly → trend agent audit volume and (once bound) waitlist and review queues; `GET /audit?source=agent` → verify that every action by every key is accounted for.
* **Coordination between agents**: `PUT /kv/lock:<task>` with `If-Match: 0` is an atomic create-if-absent lock (verified: 6 concurrent attempts in the unit test and 8 in the real Workers runtime ⇒ exactly one `201`, the rest `409 version-conflict`); release with `DELETE` or by bumping the version with `If-Match: <n>`.
* An MCP server wrapper is a thin follow-up (one process translating MCP tool calls to these HTTP calls) — not built here.

## 6. Privacy and security notes

* `waitlist:read` + `AGENT_PII_ENABLED` expose e-mail addresses to the agent platform you run — treat that platform as a data processor in the privacy policy and store keys only in its secret manager. Default: off.
* Keys never appear in URLs, logs or audit rows; rotate by creating a new key and revoking the old one. Prefer `--expires` and `--ips` for long-running agents.
* The strength passthrough strips `Cookie`, `Authorization`, Access headers and the caller's `Origin` before reaching the governed handler; the handler sees the agent's linked principal only.
* Disable everything instantly by removing `AGENT_API_ENABLED` (keys stay in the table for later).
* Known limitations (accepted, documented): no `last_used_at` on keys (use the audit tail); the 64 KB memory limit counts characters, not bytes; unauthenticated requests cost one D1 read (mitigate with a WAF rate rule).

## 7. Least-privilege keys for the Intelligence Command Center agents

ARGON, ULTRON, AU and TITAN (`server/intelligence/core.js`, `titan.js`, `intelligence-worker/`) are **deterministic jobs running inside the scheduled Worker and the Pages Functions with direct access to `INTEL_DB`** — not external processes. They do not need Agent API keys to do their current work, and they do not call `/api/agent/*` today (see §8.3). The matrix below is what each would get **if and when** it (or an operator tool acting on its behalf) is wired to the Agent API; it follows the agent map in the code. Nothing here has been issued.

| Agent (role per code) | Scopes | Principal | Flags needed | Explicitly **not** granted |
|---|---|---|---|---|
| **ULTRON** — website availability/latency checks | `status:read`, `catalog:read`, `kv:read`, `kv:write` | none | none | waitlist, audit of other keys, strength |
| **ARGON** — mobile telemetry analysis (untrusted input, confidence-capped) | `status:read`, `kv:read`, `kv:write` | none | none | waitlist (any), strength (any) — telemetry has no business with athlete records |
| **AU** — cross-agent correlation, briefings, bounded automation | `status:read`, `catalog:read`, `audit:read`, `waitlist:stats`, `kv:read`, `kv:write` | none | none | `waitlist:read` (e-mails), `waitlist:write`, strength — briefings need counts, not addresses |
| **TITAN** — continuous improvement audits (static analysis, never edits code) | `status:read`, `catalog:read`, `audit:read`, `kv:read` | none | none | any write except nothing: TITAN is read-only by design (its backlog lives in `INTEL_DB`) |

Rules applied: no `*` keys; no `waitlist:read`/`waitlist:write` until the owner approves PII processing (and sets `AGENT_PII_ENABLED`); no reviewer/admin principal for any agent until the owner approves (and sets `AGENT_STRENGTH_PRIVILEGED_ENABLED`); one key per agent, `--expires` ≤ 90 days, `--ips` pinned to the Worker/runner egress where known; keys live in the Worker's/runner's secret store only. Issuance commands (owner, after §1):

```sh
node scripts/agent-key.mjs create --name ULTRON --scopes status:read,catalog:read,kv:read,kv:write        --expires 2027-01-31T00:00:00Z --remote --database monte-wo-intelligence
node scripts/agent-key.mjs create --name ARGON  --scopes status:read,kv:read,kv:write                     --expires 2027-01-31T00:00:00Z --remote --database monte-wo-intelligence
node scripts/agent-key.mjs create --name AU     --scopes status:read,catalog:read,audit:read,waitlist:stats,kv:read,kv:write --expires 2027-01-31T00:00:00Z --remote --database monte-wo-intelligence
node scripts/agent-key.mjs create --name TITAN  --scopes status:read,catalog:read,audit:read,kv:read      --expires 2027-01-31T00:00:00Z --remote --database monte-wo-intelligence
```

## 8. Production-readiness review (2026-10-30) — findings, evidence, GO/NO-GO

### 8.1 Where production actually is (verified from the repository and the deploy workflow outputs, not assumed)

| Item | Finding | Evidence |
|---|---|---|
| Production branch / this branch | `main` = `d9a94ec` (PR #20 merged 2026-10-28). This session's branch `arena/7a19420f-monte-wo` is a **preview only**; no PR is open for it (PR #17, an unrelated docs branch, is the only open PR). | `git log origin/main`, `gh pr list --state all` |
| Pages projects | **Two.** `vitaflex-monte-wo-live` (direct upload, deployed by `.github/workflows/deploy-intelligence.yml` → `scripts/deploy-intelligence.mjs`, 17 successful runs since 2026-10-25, last `40713855010` on 2026-10-28 (`fd5f472`); last recorded URL `https://62a9bf81.vitaflex-monte-wo-live.pages.dev`, newer hashes exist) and the original git-connected `vitaflex-monte-wo` (builds `main`; its build command was repaired in PR #19 — current state unknown from here). `deploy.config.json`: account `328b002cfefe3bfa43064c5721f4e998`, `site_url: null` (no custom domain recorded). | `deploy.config.json`, `gh run list --workflow deploy-intelligence.yml`, deploy output comments on PR #16 |
| D1 databases | `monte-wo-intelligence` (`e4cd840a-a2a0-4fbc-bb35-7bb21f0e2403`, bound as `INTEL_DB`, migrations 0003–0005 applied; 0006 by the 10-28 run). **No `monte-wo-waitlist` database on the account** ("skipping the DB binding (waitlist stays fail-closed)"). No Strength/`APP_DB` database. | deploy output `[2/8]`, `[3/8]` |
| Access | Cloudflare Access issuer `https://jmalexis.cloudflareaccess.com`, aud `8b7a…7e1`, operator `jmalexis@liberty.edu` (admin, case-normalised by 0006). Whether the Access *application* covering `/intelligence/` + `/api/intelligence/*` has been created is an owner-only step the script cannot verify. | `deploy.config.json`, deploy output `[5/8]`, runbook |
| Worker | `monte-wo-intelligence` scheduled Worker deployed with `INTELLIGENCE_ENABLED=true` (ULTRON */5 min, ARGON+AU hourly, AU daily/weekly). | deploy output `[7/8]` |
| Sandbox limits | This environment cannot reach Cloudflare (API or `*.pages.dev`); nothing above was changed, only read. | outbound allow-list |

Consequence for the Agent API: as merged, it is **correct but has nothing to talk to in production** — no `AGENT_DB` binding, no waitlist binding, no Strength database. It fails closed in every one of those cases (verified in the real Workers runtime: `503 agent-db-not-bound`, `503 waitlist-unavailable`, `503 ranking-unavailable`, `storage.*: "not-bound"`), so **merging it is safe**, and enabling it requires the explicit steps in §1.

### 8.2 What this review changed (all on the branch, nothing in production)

1. **Merged `origin/main` into the branch** (58 commits, ~770 paths incl. regenerated pages; 6 conflicts resolved: `.gitignore`, `package.json` (union), `functions/api/[[route]].js` (mobile + intelligence + native + agent dispatch), `scripts/build_website.py` (private dirs = intelligence, dashboard, account callback), generated `public/app/index.html` and `public/sw.js` (regenerated by `npm run build`)). Without this merge the branch could not be evaluated against production at all.
2. **Renumbered migrations**: `0003_native_auth_codes.sql` → **0007**, `0004_agent_api.sql` → **0008** (main already uses 0003–0006 for the Command Center). Never applied anywhere outside local databases.
3. **Hardening in `server/agent.js`** (version `2026-10-30-v2`): explicit `AGENT_DB` binding (never the waitlist binding; `503 agent-db-not-bound`); Strength data via the same `APP_DB` rule as `server/strength/api.js`; waitlist via `DB` only; `strength` split into `strength:read` / `strength:write` (alias kept); new `waitlist:stats` scope without PII; policy flags `AGENT_PII_ENABLED` and `AGENT_STRENGTH_PRIVILEGED_ENABLED` (default off); exactly one audit row per call with the error code as detail; catalog falls back to the static product rules when no Strength database is bound; cross-database foreign key removed from 0008 (link validated at request time).
4. **`scripts/agent-key.mjs`**: `*` requires `--confirm-wildcard`; statements are emitted per target database (`APP_DB` for principals, `AGENT_DB` for keys); `--remote --role` requires `--app-database`.
5. **Tests**: Agent API suite 11 → 12 tests (three separate databases like production; PII and privileged flags; read/write scopes; `AGENT_DB`/`APP_DB` binding rules; 6-way concurrent lock creation ⇒ one `201`; audit rows == calls; error bodies contain no key, address, input or stack; no `console.*`; wildcard confirmation; per-database SQL). Native API tests use a distinct `APP_DB` object as the Strength API now requires. Dashboard/website tests follow main's conventions (cache name owned by the website build; 50 public routes).
6. **Pre-existing failures on `main` fixed in passing** (verified failing on pure `main` after `npm run build`: 3 tests): website route count expected 50 but `/account/callback/` leaked into the public route list (now excluded like other private surfaces — it already had `noindex` + strict CSP); the pinned "authorized protected change" hashes for `wrangler.toml` / `server/strength/api.js` / `functions/api/[[route]].js` were stale — `docs/mobile/authorized-protected-changes.json` now pins the merged versions with reasons while the historical baselines stay intact.
7. **Docs**: `wrangler.toml` comments (APP_DB/AGENT_DB; removed the "reuse the waitlist DB" advice), `.env.example` (all variables main's code reads, placeholders only), this file, `RELEASE_STATUS.md`, rollback SQL in `docs/release/sql/`.

### 8.3 Intelligence Command Center ↔ Agent API

* The Command Center (`server/intelligence/*`, `public/intelligence/`, `intelligence-worker/`) authenticates **humans** with a Cloudflare Access JWT verified server-side plus an `intel_operators` row (roles `admin`/`viewer`; mutations admin-only). Its agents ARGON/ULTRON/AU/TITAN are **in-process jobs** writing to `INTEL_DB`; the only inbound machine credentials are `INTELLIGENCE_INGEST_KEY` (mobile telemetry) and `INTEL_WORKER_KEY` (manual `/run`).
* The Agent API was built from this session's brief ("24/7 automation agents") **before** the Command Center landed on `main`; the two are **not connected**: no shared key store, the console does not issue or list agent keys, `/api/intelligence/*` does not accept `mwa_` keys, and `/api/agent/*` exposes no intelligence data. `GET /api/agent/status` now reports whether `INTEL_DB` and the Access variables are configured (read-only), nothing more.
* What would make the Agent API useful *for* the Command Center (not built — needs the owner's product decision): (a) read-only `intel:read` scope exposing overview/incidents/briefings to external automation (e.g. an LLM operator or a status page) with scoped keys instead of Access cookies; (b) an operator-facing "Agent keys" panel in the console (admin-only) calling the same SQL as `scripts/agent-key.mjs`; (c) a `--with-agent-api` option in `scripts/deploy-intelligence.mjs` (§1 step 3). Until one of these is approved, the Agent API serves external agents and operator tooling only.

### 8.4 Tests run (this review, merged tree)

| Suite | Command | Result |
|---|---|---|
| Whole unit suite (25 files) | `npm test` / `bash scripts/ci-unit-tests.sh` | **251/251 PASS** (pure `main` after `npm run build`: 213 tests, 3 pre-existing failures — see 8.2 item 6) |
| Agent API | `npm run test:agent-api` | **12/12 PASS** |
| Strength Index (humans unchanged) | `npm run test:strength` | PASS (inside the suite) |
| Intelligence Command Center (main's suite, on the merged tree) | `npm run test:intelligence` | PASS (inside the suite) |
| Deploy-script harness (main's) | `npm run test:deploy` | **15/15 scenarios PASS** |
| Real Workers runtime, bindings `DB`/`APP_DB`/`AGENT_DB` (wrangler 4.86 `pages dev`, local D1 with 0001–0008, keys from `scripts/agent-key.mjs`) | `npm run db:local && npm run dev:agent` (same flags as used here; port 8082) + `curl` matrix | PASS — 401 no key / invalid key; ULTRON-shaped key: whoami, status (three databases `ok`, flags off), catalog (nine rank names from the database), `waitlist/stats` 200, `waitlist` 403 `insufficient-scope`; `waitlist:read` key with flag off → 403 `pii-access-disabled`; admin principal with flag off → 403 `privileged-principal-disabled`; athlete principal: `/strength/me` 200, `POST /strength/rank` 403 `manual-rank-awards-forbidden`, profile 201; malformed JSON 400, wrong content type 415, bad key name 400, 405 with `Allow`, 404; 8 concurrent `If-Match: 0` ⇒ `201` ×1 + `409` ×7; rate headers; audit tail shows one row per call with error codes only |
| Real Workers runtime, misconfiguration | enabled, `AGENT_DB` absent | 503 `agent-db-not-bound`, discovery still 200, **0 rows written** to the only bound database |
| Rollback SQL | `docs/release/sql/0008_agent_api.rollback.sql` on SQLite with and without `d1_migrations` | drops exactly the four tables; idempotent on a second run |
| Deployed environment | — | **not run** (sandbox cannot reach Cloudflare; API not enabled anywhere) |

CI run for the merge commit `e62c1e8`: GitHub Actions `41116441537` — **SUCCESS** (2026-10-30; build, generated-output sync check, 251 unit tests, native bundle + suites).

### 8.5 Verdict

**NO-GO for enabling in production today** — not because of a defect found in the API (none open after the hardening) but because the prerequisites are owner decisions that have not been made:

1. **Database placement**: approve `monte-wo-intelligence` as `AGENT_DB` (recommended) or create a dedicated database. (`monte-wo-waitlist` does not exist on the account and must not be used anyway.)
2. **Deploy path**: approve the opt-in `--with-agent-api` change to `scripts/deploy-intelligence.mjs` (or configure the binding by hand and accept that the next scripted deploy drops it).
3. **Merge**: open/merge the PR for this branch into `main` (production for the git-connected project; the API stays 404 there until the flag is set).
4. **Policy**: keep `AGENT_PII_ENABLED` and `AGENT_STRENGTH_PRIVILEGED_ENABLED` unset unless a concrete agent needs them (none of ARGON/ULTRON/AU/TITAN does).
5. **Keys**: issue the four least-privilege keys of §7 only when an actual consumer exists; otherwise issue none.

**GO** for: merging the branch (fail-closed everywhere, 251/251 tests, deploy harness green) and for the migration plan in §1 once decision 1 is taken.
