# Interactive phone cockpit — 2026-10-17

## Scope

Replaced the static phone composition on the actual deployed-site entry files, `public/app/index.html` (The App / A First Look) and `public/index.html` (homepage), with the same prerendered responsive component. The unrelated legacy root `index.html` fragment was not overwritten; Cloudflare Pages publishes `public/`.

- Absolute-bounded glass phone shell, local screen switching, inset top tabs, independent scrolling screen panels and retained input state between tabs.
- Strength Index: Squat, Bench Press and Deadlift load fields; valid positive input reveals an electric-blue example CHANPYON badge. Each field is independent. Empty/zero hides its badge; malformed, negative, over-3000 or unsupported precision inputs show no badge. The load bound is a UI limit, NOT a qualification standard. Every positive valid input receives the same illustrative badge—no rank formula, invented thresholds, real award or score. A throttled gentle reveal respects reduced motion.
- Training History: nine explicitly labeled mock sets across three illustrative sessions in a scrollable bento-style table. No fictitious athlete identity, claim of personal history, persistence or account sync.
- Haitian Muscle Map: exact paths and region/tier markings from the existing `cockpit-map.json` source, including Haitian headband details. Front/back views, pointer and keyboard region selection, and visible example-tier details. Namespaced SVG IDs prevent clip/gradient collisions. Original authentic rank artwork remains unchanged.
- Full ARIA tab/tabpanel relationships, selected states, roving focus, ArrowLeft/ArrowRight/Home/End controls, reset, and EN/HT/FR widget text switching with the existing document locale.
- Logic is in `public/cockpit.js`. The existing full Exercises controller is gated to its own page, and camera/logger code is imported only there. This prevents missing-element errors or camera bindings on the app/home pages. The simulation does not fetch data, store input, call account APIs or mutate workout/ranking state.
- Component styles are isolated in `public/phone-cockpit.css`. Avatar and mock history are prerendered into HTML, so tab and input interaction does not await a network request.

## Rebuild and cache

`scripts/phone_cockpit.py` is a lightweight standard-library publisher. It updates only the two phone placements and their asset/cache declarations. Run:

```bash
python3 scripts/phone_cockpit.py
```

The normal website builder now uses the same component and attaches its assets. The Exercises publisher includes the phone stylesheet and retains the bumped cache generation, `montewo-core-v16-phone-cockpit`. No heavy website/native build, video processing or compilation was run. Repeated scoped publication was verified idempotent.

## Validation

- 142 root Node tests passed, including five new phone component/controller tests.
- Browser tests passed on app + homepage at 320, 390, 768, 1024 and 1440 px: tab/input/reset state, mock history, map selection/front-back changes, keyboard controls and frame/page bounds.
- Reduced-motion behavior, EN/HT/FR switching, offline tab switching after initial load, no console exceptions, and existing Exercises cockpit boot were checked.
- Existing test fixtures were updated for the new cache name and to exclude SVG path coordinates from the historical fake-athlete-score string check. Athlete-name/result checks and explicit simulation disclosures remain enforced.
- Temporary browser downloads and screenshots/logs are not deliverables and were removed after verification. Six unrelated pre-existing edits remain untouched.

## Delivery status

Implemented in the workspace and opened through the live development preview at `/app/`. Not publicly deployed or pushed to GitHub. The production website remains at its previous deployment until an authenticated owner deployment. No database migrations, account setup, R2 changes, rank methodology changes or native app release were performed.
