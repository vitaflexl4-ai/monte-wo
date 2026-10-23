# MONTE WO Development Progress

Updated: 2026-10-23

## Now
- Fix the preview handoff: local preview root should open the actual Expo app, not the older website phone simulation.
- Capture four app-source screens—Home, Workout, Nutrition, Rank—from the Expo web export with Playwright.
- Make unapproved discipline cards say “Assessment pending”; no rank is shown until standards are approved.
- Clear the Nutrition screen's preset bodyweight, height and age so no sample estimate is presented before the user enters their own inputs.
- Keep the website phone component explicitly labelled as a website concept, separate from the app.

## Next
1. Verify the new screenshot workflow completes and inspect the four captured PNGs.
2. If screenshots reveal actual app layout defects, fix those on a focused `agent/<task>` branch and rerun typecheck/tests.
3. Continue the existing app backlog after the preview and capture handoff is stable.

## Blocked
- This environment cannot inspect the user's live Mac browser at localhost:8092 or capture the separate Arena session directly.
- Native Android screenshots require an emulator/device session; the planned artifacts are actual Expo app source rendered through React Native Web, clearly labelled as web captures.
- Official rank thresholds remain unapproved; the Rank screen must show pending/no rank, not sample awards.

## Done
- Created branch `agent/mobile-screen-captures` from `feature/monte-wo-experience-completion`.
- Changed the local preview server's default root destination from the website concept to `/mobile/`, the actual Expo app.
- Relabelled the website phone component as a concept rather than the native app.
- Added a browser capture workflow for Home, Workout, Nutrition, and Rank. External requests are blocked in the browser; the local API has empty bindings.

## Notes
- All work is unmerged and isolated to the agent branch.
- No production deploy, remote migration, account creation, store build, store publishing or spending is performed.
- No ranking engine, thresholds or evidence storage are changed.
- Last screenshot workflow run: website build passed, mobile typecheck and Expo web export passed. The full root test suite reported 4 failing test files; one was a stale assertion for the website-concept label and has been corrected. The other three failures appear unrelated to this preview task and need review.
- The first browser capture attempt successfully produced Home, Workout and Nutrition PNGs, but failed while returning to Home before Rank. The capture script has been changed to open isolated guest contexts for each screen, avoiding the unreliable tab-return step.
- Latest workflow run is queued after the capture-script and Nutrition updates; final four-screen artifact is not yet confirmed.
- Branch handoff link: https://github.com/vitaflexl4-ai/monte-wo/tree/agent/mobile-screen-captures
