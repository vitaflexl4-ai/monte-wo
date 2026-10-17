# MONTE WO — unified website cockpit

**Route:** `/exercises/` · **Status:** implemented and locally tested, not pushed or deployed.

## Verified source

Public main was fetched to `source/main`. It now points to **d35973567f254bcee4561535dc4061719a816e90**; the requested muscle-map module is still **3f60741742db3db0c92d6d316e81b3e4e430d7da**. The intervening commit adds only two Python cache files. Its `index.html` is byte-identical to 3f60741, SHA-256 `eb0526adb12f658ac415846afe5882271a9b70efe9f058fb97394d5144a11ece`. Those upstream cache files were not checked out or executed.

The website uses the safely imported original 420×640 SVG geometry: **28 front paths / 26 back paths**. No upstream script, iframe, wildcard message bridge, cook/upload script or SQL was executed.

## Delivered behavior

- **Arms → Chanpyon**, **Back → Avanse**, **Legs → Bati**, **Core → Mèt**; **Chest → Fò** retained. Original colors, connector anchors, headband/flag, and authentic rank artwork remain.
- Hover a muscle or card to preview its group in the exercise grid; leaving restores the pinned filter. Click/tap or Enter/Space pins a region. Repeating the selection clears it. Front/back switches clear selection and update the available SVG targets.
- Map match count and “View/Explore” link stay synchronized. No automatic scrolling on hover. All eight group filters remain available, including Shoulders, Cardio and Mobility.
- **62 browse entries, 57 source animations, 14 written guides.** The mobile merge helper actually generates this catalog. The website filter module is compiled from the mobile `library-index.ts`, not an independently maintained search implementation. Input and compiled-module hashes guard against stale exports.
- Search, equipment/source filters, A–Z/Z–A sorting, empty-state reset, keyboard controls and exercise dialogs work. Source demo/loop video loads only after an explicit playback request; closing or Escape stops playback and removes its source.
- Responsive **2/3/4-column** grid; bounded 1350px workspace, compact rail, sticky header, ambient gradients and dark translucent panels. Mobile rank milestones scroll within their own strip instead of shrinking their names or overflowing the page. Reduced-motion preferences are respected.
- Existing navigation, homepage, App concept, Free Tools, Strength Index, seven legacy group pages, fourteen guides, privacy/deletion/contact and waitlist flows remain available. The website's existing service worker now includes the cockpit's public assets; no separate storage/sync backend was introduced.

**Rank semantics:** These are example region palettes, not earned ranks. The four independent ranked lifts and DRAFT — NOT OFFICIAL methodology are unchanged. No rank calculations or awards occur in the cockpit.

## Nutrition: functional UI, deliberately unavailable facts

The user explicitly selected **“Use verified existing data only.”** No verified serving/macro records for **Griot, Diri ak Djon Djon or Bannann Peze** were found in the existing repository text. Existing nutrition calculators are not food-composition records and were not used to invent dish values.

The quick pills update the active dish, provenance/status text and all four metric/ring states. All three production records currently have null serving, source and macro fields. Therefore:

- Calories, Protein, Carbs and Fats show **—**, never fabricated values or zero.
- Unknown rings are neutral/dashed with no colored progress arc.
- Personal targets are null; no daily calorie/protein recommendation or percentage is assumed.
- No meal is logged, no user profile is created, and no nutrition data is persisted.

The renderer is wired to display documented values and to compute ring fill only when a verified record **and explicit targets** exist. Browser tests intercept clearly identified **test-only fixtures** to verify live ring updates and clearing stale values when switching to an unavailable dish. These fixture values never enter the production food catalog. Real numerical dish progress remains blocked on verified food data and targets, by the user's chosen policy.

Update `content/nutrition/foods.json` only when reviewed serving information, provenance and macro values are available. Unknown fields must remain null. Rebuild afterward; do not label unsupported values as verified.

## Verification

- **114 root tests**, **37 mobile tests**, mobile TypeScript check; website build passed.
- New phone / iPad-WebKit / desktop cockpit flows passed: hover preview/revert, click pin/toggle, keyboard, view switching, 2/3/4 columns, no overflow, dish state, honest unknowns, search/sort/reset and no autoplay.
- Actual pinned GitHub **demo and loop playback passed on all three browser profiles**. Close removes the video source immediately.
- Verified-data test fixtures update rings; switching to an unknown dish clears the old numbers/percentages. Failed content loading leaves controls disabled and provides a working written-guide fallback.
- Existing website regression: **50 routes / 300 layouts (320–1440px)**, metadata, image decoding, real navigation, keyboard/skip/menu flows, tools, legal/deletion, unavailable waitlist and explicit waitlist test fixtures, honest 404 and offline pages passed.
- Library regression: **22 routes × 4 widths**, preserved group/guide pages, shared filters, offline cockpit/guides and no-JS readable catalog/guide fallback passed. No uploads or browser JavaScript errors in successful flows.
- Local instrumented filter work was **under 2 ms** in the recorded runs. This measures synchronous filter/DOM work, **not** end-to-end frame, network or video latency. No literal “zero latency” guarantee is made.

Evidence: `qa/results.json`, `qa/edge-results.json`, regression logs and seven diagnostic screenshots. `scope-check.json` records 31 protected-file hashes checked against the pre-build state, plus preservation of the six pre-existing edits. The root test suite separately verifies protected website/backend originals.

## Build and preview

Normal website build uses the checked-in export and standard-library Python; it does not require mobile dependencies:

```sh
npm ci
npm run build
npm test
PREVIEW_ENTRY=/exercises/ PORT=8084 node scripts/preview_mobile_app.mjs
```

Use Node 22.13+. Open `/exercises/`; the preview's root redirects there. To preview the original homepage at `/`, use `PREVIEW_ENTRY=/`. Account/API bindings remain empty in this local preview. Production homepage routing is not altered.

After changing the shared catalog or TypeScript helpers, regenerate first:

```sh
npm ci --prefix apps/mobile
node scripts/export_cockpit_data.cjs
python3 scripts/build_cockpit.py
```

`build_cockpit.py` also copies the existing bundled mobile poster JPEGs into public assets. Video URLs remain pinned to the verified c9f7151 source, not an alleged R2 deployment. Offline video playback is not promised.

## Scope and handoff

No production deployment, GitHub push, R2 operation, migration, rank/backend change, package dependency change or signed app build. The six unrelated local edits were not staged. Native app changes from the previous turn were preserved separately in local recovery commit `b75989d` (source equivalent to the earlier delivered premium update).

A compact source-update patch targets that prior premium-map source. It may omit diagnostic screenshots and reproducible public poster copies; `python3 scripts/build_cockpit.py` restores the poster copies from the already bundled mobile assets. Follow the accompanying patch-check instructions and never force it onto an unrelated main checkout. The older portable single-HTML website exporter has not been updated for this new multi-file cockpit; use the live/static website preview above instead.

### Source-snapshot formatting compatibility
The earlier delivered grid ZIP contains the committed Inter license, whereas the historical protection fixture was hashed before one trailing space was trimmed. Both contain identical license text. The protection guard now recognizes only those two exact SHA-256 versions; arbitrary license edits still fail. The actual license and the user's six existing edits were not modified or staged. This was detected by running root tests in a clean, patched copy of the delivered ZIP, not hidden by replacing its license.
