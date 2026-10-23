# MONTE WO Development Progress

Updated: 2026-10-23

## Now
- Reinvent the MONTE WO product experience instead of treating successful screenshot capture as product completion.
- Define a versioned, reviewable standards methodology for the four independent disciplines and nine-rank Climb Scale.
- Redesign Home, Workout, Nutrition, and Rank as real usable app screens with the official blue/red brand identity.
- Preserve ranking engine/evidence protections until the new standards are reviewed, tested, and safely integrated.

## Next
1. Review `docs/MONTE-WO-REINVENTION-STANDARD-v0.1.md` for product direction, judging principles, evidence rules, and release gates.
2. Inspect existing UI/components and make a focused app-experience implementation on this branch.
3. Validate ranking cutoffs against credible public strength-sport benchmarks and document rationale; do not fabricate final thresholds.
4. Add regression tests for set logging, calculators, empty states, rank progression presentation, evidence-state separation, and accessibility.
5. Run typecheck, mobile tests, website tests, and root tests; report all existing and new failures honestly.
6. Capture refreshed screen images only after the experience materially improves, then inspect them.

## Blocked / approval gates
- Exact numerical thresholds and any body-mass/sex-category policy must be documented, reviewed for fairness, and signed off before being enforced as official standards.
- Native Android screenshots require a working emulator/device; React Native Web captures are not a substitute.
- Legal/privacy copy, account method, release identity, public download origin, and store accounts remain owner decisions.
- No production deployment, remote migration, real-account creation, store publishing/build, or spending without separate explicit approval.

## Done
- Created isolated branch `agent/monte-wo-reinvention` from the latest preview branch.
- Added `docs/MONTE-WO-REINVENTION-STANDARD-v0.1.md` as the redesign brief and standards methodology.
- The earlier preview branch still has a verified four-screen Expo web capture artifact; it showed that the app source was loading, but also exposed an underdeveloped user experience.

## Known test state
- The prior screenshot workflow passed website build, mobile typecheck, Expo web export, and mobile build-safety/UI guards.
- The root suite was red at 129 passing / 4 failing in the earlier run; three unrelated failures were still open after one stale label assertion was corrected. Re-run before claiming the current branch is green.
- All work remains unmerged. No production release, remote migration, account creation, store publishing, or spending has occurred.
