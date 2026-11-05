# Sony — The Person Behind the Vision

## Current status

This is the local review version of the latest official biography. **No commit, push, publication or deployment was performed for this update.** Production remains on the previously authorized revision. New authorization is required before publishing these changes.

Local review: port 8080, footer **Sony**, `/sony/`.

## Definitive content replacement

`content/group/founder.json` now contains the latest biography supplied by the owner: ten narrative paragraphs, the new closing statement and “The journey continues.” All paragraphs are rendered verbatim and in order. The previous nine narrative paragraphs and previous closing are absent from the generated profile. No archival biography or second profile is presented.

- Presentation title: **The Person Behind the Vision**.
- Presentation name: **Sony** (displayed in the existing uppercase name treatment). No surname was added.
- Previous subtitle and designation removed from the profile source, displayed introduction and SEO metadata.
- Footer link now reads **Sony** rather than the prior designation.
- The existing `/sony/` route is reused. The existing legacy `/founder/` redirect remains; no duplicate HTML page is generated.

The four existing editorial chapters remain as reading aids. Education, fitness, listening, discretion, family, faith, Haiti and service are communicated through the supplied prose, without résumé widgets, invented achievements, credentials or operating/launch claims.

## Design and preservation

The charcoal, champagne-gold and off-white palette, local Inter font, editorial serif typography, chapter anchors, 680px maximum reading column and responsive reading layout are retained. The redundant designation line and its unused styles were removed. The new title uses the existing editorial subtitle treatment. Existing reduced-motion behavior and subtle chapter-link transitions remain unchanged. No production dependencies were added.

The homepage's entire `<main>` was compared before and after and is **byte-for-byte unchanged**. The venture registry is also unchanged. MONTE WO, VitaFlex Training, VitaFlex Intelligence Corp and Lifeline remain separate ventures with their existing categories, statuses and destination rules. The only generated change to their pages is the shared footer label. Backend code, ranking logic and security configuration were not changed.

The source renderer remains `scripts/founder_page.py`, invoked by `scripts/build_group.py`. The internal implementation filenames/classes are not presentation titles.

## Files changed in this update

- `content/group/founder.json` — definitive biography, title and SEO description.
- `scripts/founder_page.py` — official title, no previous designation/byline.
- `scripts/build_group.py` — Sony footer link and offline-cache upgrade.
- `public/group.css` — removed two unused designation styles; otherwise unchanged.
- `public/sony/index.html` — regenerated single profile.
- `public/index.html` and `public/ventures/*/index.html` — shared footer label only.
- `public/sw.js` — cache version `montewo-core-v28-official-biography` for the eventual authorized release.
- `scripts/verify-group.mjs` — future release verification now expects the official presentation title; not executed against production in this update.
- `tests/founder.test.js`, `tests/founder-browser.mjs` — definitive-copy, outdated-content, title/name, single-profile and navigation expectations.
- `tests/group.test.js`, `tests/phone-cockpit.test.js`, `tests/posters.test.js` — expected cache version only.
- `docs/group/FOUNDER-PROFILE.md`, `docs/group/founder-qa.json` — current review documentation and test evidence.

No deployment workflow was changed or invoked.

## Tests actually performed

| Check | Result |
| --- | --- |
| `npm run build` | Passed; existing routes and `/sony/` generated |
| `npm run test:founder` | 7/7 passed |
| Definitive content | Ten narrative paragraphs, closing and postscript rendered verbatim; all previous narrative paragraphs and previous closing confirmed absent |
| Duplicate prevention | One profile in the group route manifest; no `/founder/index.html`; existing legacy redirect retained |
| Profile browser suite | Passed at 320, 390, 600, 768, 844 (landscape), 1024, 1440 and 1920px |
| Readability/layout | No page overflow or clipped text; reading column <=680px; desktop/tablet/mobile screenshots visually reviewed |
| Profile navigation | Footer entry, chapter anchors, keyboard skip/focus, return-to-portfolio and JavaScript-disabled reading/navigation passed |
| Group browser suite | All seven routes at seven widths passed; all four venture detail pages returned HTTP 200 and their navigation remained usable |
| Static links | 131 group links/assets/fragments checked; existing product reference test also passed |
| Full test suite | 223/225 passed; the same two pre-existing protected-file checksum failures remain |
| Automated accessibility | axe-core: zero violations and zero incomplete results at 1440, 768, 390 and 320px for the selected WCAG A/AA tags |
| Errors/assets in dedicated profile test | Zero unexpected page errors and zero failed HTTP assets |

Browser: local Chromium 153.0.8010.0 via Playwright. No new app dependencies or browser security bypass flags were used. Accessibility scans are automated evidence, not a certification of complete WCAG compliance.

### Reproduce locally

```sh
npm run build
npm run test:founder
npm test
# With a local server serving public/ on port 8080:
npm run test:founder-browser
node tests/group-browser.mjs
```

If using an existing locally provisioned Chromium, set `BROWSER_EXECUTABLE_PATH`. Review screenshots are disposable artifacts under `/tmp/vitaflex-founder-review/` by default, not website assets.

## Outstanding

1. Two existing tests expect a different checksum for `wrangler.toml`. The file and protected-source assertions were not weakened or changed to make these pass.
2. This definitive biography still requires owner authorization before deployment. No claim is made that the new text is live.
3. Physical-device Safari/Firefox and VoiceOver/NVDA testing were not performed; local Chromium, keyboard and JavaScript-disabled tests were performed as listed.
