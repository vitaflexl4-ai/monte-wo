# Final binding: nutrition, gym logger, camera and guide videos

## What is live in the local preview

Open `/exercises/`. The top **Open Logger & Camera ↓** link jumps to two new glass panels immediately below the muscle map. The existing map/grid, authentic tier artwork and independent draft rankings are retained.

### Nutrition

Exact per-serving values supplied by the user on 2026-10-16:

| Food | Serving | kcal | Protein | Carbs | Fat |
|---|---|---:|---:|---:|---:|
| Diri ak Djon Djon | 1 Cup | 360 | 8 g | 72 g | 4 g |
| Griot (Fried Pork) | 100g | 290 | 24 g | 0 g | 21 g |
| Bannann Peze | 3 pieces | 210 | 1 g | 32 g | 9 g |

Provenance is explicitly **user-provided verified record**, not independent laboratory/database verification. Values are preserved exactly, including zero carbs for Griot; calories are not recalculated from grams.

The user selected custom targets but supplied no target numbers. **Set my daily targets** therefore starts empty. Applying explicit targets updates all four rings immediately; clearing them removes percentages without hiding the serving macros. A ring compares **one selected serving** to that target, not a recorded day's intake. Targets and food selection stay in this page session only. No meal is logged.

### Gym history logger

- Real catalog exercise selector, weight in lbs, whole-number reps, explicit **Log Set** button.
- Validated inputs, timestamped scrolling table, per-set weight × reps and total external-load volume in **lb·reps**.
- No fabricated starting history. Session-only data; no persistence, account sync, performance verification or rank awards.
- Clear-session action requires a second confirmation. Zero external weight is supported; bodyweight itself is not inferred.

### Real webcam viewport

- **Activate Live Capture Engine** invokes `initializeFoodCamera()` and real `navigator.mediaDevices.getUserMedia()` with `audio: false`.
- No camera starts on page load. Stop, page exit and backgrounding stop all tracks and clear the video stream. Duplicate starts and cancellation while permission is pending are handled.
- Blue-rimmed native video viewport with the requested pulsing scanning text/reticle. It is explicitly labeled **visual guide only**: there is no ingredient recognition, AI food analysis, recording, screenshot capture or upload.
- Same-origin camera permission is enabled in `public/_headers`; microphone/geolocation remain disabled. Browser permission is still required. An embedding page can independently block the camera; the UI explains how to open the scanner directly in a new tab. HTTPS (or localhost) is required.
- Reduced-motion settings disable the reticle animation.

## Exercise sub-pages repaired without compilation

A small shared template helper (`scripts/exercise_video_template.py`) binds exact exercise IDs to commit-pinned files under the repository's `assets/workout-library/` path. `scripts/repair_exercise_pages.py` replaces only the guide media blocks and adds lightweight playback status handling. The normal library template also uses the helper, so later builds do not restore the placeholders.

**Nine corresponding source loops are now bound:** bench press, push-up, lat pulldown, overhead press, lateral raise, dumbbell curl, triceps pushdown, back squat and Romanian deadlift.

Videos use native controls, `loop`, `playsinline`, a real poster and `preload="none"`; playback starts on request. The original repository link and an error state are provided. No videos were transcoded, cooked, uploaded or duplicated into the workspace.

**Five guides have no exact matching source video:** one-arm dumbbell row, dead bug, forearm plank, brisk walk and stationary bike. They explicitly say **NO MATCHING REPOSITORY VIDEO**, retain their written instructions, and do not substitute a different movement. Source animations are not mislabeled as technique approval.

## Why the public website may still look unchanged

`wrangler.toml` serves **`public/`**, not repository-root `index.html`. Updating only root `index.html` does not publish the cockpit. These changes target **`public/exercises/` and the maintained source templates**.

The updated local preview is running. **No public deployment or remote push was performed.** GitHub and Cloudflare connector lookups returned unsupported in this environment; the owner's existing authenticated publishing workflow is still required. This is a deployment/access distinction, not a claim that the public site has already changed.

The shared website cache version is bumped to `montewo-core-v15-session-tools`, including the new browser modules. No new backend or database was introduced.

## Cleanup and verification

- Removed automated workspace `.cache` folders, generated build logs and temporary QA/regression screenshots. Kept user uploads, authentic runtime artwork, source, all delivered ZIP backups, credentials and local database state.
- `cleanup.json` lists 161 removed generated entries (about 8.24 MiB across cleanup passes). Browser-created font/cache remnants and test-only browser tools were removed again after the final checks. Final size is recorded separately in `workspace-size.json`.
- **25 targeted Node tests passed** (food binding, ratio behavior, logger validation/volume, source video binding, existing website protections/navigation metadata and poster safeguards).
- Phone / tablet / desktop browser flows passed: exact macro values, explicit target percentages, set logging/totals/clear, permission-gated stream and track stopping, real back-squat loop playback, no overflow or page JavaScript errors.
- Camera tests use a **synthetic browser webcam fixture**, not the user's physical camera. Permission denial, late permission resolution after cancellation, duplicate starts, background cleanup and reduced motion were checked.
- Six viewport widths checked: 320, 390, 768, 820, 1024 and 1440px.
- All **nine real loop files** returned HTTP 200 and matched the source inventory's SHA-256. Media verification was in memory, without copying assets into the workspace.
- Tests use temporary tools/screenshots outside the workspace, removed afterward. Only compact JSON evidence is retained here.

**No heavy build/compilation, Expo/Metro/Hermes export, npm build, cook.sh, SQL, migration, R2 operation or deployment was run.** Only lightweight JSON/HTML publication, source edits and targeted tests were used. The six pre-existing unrelated edits were preserved.

## Reproduce the targeted publication

```sh
python3 scripts/repair_exercise_pages.py
python3 scripts/build_cockpit.py
PREVIEW_ENTRY=/exercises/ PORT=8084 node scripts/preview_mobile_app.mjs
```

These Python scripts render small static templates; they do not compile/transcode media or change the backend. Pre-generated public files are already included. The preview media cache now lives in the operating system temporary directory, not a workspace `.cache` folder.
