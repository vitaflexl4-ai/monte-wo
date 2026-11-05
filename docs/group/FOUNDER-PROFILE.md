# Sony — personal profile

## Latest owner authorization

The owner requested the public description **“A non-alien”**, no “Founder” title, and explicitly authorized deployment. The public route is now `/sony/`; the group footer label and personal byline use “A non-alien.” The title has also been removed from the biography sentence and SEO metadata. All other biography text and the editorial layout are retained. `/founder/` redirects permanently to `/sony/` for compatibility. Internal filenames/classes retain their existing implementation names; they are not displayed labels.

Build, six profile tests, eight responsive profile layouts and the existing group browser suite pass locally. The earlier local-review report below is historical; its no-deployment statement described the previous turn, not the new authorization. Production deployment and live verification results are recorded in the deployment workflow.

---

# Sony — founder profile (local review only)

## Publication status

**Not published, committed, pushed, or deployed in this turn.** The founder profile exists in the working tree and the local preview on port 8080. Open the group footer’s **Founder** link to visit `/founder/`. Production deployment requires the owner's authorization. Existing deployment workflows and security settings were not modified or invoked.

## Inspection and editorial approach

Before implementation, reviewed the live group homepage and all four venture detail pages, the full local route manifests and generated page structure, shared group CSS and artwork, product navigation and static-link tests, build chain, offline cache, security headers and deployment workflow. Captured and visually reviewed the original local homepage at desktop and mobile sizes. Reviewed the completed founder page at desktop, tablet and mobile sizes.

The existing identity is retained: **Independent by design. Beyond the obvious. We build ventures. We create possibilities.** The homepage remains venture-first. MONTE WO, VitaFlex Training, VitaFlex Intelligence Corp and Lifeline remain separate ventures with their existing statuses and destinations.

The personal profile is a dedicated editorial essay, not a homepage takeover, CV, credentials grid or sales page:

- Presentation name: **SONY**, with **Sony** in metadata and the closing signature. No surname was added anywhere in the profile source, metadata or markup.
- The owner's supplied biography is preserved verbatim: nine narrative paragraphs, the final statement and “The journey continues.”
- Four quiet editorial chapters organize the reading: Roots & gratitude; Learning & building; Perspective & responsibility; Faith, Haiti & service.
- Local Inter and existing Georgia serif treatments, charcoal/champagne/off-white palette, hairlines and generous spacing reuse the current visual vocabulary.
- Desktop chapter navigation stays beside the reading column; tablet and mobile navigation flows above it. The prose column is capped at 680px, with 16–17px body text and generous line spacing.
- There is no invented portrait, personal contact CTA, external script, new production dependency, launch claim or assertion that Sony personally operates all ventures.
- The approximately eight-year Intelligence Corp vision is retained as the owner's supplied statement, not calculated into a new date or launch promise.

## Navigation and integration

Group pages have a small **Founder** link beside **Privacy** in the existing footer. The main header, homepage hero and four-venture presentation are unchanged visually. The profile has an accessible main landmark, one H1, chapter H2s, working internal anchors, a return-to-portfolio link, canonical URL and profile-specific title/description/Open Graph metadata. The active footer link uses `aria-current="page"`.

The existing `/about/` route remains the MONTE WO product page. `/founder/` is kept out of the legacy product-build/navigation loop, is listed in the group route manifest and is included once in the versioned offline cache. If a confirmed `SITE_ORIGIN` is supplied to the existing build, it is also included in the generated sitemap.

An accessibility scan found a pre-existing accessible-name mismatch in the shared group logo link. Adding a space between the visible words “VITAFLEX” and “BUSINESS GROUP” resolves it without altering the logo or layout.

## Turn-specific files

### Added

- `content/group/founder.json` — first-name-only biography source and chapter organization.
- `scripts/founder_page.py` — semantic, escaped static essay renderer using the existing group shell.
- `public/founder/index.html` — generated review page.
- `tests/founder.test.js` — six static content/navigation/integration checks.
- `tests/founder-browser.mjs` — responsive, keyboard, chapter, no-JS and reading-layout tests.
- `tests/browser-config.mjs` — optional local browser executable path; browser security defaults unchanged.
- `docs/group/FOUNDER-PROFILE.md` — this handoff.
- `docs/group/founder-qa.json` — concise test and accessibility evidence.

### Updated

- `scripts/build_group.py` — profile generation, group footer link/current state, group manifest and offline integration.
- `scripts/build_website.py` — excludes `/founder/` from the product generation/manifest loop.
- `public/group.css` — scoped founder typography/layout, chapter navigation and group footer layout.
- `public/index.html` and four `public/ventures/*/index.html` pages — generated footer link and accessible brand-name spacing only; portfolio content is unchanged.
- `public/group-routes.json`, `public/sw.js` — founder route and deduplicated cache upgrade.
- `package.json` — founder-specific test commands only; no dependency changes.
- `tests/group-browser.mjs` — reuse optional local browser configuration.
- `tests/group.test.js`, `tests/phone-cockpit.test.js`, `tests/posters.test.js` — expected offline cache version updated; existing assertions retained.

Content hashes captured before implementation confirm that the venture registry, backend/functions, migrations, ranking sources and original artwork were not changed. All pre-existing product-page contents remain unchanged by this turn.

## Tests performed

| Check | Actual result |
| --- | --- |
| Baseline `npm test`, before implementation | 216/218 passed; two existing `wrangler.toml` protected-source checksum expectation failures |
| `npm run build`, repeated after integration | Passed; 51 legacy routes plus existing group routes and `/founder/` generated |
| `npm run test:founder` | 6/6 passed; complete source copy/order, first-name presentation, chapter anchors, metadata, group/product separation, offline deduplication |
| Existing group/phone/poster focused regressions | 16/16 passed |
| Final `npm test` | 222/224 passed; the same two baseline checksum failures, no new failures |
| Existing static product references | 2,112 links/assets/fragments checked by the existing suite |
| New static group reference crawl | 131 links/assets/fragments checked |
| Group Playwright suite | Passed: all 7 group/product routes at 7 widths, links/assets, hero separation, portfolio clipping, keyboard and reduced motion |
| Founder Playwright suite | Passed: 8 layouts from 320 to 1920px, including tablet and landscape; essay copy/order, footer entry, chapter navigation, return navigation, skip link, visible focus, reduced motion and no-JavaScript reading/navigation |
| Founder browser failures | Zero page errors and zero HTTP asset failures during the dedicated founder browser test |
| axe-core scan | Zero violations and zero incomplete checks for the selected WCAG 2/2.1 A/AA and 2.2 AA tags at 1440, 768, 390 and 320px |
| Visual review | Desktop, tablet and mobile screenshots inspected locally |

Browser environment: local Chromium 153.0.8010.0, Playwright 1.64.1. A temporary npm-provided Chromium binary and its bundled system libraries were used because a system browser was not available. No browser security bypass flags, application dependencies or production settings were added. axe-core was also installed locally for this review only; it is not a site dependency.

Automated accessibility scans are not a certification of full WCAG conformance. VoiceOver/NVDA and Safari/Firefox device testing were not performed.

### Reproduce

```sh
npm ci
npm run build
npm run test:founder
npm test
# With the local server on port 8080 and a Playwright browser installed:
npm run test:founder-browser
node tests/group-browser.mjs
```

For a locally provisioned Chromium binary, set `BROWSER_EXECUTABLE_PATH`; the test helper does not change browser security defaults. Review screenshots from the founder browser test are written to `/tmp/vitaflex-founder-review/` by default, or to `FOUNDER_SCREENSHOT_DIR` if set. They are disposable QA artifacts, not added to the site.

## Outstanding items

1. The two protected-source checksum test failures already exist before this work; neither `wrangler.toml` nor those baseline expectations was weakened or changed to make them pass.
2. Owner review and explicit authorization are required before production deployment.
3. Physical-device Safari/Firefox and assistive-technology checks remain unperformed. The implemented page has been tested with local Chromium and JavaScript disabled as documented above.
