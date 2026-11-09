# Sony Alexis — personal editorial website redesign

**Complete for local design review. No push, merge or production deployment.** The live production site has not been replaced by this revision.

## Preview and presentation

Working route: **`/sony/` on the port-8098 full-site preview**. The original corporate root still leads there through its existing bottom **Meet Sony Alexis** link. Its four ventures and all product/customer pages remain unchanged.

The separate **Sony Alexis — desktop & mobile design review** preview serves this directory’s screenshot gallery. Actual desktop/mobile screenshots, including full-page views, mobile navigation and the social asset, are saved in `screenshots/`. No generated mockup or substitute model is used.

## The new experience

- Full-screen editorial opening using the supplied **IMG_8620.jpeg** portrait, charcoal vignetting, large serif **SONY ALEXIS**, “The Person Behind the Vision,” **Faith. Growth. Purpose.**, the gold-line **Discover My Story** link and restrained scroll indicator.
- Personal navigation: Home, My Story, Philosophy, Resources, Blog. The mobile disclosure supports native keyboard activation, Escape, focus return, section focus, outside-click closing and responsive resizing. Without JavaScript the navigation remains visible and usable instead of hiding behind an inactive menu button.
- The four original biography chapters are fully present, with the original `#roots`, `#learning`, `#perspective` and `#service` anchors. Serif chapter titles, a limited-width reading column, restrained index and generous whitespace replace the former text-only composition.
- Philosophy uses **three exact existing sentences**, checked against the biography during the build. Its secondary portrait is the supplied **IMG_7905.jpeg**, not a stock photograph. No new quotations, credentials, achievements, historical associations or personal experiences were invented.
- Three visually distinct resource links: Daily Devotion, The Three Daily Wins, Blog, with the exact requested descriptions and real working destinations.
- The requested closing sentence, signature and return-to-beginning link finish the page. The original closing reflection and postscript are also preserved in the story.

Palette: `#0B0C0B`, `#141514`, `#C6A66A`, `#F2EFE8`, `#A5A39D`. Existing self-hosted Inter is paired with a system editorial serif. No new frontend dependencies, animation library, external fonts, analytics, forms, browser storage or data-collection requests were added. Motion is a single restrained entrance plus ordinary transitions; reduced-motion disables it and smooth scrolling.

## Biography retrieval and preservation

The page-reader tool retrieved the complete existing biography from **https://vitaflexbusinessgroup.com/sony/**, titled “Sony Alexis | VitaFlex Business Group.” All **ten paragraphs**, the closing reflection and postscript match the repository source. The original `content/group/founder.json` is **byte-identical**; no educational qualification or factual claim was rewritten.

`evidence/live-biography-provenance.json` records the source and method. `evidence/biography-source.json` retains the pre-task source. Browser tests additionally compare all ten rendered paragraphs verbatim at every viewport; shared validators compare the source against the unchanged historical fixture. Old whole-page Sony hash checks were explicitly replaced with paragraph/source/schema preservation checks because the owner has now authorized a new presentation. Original immutable fixtures were not refreshed, and other pages still receive byte-for-byte checks.

A page-reader retrieval is not a normal-browser custom-domain access or new-production verification claim. Direct sandbox HTTPS access is restricted; this revision’s actual browser checks were against the local preview.

## Resource compatibility — not three new destination designs

This latest brief explicitly restores three personal resources, superseding the preceding book-only navigation scope.

- **Daily Devotion and Blog** were restored from the last published release’s source. Their generated HTML and shared CSS/JS are **byte-identical** to that source; see `evidence/resource-compatibility.json`.
- **The Three Daily Wins** retains the existing local cinematic book **byte-for-byte** in its HTML, CSS and JS. It was not rebuilt or changed back into a dashboard. The book generator was separated so it no longer removes the other two destinations.
- All three destinations return HTTP 200 locally and are exercised through actual card clicks. Existing intentional empty publication archives remain honest; no fake article, devotional entry, publication date or photograph was introduced. No private CMS was deployed or connected.

## Photography and sharing

`content/sony/profile-media.json` configures image paths, responsive variants, dimensions, alt text and focal position. Portrait replacement does not require editing the page layout. `scripts/prepare_sony_photos.py` can regenerate the optimized assets and config from real replacement photos, using Pillow as an **optional authoring tool**, not a site/runtime dependency.

- Responsive hero WebP variants: 480, 768 and 1200 px, approximately 27 / 50 / 91 KB.
- Secondary portrait: approximately 28 KB, native lazy loading.
- Explicit dimensions reserve layout space; the hero has high fetch priority.
- Public derivatives strip EXIF metadata, including any GPS metadata. Supplied originals are not modified or published as multi-megabyte source files.
- Canonical URL and existing safe Person/ProfilePage/Organization graph remain intact. The actual portrait now appears in a 1200 × 630 JPEG sharing image, with correct Open Graph and large-image Twitter metadata. No unverified credentials were added to structured data.

These metadata/assets were validated locally. No claim is made that a social platform has scraped the unpublished revision or that search indexing/rankings have changed.

## Actual validation

| Check | Result |
|---|---|
| Repeat `npm run build` | PASS |
| Targeted preservation/profile/SEO/book tests | **49/49 PASS** |
| Complete profile browser suite | PASS at **320, 390, 600, 768, 844 landscape, 1024, 1440, 1920 px** |
| Biography, four original anchors, all five navigation items | PASS |
| CTA, three resource card clicks, Blog navigation, back-to-top and skip link | PASS |
| Mobile Enter/Escape, focus return, outside click and disclosure close | PASS |
| Decoded real portraits, local internal links, console and asset errors | PASS; no errors or external requests |
| No-JS navigation and complete biography; reduced motion | PASS; all four no-JS story anchors additionally checked at 320 and 390 px |
| Local HTTP/metadata/robots/sitemap audit | **58/58 PASS**, HTTP 200 |
| Existing group/corporate browser regressions | PASS |
| Unchanged book compatibility browser suite | PASS at seven widths, including automatic sequence, final hold and no controls/storage |
| axe-core 4.14.0, WCAG 2 A/AA and 2.1 AA rules | **0 detected violations**: desktop/mobile default/reduced motion, plus mobile menu-open states |
| Initial local unthrottled CLS smoke observation | **0** at desktop/mobile, default/reduced motion |
| Full `npm test` | **259/261 PASS**; only the two unchanged historical `wrangler.toml` checksum-expectation failures in Lab/Website tests |

Automated viewport/accessibility checks are not physical-device Safari testing, full manual screen-reader certification, Lighthouse scores, field Core Web Vitals or production verification. The historical checksum fixtures/infrastructure were not edited merely to hide their failures.

## Scope proof and changed files

The pre-task public-byte audit checks **236 existing files**. **232 remain identical**. The only four changed pre-existing public files are the authorized Sony profile, its restored legacy resource CSS, and the two route/sitemap manifests. New public files are only the Sony profile assets/photographs and restored resource files. The original corporate homepage, CSS, four venture pages, product/account/contact/privacy routes and the cinematic book are unchanged. `evidence/public-preservation.json` records this explicitly.

Main changes:

- `scripts/founder_page.py` — Sony-only editorial renderer; unchanged biography source and safe graph.
- `public/sony/profile.css`, `profile.js`, generated `index.html` — responsive design and accessible navigation.
- `content/sony/profile-media.json`, `public/assets/sony/*`, `scripts/prepare_sony_photos.py` — configurable authentic photography and sharing asset.
- `scripts/sony_book.py`, `sony_experiences.py` — preserve the current book while restoring original Devotion/Blog compatibility, without redesigning those destinations.
- Personal route manifests, preservation/SEO validators, scoped tests and future release gates — align checks with the explicitly authorized profile redesign and all three existing resources.
- `docs/sony-profile-redesign/` — real screenshots, evidence, report and deployment instructions.

Private untracked `blog-cms/` remains untouched and excluded. No backend, account, infrastructure, DNS, security, cloud binding, subscription or paid resource was changed. See [DEPLOYMENT.md](DEPLOYMENT.md) for the controlled release procedure after review approval.
