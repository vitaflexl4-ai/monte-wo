# MONTE WO — native pilot source delivery

**Version 0.1.0 · October 15, 2026 · Managed by VitaFlex Business Group**

**MEASURE. PROVE. RANK. CLIMB.**

This package contains real Expo/React Native implementation, the shared Cloudflare backend extension, an additive website download-status page and prebuilt website files. It is **not a published Android/iOS app release**. No APK, AAB or IPA is included because native signing/build/installation gates were not completed. Hermes bundles are JavaScript artifacts, not installable apps.

## Start here

1. Read `docs/mobile/BUILD-REPORT.md` for exact completed checks and blockers.
2. Open the working website preview; `/downloads/` shows unreleased channels honestly. `/mobile/` is the native UI's **browser QA rendering**, not a wrapper or installed app.
3. Use `docs/mobile/OPERATIONS.md` before configuring any cloud resource. Do not run all root migrations against the waitlist. No remote database changes were made.
4. Follow `docs/mobile/BUILD-AND-SIGN.md` from your authenticated owner machine for signed APK/AAB and iOS builds. Never send private signing files or account secrets in chat.
5. Complete `QA-CHECKLIST.md`, `STORE-PREP.md` and dependency remediation before publishing.

## Folder map

- `apps/mobile/` — native screens, navigation, SecureStore/PKCE client, canonical exercise/draft-methodology snapshots, existing brand assets, Expo/EAS configuration.
- `server/mobile/` — gated native session/workout API, forwarding to the existing Strength Index API.
- `migrations/mobile/` — unapplied additive application-DB migration. **Not for the waitlist or flex-ai-db.**
- `public/` — ready-to-preview website, existing tools/posters/locales, new `/downloads/`, conditional native-pilot privacy disclosure.
- `docs/mobile/` — implementation report, operational/build/store guidance, QA evidence and logs.
- `apps/mobile/web-build/` and `apps/mobile/native-export/` — generated QA web/Hermes exports supplied in this ZIP only; not an APK/AAB/IPA.

Generated Android/iOS project directories and all credentials/debug keystores are deliberately omitted. Recreate native projects with Expo prebuild. Dependencies and `.git` are also omitted. Existing historical website documentation is retained; this start page and the mobile report describe the new work.

## Reproduce / preview locally

Use Node 22.13+ and Python 3. From the extracted `monte-wo` directory:

```sh
npm ci
npm run build
npm test
node scripts/preview_mobile.mjs
# Open http://localhost:8080/ for website
# Open http://localhost:8080/downloads/ for release status
# Open http://localhost:8080/mobile/ for the supplied browser QA export
```

The local preview runs the real Pages handlers **without production bindings or credentials**. Account APIs safely report unavailable. It does not invent accounts, saves or ranks. Stop it with Ctrl+C.

To rebuild mobile exports:

```sh
cd apps/mobile
npm ci
npm run typecheck
npx expo-doctor
MONTEWO_WEB_PREVIEW=true npm run export:web
npm run export:native
```

Source is on the local `feature/mobile-foundation` branch. It has not been pushed to GitHub or deployed to Cloudflare. Merge/review this delivery into your existing repository with your authenticated account; do not overwrite unrelated work or lose the previous poster backup. No old ZIP was deleted.

### Website deployment, when you are ready

From the verified extracted root on your authenticated Mac:

```sh
npx wrangler pages deploy public --project-name vitaflex-monte-wo --branch main --commit-dirty=true
```

Do **not** add `--config`. This deploys the website/Functions, not app binaries or database migrations. Verify all active bindings first. Keep mobile/ranking gates off until the dedicated application database and Access policy are reviewed and tested.
