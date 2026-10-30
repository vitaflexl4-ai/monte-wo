# Workout library import and dashboard mapping

## Source synchronized

Fetched the public `main` branch (previously supplied on `update-workout-posters`) from `vitaflexl4-ai/monte-wo`, pinned at **c9f7151e47d58afce20bc9251bc301ac405ed2ab**. Read only `assets/workout-library/` from that commit. Continued development on `feature/mobile-foundation`, preserving the redesigned app and six pre-existing unrelated working-tree changes. No remote merge, push, force reset or production publication.

| Source folder | Manifest / SQL entries | Treatment |
|---|---:|---|
| `monte-wo-pack` | 10 / 10 | All 10 also occur in pack 2; exact metadata and media-byte matches |
| `monte-wo-pack-2` | 28 / 28 | Includes those 10 plus 18 additional exercises |
| `monte-wo-pack-2-dup` | 17 / 17 | **Not discarded:** all 17 are additional exercise IDs |
| `monte-wo-pack-3` | 12 / 12 | 12 additional exercises |
| **Total** | **67 / 67** | **57 unique exercises; 10 repeats merged** |

Eight pack categories: Legs 16; Shoulders 8; Arms 7; Back 7; Chest 6; Core 6; Cardio 5; Mobility 2. These are counts for the fetched commit—not a claim that all intended 90 exercises have been supplied. No pack-4 or pack-5 folder was present in this source directory.

## Media and SQL verification

- 201 physical media files: 171 unique objects after exact duplicate removal (57 demos, 57 loops, 57 posters).
- All referenced objects exist as actual Git blobs, not unresolved LFS pointers.
- Parsed every SQL INSERT as **text literals**, compared every field against its JSON manifest. All 67 rows match. No SQL interpreter or database was used.
- Probed all MP4 files with ffprobe: H.264, 720×936, 30 fps; demo duration approximately 21.5 seconds, loop approximately 4.3 seconds. Compared recorded byte sizes and dimensions. Verified all poster images decode.
- Recorded original paths, source commit, Git object IDs and SHA-256 hashes. Repeated entries match in both metadata and media bytes.
- Technical checks are **not** exercise-form, translation or publication-rights approval. Source animations are explicitly labeled illustrated, not form-verified. Haitian Creole names remain unset as supplied.

`inventory.json` contains the audit totals; `dashboard-mapping.csv` maps all 62 browse entries. `apps/mobile/src/generated/workout-library.json` contains the detailed pinned-source metadata and hashes.

## Interface mapping

- Dashboard: functional **57 exercise animations** card opens the imported-pack filter.
- Exercise library: responsive **2-column phone / 3-column tablet / 4-column desktop grid**, source posters, multiword muscle/equipment search, all eight categories, equipment/source filters, alphabetical sorting, reset/empty states and keyboard-accessible cards. See `GRID-UPDATE.md`.
- Detail: source poster, selectable demo/loop with native playback controls, provenance, muscle metadata and review status. No video is requested until a video mode is selected; no autoplay.
- Muscle map: existing anatomical groups route to the expanded catalog. Mobility is accessible as a group, not falsely assigned to one body region.
- Discipline screens link to related training: squat → back-squat; bench → bench-press; deadlift → deadlift; curl → barbell-curl. **A barbell curl animation does not satisfy the Strict Biceps Curl standard.** No ranks or thresholds changed.

Nine existing guide IDs match the packs. Their original instructions, safety notes, categories and approved-media fields were preserved. Five guide-only exercises remain available. Result: **57 animations + 14 written guides − 9 overlaps = 62 unique browse entries**.

The other 48 pack entries supply metadata and animation but no written technique/safety instructions. We have not fabricated those instructions. They remain **browse-only** until registered in the shared backend; the training selector still uses its canonical 14 IDs. No second database, rank engine or unofficial qualification was created.

## Delivery and storage

Only the 57 source posters are bundled (about 1.7 MiB). Videos are not copied into the app or source handoff. The original media remains in the fetched Git objects / public pinned commit.

With `EXPO_PUBLIC_LOCAL_WORKOUT_MEDIA=true`, the browser preview serves an allowlist under `/workout-media/<id>/…`, checks SHA-256 and supports HTTP Range/206 for playback and seeking. It reads the existing Git blob or retrieves that **specific pinned public file** if the handoff has no Git history. It is not an arbitrary URL or filesystem proxy. Cache data stays in ignored `.cache/`.

Without that flag (including native exports), media URLs point directly to the pinned public GitHub source. This is a preview source, **not approved production video hosting**. R2 remains unpopulated; no binding, domain, upload or cloud credentials were changed.

```sh
# From repository root, Node 22.13+:
npm ci
npm ci --prefix apps/mobile
MONTEWO_WEB_PREVIEW=true EXPO_PUBLIC_LOCAL_WORKOUT_MEDIA=true npm run export:web --prefix apps/mobile
node scripts/preview_mobile_app.mjs
```

Open the Arena Live Preview, or `http://localhost:8082/mobile/` on the computer running it. An iPad uses the preview URL or a reachable computer LAN address, not iPad localhost.

Reproduce the import after fetching the pinned branch with `python3 scripts/import_workout_library.py` (requires Python/Pillow, Git and ffprobe). It reads Git blobs and SQL text only; it does not execute package scripts. Generated metadata/posters already ship in the source handoff, so importing is not required simply to run the app.

## Verification

- TypeScript passed; 107 root regression tests passed.
- Mobile safety/catalog/library/grid suite: 30 tests passed.
- 171 media HEAD checks passed; normal range 206, unknown object 404, invalid range 416 verified.
- Real demo and loop playback passed automated Chromium phone, WebKit iPad emulation, and Chromium desktop tests, including duration and loop-state checks.
- Existing 15-state browser regression and three-layout design/muscle-map regression passed.
- Android and iOS Hermes JavaScript exports passed. **No new signed APK/iOS build or physical-device installation was performed.** Existing cloud build and signing identity remain unchanged.

`cook.sh`, `upload.sh`, SQL imports and all package scripts were **not run**. The bundled README suggestions to create buckets/databases were not followed. Website, canonical backend catalog, APIs, databases and migrations remain unchanged. The prior 15 high build-tool findings remain an internal-test-only exception, not public-release approval.
