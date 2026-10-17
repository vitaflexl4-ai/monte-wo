# MONTE WO native pilot — build and verification report

**October 15, 2026 · Source v0.1.0 · Branch `feature/mobile-foundation`**

## Delivery status

Real native client source and shared-backend implementation are delivered. **Signed Android APK: not produced. Signed Play AAB: not produced. iOS IPA/TestFlight: not produced or submitted.** No installation testing or store publication is claimed. The website remains the existing static Pages project with additive changes. No production deployment, GitHub push, remote migration, resource creation, DNS change or signing-key generation was performed.

## Implemented

- Native React Native dashboard; bottom tabs and detail navigation; workout entry and owner history; profile revisions; independent discipline views; performance submission; private MP4 selection/upload; authorized reviewer queue/evidence playback/decisions; session/account/deletion-request controls; offline 14-exercise/7-category written library; genuine loading/error/unavailable states.
- System-browser S256 PKCE sign-in bridge to the existing Access/provisioned-principal pilot. Opaque sessions in native SecureStore; token hashes and encrypted provider assertions server-side; expiry and revocation; explicit no-public-signup disclosure.
- Shared `/strength/*` backend adapter, not a copied rank engine or second account DB. Existing owner checks, independent discipline ranks, draft/provisional/verified distinctions and self-approval prevention remain authoritative.
- Validated, idempotent workout persistence and paginated history in the same dedicated application database. No workout awards ranks. A deletion request is explicitly pending, not a false completed erasure.
- Fail-closed native readiness: isolated application binding, mobile schema present, no waitlist table, valid key/issuer/audience and feature flags. Historical waitlist DB fallback removed from the default web handler; explicit legacy application-only compatibility opt-in documented.
- Expo identifiers/versioning, original icon/dark splash configuration, native permission restrictions, EAS APK/AAB/iOS profiles, owner-run APK verification utility and store/operational guidance.
- `/downloads/`, unreleased manifest, additive app-page link and native-pilot privacy disclosure; primary navigation unchanged. Service worker v13 preserves posters/tools and includes the download-status page.

### Main changed files

`apps/mobile/App.tsx`, `src/api.ts`, `src/ui.tsx`, `src/model.ts`, generated canonical content, `app.config.ts`, `eas.json`, package/lock; `server/mobile/api.js`, `security.js`; `migrations/mobile/0003_mobile_sessions_workouts.sql`; API router and two-line shared strength binding selection; `scripts/build_downloads.py`, `build_website.py`, `sync_mobile_assets.py`, `preview_mobile.mjs`, `verify_android_release.py`; public download/app/privacy/service-worker/route-manifest outputs; mobile tests and narrowly scoped protected-source tests; documentation/config-comment correction.

The original ranking engine, signed-identity verifier, standards/threshold files, waitlist backend, original migrations, calculator engines, existing website dependency lock and poster assets were not changed. Six pre-existing unrelated README/report/license modifications were preserved, not overwritten or bundled into the mobile implementation commit.

## Executed verification

| Command / check | Actual result |
|---|---|
| `npm run build` | PASS: 50 website routes + honest 404; no fabricated canonical origin |
| `npm test` | PASS: **107 tests**, 0 failures; includes 15 mobile API/security tests and 3 mobile source/release tests |
| Static website checks | PASS: **2,020 internal references**, 46 protected files checked against original or explicitly pinned authorized hashes |
| `npm run typecheck` in mobile | PASS |
| `npx expo-doctor` | PASS: **21/21 checks** after native dependency deduplication |
| `npx expo prebuild --no-install` | PASS: Android/iOS project generation; no CocoaPods/Xcode/Gradle compilation implied |
| `MONTEWO_WEB_PREVIEW=true npm run export:web` | PASS: React Native browser QA bundle |
| `npm run export:native` | PASS: separate Android/iOS Hermes bundles; **not installable artifacts** |
| `npx wrangler pages functions build functions --outdir …` | PASS: Worker compiled |
| `node tests/website-browser.mjs` | PASS: **50 routes / 300 responsive layouts**, navigation, assets, focus, waitlist fixture states, no-JS, 404 and offline checks |
| `node tests/posters-browser.mjs` | PASS: **21 layouts**, EN/HT/FR, guide dialog, no-JS/offline posters; zero page errors |
| `node tests/mobile-browser.mjs` | PASS: **15 browser states** at 390/768/1440px; native UI web rendering, search/guide, set add/remove, gated saves/sign-in, disabled downloads; **not native device testing** |
| `python3 scripts/verify_android_release.py --help` | CLI runs; no real APK supplied, so artifact verification/install was not run |
| `npm audit --json` in mobile | **NOT CLEAN: 23 findings (15 high, 8 moderate)**; raw advisory report included; unused sharing module removed, no forced incompatible downgrade |

Mobile API tests use isolated local SQLite databases and signed synthetic identity fixtures, not Cloudflare production. They cover PKCE mismatch/replay/expiry, encryption/tampering, session expiry/revocation, unknown/disabled identities, origins, strict validation, ownership, deduplicated saves, pagination, shared web/native results, private evidence forwarding, privileged self-approval denial, pending deletion and waitlist misbinding. The MP4 fixture checks forwarding/authorization only; it is not playback/codec QA.

Initial checks caught duplicate native dependencies, TypeScript scope accidentally including generated exports, expected protected-hash changes and browser-preview test assumptions. Those were corrected before the final passes. Historical baseline files were not rewritten. Global `git diff --check` still notes Markdown/license trailing spaces in the six pre-existing unrelated dirty files; they were left intact. The new staged mobile work is checked separately.

## Actual native build attempts and exact blockers

| Attempt | Result |
|---|---|
| `./gradlew app:assembleRelease --no-daemon --max-workers=1` | Failed: **“Gradle requires JVM 17 or later to run. Your build is currently configured to use JVM 11.”** Gradle distribution downloaded; no APK created |
| `./gradlew app:bundleRelease --no-daemon --max-workers=1` | Same Java blocker; no AAB created |
| `eas build --platform android --profile preview --non-interactive` | Failed: **“An Expo user account is required to proceed.”** No cloud APK build queued |
| `eas build --platform android --profile production --non-interactive` | Same authentication blocker; no cloud AAB build queued |
| `expo run:ios --no-bundler` | Failed: **“iOS apps can only be built on macOS devices.”** |
| `eas build --platform ios --profile production --non-interactive` | Expo authentication required; no iOS cloud build queued |

Environment: Linux x86_64, Java 11, approximately 2 GB RAM; no Android SDK/adb/emulator, attached device, `/dev/kvm`, Xcode, Expo authentication or owner signing credentials. These are not supplied by verbal authorization or the user's separate Mac login. Native project generation and Hermes compilation succeeded, but they do not bypass native toolchain/signing/testing requirements.

## Required before any public release

1. Owner-authenticated Expo project and preserved Android signing identity; Google Play/Apple developer setup and reserved IDs; resolve direct-APK vs Play certificate continuity.
2. Compatible native build environment or authenticated cloud builds, signed APK/AAB/IPA, physical-device QA and verified hosted artifact URL/hash/signature.
3. Review actual APP_DB/Access/private evidence bindings; controlled schema rollout and production integration testing. No competing database or second account engine.
4. Resolve dependency advisories and complete app security/accessibility review.
5. Implement/operate real account erasure and finalize retention/backups/privacy/store disclosures. Public self-service signup is **not implemented**; the current account integration is the restricted existing pilot.
6. Keep thresholds unapproved until independent methodology approval. No official ranks, fabricated catalog expansion or replacement badge art were invented.

Owner build/rollout commands and safeguards are in BUILD-AND-SIGN.md and OPERATIONS.md. QA captures are browser screenshots only. Download channels remain disabled, existing production stays unchanged, and previous poster backups remain intact.
