# MONTE WO — Agent API handover pack

_Status 2026-10-31: the handover **client** (`scripts/agent-mcp.mjs`) and this pack are complete and tested end to end against the real API handler and the real Workers runtime. The **production endpoint does not exist yet**: the API is enabled nowhere until the owner merges PR #22 and runs the opt-in deploy (Part A). Nothing here contains a key._

This pack has three parts. **Part A** is for the owner (≈10 minutes of account actions nobody else can do). **Part B** is what you give to the agent — a file, two environment variables and a brief. **Part C** is the acceptance test that proves the handover worked.

---

## Part A — Owner: make the endpoint exist and mint the key (≈10 min)

| # | Action | Command / place | Done when |
|---|---|---|---|
| A1 | Merge **PR #22** (`arena/7a19420f-monte-wo` → `main`) | GitHub | `main` contains `server/agent.js` and `scripts/agent-mcp.mjs` |
| A2 | Back up the intelligence database | `npx wrangler d1 export monte-wo-intelligence --remote --output backup-intel-$(date +%F).sql` | file saved off-repo |
| A3 | Opt in | `deploy.config.json` → add `"with_agent_api": true`, commit to `main` | — |
| A4 | Deploy | GitHub → Actions → **Deploy intelligence** → *Run workflow* (or `node scripts/deploy-intelligence.mjs --with-agent-api` after `npx wrangler login`) | the run prints `AGENT_DB=… · AGENT_API_ENABLED=true` and `/api/agent/whoami -> 401` |
| A5 | Mint **one key per agent**, least privilege (plaintext is printed once) | `node scripts/agent-key.mjs create --name "ULTRON" --scopes status:read,catalog:read,audit:read,waitlist:stats,kv:read,kv:write --expires 2027-01-31T00:00:00Z --remote --database monte-wo-intelligence` | you have `mwa_…` |
| A6 | Put the key where the agent runs — **and nowhere else** | the agent platform's secret store, or the MCP client's `env` block | key never appears in chat, Git, tickets or logs |
| A7 | Record the production origin | `https://<project>.pages.dev` from the deploy output, or the custom domain once set | you have `MONTE_WO_AGENT_URL` |

Scope presets (from `AGENT_API.md` §7): ULTRON `status:read,catalog:read,kv:read,kv:write` · ARGON `status:read,kv:read,kv:write` · AU `status:read,catalog:read,audit:read,waitlist:stats,kv:read,kv:write` · TITAN `status:read,catalog:read,audit:read,kv:read`. Never `*`. Add `--ips <egress ip>` when the agent has a fixed address. Waitlist e-mails (`waitlist:read` + server flag `AGENT_PII_ENABLED`) and reviewer/admin Strength automation (`AGENT_STRENGTH_PRIVILEGED_ENABLED`) stay off unless you decide otherwise.

Revoke at any time: `node scripts/agent-key.mjs revoke --id <keyid> --remote --database monte-wo-intelligence` (takes effect on the next request). Kill-switch for everything: redeploy without `with_agent_api`.

---

## Part B — What the agent receives

### B1. One file + two variables

* **File**: `scripts/agent-mcp.mjs` (single file, zero dependencies, Node ≥ 18 — copy it anywhere; it discovers the tools from the server, so it never goes stale).
* **Variables** (from the secret store, never typed into a prompt):

| Variable | Value |
|---|---|
| `MONTE_WO_AGENT_URL` | production origin, e.g. `https://vitaflex-monte-wo-live.pages.dev` (no path) |
| `MONTE_WO_AGENT_KEY` | the key from A5 (`mwa_<16 hex>_<43 chars>`) |

### B2. Connect — pick the agent's shape

**MCP-capable agent (Claude Desktop, Claude Code, Cursor, Windsurf, any MCP client).** The file is a stdio MCP server; the agent gets the tools its key allows, each with the server's JSON schema, plus an `instructions` brief generated from the key's actual scopes and the server's policy flags.

```jsonc
// Claude Desktop → claude_desktop_config.json (or the equivalent mcpServers block of your client)
{
  "mcpServers": {
    "monte-wo": {
      "command": "node",
      "args": ["/absolute/path/to/scripts/agent-mcp.mjs"],
      "env": { "MONTE_WO_AGENT_URL": "https://<origin>", "MONTE_WO_AGENT_KEY": "<from the secret store>" }
    }
  }
}
```
```sh
# Claude Code
claude mcp add monte-wo -e MONTE_WO_AGENT_URL=https://<origin> -e MONTE_WO_AGENT_KEY=<from the secret store> -- node /absolute/path/to/scripts/agent-mcp.mjs
```

**Shell / cron / any HTTP agent.** Same file as a CLI, JSON on stdout, exit codes `0` success · `1` the API refused or failed · `2` usage error:

```sh
node scripts/agent-mcp.mjs check                      # identity + readiness; exit 0 only if the agent can work
node scripts/agent-mcp.mjs tools                      # what this key may call
node scripts/agent-mcp.mjs call get_status
node scripts/agent-mcp.mjs call get_audit '{"limit":20}'
node scripts/agent-mcp.mjs call put_memory '{"key":"lock:nightly-report","body":{"owner":"AU"},"header_If_Match":0}'
```

**Framework that wants raw HTTP** (LangChain/OpenAI tools, custom code): `GET $URL/api/agent/tools` is a function-calling manifest, `GET $URL/api/agent/openapi.json` the OpenAPI 3.1 document; every call is `Authorization: Bearer $KEY`, JSON in, JSON out, errors `{"error":"<code>"}`.

### B3. The brief (paste into the agent's system prompt — the MCP server also sends it as `instructions`)

> You operate the MONTE WO Agent API with a scoped key. Use only the tools you were given; if a call answers 403 or 503, report it and stop — do not retry with other means, do not guess.
>
> **Product rules you never work around:** four independent disciplines (Squat, Bench Press, Deadlift, Biceps Curl), nine ranks each (Debitan → Lejand), no combined or overall rank; ranks are never awarded manually (the API refuses and audits any attempt); self-reported performances are *Provisional* at most, *Verified* only after an authorized evidence review; draft standards cannot award official ranks.
>
> **Honesty:** report only what the API returned. "Not connected" / "unavailable" (HTTP 503) is a valid answer. Never invent thresholds, rankings, users, signups or metrics.
>
> **Coordination with other agents:** shared memory is namespaced — `lock:<task>` (create with `header_If_Match: 0`; exactly one agent wins, the others get 409 and must back off), `checkpoint:<agent>`, `incident:<id>`, `note:<topic>`. Release or bump only your own locks; never delete another agent's keys; values are JSON ≤ 64 KB.
>
> **Rate limit:** per-key budget per 10 minutes (shown by `whoami`); on 429 wait `retryAfter` seconds. Poll `get_status` no more than once a minute.
>
> **Privacy:** every call is audited under your key. Never copy personal data (waitlist e-mails) into memory keys, logs or summaries — if you do not hold `waitlist:read`, you cannot see it, by design.
>
> **Escalate to the owner instead of acting** when: a storage shows `error` in `get_status`; the audit tail shows calls you did not make; you need a scope or role you do not have; anything requires a Cloudflare, DNS, deployment, key or store-release change.

### B4. A sane operating loop (monitoring agent)

| Every | Call | Act on |
|---|---|---|
| 1–5 min | `get_status` | any `storage.*` = `error`, a feature flag flipping, `features.agentApi.rateLimit` change → incident note + escalate |
| 15 min | `get_memory checkpoint:<me>` → work → `put_memory checkpoint:<me>` | resume after restarts; never redo finished work |
| 1 h | `get_metrics`, `waitlist_stats` (if granted) | trends only; counts, never addresses |
| 6 h | `get_audit {"limit":200}` | denials (`outcome: denied`) you did not cause, unknown key ids → escalate |
| before any multi-step task | `put_memory lock:<task>` with `header_If_Match: 0` | 201 = proceed; 409 = someone else owns it, back off |

---

## Part C — Acceptance test (owner or agent, 1 minute)

```sh
export MONTE_WO_AGENT_URL=https://<origin> MONTE_WO_AGENT_KEY=<from the secret store>
node scripts/agent-mcp.mjs check
```

Expected: exit `0`, stderr `OK: key "<name>" can use N tools`, and JSON with `key.name`, `effectiveScopes`, `policy: {pii:false, privilegedStrength:false}`, `rateLimit`, `usableTools`, and `status.storage.agentDatabase: "ok"` (`waitlistDatabase` / `strengthDatabase` will read `not-bound` in production until those databases exist — that is honest, not broken).

| Outcome | Meaning | Fix |
|---|---|---|
| `Agent API is not enabled at … (404)` | A3/A4 not done (or the URL points at the git-connected project, where the flag is unset) | run the opt-in deploy; use the `-live` origin |
| `whoami failed (HTTP 401 …)`, exit 1 | wrong/revoked/expired key | mint a new key (A5); check `--ips` |
| `HTTP 503 agent-db-not-bound` | flag on but no `AGENT_DB` binding | redeploy through the script, not the dashboard |
| exit 0 but `usableTools` shorter than expected | scopes narrower than intended | revoke and mint with the right scopes — never widen to `*` |

---

## What was verified (and what was not)

| Check | Result |
|---|---|
| `npm run test:agent-mcp` — MCP handshake (version negotiation, instructions), tool filtering by scopes/role, binary ops hidden, `tools/call` mapping of path/header/body/query, HTTP failures as `isError` results, JSON-RPC errors for misuse, batch + parse errors, stdout = JSON-RPC only, product rules through the client (athlete cannot see reviewer tools; server still refuses when forced), CLI exit codes, wrong key, disabled API, missing URL | **6/6 PASS** — against the real `server/agent.js` over a real HTTP socket with SQLite-backed D1 |
| Real Workers runtime (`npm run db:local && npm run dev:agent`, wrangler `pages dev`): `check` → exit 0, 10 usable tools; `put_memory lock:…` 201 then 409; full MCP session (`initialize` → `tools/list` → `get_status` → `get_audit`) | **PASS** (2026-10-31) |
| Against production | **not possible yet** — endpoint does not exist until Part A is done |

Reference: `docs/release/AGENT_API.md` (API, scopes, policy flags, production plan, rollback) · `AGENTS.md` (operating contract).
