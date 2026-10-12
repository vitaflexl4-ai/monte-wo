# MONTE WO — Step 1: Free Strength Lab

**Implemented and locally verified · October 12, 2026**
Managed by **VitaFlex Business Group**
Contact: **Montewo@vitaflexbusinessgroup.com**

## Outcome and scope

Added a dedicated **`/strength-lab/`** collection with five free calculators to the existing MONTE WO website. This is an additive implementation, not a replacement application.

**Step 1 only. No ranking engine expansion, training log, new nutrition feature, authentication requirement, database addition, paid API or new package dependency.** Completing this work does not authorize Step 2, validate a threshold table or publish any rank. The existing Strength Index remains **DRAFT — NOT OFFICIAL**.

**No production deployment was performed.** A local Cloudflare Pages preview and a self-contained, network-free HTML review file were tested. There is no claim of a live production URL, verified production bindings or approved methodology.

## 1. Repository inspection and placement

The existing project uses vanilla HTML/CSS/ES modules, Python static-page generators, and Cloudflare Pages Functions. It already has a shared header/footer, supplied MONTE WO logo assets, local Inter fonts, a service worker, an exercise library, company/legal pages, six older fitness tools, waitlist functionality, and a separate draft Strength Index implementation.

The new collection lives at `/strength-lab/`, with a direct link from the homepage’s existing Free tools navigation and a prominent link above the older `/tools/` directory. All older calculator URLs are preserved. The six older calculator HTML files, their JavaScript/math and the app roadmap HTML are byte-for-byte unchanged against the previous source archive.

Reused the existing Epley function and unit/standard-plate constants. A separate bounded plate solver was necessary for custom sizes and optional nearest-above behavior. No React migration, external UI library, font CDN or replacement branding was introduced.

## 2. The five calculators

| Route | Implemented behavior |
|---|---|
| `/strength-lab/one-rep-max/` | kg/lb input, 1–10 whole repetitions; Epley for 2–10 reps; a single is labeled **recorded single**, not proof of a tested maximum; higher-repetition caution; formula and limitations shown. |
| `/strength-lab/percentages/` | Explicit tested/estimated reference, editable comma-separated percentages, example presets, calculated loads, optional downward increment rounding shown in its own column. Decimal arithmetic avoids dropping an exactly achievable increment because of floating-point division. |
| `/strength-lab/plates/` | Target, bar, combined collars, kg/lb, editable standard/custom plate sizes and available pair counts. Balanced per-side layout, total equation, closest achievable load and signed difference. Default stays below target; optional nearest mode warns when above. Ties select the lower load; equal-load solutions prefer fewer plates. |
| `/strength-lab/converter/` | Both directions using **1 lb = 0.45359237 kg exactly**. Result marked approximately equal; displayed to up to eight decimal places, with significant digits retained for tiny values. Input is not overwritten by a rounded training load. |
| `/strength-lab/warm-up/` | Working-load or estimated-max basis, editable sets/percentages/reps/rest, bar/collar/plate inventory fitting, lower achievable working load when needed, duplicate and working-load step omission, below-bar labeling, and review warnings for large gaps—including the last transition to working sets. |

### Important calculation boundaries

- Load limits are software input bounds, **not safe-lifting limits**.
- Plate stock is entered in **pairs**: one matching plate on each side. Sizes support two decimal places; target/bar/collar values support six.
- Percentage increment flooring and warm-up target flooring use integer micro-units/BigInt arithmetic. Plate optimization uses integer plate units, not display-rounded weights.
- Changing units in 1RM/percentage tools explicitly converts load fields to six displayed decimal places. An invalid field prevents that change and keeps the previous unit. Plate/warm-up unit changes explicitly reset equipment and reference examples, rather than relabel kilogram plates as pound plates.
- Warm-up defaults are 40/60/80/90% of working load, 8/5/3/1 reps, and 45/60/90/120 seconds of rest. Estimated-max basis defaults to a 75% working reference. These are **editable product heuristics, not clinically or scientifically validated prescriptions**.
- The warm-up planner does not prescribe maximum attempts. It limits the estimated-max working reference to 40–90%, warm-up percentages to 1–95% of working load, and high-end repetitions. These restrictions cannot establish that a plan is safe for an individual.

## 3. UX, privacy and localization

- Existing dark MONTE WO identity, electric-blue accents, supplied logos, shared legal/company links and local fonts preserved.
- Responsive hub, five dedicated pages, mobile scrolling tool navigation, labeled inputs, keyboard focus styles, live result/error regions, reset examples, clipboard result copying with a sandbox fallback.
- An input change clears the previous calculation instead of showing a stale result. Initial results are explicitly marked **EXAMPLE INPUTS**.
- No calculator inputs are uploaded, saved to local storage or sent to an API. The service worker caches static assets, not calculator inputs. Offline calculations were tested after cache installation.
- Initial Lab language: **English**. Tool/result/error/method copy lives in `content/lab/en.json`; generated catalogs and error codes separate copy from calculation logic. Haitian Creole and French translation/routing remain future work, not falsely labeled complete. Remaining static English template copy is identified in `docs/STRENGTH-LAB-LOCALIZATION.md`. The existing homepage language switcher is unchanged.

## 4. Actual files added and changed

### Added

- `content/lab/en.json`
- `scripts/build_lab.py`
- `public/lab-math.js`
- `public/lab.js`
- `public/lab.css`
- `public/lab-copy.js` — generated catalog
- `public/strength-lab/index.html`
- `public/strength-lab/one-rep-max/index.html`
- `public/strength-lab/percentages/index.html`
- `public/strength-lab/plates/index.html`
- `public/strength-lab/converter/index.html`
- `public/strength-lab/warm-up/index.html`
- `tests/lab.test.js`
- `tests/lab-browser.mjs`
- `docs/strength-lab-baseline.json` — pre-change preservation hashes
- `docs/STRENGTH-LAB-LOCALIZATION.md`
- `docs/STRENGTH-LAB-REPORT.md` — this report

### Modified

- `package.json` — appended Lab build/test/export scripts; dependencies unchanged.
- `scripts/build_tools.py` — adds the Lab directory link and hub-only stylesheet link; old calculator generation unchanged.
- `public/tools/index.html` — generated Lab discovery link.
- `public/index.html` — Free tools navigation points to the Lab.
- `public/sw.js` — new static routes/assets; cache version `montewo-core-v10-strength-lab`.
- `scripts/export_preview.py` — isolated Lab module bundling; `--lab` exports a Lab-first portable review and source archive without overwriting previous Strength Index deliverables.
- `tests/library.mjs` — checks the actual current service-worker cache identifier rather than a hard-coded old release name; existing library/offline assertions preserved.
- `tests/portable.mjs` — optional Lab artifact selection and five additional calculator checks; previous portable checks retained.
- `README.md` — Step 1 routes, scope, commands and documentation pointers.

Preservation checks passed for the baseline’s ranking server files, draft standards/models, migrations, Wrangler configuration, and old calculator math/UI JavaScript. Source comparison against the previous archive also confirms unchanged ranking pages and supplied assets. No migration, model, threshold, publication or authentication setting was added or edited.

## 5. Tests actually executed

All results below were executed on this implementation; these are software tests, not empirical validation of strength standards or warm-up safety.

| Verification | Result |
|---|---|
| `npm run build` | Passed: existing page families plus Lab hub and five calculators generated. |
| `npm test` | **76 passed, 0 failed, 0 skipped**: 22 new Lab tests plus 54 existing tests. |
| Plate solver independent check | 240 seeded inventory/target cases compared against exhaustive enumeration; balanced reconstruction, stock limits and minimum plate count verified. |
| Numeric edge cases | Conversion round-trips/zero/invalid inputs, single-vs-estimate distinction, percentages, decimal increment boundaries, invalid precision, missing/duplicate plate sizes, nearest ties/above-target results, empty stock, maximum supported custom inventory, decimal bar/collar warm-ups, duplicate omission and final-gap warnings passed. |
| `node tests/lab-browser.mjs` | Passed: six routes × eight widths (**48 layouts**, 320–1440px), five interactive calculators, mobile navigation, validation, stale clearing, resets, unit handling, custom stock, clipboard, adjustable warm-ups and all five tools offline. **Zero calculator API calls, uploads, stored inputs or JS errors.** |
| `node tests/browser.mjs` | Passed: existing homepage interactions, all three languages, 18 layouts, offline behavior and draft/non-awarding calculator state. |
| `node tests/phase1.mjs` | Passed: eight company/legal pages, 32 layouts, privacy/deletion flow, unavailable signup state, and actual local-D1 waitlist signup/duplicate/offline-submission handling. Local test database only. |
| `node tests/phase2.mjs` | Passed: all six older calculators, 48 layouts, existing math/validation, unit conversion, reset/stale behavior, offline tools and app roadmap. No old nutrition feature was changed. |
| `node tests/library.mjs` | Passed: seven groups, 14 guides, search/filter/reset/sort, 22 routes × four widths, offline guides and no-JS fallback. |
| `node tests/ranks.mjs` | Passed: all nine supplied identities intact; no invented calculator awards. |
| `node tests/strength-browser.mjs` | Passed: four independent draft cards, no invented progress, private features disabled without configuration, 20 layouts and offline rulebooks. |
| `node tests/strength-ui.mjs` | Passed using explicitly synthetic API fixtures. This is **not** a production identity or methodology approval test. |
| `node tests/portable.mjs --lab` | Passed: nested sandbox, Lab hub and five calculators, clipboard fallback, existing tools/library/draft pages, **zero HTTP requests or JS errors**. |

The original library regression initially failed solely because its test expected the retired v9 cache name. The assertion now reads the current identifier from `public/sw.js`; all original library behavior checks subsequently passed. Numeric review also caught and fixed a decimal bar-plus-collar warm-up floor boundary; that case now has its own regression test.

Desktop and mobile screenshots were inspected. Testing used Chromium responsive emulation; no physical iOS/Android device or independent accessibility audit is claimed.

## 6. Preview, rebuild and deploy

### Existing local workflow

```sh
cd monte-wo
npm ci
npm run build
npm test
npm run dev
```

The Pages development server binds to `0.0.0.0:8080`. Open **`/strength-lab/`** in the live preview; on your own computer, use `http://localhost:8080/strength-lab/`.

Browser verification requires the existing Playwright test dependency and a browser installation:

```sh
npx playwright install --with-deps chromium
npm run test:lab-browser
```

The five calculators need **no D1 binding, R2 bucket, Access configuration or API credentials**. Existing unrelated features retain their original configuration requirements.

### Portable review and source archive

```sh
npm run export:lab
npm run test:lab-portable
```

Outputs in the parent directory:

- `Monte-Wo-Strength-Lab.html` — embedded multi-page interactive review; no network dependencies. Private services/signup remain explicitly disabled in this review artifact.
- `Monte-Wo-Strength-Lab-Cloudflare.zip` — complete project source, excluding installed packages, local databases, credentials and test-generated caches.
- `Monte-Wo-Strength-Lab-Report.md` — delivery copy of this report.

### Production deployment — instructions only, not executed

After reviewing the source and authenticating to the correct Cloudflare account:

```sh
npm ci
npm run build
npm test
npm run deploy
```

The unchanged deploy command targets Pages project **`vitaflex-monte-wo`**, branch **`main`**. Verify ownership/account, review the deploy output and test the actual production routes/offline installation before describing the site as deployed. Do not run new database migrations for the Lab; none exist or are needed.

## 7. Remaining limitations and release considerations

1. English-first Lab. Full Haitian Creole/French copy, locale routing and language-specific browser tests are not completed.
2. Calculators cannot assess form, readiness, fatigue, pain, medical history, bar capacity, sleeve length or the accuracy of physical plate labels. The warm-up thresholds and presets are not individualized or empirically validated safety rules.
3. Plate solutions assume matching pairs and fixed entered weights. Asymmetric loading and arbitrary fractional precision are intentionally unsupported.
4. Offline availability requires a successful initial visit and service-worker installation. Clearing site data or browser eviction removes the cache. Clipboard permissions vary; manual-copy fallback is shown when unavailable.
5. `npm ci` reported **six existing development-toolchain advisories: one low and five high**. No dependency upgrade or clean-audit claim was made. Remediation should be reviewed separately rather than silently upgrading the deployment toolchain in this scope.
6. Physical-device, cross-browser and professional accessibility/security reviews remain outside the executed test scope.
7. Production deployment and production infrastructure verification remain undone.
8. **Ranking integrity remains blocked on its own evidence, methodology review and approvals. Step 1 completion is not permission to publish unvalidated ranks. No Step 2 work was begun.**
