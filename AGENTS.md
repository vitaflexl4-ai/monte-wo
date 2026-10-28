# AGENTS.md — how AI agents (and humans) work on MONTE WO

This file is the operating contract for autonomous agents that improve and run this product. Two surfaces exist:

1. **Code and content (the app + the website)** — Git + CI + Cloudflare Pages previews. There is no runtime "edit the site" API: the website and the app shell are *generated* from `content/` and `scripts/` into `public/`, packaged for Android/iOS from `public/` by `scripts/build_native.py`.
2. **Runtime operations (24/7)** — the Agent API at `/api/agent/*` (`docs/release/AGENT_API.md`): monitoring, waitlist operations, shared agent memory, and the complete governed Strength Index API as a linked principal.

## Non-negotiable product rules (enforced by code and tests — do not try to work around them)

* Four independent disciplines — Squat, Bench Press, Deadlift, Biceps Curl — with nine ranks each: Debitan, Bati, Solid, Fò, Avanse, Mèt, Chanpyon, Titan, Lejand. **No combined or overall rank. Ranks never transfer between disciplines.**
* **Provisional** for self-reported performances; **Verified** only after an authorized evidence review by a reviewer who is not the athlete. **No manual rank awards** (`/rank`, `/award`, `/override` are denied and audited).
* Unapproved standards stay **DRAFT — NOT OFFICIAL** and cannot award official ranks; publication requires publisher ≠ author, a digest on the approved allow-list and `RANKING_PUBLISH_ENABLED`.
* Performance history, methodology versions and audit records are **append-only** (database triggers).
* Honest states everywhere: "Not Connected", "Demo", "Draft", "not configured for this build" — never pretend to have users, verified achievements, official rankings, live food data or integrations.
* Official terms: MONTE WO Strength Index™, MONTE Standard, MONTE Climb Scale, MONTE Verified, Discipline Rank.

## Repository map

| Path | What | Edit? |
|---|---|---|
| `content/` | Page content, exercise library data, strength standards (drafts), dashboard copy | yes — source of truth |
| `scripts/build_*.py` | Generators → `public/` (`npm run build` runs them all, deterministic) | yes |
| `public/` | **Generated** HTML + hand-written JS/CSS/assets (`public/*.js`, `public/*.css`, `public/assets/`) | HTML: **never by hand** — rerun `npm run build`. JS/CSS: yes |
| `server/` + `functions/api/[[route]].js` | Cloudflare Pages Functions: waitlist, Strength Index (`server/strength/`), native clients (`server/native.js`), Agent API (`server/agent.js`) | yes, with tests |
| `migrations/` | D1 migrations, forward-only, numbered | add new files only; never modify applied ones |
| `tests/` | Unit (`*.test.js`, `node --test`) and browser suites (`*.mjs`, Playwright) | yes — add tests with every change |
| `android/`, `ios/`, `capacitor.config.json`, `scripts/build_native.py` | Native shells (Capacitor 8) around the web build | yes; keep app id `com.vitaflex.montewo` |
| `docs/release/` | Architecture, build/setup, web/Android/iOS release, privacy/store checklist, release status, Agent API | keep `RELEASE_STATUS.md` current |
| `docs/website/baseline.json`, `docs/strength-lab-baseline.json` | Hash guards for protected files (backend, migrations, assets, dependencies) | update **only** the entries you intentionally changed, with a minimal edit |

## Working loop (code improvements)

```sh
npm ci                                # Node 22, Python 3
npm run build                         # regenerate public/ (must leave no diff if sources are unchanged)
npm test                              # all unit suites (one documented pre-existing INTER-LICENSE baseline item fails on main)
npm run dev                           # wrangler pages dev on :8080 (website at /, app shell at /dashboard/)
npm run build:native && npm run preview:native   # packaged app on :3000
npm run test:native && npm run test:native-api && npm run test:agent-api && npm run test:strength
# browser suites (need Playwright Chromium + the dev server / preview running):
npm run test:website && npm run test:browser && npm run test:phase2 && npm run test:library && npm run test:ranks && npm run test:strength-browser && npm run test:lab-browser && npm run test:dashboard-browser && npm run test:native-browser
```

1. Work on a feature branch (never on `main`). Keep changes incremental and reversible; preserve brand assets, exercise assets, rank names and working features.
2. Source changes → `npm run build` → commit the regenerated output together with the sources. CI (`.github/workflows/ci.yml`) fails if `npm run build` produces a diff.
3. Add or update tests for behaviour you change; run the suites above and report *actual* results (never claim a pass you did not run).
4. Push: CI runs on every branch; Cloudflare Pages builds a **preview** for the branch (owner-configured Git integration). Native builds run when the commit message contains `[build-native]` on `arena/**` branches (Android `.aab` artifact, iOS simulator compile).
5. Open a pull request with the evidence (tests run, previews). **Merging to `main` is a production deployment — only the owner merges.**

## Never

* Commit keys, tokens, passwords, keystores, provisioning profiles, private evidence or production data; `.env.example` holds placeholders only.
* Edit generated HTML in `public/` by hand, rewrite baseline JSON files wholesale, or modify an applied migration.
* Change Cloudflare settings, DNS, bindings, the `monte-wo-waitlist`/`flex-ai-db` resources, or submit store releases — these are owner actions.
* Invent thresholds, award ranks, mark anything Verified, or publish a standard without the governed process.

## Runtime operations (the two 24/7 agents)

Keys are issued by the owner with `node scripts/agent-key.mjs create …` (plaintext shown once; store it in the agent's secret manager). Discover tools from `GET /api/agent/tools`, authenticate with `Authorization: Bearer mwa_…`, coordinate through `PUT /api/agent/kv/<key>` with `If-Match`. Full reference, scopes and the suggested operations loop: `docs/release/AGENT_API.md`.
