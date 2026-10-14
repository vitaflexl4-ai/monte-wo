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

## 6. Native ↔ API: the design still to approve (not implemented)

1. **API origin injection** — the native bundle needs an absolute API origin (`https://<confirmed production domain>`); the production origin is still unconfirmed (`docs/website/OPERATIONS.md` §"Production origin"). Proposed: `scripts/build_native.py` reads `NATIVE_API_ORIGIN` and writes it into the injected marker (`window.__MW_NATIVE`), and the three fetch sites (`site.js`, `strength.js`, `app.js`) prefix it.
2. **Origin policy** — allow exactly `https://localhost` (Android) and `capacitor://localhost` (iOS) as additional trusted origins for POST + CORS with credentials disabled; keep same-origin for the web.
3. **Authentication** — Cloudflare Access cookies do not flow from a WebView origin. Options: (a) Access-for-SaaS/OIDC login in the system browser with PKCE, token sent as `Cf-Access-Jwt-Assertion` header; (b) first-party token issuance by a new `/api/auth/*` endpoint. Either is a governance change (new principal provisioning path) and needs owner approval.
4. **Evidence upload from device** — camera/file plugins + permission disclosures (Play Data safety / Apple privacy labels change from "no data" to "user content, health & fitness").

Until 1–3 are approved and built, the native apps are **offline product shells**: honest, functional for the Step-1 scope, not connectable to accounts or rankings.

## 7. Change inventory of this step (all reversible)

* Added: `capacitor.config.json`, `android/`, `ios/` (+ shared scheme), `scripts/build_native.py`, `scripts/native_preview.mjs`, `tests/native.test.js`, `tests/native-browser.mjs`, `.github/workflows/{android-release,ios-build}.yml`, `.env.example`, `docs/release/*`.
* Modified: `package.json` (Capacitor deps pinned 8.5.3; scripts `build:native`, `native:sync`, `native:android`, `native:ios`, `preview:native`, `test:native`, `test:native-browser`), `package-lock.json`, `.gitignore` (`/build/`, Android copied assets, signing material, `.env*`), `android/app/build.gradle` (env-driven version + signing), `docs/website/baseline.json` (new hashes of `package.json`/`package-lock.json` only), `public/{dashboard,app,site}.js` (one-line guard: skip service-worker registration when `window.__MW_NATIVE`).
* Untouched: brand assets, exercise assets, rank names/artwork, API security, migrations, Cloudflare configuration, generated HTML (regenerated by the build, byte-identical).
