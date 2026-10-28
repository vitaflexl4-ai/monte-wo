# MONTE WO — release status

_Last updated: 2026-10-14 (third pass: Agent API for 24/7 automation, general CI) · branch `arena/7a19420f-monte-wo` · base `main@b6c66da` (+ Step 1 `f47e994`, native packaging `1bf6431`)._
**Overall: NOT store-ready — but both native projects now build in CI from a clean checkout: Android `bundleRelease` produced an (unsigned) `.aab` artifact and the iOS project compiles for the simulator. Web deployable (pending owner authorization and domain; branch previews already auto-publish). Native ↔ API connectivity is implemented behind `NATIVE_CLIENTS_ENABLED` (off) and unverified against the real Cloudflare edge. Signing, store accounts, store assets, privacy forms and device testing remain owner-gated.**

## 1. Completed in this step (evidence in repo)

| # | Work | Files |
|---|---|---|
| 1 | Architecture decision documented: keep the web app, wrap with Capacitor 8.5.3 (no rewrite, shared API) | `docs/release/ARCHITECTURE.md` |
| 2 | Capacitor config + Android project + iOS project generated and committed; shared Xcode scheme added | `capacitor.config.json`, `android/`, `ios/` |
| 3 | Native bundle generator (deterministic; app shell as root; 1,366 links rewritten for Capacitor routing; web-only files excluded; native marker) | `scripts/build_native.py` → `build/native/` (git-ignored) |
| 4 | Service-worker registration skipped inside the packaged app (one-line guards) | `public/dashboard.js`, `public/app.js`, `public/site.js` |
| 5 | Env-driven Android versioning + release signing, no secrets in Git | `android/app/build.gradle`, `.gitignore`, `.env.example` |
| 6 | Manual CI: Android `.aab` artifact workflow; iOS simulator compile-check workflow (no store upload, no secrets in files) | `.github/workflows/android-release.yml`, `ios-build.yml` |
| 7 | Packaged-app preview server emulating Capacitor routing (also the user-facing app preview) | `scripts/native_preview.mjs` (`npm run preview:native`) |
| 8 | Tests: native config/bundle/security/workflow suite (9) + packaged-app browser workflow suite | `tests/native.test.js`, `tests/native-browser.mjs` |
| 9 | Release documentation set (7 files) + env reference | `docs/release/*`, `.env.example` |
| 10 | Website guard baseline updated for the intentional dependency change only | `docs/website/baseline.json` (`package.json`, `package-lock.json` hashes) |
| 11 | **Native ↔ API plumbing, flag-gated (`NATIVE_CLIENTS_ENABLED`, default off)**: trusted native origins + exact CORS/preflight, `cf-access-token` header transport for the same verified Access JWT, PKCE sign-in handoff (`/native-login` → `com.vitaflex.montewo://auth` → `/native-token`), audit entries, single-use 120 s codes | `server/native.js`, `server/strength/{auth,api}.js`, `server/waitlist.js`, `functions/api/[[route]].js`, `migrations/0003_native_auth_codes.sql` |
| 12 | Client side: API origin baked at build time (`NATIVE_API_ORIGIN`, validated), header-token requests with `credentials:'omit'`, system-browser sign-in + deep-link return (`@capacitor/app`, `@capacitor/browser`), honest "not configured for this app build" / "use the website" states | `scripts/build_native.py`, `public/strength.js`, `public/site.js`, `package.json` |
| 13 | Deep-link registration: Android VIEW/BROWSABLE intent filter, iOS `CFBundleURLTypes`; plugins synced into both projects | `android/app/src/main/AndroidManifest.xml`, `ios/App/App/Info.plist`, `android/capacitor.settings.gradle`, `ios/App/CapApp-SPM/Package.swift` |
| 14 | Tests: `tests/native-api.test.js` (6) and 2 more native tests; packaged-app browser suite extended (in-app ranking + waitlist states) | `tests/native-api.test.js`, `tests/native.test.js`, `tests/native-browser.mjs` |
| 15 | CI fix-forward: Android workflow uses the runner's preinstalled SDK (license acceptance + packages) instead of `android-actions/setup-android`; `actions/*` bumped to current majors | `.github/workflows/android-release.yml`, `ios-build.yml` |
| 17 | **Agent API** (`/api/agent/*`, flag `AGENT_API_ENABLED`, default off): operator-issued scoped keys, rate limit, append-only audit, readiness/metrics/catalog/audit, waitlist operations, shared agent memory, and the complete governed Strength Index proxied as the key's linked principal; OpenAPI 3.1 + tool manifest; key management CLI | `server/agent.js`, `migrations/0004_agent_api.sql`, `scripts/agent-key.mjs`, `functions/api/[[route]].js`, `server/strength/api.js` (one-line `deps.authenticate` hook) |
| 18 | General CI for every branch/PR (humans and agents): lockfile install, build, **generated-output sync check**, all unit suites, native bundle + suites; shared tolerant test script also used by the Android workflow | `.github/workflows/ci.yml`, `scripts/ci-unit-tests.sh` |
| 19 | Agent operating contract + API reference | `AGENTS.md`, `docs/release/AGENT_API.md` (+ `.env.example`, `BUILD_AND_SETUP.md` §3/§6/§7, `ARCHITECTURE.md` §6b, `WEB_DEPLOYMENT.md`, `PRIVACY_AND_STORE_CHECKLIST.md`) |
| 16 | Guard baselines updated **only** for the intentionally changed backend files (`server/strength/{api,auth}.js`, `server/waitlist.js`, `functions/api/[[route]].js`, `package-lock.json`) | `docs/strength-lab-baseline.json`, `docs/website/baseline.json` |

Preserved untouched: brand assets, rank artwork and names, exercise assets, the Strength Index engine and its 27 tests, migrations 0001/0002, Cloudflare configuration, generated HTML (rebuilt byte-identical). The API security model is extended only behind the flag; with the flag off every request is handled exactly as before.

## 2. Tests actually executed (sandbox, 2026-10-13)

| Check | Command | Result |
|---|---|---|
| Web build reproducibility | `npm run build` twice, hash of `public/` | **PASS** — byte-identical |
| Native bundle reproducibility | `python3 scripts/build_native.py` twice, tree hash | **PASS** — identical (also asserted in `tests/native.test.js`) |
| Unit suites | `npm test` | **121 tests: 120 pass, 1 fail** — the failure is `tests/website.test.js` "original assets … unchanged": `public/assets/INTER-LICENSE.txt` hash ≠ `docs/website/baseline.json`. **Pre-existing on `main` (verified by re-running against HEAD without my changes)** — not caused by this work; owner should decide whether the license file or the baseline is authoritative. |
| of which Strength Index engine/API/DB | `npm run test:strength` (27 tests inside `npm test`) | **PASS** — rank boundaries below/at/above for every rank × discipline, drafts cannot award, forged JWT/issuer/audience denied, RBAC/CSRF, owner-only evidence, no self-approval, admin award rejected + audited, DB triggers block cross-owner evidence and stale decisions, fail-closed when unconfigured |
| Native suite | `npm run test:native` | **11/11 PASS** (adds: `NATIVE_API_ORIGIN` injection/validation, deep-link registration + plugin sync + sign-in wiring) |
| Agent API suite | `npm run test:agent-api` (also inside `npm test`) | **11/11 PASS** — flag-off inertness; discovery/OpenAPI/tools consistency; indistinguishable unknown-id/wrong-secret, revoked/expired/IP-pinned keys, secrets never stored/echoed; default-deny scopes, 404/405, audit of every call; status/metrics/catalog with the product rules (4 × 9, no combined rank, no manual awards, DRAFT standards); waitlist pagination/stats/deletion (hash-only audit); shared memory versions/If-Match/limits; Strength passthrough: ownership, roles, `manual-rank-awards-forbidden`, publication guards, native routes blocked, inactive principal refused; per-key rate limit; `scripts/agent-key.mjs` end-to-end (hash-only SQL, printed key works, revoke works); migration shape |
| Native ↔ API suite | `npm run test:native-api` (also inside `npm test`) | **6/6 PASS** — flag-off inertness (no CORS, header token ignored, handoff routes 404/400 as before); exact CORS for the two native origins only, no credentials, strangers get nothing; same JWT accepted via `cf-access-token`/Bearer while forged/expired/wrong-audience tokens fail and the token is never echoed; handoff: code bound to PKCE challenge, single use, 120 s expiry, audited, token never in a URL; waitlist keeps configuration/Turnstile guards for native origins; migration 0003 additive only |
| Browser: website 49 routes × 320–1440 px, tools, library, ranks, strength, lab, dashboard shell | `npm run test:website`, `test:browser`, `test:phase2`, `test:library`, `test:ranks`, `test:strength-browser`, `test:lab-browser`, `test:dashboard-browser` against `wrangler pages dev` on :8080 | **all PASS** (after the JS guard change) |
| Browser: packaged app, phone viewport, Capacitor routing emulation (launch → tab bar → More drawer → demo food logger → Settings → Privacy page → brand link back to Dashboard → extension-less path → waitlist/strength degrade honestly; zero network writes; no service worker; no camera) | `npm run test:native-browser` against `npm run preview:native` on :3000 | **PASS** |
| Browser engine used | Chromium 153 (`@sparticuz/chromium`, sandbox-provided) via `PLAYWRIGHT_BROWSERS_PATH` | note: not Playwright's pinned Chromium 156; the suites are engine-agnostic |
| **GitHub Actions — iOS** | runs `38496917039`, `38498479106`, `38498829064`, `38499331971` (`iOS build check`, macos-latest, triggered by the authorized `[build-native]` pushes; from the second on including the App/Browser plugins and URL scheme) | **SUCCESS ×4** — the committed Xcode project + SPM packages compile against the native bundle for the iOS Simulator (unsigned; compile evidence only) |
| **GitHub Actions — Android** | final run `38499331981` on `2ba8b04` (`Build .aab`, ubuntu-latest, 2 min 14 s): checkout → Node 22 → Java 21 → preinstalled SDK + licenses → `npm ci` → `npm run build` → unit tests → `build:native` + `cap sync android` → `./gradlew bundleRelease` → signature report → artifact | **SUCCESS** — artifact `monte-wo-android-0.1.0-1` (4.6 MB, unsigned: no keystore secret, as the job warns; expires 2026-10-28) + `unit-test-tap-log`. Fix-forward history: `38496436798` YAML parse error; `38496917064` `android-actions/setup-android@v3` license step; `38498479114` `npm test` exit 1 (documented INTER-LICENSE item); `38498830071`/`38499117521` a new test read the gitignored `capacitor.plugins.json` (CI-only ENOENT, fixed). **Not inspected from the sandbox:** the `.aab` contents (artifact download is blocked here, like job logs) — owner: download from the run page and check with `bundletool`/`unzip -l` |

## 3. NOT verified (cannot be done here) — assumptions, clearly separated

| Item | Why not | How to verify |
|---|---|---|
| ~~Android compiles / `.aab` builds~~ **now verified in CI** (unsigned); local build still not possible in the sandbox | — | owner: `cd android && ./gradlew bundleRelease`, or run the manual workflow (`Actions → Android release bundle`) |
| ~~iOS compiles~~ **verified in CI (simulator, unsigned)**; archive/signing not verified | no macOS/Xcode here; no signing identity | owner Mac: Xcode → Archive (`IOS_RELEASE.md` §4) |
| Behaviour inside real WebViews (Android System WebView / WKWebView), safe areas, keyboard, back button | emulation only | device test checklist in `ANDROID_RELEASE.md` §6 / `IOS_RELEASE.md` §7 |
| Agent API against a deployed environment | needs owner enablement (flag, migration 0004, keys) | `curl -H 'Authorization: Bearer mwa_…' https://<origin>/api/agent/whoami` — `AGENT_API.md` §1 |
| New general CI workflow green | pushed with this pass; first run outcome recorded below when known | Actions tab → "CI" |
| Contents/installability of the CI `.aab` | artifact not downloadable from the sandbox | owner: download `monte-wo-android-0.1.0-1` from run `38499331981`, `bundletool build-apks --mode=universal` (needs signing) and install on a device |
| Cloudflare Access accepts `cf-access-token` + CORS preflight for the native origins | needs the real edge + owner's Access application; cannot be emulated offline | after the owner applies `ARCHITECTURE.md` §6 prerequisites: one sign-in from a debug build against the Pages preview |
| Native sign-in flow on a device (system browser → deep link → token exchange) | no device/emulator here; unit + browser tests cover the server and the JS logic only | checklists in `ANDROID_RELEASE.md` §6 / `IOS_RELEASE.md` §7 |
| Capacitor 8 toolchain assumptions (JDK 21, Xcode 16.x+) | from Capacitor requirements knowledge, not re-checked online (sandbox has no access to capacitorjs.com) | confirm against Capacitor 8 docs when installing tools |
| Play target-API and closed-testing policy details | policy knowledge as of training; may have changed | confirm in Play Console at upload time |
| Production origin, privacy/support URLs | domain unconfirmed in repo | owner supplies `SITE_ORIGIN` |

## 4. Blockers and owner decisions (ordered)

1. ~~Application / bundle ID~~ — **decided: `com.vitaflex.montewo` kept** (permanent after first store upload).
2. ~~Store scope decision~~ — **decided: prepare both store submissions with the current shell; the Apple 4.2 (minimum functionality) risk is documented in `IOS_RELEASE.md` §6 and stays open until Apple reviews.**
3. **Native ↔ API: built behind `NATIVE_CLIENTS_ENABLED` (off).** Owner actions to turn it on — apply migration 0003, Access public exception for `/api/strength/native-token`, Access CORS for `https://localhost` + `capacitor://localhost` (headers `cf-access-token, content-type`), set the flag, rebuild the bundle with `NATIVE_API_ORIGIN`. No Cloudflare change was made from here.
4. **Production domain** — unblocks canonical metadata, privacy/support/deletion URLs for both stores, and the native API origin.
5. **Developer accounts** — Google Play Developer account and Apple Developer Program (paid; owner purchases). D-U-N-S for organisation enrolment.
6. **Signing material** — create the upload keystore (Android) and let Xcode create certificates/profiles (iOS); add the four GitHub secrets if CI builds are wanted.
7. **Store assets** — app icon/splash derived from the approved logo, feature graphic, device screenshots (none exist yet).
8. **Pre-existing test baseline** — decide on `public/assets/INTER-LICENSE.txt` vs `docs/website/baseline.json`.
9. **Web entry point** — keep the app at `/dashboard/` or make it `/` (unchanged; website stays at `/`).
10. **Web deploy / pull request to `main`** — the Pages project is already connected to this repository: every push to this branch publishes a *preview* (`https://arena-7a19420f-monte-wo.vitaflex-monte-wo.pages.dev`), and **merging to `main` deploys production**. No PR has been opened; say when (the new API behaviour is inert without the flag, so the site is unaffected by a merge).
11. **Agent API enablement** — apply migration 0004, set `AGENT_API_ENABLED=true`, issue one key per agent (`node scripts/agent-key.mjs create --name … --scopes "*" --role admin --remote --database <db>`), store keys in the agents' secret manager; decide whether agents get `waitlist:read` (personal data) and which Strength role (reviewer = can approve evidence; admin = can also draft standards; nobody can award ranks manually).
12. **Production API origin for the apps** (`NATIVE_API_ORIGIN`) — same as decision 4; until then store builds are offline shells by design.

Note: `origin/main` moved after the base commit (3 poster SVGs under `assets/posters/`, +18 lines, no overlap with this branch) — a merge/PR will be conflict-free.

## 5. Exact build commands (from a clean clone)

```sh
# Web + API (any OS)
npm ci && npm run build && npm test
npm run dev                              # http://localhost:8080  (website; app shell at /dashboard/)

# Packaged app preview + tests (any OS)
npm run build:native && npm run preview:native      # http://localhost:3000 (root = app shell)
npm run test:native && npm run test:native-api && npm run test:agent-api   # unit (also part of npm test)
node scripts/agent-key.mjs create --name "Ops agent A" --scopes "*" --role admin --sql-only   # Agent API key (prints key once + hash-only SQL)
npm run test:native-browser                         # needs the preview running + Playwright Chromium
NATIVE_API_ORIGIN=https://<production-origin> npm run build:native   # connected build (apps talk to the API; server flag required)

# Android (JDK 21 + Android SDK)
npm run build:native && npx cap sync android        # add NATIVE_API_ORIGIN=… for a connected build
cd android && ./gradlew --no-daemon assembleDebug                     # debug APK
MONTE_WO_VERSION_NAME=0.1.0 MONTE_WO_VERSION_CODE=1 \
ANDROID_KEYSTORE_PATH=… ANDROID_KEYSTORE_PASSWORD=… ANDROID_KEY_ALIAS=… ANDROID_KEY_PASSWORD=… \
./gradlew --no-daemon bundleRelease                                   # signed .aab → app/build/outputs/bundle/release/

# iOS (macOS + Xcode)
npm run build:native && npx cap sync ios && open ios/App/App.xcodeproj   # Archive from Xcode (see IOS_RELEASE.md §4)

# Web deployment (owner, after authorization) — see WEB_DEPLOYMENT.md
SITE_ORIGIN=https://<confirmed-domain> npm run build && npm run deploy
```

## 6. Next steps (proposed order)

1. Download the unsigned `.aab` from run `38499331981` (or build locally), sign/convert with `bundletool`, install on a device → device checklist (`ANDROID_RELEASE.md` §6).
2. Owner: production domain → `SITE_ORIGIN`/`NATIVE_API_ORIGIN`; Access prerequisites for native clients (§4 item 3); then one real sign-in from a debug build proves the `cf-access-token` assumption.
3. Replace template icons/splash with brand-derived assets; capture store screenshots; fill Data safety / App Privacy forms (change from "no data" once connected builds ship).
4. Developer accounts + signing material + GitHub secrets → signed `.aab`, Xcode archive.
5. Internal testing tracks (Play Internal testing, TestFlight) → closed testing → production only on explicit go.
