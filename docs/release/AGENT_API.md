# MONTE WO — Agent API (automation access for AI agents and operators)

_Status: implemented and unit-tested on `arena/7a19420f-monte-wo`; **inert until the owner enables it** (`AGENT_API_ENABLED=true`, migration 0004, keys issued). Not yet exercised against a deployed environment._

The Agent API gives operator-issued keys programmatic access to **everything the MONTE WO backend can do** — monitoring, waitlist operations, a shared memory for coordinating several agents, and the complete governed Strength Index API (athlete, reviewer and admin operations) — so autonomous agents can run the service 24/7. It is the same code path humans use: agents get full *reach*, not a bypass of the product rules.

| What "full access" means here | What stays outside the API (and how it is done) |
|---|---|
| A key created with `--scopes "*" --role admin` can call every operation below, including reviewer and admin operations of the Strength Index, read every audit log, read/delete waitlist signups and use the shared memory. | **Rank integrity is not negotiable for anyone:** no manual rank awards (`/rank`, `/award`, `/override` are always denied and audited), Provisional for self-reported performances, Verified only after an authorized evidence review by a reviewer ≠ athlete, publisher ≠ author, digest allow-list and `RANKING_PUBLISH_ENABLED` for publications, append-only history. |
| Keys are scoped per agent (default deny), can be pinned to IPs, expire, and are revocable in one command. | **Principal provisioning** (who is athlete/reviewer/admin) stays an operator command (`scripts/strength-admin.mjs`, `scripts/agent-key.mjs --role`), never an API call. |
| Discovery for tool use: `GET /api/agent/openapi.json` (OpenAPI 3.1) and `GET /api/agent/tools` (function-calling manifest). | **Code changes to the app/website** go through Git + CI + Pages previews (`AGENTS.md`), not a runtime API: the site is generated from `content/` + `scripts/`. **Cloudflare settings, secrets, DNS, store releases** remain owner actions. |

## 1. Enable it (owner, reversible)

1. Apply migration `migrations/0004_agent_api.sql` (tables `mw_agent_keys`, `mw_agent_rate`, `mw_agent_audit`, `mw_agent_kv`; nothing else touched). Local: `npm run db:local`. Production: `npx wrangler d1 migrations apply <db-name> --remote`.
2. Set the Pages variable `AGENT_API_ENABLED=true` (optional `AGENT_RATE_LIMIT`, default 1200 requests per key per 10 minutes). With the variable unset every `/api/agent/*` request is `404 agent-api-disabled` and nothing is written.
3. Create one key per agent and hand it over through a secret manager (never Git, chat logs or client code):
   ```sh
   # full access: all scopes + a dedicated admin principal (agent-<keyid>) for the Strength Index
   node scripts/agent-key.mjs create --name "Ops agent A" --scopes "*" --role admin --expires 2027-01-01T00:00:00Z --remote --database <db-name>
   # least privilege examples
   node scripts/agent-key.mjs create --name "Monitor" --scopes status:read,audit:read --ips 203.0.113.4 --remote --database <db-name>
   node scripts/agent-key.mjs create --name "Review bot" --scopes strength,kv:read,kv:write --role reviewer --remote --database <db-name>
   node scripts/agent-key.mjs list   --remote --database <db-name>
   node scripts/agent-key.mjs revoke --id <keyid> --remote --database <db-name>
   ```
   `--sql-only` prints the SQL (hash only) for execution in the Cloudflare dashboard instead. The plaintext key is printed **once**.
4. Cloudflare Access: `/api/agent/*` is outside the Access application that protects `/api/strength/*`, so nothing changes. If an Access policy ever covers all of `/api/*`, add a public exception for `/api/agent/*` (the API authenticates itself).
5. Smoke test: `curl -H "Authorization: Bearer mwa_…" https://<origin>/api/agent/whoami`.

## 2. Authentication and limits

* Header: `Authorization: Bearer mwa_<16 hex id>_<43 char secret>`. The database stores only `sha256(secret)`; unknown id and wrong secret return the same `401 authentication-failed`; revoked → `key-revoked`, expired → `key-expired`, IP not on the key's allow-list → `403 ip-not-allowed`.
* Rate limit per key: `AGENT_RATE_LIMIT` (default 1200) per 10-minute window; `X-RateLimit-Limit/Remaining/Reset` on every response, `429 rate-limit` + `Retry-After` when exceeded. The Strength Index adds its own 500/hour per principal.
* Audit: every authenticated call (and every denial of a known key) is appended to `mw_agent_audit` (`key_id, method, route, status, outcome, detail`) — never the key, never personal data (waitlist deletions log a hash of the address). Strength operations are additionally audited by the Strength Index under the agent's principal id.
* Agents are server-side clients: no CORS is offered on `/api/agent/*`; never call it from a browser or embed a key in the app.

## 3. Scopes

| Scope | Grants |
|---|---|
| `status:read` | Readiness, configuration state and operational metrics (no personal data) |
| `catalog:read` | Disciplines, the nine ranks per discipline, methodology versions |
| `audit:read` | Append-only audit tails (Strength Index + Agent API) |
| `waitlist:read` | Waitlist signups and statistics (signups contain personal data: email) |
| `waitlist:write` | Delete waitlist signups (deletion requests) |
| `kv:read` | Shared agent memory — read |
| `kv:write` | Shared agent memory — write |
| `strength` | Strength Index operations as the linked principal, under the same governance rules as humans |
| `*` | All scopes |

A key with the `strength` scope must be **linked to an active principal** (`--role` creates `agent-<keyid>`; `--principal` links an existing one). The principal's role decides what the Strength Index allows, exactly as for a human.

## 4. Operations

Generated from the single operation table in `server/agent.js` (also served as OpenAPI and as a tool manifest).

| Operation | Scope | Purpose |
|---|---|---|
| `GET /api/agent/` | none | Index: links, authentication hint, scopes |
| `GET /api/agent/openapi.json` | none | OpenAPI 3.1 document |
| `GET /api/agent/tools` | none | Function-calling manifest (`name`, `description`, JSON-schema `parameters`, `http`) |
| `GET /api/agent/whoami` | `any key` | Identify the calling key: name, scopes, linked principal (id/role) and rate-limit state. |
| `GET /api/agent/status` | `status:read` | Service readiness for 24/7 monitoring: feature flags, storage reachability, configuration state, product rules. No personal data. |
| `GET /api/agent/metrics` | `status:read` | Operational counts: waitlist (total / 24 h / 7 d), active principals by role, performances, results, reviews by state, publications, audit volume, agent keys and memory keys. |
| `GET /api/agent/catalog` | `catalog:read` | The four independent disciplines, the nine ranks per discipline (no combined rank) and the current methodology versions with their draft/approved state. |
| `GET /api/agent/audit?source=agent\|strength&limit=&before=` | `audit:read` | Tail of an append-only audit log, newest first. Use `before` (seq cursor) to page backwards. |
| `GET /api/agent/waitlist?limit=&after=&locale=` | `waitlist:read` | Waitlist signups, oldest first, cursor-paginated (`nextAfter`). Contains personal data (email) — handle under the privacy policy. |
| `GET /api/agent/waitlist/stats` | `waitlist:read` | Waitlist counts by locale and per day for the last 30 days. No personal data. |
| `POST /api/agent/waitlist/forget` `{email,reason}` | `waitlist:write` | Delete a waitlist signup by email address (deletion request). The audit trail stores a hash of the address, never the address. |
| `DELETE /api/agent/waitlist/{id}` | `waitlist:write` | Delete a waitlist signup by id. |
| `GET /api/agent/kv?prefix=` | `kv:read` | List shared agent-memory keys (key, version, size, updated_by, updated_at). |
| `GET /api/agent/kv/{key}` | `kv:read` | Read a shared agent-memory value (any JSON). Response carries `ETag` = version. |
| `PUT /api/agent/kv/{key}` (JSON body, optional `If-Match: <version>`) | `kv:write` | Write a value (≤ 64 KB, ≤ 1000 keys). `If-Match: 0` = create only if absent; mismatch → `409 version-conflict` with `currentVersion`. |
| `DELETE /api/agent/kv/{key}` | `kv:write` | Delete a shared agent-memory key. |
| `GET /api/agent/strength/config` | `strength` | Strength Index readiness and policy statement. |
| `GET /api/agent/strength/catalog` | `strength` | Active model + rulebook per discipline with approval flags (DRAFT standards cannot award official ranks). |
| `GET /api/agent/strength/me` | `strength` · any role | The linked principal’s own workspace: profile revisions, performances, results, reviews, per-discipline cards (Provisional vs Verified). |
| `POST /api/agent/strength/profiles` `{profile,reason}` | `strength` · any role | Append a profile revision for the linked principal (historical achievements unchanged). |
| `POST /api/agent/strength/performances` (performance object) | `strength` · any role | Submit a performance for the linked principal. Self-reported ⇒ Provisional at most; Verified only after an authorized evidence review. |
| `POST /api/agent/strength/recalculate` `{performanceId,reason}` | `strength` · any role | Re-evaluate one of the linked principal’s performances under the current methodology (appends a result; history kept). |
| `POST /api/agent/strength/performances/{id}/evidence` (`video/mp4` ≤ 20 MB) | `strength` · any role | Upload private evidence for one of the linked principal’s performances (needs the private evidence bucket). |
| `GET /api/agent/strength/evidence/{id}` | `strength` · any role | Stream an evidence object (owner, or reviewer/admin for review). Private. |
| `GET /api/agent/strength/admin/queue` | `strength` · reviewer/admin | Pending evidence reviews. |
| `POST /api/agent/strength/reviews` `{performanceId,evidenceId,expectedRevision,state,checks,reason}` | `strength` · reviewer/admin | Record an evidence review decision (approved / rejected / flagged). Reviewer must differ from the athlete; `expectedRevision` guards against stale decisions. |
| `GET /api/agent/strength/admin/standards` | `strength` · admin | All methodology versions (models, rulebooks, publications). |
| `GET /api/agent/strength/admin/audit` | `strength` · admin | Strength Index audit log. |
| `POST /api/agent/strength/admin/models` `{document,reason}` | `strength` · admin | Store a DRAFT model version (cannot award official ranks until published). |
| `POST /api/agent/strength/admin/rulebooks` `{document,reason}` | `strength` · admin | Store a DRAFT rulebook version. |
| `POST /api/agent/strength/admin/{models\|rulebooks}/{id}/publish` `{reason,digest}` | `strength` · admin | Publish a version (publisher ≠ author, digest must match and be on the approved allow-list, `RANKING_PUBLISH_ENABLED` must be true). |

Body schemas: `GET /api/agent/openapi.json`. Field semantics of the Strength Index: `docs/strength/OPERATIONS.md`. Error responses are `{"error":"<code>"}` with the codes of the underlying handler plus: `agent-api-disabled` (404), `authentication-required`/`authentication-failed`/`key-revoked`/`key-expired` (401), `ip-not-allowed`/`insufficient-scope`/`no-linked-principal` (403), `not-found` (404), `rate-limit` (429), `version-conflict` (409), `memory-full` (507), `body-too-large` (413), `json-required` (415).

## 5. Wiring agents to it

* **Any HTTP-capable agent framework**: load `GET /api/agent/tools` and expose each entry as a tool; execute by calling `http.method http.path` on the origin with the bearer header, path parameters substituted, `query` parameters appended, and `body` sent as JSON. The OpenAPI document works for OpenAPI-based tool importers.
* **Two agents, one service (suggested split)** — _Operations agent_ (scopes `status:read,audit:read,waitlist:read,waitlist:write,kv:*`, plus `strength` with role `reviewer` if evidence review is delegated) and _Improvement agent_ (GitHub access per `AGENTS.md`, plus `status:read,kv:*` to read incidents and leave notes). Coordinate through memory keys such as `ops:lock:<task>` (`If-Match: 0` to acquire, delete to release), `ops:incident:<id>`, `ops:checkpoint:<job>`.
* **24/7 loop for the operations agent**: `GET /status` every 1–5 minutes → alert when `storage.database !== "ok"` or a feature flag flips; `GET /metrics` hourly → trend waitlist and review queue; `GET /strength/admin/queue` → review evidence under the MONTE Standard checks (the reviewer role may approve/reject/flag; it can never set a rank directly); `GET /waitlist` → nothing to do unless a deletion request arrives (`POST /waitlist/forget`); `GET /audit` → anomaly scan (denied calls, unknown keys). Escalate to the owner, never act: publishing standards, changing roles, anything touching Cloudflare settings, store releases, merging to `main`.
* An MCP server wrapper is a thin follow-up (one process translating MCP tool calls to these HTTP calls) — not built here.

## 6. Privacy and security notes

* `waitlist:read` exposes email addresses to the agent platform you run — treat that platform as a data processor in the privacy policy and store keys only in its secret manager.
* Keys never appear in URLs, logs or audit rows; rotate by creating a new key and revoking the old one. Prefer `--expires` and `--ips` for long-running agents.
* The strength passthrough strips `Cookie`, `Authorization`, Access headers and the caller's `Origin` before reaching the governed handler; the handler sees the agent's linked principal only.
* Disable everything instantly by unsetting `AGENT_API_ENABLED` (keys stay in the table for later).

## 7. Verification

| Check | Command | Result (sandbox, 2026-10-14) |
|---|---|---|
| Agent API suite (11 tests: flag-off inertness; discovery/OpenAPI/tools consistency; authentication and audit; scopes/404/405; status/metrics/catalog + product rules; waitlist pagination/stats/deletion; shared memory concurrency; Strength Index passthrough with roles, denials and audit; rate limit; key script end-to-end; migration shape) | `npm run test:agent-api` | PASS 11/11 |
| Strength Index unchanged for humans | `npm run test:strength` | PASS 27/27 |
| Whole unit suite | `npm test` | all pass except the documented pre-existing `INTER-LICENSE` baseline item |
| Real Workers runtime (wrangler `pages dev` + local D1, migration 0004 applied, key from `scripts/agent-key.mjs`) | `curl` against `/api/agent/*` | PASS — 401 without key; index/openapi/tools; whoami (admin principal); status; metrics; catalog; kv create/409/get; `strength/me`; `POST strength/profiles` 201; `strength/admin/standards`; `POST strength/rank` → 403 `manual-rank-awards-forbidden`; audit tail; rate-limit headers; `/api/status`, `/api/waitlist/config`, `/dashboard/` unchanged |
| Against a deployed environment | `curl …/api/agent/whoami` after §1 | **not yet run** (owner enablement needed) |
