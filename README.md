# MONTE WO · Public Website Foundation (Website Step 2)

**MEASURE. PROVE. EARN. CLIMB.**
**LEVE. KLASE. MONTE WO. / LIFT. RANK. CLIMB HIGH.**
Managed by **VitaFlex Business Group** · Montewo@vitaflexbusinessgroup.com

## Latest change — Website Step 2 only

The public site now has consistent navigation, one Free Tools entry point, a non-awarding app concept without pretend athlete data, a four-discipline draft-variation guide, accessible mobile navigation, page-specific sharing metadata and a real 404 page. **No app, account system, dashboard or ranking backend was added or expanded in this phase.**

Existing calculators and server functionality are preserved. The pre-existing restricted ranking pilot is tucked behind a closed, explicitly labeled technical disclosure; the operator’s identity/database/publishing configuration remains unchanged and off by default.

**Production launch is not verified.** The default preview has no configured live waitlist destination. A confirmed production origin is also needed for absolute canonical/social URLs and the sitemap. Do not infer production readiness from a successful local build.

```sh
npm ci
npm run build          # finish with build_website.py; do not deploy intermediate generator output
npm test
npm run dev            # existing Pages preview on 0.0.0.0:8080
npm run test:website
npm run export:website # portable review + source ZIP in the parent directory
```

For a real deployment, set **`SITE_ORIGIN` to your confirmed HTTPS origin** when running the build. The same value can be stored in `content/website/site.json` as `publicOrigin`; it is public configuration, not a secret. Empty values deliberately omit canonical URLs and the sitemap. Invalid origins fail the foundation build. Do not copy the reserved `.test` domain used by automated tests into production.

See [`docs/website/REPORT.md`](docs/website/REPORT.md), [`docs/website/AUDIT.md`](docs/website/AUDIT.md) and [`docs/website/OPERATIONS.md`](docs/website/OPERATIONS.md) for changed files, executed tests, release blockers and setup. This website phase does not approve ranking standards or authorize future app work.

## Preserved release — Free Strength Lab


The five calculators at **`/strength-lab/`** run locally without an account, API, database or new dependency. Existing tools and the rest of the website remain available. **This step does not approve, activate or publish ranking standards, and does not implement a training log or new nutrition features.**

| New route | Calculator |
|---|---|
| `/strength-lab/one-rep-max/` | Epley estimate; recorded singles distinguished from tested maxima |
| `/strength-lab/percentages/` | Tested/estimated reference, custom percentages and explicit floor increments |
| `/strength-lab/plates/` | Custom plate sizes/pair inventory, balanced loading and signed nearest-load differences |
| `/strength-lab/converter/` | Both conversion directions using 1 lb = 0.45359237 kg |
| `/strength-lab/warm-up/` | Editable sub-working-load ramp, equipment fitting, duplicate omission and review warnings |

```sh
npm ci
npm run build
npm test
npm run dev           # existing Pages workflow, 0.0.0.0:8080
# Open /strength-lab/ in the preview
npm run test:lab-browser
npm run export:lab    # portable HTML + complete source ZIP in parent folder
npm run test:lab-portable
```

See [`docs/STRENGTH-LAB-REPORT.md`](docs/STRENGTH-LAB-REPORT.md) for the actual test results, changed files, limitations and deployment instructions. Read [`docs/STRENGTH-LAB-LOCALIZATION.md`](docs/STRENGTH-LAB-LOCALIZATION.md) before adding translated copy. The new Lab is English-first, not yet a translated three-language product. The existing homepage language switcher is unchanged.

## Preserved Strength Index status — read first

**DRAFT — NOT OFFICIAL.** There are zero approved production threshold tables. The original unvalidated 1–1000 demo was retired, not promoted into an official method. No user begins with a free rank. Nine supplied badge identities remain unchanged; the last three retain the clipping present in the supplied originals.

The code implements four independent disciplines, exact eligibility arithmetic, versioned D1 records, authenticated submission and review workflows, private R2 evidence handling, administrator governance and audit trails. These are real server/API implementations, not simulated successful forms. Private features remain disabled until the operator configures identity, database, private evidence storage and consent/retention operations. Scientific calibration and production deployment have **not** been completed.

## Architecture and routes

Vanilla HTML/CSS/ES modules, Python static-page generators, Cloudflare Pages Functions, D1 and optional R2. No replacement framework or public user directory was introduced.

| Route | Purpose |
|---|---|
| `/` | Existing trilingual landing + non-awarding educational strength estimate |
| `/strength/` | Four independent discipline cards and authenticated athlete workspace |
| `/methodology/` | Methodology status, calibration process, four draft MONTE Standards and evidence policy |
| `/strength/admin/` | Role-restricted review/governance API client, not an unauthenticated admin backend |
| `/strength-ranks/` | Nine rank identities; no invented bands |
| `/exercises/` | Seven groups and 14 written guides; supplied animations not yet received |
| `/tools/` | Six device-local fitness calculators |
| `/app/` | Native app roadmap, still coming soon |
| `/about/`, `/contact/`, `/faq/`, `/privacy/`, `/terms/`, `/delete-account/`, `/waitlist/` | Preserved company/legal/signup pages |

Exactly four launch disciplines: **Barbell Squat, Barbell Bench Press, Barbell Deadlift, Strict Biceps Curl**. No overall rank, combined score or transfer between disciplines. No XP, workout-count, streak, referral or arbitrary-rank-award endpoint.

## Local build and verification

Requires Node 20+, Python 3; Pillow only when re-extracting image assets.

```sh
npm ci
npm run build
npm run dev                         # 0.0.0.0:8080; ranking writes safely unavailable by default
npm test                            # engine/API/SQL/auth and existing unit tests
npx playwright install --with-deps chromium
npm run test:browser
npm run test:phase2
npm run test:library
npm run test:ranks
npm run test:strength-browser
node tests/strength-ui.mjs           # explicitly synthetic API-response UI checks
```

For local D1 waitlist and migration regression:
```sh
npm run db:local                     # applies 0001 and additive 0002 locally
npm run dev:waitlist                 # 8081; only waitlist supports localhost test bypass
npm run test:phase1                  # requires 8080 + 8081
```

**Ranking has no development authentication bypass.** Authorization tests sign real RSA JWTs and use isolated SQLite databases through a D1-compatible test adapter. Tests never seed official models or users in the deployed public files. The local Wrangler D1 migration was also executed independently.

Portable review and source:
```sh
python3 scripts/export_preview.py
npm run test:portable
```

Outputs `../Monte-Wo-Strength-Index.html` and `../Monte-Wo-Strength-Index-Cloudflare.zip`. The portable file opens the Strength Index and embeds the rest of the website. Private ranking and waitlist writes are explicitly disabled there. Offline public reference pages are not offline athlete sync.

## Source of truth

- `public/ranks.json`: exact names/order/colors and supplied artwork provenance, **no score intervals**.
- `content/strength/`: four draft rules and empty methodology/threshold configurations.
- `server/strength/engine.js`: deterministic exact-rational comparisons and separate discipline eligibility.
- `server/strength/auth.js`: verified Cloudflare Access JWT + D1 active principal/role lookup.
- `server/strength/api.js`: scoped submissions, profile revisions, private evidence, review decisions, version governance and audit.
- `migrations/0002_strength_index.sql`: additive schema, seeded draft definitions, indexes and integrity/immutability guards.
- `scripts/build_strength.py`: public pages and canonical static draft catalog.
- `public/strength.js`, `public/strength.css`: athlete/admin clients and accessible responsive presentation.
- `content/exercises.json`: exercise library; see `docs/EXERCISE-LIBRARY.md` before adding packages.

Never edit generated HTML independently. `npm run build` rebuilds the company pages, tools, library, then the Strength Index. Only build metadata after source changes; image extraction is separately `python3 scripts/build_ranks.py --assets`.

## Governance and deployment

Read **`docs/strength/METHODOLOGY.md`**, **`docs/strength/OPERATIONS.md`** and **`docs/strength/IMPLEMENTATION-REPORT.md`** before activating anything. Empty draft thresholds cannot publish. Approved models require documented evidence, a different publisher, approved rulebook and independently configured exact digest. The engine does not turn report filenames into scientific validation; people must review the reports.

Keep `RANKING_ENABLED` and publishing disabled pending release checks. Access account/domain integration, remote D1 migrations, principal enrollment, evidence bucket privacy, retention/deletion/export procedures and production security review require operator action. No production deploy or remote migration was performed. The development toolchain still reports 6 npm advisories (1 low, 5 high); review patched compatible versions before a production pipeline launch.

The optional waitlist retains the existing D1/Turnstile controls. Exercise-library media uses the separate public `WORKOUT_GIFS_BUCKET` binding and `/api/gifs/...` routes. Ranking evidence must use a **different private** `RANKING_EVIDENCE` bucket. Do not expose private performance videos through exercise-media routes. Neither bucket was configured remotely here.

Earlier instructions and deployment examples are preserved in `docs/ARCHIVE-README-0.4.md`, explicitly historical. Old demo scoring claims in archived files are not current policy.
