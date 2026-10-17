# MONTE WO — updated app source and browser preview

This handoff contains the **redesigned React Native app**, not an installable APK or iPad application. Start with `docs/mobile/workout-library/REPORT.md` (latest library integration), then `docs/mobile/DESIGN-REFRESH.md` for the verified scope, preview commands, test results and R2 blocker.

## Preview from your computer

Use Node 22.13+ and run these commands from this repository folder:

```sh
npm ci
npm ci --prefix apps/mobile
MONTEWO_WEB_PREVIEW=true EXPO_PUBLIC_LOCAL_WORKOUT_MEDIA=true npm run export:web --prefix apps/mobile
node scripts/preview_mobile_app.mjs
```

Open `http://localhost:8082/mobile/` on that computer. Use the Arena Live Preview or the computer's reachable LAN address on your iPad; iPad localhost points to the iPad itself.

## Important continuity

- The production website, backend and databases are unchanged. Account services are disabled in this local preview by design.
- The uploaded GitHub packs are integrated: **57 animations, 14 retained written guides, 62 unique browse entries**. R2 remains unpopulated. Videos use the pinned public source/local preview cache; no package scripts or SQL were run. Pack-only IDs remain browse-only pending shared-backend registration.
- Already-submitted Android build: `347b15cb-e1c5-4568-8b67-7a302eb54f00`. It contains the earlier UI. Last observed In progress; not rechecked during this redesign.
- This handoff does not cancel, replace or submit a cloud build. Do **not** rerun older APK submission instructions automatically. A later reviewed rebuild must reuse the existing project and signing key.
- Expected Android signing identity is recorded in `docs/mobile/android-signing-identity.json`. No private key or credentials are included.
- Previous 15 high build-tool findings remain accepted for internal testing only. No public-release or installation claim is made.
- Keep your earlier handoff ZIP and signing identity records. Nothing has been deleted.
