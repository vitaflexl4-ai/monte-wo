# MONTE WO Development Progress

Updated: 2026-10-23

## Now
- Reinvent the MONTE WO product experience rather than treating screenshot capture as product completion.
- Build a versioned, reviewable standards methodology for four independent disciplines and the nine-rank Climb Scale.
- Improve Home, Workout, Nutrition, and Rank as useful app screens with the official blue/red brand identity.
- Keep verified ranking separate from estimates and self-reports; do not activate unapproved numerical cutoffs.

## Next
1. Integrate the ranking policy boundary into the existing rank screen and evidence workflow.
2. Add executable tests for unknown disciplines, estimated/self-reported evidence, reviewer and technique gates, missing/unapproved standards, invalid thresholds, version mismatches, and rank boundaries.
3. Inspect the existing Home, Workout, Nutrition, and Rank screens and make focused improvements without replacing working flows blindly.
4. Research reputable strength-sport benchmarks and document rationale; do not fabricate final thresholds.
5. Run typecheck, mobile tests, website tests, and root tests; report failures honestly.
6. Capture and inspect refreshed screens only after the actual experience improves.

## Done
- Created isolated branch `agent/monte-wo-reinvention`; PR #6 remains draft and unmerged.
- Added `docs/MONTE-WO-REINVENTION-STANDARD-v0.1.md` with principles, judging direction, evidence handling, and release gates.
- Added `apps/mobile/src/ranking-policy.ts`: fail-closed rank decision logic requiring an explicitly approved, version-matched standards table, verified evidence, technique/reviewer approval, and strictly increasing per-discipline thresholds. This module deliberately contains no invented cutoffs.
- Added `apps/mobile/tests/ranking-policy.test.mjs` with regression coverage for all nine rank boundaries, unknown disciplines, unverified evidence, reviewer/technique gates, invalid loads/thresholds, version mismatch, and discipline-specific thresholds; added the `test:ranking` script. Tests have been authored but not executed in this connector session.
- The earlier preview branch's four-screen Expo web capture artifact confirmed the app source loads, but exposed an underdeveloped user experience.

## Blocked / approval gates
- Numerical thresholds and body-mass/category policy require documented benchmark rationale, fairness review, and owner approval before becoming official.
- Native Android screenshots require a working emulator/device; React Native Web captures are not a substitute.
- Legal/privacy copy, account method, release identity, public download origin, and store accounts remain owner decisions.
- No production deployment, remote migration, real-account creation, store publishing/build, or spending without separate explicit approval.

## Known test state
- The prior screenshot workflow passed website build, mobile typecheck, Expo web export, and mobile build-safety/UI guards.
- The earlier root suite was red at 129 passing / 4 failing; three failures remained open after one stale label assertion was corrected. The new module has not yet been run through repository CI or tested locally in this connector session; do not claim the current branch is green.
- All work remains unmerged. No production release, remote migration, account creation, store publishing, or spending has occurred.
