# MONTE WO — multi-platform architecture

**Status:** implemented in this repository (branch `arena/7a19420f-monte-wo`), native binaries not yet compiled (see `RELEASE_STATUS.md`).
**Product:** MONTE WO by VitaFlex Business Group — MONTE WO Strength Index™, MONTE Standard, MONTE Climb Scale, MONTE Verified, Discipline Rank.

## 1. Decision: one web codebase, wrapped natively (Capacitor)

| Option considered | Verdict | Why |
|---|---|---|
| Keep the existing web app and wrap it in **Capacitor** native shells (Android + iOS) | **Chosen** | Zero rewrite. The whole product (49 pages, app shell, Strength Lab, Exercise Library, generated from `content/` + `scripts/`) ships unchanged to all three platforms. The API, database and governance code stay exactly where they are. Native capabilities (camera for food scan, secure storage, push) can be added later as plugins, behind the same honest "Not Connected / Demo" gating. |
| React Native / Flutter rewrite | Rejected | Would duplicate every page and the brand system, create a second codebase to keep in sync with the generators, and bring no benefit for a content + forms + WebView-friendly product at this stage. Explicitly a "disruptive migration" the prompt asks to justify first — it is not justified. |
| PWA only ("the website is enough") | Rejected | Store listings need real binaries; a bare web wrapper with no app-specific value is also the main App Store rejection risk (Guideline 4.2). Capacitor gives a path to add device features and still keep one codebase. |

What Capacitor is: an Apache-2.0 runtime (`@capacitor/core`, `@capacitor/android`, `@capacitor/ios` 8.5.3, pinned exactly in `package.json`) that embeds a WebView and serves the bundled web files from a local origin (`https://localhost` on Android, `capacitor://localhost` on iOS). It is not a hosted service; nothing phones home.

## 2. Repository layout (what is where)

```
content/            page copy, catalogs, draft MONTE Standard rulebooks (content/strength/*-draft-1.json)
scripts/            Python generators: build_tools, build_library, build_strength, build_lab, build_website,
                    build_dashboard (app shell)  → `npm run build` writes public/ (never edit generated HTML)
                    build_native.py  → derives build/native/ (Capacitor webDir) from public/
                    native_preview.mjs → serves build/native/ with Capacitor's routing rules (preview + tests)
public/             Cloudflare Pages output: website, /dashboard/ app shell, JS, CSS, assets, sw.js, manifests
functions/api/[[route]].js   single Pages Function → server/ (all /api/* routes)
server/             waitlist.js, strength/{api,auth,engine}.js (Strength Index API, Access-JWT auth, eligibility engine)
migrations/         D1 SQL: 0001_waitlist.sql, 0002_strength_index.sql (append-only achievement tables)
capacitor.config.json        appId com.vitaflex.montewo, appName "MONTE WO", webDir build/native
android/            Capacitor Android project (Gradle; env-driven version + signing)
ios/                Capacitor iOS project (Xcode, Swift Package Manager; shared scheme "App")
.github/workflows/  android-release.yml (manual: .aab artifact), ios-build.yml (manual: simulator compile check)
tests/              Node unit suites (*.test.js) + browser suites (*.mjs, Playwright)
docs/release/       this documentation set
brand-assets/, exercise-packages/   approved brand + rank artwork, exercise media provenance
```

## 3. Runtime topology

```
┌──────────────── clients ────────────────┐        ┌──────────── Cloudflare ────────────┐
│ Web browser  → https://<production>/     │ ─────▶ │ Pages (static public/)              │
│ Android app  → https://localhost/ (local │  /api  │ Pages Functions functions/api/…     │
│   WebView, bundle from build/native)     │ ─────▶ │   ├─ server/waitlist.js  → D1 `DB`  │
│ iOS app      → capacitor://localhost/    │        │   ├─ server/strength/*   → D1 `DB`, │
│   (WKWebView, same bundle)               │        │   │     R2 RANKING_EVIDENCE (private)│
└──────────────────────────────────────────┘        │   └─ /api/gifs/* → R2 WORKOUT_GIFS  │
                                                    │ Access (JWT) in front of /api/strength│
                                                    └─────────────────────────────────────┘
```

* **Web**: unchanged. `/` is the public site; `/dashboard/` is the app shell (Step 1). Whether the app should also become `/` is still an owner decision (not changed).
* **Native**: the packaged root document is the app shell (`build/native/index.html` = `public/dashboard/index.html`). All 49 web pages are packaged too, reachable through explicit `…/index.html` links (Capacitor's local server returns the root document for any extension-less path — verified in `@capacitor/android` `WebViewLocalServer.java` and `@capacitor/ios` `Router.swift`; `scripts/build_native.py` rewrites 1,366 links accordingly). Excluded from the bundle: `sw.js` (no service worker in-app), `_headers`/`_redirects` (Pages-only), `robots.txt`, and `strength/admin/` (reviewer console stays web-only behind Cloudflare Access).
* **API from native — not wired yet (by design, pending decision).** Both server modules enforce same-origin on POST (`request.headers.get('Origin')===url.origin`) and the Strength Index relies on Cloudflare Access cookies/JWT. A WebView at `https://localhost` therefore cannot write to the API today, and the pages degrade honestly (waitlist: "Signup availability could not be checked. Nothing has been submitted."; Strength pages: catalog/readiness probes fail, no fake state). Enabling it requires a deliberate security design, documented in §6 — it was **not** silently weakened.

## 4. Product rules — where they are enforced (unchanged by this work)

| Rule | Enforcement point | Test (executed, see RELEASE_STATUS) |
|---|---|---|
| 4 independent disciplines, 9 ranks each, no combined rank | `server/strength/engine.js` (`DISCIPLINES`, `RANK_IDS`), `public/ranks.json`, app shell copy | `strength-engine.test.js` (#1, #9, #13), `native.test.js` (#8) |
| No invented thresholds; drafts cannot award official ranks | engine `evaluate()` requires approved model + rulebook; bundled models are draft with empty thresholds; publication needs independent reviewer + allow-listed digest | `strength-engine.test.js` (#3), `strength-api.test.js` (#4, #9, #10) |
| Provisional (self-reported) vs MONTE Verified (reviewed evidence, no self-approval) | engine `verified` predicate; API review flow; DB triggers | `strength-engine.test.js` (#8), `strength-api.test.js` (#6, #8, #11) |
| Boundary exactness (below / at / above every rank) | engine fixed-point arithmetic | `strength-engine.test.js` (#2, #11) |
| Transparent history, methodology versions, audit | append-only `mw_results`, `mw_rank_history`, `mw_audit`; UPDATE/DELETE rejected by triggers | `strength-api.test.js` (#9, #11, #13) |
| Evidence privacy and ownership | owner/reviewer-only `GET /evidence/:id`, private R2, cross-owner blocked in DB | `strength-api.test.js` (#5, #11) |
| Auth: verified Access JWT, RBAC, CSRF/origin, rate limits, fail-closed when unconfigured | `server/strength/auth.js`, `api.js` | `strength-api.test.js` (#2, #3, #12) |

## 5. Data model (D1, `migrations/0002_strength_index.sql`)

`mw_principals` (operator-provisioned identities + roles) · `mw_profiles` (immutable revisions) · `mw_disciplines` · `mw_rank_definitions` (9) · `mw_rulebooks` / `mw_models` (immutable versions, draft until published) · `mw_publications` · `mw_performances` (immutable submissions) · `mw_evidence` (private R2 keys, SHA-256) · `mw_reviews` · `mw_results` · `mw_rank_history` · `mw_audit` · `mw_rate_limits`. Waitlist tables from `0001_waitlist.sql`: `waitlist`, `waitlist_rate_limits`. Schema, invariants and operations: `docs/strength/OPERATIONS.md`, `docs/strength/METHODOLOGY.md`.

## 6. Native ↔ API: implemented behind a flag (default OFF)

Approved direction: proceed flag-gated and tested, with no Cloudflare changes performed from here. Everything below is **inert until the owner sets `NATIVE_CLIENTS_ENABLED=true`** on the Pages project; with the flag off the API behaves byte-for-byte as before (asserted by `tests/native-api.test.js` test 1 and the unchanged 27 Strength Index tests).

| Piece | Where | Behaviour |
|---|---|---|
| API origin in the bundle | `scripts/build_native.py` → `window.__MW_NATIVE={platform,appId,scheme,apiOrigin}` in every page; recorded in `native-build.json` | `NATIVE_API_ORIGIN` must be a bare `https://` origin or the build aborts. Empty (default) ⇒ the app says "Ranking services are not configured for this app build. Nothing has been sent." |
| Trusted origins | `server/native.js` `NATIVE_ORIGINS` = `https://localhost` (Android WebView) and `capacitor://localhost` (iOS WKWebView) | accepted for POST/CORS **only** when the flag is on; web stays same-origin; no `Access-Control-Allow-Credentials`, exact-origin echo, `Vary: Origin` |
| CORS / preflight | `functions/api/[[route]].js` (`OPTIONS` → 204 with allow-list; responses wrapped) | strangers get no CORS headers at all |
| Token transport | `server/strength/auth.js` via `bearerToken()` | web: `Cf-Access-Jwt-Assertion` (edge-injected). Native: the same self-hosted Access JWT sent as `cf-access-token` (Cloudflare Access validates it at the edge and injects the assertion); `Authorization: Bearer` also read for local tests. Verification (RS256 via Access JWKS, audience, expiry, issuer) is unchanged — no new identity provider, no new principal provisioning path. |
| Sign-in handoff | `GET /api/strength/native-login?state&challenge` (behind Access) → `com.vitaflex.montewo://auth?code&state` → `POST /api/strength/native-token {code,verifier}` | PKCE S256; code is single-use, 120 s, bound to the challenge **and** to the token's hash; the JWT itself never appears in a URL; both steps audited (`native-login-code-issued`, `native-token-exchanged`). The exchange endpoint is public by design (404 `native-clients-disabled` when the flag is off, 403 for non-native origins). |
| Client | `public/strength.js` (native branch only), `@capacitor/app` (deep-link `appUrlOpen`/`getLaunchUrl`), `@capacitor/browser` (system browser tab) | token kept in `localStorage['mw-native-token']`, cleared on 401; requests use `credentials:'omit'`. The waitlist is intentionally **not** exposed inside the app ("use the website", nothing submitted). |
| Deep link registration | `android/app/src/main/AndroidManifest.xml` (VIEW/BROWSABLE, scheme `com.vitaflex.montewo`, host `auth`), `ios/App/App/Info.plist` (`CFBundleURLTypes`) | custom scheme, not Universal/App Links (those need the production domain; see §"Later") |
| Storage | `migrations/0007_native_auth_codes.sql` → `mw_native_auth_codes` | operational only — no achievement/standards tables touched |

**Owner actions before turning it on** (none performed here): apply migration 0007; add a Cloudflare Access *public* exception for `/api/strength/native-token` (same style as `/config` and `/catalog`); allow the two native origins in the Access application's CORS settings (or set "bypass OPTIONS requests to origin") with headers `cf-access-token, content-type`; set `NATIVE_CLIENTS_ENABLED=true`; rebuild the native bundle with `NATIVE_API_ORIGIN=https://<production origin>`.

**Not verified (needs the real edge):** that Cloudflare Access accepts `cf-access-token` for a self-hosted application exactly as documented and that its CORS settings pass the preflight; the first run against the deployed Pages preview + Access app will prove or disprove it in minutes (`ANDROID_RELEASE.md` §6 device checklist).

**Later:** evidence upload from the device (camera/file plugins ⇒ privacy-label changes), Universal/App Links once the domain is fixed, and sign-out UX.

## 6b. Agent API: automation access for AI agents (flag `AGENT_API_ENABLED`, default OFF)

`server/agent.js` + `migrations/0008_agent_api.sql`, routed by `functions/api/[[route]].js` under `/api/agent/*`. Operator-issued bearer keys (`mwa_<id>_<secret>`, stored as SHA-256) with per-key scopes, optional IP allow-list, expiry, revocation, per-key rate limit and an append-only audit of every call. Storage: its own binding **`AGENT_DB`** (keys/rate/audit/memory — never the waitlist database; missing ⇒ `503 agent-db-not-bound`), Strength data through `APP_DB` (same rule as `server/strength/api.js`), waitlist through `DB`. Operations: readiness/metrics for 24/7 monitoring, catalog, audit tails, waitlist operations (stats without personal data; list/deletion requests), a shared JSON memory with optimistic concurrency for multi-agent coordination, and the **complete Strength Index API proxied to `handleStrength` as the key's linked principal** (`deps.authenticate` injection — the only change to the Strength handler), so athlete/reviewer/admin operations are available to agents under exactly the same governance checks, ownership rules and audit as for humans. Two server policy flags stay off by default: `AGENT_PII_ENABLED` (waitlist e-mails) and `AGENT_STRENGTH_PRIVILEGED_ENABLED` (reviewer/admin principals). Not connected to the Intelligence Command Center (§ `docs/INTELLIGENCE-COMMAND-CENTER.md`): ARGON/ULTRON/AU/TITAN are in-process jobs on `INTEL_DB`. OpenAPI 3.1 and a function-calling tool manifest are generated from the same operation table. Principal provisioning, Cloudflare settings and code changes stay outside the API by design (`AGENTS.md`, `docs/release/AGENT_API.md`).

## 7. Change inventory of this step (all reversible)

* Added: `capacitor.config.json`, `android/`, `ios/` (+ shared scheme), `scripts/build_native.py`, `scripts/native_preview.mjs`, `tests/native.test.js`, `tests/native-browser.mjs`, `.github/workflows/{android-release,ios-build}.yml`, `.env.example`, `docs/release/*`.
* Modified: `package.json` (Capacitor deps pinned 8.5.3; scripts `build:native`, `native:sync`, `native:android`, `native:ios`, `preview:native`, `test:native`, `test:native-browser`), `package-lock.json`, `.gitignore` (`/build/`, Android copied assets, signing material, `.env*`), `android/app/build.gradle` (env-driven version + signing), `docs/website/baseline.json` (new hashes of `package.json`/`package-lock.json` only), `public/{dashboard,app,site}.js` (one-line guard: skip service-worker registration when `window.__MW_NATIVE`).
* Untouched: brand assets, exercise assets, rank names/artwork, API security, migrations, Cloudflare configuration, generated HTML (regenerated by the build, byte-identical).
