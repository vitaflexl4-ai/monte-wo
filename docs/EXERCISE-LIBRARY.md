# Exercise library · Phase 3

## Current release

`/exercises/` is the public directory. Seven primary muscle groups link to `/exercises/muscle/{group}/`; every exercise has `/exercises/{stable-id}/`.

The initial catalog has **14 editorial starter written guides and zero supplied demonstrations**. These are general educational descriptions, not professionally certified form guides. Have a qualified fitness professional review content before a public launch. No exercise illustrations, video, exercise counts, or text were copied from the reference website. The equipment icons are original schematic placeholders and explicitly not form demonstrations.

The future native app remains **Coming soon**. More exercises, workout routines and offline training guides are planned; no number or release date is promised. The website does not currently log exercises, create personalized programs or offer app accounts.

## Organization and search

`content/exercises.json` is the single catalog source. Each entry has:
- Stable `id` and display `name` (keep IDs stable to avoid broken links).
- One primary `group`: chest, back, shoulders, arms, legs, core, cardio.
- `muscles` and `secondary` lists. Compound movements are not duplicated across category counts, but secondary muscles are searchable.
- `equipment`, `movement`, and `aliases` (e.g. RDL / Romanian deadlift).
- Ordered `steps`, a short `cue`, a `safety` note, and an `easier` option.
- `sourcePackage` and `reviewStatus` for provenance.
- Nullable `media`. Null means written guide only, not an available animation.

Directory search is case/accent-insensitive, matches all entered tokens across names, aliases, muscles, equipment and movement. Filters combine with AND. Counts and category pages derive from the catalog, never advertised app totals. Each detail page automatically links to other exercises in the same primary group. Search/filter state stays in memory: no uploads, query strings, analytics or stored personal searches. Existing trilingual homepage navigation is preserved; new library pages are English, like the company and calculator pages.

## Adding the user's packages

The user can attach ZIP packages or individual GIF, WebP, PNG or MP4 files to the conversation. They do **not** need to format JSON themselves. The assistant/operator organizes each batch:

1. Inventory files without running scripts or executable content. Keep supplied originals unchanged in `exercise-packages/{package-id}/originals/`; record original names, provenance and hashes in a package manifest. Confirm permission to publish and clarify filenames that cannot be reliably identified.
2. Match each clip to the correct exercise, variation and equipment. Review the actual movement—do not infer a valid demonstration from the filename alone. Flag mislabeled, incomplete or unsafe demonstrations rather than publishing them as correct form.
3. Match against stable IDs and aliases to avoid duplicates. Do not silently replace existing media or written guides. Summarize changes for review.
4. Create web-ready derivatives in `public/assets/exercises/{package-id}/`. Use descriptive, safe ASCII paths. Check file sizes against Cloudflare Pages asset limits. Large media may need the existing R2 delivery endpoint instead; no R2 publication is configured by this release.
5. Add/update catalog entries, keeping missing media as null. Attach media only when the file exists, its pairing and publication permission are checked, and the operator approves it. `reviewed: true` records this publishing check; it is not a claim of professional certification.
6. Run `npm run build`, `npm test`, and `npm run test:library`. Verify examples visually on mobile and desktop. Run the exporter and portable checks before delivery.

Supported bundled media record:
```json
{
  "type": "image",
  "src": "/assets/exercises/package-01/bench-press.webp",
  "source": "package-01/originals/bench-press.gif",
  "reviewed": true
}
```

Use `type: "video"` for MP4. Videos have native controls and do not autoplay. Image formats accepted are GIF, WebP and PNG. The generator rejects missing files, unsafe paths, unrecognized types, absent provenance and unreviewed attachments. API or external URLs are intentionally not accepted by this initial catalog builder; add an explicit verified R2 publishing path when needed, rather than claiming unavailable videos are live. GIF/WebP animation itself is not a guarantee of technically correct form.

## Build and offline behavior

```sh
npm run build                 # company + tools/app + library
npm test
npm run test:browser           # homepage regression; server 8080
npm run test:phase2            # free tools regression; server 8080
npm run test:library           # server 8080
python3 scripts/export_preview.py
npm run test:portable
```

`build_library.py` generates the index, seven category pages, individual guide pages, `public/library-routes.json`, and the service worker's catalog route list. Generated HTML is not the editing source. For removed entries, deliberately remove their obsolete generated route directory too after checking inbound links. Rebuilding alone does not automatically delete old routes.

SW v8 precaches the current text pages and library CSS/JS. Guides and filters work offline after successful installation. Supplied media is fetched only when viewed, then cached (shared limit of 30 media responses); the site does not automatically download all future videos. Browser storage may be evicted. The native app's expanded offline library remains planned.

The portable HTML embeds the complete static website, library JS/CSS, artwork and any bundled exercise assets. It works in the viewer's network-free nested sandbox. Waitlist collection remains disabled there. Production publication is still pending.
