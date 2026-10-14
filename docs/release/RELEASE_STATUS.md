# MONTE WO — release status

_Last updated: 2026-10-13 · branch `arena/7a19420f-monte-wo` · base `main@b6c66da` (+ Step 1 `f47e994`)._
**Overall: NOT store-ready. Web deployable (pending owner authorization and domain). Native projects prepared and verified structurally; first compilation, signing, store accounts, assets and the API-connectivity design are owner-gated.**

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

Preserved untouched: brand assets, rank artwork and names, exercise assets, API security model, migrations, Cloudflare configuration, generated HTML (rebuilt byte-identical).

## 2. Tests actually executed (sandbox, 2026-10-13)

| Check | Command | Result |
|---|---|---|
| Web build reproducibility | `npm run build` twice, hash of `public/` | **PASS** — byte-identical |
| Native bundle reproducibility | `python3 scripts/build_native.py` twice, tree hash | **PASS** — identical (also asserted in `tests/native.test.js`) |
| Unit suites | `npm test` | **102 tests: 101 pass, 1 fail** — the failure is `tests/website.test.js` "original assets … unchanged": `public/assets/INTER-LICENSE.txt` hash ≠ `docs/website/baseline.json`. **Pre-existing on `main` (verified by re-running against HEAD without my changes)** — not caused by this work; owner should decide whether the license file or the baseline is authoritative. |
| of which Strength Index engine/API/DB | `npm run test:strength` (27 tests inside `npm test`) | **PASS** — rank boundaries below/at/above for every rank × discipline, drafts cannot award, forged JWT/issuer/audience denied, RBAC/CSRF, owner-only evidence, no self-approval, admin award rejected + audited, DB triggers block cross-owner evidence and stale decisions, fail-closed when unconfigured |
| Native suite | `npm run test:native` | **9/9 PASS** |
| Browser: website 49 routes × 320–1440 px, tools, library, ranks, strength, lab, dashboard shell | `npm run test:website`, `test:browser`, `test:phase2`, `test:library`, `test:ranks`, `test:strength-browser`, `test:lab-browser`, `test:dashboard-browser` against `wrangler pages dev` on :8080 | **all PASS** (after the JS guard change) |
| Browser: packaged app, phone viewport, Capacitor routing emulation (launch → tab bar → More drawer → demo food logger → Settings → Privacy page → brand link back to Dashboard → extension-less path → waitlist/strength degrade honestly; zero network writes; no service worker; no camera) | `npm run test:native-browser` against `npm run preview:native` on :3000 | **PASS** |
| Browser engine used | Chromium 153 (`@sparticuz/chromium`, sandbox-provided) via `PLAYWRIGHT_BROWSERS_PATH` | note: not Playwright's pinned Chromium 156; the suites are engine-agnostic |

## 3. NOT verified (cannot be done here) — assumptions, clearly separated

| Item | Why not | How to verify |
|---|---|---|
| Android compiles / `.aab` builds | no JDK/Android SDK in sandbox; `dl.google.com`, `services.gradle.org` unreachable | owner: `cd android && ./gradlew bundleRelease`, or run the manual workflow (`Actions → Android release bundle`) |
| iOS compiles / archives | no macOS/Xcode | owner Mac: Xcode → Archive; or manual workflow `iOS build check` (unsigned simulator build) |
| Behaviour inside real WebViews (Android System WebView / WKWebView), safe areas, keyboard, back button | emulation only | device test checklist in `ANDROID_RELEASE.md` §6 / `IOS_RELEASE.md` §7 |
| GitHub Actions workflows run green | never triggered (owner authorization; first run may need SDK/toolchain tweaks) | trigger manually once; fix forward |
| Capacitor 8 toolchain assumptions (JDK 21, Xcode 16.x+) | from Capacitor requirements knowledge, not re-checked online (sandbox has no access to capacitorjs.com) | confirm against Capacitor 8 docs when installing tools |
| Play target-API and closed-testing policy details | policy knowledge as of training; may have changed | confirm in Play Console at upload time |
| Production origin, privacy/support URLs | domain unconfirmed in repo | owner supplies `SITE_ORIGIN` |

## 4. Blockers and owner decisions (ordered)

1. **Application / bundle ID** — `com.vitaflex.montewo` is a placeholder; confirm or choose (permanent after first store upload). Change procedure in `ANDROID_RELEASE.md` §1.
2. **Store scope decision (App Store 4.2 risk)** — ship v0.1.0 as an offline foundation (likely Apple rejection; Play more tolerant) or first add one complete native-worthy workflow. Recommendation: do not submit to Apple until a real workflow exists.
3. **Native ↔ API connectivity + authentication design** (`ARCHITECTURE.md` §6) — requires approving a change to the origin policy and an auth flow that works from a WebView; nothing was weakened meanwhile.
4. **Production domain** — unblocks canonical metadata, privacy/support/deletion URLs for both stores, and the native API origin.
5. **Developer accounts** — Google Play Developer account and Apple Developer Program (paid; owner purchases). D-U-N-S for organisation enrolment.
6. **Signing material** — create the upload keystore (Android) and let Xcode create certificates/profiles (iOS); add the four GitHub secrets if CI builds are wanted.
7. **Store assets** — app icon/splash derived from the approved logo, feature graphic, device screenshots (none exist yet).
8. **Pre-existing test baseline** — decide on `public/assets/INTER-LICENSE.txt` vs `docs/website/baseline.json`.
9. **Web entry point** — keep the app at `/dashboard/` or make it `/` (unchanged; website stays at `/`).
10. **Permission to trigger the manual workflows / deploy the web** — not done without a go-ahead.

Note: `origin/main` moved after the base commit (3 poster SVGs under `assets/posters/`, +18 lines, no overlap with this branch) — a merge/PR will be conflict-free.

## 5. Exact build commands (from a clean clone)

```sh
# Web + API (any OS)
npm ci && npm run build && npm test
npm run dev                              # http://localhost:8080  (website; app shell at /dashboard/)

# Packaged app preview + tests (any OS)
npm run build:native && npm run preview:native      # http://localhost:3000 (root = app shell)
npm run test:native && npm run test:native-browser  # second needs the preview running + Playwright Chromium

# Android (JDK 21 + Android SDK)
npm run build:native && npx cap sync android
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

1. Owner answers decisions 1–4 above.
2. First native compile via the manual workflows (free on the public repo) → fix any toolchain findings → debug APK / simulator run → device checklist.
3. Implement the approved native↔API design behind feature flags; add tests (origin policy, token header auth, no cookie reliance).
4. Replace template icons/splash with brand-derived assets; capture store screenshots; finish Data safety / App Privacy forms.
5. Internal testing tracks (Play Internal testing, TestFlight) → closed testing → production only on explicit go.
