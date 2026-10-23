# MONTE WO Development Progress

Updated: 2026-10-23

## Now
- **P0 — repository audit and CI repair.** The repository combines a Cloudflare Pages website (static HTML/CSS/ES modules built by Python scripts) and an Expo / React Native mobile app under `apps/mobile/`.
- Latest known failing CI run: website build passed; test suite reported 4 failures out of 167. The known failures were stale route-count/canonical-origin assertions, a lockfile mutation during dependency installation, and a protected `wrangler.toml` comment that still advised reusing the waitlist database.
- CI workflow is being corrected to preserve lockfiles, assert the generated 51-route site accurately, and keep production deployment out of this workflow. Ranking and evidence code are out of scope.
- Mobile package has `typecheck` and `test:build-safety` scripts; root package has `npm test` and build scripts. No lint script or repository-wide lint configuration was found in the package scripts inspected so far.

## Next
1. Confirm all P0 CI checks pass on the agent branch; review the full failure output and verify mobile typecheck and safety tests actually execute.
2. Finish the app/website audit, including current screen inventory, supplied transparent logo assets, onboarding assets, exercise catalog/media inventory and reduced-motion/sound/haptics behavior.
3. P1: complete the mobile shell (Home, Library, Log, Profile tabs), safe areas, theme, and signed-out onboarding gate without touching ranking logic.
4. P2: implement only after the authentication decision is recorded in QUESTIONS.md; local mock only, behind AuthAdapter.
5. Continue P3–P9 in the user's stated order, one bounded branch/commit at a time.

## Blocked
- Official rank thresholds and awards: **pending Sony's approval**. Do not alter the ranking engine, threshold tables or evidence storage. User-facing lifts remain “Assessment pending” without approved tables.
- Authentication method: owner decision requested in QUESTIONS.md. No production auth, real accounts or remote migration.
- Legal pages, translations and store accounts require owner/native-speaker approval as listed in QUESTIONS.md.
- No production deploy, remote migration, store build or publishing is authorized in this task.

## Done
- Confirmed `PROGRESS.md` and `QUESTIONS.md` were absent from the default branch and created them on the agent branch.
- Inspected root and mobile package scripts and the latest failing CI job logs.
- Identified concrete CI failures rather than treating the successful website build as a successful test run.
- Corrected the route-count and test-origin assertions; prevented CI dependency installation from rewriting the root lockfile.
- Removed the production deployment job from the proposed CI workflow so this task cannot deploy to production.
- Updated the Wrangler configuration comment to say the restricted strength/mobile data path must use a dedicated `APP_DB`, not the waitlist database; pinned that exact change in the protected-source allowlist.

## Notes
- Work branch: `agent/ci-deploy-gates` (all changes remain unmerged).
- Main repository: `https://github.com/vitaflexl4-ai/monte-wo`.
- Current PR: `https://github.com/vitaflexl4-ai/monte-wo/pull/4`.
- Last known pre-fix test result: 167 total, 163 passed, 4 failed. This is historical; wait for a new CI run before stating the current result.
- The repository is not yet an autonomous self-repairing 24/7 coding agent. The scheduled workflow monitors and reports failures; actual code changes still need an authorized coding-agent runtime.
- No local repository checkout was available in this execution environment, so validation is being performed through GitHub Actions after committing changes to the agent branch.
