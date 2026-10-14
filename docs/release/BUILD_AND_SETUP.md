# MONTE WO — build and setup (web, API, Android, iOS)

Everything below was executed in the repository sandbox **except** the Android/iOS compilation steps (no JDK / Android SDK / Xcode there); those are marked **[owner machine or CI]**.

## 1. Prerequisites

| Target | Required | Notes |
|---|---|---|
| Web + API + tests | Node.js 22 (lockfile npm), Python 3.10+ | Generators are Python; tests are Node (`node --test`) + Playwright browsers for the `*.mjs` suites |
| Cloudflare | `wrangler` (devDependency), Cloudflare account access | Only for `npm run dev` (local Pages emulation) and deployment |
| Android **[owner/CI]** | JDK 21, Android SDK (compileSdk 36, build-tools via SDK manager), Android Studio optional | Capacitor 8 / AGP 8.13 / Gradle 8.14.3 (wrapper downloads it) |
| iOS **[owner/CI]** | macOS, Xcode 16.x or newer (Capacitor 8 requirement — verify against the Capacitor 8 release notes), Apple Developer Program membership for device/App Store | Swift Package Manager (no CocoaPods needed) |

## 2. First-time setup

```sh
git clone https://github.com/vitaflexl4-ai/monte-wo.git
cd monte-wo
npm ci                       # exact dependency tree from package-lock.json
npm run build                # regenerates public/ from content/ + scripts/ (idempotent, verified byte-identical)
npm test                     # 102 unit tests (see RELEASE_STATUS.md for the one known pre-existing baseline failure)
```

Never hand-edit generated HTML under `public/`; change `content/` or `scripts/` and rebuild (repository rule).

## 3. Environment variables

`.env.example` is the complete reference (placeholders only). Summary:

* **Cloudflare Pages bindings**: `DB` (D1), `WORKOUT_GIFS_BUCKET` (R2, public media), `RANKING_EVIDENCE` (R2, **private**).
* **Pages variables**: `TURNSTILE_SITE_KEY`, `RANKING_ENABLED` (keep `false`), `RANKING_ACCESS_ISSUER`, `RANKING_ACCESS_AUD`, `RANKING_PUBLISH_ENABLED` (`false`), `RANKING_APPROVED_DIGESTS`.
* **Native clients**: `NATIVE_CLIENTS_ENABLED` (Pages variable, keep `false` until the Access prerequisites in `ARCHITECTURE.md` §6 exist) and `NATIVE_API_ORIGIN` (build-time only, read by `scripts/build_native.py`; bare `https://` origin baked into the app bundle).
* **Pages encrypted secrets**: `TURNSTILE_SECRET`, `RATE_LIMIT_SALT`.
* **Android release (env, never files)**: `MONTE_WO_VERSION_NAME`, `MONTE_WO_VERSION_CODE`, `ANDROID_KEYSTORE_PATH`, `ANDROID_KEYSTORE_PASSWORD`, `ANDROID_KEY_ALIAS`, `ANDROID_KEY_PASSWORD` (CI: `ANDROID_KEYSTORE_BASE64` secret decoded at run time).
* Nothing is read from a `.env` file by the web/API tier; `wrangler.toml` keeps all bindings commented out until the owner provisions them.

## 4. Commands

| Purpose | Command |
|---|---|
| Local web + API emulation (Cloudflare) | `npm run dev` → http://localhost:8080 (website) and `/dashboard/` (app shell) |
| Local waitlist with a throwaway D1 | `npm run db:local && npm run dev:waitlist` (port 8081; `LOCAL_DEVELOPMENT=true` only) |
| Rebuild everything | `npm run build` |
| Native web bundle (Capacitor `webDir`) | `npm run build:native` → `build/native/` (+ `native-build.json` report) |
| Copy bundle into native projects | `npx cap sync` (both) / `npx cap sync android` / `npx cap sync ios` — `npm run native:sync` does build:native + sync |
| Preview the packaged app exactly as the shells serve it | `npm run preview:native` → http://localhost:3000 (root = app shell; extension-less paths → shell, like Capacitor) |
| Open native IDEs **[owner]** | `npm run native:android` (Android Studio) / `npm run native:ios` (Xcode) |
| Android release bundle **[owner/CI]** | see `ANDROID_RELEASE.md` (`cd android && ./gradlew bundleRelease`) |
| iOS archive **[owner]** | see `IOS_RELEASE.md` |
| Deploy web **[owner, after authorization]** | see `WEB_DEPLOYMENT.md` (`npm run deploy` targets Pages project `vitaflex-monte-wo`, branch `main`) |

## 5. Tests

| Suite | Command | Needs |
|---|---|---|
| Unit (engine, API auth/authz, DB triggers, waitlist, R2, tools, website guards, dashboard, **native config + bundle**) | `npm test` (= `node --test tests/*.test.js`) | Node + python3 (native suite rebuilds the bundle) |
| Strength only | `npm run test:strength` | |
| Native config/bundle only | `npm run test:native` | |
| Browser: website, tools, library, ranks, strength, lab, dashboard | `npm run test:website`, `test:browser`, `test:phase2`, `test:library`, `test:ranks`, `test:strength-browser`, `test:lab-browser`, `test:dashboard-browser` | `npm run dev` on :8080 + Playwright Chromium |
| Browser: packaged app (Capacitor routing emulation, phone viewport, offline workflows) | `npm run test:native-browser` (env `NATIVE_PREVIEW_URL`, default http://localhost:3000) | `npm run preview:native` + Playwright Chromium |

Install Playwright's browser once with `npx playwright install chromium` (not possible inside the Arena sandbox; there a locally provided Chromium was used via `PLAYWRIGHT_BROWSERS_PATH`).

## 6. Database: migrations, schema, backup and recovery

* Migrations: `migrations/0001_waitlist.sql` (waitlist + rate limits), `migrations/0002_strength_index.sql` (Strength Index; append-only achievement/audit tables with triggers rejecting UPDATE/DELETE), then `migrations/0003_native_auth_codes.sql` (one operational table for the native sign-in handoff; no product tables touched). Local: `npm run db:local`. Production: `npx wrangler d1 migrations apply <actual-db-name> --remote` **only after a backup, review and explicit authorization** — never run against `flex-ai-db`; `monte-wo-waitlist` stays waitlist-only unless the owner decides to reuse it for 0002 as `wrangler.toml` suggests.
* Schema documentation: table list in `ARCHITECTURE.md` §5, invariants and roles in `docs/strength/OPERATIONS.md`, method in `docs/strength/METHODOLOGY.md`.
* Backup (D1): `npx wrangler d1 export <db-name> --remote --output backups/<date>.sql` (SQL dump; store encrypted, off-repo) and Cloudflare D1 Time Travel (`npx wrangler d1 time-travel info <db-name>` / `restore --timestamp=<ISO>` within the retention window). Backups contain personal data (emails) — treat as confidential.
* Backup (R2 evidence): private bucket; copy with an S3-compatible client using a least-privilege, bucket-scoped token into another **private** location; never into the public media bucket or Git.
* Recovery drill: restore the dump into a fresh local D1 (`wrangler d1 execute <local> --local --file backups/<date>.sql`) and run `npm run test:strength`.

## 7. API documentation and access requirements

| Route | Auth | Purpose |
|---|---|---|
| `GET /api/status` | none | service readiness |
| `GET /api/waitlist/config`, `POST /api/waitlist` | none; POST requires same-origin + Turnstile token; rate-limited | waitlist signup (unavailable until `DB`, `TURNSTILE_SITE_KEY`, `TURNSTILE_SECRET`, `RATE_LIMIT_SALT` exist) |
| `GET /api/gifs/*` | none | exercise media from `WORKOUT_GIFS_BUCKET` (same-origin cache-friendly) |
| `GET /api/strength/config`, `GET /api/strength/catalog` | public exceptions (readiness, methodology versions; no athlete data) | |
| `GET /api/strength/me`, `POST /profiles`, `POST /performances`, `POST /recalculate`, `POST /performances/:id/evidence`, `GET /evidence/:id` | verified Cloudflare Access JWT + active provisioned principal; owner-only data | athlete flows |
| `GET /admin/queue`, `POST /reviews` | role reviewer/admin; no self-approval | evidence review |
| `GET /admin/standards`, `GET /admin/audit`, `POST /admin/models|rulebooks`, `POST …/:id/publish` | role admin; publisher ≠ author; digest allow-list; `RANKING_PUBLISH_ENABLED` | methodology governance |
| any `/rank`, `/award`, `/override` | always rejected + audited | no arbitrary rank awards |
| `GET /api/strength/native-login?state&challenge` | verified Access JWT; flag `NATIVE_CLIENTS_ENABLED=true` | issues a single-use PKCE-bound code and redirects to `com.vitaflex.montewo://auth` (native sign-in handoff) |
| `POST /api/strength/native-token` `{code,verifier}` | public route (needs an Access public exception) + native `Origin`; flag on, else 404 | exchanges the code for the caller's own Access JWT to be sent back as `cf-access-token` |
| `OPTIONS /api/*` | none | 204 preflight; CORS headers only for `https://localhost` / `capacitor://localhost` and only when the flag is on |

Everything under `/api/strength/*` fails closed when `RANKING_ENABLED` is not `true` or Access is unconfigured. Native clients are refused entirely unless `NATIVE_CLIENTS_ENABLED=true` (`ARCHITECTURE.md` §6). Full semantics: `docs/strength/OPERATIONS.md` §API.

## 8. Asset inventory, licenses, attribution, media storage

| Asset | Location | License / provenance | Notes |
|---|---|---|---|
| MONTE WO logo + emblem | `public/assets/monte-wo-logo.webp`, `monte-wo-emblem.webp`, `icon*.png`, `icon.svg`, `brand-assets/` | VitaFlex Business Group proprietary (approved brand) | Preserved unchanged; store icons must be derived from these (see store checklist) |
| Rank artwork (9 ranks) | `brand-assets/ranks/01_Debitan.png … 09_Lejand.png`, web emblems in `public/assets/` | Supplied by owner; processing documented in `docs/RANK-ARTWORK.md` | Chanpyon/Titan/Lejand sources are cropped (known) |
| Inter font | `public/assets/inter-*.ttf`, `public/assets/INTER-LICENSE.txt` | SIL Open Font License 1.1 | License file shipped in web and native bundles |
| Exercise media | provenance in `content/exercises.json` (`sourcePackage`, `reviewStatus`), packages under `exercise-packages/`, delivery via R2 `WORKOUT_GIFS_BUCKET` or `media.json` | per `docs/EXERCISE-LIBRARY.md`; rights confirmation is an owner item before store release | Not re-licensed by this work |
| Capacitor runtime | `node_modules/@capacitor/*` | Apache-2.0 (Ionic) | Attribution not required in-app; listed here |
| Playwright, wrangler, sparticuz/chromium (dev only) | devDependencies / sandbox tooling | Apache-2.0 / Apache-2.0 / MIT | Not shipped |

Private performance evidence (future) must only ever live in the private `RANKING_EVIDENCE` bucket — never in Git, archives, screenshots or the public media bucket.
