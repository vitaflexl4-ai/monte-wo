# HISTORICAL DOCUMENT — SUPERSEDED

The old score demo and its rank bands are retired. Follow README.md and docs/strength/ for current rules. This file preserves earlier project setup notes, not active methodology.

# MONTE WO — Exercise library (0.4.0)

**Leve. Klase. Monte Wo.** · **Managed by VitaFlex Business Group**
Public support/privacy email: **Montewo@vitaflexbusinessgroup.com**

## New: organized exercise library

- `/exercises/`: seven muscle groups; name, alias and muscle search; equipment and media filters; A–Z/Z–A sorting.
- `/exercises/muscle/{group}/`: focused Chest, Back, Shoulders, Arms, Legs, Core and Cardio collections.
- `/exercises/{id}/`: 14 starter written guides, primary/secondary muscles, equipment, steps, cues, easier alternatives and safety notes.
- No supplied animations yet. Placeholders are equipment symbols, not form demos. Available guide counts are computed from the actual catalog.
- More exercises, workout routines and offline training guides are explicitly planned for the coming-soon app, without invented totals.
- Add future packages to the canonical `content/exercises.json` catalog after reviewing and organizing their contents; the user can simply upload files here.

See **`docs/EXERCISE-LIBRARY.md`** for the package workflow and media schema. `npm run build` regenerates every current page family. `npm run test:library` checks search/filters, all 22 library routes at four widths, offline navigation and the no-JavaScript fallback. The current update passes 32 unit tests plus homepage/tools/library browser checks.

## New in Phase 2

The existing Phase 1 site is preserved. New public routes:

| Route | What works now |
|---|---|
| `/tools/` | Six-tool directory and privacy/safety guidance |
| `/tools/one-rep-max/` | Epley estimate, 1-rep special case, percentage reference loads |
| `/tools/plates/` | Balanced load planning from available plate pairs, bar and total collars |
| `/tools/protein/` | Bodyweight-based daily estimate, reference range, even per-portion math |
| `/tools/tdee/` | Mifflin–St Jeor resting energy estimate × selected activity multiplier |
| `/tools/macros/` | Protein/fat/carbohydrate grams and calorie-share visualization |
| `/tools/body-fat/` | Navy-style circumference estimate with unit conversion and validation |
| `/app/` | **Coming soon** overview, not an operational app |

All six tools calculate locally, offer reset/copy controls, support relevant metric/imperial units, and work offline after their assets are cached. Their inputs stay in the current page's memory; they are **not saved in application storage, sent to a server, or encoded into URLs**. Copy only writes the result to the clipboard when the user requests it. This differs from the older homepage rank calculator, which can remember inputs in local storage. The Privacy Policy explains that distinction.

Nutrition and body-composition tools are general estimates for adults, not medical advice or individualized plans. They are not intended for pregnancy, breastfeeding, children, or clinical nutrition needs. Body-fat estimates are not assigned health labels or ideal targets. Macro arithmetic does not prescribe a calorie deficit. See the on-page method panels and `docs/TOOL-METHODS.md` for assumptions and sources.

The plate calculator uses bounded dynamic programming rather than a simple greedy algorithm: closest balanced load **at or below** the target, then fewest plates, without exceeding the available pairs. Unattainable loads are labeled, not silently presented as exact. Switching plate units resets inventory/bar/target to defaults because the denominations differ. Other tools convert the entered measurements between unit systems. Equipment capacity and sleeve space are not checked.

`/app/` explicitly lists planned workout logging, per-working-set Pwen Fòs/ranks, progress tracking, streaks/gamification, and Friends/Global/Regional leaderboards. No real app accounts, set logging, progress history, streaks, leaderboard data, or regional location collection were added. No native-app release date is claimed.

Build/rebuild all generated pages:

```sh
npm run build
```

This also runs the existing company-page generator. Run `python3 scripts/export_preview.py` afterward to create **Monte-Wo-Exercise-Library.html** (portable review, opens the library) and **Monte-Wo-Exercise-Library-Cloudflare.zip** (deployable source).

Testing:

```sh
npm test
# Keep the main server running with npm run dev:
npm run test:phase2
```

Phase 2 adds math tests (including independent brute-force checks of the plate solver) and browser checks for all six calculators, 48 responsive page/viewport combinations, unit conversion, reset, stale-result prevention, validation, offline calculations, and no data-upload requests. The existing homepage and Phase 1 tests remain in the project.

**Deployment status is unchanged:** no remote Cloudflare publication or production signup configuration was performed by this build. The six free tools do not depend on D1, Turnstile, R2, or a login. Those services are used only by the existing optional waitlist/media features.

## Delivered previously / still included

- Existing branded, responsive landing page and offline-capable demo calculator.
- Company pages: `/about/`, `/contact/`, `/faq/`.
- Public legal pages: `/privacy/`, `/terms/`, `/delete-account/`.
- `/strength-ranks/`: Pwen Fòs, transparent demo math, and **Debitan → Bati → Solid → Fò → Avanse → Mèt → Chanpyon → Titan → Lejand**.
- `/waitlist/`: consent-based signup, Cloudflare D1 storage, Turnstile protection, validation, normalized-email deduplication, same-origin checks, bounded request bodies, and an hourly per-IP-derived rate limit.
- Footer with all company/legal links, the supplied email, and clearly unavailable Instagram/TikTok/WhatsApp channels. No handles are invented.
- Confirmed on-device clearing of local preferences, offline cache, and the website's service-worker registration.
- Email-draft workflow for waitlist/account-data deletion requests. **Opening a draft is not sending an email or completing server-side deletion.**

## Status: built and locally tested, not remotely deployed

The default preview/deployment safely disables signup until D1 and production Turnstile settings are configured. No production database, Cloudflare resource, secret, or social account has been created by this update. No test address was sent to a real mailing service.

The local D1 integration was tested with real persistence, duplicate requests, and rate limits. Production Turnstile verification logic was unit-tested with mock responses, but a real production challenge cannot be verified until your own keys/domain are configured.

App accounts, native apps, fitness-profile uploads, workout synchronization, and live leaderboards remain unimplemented. The original phone screens are illustrative. The website sends **no automatic confirmation or marketing emails**. The waitlist is single opt-in; Turnstile verifies a challenge, not ownership of the supplied email address. Establish email verification and a working unsubscribe process before sending bulk launch messages.

## Legal content and review

The Terms preserve the operator-supplied October 11, 2026 wording, with a current-release note distinguishing future account features. The Privacy Policy retains the supplied sections and adds current, specific launch-data practices: local calculator storage, consented email signup, Cloudflare processing, keyed rate-limit identifiers, caching, and data-request handling.

The operator's jurisdiction is still unconfirmed; it has not been invented. The source text identifies VitaFlex Business Group as an individual/sole-proprietor operation. Confirm the actual legal operator details, jurisdiction, address/disclosures where required, retention/backups, response deadlines, age eligibility, email-provider practices, and international processing before public launch. These pages are not a legal-compliance or app-store-approval guarantee.

The homepage/calculator remain English, Kreyòl, and French. Company/legal and Phase 2 tool pages are currently English. Rank names remain the supplied Kreyòl brand signature in all languages.

## Local preview

Use a supported Node.js LTS version; Node 22+ is recommended.

```sh
npm ci
npm run dev
```

Open `http://localhost:8080`. No build step is required. The Pages Functions run in Wrangler locally; signup stays unavailable without a configured DB/security setup.

### Test the real local waitlist

Terminal 1:

```sh
npm run db:local
npm run dev:waitlist
```

Open **`http://localhost:8081/waitlist/`**. Local test signup bypasses Turnstile **only** when `LOCAL_DEVELOPMENT=true` AND the request hostname is localhost/127.0.0.1/::1. It does not work on the external preview hostname. Local records stay in `.wrangler/state`; they are not production signups and are excluded from the source ZIP.

Do not deploy `wrangler.local.toml` or set `LOCAL_DEVELOPMENT` in production. The local configuration's database identifier `DB` is Wrangler's local binding identifier, not a real Cloudflare database ID. Pages dev uses `--d1 DB`; D1 migration CLI uses `wrangler.local.toml` to address the same local database.

## Publish the website on Cloudflare Pages

Run from the extracted **monte-wo** folder (the one containing `package.json`, `public/`, `functions/`, and `wrangler.toml`). This is not the user's separate Vitaflex Intelligence project.

```sh
npm ci
npx wrangler login
npx wrangler pages project create vitaflex-monte-wo --production-branch main
npx wrangler pages deploy public --project-name vitaflex-monte-wo --branch main
```

Skip project creation if it already exists. If using a different name, change it consistently in `wrangler.toml`, `package.json`, and the commands. Use the actual URL printed by the CLI—no domain is assumed to exist.

Deploy from the project root so the adjacent `functions/` directory is compiled. A static-only ZIP drag-and-drop is not sufficient for this API.

## Activate production waitlist collection

### 1. Create the real D1 database

```sh
npx wrangler d1 create monte-wo-waitlist
```

Use the **actual returned database ID** to enable the commented `[[d1_databases]]` block in `wrangler.toml`. Keep `binding = "DB"`, `database_name = "monte-wo-waitlist"`, and `migrations_dir = "migrations"`. Never copy the local test identifier into production.

Then apply the schema:

```sh
npx wrangler d1 migrations apply monte-wo-waitlist --remote
```

### 2. Configure Cloudflare Turnstile

In Cloudflare's Turnstile dashboard, create a managed widget for the actual production hostname(s). The code requires the validated Turnstile hostname to exactly match the request hostname, and the action to be `waitlist`. Preview deployment hostnames need their own permitted-host configuration if you want working signup there.

- Put the public site key in the `[vars]` section of `wrangler.toml` as `TURNSTILE_SITE_KEY` (uncomment the supplied lines).
- Store the secret using Wrangler's secure prompt:

  ```sh
  npx wrangler pages secret put TURNSTILE_SECRET --project-name vitaflex-monte-wo
  ```

- Generate a long random salt locally (for example with `openssl rand -hex 32`), then save it as a separate secret:

  ```sh
  npx wrangler pages secret put RATE_LIMIT_SALT --project-name vitaflex-monte-wo
  ```

Never paste these secret values into chat, source files, screenshots, or commits. `TURNSTILE_SITE_KEY` is public; the other two values are secrets.

### 3. Redeploy and verify

```sh
npx wrangler pages deploy public --project-name vitaflex-monte-wo --branch main
```

Visit `/api/waitlist/config`: it should say `available: true`, `localTest: false`, and return the public site key only. This means bindings/settings are present—not that the DB schema has been verified. Complete a real Turnstile challenge and a signup, then verify the record in the restricted D1 dashboard.

Check duplicate handling, consent, blocked/offline behavior, and a verified deletion request before linking the form publicly. Do not use a fake confirmation message while the backend is unconfigured.

## Waitlist data and deletion operations

Schema is in `migrations/0001_waitlist.sql`. It stores:

- A generated ID and unique normalized email.
- Language (`en`, `ht`, `fr`), creation timestamp, consent version, and source label.
- A separate hourly-rate table containing a keyed HMAC of the connecting IP, window timestamp, and count. No raw IP is written to D1 by this code. Cloudflare itself processes network metadata.

The rate limit is 10 validated signup attempts per hourly window per keyed identifier. It is a basic abuse control, not a guarantee against distributed attackers. Enable appropriate Cloudflare WAF/rate-limit protections as traffic grows.

No public endpoint lists, exports, edits, or deletes waitlist records. Deletion requests arrive by email. Verify control of the signup address, then remove the matching record through authorized D1 administration. The supplied `npm run waitlist:remove -- address@example.com` helper prompts for explicit verification and performs an exact-match deletion against the remote production database. Review `scripts/waitlist-admin.mjs` before use. It does not erase provider backups or support email.

Retire the waitlist when no longer needed; the database does not automatically impose a global retention deadline. Stale rate-limit rows are cleaned on subsequent validated requests. Check provider backup retention and all legally required exceptions.

## Optional animated exercise media

The existing R2 integration remains ready for approved GIF/WebP assets. Create the bucket and enable the commented `WORKOUT_GIFS_BUCKET` binding in `wrangler.toml`:

```sh
npx wrangler r2 bucket create monte-wo-workout-gifs
npx wrangler r2 object put monte-wo-workout-gifs/gifs/v1/bench-press.gif --file ./animations/bench-press.gif --content-type image/gif --remote
```

Add the uploaded paths to `public/media.json`, for example:

```json
{
  "bench-press": "/api/gifs/v1/bench-press.gif",
  "back-squat": "/api/gifs/v1/back-squat.gif",
  "deadlift": "/api/gifs/v1/deadlift.gif"
}
```

Only list files you actually uploaded. Missing media retains the illustration. Keep the bucket private; the Pages Function exposes the `gifs/` paths through same-origin read-only routes. Use versioned filenames when replacing media. Viewed assets can be cached, up to 30 objects; bulk downloads are not implemented. Have a qualified reviewer check exercise demonstrations.

## Demo strength model

`public/scoring.js` is the source of truth. One rep uses the entered load. For 2–30 reps, Epley estimates one-rep maximum. The provisional threshold is `ratio × A × (bodyweight/A)^(2/3)`, with A = 80 kg for the male reference and 65 kg for the female reference. Pwen Fòs is `clamp(round(900 × e1RM / threshold), 1, 1000)`.

| Lift | Male ratio | Female ratio |
|---|---:|---:|
| Bench press | 2.15 | 1.45 |
| Back squat | 2.75 | 2.05 |
| Deadlift | 3.20 | 2.45 |
| Overhead press | 1.40 | 0.95 |

These are unvalidated design assumptions, not population percentiles or Liftoff's proprietary standards. Boundaries remain: Debitan 1–199, Bati 200–299, Solid 300–399, Fò 400–499, Avanse 500–599, Mèt 600–699, Chanpyon 700–799, Titan 800–899, Lejand 900–1000.

## Tests and exports

```sh
npm test
npx playwright install --with-deps chromium
# With both preview servers running:
node tests/browser.mjs
node tests/phase1.mjs
```

Tests cover scoring, R2 delivery, validation, request size/origin, Turnstile hostname validation, DB error states, local-only bypass restrictions, local-D1 persistence/deduplication, navigation, responsive layouts, and offline behavior. The Phase 1 browser test resets only the local test rate table and its own fixture address.

Generated company pages can be rebuilt with `python3 scripts/build_pages.py`. Export the portable preview and source ZIP with `python3 scripts/export_preview.py`. Edit generator content for company-page changes; rebuilding will overwrite those page files.

The portable HTML preview embeds the existing pages, calculators, coming-soon app overview, and branding for review. It cannot collect waitlist signups or perform server deletion. Deploy the source project for real routes, PWA caching, and the API.

## Dependencies and launch checks

The production browser code has no npm runtime dependencies. Turnstile loads externally only on a configured signup page. The pinned Wrangler/Playwright toolchain reported development-dependency advisories; `npm audit fix` did not eliminate them in this environment. Update to patched compatible tooling and review `npm audit` before production pipeline use. Never serve the development runtime as your production site.

Before launch: confirm legal details with appropriate review, verify the contact mailbox and deletion workflow, connect real social profiles, configure real D1/Turnstile, test the production deployment, plan consented email delivery/unsubscribe, validate ranking claims, and review exercise media. App-store account-deletion requirements for the future native app require actual account deletion; this email-request page alone does not establish compliance.

The user-supplied logo is used throughout. Original uploads remain unchanged; optimized WebP and icon PNGs are included. Inter is licensed under the SIL Open Font License; see `public/assets/INTER-LICENSE.txt`. No Liftoff branding, screenshots, or training data are reused.


## Official rank artwork

All nine names, score bands, colors and corresponding emblems come from `public/ranks.json`. This drives the homepage ladder, scoring results, phone/leaderboard mockups, feature example, methodology table, Strength Ranks page and coming-soon app concept. Fò is electric blue (`#4aaaff`): both the 468-point phone example and default 488-point calculation resolve to `/assets/ranks/fo.webp`.

Original PNGs are retained unchanged in `brand-assets/ranks/`. Web-ready transparent crops are in `public/assets/ranks/`. See `docs/RANK-ARTWORK.md` for provenance and source limitations. No generative replacements or reconstruction were used.

Rebuild rank metadata with `python3 scripts/build_ranks.py` (also called by page generation). To re-extract artwork, install Pillow and run `python3 scripts/build_ranks.py --assets`. Edit canonical metadata, not generated `public/ranks.js`.

Additional checks:
```sh
npm run test:ranks       # requires the website on port 8080
python3 scripts/export_preview.py
npm run test:portable    # validates the exported nested-sandbox HTML, without HTTP requests
```

Verified in this update: 30 unit tests; homepage 18 responsive/language combinations; Phase 1 eight routes / 32 layouts and local-D1 signup; Phase 2 six calculators / 48 layouts; rank boundary/artwork regression tests; offline emblems; portable rank recalculation and all six calculators. Production deployment is still pending.
