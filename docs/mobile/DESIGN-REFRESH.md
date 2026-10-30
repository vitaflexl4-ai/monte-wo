> **Follow-up:** The user has now uploaded source packs on `update-workout-posters`. See `workout-library/REPORT.md` for the verified 57-animation import and current 62-entry browse library. The missing-media observations below describe the earlier design-refresh snapshot.

# MONTE WO — native UI design refresh

Date: 2026-10-16. Branch: `feature/mobile-foundation`.

## What changed

The actual Expo / React Native application now follows the supplied showcase's black/navy, electric-blue and red brand direction:

- Cinematic welcome screen, official existing emblem, functional guest/sign-in paths.
- Compact four-discipline dashboard, illustrated lift icons, blue-outlined cards, nine authentic existing rank assets, consistent forms and bottom navigation.
- Front/back muscle-region navigation, accessible group buttons, filtered exercise guides.
- Shared catalog loading, schema validation, safe reviewed image/GIF/MP4 rendering, bundled fallback and honest media availability states.
- Existing nutrition calculator links. Food scanning, health connections, public signup and notifications are explicitly unavailable rather than simulated.

The new athlete image is **AI-generated decorative branding**, not a workout demonstration, real athlete record or identity. The muscle diagram and exercise glyphs are schematic navigation artwork, not form instruction. Existing rank art is preserved unchanged, including its known cropping limitations.

The web preview deliberately centers the mobile interface at up to 500 CSS pixels on a computer/iPad. Native screens retain responsive React Native layouts and safe-area handling. This is the same app source, not a separate HTML mockup.

## Verification performed

- TypeScript: passed.
- Root regression tests: 107 passed.
- Mobile build-safety and catalog tests: 16 passed (9 existing safety + 7 catalog).
- Browser regression: 15 responsive states passed; guest set entry/removal, unavailable save/sign-in gating, library search and disabled downloads retained.
- Additional Chromium phone (390×844), WebKit iPad emulation, and Chromium desktop (1440×1000): welcome, dashboard, actual SVG-region tap, front/back switch, filtered library, exercise detail and viewport overflow checks passed. No uncaught page errors or failed HTTP responses on these paths.
- Android and iOS Hermes JavaScript exports: passed. **Not signed native builds or device installation tests.**

The WebKit test is automated emulation on Linux, not a physical iPad/Safari test. Authenticated account/reviewer flows were not tested against production; the existing shared backend and role gates are unchanged.

## Workout catalog / R2: exact current limit

Public GitHub inspection covered both available branches (`main` at `e9ac601b34306958ebf971b231beaaf5d260ed64` and `arena/7a19420f-monte-wo` at `05eba20fc0c7ab17ca5357795963d582b59d0e42`). Neither complete tree contained GIF/MP4/WebM/MOV workout files. This does **not** inventory R2.

The live Pages endpoint reported `r2Configured: false`; its `/media.json` was `{}`. No authenticated R2 listing was available. **The bucket's contents remain unknown. It has not been declared empty.** The 14 available guides / 7 groups are not claimed to be the full intended library.

The client now reads the existing `/api/mobile/exercises` route, validates it, and falls back to the bundled canonical guides when unavailable. It does not scrape guessed object names. An optional `EXPO_PUBLIC_EXERCISE_CATALOG_URL` can point to an owner-approved public HTTPS JSON catalog with the same schema as `content/exercises.json`, browser CORS, complete instructional records and reviewed provenance. External manifests should use absolute public HTTPS media URLs. No query-token or credential-bearing media URLs are rendered. Native evidence uploads remain private and separate.

External manifest records are browsing-only until their exercise IDs exist in the canonical backend. Normal same-backend catalog records are available in the training selector. This does not create a second ranking engine or silently change backend validation.

**Needed from owner:** actual public catalog/manifest URL, or a read-only export of R2 object keys with intended public media origin and exercise mappings. An object list alone does not establish instructional accuracy or usage rights. Do not send secret keys, passwords or signed access tokens.

## Preserved boundaries

No website content, backend/API implementation, database, migration, production environment, Cloudflare binding, signing identity, GitHub remote or deployment was changed by this refresh. Six previously modified documentation/license files remain outside this change.

No new cloud build was submitted. Existing build `347b15cb-e1c5-4568-8b67-7a302eb54f00` contains the earlier UI; its last observed status was In progress, **not rechecked during this refresh**. No APK was obtained or verified. Keep the existing Expo project and signing key. A later explicitly authorized native rebuild is required to include this source.

The 15 previously disclosed high build-tool findings remain an internal-test-only exception, not public-release approval. No dependency versions or lockfiles were changed by this visual refresh.

## Reproduce the app-first browser preview

With Node 22.13+ (tested 22.23.3), from repository root:

```sh
npm ci
npm ci --prefix apps/mobile
npm run typecheck --prefix apps/mobile
npm run test:build-safety --prefix apps/mobile
MONTEWO_WEB_PREVIEW=true npm run export:web --prefix apps/mobile
node scripts/preview_mobile_app.mjs
```

Open `http://localhost:8082/mobile/` **on the same computer**. An iPad needs a reachable computer LAN address or the hosted Arena Live Preview; iPad localhost is not the computer. The server binds `0.0.0.0`, uses the actual local API handlers with empty bindings, and never opens a production database. The existing website preview script remains intact.

Browser checks, after installing Playwright browsers and their host dependencies:

```sh
node tests/mobile-browser.mjs
node tests/redesign-browser.mjs
```

`PREVIEW_URL` overrides the test origin. Do not treat the preview as a signed iPad app or publish a store/download link based on it.
