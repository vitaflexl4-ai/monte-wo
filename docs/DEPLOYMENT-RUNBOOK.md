# MONTE WO — Production Deployment Runbook (Intelligence Command Center)

One-time setup to take the Intelligence Command Center (dashboard + AU ROOM + scheduled
agents) from this repository to an operational Cloudflare deployment on the **free tier**,
fail-closed at every step. Nothing here needs a credit card, and no credentials ever pass
through chat or the repository.

Everything wrangler-reachable is automated by **`scripts/deploy-intelligence.mjs`**. The two
things only you (the account owner) can do are marked **OWNER**.

---

## 0. What gets deployed

| Piece | What it is | Cost |
|---|---|---|
| Cloudflare Pages project | Static site (`public/`) + Pages Functions API (`functions/`) | free |
| D1 database `monte-wo-intelligence` | Incidents, runs, evidence, briefings, automation rules | free tier |
| Worker `monte-wo-intelligence` | Scheduled runtime: ULTRON every 5 min, ARGON+AU hourly, AU daily/weekly | free tier |

Automation rules deploy **disabled** (DB defaults). The worker's master switch
`INTELLIGENCE_ENABLED` only turns on with `--enable-worker`. The API refuses every request
until Cloudflare Access is configured (`intelligence-not-configured` / `authentication-required`).

---

## 1a. Deploy with NO local machine — GitHub Actions (recommended)

One secret, then the deployment runs on GitHub and can be triggered from the PR conversation:

1. **Create a Cloudflare API token** (My Profile → API Tokens → Create Token → *Custom token*):
   - Account · **Cloudflare Pages** · Edit
   - Account · **D1** · Edit
   - Account · **Workers Scripts** · Edit
2. **Add it as a repository secret** named `CLOUDFLARE_API_TOKEN`:
   GitHub → this repo → Settings → Secrets and variables → Actions → New repository secret.
   (The value never appears in chat, the repo, or any log.)
3. **Deploy**: ask the agent to deploy (a `[deploy]` commit is pushed and the run is monitored),
   or after merging the PR use the *Run workflow* button on the *Deploy Intelligence Command
   Center* workflow. All deployment values come from the committed `deploy.config.json`
   (project name, worker on/off, waitlist binding — no secrets there).

The workflow only deploys on an explicit `[deploy]` commit marker or a manual dispatch —
a normal push never touches production.

## 1b. Deploy from a local machine (alternative)

> **The deploy tooling lives on the PR branch, not `main`.** If `npm run deploy:intelligence`
> says *"Missing script"* you are on `main` — check out the branch first:
> `gh pr checkout 16` (or `git fetch && git checkout arena/42a98d64-monte-wo`).

```bash
npx wrangler login          # opens your browser; the script never sees credentials
npm run deploy:intelligence -- \
  --access-issuer https://YOURTEAM.cloudflareaccess.com \
  --access-aud YOUR_ACCESS_APPLICATION_AUD \
  --operator you@example.com \
  --enable-worker
```

The script: ensures + migrates the D1 (0003→0004→0005, gated on table presence), writes the
real bindings into `wrangler.toml` (marked, idempotent), grants your operator row, runs
`npm run build`, deploys Pages by direct upload, deploys the worker, and verifies the live API
**fails closed** (a 200 from `/api/intelligence/overview` without login aborts with an error).

The full flow — including every failure path (no auth, missing flags, git-connected project,
missing project, unauthenticated-200 abort, partial migrations, alternate project name) — is
covered by a hermetic simulation of wrangler: `npm run test:deploy` (no Cloudflare account
needed, ~2s).

Useful modes:

```bash
npm run deploy:intelligence:check                          # preflight only, no Cloudflare login needed
npm run deploy:intelligence -- --grant-operator "<sub>"    # grant after reading a 403 hint
npm run deploy:intelligence -- --project-name vitaflex-monte-wo-live ...  # if the existing project rejects direct upload (see §4)
```

If Pages refuses because the existing project is git-connected, the script explains the two
options; the non-destructive one is `--project-name vitaflex-monte-wo-live` (the old project
keeps serving until you switch, and `--with-waitlist` rebinds the waitlist DB for continuity).

## 2. Cloudflare Access (OWNER — ~2 minutes, required for the dashboard)

Zero Trust → **Access → Applications → Add → Self-hosted**:

- Domain: `vitaflex-monte-wo.pages.dev` (or your `--project-name`), path `/intelligence/`
- Add a second application for path `/api/intelligence/` (same policy)
- Policy: Include → Emails → your address. Login method: One-time PIN is enough.
- Copy into the deploy command:
  - `--access-issuer` = your team domain (`https://<team>.cloudflareaccess.com`)
  - `--access-aud` = the application's **AUD** (shown in the application's JWT/Advanced section)

The API verifies the Access JWT cryptographically (RS256 against the Access CDN keys) and then
checks the `intel_operators` table. An authenticated-but-unauthorized visitor gets a 403 whose
body contains the exact `--grant-operator` command with **their own** subject.

## 3. Verify it is operational (honest checks)

```bash
curl -s https://YOUR-PROJECT.pages.dev/api/intelligence/overview        # 401 authentication-required (fail-closed, good)
# log in through the Access-protected /intelligence/ — KPIs, 8 views, AU ROOM (#/room)
# the AU ROOM: real actions move agents through their lifecycle; DEMO mode is watermarked
```

In the dashboard: **Agents view → last run timestamps** advance on the worker schedule
(ULTRON ≈ every 5 minutes). The Overview health derives from recorded runs — never a guess.

## 4. The failing git builds (why direct upload)

Every push currently fails the git-connected Pages build (all commits, including `main`'s tip,
have `Cloudflare Pages: failure`). The repo itself builds cleanly (`npm ci` + `npm run build`
both pass locally), so the cause is the dashboard build configuration — visible in one click:
**Pages → vitaflex-monte-wo → Settings → Builds** (also the place to set the build command to
empty and serve the committed `public/`, or to disable git builds entirely once direct upload
is your pipeline).

## 5. Optional (OWNER)

- **Custom domain**: Pages → project → Custom domains. Then update the worker `SITE_URL`
  (`intelligence-worker/wrangler.toml`) and redeploy the worker so ULTRON monitors the real origin.
- **Secrets** (generate locally, e.g. `openssl rand -hex 32`; never through chat):
  `npx wrangler pages secret put INTELLIGENCE_INGEST_KEY --project-name <name>` (mobile telemetry),
  `cd intelligence-worker && npx wrangler secret put INTEL_WEBHOOK_URL` / `INTEL_WORKER_KEY`.
- **Waitlist continuity** on a new project: `--with-waitlist` (binds `monte-wo-waitlist` if it
  exists on the account); Turnstile secrets must be re-set with `wrangler pages secret put`
  (`TURNSTILE_SECRET`, `RATE_LIMIT_SALT`) since secrets never copy between projects.

## 6. Rollback

- Pages: dashboard → Deployments → promote the previous one (instant, no rebuild).
- Worker: `cd intelligence-worker && npx wrangler deployments list` / `rollback`, or set
  `INTELLIGENCE_ENABLED = "false"` in `intelligence-worker/wrangler.toml` and redeploy (fail-closed).
- Automation rules: revoke from the Automation view (DB-backed, default disabled).

## 7. Standing constraints (unchanged)

$0 budget · official sources only · fail-closed · no fabricated data · automation disabled by
default and enabled only with explicit approval · production mutations only through the
reviewed API paths · demo/simulation always watermarked and isolated from production records.

### Deploy marker semantics

A push deploys **only** when the head commit message contains the literal marker
`[deploy]`. Mentioning the marker in prose (docs, comments) can trigger a run, so keep
the marker out of ordinary commit messages. A run without the `CLOUDFLARE_API_TOKEN`
secret stops at the token check (exit 3) with setup instructions in the run log —
nothing is deployed, nothing is half-deployed; every step is resumable once the secret
exists.
