# Premium muscle map — integrated app update

## Source verified

Fetched public `vitaflexl4-ai/monte-wo` main at **3f60741742db3db0c92d6d316e81b3e4e430d7da**. Its root `index.html` is archived here byte-for-byte as `source-index.html`; SHA-256: `eb0526adb12f658ac415846afe5882271a9b70efe9f058fb97394d5144a11ece`.

Only that root HTML changed since the prior workout-library source commit. The existing feature branch was preserved; main was not merged over local work. The root website files and published site were not replaced.

| SVG region | Source preview tier | Source color | Views |
|---|---|---|---|
| Arms | Chanpyon | #B25CFF | Front, back |
| Back | Avanse | #2FD8B6 | Back |
| Legs | Bati | #B87333 | Front, back |
| Core | Mèt | #3D8EFF | Front, back |
| Chest | Fò | #F6C33A | Front |

These are **example visual associations**, not earned body-region ranks. The source itself labels its ranks as examples. Approved spelling **Fò** is used in the app. The footer now accurately distinguishes **9 ranks, 5 muscle regions, 4 independent ranked disciplines**; the upstream footer's five-discipline claim was not copied.

## Implemented in the actual app

- Native `react-native-svg` component, not an HTML iframe/WebView or a separate mockup.
- Exact source `420 × 640` geometry: **28 front paths, 26 back paths, eight view-specific target groups**. Bilateral coordinates and all six connector anchors retained.
- Source headband/flag styling, five region colors, front/back controls, left/right cards and anchored connector lines. Existing authentic rank artwork retained.
- Wide screens show cards beside the figure. At stage widths of 700px or less, the figure sits above two card columns. The nine-rank strip scrolls horizontally when needed.
- Avatar targets and accessible card buttons select/toggle the same region. Pointer hover and keyboard focus highlight the matching paths and connector. Buttons expose pressed state on web and selected state natively.
- Switching front/back clears selection. Explore opens the real exercise grid filtered to the selected group; all eight catalog groups remain accessible separately.
- Typed native callback and same-window `muscleselect` event: `{ type, muscle, rank, view }`. `rank` is the source's example palette ID only. No wildcard `parent.postMessage`, rank writes, global configuration bridge, or external message listener was added.
- Safe declarative importer: TypeScript AST whitelist for data, XML whitelist for SVG. It never evaluates the upstream JavaScript. Unsupported expressions fail closed.

### Responsive-shell correction

Opening a wide map from Home and popping back reproduced a WebKit ResizeObserver warning with a route-dependent outer navigator width. The app now keeps the navigation shell stable, with compact content constrained to 500px and map/library content to 1100px. Welcome remains centered at its original compact width. This extends the earlier gallery/detail fix without suppressing errors. Actual map-pop, library-detail, Home return and desktop resize flows passed afterward.

## Verification completed

- **107 root tests**, **37 mobile tests**, TypeScript check.
- Web export and **Android/iOS Hermes exports**.
- New phone / iPad-WebKit / desktop map flows: exact target counts, region/tier selection events, toggle-off, keyboard activation, view clearing, SVG hover, connector-anchor alignment, no horizontal overflow, grid filtering, extra categories and unchanged unranked discipline cards. Desktop narrow/wide resize also passed.
- Existing **15 responsive browser states** passed.
- Existing **three-layout grid**, **three-layout redesign**, and **171-media verification plus three playback profiles** passed.
- No browser JavaScript errors in passing flows. Evidence is in `qa/`; screenshots are diagnostic, not runtime dependencies.

Hermes exports are **not signed APK/IPA builds or physical-device installation tests**. The previously submitted Android build has not been reverified or replaced by this work. Its internal-test-only dependency-risk exception is unchanged.

## Scope preserved

No `cook.sh`, upload script, SQL execution, migration, R2 operation, backend/rank-engine change, production deployment or authenticated GitHub push. All six pre-existing unrelated dirty files were preserved. Workout media remains pinned to its verified c9f7151 source: **57 animations / 62 browse entries / 14 guides / 8 groups**; pack-only records did not become training IDs. Methodology remains **DRAFT — NOT OFFICIAL**.

## Run / reproduce

Use Node 22.13+ and the existing lockfiles:

```sh
npm ci
npm ci --prefix apps/mobile
npm run typecheck --prefix apps/mobile
npm run test:build-safety --prefix apps/mobile
MONTEWO_WEB_PREVIEW=true EXPO_PUBLIC_LOCAL_WORKOUT_MEDIA=true npm run export:web --prefix apps/mobile
node scripts/preview_mobile_app.mjs
```

Open `/mobile/`, choose **Get Started → Muscle map**. With the preview running, run `node tests/premium-muscle-map-browser.mjs` (Playwright browsers required). To regenerate the data from a local Git object, run `python3 scripts/import_premium_muscle_map.py`; its default is the pinned source commit above. Regeneration is unnecessary for ordinary app builds.

A compact patch handoff can be applied to the previously delivered **a46482a interactive-grid source**. It deliberately does not replace root `index.html`, `public/`, backend files, or existing rank assets. Check the patch before applying; do not force it onto an older/different source tree. The accompanying handoff metadata identifies the new local feature-branch commit. No remote push is implied.
