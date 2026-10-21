# MONTE WO experience completion — implementation plan

Status date: 2026-10-21. Work branch: `feature/monte-wo-experience-completion`.

## Owner requirements

- Cinematic multi-step onboarding with bundled sound, optional haptics and persistent sound/haptic preferences.
- A standalone mobile experience; no general-purpose links from the app into the website.
- Workout records save locally and automatically sync to the shared account when the athlete is signed in and the secured service is enabled.
- Four independent disciplines: Squat, Bench Press, Deadlift and Biceps Curl. Nine existing rank identities from Debitan to Lejand.
- A qualifying performance can update the appropriate provisional assessment only under the approved discipline standard. Verification remains separate. Workout volume alone never awards a rank.
- Keep the public APK download disabled until installation, functional, security, accessibility and release-identity checks pass.

## Repository audit findings

- `apps/mobile/App.tsx` had a single welcome page; Get Started immediately navigated to the app.
- The UI already had nine rank assets and four independent discipline cards, but the page explicitly labeled standards as draft and showed no rank unless the secured backend returned an assessment.
- Device workout history was local-only. Account workout copy was a separate manual action; a new workout did not attempt automatic account sync.
- The mobile API already implements a gated account/workout service. It reports sync available only when operator-controlled environment bindings and an isolated, migrated application database are ready. The code must not bypass this gate.
- General website navigation existed for calculators, account connection status, privacy and terms. Those links are removed from the mobile screens in this branch; native calculators and in-app privacy/terms draft documents have been added; the legal text still needs operator review and reconciliation with the website policy.
- Existing backend code and database migrations are not modified in this change.

## Changes in this branch

1. Replace the one-screen welcome with a persistent three-stage onboarding flow.
2. Bundle a short locally generated sound cue and use Expo Audio; add optional vibration feedback. Audio is playback-only; Android microphone permission stays disabled.
3. When an athlete finishes a new workout, save the local copy first, then attempt an account sync automatically if a signed-in account and the secured service are available. On sync failure, keep the local record and report the failure honestly.
4. Keep historical device-only records as explicit opt-in transfers; the archive is not account-owned and must not be bulk-uploaded automatically.
5. Remove direct website navigation from calculator, connection-status and legal-link controls. Add native protein, TDEE and macro estimates and in-app privacy/terms draft screens.

## Required verification before release

- Run `npm ci --prefix apps/mobile`, `npm run typecheck --prefix apps/mobile`, and `npm run test:build-safety --prefix apps/mobile`.
- Build the web preview and confirm onboarding audio/haptics controls, returning-user skip, local workout save, and no website navigation.
- With a test account and an explicitly configured non-production application database, verify new workout auto-sync and cross-client retrieval; test offline failure and retry. Do not enable production flags or alter production databases as part of this task.
- Test qualifying performance submission and rank refresh against approved standards; current draft standards cannot issue official ranks.
- Review and reconcile in-app privacy/terms with the website policy and actual retention/deletion practices; validate nutrition formulas, permissions, accessibility, crash logs, signing identity, and the final APK before release.
