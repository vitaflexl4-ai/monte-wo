# Main-branch synchronization and interactive grid

## Verified source

The public `main` branch now points to **c9f7151e47d58afce20bc9251bc301ac405ed2ab**. Its `assets/workout-library/` tree is **c1e9a407bcc754abc8d18e7f3626dfaa72e07a9d**, identical to the previously imported `update-workout-posters` assets. The counts remain **67 manifest rows, 57 unique animations, 8 categories**. There are no new exercises to double-count.

The importer was rerun against `source/main`, reading manifests and parsing SQL as data, comparing duplicate hashes and probing media. Generated inventory provenance now names `main` and retains the immutable commit. No package scripts or SQL were executed. Development stays on `feature/mobile-foundation`; the feature source was not overwritten with the older application code from main.

## Frontend implemented

This updates the **actual Expo / React Native app frontend**, available through the web preview. It does not replace or deploy the production website.

- Responsive grid: 2 columns at a phone viewport, 3 on iPad-sized layouts, 4 on desktop; an exceptionally narrow container falls back to one column.
- The library expands on larger browser screens; other dashboard views keep their compact layout. Gallery detail navigation retains its outer width to avoid WebKit resize-observer loops.
- Each card uses the source poster, exercise name, equipment, primary muscles, duration and an accessible open control. Focus and hover are visibly indicated.
- Search indexes names, IDs, aliases, primary/secondary muscles and equipment. Case and accents are normalized; words can be entered in any order.
- Source, category and equipment filters combine with AND. Cable/cable-machine, dumbbell/dumbbells and bodyweight/no-equipment synonyms are grouped consistently.
- A–Z / Z–A sorting, live result counts, filter reset and a recoverable empty state.
- Opening a card preserves filters for the return trip and exposes existing poster/demo/loop controls. Videos do not autoplay or load just because a card is visible.
- Nine guides overlap with pack IDs: 57 animations + 14 retained written guides − 9 overlaps = **62 browse entries**. No fabricated written instructions or rank changes.

The 48 pack-only exercise IDs remain browse-only until deliberately registered in the shared backend. This update does not bypass workout validation, approve exercise form, translate unset names, or award ranks.

## Checks completed

- TypeScript: passed.
- Root regression: **107 tests passed**.
- Mobile safety, catalog, import and search/grid logic: **30 tests passed**.
- Grid browser checks: Chromium phone, WebKit iPad emulation and Chromium desktop passed the 2/3/4-column checks, equipment/category/search combinations, reverse sorting, keyboard activation, playback, retained filters, empty-state reset and no horizontal overflow. No uncaught page errors or failed HTTP responses in these flows.
- Existing media suite: all **171 media HEAD checks**, HTTP 206 range support, 404 unknown-media and 416 invalid-range checks passed. Demo and loop playback passed on all three browser layouts.
- Existing 15-state mobile/browser regression and three-layout design/muscle-map regression passed.
- Android and iOS Hermes JavaScript exports passed. These are **not** signed builds or physical-device installation tests.

Screenshots and machine-readable results are in `grid-qa/`. Existing source/media mapping is in `dashboard-mapping.csv` and `inventory.json`.

## Run it

Use the Arena preview **MONTE WO — interactive exercise grid**, then **Get Started → Explore** or the dashboard's **57 exercise animations** card.

From the source handoff, with Node 22.13+:

```sh
npm ci
npm ci --prefix apps/mobile
MONTEWO_WEB_PREVIEW=true EXPO_PUBLIC_LOCAL_WORKOUT_MEDIA=true npm run export:web --prefix apps/mobile
node scripts/preview_mobile_app.mjs
```

The local server serves a hash-checked media allowlist with byte ranges. Source videos remain in the pinned GitHub commit; they are not duplicated into the source ZIP. Posters and metadata are included. R2 is still unpopulated; production video hosting is a later, separate step.

**Unchanged:** production website, backend code, canonical workout IDs, databases, migrations, signing identity and the existing Expo build. No `cook.sh`, `upload.sh`, SQL import, GitHub push, deployment or new cloud build.
